<?php

namespace Tests\Feature;

use App\Models\Categoria;
use App\Models\Proveedor;
use App\Models\User;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ExperienciaProfesionalTest extends TestCase
{
    use DatabaseTransactions;

    public function test_duenno_edita_hasta_mil_caracteres_y_el_detalle_publico_los_muestra(): void
    {
        $proveedor = $this->crearProveedor();
        $resumen = str_repeat('a', 1000);
        Sanctum::actingAs($proveedor->user);

        $this->putJson("/api/providers/{$proveedor->id}", [
            'experiencia_resumen' => $resumen,
        ])->assertOk()
            ->assertJsonPath('proveedor.experiencia_resumen', $resumen);

        $this->getJson("/api/providers/{$proveedor->id}")
            ->assertOk()
            ->assertJsonPath('proveedor.experiencia_resumen', $resumen);
    }

    public function test_resumen_es_opcional_y_rechaza_mas_de_mil_caracteres(): void
    {
        $proveedor = $this->crearProveedor();
        Sanctum::actingAs($proveedor->user);

        $this->putJson("/api/providers/{$proveedor->id}", [
            'experiencia_resumen' => null,
        ])->assertOk();

        $this->putJson("/api/providers/{$proveedor->id}", [
            'experiencia_resumen' => str_repeat('a', 1001),
        ])->assertStatus(422)
            ->assertJsonValidationErrors('experiencia_resumen');

        $this->assertNull($proveedor->fresh()->experiencia_resumen);
    }

    public function test_tercero_no_edita_pero_admin_conserva_permiso_backend(): void
    {
        $proveedor = $this->crearProveedor();

        Sanctum::actingAs(User::factory()->proveedor()->create());
        $this->putJson("/api/providers/{$proveedor->id}", [
            'experiencia_resumen' => 'Intento ajeno',
        ])->assertForbidden();

        Sanctum::actingAs(User::factory()->admin()->create());
        $this->putJson("/api/providers/{$proveedor->id}", [
            'experiencia_resumen' => 'Actualizado por administracion',
        ])->assertOk();

        $this->assertSame('Actualizado por administracion', $proveedor->fresh()->experiencia_resumen);
    }

    public function test_catalogo_no_agrega_el_resumen_profesional(): void
    {
        $proveedor = $this->crearProveedor();
        $proveedor->update(['experiencia_resumen' => 'Trayectoria publica detallada']);

        $fila = collect($this->getJson('/api/providers')->assertOk()->json('proveedores'))
            ->firstWhere('id', $proveedor->id);

        $this->assertArrayNotHasKey('experiencia_resumen', $fila);
    }

    private function crearProveedor(): Proveedor
    {
        $user = User::factory()->proveedor()->create();
        $categoria = Categoria::firstOrCreate(
            ['nombre' => 'Experiencia profesional'],
            ['descripcion' => 'Categoria de pruebas']
        );

        return Proveedor::create([
            'user_id' => $user->id,
            'nombre' => $user->name,
            'email' => $user->email,
            'telefono' => '55550199',
            'descripcion' => 'Descripcion profesional para las pruebas.',
            'departamento' => 'Guatemala',
            'municipio' => 'Mixco',
            'categoria_id' => $categoria->id,
        ])->setRelation('user', $user);
    }
}
