<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ReservaMaterial extends Model
{
    use HasFactory;

    protected $table = 'reservas_material';

    public const ESTADOS = ['pendiente', 'aceptada', 'rechazada', 'cancelada'];

    protected $fillable = [
        'publicacion_id',
        'comprador_id',
        'mensaje_inicial',
        'estado',
        'idempotency_key',
    ];

    public function publicacion(): BelongsTo
    {
        return $this->belongsTo(PublicacionMaterial::class, 'publicacion_id');
    }

    public function comprador(): BelongsTo
    {
        return $this->belongsTo(Proveedor::class, 'comprador_id');
    }

    public function mensajes(): HasMany
    {
        return $this->hasMany(Mensaje::class, 'reserva_material_id');
    }
}
