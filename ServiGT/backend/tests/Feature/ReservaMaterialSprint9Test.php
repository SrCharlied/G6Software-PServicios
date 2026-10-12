<?php

namespace Tests\Feature;

use App\Models\Mensaje;
use App\Models\Notificacion;
use App\Models\PublicacionMaterial;
use App\Models\ReservaMaterial;
use App\Models\User;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Laravel\Sanctum\Sanctum;
use PHPUnit\Framework\Attributes\DataProvider;
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
 * Task 2.3 (Sprint 9): reservas de materiales. Varias solicitudes pendientes
 * por lote, una sola aceptada; identidad siempre derivada del token.
 */
class ReservaMaterialSprint9Test extends TestCase
{
    use DatabaseTransactions;
    use CreaEscenarioMateriales;

    // ── Solicitar ────────────────────────────────────────────────────────────

    public function test_proveedor_solicita_un_lote_y_se_crea_el_mensaje_inicial_y_la_notificacion(): void
    {
        [$lote, $vendedor] = $this->loteDisponible();
        $comprador = $this->crearProveedorComprador();
        Sanctum::actingAs($comprador->user);

        $respuesta = $this->solicitar($lote, 'clave-1');

        $respuesta->assertCreated()
            ->assertJsonPath('reserva.estado', 'pendiente')
            ->assertJsonPath('reserva.rol', 'comprador');

        $reserva = ReservaMaterial::firstOrFail();
        $this->assertSame($comprador->id, $reserva->comprador_id);

        $mensaje = Mensaje::where('reserva_material_id', $reserva->id)->firstOrFail();
        $this->assertSame($comprador->user_id, $mensaje->emisor_id);
        $this->assertSame($vendedor->user_id, $mensaje->receptor_id);
        $this->assertNull($mensaje->servicio_id);
        $this->assertSame('Me interesa el lote, ¿sigue disponible?', $mensaje->contenido);

        $notificacion = Notificacion::where('destinatario_id', $vendedor->user_id)->where('tipo', 'reserva_material_solicitada')->firstOrFail();
        $this->assertSame(['reserva_id' => $reserva->id, 'publicacion_id' => $lote->id], $notificacion->datos);
    }

    public function test_la_respuesta_no_revela_telefono_ni_correo(): void
    {
        [$lote, $vendedor] = $this->loteDisponible();
        $comprador = $this->crearProveedorComprador();
        Sanctum::actingAs($comprador->user);

        $json = json_encode($this->solicitar($lote, 'k')->assertCreated()->json());

        foreach ([$vendedor->telefono, $vendedor->email, $comprador->telefono, $comprador->email] as $secreto) {
            $this->assertStringNotContainsString($secreto, $json);
        }
    }

    public function test_repetir_la_misma_idempotency_key_no_duplica_nada(): void
    {
        [$lote, $vendedor] = $this->loteDisponible();
        Sanctum::actingAs($this->crearProveedorComprador()->user);

        $primera = $this->solicitar($lote, 'misma-clave')->assertCreated();
        $segunda = $this->solicitar($lote, 'misma-clave')->assertOk();

        $this->assertSame($primera->json('reserva.id'), $segunda->json('reserva.id'));
        $this->assertSame(1, ReservaMaterial::count());
        $this->assertSame(1, Mensaje::whereNotNull('reserva_material_id')->count());
        $this->assertSame(1, Notificacion::where('destinatario_id', $vendedor->user_id)->where('tipo', 'reserva_material_solicitada')->count());
    }

    public function test_la_misma_key_sobre_otro_lote_es_un_conflicto(): void
    {
        [$lote] = $this->loteDisponible();
        [$otro] = $this->loteDisponible();
        Sanctum::actingAs($this->crearProveedorComprador()->user);

        $this->solicitar($lote, 'reutilizada')->assertCreated();
        $this->solicitar($otro, 'reutilizada')->assertStatus(409);

        $this->assertSame(1, ReservaMaterial::count());
    }

