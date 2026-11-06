<?php

namespace Tests\Feature;

use App\Models\Categoria;
use App\Models\Proveedor;
use App\Models\User;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Laravel\Sanctum\Sanctum;
use RuntimeException;
use Tests\TestCase;

/**
 * HU 1.6.b (Sprint 10): el pivote proveedor_categorias es la fuente de verdad.
 * Maximo tres categorias existentes, principal explicita dentro del conjunto,
 * principal+pivote atomicos, y catalogo/filtro por cualquiera de ellas.
 */
class CategoriasMultiplesSprint10Test extends TestCase
{
    use DatabaseTransactions;

    /** @var Categoria[] */
    private array $cats = [];

    protected function setUp(): void
    {
        parent::setUp();

        foreach (['A', 'B', 'C', 'D'] as $sufijo) {
            $this->cats[] = Categoria::create([
                'nombre'      => 'Cat 1.6 ' . $sufijo . ' ' . uniqid(),
                'descripcion' => 'Categoria de prueba HU 1.6',
            ]);
        }
    }

    // ── Alta ────────────────────────────────────────────────────────────

    public function test_alta_con_tres_categorias_y_principal_explicita(): void
    {
        [$a, $b, $c] = $this->ids(3);
        Sanctum::actingAs(User::factory()->proveedor()->create());

        $response = $this->postJson('/api/providers', $this->payload([
            'categoria_id'  => $b,
            'categoria_ids' => [$a, $b, $c],
        ]))->assertCreated();

        $proveedor = Proveedor::findOrFail($response->json('proveedor.id'));
        $this->assertSame($b, (int) $proveedor->categoria_id);
        $this->assertEqualsCanonicalizing([$a, $b, $c], $this->pivote($proveedor));
        // La principal encabeza la lista que ve el cliente.
        $this->assertSame($b, $response->json('proveedor.categorias.0.id'));
    }

    public function test_alta_sin_principal_usa_la_primera_seleccion(): void
    {
        [$a, $b] = $this->ids(2);
        Sanctum::actingAs(User::factory()->proveedor()->create());

        $id = $this->postJson('/api/providers', $this->payload(['categoria_ids' => [$b, $a]]))
            ->assertCreated()->json('proveedor.id');

        $this->assertSame($b, (int) Proveedor::findOrFail($id)->categoria_id);
    }

    public function test_alta_rechaza_mas_de_tres_categorias_sin_persistir(): void
    {
        $user = User::factory()->proveedor()->create();
        Sanctum::actingAs($user);

        $this->postJson('/api/providers', $this->payload(['categoria_ids' => $this->ids(4)]))
            ->assertUnprocessable()->assertJsonValidationErrors('categoria_ids');

        $this->assertDatabaseMissing('proveedores', ['user_id' => $user->id]);
    }

    public function test_alta_rechaza_duplicados_e_ids_inexistentes(): void
    {
        [$a] = $this->ids(1);
        $user = User::factory()->proveedor()->create();
        Sanctum::actingAs($user);

        $this->postJson('/api/providers', $this->payload(['categoria_ids' => [$a, $a]]))
            ->assertUnprocessable()->assertJsonValidationErrors('categoria_ids.0');

        $this->postJson('/api/providers', $this->payload(['categoria_ids' => [$a, 999999999]]))
            ->assertUnprocessable()->assertJsonValidationErrors('categoria_ids.1');

        $this->assertDatabaseMissing('proveedores', ['user_id' => $user->id]);
    }

    public function test_alta_rechaza_principal_fuera_del_conjunto(): void
    {
        [$a, $b, $c] = $this->ids(3);
        $user = User::factory()->proveedor()->create();
        Sanctum::actingAs($user);

        $this->postJson('/api/providers', $this->payload([
            'categoria_id'  => $c,
            'categoria_ids' => [$a, $b],
        ]))->assertUnprocessable()->assertJsonValidationErrors('categoria_id');

        $this->assertDatabaseMissing('proveedores', ['user_id' => $user->id]);
    }

    public function test_alta_solo_con_principal_la_registra_en_el_pivote(): void
    {
        [$a] = $this->ids(1);
        Sanctum::actingAs(User::factory()->proveedor()->create());

        $id = $this->postJson('/api/providers', $this->payload(['categoria_id' => $a]))
            ->assertCreated()->json('proveedor.id');

        $this->assertSame([$a], $this->pivote(Proveedor::findOrFail($id)));
    }

    // ── Edicion ─────────────────────────────────────────────────────────

    public function test_edicion_reemplaza_conjunto_y_principal(): void
    {
        [$a, $b, $c, $d] = $this->ids(4);
        $proveedor = $this->proveedorCon([$a, $b], principal: $a);

        $this->putJson("/api/providers/{$proveedor->id}", [
            'categoria_id'  => $d,
            'categoria_ids' => [$c, $d],
        ])->assertOk()->assertJsonPath('proveedor.categoria_id', $d);

        $this->assertSame($d, (int) $proveedor->fresh()->categoria_id);
        $this->assertEqualsCanonicalizing([$c, $d], $this->pivote($proveedor));
    }

    public function test_edicion_solo_principal_dentro_del_conjunto_cambia_la_principal(): void
    {
        [$a, $b] = $this->ids(2);
        $proveedor = $this->proveedorCon([$a, $b], principal: $a);

        $this->putJson("/api/providers/{$proveedor->id}", ['categoria_id' => $b])->assertOk();

        $this->assertSame($b, (int) $proveedor->fresh()->categoria_id);
        $this->assertEqualsCanonicalizing([$a, $b], $this->pivote($proveedor));
    }

