<?php

namespace App\Http\Controllers;

use App\Http\Resources\ReservaMaterialResource;
use App\Models\Mensaje;
use App\Models\Proveedor;
use App\Models\PublicacionMaterial;
use App\Models\ReservaMaterial;
use App\Support\MaterialNotificaciones;
use App\Traits\ApiResponse;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * Reservas de la bolsa de materiales (Sprint 9, Task 2.3).
 *
 * Varias solicitudes pendientes por lote, una sola aceptada. Toda transicion
 * bloquea primero el lote y despues la reserva (orden fijo, igual que
 * PublicacionMaterialController) para serializar carreras sin interbloqueo.
 * La identidad sale siempre del token; ningun ID del body autoriza nada.
 */
class ReservaMaterialController extends Controller
{
    use ApiResponse;

    private const RELACIONES = ['comprador', 'publicacion.vendedor', 'publicacion.imagenes'];

    /**
     * POST /api/materiales/{id}/reservas
     * Body: mensaje_inicial, idempotency_key. Repetir la clave devuelve la
     * misma reserva (200) sin duplicar mensaje ni notificacion.
     */
    public function solicitar(Request $request, int $id): JsonResponse
    {
        $proveedor = $this->proveedorAutenticado($request);
        if ($proveedor instanceof JsonResponse) {
            return $proveedor;
        }

        $validated = $request->validate([
            'idempotency_key' => 'required|string|max:80',
            'mensaje_inicial' => 'required|string|max:1000',
        ]);

        try {
            return DB::transaction(function () use ($proveedor, $id, $validated) {
                $lote = PublicacionMaterial::query()->with('vendedor')->lockForUpdate()->find($id);

                if (!$lote) {
                    return $this->error('Lote no encontrado.', 404);
                }

                if ($lote->vendedor_id === $proveedor->id) {
                    return $this->error('No puedes reservar tu propio lote.', 403);
                }

                $previa = ReservaMaterial::where('comprador_id', $proveedor->id)
                    ->where('idempotency_key', $validated['idempotency_key'])
                    ->first();

                if ($previa) {
                    return $previa->publicacion_id === $lote->id
                        ? $this->respuestaReserva($previa, 'Solicitud ya registrada.', 200)
                        : $this->error('La clave de idempotencia ya se usó en otra solicitud.', 409);
                }

                if ($lote->estado !== 'disponible') {
                    return $this->error('Este lote ya no está disponible.', 422);
                }

                $vigente = ReservaMaterial::where('publicacion_id', $lote->id)
                    ->where('comprador_id', $proveedor->id)
                    ->whereIn('estado', ['pendiente', 'aceptada', 'rechazada'])
                    ->value('estado');

                if ($vigente) {
                    return $this->error(
                        $vigente === 'rechazada'
                            ? 'El vendedor rechazó tu solicitud para este lote; no puedes volver a solicitarlo.'
                            : 'Ya tienes una solicitud vigente para este lote.',
                        409
                    );
                }

                $reserva = ReservaMaterial::create([
                    'publicacion_id'  => $lote->id,
                    'comprador_id'    => $proveedor->id,
                    'mensaje_inicial' => $validated['mensaje_inicial'],
                    'estado'          => 'pendiente',
                    'idempotency_key' => $validated['idempotency_key'],
                ]);

                // El primer mensaje del hilo contextual de la reserva.
                Mensaje::create([
                    'emisor_id'           => $proveedor->user_id,
                    'receptor_id'         => $lote->vendedor->user_id,
                    'reserva_material_id' => $reserva->id,
                    'contenido'           => $validated['mensaje_inicial'],
                ]);

                $reserva->setRelation('comprador', $proveedor);
                MaterialNotificaciones::solicitada($reserva, $lote);

                return $this->respuestaReserva($reserva, 'Solicitud enviada correctamente.', 201);
            });
        } catch (UniqueConstraintViolationException) {
            // Carrera perdida contra el indice unico: si fue la misma clave,
            // es una repeticion idempotente; si no, una solicitud duplicada.
            $existente = ReservaMaterial::where('comprador_id', $proveedor->id)
                ->where('idempotency_key', $validated['idempotency_key'])
                ->where('publicacion_id', $id)
                ->first();

            return $existente
                ? $this->respuestaReserva($existente, 'Solicitud ya registrada.', 200)
                : $this->error('Ya tienes una solicitud vigente para este lote.', 409);
        }
    }

