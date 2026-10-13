<?php

namespace Tests\Feature;

use App\Models\HistorialReporteSeguridad;
use App\Models\ReporteSeguridad;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\DB;
use Tests\Feature\Concerns\CreaEscenarioSeguridad;
use Tests\TestCase;

/*
 * ── AVISO PARA QUIEN MODIFIQUE ESTA PRUEBA ────────────────────────────────
 * Estas pruebas fueron desarrolladas por JA (Juan Salguero) como parte de la
 * cadena de dependencias de la Task 6.2 de Sprint 9, y cubren el alcance de
 * la Task asignada a otra persona (Task 5.1, esquema de seguridad y nuevo
 * estado terminal). Describen el contrato actual, no el definitivo.
 *
 * Si vas a cambiar o ampliar el comportamiento de esta Task (nuevas reglas,
 * campos, estados o rutas), no basta con ajustar estas pruebas: agrega
 * pruebas de regresion que demuestren que lo que ya funcionaba sigue
 * funcionando (permisos por rol, ownership, estados invalidos, idempotencia
 * y concurrencia cuando aplique) y ejecuta la suite backend completa.
 * ───────────────────────────────────────────────────────────────────────────
 */

/**
 * Task 5.1 (Sprint 9): el esquema efectivo (init.sql) admite el estado terminal
 * y protege en BD las invariantes del Centro de seguridad.
 */
class SecurityReportSchemaSprint9Test extends TestCase
{
    use DatabaseTransactions;
    use CreaEscenarioSeguridad;

    public function test_existen_las_tres_tablas(): void
    {
        foreach (['reportes_seguridad', 'evidencias_reporte_seguridad', 'historial_reportes_seguridad'] as $tabla) {
            $this->assertTrue((bool) DB::selectOne('SELECT to_regclass(?) IS NOT NULL AS ok', [$tabla])->ok, "Falta {$tabla}");
        }
    }

    public function test_el_estado_terminal_cabe_y_el_check_efectivo_lo_acepta(): void
    {
        $largo = DB::selectOne("SELECT character_maximum_length AS n FROM information_schema.columns WHERE table_name = 'servicios' AND column_name = 'estado'")->n;
        $this->assertGreaterThanOrEqual(30, $largo);

        $servicio = $this->servicioSeguro('en_progreso');
        DB::table('servicios')->where('id', $servicio->id)->update(['estado' => 'interrumpido_seguridad']);

        $this->assertSame('interrumpido_seguridad', $servicio->fresh()->estado);
    }

    public function test_el_check_sigue_rechazando_estados_desconocidos(): void
    {
        $servicio = $this->servicioSeguro('en_progreso');

        $this->expectException(QueryException::class);
        DB::table('servicios')->where('id', $servicio->id)->update(['estado' => 'estado_inventado']);
    }

    public function test_los_estados_previos_siguen_validos(): void
    {
        foreach (['pendiente', 'aceptado', 'en_camino', 'en_progreso', 'por_confirmar', 'completado', 'cancelado', 'rechazado'] as $estado) {
            $this->assertSame($estado, $this->servicioSeguro($estado)->fresh()->estado);
        }
    }

    public function test_una_sola_interrupcion_por_servicio_pero_varios_reportes_simples(): void
    {
        $servicio = $this->servicioSeguro('en_progreso');
        $this->crearReporte($servicio, $servicio->cliente, ['interrumpio_servicio' => true]);
        $this->crearReporte($servicio, $servicio->proveedor->user, ['categoria' => 'otro']);
        $this->crearReporte($servicio, $servicio->cliente, ['categoria' => 'otro']);

        $this->assertSame(3, ReporteSeguridad::where('servicio_id', $servicio->id)->count());

        $this->expectException(QueryException::class);
        $this->crearReporte($servicio, $servicio->proveedor->user, ['interrumpio_servicio' => true]);
    }

    public function test_la_idempotency_key_es_unica_por_reportante(): void
    {
        $servicio = $this->servicioSeguro('en_progreso');
        $this->crearReporte($servicio, $servicio->cliente, ['idempotency_key' => 'clave']);
        // Otro reportante puede usar la misma clave.
        $this->crearReporte($servicio, $servicio->proveedor->user, ['idempotency_key' => 'clave']);

        $this->expectException(QueryException::class);
        $this->crearReporte($servicio, $servicio->cliente, ['idempotency_key' => 'clave']);
    }

    public function test_el_estado_del_reporte_esta_restringido(): void
    {
        $servicio = $this->servicioSeguro('en_progreso');

        $this->expectException(QueryException::class);
        $this->crearReporte($servicio, $servicio->cliente, ['estado' => 'cerrado']);
    }

    public function test_la_evidencia_admite_tres_posiciones_y_tipos_y_tamanos_validos(): void
    {
        $servicio = $this->servicioSeguro('en_progreso');
        $reporte = $this->crearReporte($servicio, $servicio->cliente);

        foreach ([1, 2, 3] as $orden) {
            DB::table('evidencias_reporte_seguridad')->insert($this->evidencia($reporte->id, $orden));
        }

        $this->assertSame(3, DB::table('evidencias_reporte_seguridad')->where('reporte_id', $reporte->id)->count());
    }

