<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Pedido extends Model
{
    use HasFactory;

    // La relación cotizaciones se activa cuando el módulo esté implementado.
    // Hasta entonces, withCount('cotizaciones') retorna 0 de forma segura.

    protected $fillable = [
        'cliente_id',
        'categoria_id',
        'descripcion',
        'direccion',
        'urgencia',
        'estado',
        'fecha_expiracion',
    ];

    protected $casts = [
        'fecha_expiracion' => 'datetime',
    ];

    public function cliente(): BelongsTo
    {
        return $this->belongsTo(User::class, 'cliente_id');
    }

    public function categoria(): BelongsTo
    {
        return $this->belongsTo(Categoria::class);
    }

    public function cotizaciones(): HasMany
    {
        // La clase Cotizacion se creará en el módulo de cotizaciones (sprint futuro).
        return $this->hasMany('App\Models\Cotizacion');
    }
}
