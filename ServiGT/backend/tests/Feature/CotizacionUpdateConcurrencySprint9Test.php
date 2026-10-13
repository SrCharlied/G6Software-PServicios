<?php

namespace Tests\Feature;

use App\Models\Categoria;
use App\Models\Cotizacion;
use App\Models\CreditoProveedor;
use App\Models\Pedido;
use App\Models\Proveedor;
use App\Models\TransaccionCredito;
use App\Models\User;
use Laravel\Sanctum\Sanctum;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\Attributes\Group;
use Tests\TestCase;

/**
 * Task 1.2 (Sprint 9) — carrera edicion/adjudicacion con PostgreSQL real.
 *
 * Sin `DatabaseTransactions`: una conexion independiente no ve filas dentro de
 * una transaccion sin commit, asi que los fixtures se comitean y `tearDown` los
 * borra de forma dirigida (mismo criterio que ServicioConcurrenciaTest).
 *
 * La adjudicacion en vuelo la ejecuta un PROCESO PHP HIJO con su propia
 * conexion: toma `pedidos ... FOR UPDATE`, avisa, retiene el lock y luego
 * confirma o revierte. La peticion de edicion corre en este proceso y debe
 * esperar de verdad a ese lock; el tiempo transcurrido lo demuestra.
 */
#[Group('concurrencia')]
class CotizacionUpdateConcurrencySprint9Test extends TestCase
{
    private const RETENCION_MS = 1500;

    /** @var list<int> */
    private array $usuarios = [];
    private ?int $categoriaId = null;
    private ?int $pedidoId = null;

    protected function tearDown(): void
    {
        if ($this->pedidoId) {
            Pedido::whereKey($this->pedidoId)->delete();
        }
        if ($this->usuarios) {
            User::whereIn('id', $this->usuarios)->delete();
        }
        if ($this->categoriaId) {
            Categoria::whereKey($this->categoriaId)->delete();
        }

        parent::tearDown();
    }

    public function test_edicion_espera_a_la_adjudicacion_en_vuelo_y_no_la_pisa(): void
    {
        [$proveedor, $cotizacion, $pedido] = $this->escenario();

        $inicio = microtime(true);
        $hijo   = $this->adjudicarEnProcesoIndependiente($pedido->id, $cotizacion->id, 'commit');
        $espera = $this->peticionEditar($proveedor, $cotizacion, 999);
        $ms     = (microtime(true) - $inicio) * 1000;
        $this->cerrar($hijo);

        $espera->assertStatus(422);
        $this->assertGreaterThanOrEqual(self::RETENCION_MS * 0.8, $ms, 'La edicion no espero el lock del pedido: no hubo carrera real.');

        // Un unico resultado valido: gana la adjudicacion con el monto original.
        $this->assertSame('aceptada', $cotizacion->fresh()->estado);
        $this->assertEquals(350, $cotizacion->fresh()->monto);
        $this->assertSame('adjudicado', $pedido->fresh()->estado);
        $this->assertSame(5, (int) CreditoProveedor::where('proveedor_id', $proveedor->id)->value('saldo'));
        $this->assertSame(0, TransaccionCredito::where('proveedor_id', $proveedor->id)->count());
    }

    public function test_si_la_adjudicacion_en_vuelo_se_revierte_la_edicion_procede_una_sola_vez(): void
    {
        [$proveedor, $cotizacion, $pedido] = $this->escenario();

        $inicio = microtime(true);
        $hijo   = $this->adjudicarEnProcesoIndependiente($pedido->id, $cotizacion->id, 'rollback');
        $edicion = $this->peticionEditar($proveedor, $cotizacion, 480);
        $ms     = (microtime(true) - $inicio) * 1000;
        $this->cerrar($hijo);

        $edicion->assertOk();
        $this->assertGreaterThanOrEqual(self::RETENCION_MS * 0.8, $ms, 'La edicion no espero el lock del pedido: no hubo carrera real.');

        $this->assertSame('enviada', $cotizacion->fresh()->estado);
        $this->assertEquals(480, $cotizacion->fresh()->monto);
        $this->assertSame(4, (int) CreditoProveedor::where('proveedor_id', $proveedor->id)->value('saldo'));
        $this->assertSame(1, TransaccionCredito::where('proveedor_id', $proveedor->id)->count());
    }

    // ── Arnes ────────────────────────────────────────────────────────────────

    private function peticionEditar(Proveedor $proveedor, Cotizacion $cotizacion, float $monto)
    {
        Sanctum::actingAs($proveedor->user);

        return $this->putJson("/api/pedidos/{$cotizacion->pedido_id}/cotizaciones/{$cotizacion->id}", [
            'monto'   => $monto,
            'mensaje' => 'Mensaje actualizado con detalle suficiente del trabajo.',
        ]);
    }

