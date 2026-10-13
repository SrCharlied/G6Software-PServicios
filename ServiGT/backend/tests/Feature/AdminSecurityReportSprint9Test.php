<?php

namespace Tests\Feature;

use App\Models\HistorialReporteSeguridad;
use App\Models\Notificacion;
use App\Models\ReporteSeguridad;
use App\Models\Servicio;
use App\Models\User;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\DB;
use Laravel\Sanctum\Sanctum;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\Feature\Concerns\CreaEscenarioSeguridad;
use Tests\TestCase;

/**
 * Task 5.4 (Sprint 9): cola administrativa de reportes de seguridad y auditoria.
 * recibido -> en_revision -> resuelto | descartado, siempre bajo lock, con un
 * evento inmutable (actor, estado anterior/nuevo, nota interna, correlation ID).
 * Resolver o descartar nunca toca el servicio.
 */
class AdminSecurityReportSprint9Test extends TestCase
{
    use DatabaseTransactions;
    use CreaEscenarioSeguridad;

    private const RUTAS = [
        ['get', '/api/admin/reportes-seguridad'],
        ['get', '/api/admin/reportes-seguridad/1'],
        ['post', '/api/admin/reportes-seguridad/1/estado'],
    ];

    // ── Acceso ───────────────────────────────────────────────────────────────

    public function test_anonimo_recibe_401_y_cliente_o_proveedor_reciben_403(): void
    {
        foreach (self::RUTAS as [$metodo, $ruta]) {
            $this->json($metodo, $ruta, ['estado' => 'en_revision'])->assertUnauthorized();
        }

        foreach ([$this->crearCliente(), $this->crearProveedorComprador()->user] as $usuario) {
            Sanctum::actingAs($usuario);
            foreach (self::RUTAS as [$metodo, $ruta]) {
                $this->json($metodo, $ruta, ['estado' => 'en_revision'])->assertForbidden();
            }
        }
    }

    public function test_el_reportante_no_puede_cambiar_el_estado_de_su_propio_reporte(): void
    {
        [$servicio, $reporte] = $this->reporteSimple();
        Sanctum::actingAs($servicio->cliente);

        $this->postJson("/api/admin/reportes-seguridad/{$reporte->id}/estado", ['estado' => 'resuelto'])->assertForbidden();

        $this->assertSame('recibido', $reporte->fresh()->estado);
    }

    // ── Listado ──────────────────────────────────────────────────────────────

    public function test_la_cola_lista_con_estado_del_reporte_y_estado_del_servicio_por_separado(): void
    {
        [$servicio, $reporte] = $this->reporteInterrupcion();
        Sanctum::actingAs($this->crearAdmin());

        $item = $this->getJson('/api/admin/reportes-seguridad')->assertOk()->json('reportes.0');

        $this->assertSame($reporte->id, $item['id']);
        $this->assertSame('recibido', $item['estado'], 'estado del reporte');
        $this->assertSame('interrumpido_seguridad', $item['servicio']['estado'], 'estado del servicio');
        $this->assertTrue($item['interrumpio_servicio']);
        $this->assertSame($servicio->cliente->name, $item['reportante']['name']);
        $this->assertSame(0, $item['evidencias_count']);
        $this->assertSame($servicio->id, $item['servicio']['id']);
    }

    public function test_filtros_por_estado_categoria_interrupcion_y_servicio(): void
    {
        [$s1, $r1] = $this->reporteSimple(['categoria' => 'robo_o_dano']);
        [$s2, $r2] = $this->reporteSimple(['estado' => 'en_revision', 'categoria' => 'emergencia']);
        [$s3, $r3] = $this->reporteInterrupcion();
        Sanctum::actingAs($this->crearAdmin());

        $ids = fn (string $query) => collect($this->getJson("/api/admin/reportes-seguridad?{$query}")->assertOk()->json('reportes'))->pluck('id')->all();

        $this->assertEqualsCanonicalizing([$r1->id, $r3->id], $ids('estado=recibido'));
        $this->assertSame([$r2->id], $ids('estado=en_revision'));
        $this->assertSame([$r1->id], $ids('categoria=robo_o_dano'));
        $this->assertSame([$r3->id], $ids('interrumpio=1'));
        $this->assertEqualsCanonicalizing([$r1->id, $r2->id], $ids('interrumpio=0'));
        $this->assertSame([$r2->id], $ids("servicio_id={$s2->id}"));
        $this->assertSame([$r1->id], $ids('estado=recibido&categoria=robo_o_dano'));
    }

