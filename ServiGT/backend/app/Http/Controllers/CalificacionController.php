<?php

namespace App\Http\Controllers;

use App\Models\Calificacion;
use App\Models\Proveedor;
use App\Models\Servicio;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CalificacionController extends Controller
{
    use ApiResponse;

    public function calificarServicio(int $servicioId, Request $request): JsonResponse
    {
        $validated = $request->validate([
            'puntuacion' => 'required|integer|between:1,5',
            'comentario' => 'nullable|string|max:500',
        ]);

        $servicio = Servicio::with('proveedor')->find($servicioId);

        if (!$servicio) {
            return $this->error('Servicio no encontrado', 404);
        }

        $userId = $request->user()->id;

        if ($servicio->cliente_id !== $userId) {
            return $this->error('Solo el cliente que contrato el servicio puede calificarlo', 403);
        }

        if ($servicio->estado !== 'completado') {
            return $this->error('Solo puedes calificar servicios completados', 422);
        }

        if (!$servicio->proveedor?->user_id) {
            return $this->error('El servicio no tiene un proveedor valido para calificar', 422);
        }

        // Defensa en profundidad: `ServicioController::store` ya impide crear
        // un servicio hacia el perfil propio, pero los servicios creados antes
        // de ese guard siguen en la base y no deben poder autocalificarse.
        if ($servicio->proveedor->user_id === $userId) {
            return $this->error('No puedes calificar tu propio perfil de proveedor.', 403);
        }

        $yaCalifico = Calificacion::where('servicio_id', $servicio->id)
            ->where('autor_id', $userId)
            ->exists();

        if ($yaCalifico) {
            return $this->error('Ya calificaste este servicio', 422);
        }

        $calificacion = Calificacion::create([
            'servicio_id'     => $servicio->id,
            'autor_id'        => $userId,
            'destinatario_id' => $servicio->proveedor->user_id,
            'puntuacion'      => $validated['puntuacion'],
            'comentario'      => $validated['comentario'] ?? null,
            'es_verificada'   => true,
        ]);

        return $this->success('Calificacion enviada', [
            'calificacion' => $calificacion->load('autor:id,name'),
        ], 201);
    }

    // Crear calificacion (solo si el servicio esta completado)
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'servicio_id'     => 'required|exists:servicios,id',
            'destinatario_id' => 'nullable|exists:users,id',
            'puntuacion'      => 'required|integer|between:1,5',
            'comentario'      => 'nullable|string|max:500',
        ]);

        $servicio = Servicio::with('proveedor')->find($validated['servicio_id']);
        $userId   = $request->user()->id;

        if ($servicio->estado !== 'completado') {
            return $this->error('Solo puedes calificar servicios completados', 422);
        }

        $esCliente = $servicio->cliente_id === $userId;
        $esProveedor = $servicio->proveedor?->user_id === $userId;

        if (!$esCliente && !$esProveedor) {
            return $this->error('No participaste en este servicio', 403);
        }

        $destinatarioId = $esCliente
            ? $servicio->proveedor?->user_id
            : $servicio->cliente_id;

        if (!$destinatarioId) {
            return $this->error('El servicio no tiene una contraparte valida para calificar', 422);
        }

        if ($destinatarioId === $userId) {
            return $this->error('No puedes calificar tu propio perfil.', 403);
        }

        if (isset($validated['destinatario_id']) && (int) $validated['destinatario_id'] !== (int) $destinatarioId) {
            return $this->error('El destinatario no corresponde a la contraparte del servicio', 422);
        }

        $yaCalifico = Calificacion::where('servicio_id', $validated['servicio_id'])
            ->where('autor_id', $userId)
            ->exists();

        if ($yaCalifico) {
            return $this->error('Ya calificaste este servicio', 422);
        }

        $calificacion = Calificacion::create([
            'servicio_id'     => $servicio->id,
            'autor_id'        => $userId,
            'destinatario_id' => $destinatarioId,
            'puntuacion'      => $validated['puntuacion'],
            'comentario'      => $validated['comentario'] ?? null,
            'es_verificada'   => true,
        ]);

        // Actualizar promedio del proveedor si se califica a un proveedor
        $proveedor = Proveedor::where('user_id', $destinatarioId)->first();
        if ($proveedor) {
            $promedio = Calificacion::where('destinatario_id', $destinatarioId)
                ->avg('puntuacion');
            $total = Calificacion::where('destinatario_id', $destinatarioId)->count();
            $proveedor->update([
                'calificacion_promedio' => round($promedio, 2),
                'total_calificaciones'  => $total,
            ]);
        }

        return $this->success('Calificacion enviada', [
            'calificacion' => $calificacion->load('autor'),
        ], 201);
    }

    // Ver calificaciones de un proveedor
    public function porProveedor(int $proveedorId): JsonResponse
    {
        $proveedor = Proveedor::find($proveedorId);
        if (!$proveedor) {
            return response()->json(['message' => 'Proveedor no encontrado'], 404);
        }

        $calificaciones = Calificacion::with('autor')
            ->where('destinatario_id', $proveedor->user_id)
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json([
            'calificaciones'        => $calificaciones,
            'promedio'              => $proveedor->calificacion_promedio,
            'total_calificaciones'  => $proveedor->total_calificaciones,
        ]);
    }
}
