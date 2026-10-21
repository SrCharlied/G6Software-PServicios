<?php

namespace Tests\Feature;

use App\Models\Categoria;
use App\Models\CreditoProveedor;
use App\Models\PagoPremium;
use App\Models\Proveedor;
use App\Models\User;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Http\Client\Request as HttpRequest;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * Premium con Stripe: /api/premium/pagos/sesion, /api/premium/pagos/{id},
 * /api/premium/suscripcion/cancelar y los eventos de webhook de Premium.
 */
class PagoPremiumStripeTest extends TestCase
{
    use DatabaseTransactions;

    private const WEBHOOK_SECRET = 'whsec_test_secreto_de_prueba';

    protected function setUp(): void
    {
        parent::setUp();

        config([
            'services.payments.driver'       => 'stripe',
            'services.stripe.secret'         => 'sk_test_falsa',
            'services.stripe.publishable'    => 'pk_test_falsa',
            'services.stripe.webhook_secret' => self::WEBHOOK_SECRET,
            'services.stripe.currency'       => 'gtq',
            'services.stripe.base_url'       => 'https://api.stripe.test',
        ]);
    }

    // ── Sesion de pago ───────────────────────────────────────────────────────

    public function test_pago_unico_crea_sesion_en_modo_payment(): void
    {
        Http::fake(['api.stripe.test/v1/checkout/sessions' => Http::response($this->sesion('cs_p1'), 200)]);
        $proveedor = $this->crearProveedor();
        Sanctum::actingAs($proveedor->user);

        $this->postJson('/api/premium/pagos/sesion', ['recurrente' => false, 'idempotency_key' => 'p-' . uniqid()])
            ->assertCreated()
            ->assertJsonPath('client_secret', 'cs_p1_secret')
            ->assertJsonPath('pago.estado', 'pendiente')
            ->assertJsonPath('pago.recurrente', false);

        // Pagar no activa nada: solo el webhook o la conciliacion lo hacen.
        $this->assertNull($proveedor->fresh()->premium_vence_at);

        Http::assertSent(function (HttpRequest $r) {
            $d = $r->data();

            return $d['mode'] === 'payment'
                && $d['ui_mode'] === 'form'
                && $d['submit_type'] === 'auto'
                && $d['line_items[0][price_data][unit_amount]'] === 11500
                && $d['metadata[tipo]'] === 'premium'
                && !array_key_exists('payment_method_collection', $d)
                && !array_key_exists('line_items[0][price_data][recurring][interval]', $d);
        });
    }

    public function test_suscripcion_crea_sesion_en_modo_subscription_mensual(): void
    {
        Http::fake(['api.stripe.test/v1/checkout/sessions' => Http::response($this->sesion('cs_s1'), 200)]);
        Sanctum::actingAs($this->crearProveedor()->user);

        $this->postJson('/api/premium/pagos/sesion', ['recurrente' => true, 'idempotency_key' => 's-' . uniqid()])
            ->assertCreated()
            ->assertJsonPath('pago.recurrente', true);

        Http::assertSent(function (HttpRequest $r) {
            $d = $r->data();

            return $d['mode'] === 'subscription'
                && $d['line_items[0][price_data][recurring][interval]'] === 'month'
                && $d['payment_method_collection'] === 'always'
                && $d['line_items[0][price_data][unit_amount]'] === 11500
                // submit_type solo es valido en modo payment.
                && !array_key_exists('submit_type', $d);
        });
    }

    public function test_reintento_con_la_misma_clave_no_crea_otro_pago_ni_otra_sesion(): void
    {
        Http::fake([
            'api.stripe.test/v1/checkout/sessions/cs_r' => Http::response($this->sesion('cs_r'), 200),
            'api.stripe.test/v1/checkout/sessions'      => Http::response($this->sesion('cs_r'), 200),
        ]);
        $proveedor = $this->crearProveedor();
        Sanctum::actingAs($proveedor->user);
        $cuerpo = ['recurrente' => false, 'idempotency_key' => 'misma'];

        $a = $this->postJson('/api/premium/pagos/sesion', $cuerpo)->assertCreated();
        $b = $this->postJson('/api/premium/pagos/sesion', $cuerpo)->assertOk();

        $this->assertSame($a->json('pago.id'), $b->json('pago.id'));
        $this->assertSame(1, PagoPremium::where('proveedor_id', $proveedor->id)->count());
        Http::assertSentCount(2);

        // Misma clave con otra modalidad no se acepta.
        $this->postJson('/api/premium/pagos/sesion', ['recurrente' => true, 'idempotency_key' => 'misma'])->assertStatus(409);
    }

