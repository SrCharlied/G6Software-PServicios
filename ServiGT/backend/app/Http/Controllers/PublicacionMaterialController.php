<?php

namespace App\Http\Controllers;

use App\Http\Resources\PublicacionMaterialResource;
use App\Models\Proveedor;
use App\Models\PublicacionMaterial;
use App\Models\PublicacionMaterialImagen;
use App\Models\ReservaMaterial;
use App\Models\Servicio;
use App\Support\MaterialNotificaciones;
use App\Traits\ApiResponse;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

/**
 * Bolsa de materiales (Sprint 9, Task 2.2). Exclusiva para proveedores.
 *
 * Un lote nace de un servicio cancelado por el cliente DESDE `en_camino`. El
 * vendedor se deriva siempre del servicio, nunca del body. El pago y la
 * entrega ocurren fuera de ServiGT.
 */
class PublicacionMaterialController extends Controller
{
    use ApiResponse;

    private const MAX_IMAGENES = 3;

    /**
     * GET /api/materiales
     * Catalogo para proveedores: lotes disponibles o reservados de otros.
     */
    public function index(Request $request): JsonResponse
    {
        $proveedor = $this->proveedorAutenticado($request);
        if ($proveedor instanceof JsonResponse) {
            return $proveedor;
        }

        $validated = $request->validate([
            'departamento' => 'sometimes|string|max:60',
            'q'            => 'sometimes|string|max:100',
            'per_page'     => 'sometimes|integer|min:1|max:50',
        ]);

        $query = PublicacionMaterial::query()
            ->with(['imagenes', 'vendedor', 'reservas' => fn ($q) => $q->where('comprador_id', $proveedor->id)])
            ->whereIn('estado', ['disponible', 'reservado'])
            ->where('vendedor_id', '!=', $proveedor->id)
            ->whereHas('vendedor', fn ($q) => $q->visibleEnCatalogo())
            ->orderByDesc('created_at')
            ->orderByDesc('id');

        if (isset($validated['departamento'])) {
            $query->where('departamento', $validated['departamento']);
        }

        if (isset($validated['q'])) {
            $termino = '%' . str_replace(['%', '_'], ['\\%', '\\_'], $validated['q']) . '%';
            $query->where(fn ($q) => $q->where('titulo', 'ilike', $termino)->orWhere('descripcion', 'ilike', $termino));
        }

        $pagina = $query->paginate((int) ($validated['per_page'] ?? 15));

        return $this->success('OK', [
            'publicaciones' => PublicacionMaterialResource::collection($pagina->items()),
            'meta' => [
                'total'        => $pagina->total(),
                'per_page'     => $pagina->perPage(),
                'current_page' => $pagina->currentPage(),
                'last_page'    => $pagina->lastPage(),
            ],
        ]);
    }

    /**
     * GET /api/materiales/mias
     * Todos los lotes propios, incluidos los terminales.
     */
    public function mias(Request $request): JsonResponse
    {
        $proveedor = $this->proveedorAutenticado($request);
        if ($proveedor instanceof JsonResponse) {
            return $proveedor;
        }

        $publicaciones = PublicacionMaterial::query()
            ->with(['imagenes', 'vendedor'])
            ->withCount(['reservas as reservas_pendientes_count' => fn ($q) => $q->where('estado', 'pendiente')])
            ->where('vendedor_id', $proveedor->id)
            ->orderByDesc('created_at')
            ->orderByDesc('id')
            ->get();

        return $this->success('OK', [
            'publicaciones' => PublicacionMaterialResource::collection($publicaciones),
            'total' => $publicaciones->count(),
        ]);
    }

