<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Reserva de material. Requiere cargadas `comprador` y `publicacion.vendedor`
 * para resolver el rol del usuario autenticado. Nunca incluye telefono ni
 * correo de ninguna de las partes: el contacto es el chat interno.
 */
class ReservaMaterialResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $userId = $request->user()?->id;
        $lote = $this->publicacion;

        $esComprador = $userId !== null && $this->comprador?->user_id === $userId;
        $esVendedor = $userId !== null && $lote?->vendedor?->user_id === $userId;
        $rol = $esComprador ? 'comprador' : ($esVendedor ? 'vendedor' : null);

        return [
            'id' => $this->id,
            'publicacion_id' => $this->publicacion_id,
            'estado' => $this->estado,
            'mensaje_inicial' => $this->mensaje_inicial,
            'rol' => $rol,
            'acciones' => $this->acciones($rol),
            // Contexto del hilo de mensajes habilitado para esta reserva.
            'chat' => ['tipo' => 'reserva', 'id' => $this->id],
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
            'comprador' => $this->whenLoaded('comprador', fn () => $this->comprador ? [
                'id' => $this->comprador->id,
                'nombre' => $this->comprador->nombre,
                'foto_perfil' => $this->comprador->foto_perfil,
                'calificacion_promedio' => (float) ($this->comprador->calificacion_promedio ?? 0),
            ] : null),
            'publicacion' => $this->whenLoaded('publicacion', fn () => $lote ? [
                'id' => $lote->id,
                'titulo' => $lote->titulo,
                'estado' => $lote->estado,
                'cantidad' => (float) $lote->cantidad,
                'unidad' => $lote->unidad,
                'precio_referencial' => (float) $lote->precio_referencial,
                'departamento' => $lote->departamento,
                'municipio' => $lote->municipio,
                'imagen_principal' => $lote->relationLoaded('imagenes') ? $lote->imagenes->first()?->ruta : null,
                'vendedor' => $lote->relationLoaded('vendedor') && $lote->vendedor ? [
                    'id' => $lote->vendedor->id,
                    'nombre' => $lote->vendedor->nombre,
                    'foto_perfil' => $lote->vendedor->foto_perfil,
                ] : null,
            ] : null),
        ];
    }

    /**
     * Acciones que el backend permite hoy a este rol sobre esta reserva. El
     * frontend solo las pinta: las reglas viven unicamente aqui.
     *
     * @return list<string>
     */
    private function acciones(?string $rol): array
    {
        // Un lote vendido o retirado congela sus reservas: no queda ninguna
        // accion que ofrecer (ver ReservaMaterialController::cancelar).
        if (in_array($this->publicacion?->estado, ['vendido', 'retirado'], true)) {
            return [];
        }

        return match (true) {
            $rol === 'vendedor' && $this->estado === 'pendiente' => $this->publicacion?->estado === 'disponible'
                ? ['aceptar', 'rechazar']
                : ['rechazar'],
            $rol === 'vendedor' && $this->estado === 'aceptada' => ['cancelar'],
            $rol === 'comprador' && in_array($this->estado, ['pendiente', 'aceptada'], true) => ['cancelar'],
            default => [],
        };
    }
}