    /**
     * Lanza el proceso rival y devuelve cuando ya sostiene el lock del pedido.
     *
     * @return array{proc: resource, pipes: array<int, resource>}
     */
    private function adjudicarEnProcesoIndependiente(int $pedidoId, int $cotizacionId, string $final): array
    {
        $c = config('database.connections.pgsql');

        $codigo = <<<'PHP'
$pdo = new PDO(getenv('R_DSN'), getenv('R_USER'), getenv('R_PASS'), [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);
$pdo->exec("SET lock_timeout = '5s'");
$pdo->beginTransaction();
$pdo->prepare('SELECT id FROM pedidos WHERE id = ? FOR UPDATE')->execute([getenv('R_PEDIDO')]);
fwrite(STDOUT, "LOCKED\n");
usleep((int) getenv('R_MS') * 1000);
if (getenv('R_FINAL') === 'commit') {
    $pdo->prepare("UPDATE cotizaciones SET estado = 'aceptada' WHERE id = ?")->execute([getenv('R_COT')]);
    $pdo->prepare("UPDATE pedidos SET estado = 'adjudicado' WHERE id = ?")->execute([getenv('R_PEDIDO')]);
    $pdo->commit();
} else {
    $pdo->rollBack();
}
PHP;

        $env = [
            'R_DSN'    => "pgsql:host={$c['host']};port={$c['port']};dbname={$c['database']}",
            'R_USER'   => $c['username'],
            'R_PASS'   => $c['password'],
            'R_PEDIDO' => (string) $pedidoId,
            'R_COT'    => (string) $cotizacionId,
            'R_MS'     => (string) self::RETENCION_MS,
            'R_FINAL'  => $final,
            'PATH'     => getenv('PATH') ?: '',
        ];

        $proc = proc_open([PHP_BINARY, '-r', $codigo], [1 => ['pipe', 'w'], 2 => ['pipe', 'w']], $pipes, null, $env);
        $this->assertIsResource($proc, 'No se pudo lanzar el proceso rival.');

        stream_set_timeout($pipes[1], 10);
        $this->assertSame('LOCKED', trim((string) fgets($pipes[1])), 'El proceso rival no tomo el lock: ' . stream_get_contents($pipes[2]));

        return ['proc' => $proc, 'pipes' => $pipes];
    }

    private function cerrar(array $hijo): void
    {
        $err = stream_get_contents($hijo['pipes'][2]);
        foreach ($hijo['pipes'] as $p) {
            fclose($p);
        }
        $this->assertSame(0, proc_close($hijo['proc']), "El proceso rival fallo: {$err}");
    }

    /** @return array{0: Proveedor, 1: Cotizacion, 2: Pedido} */
    private function escenario(): array
    {
        $sufijo = uniqid('s9c12');

        $categoria = Categoria::create(['nombre' => "Categoria {$sufijo}", 'descripcion' => 'Prueba de concurrencia']);
        $this->categoriaId = $categoria->id;

        $cliente = $this->usuario("cliente.{$sufijo}", 'cliente');
        $userProv = $this->usuario("proveedor.{$sufijo}", 'proveedor');

        $pedido = Pedido::create([
            'cliente_id'       => $cliente->id,
            'categoria_id'     => $categoria->id,
            'descripcion'      => 'Descripcion de prueba suficientemente larga para el pedido',
            'direccion'        => 'Zona 1, Guatemala',
            'urgencia'         => 'media',
            'estado'           => 'abierto',
            'fecha_expiracion' => now()->addDays(7),
        ]);
        $this->pedidoId = $pedido->id;

        $proveedor = Proveedor::create([
            'user_id'      => $userProv->id,
            'nombre'       => $userProv->name,
            'email'        => $userProv->email,
            'departamento' => 'Guatemala',
            'municipio'    => 'Guatemala',
            'categoria_id' => $categoria->id,
            'descripcion'  => 'Proveedor creado para pruebas automatizadas',
        ])->setRelation('user', $userProv);

        CreditoProveedor::updateOrCreate(['proveedor_id' => $proveedor->id], ['saldo' => 5]);

        $cotizacion = Cotizacion::create([
            'pedido_id'      => $pedido->id,
            'proveedor_id'   => $proveedor->id,
            'monto'          => 350,
            'mensaje'        => 'Cotizacion original con detalle suficiente del trabajo.',
            'estado'         => 'enviada',
            'costo_creditos' => 0,
        ]);

        return [$proveedor, $cotizacion, $pedido];
    }

    private function usuario(string $alias, string $rol): User
    {
        $user = User::create([
            'name'     => $alias,
            'email'    => "{$alias}@servigt.test",
            'password' => 'password-test',
            'role'     => $rol,
        ]);
        $this->usuarios[] = $user->id;

        return $user;
    }
}