    /**
     * GET /api/materiales/{id}
     * Visible si esta activo, es mio o tengo una reserva sobre el lote.
     */
    public function show(Request $request, int $id): JsonResponse
    {
        $proveedor = $this->proveedorAutenticado($request);
        if ($proveedor instanceof JsonResponse) {
            return $proveedor;
        }

        $publicacion = PublicacionMaterial::query()
            ->with(['imagenes', 'vendedor', 'reservas' => fn ($q) => $q->where('comprador_id', $proveedor->id)])
            ->withCount(['reservas as reservas_pendientes_count' => fn ($q) => $q->where('estado', 'pendiente')])
            ->find($id);

        // Quien ya tiene una reserva conserva el historial aunque el vendedor
        // se haya anonimizado; para el resto el lote sale del catalogo.
        $visible = $publicacion && (
            $publicacion->vendedor_id === $proveedor->id
            || (in_array($publicacion->estado, ['disponible', 'reservado'], true)
                && !$publicacion->vendedor?->user?->estaAnonimizada())
            || $publicacion->reservas->isNotEmpty()
        );

        if (!$visible) {
            return $this->error('Lote no encontrado.', 404);
        }

        return $this->success('OK', ['publicacion' => new PublicacionMaterialResource($publicacion)]);
    }

    /**
     * POST /api/materiales  (multipart/form-data)
     * Publica el lote de un servicio propio cancelado desde en_camino.
     */
    public function store(Request $request): JsonResponse
    {
        $proveedor = $this->proveedorAutenticado($request);
        if ($proveedor instanceof JsonResponse) {
            return $proveedor;
        }

        $validated = $request->validate([
            'servicio_id'        => 'required|integer',
            'titulo'             => 'required|string|min:3|max:120',
            'descripcion'        => 'required|string|min:10|max:1000',
            'cantidad'           => 'required|numeric|gt:0|max:99999999',
            'unidad'             => 'required|string|max:30',
            'precio_referencial' => 'required|numeric|min:0|max:999999.99',
            'departamento'       => 'required|string|max:60',
            'municipio'          => 'nullable|string|max:100',
            'imagenes'           => 'required|array|min:1|max:' . self::MAX_IMAGENES,
            'imagenes.*'         => 'image|mimes:jpg,jpeg,png,webp|max:4096',
        ]);

        $guardadas = [];

        try {
            return DB::transaction(function () use ($request, $proveedor, $validated, &$guardadas) {
                $servicio = Servicio::query()->lockForUpdate()->find($validated['servicio_id']);

                if (!$servicio) {
                    return $this->error('Servicio no encontrado.', 404);
                }

                if ($servicio->proveedor_id !== $proveedor->id) {
                    return $this->error('Solo el proveedor del servicio puede publicar sus materiales.', 403);
                }

                if ($servicio->estado !== 'cancelado' || $servicio->cancelado_desde !== 'en_camino') {
                    return $this->error('Solo un servicio cancelado por el cliente cuando ya iba en camino habilita publicar materiales.', 422);
                }

                if (PublicacionMaterial::where('servicio_id', $servicio->id)->exists()) {
                    return $this->error('Este servicio ya tiene un lote de materiales publicado.', 409);
                }

                $lote = PublicacionMaterial::create([
                    'servicio_id'        => $servicio->id,
                    'vendedor_id'        => $servicio->proveedor_id,
                    'titulo'             => $validated['titulo'],
                    'descripcion'        => $validated['descripcion'],
                    'cantidad'           => $validated['cantidad'],
                    'unidad'             => $validated['unidad'],
                    'precio_referencial' => $validated['precio_referencial'],
                    'departamento'       => $validated['departamento'],
                    'municipio'          => $validated['municipio'] ?? null,
                    'estado'             => 'disponible',
                ]);

                foreach ($request->file('imagenes') as $indice => $archivo) {
                    $ruta = $archivo->store("materiales/{$lote->id}", 'public');
                    $guardadas[] = $ruta;

                    PublicacionMaterialImagen::create([
                        'publicacion_id' => $lote->id,
                        'ruta'           => '/storage/' . $ruta,
                        'orden'          => $indice + 1,
                    ]);
                }

                $lote->load(['imagenes', 'vendedor']);

                return $this->success('Lote publicado correctamente.', [
                    'publicacion' => new PublicacionMaterialResource($lote),
                ], 201);
            });
        } catch (\Throwable $e) {
            // Compensacion: la transaccion ya hizo rollback de las filas; los
            // archivos viven fuera de ella y se borran a mano.
            Storage::disk('public')->delete($guardadas);

            if ($e instanceof UniqueConstraintViolationException) {
                return $this->error('Este servicio ya tiene un lote de materiales publicado.', 409);
            }

            throw $e;
        }
    }

