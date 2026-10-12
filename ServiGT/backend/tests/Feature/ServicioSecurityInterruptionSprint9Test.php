<?php

namespace Tests\Feature;

use App\Models\HistorialReporteSeguridad;
use App\Models\Mensaje;
use App\Models\Notificacion;
use App\Models\ReporteSeguridad;
use App\Models\Servicio;
use App\Models\User;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Laravel\Sanctum\Sanctum;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\Feature\Concerns\CreaEscenarioSeguridad;
use Tests\TestCase;

/*
 * ── AVISO PARA QUIEN MODIFIQUE ESTA PRUEBA ────────────────────────────────
 * Estas pruebas fueron desarrolladas por JA (Juan Salguero) como parte de la
 * cadena de dependencias de la Task 6.2 de Sprint 9, y cubren el alcance de
 * la Task asignada a otra persona (Task 5.2, reporte e interrupcion atomica
 * del servicio). Describen el contrato actual, no el definitivo.
 *
 * Si vas a cambiar o ampliar el comportamiento de esta Task (nuevas reglas,
 * campos, estados o rutas), no basta con ajustar estas pruebas: agrega
 * pruebas de regresion que demuestren que lo que ya funcionaba sigue
 * funcionando (permisos por rol, ownership, estados invalidos, idempotencia
 * y concurrencia cuando aplique) y ejecuta la suite backend completa.
 * ───────────────────────────────────────────────────────────────────────────
 */

/**
 * Task 5.2 (Sprint 9): reporte simple (no interrumpe) e interrupcion atomica
 * (reporte obligatorio + estado terminal + codigos anulados + notificacion).
 */
class ServicioSecurityInterruptionSprint9Test extends TestCase
{
    use DatabaseTransactions;
    use CreaEscenarioSeguridad;

    private const ESTADOS_PERMITIDOS = ['aceptado', 'en_camino', 'en_progreso', 'por_confirmar'];

    // ── Reporte simple ───────────────────────────────────────────────────────

    #[DataProvider('estadosPermitidos')]
    public function test_cliente_y_proveedor_reportan_sin_alterar_el_servicio(string $estado): void
    {
        foreach (['cliente', 'proveedor'] as $rol) {
            $servicio = $this->servicioSeguro($estado);
            $autor = $rol === 'cliente' ? $servicio->cliente : $servicio->proveedor->user;
            $otro = $rol === 'cliente' ? $servicio->proveedor->user : $servicio->cliente;
            Sanctum::actingAs($autor);

            $this->reportar($servicio, 'clave-' . $rol)
                ->assertCreated()
                ->assertJsonPath('reporte.estado', 'recibido')
                ->assertJsonPath('reporte.interrumpio_servicio', false);

            $this->assertSame($estado, $servicio->fresh()->estado, "El reporte simple de {$rol} no debe cambiar el servicio.");
            $this->assertSame('123456', $servicio->fresh()->codigo_inicio);

            $reporte = ReporteSeguridad::where('servicio_id', $servicio->id)->firstOrFail();
            $this->assertSame($autor->id, $reporte->reportante_id);
            $this->assertSame($estado, $reporte->estado_servicio_previo);

            $evento = HistorialReporteSeguridad::where('reporte_id', $reporte->id)->firstOrFail();
            $this->assertSame($autor->id, $evento->actor_id);
            $this->assertNull($evento->estado_anterior);
            $this->assertSame('recibido', $evento->estado_nuevo);

            $this->assertSame(1, Notificacion::where('destinatario_id', $otro->id)->where('tipo', 'servicio_seguridad_reporte')->count());
        }
    }

    public static function estadosPermitidos(): array
    {
        return array_map(fn ($e) => [$e], self::ESTADOS_PERMITIDOS);
    }

