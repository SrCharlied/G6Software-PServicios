<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class PublicacionMaterial extends Model
{
    use HasFactory;

    protected $table = 'publicaciones_material';

    public const ESTADOS = ['disponible', 'reservado', 'vendido', 'retirado'];

    protected $fillable = [
        'servicio_id',
        'vendedor_id',
        'titulo',
        'descripcion',
        'cantidad',
        'unidad',
        'precio_referencial',
        'departamento',
        'municipio',
        'estado',
    ];

    protected $casts = [
        'cantidad'           => 'decimal:2',
        'precio_referencial' => 'decimal:2',
    ];

    public function servicio(): BelongsTo
    {
        return $this->belongsTo(Servicio::class);
    }

    public function vendedor(): BelongsTo
    {
        return $this->belongsTo(Proveedor::class, 'vendedor_id');
    }

    public function imagenes(): HasMany
    {
        return $this->hasMany(PublicacionMaterialImagen::class, 'publicacion_id')->orderBy('orden');
    }

    public function reservas(): HasMany
    {
        return $this->hasMany(ReservaMaterial::class, 'publicacion_id');
    }
}
