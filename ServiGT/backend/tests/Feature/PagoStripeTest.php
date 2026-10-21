<?php

namespace Tests\Feature;

use App\Models\Categoria;
use App\Models\CompraCredito;
use App\Models\CreditoProveedor;
use App\Models\PaqueteCredito;
use App\Models\Proveedor;
use App\Models\User;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Http\Client\Request as HttpRequest;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * Compra de creditos con Stripe Checkout: POST /api/creditos/pagos/sesion,
 * GET /api/creditos/compras/{id} y POST /api/stripe/webhook.
 * Stripe se simula con Http::fake: ninguna prueba sale a la red.
 */
class PagoStripeTest extends TestCase
{
    use DatabaseTransactions;

    private const WEBHOOK_SECRET = 'whsec_test_secreto_de_prueba';

    protected function setUp(): void
    {
        parent::setUp();

        config([
            'services.payments.driver'         => 'stripe',
            'services.stripe.secret'           => 'sk_test_falsa',
            'services.stripe.publishable'      => 'pk_test_falsa',
            'services.stripe.webhook_secret'   => self::WEBHOOK_SECRET,
            'services.stripe.currency'         => 'gtq',
            'services.stripe.base_url'         => 'https://api.stripe.test',
        ]);
    }

    // ── POST /creditos/pagos/sesion ──────────────────────────────────────────

    public function test_crea_sesion_pendiente_con_parametros_fijos_y_precio_de_bd(): void
    {
        Http::fake(['api.stripe.test/v1/checkout/sessions' => Http::response($this->sesion('cs_1'), 200)]);
        $proveedor = $this->crearProveedor();
        $paquete = PaqueteCredito::where('nombre', 'Impulso')->first();
        Sanctum::actingAs($proveedor->user);

        $respuesta = $this->postJson('/api/creditos/pagos/sesion', [
            'paquete_id'      => $paquete->id,
            'idempotency_key' => 'k-' . uniqid(),
            // Intento de manipular el precio: debe ignorarse.
            'monto'           => 1,
        ]);

        $respuesta->assertCreated()
            ->assertJsonPath('client_secret', 'cs_1_secret')
            ->assertJsonPath('publishable_key', 'pk_test_falsa')
            ->assertJsonPath('compra.estado', 'pendiente')
            ->assertJsonPath('compra.metodo_pago', 'stripe');

        $this->assertEquals(0, CreditoProveedor::where('proveedor_id', $proveedor->id)->value('saldo'));

        Http::assertSent(function (HttpRequest $r) use ($paquete) {
            $d = $r->data();

            return $r->method() === 'POST'
                && $r->hasHeader('Idempotency-Key')
                && $r->hasHeader('Stripe-Version')
                && $d['mode'] === 'payment'
                && $d['ui_mode'] === 'form'
                && $d['billing_address_collection'] === 'auto'
                && $d['phone_number_collection[enabled]'] === 'false'
                && $d['automatic_tax[enabled]'] === 'false'
                && $d['submit_type'] === 'auto'
                && $d['integration_identifier'] === 'custom_embedded_web_0001'
                && $d['line_items[0][price_data][unit_amount]'] === (int) round($paquete->precio_gtq * 100)
                && $d['line_items[0][price_data][currency]'] === 'gtq'
                && !array_key_exists('payment_method_collection', $d);
        });
    }

    public function test_reintento_con_la_misma_clave_reutiliza_compra_y_sesion(): void
    {
        Http::fake([
            'api.stripe.test/v1/checkout/sessions/cs_1' => Http::response($this->sesion('cs_1'), 200),
            'api.stripe.test/v1/checkout/sessions'      => Http::response($this->sesion('cs_1'), 200),
        ]);
        $proveedor = $this->crearProveedor();
        $paquete = PaqueteCredito::where('nombre', 'Inicial')->first();
        Sanctum::actingAs($proveedor->user);
        $cuerpo = ['paquete_id' => $paquete->id, 'idempotency_key' => 'misma-clave'];

        $primera = $this->postJson('/api/creditos/pagos/sesion', $cuerpo)->assertCreated();
        $segunda = $this->postJson('/api/creditos/pagos/sesion', $cuerpo)->assertOk();

        $this->assertSame($primera->json('compra.id'), $segunda->json('compra.id'));
        $this->assertSame(1, CompraCredito::where('proveedor_id', $proveedor->id)->count());
        // Una sola creacion en Stripe; el reintento solo consulta.
        Http::assertSentCount(2);
    }

