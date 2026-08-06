<?php

namespace App\Http\Controllers;

use App\Models\Proveedor;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class PremiumController extends Controller
{
    use ApiResponse;

    /**
     * POST /api/premium/activar
     * Activacion o renovacion simulada de Premium por Q115. No se procesa
     * ningun pago real. Cada llamada fija la vigencia en 30 dias desde ese
     * momento (no acumula dias de un ciclo previo).
     *
     * La acreditacion de los 10 creditos por ciclo se maneja en un endpoint
     * separado (tarea 5.3) para no duplicar la logica de otorgamiento.
     */
    public function activar(Request $request): JsonResponse
    {
        $proveedor = Proveedor::where('user_id', $request->user()->id)->first();

        if (!$proveedor) {
            return $this->error('Solo los proveedores pueden activar Premium.', 403);
        }

        $venceAt = DB::transaction(function () use ($proveedor) {
            $proveedorLock = Proveedor::query()->lockForUpdate()->findOrFail($proveedor->id);

            $venceAt = now()->addDays(30);
            $proveedorLock->premium_vence_at = $venceAt;
            $proveedorLock->save();

            return $venceAt;
        });

        return $this->success('Premium activado correctamente.', [
            'estado'         => 'activo',
            'vence_at'       => $venceAt,
            'dias_restantes' => (int) ceil(now()->diffInDays($venceAt)),
        ]);
    }

    /**
     * GET /api/premium/mi-estado
     * Estado Premium del proveedor autenticado: nunca, activo o vencido.
     */
    public function miEstado(Request $request): JsonResponse
    {
        $proveedor = Proveedor::where('user_id', $request->user()->id)->first();

        if (!$proveedor) {
            return $this->error('Solo los proveedores tienen estado Premium.', 403);
        }

        $estado = $proveedor->premiumEstado();
        $diasRestantes = $estado === 'activo'
            ? (int) ceil(now()->diffInDays($proveedor->premium_vence_at))
            : 0;

        return $this->success('Estado Premium obtenido correctamente.', [
            'estado'         => $estado,
            'vence_at'       => $proveedor->premium_vence_at,
            'dias_restantes' => $diasRestantes,
        ]);
    }
}
