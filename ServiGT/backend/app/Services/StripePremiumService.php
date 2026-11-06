<?php

namespace App\Services;

use App\Models\CreditoProveedor;
use App\Models\PagoPremium;
use App\Models\Proveedor;
use App\Models\TransaccionCredito;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/**
 * Aplica los resultados de Stripe al Premium del proveedor.
 *
 * Premium se paga con Checkout: pago unico (30 dias) o suscripcion mensual.
 * Cada ciclo pagado extiende la vigencia y acredita 10 creditos como 'bono' UNA
 * sola vez: la idempotencia la da el motivo del bono, que lleva la clave del
 * ciclo (id de pago o id de factura de Stripe). Repetir un webhook, o recibir
 * a la vez la sesion y la factura del primer cobro, no duplica nada.
 *
 * Cancelar una suscripcion no toca premium_vence_at: el proveedor conserva
 * Premium hasta el final del ciclo ya pagado.
 */
class StripePremiumService
{
    public const PRECIO_GTQ = 115;
    public const VIGENCIA_DIAS = 30;
    public const CREDITOS_POR_CICLO = 10;
    public const MOTIVO_BONO = 'Bono mensual Premium';

    /**
     * @param  array<string, mixed>  $sesion  Checkout Session de Stripe
     */
    public function aplicarSesion(array $sesion, ?string $evento = null): ?PagoPremium
    {
        $sesionId = (string) ($sesion['id'] ?? '');
        if ($sesionId === '') {
            return null;
        }

        return DB::transaction(function () use ($sesion, $sesionId, $evento) {
            $pago = PagoPremium::query()->where('stripe_session_id', $sesionId)->lockForUpdate()->first();

            if (!$pago) {
                Log::warning('Stripe: sesion Premium sin pago local.', ['sesion' => $sesionId]);

                return null;
            }

            if ($evento === 'checkout.session.async_payment_failed') {
                return $this->cerrar($pago, 'fallida', 'El pago diferido fue rechazado.');
            }

            if (($sesion['status'] ?? '') === 'expired') {
                return $this->cerrar($pago, 'cancelada', null);
            }

            if (($sesion['payment_status'] ?? '') === 'paid') {
                return $this->completar($pago, $sesion);
            }

            return $pago;
        });
    }

    /**
     * invoice.paid: renovaciones mensuales. El primer cobro ('subscription_create')
     * ya lo procesa la sesion de Checkout, por eso se ignora aqui.
     *
     * @param  array<string, mixed>  $factura
     */
    public function aplicarFacturaPagada(array $factura): void
    {
        if (($factura['billing_reason'] ?? '') !== 'subscription_cycle') {
            return;
        }

        $suscripcionId = $this->suscripcionDeFactura($factura);
        $facturaId = (string) ($factura['id'] ?? '');
        if ($suscripcionId === '' || $facturaId === '') {
            return;
        }

        DB::transaction(function () use ($factura, $suscripcionId, $facturaId) {
            $proveedor = Proveedor::query()
                ->where('stripe_subscription_id', $suscripcionId)
                ->lockForUpdate()
                ->first();

            if (!$proveedor) {
                Log::warning('Stripe: factura de suscripcion sin proveedor.', ['suscripcion' => $suscripcionId]);

                return;
            }

            if ((int) ($factura['amount_paid'] ?? 0) !== self::PRECIO_GTQ * 100) {
                Log::critical('Stripe: monto de renovacion Premium inesperado.', [
                    'proveedor_id' => $proveedor->id,
                    'factura'      => $facturaId,
                    'monto'        => $factura['amount_paid'] ?? null,
                ]);

                return;
            }

            $this->aplicarCiclo($proveedor, $facturaId);
        });
    }

    /**
     * customer.subscription.updated | deleted: sincroniza la cancelacion.
     *
     * @param  array<string, mixed>  $suscripcion
     */
    public function aplicarSuscripcion(array $suscripcion, string $evento): void
    {
        $id = (string) ($suscripcion['id'] ?? '');
        if ($id === '') {
            return;
        }

        DB::transaction(function () use ($suscripcion, $evento, $id) {
            $proveedor = Proveedor::query()->where('stripe_subscription_id', $id)->lockForUpdate()->first();
            if (!$proveedor) {
                return;
            }

            $terminada = $evento === 'customer.subscription.deleted'
                || in_array($suscripcion['status'] ?? '', ['canceled', 'incomplete_expired'], true);

            if ($terminada) {
                // La vigencia ya pagada se respeta: solo deja de renovarse.
                $proveedor->forceFill(['premium_recurrente' => false, 'premium_cancela_al_final' => false])->save();

                return;
            }

            $cancelaAlFinal = (bool) ($suscripcion['cancel_at_period_end'] ?? false)
                || !empty($suscripcion['cancel_at']);

            $proveedor->forceFill(['premium_cancela_al_final' => $cancelaAlFinal])->save();
        });
    }