    /**
     * GET /api/materiales/{id}/reservas
     * Solicitudes recibidas por un lote propio.
     */
    public function delLote(Request $request, int $id): JsonResponse
    {
        $proveedor = $this->proveedorAutenticado($request);
        if ($proveedor instanceof JsonResponse) {
            return $proveedor;
        }

        $lote = PublicacionMaterial::find($id);

        if (!$lote) {
            return $this->error('Lote no encontrado.', 404);
        }

        if ($lote->vendedor_id !== $proveedor->id) {
            return $this->error('Solo el vendedor puede ver las solicitudes de su lote.', 403);
        }

        $reservas = ReservaMaterial::with(self::RELACIONES)
            ->where('publicacion_id', $lote->id)
            ->orderByDesc('created_at')
            ->orderByDesc('id')
            ->get();

        return $this->success('OK', [
            'reservas' => ReservaMaterialResource::collection($reservas),
            'total' => $reservas->count(),
        ]);
    }

    /**
     * GET /api/reservas-material
     * Reservas del proveedor autenticado como comprador, de todos los estados.
     */
    public function mias(Request $request): JsonResponse
    {
        $proveedor = $this->proveedorAutenticado($request);
        if ($proveedor instanceof JsonResponse) {
            return $proveedor;
        }

        $validated = $request->validate(['per_page' => 'sometimes|integer|min:1|max:50']);

        $pagina = ReservaMaterial::with(self::RELACIONES)
            ->where('comprador_id', $proveedor->id)
            ->orderByDesc('created_at')
            ->orderByDesc('id')
            ->paginate((int) ($validated['per_page'] ?? 20));

        return $this->success('OK', [
            'reservas' => ReservaMaterialResource::collection($pagina->items()),
            'meta' => [
                'total'        => $pagina->total(),
                'per_page'     => $pagina->perPage(),
                'current_page' => $pagina->currentPage(),
                'last_page'    => $pagina->lastPage(),
            ],
        ]);
    }

    /**
     * GET /api/reservas-material/{id}
     * Detalle para comprador o vendedor.
     */
    public function show(Request $request, int $id): JsonResponse
    {
        $proveedor = $this->proveedorAutenticado($request);
        if ($proveedor instanceof JsonResponse) {
            return $proveedor;
        }

        $reserva = ReservaMaterial::with(self::RELACIONES)->find($id);

        if (!$reserva) {
            return $this->error('Reserva no encontrada.', 404);
        }

        if (!$this->esParticipante($reserva, $proveedor)) {
            return $this->error('No tienes permiso para ver esta reserva.', 403);
        }

        return $this->success('OK', ['reserva' => new ReservaMaterialResource($reserva)]);
    }

    /** POST /api/reservas-material/{id}/aceptar — solo el vendedor. */
    public function aceptar(Request $request, int $id): JsonResponse
    {
        return $this->transicionar($request, $id, function (PublicacionMaterial $lote, ReservaMaterial $reserva, Proveedor $actor, string $rol) {
            if ($rol !== 'vendedor') {
                return $this->error('Solo el vendedor puede aceptar solicitudes.', 403);
            }

            if ($reserva->estado !== 'pendiente') {
                return $this->error('Solo se pueden aceptar solicitudes pendientes.', 422);
            }

            if ($lote->estado !== 'disponible') {
                return $this->error('El lote ya no está disponible.', 422);
            }

            // Se capturan las perdedoras antes del update: solo las pendientes
            // compiten; una reserva cancelada no se convierte en rechazada.
            $perdedoras = ReservaMaterial::where('publicacion_id', $lote->id)
                ->where('id', '!=', $reserva->id)
                ->where('estado', 'pendiente')
                ->lockForUpdate()
                ->with('comprador')
                ->get();

            $reserva->update(['estado' => 'aceptada']);
            $lote->update(['estado' => 'reservado']);

            foreach ($perdedoras as $otra) {
                $otra->update(['estado' => 'rechazada']);
                MaterialNotificaciones::rechazada($otra, $lote);
            }

            MaterialNotificaciones::aceptada($reserva, $lote);

            return $this->respuestaReserva($reserva, 'Solicitud aceptada.', 200);
        });
    }

