<?php

namespace Tests\Feature;

use App\Models\Notificacion;
use App\Models\PublicacionMaterial;
use App\Models\ReporteSeguridad;
use App\Models\Servicio;
use Illuminate\Support\Facades\Storage;
use PHPUnit\Framework\Attributes\Group;
use Tests\Feature\Concerns\CompiteConProcesos;
use Tests\Feature\Concerns\CreaEscenarioSeguridad;
use Tests\TestCase;

/**
 * Task 7.1 (Sprint 9) — regresion de concurrencia del incremento.
 *
 * El plan pide tres carreras reales: publicacion duplicada, aceptacion de
 * reserva e interrupcion contra finalizacion. Las dos ultimas ya viven en
 * ReservaMaterialConcurrencySprint9Test y SecurityInterruptionConcurrencySprint9Test
 * y se verificaron por mutacion (docs/sprint9/backend-regresion.md). Aqui va la
 * que faltaba, mas dos carreras ENTRE tasks que ninguna prueba de task cubre
 * porque solo existen cuando los dominios conviven:
 *
 * - cancelar el servicio (Sprint 8) contra interrumpirlo por seguridad (5.2);
 * - marcar el lote vendido (2.2) contra cancelar su reserva aceptada (2.3).
 *
 * Todas usan procesos PHP independientes contra PostgreSQL real (ver
 * CompiteConProcesos): el padre retiene el lock de la fila disputada hasta que
 * los dos hijos esperan por el, y entonces los suelta a la vez. Sin
 * `DatabaseTransactions`: los fixtures se comitean y se borran en tearDown.
 */
#[Group('concurrencia')]
class Sprint9ConcurrencyRegressionTest extends TestCase
{
    use CreaEscenarioSeguridad;
    use CompiteConProcesos;

    /** PNG real de 1x1: la imagen de pruebas no trae GD (mismo recurso que PublicacionMaterialSprint9Test). */
    private const PNG_1X1 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

    /** @var list<string> Archivos locales que suben los procesos hijos. */
    private array $temporales = [];

    /** @var list<string> Directorios del disco publico que escribieron los hijos. */
    private array $directorios = [];

    protected function tearDown(): void
    {
        // Los hijos escriben en el disco publico real, no en un Storage::fake().
        foreach ($this->directorios as $directorio) {
            Storage::disk('public')->deleteDirectory($directorio);
        }
        foreach ($this->temporales as $ruta) {
            @unlink($ruta);
        }
        $this->limpiarCommiteados();

        parent::tearDown();
    }

    // ── Publicacion duplicada (2.2) ──────────────────────────────────────────

    /**
     * El proveedor publica dos veces el mismo servicio a la vez (doble clic, dos
     * pestanas). Debe quedar un lote, el perdedor debe recibir un 409 y no un
     * 500, y sus imagenes no pueden quedar huerfanas en el disco.
     */
    public function test_dos_publicaciones_simultaneas_del_mismo_servicio_dejan_un_lote_sin_archivos_huerfanos(): void
    {
        $servicio = $this->servicioCanceladoDesdeEnCamino();
        $token = $servicio->proveedor->user->createToken('t')->plainTextToken;
        $antes = Storage::disk('public')->allFiles('materiales');

        $r = $this->competir('servicios', $servicio->id, [
            ['POST', '/api/materiales', $token, $this->cuerpoLote($servicio, 'Lote A'), ['imagenes' => [$this->imagen()]]],
            ['POST', '/api/materiales', $token, $this->cuerpoLote($servicio, 'Lote B'), ['imagenes' => [$this->imagen()]]],
        ]);

        $lotes = PublicacionMaterial::where('servicio_id', $servicio->id)->get();
        foreach ($lotes as $lote) {
            $this->directorios[] = "materiales/{$lote->id}";
        }

        $this->assertSame([201, 409], collect($r)->pluck('status')->sort()->values()->all(), json_encode($r));
        $this->assertCount(1, $lotes);
        $this->assertSame(1, $lotes[0]->imagenes()->count());

        // Solo el ganador escribio en disco: un archivo, dentro de su lote.
        $nuevos = array_values(array_diff(Storage::disk('public')->allFiles('materiales'), $antes));
        $this->assertCount(1, $nuevos, 'Archivos nuevos en disco: ' . json_encode($nuevos));
        $this->assertStringStartsWith("materiales/{$lotes[0]->id}/", $nuevos[0]);
    }

    // ── Cancelar (Sprint 8) contra interrumpir por seguridad (5.2) ───────────

