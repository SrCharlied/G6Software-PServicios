<?php

namespace App\Http\Controllers;

use App\Http\Middleware\CorrelationId;
use App\Http\Resources\AdminReporteSeguridadResource;
use App\Models\HistorialReporteSeguridad;
use App\Models\ReporteSeguridad;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * Cola administrativa de reportes de seguridad (Sprint 9, Task 5.4). Solo admin
 * (middleware `admin`). Resolver o descartar un reporte nunca modifica ni
 * reabre el servicio: el servicio y el reporte tienen ciclos de vida separados.
 */
class ReporteSeguridadAdminController extends Controller
{
    use ApiResponse;

    private const RELACIONES_DETALLE = ['reportante:id,name,role', 'servicio.cliente:id,name', 'servicio.proveedor:id,nombre', 'evidencias', 'historial.actor:id,name,role'];

    /**
     * GET /api/admin/reportes-seguridad
     * Filtros: estado, categoria, interrumpio (bool), servicio_id; per_page, page.
     */
    public function index(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'estado'      => 'sometimes|in:' . implode(',', ReporteSeguridad::ESTADOS),
            'categoria'   => 'sometimes|in:' . implode(',', ReporteSeguridad::CATEGORIAS),
            'interrumpio' => 'sometimes|boolean',
            'servicio_id' => 'sometimes|integer|min:1',
            'per_page'    => 'sometimes|integer|min:1|max:50',
        ]);

        $consulta = ReporteSeguridad::query()
            ->with(['reportante:id,name,role', 'servicio:id,estado,cliente_id,proveedor_id', 'servicio.cliente:id,name', 'servicio.proveedor:id,nombre'])
            ->withCount('evidencias')
            ->orderByDesc('created_at')
            ->orderByDesc('id');

        foreach (['estado', 'categoria', 'servicio_id'] as $campo) {
            if (isset($validated[$campo])) {
                $consulta->where($campo, $validated[$campo]);
            }
        }

        if (array_key_exists('interrumpio', $validated)) {
            $consulta->where('interrumpio_servicio', $request->boolean('interrumpio'));
        }

        $pagina = $consulta->paginate((int) ($validated['per_page'] ?? 20));

        return $this->success('OK', [
            'reportes' => AdminReporteSeguridadResource::collection($pagina->items()),
            'meta' => [
                'total'        => $pagina->total(),
                'per_page'     => $pagina->perPage(),
                'current_page' => $pagina->currentPage(),
                'last_page'    => $pagina->lastPage(),
            ],
        ]);
    }

    /** GET /api/admin/reportes-seguridad/{id} — detalle con historial y evidencias (sin rutas). */
    public function show(int $id): JsonResponse
    {
        $reporte = ReporteSeguridad::with(self::RELACIONES_DETALLE)->find($id);

        if (!$reporte) {
            return $this->error('Reporte no encontrado.', 404);
        }

        return $this->success('OK', ['reporte' => new AdminReporteSeguridadResource($reporte)]);
    }

    /**
     * POST /api/admin/reportes-seguridad/{id}/estado
     * Body: estado, nota_interna?. recibido -> en_revision -> resuelto|descartado,
     * bajo lock, con un evento inmutable por cambio.
     */
    public function cambiarEstado(Request $request, int $id): JsonResponse
    {
        $validated = $request->validate([
            'estado'       => 'required|string|in:' . implode(',', ReporteSeguridad::ESTADOS),
            'nota_interna' => 'nullable|string|max:2000',
        ]);

        return DB::transaction(function () use ($request, $id, $validated) {
            $reporte = ReporteSeguridad::query()->lockForUpdate()->find($id);

            if (!$reporte) {
                return $this->error('Reporte no encontrado.', 404);
            }

            $permitidas = ReporteSeguridad::TRANSICIONES[$reporte->estado] ?? [];

            if (!in_array($validated['estado'], $permitidas, true)) {
                return $this->error(
                    "No se puede pasar un reporte de «{$reporte->estado}» a «{$validated['estado']}».",
                    422
                );
            }

            $anterior = $reporte->estado;

            // Solo el reporte cambia: el servicio no se consulta ni se toca.
            $reporte->update(['estado' => $validated['estado']]);

            HistorialReporteSeguridad::create([
                'reporte_id'      => $reporte->id,
                // El actor es siempre el admin autenticado, nunca un dato del body.
                'actor_id'        => $request->user()->id,
                'estado_anterior' => $anterior,
                'estado_nuevo'    => $validated['estado'],
                'nota_interna'    => $validated['nota_interna'] ?? null,
                'correlation_id'  => $request->attributes->get(CorrelationId::ATTRIBUTE),
            ]);

            $reporte->load(self::RELACIONES_DETALLE);

            return $this->success('Estado del reporte actualizado.', ['reporte' => new AdminReporteSeguridadResource($reporte)]);
        });
    }
}
