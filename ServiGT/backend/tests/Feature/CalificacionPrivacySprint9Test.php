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

/**
 * Task 1.3 (Sprint 9): la lista publica de resenas de un proveedor conserva
 * lo necesario para mostrarlas, pero no expone contacto, rol, documento ni
 * metadatos administrativos del autor.
 */
class CalificacionPrivacySprint9Test extends TestCase
{
    use DatabaseTransactions;

    // Datos del autor poblados a proposito: si alguno viaja, la prueba lo ve.
    private const EMAIL_AUTOR = 'autor.resena.s9@example.test';
    private const TELEFONO_AUTOR = '55501234';

    public function test_respuesta_publica_conserva_solo_lo_necesario_para_mostrar_la_resena(): void
    {
        ['proveedor' => $proveedor, 'autor' => $autor] = $this->crearResena();

        $response = $this->getJson("/api/providers/{$proveedor->id}/calificaciones")
            ->assertOk()
            ->assertJsonStructure(['calificaciones', 'promedio', 'total_calificaciones'])
            ->assertJsonPath('total_calificaciones', 1)
            ->assertJsonPath('calificaciones.0.puntuacion', 4)
            ->assertJsonPath('calificaciones.0.comentario', 'Trabajo puntual y ordenado.')
            ->assertJsonPath('calificaciones.0.autor.id', $autor->id)
            ->assertJsonPath('calificaciones.0.autor.name', $autor->name);

        // Lista blanca exacta: tampoco viajan servicio_id ni destinatario_id
        // (el user_id del proveedor no es publico, ver ProveedorResource).
        $resena = $response->json('calificaciones.0');
        $this->assertEqualsCanonicalizing(
            ['id', 'puntuacion', 'comentario', 'es_verificada', 'created_at', 'autor'],
            array_keys($resena),
        );
        $this->assertEqualsCanonicalizing(['id', 'name'], array_keys($resena['autor']));
    }

    public function test_no_expone_contacto_rol_documento_ni_metadatos_del_autor(): void
    {
        ['proveedor' => $proveedor] = $this->crearResena();

        $response = $this->getJson("/api/providers/{$proveedor->id}/calificaciones")->assertOk();

        foreach (['email', 'telefono', 'role', 'documento_verificado', 'foto_perfil', 'password', 'created_at', 'updated_at'] as $campo) {
            $response->assertJsonMissingPath("calificaciones.0.autor.{$campo}");
        }

        // Defensa ante fugas por cualquier otra ruta del JSON.
        $this->assertStringNotContainsString(self::EMAIL_AUTOR, $response->getContent());
        $this->assertStringNotContainsString(self::TELEFONO_AUTOR, $response->getContent());
    }

    public function test_el_proveedor_calificado_tampoco_recibe_el_contacto_del_cliente(): void
    {
        // El panel del proveedor consume este mismo endpoint con sesion.
        ['proveedor' => $proveedor, 'userProveedor' => $userProveedor] = $this->crearResena();
        Sanctum::actingAs($userProveedor);

        $response = $this->getJson("/api/providers/{$proveedor->id}/calificaciones")
            ->assertOk()
            ->assertJsonMissingPath('calificaciones.0.autor.email')
            ->assertJsonMissingPath('calificaciones.0.autor.telefono');

        $this->assertStringNotContainsString(self::EMAIL_AUTOR, $response->getContent());
        $this->assertStringNotContainsString(self::TELEFONO_AUTOR, $response->getContent());
    }

    public function test_proveedor_inexistente_responde_404(): void
    {
        $this->getJson('/api/providers/999999999/calificaciones')->assertNotFound();
    }

    /**
     * @return array{proveedor: Proveedor, userProveedor: User, autor: User}
     */
    private function crearResena(): array
    {
        $categoria = Categoria::factory()->create();
        $userProveedor = User::factory()->proveedor()->create();
        $proveedor = Proveedor::create([
            'user_id' => $userProveedor->id,
            'nombre' => $userProveedor->name,
            'email' => $userProveedor->email,
            'departamento' => 'Guatemala',
            'municipio' => 'Guatemala',
            'categoria_id' => $categoria->id,
            'descripcion' => 'Proveedor para pruebas de privacidad de resenas.',
        ]);

        $autor = User::factory()->cliente()->create(['email' => self::EMAIL_AUTOR]);
        $autor->forceFill(['telefono' => self::TELEFONO_AUTOR, 'documento_verificado' => true])->save();

        $servicio = Servicio::create([
            'cliente_id' => $autor->id,
            'proveedor_id' => $proveedor->id,
            'categoria_id' => $categoria->id,
            'descripcion' => 'Servicio completado para probar la privacidad de la resena.',
            'estado' => 'completado',
            'codigo_inicio' => '123456',
        ]);

        Calificacion::create([
            'servicio_id' => $servicio->id,
            'autor_id' => $autor->id,
            'destinatario_id' => $userProveedor->id,
            'puntuacion' => 4,
            'comentario' => 'Trabajo puntual y ordenado.',
            'es_verificada' => true,
        ]);

        return ['proveedor' => $proveedor, 'userProveedor' => $userProveedor, 'autor' => $autor];
    }
}