    public function test_con_premium_activo_no_se_vuelve_a_cobrar(): void
    {
        Http::fake();
        $proveedor = $this->crearProveedor(premiumVence: now()->addDays(10));
        Sanctum::actingAs($proveedor->user);

        $this->postJson('/api/premium/pagos/sesion', ['recurrente' => false, 'idempotency_key' => 'x'])->assertStatus(409);
        Http::assertNothingSent();
    }

    public function test_sesion_valida_rol_auth_y_payload_y_estado_de_la_pasarela(): void
    {
        Http::fake();
        $cuerpo = ['recurrente' => false, 'idempotency_key' => 'x'];

        $this->postJson('/api/premium/pagos/sesion', $cuerpo)->assertUnauthorized();

        Sanctum::actingAs($this->crearUsuario('cliente'));
        $this->postJson('/api/premium/pagos/sesion', $cuerpo)->assertForbidden();

        Sanctum::actingAs($this->crearProveedor()->user);
        $this->postJson('/api/premium/pagos/sesion', ['idempotency_key' => 'x'])->assertStatus(422);

        config(['services.payments.driver' => 'simulated']);
        $this->postJson('/api/premium/pagos/sesion', $cuerpo)->assertStatus(503);

        Http::assertNothingSent();
    }

    public function test_error_de_stripe_responde_502_y_no_activa_premium(): void
    {
        Http::fake(['*' => Http::response(['error' => ['type' => 'api_error']], 500)]);
        $proveedor = $this->crearProveedor();
        Sanctum::actingAs($proveedor->user);

        $this->postJson('/api/premium/pagos/sesion', ['recurrente' => false, 'idempotency_key' => 'x'])->assertStatus(502);

        $this->assertNull($proveedor->fresh()->premium_vence_at);
    }

    public function test_la_activacion_gratuita_queda_deshabilitada_con_stripe(): void
    {
        $proveedor = $this->crearProveedor();
        Sanctum::actingAs($proveedor->user);

        $this->postJson('/api/premium/activar')->assertForbidden();

        $this->assertNull($proveedor->fresh()->premium_vence_at);
        $this->assertEquals(0, CreditoProveedor::where('proveedor_id', $proveedor->id)->value('saldo'));
    }

    // ── Webhook: pago unico ──────────────────────────────────────────────────

    public function test_pago_unico_activa_30_dias_y_acredita_el_bono_una_sola_vez(): void
    {
        $proveedor = $this->crearProveedor();
        $pago = $this->crearPago($proveedor, false, 'cs_u');
        $evento = $this->evento('evt_u1', 'checkout.session.completed', $this->sesionPagada('cs_u'));

        $this->enviarWebhook($evento)->assertOk();
        $this->enviarWebhook($evento)->assertOk(); // mismo evento
        $this->enviarWebhook($this->evento('evt_u2', 'checkout.session.async_payment_succeeded', $this->sesionPagada('cs_u')))->assertOk();

        $proveedor = $proveedor->fresh();
        $this->assertSame('activo', $proveedor->premiumEstado());
        $this->assertEquals(1, $proveedor->premium_renovaciones);
        $this->assertEqualsWithDelta(30, now()->diffInDays($proveedor->premium_vence_at, false), 1);
        $this->assertFalse($proveedor->premium_recurrente);
        $this->assertSame('completada', $pago->fresh()->estado);
        $this->assertEquals(10, CreditoProveedor::where('proveedor_id', $proveedor->id)->value('saldo'));
        $this->assertSame(1, DB::table('transacciones_credito')->where('proveedor_id', $proveedor->id)->where('tipo', 'bono')->count());
    }

