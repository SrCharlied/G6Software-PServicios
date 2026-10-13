<?php

namespace Tests\Feature;

use App\Models\Categoria;
use App\Models\Cotizacion;
use App\Models\Notificacion;
use App\Models\Pedido;
use App\Models\Proveedor;
use App\Models\Servicio;
use App\Models\User;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Laravel\Sanctum\Sanctum;
use PHPUnit\Framework\Attributes\DataProvider;
use Symfony\Component\HttpKernel\Exception\MethodNotAllowedHttpException;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;
use Tests\Feature\Concerns\CreaEscenarioSeguridad;
use Tests\TestCase;

/**
 * Task 2.3 — matriz automatizada de autorizacion por rol y recurso.
 *
 * Cubre los cinco casos que exige el criterio —no autenticado, rol incorrecto,
 * ownership ajeno, ID inexistente y estado invalido— sobre servicios, pedidos,
 * cotizaciones, mensajes, creditos, Premium, publicaciones y admin.
 *
 * Task 7.1 (Sprint 9) la extiende al incremento: separacion de roles (1.1),
 * bolsa y reservas de materiales, hilos de mensajes por contexto y Centro de
 * seguridad. Los fixtures de esos dominios salen de los mismos traits que usan
 * sus pruebas de task, para no mantener dos versiones de cada escenario.
 *
 * Esta dirigida por tablas y no por un test por caso a proposito: la gracia de
 * una matriz es que agregar un endpoint sea agregar una fila, y que el fallo
 * diga cual fila se rompio. Los guards concretos de autocontratacion y
 * mensajeria viven en `AutocontratacionYMensajeriaTest`; aqui solo se verifica
 * la reja perimetral.
 */
class MatrizAutorizacionTest extends TestCase
{
    use DatabaseTransactions;
    use CreaEscenarioSeguridad;

    protected function setUp(): void
    {
        parent::setUp();
        // El limitador comparte el store `array` durante toda la corrida; sin
        // esto una prueba previa puede dejar contadores que devuelvan 429
        // donde esta matriz espera 401 o 403.
        Cache::flush();
    }

    // ── Caso 1 · No autenticado ─────────────────────────────────────────

    /**
     * Toda ruta detras de `auth:sanctum` responde 401 sin token, incluidas las
     * de admin: el rechazo por falta de sesion ocurre antes del rol.
     *
     * PHPUnit 12 ya no lee `@dataProvider` desde el docblock: debe ser atributo.
     */
    #[DataProvider('rutasProtegidas')]
    public function test_ruta_protegida_sin_token_responde_401(string $metodo, string $uri): void
    {
        $this->json($metodo, $uri)->assertUnauthorized();
    }

