<?php

namespace App\Http\Controllers;

use App\Models\Calificacion;
use App\Models\Proveedor;
use App\Models\Servicio;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CalificacionController extends Controller
{
    // Crear calificacion (solo si el servicio esta completado)
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'servicio_id'     => 'required|exists:servicios,id',
            'destinatario_id' => 'required|exists:users,id',
            'puntuacion'      => 'required|integer|between:1,5',
            'comentario'      => 'nullable|string|max:1000',
        ]);

        $servicio = Servicio::find($validated['servicio_id']);
        $userId   = $request->user()->id;

        if ($servicio->estado !== 'completado') {
            return response()->json(['message' => 'Solo puedes calificar servicios completados'], 422);
        }

        $esParte = $servicio->cliente_id === $userId
            || $servicio->proveedor?->user_id === $userId;

        if (!$esParte) {
            return response()->json(['message' => 'No participaste en este servicio'], 403);
        }

        $yaCalifico = Calificacion::where('servicio_id', $validated['servicio_id'])
            ->where('autor_id', $userId)
            ->exists();

        if ($yaCalifico) {
            return response()->json(['message' => 'Ya calificaste este servicio'], 422);
        }

        $validated['autor_id']     = $userId;
        $validated['es_verificada'] = true;

        $calificacion = Calificacion::create($validated);

        // Actualizar promedio del proveedor si se califica a un proveedor
        $proveedor = Proveedor::where('user_id', $validated['destinatario_id'])->first();
        if ($proveedor) {
            $promedio = Calificacion::where('destinatario_id', $validated['destinatario_id'])
                ->avg('puntuacion');
            $total = Calificacion::where('destinatario_id', $validated['destinatario_id'])->count();
            $proveedor->update([
                'calificacion_promedio' => round($promedio, 2),
                'total_calificaciones'  => $total,
            ]);
        }

        return response()->json([
            'message'      => 'Calificacion enviada',
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