    /** POST /api/reservas-material/{id}/rechazar — solo el vendedor, solo pendientes. */
    public function rechazar(Request $request, int $id): JsonResponse
    {
        return $this->transicionar($request, $id, function (PublicacionMaterial $lote, ReservaMaterial $reserva, Proveedor $actor, string $rol) {
            if ($rol !== 'vendedor') {
                return $this->error('Solo el vendedor puede rechazar solicitudes.', 403);
            }

            if ($reserva->estado !== 'pendiente') {
                return $this->error('Solo se pueden rechazar solicitudes pendientes.', 422);
            }

            $reserva->update(['estado' => 'rechazada']);
            MaterialNotificaciones::rechazada($reserva, $lote);

            return $this->respuestaReserva($reserva, 'Solicitud rechazada.', 200);
        });
    }

    /**
     * POST /api/reservas-material/{id}/cancelar
     * El comprador cancela una pendiente o aceptada; el vendedor, solo una
     * aceptada (una pendiente se rechaza). Cancelar una aceptada libera el lote.
     */
    public function cancelar(Request $request, int $id): JsonResponse
    {
        return $this->transicionar($request, $id, function (PublicacionMaterial $lote, ReservaMaterial $reserva, Proveedor $actor, string $rol) {
            $permitidos = $rol === 'comprador' ? ['pendiente', 'aceptada'] : ['aceptada'];

            if (!in_array($reserva->estado, $permitidos, true)) {
                return $this->error(
                    $rol === 'vendedor' && $reserva->estado === 'pendiente'
                        ? 'Una solicitud pendiente se rechaza, no se cancela.'
                        : 'Esta reserva ya no se puede cancelar.',
                    422
                );
            }

            $eraAceptada = $reserva->estado === 'aceptada';
            $reserva->update(['estado' => 'cancelada']);

            if ($eraAceptada && $lote->estado === 'reservado') {
                $lote->update(['estado' => 'disponible']);
            }

            $destinatario = $rol === 'comprador' ? $lote->vendedor->user_id : $reserva->comprador->user_id;
            MaterialNotificaciones::cancelada($reserva, $lote, $destinatario);

            return $this->respuestaReserva($reserva, 'Reserva cancelada.', 200);
        });
    }

    /**
     * Ejecuta una transicion bajo lock: lote primero, reserva despues. Resuelve
     * el rol del actor y rechaza a quien no sea comprador ni vendedor.
     *
     * @param callable(PublicacionMaterial, ReservaMaterial, Proveedor, string): JsonResponse $accion
     */
    private function transicionar(Request $request, int $id, callable $accion): JsonResponse
    {
        $proveedor = $this->proveedorAutenticado($request);
        if ($proveedor instanceof JsonResponse) {
            return $proveedor;
        }

        return DB::transaction(function () use ($proveedor, $id, $accion) {
            $loteId = ReservaMaterial::whereKey($id)->value('publicacion_id');

            if (!$loteId) {
                return $this->error('Reserva no encontrada.', 404);
            }

            $lote = PublicacionMaterial::query()->with('vendedor')->lockForUpdate()->find($loteId);
            $reserva = ReservaMaterial::query()->with('comprador')->lockForUpdate()->find($id);

            $rol = match (true) {
                $reserva->comprador_id === $proveedor->id => 'comprador',
                $lote->vendedor_id === $proveedor->id => 'vendedor',
                default => null,
            };

            if ($rol === null) {
                return $this->error('No tienes permiso sobre esta reserva.', 403);
            }

            return $accion($lote, $reserva, $proveedor, $rol);
        });
    }

    private function respuestaReserva(ReservaMaterial $reserva, string $mensaje, int $status): JsonResponse
    {
        $reserva->load(self::RELACIONES);

        return $this->success($mensaje, ['reserva' => new ReservaMaterialResource($reserva)], $status);
    }

    private function esParticipante(ReservaMaterial $reserva, Proveedor $proveedor): bool
    {
        return $reserva->comprador_id === $proveedor->id
            || $reserva->publicacion?->vendedor_id === $proveedor->id;
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
}
