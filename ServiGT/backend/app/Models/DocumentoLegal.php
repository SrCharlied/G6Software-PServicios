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
    ];

    protected $casts = [
        'vigente_desde' => 'datetime',
    ];

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
                ->orderByDesc('vigente_desde');
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
}
