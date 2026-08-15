<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

/**
 * Una fila por activacion o renovacion Premium. El ciclo es correlativo por
 * proveedor y la BD lo protege con UNIQUE (proveedor_id, ciclo), de modo que
 * los 10 creditos de un ciclo no se pueden acreditar dos veces.
 */
class ActivacionPremium extends Model
{
    use HasFactory;

    protected $table = 'activaciones_premium';

    protected $fillable = [
        'proveedor_id',
        'ciclo',
        'monto_gtq',
        'creditos_otorgados',
        'inicio_at',
        'vence_at',
        'referencia',
        'idempotency_key',
    ];

    protected $casts = [
        'ciclo'              => 'integer',
        'monto_gtq'          => 'decimal:2',
        'creditos_otorgados' => 'integer',
        'inicio_at'          => 'datetime',
        'vence_at'           => 'datetime',
    ];

    public function proveedor()
    {
        return $this->belongsTo(Proveedor::class, 'proveedor_id');
    }
}
