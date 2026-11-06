<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Third Party Services
    |--------------------------------------------------------------------------
    |
    | This file is for storing the credentials for third party services such
    | as Resend, Postmark, AWS, and more. This file provides the de facto
    | location for this type of information, allowing packages to have
    | a conventional file to locate the various service credentials.
    |
    */

    'postmark' => [
        'key' => env('POSTMARK_API_KEY'),
    ],

    'resend' => [
        'key' => env('RESEND_API_KEY'),
    ],

    'ses' => [
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],

    'slack' => [
        'notifications' => [
            'bot_user_oauth_token' => env('SLACK_BOT_USER_OAUTH_TOKEN'),
            'channel' => env('SLACK_BOT_USER_DEFAULT_CHANNEL'),
        ],
    ],

    // Pasarela de pago. 'simulated' conserva la compra inmediata sin cobro;
    // 'stripe' exige Checkout Session y acredita solo por webhook firmado.
    'payments' => [
        'driver' => env('PAYMENTS_DRIVER', 'simulated'),
    ],

    'stripe' => [
        'secret'         => env('STRIPE_SECRET_KEY'),
        'publishable'    => env('STRIPE_PUBLISHABLE_KEY'),
        'webhook_secret' => env('STRIPE_WEBHOOK_SECRET'),
        'currency'       => env('STRIPE_CURRENCY', 'gtq'),
        'base_url'       => env('STRIPE_API_BASE', 'https://api.stripe.com'),
        // Checkout con ui_mode 'form' requiere Dahlia (2026-03-25) o posterior.
        'api_version'    => env('STRIPE_API_VERSION', '2026-09-30.endive'),
        // Origen del frontend al que Stripe devuelve al pagador tras confirmar.
        'return_origin'  => env('STRIPE_RETURN_ORIGIN', 'http://localhost:8086'),
        // Segundos de tolerancia entre la marca de la firma y el reloj local.
        'webhook_tolerance' => 300,
    ],

];