    /**
     * Las dos acciones caben en `aceptado` y `en_camino`, y cada una cierra el
     * servicio por un camino distinto: cancelado (que habilita la bolsa de
     * materiales) o interrumpido por seguridad (que exige su reporte). Gane la
     * que gane, el servicio no puede quedar con rastros de las dos.
     */
    public function test_cancelar_e_interrumpir_a_la_vez_dejan_un_solo_cierre_coherente(): void
    {
        $servicio = $this->servicioSeguro('en_camino');
        $cliente = $servicio->cliente->createToken('t')->plainTextToken;
        $proveedor = $servicio->proveedor->user->createToken('t')->plainTextToken;

        [$cancelar, $interrumpir] = $this->competir('servicios', $servicio->id, [
            ['POST', "/api/servicios/{$servicio->id}/cancelar", $cliente, ['motivo' => 'Ya no necesito el servicio.']],
            ['POST', "/api/servicios/{$servicio->id}/seguridad/interrumpir", $proveedor, [
                'categoria'       => 'amenaza_o_acoso',
                'descripcion'     => 'El cliente amenazo al proveedor al llegar.',
                'idempotency_key' => 'carrera-cancelar-interrumpir',
            ]],
        ]);

        $contexto = json_encode([$cancelar, $interrumpir]);
        $fresco = Servicio::find($servicio->id);
        $interrupciones = ReporteSeguridad::where('servicio_id', $servicio->id)->where('interrumpio_servicio', true)->count();

        if ($cancelar['status'] === 200) {
            $this->assertSame(422, $interrumpir['status'], $contexto);
            $this->assertSame('cancelado', $fresco->estado);
            $this->assertSame('en_camino', $fresco->cancelado_desde);
            $this->assertSame(0, $interrupciones, 'Un servicio cancelado no debe tener una interrupcion registrada.');
        } else {
            $this->assertSame([422, 201], [$cancelar['status'], $interrumpir['status']], $contexto);
            $this->assertSame('interrumpido_seguridad', $fresco->estado);
            $this->assertNull($fresco->cancelado_desde, 'Un servicio interrumpido no puede quedar marcado como cancelado.');
            $this->assertNull($fresco->codigo_inicio);
            $this->assertSame(1, $interrupciones);
        }
    }

    // ── Vender (2.2) contra cancelar la reserva aceptada (2.3) ──────────────

    /**
     * El vendedor marca el lote vendido mientras el comprador cancela la reserva
     * aceptada. Los dos ordenes son validos, pero `vendido` es terminal: sin el
     * lock del lote, la cancelacion podria leer `reservado`, perder la carrera y
     * devolver a `disponible` un lote ya vendido.
     */
    public function test_vender_y_cancelar_la_reserva_a_la_vez_nunca_reabren_un_lote_vendido(): void
    {
        $vendedor = $this->crearProveedorComprador();
        $comprador = $this->crearProveedorComprador();
        $lote = $this->crearLote($this->servicioCanceladoDesdeEnCamino($vendedor), ['estado' => 'reservado']);
        $reserva = $this->crearReserva($lote, $comprador, ['estado' => 'aceptada']);

        [$vender, $cancelar] = $this->competir('publicaciones_material', $lote->id, [
            ['POST', "/api/materiales/{$lote->id}/vendido", $vendedor->user->createToken('t')->plainTextToken, []],
            ['POST', "/api/reservas-material/{$reserva->id}/cancelar", $comprador->user->createToken('t')->plainTextToken, []],
        ]);

        $contexto = json_encode([$vender, $cancelar]);
        $this->assertSame(200, $vender['status'], $contexto);
        $this->assertContains($cancelar['status'], [200, 422], $contexto);
        $this->assertSame('vendido', $lote->fresh()->estado, 'Un lote vendido no puede volver a estar disponible.');

        $avisos = Notificacion::where('destinatario_id', $vendedor->user_id)->where('tipo', 'reserva_material_cancelada')->count();

        if ($cancelar['status'] === 200) {
            $this->assertSame('cancelada', $reserva->fresh()->estado);
            $this->assertSame(1, $avisos);
        } else {
            $this->assertSame('aceptada', $reserva->fresh()->estado);
            $this->assertSame(0, $avisos, 'Una cancelacion rechazada no debe avisar al vendedor.');
        }
    }

    // ── Auxiliares ───────────────────────────────────────────────────────────

    private function cuerpoLote(Servicio $servicio, string $titulo): array
    {
        return [
            'servicio_id'        => $servicio->id,
            'titulo'             => $titulo,
            'descripcion'        => 'Tuberia sobrante de un trabajo cancelado en camino.',
            'cantidad'           => 10,
            'unidad'             => 'metros',
            'precio_referencial' => 150,
            'departamento'       => 'Guatemala',
        ];
    }

    /** Ruta a un PNG real en disco, que el hijo sube como archivo. */
    private function imagen(): string
    {
        $ruta = sys_get_temp_dir() . '/lote-' . uniqid('', true) . '.png';
        file_put_contents($ruta, base64_decode(self::PNG_1X1));
        $this->temporales[] = $ruta;

        return $ruta;
    }
}
