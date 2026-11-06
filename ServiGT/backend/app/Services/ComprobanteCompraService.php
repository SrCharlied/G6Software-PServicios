<?php

namespace App\Services;

use App\Models\CompraCredito;
use App\Models\PaqueteCredito;
use App\Models\Proveedor;

/**
 * Arma el snapshot del comprobante informativo de una compra de creditos (HU 4.1).
 *
 * El snapshot congela los datos tal como estaban al completarse la compra: si
 * luego cambia el precio del paquete o el nombre del proveedor, el comprobante
 * emitido no se altera. El folio es la `referencia` de la compra. No guarda
 * datos de tarjeta ni bancarios, y no es un documento fiscal (sin FEL ni PDF).
 */
class ComprobanteCompraService
{
    public const VERSION = 1;

    /**
     * @return array<string, mixed>
     */
    public function construir(
        Proveedor $proveedor,
        PaqueteCredito $paquete,
        string $referencia,
        string $metodoPago,
        string|float $montoGtq,
        int $creditosOtorgados,
        \DateTimeInterface $completadaAt,
    ): array {
        return [
            'version'            => self::VERSION,
            'folio'              => $referencia,
            'proveedor'          => [
                'id'     => $proveedor->id,
                'nombre' => $proveedor->nombre,
                'email'  => $proveedor->email,
            ],
            'paquete'            => [
                'id'             => $paquete->id,
                'nombre'         => $paquete->nombre,
                'creditos_base'  => (int) $paquete->creditos_base,
                'creditos_bonus' => (int) $paquete->creditos_bonus,
            ],
            'creditos_otorgados' => $creditosOtorgados,
            'monto_gtq'          => number_format((float) $montoGtq, 2, '.', ''),
            'moneda'             => 'GTQ',
            'metodo_pago'        => $metodoPago,
            'completada_at'      => $completadaAt->format('c'),
        ];
    }

    /**
     * Atributos a escribir en la compra en el mismo instante en que pasa a
     * 'completada'. Es la unica via por la que nace un snapshot.
     *
     * @return array<string, mixed>
     */
    public function atributosAlCompletar(CompraCredito $compra, \DateTimeInterface $completadaAt): array
    {
        $compra->loadMissing(['proveedor', 'paquete']);

        return [
            'comprobante_snapshot'   => $this->construir(
                $compra->proveedor,
                $compra->paquete,
                $compra->referencia,
                $compra->metodo_pago ?? 'simulado',
                $compra->monto_gtq,
                (int) $compra->creditos_otorgados,
                $completadaAt,
            ),
            'comprobante_emitido_at' => $completadaAt,
        ];
    }
}
