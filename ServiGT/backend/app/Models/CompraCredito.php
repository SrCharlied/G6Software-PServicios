<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class CompraCredito extends Model
{
    use HasFactory;

    protected $table = 'compras_creditos';

    protected $fillable = [
        'proveedor_id',
        'paquete_id',
        'monto_gtq',
        'creditos_otorgados',
        'estado',
        'referencia',
        'idempotency_key',
        'metodo_pago',
        'stripe_session_id',
        'fallo_motivo',
        'completada_at',
        'comprobante_snapshot',
        'comprobante_emitido_at',
    ];

    protected $casts = [
        'monto_gtq'          => 'decimal:2',
        'creditos_otorgados' => 'integer',
        'completada_at'      => 'datetime',
        'comprobante_snapshot'   => 'array',
        'comprobante_emitido_at' => 'datetime',
    ];

    public function proveedor()
    {
        return $this->belongsTo(Proveedor::class, 'proveedor_id');
    }

    public function paquete()
    {
        return $this->belongsTo(PaqueteCredito::class, 'paquete_id');
    }
}
