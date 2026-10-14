<?php

namespace Tests\Feature\Concerns;

use App\Models\ReporteSeguridad;
use App\Models\Servicio;
use App\Models\User;

/*
 * ── AVISO PARA QUIEN MODIFIQUE ESTA PRUEBA ────────────────────────────────
 * Estas pruebas fueron desarrolladas por JA (Juan Salguero) como parte de la
 * cadena de dependencias de la Task 6.2 de Sprint 9, y cubren el alcance de
 * Tasks asignadas a otras personas (5.1, 5.2 y 5.3, Centro de seguridad).
 * Describen el contrato actual, no el definitivo.
 *
 * Si vas a cambiar o ampliar el comportamiento de esas Tasks (nuevas reglas,
 * campos, estados o rutas), no basta con ajustar estas pruebas: agrega
 * pruebas de regresion que demuestren que lo que ya funcionaba sigue
 * funcionando (permisos por rol, ownership, estados invalidos, idempotencia
 * y concurrencia cuando aplique) y ejecuta la suite backend completa.
 * ───────────────────────────────────────────────────────────────────────────
 */

/**
 * Fixtures del Centro de seguridad (Sprint 9). Se usa con DatabaseTransactions.
 */
trait CreaEscenarioSeguridad
{
    use CreaEscenarioMateriales;

    /** Servicio entre un cliente y un proveedor nuevos, con codigos de inicio/fin segun estado. */
    protected function servicioSeguro(string $estado = 'en_progreso', array $extra = []): Servicio
    {
        return $this->servicioConEstado($estado, null, array_merge([
            'codigo_inicio' => '123456',
            'codigo_fin'    => $estado === 'por_confirmar' ? '654321' : null,
        ], $extra));
    }

    protected function crearAdmin(): User
    {
        $user = User::create([
            'name'     => 'Admin Seguridad',
            'email'    => 'admin.seg.' . uniqid() . '@servigt.test',
            'password' => 'password-test',
            'role'     => 'admin',
        ]);
        $this->usuariosMat[] = $user->id;

        return $user;
    }

    protected function crearReporte(Servicio $servicio, User $reportante, array $extra = []): ReporteSeguridad
    {
        return ReporteSeguridad::create(array_merge([
            'servicio_id'            => $servicio->id,
            'reportante_id'          => $reportante->id,
            'categoria'              => 'conducta_inapropiada',
            'descripcion'            => 'El proveedor se comportó de forma inapropiada.',
            'interrumpio_servicio'   => false,
            'estado_servicio_previo' => $servicio->estado,
            'estado'                 => 'recibido',
            'idempotency_key'        => 'k-' . uniqid(),
        ], $extra));
    }
}
