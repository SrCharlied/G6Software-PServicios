<?php

namespace App\Services;

use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\RequestException;
use Illuminate\Support\Facades\Http;

/**
 * Cliente minimo de la API REST de Stripe (solo Checkout Sessions).
 *
 * Se usa el cliente HTTP de Laravel en vez de stripe-php: son dos llamadas, no
 * agrega dependencia al lockfile y las pruebas simulan Stripe con Http::fake.
 * La clave secreta vive solo en el backend; nunca viaja al frontend.
 */
class StripeClient
{
    public function configurado(): bool
    {
        return $this->secreta() !== '' && (string) config('services.stripe.publishable') !== '';
    }

    public function clavePublicable(): string
    {
        return (string) config('services.stripe.publishable');
    }

    /**
     * @param  array<string, mixed>  $params
     * @return array<string, mixed>
     */
    public function crearCheckoutSession(array $params, string $idempotencyKey): array
    {
        return $this->enviar('post', '/v1/checkout/sessions', $params, $idempotencyKey);
    }

    /** @return array<string, mixed> */
    public function obtenerCheckoutSession(string $id): array
    {
        return $this->enviar('get', '/v1/checkout/sessions/' . rawurlencode($id));
    }

    /**
     * @param  array<string, mixed>  $params
     * @return array<string, mixed>
     */
    public function actualizarSuscripcion(string $id, array $params): array
    {
        return $this->enviar('post', '/v1/subscriptions/' . rawurlencode($id), $params);
    }

    private function secreta(): string
    {
        return (string) config('services.stripe.secret');
    }

    private function enviar(string $metodo, string $ruta, array $params = [], ?string $idempotencyKey = null): array
    {
        if ($this->secreta() === '') {
            throw new StripeException('Stripe no esta configurado en el servidor.');
        }

        $peticion = Http::withToken($this->secreta())
            ->baseUrl(rtrim((string) config('services.stripe.base_url'), '/'))
            ->withHeaders(['Stripe-Version' => (string) config('services.stripe.api_version')])
            ->acceptJson()
            ->timeout(15)
            ->retry(
                2,
                200,
                // Solo fallos transitorios: un 4xx no mejora reintentando.
                fn ($e) => $e instanceof ConnectionException
                    || ($e instanceof RequestException && $e->response->serverError()),
                throw: false
            );

        if ($idempotencyKey !== null) {
            $peticion = $peticion->withHeaders(['Idempotency-Key' => $idempotencyKey]);
        }

        try {
            $respuesta = $metodo === 'get'
                ? $peticion->get($ruta)
                : $peticion->asForm()->post($ruta, $params);
        } catch (ConnectionException $e) {
            throw new StripeException('No se pudo conectar con Stripe.', 0, $e);
        }

        if (!$respuesta->successful()) {
            // Solo tipo y codigo: el mensaje de Stripe puede citar datos del pagador.
            $tipo = (string) $respuesta->json('error.type', 'desconocido');
            $codigo = (string) $respuesta->json('error.code', '');
            throw new StripeException("Stripe respondio {$respuesta->status()} ({$tipo} {$codigo}).");
        }

        $cuerpo = $respuesta->json();
        if (!is_array($cuerpo) || empty($cuerpo['id'])) {
            throw new StripeException('Respuesta de Stripe invalida.');
        }

        return $cuerpo;
    }
}
