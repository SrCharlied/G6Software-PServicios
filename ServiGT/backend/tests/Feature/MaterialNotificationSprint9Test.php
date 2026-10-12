<?php

namespace Tests\Feature;

use App\Models\Notificacion;
use App\Support\MaterialNotificaciones;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Laravel\Sanctum\Sanctum;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\Feature\Concerns\CreaEscenarioMateriales;
use Tests\TestCase;

/*
 * ── AVISO PARA QUIEN MODIFIQUE ESTA PRUEBA ────────────────────────────────
 * Estas pruebas fueron desarrolladas por JA (Juan Salguero) como parte de la
 * cadena de dependencias de las Tasks 3.3 y 4.2 de Sprint 9, y cubren el
 * alcance de la Task asignada a otra persona (Task 2.4, Resources,
 * notificaciones y contrato API de materiales). Describen el contrato
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
 * Task 2.4 (Sprint 9): permisos calculados por el backend en ServicioResource y
 * notificaciones de reservas con payload minimo y sin datos de contacto.
 */
class MaterialNotificationSprint9Test extends TestCase
{
    use DatabaseTransactions;
    use CreaEscenarioMateriales;

    // ── ServicioResource ─────────────────────────────────────────────────────

    public function test_el_proveedor_recibe_puede_publicar_materiales_en_un_servicio_cancelado_desde_en_camino(): void
    {
        $servicio = $this->servicioCanceladoDesdeEnCamino();
        Sanctum::actingAs($servicio->proveedor->user);

        $this->getJson("/api/servicios/{$servicio->id}")
            ->assertOk()
            ->assertJsonPath('servicio.puede_publicar_materiales', true)
            ->assertJsonPath('servicio.publicacion_material_id', null);

        $this->getJson('/api/servicios/proveedor')
            ->assertOk()
            ->assertJsonPath('servicios.0.puede_publicar_materiales', true);
    }

    public function test_tras_publicar_el_servicio_deja_de_ser_elegible_y_expone_el_id_del_lote(): void
    {
        $servicio = $this->servicioCanceladoDesdeEnCamino();
        $lote = $this->crearLote($servicio);
        Sanctum::actingAs($servicio->proveedor->user);

        $this->getJson("/api/servicios/{$servicio->id}")
            ->assertOk()
            ->assertJsonPath('servicio.puede_publicar_materiales', false)
            ->assertJsonPath('servicio.publicacion_material_id', $lote->id);
    }

    public function test_el_cliente_nunca_ve_el_permiso_ni_el_lote(): void
    {
        $servicio = $this->servicioCanceladoDesdeEnCamino();
        $this->crearLote($servicio);
        Sanctum::actingAs($servicio->cliente);

        $this->getJson("/api/servicios/{$servicio->id}")
            ->assertOk()
            ->assertJsonPath('servicio.puede_publicar_materiales', false)
            ->assertJsonPath('servicio.publicacion_material_id', null);
    }

    #[DataProvider('noElegibles')]
    public function test_servicios_no_elegibles_no_habilitan_el_permiso(string $estado, ?string $origen): void
    {
        $servicio = $this->servicioConEstado($estado, null, ['cancelado_desde' => $origen]);
        Sanctum::actingAs($servicio->proveedor->user);

        $this->getJson("/api/servicios/{$servicio->id}")
            ->assertOk()
            ->assertJsonPath('servicio.puede_publicar_materiales', false);
    }

    public static function noElegibles(): array
    {
        return [
            'cancelado historico'     => ['cancelado', null],
            'cancelado desde aceptado' => ['cancelado', 'aceptado'],
            'en camino'               => ['en_camino', null],
            'completado'              => ['completado', null],
        ];
    }

    // ── Notificaciones ───────────────────────────────────────────────────────

