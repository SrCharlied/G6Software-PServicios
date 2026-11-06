<?php

namespace Tests\Feature;

use App\Models\Categoria;
use App\Models\CompraCredito;
use App\Models\CreditoProveedor;
use App\Models\PaqueteCredito;
use App\Models\Proveedor;
use App\Models\User;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\DB;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * HU 4.1 — comprobante informativo de compras de creditos.
 *
 * GET /api/creditos/compras/{id}/comprobante, snapshot inmutable guardado al
 * completar la compra e idempotencia de POST /api/creditos/comprar.
 *
 * Nota para quien amplie el alcance (p. ej. PDF, FEL o comprobantes de
 * historicas): estas pruebas fijan que el comprobante es informativo, que solo
 * existe para compras completadas despues de HU 4.1 y que no cambia. Agrega
 * regresion aqui si cambia esa regla.
 */
class ComprobanteCompraTest extends TestCase
{
    use DatabaseTransactions;

    // ── Snapshot al comprar ──────────────────────────────────────────────

    public function test_compra_nueva_guarda_snapshot_con_la_referencia_como_folio(): void
    {
        $proveedor = $this->crearProveedor();
        $paquete = PaqueteCredito::where('nombre', 'Impulso')->first();
        Sanctum::actingAs($proveedor->user);

        $respuesta = $this->postJson('/api/creditos/comprar', [
            'paquete_id' => $paquete->id, 'idempotency_key' => 'k-' . uniqid(),
        ])->assertCreated()->assertJsonPath('compra.comprobante_disponible', true);

        $compra = CompraCredito::findOrFail($respuesta->json('compra.id'));
        $snapshot = $compra->comprobante_snapshot;

        $this->assertSame($compra->referencia, $snapshot['folio']);
        $this->assertSame('Impulso', $snapshot['paquete']['nombre']);
        $this->assertSame(25, $snapshot['paquete']['creditos_base']);
        $this->assertSame(5, $snapshot['paquete']['creditos_bonus']);
        $this->assertSame(30, $snapshot['creditos_otorgados']);
        $this->assertSame('115.00', $snapshot['monto_gtq']);
        $this->assertSame('GTQ', $snapshot['moneda']);
        $this->assertSame('simulado', $snapshot['metodo_pago']);
        $this->assertSame($proveedor->id, $snapshot['proveedor']['id']);
        $this->assertNotNull($compra->comprobante_emitido_at);
    }

    public function test_el_snapshot_no_guarda_datos_de_tarjeta_ni_bancarios(): void
    {
        $proveedor = $this->crearProveedor();
        $paquete = PaqueteCredito::where('nombre', 'Inicial')->first();
        Sanctum::actingAs($proveedor->user);

        $this->postJson('/api/creditos/comprar', ['paquete_id' => $paquete->id, 'idempotency_key' => 'k-' . uniqid()])
            ->assertCreated();

        $json = strtolower(json_encode(CompraCredito::latest('id')->first()->comprobante_snapshot));
        foreach (['card', 'tarjeta', 'cvv', 'iban', 'stripe_session'] as $dato) {
            $this->assertStringNotContainsString($dato, $json);
        }
    }

    // ── GET comprobante ──────────────────────────────────────────────────

    public function test_propietario_consulta_su_comprobante_con_leyenda_sin_validez_fiscal(): void
    {
        [$proveedor, $compraId] = $this->comprar('Profesional');

        $this->getJson("/api/creditos/compras/{$compraId}/comprobante")
            ->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('comprobante.paquete.nombre', 'Profesional')
            ->assertJsonPath('comprobante.creditos_otorgados', 135)
            ->assertJsonPath('comprobante.monto_gtq', '459.00')
            ->assertJsonPath('comprobante.sin_validez_fiscal', true)
            ->assertJsonPath('comprobante.folio', CompraCredito::find($compraId)->referencia);

        $leyenda = $this->getJson("/api/creditos/compras/{$compraId}/comprobante")->json('comprobante.leyenda');
        $this->assertStringContainsString('No tiene validez fiscal', $leyenda);
    }

