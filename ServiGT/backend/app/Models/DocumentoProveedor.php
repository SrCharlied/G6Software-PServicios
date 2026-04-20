<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DocumentoProveedor extends Model
{
    use HasFactory;

    protected $table = 'documentos_proveedores';

    protected $fillable = [
        'proveedor_id',
        'tipo_documento',
        'nombre_archivo',
        'ruta_archivo',
        'estado_validacion',
    ];

    public function proveedor(): BelongsTo
    {
        return $this->belongsTo(Proveedor::class);
    }
}
