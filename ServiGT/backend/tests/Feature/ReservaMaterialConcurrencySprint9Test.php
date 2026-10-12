<?php

namespace Tests\Feature;

use App\Models\Notificacion;
use App\Models\PublicacionMaterial;
use App\Models\ReservaMaterial;
use App\Models\Mensaje;
use Illuminate\Support\Facades\DB;
use PHPUnit\Framework\Attributes\Group;
use Tests\Feature\Concerns\CreaEscenarioMateriales;
use Tests\TestCase;

/*
 * ── AVISO PARA QUIEN MODIFIQUE ESTA PRUEBA ────────────────────────────────
 * Estas pruebas fueron desarrolladas por JA (Juan Salguero) como parte de la
 * cadena de dependencias de las Tasks 3.3 y 4.2 de Sprint 9, y cubren el
 * alcance de la Task asignada a otra persona (Task 2.3, reservas de
 * materiales). Describen el contrato actual, no el definitivo.
 *
 * Si vas a cambiar o ampliar el comportamiento de esta Task (nuevas reglas,
 * campos, estados o rutas), no basta con ajustar estas pruebas: agrega
 * pruebas de regresion que demuestren que lo que ya funcionaba sigue
 * funcionando (permisos por rol, ownership, estados invalidos, idempotencia
 * y concurrencia cuando aplique) y ejecuta la suite backend completa.
 * ───────────────────────────────────────────────────────────────────────────
 */

/**
 * Task 2.3 (Sprint 9) — carreras reales contra PostgreSQL.
 *
 * Sin `DatabaseTransactions`: una conexion independiente no ve filas dentro de
 * una transaccion sin commit, asi que los fixtures se comitean y `tearDown`
 * los borra de forma dirigida (mismo criterio que ServicioConcurrenciaTest).
 *
 * Cada peticion rival la ejecuta un PROCESO PHP HIJO que arranca la aplicacion
 * completa y atiende la peticion HTTP con un token Sanctum real. Para
 * garantizar que choquen, el proceso padre mantiene un `FOR UPDATE` sobre el
 * lote hasta comprobar en `pg_stat_activity` que los dos hijos estan esperando
 * ese lock; solo entonces lo suelta y compiten.
 */
#[Group('concurrencia')]
class ReservaMaterialConcurrencySprint9Test extends TestCase
{
    use CreaEscenarioMateriales;

    protected function tearDown(): void
    {
        if ($this->usuariosMat) {
            DB::table('personal_access_tokens')->where('tokenable_type', 'App\\Models\\User')->whereIn('tokenable_id', $this->usuariosMat)->delete();
            Notificacion::whereIn('destinatario_id', $this->usuariosMat)->delete();
            // Cascada: proveedores -> servicios -> publicaciones -> reservas -> mensajes.
            \App\Models\User::whereIn('id', $this->usuariosMat)->delete();
        }
        if ($this->categoriaMat) {
            $this->categoriaMat->delete();
        }

        parent::tearDown();
    }

    public function test_dos_aceptaciones_simultaneas_de_reservas_distintas_dejan_un_solo_ganador(): void
    {
        [$lote, $vendedor] = $this->loteCommiteado();
        $a = $this->crearProveedorComprador();
        $b = $this->crearProveedorComprador();
        $ra = $this->crearReserva($lote, $a);
        $rb = $this->crearReserva($lote, $b);
        $token = $vendedor->user->createToken('t')->plainTextToken;

        $resultados = $this->competir($lote->id, [
            ['POST', "/api/reservas-material/{$ra->id}/aceptar", $token, []],
            ['POST', "/api/reservas-material/{$rb->id}/aceptar", $token, []],
        ]);

        $estados = collect($resultados)->pluck('status')->sort()->values()->all();
        $this->assertSame([200, 422], $estados, 'Debia ganar exactamente una aceptacion: ' . json_encode($resultados));

        $this->assertSame(1, ReservaMaterial::where('publicacion_id', $lote->id)->where('estado', 'aceptada')->count());
        $this->assertSame(1, ReservaMaterial::where('publicacion_id', $lote->id)->where('estado', 'rechazada')->count());
        $this->assertSame('reservado', $lote->fresh()->estado);

        // Notificaciones unicas: una aceptada y una rechazada, nunca duplicadas.
        $this->assertSame(1, Notificacion::whereIn('destinatario_id', [$a->user_id, $b->user_id])->where('tipo', 'reserva_material_aceptada')->count());
        $this->assertSame(1, Notificacion::whereIn('destinatario_id', [$a->user_id, $b->user_id])->where('tipo', 'reserva_material_rechazada')->count());
    }