    public function test_consultar_repetidamente_devuelve_lo_mismo_y_no_escribe(): void
    {
        [, $compraId] = $this->comprar('Inicial');
        $antes = DB::table('compras_creditos')->where('id', $compraId)->first();

        $primera = $this->getJson("/api/creditos/compras/{$compraId}/comprobante")->assertOk()->json();
        $segunda = $this->getJson("/api/creditos/compras/{$compraId}/comprobante")->assertOk()->json();

        $this->assertSame($primera['comprobante'], $segunda['comprobante']);
        $this->assertEquals($antes, DB::table('compras_creditos')->where('id', $compraId)->first());
    }

    public function test_comprobante_ajeno_o_inexistente_responde_404(): void
    {
        [, $compraId] = $this->comprar('Inicial');
        $otro = $this->crearProveedor();
        Sanctum::actingAs($otro->user);

        $this->getJson("/api/creditos/compras/{$compraId}/comprobante")->assertNotFound();
        $this->getJson('/api/creditos/compras/999999999/comprobante')->assertNotFound();
    }

    public function test_comprobante_requiere_autenticacion_y_rol_proveedor(): void
    {
        [, $compraId] = $this->comprar('Inicial');
        $this->app['auth']->forgetGuards();

        $this->getJson("/api/creditos/compras/{$compraId}/comprobante")->assertUnauthorized();

        Sanctum::actingAs($this->crearUsuario('cliente'));
        $this->getJson("/api/creditos/compras/{$compraId}/comprobante")->assertForbidden();
    }

    public function test_compra_historica_completada_sin_snapshot_no_tiene_comprobante(): void
    {
        $proveedor = $this->crearProveedor();
        $compra = $this->insertarCompra($proveedor, 'completada');
        Sanctum::actingAs($proveedor->user);

        $this->getJson("/api/creditos/compras/{$compra->id}/comprobante")->assertNotFound();
    }

    public function test_compra_no_completada_responde_409(): void
    {
        $proveedor = $this->crearProveedor();
        Sanctum::actingAs($proveedor->user);

        foreach (['pendiente', 'fallida', 'cancelada'] as $estado) {
            $compra = $this->insertarCompra($proveedor, $estado);
            $this->getJson("/api/creditos/compras/{$compra->id}/comprobante")->assertStatus(409);
        }
    }

    // ── Inmutabilidad (trigger en PostgreSQL) ────────────────────────────

    public function test_el_snapshot_no_se_puede_modificar_y_el_paquete_nuevo_no_lo_altera(): void
    {
        [, $compraId] = $this->comprar('Impulso');
        $original = CompraCredito::find($compraId)->comprobante_snapshot;

        // Cambiar el precio del paquete despues de la compra no toca el comprobante.
        PaqueteCredito::where('nombre', 'Impulso')->update(['precio_gtq' => 999]);
        $this->assertSame($original, CompraCredito::find($compraId)->comprobante_snapshot);

        $this->assertUpdateRechazado($compraId, ['comprobante_snapshot' => json_encode(['folio' => 'otro'])]);
        $this->assertUpdateRechazado($compraId, ['monto_gtq' => 1]);
        $this->assertUpdateRechazado($compraId, ['referencia' => 'SGT-0000000001']);
        $this->assertUpdateRechazado($compraId, ['comprobante_snapshot' => null, 'comprobante_emitido_at' => null]);
        $this->assertSame($original, CompraCredito::find($compraId)->comprobante_snapshot);
    }

