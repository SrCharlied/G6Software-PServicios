<?php

namespace App\Services;

/**
 * Verifica la cabecera Stripe-Signature: "t=<unix>,v1=<hmac>[,v1=<hmac>...]".
 * El HMAC-SHA256 se calcula sobre "<t>.<cuerpo crudo>" con el signing secret del
 * endpoint. Se compara en tiempo constante y se rechaza una marca fuera de la
 * tolerancia para impedir la repeticion de un webhook capturado.
 */
class StripeWebhookVerifier
{
    public function verificar(string $payload, ?string $cabecera, string $secreto, int $tolerancia = 300, ?int $ahora = null): bool
    {
        if ($secreto === '' || $cabecera === null || $cabecera === '') {
            return false;
        }

        $marca = null;
        $firmas = [];

        foreach (explode(',', $cabecera) as $parte) {
            $par = explode('=', trim($parte), 2);
            if (count($par) !== 2) {
                continue;
            }
            if ($par[0] === 't') {
                $marca = $par[1];
            } elseif ($par[0] === 'v1') {
                $firmas[] = $par[1];
            }
        }

        if ($marca === null || !ctype_digit($marca) || $firmas === []) {
            return false;
        }

        if (abs(($ahora ?? time()) - (int) $marca) > $tolerancia) {
            return false;
        }

        $esperada = hash_hmac('sha256', $marca . '.' . $payload, $secreto);

        foreach ($firmas as $firma) {
            if (hash_equals($esperada, $firma)) {
                return true;
            }
        }

        return false;
    }
}
