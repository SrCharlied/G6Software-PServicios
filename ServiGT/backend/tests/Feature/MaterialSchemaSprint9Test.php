<?php

namespace Tests\Feature;

use App\Models\Servicio;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\DB;
use Laravel\Sanctum\Sanctum;
use Tests\Feature\Concerns\CreaEscenarioMateriales;
use Tests\TestCase;

/*
 * ── AVISO PARA QUIEN MODIFIQUE ESTA PRUEBA ────────────────────────────────
 * Estas pruebas fueron desarrolladas por JA (Juan Salguero) como parte de la
 * cadena de dependencias de las Tasks 3.3 y 4.2 de Sprint 9, y cubren el
 * alcance de la Task asignada a otra persona (Task 2.1, esquema de materiales y origen de cancelacion). Describen el contrato
 * actual, no el definitivo.
 *
 * Si vas a cambiar o ampliar el comportamiento de esta Task (nuevas reglas,
 * campos, estados o rutas), no basta con ajustar estas pruebas: agrega
 * pruebas de regresion que demuestren que lo que ya funcionaba sigue
 * funcionando (permisos por rol, ownership, estados invalidos, idempotencia
 * y concurrencia cuando aplique) y ejecuta la suite backend completa.
 * ───────────────────────────────────────────────────────────────────────────
 */
/**
 * Task 2.1 (Sprint 9): esquema de materiales, origen de cancelacion y contexto
 * de mensajes. La base de pruebas se crea con database/init.sql, asi que estas
 * pruebas verifican el DDL efectivo (CHECK, UNIQUE parciales, FKs).
 */
class MaterialSchemaSprint9Test extends TestCase
{
    use DatabaseTransactions;
    use CreaEscenarioMateriales;

    public function test_existen_las_tablas_y_columnas_de_materiales(): void
    {
        foreach (['publicaciones_material', 'publicaciones_material_imagenes', 'reservas_material'] as $tabla) {
            $this->assertTrue(
                (bool) DB::selectOne('SELECT to_regclass(?) IS NOT NULL AS ok', [$tabla])->ok,
                "Falta la tabla {$tabla}"
            );
        }

        foreach ([['servicios', 'cancelado_desde'], ['mensajes', 'reserva_material_id']] as [$tabla, $columna]) {
            $this->assertNotNull(
                DB::selectOne(
                    'SELECT 1 AS ok FROM information_schema.columns WHERE table_name = ? AND column_name = ?',
                    [$tabla, $columna]
                ),
                "Falta {$tabla}.{$columna}"
            );
        }
    }

    public function test_cancelacion_nueva_desde_en_camino_guarda_su_origen(): void
    {
        $servicio = $this->servicioConEstado('en_camino');
        Sanctum::actingAs($servicio->cliente);

        $this->postJson("/api/servicios/{$servicio->id}/cancelar")->assertOk();

        $this->assertSame('en_camino', $servicio->fresh()->cancelado_desde);
    }

    public function test_cancelacion_desde_otros_estados_guarda_su_propio_origen(): void
    {
        $servicio = $this->servicioConEstado('aceptado');
        Sanctum::actingAs($servicio->cliente);

        $this->postJson("/api/servicios/{$servicio->id}/cancelar")->assertOk();

        $this->assertSame('aceptado', $servicio->fresh()->cancelado_desde);
    }

    public function test_cancelacion_historica_no_infiere_origen(): void
    {
        $servicio = $this->servicioConEstado('cancelado');

        $this->assertNull($servicio->fresh()->cancelado_desde);
    }

    public function test_cancelado_desde_rechaza_valores_fuera_del_dominio(): void
    {
        $servicio = $this->servicioConEstado('cancelado');

        $this->expectException(\Illuminate\Database\QueryException::class);
        DB::table('servicios')->where('id', $servicio->id)->update(['cancelado_desde' => 'completado']);
    }

