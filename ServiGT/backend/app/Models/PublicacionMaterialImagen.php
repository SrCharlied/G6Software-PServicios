<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PublicacionMaterialImagen extends Model
{
    protected $table = 'publicaciones_material_imagenes';

    public const UPDATED_AT = null;

    protected $fillable = ['publicacion_id', 'ruta', 'orden'];

    public function publicacion(): BelongsTo
    {
        return $this->belongsTo(PublicacionMaterial::class, 'publicacion_id');
    }
}