    #[DataProvider('filtrosInvalidos')]
    public function test_un_filtro_invalido_devuelve_422(string $query): void
    {
        Sanctum::actingAs($this->crearAdmin());

        $this->getJson("/api/admin/reportes-seguridad?{$query}")->assertStatus(422);
    }

    public static function filtrosInvalidos(): array
    {
        return [['estado=cerrado'], ['categoria=inventada'], ['per_page=0'], ['per_page=500'], ['servicio_id=abc']];
    }

    public function test_pagina_y_ordena_del_mas_reciente_al_mas_antiguo(): void
    {
        $creados = [];
        foreach (range(1, 3) as $i) {
            [, $reporte] = $this->reporteSimple();
            DB::table('reportes_seguridad')->where('id', $reporte->id)->update(['created_at' => "2026-10-0{$i} 10:00:00"]);
            $creados[$i] = $reporte->id;
        }
        Sanctum::actingAs($this->crearAdmin());

        $p1 = $this->getJson('/api/admin/reportes-seguridad?per_page=2')->assertOk()
            ->assertJsonCount(2, 'reportes')->assertJsonPath('meta.total', 3)->assertJsonPath('meta.last_page', 2);
        $p2 = $this->getJson('/api/admin/reportes-seguridad?per_page=2&page=2')->assertOk()->assertJsonCount(1, 'reportes');

        $this->assertSame([$creados[3], $creados[2]], collect($p1->json('reportes'))->pluck('id')->all());
        $this->assertSame([$creados[1]], collect($p2->json('reportes'))->pluck('id')->all());
    }

    public function test_la_lista_no_expone_rutas_ni_notas_y_no_hace_n_mas_uno(): void
    {
        foreach (range(1, 4) as $i) {
            [$servicio, $reporte] = $this->reporteSimple();
            DB::table('evidencias_reporte_seguridad')->insert([
                'reporte_id' => $reporte->id, 'orden' => 1, 'ruta_privada' => "seguridad/privada/{$i}.png",
                'mime' => 'image/png', 'tamano_bytes' => 10, 'sha256' => str_repeat('b', 64),
            ]);
            HistorialReporteSeguridad::create(['reporte_id' => $reporte->id, 'estado_nuevo' => 'recibido', 'nota_interna' => 'nota secreta']);
        }
        Sanctum::actingAs($this->crearAdmin());

        DB::enableQueryLog();
        $respuesta = $this->getJson('/api/admin/reportes-seguridad')->assertOk();
        $consultas = count(DB::getQueryLog());
        DB::disableQueryLog();

        $json = json_encode($respuesta->json());
        $this->assertStringNotContainsString('seguridad/privada', $json);
        $this->assertStringNotContainsString('nota secreta', $json);
        $this->assertLessThanOrEqual(12, $consultas, "Demasiadas consultas ({$consultas}): hay un N+1.");
    }

    // ── Detalle ──────────────────────────────────────────────────────────────