    public static function rutasProtegidas(): array
    {
        $rutas = [
            ['GET', '/api/me'],
            ['POST', '/api/logout'],

            ['GET', '/api/providers/me'],
            ['GET', '/api/providers/user/1'],
            ['POST', '/api/providers'],
            ['PUT', '/api/providers/1'],
            ['POST', '/api/providers/1/foto'],
            ['POST', '/api/providers/1/portada'],
            ['DELETE', '/api/providers/1/portada'],
            ['GET', '/api/providers/1/documentos'],
            ['POST', '/api/providers/1/documentos'],
            ['GET', '/api/providers/1/documentos/1/descargar'],

            ['POST', '/api/servicios'],
            ['GET', '/api/servicios/proveedor'],
            ['GET', '/api/servicios/cliente'],
            ['GET', '/api/servicios/1'],
            ['POST', '/api/servicios/1/aceptar'],
            ['POST', '/api/servicios/1/rechazar'],
            ['POST', '/api/servicios/1/iniciar'],
            ['POST', '/api/servicios/1/finalizar'],
            ['POST', '/api/servicios/1/confirmar-fin'],
            ['PUT', '/api/servicios/1/estado'],
            ['POST', '/api/servicios/1/cancelar'],

            ['GET', '/api/disponibilidad/mia'],
            ['POST', '/api/disponibilidad'],

            ['POST', '/api/calificaciones'],
            ['POST', '/api/servicios/1/calificar'],

            ['POST', '/api/mensajes'],
            ['GET', '/api/mensajes/conversacion/1'],
            ['GET', '/api/mensajes/conversaciones'],
            ['GET', '/api/mensajes/hilos'],
            ['GET', '/api/mensajes/historial/1'],
            ['GET', '/api/mensajes/servicios/1'],
            ['POST', '/api/mensajes/servicios/1'],
            ['GET', '/api/mensajes/reservas/1'],
            ['POST', '/api/mensajes/reservas/1'],

            ['POST', '/api/pedidos'],
            ['GET', '/api/pedidos/mios'],
            ['POST', '/api/pedidos/1/cotizaciones'],
            ['PUT', '/api/pedidos/1/cotizaciones/1'],
            ['POST', '/api/pedidos/1/cotizaciones/1/aceptar'],

            ['GET', '/api/mi-credito'],
            ['GET', '/api/creditos/paquetes'],
            ['POST', '/api/creditos/comprar'],
            ['GET', '/api/creditos/transacciones'],

            ['POST', '/api/premium/activar'],
            ['GET', '/api/premium/mi-estado'],

            ['GET', '/api/publicaciones/mias'],
            ['POST', '/api/publicaciones'],
            ['PUT', '/api/publicaciones/1'],
            ['POST', '/api/publicaciones/1/activar'],
            ['POST', '/api/publicaciones/1/desactivar'],
            ['DELETE', '/api/publicaciones/1'],

            ['GET', '/api/materiales'],
            ['GET', '/api/materiales/mias'],
            ['POST', '/api/materiales'],
            ['GET', '/api/materiales/1'],
            ['PUT', '/api/materiales/1'],
            ['POST', '/api/materiales/1/retirar'],
            ['POST', '/api/materiales/1/vendido'],
            ['POST', '/api/materiales/1/reservas'],
            ['GET', '/api/materiales/1/reservas'],
            ['GET', '/api/reservas-material'],
            ['GET', '/api/reservas-material/1'],
            ['POST', '/api/reservas-material/1/aceptar'],
            ['POST', '/api/reservas-material/1/rechazar'],
            ['POST', '/api/reservas-material/1/cancelar'],

            ['POST', '/api/servicios/1/seguridad/reportes'],
            ['POST', '/api/servicios/1/seguridad/interrumpir'],
            ['GET', '/api/seguridad/reportes/1'],
            ['POST', '/api/seguridad/reportes/1/evidencias'],
            ['GET', '/api/seguridad/reportes/1/evidencias/1/descargar'],

            ['GET', '/api/notificaciones'],
            ['PUT', '/api/notificaciones/1/leer'],
            ['PUT', '/api/notificaciones/leer-todas'],

            ['GET', '/api/admin/stats'],
            ['GET', '/api/admin/usuarios'],
            ['GET', '/api/admin/proveedores'],
            ['GET', '/api/admin/creditos-premium'],
            ['POST', '/api/admin/proveedores/1/creditos'],
            ['GET', '/api/admin/reportes-seguridad'],
            ['GET', '/api/admin/reportes-seguridad/1'],
            ['POST', '/api/admin/reportes-seguridad/1/estado'],
        ];

        $casos = [];
        foreach ($rutas as [$metodo, $uri]) {
            $casos["{$metodo} {$uri}"] = [$metodo, $uri];
        }

        return $casos;
    }

    // ── Caso 2 · Rol incorrecto ─────────────────────────────────────────

    public function test_un_cliente_no_alcanza_endpoints_exclusivos_de_proveedor(): void
    {
        Sanctum::actingAs(User::factory()->cliente()->create());

        $this->assertDenegado('GET', '/api/publicaciones/mias');
        $this->assertDenegado('POST', '/api/publicaciones');
        $this->assertDenegado('GET', '/api/mi-credito');
        $this->assertDenegado('POST', '/api/creditos/comprar');
        $this->assertDenegado('GET', '/api/creditos/transacciones');
        $this->assertDenegado('POST', '/api/premium/activar');
        $this->assertDenegado('GET', '/api/premium/mi-estado');
        $this->assertDenegado('GET', '/api/servicios/proveedor');
        $this->assertDenegado('GET', '/api/disponibilidad/mia');
        $this->assertDenegado('POST', '/api/disponibilidad');

        // Sprint 9: el perfil de proveedor (1.1) y la bolsa de materiales.
        $this->assertDenegado('POST', '/api/providers');
        $this->assertDenegado('GET', '/api/materiales');
        $this->assertDenegado('GET', '/api/materiales/mias');
        $this->assertDenegado('POST', '/api/materiales');
        $this->assertDenegado('GET', '/api/reservas-material');
    }

