<?php

namespace Tests\Feature;

use App\Models\Mensaje;
use Illuminate\Support\Facades\DB;
use Laravel\Sanctum\Sanctum;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\Attributes\Group;
use Tests\Feature\Concerns\CompiteConProcesos;
use Tests\Feature\Concerns\CreaEscenarioSeguridad;
use Tests\TestCase;

#[Group('concurrencia')]
class ChatSecurityConcurrencyTest extends TestCase
{
    use CreaEscenarioSeguridad;
    use CompiteConProcesos;

    protected function tearDown(): void
    {
        $this->limpiarCommiteados();
        parent::tearDown();
    }

    public static function canalesYRoles(): array
    {
        $casos = [];
        foreach (['tipado', 'legacy_explicito', 'legacy_inferido'] as $canal) {
            foreach (['cliente', 'proveedor'] as $rol) {
                $casos["{$canal}_{$rol}"] = [$canal, $rol];
            }
        }
        return $casos;
    }

    #[DataProvider('canalesYRoles')]
    public function test_envio_en_otro_proceso_revalida_la_interrupcion_al_liberar_el_lock(string $canal, string $rol): void
    {
        $servicio = $this->servicioSeguro();
        $emisor = $rol === 'cliente' ? $servicio->cliente : $servicio->proveedor->user;
        $reportante = $rol === 'cliente' ? $servicio->proveedor->user : $servicio->cliente;
        $token = $emisor->createToken('chat-race')->plainTextToken;
        $url = $canal === 'tipado' ? "/api/mensajes/servicios/{$servicio->id}" : '/api/mensajes';
        $cuerpo = ['contenido' => 'Mensaje concurrente con interrupcion'];
        if ($canal !== 'tipado') {
            $cuerpo['receptor_id'] = $reportante->id;
        }
        if ($canal === 'legacy_explicito') {
            $cuerpo['servicio_id'] = $servicio->id;
        }

        $hijo = null;
        DB::beginTransaction();
        try {
            // La ruta real interrumpe y adquiere el lock. La transaccion exterior
            // retrasa su commit hasta que el envio en OTRO proceso este esperando.
            Sanctum::actingAs($reportante);
            $this->postJson("/api/servicios/{$servicio->id}/seguridad/interrumpir", [
                'categoria' => 'emergencia',
                'descripcion' => 'Incidente para prueba de concurrencia',
                'idempotency_key' => 'chat-interrupcion',
            ])->assertCreated();
            $hijo = $this->lanzarHijo('POST', $url, $token, $cuerpo);
            $this->esperarBloqueados($this->conexionIndependiente(), [$hijo]);
            DB::commit();

            $salida = stream_get_contents($hijo['pipes'][1]);
            $respuesta = json_decode($salida, true);
            $this->assertIsArray($respuesta, 'El hijo debe devolver JSON.');
            $this->assertSame('interrumpido_seguridad', $servicio->fresh()->estado);
            $this->assertSame(409, $respuesta['status']);
            $this->assertSame(0, Mensaje::where('servicio_id', $servicio->id)->count());
        } finally {
            if (DB::transactionLevel() > 0) {
                DB::rollBack();
            }
            if ($hijo !== null) {
                foreach ($hijo['pipes'] as $pipe) {
                    fclose($pipe);
                }
                proc_close($hijo['proc']);
            }
        }
    }
}