    public function test_monto_incorrecto_no_activa_premium(): void
    {
        $proveedor = $this->crearProveedor();
        $this->crearPago($proveedor, false, 'cs_m');

        $this->enviarWebhook($this->evento('evt_m', 'checkout.session.completed', $this->sesionPagada('cs_m', ['amount_total' => 100])))->assertOk();

        $this->assertNull($proveedor->fresh()->premium_vence_at);
        $this->assertEquals(0, CreditoProveedor::where('proveedor_id', $proveedor->id)->value('saldo'));
    }

    public function test_sesion_expirada_cancela_el_pago_y_un_pago_posterior_no_activa(): void
    {
        $proveedor = $this->crearProveedor();
        $pago = $this->crearPago($proveedor, false, 'cs_e');

        $this->enviarWebhook($this->evento('evt_e1', 'checkout.session.expired', $this->sesion('cs_e', ['status' => 'expired'])))->assertOk();
        $this->assertSame('cancelada', $pago->fresh()->estado);

        $this->enviarWebhook($this->evento('evt_e2', 'checkout.session.completed', $this->sesionPagada('cs_e')))->assertOk();
        $this->assertNull($proveedor->fresh()->premium_vence_at);
    }

    public function test_un_pago_sobre_premium_vigente_suma_30_dias_al_vencimiento(): void
    {
        $vence = now()->addDays(10);
        $proveedor = $this->crearProveedor(premiumVence: $vence);
        $this->crearPago($proveedor, false, 'cs_x');

        $this->enviarWebhook($this->evento('evt_x', 'checkout.session.completed', $this->sesionPagada('cs_x')))->assertOk();

        $this->assertEqualsWithDelta(40, now()->diffInDays($proveedor->fresh()->premium_vence_at, false), 1);
    }

    // ── Webhook: suscripcion ─────────────────────────────────────────────────

    public function test_suscripcion_activa_premium_y_guarda_cliente_y_suscripcion(): void
    {
        $proveedor = $this->crearProveedor();
        $pago = $this->crearPago($proveedor, true, 'cs_sub');

        $this->enviarWebhook($this->evento('evt_s1', 'checkout.session.completed', $this->sesionPagada('cs_sub', [
            'mode' => 'subscription', 'customer' => 'cus_1', 'subscription' => 'sub_1', 'invoice' => 'in_1',
        ])))->assertOk();

        $proveedor = $proveedor->fresh();
        $this->assertSame('activo', $proveedor->premiumEstado());
        $this->assertTrue($proveedor->premium_recurrente);
        $this->assertFalse($proveedor->premium_cancela_al_final);
        $this->assertSame('sub_1', $proveedor->stripe_subscription_id);
        $this->assertSame('cus_1', $proveedor->stripe_customer_id);
        $this->assertSame('completada', $pago->fresh()->estado);
        $this->assertEquals(10, CreditoProveedor::where('proveedor_id', $proveedor->id)->value('saldo'));

        // El invoice.paid del primer cobro no duplica ni extiende.
        $this->enviarWebhook($this->evento('evt_s2', 'invoice.paid', $this->factura('in_1', 'sub_1', 'subscription_create')))->assertOk();
        $this->assertEquals(10, CreditoProveedor::where('proveedor_id', $proveedor->id)->value('saldo'));
        $this->assertEquals(1, $proveedor->fresh()->premium_renovaciones);
    }

    public function test_renovacion_mensual_extiende_y_acredita_una_vez_por_factura(): void
    {
        $proveedor = $this->crearProveedor(premiumVence: now()->addDays(2), suscripcion: 'sub_r');
        $vencimientoInicial = $proveedor->premium_vence_at->copy();

        $factura = $this->evento('evt_r1', 'invoice.paid', $this->factura('in_r1', 'sub_r', 'subscription_cycle'));
        $this->enviarWebhook($factura)->assertOk();
        $this->enviarWebhook($factura)->assertOk(); // reintento del mismo evento
        $this->enviarWebhook($this->evento('evt_r2', 'invoice.paid', $this->factura('in_r1', 'sub_r', 'subscription_cycle')))->assertOk(); // misma factura, otro evento

        $proveedor = $proveedor->fresh();
        $this->assertEqualsWithDelta(30, $vencimientoInicial->diffInDays($proveedor->premium_vence_at, false), 1);
        $this->assertEquals(10, CreditoProveedor::where('proveedor_id', $proveedor->id)->value('saldo'));

        // Una factura distinta es otro ciclo.
        $this->enviarWebhook($this->evento('evt_r3', 'invoice.paid', $this->factura('in_r2', 'sub_r', 'subscription_cycle')))->assertOk();
        $this->assertEquals(20, CreditoProveedor::where('proveedor_id', $proveedor->id)->value('saldo'));
    }

