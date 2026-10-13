<?php

namespace Tests\Feature;

use App\Models\Mensaje;
use App\Models\User;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\DB;
use Laravel\Sanctum\Sanctum;
use Tests\Feature\Concerns\CreaEscenarioMateriales;
use Tests\TestCase;

/*
 * ── AVISO PARA QUIEN MODIFIQUE ESTA PRUEBA ────────────────────────────────
 * Estas pruebas fueron desarrolladas por JA (Juan Salguero) como parte de la
 * cadena de dependencias de las Tasks 3.3 y 4.2 de Sprint 9, y cubren el
 * alcance de la Task asignada a otra persona (Task 4.1, endpoints tipados y
 * autorizacion contextual de mensajes). Describen el contrato actual, no el
 * definitivo.
 *
 * Si vas a cambiar o ampliar el comportamiento de esta Task (nuevas reglas,
 * campos, estados o rutas), no basta con ajustar estas pruebas: agrega
 * pruebas de regresion que demuestren que lo que ya funcionaba sigue
 * funcionando (permisos por rol, ownership, estados invalidos, idempotencia
 * y concurrencia cuando aplique) y ejecuta la suite backend completa.
 * ───────────────────────────────────────────────────────────────────────────
 */

/**
 * Task 4.1 (Sprint 9): hilos tipados por servicio y por reserva. El receptor y
 * el contexto salen del recurso autorizado, nunca del body.
 */
class ContextualMessagingSprint9Test extends TestCase
{
    use DatabaseTransactions;
    use CreaEscenarioMateriales;

    // ── Hilo de servicio ─────────────────────────────────────────────────────

    public function test_cliente_y_proveedor_se_escriben_dentro_del_servicio(): void
    {
        $servicio = $this->servicioConEstado('aceptado');

        Sanctum::actingAs($servicio->cliente);
        $this->postJson("/api/mensajes/servicios/{$servicio->id}", ['contenido' => 'Hola proveedor'])
            ->assertCreated()
            ->assertJsonPath('mensaje.contenido', 'Hola proveedor');

        Sanctum::actingAs($servicio->proveedor->user);
        $this->postJson("/api/mensajes/servicios/{$servicio->id}", ['contenido' => 'Hola cliente'])->assertCreated();

        $guardado = Mensaje::where('contenido', 'Hola proveedor')->firstOrFail();
        $this->assertSame($servicio->cliente_id, $guardado->emisor_id);
        $this->assertSame($servicio->proveedor->user_id, $guardado->receptor_id);
        $this->assertSame($servicio->id, $guardado->servicio_id);
        $this->assertNull($guardado->reserva_material_id);

        $this->getJson("/api/mensajes/servicios/{$servicio->id}")
            ->assertOk()
            ->assertJsonCount(2, 'mensajes')
            ->assertJsonPath('contexto.tipo', 'servicio')
            ->assertJsonPath('contexto.solo_lectura', false)
            ->assertJsonPath('contraparte.id', $servicio->cliente_id);
    }

    public function test_el_receptor_y_el_contexto_del_body_no_deciden_nada(): void
    {
        $servicio = $this->servicioConEstado('aceptado');
        $otroServicio = $this->servicioConEstado('aceptado');
        $tercero = $this->crearCliente();
        Sanctum::actingAs($servicio->cliente);

        $this->postJson("/api/mensajes/servicios/{$servicio->id}", [
            'contenido'           => 'Con campos manipulados',
            'receptor_id'         => $tercero->id,
            'emisor_id'           => $tercero->id,
            'servicio_id'         => $otroServicio->id,
            'reserva_material_id' => 99999,
        ])->assertCreated();

        $m = Mensaje::where('contenido', 'Con campos manipulados')->firstOrFail();
        $this->assertSame($servicio->cliente_id, $m->emisor_id);
        $this->assertSame($servicio->proveedor->user_id, $m->receptor_id);
        $this->assertSame($servicio->id, $m->servicio_id);
        $this->assertNull($m->reserva_material_id);
    }

