<?php

namespace App\Http\Controllers;

use App\Models\Cotizacion;
use App\Models\CreditoProveedor;
use App\Models\Pedido;
use App\Models\Proveedor;
use App\Models\TransaccionCredito;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

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
            'mensaje' => 'required|string|min:20|max:500',
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

    /**
     * PUT /api/pedidos/{pedidoId}/cotizaciones/{cotizacionId}
     * El proveedor edita su propia cotización. Cuesta 1 crédito por edición.
     */
    public function update(Request $request, int $pedidoId, int $cotizacionId): JsonResponse
    {
        $validated = $request->validate([
            'monto'   => 'required|numeric|min:1|max:999999.99',
            'mensaje' => 'required|string|min:20|max:500',
        ]);

        $proveedor = Proveedor::where('user_id', $request->user()->id)->firstOrFail();

        $cotizacion = Cotizacion::where('id', $cotizacionId)
            ->where('pedido_id', $pedidoId)
            ->where('proveedor_id', $proveedor->id)
            ->firstOrFail();

        $credito     = CreditoProveedor::where('proveedor_id', $proveedor->id)->first();
        $saldoActual = $credito?->saldo ?? 0;

        if ($saldoActual < 1) {
            return $this->error('Saldo insuficiente. Recarga créditos para editar tu cotización.', 422);
        }

        $nuevoSaldo = null;

        DB::transaction(function () use ($proveedor, $pedidoId, $cotizacionId, $credito, $cotizacion, $validated, &$nuevoSaldo) {
            $credito->decrement('saldo', 1);
            $nuevoSaldo = $credito->fresh()->saldo;

            TransaccionCredito::create([
                'proveedor_id'  => $proveedor->id,
                'tipo'          => 'gasto',
                'monto'         => 1,
                'motivo'        => "Edición de cotización #{$cotizacionId} en pedido #{$pedidoId}",
                'referencia_id' => $pedidoId,
            ]);

            $cotizacion->update([
                'monto'   => $validated['monto'],
                'mensaje' => $validated['mensaje'],
            ]);
        });

        return $this->success('Cotización actualizada correctamente.', [
            'cotizacion'  => $cotizacion->fresh(),
            'nuevo_saldo' => $nuevoSaldo,
        ]);
    }
}