    public function test_factura_con_formato_nuevo_de_api_tambien_renueva(): void
    {
        $proveedor = $this->crearProveedor(premiumVence: now()->addDays(2), suscripcion: 'sub_n');
        $factura = [
            'id' => 'in_n1', 'billing_reason' => 'subscription_cycle', 'amount_paid' => 11500,
            'parent' => ['subscription_details' => ['subscription' => 'sub_n']],
        ];

        $this->enviarWebhook($this->evento('evt_n1', 'invoice.paid', $factura))->assertOk();

        $this->assertEquals(10, CreditoProveedor::where('proveedor_id', $proveedor->id)->value('saldo'));
    }

    public function test_factura_de_suscripcion_desconocida_o_con_monto_malo_no_hace_nada(): void
    {
        $proveedor = $this->crearProveedor(premiumVence: now()->addDays(2), suscripcion: 'sub_k');

        $this->enviarWebhook($this->evento('evt_k1', 'invoice.paid', $this->factura('in_k1', 'sub_desconocida', 'subscription_cycle')))->assertOk();
        $this->enviarWebhook($this->evento('evt_k2', 'invoice.paid', array_merge($this->factura('in_k2', 'sub_k', 'subscription_cycle'), ['amount_paid' => 500])))->assertOk();

        $this->assertEquals(0, CreditoProveedor::where('proveedor_id', $proveedor->id)->value('saldo'));
    }

    public function test_eventos_de_suscripcion_sincronizan_cancelacion_sin_quitar_la_vigencia(): void
    {
        $vence = now()->addDays(15);
        $proveedor = $this->crearProveedor(premiumVence: $vence, suscripcion: 'sub_c', recurrente: true);

        $this->enviarWebhook($this->evento('evt_c1', 'customer.subscription.updated', [
            'id' => 'sub_c', 'status' => 'active', 'cancel_at_period_end' => true,
        ]))->assertOk();
        $this->assertTrue($proveedor->fresh()->premium_cancela_al_final);

        $this->enviarWebhook($this->evento('evt_c2', 'customer.subscription.deleted', ['id' => 'sub_c', 'status' => 'canceled']))->assertOk();

        $proveedor = $proveedor->fresh();
        $this->assertFalse($proveedor->premium_recurrente);
        $this->assertFalse($proveedor->premium_cancela_al_final);
        // La vigencia pagada se respeta.
        $this->assertSame('activo', $proveedor->premiumEstado());
        $this->assertEquals($vence->timestamp, $proveedor->premium_vence_at->timestamp);
    }

    public function test_el_historial_no_muestra_la_clave_interna_del_ciclo_en_el_bono(): void
    {
        $proveedor = $this->crearProveedor();
        $this->crearPago($proveedor, false, 'cs_h');
        $this->enviarWebhook($this->evento('evt_h', 'checkout.session.completed', $this->sesionPagada('cs_h')))->assertOk();
        Sanctum::actingAs($proveedor->user);

        $this->getJson('/api/creditos/transacciones')
            ->assertOk()
            ->assertJsonPath('transacciones.0.tipo', 'bono')
            ->assertJsonPath('transacciones.0.motivo', 'Bono mensual Premium');

        // La clave sigue guardada: es lo que hace idempotente el bono.
        $this->assertTrue(DB::table('transacciones_credito')
            ->where('proveedor_id', $proveedor->id)
            ->where('motivo', 'like', 'Bono mensual Premium (premium-%')
            ->exists());
    }

    // ── Cancelar suscripcion ─────────────────────────────────────────────────