    public function test_dos_aceptaciones_simultaneas_de_la_misma_reserva_notifican_una_vez(): void
    {
        [$lote, $vendedor] = $this->loteCommiteado();
        $comprador = $this->crearProveedorComprador();
        $reserva = $this->crearReserva($lote, $comprador);
        $token = $vendedor->user->createToken('t')->plainTextToken;

        $resultados = $this->competir($lote->id, [
            ['POST', "/api/reservas-material/{$reserva->id}/aceptar", $token, []],
            ['POST', "/api/reservas-material/{$reserva->id}/aceptar", $token, []],
        ]);

        $this->assertSame([200, 422], collect($resultados)->pluck('status')->sort()->values()->all(), json_encode($resultados));
        $this->assertSame(1, Notificacion::where('destinatario_id', $comprador->user_id)->where('tipo', 'reserva_material_aceptada')->count());
    }

    public function test_dos_solicitudes_simultaneas_con_la_misma_clave_crean_una_sola_reserva(): void
    {
        [$lote] = $this->loteCommiteado();
        $comprador = $this->crearProveedorComprador();
        $token = $comprador->user->createToken('t')->plainTextToken;
        $cuerpo = ['idempotency_key' => 'clave-carrera', 'mensaje_inicial' => 'Me interesa el lote.'];

        $resultados = $this->competir($lote->id, [
            ['POST', "/api/materiales/{$lote->id}/reservas", $token, $cuerpo],
            ['POST', "/api/materiales/{$lote->id}/reservas", $token, $cuerpo],
        ]);

        $this->assertSame([200, 201], collect($resultados)->pluck('status')->sort()->values()->all(), json_encode($resultados));
        $this->assertSame(1, ReservaMaterial::where('publicacion_id', $lote->id)->count());
        $this->assertSame(1, Mensaje::whereNotNull('reserva_material_id')->where('emisor_id', $comprador->user_id)->count());
        $this->assertSame(1, Notificacion::where('tipo', 'reserva_material_solicitada')->where('datos->publicacion_id', $lote->id)->count());
    }

    // ── Arnes ────────────────────────────────────────────────────────────────

    /** @return array{0: PublicacionMaterial, 1: \App\Models\Proveedor} */
    private function loteCommiteado(): array
    {
        $this->categoriaMat();
        $vendedor = $this->crearProveedorComprador();

        return [$this->crearLote($this->servicioCanceladoDesdeEnCamino($vendedor)), $vendedor];
    }

    /**
     * Lanza las peticiones en procesos independientes y las libera a la vez.
     *
     * @param list<array{0: string, 1: string, 2: string, 3: array}> $peticiones [metodo, url, token, cuerpo]
     * @return list<array{status: int, body: mixed}>
     */
    private function competir(int $loteId, array $peticiones): array
    {
        $rival = $this->conexionIndependiente();
        $rival->beginTransaction();
        $rival->prepare('SELECT id FROM publicaciones_material WHERE id = :id FOR UPDATE')->execute(['id' => $loteId]);

        $hijos = [];
        try {
            foreach ($peticiones as [$metodo, $url, $token, $cuerpo]) {
                $hijos[] = $this->lanzarHijo($metodo, $url, $token, $cuerpo);
            }

            $this->esperarBloqueados($rival, $hijos);
        } finally {
            // Libera el lock: los hijos compiten de verdad a partir de aqui.
            $rival->rollBack();
        }

        $salidas = [];
        foreach ($hijos as $hijo) {
            $salida = stream_get_contents($hijo['pipes'][1]);
            $error = stream_get_contents($hijo['pipes'][2]);
            fclose($hijo['pipes'][1]);
            fclose($hijo['pipes'][2]);
            proc_close($hijo['proc']);

            $decodificada = json_decode($salida, true);
            $this->assertIsArray($decodificada, "El proceso hijo no devolvio JSON. stdout={$salida} stderr={$error}");
            $salidas[] = $decodificada;
        }

        return $salidas;
    }

