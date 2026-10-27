<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Solicitud de eliminacion de cuenta (HU 3.1). Eliminar es anonimizar y
 * revocar acceso, nunca DELETE de users.
 *
 *   pendiente           -> recibida, aun sin anonimizar
 *   rechazada           -> bloqueada (p. ej. operaciones activas); admite reintento
 *   limpieza_pendiente  -> cuenta anonimizada, faltan archivos del manifiesto
 *   completada          -> anonimizada y sin archivos pendientes
 *
 * La base garantiza una sola solicitud pendiente/limpieza_pendiente/completada
 * por usuario y la coherencia entre estado y fechas.
 */
class SolicitudEliminacionCuenta extends Model
{
    protected $table = 'solicitudes_eliminacion_cuenta';

    public const PENDIENTE = 'pendiente';
    public const RECHAZADA = 'rechazada';
    public const LIMPIEZA_PENDIENTE = 'limpieza_pendiente';
    public const COMPLETADA = 'completada';

    public const ESTADOS_VIGENTES = [self::PENDIENTE, self::LIMPIEZA_PENDIENTE, self::COMPLETADA];

    // Las rutas del manifiesto son fisicas: no salen en un JSON accidental.
    protected $hidden = ['manifiesto_archivos', 'ultimo_error_limpieza'];

    protected $fillable = [
        'user_id',
        'idempotency_key',
        'estado',
        'motivo_rechazo',
        'manifiesto_archivos',
        'intentos_limpieza',
        'ultimo_error_limpieza',
        'anonimizada_at',
        'completada_at',
    ];

    protected $casts = [
        'manifiesto_archivos' => 'array',
        'intentos_limpieza'   => 'integer',
        'anonimizada_at'      => 'datetime',
        'completada_at'       => 'datetime',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function scopeVigentes(Builder $query): Builder
    {
        return $query->whereIn('estado', self::ESTADOS_VIGENTES);
    }
}