    public function test_cada_evento_crea_su_notificacion_con_solo_ids_de_navegacion(): void
    {
        $vendedor = $this->crearProveedorComprador();
        $lote = $this->crearLote($this->servicioCanceladoDesdeEnCamino($vendedor));
        $a = $this->crearProveedorComprador();
        $b = $this->crearProveedorComprador();

        Sanctum::actingAs($a->user);
        $ra = $this->postJson("/api/materiales/{$lote->id}/reservas", ['idempotency_key' => 'a', 'mensaje_inicial' => 'Hola, me interesa'])->assertCreated()->json('reserva.id');
        Sanctum::actingAs($b->user);
        $rb = $this->postJson("/api/materiales/{$lote->id}/reservas", ['idempotency_key' => 'b', 'mensaje_inicial' => 'Yo también'])->assertCreated()->json('reserva.id');

        Sanctum::actingAs($vendedor->user);
        $this->postJson("/api/reservas-material/{$ra}/aceptar")->assertOk();
        Sanctum::actingAs($a->user);
        $this->postJson("/api/reservas-material/{$ra}/cancelar")->assertOk();

        $esperadas = [
            [$vendedor->user_id, 'reserva_material_solicitada', $ra],
            [$vendedor->user_id, 'reserva_material_solicitada', $rb],
            [$a->user_id, 'reserva_material_aceptada', $ra],
            [$b->user_id, 'reserva_material_rechazada', $rb],
            [$vendedor->user_id, 'reserva_material_cancelada', $ra],
        ];

        foreach ($esperadas as [$destinatario, $tipo, $reservaId]) {
            $n = Notificacion::where('destinatario_id', $destinatario)->where('tipo', $tipo)->where('datos->reserva_id', $reservaId)->first();

            $this->assertNotNull($n, "Falta {$tipo} para el usuario {$destinatario}.");
            $this->assertEqualsCanonicalizing(['reserva_id', 'publicacion_id'], array_keys($n->datos), "El payload de {$tipo} debe llevar solo IDs.");
            $this->assertSame($lote->id, $n->datos['publicacion_id']);
        }

        $this->assertEqualsCanonicalizing(MaterialNotificaciones::TIPOS, Notificacion::pluck('tipo')->unique()->values()->all());
    }

    public function test_las_notificaciones_no_exponen_contacto_ni_datos_de_otros_solicitantes(): void
    {
        $vendedor = $this->crearProveedorComprador();
        $lote = $this->crearLote($this->servicioCanceladoDesdeEnCamino($vendedor));
        $a = $this->crearProveedorComprador();
        $b = $this->crearProveedorComprador();
        $ra = $this->crearReserva($lote, $a);
        $this->crearReserva($lote, $b);

        Sanctum::actingAs($vendedor->user);
        $this->postJson("/api/reservas-material/{$ra->id}/aceptar")->assertOk();

        foreach ([$a, $b] as $comprador) {
            Sanctum::actingAs($comprador->user);
            $contenido = json_encode($this->getJson('/api/notificaciones')->assertOk()->json());

            foreach ([$vendedor->telefono, $vendedor->email, $a->telefono, $a->email, $b->telefono, $b->email] as $secreto) {
                $this->assertStringNotContainsString($secreto, $contenido, 'Una notificacion expone datos de contacto.');
            }

            $otro = $comprador->id === $a->id ? $b : $a;
            $this->assertStringNotContainsString($otro->nombre, $contenido, 'Una notificacion expone al otro solicitante.');
        }
    }

    public function test_un_payload_incompleto_no_rompe_el_listado_de_notificaciones(): void
    {
        $user = $this->crearProveedorComprador()->user;
        Notificacion::create([
            'destinatario_id' => $user->id,
            'tipo'            => 'reserva_material_aceptada',
            'titulo'          => 'Sin ids',
            'mensaje'         => 'Payload vacío',
            'datos'           => [],
        ]);
        Sanctum::actingAs($user);

        $this->getJson('/api/notificaciones')->assertOk()->assertJsonPath('notificaciones.0.tipo', 'reserva_material_aceptada');
    }
}
