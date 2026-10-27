<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * Version publicada de terminos o privacidad (HU 2.1). La base rechaza UPDATE
 * y DELETE: publicar una version nueva es crear otra fila. `hash_sha256` lo
 * calcula un trigger a partir del contenido, por eso no es asignable.
 */
class DocumentoLegal extends Model
{
    protected $table = 'documentos_legales';

    public const UPDATED_AT = null;

    public const TIPOS = ['terminos', 'privacidad'];

    protected $fillable = [
        'tipo',
        'version',
        'titulo',
        'contenido',
        'vigente_desde',
        'aprobado_por',
        'aprobado_at',
    ];

    protected $hidden = ['aprobado_por'];
    protected $appends = ['hash'];

    protected $casts = [
        'aprobado_at' => 'datetime',
        'vigente_desde' => 'datetime',
    ];

    // Conserva el contrato publico sin duplicar la columna persistida.
    public function getHashAttribute(): string
    {
        return $this->hash_sha256 ?? hash('sha256', $this->contenido);
    }

    public function aceptaciones(): HasMany
    {
        return $this->hasMany(AceptacionLegal::class, 'documento_legal_id');
    }

    /**
     * La vigente de cada tipo es la de mayor `vigente_desde` ya alcanzado; una
     * version programada a futuro no desplaza a la actual antes de tiempo.
     */
    public function scopeVigentes(Builder $query): Builder
    {
        return $query->whereIn('id', function ($sub) {
            $sub->selectRaw('DISTINCT ON (tipo) id')
                ->from('documentos_legales')
                ->where('vigente_desde', '<=', now())
                ->orderBy('tipo')
                ->orderByDesc('vigente_desde')
                ->orderByDesc('id');
        });
    }

    /**
     * Vigentes indexadas por tipo. Un tipo sin version publicada no aparece:
     * quien consume debe tratar esa ausencia como error, no como aceptado.
     */
    public static function vigentesPorTipo(): Collection
    {
        return static::query()->vigentes()->get()->keyBy('tipo');
    }

    /** Publicar una fila no inventa su aprobacion: el registro exige ambas. */
    public static function aprobadosVigentes(): Collection
    {
        return static::whereNotNull('aprobado_por')->where('aprobado_at', '<=', now())
            ->where('vigente_desde', '<=', now())
            ->orderByDesc('vigente_desde')->orderByDesc('id')->get()->unique('tipo')->values();
    }
}
