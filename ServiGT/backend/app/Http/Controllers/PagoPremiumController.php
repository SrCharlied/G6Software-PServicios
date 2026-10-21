<?php

namespace App\Http\Controllers;

use App\Models\PagoPremium;
use App\Models\Proveedor;
use App\Services\StripeClient;
use App\Services\StripeException;
use App\Services\StripePremiumService;
use App\Traits\ApiResponse;
use Illuminate\Database\QueryException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\ValidationException;

/**
 * Premium con Stripe: pago unico de 30 dias o suscripcion mensual (Q115), con
 * cancelacion al final del ciclo. No existe activacion gratuita con la pasarela
 * real: PremiumController::activar queda deshabilitado cuando el driver es stripe.
 */
class PagoPremiumController extends Controller
{
    use ApiResponse;

    public function __construct(
        private readonly StripeClient $stripe,
        private readonly StripePremiumService $premium,
        private readonly PremiumController $estadoPremium,
    ) {
    }

    /**
     * POST /api/premium/pagos/sesion
     * Auth: Sanctum, rol proveedor. Throttle: purchase.
     *
     * Request:  { recurrente: bool, idempotency_key: string(<=100) }
     *   recurrente=false -> pago unico, 30 dias de Premium.
     *   recurrente=true  -> suscripcion mensual hasta que se cancele.
     * Response 201/200: { pago, client_secret, publishable_key }
     * 409 si Premium ya esta activo (no se paga dos veces el mismo ciclo), si la
     * clave se uso con otra modalidad o si el pago esta cancelado/expirado.
     */
    public function crearSesion(Request $request): JsonResponse
    {
        if (config('services.payments.driver') !== 'stripe' || !$this->stripe->configurado()) {
            return $this->error('El pago con tarjeta no esta disponible.', 503);
        }

        if (str_starts_with((string) config('services.stripe.secret'), 'sk_live_') && config('app.env') !== 'production') {
            return $this->error('La configuracion de pagos no es valida para este ambiente.', 503);
        }

        $proveedor = Proveedor::where('user_id', $request->user()->id)->first();
        if (!$proveedor) {
            return $this->error('Solo los proveedores pueden activar Premium.', 403);
        }

        try {
            $datos = $request->validate([
                'recurrente'      => 'required|boolean',
                'idempotency_key' => 'required|string|max:100',
            ]);
        } catch (ValidationException $e) {
            return $this->error('Datos de pago invalidos.', 422, $e->errors());
        }

        $recurrente = (bool) $datos['recurrente'];
        $pago = PagoPremium::where('proveedor_id', $proveedor->id)->where('idempotency_key', $datos['idempotency_key'])->first();

        if (!$pago && $proveedor->premiumEstado() === 'activo') {
            return $this->error('Premium ya esta activo. Podras renovarlo cuando venza.', 409);
        }

        if (!$pago) {
            $pago = $this->crearPagoPendiente($proveedor, $recurrente, $datos['idempotency_key']);
            if (!$pago) {
                return $this->error('No se pudo generar una referencia unica. Intenta de nuevo.', 503);
            }
        }

        if ($pago->recurrente !== $recurrente) {
            return $this->error('La clave de idempotencia ya se uso con otra modalidad.', 409);
        }

        $esNuevo = $pago->wasRecentlyCreated;

        if ($pago->estado === 'completada') {
            return $this->respuesta($pago, null, 200);
        }

        if ($pago->estado === 'cancelada') {
            return $this->error('Este pago fue cancelado. Inicia uno nuevo.', 409);
        }

        try {
            $sesion = $pago->stripe_session_id
                ? $this->stripe->obtenerCheckoutSession($pago->stripe_session_id)
                : $this->crearSesionStripe($pago);
        } catch (StripeException $e) {
            Log::error('Stripe: no se pudo preparar el pago Premium.', ['pago_id' => $pago->id, 'causa' => $e->getMessage()]);

            return $this->error('No se pudo iniciar el pago. Intenta de nuevo.', 502);
        }

        if (($sesion['status'] ?? '') === 'complete') {
            $pago = $this->premium->aplicarSesion($sesion) ?? $pago;

            return $this->respuesta($pago, null, 200);
        }

        if (($sesion['status'] ?? '') !== 'open' || empty($sesion['client_secret'])) {
            $this->premium->aplicarSesion($sesion);

            return $this->error('Este pago ya no esta disponible. Inicia uno nuevo.', 409);
        }

        if ($pago->estado === 'fallida') {
            $pago->forceFill(['estado' => 'pendiente', 'fallo_motivo' => null])->save();
        }

        return $this->respuesta($pago, (string) $sesion['client_secret'], $esNuevo ? 201 : 200);
    }

    /**
     * GET /api/premium/pagos/{id}
     * Auth: Sanctum, rol proveedor, solo pagos propios (404 si es ajeno).
     * Response: { pago, premium }. Si sigue pendiente se concilia con Stripe.
     */
    public function estado(Request $request, int $id): JsonResponse
    {
        $proveedor = Proveedor::where('user_id', $request->user()->id)->first();
        if (!$proveedor) {
            return $this->error('Solo los proveedores pueden consultar pagos Premium.', 403);
        }

        $pago = PagoPremium::where('proveedor_id', $proveedor->id)->find($id);
        if (!$pago) {
            return $this->error('Pago no encontrado.', 404);
        }

        if ($pago->estado === 'pendiente' && $pago->stripe_session_id) {
            try {
                $sesion = $this->stripe->obtenerCheckoutSession($pago->stripe_session_id);
                $pago = $this->premium->aplicarSesion($sesion) ?? $pago;
            } catch (StripeException $e) {
                Log::warning('Stripe: no se pudo conciliar el pago Premium.', ['pago_id' => $pago->id, 'causa' => $e->getMessage()]);
            }
        }

        return $this->success('Pago obtenido correctamente.', [
            'pago'    => $this->formatear($pago->fresh()),
            'premium' => $this->estadoPremium->formatearEstadoPremium($proveedor->fresh()),
        ]);
    }