    public function test_validacion_de_la_solicitud(): void
    {
        [$lote] = $this->loteDisponible();
        Sanctum::actingAs($this->crearProveedorComprador()->user);

        $this->postJson("/api/materiales/{$lote->id}/reservas", ['mensaje_inicial' => 'hola'])->assertStatus(422)->assertJsonValidationErrors('idempotency_key');
        $this->postJson("/api/materiales/{$lote->id}/reservas", ['idempotency_key' => 'k'])->assertStatus(422)->assertJsonValidationErrors('mensaje_inicial');
        $this->postJson("/api/materiales/{$lote->id}/reservas", ['idempotency_key' => 'k', 'mensaje_inicial' => '   '])->assertStatus(422);

        $this->assertSame(0, ReservaMaterial::count());
    }

    public function test_el_vendedor_no_se_reserva_a_si_mismo(): void
    {
        [$lote, $vendedor] = $this->loteDisponible();
        Sanctum::actingAs($vendedor->user);

        $this->solicitar($lote, 'k')->assertForbidden();

        $this->assertSame(0, ReservaMaterial::count());
    }

    public function test_cliente_admin_y_anonimo_no_solicitan(): void
    {
        [$lote] = $this->loteDisponible();

        $this->solicitar($lote, 'k')->assertUnauthorized();

        Sanctum::actingAs($this->crearCliente());
        $this->solicitar($lote, 'k')->assertForbidden();

        Sanctum::actingAs(User::create(['name' => 'Admin', 'email' => 'a.' . uniqid() . '@servigt.test', 'password' => 'password-test', 'role' => 'admin']));
        $this->solicitar($lote, 'k')->assertForbidden();

        $this->assertSame(0, ReservaMaterial::count());
    }

    #[DataProvider('estadosNoSolicitables')]
    public function test_solo_se_solicita_un_lote_disponible(string $estado): void
    {
        [$lote] = $this->loteDisponible(['estado' => $estado]);
        Sanctum::actingAs($this->crearProveedorComprador()->user);

        $this->solicitar($lote, 'k')->assertStatus(422);

        $this->assertSame(0, ReservaMaterial::count());
    }

    public static function estadosNoSolicitables(): array
    {
        return [['reservado'], ['vendido'], ['retirado']];
    }

    public function test_lote_inexistente_devuelve_404(): void
    {
        Sanctum::actingAs($this->crearProveedorComprador()->user);

        $this->postJson('/api/materiales/99999999/reservas', ['idempotency_key' => 'k', 'mensaje_inicial' => 'hola'])->assertNotFound();
    }

    public function test_no_se_repite_solicitud_viva_ni_rechazada_pero_si_tras_cancelar(): void
    {
        [$lote] = $this->loteDisponible();
        $comprador = $this->crearProveedorComprador();
        Sanctum::actingAs($comprador->user);

        $id = $this->solicitar($lote, 'k1')->assertCreated()->json('reserva.id');
        $this->solicitar($lote, 'k2')->assertStatus(409);

        ReservaMaterial::whereKey($id)->update(['estado' => 'rechazada']);
        $this->solicitar($lote, 'k3')->assertStatus(409);

        ReservaMaterial::whereKey($id)->update(['estado' => 'cancelada']);
        $this->solicitar($lote, 'k4')->assertCreated();

        $this->assertSame(2, ReservaMaterial::count());
    }

    public function test_varios_compradores_pueden_tener_solicitudes_pendientes(): void
    {
        [$lote] = $this->loteDisponible();

        foreach ([1, 2, 3] as $i) {
            Sanctum::actingAs($this->crearProveedorComprador()->user);
            $this->solicitar($lote, "k{$i}")->assertCreated();
        }

        $this->assertSame(3, ReservaMaterial::where('estado', 'pendiente')->count());
    }

    // ── Listados y detalle ───────────────────────────────────────────────────

    public function test_el_comprador_solo_ve_sus_reservas(): void
    {
        [$lote] = $this->loteDisponible();
        $yo = $this->crearProveedorComprador();
        $mia = $this->crearReserva($lote, $yo);
        $this->crearReserva($lote, $this->crearProveedorComprador());

        Sanctum::actingAs($yo->user);

        $respuesta = $this->getJson('/api/reservas-material')->assertOk();
        $this->assertSame([$mia->id], collect($respuesta->json('reservas'))->pluck('id')->all());
        $respuesta->assertJsonPath('reservas.0.rol', 'comprador')
            ->assertJsonPath('reservas.0.publicacion.id', $lote->id);
    }