    public function test_edicion_solo_principal_fuera_del_conjunto_se_rechaza(): void
    {
        [$a, $b, $c] = $this->ids(3);
        $proveedor = $this->proveedorCon([$a, $b], principal: $a);

        $this->putJson("/api/providers/{$proveedor->id}", ['categoria_id' => $c])
            ->assertUnprocessable()->assertJsonValidationErrors('categoria_id');

        $this->assertSame($a, (int) $proveedor->fresh()->categoria_id);
        $this->assertEqualsCanonicalizing([$a, $b], $this->pivote($proveedor));
    }

    public function test_edicion_no_permite_quitar_la_principal(): void
    {
        [$a, $b] = $this->ids(2);
        $proveedor = $this->proveedorCon([$a, $b], principal: $a);

        $this->putJson("/api/providers/{$proveedor->id}", ['categoria_id' => null])
            ->assertUnprocessable()->assertJsonValidationErrors('categoria_id');

        $this->assertSame($a, (int) $proveedor->fresh()->categoria_id);
    }

    public function test_edicion_invalida_no_toca_conjunto_ni_principal(): void
    {
        [$a, $b] = $this->ids(2);
        $proveedor = $this->proveedorCon([$a, $b], principal: $a);

        $this->putJson("/api/providers/{$proveedor->id}", ['categoria_ids' => $this->ids(4)])
            ->assertUnprocessable()->assertJsonValidationErrors('categoria_ids');

        $this->assertSame($a, (int) $proveedor->fresh()->categoria_id);
        $this->assertEqualsCanonicalizing([$a, $b], $this->pivote($proveedor));
    }

    public function test_fallo_al_guardar_el_perfil_revierte_el_pivote(): void
    {
        [$a, $b, $c] = $this->ids(3);
        $proveedor = $this->proveedorCon([$a, $b], principal: $a);

        // Falla despues de sincronizar el pivote: sin transaccion el pivote
        // quedaria con [c] y la principal seguiria en a.
        Proveedor::updating(function () {
            throw new RuntimeException('fallo simulado al guardar el perfil');
        });

        $this->putJson("/api/providers/{$proveedor->id}", [
            'categoria_id'  => $c,
            'categoria_ids' => [$c],
        ])->assertStatus(500);

        $this->assertSame($a, (int) $proveedor->fresh()->categoria_id);
        $this->assertEqualsCanonicalizing([$a, $b], $this->pivote($proveedor));
    }

    // ── Catalogo y filtro ───────────────────────────────────────────────

    public function test_catalogo_incluye_todas_las_categorias_con_la_principal_primero(): void
    {
        [$a, $b, $c] = $this->ids(3);
        $proveedor = $this->proveedorCon([$a, $b, $c], principal: $c);

        $fila = collect($this->getJson('/api/providers')->assertOk()->json('proveedores'))
            ->firstWhere('id', $proveedor->id);

        $this->assertNotNull($fila);
        $ids = array_column($fila['categorias'], 'id');
        $this->assertSame($c, $ids[0]);
        $this->assertEqualsCanonicalizing([$a, $b, $c], $ids);
    }

    public function test_filtro_por_categoria_encuentra_tambien_las_secundarias(): void
    {
        [$a, $b, $c] = $this->ids(3);
        $conSecundaria = $this->proveedorCon([$a, $b], principal: $a);
        $sinEsa        = $this->proveedorCon([$c], principal: $c);

        $ids = collect($this->getJson("/api/providers?categoria_id={$b}")->assertOk()->json('proveedores'))
            ->pluck('id');

        $this->assertContains($conSecundaria->id, $ids);
        $this->assertNotContains($sinEsa->id, $ids);
    }

    public function test_filtro_por_categoria_invalida_responde_422(): void
    {
        $this->getJson('/api/providers?categoria_id=abc')
            ->assertUnprocessable()->assertJsonValidationErrors('categoria_id');
    }

    // ── Helpers ─────────────────────────────────────────────────────────

    /** @return int[] */
    private function ids(int $n): array
    {
        return array_map(fn (Categoria $c) => (int) $c->id, array_slice($this->cats, 0, $n));
    }

    /** @return int[] */
    private function pivote(Proveedor $proveedor): array
    {
        return $proveedor->categorias()->pluck('categorias.id')->map(fn ($id) => (int) $id)->all();
    }

    private function payload(array $cambios = []): array
    {
        return array_replace([
            'nombre'       => 'Proveedor HU 1.6',
            'email'        => 'hu16.' . uniqid() . '@servigt.test',
            'telefono'     => '55550106',
            'descripcion'  => 'Descripcion profesional de prueba para HU 1.6',
            'departamento' => 'Guatemala',
        ], $cambios);
    }

    private function proveedorCon(array $categoriaIds, int $principal): Proveedor
    {
        $user = User::factory()->proveedor()->create();
        $proveedor = Proveedor::create($this->payload([
            'user_id'      => $user->id,
            'email'        => $user->email,
            'categoria_id' => $principal,
        ]));
        $proveedor->categorias()->sync($categoriaIds);
        Sanctum::actingAs($user);

        return $proveedor;
    }
}