    public function test_cancelar_programa_la_baja_al_final_del_ciclo_y_mantiene_premium(): void
    {
        Http::fake(['api.stripe.test/v1/subscriptions/sub_x' => Http::response(['id' => 'sub_x', 'cancel_at_period_end' => true], 200)]);
        $vence = now()->addDays(12);
        $proveedor = $this->crearProveedor(premiumVence: $vence, suscripcion: 'sub_x', recurrente: true);
        Sanctum::actingAs($proveedor->user);

        $this->postJson('/api/premium/suscripcion/cancelar')
            ->assertOk()
            ->assertJsonPath('estado', 'activo')
            ->assertJsonPath('recurrente', true)
            ->assertJsonPath('cancela_al_final', true)
            ->assertJsonPath('proximo_cobro_at', null);

        Http::assertSent(fn (HttpRequest $r) => $r->method() === 'POST'
            && str_ends_with($r->url(), '/v1/subscriptions/sub_x')
            && $r->data()['cancel_at_period_end'] === 'true');

        $proveedor = $proveedor->fresh();
        $this->assertTrue($proveedor->premium_cancela_al_final);
        $this->assertSame('activo', $proveedor->premiumEstado());
        $this->assertEquals($vence->timestamp, $proveedor->premium_vence_at->timestamp);

        // Idempotente: una segunda cancelacion no vuelve a llamar a Stripe.
        $this->postJson('/api/premium/suscripcion/cancelar')->assertOk();
        Http::assertSentCount(1);
    }

    public function test_cancelar_sin_suscripcion_responde_409(): void
    {
        Http::fake();
        $proveedor = $this->crearProveedor(premiumVence: now()->addDays(5)); // pago unico
        Sanctum::actingAs($proveedor->user);

        $this->postJson('/api/premium/suscripcion/cancelar')->assertStatus(409);
        Http::assertNothingSent();
    }

    public function test_si_stripe_falla_al_cancelar_no_se_marca_como_cancelada(): void
    {
        Http::fake(['*' => Http::response(['error' => ['type' => 'api_error']], 500)]);
        $proveedor = $this->crearProveedor(premiumVence: now()->addDays(5), suscripcion: 'sub_f', recurrente: true);
        Sanctum::actingAs($proveedor->user);

        $this->postJson('/api/premium/suscripcion/cancelar')->assertStatus(502);

        $this->assertFalse($proveedor->fresh()->premium_cancela_al_final);
    }

    public function test_cancelar_requiere_auth_y_rol_proveedor(): void
    {
        Http::fake();
        $this->postJson('/api/premium/suscripcion/cancelar')->assertUnauthorized();

        Sanctum::actingAs($this->crearUsuario('cliente'));
        $this->postJson('/api/premium/suscripcion/cancelar')->assertForbidden();
    }

    // ── Estado ───────────────────────────────────────────────────────────────

    public function test_estado_del_pago_concilia_con_stripe_y_activa_sin_webhook(): void
    {
        $proveedor = $this->crearProveedor();
        $pago = $this->crearPago($proveedor, false, 'cs_rec');
        Http::fake(['api.stripe.test/v1/checkout/sessions/cs_rec' => Http::response($this->sesionPagada('cs_rec'), 200)]);
        Sanctum::actingAs($proveedor->user);

        $this->getJson("/api/premium/pagos/{$pago->id}")
            ->assertOk()
            ->assertJsonPath('pago.estado', 'completada')
            ->assertJsonPath('premium.estado', 'activo');

        $this->getJson("/api/premium/pagos/{$pago->id}")->assertOk();
        Http::assertSentCount(1);
        $this->assertEquals(10, CreditoProveedor::where('proveedor_id', $proveedor->id)->value('saldo'));
    }

    public function test_estado_de_pago_ajeno_o_inexistente_es_404(): void
    {
        Http::fake();
        $pago = $this->crearPago($this->crearProveedor(), false, 'cs_aj');
        $this->getJson("/api/premium/pagos/{$pago->id}")->assertUnauthorized();

        Sanctum::actingAs($this->crearProveedor()->user);
        $this->getJson("/api/premium/pagos/{$pago->id}")->assertNotFound();
        $this->getJson('/api/premium/pagos/99999999')->assertNotFound();
    }

