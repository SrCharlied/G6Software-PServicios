<?php

namespace Tests\Feature;

use App\Models\EvidenciaReporteSeguridad;
use App\Models\ReporteSeguridad;
use App\Models\Servicio;
use App\Models\User;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\Feature\Concerns\CreaEscenarioSeguridad;
use Tests\TestCase;

/*
 * ── AVISO PARA QUIEN MODIFIQUE ESTA PRUEBA ────────────────────────────────
 * Estas pruebas fueron desarrolladas por JA (Juan Salguero) como parte de la
 * cadena de dependencias de la Task 6.2 de Sprint 9, y cubren el alcance de
 * la Task asignada a otra persona (Task 5.3, evidencia privada y descarga
 * autorizada). Describen el contrato actual, no el definitivo.
 *
 * Si vas a cambiar o ampliar el comportamiento de esta Task (nuevas reglas,
 * campos, estados o rutas), no basta con ajustar estas pruebas: agrega
 * pruebas de regresion que demuestren que lo que ya funcionaba sigue
 * funcionando (permisos por rol, ownership, estados invalidos, idempotencia
 * y concurrencia cuando aplique) y ejecuta la suite backend completa.
 * ───────────────────────────────────────────────────────────────────────────
 */

/**
 * Task 5.3 (Sprint 9): hasta tres evidencias privadas por reporte (JPG, PNG o
 * PDF de maximo 5 MB), sin URL publica ni ruta fisica en ninguna respuesta, y
 * descarga solo para el reportante y el admin.
 */
class SecurityEvidenceSprint9Test extends TestCase
{
    use DatabaseTransactions;
    use CreaEscenarioSeguridad;

