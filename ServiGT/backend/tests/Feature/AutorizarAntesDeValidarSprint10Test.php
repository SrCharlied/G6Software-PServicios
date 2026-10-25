<?php

namespace Tests\Feature;

use App\Models\Cotizacion;
use App\Models\CreditoProveedor;
use App\Models\Pedido;
use App\Models\Proveedor;
use App\Models\ReporteSeguridad;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Laravel\Sanctum\Sanctum;
use Tests\Feature\Concerns\CreaEscenarioSeguridad;
use Tests\TestCase;

/**
 * HU 5.1 (Sprint 10): quien no puede actuar sobre el recurso recibe 403/404
 * antes de que se valide el cuerpo, asi un cuerpo invalido no le devuelve las
 * reglas internas del formulario (422). El participante legitimo conserva el
 * 422 por campo. Cada prueba comprueba la causa, no solo el status.
 */
class AutorizarAntesDeValidarSprint10Test extends TestCase
{
    use DatabaseTransactions;
    use CreaEscenarioSeguridad;

    // ── 5.1.a · PUT /pedidos/{id}/cotizaciones/{id} ─────────────────────────

    public function test_rol_no_proveedor_recibe_403_aunque_el_cuerpo_sea_invalido(): void
    {
        [, $cotizacion, $pedido] = $this->cotizacionEnviada();
        Sanctum::actingAs($pedido->cliente);

        $this->putJson($this->urlCotizacion($cotizacion), [])
            ->assertForbidden()
            ->assertJsonPath('message', 'Solo un proveedor puede editar cotizaciones.')
            ->assertJsonMissingPath('errors');
    }

    public function test_rol_no_proveedor_recibe_403_con_cuerpo_valido(): void
    {
        [, $cotizacion, $pedido] = $this->cotizacionEnviada();
        Sanctum::actingAs($pedido->cliente);

        $this->putJson($this->urlCotizacion($cotizacion), $this->cuerpoCotizacion())
            ->assertForbidden()
            ->assertJsonPath('message', 'Solo un proveedor puede editar cotizaciones.');

        $this->assertEquals(350, $cotizacion->fresh()->monto);
    }

    public function test_proveedor_ajeno_recibe_404_aunque_el_cuerpo_sea_invalido(): void
    {
        [, $cotizacion] = $this->cotizacionEnviada();
        Sanctum::actingAs($this->crearProveedorComprador()->user);

        // 404 y no 403: la cotizacion ajena no se revela, igual que con cuerpo valido.
        $this->putJson($this->urlCotizacion($cotizacion), [])
            ->assertNotFound()
            ->assertJsonPath('message', 'Cotización no encontrada.')
            ->assertJsonMissingPath('errors');
    }

    public function test_duenno_conserva_el_422_por_campo(): void
    {
        [$proveedor, $cotizacion] = $this->cotizacionEnviada();
        Sanctum::actingAs($proveedor->user);

        $this->putJson($this->urlCotizacion($cotizacion), ['monto' => 0, 'mensaje' => 'corto'])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['monto', 'mensaje']);