    public function test_el_vendedor_solo_ve_las_solicitudes_de_su_lote(): void
    {
        [$lote, $vendedor] = $this->loteDisponible();
        $this->crearReserva($lote, $this->crearProveedorComprador());
        $this->crearReserva($lote, $this->crearProveedorComprador());

        Sanctum::actingAs($vendedor->user);
        $this->getJson("/api/materiales/{$lote->id}/reservas")->assertOk()->assertJsonCount(2, 'reservas')
            ->assertJsonPath('reservas.0.rol', 'vendedor');

        Sanctum::actingAs($this->crearProveedorComprador()->user);
        $this->getJson("/api/materiales/{$lote->id}/reservas")->assertForbidden();

        Sanctum::actingAs($this->crearCliente());
        $this->getJson("/api/materiales/{$lote->id}/reservas")->assertForbidden();

        $this->getJson('/api/materiales/99999999/reservas')->assertForbidden();
    }

    public function test_detalle_solo_para_comprador_y_vendedor(): void
    {
        [$lote, $vendedor] = $this->loteDisponible();
        $comprador = $this->crearProveedorComprador();
        $reserva = $this->crearReserva($lote, $comprador);

        Sanctum::actingAs($comprador->user);
        $this->getJson("/api/reservas-material/{$reserva->id}")->assertOk()->assertJsonPath('reserva.rol', 'comprador');

        Sanctum::actingAs($vendedor->user);
        $this->getJson("/api/reservas-material/{$reserva->id}")->assertOk()->assertJsonPath('reserva.rol', 'vendedor');

        Sanctum::actingAs($this->crearProveedorComprador()->user);
        $this->getJson("/api/reservas-material/{$reserva->id}")->assertForbidden();

        $this->getJson('/api/reservas-material/99999999')->assertNotFound();
    }

    // ── Aceptar ──────────────────────────────────────────────────────────────

    public function test_aceptar_reserva_el_lote_y_rechaza_las_demas_pendientes(): void
    {
        [$lote, $vendedor] = $this->loteDisponible();
        $ganador = $this->crearProveedorComprador();
        $perdedor = $this->crearProveedorComprador();
        $canceladoAntes = $this->crearProveedorComprador();

        $rGanadora = $this->crearReserva($lote, $ganador);
        $rPerdedora = $this->crearReserva($lote, $perdedor);
        $rCancelada = $this->crearReserva($lote, $canceladoAntes, ['estado' => 'cancelada']);

        Sanctum::actingAs($vendedor->user);
        $this->postJson("/api/reservas-material/{$rGanadora->id}/aceptar")
            ->assertOk()
            ->assertJsonPath('reserva.estado', 'aceptada');

        $this->assertSame('reservado', $lote->fresh()->estado);
        $this->assertSame('rechazada', $rPerdedora->fresh()->estado);
        $this->assertSame('cancelada', $rCancelada->fresh()->estado, 'Una reserva cancelada no debe convertirse en rechazada.');

        $this->assertSame(1, Notificacion::where('destinatario_id', $ganador->user_id)->where('tipo', 'reserva_material_aceptada')->count());
        $this->assertSame(1, Notificacion::where('destinatario_id', $perdedor->user_id)->where('tipo', 'reserva_material_rechazada')->count());
        $this->assertSame(0, Notificacion::where('destinatario_id', $canceladoAntes->user_id)->count());
    }

    public function test_solo_el_vendedor_acepta_y_solo_si_esta_pendiente_y_el_lote_disponible(): void
    {
        [$lote, $vendedor] = $this->loteDisponible();
        $comprador = $this->crearProveedorComprador();
        $reserva = $this->crearReserva($lote, $comprador);

        Sanctum::actingAs($comprador->user);
        $this->postJson("/api/reservas-material/{$reserva->id}/aceptar")->assertForbidden();

        Sanctum::actingAs($this->crearProveedorComprador()->user);
        $this->postJson("/api/reservas-material/{$reserva->id}/aceptar")->assertForbidden();

        Sanctum::actingAs($this->crearCliente());
        $this->postJson("/api/reservas-material/{$reserva->id}/aceptar")->assertForbidden();

        $this->postJson('/api/reservas-material/99999999/aceptar')->assertForbidden();

        Sanctum::actingAs($vendedor->user);
        $this->postJson('/api/reservas-material/99999999/aceptar')->assertNotFound();
        $this->postJson("/api/reservas-material/{$reserva->id}/aceptar")->assertOk();
        $this->postJson("/api/reservas-material/{$reserva->id}/aceptar")->assertStatus(422);

        $this->assertSame('reservado', $lote->fresh()->estado);
    }