    public function test_un_proveedor_no_alcanza_endpoints_exclusivos_de_cliente(): void
    {
        $proveedor = $this->crearProveedor();
        Sanctum::actingAs($proveedor->user);

        // Contratar es del cliente (guard de la task 2.3).
        $this->assertDenegado('POST', '/api/servicios', [
            'proveedor_id' => $proveedor->id,
            'descripcion'  => 'Un proveedor no contrata servicios',
        ]);

        // Publicar pedidos y adjudicar cotizaciones tambien (Sprint 9, 1.1).
        ['pedido' => $pedido, 'cotizacion' => $cotizacion] = $this->crearPedidoConCotizacion();
        $this->assertDenegado('POST', '/api/pedidos');
        $this->assertDenegado('POST', "/api/pedidos/{$pedido->id}/cotizaciones/{$cotizacion->id}/aceptar");
    }

    public function test_ningun_rol_distinto_de_admin_alcanza_el_area_administrativa(): void
    {
        $rutasAdmin = [
            ['GET', '/api/admin/stats'],
            ['GET', '/api/admin/usuarios'],
            ['GET', '/api/admin/proveedores'],
            ['GET', '/api/admin/creditos-premium'],
            ['POST', '/api/admin/proveedores/1/creditos'],
            ['GET', '/api/admin/reportes-seguridad'],
            ['GET', '/api/admin/reportes-seguridad/1'],
            ['POST', '/api/admin/reportes-seguridad/1/estado'],
        ];

        foreach (['cliente', 'proveedor'] as $rol) {
            Sanctum::actingAs(User::factory()->state(['role' => $rol])->create());

            foreach ($rutasAdmin as [$metodo, $uri]) {
                $this->json($metodo, $uri)->assertForbidden();
            }
        }
    }

    /**
     * Sprint 9: el admin modera desde su area, pero no opera la bolsa de
     * materiales ni entra a los hilos o al Centro de seguridad de un servicio
     * como si fuera una de las partes.
     */
    public function test_el_admin_no_opera_como_participante_de_materiales_mensajes_ni_seguridad(): void
    {
        $servicio = $this->servicioSeguro('en_progreso');
        Sanctum::actingAs($this->crearAdmin());

        foreach ([
            ['GET',  '/api/materiales'],
            ['GET',  '/api/reservas-material'],
            ['GET',  "/api/mensajes/servicios/{$servicio->id}"],
            ['POST', "/api/mensajes/servicios/{$servicio->id}"],
            ['POST', "/api/servicios/{$servicio->id}/seguridad/reportes"],
            ['POST', "/api/servicios/{$servicio->id}/seguridad/interrumpir"],
        ] as [$metodo, $uri]) {
            $this->assertDenegado($metodo, $uri, $this->payloadSprint9());
        }

        $this->assertSame('en_progreso', $servicio->fresh()->estado);
    }

    // ── Caso 3 · Ownership ajeno ────────────────────────────────────────