    public function test_tercero_admin_y_anonimo_no_acceden_al_hilo_de_un_servicio(): void
    {
        $servicio = $this->servicioConEstado('aceptado');
        $admin = User::create(['name' => 'Admin', 'email' => 'a.' . uniqid() . '@servigt.test', 'password' => 'password-test', 'role' => 'admin']);

        $this->getJson("/api/mensajes/servicios/{$servicio->id}")->assertUnauthorized();
        $this->postJson("/api/mensajes/servicios/{$servicio->id}", ['contenido' => 'x'])->assertUnauthorized();

        foreach ([$this->crearCliente(), $this->crearProveedorComprador()->user, $admin] as $intruso) {
            Sanctum::actingAs($intruso);
            $this->getJson("/api/mensajes/servicios/{$servicio->id}")->assertForbidden();
            $this->postJson("/api/mensajes/servicios/{$servicio->id}", ['contenido' => 'intruso'])->assertForbidden();
        }

        $this->assertDatabaseMissing('mensajes', ['contenido' => 'intruso']);
    }

    public function test_servicio_inexistente_devuelve_404(): void
    {
        Sanctum::actingAs($this->crearCliente());

        $this->getJson('/api/mensajes/servicios/99999999')->assertNotFound();
        $this->postJson('/api/mensajes/servicios/99999999', ['contenido' => 'x'])->assertNotFound();
    }

    public function test_dos_servicios_con_la_misma_persona_nunca_mezclan_mensajes_ni_no_leidos(): void
    {
        $proveedor = $this->crearProveedorComprador();
        $s1 = $this->servicioConEstado('aceptado', $proveedor);
        // Segundo servicio con el MISMO cliente y el MISMO proveedor.
        $s2 = $this->servicioConEstado('aceptado', $proveedor, ['cliente_id' => $s1->cliente_id]);

        Mensaje::create(['emisor_id' => $proveedor->user_id, 'receptor_id' => $s1->cliente_id, 'servicio_id' => $s1->id, 'contenido' => 'del servicio 1']);
        Mensaje::create(['emisor_id' => $proveedor->user_id, 'receptor_id' => $s1->cliente_id, 'servicio_id' => $s2->id, 'contenido' => 'del servicio 2']);

        Sanctum::actingAs($s1->cliente);

        $this->getJson("/api/mensajes/servicios/{$s1->id}")->assertOk()
            ->assertJsonCount(1, 'mensajes')->assertJsonPath('mensajes.0.contenido', 'del servicio 1');

        // Leer el hilo 1 no marca como leido el mensaje del hilo 2.
        $this->assertTrue((bool) Mensaje::where('contenido', 'del servicio 1')->value('leido'));
        $this->assertFalse((bool) Mensaje::where('contenido', 'del servicio 2')->value('leido'));

        $this->getJson("/api/mensajes/servicios/{$s2->id}")->assertOk()
            ->assertJsonCount(1, 'mensajes')->assertJsonPath('mensajes.0.contenido', 'del servicio 2');
    }

    public function test_un_mensaje_historico_inconsistente_no_entra_al_hilo_de_un_servicio_ajeno(): void
    {
        $servicio = $this->servicioConEstado('aceptado');
        $intruso1 = $this->crearCliente();
        $intruso2 = $this->crearProveedorComprador();

        // Dato historico incoherente: apunta a un servicio del que no son parte.
        Mensaje::create(['emisor_id' => $intruso1->id, 'receptor_id' => $intruso2->user_id, 'servicio_id' => $servicio->id, 'contenido' => 'inconsistente']);

        Sanctum::actingAs($servicio->cliente);
        $this->getJson("/api/mensajes/servicios/{$servicio->id}")->assertOk()->assertJsonCount(0, 'mensajes');

        Sanctum::actingAs($intruso1);
        $this->getJson("/api/mensajes/servicios/{$servicio->id}")->assertForbidden();
    }

    public function test_polling_con_last_id_devuelve_solo_los_nuevos(): void
    {
        $servicio = $this->servicioConEstado('aceptado');
        Sanctum::actingAs($servicio->cliente);

        $primero = $this->postJson("/api/mensajes/servicios/{$servicio->id}", ['contenido' => 'uno'])->json('mensaje.id');
        $this->postJson("/api/mensajes/servicios/{$servicio->id}", ['contenido' => 'dos']);

        $this->getJson("/api/mensajes/servicios/{$servicio->id}?last_id={$primero}")->assertOk()
            ->assertJsonCount(1, 'mensajes')->assertJsonPath('mensajes.0.contenido', 'dos');
    }

