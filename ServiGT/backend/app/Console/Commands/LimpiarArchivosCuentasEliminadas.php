<?php

namespace App\Console\Commands;

use App\Models\SolicitudEliminacionCuenta;
use App\Services\LimpiezaArchivosCuentaService;
use Illuminate\Console\Command;

class LimpiarArchivosCuentasEliminadas extends Command
{
    protected $signature = 'cuentas:limpiar-archivos';

    protected $description = 'Reintenta borrar los archivos de cuentas anonimizadas con limpieza pendiente';

    public function handle(LimpiezaArchivosCuentaService $limpieza): int
    {
        $completadas = 0;
        $pendientes = 0;

        SolicitudEliminacionCuenta::where('estado', SolicitudEliminacionCuenta::LIMPIEZA_PENDIENTE)
            ->orderBy('id')
            ->each(function (SolicitudEliminacionCuenta $solicitud) use ($limpieza, &$completadas, &$pendientes) {
                $resultado = $limpieza->limpiar($solicitud);

                if ($resultado->estado === SolicitudEliminacionCuenta::COMPLETADA) {
                    $completadas++;
                } else {
                    $pendientes++;
                }
            });

        // Sin rutas en la salida: el detalle queda en ultimo_error_limpieza.
        $this->info("Solicitudes completadas: {$completadas}. Siguen pendientes: {$pendientes}.");

        return self::SUCCESS;
    }
}
