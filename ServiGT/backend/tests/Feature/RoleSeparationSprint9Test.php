<?php

namespace Tests\Feature;

use App\Models\Categoria;
use App\Models\Cotizacion;
use App\Models\Pedido;
use App\Models\Proveedor;
use App\Models\Servicio;
use App\Models\User;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\Cache;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * Task 1.1 (Sprint 9) — separacion de roles y auto-adjudicacion.
 *
 * Tres puertas estaban abiertas y juntas formaban una cadena:
 *
 *   1. `POST /providers` no revisaba el rol: un cliente o un admin podia
 *      crearse un perfil de proveedor.
 *   2. `StorePedidoRequest::authorize()` solo exigia estar autenticado: un
 *      proveedor o un admin podia publicar pedidos.
 *   3. `POST /pedidos/{id}/cotizaciones` no impedia cotizar un pedido propio, y
 *      `aceptar` no impedia adjudicar una cotizacion propia.
 *
 * Con cualquiera de las dos primeras abiertas, una misma persona podia publicar
 * un pedido, cotizarlo y adjudicarselo: nacia un servicio donde cliente y
 * proveedor eran el mismo usuario. El flujo A (contratacion directa) ya tenia
 * esa guarda desde Sprint 7; el flujo B no.
 *
 * Cerrar 1 y 2 impide crear la cadena desde hoy, pero no repara los datos que
 * ya existan: un cliente que se creo perfil de proveedor antes de este cambio lo
 * conserva. Por eso `aceptar` lleva su propia guarda como ultima linea, y las
 * pruebas de datos legados insertan las filas directo, como habrian quedado.
 */
class RoleSeparationSprint9Test extends TestCase
{
    use DatabaseTransactions;

    private Categoria $categoria;
    private int $secuencia = 0;

    protected function setUp(): void
    {
        parent::setUp();
        // El limitador comparte el store `array` durante la corrida; sin esto
        // una prueba previa puede dejar contadores que devuelvan 429.
        Cache::flush();

        $this->categoria = Categoria::create([
            'nombre'      => 'Categoria roles ' . uniqid(),
            'descripcion' => 'Categoria para pruebas de separacion de roles',
        ]);
    }

    // ── 1. Perfil de proveedor: solo el rol proveedor ────────────────────────

    public function test_cliente_no_puede_crear_perfil_de_proveedor(): void
    {
        $cliente = $this->crearUsuario('cliente');
        Sanctum::actingAs($cliente);

        $this->postJson('/api/providers', $this->payloadPerfil())
            ->assertForbidden()
            ->assertJsonPath('success', false);

        $this->assertDatabaseMissing('proveedores', ['user_id' => $cliente->id]);
    }

    public function test_admin_no_puede_crear_perfil_de_proveedor(): void
    {
        $admin = $this->crearUsuario('admin');
        Sanctum::actingAs($admin);

        $this->postJson('/api/providers', $this->payloadPerfil())
            ->assertForbidden();

        $this->assertDatabaseMissing('proveedores', ['user_id' => $admin->id]);
    }

    /**
     * El rol sale de la sesion. Mandarlo en el body no debe abrir la puerta.
     */
    public function test_rol_enviado_en_el_body_no_autoriza_crear_perfil(): void
    {
        $cliente = $this->crearUsuario('cliente');
        Sanctum::actingAs($cliente);

        $this->postJson('/api/providers', $this->payloadPerfil(['role' => 'proveedor']))
            ->assertForbidden();

        $this->assertDatabaseMissing('proveedores', ['user_id' => $cliente->id]);
        $this->assertSame('cliente', $cliente->fresh()->role);
    }

    public function test_proveedor_si_crea_su_perfil(): void
    {
        $proveedor = $this->crearUsuario('proveedor');
        Sanctum::actingAs($proveedor);

        $this->postJson('/api/providers', $this->payloadPerfil())
            ->assertCreated()
            ->assertJsonPath('proveedor.user_id', $proveedor->id);
    }

    // ── 2. Pedidos: solo el rol cliente ──────────────────────────────────────

    public function test_proveedor_no_puede_publicar_pedidos(): void
    {
        $proveedor = $this->crearProveedor();
        Sanctum::actingAs($proveedor->user);

        $this->postJson('/api/pedidos', $this->payloadPedido())
            ->assertForbidden()
            ->assertJsonPath('success', false);

        $this->assertDatabaseMissing('pedidos', ['cliente_id' => $proveedor->user_id]);
    }

    public function test_admin_no_puede_publicar_pedidos(): void
    {
        $admin = $this->crearUsuario('admin');
        Sanctum::actingAs($admin);

        $this->postJson('/api/pedidos', $this->payloadPedido())
            ->assertForbidden();

        $this->assertDatabaseMissing('pedidos', ['cliente_id' => $admin->id]);
    }

