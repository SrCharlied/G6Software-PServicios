<?php

namespace Tests\Feature;

use App\Models\Notificacion;
use App\Models\ReporteSeguridad;
use App\Models\Servicio;
use PHPUnit\Framework\Attributes\Group;
use Tests\Feature\Concerns\CompiteConProcesos;
use Tests\Feature\Concerns\CreaEscenarioSeguridad;
use Tests\TestCase;

/*
 * ── AVISO PARA QUIEN MODIFIQUE ESTA PRUEBA ────────────────────────────────
 * Estas pruebas fueron desarrolladas por JA (Juan Salguero) como parte de la
 * cadena de dependencias de la Task 6.2 de Sprint 9, y cubren el alcance de
 * la Task asignada a otra persona (Task 5.2, reporte e interrupcion atomica
 * del servicio). Describen el contrato actual, no el definitivo.
 *
 * Si vas a cambiar o ampliar el comportamiento de esta Task (nuevas reglas,
 * campos, estados o rutas), no basta con ajustar estas pruebas: agrega
 * pruebas de regresion que demuestren que lo que ya funcionaba sigue
 * funcionando (permisos por rol, ownership, estados invalidos, idempotencia
 * y concurrencia cuando aplique) y ejecuta la suite backend completa.
 * ───────────────────────────────────────────────────────────────────────────
 */

/**
 * Task 5.2 (Sprint 9) — la interrupcion de seguridad contra las transiciones
 * normales del servicio, con PostgreSQL real y procesos independientes.
 *
 * Sin `DatabaseTransactions` (ver CompiteConProcesos): los fixtures se
 * comitean y se borran de forma dirigida en tearDown.
 */
#[Group('concurrencia')]
class SecurityInterruptionConcurrencySprint9Test extends TestCase
{
    use CreaEscenarioSeguridad;
    use CompiteConProcesos;

    protected function tearDown(): void
    {
        $this->limpiarCommiteados();

        parent::tearDown();
    }

    public function test_interrumpir_contra_finalizar_termina_siempre_interrumpido_sin_codigos(): void
    {
        $servicio = $this->servicioSeguro('en_progreso');
        $cliente = $servicio->cliente->createToken('t')->plainTextToken;
        $proveedor = $servicio->proveedor->user->createToken('t')->plainTextToken;

        $r = $this->competir('servicios', $servicio->id, [
            ['POST', "/api/servicios/{$servicio->id}/seguridad/interrumpir", $cliente, $this->cuerpo('carrera-1')],
            ['POST', "/api/servicios/{$servicio->id}/finalizar", $proveedor, []],
        ]);

        // Ambos ordenes son validos (por_confirmar tambien permite interrumpir),
        // pero el resultado final nunca puede ser una mezcla.
        $this->assertSame(201, $r[0]['status'], 'La interrupcion debia imponerse: ' . json_encode($r));
        $this->assertContains($r[1]['status'], [200, 422], json_encode($r));

        $fresco = Servicio::find($servicio->id);
        $this->assertSame('interrumpido_seguridad', $fresco->estado);
        $this->assertNull($fresco->codigo_inicio);
        $this->assertNull($fresco->codigo_fin, 'Un codigo de fin no puede sobrevivir a la interrupcion.');
        $this->assertSame(1, ReporteSeguridad::where('servicio_id', $servicio->id)->where('interrumpio_servicio', true)->count());
        $this->assertSame(1, Notificacion::where('destinatario_id', $servicio->proveedor->user_id)->where('tipo', 'servicio_interrumpido_seguridad')->count());
    }