    /**
     * PUT /api/materiales/{id}  (clientes multipart: POST con _method=PUT)
     * Edita un lote disponible propio. Las imagenes solo se borran si se
     * piden en `eliminar_imagenes`; la ausencia de archivos no borra nada.
     */
    public function update(Request $request, int $id): JsonResponse
    {
        $proveedor = $this->proveedorAutenticado($request);
        if ($proveedor instanceof JsonResponse) {
            return $proveedor;
        }

        $validated = $request->validate([
            'titulo'              => 'sometimes|required|string|min:3|max:120',
            'descripcion'         => 'sometimes|required|string|min:10|max:1000',
            'cantidad'            => 'sometimes|required|numeric|gt:0|max:99999999',
            'unidad'              => 'sometimes|required|string|max:30',
            'precio_referencial'  => 'sometimes|required|numeric|min:0|max:999999.99',
            'departamento'        => 'sometimes|required|string|max:60',
            'municipio'           => 'sometimes|nullable|string|max:100',
            'imagenes'            => 'sometimes|array|max:' . self::MAX_IMAGENES,
            'imagenes.*'          => 'image|mimes:jpg,jpeg,png,webp|max:4096',
            'eliminar_imagenes'   => 'sometimes|array',
            'eliminar_imagenes.*' => 'integer',
        ]);

        $nuevasGuardadas = [];
        $porBorrar = [];

        try {
            $respuesta = DB::transaction(function () use ($request, $proveedor, $id, $validated, &$nuevasGuardadas, &$porBorrar) {
                $lote = PublicacionMaterial::query()->lockForUpdate()->find($id);

                if (!$lote) {
                    return $this->error('Lote no encontrado.', 404);
                }

                if ($lote->vendedor_id !== $proveedor->id) {
                    return $this->error('No tienes permiso para administrar este lote.', 403);
                }

                if ($lote->estado !== 'disponible') {
                    return $this->error('Solo se puede editar un lote disponible.', 422);
                }

                $existentes = $lote->imagenes()->get();
                $idsBorrar = array_map('intval', $validated['eliminar_imagenes'] ?? []);

                if (array_diff($idsBorrar, $existentes->pluck('id')->all())) {
                    return $this->error('Alguna imagen a eliminar no pertenece a este lote.', 422);
                }

                $nuevas = $request->file('imagenes') ?? [];
                $quedan = $existentes->count() - count($idsBorrar) + count($nuevas);

                if ($quedan < 1 || $quedan > self::MAX_IMAGENES) {
                    return $this->error('El lote debe conservar entre 1 y ' . self::MAX_IMAGENES . ' imágenes.', 422);
                }

                $lote->fill(collect($validated)->only([
                    'titulo', 'descripcion', 'cantidad', 'unidad', 'precio_referencial', 'departamento', 'municipio',
                ])->all())->save();

                foreach ($existentes->whereIn('id', $idsBorrar) as $imagen) {
                    $porBorrar[] = $imagen->ruta;
                    $imagen->delete();
                }

                $ocupadas = $lote->imagenes()->pluck('orden')->all();
                $libres = array_values(array_diff(range(1, self::MAX_IMAGENES), $ocupadas));

                foreach ($nuevas as $indice => $archivo) {
                    $ruta = $archivo->store("materiales/{$lote->id}", 'public');
                    $nuevasGuardadas[] = $ruta;

                    PublicacionMaterialImagen::create([
                        'publicacion_id' => $lote->id,
                        'ruta'           => '/storage/' . $ruta,
                        'orden'          => $libres[$indice],
                    ]);
                }

                $lote->load(['imagenes', 'vendedor']);

                return $this->success('Lote actualizado correctamente.', [
                    'publicacion' => new PublicacionMaterialResource($lote),
                ]);
            });
        } catch (\Throwable $e) {
            Storage::disk('public')->delete($nuevasGuardadas);
            throw $e;
        }

        // Solo con la transaccion confirmada se borran los archivos viejos.
        $this->borrarArchivos($porBorrar);

        return $respuesta;
    }

