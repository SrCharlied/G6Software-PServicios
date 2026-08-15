<?php

namespace App\Http\Controllers;

use App\Models\CompraCredito;
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
            'monetizacion' => $this->kpisMonetizacion(),
        ]);
    }

    /**
     * KPIs de la superficie administrativa "Creditos y Premium". Los ingresos
     * son simulados: provienen de compras en estado `completada`, no de una
     * pasarela real.
     */
    private function kpisMonetizacion(): array
    {
        $comprasPorEstado = CompraCredito::select('estado', DB::raw('COUNT(*) as total'))
            ->groupBy('estado')
            ->pluck('total', 'estado');

        $completadas = CompraCredito::where('estado', 'completada');

        return [
            'compras_total'        => CompraCredito::count(),
            'compras_por_estado'   => $comprasPorEstado,
            'compras_completadas'  => (clone $completadas)->count(),
            'ingresos_gtq'         => round((float) (clone $completadas)->sum('monto_gtq'), 2),
            'creditos_vendidos'    => (int) (clone $completadas)->sum('creditos_otorgados'),
            'creditos_comprados'   => (int) TransaccionCredito::where('tipo', 'compra')->sum('monto'),
            'bonos_premium'        => (int) TransaccionCredito::where('tipo', 'bono')->sum('monto'),
            'premium_activos'      => Proveedor::whereNotNull('premium_vence_at')
                ->where('premium_vence_at', '>', now())
                ->count(),
            'premium_vencidos'     => Proveedor::whereNotNull('premium_vence_at')
                ->where('premium_vence_at', '<=', now())
                ->count(),
        ];
    }

    /**
     * GET /api/admin/compras
     * Historial de compras de creditos de toda la plataforma, paginado y
     * filtrable por estado y proveedor. Alimenta la tabla administrativa.
     */
    public function listCompras(Request $request): JsonResponse
    {
        $estado      = $request->query('estado');
        $proveedorId = $request->query('proveedor_id');

        $query = CompraCredito::with(['paquete:id,nombre', 'proveedor:id,nombre,email'])
            ->orderByDesc('created_at');

        if (in_array($estado, ['pendiente', 'completada', 'fallida', 'cancelada'], true)) {
            $query->where('estado', $estado);
        }

        if (is_numeric($proveedorId)) {
            $query->where('proveedor_id', (int) $proveedorId);
        }

        $perPage = (int) $request->query('per_page', 20);
        $perPage = max(1, min($perPage, 100));

        $compras = $query->paginate($perPage);

        $items = collect($compras->items())->map(fn (CompraCredito $compra) => [
            'id'                 => $compra->id,
            'proveedor_id'       => $compra->proveedor_id,
            'proveedor'          => $compra->proveedor?->nombre,
            'paquete'            => $compra->paquete?->nombre,
            'monto_gtq'          => (float) $compra->monto_gtq,
            'creditos_otorgados' => $compra->creditos_otorgados,
            'estado'             => $compra->estado,
            'referencia'         => $compra->referencia,
            'completada_at'      => $compra->completada_at,
            'created_at'         => $compra->created_at,
        ])->values();

        return response()->json([
            'compras'       => $items,
            'pagina_actual' => $compras->currentPage(),
            'ultima_pagina' => $compras->lastPage(),
            'total'         => $compras->total(),
            'kpis'          => $this->kpisMonetizacion(),
        ]);
    }

    /**
     * GET /api/admin/premium
     * Vigencia Premium por proveedor. Devuelve los tres estados (`nunca`,
     * `activo`, `vencido`) para que la administracion pueda filtrarlos.
     */
    public function listPremium(Request $request): JsonResponse
    {
        $estado = $request->query('estado');

        $proveedores = Proveedor::with('credito')
            ->orderByRaw('premium_vence_at DESC NULLS LAST')
            ->get()
            ->map(fn (Proveedor $proveedor) => array_merge($proveedor->premiumResumen(), [
                'proveedor_id' => $proveedor->id,
                'nombre'       => $proveedor->nombre,
                'email'        => $proveedor->email,
                'saldo'        => (int) ($proveedor->credito->saldo ?? 0),
            ]));

        if (in_array($estado, ['nunca', 'activo', 'vencido'], true)) {
            $proveedores = $proveedores->where('estado', $estado);
        }

        return response()->json([
            'proveedores' => $proveedores->values(),
            'kpis'        => $this->kpisMonetizacion(),
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
