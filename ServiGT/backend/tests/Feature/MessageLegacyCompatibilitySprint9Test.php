<?php

namespace Tests\Feature;

use App\Models\Mensaje;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\DB;
use Laravel\Sanctum\Sanctum;
use Tests\Feature\Concerns\CreaEscenarioMateriales;
use Tests\TestCase;

/**
 * Task 4.2 (Sprint 9): bandeja agrupada en SQL y compatibilidad legacy segura.
 * Sin backfill semantico: un mensaje sin contexto sigue siendo historial
 * anterior de solo lectura y nunca se asigna al "servicio mas reciente".
 */
class MessageLegacyCompatibilitySprint9Test extends TestCase
{
    use DatabaseTransactions;
    use CreaEscenarioMateriales;

    // ── GET /mensajes/hilos ──────────────────────────────────────────────────

    public function test_la_bandeja_separa_hilos_por_servicio_reserva_y_legado_con_no_leidos_por_hilo(): void
    {
        $proveedor = $this->crearProveedorComprador();
        $s1 = $this->servicioConEstado('aceptado', $proveedor);
        $s2 = $this->servicioConEstado('aceptado', $proveedor, ['cliente_id' => $s1->cliente_id]);
        $cliente = $s1->cliente;

        $this->msg($proveedor->user_id, $cliente->id, 'servicio 1 - a', ['servicio_id' => $s1->id], '2026-10-01 10:00:00');
        $this->msg($proveedor->user_id, $cliente->id, 'servicio 1 - b', ['servicio_id' => $s1->id], '2026-10-01 10:05:00');
        $this->msg($proveedor->user_id, $cliente->id, 'servicio 2 - a', ['servicio_id' => $s2->id], '2026-10-01 11:00:00', leido: true);
        $this->msg($proveedor->user_id, $cliente->id, 'historial viejo', [], '2026-09-01 09:00:00');

        Sanctum::actingAs($cliente);
        $respuesta = $this->getJson('/api/mensajes/hilos')->assertOk()->assertJsonCount(3, 'hilos');
        $hilos = collect($respuesta->json('hilos'));

        $h1 = $hilos->firstWhere('contexto_id', $s1->id);
        $this->assertSame('servicio', $h1['tipo']);
        $this->assertSame(2, $h1['no_leidos']);
        $this->assertSame('servicio 1 - b', $h1['ultimo_mensaje']['contenido']);
        $this->assertSame($proveedor->user_id, $h1['contraparte']['id']);
        $this->assertFalse($h1['solo_lectura']);

        $h2 = $hilos->firstWhere('contexto_id', $s2->id);
        $this->assertSame(0, $h2['no_leidos']);

        $legado = $hilos->firstWhere('tipo', 'legado');
        $this->assertTrue($legado['solo_lectura']);
        $this->assertNull($legado['contexto_id']);
        $this->assertSame(1, $legado['no_leidos']);

        // Mas reciente primero.
        $this->assertSame(['servicio', 'servicio', 'legado'], $hilos->pluck('tipo')->all());
        $this->assertSame($s2->id, $hilos[0]['contexto_id']);
    }

    public function test_la_bandeja_incluye_hilos_de_reserva_para_comprador_y_vendedor(): void
    {
        $vendedor = $this->crearProveedorComprador();
        $lote = $this->crearLote($this->servicioCanceladoDesdeEnCamino($vendedor));
        $comprador = $this->crearProveedorComprador();
        $reserva = $this->crearReserva($lote, $comprador);
        $this->msg($comprador->user_id, $vendedor->user_id, 'solicitud', ['reserva_material_id' => $reserva->id]);

        foreach ([[$vendedor, 1, $comprador], [$comprador, 0, $vendedor]] as [$yo, $noLeidos, $otro]) {
            Sanctum::actingAs($yo->user);
            $hilo = $this->getJson('/api/mensajes/hilos')->assertOk()->assertJsonCount(1, 'hilos')->json('hilos.0');

            $this->assertSame('reserva', $hilo['tipo']);
            $this->assertSame($reserva->id, $hilo['contexto_id']);
            $this->assertSame($noLeidos, $hilo['no_leidos']);
            $this->assertSame($otro->user_id, $hilo['contraparte']['id']);
            $this->assertSame($lote->titulo, $hilo['contexto']['titulo']);
        }
    }

    public function test_un_mensaje_con_contexto_ajeno_se_presenta_como_historial_y_no_como_servicio(): void
    {
        $ajeno = $this->servicioConEstado('aceptado');
        $a = $this->crearCliente();
        $b = $this->crearProveedorComprador();
        // Dato historico incoherente: referencia un servicio entre otras personas.
        $this->msg($a->id, $b->user_id, 'incoherente', ['servicio_id' => $ajeno->id]);

        Sanctum::actingAs($a);
        $hilo = $this->getJson('/api/mensajes/hilos')->assertOk()->assertJsonCount(1, 'hilos')->json('hilos.0');

        $this->assertSame('legado', $hilo['tipo']);
        $this->assertNull($hilo['contexto_id']);
        $this->getJson("/api/mensajes/servicios/{$ajeno->id}")->assertForbidden();
    }

