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
        'categoria_id',
        'descripcion',
        'estado',
        'fecha_agendada',
        'direccion',
        'monto_acordado',
        'codigo_inicio',
        'codigo_fin',
        'motivo_cancelacion',
    ];

    protected $casts = [
        'fecha_agendada' => 'datetime',
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

    public function calificaciones()
    {
        return $this->hasMany(Calificacion::class);
    }

    public function pago()
    {
        return $this->hasOne(Pago::class);
    }
}
