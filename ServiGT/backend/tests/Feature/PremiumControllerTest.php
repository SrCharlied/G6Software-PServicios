<?php

namespace Tests\Feature;

use App\Models\ActivacionPremium;
use App\Models\Categoria;
use App\Models\Cotizacion;
use App\Models\CreditoProveedor;
use App\Models\Pedido;
use App\Models\Proveedor;
use App\Models\TransaccionCredito;
use App\Models\User;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * POST /api/premium/activar y GET /api/premium/mi-estado
 *
 * Cubre activacion, expiracion, renovacion y acreditacion unica de los 10
 * creditos por ciclo, verificando que Premium no altera la regla de 3
 * cotizaciones gratis con maximo de 6.
 */
class PremiumControllerTest extends TestCase
{
    use DatabaseTransactions;

    // ── Estados ────────────────────────────────────────────────────────────

    public function test_proveedor_nunca_activado_ve_estado_nunca(): void
    {
        $proveedor = $this->crearProveedor();

        Sanctum::actingAs($proveedor->user);

        $this->getJson('/api/premium/mi-estado')
            ->assertOk()
            ->assertJsonPath('estado', 'nunca')
            ->assertJsonPath('vence_at', null)
            ->assertJsonPath('renovaciones', 0)
            ->assertJsonPath('precio_gtq', 115)
            ->assertJsonPath('creditos_por_ciclo', 10)
            ->assertJsonPath('ultima_activacion', null);
    }

    public function test_proveedor_con_vigencia_pasada_aparece_vencido(): void
    {
        $proveedor = $this->crearProveedor();
        $proveedor->premium_vence_at = now()->subDays(5);
        $proveedor->save();

        Sanctum::actingAs($proveedor->user);

        $this->getJson('/api/premium/mi-estado')
            ->assertOk()
            ->assertJsonPath('estado', 'vencido')
            ->assertJsonPath('dias_restantes', 0);
    }

    // ── Activacion ─────────────────────────────────────────────────────────

    public function test_activar_fija_vigencia_de_30_dias_y_acredita_10_creditos(): void
    {
        $proveedor = $this->crearProveedor(saldo: 3);

        Sanctum::actingAs($proveedor->user);

        $response = $this->postJson('/api/premium/activar')
            ->assertCreated()
            ->assertJsonPath('estado', 'activo')
            ->assertJsonPath('renovaciones', 1)
            ->assertJsonPath('activacion.ciclo', 1)
            ->assertJsonPath('activacion.creditos_otorgados', 10)
            ->assertJsonPath('activacion.monto_gtq', 115)
            ->assertJsonPath('saldo', 13);

        $venceAt = \Carbon\Carbon::parse($response->json('vence_at'));
        $this->assertTrue($venceAt->isBetween(now()->addDays(29), now()->addDays(31)));

        $this->assertMatchesRegularExpression('/^SGT-\d{5}$/', $response->json('activacion.referencia'));

        $this->assertEquals(13, CreditoProveedor::where('proveedor_id', $proveedor->id)->first()->saldo);

        $bono = TransaccionCredito::where('proveedor_id', $proveedor->id)
            ->where('tipo', 'bono')
            ->first();

        $this->assertNotNull($bono, 'La activacion debe registrar una transaccion de tipo bono.');
        $this->assertEquals(10, $bono->monto);
        $this->assertStringContainsString('Premium', $bono->motivo);
        $this->assertStringContainsString('ciclo 1', $bono->motivo);

        $this->getJson('/api/premium/mi-estado')
            ->assertJsonPath('estado', 'activo')
            ->assertJsonPath('ultima_activacion.ciclo', 1);
    }

    public function test_activar_registra_inicio_del_ciclo(): void
    {
        $proveedor = $this->crearProveedor();

        Sanctum::actingAs($proveedor->user);

        $this->postJson('/api/premium/activar')->assertCreated();

        $proveedor->refresh();

        $this->assertNotNull($proveedor->premium_inicio_at);
        $this->assertTrue($proveedor->premium_inicio_at->isBetween(now()->subMinute(), now()->addMinute()));
        $this->assertEquals(
            30,
            (int) round($proveedor->premium_inicio_at->diffInDays($proveedor->premium_vence_at)),
        );
    }

