<?php

namespace App\Support;

use App\Models\Notificacion;
use App\Models\PublicacionMaterial;
use App\Models\ReservaMaterial;

/**
 * Notificaciones de la bolsa de materiales (Sprint 9).
 *
 * El payload es minimo a proposito: solo IDs de navegacion. Nunca lleva
 * telefono, correo ni datos de otros solicitantes; el contacto ocurre por el
 * chat interno de la reserva.
 */
final class MaterialNotificaciones
{
    public const TIPOS = [
        'reserva_material_solicitada',
        'reserva_material_aceptada',
        'reserva_material_rechazada',
        'reserva_material_cancelada',
    ];

    public static function solicitada(ReservaMaterial $reserva, PublicacionMaterial $lote): void
    {
        self::crear($lote->vendedor->user_id, 'reserva_material_solicitada', 'Nueva solicitud de material',
            "Recibiste una solicitud para el lote «{$lote->titulo}».", $reserva, $lote);
    }

    public static function aceptada(ReservaMaterial $reserva, PublicacionMaterial $lote): void
    {
        self::crear($reserva->comprador->user_id, 'reserva_material_aceptada', 'Solicitud de material aceptada',
            "El vendedor aceptó tu solicitud para el lote «{$lote->titulo}».", $reserva, $lote);
    }

    public static function rechazada(ReservaMaterial $reserva, PublicacionMaterial $lote): void
    {
        self::crear($reserva->comprador->user_id, 'reserva_material_rechazada', 'Solicitud de material rechazada',
            "Tu solicitud para el lote «{$lote->titulo}» no fue aceptada.", $reserva, $lote);
    }

    /** Avisa a la contraparte de quien cancela. */
    public static function cancelada(ReservaMaterial $reserva, PublicacionMaterial $lote, int $destinatarioUserId): void
    {
        self::crear($destinatarioUserId, 'reserva_material_cancelada', 'Reserva de material cancelada',
            "La reserva del lote «{$lote->titulo}» fue cancelada.", $reserva, $lote);
    }

    private static function crear(int $destinatarioId, string $tipo, string $titulo, string $mensaje, ReservaMaterial $reserva, PublicacionMaterial $lote): void
    {
        Notificacion::create([
            'destinatario_id' => $destinatarioId,
            'tipo'            => $tipo,
            'titulo'          => $titulo,
            'mensaje'         => $mensaje,
            'datos'           => ['reserva_id' => $reserva->id, 'publicacion_id' => $lote->id],
        ]);
    }
}
