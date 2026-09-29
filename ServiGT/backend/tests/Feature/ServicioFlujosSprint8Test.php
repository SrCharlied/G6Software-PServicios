<?php

namespace Tests\Feature;

use App\Models\Categoria;
use App\Models\CreditoProveedor;
use App\Models\Notificacion;
use App\Models\Proveedor;
use App\Models\Servicio;
use App\Models\User;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ServicioFlujosSprint8Test extends TestCase
{
    use DatabaseTransactions;

    private Categoria $categoria;

    protected function setUp(): void
    {
        parent::setUp();

        $this->categoria = Categoria::factory()->create();
    }

    public function test_flow_a_recorre_contratacion_codigos_confirmacion_y_calificacion(): void
    {
        $cliente = User::factory()->cliente()->create();
        $proveedor = $this->crearProveedor();

        Sanctum::actingAs($cliente);
        $servicioId = $this->postJson('/api/servicios', [
            'proveedor_id' => $proveedor->id,
            'categoria_id' => $this->categoria->id,
            'descripcion' => 'Contratacion directa integral para Sprint 8.',
            'direccion' => 'Zona 10, Guatemala',
        ])->assertCreated()->json('servicio.id');

        Sanctum::actingAs($proveedor->user);
        $this->postJson("/api/servicios/{$servicioId}/aceptar")
            ->assertOk()
            ->assertJsonPath('servicio.estado', 'aceptado');

        $this->completarServicio($servicioId, $cliente, $proveedor);

        Sanctum::actingAs($cliente);
        $this->postJson("/api/servicios/{$servicioId}/calificar", [
            'puntuacion' => 5,
            'comentario' => 'Flujo directo completado correctamente.',
        ])->assertCreated()
            ->assertJsonPath('calificacion.destinatario_id', $proveedor->user_id);

        $this->assertDatabaseHas('servicios', [
            'id' => $servicioId,
            'estado' => 'completado',
        ]);
        $this->assertDatabaseHas('calificaciones', [
            'servicio_id' => $servicioId,
            'autor_id' => $cliente->id,
            'destinatario_id' => $proveedor->user_id,
            'es_verificada' => true,
        ]);
        $this->assertNotificacionesDelCiclo($servicioId, $cliente, $proveedor);
    }

    public function test_flow_b_recorre_pedido_cotizacion_servicio_codigos_y_calificacion(): void
    {
        $cliente = User::factory()->cliente()->create();
        $proveedor = $this->crearProveedor(saldo: 7);
        $saldoAntes = $this->saldo($proveedor);

        [$pedidoId, $cotizacionId, $servicioId] = $this->adjudicarPedido($cliente, $proveedor);
        $this->completarServicio($servicioId, $cliente, $proveedor);

        Sanctum::actingAs($cliente);
        $this->postJson("/api/servicios/{$servicioId}/calificar", [
            'puntuacion' => 4,
            'comentario' => 'Pedido adjudicado completado correctamente.',
        ])->assertCreated();

        $this->assertDatabaseHas('pedidos', ['id' => $pedidoId, 'estado' => 'adjudicado']);
        $this->assertDatabaseHas('cotizaciones', ['id' => $cotizacionId, 'estado' => 'aceptada']);
        $this->assertDatabaseHas('servicios', ['id' => $servicioId, 'estado' => 'completado']);
        $this->assertDatabaseHas('calificaciones', [
            'servicio_id' => $servicioId,
            'destinatario_id' => $proveedor->user_id,
        ]);
        $this->assertSame($saldoAntes, $this->saldo($proveedor));
        $this->assertNotificacionesDelCiclo($servicioId, $cliente, $proveedor);
        $this->assertDatabaseHas('notificaciones', [
            'destinatario_id' => $proveedor->user_id,
            'tipo' => 'cotizacion_aceptada',
        ]);
    }

    public function test_cancelacion_directa_y_adjudicada_preserva_terminales_pedido_y_saldo(): void
    {
        $clienteDirecto = User::factory()->cliente()->create();
        $proveedorDirecto = $this->crearProveedor();

        Sanctum::actingAs($clienteDirecto);
        $servicioDirecto = $this->postJson('/api/servicios', [
            'proveedor_id' => $proveedorDirecto->id,
            'categoria_id' => $this->categoria->id,
            'descripcion' => 'Servicio directo para cancelar antes de iniciar.',
            'direccion' => 'Zona 1, Guatemala',
        ])->assertCreated()->json('servicio.id');

        $this->postJson("/api/servicios/{$servicioDirecto}/cancelar")
            ->assertOk()
            ->assertJsonPath('servicio.estado', 'cancelado');

        Sanctum::actingAs($proveedorDirecto->user);
        $this->postJson("/api/servicios/{$servicioDirecto}/aceptar")->assertStatus(422);
        $this->assertSame(1, $this->notificacionesCancelacion($servicioDirecto));

        $clientePedido = User::factory()->cliente()->create();
        $proveedorPedido = $this->crearProveedor(saldo: 9);
        $saldoAntes = $this->saldo($proveedorPedido);
        [$pedidoId, $cotizacionId, $servicioAdjudicado] = $this->adjudicarPedido(
            $clientePedido,
            $proveedorPedido,
        );

        Sanctum::actingAs($clientePedido);
        $this->postJson("/api/servicios/{$servicioAdjudicado}/cancelar")
            ->assertOk()
            ->assertJsonPath('servicio.estado', 'cancelado');
        $this->postJson("/api/servicios/{$servicioAdjudicado}/cancelar")->assertStatus(422);

        $this->assertDatabaseHas('pedidos', ['id' => $pedidoId, 'estado' => 'adjudicado']);
        $this->assertDatabaseHas('cotizaciones', ['id' => $cotizacionId, 'estado' => 'aceptada']);
        $this->assertDatabaseHas('servicios', ['id' => $servicioAdjudicado, 'estado' => 'cancelado']);
        $this->assertSame($saldoAntes, $this->saldo($proveedorPedido));
        $this->assertSame(1, $this->notificacionesCancelacion($servicioAdjudicado));

        Sanctum::actingAs($proveedorPedido->user);
        $this->postJson("/api/servicios/{$servicioAdjudicado}/iniciar", [
            'codigo' => Servicio::findOrFail($servicioAdjudicado)->codigo_inicio,
        ])->assertStatus(422);
    }

    private function adjudicarPedido(User $cliente, Proveedor $proveedor): array
    {
        Sanctum::actingAs($cliente);
        $pedidoId = $this->postJson('/api/pedidos', [
            'descripcion' => 'Pedido integral para verificar Flow B y cancelacion.',
            'categoria_id' => $this->categoria->id,
            'direccion' => 'Zona 4, Guatemala',
            'urgencia' => 'media',
        ])->assertCreated()->json('pedido.id');

        Sanctum::actingAs($proveedor->user);
        $cotizacionId = $this->postJson("/api/pedidos/{$pedidoId}/cotizaciones", [
            'monto' => 350,
            'mensaje' => 'Cotizacion integral para el recorrido completo de Sprint 8.',
        ])->assertCreated()
            ->assertJsonPath('cotizacion.costo_creditos', 0)
            ->json('cotizacion.id');

        Sanctum::actingAs($cliente);
        $servicioId = $this->postJson(
            "/api/pedidos/{$pedidoId}/cotizaciones/{$cotizacionId}/aceptar",
        )->assertOk()
            ->assertJsonPath('pedido.estado', 'adjudicado')
            ->assertJsonPath('cotizacion.estado', 'aceptada')
            ->assertJsonPath('servicio.estado', 'aceptado')
            ->json('servicio.id');

        return [$pedidoId, $cotizacionId, $servicioId];
    }

    private function completarServicio(int $servicioId, User $cliente, Proveedor $proveedor): void
    {
        Sanctum::actingAs($proveedor->user);
        $this->postJson("/api/servicios/{$servicioId}/aceptar")
            ->assertStatus(422);

        Sanctum::actingAs($cliente);
        $codigoInicio = $this->getJson("/api/servicios/{$servicioId}")
            ->assertOk()
            ->json('servicio.codigo_inicio');
        $this->assertMatchesRegularExpression('/^\d{6}$/', $codigoInicio);

        Sanctum::actingAs($proveedor->user);
        $this->postJson("/api/servicios/{$servicioId}/iniciar", [
            'codigo' => $codigoInicio,
        ])->assertOk()->assertJsonPath('servicio.estado', 'en_progreso');
        $codigoFin = $this->postJson("/api/servicios/{$servicioId}/finalizar")
            ->assertOk()
            ->assertJsonPath('servicio.estado', 'por_confirmar')
            ->json('codigo_fin');
        $this->assertMatchesRegularExpression('/^\d{6}$/', $codigoFin);

        Sanctum::actingAs($cliente);
        $this->postJson("/api/servicios/{$servicioId}/confirmar-fin", [
            'codigo' => $codigoFin,
        ])->assertOk()->assertJsonPath('servicio.estado', 'completado');
    }

    private function crearProveedor(int $saldo = 0): Proveedor
    {
        $user = User::factory()->proveedor()->create();
        $proveedor = Proveedor::create([
            'user_id' => $user->id,
            'nombre' => $user->name,
            'email' => $user->email,
            'departamento' => 'Guatemala',
            'municipio' => 'Guatemala',
            'categoria_id' => $this->categoria->id,
            'descripcion' => 'Proveedor para los recorridos integrados de Sprint 8.',
        ])->setRelation('user', $user);

        CreditoProveedor::create([
            'proveedor_id' => $proveedor->id,
            'saldo' => $saldo,
        ]);

        return $proveedor;
    }

    private function saldo(Proveedor $proveedor): int
    {
        return (int) CreditoProveedor::where('proveedor_id', $proveedor->id)->value('saldo');
    }

    private function notificacionesCancelacion(int $servicioId): int
    {
        return Notificacion::where('tipo', 'servicio_cancelado')
            ->where('datos->servicio_id', $servicioId)
            ->count();
    }

    private function assertNotificacionesDelCiclo(
        int $servicioId,
        User $cliente,
        Proveedor $proveedor,
    ): void {
        foreach ([
            [$cliente->id, 'servicio_iniciado'],
            [$cliente->id, 'servicio_por_confirmar'],
            [$cliente->id, 'servicio_calificable'],
            [$proveedor->user_id, 'servicio_completado'],
        ] as [$destinatario, $tipo]) {
            $this->assertTrue(Notificacion::where('destinatario_id', $destinatario)
                ->where('tipo', $tipo)
                ->where('datos->servicio_id', $servicioId)
                ->exists(), "Falta notificacion {$tipo} para el servicio {$servicioId}.");
        }
    }
}
