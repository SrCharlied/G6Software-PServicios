<?php

namespace App\Rules;

use Closure;
use Illuminate\Contracts\Validation\ValidationRule;

/**
 * Verifica que el dominio del correo pueda recibir mensajes (MX, o A/AAAA
 * como respaldo implicito de RFC 5321).
 *
 * Los dominios reservados (.test, example.com...) no resuelven en DNS, asi que
 * solo se eximen cuando el ambiente es local/testing Y el dominio esta listado
 * de forma explicita en config('auth.registro.dominios_reservados'). En
 * cualquier otro ambiente esa lista se ignora por completo.
 */
class DominioCorreoValido implements ValidationRule
{
    private const AMBIENTES_PERMISIVOS = ['local', 'testing'];

    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        $dominio = $this->dominioDe($value);

        if ($dominio === null) {
            $fail('Ingresa un correo electrónico válido.');

            return;
        }

        if ($this->estaExentoPorConfiguracion($dominio)) {
            return;
        }

        if (!$this->resolver($dominio)) {
            $fail('El dominio del correo electrónico no existe o no puede recibir correos.');
        }
    }

    private function dominioDe(mixed $value): ?string
    {
        if (!is_string($value) || !str_contains($value, '@')) {
            return null;
        }

        $dominio = mb_strtolower(substr(strrchr($value, '@'), 1), 'UTF-8');
        $dominio = rtrim($dominio, '.');

        return $dominio === '' ? null : $dominio;
    }

    private function estaExentoPorConfiguracion(string $dominio): bool
    {
        if (!app()->environment(self::AMBIENTES_PERMISIVOS)) {
            return false;
        }

        $permitidos = (array) config('auth.registro.dominios_reservados', []);

        return in_array($dominio, $permitidos, true);
    }

    private function resolver(string $dominio): bool
    {
        // Resolvedor reemplazable: las pruebas lo sustituyen para no depender
        // de DNS externo.
        $resolvedor = app()->bound('auth.resolvedor_dns')
            ? app('auth.resolvedor_dns')
            : static function (string $host): bool {
                // IDN -> punycode; el punto final evita busquedas por sufijos de busqueda.
                $ascii = function_exists('idn_to_ascii')
                    ? (idn_to_ascii($host, IDNA_DEFAULT, INTL_IDNA_VARIANT_UTS46) ?: $host)
                    : $host;

                foreach (['MX', 'A', 'AAAA'] as $tipo) {
                    if (checkdnsrr($ascii . '.', $tipo)) {
                        return true;
                    }
                }

                return false;
            };

        return (bool) $resolvedor($dominio);
    }
}
