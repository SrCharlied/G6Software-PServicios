<?php

namespace Tests\Feature;

use App\Models\Categoria;
use App\Models\CreditoProveedor;
use App\Models\Proveedor;
use App\Models\User;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * POST /api/premium/activar y GET /api/premium/mi-estado
 */
class PremiumControllerTest extends TestCase
{
    use DatabaseTransactions;

    public function test_proveedor_nunca_activado_ve_estado_nunca(): void
    {
        $proveedor = $this->crearProveedor();

        Sanctum::actingAs($proveedor->user);

        $this->getJson('/api/premium/mi-estado')
            ->assertOk()
            ->assertJsonPath('estado', 'nunca')
            ->assertJsonPath('vence_at', null);
    }

    public function test_activar_fija_vigencia_de_30_dias_y_no_toca_el_saldo(): void
    {
        $proveedor = $this->crearProveedor(saldo: 3);

        Sanctum::actingAs($proveedor->user);

        $response = $this->postJson('/api/premium/activar')
            ->assertOk()
            ->assertJsonPath('estado', 'activo');

        $venceAt = \Carbon\Carbon::parse($response->json('vence_at'));
        $this->assertTrue($venceAt->isBetween(now()->addDays(29), now()->addDays(31)));

        $this->assertEquals(3, CreditoProveedor::where('proveedor_id', $proveedor->id)->first()->saldo);

        $this->getJson('/api/premium/mi-estado')
            ->assertJsonPath('estado', 'activo');
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

    public function test_renovacion_no_acumula_dias_de_un_ciclo_previo(): void
    {
        $proveedor = $this->crearProveedor();
        $proveedor->premium_vence_at = now()->addDays(20);
        $proveedor->save();

        Sanctum::actingAs($proveedor->user);

        $response = $this->postJson('/api/premium/activar')->assertOk();

        $venceAt = \Carbon\Carbon::parse($response->json('vence_at'));
        $this->assertTrue($venceAt->isBetween(now()->addDays(29), now()->addDays(31)));
    }

    public function test_cliente_no_puede_activar_premium(): void
    {
        Sanctum::actingAs($this->crearUsuario('cliente'));

        $this->postJson('/api/premium/activar')->assertForbidden();
    }

    public function test_usuario_no_autenticado_recibe_401(): void
    {
        $this->postJson('/api/premium/activar')->assertUnauthorized();
        $this->getJson('/api/premium/mi-estado')->assertUnauthorized();
    }

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
}
