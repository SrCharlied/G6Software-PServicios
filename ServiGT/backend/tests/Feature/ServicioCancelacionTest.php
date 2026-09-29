<?php

namespace Tests\Feature;

use App\Models\Categoria;
use App\Models\Cotizacion;
use App\Models\CreditoProveedor;
use App\Models\Notificacion;
use App\Models\Pedido;
use App\Models\Proveedor;
use App\Models\Servicio;
use App\Models\User;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Laravel\Sanctum\Sanctum;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

class ServicioCancelacionTest extends TestCase
{
    use DatabaseTransactions;

    public function test_cancelar_requiere_autenticacion(): void
    {
        $this->postJson('/api/servicios/1/cancelar')->assertUnauthorized();
    }

    #[DataProvider('estadosCancelables')]
    public function test_cliente_propietario_puede_cancelar_en_estados_permitidos(string $estado): void
    {
        $servicio = $this->crearServicio($estado);
        Sanctum::actingAs($servicio->cliente);

        $this->postJson("/api/servicios/{$servicio->id}/cancelar", [
            'motivo' => 'Ya no necesito el servicio.',
        ])->assertOk()
            ->assertJsonPath('message', 'Servicio cancelado')
            ->assertJsonPath('servicio.estado', 'cancelado')
            ->assertJsonPath('servicio.motivo_cancelacion', 'Ya no necesito el servicio.');

        $this->assertDatabaseHas('servicios', [
            'id' => $servicio->id,
            'estado' => 'cancelado',
            'motivo_cancelacion' => 'Ya no necesito el servicio.',
        ]);

        $this->assertDatabaseHas('notificaciones', [
            'destinatario_id' => $servicio->proveedor->user_id,
            'tipo' => 'servicio_cancelado',
        ]);
    }

    public static function estadosCancelables(): array
    {
        return [
            'pendiente' => ['pendiente'],
            'aceptado' => ['aceptado'],
            'en_camino' => ['en_camino'],
        ];
    }

    public function test_motivo_es_opcional(): void
    {
        $servicio = $this->crearServicio('pendiente');
        Sanctum::actingAs($servicio->cliente);

        $this->postJson("/api/servicios/{$servicio->id}/cancelar")
            ->assertOk()
            ->assertJsonPath('servicio.motivo_cancelacion', null);
    }

    public function test_proveedor_y_cliente_ajeno_no_pueden_cancelar(): void
    {
        $servicio = $this->crearServicio('aceptado');

        Sanctum::actingAs($servicio->proveedor->user);
        $this->postJson("/api/servicios/{$servicio->id}/cancelar")->assertForbidden();

        Sanctum::actingAs(User::factory()->cliente()->create());
        $this->postJson("/api/servicios/{$servicio->id}/cancelar")->assertForbidden();

        $this->assertDatabaseHas('servicios', [
            'id' => $servicio->id,
            'estado' => 'aceptado',
        ]);
    }

    public function test_servicio_inexistente_responde_404(): void
    {
        Sanctum::actingAs(User::factory()->cliente()->create());

        $this->postJson('/api/servicios/999999/cancelar')->assertNotFound();
    }

    #[DataProvider('estadosNoCancelables')]
    public function test_rechaza_estados_no_cancelables(string $estado): void
    {
        $servicio = $this->crearServicio($estado);
        Sanctum::actingAs($servicio->cliente);

        $this->postJson("/api/servicios/{$servicio->id}/cancelar")
            ->assertStatus(422)
            ->assertJsonPath('message', 'Este servicio ya no se puede cancelar');

        $this->assertDatabaseHas('servicios', [
            'id' => $servicio->id,
            'estado' => $estado,
        ]);
    }

    public static function estadosNoCancelables(): array
    {
        return [
            'en_progreso' => ['en_progreso'],
            'por_confirmar' => ['por_confirmar'],
            'completado' => ['completado'],
            'cancelado' => ['cancelado'],
            'rechazado' => ['rechazado'],
        ];
    }

    public function test_reintento_no_duplica_notificacion(): void
    {
        $servicio = $this->crearServicio('pendiente');
        Sanctum::actingAs($servicio->cliente);

        $this->postJson("/api/servicios/{$servicio->id}/cancelar")->assertOk();
        $this->postJson("/api/servicios/{$servicio->id}/cancelar")->assertStatus(422);

        $this->assertSame(1, Notificacion::query()
            ->where('destinatario_id', $servicio->proveedor->user_id)
            ->where('tipo', 'servicio_cancelado')
            ->count());
    }

    public function test_cancelar_servicio_adjudicado_no_modifica_pedido_cotizacion_ni_saldo(): void
    {
        $servicio = $this->crearServicio('aceptado');
        $pedido = Pedido::create([
            'cliente_id' => $servicio->cliente_id,
            'categoria_id' => $servicio->proveedor->categoria_id,
            'descripcion' => 'Pedido adjudicado usado para verificar invariantes.',
            'direccion' => 'Zona 1',
            'urgencia' => 'media',
            'estado' => 'adjudicado',
            'fecha_expiracion' => now()->addDays(7),
        ]);
        $cotizacion = Cotizacion::create([
            'pedido_id' => $pedido->id,
            'proveedor_id' => $servicio->proveedor_id,
            'monto' => 350,
            'mensaje' => 'Cotizacion adjudicada vinculada por el flujo existente.',
            'estado' => 'aceptada',
            'costo_creditos' => 1,
        ]);
        $credito = CreditoProveedor::create([
            'proveedor_id' => $servicio->proveedor_id,
            'saldo' => 9,
        ]);

        Sanctum::actingAs($servicio->cliente);
        $this->postJson("/api/servicios/{$servicio->id}/cancelar")->assertOk();

        $this->assertDatabaseHas('pedidos', ['id' => $pedido->id, 'estado' => 'adjudicado']);
        $this->assertDatabaseHas('cotizaciones', ['id' => $cotizacion->id, 'estado' => 'aceptada']);
        $this->assertDatabaseHas('creditos_proveedor', [
            'proveedor_id' => $credito->proveedor_id,
            'saldo' => 9,
        ]);
    }

    private function crearServicio(string $estado): Servicio
    {
        $categoria = Categoria::factory()->create();
        $userProveedor = User::factory()->proveedor()->create();
        $cliente = User::factory()->cliente()->create();
        $proveedor = Proveedor::create([
            'user_id' => $userProveedor->id,
            'nombre' => $userProveedor->name,
            'email' => $userProveedor->email,
            'departamento' => 'Guatemala',
            'municipio' => 'Guatemala',
            'categoria_id' => $categoria->id,
            'descripcion' => 'Proveedor para pruebas de cancelacion.',
        ])->setRelation('user', $userProveedor);

        return Servicio::create([
            'cliente_id' => $cliente->id,
            'proveedor_id' => $proveedor->id,
            'categoria_id' => $categoria->id,
            'descripcion' => 'Servicio para pruebas de cancelacion.',
            'estado' => $estado,
            'codigo_inicio' => '123456',
        ])->setRelation('cliente', $cliente)->setRelation('proveedor', $proveedor);
    }
}
