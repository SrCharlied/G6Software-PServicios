<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AceptacionLegal extends Model
{
    protected $table = 'aceptaciones_legales';
    public $timestamps = false;
    protected $fillable = ['user_id', 'documento_legal_id', 'aceptado_at'];
    protected $casts = ['aceptado_at' => 'datetime'];
    public function user(): BelongsTo { return $this->belongsTo(User::class); }
    public function documento(): BelongsTo { return $this->belongsTo(DocumentoLegal::class, 'documento_legal_id'); }
}