    // ── Idempotencia ───────────────────────────────────────────────────────

    public function test_repetir_la_misma_solicitud_no_extiende_ni_acredita_dos_veces(): void
    {
        $proveedor = $this->crearProveedor();

        Sanctum::actingAs($proveedor->user);

        $primera = $this->postJson('/api/premium/activar', ['idempotency_key' => 'premium-dup-001'])
            ->assertCreated();

        $segunda = $this->postJson('/api/premium/activar', ['idempotency_key' => 'premium-dup-001'])
            ->assertOk();

        // Mismo ciclo y misma referencia: la repeticion no abrio uno nuevo.
        $this->assertEquals(
            $primera->json('activacion.referencia'),
            $segunda->json('activacion.referencia'),
        );
        $this->assertEquals(1, $segunda->json('activacion.ciclo'));
        $this->assertEquals($primera->json('vence_at'), $segunda->json('premium.vence_at'));

        $this->assertEquals(10, CreditoProveedor::where('proveedor_id', $proveedor->id)->first()->saldo);
        $this->assertEquals(
            1,
            TransaccionCredito::where('proveedor_id', $proveedor->id)->where('tipo', 'bono')->count(),
        );
        $this->assertEquals(1, ActivacionPremium::where('proveedor_id', $proveedor->id)->count());
    }

    // ── Renovacion ─────────────────────────────────────────────────────────

    public function test_renovacion_abre_ciclo_nuevo_y_acredita_otros_10_creditos(): void
    {
        $proveedor = $this->crearProveedor();

        Sanctum::actingAs($proveedor->user);

        $this->postJson('/api/premium/activar', ['idempotency_key' => 'ciclo-1'])->assertCreated();

        $renovacion = $this->postJson('/api/premium/activar', ['idempotency_key' => 'ciclo-2'])
            ->assertCreated()
            ->assertJsonPath('activacion.ciclo', 2)
            ->assertJsonPath('renovaciones', 2)
            ->assertJsonPath('saldo', 20);

        $this->assertNotEquals(
            $renovacion->json('activacion.referencia'),
            ActivacionPremium::where('proveedor_id', $proveedor->id)->orderBy('ciclo')->first()->referencia,
        );

        $this->assertEquals(
            2,
            TransaccionCredito::where('proveedor_id', $proveedor->id)->where('tipo', 'bono')->count(),
        );
    }

    public function test_renovacion_no_acumula_dias_de_un_ciclo_previo(): void
    {
        $proveedor = $this->crearProveedor();
        $proveedor->premium_vence_at = now()->addDays(20);
        $proveedor->save();

        Sanctum::actingAs($proveedor->user);

        $response = $this->postJson('/api/premium/activar')->assertCreated();

        $venceAt = \Carbon\Carbon::parse($response->json('vence_at'));
        $this->assertTrue($venceAt->isBetween(now()->addDays(29), now()->addDays(31)));
    }

    public function test_renovar_tras_vencer_reactiva_el_estado(): void
    {
        $proveedor = $this->crearProveedor();
        $proveedor->premium_vence_at = now()->subDays(2);
        $proveedor->premium_renovaciones = 1;
        $proveedor->save();

        Sanctum::actingAs($proveedor->user);

        $this->getJson('/api/premium/mi-estado')->assertJsonPath('estado', 'vencido');

        $this->postJson('/api/premium/activar')
            ->assertCreated()
            ->assertJsonPath('estado', 'activo')
            ->assertJsonPath('activacion.ciclo', 2);
    }

    // ── Premium no altera las cotizaciones ─────────────────────────────────