    public function test_la_bandeja_solo_incluye_mis_conversaciones(): void
    {
        $s = $this->servicioConEstado('aceptado');
        $this->msg($s->cliente_id, $s->proveedor->user_id, 'privado', ['servicio_id' => $s->id]);

        Sanctum::actingAs($this->crearCliente());
        $this->getJson('/api/mensajes/hilos')->assertOk()->assertJsonCount(0, 'hilos')->assertJsonPath('meta.total', 0);
    }

    public function test_pagina_y_cuenta_en_sql(): void
    {
        $proveedor = $this->crearProveedorComprador();
        $cliente = $this->crearCliente();
        foreach (range(1, 3) as $i) {
            $s = $this->servicioConEstado('aceptado', $proveedor, ['cliente_id' => $cliente->id]);
            $this->msg($proveedor->user_id, $cliente->id, "m{$i}", ['servicio_id' => $s->id], "2026-10-0{$i} 10:00:00");
        }

        Sanctum::actingAs($cliente);

        $pagina1 = $this->getJson('/api/mensajes/hilos?per_page=2')->assertOk()
            ->assertJsonCount(2, 'hilos')->assertJsonPath('meta.total', 3)->assertJsonPath('meta.last_page', 2);
        $pagina2 = $this->getJson('/api/mensajes/hilos?per_page=2&page=2')->assertOk()->assertJsonCount(1, 'hilos');

        $this->assertSame('m3', $pagina1->json('hilos.0.ultimo_mensaje.contenido'));
        $this->assertSame('m1', $pagina2->json('hilos.0.ultimo_mensaje.contenido'));
    }

    public function test_la_bandeja_no_carga_el_historial_completo_ni_hace_n_mas_uno(): void
    {
        $proveedor = $this->crearProveedorComprador();
        $cliente = $this->crearCliente();
        foreach (range(1, 4) as $i) {
            $s = $this->servicioConEstado('aceptado', $proveedor, ['cliente_id' => $cliente->id]);
            foreach (range(1, 6) as $j) {
                $this->msg($proveedor->user_id, $cliente->id, "m{$i}-{$j}", ['servicio_id' => $s->id]);
            }
        }

        Sanctum::actingAs($cliente);
        DB::enableQueryLog();
        $this->getJson('/api/mensajes/hilos')->assertOk()->assertJsonCount(4, 'hilos');
        $consultas = collect(DB::getQueryLog())->pluck('query');
        DB::disableQueryLog();

        $this->assertLessThanOrEqual(8, $consultas->count(), 'Demasiadas consultas: ' . $consultas->implode(' | '));

        $agrupa = $consultas->first(fn ($q) => stripos($q, 'distinct on') !== false);
        $this->assertNotNull($agrupa, 'La agrupacion debe resolverse en SQL (DISTINCT ON).');
        $this->assertStringContainsStringIgnoringCase('limit', $agrupa);

        // Nunca se hidrata la tabla de mensajes completa.
        $this->assertEmpty(
            $consultas->filter(fn ($q) => preg_match('/^select \* from "mensajes"/i', $q))->all(),
            'Se cargo el historial completo de mensajes.'
        );
    }

    // ── Endpoints legacy ─────────────────────────────────────────────────────

    public function test_legacy_store_deriva_el_unico_servicio_en_comun(): void
    {
        $s = $this->servicioConEstado('aceptado');
        Sanctum::actingAs($s->cliente);

        $this->postJson('/api/mensajes', ['receptor_id' => $s->proveedor->user_id, 'contenido' => 'legacy'])->assertCreated();

        $this->assertSame($s->id, Mensaje::where('contenido', 'legacy')->value('servicio_id'));
    }

    public function test_legacy_store_responde_409_cuando_hay_varios_servicios_y_no_adivina(): void
    {
        $proveedor = $this->crearProveedorComprador();
        $s1 = $this->servicioConEstado('aceptado', $proveedor);
        $this->servicioConEstado('completado', $proveedor, ['cliente_id' => $s1->cliente_id]);
        Sanctum::actingAs($s1->cliente);

        $this->postJson('/api/mensajes', ['receptor_id' => $proveedor->user_id, 'contenido' => 'ambiguo'])->assertStatus(409);

        $this->assertDatabaseMissing('mensajes', ['contenido' => 'ambiguo']);
    }

    public function test_legacy_store_acepta_un_servicio_explicito_solo_si_vincula_a_ambos(): void
    {
        $proveedor = $this->crearProveedorComprador();
        $s1 = $this->servicioConEstado('aceptado', $proveedor);
        $s2 = $this->servicioConEstado('aceptado', $proveedor, ['cliente_id' => $s1->cliente_id]);
        $ajeno = $this->servicioConEstado('aceptado');
        Sanctum::actingAs($s1->cliente);

        $this->postJson('/api/mensajes', ['receptor_id' => $proveedor->user_id, 'servicio_id' => $s2->id, 'contenido' => 'explicito'])->assertCreated();
        $this->assertSame($s2->id, Mensaje::where('contenido', 'explicito')->value('servicio_id'));

        $this->postJson('/api/mensajes', ['receptor_id' => $proveedor->user_id, 'servicio_id' => $ajeno->id, 'contenido' => 'ajeno'])->assertForbidden();
        $this->assertDatabaseMissing('mensajes', ['contenido' => 'ajeno']);
    }

