<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ReporteSeguridad extends Model
{
    use HasFactory;

    protected $table = 'reportes_seguridad';

    public const ESTADOS = ['recibido', 'en_revision', 'resuelto', 'descartado'];

    /**
     * Transiciones administrativas permitidas. Resuelto y descartado son
     * terminales: no se reabre un reporte (y ninguna transicion toca el servicio).
     */
    public const TRANSICIONES = [
        'recibido'    => ['en_revision'],
        'en_revision' => ['resuelto', 'descartado'],
        'resuelto'    => [],
        'descartado'  => [],
    ];

    // Categorias provisionales: la lista final es decision de producto. Se
    // validan en la app (sin CHECK) para poder ajustarla sin DDL.
    public const CATEGORIAS = ['amenaza_o_acoso', 'conducta_inapropiada', 'robo_o_dano', 'emergencia', 'otro'];

    protected $fillable = [
        'servicio_id',
        'reportante_id',
        'categoria',
        'descripcion',
        'interrumpio_servicio',
        'estado_servicio_previo',
        'estado',
        'idempotency_key',
    ];

    protected $casts = [
        'interrumpio_servicio' => 'boolean',
    ];

    public function servicio(): BelongsTo
    {
        return $this->belongsTo(Servicio::class);
    }

    public function reportante(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reportante_id');
    }

    public function evidencias(): HasMany
    {
        return $this->hasMany(EvidenciaReporteSeguridad::class, 'reporte_id')->orderBy('orden');
    }

    public function historial(): HasMany
    {
        return $this->hasMany(HistorialReporteSeguridad::class, 'reporte_id')->orderBy('id');
    }
}
