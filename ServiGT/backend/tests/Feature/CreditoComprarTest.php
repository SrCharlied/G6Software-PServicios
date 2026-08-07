<?php

namespace Tests\Feature;

use App\Models\Categoria;
use App\Models\CompraCredito;
use App\Models\CreditoProveedor;
use App\Models\PaqueteCredito;
use App\Models\Proveedor;
use App\Models\TransaccionCredito;
use App\Models\User;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * POST /api/creditos/comprar
 */
class CreditoComprarTest extends TestCase
{
    use DatabaseTransactions;

    public function test_compra_exitosa_acredita_saldo_y_registra_transaccion(): void
    {
        $proveedor = $this->crearProveedor(saldo: 2);
        $paquete = PaqueteCredito::where('nombre', 'Impulso')->first();

        Sanctum::actingAs($proveedor->user);

        $response = $this->postJson('/api/creditos/comprar', [
            'paquete_id'      => $paquete->id,
            'idempotency_key' => 'clave-' . uniqid(),
        ]);

        $response->assertCreated()
            ->assertJsonPath('success', true)
            ->assertJsonPath('saldo', 32) // 2 + (25 base + 5 bonus)
            ->assertJsonPath('compra.estado', 'completada')
            ->assertJsonPath('compra.creditos_otorgados', 30);

        $this->assertMatchesRegularExpression('/^SGT-\d{5}$/', $response->json('compra.referencia'));

        $this->assertEquals(32, CreditoProveedor::where('proveedor_id', $proveedor->id)->first()->saldo);

        $this->assertDatabaseHas('transacciones_credito', [
            'proveedor_id' => $proveedor->id,
            'tipo'         => 'compra',
            'monto'        => 30,
        ]);
    }

    public function test_repetir_la_misma_idempotency_key_no_duplica_credito(): void
    {
        $proveedor = $this->crearProveedor(saldo: 0);
        $paquete = PaqueteCredito::where('nombre', 'Inicial')->first();
        $clave = 'clave-fija-' . uniqid();

        Sanctum::actingAs($proveedor->user);

        $primera = $this->postJson('/api/creditos/comprar', [
            'paquete_id'      => $paquete->id,
            'idempotency_key' => $clave,
        ]);
        $primera->assertCreated();

        $segunda = $this->postJson('/api/creditos/comprar', [
            'paquete_id'      => $paquete->id,
            'idempotency_key' => $clave,
        ]);
        $segunda->assertOk();

        $this->assertEquals(8, CreditoProveedor::where('proveedor_id', $proveedor->id)->first()->saldo);
        $this->assertEquals(1, CompraCredito::where('idempotency_key', $clave)->count());
        $this->assertEquals(
            1,
            TransaccionCredito::where('proveedor_id', $proveedor->id)->where('tipo', 'compra')->count()
        );
    }

    public function test_paquete_inexistente_o_inactivo_falla(): void
    {
        $proveedor = $this->crearProveedor();

        Sanctum::actingAs($proveedor->user);

        $this->postJson('/api/creditos/comprar', [
            'paquete_id'      => 999999,
            'idempotency_key' => 'clave-' . uniqid(),
        ])->assertNotFound();
    }

    public function test_cliente_no_puede_comprar_creditos(): void
    {
        Sanctum::actingAs($this->crearUsuario('cliente'));

        $this->postJson('/api/creditos/comprar', [
            'paquete_id'      => 1,
            'idempotency_key' => 'clave-' . uniqid(),
        ])->assertForbidden();
    }

    public function test_usuario_no_autenticado_recibe_401(): void
    {
        $this->postJson('/api/creditos/comprar', [
            'paquete_id'      => 1,
            'idempotency_key' => 'clave-' . uniqid(),
        ])->assertUnauthorized();
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
            'nombre'      => 'Categoria comprar ' . uniqid(),
            'descripcion' => 'Categoria para pruebas de compra de creditos',
        ]);

        $proveedor = Proveedor::create([
            'user_id'      => $user->id,
            'nombre'       => $user->name,
            'email'        => $user->email,
            'departamento' => 'Guatemala',
            'municipio'    => 'Guatemala',
            'categoria_id' => $categoria->id,
            'descripcion'  => 'Proveedor para pruebas de compra',
        ]);

        CreditoProveedor::create([
            'proveedor_id' => $proveedor->id,
            'saldo'        => $saldo,
            'updated_at'   => now(),
        ]);

        return $proveedor->setRelation('user', $user);
    }
}
