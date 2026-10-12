<?php

namespace Tests\Feature;

use App\Models\PublicacionMaterial;
use App\Models\PublicacionMaterialImagen;
use App\Models\User;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\Feature\Concerns\CreaEscenarioMateriales;
use Tests\TestCase;

/*
 * ── AVISO PARA QUIEN MODIFIQUE ESTA PRUEBA ────────────────────────────────
 * Estas pruebas fueron desarrolladas por JA (Juan Salguero) como parte de la
 * cadena de dependencias de las Tasks 3.3 y 4.2 de Sprint 9, y cubren el
 * alcance de la Task asignada a otra persona (Task 2.2, publicacion y catalogo de materiales). Describen el contrato
 * actual, no el definitivo.
 *
 * Si vas a cambiar o ampliar el comportamiento de esta Task (nuevas reglas,
 * campos, estados o rutas), no basta con ajustar estas pruebas: agrega
 * pruebas de regresion que demuestren que lo que ya funcionaba sigue
 * funcionando (permisos por rol, ownership, estados invalidos, idempotencia
 * y concurrencia cuando aplique) y ejecuta la suite backend completa.
 * ───────────────────────────────────────────────────────────────────────────
 */
/**
 * Task 2.2 (Sprint 9): publicacion y catalogo de materiales. Solo proveedores;
 * un lote por servicio cancelado desde en_camino; el vendedor se deriva del
 * servicio, nunca del body.
 */
