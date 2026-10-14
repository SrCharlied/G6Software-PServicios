<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Resena publica de un proveedor (task 1.3, Sprint 9). Lista blanca: solo lo
 * necesario para mostrarla. Del autor viajan `id` y `name`; nunca correo,
 * telefono, rol, documento ni fechas de su cuenta. Tampoco `servicio_id` ni
 * `destinatario_id`: el user_id del proveedor no es publico (ver
 * ProveedorResource). Requiere cargado `autor`.
 */
class CalificacionResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'puntuacion' => $this->puntuacion,
            'comentario' => $this->comentario,
            'es_verificada' => $this->es_verificada,
            'created_at' => $this->created_at?->toIso8601String(),
            'autor' => $this->whenLoaded('autor', fn () => $this->autor ? [
                'id' => $this->autor->id,
                'name' => $this->autor->name,
            ] : null),
        ];
    }
}
