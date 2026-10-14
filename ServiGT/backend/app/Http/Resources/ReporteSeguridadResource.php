<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Reporte de seguridad visto por quien lo escribio (o por el admin en la
 * consulta individual). Nunca incluye la ruta fisica de las evidencias, el
 * historial de auditoria ni las notas internas: eso es solo del panel admin.
 */
class ReporteSeguridadResource extends JsonResource
{
    public const MAX_EVIDENCIAS = 3;

    public function toArray(Request $request): array
    {
        $evidencias = $this->relationLoaded('evidencias') ? $this->evidencias : collect();

        return [
            'id' => $this->id,
            'servicio_id' => $this->servicio_id,
            'categoria' => $this->categoria,
            'descripcion' => $this->descripcion,
            'interrumpio_servicio' => (bool) $this->interrumpio_servicio,
            'estado' => $this->estado,
            'evidencias' => $evidencias->map(fn ($e) => [
                'id' => $e->id,
                'orden' => $e->orden,
                'nombre' => $e->nombre_original,
                'mime' => $e->mime,
                'tamano_bytes' => $e->tamano_bytes,
            ])->values(),
            'puede_adjuntar_evidencia' => $evidencias->count() < self::MAX_EVIDENCIAS,
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
