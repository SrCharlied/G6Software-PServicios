<?php

namespace App\Http\Controllers;

use App\Models\CreditoProveedor;
use App\Models\Proveedor;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CreditoController extends Controller
{
    use ApiResponse;

    /**
     * GET /api/mi-credito
     * Saldo de creditos del proveedor autenticado.
     *
     * El contrato distingue dos situaciones que antes se veian iguales en la UI:
     *  - saldo 0 real: el proveedor existe y no tiene creditos -> 200 con saldo 0.
     *  - el usuario no es proveedor -> 403 con mensaje explicito.
     * Asi el frontend nunca tiene que interpretar un error como "Saldo: 0".
     */
    public function mio(Request $request): JsonResponse
    {
        $proveedor = Proveedor::where('user_id', $request->user()->id)->first();

        if (!$proveedor) {
            return $this->error('Solo los proveedores tienen saldo de creditos.', 403);
        }

        // Un proveedor sin fila en creditos_proveedor tiene saldo cero legitimo:
        // la fila se crea al primer cobro o a la primera recarga.
        $credito = CreditoProveedor::where('proveedor_id', $proveedor->id)->first();

        return $this->success('Saldo obtenido correctamente.', [
            'proveedor_id'   => $proveedor->id,
            'saldo'          => (int) ($credito->saldo ?? 0),
            'actualizado_en' => $credito?->updated_at,
        ]);
    }
}