    public function test_premium_no_modifica_los_slots_gratuitos_de_cotizacion(): void
    {
        $proveedor = $this->crearProveedor(saldo: 0);
        $pedido    = $this->crearPedido($proveedor->categoria_id);

        Sanctum::actingAs($proveedor->user);

        $this->postJson('/api/premium/activar')->assertCreated();

        // Con Premium activo las 3 primeras cotizaciones siguen siendo gratis:
        // el saldo queda intacto en los 10 creditos del bono.
        for ($i = 0; $i < 3; $i++) {
            $this->crearCotizacionDeOtroProveedor($pedido);
        }

        $this->assertEquals(3, Cotizacion::where('pedido_id', $pedido->id)->count());
        $this->assertEquals(10, CreditoProveedor::where('proveedor_id', $proveedor->id)->first()->saldo);

        // La cuarta cotizacion del proveedor Premium sigue costando 1 credito.
        $this->postJson("/api/pedidos/{$pedido->id}/cotizaciones", [
            'monto'   => 500,
            'mensaje' => 'Cotizacion del proveedor Premium para el pedido de prueba.',
        ])->assertCreated();

        $this->assertEquals(9, CreditoProveedor::where('proveedor_id', $proveedor->id)->first()->saldo);
    }

    // ── Permisos ───────────────────────────────────────────────────────────

    public function test_cliente_no_puede_activar_premium(): void
    {
        Sanctum::actingAs($this->crearUsuario('cliente'));

        $this->postJson('/api/premium/activar')->assertForbidden();
        $this->getJson('/api/premium/mi-estado')->assertForbidden();
    }

    public function test_usuario_no_autenticado_recibe_401(): void
    {
        $this->postJson('/api/premium/activar')->assertUnauthorized();
        $this->getJson('/api/premium/mi-estado')->assertUnauthorized();
    }

    // ── Helpers ────────────────────────────────────────────────────────────

    private function crearUsuario(string $role): User
    {
        $uid = uniqid($role . '.', true);

        return User::create([
            'name'     => ucfirst($role) . ' Test',
            'email'    => "{$uid}@servigt.test",
            'password' => 'password-test',
            'role'     => $role,
        ]);
    }

    private function crearProveedor(int $saldo = 0): Proveedor
    {
        $user = $this->crearUsuario('proveedor');
        $categoria = Categoria::create([
            'nombre'      => 'Categoria premium ' . uniqid(),
            'descripcion' => 'Categoria para pruebas de estado Premium',
        ]);

        $proveedor = Proveedor::create([
            'user_id'      => $user->id,
            'nombre'       => $user->name,
            'email'        => $user->email,
            'departamento' => 'Guatemala',
            'municipio'    => 'Guatemala',
            'categoria_id' => $categoria->id,
            'descripcion'  => 'Proveedor para pruebas de Premium',
        ]);

        CreditoProveedor::create([
            'proveedor_id' => $proveedor->id,
            'saldo'        => $saldo,
            'updated_at'   => now(),
        ]);

        return $proveedor->setRelation('user', $user);
    }

    private function crearPedido(int $categoriaId): Pedido
    {
        $cliente = $this->crearUsuario('cliente');

        return Pedido::create([
            'cliente_id'       => $cliente->id,
            'categoria_id'     => $categoriaId,
            'descripcion'      => 'Descripcion suficientemente larga para pasar la validacion del pedido.',
            'direccion'        => 'Zona 1, Guatemala',
            'urgencia'         => 'media',
            'estado'           => 'abierto',
            'fecha_expiracion' => now()->addDays(7),
        ]);
    }

    /**
     * Ocupa un slot gratuito con OTRO proveedor, para comprobar que la regla
     * de 3 gratis se cuenta por pedido y no la altera el estado Premium.
     */
    private function crearCotizacionDeOtroProveedor(Pedido $pedido): void
    {
        $otro = $this->crearProveedor();

        Cotizacion::create([
            'pedido_id'      => $pedido->id,
            'proveedor_id'   => $otro->id,
            'monto'          => 400,
            'mensaje'        => 'Cotizacion de relleno para ocupar un slot gratuito.',
            'estado'         => 'enviada',
            'costo_creditos' => 0,
        ]);
    }
}