    public function test_misma_clave_con_otro_paquete_responde_409(): void
    {
        Http::fake(['*' => Http::response($this->sesion('cs_1'), 200)]);
        $proveedor = $this->crearProveedor();
        Sanctum::actingAs($proveedor->user);
        $inicial = PaqueteCredito::where('nombre', 'Inicial')->first();
        $impulso = PaqueteCredito::where('nombre', 'Impulso')->first();

        $this->postJson('/api/creditos/pagos/sesion', ['paquete_id' => $inicial->id, 'idempotency_key' => 'c'])->assertCreated();
        $this->postJson('/api/creditos/pagos/sesion', ['paquete_id' => $impulso->id, 'idempotency_key' => 'c'])->assertStatus(409);
    }

    public function test_dos_proveedores_pueden_usar_la_misma_clave(): void
    {
        // Stripe devuelve un id distinto por cada sesion creada.
        Http::fake(fn () => Http::response($this->sesion('cs_' . uniqid()), 200));
        $paquete = PaqueteCredito::where('nombre', 'Inicial')->first();

        foreach ([$this->crearProveedor(), $this->crearProveedor()] as $proveedor) {
            Sanctum::actingAs($proveedor->user);
            $this->postJson('/api/creditos/pagos/sesion', ['paquete_id' => $paquete->id, 'idempotency_key' => 'compartida'])->assertCreated();
        }
    }

    public function test_sesion_requiere_autenticacion_y_rol_proveedor(): void
    {
        Http::fake();
        $paquete = PaqueteCredito::where('nombre', 'Inicial')->first();
        $cuerpo = ['paquete_id' => $paquete->id, 'idempotency_key' => 'x'];

        $this->postJson('/api/creditos/pagos/sesion', $cuerpo)->assertUnauthorized();

        Sanctum::actingAs($this->crearUsuario('cliente'));
        $this->postJson('/api/creditos/pagos/sesion', $cuerpo)->assertForbidden();

        Http::assertNothingSent();
    }

    public function test_sesion_valida_paquete_y_payload(): void
    {
        Http::fake();
        Sanctum::actingAs($this->crearProveedor()->user);

        $this->postJson('/api/creditos/pagos/sesion', ['paquete_id' => 999999, 'idempotency_key' => 'x'])->assertNotFound();
        $this->postJson('/api/creditos/pagos/sesion', [])->assertStatus(422);

        Http::assertNothingSent();
    }

    public function test_paquete_inactivo_no_se_puede_comprar(): void
    {
        Http::fake();
        $paquete = PaqueteCredito::where('nombre', 'Negocio')->first();
        DB::table('paquetes_creditos')->where('id', $paquete->id)->update(['activo' => false]);
        Sanctum::actingAs($this->crearProveedor()->user);

        $this->postJson('/api/creditos/pagos/sesion', ['paquete_id' => $paquete->id, 'idempotency_key' => 'x'])->assertNotFound();
    }

    public function test_driver_simulado_o_sin_claves_responde_503_sin_llamar_a_stripe(): void
    {
        Http::fake();
        Sanctum::actingAs($this->crearProveedor()->user);
        $paquete = PaqueteCredito::where('nombre', 'Inicial')->first();
        $cuerpo = ['paquete_id' => $paquete->id, 'idempotency_key' => 'x'];

        config(['services.payments.driver' => 'simulated']);
        $this->postJson('/api/creditos/pagos/sesion', $cuerpo)->assertStatus(503);

        config(['services.payments.driver' => 'stripe', 'services.stripe.secret' => '']);
        $this->postJson('/api/creditos/pagos/sesion', $cuerpo)->assertStatus(503);

        Http::assertNothingSent();
    }

