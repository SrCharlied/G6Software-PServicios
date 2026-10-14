<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Servicio extends Model
{
    use HasFactory;

    protected $table = 'servicios';

    protected $fillable = [
        'cliente_id',
        'proveedor_id',
        'publicacion_id',
        'publicacion_titulo',
        'publicacion_precio_referencial',
        'categoria_id',
        'descripcion',
        'estado',
        'fecha_agendada',
        'direccion',
        'monto_acordado',
        'codigo_inicio',
        'codigo_fin',
        'motivo_cancelacion',
        'cancelado_desde',
    ];

    protected $casts = [
        'fecha_agendada' => 'datetime',
        'publicacion_precio_referencial' => 'decimal:2',
    ];

    public function cliente()
    {
        return $this->belongsTo(User::class, 'cliente_id');
    }

    public function proveedor()
    {
        return $this->belongsTo(Proveedor::class, 'proveedor_id');
    }

    public function categoria()
    {
        return $this->belongsTo(Categoria::class);
    }

    public function publicacion()
    {
        return $this->belongsTo(PublicacionServicio::class, 'publicacion_id');
    }

    public function reportesSeguridad()
    {
        return $this->hasMany(ReporteSeguridad::class, 'servicio_id');
    }

    public function publicacionMaterial()
    {
        return $this->hasOne(PublicacionMaterial::class, 'servicio_id');
    }

    public function calificaciones()
    {
        return $this->hasMany(Calificacion::class);
    }

    public function pago()
    {
        return $this->hasOne(Pago::class);
    }
}
