<?php

namespace App\Http\Controllers;

use App\Models\Mensaje;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class MessageController extends Controller
{
    // Enviar mensaje
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'receptor_id' => 'required|exists:users,id',
            'contenido'   => 'required|string|max:2000',
            'servicio_id' => 'nullable|exists:servicios,id',
        ]);

        $validated['emisor_id'] = $request->user()->id;

        if ($validated['emisor_id'] === (int) $validated['receptor_id']) {
            return response()->json(['message' => 'No puedes enviarte mensajes a ti mismo'], 422);
        }

        $mensaje = Mensaje::create($validated);
        $mensaje->load(['emisor:id,name,role,foto_perfil', 'receptor:id,name,role,foto_perfil']);

        return response()->json([
            'message' => 'Mensaje enviado',
            'mensaje' => $mensaje,
        ], 201);
    }

    // Obtener conversacion entre dos usuarios
    public function conversacion(int $otroUsuarioId, Request $request): JsonResponse
    {
        $userId = $request->user()->id;

        $mensajes = Mensaje::with([
                'emisor:id,name,role,foto_perfil',
                'receptor:id,name,role,foto_perfil',
            ])
            ->where(function ($q) use ($userId, $otroUsuarioId) {
                $q->where('emisor_id', $userId)->where('receptor_id', $otroUsuarioId);
            })
            ->orWhere(function ($q) use ($userId, $otroUsuarioId) {
                $q->where('emisor_id', $otroUsuarioId)->where('receptor_id', $userId);
            })
            ->orderBy('created_at', 'asc')
            ->get();

        // Marcar como leidos los mensajes recibidos
        Mensaje::where('emisor_id', $otroUsuarioId)
            ->where('receptor_id', $userId)
            ->where('leido', false)
            ->update(['leido' => true]);

        return response()->json(['mensajes' => $mensajes]);
    }

    // Listar conversaciones del usuario autenticado
    public function misConversaciones(Request $request): JsonResponse
    {
        $userId = $request->user()->id;

        $mensajes = Mensaje::with([
                'emisor:id,name,role,foto_perfil',
                'receptor:id,name,role,foto_perfil',
            ])
            ->where('emisor_id', $userId)
            ->orWhere('receptor_id', $userId)
            ->orderBy('created_at', 'desc')
            ->get()
            ->groupBy(function ($m) use ($userId) {
                return $m->emisor_id === $userId ? $m->receptor_id : $m->emisor_id;
            })
            ->map(fn ($grupo) => $grupo->first());

        return response()->json(['conversaciones' => $mensajes->values()]);
    }
}