    public function test_no_se_puede_operar_un_servicio_de_terceros(): void
    {
        $servicio = $this->crearServicio('aceptado');
        $tercero  = User::factory()->cliente()->create();

        Sanctum::actingAs($tercero);

        foreach ([
            ['GET',  "/api/servicios/{$servicio->id}"],
            ['POST', "/api/servicios/{$servicio->id}/aceptar"],
            ['POST', "/api/servicios/{$servicio->id}/rechazar"],
            ['POST', "/api/servicios/{$servicio->id}/iniciar"],
            ['POST', "/api/servicios/{$servicio->id}/finalizar"],
            ['POST', "/api/servicios/{$servicio->id}/confirmar-fin"],
            ['PUT',  "/api/servicios/{$servicio->id}/estado"],
            ['POST', "/api/servicios/{$servicio->id}/calificar"],
            ['POST', "/api/servicios/{$servicio->id}/cancelar"],
            // Sprint 9: el hilo del servicio y su Centro de seguridad.
            ['GET',  "/api/mensajes/servicios/{$servicio->id}"],
            ['POST', "/api/mensajes/servicios/{$servicio->id}"],
            ['POST', "/api/servicios/{$servicio->id}/seguridad/reportes"],
            ['POST', "/api/servicios/{$servicio->id}/seguridad/interrumpir"],
        ] as [$metodo, $uri]) {
            $this->assertDenegado($metodo, $uri, array_merge(
                ['codigo' => '000000', 'estado' => 'completado', 'puntuacion' => 5],
                $this->payloadSprint9()
            ));
        }

        $this->assertSame('aceptado', $servicio->fresh()->estado);
    }

    public function test_un_tercero_no_administra_un_lote_ni_opera_reservas_ajenas(): void
    {
        $vendedor = $this->crearProveedorComprador();
        $lote = $this->crearLote($this->servicioCanceladoDesdeEnCamino($vendedor));
        $reserva = $this->crearReserva($lote, $this->crearProveedorComprador());

        Sanctum::actingAs($this->crearProveedorComprador()->user);

        foreach ([
            ['PUT',  "/api/materiales/{$lote->id}"],
            ['POST', "/api/materiales/{$lote->id}/retirar"],
            ['POST', "/api/materiales/{$lote->id}/vendido"],
            ['GET',  "/api/materiales/{$lote->id}/reservas"],
            ['GET',  "/api/reservas-material/{$reserva->id}"],
            ['POST', "/api/reservas-material/{$reserva->id}/aceptar"],
            ['POST', "/api/reservas-material/{$reserva->id}/rechazar"],
            ['POST', "/api/reservas-material/{$reserva->id}/cancelar"],
            ['GET',  "/api/mensajes/reservas/{$reserva->id}"],
            ['POST', "/api/mensajes/reservas/{$reserva->id}"],
        ] as [$metodo, $uri]) {
            $this->assertDenegado($metodo, $uri, $this->payloadSprint9());
        }

        $this->assertSame('disponible', $lote->fresh()->estado);
        $this->assertSame('pendiente', $reserva->fresh()->estado);
    }

    /**
     * Un reporte de seguridad, su evidencia y su descarga son solo de quien lo
     * escribio (el admin los ve desde su area). La contraparte del servicio y
     * un tercero quedan fuera. El autor si entra, para que el rechazo no se
     * deba a un fixture roto.
     */
    public function test_un_reporte_de_seguridad_solo_lo_ve_quien_lo_escribio(): void
    {
        $servicio = $this->servicioSeguro('en_progreso');
        $reporte = $this->crearReporte($servicio, $servicio->cliente);

        foreach ([$servicio->proveedor->user, $this->crearCliente()] as $intruso) {
            Sanctum::actingAs($intruso);

            foreach ([
                ['GET',  "/api/seguridad/reportes/{$reporte->id}"],
                ['POST', "/api/seguridad/reportes/{$reporte->id}/evidencias"],
                ['GET',  "/api/seguridad/reportes/{$reporte->id}/evidencias/1/descargar"],
            ] as [$metodo, $uri]) {
                $this->assertDenegado($metodo, $uri);
            }
        }

        Sanctum::actingAs($servicio->cliente);
        $this->getJson("/api/seguridad/reportes/{$reporte->id}")->assertOk();
    }

    public function test_no_se_puede_adjudicar_ni_editar_cotizaciones_de_un_pedido_ajeno(): void
    {
        ['pedido' => $pedido, 'cotizacion' => $cotizacion] = $this->crearPedidoConCotizacion();
        $tercero = User::factory()->cliente()->create();

        Sanctum::actingAs($tercero);

        $this->assertDenegado('POST', "/api/pedidos/{$pedido->id}/cotizaciones/{$cotizacion->id}/aceptar");
        $this->assertDenegado('PUT', "/api/pedidos/{$pedido->id}/cotizaciones/{$cotizacion->id}", [
            'monto'   => 500,
            'mensaje' => 'Intento de editar una cotizacion ajena',
        ]);
    }