    private function completar(PagoPremium $pago, array $sesion): PagoPremium
    {
        if ($pago->estado === 'completada') {
            return $pago;
        }

        if ($pago->estado === 'cancelada') {
            Log::error('Stripe: pago Premium exitoso sobre pago cancelado.', ['pago_id' => $pago->id]);

            return $pago;
        }

        $moneda = strtolower((string) ($sesion['currency'] ?? ''));
        if ((int) ($sesion['amount_total'] ?? 0) !== self::PRECIO_GTQ * 100
            || $moneda !== strtolower((string) config('services.stripe.currency'))) {
            Log::critical('Stripe: monto o moneda Premium no coinciden.', [
                'pago_id' => $pago->id,
                'cobrado' => $sesion['amount_total'] ?? null,
                'moneda'  => $moneda,
            ]);

            return $pago;
        }

        $proveedor = Proveedor::query()->lockForUpdate()->findOrFail($pago->proveedor_id);

        if ($pago->recurrente) {
            $proveedor->forceFill([
                'premium_recurrente'       => true,
                'premium_cancela_al_final' => false,
                'stripe_customer_id'       => $this->idDe($sesion['customer'] ?? null) ?: $proveedor->stripe_customer_id,
                'stripe_subscription_id'   => $this->idDe($sesion['subscription'] ?? null) ?: $proveedor->stripe_subscription_id,
            ])->save();
        }

        // Con suscripcion el ciclo se identifica por la factura, asi el invoice.paid
        // del mismo cobro encuentra el bono ya acreditado.
        $cicloKey = ($pago->recurrente ? $this->idDe($sesion['invoice'] ?? null) : '') ?: 'pago' . $pago->id;
        $this->aplicarCiclo($proveedor, $cicloKey);

        $pago->forceFill(['estado' => 'completada', 'completada_at' => now(), 'fallo_motivo' => null])->save();

        return $pago;
    }

    /**
     * Extiende 30 dias y acredita el bono del ciclo, una sola vez por clave.
     * Debe llamarse con el proveedor bloqueado dentro de una transaccion.
     */
    private function aplicarCiclo(Proveedor $proveedor, string $cicloKey): bool
    {
        $clave = 'premium-' . $proveedor->id . '-' . $cicloKey;
        $motivo = self::MOTIVO_BONO . ' (' . $clave . ')';

        $yaAplicado = TransaccionCredito::where('proveedor_id', $proveedor->id)
            ->where('tipo', 'bono')
            ->where('motivo', $motivo)
            ->exists();

        if ($yaAplicado) {
            return false;
        }

        // Un pago sobre un Premium aun vigente suma 30 dias al vencimiento.
        $vigente = $proveedor->premium_vence_at && $proveedor->premium_vence_at->isFuture();
        $inicio = $vigente ? ($proveedor->premium_inicio_at ?? now()) : now();
        $vence = ($vigente ? $proveedor->premium_vence_at->copy() : now())->addDays(self::VIGENCIA_DIAS);

        $proveedor->forceFill([
            'premium_inicio_at'    => $inicio,
            'premium_vence_at'     => $vence,
            'premium_ciclo_key'    => mb_substr($clave, 0, 80),
            'premium_renovaciones' => ((int) $proveedor->premium_renovaciones) + 1,
        ])->save();

        $credito = CreditoProveedor::query()->where('proveedor_id', $proveedor->id)->lockForUpdate()->first()
            ?? CreditoProveedor::create(['proveedor_id' => $proveedor->id, 'saldo' => 0, 'updated_at' => now()]);

        $credito->saldo += self::CREDITOS_POR_CICLO;
        $credito->updated_at = now();
        $credito->save();

        TransaccionCredito::create([
            'proveedor_id'  => $proveedor->id,
            'tipo'          => 'bono',
            'monto'         => self::CREDITOS_POR_CICLO,
            'motivo'        => $motivo,
            'referencia_id' => null,
        ]);

        return true;
    }

    private function cerrar(PagoPremium $pago, string $estado, ?string $motivo): PagoPremium
    {
        if (in_array($pago->estado, ['completada', 'cancelada'], true)) {
            return $pago;
        }

        $pago->forceFill([
            'estado'       => $estado,
            'fallo_motivo' => $motivo !== null ? mb_substr($motivo, 0, 255) : null,
        ])->save();

        return $pago;
    }

    /** Stripe devuelve un id o, expandido, el objeto completo. */
    private function idDe(mixed $valor): string
    {
        if (is_array($valor)) {
            return (string) ($valor['id'] ?? '');
        }

        return (string) ($valor ?? '');
    }

    /** El campo cambio de sitio entre versiones de la API; se aceptan ambos. */
    private function suscripcionDeFactura(array $factura): string
    {
        return $this->idDe($factura['subscription'] ?? null)
            ?: $this->idDe($factura['parent']['subscription_details']['subscription'] ?? null);
    }
}
