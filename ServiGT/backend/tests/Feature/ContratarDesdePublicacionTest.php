<?php

namespace Tests\Feature;

use App\Models\Categoria;
use App\Models\Proveedor;
use App\Models\PublicacionServicio;
use App\Models\Servicio;
use App\Models\User;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\Cache;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * Task 5.6 — contratar desde el perfil publico usando una publicacion.
 *
 * Lo que se prueba no es el happy path sino de donde salen los datos: proveedor,
 * categoria, titulo y precio de referencia se derivan de la fila, nunca del
 * payload, y el snapshot sobrevive a que la publicacion cambie o desaparezca.
 */
class ContratarDesdePublicacionTest extends TestCase
{
    use DatabaseTransactions;

    protected function setUp(): void
    {
        parent::setUp();
        Cache::flush();
    }

    private function proveedorCon(string $categoria = 'Plomería'): Proveedor
    {
        $user = User::factory()->create(['role' => 'proveedor']);

        return Proveedor::create([
            'user_id'      => $user->id,
            'nombre'       => 'Proveedor Publicaciones',
            'email'        => $user->email,
            'telefono'     => '5555-0300',
            'departamento' => 'Guatemala',
            'municipio'    => 'Guatemala',
            'categoria_id' => Categoria::where('nombre', $categoria)->value('id')
                ?? Categoria::query()->value('id'),
        ]);
    }

    private function publicacionDe(Proveedor $proveedor, array $sobreescribir = []): PublicacionServicio
    {
        return PublicacionServicio::create(array_merge([
            'proveedor_id'       => $proveedor->id,
            'categoria_id'       => $proveedor->categoria_id,
            'titulo'             => 'Instalacion de tuberia PVC',
            'descripcion'        => 'Instalacion y reparacion de tuberia en vivienda, materiales aparte.',
            'precio_referencial' => 350.00,
            'estado'             => 'activa',
        ], $sobreescribir));
    }

    public function test_crear_servicio_desde_publicacion_deriva_proveedor_categoria_y_snapshot(): void
    {
        $proveedor = $this->proveedorCon();
        $publicacion = $this->publicacionDe($proveedor);

        $cliente = User::factory()->create(['role' => 'cliente']);
        Sanctum::actingAs($cliente);

        $respuesta = $this->postJson('/api/servicios', [
            'publicacion_id' => $publicacion->id,
            'descripcion'    => 'Necesito cambiar la tuberia del bano principal.',
        ])->assertStatus(201);

        $this->assertSame($proveedor->id, $respuesta->json('servicio.proveedor_id'));
        $this->assertSame($proveedor->categoria_id, $respuesta->json('servicio.categoria_id'));
        $this->assertSame($publicacion->id, $respuesta->json('servicio.publicacion_id'));
        $this->assertSame('Instalacion de tuberia PVC', $respuesta->json('servicio.publicacion_titulo'));
        $this->assertEqualsWithDelta(350.0, $respuesta->json('servicio.publicacion_precio_referencial'), 0.001);
    }

    public function test_ignora_el_proveedor_y_la_categoria_que_mande_el_cliente(): void
    {
        $proveedorReal = $this->proveedorCon();
        $publicacion = $this->publicacionDe($proveedorReal);

        $otroProveedor = $this->proveedorCon('Electricidad');
        $otraCategoria = Categoria::where('id', '!=', $proveedorReal->categoria_id)->value('id');

        $cliente = User::factory()->create(['role' => 'cliente']);
        Sanctum::actingAs($cliente);

        $respuesta = $this->postJson('/api/servicios', [
            'publicacion_id' => $publicacion->id,
            'proveedor_id'   => $otroProveedor->id,
            'categoria_id'   => $otraCategoria,
            'descripcion'    => 'Intento de asociar la solicitud a otro proveedor.',
        ])->assertStatus(201);

        $this->assertSame($proveedorReal->id, $respuesta->json('servicio.proveedor_id'));
        $this->assertNotSame($otroProveedor->id, $respuesta->json('servicio.proveedor_id'));
        $this->assertSame($proveedorReal->categoria_id, $respuesta->json('servicio.categoria_id'));
    }

    public function test_ignora_un_proveedor_inexistente_en_vez_de_fallar_la_validacion(): void
    {
        // `proveedor_id` no se valida cuando hay publicacion: se descarta antes.
        // Si se validara, un id basura devolveria un 422 sobre un campo que la
        // peticion no usa, en vez de crear la solicitud correcta.
        $proveedor = $this->proveedorCon();
        $publicacion = $this->publicacionDe($proveedor);

        $cliente = User::factory()->create(['role' => 'cliente']);
        Sanctum::actingAs($cliente);

        $respuesta = $this->postJson('/api/servicios', [
            'publicacion_id' => $publicacion->id,
            'proveedor_id'   => 999999,
            'descripcion'    => 'Solicitud con un proveedor_id que no existe.',
        ])->assertStatus(201);

        $this->assertSame($proveedor->id, $respuesta->json('servicio.proveedor_id'));
    }

    public function test_ignora_un_precio_enviado_por_el_cliente(): void
    {
        $proveedor = $this->proveedorCon();
        $publicacion = $this->publicacionDe($proveedor, ['precio_referencial' => 900.00]);

        $cliente = User::factory()->create(['role' => 'cliente']);
        Sanctum::actingAs($cliente);

        $respuesta = $this->postJson('/api/servicios', [
            'publicacion_id'     => $publicacion->id,
            'descripcion'        => 'Solicitud con precio manipulado en el payload.',
            'monto_acordado'     => 1.00,
            'precio_referencial' => 1.00,
        ])->assertStatus(201);

        $this->assertEqualsWithDelta(900.0, $respuesta->json('servicio.publicacion_precio_referencial'), 0.001);
        $this->assertNull($respuesta->json('servicio.monto_acordado'));
    }