    public function test_clave_live_fuera_de_produccion_se_rechaza(): void
    {
        Http::fake();
        config(['services.stripe.secret' => 'sk_live_peligrosa']);
        Sanctum::actingAs($this->crearProveedor()->user);
        $paquete = PaqueteCredito::where('nombre', 'Inicial')->first();

        $this->postJson('/api/creditos/pagos/sesion', ['paquete_id' => $paquete->id, 'idempotency_key' => 'x'])->assertStatus(503);
        Http::assertNothingSent();
    }

    public function test_error_de_stripe_deja_compra_pendiente_y_responde_502(): void
    {
        Http::fake(['*' => Http::response(['error' => ['type' => 'api_error', 'message' => 'x']], 500)]);
        $proveedor = $this->crearProveedor();
        Sanctum::actingAs($proveedor->user);
        $paquete = PaqueteCredito::where('nombre', 'Inicial')->first();

        $this->postJson('/api/creditos/pagos/sesion', ['paquete_id' => $paquete->id, 'idempotency_key' => 'x'])->assertStatus(502);

        $compra = CompraCredito::where('proveedor_id', $proveedor->id)->first();
        $this->assertSame('pendiente', $compra->estado);
        $this->assertNull($compra->stripe_session_id);
        $this->assertEquals(0, CreditoProveedor::where('proveedor_id', $proveedor->id)->value('saldo'));
    }

    public function test_sesion_expirada_cancela_la_compra_y_pide_una_nueva(): void
    {
        $proveedor = $this->crearProveedor();
        $compra = $this->crearCompraStripe($proveedor, 'Inicial', 'cs_exp');
        Http::fake(['*' => Http::response($this->sesion('cs_exp', ['status' => 'expired', 'client_secret' => null]), 200)]);
        Sanctum::actingAs($proveedor->user);

        $this->postJson('/api/creditos/pagos/sesion', [
            'paquete_id' => $compra->paquete_id, 'idempotency_key' => $compra->idempotency_key,
        ])->assertStatus(409);

        $this->assertSame('cancelada', $compra->fresh()->estado);
    }

    // ── Webhook ──────────────────────────────────────────────────────────────

    public function test_webhook_con_firma_valida_acredita_una_sola_vez(): void
    {
        $proveedor = $this->crearProveedor(saldo: 2);
        $compra = $this->crearCompraStripe($proveedor, 'Impulso', 'cs_ok');
        $evento = $this->evento('evt_1', 'checkout.session.completed', $this->sesion('cs_ok', $this->pagada($compra)));

        $this->enviarWebhook($evento)->assertOk();
        // Reintento de Stripe del MISMO evento.
        $this->enviarWebhook($evento)->assertOk();
        // Otro evento distinto para la misma sesion (p. ej. async_payment_succeeded).
        $this->enviarWebhook($this->evento('evt_2', 'checkout.session.async_payment_succeeded', $this->sesion('cs_ok', $this->pagada($compra))))->assertOk();

        $this->assertSame('completada', $compra->fresh()->estado);
        $this->assertEquals(32, CreditoProveedor::where('proveedor_id', $proveedor->id)->value('saldo')); // 2 + 30
        $this->assertSame(1, DB::table('transacciones_credito')->where('proveedor_id', $proveedor->id)->where('tipo', 'compra')->count());
        $this->assertSame(2, DB::table('stripe_eventos')->whereIn('event_id', ['evt_1', 'evt_2'])->count());
    }

    public function test_webhook_con_firma_invalida_o_ausente_se_rechaza_sin_acreditar(): void
    {
        $proveedor = $this->crearProveedor();
        $compra = $this->crearCompraStripe($proveedor, 'Inicial', 'cs_f');
        $cuerpo = json_encode($this->evento('evt_f', 'checkout.session.completed', $this->sesion('cs_f', $this->pagada($compra))));

        $this->call('POST', '/api/stripe/webhook', [], [], [], $this->cabeceras('t=' . time() . ',v1=' . str_repeat('0', 64)), $cuerpo)->assertStatus(400);
        $this->call('POST', '/api/stripe/webhook', [], [], [], $this->cabeceras(null), $cuerpo)->assertStatus(400);

        // Firma correcta pero cuerpo alterado despues de firmar.
        $firma = $this->firma($cuerpo);
        $this->call('POST', '/api/stripe/webhook', [], [], [], $this->cabeceras($firma), $cuerpo . ' ')->assertStatus(400);

        $this->assertSame('pendiente', $compra->fresh()->estado);
        $this->assertEquals(0, CreditoProveedor::where('proveedor_id', $proveedor->id)->value('saldo'));
    }

