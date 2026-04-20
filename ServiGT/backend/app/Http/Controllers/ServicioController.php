<?php

namespace App\Http\Controllers;

use App\Models\Notificacion;
use App\Models\Servicio;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class ServicioController extends Controller
{
    // Cliente crea una solicitud de servicio
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'proveedor_id'   => 'required|exists:proveedores,id',
            'categoria_id'   => 'nullable|exists:categorias,id',
            'descripcion'    => 'required|string|max:1000',
            'fecha_agendada' => 'nullable|date|after:now',
            'direccion'      => 'nullable|string|max:500',
            'monto_acordado' => 'nullable|numeric|min:0',
        ]);

        $validated['cliente_id'] = $request->user()->id;
        $validated['estado']     = 'pendiente';

        $servicio = Servicio::create($validated);
        $servicio->load(['cliente', 'proveedor', 'categoria']);

        // Notificar al proveedor
        $proveedor = $servicio->proveedor;
        if ($proveedor?->user_id) {
            Notificacion::create([
                'destinatario_id' => $proveedor->user_id,
                'tipo'            => 'nueva_solicitud',
                'titulo'          => 'Nueva solicitud de servicio',
                'mensaje'         => "{$request->user()->name} solicito tu servicio: {$validated['descripcion']}",
                'datos'           => ['servicio_id' => $servicio->id],
            ]);
        }

        return response()->json([
            'message'  => 'Solicitud enviada exitosamente',
            'servicio' => $servicio,
        ], 201);
    }

    // Ver detalle de un servicio
    public function show(int $id, Request $request): JsonResponse
    {
        $servicio = Servicio::with(['cliente', 'proveedor.categoria', 'categoria', 'calificaciones', 'pago'])
            ->find($id);

        if (!$servicio) {
            return response()->json(['message' => 'Servicio no encontrado'], 404);
        }

        $userId = $request->user()->id;
        $proveedorUserId = $servicio->proveedor?->user_id;

        if ($servicio->cliente_id !== $userId && $proveedorUserId !== $userId) {
            return response()->json(['message' => 'No autorizado'], 403);
        }

        return response()->json(['servicio' => $servicio]);
    }

    // Proveedor: ver solicitudes entrantes
    public function solicitudesProveedor(Request $request): JsonResponse
    {
        $user      = $request->user();
        $proveedor = $user->proveedor;

        if (!$proveedor) {
            return response()->json(['message' => 'No tienes perfil de proveedor'], 404);
        }

        $estado   = $request->query('estado');
        $query    = Servicio::with(['cliente', 'categoria'])
            ->where('proveedor_id', $proveedor->id);

        if ($estado) {
            $query->where('estado', $estado);
        }

        $servicios = $query->orderBy('created_at', 'desc')->get();

        return response()->json([
            'servicios' => $servicios,
            'total'     => $servicios->count(),
        ]);
    }

    // Cliente: ver sus solicitudes
    public function solicitudesCliente(Request $request): JsonResponse
    {
        $estado    = $request->query('estado');
        $query     = Servicio::with(['proveedor.categoria', 'categoria'])
            ->where('cliente_id', $request->user()->id);

        if ($estado) {
            $query->where('estado', $estado);
        }

        $servicios = $query->orderBy('created_at', 'desc')->get();

        return response()->json(['servicios' => $servicios]);
    }

    // Proveedor acepta solicitud
    public function aceptar(int $id, Request $request): JsonResponse
    {
        $servicio = $this->getServicioProveedor($id, $request);
        if ($servicio instanceof JsonResponse) return $servicio;

        if ($servicio->estado !== 'pendiente') {
            return response()->json(['message' => 'Solo se pueden aceptar solicitudes pendientes'], 422);
        }

        $servicio->update(['estado' => 'aceptado']);

        Notificacion::create([
            'destinatario_id' => $servicio->cliente_id,
            'tipo'            => 'solicitud_aceptada',
            'titulo'          => 'Solicitud aceptada',
            'mensaje'         => 'El proveedor acepto tu solicitud de servicio.',
            'datos'           => ['servicio_id' => $servicio->id],
        ]);

        return response()->json(['message' => 'Solicitud aceptada', 'servicio' => $servicio]);
    }

    // Proveedor rechaza solicitud
    public function rechazar(int $id, Request $request): JsonResponse
    {
        $servicio = $this->getServicioProveedor($id, $request);
        if ($servicio instanceof JsonResponse) return $servicio;

        if ($servicio->estado !== 'pendiente') {
            return response()->json(['message' => 'Solo se pueden rechazar solicitudes pendientes'], 422);
        }

        $request->validate(['motivo' => 'nullable|string|max:500']);

        $servicio->update([
            'estado'             => 'rechazado',
            'motivo_cancelacion' => $request->motivo,
        ]);

        Notificacion::create([
            'destinatario_id' => $servicio->cliente_id,
            'tipo'            => 'solicitud_rechazada',
            'titulo'          => 'Solicitud rechazada',
            'mensaje'         => 'El proveedor no pudo aceptar tu solicitud.',
            'datos'           => ['servicio_id' => $servicio->id],
        ]);

        return response()->json(['message' => 'Solicitud rechazada', 'servicio' => $servicio]);
    }

    // Actualizar estado del servicio
    public function actualizarEstado(int $id, Request $request): JsonResponse
    {
        $servicio = $this->getServicioProveedor($id, $request);
        if ($servicio instanceof JsonResponse) return $servicio;

        $request->validate([
            'estado' => 'required|in:en_camino,en_progreso,completado,cancelado',
        ]);

        $servicio->update(['estado' => $request->estado]);

        if ($request->estado === 'completado') {
            Notificacion::create([
                'destinatario_id' => $servicio->cliente_id,
                'tipo'            => 'servicio_completado',
                'titulo'          => 'Servicio completado',
                'mensaje'         => 'El servicio fue marcado como completado. Puedes calificar al proveedor.',
                'datos'           => ['servicio_id' => $servicio->id],
            ]);
        }

        return response()->json(['message' => 'Estado actualizado', 'servicio' => $servicio]);
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    private function getServicioProveedor(int $id, Request $request)
    {
        $servicio  = Servicio::find($id);
        if (!$servicio) {
            return response()->json(['message' => 'Servicio no encontrado'], 404);
        }

        $proveedor = $request->user()->proveedor;
        if (!$proveedor || $servicio->proveedor_id !== $proveedor->id) {
            return response()->json(['message' => 'No autorizado'], 403);
        }

        return $servicio;
    }
}