class PublicacionMaterialSprint9Test extends TestCase
{
    use DatabaseTransactions;
    use CreaEscenarioMateriales;

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('public');
    }

    // ── Crear ────────────────────────────────────────────────────────────────

    public function test_proveedor_publica_lote_de_su_servicio_cancelado_desde_en_camino(): void
    {
        $servicio = $this->servicioCanceladoDesdeEnCamino();
        Sanctum::actingAs($servicio->proveedor->user);

        $respuesta = $this->crear($this->payload($servicio, [
            'imagenes' => [$this->imagen('a.jpg'), $this->imagen('b.png')],
        ]));

        $respuesta->assertCreated()
            ->assertJsonPath('success', true)
            ->assertJsonPath('publicacion.estado', 'disponible')
            ->assertJsonPath('publicacion.titulo', 'Tubería PVC sobrante')
            ->assertJsonCount(2, 'publicacion.imagenes');

        $this->assertDatabaseHas('publicaciones_material', [
            'servicio_id' => $servicio->id,
            'vendedor_id' => $servicio->proveedor_id,
        ]);
        $this->assertCount(2, Storage::disk('public')->allFiles());
    }

    public function test_precio_referencial_cero_es_valido(): void
    {
        $servicio = $this->servicioCanceladoDesdeEnCamino();
        Sanctum::actingAs($servicio->proveedor->user);

        $this->crear($this->payload($servicio, ['precio_referencial' => 0]))
            ->assertCreated()
            ->assertJsonPath('publicacion.estado', 'disponible');

        $this->assertEquals(0, PublicacionMaterial::where('servicio_id', $servicio->id)->value('precio_referencial'));
    }

    public function test_el_vendedor_se_deriva_del_servicio_y_no_del_body(): void
    {
        $servicio = $this->servicioCanceladoDesdeEnCamino();
        $otro = $this->crearProveedorComprador();
        Sanctum::actingAs($servicio->proveedor->user);

        $this->crear($this->payload($servicio, ['vendedor_id' => $otro->id]))
            ->assertCreated();

        $this->assertSame($servicio->proveedor_id, PublicacionMaterial::where('servicio_id', $servicio->id)->value('vendedor_id'));
    }

    public function test_cliente_admin_y_anonimo_no_publican(): void
    {
        $servicio = $this->servicioCanceladoDesdeEnCamino();

        $this->crear($this->payload($servicio))->assertUnauthorized();

        Sanctum::actingAs($servicio->cliente);
        $this->crear($this->payload($servicio))->assertForbidden();

        $admin = User::create(['name' => 'Admin', 'email' => 'admin.' . uniqid() . '@servigt.test', 'password' => 'password-test', 'role' => 'admin']);
        Sanctum::actingAs($admin);
        $this->crear($this->payload($servicio))->assertForbidden();

        $this->assertDatabaseCount('publicaciones_material', 0);
    }

    public function test_proveedor_ajeno_no_publica_sobre_servicio_de_otro(): void
    {
        $servicio = $this->servicioCanceladoDesdeEnCamino();
        Sanctum::actingAs($this->crearProveedorComprador()->user);

        $this->crear($this->payload($servicio))->assertForbidden();

        $this->assertDatabaseCount('publicaciones_material', 0);
    }

    public function test_servicio_inexistente_devuelve_404(): void
    {
        $servicio = $this->servicioCanceladoDesdeEnCamino();
        Sanctum::actingAs($servicio->proveedor->user);

        $this->crear($this->payload($servicio, ['servicio_id' => 99999999]))
            ->assertStatus(404);
    }

    #[DataProvider('noElegibles')]
    public function test_solo_la_cancelacion_desde_en_camino_habilita_publicar(string $estado, ?string $origen): void
    {
        $servicio = $this->servicioConEstado($estado, null, ['cancelado_desde' => $origen]);
        Sanctum::actingAs($servicio->proveedor->user);

        $this->crear($this->payload($servicio))->assertStatus(422);

        $this->assertDatabaseCount('publicaciones_material', 0);
    }

    public static function noElegibles(): array
    {
        return [
            'cancelado historico sin origen' => ['cancelado', null],
            'cancelado desde aceptado'       => ['cancelado', 'aceptado'],
            'cancelado desde pendiente'      => ['cancelado', 'pendiente'],
            'servicio en camino'             => ['en_camino', null],
            'servicio completado'            => ['completado', null],
        ];
    }

    public function test_no_se_publica_dos_veces_el_mismo_servicio(): void
    {
        $servicio = $this->servicioCanceladoDesdeEnCamino();
        Sanctum::actingAs($servicio->proveedor->user);

        $this->crear($this->payload($servicio))->assertCreated();
        $this->crear($this->payload($servicio))->assertStatus(409);

        $this->assertSame(1, PublicacionMaterial::where('servicio_id', $servicio->id)->count());
    }

    #[DataProvider('payloadsInvalidos')]
    public function test_validacion_de_campos(array $cambios, string $campo): void
    {
        $servicio = $this->servicioCanceladoDesdeEnCamino();
        Sanctum::actingAs($servicio->proveedor->user);

        $this->crear($this->payload($servicio, $cambios))
            ->assertStatus(422)
            ->assertJsonValidationErrors($campo);

        $this->assertDatabaseCount('publicaciones_material', 0);
        $this->assertSame([], Storage::disk('public')->allFiles());
    }

    public static function payloadsInvalidos(): array
    {
        return [
            'sin titulo'        => [['titulo' => ''], 'titulo'],
            'cantidad cero'     => [['cantidad' => 0], 'cantidad'],
            'sin unidad'        => [['unidad' => ''], 'unidad'],
            'sin departamento'  => [['departamento' => ''], 'departamento'],
            'precio negativo'   => [['precio_referencial' => -1], 'precio_referencial'],
            'sin imagenes'      => [['imagenes' => []], 'imagenes'],
        ];
    }

    public function test_maximo_tres_imagenes(): void
    {
        $servicio = $this->servicioCanceladoDesdeEnCamino();
        Sanctum::actingAs($servicio->proveedor->user);

        $this->crear($this->payload($servicio, [
            'imagenes' => [$this->imagen('1.jpg'), $this->imagen('2.jpg'), $this->imagen('3.jpg'), $this->imagen('4.jpg')],
        ]))->assertStatus(422)->assertJsonValidationErrors('imagenes');
    }

    public function test_rechaza_formato_y_tamano_de_imagen_invalidos(): void
    {
        $servicio = $this->servicioCanceladoDesdeEnCamino();
        Sanctum::actingAs($servicio->proveedor->user);

        $this->crear($this->payload($servicio, [
            'imagenes' => [UploadedFile::fake()->create('doc.pdf', 10, 'application/pdf')],
        ]))->assertStatus(422)->assertJsonValidationErrors('imagenes.0');

        $this->crear($this->payload($servicio, [
            'imagenes' => [$this->imagen('grande.png', 4097)],
        ]))->assertStatus(422)->assertJsonValidationErrors('imagenes.0');

        $this->assertDatabaseCount('publicaciones_material', 0);
    }

    public function test_un_fallo_a_mitad_de_la_publicacion_no_deja_filas_ni_archivos(): void
    {
        $servicio = $this->servicioCanceladoDesdeEnCamino();
        Sanctum::actingAs($servicio->proveedor->user);

        $contador = 0;
        PublicacionMaterialImagen::creating(function () use (&$contador) {
            if (++$contador === 2) {
                throw new \RuntimeException('fallo simulado al guardar la segunda imagen');
            }
        });

        $this->crear($this->payload($servicio, [
            'imagenes' => [$this->imagen('a.jpg'), $this->imagen('b.jpg')],
        ]))->assertStatus(500);

        PublicacionMaterialImagen::flushEventListeners();

        $this->assertDatabaseCount('publicaciones_material', 0);
        $this->assertDatabaseCount('publicaciones_material_imagenes', 0);
        $this->assertSame([], Storage::disk('public')->allFiles(), 'Quedaron archivos huerfanos.');
    }

    // ── Catalogo y detalle ───────────────────────────────────────────────────

    public function test_catalogo_solo_para_proveedores_y_sin_datos_de_contacto(): void
    {
        $vendedor = $this->crearProveedorComprador();
        $lote = $this->crearLote($this->servicioCanceladoDesdeEnCamino($vendedor));
        $lector = $this->crearProveedorComprador();

        $this->getJson('/api/materiales')->assertUnauthorized();

        Sanctum::actingAs($this->crearCliente());
        $this->getJson('/api/materiales')->assertForbidden();

        Sanctum::actingAs($lector->user);
        $respuesta = $this->getJson('/api/materiales')->assertOk();

        $respuesta->assertJsonPath('publicaciones.0.id', $lote->id)
            ->assertJsonPath('meta.total', 1);

        $json = json_encode($respuesta->json());
        $this->assertStringNotContainsString($vendedor->telefono, $json, 'El catalogo expone el telefono del vendedor.');
        $this->assertStringNotContainsString($vendedor->email, $json, 'El catalogo expone el correo del vendedor.');
        $respuesta->assertJsonMissingPath('publicaciones.0.servicio_id');
    }

    public function test_catalogo_excluye_vendidos_retirados_y_los_propios(): void
    {
        $vendedor = $this->crearProveedorComprador();
        $disponible = $this->crearLote($this->servicioCanceladoDesdeEnCamino($vendedor));
        $reservado  = $this->crearLote($this->servicioCanceladoDesdeEnCamino($vendedor), ['estado' => 'reservado', 'titulo' => 'Reservado']);
        $this->crearLote($this->servicioCanceladoDesdeEnCamino($vendedor), ['estado' => 'vendido']);
        $this->crearLote($this->servicioCanceladoDesdeEnCamino($vendedor), ['estado' => 'retirado']);
        $propio = $this->crearProveedorComprador();
        $this->crearLote($this->servicioCanceladoDesdeEnCamino($propio), ['titulo' => 'Propio']);

        Sanctum::actingAs($propio->user);
        $ids = collect($this->getJson('/api/materiales')->assertOk()->json('publicaciones'))->pluck('id')->all();

        $this->assertEqualsCanonicalizing([$disponible->id, $reservado->id], $ids);
    }

    public function test_catalogo_filtra_por_departamento_y_busqueda(): void
    {
        $vendedor = $this->crearProveedorComprador();
        $this->crearLote($this->servicioCanceladoDesdeEnCamino($vendedor), ['titulo' => 'Cemento', 'departamento' => 'Escuintla']);
        $this->crearLote($this->servicioCanceladoDesdeEnCamino($vendedor), ['titulo' => 'Pintura blanca', 'departamento' => 'Guatemala']);

        Sanctum::actingAs($this->crearProveedorComprador()->user);

        $this->getJson('/api/materiales?departamento=Escuintla')->assertOk()->assertJsonCount(1, 'publicaciones')->assertJsonPath('publicaciones.0.titulo', 'Cemento');
        $this->getJson('/api/materiales?q=pintura')->assertOk()->assertJsonCount(1, 'publicaciones')->assertJsonPath('publicaciones.0.titulo', 'Pintura blanca');
    }

    public function test_catalogo_pagina_en_base_de_datos(): void
    {
        $vendedor = $this->crearProveedorComprador();
        foreach (range(1, 3) as $i) {
            $this->crearLote($this->servicioCanceladoDesdeEnCamino($vendedor), ['titulo' => "Lote {$i}"]);
        }

        Sanctum::actingAs($this->crearProveedorComprador()->user);

        $this->getJson('/api/materiales?per_page=2')->assertOk()
            ->assertJsonCount(2, 'publicaciones')
            ->assertJsonPath('meta.total', 3)
            ->assertJsonPath('meta.last_page', 2);
    }

    public function test_detalle_visible_para_proveedores_si_esta_activo_y_404_si_no(): void
    {
        $vendedor = $this->crearProveedorComprador();
        $activo = $this->crearLote($this->servicioCanceladoDesdeEnCamino($vendedor));
        $vendido = $this->crearLote($this->servicioCanceladoDesdeEnCamino($vendedor), ['estado' => 'vendido']);

        Sanctum::actingAs($this->crearProveedorComprador()->user);

        $this->getJson("/api/materiales/{$activo->id}")->assertOk()->assertJsonPath('publicacion.id', $activo->id);
        $this->getJson("/api/materiales/{$vendido->id}")->assertNotFound();
        $this->getJson('/api/materiales/99999999')->assertNotFound();

        Sanctum::actingAs($vendedor->user);
        $this->getJson("/api/materiales/{$vendido->id}")->assertOk()->assertJsonPath('publicacion.estado', 'vendido');

        Sanctum::actingAs($this->crearCliente());
        $this->getJson("/api/materiales/{$activo->id}")->assertForbidden();
    }

    public function test_mias_lista_todos_mis_lotes_incluidos_los_terminales(): void
    {
        $yo = $this->crearProveedorComprador();
        $this->crearLote($this->servicioCanceladoDesdeEnCamino($yo));
        $this->crearLote($this->servicioCanceladoDesdeEnCamino($yo), ['estado' => 'retirado']);
        $this->crearLote($this->servicioCanceladoDesdeEnCamino($this->crearProveedorComprador()));

        Sanctum::actingAs($yo->user);

        $this->getJson('/api/materiales/mias')->assertOk()->assertJsonCount(2, 'publicaciones');

        Sanctum::actingAs($this->crearCliente());
        $this->getJson('/api/materiales/mias')->assertForbidden();
    }

    // ── Editar / retirar / vender ────────────────────────────────────────────

    public function test_editar_cambia_campos_y_no_borra_imagenes_si_no_se_pide(): void
    {
        $servicio = $this->servicioCanceladoDesdeEnCamino();
        Sanctum::actingAs($servicio->proveedor->user);
        $id = $this->crear($this->payload($servicio, ['imagenes' => [$this->imagen('a.jpg'), $this->imagen('b.jpg')]]))
            ->assertCreated()->json('publicacion.id');

        $this->putJson("/api/materiales/{$id}", ['titulo' => 'Titulo editado', 'cantidad' => 5])
            ->assertOk()
            ->assertJsonPath('publicacion.titulo', 'Titulo editado')
            ->assertJsonCount(2, 'publicacion.imagenes');

        $this->assertSame(2, PublicacionMaterialImagen::where('publicacion_id', $id)->count());
    }

    public function test_editar_agrega_y_elimina_imagenes_de_forma_explicita(): void
    {
        $servicio = $this->servicioCanceladoDesdeEnCamino();
        Sanctum::actingAs($servicio->proveedor->user);
        $respuesta = $this->crear($this->payload($servicio, ['imagenes' => [$this->imagen('a.jpg'), $this->imagen('b.jpg')]]))->assertCreated();
        $id = $respuesta->json('publicacion.id');
        $primera = $respuesta->json('publicacion.imagenes.0.id');

        $this->post("/api/materiales/{$id}", [
            '_method'            => 'PUT',
            'imagenes'           => [$this->imagen('c.png')],
            'eliminar_imagenes'  => [$primera],
        ], ['Accept' => 'application/json'])->assertOk()->assertJsonCount(2, 'publicacion.imagenes');

        $this->assertDatabaseMissing('publicaciones_material_imagenes', ['id' => $primera]);
    }

    public function test_no_se_puede_quedar_sin_imagenes_ni_pasar_de_tres(): void
    {
        $servicio = $this->servicioCanceladoDesdeEnCamino();
        Sanctum::actingAs($servicio->proveedor->user);
        $respuesta = $this->crear($this->payload($servicio, ['imagenes' => [$this->imagen('a.jpg')]]))->assertCreated();
        $id = $respuesta->json('publicacion.id');

        $this->putJson("/api/materiales/{$id}", ['eliminar_imagenes' => [$respuesta->json('publicacion.imagenes.0.id')]])->assertStatus(422);

        $this->post("/api/materiales/{$id}", [
            '_method'  => 'PUT',
            'imagenes' => [$this->imagen('2.jpg'), $this->imagen('3.jpg'), $this->imagen('4.jpg')],
        ], ['Accept' => 'application/json'])->assertStatus(422);

        $this->assertSame(1, PublicacionMaterialImagen::where('publicacion_id', $id)->count());
    }

    public function test_solo_el_vendedor_edita_retira_y_vende(): void
    {
        $lote = $this->crearLote($this->servicioCanceladoDesdeEnCamino());
        Sanctum::actingAs($this->crearProveedorComprador()->user);

        $this->putJson("/api/materiales/{$lote->id}", ['titulo' => 'Hackeado'])->assertForbidden();
        $this->postJson("/api/materiales/{$lote->id}/retirar")->assertForbidden();
        $this->postJson("/api/materiales/{$lote->id}/vendido")->assertForbidden();

        $this->assertSame('disponible', $lote->fresh()->estado);
        $this->assertSame('Tubería PVC sobrante', $lote->fresh()->titulo);
    }

    public function test_vendedor_retira_un_lote_disponible_y_es_terminal(): void
    {
        $lote = $this->crearLote($servicio = $this->servicioCanceladoDesdeEnCamino());
        Sanctum::actingAs($servicio->proveedor->user);

        $this->postJson("/api/materiales/{$lote->id}/retirar")->assertOk()->assertJsonPath('publicacion.estado', 'retirado');

        $this->postJson("/api/materiales/{$lote->id}/retirar")->assertStatus(422);
        $this->postJson("/api/materiales/{$lote->id}/vendido")->assertStatus(422);
        $this->putJson("/api/materiales/{$lote->id}", ['titulo' => 'Reabierto'])->assertStatus(422);
    }

    public function test_retirar_un_lote_reservado_exige_cancelar_primero(): void
    {
        $lote = $this->crearLote($servicio = $this->servicioCanceladoDesdeEnCamino(), ['estado' => 'reservado']);
        Sanctum::actingAs($servicio->proveedor->user);

        $this->postJson("/api/materiales/{$lote->id}/retirar")->assertStatus(422);

        $this->assertSame('reservado', $lote->fresh()->estado);
    }

    public function test_vendedor_marca_vendido_un_lote_reservado_y_es_terminal(): void
    {
        $lote = $this->crearLote($servicio = $this->servicioCanceladoDesdeEnCamino(), ['estado' => 'reservado']);
        Sanctum::actingAs($servicio->proveedor->user);

        $this->postJson("/api/materiales/{$lote->id}/vendido")->assertOk()->assertJsonPath('publicacion.estado', 'vendido');

        $this->postJson("/api/materiales/{$lote->id}/retirar")->assertStatus(422);
    }

    public function test_retirar_rechaza_las_solicitudes_pendientes(): void
    {
        $lote = $this->crearLote($servicio = $this->servicioCanceladoDesdeEnCamino());
        $reserva = $this->crearReserva($lote, $comprador = $this->crearProveedorComprador());
        Sanctum::actingAs($servicio->proveedor->user);

        $this->postJson("/api/materiales/{$lote->id}/retirar")->assertOk();

        $this->assertSame('rechazada', $reserva->fresh()->estado);
        $this->assertDatabaseHas('notificaciones', ['destinatario_id' => $comprador->user_id, 'tipo' => 'reserva_material_rechazada']);
    }

    // ── Auxiliares ───────────────────────────────────────────────────────────

    /** Multipart real: postJson no puede transportar archivos. */
    private function crear(array $datos)
    {
        return $this->post('/api/materiales', $datos, ['Accept' => 'application/json']);
    }

    /** PNG real de 1x1: la imagen de pruebas no trae GD, asi que no se usa fake()->image(). */
    private const PNG_1X1 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

    private function imagen(string $nombre, int $kb = 0): UploadedFile
    {
        $contenido = base64_decode(self::PNG_1X1);

        if ($kb > 0) {
            $contenido = str_pad($contenido, $kb * 1024, " ");
        }

        return UploadedFile::fake()->createWithContent($nombre, $contenido);
    }

    private function payload($servicio, array $cambios = []): array
    {
        return array_merge([
            'servicio_id'        => $servicio->id,
            'titulo'             => 'Tubería PVC sobrante',
            'descripcion'        => 'Material comprado para un trabajo que fue cancelado.',
            'cantidad'           => 10,
            'unidad'             => 'metros',
            'precio_referencial' => 150,
            'departamento'       => 'Guatemala',
            'municipio'          => 'Mixco',
            'imagenes'           => [$this->imagen('a.jpg')],
        ], $cambios);
    }
}
