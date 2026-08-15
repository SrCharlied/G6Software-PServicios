<?php

namespace Tests\Feature;

use App\Models\Categoria;
use App\Models\Cotizacion;
use App\Models\CreditoProveedor;
use App\Models\PaqueteCredito;
use App\Models\Pedido;
use App\Models\Proveedor;
use App\Models\Servicio;
use App\Models\TransaccionCredito;
use App\Models\User;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * Recorrido integral de monetizacion sobre los flujos ya existentes.
 *
 * Verifica que comprar creditos y activar Premium NO alteran Flow A (solicitud
 * directa) ni Flow B (pedido, cotizaciones y adjudicacion), y que el saldo se
 * mueve exactamente una vez por operacion.
 */
class MonetizacionE2ETest extends TestCase
{
    use DatabaseTransactions;

    private Categoria $categoria;
    private int $secuencia = 0;

    protected function setUp(): void
    {
        parent::setUp();

        $this->categoria = Categoria::create([
            'nombre'      => 'Categoria e2e ' . uniqid(),
            'descripcion' => 'Categoria para el recorrido integral de monetizacion',
        ]);
    }

    public function test_compra_premium_y_cotizacion_pagada_conviven_sin_romper_flow_b(): void
    {
        $proveedor = $this->crearProveedor();
        $paquete   = PaqueteCredito::where('nombre', 'Inicial')->firstOrFail(); // 8 creditos por Q39
        $pedido    = $this->crearPedido();

        Sanctum::actingAs($proveedor->user);

        // 1. Saldo inicial real: cero legitimo, no un error disfrazado.
        $this->getJson('/api/mi-credito')->assertOk()->assertJsonPath('saldo', 0);

        // 2. Compra simulada: acredita 8 creditos de inmediato.
        $compra = $this->postJson('/api/creditos/comprar', [
            'paquete_id'      => $paquete->id,
            'idempotency_key' => 'e2e-compra-' . uniqid(),
        ])->assertCreated()->assertJsonPath('saldo', 8);

        $this->assertEquals('completada', $compra->json('compra.estado'));

        // 3. Premium: 30 dias y 10 creditos de bono. Total esperado 18.
        $this->postJson('/api/premium/activar', ['idempotency_key' => 'e2e-premium-1'])
            ->assertCreated()
            ->assertJsonPath('saldo', 18);

        // 4. Los 3 slots gratuitos siguen siendo gratuitos con Premium activo.
        $this->ocuparSlotsGratuitos($pedido, 3);
        $this->assertEquals(18, $this->saldoDe($proveedor));

        // 5. La cuarta cotizacion cobra exactamente 1 credito.
        $this->postJson("/api/pedidos/{$pedido->id}/cotizaciones", [
            'monto'   => 750,
            'mensaje' => 'Propuesta del proveedor Premium para el recorrido integral de prueba.',
        ])->assertCreated()->assertJsonPath('cotizacion.costo_creditos', 1);

        $this->assertEquals(17, $this->saldoDe($proveedor));

        // 6. Flow B completo: el cliente adjudica y se crea el servicio.
        $cotizacion = Cotizacion::where('pedido_id', $pedido->id)
            ->where('proveedor_id', $proveedor->id)
            ->firstOrFail();

        Sanctum::actingAs($pedido->cliente);

        $this->postJson("/api/pedidos/{$pedido->id}/cotizaciones/{$cotizacion->id}/aceptar")
            ->assertOk();

        $this->assertDatabaseHas('servicios', [
            'proveedor_id' => $proveedor->id,
            'cliente_id'   => $pedido->cliente_id,
        ]);

        $pedido->refresh();
        $this->assertEquals('adjudicado', $pedido->estado);

        // Adjudicar no devuelve ni vuelve a cobrar el credito gastado.
        $this->assertEquals(17, $this->saldoDe($proveedor));

        // 7. El historial refleja los tres movimientos y ninguno duplicado.
        Sanctum::actingAs($proveedor->user);

        $historial = $this->getJson('/api/creditos/transacciones')->assertOk();
        $tipos = collect($historial->json('transacciones'))->pluck('tipo')->sort()->values()->all();

        $this->assertEquals(['bono', 'compra', 'gasto'], $tipos);
        $this->assertEquals(3, $historial->json('total'));
    }

