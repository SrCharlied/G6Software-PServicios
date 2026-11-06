<?php

namespace App\Http\Controllers;

use App\Models\CompraCredito;
use App\Models\CreditoProveedor;
use App\Models\PaqueteCredito;
use App\Models\Proveedor;
use App\Services\StripeClient;
use App\Services\StripeCompraService;
use App\Services\StripeException;
use App\Services\StripePremiumService;
use App\Services\StripeWebhookVerifier;
use App\Traits\ApiResponse;
use Illuminate\Database\QueryException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\ValidationException;

/**
 * Compra de creditos con Stripe Checkout (formulario embebido, ui_mode 'form').
 *
 * El pago se captura en el iframe de Stripe.js y ningun dato de tarjeta toca
 * este servidor. El frontend jamas decide que una compra esta pagada: los creditos
 * solo se acreditan por webhook firmado o por reconciliacion contra la API.
 */
class PagoStripeController extends Controller
{
    use ApiResponse;

    private const EVENTOS_DE_SESION = [
        'checkout.session.completed',
        'checkout.session.async_payment_succeeded',
        'checkout.session.async_payment_failed',
        'checkout.session.expired',
    ];

    public function __construct(
        private readonly StripeClient $stripe,
        private readonly StripeCompraService $compras,
        private readonly StripePremiumService $premium,
    ) {
    }

    /**
     * POST /api/creditos/pagos/sesion
     * Auth: Sanctum, rol proveedor. Throttle: purchase.
     *
     * Request:  { paquete_id: int, idempotency_key: string(<=100) }
     * Response 201 (nueva) / 200 (reintento con la misma clave):
     *   { compra, client_secret, publishable_key }
     * client_secret es null si la compra ya no admite pago (completada o
     * pendiente de confirmacion); el frontend debe consultar la compra.
     * Idempotencia: una clave por proveedor identifica una sola compra y una
     * sola Checkout Session. Reusar la clave con otro paquete responde 409.
     * El precio sale siempre de paquetes_creditos, nunca del request.
     */
    public function crearSesion(Request $request): JsonResponse
    {
        if (config('services.payments.driver') !== 'stripe' || !$this->stripe->configurado()) {
            return $this->error('El pago con tarjeta no esta disponible.', 503);
        }

        if ($this->claveEnUsoEnAmbienteIncorrecto()) {
            return $this->error('La configuracion de pagos no es valida para este ambiente.', 503);
        }

        $proveedor = Proveedor::where('user_id', $request->user()->id)->first();
        if (!$proveedor) {
            return $this->error('Solo los proveedores pueden comprar creditos.', 403);
        }

        try {
            $datos = $request->validate([
                'paquete_id'      => 'required|integer',
                'idempotency_key' => 'required|string|max:100',
            ]);
        } catch (ValidationException $e) {
            return $this->error('Datos de compra invalidos.', 422, $e->errors());
        }

        $clave = $datos['idempotency_key'];
        $compra = $this->buscarPorClave($proveedor->id, $clave);

        if (!$compra) {
            $paquete = PaqueteCredito::activos()->find($datos['paquete_id']);
            if (!$paquete) {
                return $this->error('El paquete solicitado no existe o no esta disponible.', 404);
            }

            $compra = $this->crearCompraPendiente($proveedor, $paquete, $clave);
            if (!$compra) {
                return $this->error('No se pudo generar una referencia unica para la compra. Intenta de nuevo.', 503);
            }
        }

        if ((int) $compra->paquete_id !== (int) $datos['paquete_id']) {
            return $this->error('La clave de idempotencia ya se uso con otro paquete.', 409);
        }

        $esNueva = $compra->wasRecentlyCreated;

        if ($compra->estado === 'completada') {
            return $this->respuestaSesion($compra, null, 200);
        }

        if ($compra->estado === 'cancelada') {
            return $this->error('Esta compra fue cancelada. Inicia una compra nueva.', 409);
        }

        try {
            $sesion = $this->obtenerOCrearSesion($compra);
        } catch (StripeException $e) {
            Log::error('Stripe: no se pudo preparar el pago.', ['compra_id' => $compra->id, 'causa' => $e->getMessage()]);

            // La compra queda pendiente y sin sesion: reintentar con la misma clave
            // recupera la misma Checkout Session gracias a la clave de Stripe.
            return $this->error('No se pudo iniciar el pago. Intenta de nuevo.', 502);
        }

        if (($sesion['status'] ?? '') === 'complete') {
            // Ya se confirmo el pago: no se vuelve a pedir tarjeta.
            $compra = $this->compras->aplicar($sesion) ?? $compra;

            return $this->respuestaSesion($compra, null, 200);
        }

        if (($sesion['status'] ?? '') !== 'open' || empty($sesion['client_secret'])) {
            // Sesion expirada: la compra local queda cancelada y se pide una nueva.
            $this->compras->aplicar($sesion);

            return $this->error('Esta compra ya no admite pago. Inicia una compra nueva.', 409);
        }

        if ($compra->estado === 'fallida') {
            $compra->forceFill(['estado' => 'pendiente', 'fallo_motivo' => null])->save();
        }

        return $this->respuestaSesion($compra, (string) $sesion['client_secret'], $esNueva ? 201 : 200);
    }

