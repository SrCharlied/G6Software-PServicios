<?php

namespace App\Http\Resources;

use App\Models\ReporteSeguridad;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Reporte de seguridad para el panel administrativo. Es el unico lugar donde
 * salen las notas internas y el historial de auditoria. Aunque es admin, la
 * ruta fisica y el hash de las evidencias nunca se serializan: la descarga va
 * por el endpoint autorizado.
 */
class AdminReporteSeguridadResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'servicio_id' => $this->servicio_id,
            'categoria' => $this->categoria,
            'descripcion' => $this->descripcion,
            'interrumpio_servicio' => (bool) $this->interrumpio_servicio,
            // Estado DEL REPORTE; el del servicio va aparte en `servicio.estado`.
            'estado' => $this->estado,
            'estado_servicio_previo' => $this->estado_servicio_previo,
            'transiciones_permitidas' => ReporteSeguridad::TRANSICIONES[$this->estado] ?? [],
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
            'reportante' => $this->whenLoaded('reportante', fn () => $this->reportante ? [
                'id' => $this->reportante->id,
                'name' => $this->reportante->name,
                'role' => $this->reportante->role,
            ] : null),
            // Estado ACTUAL del servicio, independiente del estado del reporte.
            'servicio' => $this->whenLoaded('servicio', fn () => $this->servicio ? [
                'id' => $this->servicio->id,
                'estado' => $this->servicio->estado,
                'cliente' => $this->servicio->relationLoaded('cliente') && $this->servicio->cliente
                    ? ['id' => $this->servicio->cliente->id, 'name' => $this->servicio->cliente->name]
                    : null,
                'proveedor' => $this->servicio->relationLoaded('proveedor') && $this->servicio->proveedor
                    ? ['id' => $this->servicio->proveedor->id, 'nombre' => $this->servicio->proveedor->nombre]
                    : null,
            ] : null),
            'evidencias_count' => $this->when(isset($this->evidencias_count), fn () => (int) $this->evidencias_count),
            'evidencias' => $this->whenLoaded('evidencias', fn () => $this->evidencias->map(fn ($e) => [
                'id' => $e->id,
                'orden' => $e->orden,
                'nombre' => $e->nombre_original,
                'mime' => $e->mime,
                'tamano_bytes' => $e->tamano_bytes,
            ])->values()),
            'historial' => $this->whenLoaded('historial', fn () => $this->historial->map(fn ($h) => [
                'id' => $h->id,
                'actor' => $h->relationLoaded('actor') && $h->actor
                    ? ['id' => $h->actor->id, 'name' => $h->actor->name, 'role' => $h->actor->role]
                    : null,
                'estado_anterior' => $h->estado_anterior,
                'estado_nuevo' => $h->estado_nuevo,
                'nota_interna' => $h->getRawOriginal('nota_interna'),
                'correlation_id' => $h->correlation_id,
                'created_at' => $h->created_at?->toIso8601String(),
            ])->values()),
        ];
    }
}
