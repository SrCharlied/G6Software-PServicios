<?php

namespace Tests\Feature\Concerns;

use App\Models\Notificacion;
use App\Models\User;
use Illuminate\Support\Facades\DB;

/**
 * Arnes de concurrencia real (Sprint 9): cada peticion rival la ejecuta un
 * PROCESO PHP HIJO que arranca la aplicacion completa y atiende la peticion
 * HTTP con un token Sanctum real. Para garantizar que choquen, el proceso
 * padre mantiene un `FOR UPDATE` sobre una fila hasta comprobar en
 * `pg_stat_activity` que todos los hijos estan esperando ese lock; solo
 * entonces lo suelta y compiten.
 *
 * Requiere CreaEscenarioMateriales (usuariosMat / categoriaMat) y NO usa
 * DatabaseTransactions: los fixtures se comitean y `limpiarCommiteados` los
 * borra de forma dirigida.
 */
trait CompiteConProcesos
{
    protected function limpiarCommiteados(): void
    {
        if ($this->usuariosMat) {
            DB::table('personal_access_tokens')->where('tokenable_type', 'App\\Models\\User')->whereIn('tokenable_id', $this->usuariosMat)->delete();
            Notificacion::whereIn('destinatario_id', $this->usuariosMat)->delete();
            // Cascada: proveedores -> servicios -> publicaciones/reportes -> reservas -> mensajes.
            User::whereIn('id', $this->usuariosMat)->delete();
        }
        if ($this->categoriaMat) {
            $this->categoriaMat->delete();
        }
    }

    /**
     * Lanza las peticiones en procesos independientes y las libera a la vez.
     * Antes de soltarlas mantiene un FOR UPDATE sobre la fila ($tabla, $id).
     *
     * @param list<array{0: string, 1: string, 2: string, 3: array}> $peticiones [metodo, url, token, cuerpo]
     * @return list<array{status: int, body: mixed}>
     */
    protected function competir(string $tabla, int $id, array $peticiones): array
    {
        $rival = $this->conexionIndependiente();
        $rival->beginTransaction();
        $rival->prepare("SELECT id FROM {$tabla} WHERE id = :id FOR UPDATE")->execute(['id' => $id]);

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

    protected function lanzarHijo(string $metodo, string $url, string $token, array $cuerpo): array
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
    protected function esperarBloqueados(\PDO $rival, array $hijos): void
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

    protected function conexionIndependiente(): \PDO
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