    public function test_webhook_con_marca_de_tiempo_vieja_se_rechaza(): void
    {
        $proveedor = $this->crearProveedor();
        $compra = $this->crearCompraStripe($proveedor, 'Inicial', 'cs_old');
        $cuerpo = json_encode($this->evento('evt_old', 'checkout.session.completed', $this->sesion('cs_old', $this->pagada($compra))));

        $this->call('POST', '/api/stripe/webhook', [], [], [], $this->cabeceras($this->firma($cuerpo, time() - 3600)), $cuerpo)->assertStatus(400);
        $this->assertSame('pendiente', $compra->fresh()->estado);
    }

    public function test_webhook_sin_secreto_configurado_responde_503(): void
    {
        config(['services.stripe.webhook_secret' => '']);

        $this->enviarWebhook($this->evento('evt_s', 'checkout.session.completed', $this->sesion('cs_s')))->assertStatus(503);
    }

    public function test_webhook_con_monto_distinto_no_acredita(): void
    {
        $proveedor = $this->crearProveedor();
        $compra = $this->crearCompraStripe($proveedor, 'Impulso', 'cs_m');
        $sesion = $this->sesion('cs_m', ['payment_status' => 'paid', 'amount_total' => 100, 'currency' => 'gtq']);

        $this->enviarWebhook($this->evento('evt_m', 'checkout.session.completed', $sesion))->assertOk();

        $this->assertSame('pendiente', $compra->fresh()->estado);
        $this->assertEquals(0, CreditoProveedor::where('proveedor_id', $proveedor->id)->value('saldo'));
    }

    public function test_webhook_con_moneda_distinta_no_acredita(): void
    {
        $proveedor = $this->crearProveedor();
        $compra = $this->crearCompraStripe($proveedor, 'Inicial', 'cs_c');
        $sesion = $this->sesion('cs_c', ['payment_status' => 'paid', 'amount_total' => 3900, 'currency' => 'usd']);

        $this->enviarWebhook($this->evento('evt_c', 'checkout.session.completed', $sesion))->assertOk();

        $this->assertSame('pendiente', $compra->fresh()->estado);
    }

    public function test_sesion_sin_pagar_no_acredita(): void
    {
        $proveedor = $this->crearProveedor();
        $compra = $this->crearCompraStripe($proveedor, 'Inicial', 'cs_u');

        $this->enviarWebhook($this->evento('evt_u', 'checkout.session.completed', $this->sesion('cs_u', ['payment_status' => 'unpaid'])))->assertOk();

        $this->assertSame('pendiente', $compra->fresh()->estado);
        $this->assertEquals(0, CreditoProveedor::where('proveedor_id', $proveedor->id)->value('saldo'));
    }

    public function test_webhook_expirada_cancela_y_un_pago_posterior_no_acredita(): void
    {
        $proveedor = $this->crearProveedor();
        $compra = $this->crearCompraStripe($proveedor, 'Inicial', 'cs_e');

        $this->enviarWebhook($this->evento('evt_e1', 'checkout.session.expired', $this->sesion('cs_e', ['status' => 'expired'])))->assertOk();
        $this->assertSame('cancelada', $compra->fresh()->estado);

        $this->enviarWebhook($this->evento('evt_e2', 'checkout.session.completed', $this->sesion('cs_e', $this->pagada($compra))))->assertOk();
        $this->assertSame('cancelada', $compra->fresh()->estado);
        $this->assertEquals(0, CreditoProveedor::where('proveedor_id', $proveedor->id)->value('saldo'));
    }

