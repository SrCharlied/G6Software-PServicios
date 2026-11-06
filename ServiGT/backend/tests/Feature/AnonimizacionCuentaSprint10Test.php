<?php

namespace Tests\Feature;

use App\Models\Calificacion;
use App\Models\CompraCredito;
use App\Models\Cotizacion;
use App\Models\Disponibilidad;
use App\Models\DocumentoProveedor;
use App\Models\PaqueteCredito;
use App\Models\Pedido;
use App\Models\Proveedor;
use App\Models\PublicacionServicio;
use App\Models\SolicitudEliminacionCuenta;
use App\Models\User;
use App\Services\AnonimizacionCuentaService;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use RuntimeException;
use Tests\Feature\Concerns\CreaEscenarioMateriales;
use Tests\TestCase;

/**
 * HU 3.1.b (Sprint 10): eliminar la cuenta = anonimizar + revocar acceso, sin
 * DELETE de users ni cascadas. Politicas ratificadas 2026-11-05: bloqueo
 * estricto, admins fuera del flujo y tombstone conservando el historial.
 */
class AnonimizacionCuentaSprint10Test extends TestCase
{
    use DatabaseTransactions;
    use CreaEscenarioMateriales;

    private const PASSWORD = 'password-test';

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('public');
        Storage::fake('local');
    }

    // ── Permisos y validacion ───────────────────────────────────────────

    public function test_requiere_autenticacion(): void
    {
        $this->getJson('/api/cuenta/eliminacion/impacto')->assertUnauthorized();
        $this->postJson('/api/cuenta/eliminacion', $this->cuerpo())->assertUnauthorized();
    }

    public function test_admin_recibe_403_antes_de_validar_y_conserva_su_cuenta(): void
    {
        $admin = User::factory()->admin()->create();
        Sanctum::actingAs($admin);

        $this->getJson('/api/cuenta/eliminacion/impacto')->assertForbidden();
        $this->postJson('/api/cuenta/eliminacion', [])->assertForbidden();
        $this->postJson('/api/cuenta/eliminacion', $this->cuerpo(['password' => 'password']))->assertForbidden();

        $this->assertSame('activa', $admin->fresh()->estado_cuenta);
        $this->assertDatabaseMissing('solicitudes_eliminacion_cuenta', ['user_id' => $admin->id]);
    }

    public function test_exige_la_palabra_eliminar_y_clave_de_idempotencia(): void
    {
        $cliente = $this->crearCliente();
        Sanctum::actingAs($cliente);

        $this->postJson('/api/cuenta/eliminacion', $this->cuerpo(['confirmacion' => 'eliminar']))
            ->assertUnprocessable()->assertJsonValidationErrors('confirmacion');
        $this->postJson('/api/cuenta/eliminacion', $this->cuerpo(['idempotency_key' => '   ']))
            ->assertUnprocessable()->assertJsonValidationErrors('idempotency_key');

        $this->assertSame('activa', $cliente->fresh()->estado_cuenta);
    }

    public function test_contrasena_incorrecta_no_toca_la_cuenta_ni_las_sesiones(): void
    {
        $cliente = $this->crearCliente();
        $token = $cliente->createToken('auth-token')->plainTextToken;

        $this->withToken($token)
            ->postJson('/api/cuenta/eliminacion', $this->cuerpo(['password' => 'otra-clave']))
            ->assertUnprocessable()->assertJsonValidationErrors('password');

        $this->assertSame('activa', $cliente->fresh()->estado_cuenta);
        $this->assertSame(1, $cliente->tokens()->count());
        $this->assertDatabaseMissing('solicitudes_eliminacion_cuenta', ['user_id' => $cliente->id]);
    }

    // ── Cliente ─────────────────────────────────────────────────────────

    public function test_cliente_queda_anonimizado_sin_sesiones_y_con_historial(): void
    {
        $cliente = $this->crearCliente();
        $emailOriginal = $cliente->email;
        $token = $cliente->createToken('auth-token')->plainTextToken;
        $cliente->createToken('otro-dispositivo');

        $historico = $this->servicioConEstado('completado');
        $historico->update(['cliente_id' => $cliente->id]);

        [$pedido, $enviada, $retirada] = $this->pedidoAbiertoConCotizaciones($cliente);
        $usuarios = User::count();

        $this->withToken($token)->postJson('/api/cuenta/eliminacion', $this->cuerpo())
            ->assertOk()
            ->assertJsonPath('solicitud.estado', SolicitudEliminacionCuenta::COMPLETADA);

        $fresco = $cliente->fresh();
        $this->assertNotNull($fresco, 'La fila de users nunca se borra.');
        $this->assertSame(User::count(), $usuarios);
        $this->assertSame('anonimizada', $fresco->estado_cuenta);
        $this->assertNotNull($fresco->anonimizada_at);
        $this->assertSame(AnonimizacionCuentaService::NOMBRE_TOMBSTONE, $fresco->name);
        $this->assertSame("eliminado+{$cliente->id}@servigt.invalid", $fresco->email);
        $this->assertNull($fresco->telefono);
        $this->assertSame(0, $fresco->tokens()->count(), 'Se revocan todas las sesiones.');

        // El token usado ya no autentica y las credenciales viejas no entran.
        $this->app['auth']->forgetGuards();
        $this->withToken($token)->getJson('/api/me')->assertUnauthorized();
        $this->postJson('/api/login', ['email' => $emailOriginal, 'password' => self::PASSWORD])->assertUnauthorized();

        // Historial retenido; operaciones abiertas cerradas.
        $this->assertSame($cliente->id, (int) $historico->fresh()->cliente_id);
        $this->assertSame('cerrado', $pedido->fresh()->estado);
        $this->assertSame('rechazada', $enviada->fresh()->estado);
        $this->assertSame('retirada', $retirada->fresh()->estado);
    }

    // ── Proveedor ───────────────────────────────────────────────────────

    public function test_proveedor_limpia_perfil_y_archivos_y_conserva_lo_transaccional(): void
    {
        $proveedor = $this->crearProveedorComprador();
        $id = $proveedor->id;
        Storage::disk('public')->put("fotos/{$id}/a.jpg", 'x');
        Storage::disk('public')->put("publicaciones/{$id}/c.jpg", 'x');
        Storage::disk('local')->put("documentos/{$id}/dpi.pdf", 'x');
        $proveedor->update([
            'foto_perfil'         => "/storage/fotos/{$id}/a.jpg",
            'experiencia_resumen' => 'Diez annos de experiencia',
        ]);
        $publicacion = PublicacionServicio::create([
            'proveedor_id' => $id, 'titulo' => 'Servicio', 'descripcion' => 'Descripcion',
            'imagen' => "/storage/publicaciones/{$id}/c.jpg", 'estado' => 'activa',
        ]);
        $documento = DocumentoProveedor::create([
            'proveedor_id' => $id, 'tipo_documento' => 'DPI',
            'nombre_archivo' => 'DPI Juan Perez.pdf', 'ruta_archivo' => "documentos/{$id}/dpi.pdf",
        ]);
        Disponibilidad::create(['proveedor_id' => $id, 'dia_semana' => 1, 'hora_inicio' => '08:00', 'hora_fin' => '17:00']);

        $completado = $this->servicioConEstado('completado', $proveedor);
        $calificacion = Calificacion::create([
            'servicio_id' => $completado->id, 'autor_id' => $completado->cliente_id,
            'destinatario_id' => $proveedor->user_id, 'puntuacion' => 5, 'comentario' => 'Excelente',
        ]);
        $compra = $this->compra($proveedor, 'completada');

        $pedidoAjeno = Pedido::create([
            'cliente_id' => $this->crearCliente()->id, 'descripcion' => 'Pedido ajeno abierto',
            'estado' => 'abierto', 'fecha_expiracion' => now()->addDays(5),
        ]);
        $miCotizacion = Cotizacion::create([
            'pedido_id' => $pedidoAjeno->id, 'proveedor_id' => $id, 'monto' => 100,
            'mensaje' => 'Mi oferta', 'estado' => 'enviada',
        ]);

        Sanctum::actingAs($proveedor->user);
        $this->postJson('/api/cuenta/eliminacion', $this->cuerpo())->assertOk();

        $perfil = Proveedor::find($id);
        $this->assertNotNull($perfil, 'La fila de proveedores nunca se borra.');
        $this->assertSame(AnonimizacionCuentaService::NOMBRE_PROVEEDOR_TOMBSTONE, $perfil->nombre);
        $this->assertSame("eliminado+p{$id}@servigt.invalid", $perfil->email);
        foreach (['telefono', 'descripcion', 'experiencia_resumen', 'foto_perfil', 'portada', 'color_acento'] as $campo) {
            $this->assertNull($perfil->{$campo}, "{$campo} debe quedar vacio");
        }
        $this->assertSame(0, Disponibilidad::where('proveedor_id', $id)->count());
        $this->assertSame('inactiva', $publicacion->fresh()->estado);
        $this->assertNull($publicacion->fresh()->imagen);
        $this->assertSame('documento-eliminado', $documento->fresh()->nombre_archivo);
        $this->assertSame('retirada', $miCotizacion->fresh()->estado);
        $this->assertSame('abierto', $pedidoAjeno->fresh()->estado, 'El pedido de otro cliente no se toca.');

        // Archivos borrados despues del commit.
        Storage::disk('public')->assertMissing("fotos/{$id}/a.jpg");
        Storage::disk('public')->assertMissing("publicaciones/{$id}/c.jpg");
        Storage::disk('local')->assertMissing("documentos/{$id}/dpi.pdf");

        // Retencion: servicio, calificacion y compra siguen ahi.
        $this->assertNotNull($completado->fresh());
        $this->assertNotNull($calificacion->fresh());
        $this->assertSame('completada', $compra->fresh()->estado);

        // Fuera del catalogo y sin solicitudes nuevas.
        $this->getJson("/api/providers/{$id}")->assertNotFound();
        Sanctum::actingAs($this->crearCliente());
        $this->postJson('/api/servicios', ['proveedor_id' => $id, 'descripcion' => 'Necesito un trabajo'])
            ->assertNotFound();
    }

    // ── Bloqueos ────────────────────────────────────────────────────────

    public function test_servicio_activo_bloquea_con_409_y_tras_resolverlo_se_puede_reintentar(): void
    {
        $cliente = $this->crearCliente();
        $activo = $this->servicioConEstado('en_progreso');
        $activo->update(['cliente_id' => $cliente->id]);
        Sanctum::actingAs($cliente);

        $this->postJson('/api/cuenta/eliminacion', $this->cuerpo(['idempotency_key' => 'intento-1']))
            ->assertStatus(409)
            ->assertJsonPath('bloqueos.0.codigo', 'servicios_activos')
            ->assertJsonPath('bloqueos.0.cantidad', 1);

        $this->assertSame('activa', $cliente->fresh()->estado_cuenta);
        $this->assertDatabaseHas('solicitudes_eliminacion_cuenta', [
            'user_id' => $cliente->id, 'estado' => 'rechazada', 'motivo_rechazo' => 'servicios_activos',
        ]);

        $activo->update(['estado' => 'completado']);

        $this->postJson('/api/cuenta/eliminacion', $this->cuerpo(['idempotency_key' => 'intento-2']))->assertOk();
        $this->assertSame('anonimizada', $cliente->fresh()->estado_cuenta);
    }

    public function test_bloqueos_del_proveedor_por_servicio_reserva_compra_y_premium(): void
    {
        $proveedor = $this->crearProveedorComprador();
        $this->servicioConEstado('aceptado', $proveedor);

        // Reserva pendiente como comprador, sobre el lote de otro proveedor.
        $loteAjeno = $this->crearLote($this->servicioCanceladoDesdeEnCamino());
        $this->crearReserva($loteAjeno, $proveedor);

        $this->compra($proveedor, 'pendiente');
        $proveedor->forceFill([
            'premium_recurrente'       => true,
            'premium_cancela_al_final' => false,
            'stripe_subscription_id'   => 'sub_test_' . uniqid(),
            'premium_inicio_at'        => now()->subDays(3),
            'premium_vence_at'         => now()->addDays(27),
        ])->save();

        Sanctum::actingAs($proveedor->user);

        $impacto = $this->getJson('/api/cuenta/eliminacion/impacto')->assertOk()
            ->assertJsonPath('puede_eliminar', false);
        $this->assertEqualsCanonicalizing(
            ['servicios_activos', 'reservas_material', 'compras_pendientes', 'premium_recurrente'],
            array_column($impacto->json('bloqueos'), 'codigo')
        );

        $this->postJson('/api/cuenta/eliminacion', $this->cuerpo())->assertStatus(409);
        $this->assertSame('activa', $proveedor->user->fresh()->estado_cuenta);
        $this->assertNotSame(AnonimizacionCuentaService::NOMBRE_PROVEEDOR_TOMBSTONE, $proveedor->fresh()->nombre);
    }

    public function test_reserva_aceptada_sobre_un_lote_propio_tambien_bloquea(): void
    {
        $vendedor = $this->crearProveedorComprador();
        $lote = $this->crearLote($this->servicioCanceladoDesdeEnCamino($vendedor));
        $this->crearReserva($lote, $this->crearProveedorComprador(), ['estado' => 'aceptada']);
        Sanctum::actingAs($vendedor->user);

        $this->getJson('/api/cuenta/eliminacion/impacto')->assertOk()
            ->assertJsonPath('bloqueos.0.codigo', 'reservas_material');
    }

    public function test_impacto_sin_bloqueos_informa_lo_que_se_cerrara(): void
    {
        $cliente = $this->crearCliente();
        $this->pedidoAbiertoConCotizaciones($cliente);
        Sanctum::actingAs($cliente);

        $this->getJson('/api/cuenta/eliminacion/impacto')->assertOk()
            ->assertJsonPath('puede_eliminar', true)
            ->assertJsonPath('bloqueos', [])
            ->assertJsonPath('se_cerrara.pedidos_abiertos', 1)
            ->assertJsonPath('se_cerrara.cotizaciones_enviadas', 0);
    }

    // ── Idempotencia y rollback ─────────────────────────────────────────

    public function test_repetir_la_misma_clave_no_anonimiza_dos_veces(): void
    {
        $cliente = $this->crearCliente();
        $servicio = app(AnonimizacionCuentaService::class);

        $primera = $servicio->eliminar($cliente, 'misma-clave');
        $momento = $cliente->fresh()->anonimizada_at;
        $segunda = $servicio->eliminar($cliente->fresh(), 'misma-clave');

        $this->assertSame($primera->id, $segunda->id);
        $this->assertEquals($momento, $cliente->fresh()->anonimizada_at);
        $this->assertSame(1, SolicitudEliminacionCuenta::where('user_id', $cliente->id)->count());
    }

    public function test_un_fallo_revierte_todo_y_el_reintento_converge(): void
    {
        $proveedor = $this->crearProveedorComprador();
        Storage::disk('public')->put("fotos/{$proveedor->id}/a.jpg", 'x');
        $proveedor->update(['foto_perfil' => "/storage/fotos/{$proveedor->id}/a.jpg"]);
        $nombre = $proveedor->nombre;
        $user = $proveedor->user;
        $user->createToken('auth-token');

        Proveedor::saving(function () {
            throw new RuntimeException('fallo simulado al anonimizar el perfil');
        });

        try {
            app(AnonimizacionCuentaService::class)->eliminar($user, 'intento-a');
            $this->fail('Debio propagarse el fallo.');
        } catch (RuntimeException) {
        }

        // Nada a medias: cuenta, perfil, sesiones y archivo intactos.
        $this->assertSame('activa', $user->fresh()->estado_cuenta);
        $this->assertSame($nombre, $proveedor->fresh()->nombre);
        $this->assertSame(1, $user->tokens()->count());
        Storage::disk('public')->assertExists("fotos/{$proveedor->id}/a.jpg");
        $pendiente = SolicitudEliminacionCuenta::where('user_id', $user->id)->sole();
        $this->assertSame(SolicitudEliminacionCuenta::PENDIENTE, $pendiente->estado);

        Proveedor::flushEventListeners();

        // Otra clave converge a la misma solicitud pendiente y termina.
        $final = app(AnonimizacionCuentaService::class)->eliminar($user->fresh(), 'intento-b');
        $this->assertSame($pendiente->id, $final->id);
        $this->assertSame(SolicitudEliminacionCuenta::COMPLETADA, $final->estado);
        $this->assertSame('anonimizada', $user->fresh()->estado_cuenta);
        Storage::disk('public')->assertMissing("fotos/{$proveedor->id}/a.jpg");
    }

    // ── Helpers ─────────────────────────────────────────────────────────

    private function cuerpo(array $cambios = []): array
    {
        return array_replace([
            'password'        => self::PASSWORD,
            'confirmacion'    => 'ELIMINAR',
            'idempotency_key' => 'eliminar-' . uniqid(),
        ], $cambios);
    }

    /** @return array{0:Pedido, 1:Cotizacion, 2:Cotizacion} */
    private function pedidoAbiertoConCotizaciones(User $cliente): array
    {
        $pedido = Pedido::create([
            'cliente_id' => $cliente->id, 'descripcion' => 'Pedido abierto de prueba',
            'estado' => 'abierto', 'fecha_expiracion' => now()->addDays(5),
        ]);
        $enviada = Cotizacion::create([
            'pedido_id' => $pedido->id, 'proveedor_id' => $this->crearProveedorComprador()->id,
            'monto' => 150, 'mensaje' => 'Oferta enviada', 'estado' => 'enviada',
        ]);
        $retirada = Cotizacion::create([
            'pedido_id' => $pedido->id, 'proveedor_id' => $this->crearProveedorComprador()->id,
            'monto' => 180, 'mensaje' => 'Oferta retirada', 'estado' => 'retirada',
        ]);

        return [$pedido, $enviada, $retirada];
    }

    private function compra(Proveedor $proveedor, string $estado): CompraCredito
    {
        $paquete = PaqueteCredito::query()->firstOrFail();

        return CompraCredito::create([
            'proveedor_id'       => $proveedor->id,
            'paquete_id'         => $paquete->id,
            'monto_gtq'          => $paquete->precio_gtq ?? 39,
            'creditos_otorgados' => 8,
            'estado'             => $estado,
            'referencia'         => strtoupper(substr('T' . uniqid(), 0, 20)),
            'idempotency_key'    => 'compra-' . uniqid(),
            'completada_at'      => $estado === 'completada' ? now() : null,
        ]);
    }
}