    public function test_validacion_del_contenido(): void
    {
        $servicio = $this->servicioConEstado('aceptado');
        Sanctum::actingAs($servicio->cliente);

        $this->postJson("/api/mensajes/servicios/{$servicio->id}", [])->assertStatus(422)->assertJsonValidationErrors('contenido');
        $this->postJson("/api/mensajes/servicios/{$servicio->id}", ['contenido' => '   '])->assertStatus(422);
        $this->postJson("/api/mensajes/servicios/{$servicio->id}", ['contenido' => str_repeat('a', 2001)])->assertStatus(422);

        $this->assertSame(0, Mensaje::count());
    }

    public function test_un_servicio_interrumpido_por_seguridad_conserva_el_chat_en_solo_lectura(): void
    {
        $servicio = $this->servicioConEstado('aceptado');
        Mensaje::create(['emisor_id' => $servicio->cliente_id, 'receptor_id' => $servicio->proveedor->user_id, 'servicio_id' => $servicio->id, 'contenido' => 'previo']);

        // El estado terminal llega con la Task 5.1; aqui se simula ampliando el
        // CHECK y la columna dentro de la transaccion de la prueba (el DDL de PostgreSQL es
        // transaccional y se revierte al terminar).
        DB::statement('ALTER TABLE servicios DROP CONSTRAINT servicios_estado_check');
        DB::statement('ALTER TABLE servicios ALTER COLUMN estado TYPE VARCHAR(30)');
        DB::table('servicios')->where('id', $servicio->id)->update(['estado' => 'interrumpido_seguridad']);

        Sanctum::actingAs($servicio->cliente);
        $this->getJson("/api/mensajes/servicios/{$servicio->id}")->assertOk()
            ->assertJsonCount(1, 'mensajes')->assertJsonPath('contexto.solo_lectura', true);

        $this->postJson("/api/mensajes/servicios/{$servicio->id}", ['contenido' => 'nuevo'])->assertStatus(409);
        $this->assertDatabaseMissing('mensajes', ['contenido' => 'nuevo']);
    }

    // ── Hilo de reserva ──────────────────────────────────────────────────────

    public function test_comprador_y_vendedor_se_escriben_dentro_de_la_reserva(): void
    {
        [$reserva, $comprador, $vendedor] = $this->reservaConPartes();

        Sanctum::actingAs($comprador->user);
        $this->postJson("/api/mensajes/reservas/{$reserva->id}", ['contenido' => '¿Puedo recogerlo mañana?'])->assertCreated();

        Sanctum::actingAs($vendedor->user);
        $this->postJson("/api/mensajes/reservas/{$reserva->id}", ['contenido' => 'Sí, a las 9'])->assertCreated();

        $m = Mensaje::where('contenido', '¿Puedo recogerlo mañana?')->firstOrFail();
        $this->assertSame($comprador->user_id, $m->emisor_id);
        $this->assertSame($vendedor->user_id, $m->receptor_id);
        $this->assertSame($reserva->id, $m->reserva_material_id);
        $this->assertNull($m->servicio_id);

        $this->getJson("/api/mensajes/reservas/{$reserva->id}")->assertOk()
            ->assertJsonCount(2, 'mensajes')
            ->assertJsonPath('contexto.tipo', 'reserva')
            ->assertJsonPath('contraparte.id', $comprador->user_id);
    }

    public function test_un_tercero_y_otro_solicitante_no_leen_ni_escriben_en_la_reserva(): void
    {
        [$reserva, , $vendedor] = $this->reservaConPartes();
        $otroSolicitante = $this->crearProveedorComprador();
        $reservaDelOtro = $this->crearReserva($reserva->publicacion, $otroSolicitante);

        $this->getJson("/api/mensajes/reservas/{$reserva->id}")->assertUnauthorized();

        foreach ([$otroSolicitante->user, $this->crearCliente()] as $intruso) {
            Sanctum::actingAs($intruso);
            $this->getJson("/api/mensajes/reservas/{$reserva->id}")->assertForbidden();
            $this->postJson("/api/mensajes/reservas/{$reserva->id}", ['contenido' => 'intruso'])->assertForbidden();
        }

        Sanctum::actingAs($this->crearCliente());
        $this->getJson('/api/mensajes/reservas/99999999')->assertNotFound();

        $this->assertDatabaseMissing('mensajes', ['contenido' => 'intruso']);
        $this->assertNotSame($reserva->id, $reservaDelOtro->id);
    }