    /**
     * POST /api/premium/suscripcion/cancelar
     * Auth: Sanctum, rol proveedor. Cancela la renovacion AL FINAL del ciclo:
     * Premium sigue activo hasta premium_vence_at y despues no se vuelve a cobrar.
     * Idempotente: cancelar una suscripcion ya cancelada responde 200.
     * 409 si no hay una suscripcion activa; 502 si Stripe falla (nada cambia).
     */
    public function cancelar(Request $request): JsonResponse
    {
        $proveedor = Proveedor::where('user_id', $request->user()->id)->first();
        if (!$proveedor) {
            return $this->error('Solo los proveedores pueden cancelar Premium.', 403);
        }

        if (!$proveedor->premium_recurrente || !$proveedor->stripe_subscription_id) {
            return $this->error('No tienes una suscripcion Premium activa.', 409);
        }

        if (!$proveedor->premium_cancela_al_final) {
            try {
                $this->stripe->actualizarSuscripcion($proveedor->stripe_subscription_id, ['cancel_at_period_end' => 'true']);
            } catch (StripeException $e) {
                Log::error('Stripe: no se pudo cancelar la suscripcion.', ['proveedor_id' => $proveedor->id, 'causa' => $e->getMessage()]);

                return $this->error('No se pudo cancelar la suscripcion. Intenta de nuevo.', 502);
            }

            $proveedor->forceFill(['premium_cancela_al_final' => true])->save();
        }

        return $this->success(
            'Suscripcion cancelada. Premium sigue activo hasta el final del ciclo.',
            $this->estadoPremium->formatearEstadoPremium($proveedor->fresh())
        );
    }

    private function crearSesionStripe(PagoPremium $pago): array
    {
        $params = [
            'mode'                                          => $pago->recurrente ? 'subscription' : 'payment',
            'ui_mode'                                       => 'form',
            'billing_address_collection'                    => 'auto',
            'phone_number_collection[enabled]'              => 'false',
            'automatic_tax[enabled]'                        => 'false',
            'integration_identifier'                        => 'custom_embedded_web_0001',
            'line_items[0][quantity]'                       => 1,
            'line_items[0][price_data][currency]'           => strtolower((string) config('services.stripe.currency')),
            'line_items[0][price_data][unit_amount]'        => StripePremiumService::PRECIO_GTQ * 100,
            'line_items[0][price_data][product_data][name]' => 'ServiGT Premium (30 dias)',
            'client_reference_id'                           => 'premium-' . $pago->id,
            'metadata[tipo]'                                => 'premium',
            'metadata[pago_id]'                             => $pago->id,
            'metadata[proveedor_id]'                        => $pago->proveedor_id,
            'return_url'                                    => rtrim((string) config('services.stripe.return_origin'), '/')
                . '/pago-exitoso?tipo=premium&pago_id=' . $pago->id . '&session_id={CHECKOUT_SESSION_ID}',
        ];

        if ($pago->recurrente) {
            // payment_method_collection solo aplica a suscripciones; submit_type solo a pagos unicos.
            $params['payment_method_collection'] = 'always';
            $params['line_items[0][price_data][recurring][interval]'] = 'month';
            $params['subscription_data[metadata][tipo]'] = 'premium';
            $params['subscription_data[metadata][proveedor_id]'] = $pago->proveedor_id;
        } else {
            $params['submit_type'] = 'auto';
        }

        $sesion = $this->stripe->crearCheckoutSession($params, 'servigt-premium-' . $pago->id);
        $pago->forceFill(['stripe_session_id' => $sesion['id']])->save();

        return $sesion;
    }

    private function crearPagoPendiente(Proveedor $proveedor, bool $recurrente, string $clave): ?PagoPremium
    {
        for ($intento = 0; $intento < 3; $intento++) {
            try {
                return PagoPremium::create([
                    'proveedor_id'    => $proveedor->id,
                    'recurrente'      => $recurrente,
                    'estado'          => 'pendiente',
                    'referencia'      => 'PRM-' . str_pad((string) random_int(0, 9999999999), 10, '0', STR_PAD_LEFT),
                    'idempotency_key' => $clave,
                ]);
            } catch (QueryException $e) {
                if ((string) $e->getCode() !== '23505') {
                    throw $e;
                }

                $ganador = PagoPremium::where('proveedor_id', $proveedor->id)->where('idempotency_key', $clave)->first();
                if ($ganador) {
                    return $ganador;
                }
            }
        }

        return null;
    }

    private function respuesta(PagoPremium $pago, ?string $clientSecret, int $status): JsonResponse
    {
        return $this->success('Pago preparado correctamente.', [
            'pago'            => $this->formatear($pago),
            'client_secret'   => $clientSecret,
            'publishable_key' => $this->stripe->clavePublicable(),
        ], $status);
    }

    private function formatear(PagoPremium $pago): array
    {
        return [
            'id'            => $pago->id,
            'recurrente'    => $pago->recurrente,
            'monto_gtq'     => StripePremiumService::PRECIO_GTQ,
            'estado'        => $pago->estado,
            'referencia'    => $pago->referencia,
            'fallo_motivo'  => $pago->fallo_motivo,
            'completada_at' => $pago->completada_at,
        ];
    }
}
