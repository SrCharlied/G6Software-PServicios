<?php

namespace App\Http\Controllers;

use App\Models\Proveedor;
use App\Models\Servicio;
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
        $proveedores = Proveedor::with(['categoria', 'user:id,email,documento_verificado'])
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json([
            'proveedores' => $proveedores,
        ]);
    }
}
