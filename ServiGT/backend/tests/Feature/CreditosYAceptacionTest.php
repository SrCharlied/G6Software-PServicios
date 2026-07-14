<?php

namespace Tests\Feature;

use App\Models\Categoria;
use App\Models\Cotizacion;
use App\Models\CreditoProveedor;
use App\Models\Pedido;
use App\Models\Proveedor;
use App\Models\Servicio;
use App\Models\User;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class CreditosYAceptacionTest extends TestCase
{
    use DatabaseTransactions;

    private Categoria $categoria;
    private User $cliente;
    private Pedido $pedido;
    private int $secuencia = 0;

    protected function setUp(): void
    {
        parent::setUp();

        $this->categoria = Categoria::create([
            'nombre'      => 'Categoria test ' . uniqid(),
            'descripcion' => 'Categoria para pruebas del marketplace',
        ]);

        $this->cliente = $this->crearUsuario('cliente');
        $this->pedido = Pedido::create([
            'cliente_id'       => $this->cliente->id,
            'categoria_id'     => $this->categoria->id,
            'descripcion'      => 'Reparacion electrica completa para vivienda de prueba',
            'direccion'        => 'Zona 10, Ciudad de Guatemala',
            'urgencia'         => 'media',
            'estado'           => 'abierto',
            'fecha_expiracion' => now()->addDays(7),
        ]);
    }

    public function test_aceptar_cotizacion_crea_servicio_y_actualiza_estados(): void
    {
        $ganador = $this->crearProveedor();
        $otroProveedor = $this->crearProveedor();
        $cotizacionGanadora = $this->crearCotizacion($ganador, 475.50);
        $cotizacionPerdedora = $this->crearCotizacion($otroProveedor, 520.00);

        Sanctum::actingAs($this->cliente);

        $response = $this->postJson(
            "/api/pedidos/{$this->pedido->id}/cotizaciones/{$cotizacionGanadora->id}/aceptar"
        );

        $response->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('pedido.estado', 'adjudicado')
            ->assertJsonPath('cotizacion.estado', 'aceptada')
            ->assertJsonPath('servicio.cliente_id', $this->cliente->id)
            ->assertJsonPath('servicio.proveedor_id', $ganador->id)
            ->assertJsonPath('servicio.categoria_id', $this->categoria->id)
            ->assertJsonPath('servicio.direccion', $this->pedido->direccion)
            ->assertJsonPath('servicio.descripcion', $this->pedido->descripcion)
            ->assertJsonPath('servicio.monto_acordado', '475.50')
            ->assertJsonPath('servicio.estado', 'aceptado');

        $servicio = Servicio::sole();

        $this->assertMatchesRegularExpression('/^\d{6}$/', $servicio->codigo_inicio);
        $this->assertDatabaseHas('pedidos', [
            'id'     => $this->pedido->id,
            'estado' => 'adjudicado',
        ]);
        $this->assertDatabaseHas('cotizaciones', [
            'id'     => $cotizacionGanadora->id,
            'estado' => 'aceptada',
        ]);
        $this->assertDatabaseHas('cotizaciones', [
            'id'     => $cotizacionPerdedora->id,
            'estado' => 'rechazada',
        ]);
    }

    public function test_usuario_que_no_es_dueno_no_puede_aceptar_cotizacion(): void
    {
        $cotizacion = $this->crearCotizacion($this->crearProveedor(), 350.00);

        Sanctum::actingAs($this->crearUsuario('cliente'));

        $this->postJson(
            "/api/pedidos/{$this->pedido->id}/cotizaciones/{$cotizacion->id}/aceptar"
        )->assertForbidden();

        $this->assertDatabaseCount('servicios', 0);
        $this->assertDatabaseHas('pedidos', [
            'id'     => $this->pedido->id,
            'estado' => 'abierto',
        ]);
        $this->assertDatabaseHas('cotizaciones', [
            'id'     => $cotizacion->id,
            'estado' => 'enviada',
        ]);
    }

    public function test_primeras_tres_cotizaciones_son_gratuitas(): void
    {
        for ($slot = 1; $slot <= 3; $slot++) {
            $proveedor = $this->crearProveedor(saldo: 2);

            Sanctum::actingAs($proveedor->user);

            $response = $this->postJson("/api/pedidos/{$this->pedido->id}/cotizaciones", [
                'monto'   => 100 * $slot,
                'mensaje' => "Cotizacion valida para ocupar el slot gratuito numero {$slot}.",
            ]);

            $response->assertCreated()
                ->assertJsonPath('cotizacion.costo_creditos', 0);

            $this->assertDatabaseHas('creditos_proveedor', [
                'proveedor_id' => $proveedor->id,
                'saldo'        => 2,
            ]);
        }

        $this->assertDatabaseCount('cotizaciones', 3);
        $this->assertDatabaseCount('transacciones_credito', 0);
    }

    public function test_cuarta_cotizacion_descuenta_un_credito_y_registra_transaccion(): void
    {
        $this->markTestIncomplete(
            'Pendiente de las tareas 3.1 y 3.2: cobro desde la cuarta cotizacion y registro del gasto.'
        );

        for ($slot = 1; $slot <= 3; $slot++) {
            $this->crearCotizacion($this->crearProveedor(), 100 * $slot);
        }

        $proveedor = $this->crearProveedor(saldo: 2);
        Sanctum::actingAs($proveedor->user);

        $response = $this->postJson("/api/pedidos/{$this->pedido->id}/cotizaciones", [
            'monto'   => 450,
            'mensaje' => 'Cuarta cotizacion que debe consumir un credito del proveedor.',
        ]);

        $response->assertCreated()
            ->assertJsonPath('cotizacion.costo_creditos', 1)
            ->assertJsonPath('nuevo_saldo', 1);

        $this->assertDatabaseHas('creditos_proveedor', [
            'proveedor_id' => $proveedor->id,
            'saldo'        => 1,
        ]);
        $this->assertDatabaseHas('transacciones_credito', [
            'proveedor_id'  => $proveedor->id,
            'tipo'          => 'gasto',
            'monto'         => 1,
            'referencia_id' => $this->pedido->id,
        ]);
    }

    private function crearUsuario(string $role): User
    {
        $this->secuencia++;

        return User::create([
            'name'     => ucfirst($role) . " Test {$this->secuencia}",
            'email'    => "{$role}.{$this->secuencia}." . uniqid() . '@servigt.test',
            'password' => 'password-test',
            'role'     => $role,
        ]);
    }

    private function crearProveedor(int $saldo = 0): Proveedor
    {
        $user = $this->crearUsuario('proveedor');
        $proveedor = Proveedor::create([
            'user_id'       => $user->id,
            'nombre'        => $user->name,
            'email'         => $user->email,
            'departamento'  => 'Guatemala',
            'municipio'     => 'Guatemala',
            'categoria_id'  => $this->categoria->id,
            'descripcion'   => 'Proveedor creado para pruebas automatizadas',
        ]);

        CreditoProveedor::create([
            'proveedor_id' => $proveedor->id,
            'saldo'        => $saldo,
            'updated_at'   => now(),
        ]);

        return $proveedor->setRelation('user', $user);
    }

    private function crearCotizacion(Proveedor $proveedor, float $monto): Cotizacion
    {
        return Cotizacion::create([
            'pedido_id'      => $this->pedido->id,
            'proveedor_id'   => $proveedor->id,
            'monto'          => $monto,
            'mensaje'        => 'Propuesta de trabajo creada para pruebas automatizadas.',
            'estado'         => 'enviada',
            'costo_creditos' => 0,
        ]);
    }
}