        $this->assertEquals(350, $cotizacion->fresh()->monto);
        $this->assertSame(5, (int) CreditoProveedor::where('proveedor_id', $proveedor->id)->value('saldo'));
    }

    public function test_duenno_con_cuerpo_valido_sigue_editando(): void
    {
        [$proveedor, $cotizacion] = $this->cotizacionEnviada();
        Sanctum::actingAs($proveedor->user);

        $this->putJson($this->urlCotizacion($cotizacion), $this->cuerpoCotizacion())
            ->assertOk()
            ->assertJsonPath('nuevo_saldo', 4);

        $this->assertEquals(480, $cotizacion->fresh()->monto);
    }

    // ── 5.1.b · POST /servicios/{id}/seguridad/{reportes|interrumpir} ────────

    public function test_tercero_recibe_403_al_reportar_con_cuerpo_invalido(): void
    {
        $servicio = $this->servicioSeguro('en_progreso');
        Sanctum::actingAs($this->crearCliente());

        foreach (['reportes', 'interrumpir'] as $accion) {
            $this->postJson("/api/servicios/{$servicio->id}/seguridad/{$accion}", [])
                ->assertForbidden()
                ->assertJsonPath('message', 'Solo el cliente o el proveedor del servicio pueden reportar.')
                ->assertJsonMissingPath('errors');
        }

        $this->assertSame(0, ReporteSeguridad::where('servicio_id', $servicio->id)->count());
        $this->assertSame('en_progreso', $servicio->fresh()->estado);
    }

    public function test_admin_no_participa_y_recibe_403_con_cuerpo_invalido(): void
    {
        $servicio = $this->servicioSeguro('en_progreso');
        Sanctum::actingAs($this->crearAdmin());

        $this->postJson("/api/servicios/{$servicio->id}/seguridad/reportes", [])
            ->assertForbidden()
            ->assertJsonMissingPath('errors');
    }

    public function test_servicio_inexistente_responde_404_antes_de_validar(): void
    {
        Sanctum::actingAs($this->crearCliente());

        $this->postJson('/api/servicios/999999999/seguridad/reportes', [])
            ->assertNotFound()
            ->assertJsonPath('message', 'Servicio no encontrado.')
            ->assertJsonMissingPath('errors');
    }

    public function test_participante_conserva_el_422_por_campo(): void
    {
        $servicio = $this->servicioSeguro('en_progreso');

        foreach ([$servicio->cliente, $servicio->proveedor->user] as $participante) {
            Sanctum::actingAs($participante);

            $this->postJson("/api/servicios/{$servicio->id}/seguridad/reportes", ['categoria' => 'inventada'])
                ->assertStatus(422)
                ->assertJsonValidationErrors(['categoria', 'descripcion', 'idempotency_key']);
        }

        $this->assertSame(0, ReporteSeguridad::where('servicio_id', $servicio->id)->count());
    }

    public function test_participante_con_cuerpo_valido_sigue_reportando(): void
    {
        $servicio = $this->servicioSeguro('en_progreso');
        Sanctum::actingAs($servicio->cliente);

        $this->postJson("/api/servicios/{$servicio->id}/seguridad/reportes", [
            'categoria'       => 'conducta_inapropiada',
            'descripcion'     => 'Descripción del incidente reportado.',
            'idempotency_key' => 'k-' . uniqid(),
        ])->assertCreated();

        $this->assertSame(1, ReporteSeguridad::where('servicio_id', $servicio->id)->count());
    }

    // ── Auxiliares ───────────────────────────────────────────────────────────

    /** @return array{0: Proveedor, 1: Cotizacion, 2: Pedido} */
    private function cotizacionEnviada(): array
    {
        $cliente = $this->crearCliente();
        $pedido = Pedido::create([
            'cliente_id'       => $cliente->id,
            'categoria_id'     => $this->categoriaMat()->id,
            'descripcion'      => 'Descripcion de prueba suficientemente larga para el pedido',
            'direccion'        => 'Zona 1, Guatemala',
            'urgencia'         => 'media',
            'estado'           => 'abierto',
            'fecha_expiracion' => now()->addDays(7),
        ])->setRelation('cliente', $cliente);

        $proveedor = $this->crearProveedorComprador();
        CreditoProveedor::updateOrCreate(['proveedor_id' => $proveedor->id], ['saldo' => 5]);

        $cotizacion = Cotizacion::create([
            'pedido_id'      => $pedido->id,
            'proveedor_id'   => $proveedor->id,
            'monto'          => 350,
            'mensaje'        => 'Cotizacion original con detalle suficiente del trabajo.',
            'estado'         => 'enviada',
            'costo_creditos' => 0,
        ]);

        return [$proveedor, $cotizacion, $pedido];
    }

    private function urlCotizacion(Cotizacion $cotizacion): string
    {
        return "/api/pedidos/{$cotizacion->pedido_id}/cotizaciones/{$cotizacion->id}";
    }

    private function cuerpoCotizacion(): array
    {
        return ['monto' => 480, 'mensaje' => 'Mensaje actualizado con detalle suficiente del trabajo.'];
    }
}
