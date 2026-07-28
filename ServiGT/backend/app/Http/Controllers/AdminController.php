<?php

namespace App\Http\Controllers;

use App\Models\Proveedor;
use App\Models\CreditoProveedor;
use App\Models\Servicio;
use App\Models\TransaccionCredito;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AdminController extends Controller
{
    public function stats(): JsonResponse
    {
        $totalUsuarios   = User::count();
        $totalClientes   = User::where('role', 'cliente')->count();
        $totalProveedores = User::where('role', 'proveedor')->count();
        $totalAdmins     = User::where('role', 'admin')->count();

        $proveedoresVerificados = User::where('role', 'proveedor')
            ->where('documento_verificado', true)
            ->count();

        $serviciosPorEstado = Servicio::select('estado', DB::raw('COUNT(*) as total'))
            ->groupBy('estado')
            ->pluck('total', 'estado');

        $calificacionPromedioGlobal = (float) Proveedor::avg('calificacion_promedio');
        $creditosDisponibles = (int) CreditoProveedor::sum('saldo');
        $recargasManuales = (int) TransaccionCredito::where('tipo', 'recarga')->sum('monto');

        return response()->json([
            'usuarios' => [
                'total'        => $totalUsuarios,
                'clientes'     => $totalClientes,
                'proveedores'  => $totalProveedores,
                'admins'       => $totalAdmins,
            ],
            'proveedores' => [
                'total'       => Proveedor::count(),
                'verificados' => $proveedoresVerificados,
                'calificacion_promedio_global' => round($calificacionPromedioGlobal, 2),
                'creditos_disponibles' => $creditosDisponibles,
                'creditos_recargados' => $recargasManuales,
            ],
            'servicios' => [
                'total'      => Servicio::count(),
                'por_estado' => $serviciosPorEstado,
            ],
        ]);
    }

    public function listUsers(Request $request): JsonResponse
    {
        $role = $request->query('role');

        $query = User::query()->orderBy('created_at', 'desc');

        if (in_array($role, ['cliente', 'proveedor', 'admin'], true)) {
            $query->where('role', $role);
        }

        return response()->json([
            'usuarios' => $query->get([
                'id', 'name', 'email', 'role', 'telefono',
                'documento_verificado', 'created_at',
            ]),
        ]);
    }

    public function listProviders(): JsonResponse
    {
        $proveedores = Proveedor::with(['categoria', 'credito', 'user:id,email,documento_verificado'])
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json([
            'proveedores' => $proveedores,
        ]);
    }

    public function recargarCreditos(Request $request, int $proveedorId): JsonResponse
    {
        $validated = $request->validate([
            'monto'  => 'required|integer|min:1|max:10000',
            'motivo' => 'required|string|min:5|max:255',
        ]);

        $resultado = DB::transaction(function () use ($proveedorId, $validated) {
            $proveedor = Proveedor::query()
                ->lockForUpdate()
                ->findOrFail($proveedorId);

            $credito = CreditoProveedor::query()
                ->where('proveedor_id', $proveedor->id)
                ->lockForUpdate()
                ->first();

            if (!$credito) {
                $credito = CreditoProveedor::create([
                    'proveedor_id' => $proveedor->id,
                    'saldo'        => 0,
                    'updated_at'   => now(),
                ]);
            }

            $credito->saldo += (int) $validated['monto'];
            $credito->updated_at = now();
            $credito->save();

            $transaccion = TransaccionCredito::create([
                'proveedor_id'  => $proveedor->id,
                'tipo'          => 'recarga',
                'monto'         => (int) $validated['monto'],
                'motivo'        => $validated['motivo'],
                'referencia_id' => null,
            ]);

            return [
                'proveedor'   => $proveedor->fresh(['categoria', 'credito', 'user:id,email,documento_verificado']),
                'credito'     => $credito->fresh(),
                'transaccion' => $transaccion,
            ];
        });

        return response()->json([
            'success'     => true,
            'message'     => 'Creditos agregados correctamente.',
            'proveedor'   => $resultado['proveedor'],
            'credito'     => $resultado['credito'],
            'transaccion' => $resultado['transaccion'],
        ]);
    }
}