    public function test_mi_estado_expone_renovacion_y_proximo_cobro(): void
    {
        $vence = now()->addDays(20);
        $proveedor = $this->crearProveedor(premiumVence: $vence, suscripcion: 'sub_e', recurrente: true);
        Sanctum::actingAs($proveedor->user);

        $respuesta = $this->getJson('/api/premium/mi-estado')->assertOk()
            ->assertJsonPath('recurrente', true)
            ->assertJsonPath('cancela_al_final', false);
        $this->assertNotNull($respuesta->json('proximo_cobro_at'));

        $proveedor->forceFill(['premium_cancela_al_final' => true])->save();
        $this->getJson('/api/premium/mi-estado')->assertJsonPath('proximo_cobro_at', null);
    }

    // ── Auxiliares ───────────────────────────────────────────────────────────

    private function sesion(string $id, array $extra = []): array
    {
        return array_merge([
            'id' => $id, 'object' => 'checkout.session', 'status' => 'open', 'payment_status' => 'unpaid',
            'client_secret' => $id . '_secret', 'amount_total' => 11500, 'currency' => 'gtq',
            'metadata' => ['tipo' => 'premium'],
        ], $extra);
    }

    private function sesionPagada(string $id, array $extra = []): array
    {
        return $this->sesion($id, array_merge(['status' => 'complete', 'payment_status' => 'paid'], $extra));
    }

    private function factura(string $id, string $suscripcion, string $motivo): array
    {
        return ['id' => $id, 'billing_reason' => $motivo, 'subscription' => $suscripcion, 'amount_paid' => 11500];
    }

    private function evento(string $id, string $tipo, array $objeto): array
    {
        return ['id' => $id, 'object' => 'event', 'type' => $tipo, 'data' => ['object' => $objeto]];
    }

    private function enviarWebhook(array $evento)
    {
        $cuerpo = json_encode($evento);
        $marca = time();
        $firma = "t={$marca},v1=" . hash_hmac('sha256', $marca . '.' . $cuerpo, self::WEBHOOK_SECRET);

        return $this->call('POST', '/api/stripe/webhook', [], [], [], [
            'CONTENT_TYPE' => 'application/json', 'HTTP_ACCEPT' => 'application/json', 'HTTP_STRIPE_SIGNATURE' => $firma,
        ], $cuerpo);
    }

    private function crearPago(Proveedor $proveedor, bool $recurrente, string $sesionId): PagoPremium
    {
        return PagoPremium::create([
            'proveedor_id'      => $proveedor->id,
            'recurrente'        => $recurrente,
            'estado'            => 'pendiente',
            'referencia'        => 'PRM-' . str_pad((string) random_int(0, 9999999999), 10, '0', STR_PAD_LEFT),
            'idempotency_key'   => 'k-' . uniqid(),
            'stripe_session_id' => $sesionId,
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

    private function crearProveedor($premiumVence = null, ?string $suscripcion = null, bool $recurrente = false): Proveedor
    {
        $user = $this->crearUsuario('proveedor');
        $categoria = Categoria::create([
            'nombre'      => 'Categoria premium stripe ' . uniqid(),
            'descripcion' => 'Categoria para pruebas de Premium con Stripe',
        ]);

        $proveedor = Proveedor::create([
            'user_id'      => $user->id,
            'nombre'       => $user->name,
            'email'        => $user->email,
            'departamento' => 'Guatemala',
            'municipio'    => 'Guatemala',
            'categoria_id' => $categoria->id,
            'descripcion'  => 'Proveedor para pruebas de Premium Stripe',
        ]);

        if ($premiumVence || $suscripcion) {
            $proveedor->forceFill([
                'premium_inicio_at'        => $premiumVence ? now()->subDays(20) : null,
                'premium_vence_at'         => $premiumVence,
                'premium_recurrente'       => $recurrente || $suscripcion !== null,
                'stripe_subscription_id'   => $suscripcion,
            ])->save();
        }

        CreditoProveedor::create(['proveedor_id' => $proveedor->id, 'saldo' => 0, 'updated_at' => now()]);

        return $proveedor->setRelation('user', $user);
    }
}
