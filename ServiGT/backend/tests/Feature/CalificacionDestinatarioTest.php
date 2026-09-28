<?php

namespace Tests\Feature;

use App\Models\Calificacion;
use App\Models\Categoria;
use App\Models\Proveedor;
use App\Models\Servicio;
use App\Models\User;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class CalificacionDestinatarioTest extends TestCase
{
    use DatabaseTransactions;

    public function test_ruta_alternativa_no_permite_calificar_a_un_destinatario_ajeno(): void
    {
        [$cliente, $proveedorReal] = $this->crearActores();
        $proveedorAjeno = $this->crearProveedor();
        $servicio = $this->crearServicio($cliente, $proveedorReal);

        Sanctum::actingAs($cliente);

        $this->postJson('/api/calificaciones', [
            'servicio_id' => $servicio->id,
            'destinatario_id' => $proveedorAjeno->user_id,
            'puntuacion' => 1,
            'comentario' => 'Intento afectar reputacion ajena',
        ])->assertStatus(422);

        $this->assertDatabaseMissing('calificaciones', [
            'servicio_id' => $servicio->id,
            'destinatario_id' => $proveedorAjeno->user_id,
        ]);

        $this->assertSame('0.00', (string) $proveedorAjeno->fresh()->calificacion_promedio);
        $this->assertSame(0, $proveedorAjeno->fresh()->total_calificaciones);
    }

    public function test_ruta_alternativa_deriva_el_destinatario_del_servicio(): void
    {
        [$cliente, $proveedor] = $this->crearActores();
        $servicio = $this->crearServicio($cliente, $proveedor);

        Sanctum::actingAs($cliente);

        $this->postJson('/api/calificaciones', [
            'servicio_id' => $servicio->id,
            'puntuacion' => 5,
            'comentario' => 'Buen trabajo',
        ])->assertCreated()
            ->assertJsonPath('calificacion.destinatario_id', $proveedor->user_id)
            ->assertJsonPath('calificacion.autor_id', $cliente->id);

        $this->assertDatabaseHas('calificaciones', [
            'servicio_id' => $servicio->id,
            'autor_id' => $cliente->id,
            'destinatario_id' => $proveedor->user_id,
            'es_verificada' => true,
        ]);
    }

    public function test_ruta_alternativa_rechaza_tercero_autocalificacion_duplicados_y_estado_incorrecto(): void
    {
        [$cliente, $proveedor] = $this->crearActores();
        $servicio = $this->crearServicio($cliente, $proveedor);

        Sanctum::actingAs(User::factory()->cliente()->create());
        $this->postJson('/api/calificaciones', [
            'servicio_id' => $servicio->id,
            'destinatario_id' => $proveedor->user_id,
            'puntuacion' => 4,
        ])->assertForbidden();

        $pendiente = $this->crearServicio($cliente, $proveedor, ['estado' => 'pendiente']);
        Sanctum::actingAs($cliente);
        $this->postJson('/api/calificaciones', [
            'servicio_id' => $pendiente->id,
            'destinatario_id' => $proveedor->user_id,
            'puntuacion' => 4,
        ])->assertStatus(422);

        $proveedorLegado = $this->crearProveedor();
        $servicioLegado = $this->crearServicio($proveedorLegado->user, $proveedorLegado);
        Sanctum::actingAs($proveedorLegado->user);
        $this->postJson('/api/calificaciones', [
            'servicio_id' => $servicioLegado->id,
            'destinatario_id' => $proveedorLegado->user_id,
            'puntuacion' => 5,
        ])->assertForbidden();

        Sanctum::actingAs($cliente);
        $this->postJson('/api/calificaciones', [
            'servicio_id' => $servicio->id,
            'destinatario_id' => $proveedor->user_id,
            'puntuacion' => 5,
        ])->assertCreated();

        $this->postJson('/api/calificaciones', [
            'servicio_id' => $servicio->id,
            'destinatario_id' => $proveedor->user_id,
            'puntuacion' => 4,
        ])->assertStatus(422);

        $this->assertSame(1, Calificacion::where('servicio_id', $servicio->id)->count());
    }

    public function test_proveedor_participante_califica_a_la_contraparte_cliente(): void
    {
        [$cliente, $proveedor] = $this->crearActores();
        $servicio = $this->crearServicio($cliente, $proveedor);

        Sanctum::actingAs($proveedor->user);

        $this->postJson('/api/calificaciones', [
            'servicio_id' => $servicio->id,
            'destinatario_id' => $cliente->id,
            'puntuacion' => 4,
        ])->assertCreated()
            ->assertJsonPath('calificacion.destinatario_id', $cliente->id)
            ->assertJsonPath('calificacion.autor_id', $proveedor->user_id);
    }

    public function test_ruta_servicio_calificar_se_preserva_para_cliente(): void
    {
        [$cliente, $proveedor] = $this->crearActores();
        $servicio = $this->crearServicio($cliente, $proveedor);

        Sanctum::actingAs($cliente);

        $this->postJson("/api/servicios/{$servicio->id}/calificar", [
            'puntuacion' => 5,
            'comentario' => 'Excelente servicio',
        ])->assertCreated()
            ->assertJsonPath('calificacion.destinatario_id', $proveedor->user_id);
    }

    private function crearActores(): array
    {
        $cliente = User::factory()->cliente()->create();
        $proveedor = $this->crearProveedor();

        return [$cliente, $proveedor];
    }

    private function crearProveedor(): Proveedor
    {
        $categoria = Categoria::factory()->create();
        $user = User::factory()->proveedor()->create();

        return Proveedor::create([
            'user_id' => $user->id,
            'nombre' => $user->name,
            'email' => $user->email,
            'departamento' => 'Guatemala',
            'municipio' => 'Guatemala',
            'categoria_id' => $categoria->id,
            'descripcion' => 'Proveedor de prueba para calificaciones.',
        ])->setRelation('user', $user);
    }

    private function crearServicio(User $cliente, Proveedor $proveedor, array $overrides = []): Servicio
    {
        return Servicio::create(array_merge([
            'cliente_id' => $cliente->id,
            'proveedor_id' => $proveedor->id,
            'categoria_id' => $proveedor->categoria_id,
            'descripcion' => 'Servicio completado para probar calificaciones.',
            'direccion' => 'Zona 10, Guatemala',
            'estado' => 'completado',
        ], $overrides));
    }
}