    public function test_la_contraparte_tambien_puede_crear_su_reporte_posterior(): void
    {
        $servicio = $this->servicioSeguro('en_progreso');

        Sanctum::actingAs($servicio->cliente);
        $this->reportar($servicio, 'a')->assertCreated();
        Sanctum::actingAs($servicio->proveedor->user);
        $this->reportar($servicio, 'b')->assertCreated();

        $this->assertSame(2, ReporteSeguridad::where('servicio_id', $servicio->id)->count());
        $this->assertSame('en_progreso', $servicio->fresh()->estado);
    }

    public function test_la_notificacion_a_la_contraparte_es_generica(): void
    {
        $servicio = $this->servicioSeguro('en_progreso');
        Sanctum::actingAs($servicio->cliente);

        $this->reportar($servicio, 'k', 'amenaza_o_acoso', 'Descripción muy sensible del incidente')->assertCreated();

        $n = Notificacion::where('destinatario_id', $servicio->proveedor->user_id)->firstOrFail();
        $this->assertSame(['servicio_id' => $servicio->id], $n->datos);

        $contenido = json_encode($n->toArray());
        foreach (['amenaza_o_acoso', 'sensible', 'incidente', $servicio->cliente->name] as $secreto) {
            $this->assertStringNotContainsString($secreto, $contenido, "La notificacion filtra: {$secreto}");
        }
    }

    #[DataProvider('estadosNoPermitidos')]
    public function test_fuera_de_los_cuatro_estados_no_se_reporta_ni_se_interrumpe(string $estado): void
    {
        $servicio = $this->servicioSeguro($estado);
        Sanctum::actingAs($servicio->cliente);

        $this->reportar($servicio, 'k1')->assertStatus(422);
        $this->interrumpir($servicio, 'k2')->assertStatus(422);

        $this->assertSame(0, ReporteSeguridad::count());
        $this->assertSame($estado, $servicio->fresh()->estado);
    }

    public static function estadosNoPermitidos(): array
    {
        return array_map(fn ($e) => [$e], ['pendiente', 'completado', 'cancelado', 'rechazado', 'interrumpido_seguridad']);
    }

    public function test_tercero_admin_y_anonimo_no_reportan(): void
    {
        $servicio = $this->servicioSeguro('en_progreso');

        $this->reportar($servicio, 'k')->assertUnauthorized();
        $this->interrumpir($servicio, 'k')->assertUnauthorized();

        foreach ([$this->crearCliente(), $this->crearProveedorComprador()->user, $this->crearAdmin()] as $intruso) {
            Sanctum::actingAs($intruso);
            $this->reportar($servicio, 'k')->assertForbidden();
            $this->interrumpir($servicio, 'k')->assertForbidden();
        }

        $this->assertSame(0, ReporteSeguridad::count());
        $this->assertSame('en_progreso', $servicio->fresh()->estado);
    }

    public function test_servicio_inexistente_devuelve_404(): void
    {
        Sanctum::actingAs($this->crearCliente());

        $this->postJson('/api/servicios/99999999/seguridad/reportes', $this->cuerpo('k'))->assertNotFound();
        $this->postJson('/api/servicios/99999999/seguridad/interrumpir', $this->cuerpo('k'))->assertNotFound();
    }

    #[DataProvider('cuerposInvalidos')]
    public function test_validacion_de_campos(array $cambios, string $campo): void
    {
        $servicio = $this->servicioSeguro('en_progreso');
        Sanctum::actingAs($servicio->cliente);

        $cuerpo = array_merge($this->cuerpo('k'), $cambios);
        foreach (['reportes', 'interrumpir'] as $ruta) {
            $this->postJson("/api/servicios/{$servicio->id}/seguridad/{$ruta}", $cuerpo)
                ->assertStatus(422)->assertJsonValidationErrors($campo);
        }

        $this->assertSame(0, ReporteSeguridad::count());
        $this->assertSame('en_progreso', $servicio->fresh()->estado);
    }