    public function test_no_se_puede_contratar_una_publicacion_inactiva(): void
    {
        $proveedor = $this->proveedorCon();
        $publicacion = $this->publicacionDe($proveedor, ['estado' => 'inactiva']);

        $cliente = User::factory()->create(['role' => 'cliente']);
        Sanctum::actingAs($cliente);

        $this->postJson('/api/servicios', [
            'publicacion_id' => $publicacion->id,
            'descripcion'    => 'Solicitud sobre una publicacion desactivada.',
        ])->assertStatus(404);
    }

    public function test_un_proveedor_no_puede_contratar_su_propia_publicacion(): void
    {
        $proveedor = $this->proveedorCon();
        $publicacion = $this->publicacionDe($proveedor);

        Sanctum::actingAs($proveedor->user);

        // El rol se rechaza antes que nada: solo un cliente contrata.
        $this->postJson('/api/servicios', [
            'publicacion_id' => $publicacion->id,
            'descripcion'    => 'Autocontratacion desde publicacion propia.',
        ])->assertStatus(403);
    }

    public function test_un_anonimo_no_puede_contratar(): void
    {
        $proveedor = $this->proveedorCon();
        $publicacion = $this->publicacionDe($proveedor);

        $this->postJson('/api/servicios', [
            'publicacion_id' => $publicacion->id,
            'descripcion'    => 'Solicitud sin autenticacion.',
        ])->assertStatus(401);
    }

    public function test_editar_la_publicacion_no_altera_una_contratacion_existente(): void
    {
        $proveedor = $this->proveedorCon();
        $publicacion = $this->publicacionDe($proveedor);

        $cliente = User::factory()->create(['role' => 'cliente']);
        Sanctum::actingAs($cliente);

        $servicioId = $this->postJson('/api/servicios', [
            'publicacion_id' => $publicacion->id,
            'descripcion'    => 'Solicitud antes de que el proveedor edite la publicacion.',
        ])->assertStatus(201)->json('servicio.id');

        Sanctum::actingAs($proveedor->user);
        $this->putJson("/api/publicaciones/{$publicacion->id}", [
            'titulo'             => 'Titulo completamente distinto del original',
            'precio_referencial' => 9999.00,
        ])->assertStatus(200);

        $servicio = Servicio::find($servicioId);

        $this->assertSame('Instalacion de tuberia PVC', $servicio->publicacion_titulo);
        $this->assertSame('350.00', (string) $servicio->publicacion_precio_referencial);
    }

    public function test_desactivar_o_eliminar_la_publicacion_no_altera_la_contratacion(): void
    {
        $proveedor = $this->proveedorCon();
        $publicacion = $this->publicacionDe($proveedor);

        $cliente = User::factory()->create(['role' => 'cliente']);
        Sanctum::actingAs($cliente);

        $servicioId = $this->postJson('/api/servicios', [
            'publicacion_id' => $publicacion->id,
            'descripcion'    => 'Solicitud que debe sobrevivir a que borren la publicacion.',
        ])->assertStatus(201)->json('servicio.id');

        Sanctum::actingAs($proveedor->user);
        $this->postJson("/api/publicaciones/{$publicacion->id}/desactivar")->assertStatus(200);
        $this->deleteJson("/api/publicaciones/{$publicacion->id}")->assertStatus(200);

        $servicio = Servicio::find($servicioId);

        // La FK es ON DELETE SET NULL: el vinculo se pierde, el snapshot no.
        $this->assertNotNull($servicio);
        $this->assertNull($servicio->publicacion_id);
        $this->assertSame('Instalacion de tuberia PVC', $servicio->publicacion_titulo);
        $this->assertSame('350.00', (string) $servicio->publicacion_precio_referencial);
    }

    public function test_la_solicitud_sin_publicacion_sigue_exigiendo_proveedor(): void
    {
        $cliente = User::factory()->create(['role' => 'cliente']);
        Sanctum::actingAs($cliente);

        $this->postJson('/api/servicios', [
            'descripcion' => 'Solicitud sin proveedor ni publicacion.',
        ])->assertStatus(422)->assertJsonValidationErrors('proveedor_id');
    }

    public function test_el_listado_propio_del_proveedor_expone_los_cupos_desde_el_backend(): void
    {
        $proveedor = $this->proveedorCon();
        $this->publicacionDe($proveedor);

        Sanctum::actingAs($proveedor->user);

        $respuesta = $this->getJson('/api/publicaciones/mias')->assertStatus(200);

        $this->assertSame(1, $respuesta->json('cupos.limite'));
        $this->assertSame(1, $respuesta->json('cupos.activas'));
        $this->assertSame(0, $respuesta->json('cupos.disponibles'));
        $this->assertSame('nunca', $respuesta->json('cupos.premium_estado'));
        $this->assertSame(3, $respuesta->json('cupos.limite_premium'));

        $proveedor->update([
            'premium_inicio_at' => now()->subDay(),
            'premium_vence_at'  => now()->addMonth(),
        ]);

        $conPremium = $this->getJson('/api/publicaciones/mias')->assertStatus(200);

        $this->assertSame(3, $conPremium->json('cupos.limite'));
        $this->assertSame(2, $conPremium->json('cupos.disponibles'));
        $this->assertSame('activo', $conPremium->json('cupos.premium_estado'));
    }
}