    public function test_una_cuarta_evidencia_o_una_posicion_repetida_se_rechazan(): void
    {
        $servicio = $this->servicioSeguro('en_progreso');
        $reporte = $this->crearReporte($servicio, $servicio->cliente);
        DB::table('evidencias_reporte_seguridad')->insert($this->evidencia($reporte->id, 1));

        $falla = 0;
        foreach ([$this->evidencia($reporte->id, 1), $this->evidencia($reporte->id, 4)] as $fila) {
            try {
                DB::transaction(fn () => DB::table('evidencias_reporte_seguridad')->insert($fila));
            } catch (QueryException) {
                $falla++;
            }
        }

        $this->assertSame(2, $falla);
    }

    public function test_la_evidencia_rechaza_mime_y_tamano_fuera_de_politica(): void
    {
        $servicio = $this->servicioSeguro('en_progreso');
        $reporte = $this->crearReporte($servicio, $servicio->cliente);

        $falla = 0;
        foreach ([
            $this->evidencia($reporte->id, 1, ['mime' => 'application/x-msdownload']),
            $this->evidencia($reporte->id, 2, ['tamano_bytes' => 5242881]),
            $this->evidencia($reporte->id, 3, ['tamano_bytes' => 0]),
        ] as $fila) {
            try {
                DB::transaction(fn () => DB::table('evidencias_reporte_seguridad')->insert($fila));
            } catch (QueryException) {
                $falla++;
            }
        }

        $this->assertSame(3, $falla);
    }

    public function test_el_historial_es_inmutable_pero_se_borra_en_cascada(): void
    {
        $servicio = $this->servicioSeguro('en_progreso');
        $reporte = $this->crearReporte($servicio, $servicio->cliente);
        $evento = HistorialReporteSeguridad::create([
            'reporte_id'     => $reporte->id,
            'actor_id'       => $servicio->cliente_id,
            'estado_anterior' => null,
            'estado_nuevo'   => 'recibido',
            'correlation_id' => 'corr-1',
        ]);

        try {
            DB::transaction(fn () => DB::table('historial_reportes_seguridad')->where('id', $evento->id)->update(['nota_interna' => 'manipulada']));
            $this->fail('El UPDATE del historial debio rechazarse.');
        } catch (QueryException $e) {
            $this->assertStringContainsString('inmutable', $e->getMessage());
        }

        $this->assertNull($evento->fresh()->nota_interna);

        // Reasignar el actor tampoco esta permitido.
        try {
            DB::transaction(fn () => DB::table('historial_reportes_seguridad')->where('id', $evento->id)->update(['actor_id' => $servicio->proveedor->user_id]));
            $this->fail('Cambiar el actor del historial debio rechazarse.');
        } catch (QueryException $e) {
            $this->assertStringContainsString('inmutable', $e->getMessage());
        }

        // Borrar el reporte (cascada) no queda bloqueado por el trigger.
        $reporte->delete();
        $this->assertSame(0, DB::table('historial_reportes_seguridad')->where('id', $evento->id)->count());
    }

    public function test_borrar_al_actor_solo_lo_anonimiza_y_no_toca_el_resto_del_evento(): void
    {
        $servicio = $this->servicioSeguro('en_progreso');
        $reporte = $this->crearReporte($servicio, $servicio->cliente);
        $admin = $this->crearAdmin();
        $evento = HistorialReporteSeguridad::create([
            'reporte_id'      => $reporte->id,
            'actor_id'        => $admin->id,
            'estado_anterior' => 'recibido',
            'estado_nuevo'    => 'en_revision',
            'nota_interna'    => 'nota de auditoria',
        ]);

        $admin->delete();

        $fresco = $evento->fresh();
        $this->assertNotNull($fresco, 'Borrar al actor no debe borrar el evento de auditoria.');
        $this->assertNull($fresco->actor_id);
        $this->assertSame('en_revision', $fresco->estado_nuevo);
        $this->assertSame('nota de auditoria', $fresco->getRawOriginal('nota_interna'));
    }

    public function test_los_modelos_ocultan_rutas_privadas_y_notas_internas(): void
    {
        $servicio = $this->servicioSeguro('en_progreso');
        $reporte = $this->crearReporte($servicio, $servicio->cliente);
        DB::table('evidencias_reporte_seguridad')->insert($this->evidencia($reporte->id, 1));
        HistorialReporteSeguridad::create(['reporte_id' => $reporte->id, 'estado_nuevo' => 'recibido', 'nota_interna' => 'nota secreta']);

        $json = json_encode($reporte->load(['evidencias', 'historial'])->toArray());

        $this->assertStringNotContainsString('ruta_privada', $json);
        $this->assertStringNotContainsString('seguridad/privada', $json);
        $this->assertStringNotContainsString('nota secreta', $json);
    }

    private function evidencia(int $reporteId, int $orden, array $extra = []): array
    {
        return array_merge([
            'reporte_id'      => $reporteId,
            'orden'           => $orden,
            'ruta_privada'    => "seguridad/privada/{$reporteId}/{$orden}.png",
            'nombre_original' => "foto{$orden}.png",
            'mime'            => 'image/png',
            'tamano_bytes'    => 1024,
            'sha256'          => str_repeat('a', 64),
        ], $extra);
    }
}