    public static function cuerposInvalidos(): array
    {
        return [
            'categoria desconocida' => [['categoria' => 'inventada'], 'categoria'],
            'sin descripcion'       => [['descripcion' => ''], 'descripcion'],
            'sin clave'             => [['idempotency_key' => ''], 'idempotency_key'],
            'clave larga'           => [['idempotency_key' => str_repeat('x', 81)], 'idempotency_key'],
        ];
    }

    public function test_repetir_la_clave_no_duplica_reporte_historial_ni_notificacion(): void
    {
        $servicio = $this->servicioSeguro('en_progreso');
        Sanctum::actingAs($servicio->cliente);

        $primera = $this->reportar($servicio, 'misma')->assertCreated();
        $segunda = $this->reportar($servicio, 'misma')->assertOk();

        $this->assertSame($primera->json('reporte.id'), $segunda->json('reporte.id'));
        $this->assertSame(1, ReporteSeguridad::count());
        $this->assertSame(1, HistorialReporteSeguridad::count());
        $this->assertSame(1, Notificacion::where('tipo', 'servicio_seguridad_reporte')->count());
    }

    public function test_la_misma_clave_en_otro_tipo_o_servicio_es_un_conflicto(): void
    {
        $servicio = $this->servicioSeguro('en_progreso');
        $otro = $this->servicioSeguro('en_progreso', ['cliente_id' => $servicio->cliente_id]);
        Sanctum::actingAs($servicio->cliente);

        $this->reportar($servicio, 'k')->assertCreated();

        $this->interrumpir($servicio, 'k')->assertStatus(409);
        $this->reportar($otro, 'k')->assertStatus(409);
        $this->assertSame('en_progreso', $servicio->fresh()->estado);
        $this->assertSame(1, ReporteSeguridad::count());
    }

    // ── Interrupcion ─────────────────────────────────────────────────────────

    #[DataProvider('estadosPermitidos')]
    public function test_interrumpir_deja_servicio_terminal_con_reporte_codigos_nulos_y_notificacion(string $estado): void
    {
        foreach (['cliente', 'proveedor'] as $rol) {
            $servicio = $this->servicioSeguro($estado);
            $autor = $rol === 'cliente' ? $servicio->cliente : $servicio->proveedor->user;
            $otro = $rol === 'cliente' ? $servicio->proveedor->user : $servicio->cliente;
            Sanctum::actingAs($autor);

            $this->interrumpir($servicio, 'int-' . $rol)
                ->assertCreated()
                ->assertJsonPath('reporte.interrumpio_servicio', true)
                ->assertJsonPath('servicio.estado', 'interrumpido_seguridad');

            $fresco = $servicio->fresh();
            $this->assertSame('interrumpido_seguridad', $fresco->estado);
            $this->assertNull($fresco->codigo_inicio);
            $this->assertNull($fresco->codigo_fin);

            $reporte = ReporteSeguridad::where('servicio_id', $servicio->id)->firstOrFail();
            $this->assertTrue($reporte->interrumpio_servicio);
            $this->assertSame($estado, $reporte->estado_servicio_previo);
            $this->assertSame(1, HistorialReporteSeguridad::where('reporte_id', $reporte->id)->count());

            $this->assertSame(1, Notificacion::where('destinatario_id', $otro->id)->where('tipo', 'servicio_interrumpido_seguridad')->count());
        }
    }

    public function test_repetir_la_interrupcion_con_la_misma_clave_es_idempotente(): void
    {
        $servicio = $this->servicioSeguro('en_progreso');
        Sanctum::actingAs($servicio->cliente);

        $primera = $this->interrumpir($servicio, 'misma')->assertCreated();
        $segunda = $this->interrumpir($servicio, 'misma')->assertOk()->assertJsonPath('servicio.estado', 'interrumpido_seguridad');

        $this->assertSame($primera->json('reporte.id'), $segunda->json('reporte.id'));
        $this->assertSame(1, ReporteSeguridad::count());
        $this->assertSame(1, Notificacion::where('tipo', 'servicio_interrumpido_seguridad')->count());
    }