    public function test_una_compra_historica_ya_completada_no_puede_recibir_snapshot(): void
    {
        $proveedor = $this->crearProveedor();
        $compra = $this->insertarCompra($proveedor, 'completada');

        $this->assertUpdateRechazado($compra->id, [
            'comprobante_snapshot'   => json_encode(['folio' => $compra->referencia]),
            'comprobante_emitido_at' => now(),
        ]);
        $this->assertNull(CompraCredito::find($compra->id)->comprobante_snapshot);
    }

    public function test_no_puede_haber_snapshot_en_una_compra_no_completada(): void
    {
        $proveedor = $this->crearProveedor();
        $compra = $this->insertarCompra($proveedor, 'pendiente');

        $this->assertUpdateRechazado($compra->id, [
            'comprobante_snapshot'   => json_encode(['folio' => $compra->referencia]),
            'comprobante_emitido_at' => now(),
        ]);
    }

    // ── Historial ────────────────────────────────────────────────────────

    public function test_historial_marca_solo_las_compras_con_comprobante(): void
    {
        $proveedor = $this->crearProveedor();
        $paquete = PaqueteCredito::where('nombre', 'Inicial')->first();
        Sanctum::actingAs($proveedor->user);

        $nueva = $this->postJson('/api/creditos/comprar', [
            'paquete_id' => $paquete->id, 'idempotency_key' => 'k-' . uniqid(),
        ])->assertCreated()->json('compra.id');

        // Compra historica: completada y acreditada antes de HU 4.1, sin snapshot.
        $historica = $this->insertarCompra($proveedor, 'completada');
        DB::table('transacciones_credito')->insert([
            'proveedor_id' => $proveedor->id, 'tipo' => 'compra', 'monto' => 8,
            'motivo' => 'Compra de creditos: Inicial', 'referencia_id' => $historica->id,
            'created_at' => now()->subDay(),
        ]);
        DB::table('transacciones_credito')->insert([
            'proveedor_id' => $proveedor->id, 'tipo' => 'bono', 'monto' => 10,
            'motivo' => 'Bono mensual Premium', 'referencia_id' => $nueva,
            'created_at' => now()->subDays(2),
        ]);

        $porTipoYId = collect($this->getJson('/api/creditos/transacciones')->assertOk()->json('transacciones'))
            ->mapWithKeys(fn ($t) => [$t['tipo'] . ':' . $t['referencia_id'] => $t['comprobante_disponible']]);

        $this->assertTrue($porTipoYId["compra:{$nueva}"]);
        $this->assertFalse($porTipoYId["compra:{$historica->id}"]);
        $this->assertFalse($porTipoYId["bono:{$nueva}"]);
    }

    // ── Idempotencia de comprar ──────────────────────────────────────────

    public function test_reintento_con_la_misma_clave_no_duplica_compra_ni_comprobante(): void
    {
        $proveedor = $this->crearProveedor(saldo: 1);
        $paquete = PaqueteCredito::where('nombre', 'Inicial')->first();
        Sanctum::actingAs($proveedor->user);
        $cuerpo = ['paquete_id' => $paquete->id, 'idempotency_key' => 'misma-clave'];

        $primera = $this->postJson('/api/creditos/comprar', $cuerpo)->assertCreated();
        $segunda = $this->postJson('/api/creditos/comprar', $cuerpo)->assertOk()
            ->assertJsonPath('saldo', 9);

        $this->assertSame($primera->json('compra.id'), $segunda->json('compra.id'));
        $this->assertSame(1, CompraCredito::where('proveedor_id', $proveedor->id)->count());
        $this->assertEquals(9, CreditoProveedor::where('proveedor_id', $proveedor->id)->value('saldo'));
    }

