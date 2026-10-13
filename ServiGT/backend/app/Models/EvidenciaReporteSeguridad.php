<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class EvidenciaReporteSeguridad extends Model
{
    protected $table = 'evidencias_reporte_seguridad';

    public const UPDATED_AT = null;

    // La ruta fisica nunca sale en JSON, ni siquiera por un `toArray()` accidental.
    protected $hidden = ['ruta_privada', 'sha256'];

    protected $fillable = [
        'reporte_id',
        'orden',
        'ruta_privada',
        'nombre_original',
        'mime',
        'tamano_bytes',
        'sha256',
    ];

    public function reporte(): BelongsTo
    {
        return $this->belongsTo(ReporteSeguridad::class, 'reporte_id');
    }
}