    public function test_pago_diferido_fallido_marca_fallida_sin_acreditar_y_luego_puede_completarse(): void
    {
        $proveedor = $this->crearProveedor();
        $compra = $this->crearCompraStripe($proveedor, 'Inicial', 'cs_a');

        $this->enviarWebhook($this->evento('evt_a1', 'checkout.session.async_payment_failed', $this->sesion('cs_a')))->assertOk();
        $this->assertSame('fallida', $compra->fresh()->estado);
        $this->assertEquals(0, CreditoProveedor::where('proveedor_id', $proveedor->id)->value('saldo'));

        $this->enviarWebhook($this->evento('evt_a2', 'checkout.session.completed', $this->sesion('cs_a', $this->pagada($compra))))->assertOk();
        $this->assertSame('completada', $compra->fresh()->estado);
        $this->assertEquals(8, CreditoProveedor::where('proveedor_id', $proveedor->id)->value('saldo'));
    }

    public function test_webhook_de_sesion_desconocida_responde_200_sin_efectos(): void
    {
        $this->enviarWebhook($this->evento('evt_z', 'checkout.session.completed', $this->sesion('cs_no_existe', ['payment_status' => 'paid'])))->assertOk();
    }

    // ── GET /creditos/compras/{id} ───────────────────────────────────────────

    public function test_estado_concilia_con_stripe_y_acredita_sin_webhook(): void
    {
        $proveedor = $this->crearProveedor();
        $compra = $this->crearCompraStripe($proveedor, 'Impulso', 'cs_rec');
        Http::fake(['api.stripe.test/v1/checkout/sessions/cs_rec' => Http::response($this->sesion('cs_rec', $this->pagada($compra)), 200)]);
        Sanctum::actingAs($proveedor->user);

        $this->getJson("/api/creditos/compras/{$compra->id}")
            ->assertOk()
            ->assertJsonPath('compra.estado', 'completada')
            ->assertJsonPath('saldo', 30);

        // Segunda consulta: ya completada, no vuelve a acreditar ni a llamar a Stripe.
        $this->getJson("/api/creditos/compras/{$compra->id}")->assertOk()->assertJsonPath('saldo', 30);
        Http::assertSentCount(1);
    }

    public function test_estado_responde_pendiente_si_stripe_no_responde(): void
    {
        $proveedor = $this->crearProveedor();
        $compra = $this->crearCompraStripe($proveedor, 'Inicial', 'cs_down');
        Http::fake(['*' => Http::response('', 500)]);
        Sanctum::actingAs($proveedor->user);

        $this->getJson("/api/creditos/compras/{$compra->id}")
            ->assertOk()
            ->assertJsonPath('compra.estado', 'pendiente')
            ->assertJsonPath('saldo', 0);
    }

    public function test_estado_de_compra_ajena_o_inexistente_es_404_y_requiere_auth(): void
    {
        Http::fake();
        $duenio = $this->crearProveedor();
        $compra = $this->crearCompraStripe($duenio, 'Inicial', 'cs_aj');

        $this->getJson("/api/creditos/compras/{$compra->id}")->assertUnauthorized();

        Sanctum::actingAs($this->crearProveedor()->user);
        $this->getJson("/api/creditos/compras/{$compra->id}")->assertNotFound();
        $this->getJson('/api/creditos/compras/99999999')->assertNotFound();

        Sanctum::actingAs($this->crearUsuario('cliente'));
        $this->getJson("/api/creditos/compras/{$compra->id}")->assertForbidden();

        Http::assertNothingSent();
    }

    // ── Compra simulada y catalogo ───────────────────────────────────────────

    public function test_compra_simulada_queda_deshabilitada_con_driver_stripe(): void
    {
        $proveedor = $this->crearProveedor();
        $paquete = PaqueteCredito::where('nombre', 'Inicial')->first();
        Sanctum::actingAs($proveedor->user);

        $this->postJson('/api/creditos/comprar', ['paquete_id' => $paquete->id, 'idempotency_key' => 'x'])->assertForbidden();

        $this->assertSame(0, CompraCredito::where('proveedor_id', $proveedor->id)->count());
        $this->assertEquals(0, CreditoProveedor::where('proveedor_id', $proveedor->id)->value('saldo'));
    }

