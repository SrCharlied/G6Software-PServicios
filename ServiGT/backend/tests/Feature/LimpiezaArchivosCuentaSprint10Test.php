<?php

namespace Tests\Feature;

use App\Models\DocumentoProveedor;
use App\Models\Proveedor;
use App\Models\PublicacionServicio;
use App\Models\SolicitudEliminacionCuenta;
use App\Models\User;
use App\Services\LimpiezaArchivosCuentaService;
use App\Services\SolicitudEliminacionService;
use Illuminate\Contracts\Filesystem\Filesystem;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use LogicException;
use Tests\Feature\Concerns\CreaEscenarioMateriales;
use Tests\TestCase;

/**
 * Task 3.1.c (Sprint 10): manifiesto previo de archivos, limpieza idempotente
 * con reintento y catalogos que excluyen cuentas anonimizadas.
 */
class LimpiezaArchivosCuentaSprint10Test extends TestCase
{
    use DatabaseTransactions;
    use CreaEscenarioMateriales;

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('public');
        Storage::fake('local');
    }

    private function limpieza(): LimpiezaArchivosCuentaService
    {
        return app(LimpiezaArchivosCuentaService::class);
    }

    /** Proveedor con foto, portada, publicacion con imagen y documentos nuevo y legado. */
    private function proveedorConArchivos(): Proveedor
    {
        $user = User::create([
            'name' => 'Proveedor a eliminar', 'email' => 'pa_' . uniqid() . '@servigt.test',
            'password' => 'secreto-de-prueba', 'role' => 'proveedor',
        ]);
        $proveedor = Proveedor::create([
            'user_id' => $user->id, 'nombre' => 'Proveedor a eliminar', 'email' => $user->email,
            'departamento' => 'Guatemala',
        ]);
        $id = $proveedor->id;

        Storage::disk('public')->put("fotos/{$id}/a.jpg", 'x');
        Storage::disk('public')->put("portadas/{$id}/b.jpg", 'x');
        Storage::disk('public')->put("publicaciones/{$id}/c.jpg", 'x');
        Storage::disk('local')->put("documentos/{$id}/dpi.pdf", 'x');
        Storage::disk('public')->put("documentos/{$id}/legado.pdf", 'x');
        // Archivos que no son de esta cuenta: nunca se tocan.
        Storage::disk('public')->put('fotos/999999/ajena.jpg', 'x');
        Storage::disk('local')->put('seguridad/1/evidencia.pdf', 'x');

        $proveedor->update([
            'foto_perfil' => "/storage/fotos/{$id}/a.jpg",
            'portada'     => "http://localhost:8085/storage/portadas/{$id}/b.jpg",
        ]);
        PublicacionServicio::create([
            'proveedor_id' => $id, 'titulo' => 'Servicio', 'descripcion' => 'Descripcion',
            'imagen' => "/storage/publicaciones/{$id}/c.jpg", 'estado' => 'activa',
        ]);
        foreach (["documentos/{$id}/dpi.pdf", "/storage/documentos/{$id}/legado.pdf"] as $ruta) {
            DocumentoProveedor::create([
                'proveedor_id' => $id, 'tipo_documento' => 'DPI',
                'nombre_archivo' => basename($ruta), 'ruta_archivo' => $ruta,
            ]);
        }

        return $proveedor->refresh();
    }

    /** Simula lo que hara 3.1.b: manifiesto previo y paso a limpieza_pendiente. */
    private function anonimizarConManifiesto(User $user): SolicitudEliminacionCuenta
    {
        $solicitud = app(SolicitudEliminacionService::class)->solicitar($user, 'clave-' . $user->id);
        $this->limpieza()->capturarManifiesto($solicitud);

        DB::table('users')->where('id', $user->id)->update(['estado_cuenta' => 'anonimizada', 'anonimizada_at' => now()]);
        $solicitud->update(['estado' => SolicitudEliminacionCuenta::LIMPIEZA_PENDIENTE, 'anonimizada_at' => now()]);

        return $solicitud->refresh();
    }

    public function test_el_manifiesto_lista_solo_archivos_personales_y_permitidos(): void
    {
        $proveedor = $this->proveedorConArchivos();
        $id = $proveedor->id;

        $manifiesto = $this->limpieza()->construirManifiesto($proveedor->user);

        $this->assertEqualsCanonicalizing([
            ['disco' => 'public', 'ruta' => "fotos/{$id}/a.jpg"],
            ['disco' => 'public', 'ruta' => "portadas/{$id}/b.jpg"],
            ['disco' => 'public', 'ruta' => "publicaciones/{$id}/c.jpg"],
            ['disco' => 'local',  'ruta' => "documentos/{$id}/dpi.pdf"],
            ['disco' => 'public', 'ruta' => "documentos/{$id}/dpi.pdf"],
            ['disco' => 'local',  'ruta' => "documentos/{$id}/legado.pdf"],
            ['disco' => 'public', 'ruta' => "documentos/{$id}/legado.pdf"],
        ], $manifiesto);
    }

    public function test_un_cliente_sin_perfil_tiene_manifiesto_vacio(): void
    {
        $this->assertSame([], $this->limpieza()->construirManifiesto($this->crearCliente()));
    }

    public function test_rechaza_rutas_fuera_de_prefijos_o_con_traversal(): void
    {
        $servicio = $this->limpieza();

        $this->assertTrue($servicio->esRutaPermitida('local', 'documentos/1/a.pdf'));
        foreach ([
            ['local', 'seguridad/1/evidencia.pdf'],
            ['local', 'fotos/1/a.jpg'],
            ['public', 'materiales/1/a.jpg'],
            ['public', 'fotos/../../.env'],
            ['public', '/fotos/1/a.jpg'],
            ['otro', 'fotos/1/a.jpg'],
            ['public', null],
        ] as [$disco, $ruta]) {
            $this->assertFalse($servicio->esRutaPermitida($disco, $ruta), "{$disco}:{$ruta}");
        }
    }

    public function test_el_manifiesto_solo_se_captura_en_pendiente(): void
    {
        $proveedor = $this->proveedorConArchivos();
        $solicitud = $this->anonimizarConManifiesto($proveedor->user);

        $this->expectException(LogicException::class);
        $this->limpieza()->capturarManifiesto($solicitud);
    }

    public function test_limpiar_borra_el_manifiesto_completa_y_es_idempotente(): void
    {
        $proveedor = $this->proveedorConArchivos();
        $id = $proveedor->id;
        $solicitud = $this->anonimizarConManifiesto($proveedor->user);

        $resultado = $this->limpieza()->limpiar($solicitud);

        $this->assertSame(SolicitudEliminacionCuenta::COMPLETADA, $resultado->estado);
        $this->assertNotNull($resultado->completada_at);
        $this->assertSame(1, $resultado->intentos_limpieza);
        Storage::disk('public')->assertMissing(["fotos/{$id}/a.jpg", "portadas/{$id}/b.jpg", "publicaciones/{$id}/c.jpg", "documentos/{$id}/legado.pdf"]);
        Storage::disk('local')->assertMissing("documentos/{$id}/dpi.pdf");
        Storage::disk('public')->assertExists('fotos/999999/ajena.jpg');
        Storage::disk('local')->assertExists('seguridad/1/evidencia.pdf');

        // Reintentar una ya completada no cambia nada.
        $otra = $this->limpieza()->limpiar($resultado);
        $this->assertSame(SolicitudEliminacionCuenta::COMPLETADA, $otra->estado);
        $this->assertSame(1, $otra->intentos_limpieza);
    }

    public function test_un_fallo_deja_limpieza_pendiente_y_el_reintento_completa(): void
    {
        $proveedor = $this->proveedorConArchivos();
        $solicitud = $this->anonimizarConManifiesto($proveedor->user);

        $fake = Storage::disk('public');
        $roto = \Mockery::mock(Filesystem::class);
        $roto->shouldReceive('exists')->andReturnTrue();
        $roto->shouldReceive('delete')->andReturnFalse();
        Storage::set('public', $roto);

        $fallida = $this->limpieza()->limpiar($solicitud);

        $this->assertSame(SolicitudEliminacionCuenta::LIMPIEZA_PENDIENTE, $fallida->estado);
        $this->assertSame(1, $fallida->intentos_limpieza);
        $this->assertStringContainsString('no se pudo borrar', $fallida->ultimo_error_limpieza);
        $this->assertNull($fallida->completada_at);

        Storage::set('public', $fake);
        $this->artisan('cuentas:limpiar-archivos')->assertSuccessful();

        $final = $solicitud->refresh();
        $this->assertSame(SolicitudEliminacionCuenta::COMPLETADA, $final->estado);
        $this->assertSame(2, $final->intentos_limpieza);
        $this->assertNull($final->ultimo_error_limpieza);
    }

    public function test_una_solicitud_pendiente_no_se_limpia_antes_de_anonimizar(): void
    {
        $proveedor = $this->proveedorConArchivos();
        $solicitud = app(SolicitudEliminacionService::class)->solicitar($proveedor->user, 'clave-p');
        $this->limpieza()->capturarManifiesto($solicitud);

        $resultado = $this->limpieza()->limpiar($solicitud);

        $this->assertSame(SolicitudEliminacionCuenta::PENDIENTE, $resultado->estado);
        Storage::disk('public')->assertExists("fotos/{$proveedor->id}/a.jpg");
    }

    public function test_catalogo_y_detalle_publicos_excluyen_al_anonimizado(): void
    {
        $proveedor = $this->proveedorConArchivos();
        $publicacion = PublicacionServicio::where('proveedor_id', $proveedor->id)->firstOrFail();

        $this->getJson("/api/providers/{$proveedor->id}")->assertOk();
        $this->assertContains($proveedor->id, collect($this->getJson('/api/providers')->json('proveedores'))->pluck('id'));
        $this->assertContains($publicacion->id, collect($this->getJson('/api/publicaciones?per_page=50')->json('publicaciones'))->pluck('id'));

        $this->anonimizarConManifiesto($proveedor->user);

        $this->getJson("/api/providers/{$proveedor->id}")->assertNotFound();
        $this->getJson("/api/publicaciones/{$publicacion->id}")->assertNotFound();
        $this->assertNotContains($proveedor->id, collect($this->getJson('/api/providers')->json('proveedores'))->pluck('id'));
        $this->assertNotContains($publicacion->id, collect($this->getJson('/api/publicaciones?per_page=50')->json('publicaciones'))->pluck('id'));
    }

    public function test_materiales_salen_del_catalogo_pero_el_reservante_conserva_el_historial(): void
    {
        $servicio = $this->servicioCanceladoDesdeEnCamino();
        $lote = $this->crearLote($servicio);
        $conReserva = $this->crearProveedorComprador();
        $this->crearReserva($lote, $conReserva);
        $sinReserva = $this->crearProveedorComprador();

        $this->anonimizarConManifiesto($servicio->proveedor->user);

        Sanctum::actingAs($sinReserva->user);
        $this->assertNotContains($lote->id, collect($this->getJson('/api/materiales')->json('publicaciones'))->pluck('id'));
        $this->getJson("/api/materiales/{$lote->id}")->assertNotFound();

        Sanctum::actingAs($conReserva->user);
        $this->getJson("/api/materiales/{$lote->id}")->assertOk();
    }
}