    public function test_el_detalle_trae_historial_con_actor_y_nota_evidencias_sin_ruta_y_transiciones(): void
    {
        [$servicio, $reporte] = $this->reporteSimple();
        $admin = $this->crearAdmin();
        HistorialReporteSeguridad::create([
            'reporte_id' => $reporte->id, 'actor_id' => $admin->id, 'estado_anterior' => 'recibido',
            'estado_nuevo' => 'en_revision', 'nota_interna' => 'Se contactó al reportante', 'correlation_id' => 'corr-123456',
        ]);
        $reporte->update(['estado' => 'en_revision']);
        DB::table('evidencias_reporte_seguridad')->insert([
            'reporte_id' => $reporte->id, 'orden' => 1, 'ruta_privada' => 'seguridad/privada/x.pdf',
            'nombre_original' => 'acta.pdf', 'mime' => 'application/pdf', 'tamano_bytes' => 2048, 'sha256' => str_repeat('c', 64),
        ]);
        Sanctum::actingAs($admin);

        $r = $this->getJson("/api/admin/reportes-seguridad/{$reporte->id}")->assertOk();

        $this->assertSame('en_revision', $r->json('reporte.estado'));
        $this->assertEqualsCanonicalizing(['resuelto', 'descartado'], $r->json('reporte.transiciones_permitidas'));
        $this->assertSame('Se contactó al reportante', $r->json('reporte.historial.0.nota_interna'));
        $this->assertSame($admin->name, $r->json('reporte.historial.0.actor.name'));
        $this->assertSame('corr-123456', $r->json('reporte.historial.0.correlation_id'));
        $this->assertSame('application/pdf', $r->json('reporte.evidencias.0.mime'));
        $this->assertStringNotContainsString('seguridad/privada', json_encode($r->json()));
        $this->assertSame($servicio->estado, $r->json('reporte.servicio.estado'));
        $this->assertSame($servicio->cliente->name, $r->json('reporte.reportante.name'));
    }

    public function test_detalle_de_un_reporte_inexistente_devuelve_404(): void
    {
        Sanctum::actingAs($this->crearAdmin());

        $this->getJson('/api/admin/reportes-seguridad/99999999')->assertNotFound();
        $this->postJson('/api/admin/reportes-seguridad/99999999/estado', ['estado' => 'en_revision'])->assertNotFound();
    }

    // ── Cambio de estado ─────────────────────────────────────────────────────

    public function test_recorre_recibido_en_revision_resuelto_con_un_evento_auditable_por_cambio(): void
    {
        [, $reporte] = $this->reporteSimple();
        $admin = $this->crearAdmin();
        Sanctum::actingAs($admin);
        $correlacion = 'corr-' . uniqid();

        $this->withHeaders(['X-Correlation-ID' => $correlacion])
            ->postJson("/api/admin/reportes-seguridad/{$reporte->id}/estado", ['estado' => 'en_revision', 'nota_interna' => 'Tomado por seguridad'])
            ->assertOk()->assertJsonPath('reporte.estado', 'en_revision');

        $this->postJson("/api/admin/reportes-seguridad/{$reporte->id}/estado", ['estado' => 'resuelto', 'nota_interna' => 'Caso cerrado'])
            ->assertOk()->assertJsonPath('reporte.estado', 'resuelto')->assertJsonPath('reporte.transiciones_permitidas', []);

        $this->assertSame('resuelto', $reporte->fresh()->estado);

        $eventos = HistorialReporteSeguridad::where('reporte_id', $reporte->id)->orderBy('id')->get();
        $this->assertCount(2, $eventos, 'Un evento por cada cambio (no hubo evento de creacion al usar la fixture).');
        $this->assertSame([$admin->id, $admin->id], $eventos->pluck('actor_id')->all());
        $this->assertSame(['recibido', 'en_revision'], $eventos->pluck('estado_anterior')->all());
        $this->assertSame(['en_revision', 'resuelto'], $eventos->pluck('estado_nuevo')->all());
        $this->assertSame('Tomado por seguridad', $eventos[0]->getRawOriginal('nota_interna'));
        $this->assertSame($correlacion, $eventos[0]->correlation_id);
        $this->assertNotEmpty($eventos[1]->correlation_id);
    }

    public function test_tambien_puede_descartar_desde_en_revision(): void
    {
        [, $reporte] = $this->reporteSimple(['estado' => 'en_revision']);
        Sanctum::actingAs($this->crearAdmin());

        $this->postJson("/api/admin/reportes-seguridad/{$reporte->id}/estado", ['estado' => 'descartado'])
            ->assertOk()->assertJsonPath('reporte.estado', 'descartado');
    }

    #[DataProvider('transicionesInvalidas')]
    public function test_las_transiciones_invalidas_se_rechazan_sin_dejar_rastro(string $desde, string $hacia): void
    {
        [, $reporte] = $this->reporteSimple(['estado' => $desde]);
        Sanctum::actingAs($this->crearAdmin());

        $this->postJson("/api/admin/reportes-seguridad/{$reporte->id}/estado", ['estado' => $hacia])->assertStatus(422);

        $this->assertSame($desde, $reporte->fresh()->estado);
        $this->assertSame(0, HistorialReporteSeguridad::where('reporte_id', $reporte->id)->count());
    }