    public function test_el_vendedor_con_dos_solicitantes_tiene_hilos_aislados(): void
    {
        [$ra, $a, $vendedor] = $this->reservaConPartes();
        $b = $this->crearProveedorComprador();
        $rb = $this->crearReserva($ra->publicacion, $b);

        Mensaje::create(['emisor_id' => $a->user_id, 'receptor_id' => $vendedor->user_id, 'reserva_material_id' => $ra->id, 'contenido' => 'de A']);
        Mensaje::create(['emisor_id' => $b->user_id, 'receptor_id' => $vendedor->user_id, 'reserva_material_id' => $rb->id, 'contenido' => 'de B']);

        Sanctum::actingAs($vendedor->user);

        $this->getJson("/api/mensajes/reservas/{$ra->id}")->assertOk()->assertJsonCount(1, 'mensajes')->assertJsonPath('mensajes.0.contenido', 'de A');
        $this->assertFalse((bool) Mensaje::where('contenido', 'de B')->value('leido'), 'Leer el hilo de A marco como leido el de B.');
        $this->getJson("/api/mensajes/reservas/{$rb->id}")->assertOk()->assertJsonCount(1, 'mensajes')->assertJsonPath('mensajes.0.contenido', 'de B');
    }

    /**
     * Brecha cubierta al adoptar la Task 4.1. La prueba anterior usa dos
     * solicitantes distintos, y a esos ya los separa el filtro por contraparte.
     * Aqui la contraparte es la MISMA en los dos hilos (un comprador con dos
     * reservas del mismo vendedor): solo el filtro por reserva los separa. Sin
     * el, `GET /mensajes/reservas/{id}` mezclaba ambos hilos y ninguna prueba
     * lo detectaba.
     */
    public function test_el_mismo_comprador_con_dos_reservas_del_mismo_vendedor_tiene_hilos_aislados(): void
    {
        [$r1, $comprador, $vendedor] = $this->reservaConPartes();
        $r2 = $this->crearReserva($this->crearLote($this->servicioCanceladoDesdeEnCamino($vendedor)), $comprador);

        Mensaje::create(['emisor_id' => $vendedor->user_id, 'receptor_id' => $comprador->user_id, 'reserva_material_id' => $r1->id, 'contenido' => 'de la reserva 1']);
        Mensaje::create(['emisor_id' => $vendedor->user_id, 'receptor_id' => $comprador->user_id, 'reserva_material_id' => $r2->id, 'contenido' => 'de la reserva 2']);

        Sanctum::actingAs($comprador->user);

        $this->getJson("/api/mensajes/reservas/{$r1->id}")->assertOk()
            ->assertJsonCount(1, 'mensajes')->assertJsonPath('mensajes.0.contenido', 'de la reserva 1');
        $this->assertFalse((bool) Mensaje::where('contenido', 'de la reserva 2')->value('leido'), 'Leer la reserva 1 marco como leido el mensaje de la reserva 2.');

        $this->getJson("/api/mensajes/reservas/{$r2->id}")->assertOk()
            ->assertJsonCount(1, 'mensajes')->assertJsonPath('mensajes.0.contenido', 'de la reserva 2');
    }

    // ── Auxiliares ───────────────────────────────────────────────────────────

    /** @return array{0: \App\Models\ReservaMaterial, 1: \App\Models\Proveedor, 2: \App\Models\Proveedor} */
    private function reservaConPartes(): array
    {
        $vendedor = $this->crearProveedorComprador();
        $lote = $this->crearLote($this->servicioCanceladoDesdeEnCamino($vendedor));
        $comprador = $this->crearProveedorComprador();

        return [$this->crearReserva($lote, $comprador), $comprador, $vendedor];
    }
}