    public function test_una_notificacion_ajena_no_se_puede_marcar_como_leida(): void
    {
        $dueno   = User::factory()->cliente()->create();
        $tercero = User::factory()->cliente()->create();

        $notificacion = Notificacion::create([
            'destinatario_id' => $dueno->id,
            'tipo'            => 'nueva_solicitud',
            'titulo'          => 'Notificacion del dueno',
            'mensaje'         => 'Solo su destinatario deberia poder leerla.',
        ]);

        Sanctum::actingAs($tercero);
        $this->assertDenegado('PUT', "/api/notificaciones/{$notificacion->id}/leer");

        $this->assertDatabaseHas('notificaciones', [
            'id'    => $notificacion->id,
            'leida' => false,
        ]);
    }

    // ── Caso 4 · ID inexistente ─────────────────────────────────────────

    public function test_recursos_inexistentes_responden_404(): void
    {
        $proveedor = $this->crearProveedor();
        Sanctum::actingAs($proveedor->user);

        foreach ([
            ['GET', '/api/providers/999999'],
            ['PUT', '/api/providers/999999'],
            ['GET', '/api/servicios/999999'],
            ['GET', '/api/pedidos/999999'],
            ['PUT', '/api/notificaciones/999999/leer'],
            ['PUT', '/api/pedidos/999999/cotizaciones/999999'],
        ] as [$metodo, $uri]) {
            $this->json($metodo, $uri, [
                'nombre'       => 'Nombre valido',
                'departamento' => 'Guatemala',
                'monto'        => 100,
                'mensaje'      => 'Mensaje suficientemente largo para la cotizacion.',
            ])->assertNotFound();
        }
    }

    public function test_recursos_inexistentes_del_sprint_9_responden_404(): void
    {
        Sanctum::actingAs($this->crearProveedorComprador()->user);

        foreach ([
            ['GET',  '/api/materiales/999999'],
            ['PUT',  '/api/materiales/999999'],
            ['POST', '/api/materiales/999999/retirar'],
            ['POST', '/api/materiales/999999/vendido'],
            ['POST', '/api/materiales/999999/reservas'],
            ['GET',  '/api/materiales/999999/reservas'],
            ['GET',  '/api/reservas-material/999999'],
            ['POST', '/api/reservas-material/999999/aceptar'],
            ['POST', '/api/reservas-material/999999/rechazar'],
            ['POST', '/api/reservas-material/999999/cancelar'],
            ['GET',  '/api/mensajes/servicios/999999'],
            ['POST', '/api/mensajes/servicios/999999'],
            ['GET',  '/api/mensajes/reservas/999999'],
            ['POST', '/api/mensajes/reservas/999999'],
            ['POST', '/api/servicios/999999/seguridad/reportes'],
            ['POST', '/api/servicios/999999/seguridad/interrumpir'],
            ['GET',  '/api/seguridad/reportes/999999'],
            ['POST', '/api/seguridad/reportes/999999/evidencias'],
            ['GET',  '/api/seguridad/reportes/999999/evidencias/1/descargar'],
        ] as [$metodo, $uri]) {
            $this->assertRutaRegistrada($metodo, $uri);

            $status = $this->json($metodo, $uri, $this->payloadSprint9())->getStatusCode();
            $this->assertSame(404, $status, "{$metodo} {$uri} debia responder 404 y respondio {$status}.");
        }

        Sanctum::actingAs($this->crearAdmin());
        $this->getJson('/api/admin/reportes-seguridad/999999')->assertNotFound();
        $this->postJson('/api/admin/reportes-seguridad/999999/estado', ['estado' => 'en_revision'])->assertNotFound();
    }

    public function test_un_admin_recargando_creditos_a_un_proveedor_inexistente_recibe_404(): void
    {
        Sanctum::actingAs(User::factory()->admin()->create());

        $this->postJson('/api/admin/proveedores/999999/creditos', [
            'monto'  => 5,
            'motivo' => 'Recarga a un proveedor que no existe',
        ])->assertNotFound();
    }

    // ── Caso 5 · Estado invalido ────────────────────────────────────────

