<?php

namespace Tests\Feature;

use App\Models\Categoria;
use App\Models\Cotizacion;
use App\Models\CreditoProveedor;
use App\Models\Pedido;
use App\Models\Proveedor;
use App\Models\TransaccionCredito;
use App\Models\User;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Laravel\Sanctum\Sanctum;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

/**
 * Task 1.2 (Sprint 9): la edicion de una cotizacion solo procede si esta
 * `enviada` y su pedido sigue `abierto` y vigente. Un rechazo no cobra credito.
 */
class CotizacionUpdateStateSprint9Test extends TestCase
{
    use DatabaseTransactions;

    private Categoria $categoria;
    private int $secuencia = 0;

    protected function setUp(): void
    {
        parent::setUp();

        $this->categoria = Categoria::create([
            'nombre'      => 'Categoria test ' . uniqid(),
            'descripcion' => 'Categoria para pruebas de edicion de cotizaciones',
        ]);
    }

    public function test_proveedor_edita_cotizacion_enviada_de_pedido_abierto_y_paga_un_credito(): void
    {
        [$proveedor, $cotizacion] = $this->escenario();
        Sanctum::actingAs($proveedor->user);

        $this->putJson($this->url($cotizacion), $this->payload(480))
            ->assertOk()
            ->assertJsonPath('nuevo_saldo', 4);

        $this->assertEquals(480, $cotizacion->fresh()->monto);
        $this->assertSame(1, TransaccionCredito::where('proveedor_id', $proveedor->id)->where('tipo', 'gasto')->count());
    }

    #[DataProvider('estadosCotizacionNoEditables')]
    public function test_cotizacion_no_enviada_no_se_puede_editar(string $estado): void
    {
        [$proveedor, $cotizacion] = $this->escenario(['estado' => $estado]);
        Sanctum::actingAs($proveedor->user);

        $this->putJson($this->url($cotizacion), $this->payload(999))->assertStatus(422);

        $this->assertNoCambio($proveedor, $cotizacion);
    }

    public static function estadosCotizacionNoEditables(): array
    {
        return [['aceptada'], ['rechazada'], ['retirada']];
    }

    #[DataProvider('estadosPedidoNoEditables')]
    public function test_pedido_no_abierto_bloquea_la_edicion(string $estado): void
    {
        [$proveedor, $cotizacion] = $this->escenario([], ['estado' => $estado]);
        Sanctum::actingAs($proveedor->user);

        $this->putJson($this->url($cotizacion), $this->payload(999))->assertStatus(422);

        $this->assertNoCambio($proveedor, $cotizacion);
    }

    public static function estadosPedidoNoEditables(): array
    {
        return [['adjudicado'], ['cerrado'], ['expirado']];
    }

    public function test_pedido_abierto_pero_vencido_bloquea_la_edicion(): void
    {
        [$proveedor, $cotizacion] = $this->escenario([], ['fecha_expiracion' => now()->subMinute()]);
        Sanctum::actingAs($proveedor->user);

        $this->putJson($this->url($cotizacion), $this->payload(999))->assertStatus(422);

        $this->assertNoCambio($proveedor, $cotizacion);
    }

    public function test_monto_del_servicio_adjudicado_no_diverge_por_edicion_posterior(): void
    {
        [$proveedor, $cotizacion, $pedido] = $this->escenario();
        Sanctum::actingAs($pedido->cliente);
        $this->postJson("/api/pedidos/{$pedido->id}/cotizaciones/{$cotizacion->id}/aceptar")->assertStatus(200);

        Sanctum::actingAs($proveedor->user);
        $this->putJson($this->url($cotizacion), $this->payload(9999))->assertStatus(422);

        $this->assertEquals(350, $cotizacion->fresh()->monto);
        $this->assertDatabaseHas('servicios', ['proveedor_id' => $proveedor->id, 'monto_acordado' => 350]);
    }

    public function test_sin_saldo_sigue_rechazando_la_edicion(): void
    {
        [$proveedor, $cotizacion] = $this->escenario([], [], 0);
        Sanctum::actingAs($proveedor->user);

        $this->putJson($this->url($cotizacion), $this->payload(999))->assertStatus(422);

        $this->assertNoCambio($proveedor, $cotizacion, 0);
    }

