<?php

namespace App\Http\Controllers;

use App\Models\Cotizacion;
use App\Models\Pedido;
use App\Models\Proveedor;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CotizacionController extends Controller
{
    use ApiResponse;

    /**
     * POST /api/pedidos/{pedidoId}/cotizaciones
     * El proveedor autenticado envía una cotización a un pedido abierto.
     */
    public function store(Request $request, int $pedidoId): JsonResponse
    {
        $validated = $request->validate([
            'monto'   => 'required|numeric|min:1|max:999999.99',
            'mensaje' => 'required|string|min:10|max:500',
        ]);

        $proveedor = Proveedor::where('user_id', $request->user()->id)->firstOrFail();

        $pedido = Pedido::where('estado', 'abierto')
            ->where('fecha_expiracion', '>', now())
            ->findOrFail($pedidoId);

        $existe = Cotizacion::where('pedido_id', $pedidoId)
            ->where('proveedor_id', $proveedor->id)
            ->exists();

        if ($existe) {
            return $this->error('Ya enviaste una cotización para este pedido.', 422);
        }

        $cotizacion = Cotizacion::create([
            'pedido_id'      => $pedidoId,
            'proveedor_id'   => $proveedor->id,
            'monto'          => $validated['monto'],
            'mensaje'        => $validated['mensaje'],
            'estado'         => 'enviada',
            'costo_creditos' => 0,
        ]);

        return $this->success('Cotización enviada correctamente.', ['cotizacion' => $cotizacion], 201);
    }
}