    public function test_las_transiciones_de_servicio_validan_el_estado_previo(): void
    {
        // Pendiente: no se puede iniciar, finalizar, confirmar ni calificar.
        $servicio = $this->crearServicio('pendiente');
        Sanctum::actingAs($servicio->proveedor->user);

        $this->postJson("/api/servicios/{$servicio->id}/iniciar", ['codigo' => $servicio->codigo_inicio])
            ->assertStatus(422);
        $this->postJson("/api/servicios/{$servicio->id}/finalizar")->assertStatus(422);

        Sanctum::actingAs($servicio->cliente);
        $this->postJson("/api/servicios/{$servicio->id}/confirmar-fin", ['codigo' => '000000'])
            ->assertStatus(422);
        $this->postJson("/api/servicios/{$servicio->id}/calificar", ['puntuacion' => 5])
            ->assertStatus(422);
    }

    public function test_iniciar_con_codigo_incorrecto_no_avanza_el_servicio(): void
    {
        $servicio = $this->crearServicio('aceptado');
        Sanctum::actingAs($servicio->proveedor->user);

        $this->postJson("/api/servicios/{$servicio->id}/iniciar", ['codigo' => '999999'])
            ->assertStatus(422);

        $this->assertDatabaseHas('servicios', [
            'id'     => $servicio->id,
            'estado' => 'aceptado',
        ]);
    }

    public function test_no_se_adjudica_una_cotizacion_de_un_pedido_ya_cerrado(): void
    {
        ['pedido' => $pedido, 'cotizacion' => $cotizacion, 'cliente' => $cliente] = $this->crearPedidoConCotizacion();

        $pedido->update(['estado' => 'adjudicado']);

        Sanctum::actingAs($cliente);

        $this->postJson("/api/pedidos/{$pedido->id}/cotizaciones/{$cotizacion->id}/aceptar")
            ->assertStatus(422);
    }

    /**
     * Sprint 9: un representante por dominio de que cada accion valida el
     * estado previo, no solo el permiso. Los casos exhaustivos viven en las
     * pruebas de cada task.
     */
    public function test_las_acciones_del_sprint_9_validan_el_estado_previo(): void
    {
        $vendedor = $this->crearProveedorComprador();
        $comprador = $this->crearProveedorComprador();
        $vendido = $this->crearLote($this->servicioCanceladoDesdeEnCamino($vendedor), ['estado' => 'vendido']);
        $reservado = $this->crearLote($this->servicioCanceladoDesdeEnCamino($vendedor), ['estado' => 'reservado']);

        // Materiales: no se solicita un lote vendido ni se retira uno reservado.
        Sanctum::actingAs($comprador->user);
        $this->postJson("/api/materiales/{$vendido->id}/reservas", $this->payloadSprint9())->assertStatus(422);

        Sanctum::actingAs($vendedor->user);
        $this->postJson("/api/materiales/{$reservado->id}/retirar")->assertStatus(422);

        // Reservas: no se acepta una rechazada ni se cancela la de un lote vendido.
        $disponible = $this->crearLote($this->servicioCanceladoDesdeEnCamino($vendedor));
        $rechazada = $this->crearReserva($disponible, $comprador, ['estado' => 'rechazada']);
        $this->postJson("/api/reservas-material/{$rechazada->id}/aceptar")->assertStatus(422);

        $aceptada = $this->crearReserva($vendido, $comprador, ['estado' => 'aceptada']);
        $this->postJson("/api/reservas-material/{$aceptada->id}/cancelar")->assertStatus(422);

        // Seguridad: un servicio completado ya no se interrumpe.
        $completado = $this->servicioSeguro('completado');
        Sanctum::actingAs($completado->cliente);
        $this->postJson("/api/servicios/{$completado->id}/seguridad/interrumpir", $this->payloadSprint9())->assertStatus(422);

        // Mensajes: un servicio interrumpido conserva su chat solo para leer.
        $interrumpido = $this->servicioSeguro('interrumpido_seguridad');
        Sanctum::actingAs($interrumpido->cliente);
        $this->postJson("/api/mensajes/servicios/{$interrumpido->id}", $this->payloadSprint9())->assertStatus(409);

        $this->assertSame('completado', $completado->fresh()->estado);
        $this->assertSame('aceptada', $aceptada->fresh()->estado);
    }