    /**
     * POST /api/materiales/{id}/retirar
     * Solo un lote disponible; uno reservado exige cancelar la reserva antes.
     */
    public function retirar(Request $request, int $id): JsonResponse
    {
        return $this->cerrarLote($request, $id, 'retirado', ['disponible'],
            'Cancela la reserva aceptada antes de retirar el lote.', 'Lote retirado correctamente.');
    }

    /**
     * POST /api/materiales/{id}/vendido
     * Solo el vendedor lo marca; vale desde disponible o reservado.
     */
    public function vendido(Request $request, int $id): JsonResponse
    {
        return $this->cerrarLote($request, $id, 'vendido', ['disponible', 'reservado'],
            'Este lote ya no se puede marcar como vendido.', 'Lote marcado como vendido.');
    }

    private function cerrarLote(Request $request, int $id, string $destino, array $origenesValidos, string $mensajeEstadoInvalido, string $mensajeOk): JsonResponse
    {
        $proveedor = $this->proveedorAutenticado($request);
        if ($proveedor instanceof JsonResponse) {
            return $proveedor;
        }

        return DB::transaction(function () use ($proveedor, $id, $destino, $origenesValidos, $mensajeEstadoInvalido, $mensajeOk) {
            // Orden de locks: lote primero, reservas despues (igual que ReservaMaterialController).
            $lote = PublicacionMaterial::query()->lockForUpdate()->find($id);

            if (!$lote) {
                return $this->error('Lote no encontrado.', 404);
            }

            if ($lote->vendedor_id !== $proveedor->id) {
                return $this->error('No tienes permiso para administrar este lote.', 403);
            }

            if (!in_array($lote->estado, $origenesValidos, true)) {
                return $this->error($mensajeEstadoInvalido, 422);
            }

            $lote->update(['estado' => $destino]);

            // Al cerrar el lote, las solicitudes pendientes dejan de tener objeto.
            $pendientes = ReservaMaterial::query()
                ->where('publicacion_id', $lote->id)
                ->where('estado', 'pendiente')
                ->lockForUpdate()
                ->with('comprador')
                ->get();

            foreach ($pendientes as $reserva) {
                $reserva->update(['estado' => 'rechazada']);
                $lote->setRelation('vendedor', $proveedor);
                MaterialNotificaciones::rechazada($reserva, $lote);
            }

            $lote->load(['imagenes', 'vendedor']);

            return $this->success($mensajeOk, ['publicacion' => new PublicacionMaterialResource($lote)]);
        });
    }

    private function proveedorAutenticado(Request $request): Proveedor|JsonResponse
    {
        if ($request->user()?->role !== 'proveedor') {
            return $this->error('Solo los proveedores pueden usar la bolsa de materiales.', 403);
        }

        $proveedor = Proveedor::where('user_id', $request->user()->id)->first();

        if (!$proveedor) {
            return $this->error('Debes completar tu perfil de proveedor para usar la bolsa de materiales.', 403);
        }

        return $proveedor;
    }

    /** @param list<string> $rutas rutas publicas tipo /storage/... */
    private function borrarArchivos(array $rutas): void
    {
        foreach ($rutas as $ruta) {
            if (str_starts_with($ruta, '/storage/')) {
                Storage::disk('public')->delete(substr($ruta, strlen('/storage/')));
            }
        }
    }
}
