<?php

namespace App\Http\Controllers;

use App\Http\Middleware\CorrelationId;
use App\Http\Resources\ReporteSeguridadResource;
use App\Http\Resources\ServicioResource;
use App\Models\HistorialReporteSeguridad;
use App\Models\Notificacion;
use App\Models\ReporteSeguridad;
use App\Models\Servicio;
use App\Traits\ApiResponse;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * Centro de seguridad (Sprint 9). Reportes de un servicio por cliente o
 * proveedor, con interrupcion atomica opcional.
 *
 * Alcance honesto: ServiGT registra y deja trazabilidad; no hay despacho de
 * emergencias, monitoreo 24/7, SLA ni sancion automatica.
 *
 * Privacidad: el reporte, sus evidencias y las notas internas solo los ven el
 * reportante y el admin. La contraparte recibe una notificacion generica que
 * no incluye categoria, descripcion ni archivos.
 */
class ReporteSeguridadController extends Controller
{
    use ApiResponse;

    /** Estados en los que el Centro de seguridad esta disponible para participantes. */
    public const ESTADOS_DISPONIBLES = ['aceptado', 'en_camino', 'en_progreso', 'por_confirmar'];

    /**
     * POST /api/servicios/{id}/seguridad/reportes
     * Reporte simple: se registra y se audita, el servicio no cambia.
     */
    public function crear(Request $request, int $id): JsonResponse
    {
        return $this->registrar($request, $id, interrumpe: false);
    }

    /**
     * POST /api/servicios/{id}/seguridad/interrumpir
     * Reporte obligatorio + estado terminal `interrumpido_seguridad` en una
     * sola transaccion: nunca existe un servicio interrumpido sin reporte.
     */
    public function interrumpir(Request $request, int $id): JsonResponse
    {
        return $this->registrar($request, $id, interrumpe: true);
    }

    /**
     * GET /api/seguridad/reportes/{id}
     * Solo el reportante y el admin.
     */
    public function show(Request $request, int $id): JsonResponse
    {
        $reporte = ReporteSeguridad::with('evidencias')->find($id);

        if (!$reporte) {
            return $this->error('Reporte no encontrado.', 404);
        }

        if (!$this->puedeVer($request, $reporte)) {
            return $this->error('No tienes acceso a este reporte.', 403);
        }

        return $this->success('OK', ['reporte' => new ReporteSeguridadResource($reporte)]);
    }