    /**
     * GET /api/creditos/compras/{id}
     * Auth: Sanctum, rol proveedor, solo compras propias (404 si es ajena).
     * Response: { compra, saldo }
     * Si la compra sigue pendiente se concilia con Stripe: asi el saldo se
     * refleja aunque el webhook se retrase o no pueda alcanzar el servidor.
     */
    public function estado(Request $request, int $id): JsonResponse
    {
        $proveedor = Proveedor::where('user_id', $request->user()->id)->first();
        if (!$proveedor) {
            return $this->error('Solo los proveedores pueden consultar compras de creditos.', 403);
        }

        $compra = CompraCredito::where('proveedor_id', $proveedor->id)->find($id);
        if (!$compra) {
            return $this->error('Compra no encontrada.', 404);
        }

        if ($compra->metodo_pago === 'stripe' && $compra->estado === 'pendiente' && $compra->stripe_session_id) {
            try {
                $sesion = $this->stripe->obtenerCheckoutSession($compra->stripe_session_id);
                $compra = $this->compras->aplicar($sesion) ?? $compra;
            } catch (StripeException $e) {
                // El estado local sigue siendo valido: se responde pendiente.
                Log::warning('Stripe: no se pudo conciliar la compra.', ['compra_id' => $compra->id, 'causa' => $e->getMessage()]);
            }
        }

        return $this->success('Compra obtenida correctamente.', [
            'compra' => $this->formatear($compra->fresh()->load('paquete')),
            'saldo'  => (int) (CreditoProveedor::where('proveedor_id', $proveedor->id)->value('saldo') ?? 0),
        ]);
    }

    /**
     * POST /api/stripe/webhook
     * Auth: sin Sanctum; se autentica por la firma Stripe-Signature (HMAC con
     * STRIPE_WEBHOOK_SECRET sobre el cuerpo crudo). Throttle: stripe-webhook.
     * Eventos: checkout.session.* (creditos y Premium), invoice.paid y
     * customer.subscription.updated|deleted (renovacion y cancelacion de Premium).
     * Responde 400 si la firma es invalida, 200 si el evento ya se proceso o no
     * aplica, 500 si fallo el procesamiento (Stripe reintenta).
     */
    public function webhook(Request $request, StripeWebhookVerifier $verificador): JsonResponse
    {
        $secreto = (string) config('services.stripe.webhook_secret');
        if ($secreto === '') {
            Log::error('Stripe: webhook recibido sin STRIPE_WEBHOOK_SECRET configurado.');

            return $this->error('Webhook no configurado.', 503);
        }

        $cuerpo = $request->getContent();

        if (!$verificador->verificar(
            $cuerpo,
            $request->header('Stripe-Signature'),
            $secreto,
            (int) config('services.stripe.webhook_tolerance', 300),
        )) {
            return $this->error('Firma invalida.', 400);
        }

        $evento = json_decode($cuerpo, true);
        $eventoId = is_array($evento) ? (string) ($evento['id'] ?? '') : '';
        $tipo = is_array($evento) ? (string) ($evento['type'] ?? '') : '';
        $objeto = is_array($evento) ? ($evento['data']['object'] ?? null) : null;

        if ($eventoId === '' || $tipo === '' || !is_array($objeto)) {
            return $this->error('Evento invalido.', 400);
        }

        try {
            DB::transaction(function () use ($eventoId, $tipo, $objeto) {
                // La PK de stripe_eventos arbitra la repeticion. Si el procesamiento
                // falla, el INSERT se revierte junto con todo y Stripe reintenta.
                $insertado = DB::table('stripe_eventos')->insertOrIgnore([
                    'event_id'   => $eventoId,
                    'tipo'       => mb_substr($tipo, 0, 100),
                    'created_at' => now(),
                ]);

                if ($insertado === 0) {
                    return;
                }

                $this->despachar($tipo, $objeto);
            });
        } catch (\Throwable $e) {
            Log::error('Stripe: fallo al procesar webhook.', ['evento' => $eventoId, 'tipo' => $tipo, 'causa' => $e->getMessage()]);

            return $this->error('No se pudo procesar el evento.', 500);
        }

        return $this->success('Evento recibido.');
    }

    /** Premium y creditos comparten sesiones de Checkout: se distinguen por metadata.tipo. */
    private function despachar(string $tipo, array $objeto): void
    {
        if (in_array($tipo, self::EVENTOS_DE_SESION, true)) {
            if (($objeto['metadata']['tipo'] ?? '') === 'premium') {
                $this->premium->aplicarSesion($objeto, $tipo);
            } else {
                $this->compras->aplicar($objeto, $tipo);
            }

            return;
        }

        match ($tipo) {
            'invoice.paid' => $this->premium->aplicarFacturaPagada($objeto),
            'customer.subscription.updated',
            'customer.subscription.deleted' => $this->premium->aplicarSuscripcion($objeto, $tipo),
            default => null,
        };
    }