    public function test_legacy_conversacion_muestra_el_historial_mas_el_unico_servicio_y_marca_leido_solo_eso(): void
    {
        $s = $this->servicioConEstado('aceptado');
        $proveedorUser = $s->proveedor->user_id;
        $this->msg($proveedorUser, $s->cliente_id, 'historial', []);
        $this->msg($proveedorUser, $s->cliente_id, 'del servicio', ['servicio_id' => $s->id]);

        $otro = $this->servicioConEstado('aceptado', $s->proveedor);
        $this->msg($proveedorUser, $otro->cliente_id, 'de otro cliente', ['servicio_id' => $otro->id]);

        Sanctum::actingAs($s->cliente);
        $respuesta = $this->getJson("/api/mensajes/conversacion/{$proveedorUser}")->assertOk()->assertJsonCount(2, 'mensajes');

        $porContenido = collect($respuesta->json('mensajes'))->keyBy('contenido');
        $this->assertTrue($porContenido['historial']['legado']);
        $this->assertFalse($porContenido['del servicio']['legado']);
        $this->assertTrue((bool) Mensaje::where('contenido', 'historial')->value('leido'));
        $this->assertFalse((bool) Mensaje::where('contenido', 'de otro cliente')->value('leido'));
    }

    public function test_legacy_conversacion_responde_409_con_varios_servicios_sin_asignar_el_mas_reciente(): void
    {
        $proveedor = $this->crearProveedorComprador();
        $s1 = $this->servicioConEstado('completado', $proveedor);
        $this->servicioConEstado('aceptado', $proveedor, ['cliente_id' => $s1->cliente_id]);
        $this->msg($proveedor->user_id, $s1->cliente_id, 'sin contexto', []);

        Sanctum::actingAs($s1->cliente);

        $this->getJson("/api/mensajes/conversacion/{$proveedor->user_id}")->assertStatus(409);
        $this->assertNull(Mensaje::where('contenido', 'sin contexto')->value('servicio_id'), 'No se hace backfill semantico.');
    }

    public function test_legacy_conversaciones_sigue_listando_el_ultimo_mensaje_por_contraparte_en_pocas_consultas(): void
    {
        $proveedor = $this->crearProveedorComprador();
        $cliente = $this->crearCliente();
        $s = $this->servicioConEstado('aceptado', $proveedor, ['cliente_id' => $cliente->id]);
        foreach (range(1, 5) as $i) {
            $this->msg($proveedor->user_id, $cliente->id, "m{$i}", ['servicio_id' => $s->id], "2026-10-01 10:0{$i}:00");
        }
        $otro = $this->servicioConEstado('aceptado', null, ['cliente_id' => $cliente->id]);
        $this->msg($otro->proveedor->user_id, $cliente->id, 'otro proveedor', ['servicio_id' => $otro->id], '2026-10-02 10:00:00');

        Sanctum::actingAs($cliente);
        DB::enableQueryLog();
        $respuesta = $this->getJson('/api/mensajes/conversaciones')->assertOk()->assertJsonCount(2, 'conversaciones');
        $n = count(DB::getQueryLog());
        DB::disableQueryLog();

        $this->assertSame(['otro proveedor', 'm5'], collect($respuesta->json('conversaciones'))->pluck('contenido')->all());
        $this->assertLessThanOrEqual(5, $n);
    }

    public function test_historial_devuelve_solo_mensajes_sin_contexto_valido_y_es_de_solo_lectura(): void
    {
        $s = $this->servicioConEstado('aceptado');
        $p = $s->proveedor->user_id;
        $this->msg($p, $s->cliente_id, 'viejo', []);
        $this->msg($p, $s->cliente_id, 'con contexto', ['servicio_id' => $s->id]);

        Sanctum::actingAs($s->cliente);

        $this->getJson("/api/mensajes/historial/{$p}")->assertOk()
            ->assertJsonCount(1, 'mensajes')->assertJsonPath('mensajes.0.contenido', 'viejo')
            ->assertJsonPath('contexto.solo_lectura', true);

        $this->postJson("/api/mensajes/historial/{$p}", ['contenido' => 'x'])->assertStatus(405);
    }

    // ── Auxiliares ───────────────────────────────────────────────────────────

    private function msg(int $emisor, int $receptor, string $contenido, array $contexto, string $fecha = '2026-10-01 12:00:00', bool $leido = false): Mensaje
    {
        $m = Mensaje::create(array_merge([
            'emisor_id'   => $emisor,
            'receptor_id' => $receptor,
            'contenido'   => $contenido,
            'leido'       => $leido,
        ], $contexto));

        DB::table('mensajes')->where('id', $m->id)->update(['created_at' => $fecha]);

        return $m;
    }
}
