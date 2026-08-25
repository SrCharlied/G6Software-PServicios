<?php

namespace App\Http\Controllers;

use App\Models\CompraCredito;
use App\Models\CreditoProveedor;
use App\Models\PaqueteCredito;
use App\Models\Proveedor;
use App\Models\TransaccionCredito;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

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

    /**
     * GET /api/creditos/paquetes
     * Catalogo de paquetes de creditos activos, ordenados para mostrarse en
     * checkout. Cualquier usuario autenticado puede consultarlo.
     *
     * Response: lista de { id, nombre, precio_gtq, creditos_base,
     * creditos_bonus, total_creditos, costo_por_credito, ahorro_porcentaje, orden }.
     */
    public function paquetes(): JsonResponse
    {
        $paquetes = PaqueteCredito::activos()->get();

        $costoBaseCredito = null;
        $referencia = $paquetes->firstWhere('creditos_bonus', 0) ?? $paquetes->first();
        if ($referencia) {
            $totalReferencia = $referencia->creditos_base + $referencia->creditos_bonus;
            $costoBaseCredito = $totalReferencia > 0
                ? ((float) $referencia->precio_gtq) / $totalReferencia
                : null;
        }

        $data = $paquetes->map(function (PaqueteCredito $paquete) use ($costoBaseCredito) {
            $total = $paquete->creditos_base + $paquete->creditos_bonus;
            $costoExacto     = $total > 0 ? ((float) $paquete->precio_gtq) / $total : null;
            $costoPorCredito = $costoExacto !== null ? round($costoExacto, 2) : null;

            // El ahorro se calcula con el costo SIN redondear: usar el valor ya
            // redondeado hacia arriba hacia que el propio paquete de referencia
            // reportara un ahorro negativo (Inicial salia con -0.1%).
            $ahorroPorcentaje = null;
            if ($costoBaseCredito && $costoExacto !== null && $costoBaseCredito > 0) {
                $ahorroPorcentaje = round((1 - ($costoExacto / $costoBaseCredito)) * 100, 1);
            }

            return [
                'id'                 => $paquete->id,
                'nombre'             => $paquete->nombre,
                'precio_gtq'         => (float) $paquete->precio_gtq,
                'creditos_base'      => $paquete->creditos_base,
                'creditos_bonus'     => $paquete->creditos_bonus,
                'total_creditos'     => $total,
                'costo_por_credito'  => $costoPorCredito,
                'ahorro_porcentaje'  => $ahorroPorcentaje,
                'orden'              => $paquete->orden,
            ];
        })->values();

        return $this->success('Paquetes obtenidos correctamente.', ['paquetes' => $data]);
    }

    /**
     * POST /api/creditos/comprar
     * Compra simulada e inmediata de un paquete de creditos. No se procesa
     * ningun pago real: el estado queda en 'completada' y el saldo se
     * acredita dentro de la misma transaccion.
     *
     * Request: { paquete_id: int, idempotency_key: string }
     * Idempotencia: repetir la misma idempotency_key para el proveedor
     * autenticado devuelve la compra ya registrada sin acreditar de nuevo.
     */
    public function comprar(Request $request): JsonResponse
    {
        $proveedor = Proveedor::where('user_id', $request->user()->id)->first();

        if (!$proveedor) {
            return $this->error('Solo los proveedores pueden comprar creditos.', 403);
        }

        try {
            $validated = $request->validate([
                'paquete_id'      => 'required|integer',
                'idempotency_key' => 'required|string|max:100',
            ]);
        } catch (ValidationException $e) {
            return $this->error('Datos de compra invalidos.', 422, $e->errors());
        }

        $existente = CompraCredito::where('proveedor_id', $proveedor->id)
            ->where('idempotency_key', $validated['idempotency_key'])
            ->first();

        if ($existente) {
            return $this->success('Compra ya registrada previamente.', [
                'compra' => $this->formatearCompra($existente->load('paquete')),
            ]);
        }

        $paquete = PaqueteCredito::activos()->find($validated['paquete_id']);
        if (!$paquete) {
            return $this->error('El paquete solicitado no existe o no esta disponible.', 404);
        }

        $resultado = DB::transaction(function () use ($proveedor, $paquete, $validated) {
            $proveedorLock = Proveedor::query()->lockForUpdate()->findOrFail($proveedor->id);

            $credito = CreditoProveedor::query()
                ->where('proveedor_id', $proveedorLock->id)
                ->lockForUpdate()
                ->first();

            if (!$credito) {
                $credito = CreditoProveedor::create([
                    'proveedor_id' => $proveedorLock->id,
                    'saldo'        => 0,
                    'updated_at'   => now(),
                ]);
            }

            $totalCreditos = $paquete->creditos_base + $paquete->creditos_bonus;

            $compra = CompraCredito::create([
                'proveedor_id'       => $proveedorLock->id,
                'paquete_id'         => $paquete->id,
                'monto_gtq'          => $paquete->precio_gtq,
                'creditos_otorgados' => $totalCreditos,
                'estado'             => 'completada',
                'referencia'         => $this->generarReferenciaUnica(),
                'idempotency_key'    => $validated['idempotency_key'],
                'completada_at'      => now(),
            ]);

            $credito->saldo += $totalCreditos;
            $credito->updated_at = now();
            $credito->save();

            TransaccionCredito::create([
                'proveedor_id'  => $proveedorLock->id,
                'tipo'          => 'compra',
                'monto'         => $totalCreditos,
                'motivo'        => "Compra de creditos: {$paquete->nombre}",
                'referencia_id' => $compra->id,
            ]);

            return [
                'compra' => $compra->fresh()->load('paquete'),
                'saldo'  => $credito->saldo,
            ];
        });

        return $this->success('Compra completada correctamente.', [
            'compra' => $this->formatearCompra($resultado['compra']),
            'saldo'  => $resultado['saldo'],
        ], 201);
    }

    /**
     * GET /api/creditos/transacciones
     * Historial paginado de movimientos de creditos del proveedor
     * autenticado: compras, bonos, gastos y recargas conviven en la misma
     * tabla transacciones_credito.
     */
    public function transacciones(Request $request): JsonResponse
    {
        $proveedor = Proveedor::where('user_id', $request->user()->id)->first();

        if (!$proveedor) {
            return $this->error('Solo los proveedores tienen historial de creditos.', 403);
        }

        $perPage = (int) $request->query('per_page', 15);
        $perPage = max(1, min($perPage, 50));

        $transacciones = TransaccionCredito::where('proveedor_id', $proveedor->id)
            ->orderByDesc('created_at')
            ->paginate($perPage);

        return $this->success('Historial obtenido correctamente.', [
            'transacciones' => $transacciones->items(),
            'pagina_actual' => $transacciones->currentPage(),
            'ultima_pagina' => $transacciones->lastPage(),
            'total'         => $transacciones->total(),
        ]);
    }

    private function formatearCompra(CompraCredito $compra): array
    {
        return [
            'id'                 => $compra->id,
            'paquete'            => $compra->paquete?->nombre,
            'monto_gtq'          => (float) $compra->monto_gtq,
            'creditos_otorgados' => $compra->creditos_otorgados,
            'estado'             => $compra->estado,
            'referencia'         => $compra->referencia,
            'completada_at'      => $compra->completada_at,
        ];
    }

    /**
     * Genera una referencia unica formato SGT-XXXXX. La columna es UNIQUE en
     * BD; el reintento cubre la colision improbable de dos numeros iguales.
     */
    private function generarReferenciaUnica(): string
    {
        do {
            $referencia = 'SGT-' . str_pad((string) random_int(0, 99999), 5, '0', STR_PAD_LEFT);
        } while (CompraCredito::where('referencia', $referencia)->exists());

        return $referencia;
    }
}
