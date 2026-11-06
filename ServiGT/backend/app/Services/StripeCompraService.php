<?php

namespace App\Services;

use App\Models\CompraCredito;
use App\Models\CreditoProveedor;
use App\Models\Proveedor;
use App\Models\TransaccionCredito;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/**
 * Aplica el resultado de una Checkout Session a la compra de creditos asociada.
 *
 * Es el unico lugar donde una compra de Stripe pasa a 'completada' y acredita
 * saldo. Lo invocan el webhook (validado por firma) y la reconciliacion
 * server-side (sesion leida de la API de Stripe), jamas datos del frontend.
 * Es idempotente: la compra se bloquea y solo acredita al pasar a 'completada'
 * por primera vez.
 */
class StripeCompraService
{
    /**
     * @param  array<string, mixed>  $sesion  Checkout Session de Stripe
     * @param  string|null  $evento  tipo de evento de webhook, si lo hay
     */
    public function aplicar(array $sesion, ?string $evento = null): ?CompraCredito
    {
        $sesionId = (string) ($sesion['id'] ?? '');
        if ($sesionId === '') {
            return null;
        }

        return DB::transaction(function () use ($sesion, $sesionId, $evento) {
            $compra = CompraCredito::query()
                ->where('stripe_session_id', $sesionId)
                ->lockForUpdate()
                ->first();

            if (!$compra) {
                // Sin compra local no hay a quien acreditar. No se adivina por metadata.
                Log::warning('Stripe: sesion sin compra local.', ['sesion' => $sesionId]);

                return null;
            }

            if ($evento === 'checkout.session.async_payment_failed') {
                return $this->cerrar($compra, 'fallida', 'El pago diferido fue rechazado.');
            }

            if (($sesion['status'] ?? '') === 'expired') {
                return $this->cerrar($compra, 'cancelada', null);
            }

            if (($sesion['payment_status'] ?? '') === 'paid') {
                return $this->completar($compra, $sesion);
            }

            return $compra;
        });
    }

    private function completar(CompraCredito $compra, array $sesion): CompraCredito
    {
        if ($compra->estado === 'completada') {
            return $compra;
        }

        // 'cancelada' es terminal: una sesion expirada no puede cobrar, y si
        // llegara aqui seria una inconsistencia que no se resuelve acreditando.
        if ($compra->estado === 'cancelada') {
            Log::error('Stripe: pago exitoso sobre compra cancelada.', ['compra_id' => $compra->id]);

            return $compra;
        }

        $esperado = (int) round(((float) $compra->monto_gtq) * 100);
        $cobrado = (int) ($sesion['amount_total'] ?? 0);
        $moneda = strtolower((string) ($sesion['currency'] ?? ''));

        if ($cobrado !== $esperado || $moneda !== strtolower((string) config('services.stripe.currency'))) {
            // Nunca se acredita un monto que no coincide con el paquete.
            Log::critical('Stripe: monto o moneda no coinciden con la compra.', [
                'compra_id' => $compra->id,
                'esperado'  => $esperado,
                'cobrado'   => $cobrado,
                'moneda'    => $moneda,
            ]);

            return $compra;
        }

        // Mismo orden de locks que CreditoController::registrarCompra.
        Proveedor::query()->lockForUpdate()->findOrFail($compra->proveedor_id);

        $credito = CreditoProveedor::query()
            ->where('proveedor_id', $compra->proveedor_id)
            ->lockForUpdate()
            ->first();

        if (!$credito) {
            $credito = CreditoProveedor::create([
                'proveedor_id' => $compra->proveedor_id,
                'saldo'        => 0,
                'updated_at'   => now(),
            ]);
        }

        $completadaAt = now();

        // El snapshot del comprobante se escribe en el mismo UPDATE que completa
        // la compra: es la unica via por la que nace y despues no cambia.
        $compra->forceFill([
            'estado'        => 'completada',
            'completada_at' => $completadaAt,
            'fallo_motivo'  => null,
        ] + app(ComprobanteCompraService::class)->atributosAlCompletar($compra, $completadaAt))->save();

        $credito->saldo += $compra->creditos_otorgados;
        $credito->updated_at = now();
        $credito->save();

        TransaccionCredito::create([
            'proveedor_id'  => $compra->proveedor_id,
            'tipo'          => 'compra',
            'monto'         => $compra->creditos_otorgados,
            'motivo'        => 'Compra de creditos: ' . ($compra->paquete?->nombre ?? 'paquete') . ' (Stripe)',
            'referencia_id' => $compra->id,
        ]);

        return $compra;
    }

    /**
     * 'fallida' (pago diferido rechazado) no es terminal: si la misma sesion
     * llegara a cobrarse, completar() sigue aceptando fallida -> completada.
     */
    private function cerrar(CompraCredito $compra, string $estado, ?string $motivo): CompraCredito
    {
        if (in_array($compra->estado, ['completada', 'cancelada'], true)) {
            return $compra;
        }

        $compra->forceFill([
            'estado'       => $estado,
            'fallo_motivo' => $motivo !== null ? mb_substr($motivo, 0, 255) : null,
        ])->save();

        return $compra;
    }
}