    public function test_interrumpir_contra_confirmar_fin_deja_un_unico_resultado_consistente(): void
    {
        $servicio = $this->servicioSeguro('por_confirmar');
        $cliente = $servicio->cliente->createToken('t')->plainTextToken;
        $proveedor = $servicio->proveedor->user->createToken('t')->plainTextToken;

        $r = $this->competir('servicios', $servicio->id, [
            ['POST', "/api/servicios/{$servicio->id}/seguridad/interrumpir", $proveedor, $this->cuerpo('carrera-2')],
            ['POST', "/api/servicios/{$servicio->id}/confirmar-fin", $cliente, ['codigo' => '654321']],
        ]);

        $fresco = Servicio::find($servicio->id);
        $reportes = ReporteSeguridad::where('servicio_id', $servicio->id)->count();
        $avisos = Notificacion::where('destinatario_id', $servicio->cliente_id)->where('tipo', 'servicio_interrumpido_seguridad')->count();

        if ($fresco->estado === 'completado') {
            // Gano la confirmacion: la interrupcion ya no procede y no deja rastro.
            $this->assertSame(200, $r[1]['status'], json_encode($r));
            $this->assertSame(422, $r[0]['status'], json_encode($r));
            $this->assertSame(0, $reportes, 'Hay un reporte de interrupcion de un servicio que se completo.');
            $this->assertSame(0, $avisos);
        } else {
            // Gano la interrupcion: la confirmacion se rechaza y no hay cierre a medias.
            $this->assertSame('interrumpido_seguridad', $fresco->estado, json_encode($r));
            $this->assertSame(201, $r[0]['status'], json_encode($r));
            $this->assertContains($r[1]['status'], [403, 404, 409, 422], json_encode($r));
            $this->assertSame(1, $reportes);
            $this->assertSame(1, $avisos);
            $this->assertNull($fresco->codigo_fin);
            $this->assertSame(0, Notificacion::whereIn('tipo', ['servicio_completado', 'servicio_calificable'])
                ->whereIn('destinatario_id', [$servicio->cliente_id, $servicio->proveedor->user_id])->count(), 'Un servicio interrumpido no es calificable.');
        }
    }

    public function test_dos_interrupciones_simultaneas_de_partes_distintas_dejan_un_solo_reporte(): void
    {
        $servicio = $this->servicioSeguro('en_progreso');
        $cliente = $servicio->cliente->createToken('t')->plainTextToken;
        $proveedor = $servicio->proveedor->user->createToken('t')->plainTextToken;

        $r = $this->competir('servicios', $servicio->id, [
            ['POST', "/api/servicios/{$servicio->id}/seguridad/interrumpir", $cliente, $this->cuerpo('c-1')],
            ['POST', "/api/servicios/{$servicio->id}/seguridad/interrumpir", $proveedor, $this->cuerpo('p-1')],
        ]);

        $this->assertSame([201, 422], collect($r)->pluck('status')->sort()->values()->all(), json_encode($r));
        $this->assertSame(1, ReporteSeguridad::where('servicio_id', $servicio->id)->count());
        $this->assertSame(1, Notificacion::where('tipo', 'servicio_interrumpido_seguridad')
            ->whereIn('destinatario_id', [$servicio->cliente_id, $servicio->proveedor->user_id])->count());
    }

    public function test_dos_interrupciones_simultaneas_con_la_misma_clave_son_idempotentes(): void
    {
        $servicio = $this->servicioSeguro('en_progreso');
        $cliente = $servicio->cliente->createToken('t')->plainTextToken;

        $r = $this->competir('servicios', $servicio->id, [
            ['POST', "/api/servicios/{$servicio->id}/seguridad/interrumpir", $cliente, $this->cuerpo('misma')],
            ['POST', "/api/servicios/{$servicio->id}/seguridad/interrumpir", $cliente, $this->cuerpo('misma')],
        ]);

        $this->assertSame([200, 201], collect($r)->pluck('status')->sort()->values()->all(), json_encode($r));
        $this->assertSame(1, ReporteSeguridad::where('servicio_id', $servicio->id)->count());
        $this->assertSame(1, Notificacion::where('destinatario_id', $servicio->proveedor->user_id)->where('tipo', 'servicio_interrumpido_seguridad')->count());
    }

    private function cuerpo(string $clave): array
    {
        return ['categoria' => 'emergencia', 'descripcion' => 'Situación de riesgo durante el servicio.', 'idempotency_key' => $clave];
    }
}