    public function test_catalogo_expone_la_pasarela_activa(): void
    {
        Sanctum::actingAs($this->crearProveedor()->user);

        $this->getJson('/api/creditos/paquetes')->assertOk()->assertJsonPath('pasarela', 'stripe');

        config(['services.payments.driver' => 'simulated']);
        $this->getJson('/api/creditos/paquetes')->assertOk()->assertJsonPath('pasarela', 'simulated');
    }

    // ── Auxiliares ───────────────────────────────────────────────────────────

    private function sesion(string $id, array $extra = []): array
    {
        return array_merge([
            'id'             => $id,
            'object'         => 'checkout.session',
            'status'         => 'open',
            'payment_status' => 'unpaid',
            'client_secret'  => $id . '_secret',
            'amount_total'   => 3900,
            'currency'       => 'gtq',
        ], $extra);
    }

    private function pagada(CompraCredito $compra): array
    {
        return [
            'status'         => 'complete',
            'payment_status' => 'paid',
            'amount_total'   => (int) round(((float) $compra->monto_gtq) * 100),
            'currency'       => 'gtq',
        ];
    }

    private function evento(string $id, string $tipo, array $objeto): array
    {
        return ['id' => $id, 'object' => 'event', 'type' => $tipo, 'data' => ['object' => $objeto]];
    }

    private function firma(string $cuerpo, ?int $marca = null): string
    {
        $marca ??= time();

        return "t={$marca},v1=" . hash_hmac('sha256', $marca . '.' . $cuerpo, self::WEBHOOK_SECRET);
    }

    private function cabeceras(?string $firma): array
    {
        $cabeceras = ['CONTENT_TYPE' => 'application/json', 'HTTP_ACCEPT' => 'application/json'];
        if ($firma !== null) {
            $cabeceras['HTTP_STRIPE_SIGNATURE'] = $firma;
        }

        return $cabeceras;
    }

    private function enviarWebhook(array $evento)
    {
        $cuerpo = json_encode($evento);

        return $this->call('POST', '/api/stripe/webhook', [], [], [], $this->cabeceras($this->firma($cuerpo)), $cuerpo);
    }

    private function crearCompraStripe(Proveedor $proveedor, string $nombrePaquete, string $sesionId): CompraCredito
    {
        $paquete = PaqueteCredito::where('nombre', $nombrePaquete)->first();

        return CompraCredito::create([
            'proveedor_id'       => $proveedor->id,
            'paquete_id'         => $paquete->id,
            'monto_gtq'          => $paquete->precio_gtq,
            'creditos_otorgados' => $paquete->creditos_base + $paquete->creditos_bonus,
            'estado'             => 'pendiente',
            'metodo_pago'        => 'stripe',
            'referencia'         => 'SGT-' . str_pad((string) random_int(0, 9999999999), 10, '0', STR_PAD_LEFT),
            'idempotency_key'    => 'k-' . uniqid(),
            'stripe_session_id'  => $sesionId,
        ]);
    }

    private function crearUsuario(string $role): User
    {
        return User::create([
            'name'     => ucfirst($role) . ' Test',
            'email'    => uniqid($role . '.', true) . '@servigt.test',
            'password' => 'password-test',
            'role'     => $role,
        ]);
    }

    private function crearProveedor(int $saldo = 0): Proveedor
    {
        $user = $this->crearUsuario('proveedor');
        $categoria = Categoria::create([
            'nombre'      => 'Categoria stripe ' . uniqid(),
            'descripcion' => 'Categoria para pruebas de pagos Stripe',
        ]);

        $proveedor = Proveedor::create([
            'user_id'      => $user->id,
            'nombre'       => $user->name,
            'email'        => $user->email,
            'departamento' => 'Guatemala',
            'municipio'    => 'Guatemala',
            'categoria_id' => $categoria->id,
            'descripcion'  => 'Proveedor para pruebas de Stripe',
        ]);

        CreditoProveedor::create([
            'proveedor_id' => $proveedor->id,
            'saldo'        => $saldo,
            'updated_at'   => now(),
        ]);

        return $proveedor->setRelation('user', $user);
    }
}
