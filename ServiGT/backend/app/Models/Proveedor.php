<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Proveedor extends Model
{
    use HasFactory;

    protected $table = 'proveedores';

    protected $fillable = [
        'user_id',
        'nombre',
        'email',
        'telefono',
        'descripcion',
        'departamento',
        'municipio',
        'categoria_id',
        'foto_perfil',
        'tarifa_hora',
        'tarifa_proyecto',
        'nivel',
    ];

    protected $casts = [
        'tarifa_hora'           => 'decimal:2',
        'tarifa_proyecto'       => 'decimal:2',
        'calificacion_promedio' => 'decimal:2',
    ];

    public function categoria()
    {
        return $this->belongsTo(Categoria::class);
    }

    public function categorias()
    {
        return $this->belongsToMany(Categoria::class, 'proveedor_categorias');
    }

    public function documentos()
    {
        return $this->hasMany(DocumentoProveedor::class);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function disponibilidad()
    {
        return $this->hasMany(Disponibilidad::class)->orderBy('dia_semana');
    }

    public function servicios()
    {
        return $this->hasMany(Servicio::class);
    }

    public function credito()
    {
        return $this->hasOne(CreditoProveedor::class, 'proveedor_id');
    }

    public function transaccionesCredito()
    {
        return $this->hasMany(TransaccionCredito::class, 'proveedor_id');
    }

    public function cotizaciones()
    {
        return $this->hasMany(Cotizacion::class, 'proveedor_id');
    }
}
