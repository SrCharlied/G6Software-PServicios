<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Lote de materiales. Nunca expone telefono ni correo del vendedor: el
 * contacto ocurre unicamente por el chat interno de la reserva.
 */
class PublicacionMaterialResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $user = $request->user();
        $esVendedor = $user && $this->vendedor && $this->vendedor->user_id === $user->id;

        $data = [
            'id' => $this->id,
            'titulo' => $this->titulo,
            'descripcion' => $this->descripcion,
            'cantidad' => (float) $this->cantidad,
            'unidad' => $this->unidad,
            'precio_referencial' => (float) $this->precio_referencial,
            'departamento' => $this->departamento,
            'municipio' => $this->municipio,
            'estado' => $this->estado,
            'es_mio' => $esVendedor,
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
            'imagenes' => $this->whenLoaded('imagenes', fn () => $this->imagenes
                ->map(fn ($i) => ['id' => $i->id, 'url' => $i->ruta, 'orden' => $i->orden])
                ->values()),
            'vendedor' => $this->whenLoaded('vendedor', fn () => $this->vendedor ? [
                'id' => $this->vendedor->id,
                'nombre' => $this->vendedor->nombre,
                'foto_perfil' => $this->vendedor->foto_perfil,
                'calificacion_promedio' => (float) ($this->vendedor->calificacion_promedio ?? 0),
            ] : null),
        ];

        if ($esVendedor) {
            $data['servicio_id'] = $this->servicio_id;

            if (isset($this->reservas_pendientes_count)) {
                $data['reservas_pendientes'] = (int) $this->reservas_pendientes_count;
            }
        }

        // Reserva del comprador autenticado sobre este lote (si existe).
        // Se precarga filtrada por comprador; nunca expone reservas ajenas.
        if (!$esVendedor && $this->relationLoaded('reservas')) {
            $mia = $this->reservas->sortByDesc('id')->first();
            $data['mi_reserva'] = $mia ? ['id' => $mia->id, 'estado' => $mia->estado] : null;
        }

        return $data;
    }
}
