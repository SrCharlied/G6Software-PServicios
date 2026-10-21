<?php

namespace App\Services;

use RuntimeException;

/**
 * Fallo al hablar con Stripe. El mensaje es seguro para registrar: nunca
 * incluye claves ni el cuerpo completo de la respuesta.
 */
class StripeException extends RuntimeException
{
}