    public function test_no_se_acepta_una_segunda_reserva_si_el_lote_ya_esta_reservado(): void
    {
        [$lote, $vendedor] = $this->loteDisponible();
        $r1 = $this->crearReserva($lote, $this->crearProveedorComprador());
        $r2 = $this->crearReserva($lote, $this->crearProveedorComprador());
        Sanctum::actingAs($vendedor->user);

        $this->postJson("/api/reservas-material/{$r1->id}/aceptar")->assertOk();
        // r2 ya quedo rechazada; reabrirla a mano simula un dato inconsistente.
        ReservaMaterial::whereKey($r2->id)->update(['estado' => 'pendiente']);

        $this->postJson("/api/reservas-material/{$r2->id}/aceptar")->assertStatus(422);
        $this->assertSame('pendiente', $r2->fresh()->estado);
    }

    public function test_un_fallo_al_notificar_revierte_toda_la_aceptacion(): void
    {
        [$lote, $vendedor] = $this->loteDisponible();
        $r1 = $this->crearReserva($lote, $this->crearProveedorComprador());
        $r2 = $this->crearReserva($lote, $this->crearProveedorComprador());
        Sanctum::actingAs($vendedor->user);

        Notificacion::creating(function () {
            throw new \RuntimeException('fallo simulado de notificacion');
        });

        $this->postJson("/api/reservas-material/{$r1->id}/aceptar")->assertStatus(500);

        Notificacion::flushEventListeners();

        $this->assertSame('pendiente', $r1->fresh()->estado);
        $this->assertSame('pendiente', $r2->fresh()->estado);
        $this->assertSame('disponible', $lote->fresh()->estado);
    }

    // ── Rechazar ─────────────────────────────────────────────────────────────

    public function test_vendedor_rechaza_una_pendiente_y_el_lote_sigue_disponible(): void
    {
        [$lote, $vendedor] = $this->loteDisponible();
        $comprador = $this->crearProveedorComprador();
        $reserva = $this->crearReserva($lote, $comprador);
        Sanctum::actingAs($vendedor->user);

        $this->postJson("/api/reservas-material/{$reserva->id}/rechazar")->assertOk()->assertJsonPath('reserva.estado', 'rechazada');

        $this->assertSame('disponible', $lote->fresh()->estado);
        $this->assertSame(1, Notificacion::where('destinatario_id', $comprador->user_id)->where('tipo', 'reserva_material_rechazada')->count());
        $this->postJson("/api/reservas-material/{$reserva->id}/rechazar")->assertStatus(422);
    }

    public function test_solo_el_vendedor_rechaza(): void
    {
        [$lote] = $this->loteDisponible();
        $comprador = $this->crearProveedorComprador();
        $reserva = $this->crearReserva($lote, $comprador);

        Sanctum::actingAs($comprador->user);
        $this->postJson("/api/reservas-material/{$reserva->id}/rechazar")->assertForbidden();

        Sanctum::actingAs($this->crearProveedorComprador()->user);
        $this->postJson("/api/reservas-material/{$reserva->id}/rechazar")->assertForbidden();

        $this->assertSame('pendiente', $reserva->fresh()->estado);
    }

    // ── Cancelar ─────────────────────────────────────────────────────────────

    public function test_comprador_cancela_su_pendiente_y_avisa_al_vendedor(): void
    {
        [$lote, $vendedor] = $this->loteDisponible();
        $comprador = $this->crearProveedorComprador();
        $reserva = $this->crearReserva($lote, $comprador);
        Sanctum::actingAs($comprador->user);

        $this->postJson("/api/reservas-material/{$reserva->id}/cancelar")->assertOk()->assertJsonPath('reserva.estado', 'cancelada');

        $this->assertSame('disponible', $lote->fresh()->estado);
        $this->assertSame(1, Notificacion::where('destinatario_id', $vendedor->user_id)->where('tipo', 'reserva_material_cancelada')->count());
    }