    /**
     * La autorizacion corre antes que la validacion: un rol incorrecto recibe
     * 403 aunque el payload este mal, sin enterarse de las reglas del formulario.
     */
    public function test_rol_incorrecto_recibe_403_antes_que_errores_de_validacion(): void
    {
        $proveedor = $this->crearProveedor();
        Sanctum::actingAs($proveedor->user);

        $this->postJson('/api/pedidos', [])
            ->assertForbidden()
            ->assertJsonMissingPath('errors');
    }

    /**
     * El duenio del pedido sale de la sesion: un `cliente_id` en el body se
     * ignora y no permite publicar a nombre de otro.
     */
    public function test_cliente_id_del_body_no_cambia_el_duenio_del_pedido(): void
    {
        $cliente = $this->crearUsuario('cliente');
        $otro    = $this->crearUsuario('cliente');
        Sanctum::actingAs($cliente);

        $pedidoId = $this->postJson('/api/pedidos', $this->payloadPedido(['cliente_id' => $otro->id]))
            ->assertCreated()
            ->json('pedido.id');

        $this->assertDatabaseHas('pedidos', ['id' => $pedidoId, 'cliente_id' => $cliente->id]);
        $this->assertDatabaseMissing('pedidos', ['cliente_id' => $otro->id]);
    }

    // ── 3. Cotizaciones: solo proveedores, nunca sobre un pedido propio ──────

    public function test_cliente_no_puede_cotizar(): void
    {
        $pedido  = $this->crearPedido($this->crearUsuario('cliente'));
        $cliente = $this->crearUsuario('cliente');
        Sanctum::actingAs($cliente);

        $this->postJson("/api/pedidos/{$pedido->id}/cotizaciones", $this->payloadCotizacion())
            ->assertForbidden();

        $this->assertDatabaseCount('cotizaciones', 0);
    }

    /**
     * Dato legado: un cliente que se creo perfil de proveedor antes del cambio
     * lo conserva. Su rol sigue siendo cliente, asi que no debe poder cotizar,
     * y menos su propio pedido.
     */
    public function test_cliente_con_perfil_de_proveedor_legado_no_puede_cotizar(): void
    {
        $cliente = $this->crearUsuario('cliente');
        $this->crearPerfilLegado($cliente);
        $pedido = $this->crearPedido($cliente);
        Sanctum::actingAs($cliente);

        $this->postJson("/api/pedidos/{$pedido->id}/cotizaciones", $this->payloadCotizacion())
            ->assertForbidden();

        $this->assertDatabaseCount('cotizaciones', 0);
    }

    /**
     * Dato legado: un proveedor que publico un pedido antes del cambio no
     * puede cotizarlo. Es la puerta de entrada directa a la auto-adjudicacion.
     */
    public function test_proveedor_no_puede_cotizar_un_pedido_propio_legado(): void
    {
        $proveedor = $this->crearProveedor();
        $pedido    = $this->crearPedido($proveedor->user);
        Sanctum::actingAs($proveedor->user);

        $this->postJson("/api/pedidos/{$pedido->id}/cotizaciones", $this->payloadCotizacion())
            ->assertForbidden()
            ->assertJsonPath('success', false);

        $this->assertDatabaseCount('cotizaciones', 0);
    }

    // ── 4. Adjudicacion: la ultima linea ─────────────────────────────────────

    /**
     * La cadena completa con datos legados, que es lo unico que las guardas de
     * creacion no pueden prevenir: pedido propio y cotizacion propia ya en BD.
     * Adjudicarla crearia un servicio donde cliente y proveedor son la misma
     * persona.
     */
    public function test_no_se_puede_adjudicar_una_cotizacion_propia(): void
    {
        $cliente   = $this->crearUsuario('cliente');
        $perfil    = $this->crearPerfilLegado($cliente);
        $pedido    = $this->crearPedido($cliente);
        $cotizacion = $this->crearCotizacion($pedido, $perfil);
        Sanctum::actingAs($cliente);

        $this->postJson("/api/pedidos/{$pedido->id}/cotizaciones/{$cotizacion->id}/aceptar")
            ->assertForbidden()
            ->assertJsonPath('success', false);

        $this->assertDatabaseMissing('servicios', ['cliente_id' => $cliente->id]);
        $this->assertSame('abierto', $pedido->fresh()->estado);
        $this->assertSame('enviada', $cotizacion->fresh()->estado);
    }

    /**
     * Adjudicar es una accion de cliente. Un proveedor que conserve un pedido
     * legado no la ejerce, aunque la cotizacion sea de otro proveedor.
     */
    public function test_proveedor_duenio_de_pedido_legado_no_puede_adjudicar(): void
    {
        $duenio = $this->crearProveedor();
        $pedido = $this->crearPedido($duenio->user);
        $cotizacion = $this->crearCotizacion($pedido, $this->crearProveedor());
        Sanctum::actingAs($duenio->user);

        $this->postJson("/api/pedidos/{$pedido->id}/cotizaciones/{$cotizacion->id}/aceptar")
            ->assertForbidden();

        $this->assertSame(0, Servicio::where('proveedor_id', $cotizacion->proveedor_id)->count());
        $this->assertSame('abierto', $pedido->fresh()->estado);
    }

