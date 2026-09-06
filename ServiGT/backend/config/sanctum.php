<?php

use Laravel\Sanctum\Sanctum;

/*
 * Configuracion de Sanctum publicada a proposito (matriz OWASP, fila A07).
 *
 * Sin este archivo se usaba el default del paquete, donde `expiration` es
 * `null`: los tokens no caducaban nunca. Combinado con que en web el bearer
 * vive en `localStorage` (ver `frontend/src/services/storage.js`), un token
 * robado servia para siempre.
 */
return [

    'stateful' => explode(',', (string) env('SANCTUM_STATEFUL_DOMAINS', '')),

    // La API usa exclusivamente tokens Bearer; no hay sesion de cookie que
    // convertir en autenticacion.
    'guard' => ['web'],

    /*
     * Minutos de vida de un token. 30 dias es el equilibrio acordado: cubre el
     * uso normal de la app movil sin obligar a reautenticarse a diario, y pone
     * un techo a la ventana de un token robado.
     *
     * Nota operativa: expirar un token no lo borra de la tabla. El comando
     * `sanctum:prune-expired` es lo que limpia las filas viejas.
     */
    'expiration' => (int) env('SANCTUM_EXPIRATION_MINUTES', 60 * 24 * 30),

    'token_prefix' => env('SANCTUM_TOKEN_PREFIX', ''),

    'middleware' => [
        'authenticate_session' => Laravel\Sanctum\Http\Middleware\AuthenticateSession::class,
        'encrypt_cookies' => Illuminate\Cookie\Middleware\EncryptCookies::class,
        'validate_csrf_token' => Illuminate\Foundation\Http\Middleware\ValidateCsrfToken::class,
    ],

];