    private function obtenerOCrearSesion(CompraCredito $compra): array
    {
        if ($compra->stripe_session_id) {
            return $this->stripe->obtenerCheckoutSession($compra->stripe_session_id);
        }

        // Parametros fijados en Checkout Studio: ui_mode, billing_address_collection,
        // phone_number_collection, automatic_tax y submit_type. En mode 'payment'
        // no se envia payment_method_collection. El monto viene del paquete en BD.
        // La clave de Stripe es estable por compra: si una llamada anterior llego
        // a Stripe pero la respuesta se perdio, esta devuelve la misma sesion.
        $sesion = $this->stripe->crearCheckoutSession([
            'mode'                                          => 'payment',
            'ui_mode'                                       => 'form',
            'billing_address_collection'                    => 'auto',
            'phone_number_collection[enabled]'              => 'false',
            'automatic_tax[enabled]'                        => 'false',
            'submit_type'                                   => 'auto',
            'integration_identifier'                        => 'custom_embedded_web_0001',
            'line_items[0][quantity]'                       => 1,
            'line_items[0][price_data][currency]'           => strtolower((string) config('services.stripe.currency')),
            'line_items[0][price_data][unit_amount]'        => (int) round(((float) $compra->monto_gtq) * 100),
            'line_items[0][price_data][product_data][name]' => 'ServiGT: paquete ' . ($compra->paquete?->nombre ?? 'de creditos'),
            'client_reference_id'                           => (string) $compra->id,
            'metadata[compra_id]'                           => $compra->id,
            'metadata[proveedor_id]'                        => $compra->proveedor_id,
            'metadata[referencia]'                          => $compra->referencia,
            'return_url'                                    => rtrim((string) config('services.stripe.return_origin'), '/')
                . '/pago-exitoso?compra_id=' . $compra->id . '&session_id={CHECKOUT_SESSION_ID}',
        ], 'servigt-compra-' . $compra->id);

        $compra->forceFill(['stripe_session_id' => $sesion['id']])->save();

        return $sesion;
    }

    private function crearCompraPendiente(Proveedor $proveedor, PaqueteCredito $paquete, string $clave): ?CompraCredito
    {
        for ($intento = 0; $intento < 3; $intento++) {
            try {
                return CompraCredito::create([
                    'proveedor_id'       => $proveedor->id,
                    'paquete_id'         => $paquete->id,
                    'monto_gtq'          => $paquete->precio_gtq,
                    'creditos_otorgados' => $paquete->creditos_base + $paquete->creditos_bonus,
                    'estado'             => 'pendiente',
                    'metodo_pago'        => 'stripe',
                    'referencia'         => $this->generarReferencia(),
                    'idempotency_key'    => $clave,
                ]);
            } catch (QueryException $e) {
                if ((string) $e->getCode() !== '23505') {
                    throw $e;
                }

                // Carrera con la misma clave: gana la compra ya creada.
                $ganadora = $this->buscarPorClave($proveedor->id, $clave);
                if ($ganadora) {
                    return $ganadora;
                }
                // Si no fue la clave, fue la referencia: se sortea otra.
            }
        }

        return null;
    }

    private function buscarPorClave(int $proveedorId, string $clave): ?CompraCredito
    {
        return CompraCredito::where('proveedor_id', $proveedorId)
            ->where('idempotency_key', $clave)
            ->first();
    }

    private function generarReferencia(): string
    {
        do {
            $referencia = 'SGT-' . str_pad((string) random_int(0, 9999999999), 10, '0', STR_PAD_LEFT);
        } while (CompraCredito::where('referencia', $referencia)->exists());

        return $referencia;
    }

    /** Una clave live fuera de produccion cobraria dinero real desde un entorno de desarrollo. */
    private function claveEnUsoEnAmbienteIncorrecto(): bool
    {
        return str_starts_with((string) config('services.stripe.secret'), 'sk_live_')
            && config('app.env') !== 'production';
    }

    private function respuestaSesion(CompraCredito $compra, ?string $clientSecret, int $status): JsonResponse
    {
        return $this->success('Pago preparado correctamente.', [
            'compra'          => $this->formatear($compra->load('paquete')),
            'client_secret'   => $clientSecret,
            'publishable_key' => $this->stripe->clavePublicable(),
        ], $status);
    }

    private function formatear(CompraCredito $compra): array
    {
        return [
            'id'                 => $compra->id,
            'paquete'            => $compra->paquete?->nombre,
            'monto_gtq'          => (float) $compra->monto_gtq,
            'creditos_otorgados' => $compra->creditos_otorgados,
            'estado'             => $compra->estado,
            'metodo_pago'        => $compra->metodo_pago,
            'referencia'         => $compra->referencia,
            'fallo_motivo'       => $compra->fallo_motivo,
            'completada_at'      => $compra->completada_at,
            'comprobante_disponible' => $compra->comprobante_snapshot !== null,
        ];
    }
}
