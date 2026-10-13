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

    public function test_ruta_alternativa_deriva_el_destinatario_del_servicio(): void
    {
        $servicio = $this->crearServicio('completado');
        $proveedorAjeno = $this->crearProveedor();
        Sanctum::actingAs($servicio->cliente);

        $this->postJson('/api/calificaciones', [
            'servicio_id' => $servicio->id,
            'destinatario_id' => $proveedorAjeno->user_id,
            'puntuacion' => 1,
            'comentario' => 'La calificacion debe ir al proveedor contratado.',
        ])->assertCreated()
            ->assertJsonPath('calificacion.destinatario_id', $servicio->proveedor->user_id);

        $this->assertDatabaseHas('calificaciones', [
            'servicio_id' => $servicio->id,
            'autor_id' => $servicio->cliente_id,
            'destinatario_id' => $servicio->proveedor->user_id,
            'es_verificada' => true,
        ]);
        $this->assertDatabaseMissing('calificaciones', [
            'servicio_id' => $servicio->id,
            'destinatario_id' => $proveedorAjeno->user_id,
        ]);
        $this->assertSame(1, $servicio->proveedor->fresh()->total_calificaciones);
        $this->assertSame(0, $proveedorAjeno->fresh()->total_calificaciones);
    }

    public function test_ruta_alternativa_no_requiere_destinatario_enviado_por_cliente(): void
    {
        $servicio = $this->crearServicio('completado');
        Sanctum::actingAs($servicio->cliente);

        $this->postJson('/api/calificaciones', [
            'servicio_id' => $servicio->id,
            'puntuacion' => 5,
        ])->assertCreated()
            ->assertJsonPath('calificacion.destinatario_id', $servicio->proveedor->user_id);
    }

    public function test_proveedor_no_puede_autocalificarse(): void
    {
        $servicio = $this->crearServicio('completado');
        Sanctum::actingAs($servicio->proveedor->user);

        $this->postJson('/api/calificaciones', [
            'servicio_id' => $servicio->id,
            'destinatario_id' => $servicio->proveedor->user_id,
            'puntuacion' => 5,
        ])->assertForbidden();

        $this->assertDatabaseCount('calificaciones', 0);
    }

    public function test_tercero_no_puede_calificar_el_servicio(): void
    {
        $servicio = $this->crearServicio('completado');
        Sanctum::actingAs(User::factory()->cliente()->create());

        $this->postJson('/api/calificaciones', [
            'servicio_id' => $servicio->id,
            'puntuacion' => 4,
        ])->assertForbidden();
    }

    public function test_no_permite_duplicados_ni_servicios_sin_completar(): void
    {
        $servicio = $this->crearServicio('completado');
        Sanctum::actingAs($servicio->cliente);
        $payload = ['servicio_id' => $servicio->id, 'puntuacion' => 4];

        $this->postJson('/api/calificaciones', $payload)->assertCreated();
        $this->postJson('/api/calificaciones', $payload)->assertStatus(422);

        $pendiente = $this->crearServicio('aceptado');
        Sanctum::actingAs($pendiente->cliente);
        $this->postJson('/api/calificaciones', [
            'servicio_id' => $pendiente->id,
            'puntuacion' => 4,
        ])->assertStatus(422);

        $this->assertSame(1, Calificacion::where('servicio_id', $servicio->id)->count());
        $this->assertSame(0, Calificacion::where('servicio_id', $pendiente->id)->count());
    }

    public function test_ruta_principal_conserva_su_contrato(): void
    {
        $servicio = $this->crearServicio('completado');
        Sanctum::actingAs($servicio->cliente);

        $this->postJson("/api/servicios/{$servicio->id}/calificar", [
            'puntuacion' => 5,
            'comentario' => 'Excelente trabajo.',
        ])->assertCreated()
            ->assertJsonPath('calificacion.destinatario_id', $servicio->proveedor->user_id);
    }

    private function crearServicio(string $estado): Servicio
    {
        $proveedor = $this->crearProveedor();
        $cliente = User::factory()->cliente()->create();

        return Servicio::create([
            'cliente_id' => $cliente->id,
            'proveedor_id' => $proveedor->id,
            'categoria_id' => $proveedor->categoria_id,
            'descripcion' => 'Servicio para probar destinatarios de calificacion.',
            'estado' => $estado,
            'codigo_inicio' => '123456',
        ])->setRelation('cliente', $cliente)->setRelation('proveedor', $proveedor);
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
            'descripcion' => 'Proveedor para pruebas de calificacion.',
        ])->setRelation('user', $user);
    }
}
