<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Evento de auditoria inmutable: la base rechaza cualquier UPDATE.
 */
class HistorialReporteSeguridad extends Model
{
    protected $table = 'historial_reportes_seguridad';

    public const UPDATED_AT = null;

    // La nota interna es solo para administradores: no sale en un JSON accidental.
    protected $hidden = ['nota_interna'];

    protected $fillable = [
        'reporte_id',
        'actor_id',
        'estado_anterior',
        'estado_nuevo',
        'nota_interna',
        'correlation_id',
    ];

    public function reporte(): BelongsTo
    {
        return $this->belongsTo(ReporteSeguridad::class, 'reporte_id');
    }

    public function actor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'actor_id');
    }
}
