<?php

namespace Tests\Feature;

use App\Models\Categoria;
use App\Models\Pedido;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PedidoExpirationTest extends TestCase
{
    use RefreshDatabase;

    private User $cliente;
    private Categoria $categoria;

    protected function setUp(): void
    {
        parent::setUp();
        $this->cliente   = User::factory()->create(['role' => 'cliente']);
        $this->categoria = Categoria::factory()->create();
    }

    private function crearPedido(array $overrides = []): Pedido
    {
        return Pedido::create(array_merge([
            'cliente_id'       => $this->cliente->id,
            'categoria_id'     => $this->categoria->id,
            'descripcion'      => 'Descripcion de prueba suficientemente larga',
            'direccion'        => 'Zona 1, Guatemala',
            'urgencia'         => 'baja',
            'estado'           => 'abierto',
            'fecha_expiracion' => now()->addDays(7),
        ], $overrides));
    }

    public function test_comando_expira_pedidos_abiertos_vencidos(): void
    {
        $vencido  = $this->crearPedido(['fecha_expiracion' => now()->subHour()]);
        $vigente  = $this->crearPedido(['fecha_expiracion' => now()->addDays(3)]);

        $this->artisan('pedidos:expirar')->assertExitCode(0);

        $this->assertDatabaseHas('pedidos', ['id' => $vencido->id,  'estado' => 'expirado']);
        $this->assertDatabaseHas('pedidos', ['id' => $vigente->id,  'estado' => 'abierto']);
    }

    public function test_comando_no_modifica_pedidos_en_estados_finales(): void
    {
        $cerrado  = $this->crearPedido(['estado' => 'cerrado',   'fecha_expiracion' => now()->subDay()]);
        $cancelado = $this->crearPedido(['estado' => 'cancelado', 'fecha_expiracion' => now()->subDay()]);

        $this->artisan('pedidos:expirar')->assertExitCode(0);

        $this->assertDatabaseHas('pedidos', ['id' => $cerrado->id,   'estado' => 'cerrado']);
        $this->assertDatabaseHas('pedidos', ['id' => $cancelado->id, 'estado' => 'cancelado']);
    }

    public function test_comando_sin_pedidos_que_expirar_termina_exitosamente(): void
    {
        $this->artisan('pedidos:expirar')
            ->expectsOutput('0 pedido(s) expirados.')
            ->assertExitCode(0);
    }
}
