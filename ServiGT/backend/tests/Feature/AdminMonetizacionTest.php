<?php

namespace Tests\Feature;

use App\Models\Categoria;
use App\Models\CreditoProveedor;
use App\Models\PaqueteCredito;
use App\Models\Proveedor;
use App\Models\User;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * GET /api/admin/compras y GET /api/admin/premium
 *
 * Superficie administrativa "Creditos y Premium": historial de compras de
 * toda la plataforma, vigencia Premium por proveedor y KPIs de monetizacion.
 */
class AdminMonetizacionTest extends TestCase
{
    use DatabaseTransactions;

    public function test_admin_ve_las_compras_de_la_plataforma_con_kpis(): void
    {
        $proveedor = $this->crearProveedor();
        $paquete   = PaqueteCredito::where('nombre', 'Impulso')->firstOrFail();

        Sanctum::actingAs($proveedor->user);
        $this->postJson('/api/creditos/comprar', [
            'paquete_id'      => $paquete->id,
            'idempotency_key' => 'admin-compras-' . uniqid(),
        ])->assertCreated();

        Sanctum::actingAs($this->crearUsuario('admin'));

        $response = $this->getJson('/api/admin/compras')->assertOk();

        $compra = collect($response->json('compras'))
            ->firstWhere('proveedor_id', $proveedor->id);

        $this->assertNotNull($compra, 'La compra del proveedor debe aparecer en el listado admin.');
        $this->assertEquals('completada', $compra['estado']);
        $this->assertEquals('Impulso', $compra['paquete']);
        $this->assertEquals(30, $compra['creditos_otorgados']);
        $this->assertMatchesRegularExpression('/^SGT-\d{5}$/', $compra['referencia']);

        $this->assertGreaterThanOrEqual(1, $response->json('kpis.compras_completadas'));
        $this->assertGreaterThanOrEqual(115, $response->json('kpis.ingresos_gtq'));
    }

    public function test_filtro_por_estado_excluye_las_compras_de_otros_estados(): void
    {
        $proveedor = $this->crearProveedor();
        $paquete   = PaqueteCredito::where('nombre', 'Inicial')->firstOrFail();

        Sanctum::actingAs($proveedor->user);
        $this->postJson('/api/creditos/comprar', [
            'paquete_id'      => $paquete->id,
            'idempotency_key' => 'admin-filtro-' . uniqid(),
        ])->assertCreated();

        Sanctum::actingAs($this->crearUsuario('admin'));

        $canceladas = $this->getJson('/api/admin/compras?estado=cancelada')->assertOk();

        $this->assertNull(
            collect($canceladas->json('compras'))->firstWhere('proveedor_id', $proveedor->id),
            'Una compra completada no debe aparecer bajo el filtro de canceladas.',
        );

        $completadas = $this->getJson('/api/admin/compras?estado=completada')->assertOk();

        $this->assertNotNull(
            collect($completadas->json('compras'))->firstWhere('proveedor_id', $proveedor->id),
        );
    }

    public function test_admin_ve_la_vigencia_premium_por_proveedor(): void
    {
        $activo = $this->crearProveedor();
        Sanctum::actingAs($activo->user);
        $this->postJson('/api/premium/activar')->assertCreated();

        $nunca = $this->crearProveedor();

        Sanctum::actingAs($this->crearUsuario('admin'));

        $response = $this->getJson('/api/admin/premium')->assertOk();
        $filas = collect($response->json('proveedores'));

        $filaActiva = $filas->firstWhere('proveedor_id', $activo->id);
        $this->assertEquals('activo', $filaActiva['estado']);
        $this->assertEquals(1, $filaActiva['renovaciones']);
        $this->assertEquals(10, $filaActiva['saldo']);
        $this->assertNotNull($filaActiva['inicio_at']);

        $filaNunca = $filas->firstWhere('proveedor_id', $nunca->id);
        $this->assertEquals('nunca', $filaNunca['estado']);
        $this->assertNull($filaNunca['vence_at']);

        $this->assertGreaterThanOrEqual(1, $response->json('kpis.premium_activos'));
    }

    public function test_filtro_premium_por_estado(): void
    {
        $vencido = $this->crearProveedor();
        $vencido->premium_inicio_at    = now()->subDays(35);
        $vencido->premium_vence_at     = now()->subDays(5);
        $vencido->premium_renovaciones = 1;
        $vencido->save();

        Sanctum::actingAs($this->crearUsuario('admin'));

        $response = $this->getJson('/api/admin/premium?estado=vencido')->assertOk();
        $filas = collect($response->json('proveedores'));

        $this->assertNotNull($filas->firstWhere('proveedor_id', $vencido->id));
        $this->assertTrue(
            $filas->every(fn ($fila) => $fila['estado'] === 'vencido'),
            'El filtro debe devolver unicamente proveedores vencidos.',
        );
    }

    public function test_las_stats_incluyen_el_bloque_de_monetizacion(): void
    {
        Sanctum::actingAs($this->crearUsuario('admin'));

        $this->getJson('/api/admin/stats')
            ->assertOk()
            ->assertJsonStructure([
                'monetizacion' => [
                    'compras_total',
                    'compras_completadas',
                    'ingresos_gtq',
                    'creditos_vendidos',
                    'premium_activos',
                    'premium_vencidos',
                ],
            ]);
    }

    public function test_usuario_no_admin_no_accede_a_la_superficie_de_monetizacion(): void
    {
        Sanctum::actingAs($this->crearUsuario('cliente'));

        $this->getJson('/api/admin/compras')->assertForbidden();
        $this->getJson('/api/admin/premium')->assertForbidden();
    }

    public function test_usuario_no_autenticado_recibe_401(): void
    {
        $this->getJson('/api/admin/compras')->assertUnauthorized();
        $this->getJson('/api/admin/premium')->assertUnauthorized();
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
            'nombre'      => 'Categoria monetizacion ' . uniqid(),
            'descripcion' => 'Categoria para pruebas de la administracion de creditos',
        ]);

        $proveedor = Proveedor::create([
            'user_id'      => $user->id,
            'nombre'       => $user->name,
            'email'        => $user->email,
            'departamento' => 'Guatemala',
            'municipio'    => 'Guatemala',
            'categoria_id' => $categoria->id,
            'descripcion'  => 'Proveedor para pruebas administrativas de monetizacion',
        ]);

        CreditoProveedor::create([
            'proveedor_id' => $proveedor->id,
            'saldo'        => $saldo,
            'updated_at'   => now(),
        ]);

        return $proveedor->setRelation('user', $user);
    }
}
