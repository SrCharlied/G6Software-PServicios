<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PagoPremium extends Model
{
    protected $table = 'pagos_premium';

    protected $fillable = [
        'proveedor_id',
        'recurrente',
        'estado',
        'referencia',
        'idempotency_key',
        'stripe_session_id',
        'fallo_motivo',
        'completada_at',
    ];

    protected $casts = [
        'recurrente'    => 'boolean',
        'completada_at' => 'datetime',
    ];

    public function proveedor()
    {
        return $this->belongsTo(Proveedor::class, 'proveedor_id');
    }
}
