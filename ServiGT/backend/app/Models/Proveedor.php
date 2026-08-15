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
        'premium_inicio_at',
        'premium_vence_at',
        'premium_renovaciones',
    ];

    protected $casts = [
        'tarifa_hora'           => 'decimal:2',
        'tarifa_proyecto'       => 'decimal:2',
        'calificacion_promedio' => 'decimal:2',
        'premium_inicio_at'     => 'datetime',
        'premium_vence_at'      => 'datetime',
        'premium_renovaciones'  => 'integer',
    ];

    /**
     * `premium` viaja en toda serializacion del proveedor para que el
     * dashboard, el perfil publico y la administracion lean el mismo bloque
     * sin que cada endpoint tenga que recalcularlo.
     */
    protected $appends = ['premium'];

    public function getPremiumAttribute(): array
    {
        return $this->premiumResumen();
    }

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

    public function compras()
    {
        return $this->hasMany(CompraCredito::class, 'proveedor_id');
    }

    public function activacionesPremium()
    {
        return $this->hasMany(ActivacionPremium::class, 'proveedor_id');
    }

    /**
     * Estado Premium derivado de premium_vence_at: no se guarda por separado
     * para evitar que ambos campos se desincronicen.
     */
    public function premiumEstado(): string
    {
        if (!$this->premium_vence_at) {
            return 'nunca';
        }

        return $this->premium_vence_at->isFuture() ? 'activo' : 'vencido';
    }

    public function premiumDiasRestantes(): int
    {
        if ($this->premiumEstado() !== 'activo') {
            return 0;
        }

        return (int) ceil(now()->diffInDays($this->premium_vence_at));
    }

    /**
     * Bloque Premium reutilizado por el estado propio del proveedor, el perfil
     * publico y la administracion, para que las tres superficies muestren
     * exactamente los mismos campos.
     */
    public function premiumResumen(): array
    {
        return [
            'estado'         => $this->premiumEstado(),
            'inicio_at'      => $this->premium_inicio_at,
            'vence_at'       => $this->premium_vence_at,
            'dias_restantes' => $this->premiumDiasRestantes(),
            'renovaciones'   => (int) ($this->premium_renovaciones ?? 0),
        ];
    }
}