    public static function transicionesInvalidas(): array
    {
        return [
            'recibido a resuelto'    => ['recibido', 'resuelto'],
            'recibido a descartado'  => ['recibido', 'descartado'],
            'recibido a recibido'    => ['recibido', 'recibido'],
            'en_revision a recibido' => ['en_revision', 'recibido'],
            'en_revision a si mismo' => ['en_revision', 'en_revision'],
            'resuelto a en_revision' => ['resuelto', 'en_revision'],
            'resuelto a descartado'  => ['resuelto', 'descartado'],
            'descartado a resuelto'  => ['descartado', 'resuelto'],
            'descartado reabierto'   => ['descartado', 'en_revision'],
        ];
    }

    public function test_validacion_del_cuerpo(): void
    {
        [, $reporte] = $this->reporteSimple();
        Sanctum::actingAs($this->crearAdmin());
        $url = "/api/admin/reportes-seguridad/{$reporte->id}/estado";

        $this->postJson($url, [])->assertStatus(422)->assertJsonValidationErrors('estado');
        $this->postJson($url, ['estado' => 'cerrado'])->assertStatus(422)->assertJsonValidationErrors('estado');
        $this->postJson($url, ['estado' => 'en_revision', 'nota_interna' => str_repeat('x', 2001)])->assertStatus(422)->assertJsonValidationErrors('nota_interna');

        $this->assertSame('recibido', $reporte->fresh()->estado);
        $this->assertSame(0, HistorialReporteSeguridad::count());
    }

    public function test_el_actor_es_siempre_el_admin_autenticado_y_no_el_del_body(): void
    {
        [, $reporte] = $this->reporteSimple();
        $admin = $this->crearAdmin();
        $otro = $this->crearAdmin();
        Sanctum::actingAs($admin);

        $this->postJson("/api/admin/reportes-seguridad/{$reporte->id}/estado", ['estado' => 'en_revision', 'actor_id' => $otro->id])->assertOk();

        $this->assertSame($admin->id, HistorialReporteSeguridad::firstOrFail()->actor_id);
    }

    public function test_un_fallo_al_auditar_revierte_el_cambio_de_estado(): void
    {
        [, $reporte] = $this->reporteSimple();
        Sanctum::actingAs($this->crearAdmin());

        HistorialReporteSeguridad::creating(function () {
            throw new \RuntimeException('fallo simulado al auditar');
        });

        $this->postJson("/api/admin/reportes-seguridad/{$reporte->id}/estado", ['estado' => 'en_revision'])->assertStatus(500);

        HistorialReporteSeguridad::flushEventListeners();

        $this->assertSame('recibido', $reporte->fresh()->estado, 'Sin evento de auditoria no puede haber cambio de estado.');
    }

    // ── El servicio no se toca ───────────────────────────────────────────────

    public function test_resolver_o_descartar_no_modifica_ni_reabre_el_servicio(): void
    {
        foreach (['resuelto', 'descartado'] as $final) {
            [$servicio, $reporte] = $this->reporteInterrupcion(['estado' => 'en_revision']);
            $antes = $servicio->fresh()->only(['estado', 'codigo_inicio', 'codigo_fin', 'monto_acordado', 'motivo_cancelacion']);
            Sanctum::actingAs($this->crearAdmin());

            $this->postJson("/api/admin/reportes-seguridad/{$reporte->id}/estado", ['estado' => $final, 'nota_interna' => 'cierre'])->assertOk();

            $this->assertSame($antes, $servicio->fresh()->only(['estado', 'codigo_inicio', 'codigo_fin', 'monto_acordado', 'motivo_cancelacion']));
            $this->assertSame('interrumpido_seguridad', $servicio->fresh()->estado, "{$final} no debe reabrir ni completar el servicio.");
        }
    }