    private const PNG_1X1 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('local');
        Storage::fake('public');
    }

    // ── Subida ───────────────────────────────────────────────────────────────

    public function test_el_reportante_adjunta_jpg_png_y_pdf_en_disco_privado(): void
    {
        [$servicio, $reporte] = $this->reporteDe('cliente');
        Sanctum::actingAs($servicio->cliente);

        $respuesta = $this->subir($reporte, [$this->jpg('foto.jpg'), $this->png('captura.png'), $this->pdf('acta.pdf')])
            ->assertCreated()
            ->assertJsonCount(3, 'reporte.evidencias')
            ->assertJsonPath('reporte.puede_adjuntar_evidencia', false);

        $this->assertSame(['image/jpeg', 'image/png', 'application/pdf'], collect($respuesta->json('reporte.evidencias'))->pluck('mime')->all());

        foreach (EvidenciaReporteSeguridad::where('reporte_id', $reporte->id)->get() as $e) {
            $this->assertTrue(Storage::disk('local')->exists($e->ruta_privada), 'El archivo debe estar en el disco privado.');
            $this->assertStringStartsWith("seguridad/{$reporte->id}/", $e->ruta_privada);
            $this->assertSame(hash('sha256', Storage::disk('local')->get($e->ruta_privada)), $e->sha256);
            $this->assertSame(strlen(Storage::disk('local')->get($e->ruta_privada)), $e->tamano_bytes);
        }

        $this->assertSame([], Storage::disk('public')->allFiles(), 'Nada de la evidencia puede quedar en el disco publico.');
    }

    public function test_el_nombre_en_disco_es_aleatorio_y_no_el_del_cliente(): void
    {
        [$servicio, $reporte] = $this->reporteDe('cliente');
        Sanctum::actingAs($servicio->cliente);

        $this->subir($reporte, [$this->png('../../etc/passwd.png')])->assertCreated();

        $e = EvidenciaReporteSeguridad::firstOrFail();
        $this->assertStringNotContainsString('passwd', $e->ruta_privada);
        $this->assertStringNotContainsString('..', $e->ruta_privada);
        $this->assertMatchesRegularExpression('#^seguridad/\d+/[0-9a-f-]{36}\.png$#', $e->ruta_privada);
    }

    public function test_el_tipo_se_detecta_por_contenido_y_no_por_la_extension(): void
    {
        [$servicio, $reporte] = $this->reporteDe('cliente');
        Sanctum::actingAs($servicio->cliente);

        // Un PNG real con extension .jpg se guarda como PNG; un script con extension .jpg se rechaza.
        $this->subir($reporte, [UploadedFile::fake()->createWithContent('engañosa.jpg', base64_decode(self::PNG_1X1))])->assertCreated();
        $this->assertSame('image/png', EvidenciaReporteSeguridad::firstOrFail()->mime);
        $this->assertStringEndsWith('.png', EvidenciaReporteSeguridad::firstOrFail()->ruta_privada);

        $this->subir($reporte, [UploadedFile::fake()->createWithContent('shell.jpg', '<?php echo "pwn"; ?>')])
            ->assertStatus(422)->assertJsonValidationErrors('archivos.0');

        $this->assertSame(1, EvidenciaReporteSeguridad::count());
    }

    #[DataProvider('archivosInvalidos')]
    public function test_rechaza_formatos_y_tamanos_fuera_de_politica(string $nombre, string $contenido): void
    {
        [$servicio, $reporte] = $this->reporteDe('cliente');
        Sanctum::actingAs($servicio->cliente);

        $this->subir($reporte, [UploadedFile::fake()->createWithContent($nombre, $contenido)])
            ->assertStatus(422)->assertJsonValidationErrors('archivos.0');

        $this->assertSame(0, EvidenciaReporteSeguridad::count());
        $this->assertSame([], Storage::disk('local')->allFiles());
    }

    public static function archivosInvalidos(): array
    {
        return [
            'gif'        => ['a.gif', base64_decode('R0lGODlhAQABAAAAACw=')],
            'svg'        => ['a.svg', '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>'],
            'ejecutable' => ['a.exe', "MZ\x90\x00\x03\x00\x00\x00"],
            'texto'      => ['a.txt', 'texto plano'],
            'pdf pesado' => ['grande.pdf', '%PDF-1.4' . str_repeat('0', 5 * 1024 * 1024 + 1024)],
        ];
    }

    public function test_acepta_un_archivo_justo_en_el_limite_de_5_mb(): void
    {
        [$servicio, $reporte] = $this->reporteDe('cliente');
        Sanctum::actingAs($servicio->cliente);

        $limite = '%PDF-1.4' . str_repeat('0', 5 * 1024 * 1024 - 8);
        $this->assertSame(5 * 1024 * 1024, strlen($limite));

        $this->subir($reporte, [UploadedFile::fake()->createWithContent('limite.pdf', $limite)])->assertCreated();
    }

    public function test_el_total_por_reporte_nunca_pasa_de_tres(): void
    {
        [$servicio, $reporte] = $this->reporteDe('cliente');
        Sanctum::actingAs($servicio->cliente);

        $this->subir($reporte, [$this->png('1.png'), $this->png('2.png')])->assertCreated();
        $this->subir($reporte, [$this->png('3.png'), $this->png('4.png')])->assertStatus(422);
        $this->assertSame(2, EvidenciaReporteSeguridad::count(), 'Una subida rechazada no debe dejar nada guardado.');

        $this->subir($reporte, [$this->png('3.png')])->assertCreated()->assertJsonPath('reporte.puede_adjuntar_evidencia', false);
        $this->subir($reporte, [$this->png('5.png')])->assertStatus(422);

        $this->assertSame(3, EvidenciaReporteSeguridad::count());
        $this->assertCount(3, Storage::disk('local')->allFiles());
    }

    public function test_mas_de_tres_archivos_en_una_misma_subida_se_rechazan(): void
    {
        [$servicio, $reporte] = $this->reporteDe('cliente');
        Sanctum::actingAs($servicio->cliente);

        $this->subir($reporte, [$this->png('1.png'), $this->png('2.png'), $this->png('3.png'), $this->png('4.png')])
            ->assertStatus(422)->assertJsonValidationErrors('archivos');
        $this->subir($reporte, [])->assertStatus(422)->assertJsonValidationErrors('archivos');

        $this->assertSame(0, EvidenciaReporteSeguridad::count());
    }

    public function test_un_fallo_a_mitad_no_deja_filas_ni_archivos_huerfanos(): void
    {
        [$servicio, $reporte] = $this->reporteDe('cliente');
        Sanctum::actingAs($servicio->cliente);

        $contador = 0;
        EvidenciaReporteSeguridad::creating(function () use (&$contador) {
            if (++$contador === 2) {
                throw new \RuntimeException('fallo simulado al guardar la segunda evidencia');
            }
        });

        $this->subir($reporte, [$this->png('1.png'), $this->png('2.png')])->assertStatus(500);

        EvidenciaReporteSeguridad::flushEventListeners();

        $this->assertSame(0, EvidenciaReporteSeguridad::count());
        $this->assertSame([], Storage::disk('local')->allFiles(), 'Quedaron archivos huerfanos.');
    }

    public function test_solo_el_reportante_sube_evidencia(): void
    {
        [$servicio, $reporte] = $this->reporteDe('cliente');

        $this->subir($reporte, [$this->png('1.png')])->assertUnauthorized();

        foreach ([$servicio->proveedor->user, $this->crearCliente(), $this->crearAdmin()] as $otro) {
            Sanctum::actingAs($otro);
            $this->subir($reporte, [$this->png('1.png')])->assertForbidden();
        }

        Sanctum::actingAs($servicio->cliente);
        $this->post('/api/seguridad/reportes/99999999/evidencias', ['archivos' => [$this->png('1.png')]], ['Accept' => 'application/json'])->assertNotFound();

        $this->assertSame(0, EvidenciaReporteSeguridad::count());
    }

    public function test_se_puede_adjuntar_despues_de_interrumpir_el_servicio(): void
    {
        $servicio = $this->servicioSeguro('en_progreso');
        Sanctum::actingAs($servicio->cliente);
        $reporteId = $this->postJson("/api/servicios/{$servicio->id}/seguridad/interrumpir", [
            'categoria' => 'emergencia', 'descripcion' => 'Situación de riesgo.', 'idempotency_key' => 'k',
        ])->assertCreated()->json('reporte.id');

        // La carga es posterior y ajena a la transaccion urgente de interrupcion.
        $this->post("/api/seguridad/reportes/{$reporteId}/evidencias", ['archivos' => [$this->png('1.png')]], ['Accept' => 'application/json'])->assertCreated();

        $this->assertSame('interrumpido_seguridad', $servicio->fresh()->estado);
    }

    // ── Privacidad: ninguna ruta ni URL en las respuestas ────────────────────

    public function test_ninguna_respuesta_expone_ruta_fisica_hash_ni_url_publica(): void
    {
        [$servicio, $reporte] = $this->reporteDe('cliente');
        Sanctum::actingAs($servicio->cliente);

        $subida = $this->subir($reporte, [$this->png('1.png')])->assertCreated();
        $detalle = $this->getJson("/api/seguridad/reportes/{$reporte->id}")->assertOk();
        $ruta = EvidenciaReporteSeguridad::firstOrFail()->ruta_privada;
        $sha = EvidenciaReporteSeguridad::firstOrFail()->sha256;

        foreach ([$subida, $detalle] as $respuesta) {
            $json = json_encode($respuesta->json());
            $this->assertStringNotContainsString($ruta, $json);
            $this->assertStringNotContainsString($sha, $json);
            $this->assertStringNotContainsString('ruta_privada', $json);
            $this->assertStringNotContainsString('/storage/', $json);
            $this->assertStringNotContainsString('seguridad/', $json);
        }
    }

    public function test_no_existe_endpoint_de_borrado_para_el_cliente(): void
    {
        [$servicio, $reporte] = $this->reporteDe('cliente');
        Sanctum::actingAs($servicio->cliente);
        $this->subir($reporte, [$this->png('1.png')])->assertCreated();
        $e = EvidenciaReporteSeguridad::firstOrFail();

        // No hay ruta de borrado: segun la URL el framework responde 404 o 405.
        foreach (["/evidencias/{$e->id}", '/evidencias', "/evidencias/{$e->id}/descargar"] as $sufijo) {
            $this->assertContains(
                $this->deleteJson("/api/seguridad/reportes/{$reporte->id}{$sufijo}")->getStatusCode(),
                [404, 405],
                "DELETE {$sufijo} no debe existir."
            );
        }

        $this->assertSame(1, EvidenciaReporteSeguridad::count());
        $this->assertTrue(Storage::disk('local')->exists($e->ruta_privada));
    }

    // ── Descarga ─────────────────────────────────────────────────────────────

    public function test_reportante_y_admin_descargan_como_attachment_con_nosniff(): void
    {
        [$servicio, $reporte] = $this->reporteDe('cliente');
        Sanctum::actingAs($servicio->cliente);
        $this->subir($reporte, [$this->png('captura.png')])->assertCreated();
        $e = EvidenciaReporteSeguridad::firstOrFail();

        foreach ([$servicio->cliente, $this->crearAdmin()] as $quien) {
            Sanctum::actingAs($quien);
            $respuesta = $this->get("/api/seguridad/reportes/{$reporte->id}/evidencias/{$e->id}/descargar");

            $respuesta->assertOk();
            $this->assertStringStartsWith('attachment', $respuesta->headers->get('Content-Disposition'));
            $this->assertSame('nosniff', $respuesta->headers->get('X-Content-Type-Options'));
            $this->assertStringStartsWith('image/png', $respuesta->headers->get('Content-Type'));
            $this->assertStringContainsString('private', (string) $respuesta->headers->get('Cache-Control'));
            $this->assertSame(base64_decode(self::PNG_1X1), $respuesta->streamedContent());
        }
    }

    public function test_contraparte_tercero_y_anonimo_no_descargan(): void
    {
        [$servicio, $reporte] = $this->reporteDe('cliente');
        Sanctum::actingAs($servicio->cliente);
        $this->subir($reporte, [$this->png('1.png')])->assertCreated();
        $e = EvidenciaReporteSeguridad::firstOrFail();
        $url = "/api/seguridad/reportes/{$reporte->id}/evidencias/{$e->id}/descargar";

        $this->app['auth']->forgetGuards();
        $this->getJson($url)->assertUnauthorized();

        foreach ([$servicio->proveedor->user, $this->crearCliente(), $this->crearProveedorComprador()->user] as $otro) {
            Sanctum::actingAs($otro);
            $this->getJson($url)->assertForbidden();
        }
    }

    public function test_una_evidencia_de_otro_reporte_o_inexistente_devuelve_404(): void
    {
        [$servicio, $reporte] = $this->reporteDe('cliente');
        [$servicio2, $reporte2] = $this->reporteDe('cliente');
        Sanctum::actingAs($servicio->cliente);
        $this->subir($reporte, [$this->png('1.png')])->assertCreated();
        $e = EvidenciaReporteSeguridad::firstOrFail();

        // Un reporte propio no sirve para bajar la evidencia de otro.
        Sanctum::actingAs($servicio2->cliente);
        $this->getJson("/api/seguridad/reportes/{$reporte2->id}/evidencias/{$e->id}/descargar")->assertNotFound();

        Sanctum::actingAs($servicio->cliente);
        $this->getJson("/api/seguridad/reportes/{$reporte->id}/evidencias/99999999/descargar")->assertNotFound();
        $this->getJson('/api/seguridad/reportes/99999999/evidencias/1/descargar')->assertNotFound();
    }

    public function test_si_falta_el_archivo_en_disco_responde_404_y_no_filtra_la_ruta(): void
    {
        [$servicio, $reporte] = $this->reporteDe('cliente');
        Sanctum::actingAs($servicio->cliente);
        $this->subir($reporte, [$this->png('1.png')])->assertCreated();
        $e = EvidenciaReporteSeguridad::firstOrFail();
        Storage::disk('local')->delete($e->ruta_privada);

        $respuesta = $this->getJson("/api/seguridad/reportes/{$reporte->id}/evidencias/{$e->id}/descargar")->assertNotFound();

        $this->assertStringNotContainsString($e->ruta_privada, json_encode($respuesta->json()));
    }

    // ── Auxiliares ───────────────────────────────────────────────────────────

    /** @return array{0: Servicio, 1: ReporteSeguridad} */
    private function reporteDe(string $rol): array
    {
        $servicio = $this->servicioSeguro('en_progreso');
        $autor = $rol === 'cliente' ? $servicio->cliente : $servicio->proveedor->user;

        return [$servicio, $this->crearReporte($servicio, $autor)];
    }

    private function subir(ReporteSeguridad $reporte, array $archivos)
    {
        return $this->post("/api/seguridad/reportes/{$reporte->id}/evidencias", ['archivos' => $archivos], ['Accept' => 'application/json']);
    }

    private function png(string $nombre): UploadedFile
    {
        return UploadedFile::fake()->createWithContent($nombre, base64_decode(self::PNG_1X1));
    }

    private function jpg(string $nombre): UploadedFile
    {
        return UploadedFile::fake()->createWithContent($nombre, hex2bin('ffd8ffe000104a46494600010100000100010000ffdb004300080606070605080707070909080a0c140d0c0b0b0c1912130f141d1a1f1e1d1a1c1c20242e2720222c231c1c2837292c30313434341f27393d38323c2e333432ffc0000b080001000101011100ffc4001f0000010501010101010100000000000000000102030405060708090a0bffda0008010100003f00d2cf20ffd9'));
    }

    private function pdf(string $nombre): UploadedFile
    {
        return UploadedFile::fake()->createWithContent($nombre, "%PDF-1.4\n1 0 obj<</Type/Catalog>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF\n");
    }
}