    public function test_proveedor_ajeno_no_puede_editar(): void
    {
        [, $cotizacion] = $this->escenario();
        $otro = $this->crearProveedor();
        Sanctum::actingAs($otro->user);

        $this->putJson($this->url($cotizacion), $this->payload(999))->assertStatus(404);

        $this->assertEquals(350, $cotizacion->fresh()->monto);
    }

    public function test_no_autenticado_recibe_401(): void
    {
        [, $cotizacion] = $this->escenario();

        $this->putJson($this->url($cotizacion), $this->payload(999))->assertStatus(401);
    }

    public function test_cotizacion_inexistente_devuelve_404(): void
    {
        [$proveedor, $cotizacion] = $this->escenario();
        Sanctum::actingAs($proveedor->user);

        $this->putJson("/api/pedidos/{$cotizacion->pedido_id}/cotizaciones/99999999", $this->payload(999))
            ->assertStatus(404);
    }

    private function assertNoCambio(Proveedor $proveedor, Cotizacion $cotizacion, int $saldo = 5): void
    {
        $this->assertEquals(350, $cotizacion->fresh()->monto);
        $this->assertSame($saldo, (int) CreditoProveedor::where('proveedor_id', $proveedor->id)->value('saldo'));
        $this->assertSame(0, TransaccionCredito::where('proveedor_id', $proveedor->id)->count());
    }

    private function url(Cotizacion $cotizacion): string
    {
        return "/api/pedidos/{$cotizacion->pedido_id}/cotizaciones/{$cotizacion->id}";
    }

    private function payload(float $monto): array
    {
        return ['monto' => $monto, 'mensaje' => 'Mensaje actualizado con detalle suficiente del trabajo.'];
    }

    /** @return array{0: Proveedor, 1: Cotizacion, 2: Pedido} */
    private function escenario(array $cotizacionOverrides = [], array $pedidoOverrides = [], int $saldo = 5): array
    {
        $this->secuencia++;
        $cliente = User::create([
            'name'     => "Cliente Test {$this->secuencia}",
            'email'    => "cliente.{$this->secuencia}." . uniqid() . '@servigt.test',
            'password' => 'password-test',
            'role'     => 'cliente',
        ]);

        $pedido = Pedido::create(array_merge([
            'cliente_id'       => $cliente->id,
            'categoria_id'     => $this->categoria->id,
            'descripcion'      => 'Descripcion de prueba suficientemente larga para el pedido',
            'direccion'        => 'Zona 1, Guatemala',
            'urgencia'         => 'media',
            'estado'           => 'abierto',
            'fecha_expiracion' => now()->addDays(7),
        ], $pedidoOverrides));
        $pedido->setRelation('cliente', $cliente);

        $proveedor = $this->crearProveedor();
        CreditoProveedor::updateOrCreate(['proveedor_id' => $proveedor->id], ['saldo' => $saldo]);

        $cotizacion = Cotizacion::create(array_merge([
            'pedido_id'      => $pedido->id,
            'proveedor_id'   => $proveedor->id,
            'monto'          => 350,
            'mensaje'        => 'Cotizacion original con detalle suficiente del trabajo.',
            'estado'         => 'enviada',
            'costo_creditos' => 0,
        ], $cotizacionOverrides));

        return [$proveedor, $cotizacion, $pedido];
    }

    private function crearProveedor(): Proveedor
    {
        $this->secuencia++;

        $user = User::create([
            'name'     => "Proveedor Test {$this->secuencia}",
            'email'    => "proveedor.{$this->secuencia}." . uniqid() . '@servigt.test',
            'password' => 'password-test',
            'role'     => 'proveedor',
        ]);

        $proveedor = Proveedor::create([
            'user_id'      => $user->id,
            'nombre'       => $user->name,
            'email'        => $user->email,
            'departamento' => 'Guatemala',
            'municipio'    => 'Guatemala',
            'categoria_id' => $this->categoria->id,
            'descripcion'  => 'Proveedor creado para pruebas automatizadas',
        ]);

        return $proveedor->setRelation('user', $user);
    }
}