    // ── 5. El flujo legitimo sigue intacto ───────────────────────────────────

    /**
     * Cliente publica, proveedor ajeno cotiza, cliente adjudica. Debe seguir
     * funcionando de punta a punta: cerrar puertas no puede romper el flujo B.
     */
    public function test_flujo_legitimo_pedido_cotizacion_adjudicacion_sigue_funcionando(): void
    {
        $cliente   = $this->crearUsuario('cliente');
        $proveedor = $this->crearProveedor();

        Sanctum::actingAs($cliente);
        $pedidoId = $this->postJson('/api/pedidos', $this->payloadPedido())
            ->assertCreated()
            ->json('pedido.id');

        Sanctum::actingAs($proveedor->user);
        $cotizacionId = $this->postJson("/api/pedidos/{$pedidoId}/cotizaciones", $this->payloadCotizacion())
            ->assertCreated()
            ->json('cotizacion.id');

        Sanctum::actingAs($cliente);
        $this->postJson("/api/pedidos/{$pedidoId}/cotizaciones/{$cotizacionId}/aceptar")
            ->assertOk();

        $servicio = Servicio::where('cliente_id', $cliente->id)->firstOrFail();
        $this->assertSame($proveedor->id, $servicio->proveedor_id);
        $this->assertNotSame($cliente->id, $proveedor->user_id);
        $this->assertSame('adjudicado', Pedido::find($pedidoId)->estado);
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    private function crearUsuario(string $rol): User
    {
        $this->secuencia++;

        return User::create([
            'name'     => "Usuario {$rol} {$this->secuencia}",
            'email'    => "{$rol}.{$this->secuencia}." . uniqid() . '@servigt.test',
            'password' => 'password-test',
            'role'     => $rol,
        ]);
    }

    private function crearProveedor(): Proveedor
    {
        $user = $this->crearUsuario('proveedor');

        return $this->crearPerfilLegado($user);
    }

    /**
     * Inserta el perfil directo en BD, sin pasar por la API. Para un usuario con
     * rol proveedor es un fixture normal; para un cliente reproduce el dato que
     * dejaba la puerta abierta antes de este cambio.
     */
    private function crearPerfilLegado(User $user): Proveedor
    {
        $proveedor = Proveedor::create([
            'user_id'      => $user->id,
            'nombre'       => $user->name,
            'email'        => $user->email,
            'departamento' => 'Guatemala',
            'municipio'    => 'Guatemala',
            'categoria_id' => $this->categoria->id,
            'descripcion'  => 'Perfil creado para pruebas de separacion de roles',
        ]);

        return $proveedor->setRelation('user', $user);
    }

    /** Inserta el pedido directo en BD, como habria quedado un pedido legado. */
    private function crearPedido(User $duenio): Pedido
    {
        return Pedido::create([
            'cliente_id'       => $duenio->id,
            'categoria_id'     => $this->categoria->id,
            'descripcion'      => 'Descripcion de prueba suficientemente larga para el pedido',
            'direccion'        => 'Zona 1, Guatemala',
            'urgencia'         => 'media',
            'estado'           => 'abierto',
            'fecha_expiracion' => now()->addDays(7),
        ]);
    }

    private function crearCotizacion(Pedido $pedido, Proveedor $proveedor): Cotizacion
    {
        return Cotizacion::create([
            'pedido_id'    => $pedido->id,
            'proveedor_id' => $proveedor->id,
            'monto'        => 450,
            'mensaje'      => 'Cotizacion de prueba con mensaje suficientemente largo.',
            'estado'       => 'enviada',
        ]);
    }

    private function payloadPerfil(array $extra = []): array
    {
        return array_merge([
            'nombre'       => 'Perfil de prueba ' . uniqid(),
            'telefono'     => '55550101',
            'descripcion'  => 'Perfil profesional para pruebas de roles.',
            'email'        => 'perfil.' . uniqid() . '@servigt.test',
            'departamento' => 'Guatemala',
        ], $extra);
    }

    private function payloadPedido(array $extra = []): array
    {
        return array_merge([
            'descripcion'  => 'Necesito reparar una fuga de agua en la cocina',
            'categoria_id' => $this->categoria->id,
            'direccion'    => 'Zona 10, Guatemala',
            'urgencia'     => 'media',
        ], $extra);
    }

    private function payloadCotizacion(): array
    {
        return [
            'monto'   => 450,
            'mensaje' => 'Puedo atender el pedido esta semana con materiales incluidos.',
        ];
    }
}
