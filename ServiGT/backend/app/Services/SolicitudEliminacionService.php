<?php

namespace App\Services;

use App\Models\SolicitudEliminacionCuenta;
use App\Models\User;
use Illuminate\Support\Facades\DB;

/**
 * Registro idempotente de solicitudes de eliminacion (Task 3.1.a). Solo crea o
 * recupera la solicitud; reautenticacion, bloqueos por operaciones activas y
 * la anonimizacion en si viven en el servicio de 3.1.b.
 */
class SolicitudEliminacionService
{
    /**
     * Devuelve la solicitud de este intento, creandola si hace falta.
     *
     * - Misma clave: devuelve la misma solicitud, en cualquier estado.
     * - Clave nueva con otra solicitud vigente (en curso o completada):
     *   converge a esa, no abre una segunda.
     * - Clave nueva tras solicitudes rechazadas: crea una nueva pendiente.
     *
     * El lock sobre la fila del usuario serializa peticiones concurrentes del
     * mismo usuario; el indice parcial uq_solicitud_eliminacion_vigente es el
     * arbitro final si algo escapara al lock.
     */
    public function solicitar(User $user, string $idempotencyKey): SolicitudEliminacionCuenta
    {
        return DB::transaction(function () use ($user, $idempotencyKey) {
            User::whereKey($user->id)->lockForUpdate()->firstOrFail();

            $mismoIntento = SolicitudEliminacionCuenta::where('user_id', $user->id)
                ->where('idempotency_key', $idempotencyKey)
                ->first();
            if ($mismoIntento) {
                return $mismoIntento;
            }

            $vigente = SolicitudEliminacionCuenta::where('user_id', $user->id)
                ->vigentes()
                ->first();
            if ($vigente) {
                return $vigente;
            }

            return SolicitudEliminacionCuenta::create([
                'user_id'         => $user->id,
                'idempotency_key' => $idempotencyKey,
                'estado'          => SolicitudEliminacionCuenta::PENDIENTE,
            ])->refresh();
        });
    }
}
