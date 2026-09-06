<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Cabeceras de seguridad en las respuestas del backend (task 6.3).
 *
 * POR QUE, SI NGINX YA LAS PONE
 * -----------------------------
 * En la topologia productiva (task 4.2) el backend vive detras de Nginx, que ya
 * agrega estas cabeceras al proxear `/api`. Pero el contenedor tambien se
 * levanta solo en desarrollo (puerto 8085) y ahi las respuestas salian sin
 * ninguna: el escaneo ZAP Baseline contra `http://backend:8000` reportaba CSP
 * ausente, falta de anti-clickjacking, `X-Powered-By` y nosniff faltante.
 * Ponerlas aqui hace que la proteccion no dependa de que alguien recuerde
 * poner un proxy delante.
 *
 * La CSP se aplica a todo, 404 incluidos: el backend no sirve ninguna vista
 * HTML —la API devuelve JSON, el disco publico devuelve imagenes y `/` devuelve
 * un JSON minimo—, asi que `default-src 'none'` no rompe nada.
 */
class SecurityHeaders
{
    public function handle(Request $request, Closure $next): Response
    {
        // PHP anuncia su version en cada respuesta si `expose_php` esta activo.
        // Es reconocimiento gratis para quien busque una version vulnerable.
        header_remove('X-Powered-By');

        $response = $next($request);

        $response->headers->remove('X-Powered-By');

        $cabeceras = [
            'X-Content-Type-Options' => 'nosniff',
            'X-Frame-Options' => 'DENY',
            'Referrer-Policy' => 'strict-origin-when-cross-origin',
            'Permissions-Policy' => 'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
            'Cross-Origin-Opener-Policy' => 'same-origin',
            'Cross-Origin-Resource-Policy' => 'same-origin',
        ];

        // El backend no sirve ni una sola vista HTML: la API devuelve JSON, el
        // disco publico devuelve imagenes y `/` devuelve un JSON minimo. Por eso
        // la CSP puede ser la mas estricta posible y aplicarse a todo, 404
        // incluidos —que es donde ZAP la echaba en falta—.
        $cabeceras['Content-Security-Policy'] = "default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'";
        $cabeceras['Cross-Origin-Embedder-Policy'] = 'require-corp';

        foreach ($cabeceras as $nombre => $valor) {
            // `set` y no `add`: si Nginx ya la puso, esto la deja igual en vez
            // de duplicarla, y un valor duplicado con contenido distinto es
            // exactamente lo que hace que un navegador aplique el mas estricto
            // de forma impredecible.
            $response->headers->set($nombre, $valor, true);
        }

        return $response;
    }
}
