<?php

namespace Tests\Feature;

use App\Models\HistorialReporteSeguridad;
use App\Models\ReporteSeguridad;
use PHPUnit\Framework\Attributes\Group;
use Tests\Feature\Concerns\CompiteConProcesos;
use Tests\Feature\Concerns\CreaEscenarioSeguridad;
use Tests\TestCase;

/**
 * Task 5.4 (Sprint 9) — dos administradores cambiando el estado del mismo
 * reporte a la vez, con PostgreSQL real y procesos independientes (ver
 * CompiteConProcesos). El lock deja un unico resultado y un unico evento.
 */
#[Group('concurrencia')]
class AdminSecurityReportConcurrencySprint9Test extends TestCase
{
    use CreaEscenarioSeguridad;
    use CompiteConProcesos;

    protected function tearDown(): void
    {
        $this->limpiarCommiteados();

        parent::tearDown();
    }

    public function test_dos_admins_con_la_misma_transicion_dejan_un_ganador_y_un_evento(): void
    {
        [$reporte, $a, $b] = $this->escenario('recibido');

        $r = $this->competir('reportes_seguridad', $reporte->id, [
            ['POST', "/api/admin/reportes-seguridad/{$reporte->id}/estado", $a, ['estado' => 'en_revision', 'nota_interna' => 'admin A']],
            ['POST', "/api/admin/reportes-seguridad/{$reporte->id}/estado", $b, ['estado' => 'en_revision', 'nota_interna' => 'admin B']],
        ]);

        $this->assertSame([200, 422], collect($r)->pluck('status')->sort()->values()->all(), json_encode($r));
        $this->assertSame('en_revision', ReporteSeguridad::find($reporte->id)->estado);
        $this->assertSame(1, HistorialReporteSeguridad::where('reporte_id', $reporte->id)->count(), 'Un cambio, un evento: sin duplicados.');
    }

    public function test_resolver_y_descartar_a_la_vez_dejan_un_solo_resultado_terminal(): void
    {
        [$reporte, $a, $b] = $this->escenario('en_revision');

        $r = $this->competir('reportes_seguridad', $reporte->id, [
            ['POST', "/api/admin/reportes-seguridad/{$reporte->id}/estado", $a, ['estado' => 'resuelto']],
            ['POST', "/api/admin/reportes-seguridad/{$reporte->id}/estado", $b, ['estado' => 'descartado']],
        ]);

        $this->assertSame([200, 422], collect($r)->pluck('status')->sort()->values()->all(), json_encode($r));

        $evento = HistorialReporteSeguridad::where('reporte_id', $reporte->id)->firstOrFail();
        $this->assertSame(1, HistorialReporteSeguridad::where('reporte_id', $reporte->id)->count());
        $this->assertSame($evento->estado_nuevo, ReporteSeguridad::find($reporte->id)->estado, 'El estado final debe coincidir con el unico evento.');
        $this->assertContains($evento->estado_nuevo, ['resuelto', 'descartado']);
    }

    /** @return array{0: ReporteSeguridad, 1: string, 2: string} reporte y tokens de dos admins */
    private function escenario(string $estado): array
    {
        $servicio = $this->servicioSeguro('en_progreso');
        $reporte = $this->crearReporte($servicio, $servicio->cliente, ['estado' => $estado]);

        return [
            $reporte,
            $this->crearAdmin()->createToken('t')->plainTextToken,
            $this->crearAdmin()->createToken('t')->plainTextToken,
        ];
    }
}
