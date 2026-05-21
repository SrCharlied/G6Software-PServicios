<?php

namespace App\Http\Controllers;

use App\Models\Notificacion;
use App\Models\Servicio;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ServicioController extends Controller
{
    use ApiResponse;

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

        $validated['cliente_id']    = $request->user()->id;
        $validated['estado']        = 'pendiente';
        $validated['codigo_inicio'] = str_pad((string) random_int(0, 999999), 6, '0', STR_PAD_LEFT);

        $servicio = Servicio::create($validated);
        $servicio->load(['cliente', 'proveedor', 'categoria']);

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

        return $this->success('Solicitud enviada exitosamente', ['servicio' => $servicio], 201);
    }

    public function show(int $id, Request $request): JsonResponse
    {
        $servicio = Servicio::with(['cliente', 'proveedor.categoria', 'categoria', 'calificaciones.autor:id,name', 'pago'])
            ->find($id);

        if (!$servicio) {
            return $this->error('Servicio no encontrado', 404);
        }

        $userId          = $request->user()->id;
        $proveedorUserId = $servicio->proveedor?->user_id;

        if ($servicio->cliente_id !== $userId && $proveedorUserId !== $userId) {
            return $this->error('No tienes permiso para ver este servicio', 403);
        }

        return $this->success('OK', ['servicio' => $servicio]);
    }

    public function solicitudesProveedor(Request $request): JsonResponse
    {
        $user      = $request->user();
        $proveedor = $user->proveedor;

        if (!$proveedor) {
            return $this->error('No tienes perfil de proveedor', 404);
        }

        $estado = $request->query('estado');
        $query  = Servicio::with(['cliente', 'categoria'])
            ->where('proveedor_id', $proveedor->id);

        if ($estado) {
            $query->where('estado', $estado);
        }

        $servicios = $query->orderBy('created_at', 'desc')->get();

        return $this->success('OK', ['servicios' => $servicios, 'total' => $servicios->count()]);
    }

    public function solicitudesCliente(Request $request): JsonResponse
    {
        $estado = $request->query('estado');
        $query  = Servicio::with(['proveedor.categoria', 'categoria', 'calificaciones.autor:id,name'])
            ->where('cliente_id', $request->user()->id);

        if ($estado) {
            $query->where('estado', $estado);
        }

        $servicios = $query->orderBy('created_at', 'desc')->get();

        return $this->success('OK', ['servicios' => $servicios]);
    }

    public function aceptar(int $id, Request $request): JsonResponse
    {
        $servicio = $this->getServicioProveedor($id, $request);
        if ($servicio instanceof JsonResponse) return $servicio;

        if ($servicio->estado !== 'pendiente') {
            return $this->error('Solo se pueden aceptar solicitudes pendientes', 422);
        }

        $servicio->update(['estado' => 'aceptado']);

        Notificacion::create([
            'destinatario_id' => $servicio->cliente_id,
            'tipo'            => 'solicitud_aceptada',
            'titulo'          => 'Solicitud aceptada',
            'mensaje'         => 'El proveedor acepto tu solicitud de servicio.',
            'datos'           => ['servicio_id' => $servicio->id],
        ]);

        return $this->success('Solicitud aceptada', ['servicio' => $servicio]);
    }

    public function rechazar(int $id, Request $request): JsonResponse
    {
        $servicio = $this->getServicioProveedor($id, $request);
        if ($servicio instanceof JsonResponse) return $servicio;

        if ($servicio->estado !== 'pendiente') {
            return $this->error('Solo se pueden rechazar solicitudes pendientes', 422);
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

        return $this->success('Solicitud rechazada', ['servicio' => $servicio]);
    }

    public function actualizarEstado(int $id, Request $request): JsonResponse
    {
        $servicio = $this->getServicioProveedor($id, $request);
        if ($servicio instanceof JsonResponse) return $servicio;

        $request->validate([
            'estado' => 'required|in:en_camino,completado,cancelado',
        ]);

        $servicio->update(['estado' => $request->estado]);

        if ($request->estado === 'completado') {
            $this->notificarServicioCalificable($servicio);
        }

        return $this->success('Estado actualizado', ['servicio' => $servicio]);
    }

    public function iniciar(int $id, Request $request): JsonResponse
    {
        $request->validate([
            'codigo' => 'required|string|size:6',
        ]);

        $servicio = $this->getServicioProveedor($id, $request);
        if ($servicio instanceof JsonResponse) return $servicio;

        if ($servicio->estado !== 'aceptado') {
            return $this->error('Solo se puede iniciar un servicio aceptado', 422);
        }

        if (!hash_equals((string) $servicio->codigo_inicio, (string) $request->codigo)) {
            return $this->error('Codigo de inicio invalido', 422);
        }

        $servicio->update(['estado' => 'en_progreso']);

        Notificacion::create([
            'destinatario_id' => $servicio->cliente_id,
            'tipo'            => 'servicio_iniciado',
            'titulo'          => 'Servicio iniciado',
            'mensaje'         => 'El proveedor inicio el servicio.',
            'datos'           => ['servicio_id' => $servicio->id],
        ]);

        return $this->success('Servicio iniciado', ['servicio' => $servicio]);
    }

    public function finalizar(int $id, Request $request): JsonResponse
    {
        $servicio = $this->getServicioProveedor($id, $request);
        if ($servicio instanceof JsonResponse) return $servicio;

        if ($servicio->estado !== 'en_progreso') {
            return $this->error('Solo se puede finalizar un servicio en progreso', 422);
        }

        $codigoFin = str_pad((string) random_int(0, 999999), 6, '0', STR_PAD_LEFT);

        $servicio->update([
            'codigo_fin' => $codigoFin,
            'estado'     => 'por_confirmar',
        ]);

        Notificacion::create([
            'destinatario_id' => $servicio->cliente_id,
            'tipo'            => 'servicio_por_confirmar',
            'titulo'          => 'Confirma la finalizacion del servicio',
            'mensaje'         => 'El proveedor termino el trabajo. Pide el codigo de 6 digitos para confirmar la finalizacion.',
            'datos'           => ['servicio_id' => $servicio->id],
        ]);

        return $this->success('Servicio listo para confirmar', [
            'servicio'   => $servicio,
            'codigo_fin' => $codigoFin,
        ]);
    }

    // ── Helper ────────────────────────────────────────────────────────────────

    private function getServicioProveedor(int $id, Request $request)
    {
        $servicio = Servicio::find($id);
        if (!$servicio) {
            return $this->error('Servicio no encontrado', 404);
        }

        $proveedor = $request->user()->proveedor;
        if (!$proveedor || $servicio->proveedor_id !== $proveedor->id) {
            return $this->error('No tienes permiso para gestionar este servicio', 403);
        }

        return $servicio;
    }

    private function notificarServicioCalificable(Servicio $servicio): void
    {
        $yaExiste = Notificacion::where('destinatario_id', $servicio->cliente_id)
            ->where('tipo', 'servicio_calificable')
            ->where('datos->servicio_id', $servicio->id)
            ->exists();

        if ($yaExiste) {
            return;
        }

        $servicio->loadMissing('proveedor');

        Notificacion::create([
            'destinatario_id' => $servicio->cliente_id,
            'tipo'            => 'servicio_calificable',
            'titulo'          => 'Servicio listo para calificar',
            'mensaje'         => 'El servicio fue completado. Ya puedes calificar a ' . ($servicio->proveedor?->nombre ?? 'tu proveedor') . '.',
            'datos'           => ['servicio_id' => $servicio->id],
        ]);
    }
}