    // ── Helpers ─────────────────────────────────────────────────────────

    /**
     * Un 404 del router (una fila con la ruta mal escrita) tambien "deniega", y
     * haria pasar en falso la fila. Cada fila que acepta 404 debe apuntar a una
     * ruta registrada.
     */
    private function assertRutaRegistrada(string $metodo, string $uri): void
    {
        try {
            app('router')->getRoutes()->match(Request::create($uri, $metodo));
        } catch (NotFoundHttpException|MethodNotAllowedHttpException) {
            $this->fail("{$metodo} {$uri} no corresponde a ninguna ruta registrada.");
        }

        $this->addToAssertionCount(1);
    }

    /**
     * Cuerpo valido para los endpoints del Sprint 9 que validan antes de
     * autorizar (reportes de seguridad, solicitudes de reserva). Con el, un
     * rechazo solo puede venir del permiso, la existencia o el estado, nunca
     * de la validacion del formulario.
     */
    private function payloadSprint9(): array
    {
        return [
            'contenido'       => 'Mensaje de la matriz de autorizacion',
            'mensaje_inicial' => 'Me interesa el lote de la matriz',
            'categoria'       => 'otro',
            'descripcion'     => 'Descripcion valida de la matriz de autorizacion',
            'idempotency_key' => 'matriz-' . uniqid(),
        ];
    }

    /**
     * Un rechazo valido es 401, 403 o 404 segun el recurso: algunos endpoints
     * ocultan la existencia del recurso ajeno en vez de admitirla con un 403.
     * Lo que esta matriz garantiza es que **nunca** responden 2xx.
     */
    private function assertDenegado(string $metodo, string $uri, array $payload = []): void
    {
        $this->assertRutaRegistrada($metodo, $uri);

        $status = $this->json($metodo, $uri, $payload)->getStatusCode();

        $this->assertContains(
            $status,
            [401, 403, 404],
            "{$metodo} {$uri} debia denegar el acceso y respondio {$status}."
        );
    }

    private function crearServicio(string $estado): Servicio
    {
        $proveedor = $this->crearProveedor();
        $cliente   = User::factory()->cliente()->create();

        $servicio = Servicio::create([
            'cliente_id'    => $cliente->id,
            'proveedor_id'  => $proveedor->id,
            'descripcion'   => 'Servicio de apoyo para la matriz de autorizacion',
            'estado'        => $estado,
            'codigo_inicio' => '123456',
        ]);

        return $servicio
            ->setRelation('proveedor', $proveedor)
            ->setRelation('cliente', $cliente);
    }

    private function crearPedidoConCotizacion(): array
    {
        $proveedor = $this->crearProveedor();
        $cliente   = User::factory()->cliente()->create();

        $pedido = Pedido::create([
            'cliente_id'       => $cliente->id,
            'categoria_id'     => $proveedor->categoria_id,
            'descripcion'      => 'Pedido de apoyo para la matriz de autorizacion',
            'direccion'        => 'Zona 1',
            'urgencia'         => 'media',
            'estado'           => 'abierto',
            'fecha_expiracion' => now()->addDays(7),
        ]);

        $cotizacion = Cotizacion::create([
            'pedido_id'    => $pedido->id,
            'proveedor_id' => $proveedor->id,
            'monto'        => 400,
            'mensaje'      => 'Cotizacion de apoyo para la matriz de autorizacion.',
            'estado'       => 'enviada',
        ]);

        return compact('pedido', 'cotizacion', 'cliente', 'proveedor');
    }

    private function crearProveedor(): Proveedor
    {
        $categoria = Categoria::factory()->create();
        $user      = User::factory()->proveedor()->create();

        $proveedor = Proveedor::create([
            'user_id'      => $user->id,
            'nombre'       => $user->name,
            'email'        => $user->email,
            'departamento' => 'Guatemala',
            'municipio'    => 'Guatemala',
            'categoria_id' => $categoria->id,
            'descripcion'  => 'Proveedor de apoyo para la matriz de autorizacion.',
        ]);

        return $proveedor->setRelation('user', $user);
    }
}