    public function test_misma_clave_con_otro_paquete_responde_409_sin_acreditar(): void
    {
        $proveedor = $this->crearProveedor();
        Sanctum::actingAs($proveedor->user);
        $inicial = PaqueteCredito::where('nombre', 'Inicial')->first();
        $impulso = PaqueteCredito::where('nombre', 'Impulso')->first();

        $this->postJson('/api/creditos/comprar', ['paquete_id' => $inicial->id, 'idempotency_key' => 'c'])->assertCreated();
        $this->postJson('/api/creditos/comprar', ['paquete_id' => $impulso->id, 'idempotency_key' => 'c'])
            ->assertStatus(409);

        $this->assertEquals(8, CreditoProveedor::where('proveedor_id', $proveedor->id)->value('saldo'));
        $this->assertSame(1, CompraCredito::where('proveedor_id', $proveedor->id)->count());
    }

    public function test_el_saldo_de_la_respuesta_es_el_vigente_en_bd(): void
    {
        $proveedor = $this->crearProveedor(saldo: 3);
        $paquete = PaqueteCredito::where('nombre', 'Inicial')->first();
        Sanctum::actingAs($proveedor->user);
        $cuerpo = ['paquete_id' => $paquete->id, 'idempotency_key' => 'saldo-vigente'];

        $this->postJson('/api/creditos/comprar', $cuerpo)->assertCreated()->assertJsonPath('saldo', 11);

        // El saldo cambia por otra via (p. ej. gasto) y el reintento lo refleja.
        CreditoProveedor::where('proveedor_id', $proveedor->id)->update(['saldo' => 4]);

        $this->postJson('/api/creditos/comprar', $cuerpo)->assertOk()->assertJsonPath('saldo', 4);
    }

    // ── Helpers ──────────────────────────────────────────────────────────

    private function assertUpdateRechazado(int $compraId, array $cambios): void
    {
        try {
            DB::transaction(fn () => DB::table('compras_creditos')->where('id', $compraId)->update($cambios));
            $this->fail('El UPDATE debio ser rechazado por la base de datos.');
        } catch (QueryException $e) {
            $this->assertNotEmpty($e->getMessage());
        }
    }

    /** @return array{0: Proveedor, 1: int} */
    private function comprar(string $nombrePaquete): array
    {
        $proveedor = $this->crearProveedor();
        $paquete = PaqueteCredito::where('nombre', $nombrePaquete)->first();
        Sanctum::actingAs($proveedor->user);

        $id = $this->postJson('/api/creditos/comprar', [
            'paquete_id' => $paquete->id, 'idempotency_key' => 'k-' . uniqid(),
        ])->assertCreated()->json('compra.id');

        return [$proveedor, $id];
    }

    /** Compra insertada a mano, como las que ya existian antes de HU 4.1 (sin snapshot). */
    private function insertarCompra(Proveedor $proveedor, string $estado): CompraCredito
    {
        $paquete = PaqueteCredito::where('nombre', 'Inicial')->first();

        return CompraCredito::create([
            'proveedor_id'       => $proveedor->id,
            'paquete_id'         => $paquete->id,
            'monto_gtq'          => $paquete->precio_gtq,
            'creditos_otorgados' => $paquete->creditos_base,
            'estado'             => $estado,
            'referencia'         => 'SGT-' . str_pad((string) random_int(0, 9999999999), 10, '0', STR_PAD_LEFT),
            'idempotency_key'    => 'h-' . uniqid(),
            'completada_at'      => $estado === 'completada' ? now() : null,
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
            'nombre'      => 'Categoria comprobante ' . uniqid(),
            'descripcion' => 'Categoria para pruebas de comprobantes',
        ]);

        $proveedor = Proveedor::create([
            'user_id'      => $user->id,
            'nombre'       => $user->name,
            'email'        => $user->email,
            'departamento' => 'Guatemala',
            'municipio'    => 'Guatemala',
            'categoria_id' => $categoria->id,
            'descripcion'  => 'Proveedor para pruebas de comprobante',
        ]);

        CreditoProveedor::create([
            'proveedor_id' => $proveedor->id,
            'saldo'        => $saldo,
            'updated_at'   => now(),
        ]);

        return $proveedor->setRelation('user', $user);
    }
}