    private function registrar(Request $request, int $servicioId, bool $interrumpe): JsonResponse
    {
        $validated = $request->validate([
            'categoria'       => 'required|string|in:' . implode(',', ReporteSeguridad::CATEGORIAS),
            'descripcion'     => 'required|string|min:5|max:2000',
            'idempotency_key' => 'required|string|max:80',
        ]);

        $user = $request->user();

        try {
            return DB::transaction(function () use ($request, $servicioId, $validated, $interrumpe, $user) {
                // Mismo lock que usan finalizar/confirmar-fin/cancelar: la
                // interrupcion y cualquier transicion se serializan.
                $servicio = Servicio::query()->with('proveedor')->lockForUpdate()->find($servicioId);

                if (!$servicio) {
                    return $this->error('Servicio no encontrado.', 404);
                }

                $contraparteId = $this->contraparteDe($servicio, $user->id);
                if ($contraparteId === null) {
                    return $this->error('Solo el cliente o el proveedor del servicio pueden reportar.', 403);
                }

                // La idempotencia se resuelve antes de validar el estado: repetir
                // la peticion de una interrupcion ya hecha devuelve lo mismo.
                $previa = ReporteSeguridad::where('reportante_id', $user->id)
                    ->where('idempotency_key', $validated['idempotency_key'])
                    ->first();

                if ($previa) {
                    return $previa->servicio_id === $servicio->id && $previa->interrumpio_servicio === $interrumpe
                        ? $this->respuesta($previa, $servicio, 200)
                        : $this->error('La clave de idempotencia ya se usó en otra operación.', 409);
                }

                if (!in_array($servicio->estado, self::ESTADOS_DISPONIBLES, true)) {
                    return $this->error('El Centro de seguridad no está disponible para este servicio en su estado actual.', 422);
                }

                $reporte = ReporteSeguridad::create([
                    'servicio_id'            => $servicio->id,
                    'reportante_id'          => $user->id,
                    'categoria'              => $validated['categoria'],
                    'descripcion'            => $validated['descripcion'],
                    'interrumpio_servicio'   => $interrumpe,
                    'estado_servicio_previo' => $servicio->estado,
                    'estado'                 => 'recibido',
                    'idempotency_key'        => $validated['idempotency_key'],
                ]);

                HistorialReporteSeguridad::create([
                    'reporte_id'      => $reporte->id,
                    'actor_id'        => $user->id,
                    'estado_anterior' => null,
                    'estado_nuevo'    => 'recibido',
                    'correlation_id'  => $request->attributes->get(CorrelationId::ATTRIBUTE),
                ]);

                if ($interrumpe) {
                    // Estado terminal: se anulan los codigos para que nada pueda
                    // iniciar ni cerrar el servicio despues.
                    $servicio->update([
                        'estado'        => 'interrumpido_seguridad',
                        'codigo_inicio' => null,
                        'codigo_fin'    => null,
                    ]);
                }

                // Notificacion generica: solo el ID del servicio, sin contenido del reporte.
                Notificacion::create([
                    'destinatario_id' => $contraparteId,
                    'tipo'            => $interrumpe ? 'servicio_interrumpido_seguridad' : 'servicio_seguridad_reporte',
                    'titulo'          => $interrumpe ? 'Servicio interrumpido por seguridad' : 'Se registró un reporte de seguridad',
                    'mensaje'         => $interrumpe
                        ? 'Un servicio fue interrumpido por motivos de seguridad. Revisa su estado.'
                        : 'Se registró un reporte de seguridad sobre un servicio tuyo. Revisa su estado.',
                    'datos'           => ['servicio_id' => $servicio->id],
                ]);

                return $this->respuesta($reporte, $servicio, 201);
            });
        } catch (UniqueConstraintViolationException) {
            // Carrera perdida contra un indice unico: repeticion idempotente o
            // interrupcion ya registrada por la otra parte.
            $existente = ReporteSeguridad::where('reportante_id', $user->id)
                ->where('idempotency_key', $validated['idempotency_key'])
                ->where('servicio_id', $servicioId)
                ->where('interrumpio_servicio', $interrumpe)
                ->first();

            return $existente
                ? $this->respuesta($existente, Servicio::with('proveedor')->find($servicioId), 200)
                : $this->error('Este servicio ya fue interrumpido por seguridad.', 409);
        }
    }

    private function respuesta(ReporteSeguridad $reporte, Servicio $servicio, int $status): JsonResponse
    {
        $reporte->load('evidencias');
        $servicio->refresh()->loadMissing(['cliente', 'proveedor.categoria', 'categoria']);

        return $this->success(
            $status === 201 ? 'Reporte registrado.' : 'Reporte ya registrado.',
            [
                'reporte'  => new ReporteSeguridadResource($reporte),
                'servicio' => new ServicioResource($servicio),
            ],
            $status
        );
    }

    /** ID de usuario de la contraparte, o null si quien consulta no participa. */
    private function contraparteDe(Servicio $servicio, int $userId): ?int
    {
        $proveedorUserId = (int) $servicio->proveedor?->user_id;

        return match (true) {
            $servicio->cliente_id === $userId => $proveedorUserId,
            $proveedorUserId === $userId => (int) $servicio->cliente_id,
            default => null,
        };
    }

    private function puedeVer(Request $request, ReporteSeguridad $reporte): bool
    {
        $user = $request->user();

        return $user->role === 'admin' || $reporte->reportante_id === $user->id;
    }
}
