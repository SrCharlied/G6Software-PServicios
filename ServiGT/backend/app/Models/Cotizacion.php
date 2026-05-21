<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Modelo stub para el módulo de cotizaciones (sprint futuro).
 * La tabla se creará cuando se implemente SER-196+.
 */
class Cotizacion extends Model
{
    use HasFactory;

    protected $fillable = [
        'pedido_id',
        'proveedor_id',
        'descripcion',
        'monto',
        'estado',
    ];

    public function pedido(): BelongsTo
    {
        return $this->belongsTo(Pedido::class);
    }

    public function proveedor(): BelongsTo
    {
        return $this->belongsTo(Proveedor::class);
    }
}
