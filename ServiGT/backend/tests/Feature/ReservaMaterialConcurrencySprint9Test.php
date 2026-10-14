<?php

namespace Tests\Feature;

use App\Models\Notificacion;
use App\Models\PublicacionMaterial;
use App\Models\ReservaMaterial;
use App\Models\Mensaje;
use Illuminate\Support\Facades\DB;
use PHPUnit\Framework\Attributes\Group;
use Tests\Feature\Concerns\CompiteConProcesos;
use Tests\Feature\Concerns\CreaEscenarioMateriales;
use Tests\TestCase;

/*
 * ── AVISO PARA QUIEN MODIFIQUE ESTA PRUEBA ────────────────────────────────
 * Estas pruebas fueron desarrolladas por JA (Juan Salguero) como parte de la
 * cadena de dependencias de las Tasks 3.3 y 4.2 de Sprint 9, y cubren el
 * alcance de la Task asignada a otra persona (Task 2.3, reservas de
 * materiales). Describen el contrato actual, no el definitivo.
 *
 * Si vas a cambiar o ampliar el comportamiento de esta Task (nuevas reglas,
 * campos, estados o rutas), no basta con ajustar estas pruebas: agrega
 * pruebas de regresion que demuestren que lo que ya funcionaba sigue
 * funcionando (permisos por rol, ownership, estados invalidos, idempotencia
 * y concurrencia cuando aplique) y ejecuta la suite backend completa.
 * ───────────────────────────────────────────────────────────────────────────
 */

/**
 * Task 2.3 (Sprint 9) — carreras reales contra PostgreSQL.
 *
 * Sin `DatabaseTransactions`: una conexion independiente no ve filas dentro de
 * una transaccion sin commit, asi que los fixtures se comitean y `tearDown`
 * los borra de forma dirigida (mismo criterio que ServicioConcurrenciaTest).
 *
 * Cada peticion rival la ejecuta un PROCESO PHP HIJO que arranca la aplicacion
 * completa y atiende la peticion HTTP con un token Sanctum real. Para
 * garantizar que choquen, el proceso padre mantiene un `FOR UPDATE` sobre el
 * lote hasta comprobar en `pg_stat_activity` que los dos hijos estan esperando
 * ese lock; solo entonces lo suelta y compiten.
 */
#[Group('concurrencia')]
class ReservaMaterialConcurrencySprint9Test extends TestCase
{
    use CreaEscenarioMateriales;
    use CompiteConProcesos;

    protected function tearDown(): void
    {
        $this->limpiarCommiteados();

        parent::tearDown();
    }

    public function test_dos_aceptaciones_simultaneas_de_reservas_distintas_dejan_un_solo_ganador(): void
    {
        [$lote, $vendedor] = $this->loteCommiteado();
        $a = $this->crearProveedorComprador();
        $b = $this->crearProveedorComprador();
        $ra = $this->crearReserva($lote, $a);
        $rb = $this->crearReserva($lote, $b);
        $token = $vendedor->user->createToken('t')->plainTextToken;

        $resultados = $this->competir('publicaciones_material', $lote->id, [
            ['POST', "/api/reservas-material/{$ra->id}/aceptar", $token, []],
            ['POST', "/api/reservas-material/{$rb->id}/aceptar", $token, []],
        ]);

        $estados = collect($resultados)->pluck('status')->sort()->values()->all();
        $this->assertSame([200, 422], $estados, 'Debia ganar exactamente una aceptacion: ' . json_encode($resultados));

        $this->assertSame(1, ReservaMaterial::where('publicacion_id', $lote->id)->where('estado', 'aceptada')->count());
        $this->assertSame(1, ReservaMaterial::where('publicacion_id', $lote->id)->where('estado', 'rechazada')->count());
        $this->assertSame('reservado', $lote->fresh()->estado);

        // Notificaciones unicas: una aceptada y una rechazada, nunca duplicadas.
        $this->assertSame(1, Notificacion::whereIn('destinatario_id', [$a->user_id, $b->user_id])->where('tipo', 'reserva_material_aceptada')->count());
        $this->assertSame(1, Notificacion::whereIn('destinatario_id', [$a->user_id, $b->user_id])->where('tipo', 'reserva_material_rechazada')->count());
    }

    public function test_dos_aceptaciones_simultaneas_de_la_misma_reserva_notifican_una_vez(): void
    {
        [$lote, $vendedor] = $this->loteCommiteado();
        $comprador = $this->crearProveedorComprador();
        $reserva = $this->crearReserva($lote, $comprador);
        $token = $vendedor->user->createToken('t')->plainTextToken;

        $resultados = $this->competir('publicaciones_material', $lote->id, [
            ['POST', "/api/reservas-material/{$reserva->id}/aceptar", $token, []],
            ['POST', "/api/reservas-material/{$reserva->id}/aceptar", $token, []],
        ]);

        $this->assertSame([200, 422], collect($resultados)->pluck('status')->sort()->values()->all(), json_encode($resultados));
        $this->assertSame(1, Notificacion::where('destinatario_id', $comprador->user_id)->where('tipo', 'reserva_material_aceptada')->count());
    }

    public function test_dos_solicitudes_simultaneas_con_la_misma_clave_crean_una_sola_reserva(): void
    {
        [$lote] = $this->loteCommiteado();
        $comprador = $this->crearProveedorComprador();
        $token = $comprador->user->createToken('t')->plainTextToken;
        $cuerpo = ['idempotency_key' => 'clave-carrera', 'mensaje_inicial' => 'Me interesa el lote.'];

        $resultados = $this->competir('publicaciones_material', $lote->id, [
            ['POST', "/api/materiales/{$lote->id}/reservas", $token, $cuerpo],
            ['POST', "/api/materiales/{$lote->id}/reservas", $token, $cuerpo],
        ]);

        $this->assertSame([200, 201], collect($resultados)->pluck('status')->sort()->values()->all(), json_encode($resultados));
        $this->assertSame(1, ReservaMaterial::where('publicacion_id', $lote->id)->count());
        $this->assertSame(1, Mensaje::whereNotNull('reserva_material_id')->where('emisor_id', $comprador->user_id)->count());
        $this->assertSame(1, Notificacion::where('tipo', 'reserva_material_solicitada')->where('datos->publicacion_id', $lote->id)->count());
    }

    // ── Arnes ────────────────────────────────────────────────────────────────

    /** @return array{0: PublicacionMaterial, 1: \App\Models\Proveedor} */
    private function loteCommiteado(): array
    {
        $this->categoriaMat();
        $vendedor = $this->crearProveedorComprador();

        return [$this->crearLote($this->servicioCanceladoDesdeEnCamino($vendedor)), $vendedor];
    }

}