    public function test_flow_a_completo_no_consume_creditos(): void
    {
        $proveedor = $this->crearProveedor(saldo: 5);
        $cliente   = $this->crearUsuario('cliente');

        // El cliente solicita un servicio directo.
        Sanctum::actingAs($cliente);

        $servicioId = $this->postJson('/api/servicios', [
            'proveedor_id' => $proveedor->id,
            'categoria_id' => $this->categoria->id,
            'descripcion'  => 'Solicitud directa de prueba para el recorrido Flow A completo.',
            'direccion'    => 'Zona 1, Ciudad de Guatemala',
        ])->assertCreated()->json('servicio.id');

        // El proveedor acepta, inicia y finaliza.
        Sanctum::actingAs($proveedor->user);
        $this->postJson("/api/servicios/{$servicioId}/aceptar")->assertOk();

        $codigoInicio = Servicio::findOrFail($servicioId)->codigo_inicio;
        $this->postJson("/api/servicios/{$servicioId}/iniciar", ['codigo' => $codigoInicio])->assertOk();
        $this->postJson("/api/servicios/{$servicioId}/finalizar")->assertOk();

        // El cliente confirma con el codigo de fin.
        $codigoFin = Servicio::findOrFail($servicioId)->codigo_fin;
        Sanctum::actingAs($cliente);
        $this->postJson("/api/servicios/{$servicioId}/confirmar-fin", ['codigo' => $codigoFin])->assertOk();

        $this->assertEquals('completado', Servicio::findOrFail($servicioId)->estado);

        // Flow A es gratuito: el saldo del proveedor no se toca en ningun paso.
        $this->assertEquals(5, $this->saldoDe($proveedor));
        $this->assertEquals(
            0,
            TransaccionCredito::where('proveedor_id', $proveedor->id)->count(),
        );
    }

    public function test_dos_compras_seguidas_acreditan_ambas_una_sola_vez(): void
    {
        $proveedor = $this->crearProveedor();
        $paquete   = PaqueteCredito::where('nombre', 'Inicial')->firstOrFail();

        Sanctum::actingAs($proveedor->user);

        $this->postJson('/api/creditos/comprar', [
            'paquete_id'      => $paquete->id,
            'idempotency_key' => 'e2e-doble-1',
        ])->assertCreated()->assertJsonPath('saldo', 8);

        // Reenvio de la MISMA clave: no acredita otra vez.
        $this->postJson('/api/creditos/comprar', [
            'paquete_id'      => $paquete->id,
            'idempotency_key' => 'e2e-doble-1',
        ])->assertOk();

        $this->assertEquals(8, $this->saldoDe($proveedor));

        // Compra nueva con clave distinta: si acredita.
        $this->postJson('/api/creditos/comprar', [
            'paquete_id'      => $paquete->id,
            'idempotency_key' => 'e2e-doble-2',
        ])->assertCreated()->assertJsonPath('saldo', 16);

        $this->assertEquals(
            2,
            TransaccionCredito::where('proveedor_id', $proveedor->id)->where('tipo', 'compra')->count(),
        );
    }

    // ── Helpers ────────────────────────────────────────────────────────────

    private function saldoDe(Proveedor $proveedor): int
    {
        return (int) (CreditoProveedor::where('proveedor_id', $proveedor->id)->value('saldo') ?? 0);
    }

    private function ocuparSlotsGratuitos(Pedido $pedido, int $cantidad): void
    {
        for ($i = 0; $i < $cantidad; $i++) {
            Cotizacion::create([
                'pedido_id'      => $pedido->id,
                'proveedor_id'   => $this->crearProveedor()->id,
                'monto'          => 500 + $i,
                'mensaje'        => 'Cotizacion de relleno para ocupar un slot gratuito del pedido.',
                'estado'         => 'enviada',
                'costo_creditos' => 0,
            ]);
        }
    }

    private function crearUsuario(string $role): User
    {
        $this->secuencia++;

        return User::create([
            'name'     => ucfirst($role) . " E2E {$this->secuencia}",
            'email'    => "{$role}.{$this->secuencia}." . uniqid() . '@servigt.test',
            'password' => 'password-test',
            'role'     => $role,
        ]);
    }

    private function crearProveedor(int $saldo = 0): Proveedor
    {
        $user = $this->crearUsuario('proveedor');

        $proveedor = Proveedor::create([
            'user_id'      => $user->id,
            'nombre'       => $user->name,
            'email'        => $user->email,
            'departamento' => 'Guatemala',
            'municipio'    => 'Guatemala',
            'categoria_id' => $this->categoria->id,
            'descripcion'  => 'Proveedor del recorrido integral de monetizacion',
        ]);

        CreditoProveedor::create([
            'proveedor_id' => $proveedor->id,
            'saldo'        => $saldo,
            'updated_at'   => now(),
        ]);

        return $proveedor->setRelation('user', $user);
    }

    private function crearPedido(): Pedido
    {
        $cliente = $this->crearUsuario('cliente');

        $pedido = Pedido::create([
            'cliente_id'       => $cliente->id,
            'categoria_id'     => $this->categoria->id,
            'descripcion'      => 'Pedido del recorrido integral con cotizaciones gratuitas y pagadas',
            'direccion'        => 'Zona 10, Ciudad de Guatemala',
            'urgencia'         => 'media',
            'estado'           => 'abierto',
            'fecha_expiracion' => now()->addDays(7),
        ]);

        return $pedido->setRelation('cliente', $cliente);
    }
}