    private function lanzarHijo(string $metodo, string $url, string $token, array $cuerpo): array
    {
        $codigo = <<<'PHP'
require getenv('R_BASE') . '/vendor/autoload.php';
$app = require getenv('R_BASE') . '/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Http\Kernel::class);
$json = getenv('R_BODY');
$peticion = Illuminate\Http\Request::create(getenv('R_URL'), getenv('R_METHOD'), [], [], [], [
    'HTTP_AUTHORIZATION' => 'Bearer ' . getenv('R_TOKEN'),
    'HTTP_ACCEPT'        => 'application/json',
    'CONTENT_TYPE'       => 'application/json',
], $json !== '' ? $json : null);
$respuesta = $kernel->handle($peticion);
echo json_encode(['status' => $respuesta->getStatusCode(), 'body' => json_decode($respuesta->getContent(), true)]);
PHP;

        // PHPUnit fuerza SQLite en su propio entorno y los hijos lo heredarian:
        // se les pasa la conexion PostgreSQL real, la misma que usa esta prueba.
        $pg = config('database.connections.pgsql');

        $entorno = array_merge(getenv(), [
            'DB_CONNECTION' => 'pgsql',
            'DB_URL'        => '',
            'DB_HOST'       => (string) $pg['host'],
            'DB_PORT'       => (string) $pg['port'],
            'DB_DATABASE'   => (string) $pg['database'],
            'DB_USERNAME'   => (string) $pg['username'],
            'DB_PASSWORD'   => (string) $pg['password'],
            'R_BASE'   => base_path(),
            'R_URL'    => $url,
            'R_METHOD' => $metodo,
            'R_TOKEN'  => $token,
            'R_BODY'   => $cuerpo ? json_encode($cuerpo) : '',
        ]);

        $proc = proc_open([PHP_BINARY, '-d', 'display_errors=1', '-d', 'error_reporting=-1', '-r', $codigo], [1 => ['pipe', 'w'], 2 => ['pipe', 'w']], $pipes, null, $entorno);
        $this->assertIsResource($proc, 'No se pudo lanzar el proceso hijo.');

        return ['proc' => $proc, 'pipes' => $pipes];
    }

    /** Espera hasta que `n` sesiones distintas de la rival estan bloqueadas por un lock. */
    private function esperarBloqueados(\PDO $rival, array $hijos): void
    {
        $n = count($hijos);
        $limite = microtime(true) + 20;

        do {
            // Dentro de una transaccion PostgreSQL cachea pg_stat_activity en la
            // primera lectura (stats_fetch_consistency=cache): sin limpiar el
            // snapshot, cada sondeo veria los mismos datos viejos.
            $rival->query('SELECT pg_stat_clear_snapshot()');

            $bloqueados = (int) $rival->query(
                "SELECT count(*) FROM pg_stat_activity WHERE datname = current_database() AND wait_event_type = 'Lock'"
            )->fetchColumn();

            if ($bloqueados >= $n) {
                return;
            }

            usleep(100_000);
        } while (microtime(true) < $limite);

        $diagnostico = '';
        foreach ($hijos as $i => $hijo) {
            stream_set_blocking($hijo['pipes'][1], false);
            stream_set_blocking($hijo['pipes'][2], false);
            $estado = proc_get_status($hijo['proc']);
            $diagnostico .= " [hijo {$i} running=" . var_export($estado['running'], true) . " exit={$estado['exitcode']}] stdout=" . substr((string) stream_get_contents($hijo['pipes'][1]), 0, 600)
                . ' stderr=' . substr((string) stream_get_contents($hijo['pipes'][2]), 0, 600);
        }

        $rival->query('SELECT pg_stat_clear_snapshot()');
        $actividad = $rival->query(
            "SELECT pid, state, wait_event_type, wait_event, left(query, 90) AS q FROM pg_stat_activity WHERE datname = current_database() AND pid <> pg_backend_pid()"
        )->fetchAll(\PDO::FETCH_ASSOC);
        $diagnostico .= ' [pg_stat_activity] ' . json_encode($actividad);

        $this->fail("Solo {$bloqueados} de {$n} procesos llegaron a esperar el lock: no habria carrera real.{$diagnostico}");
    }

    private function conexionIndependiente(): \PDO
    {
        $c = config('database.connections.pgsql');

        return new \PDO(
            "pgsql:host={$c['host']};port={$c['port']};dbname={$c['database']}",
            $c['username'],
            $c['password'],
            [\PDO::ATTR_ERRMODE => \PDO::ERRMODE_EXCEPTION]
        );
    }
}
