<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Collection;

class DocumentoLegal extends Model
{
    protected $table = 'documentos_legales';
    public $timestamps = false;
    protected $fillable = ['tipo', 'version', 'titulo', 'contenido', 'aprobado_por', 'aprobado_at', 'vigente_desde'];
    protected $hidden = ['aprobado_por'];
    protected $casts = ['aprobado_at' => 'datetime', 'vigente_desde' => 'datetime'];

    protected static function booted(): void
    {
        static::creating(function (self $documento) { $documento->hash = hash('sha256', $documento->contenido); });
    }

    public static function vigentes(): Collection
    {
        return static::where('aprobado_at', '<=', now())->where('vigente_desde', '<=', now())
            ->orderByDesc('vigente_desde')->orderByDesc('id')->get()->unique('tipo')->values();
    }
}