    public function test_la_contraparte_no_puede_interrumpir_de_nuevo_ni_ver_el_reporte(): void
    {
        $servicio = $this->servicioSeguro('en_progreso');
        Sanctum::actingAs($servicio->cliente);
        $reporteId = $this->interrumpir($servicio, 'k', 'amenaza_o_acoso', 'Texto confidencial del reporte')->json('reporte.id');

        Sanctum::actingAs($servicio->proveedor->user);
        $this->interrumpir($servicio, 'otra')->assertStatus(422);
        $this->getJson("/api/seguridad/reportes/{$reporteId}")->assertForbidden();

        $this->assertSame(1, ReporteSeguridad::count());

        // El servicio, visto por la contraparte, no expone categoria ni descripcion ni codigos.
        $json = json_encode($this->getJson("/api/servicios/{$servicio->id}")->assertOk()->json());
        $this->assertStringContainsString('interrumpido_seguridad', $json);
        foreach (['amenaza_o_acoso', 'confidencial', 'codigo_inicio', 'codigo_fin'] as $secreto) {
            $this->assertStringNotContainsString($secreto, $json);
        }
    }

    public function test_el_cliente_no_recibe_codigos_de_un_servicio_interrumpido(): void
    {
        $servicio = $this->servicioSeguro('por_confirmar');
        Sanctum::actingAs($servicio->cliente);
        $this->interrumpir($servicio, 'k')->assertCreated();

        $this->getJson("/api/servicios/{$servicio->id}")->assertOk()
            ->assertJsonPath('servicio.estado', 'interrumpido_seguridad')
            ->assertJsonMissingPath('servicio.codigo_inicio')
            ->assertJsonMissingPath('servicio.codigo_fin');
    }

    public function test_un_servicio_interrumpido_no_admite_ninguna_otra_transicion(): void
    {
        $servicio = $this->servicioSeguro('en_progreso');
        Sanctum::actingAs($servicio->cliente);
        $this->interrumpir($servicio, 'k')->assertCreated();
        $antes = $servicio->fresh()->only(['estado', 'codigo_inicio', 'codigo_fin', 'motivo_cancelacion']);

        $intentos = [
            ['cliente', 'post', "/api/servicios/{$servicio->id}/cancelar", []],
            ['cliente', 'post', "/api/servicios/{$servicio->id}/confirmar-fin", ['codigo' => '654321']],
            ['cliente', 'post', "/api/servicios/{$servicio->id}/calificar", ['puntuacion' => 5, 'comentario' => 'Muy bien todo']],
            ['proveedor', 'post', "/api/servicios/{$servicio->id}/aceptar", []],
            ['proveedor', 'post', "/api/servicios/{$servicio->id}/rechazar", []],
            ['proveedor', 'post', "/api/servicios/{$servicio->id}/iniciar", ['codigo' => '123456']],
            ['proveedor', 'post', "/api/servicios/{$servicio->id}/finalizar", []],
            ['proveedor', 'put', "/api/servicios/{$servicio->id}/estado", ['estado' => 'en_camino']],
        ];

        foreach ($intentos as [$rol, $metodo, $url, $cuerpo]) {
            Sanctum::actingAs($rol === 'cliente' ? $servicio->cliente : $servicio->proveedor->user);
            $respuesta = $this->json($metodo, $url, $cuerpo);

            $this->assertContains($respuesta->getStatusCode(), [403, 404, 409, 422], "{$metodo} {$url} devolvio {$respuesta->getStatusCode()}");
        }

        $this->assertSame($antes, $servicio->fresh()->only(['estado', 'codigo_inicio', 'codigo_fin', 'motivo_cancelacion']));
        $this->assertSame(0, $servicio->calificaciones()->count());
    }

