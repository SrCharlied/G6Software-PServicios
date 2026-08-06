<?php

namespace Tests\Feature;

use App\Models\Categoria;
use App\Models\PaqueteCredito;
use App\Models\Proveedor;
use App\Models\User;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * GET /api/creditos/paquetes
 */
class CreditoPaquetesTest extends TestCase
{
    use DatabaseTransactions;

    public function test_lista_solo_paquetes_activos_ordenados(): void
    {
        Sanctum::actingAs($this->crearUsuario('proveedor'));

        $this->getJson('/api/creditos/paquetes')
            ->assertOk()
            ->assertJsonPath('success', true);

        $response = $this->getJson('/api/creditos/paquetes');
        $nombres = collect($response->json('paquetes'))->pluck('nombre');

        $this->assertEquals(['Inicial', 'Impulso', 'Profesional', 'Negocio'], $nombres->all());
    }

    public function test_paquete_inactivo_no_aparece_en_el_catalogo(): void
    {
        $paquete = PaqueteCredito::create([
            'nombre'         => 'Paquete inactivo ' . uniqid(),
            'precio_gtq'     => 50,
            'creditos_base'  => 10,
            'creditos_bonus' => 0,
            'activo'         => false,
            'orden'          => 99,
        ]);

        Sanctum::actingAs($this->crearUsuario('proveedor'));

        $response = $this->getJson('/api/creditos/paquetes');
        $nombres = collect($response->json('paquetes'))->pluck('nombre');

        $this->assertNotContains($paquete->nombre, $nombres->all());
    }

    public function test_paquete_impulso_incluye_total_y_precio_correctos(): void
    {
        Sanctum::actingAs($this->crearUsuario('proveedor'));

        $response = $this->getJson('/api/creditos/paquetes');
        $impulso = collect($response->json('paquetes'))->firstWhere('nombre', 'Impulso');

        $this->assertNotNull($impulso);
        $this->assertEquals(115.0, $impulso['precio_gtq']);
        $this->assertEquals(25, $impulso['creditos_base']);
        $this->assertEquals(5, $impulso['creditos_bonus']);
        $this->assertEquals(30, $impulso['total_creditos']);
    }

    public function test_usuario_no_autenticado_recibe_401(): void
    {
        $this->getJson('/api/creditos/paquetes')
            ->assertUnauthorized();
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
}