    public function test_cancelar_una_reserva_aceptada_libera_el_lote(): void
    {
        foreach (['comprador', 'vendedor'] as $quienCancela) {
            [$lote, $vendedor] = $this->loteDisponible();
            $comprador = $this->crearProveedorComprador();
            $reserva = $this->crearReserva($lote, $comprador, ['estado' => 'aceptada']);
            $lote->update(['estado' => 'reservado']);

            Sanctum::actingAs($quienCancela === 'comprador' ? $comprador->user : $vendedor->user);
            $this->postJson("/api/reservas-material/{$reserva->id}/cancelar")->assertOk()->assertJsonPath('reserva.estado', 'cancelada');

            $this->assertSame('disponible', $lote->fresh()->estado, "Cancela {$quienCancela}: el lote debia liberarse.");

            $destinatario = $quienCancela === 'comprador' ? $vendedor->user_id : $comprador->user_id;
            $this->assertSame(1, Notificacion::where('destinatario_id', $destinatario)->where('tipo', 'reserva_material_cancelada')->count());
        }
    }

    public function test_el_vendedor_no_cancela_una_pendiente_y_nadie_cancela_estados_terminales(): void
    {
        [$lote, $vendedor] = $this->loteDisponible();
        $comprador = $this->crearProveedorComprador();
        $pendiente = $this->crearReserva($lote, $comprador);

        Sanctum::actingAs($vendedor->user);
        $this->postJson("/api/reservas-material/{$pendiente->id}/cancelar")->assertStatus(422);

        foreach (['rechazada', 'cancelada'] as $terminal) {
            $r = $this->crearReserva($lote, $this->crearProveedorComprador(), ['estado' => $terminal]);
            $this->postJson("/api/reservas-material/{$r->id}/cancelar")->assertStatus(422);

            Sanctum::actingAs($r->comprador->user);
            $this->postJson("/api/reservas-material/{$r->id}/cancelar")->assertStatus(422);
            Sanctum::actingAs($vendedor->user);
        }

        $this->assertSame('pendiente', $pendiente->fresh()->estado);
    }

    public function test_un_tercero_no_cancela(): void
    {
        [$lote] = $this->loteDisponible();
        $reserva = $this->crearReserva($lote, $this->crearProveedorComprador());
        Sanctum::actingAs($this->crearProveedorComprador()->user);

        $this->postJson("/api/reservas-material/{$reserva->id}/cancelar")->assertForbidden();

        $this->assertSame('pendiente', $reserva->fresh()->estado);
    }

    // ── Acciones calculadas por backend ──────────────────────────────────────

    public function test_el_backend_informa_que_acciones_permite_cada_rol_en_cada_estado(): void
    {
        [$lote, $vendedor] = $this->loteDisponible();
        $comprador = $this->crearProveedorComprador();
        $reserva = $this->crearReserva($lote, $comprador);

        Sanctum::actingAs($vendedor->user);
        $this->assertEqualsCanonicalizing(['aceptar', 'rechazar'], $this->getJson("/api/reservas-material/{$reserva->id}")->json('reserva.acciones'));

        Sanctum::actingAs($comprador->user);
        $this->assertSame(['cancelar'], $this->getJson("/api/reservas-material/{$reserva->id}")->json('reserva.acciones'));

        $reserva->update(['estado' => 'aceptada']);
        $this->assertSame(['cancelar'], $this->getJson("/api/reservas-material/{$reserva->id}")->json('reserva.acciones'));

        Sanctum::actingAs($vendedor->user);
        $this->assertSame(['cancelar'], $this->getJson("/api/reservas-material/{$reserva->id}")->json('reserva.acciones'));

        $reserva->update(['estado' => 'rechazada']);
        $this->assertSame([], $this->getJson("/api/reservas-material/{$reserva->id}")->json('reserva.acciones'));
    }

    // ── Auxiliares ───────────────────────────────────────────────────────────

    /** @return array{0: PublicacionMaterial, 1: \App\Models\Proveedor} */
    private function loteDisponible(array $extra = []): array
    {
        $vendedor = $this->crearProveedorComprador();
        $lote = $this->crearLote($this->servicioCanceladoDesdeEnCamino($vendedor), $extra);

        return [$lote, $vendedor];
    }

    private function solicitar(PublicacionMaterial $lote, string $clave, string $mensaje = 'Me interesa el lote, ¿sigue disponible?')
    {
        return $this->postJson("/api/materiales/{$lote->id}/reservas", [
            'idempotency_key' => $clave,
            'mensaje_inicial' => $mensaje,
        ]);
    }
}