    public function test_el_chat_del_servicio_interrumpido_queda_en_solo_lectura(): void
    {
        $servicio = $this->servicioSeguro('en_progreso');
        Mensaje::create(['emisor_id' => $servicio->cliente_id, 'receptor_id' => $servicio->proveedor->user_id, 'servicio_id' => $servicio->id, 'contenido' => 'previo']);
        Sanctum::actingAs($servicio->cliente);
        $this->interrumpir($servicio, 'k')->assertCreated();

        $this->getJson("/api/mensajes/servicios/{$servicio->id}")->assertOk()
            ->assertJsonCount(1, 'mensajes')->assertJsonPath('contexto.solo_lectura', true);
        $this->postJson("/api/mensajes/servicios/{$servicio->id}", ['contenido' => 'nuevo'])->assertStatus(409);
    }

    public function test_un_fallo_a_mitad_revierte_toda_la_interrupcion(): void
    {
        $servicio = $this->servicioSeguro('por_confirmar');
        Sanctum::actingAs($servicio->cliente);

        Notificacion::creating(function () {
            throw new \RuntimeException('fallo simulado de notificacion');
        });

        $this->interrumpir($servicio, 'k')->assertStatus(500);

        Notificacion::flushEventListeners();

        $fresco = $servicio->fresh();
        $this->assertSame('por_confirmar', $fresco->estado);
        $this->assertSame('123456', $fresco->codigo_inicio);
        $this->assertSame('654321', $fresco->codigo_fin);
        $this->assertSame(0, ReporteSeguridad::count(), 'Nunca debe existir un reporte sin la interrupcion que lo acompana.');
        $this->assertSame(0, HistorialReporteSeguridad::count());
    }

    // ── Consulta del reporte propio ──────────────────────────────────────────

    public function test_el_reportante_y_el_admin_ven_el_reporte_sin_historial_ni_notas(): void
    {
        $servicio = $this->servicioSeguro('en_progreso');
        Sanctum::actingAs($servicio->cliente);
        $id = $this->reportar($servicio, 'k')->json('reporte.id');
        HistorialReporteSeguridad::create(['reporte_id' => $id, 'actor_id' => $this->crearAdmin()->id, 'estado_anterior' => 'recibido', 'estado_nuevo' => 'en_revision', 'nota_interna' => 'nota interna del admin']);

        $propio = $this->getJson("/api/seguridad/reportes/{$id}")->assertOk()->assertJsonPath('reporte.id', $id);
        $json = json_encode($propio->json());
        $this->assertStringNotContainsString('nota interna', $json);
        $this->assertStringNotContainsString('historial', $json);

        Sanctum::actingAs($this->crearAdmin());
        $this->getJson("/api/seguridad/reportes/{$id}")->assertOk();

        Sanctum::actingAs($servicio->proveedor->user);
        $this->getJson("/api/seguridad/reportes/{$id}")->assertForbidden();

        Sanctum::actingAs($this->crearCliente());
        $this->getJson("/api/seguridad/reportes/{$id}")->assertForbidden();
        $this->getJson('/api/seguridad/reportes/99999999')->assertNotFound();
    }

    // ── Auxiliares ───────────────────────────────────────────────────────────

    private function cuerpo(string $clave, string $categoria = 'conducta_inapropiada', string $descripcion = 'Descripción del incidente reportado.'): array
    {
        return ['categoria' => $categoria, 'descripcion' => $descripcion, 'idempotency_key' => $clave];
    }

    private function reportar(Servicio $servicio, string $clave, string $categoria = 'conducta_inapropiada', string $descripcion = 'Descripción del incidente reportado.')
    {
        return $this->postJson("/api/servicios/{$servicio->id}/seguridad/reportes", $this->cuerpo($clave, $categoria, $descripcion));
    }

    private function interrumpir(Servicio $servicio, string $clave, string $categoria = 'conducta_inapropiada', string $descripcion = 'Descripción del incidente reportado.')
    {
        return $this->postJson("/api/servicios/{$servicio->id}/seguridad/interrumpir", $this->cuerpo($clave, $categoria, $descripcion));
    }
}