    public function test_un_reporte_simple_tampoco_altera_el_servicio_en_curso(): void
    {
        [$servicio, $reporte] = $this->reporteSimple(['estado' => 'en_revision']);
        Sanctum::actingAs($this->crearAdmin());

        $this->postJson("/api/admin/reportes-seguridad/{$reporte->id}/estado", ['estado' => 'resuelto'])->assertOk();

        $this->assertSame('en_progreso', $servicio->fresh()->estado);
    }

    // ── Las notas internas nunca llegan a las partes ─────────────────────────

    public function test_la_nota_interna_no_llega_al_reportante_ni_a_la_contraparte(): void
    {
        [$servicio, $reporte] = $this->reporteSimple();
        Sanctum::actingAs($this->crearAdmin());
        $this->postJson("/api/admin/reportes-seguridad/{$reporte->id}/estado", ['estado' => 'en_revision', 'nota_interna' => 'NOTA-CONFIDENCIAL-ADMIN'])->assertOk();

        // Reportante: su reporte, su servicio y sus notificaciones.
        Sanctum::actingAs($servicio->cliente);
        $propio = json_encode([
            $this->getJson("/api/seguridad/reportes/{$reporte->id}")->assertOk()->json(),
            $this->getJson("/api/servicios/{$servicio->id}")->assertOk()->json(),
            $this->getJson('/api/notificaciones')->assertOk()->json(),
        ]);
        $this->assertStringNotContainsString('NOTA-CONFIDENCIAL-ADMIN', $propio);
        $this->assertStringNotContainsString('historial', $propio);

        // Contraparte: no ve el reporte y su servicio/notificaciones no filtran la nota.
        Sanctum::actingAs($servicio->proveedor->user);
        $this->getJson("/api/seguridad/reportes/{$reporte->id}")->assertForbidden();
        $contraparte = json_encode([
            $this->getJson("/api/servicios/{$servicio->id}")->assertOk()->json(),
            $this->getJson('/api/notificaciones')->assertOk()->json(),
        ]);
        $this->assertStringNotContainsString('NOTA-CONFIDENCIAL-ADMIN', $contraparte);
        $this->assertSame(0, Notificacion::whereIn('destinatario_id', [$servicio->cliente_id, $servicio->proveedor->user_id])->where('mensaje', 'like', '%CONFIDENCIAL%')->count());
    }

    // ── Auditoria inmutable ──────────────────────────────────────────────────

    public function test_los_eventos_de_auditoria_no_se_pueden_modificar(): void
    {
        [, $reporte] = $this->reporteSimple();
        Sanctum::actingAs($this->crearAdmin());
        $this->postJson("/api/admin/reportes-seguridad/{$reporte->id}/estado", ['estado' => 'en_revision', 'nota_interna' => 'original'])->assertOk();
        $evento = HistorialReporteSeguridad::firstOrFail();

        try {
            DB::transaction(fn () => DB::table('historial_reportes_seguridad')->where('id', $evento->id)->update(['nota_interna' => 'alterada']));
            $this->fail('El evento de auditoria debio ser inmutable.');
        } catch (\Illuminate\Database\QueryException) {
            // esperado
        }

        $this->assertSame('original', $evento->fresh()->getRawOriginal('nota_interna'));
    }

    // ── Auxiliares ───────────────────────────────────────────────────────────

    /** @return array{0: Servicio, 1: ReporteSeguridad} Reporte simple del cliente sobre un servicio en progreso. */
    private function reporteSimple(array $extra = []): array
    {
        $servicio = $this->servicioSeguro('en_progreso');

        return [$servicio, $this->crearReporte($servicio, $servicio->cliente, $extra)];
    }

    /** @return array{0: Servicio, 1: ReporteSeguridad} Reporte que interrumpio el servicio. */
    private function reporteInterrupcion(array $extra = []): array
    {
        $servicio = $this->servicioSeguro('en_progreso');
        $reporte = $this->crearReporte($servicio, $servicio->cliente, array_merge(['interrumpio_servicio' => true, 'categoria' => 'emergencia'], $extra));
        $servicio->update(['estado' => 'interrumpido_seguridad', 'codigo_inicio' => null, 'codigo_fin' => null]);

        return [$servicio, $reporte];
    }
}
