<?php

namespace App\Services;

use App\Models\DocumentoProveedor;
use App\Models\PublicacionServicio;
use App\Models\SolicitudEliminacionCuenta;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use LogicException;

/**
 * Archivos de una cuenta eliminada (Task 3.1.c).
 *
 * 1. capturarManifiesto(): ANTES de anonimizar, guarda en la solicitud la lista
 *    de archivos personales. Despues de anonimizar el perfil ya no tiene rutas.
 * 2. limpiar(): borra lo del manifiesto. Es idempotente: un archivo que ya no
 *    existe cuenta como limpio, asi que se puede reintentar sin riesgo. Si algo
 *    falla la solicitud queda en limpieza_pendiente y suma un intento.
 *
 * Solo se toca lo que cae bajo los prefijos permitidos de cada disco. Quedan
 * fuera, por retencion, la evidencia de seguridad y las imagenes de lotes de
 * materiales (historial de servicios).
 */
class LimpiezaArchivosCuentaService
{
    public const PREFIJOS_PERMITIDOS = [
        // documentos/ en public cubre los documentos previos a la migracion al disco privado.
        'public' => ['fotos/', 'portadas/', 'publicaciones/', 'documentos/'],
        'local'  => ['documentos/'],
    ];

    /**
     * Lista [{disco, ruta}] sin duplicados de los archivos personales del usuario.
     */
    public function construirManifiesto(User $user): array
    {
        $entradas = [];
        $proveedor = $user->proveedor;

        if ($proveedor) {
            foreach ([$proveedor->foto_perfil, $proveedor->portada] as $url) {
                $entradas[] = ['disco' => 'public', 'ruta' => $this->rutaPublica($url)];
            }

            $imagenes = PublicacionServicio::where('proveedor_id', $proveedor->id)->pluck('imagen');
            foreach ($imagenes as $url) {
                $entradas[] = ['disco' => 'public', 'ruta' => $this->rutaPublica($url)];
            }

            // Los nuevos guardan `documentos/...` en el disco privado; los
            // legados, `/storage/documentos/...` (ver documentos:migrar-privado).
            $documentos = DocumentoProveedor::where('proveedor_id', $proveedor->id)->pluck('ruta_archivo');
            foreach ($documentos as $ruta) {
                $ruta = $this->rutaPublica($ruta);
                $entradas[] = ['disco' => 'local', 'ruta' => $ruta];
                $entradas[] = ['disco' => 'public', 'ruta' => $ruta];
            }
        }

        $validas = array_filter($entradas, fn ($e) => $this->esRutaPermitida($e['disco'], $e['ruta']));

        return array_values(array_unique($validas, SORT_REGULAR));
    }

    /**
     * Guarda el manifiesto en una solicitud aun pendiente. Debe llamarse dentro
     * de la misma transaccion que anonimiza (3.1.b), antes de limpiar rutas.
     */
    public function capturarManifiesto(SolicitudEliminacionCuenta $solicitud): SolicitudEliminacionCuenta
    {
        if ($solicitud->estado !== SolicitudEliminacionCuenta::PENDIENTE) {
            throw new LogicException('El manifiesto solo se captura en una solicitud pendiente.');
        }

        $solicitud->update(['manifiesto_archivos' => $this->construirManifiesto($solicitud->user)]);

        return $solicitud;
    }

    /**
     * Intenta borrar los archivos del manifiesto. Devuelve la solicitud en
     * `completada` si no queda nada, o en `limpieza_pendiente` con el error.
     */
    public function limpiar(SolicitudEliminacionCuenta $solicitud): SolicitudEliminacionCuenta
    {
        return DB::transaction(function () use ($solicitud) {
            $actual = SolicitudEliminacionCuenta::whereKey($solicitud->id)->lockForUpdate()->firstOrFail();

            // Otro proceso ya la termino, o aun no se anonimiza: nada que hacer.
            if ($actual->estado !== SolicitudEliminacionCuenta::LIMPIEZA_PENDIENTE) {
                return $actual;
            }

            $fallidos = [];
            foreach ($actual->manifiesto_archivos as $entrada) {
                $disco = $entrada['disco'] ?? null;
                $ruta  = $entrada['ruta'] ?? null;

                if (!is_string($disco) || !is_string($ruta) || !$this->esRutaPermitida($disco, $ruta)) {
                    $fallidos[] = 'entrada fuera de los prefijos permitidos';
                    continue;
                }

                $storage = Storage::disk($disco);
                if ($storage->exists($ruta) && !$storage->delete($ruta) && $storage->exists($ruta)) {
                    $fallidos[] = "no se pudo borrar {$disco}:{$ruta}";
                }
            }

            $cambios = ['intentos_limpieza' => $actual->intentos_limpieza + 1];

            if ($fallidos === []) {
                $cambios += [
                    'estado'                => SolicitudEliminacionCuenta::COMPLETADA,
                    'completada_at'         => now(),
                    'ultimo_error_limpieza' => null,
                ];
            } else {
                $cambios['ultimo_error_limpieza'] = implode('; ', $fallidos);
            }

            $actual->update($cambios);

            return $actual;
        });
    }

    public function esRutaPermitida(string $disco, ?string $ruta): bool
    {
        if ($ruta === null || $ruta === '' || str_starts_with($ruta, '/') || str_contains($ruta, '..')
            || str_contains($ruta, '\\')) {
            return false;
        }

        foreach (self::PREFIJOS_PERMITIDOS[$disco] ?? [] as $prefijo) {
            if (str_starts_with($ruta, $prefijo)) {
                return true;
            }
        }

        return false;
    }

    /**
     * Las rutas publicas se guardan como `/storage/<ruta>` (o URL absoluta con
     * ese segmento); el disco public espera solo `<ruta>`.
     */
    private function rutaPublica(?string $url): ?string
    {
        if ($url === null || $url === '') {
            return null;
        }

        $pos = strpos($url, '/storage/');

        return $pos === false ? $url : substr($url, $pos + strlen('/storage/'));
    }
}
