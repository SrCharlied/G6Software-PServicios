<?php

namespace App\Http\Controllers;

use App\Http\Requests\StorePedidoRequest;
use App\Http\Resources\PedidoResource;
use App\Models\Pedido;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PedidoController extends Controller
{
    use ApiResponse;

    /**
     * POST /api/pedidos
     * Solo clientes autenticados pueden publicar pedidos.
     */
    public function store(StorePedidoRequest $request): JsonResponse
    {
        $pedido = Pedido::create([
            'cliente_id'       => $request->user()->id,
            'categoria_id'     => $request->categoria_id,
            'descripcion'      => $request->descripcion,
            'direccion'        => $request->direccion,
            'urgencia'         => $request->urgencia,
            'estado'           => 'abierto',
            'fecha_expiracion' => now()->addDays(7),
        ]);

        $pedido->load(['cliente', 'categoria']);

        return $this->success(
            'Pedido publicado correctamente',
            ['pedido' => new PedidoResource($pedido)],
            201
        );
    }

    /**
     * GET /api/pedidos/abiertos
     * Listado público paginado. Filtros: categoria_id, page.
     */
    public function abiertos(Request $request): JsonResponse
    {
        $query = Pedido::query()
            ->with(['cliente', 'categoria'])
            ->where('estado', 'abierto')
            ->where('fecha_expiracion', '>', now())
            ->orderByDesc('created_at');

        if ($request->filled('categoria_id')) {
            $query->where('categoria_id', (int) $request->categoria_id);
        }

        $pedidos = $query->paginate(15);

        return response()->json([
            'success' => true,
            'message' => 'OK',
            'pedidos' => PedidoResource::collection($pedidos->items()),
            'meta'    => [
                'total'        => $pedidos->total(),
                'per_page'     => $pedidos->perPage(),
                'current_page' => $pedidos->currentPage(),
                'last_page'    => $pedidos->lastPage(),
            ],
        ]);
    }

    /**
     * GET /api/pedidos/mios
     * Pedidos del usuario autenticado (cualquier estado).
     */
    public function mios(Request $request): JsonResponse
    {
        $pedidos = Pedido::query()
            ->with(['categoria'])
            ->where('cliente_id', $request->user()->id)
            ->orderByDesc('created_at')
            ->paginate(20);

        return response()->json([
            'success' => true,
            'message' => 'OK',
            'pedidos' => PedidoResource::collection($pedidos->items()),
            'meta'    => [
                'total'        => $pedidos->total(),
                'per_page'     => $pedidos->perPage(),
                'current_page' => $pedidos->currentPage(),
                'last_page'    => $pedidos->lastPage(),
            ],
        ]);
    }
}
