<?php

namespace App\Models;

use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory;

    protected $fillable = [
        'name',
        'email',
        'password',
        'role',
    ];

    protected $hidden = [
        'password',
    ];

    // estado_cuenta no es asignable en masa: solo cambia via anonimizacion.
    protected $casts = [
        'anonimizada_at' => 'datetime',
    ];

    public function estaAnonimizada(): bool
    {
        return $this->estado_cuenta === 'anonimizada';
    }

    public function setPasswordAttribute($value): void
    {
        $this->attributes['password'] = bcrypt($value);
    }

    public function proveedor(): HasOne
    {
        return $this->hasOne(Proveedor::class);
    }

    public function aceptacionesLegales(): HasMany
    {
        return $this->hasMany(AceptacionLegal::class);
    }

    public function solicitudesEliminacion(): HasMany
    {
        return $this->hasMany(SolicitudEliminacionCuenta::class);
    }
}