    public function test_una_sola_publicacion_de_material_por_servicio(): void
    {
        $servicio = $this->servicioCanceladoDesdeEnCamino();
        $this->crearLote($servicio);

        $this->expectException(\Illuminate\Database\QueryException::class);
        $this->crearLote($servicio);
    }

    public function test_una_sola_reserva_aceptada_por_publicacion(): void
    {
        $lote = $this->crearLote($this->servicioCanceladoDesdeEnCamino());
        $this->crearReserva($lote, $this->crearProveedorComprador(), ['estado' => 'aceptada']);

        $this->expectException(\Illuminate\Database\QueryException::class);
        $this->crearReserva($lote, $this->crearProveedorComprador(), ['estado' => 'aceptada']);
    }

    public function test_varias_reservas_pendientes_pueden_coexistir(): void
    {
        $lote = $this->crearLote($this->servicioCanceladoDesdeEnCamino());
        $this->crearReserva($lote, $this->crearProveedorComprador());
        $this->crearReserva($lote, $this->crearProveedorComprador());

        $this->assertSame(2, DB::table('reservas_material')->where('publicacion_id', $lote->id)->count());
    }

    public function test_un_comprador_no_repite_solicitud_viva_ni_rechazada_en_el_mismo_lote(): void
    {
        $lote = $this->crearLote($this->servicioCanceladoDesdeEnCamino());
        $comprador = $this->crearProveedorComprador();
        $this->crearReserva($lote, $comprador, ['estado' => 'rechazada']);

        $this->expectException(\Illuminate\Database\QueryException::class);
        $this->crearReserva($lote, $comprador);
    }

    public function test_idempotency_key_es_unica_por_comprador(): void
    {
        $comprador = $this->crearProveedorComprador();
        $this->crearReserva($this->crearLote($this->servicioCanceladoDesdeEnCamino()), $comprador, ['idempotency_key' => 'clave-1']);

        $this->expectException(\Illuminate\Database\QueryException::class);
        $this->crearReserva($this->crearLote($this->servicioCanceladoDesdeEnCamino()), $comprador, ['idempotency_key' => 'clave-1']);
    }

    public function test_un_mensaje_no_puede_tener_servicio_y_reserva_a_la_vez(): void
    {
        $lote = $this->crearLote($servicio = $this->servicioCanceladoDesdeEnCamino());
        $reserva = $this->crearReserva($lote, $comprador = $this->crearProveedorComprador());

        $this->expectException(\Illuminate\Database\QueryException::class);
        DB::table('mensajes')->insert([
            'emisor_id'           => $servicio->cliente_id,
            'receptor_id'         => $comprador->user_id,
            'servicio_id'         => $servicio->id,
            'reserva_material_id' => $reserva->id,
            'contenido'           => 'ambiguo',
        ]);
    }

    public function test_mensaje_historico_sin_contexto_sigue_siendo_valido(): void
    {
        $servicio = $this->servicioConEstado('aceptado');

        DB::table('mensajes')->insert([
            'emisor_id'   => $servicio->cliente_id,
            'receptor_id' => $servicio->proveedor->user_id,
            'contenido'   => 'historico',
        ]);

        $this->assertSame(1, DB::table('mensajes')->where('contenido', 'historico')->count());
    }

    public function test_imagenes_de_catalogo_limitadas_a_tres_posiciones(): void
    {
        $lote = $this->crearLote($this->servicioCanceladoDesdeEnCamino());

        $this->expectException(\Illuminate\Database\QueryException::class);
        DB::table('publicaciones_material_imagenes')->insert(['publicacion_id' => $lote->id, 'ruta' => '/x.jpg', 'orden' => 4]);
    }

    public function test_modelo_servicio_expone_cancelado_desde_y_relacion(): void
    {
        $servicio = $this->servicioCanceladoDesdeEnCamino();
        $lote = $this->crearLote($servicio);

        $this->assertSame('en_camino', Servicio::find($servicio->id)->cancelado_desde);
        $this->assertSame($lote->id, Servicio::find($servicio->id)->publicacionMaterial->id);
    }
}
