<?php

namespace App\Http\Controllers;

use App\Models\Mensaje;
use App\Models\ReservaMaterial;
use App\Models\Servicio;
use App\Models\User;
use App\Traits\ApiResponse;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * Mensajeria (Sprint 9: contexto explicito).
 *
 * Un mensaje pertenece a un servicio, a una reserva de material o a ninguno
 * (historial anterior, solo lectura). Los endpoints tipados derivan la
 * contraparte del recurso autorizado: ningun receptor ni contexto del body
 * decide acceso. Los endpoints legacy se conservan por compatibilidad, pero
 * nunca adivinan un contexto: con mas de un servicio en comun responden 409.
 *
 * Retiro previsto de los endpoints legacy: docs/sprint9/mensajeria-api.md.
 */
class MessageController extends Controller
{
    use ApiResponse;

    private const ESTADO_SERVICIO_SOLO_LECTURA = 'interrumpido_seguridad';

    // ── Hilos tipados: servicio ──────────────────────────────────────────────

    /** GET /api/mensajes/servicios/{servicioId}?last_id= */
    public function conversacionServicio(int $servicioId, Request $request): JsonResponse
    {
        $ctx = $this->contextoServicio($servicioId, $request->user());
        if ($ctx instanceof JsonResponse) {
            return $ctx;
        }

        [$servicio, $yo, $contraparteId] = $ctx;

        $consulta = $this->mensajesEntre($yo, $contraparteId)->where('servicio_id', $servicio->id);

        return $this->respuestaConversacion($consulta, $request, $yo, $contraparteId, [
            'tipo'         => 'servicio',
            'id'           => $servicio->id,
            'estado'       => $servicio->estado,
            'solo_lectura' => $servicio->estado === self::ESTADO_SERVICIO_SOLO_LECTURA,
        ]);
    }

    /** POST /api/mensajes/servicios/{servicioId}  body: contenido */
    public function enviarServicio(int $servicioId, Request $request): JsonResponse
    {
        $ctx = $this->contextoServicio($servicioId, $request->user());
        if ($ctx instanceof JsonResponse) {
            return $ctx;
        }

        $validated = $request->validate(['contenido' => 'required|string|max:2000']);

        return $this->guardarServicio($servicioId, $request->user(), $validated['contenido']);
    }

    // ── Hilos tipados: reserva de material ───────────────────────────────────

    /** GET /api/mensajes/reservas/{reservaId}?last_id= */
    public function conversacionReserva(int $reservaId, Request $request): JsonResponse
    {
        $ctx = $this->contextoReserva($reservaId, $request->user());
        if ($ctx instanceof JsonResponse) {
            return $ctx;
        }

        [$reserva, $yo, $contraparteId] = $ctx;

        $consulta = $this->mensajesEntre($yo, $contraparteId)->where('reserva_material_id', $reserva->id);

        return $this->respuestaConversacion($consulta, $request, $yo, $contraparteId, [
            'tipo'         => 'reserva',
            'id'           => $reserva->id,
            'estado'       => $reserva->estado,
            'solo_lectura' => false,
        ]);
    }

    /** POST /api/mensajes/reservas/{reservaId}  body: contenido */
    public function enviarReserva(int $reservaId, Request $request): JsonResponse
    {
        $ctx = $this->contextoReserva($reservaId, $request->user());
        if ($ctx instanceof JsonResponse) {
            return $ctx;
        }

        [$reserva, $yo, $contraparteId] = $ctx;

        $validated = $request->validate(['contenido' => 'required|string|max:2000']);

        return $this->guardar([
            'emisor_id'           => $yo,
            'receptor_id'         => $contraparteId,
            'reserva_material_id' => $reserva->id,
            'contenido'           => $validated['contenido'],
        ]);
    }

    // ── Bandeja ──────────────────────────────────────────────────────────────

    /**
     * GET /api/mensajes/hilos?per_page=&page=
     * Un hilo por (contexto, contraparte), agrupado y contado en SQL. Un
     * mensaje cuyo contexto no vincula a sus dos extremos se presenta como
     * historial anterior; nunca se le asigna un servicio.
     */
    public function hilos(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'per_page' => 'sometimes|integer|min:1|max:50',
            'page'     => 'sometimes|integer|min:1',
        ]);

        $yo = (int) $request->user()->id;
        $porPagina = (int) ($validated['per_page'] ?? 20);
        $pagina = (int) ($validated['page'] ?? 1);
        $offset = ($pagina - 1) * $porPagina;

        $clasificados = $this->sqlMensajesClasificados($yo);

        $filas = DB::select("
            WITH c AS ({$clasificados}),
            ctx AS (
                SELECT c.*, CASE c.tipo WHEN 'reserva' THEN c.reserva_material_id WHEN 'servicio' THEN c.servicio_id ELSE 0 END AS contexto_id
                FROM c
            ),
            hilos AS (
                SELECT DISTINCT ON (tipo, contexto_id, contraparte_id)
                    tipo, contexto_id, contraparte_id,
                    id AS ultimo_id, contenido AS ultimo_contenido, created_at AS ultimo_at, emisor_id AS ultimo_emisor_id,
                    COUNT(*) FILTER (WHERE receptor_id = {$yo} AND leido = FALSE)
                        OVER (PARTITION BY tipo, contexto_id, contraparte_id) AS no_leidos
                FROM ctx
                ORDER BY tipo, contexto_id, contraparte_id, created_at DESC, id DESC
            )
            SELECT * FROM hilos ORDER BY ultimo_at DESC, ultimo_id DESC LIMIT {$porPagina} OFFSET {$offset}
        ");

        $total = (int) DB::selectOne("
            WITH c AS ({$clasificados}),
            ctx AS (
                SELECT c.*, CASE c.tipo WHEN 'reserva' THEN c.reserva_material_id WHEN 'servicio' THEN c.servicio_id ELSE 0 END AS contexto_id
                FROM c
            )
            SELECT COUNT(*) AS total FROM (SELECT DISTINCT tipo, contexto_id, contraparte_id FROM ctx) t
        ")->total;

        return $this->success('OK', [
            'hilos' => $this->presentarHilos($filas),
            'meta'  => [
                'total'        => $total,
                'per_page'     => $porPagina,
                'current_page' => $pagina,
                'last_page'    => max(1, (int) ceil($total / $porPagina)),
            ],
        ]);
    }

    /**
     * GET /api/mensajes/historial/{userId}
     * Mensajes anteriores a Sprint 9 (sin contexto valido) con una persona.
     * Solo lectura: no existe POST para este recurso.
     */
    public function historial(int $otroUsuarioId, Request $request): JsonResponse
    {
        $yo = (int) $request->user()->id;
        $ids = $this->idsClasificados($yo, $otroUsuarioId, "tipo = 'legado'");

        $consulta = Mensaje::query()->whereIn('id', $ids ?: [0]);

        return $this->respuestaConversacion($consulta, $request, $yo, $otroUsuarioId, [
            'tipo'         => 'legado',
            'id'           => null,
            'estado'       => null,
            'solo_lectura' => true,
        ]);
    }

    // ── Endpoints legacy (compatibilidad) ────────────────────────────────────

    /**
     * POST /api/mensajes  (legacy)
     * El servicio se deriva: el unico en comun, o el explicito si vincula a
     * ambos. Con varios en comun y sin servicio_id responde 409.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'receptor_id' => 'required|exists:users,id',
            'contenido'   => 'required|string|max:2000',
            'servicio_id' => 'nullable|exists:servicios,id',
        ]);

        $emisorId = (int) $request->user()->id;
        $receptorId = (int) $validated['receptor_id'];

        if ($emisorId === $receptorId) {
            return response()->json(['message' => 'No puedes enviarte mensajes a ti mismo'], 422);
        }

        // Regla de producto ratificada: el canal solo se abre a traves de un
        // servicio, originado por una solicitud directa o por la publicacion
        // de un proveedor. Una cotizacion a un pedido todavia no adjudicado no
        // habilita el chat, porque en esa fase el pedido oculta a proposito la
        // identidad del proveedor.
        $comunes = $this->serviciosEnComun($emisorId, $receptorId);

        if ($comunes->isEmpty()) {
            return $this->error('Solo puedes escribir a alguien con quien tengas un servicio en curso o pasado.', 403);
        }

        if (!empty($validated['servicio_id'])) {
            if (!$comunes->contains((int) $validated['servicio_id'])) {
                return $this->error('El servicio indicado no te vincula con ese usuario.', 403);
            }
            $servicioId = (int) $validated['servicio_id'];
        } elseif ($comunes->count() > 1) {
            return $this->error('Tienes varios servicios con esta persona. Escribe desde el chat de cada servicio.', 409);
        } else {
            $servicioId = (int) $comunes->first();
        }

        return $this->guardarServicio($servicioId, $request->user(), $validated['contenido'], $receptorId);
    }

    /**
     * GET /api/mensajes/conversacion/{userId}  (legacy)
     * Historial anterior (solo lectura) mas los mensajes del unico servicio en
     * comun. Con varios servicios responde 409 en lugar de mezclarlos.
     */
    public function conversacion(int $otroUsuarioId, Request $request): JsonResponse
    {
        $yo = (int) $request->user()->id;
        $comunes = $this->serviciosEnComun($yo, $otroUsuarioId);

        if ($comunes->count() > 1) {
            return $this->error('Tienes varios servicios con esta persona. Usa el chat de cada servicio.', 409);
        }

        $servicioId = $comunes->first();
        $filtro = $servicioId
            ? "(tipo = 'legado' OR (tipo = 'servicio' AND contexto_id = " . (int) $servicioId . '))'
            : "tipo = 'legado'";

        $ids = $this->idsClasificados($yo, $otroUsuarioId, $filtro);
        $consulta = Mensaje::query()->whereIn('id', $ids ?: [0]);

        return $this->respuestaConversacion($consulta, $request, $yo, $otroUsuarioId, null);
    }

    /**
     * GET /api/mensajes/conversaciones  (legacy)
     * Ultimo mensaje por contraparte, resuelto con DISTINCT ON en SQL.
     */
    public function misConversaciones(Request $request): JsonResponse
    {
        $yo = (int) $request->user()->id;

        $ids = DB::table('mensajes')
            // $yo es un entero casteado: se interpola para que DISTINCT ON y ORDER BY
            // compartan exactamente la misma expresion (con bindings serian $1 y $2).
            ->selectRaw("DISTINCT ON (CASE WHEN emisor_id = {$yo} THEN receptor_id ELSE emisor_id END) id")
            ->where(fn ($q) => $q->where('emisor_id', $yo)->orWhere('receptor_id', $yo))
            ->orderByRaw("CASE WHEN emisor_id = {$yo} THEN receptor_id ELSE emisor_id END")
            ->orderByDesc('created_at')
            ->orderByDesc('id')
            ->pluck('id');

        $conversaciones = Mensaje::with([
                'emisor:id,name,role,foto_perfil',
                'receptor:id,name,role,foto_perfil',
            ])
            ->whereIn('id', $ids)
            ->orderByDesc('created_at')
            ->orderByDesc('id')
            ->get();

        return response()->json(['conversaciones' => $conversaciones->values()]);
    }

    // ── Internos ─────────────────────────────────────────────────────────────

    /** @return array{0: Servicio, 1: int, 2: int}|JsonResponse [servicio, yo, contraparte] */
    private function contextoServicio(int $servicioId, User $user, bool $bloquear = false): array|JsonResponse
    {
        $consulta = Servicio::with('proveedor');
        if ($bloquear) {
            $consulta->lockForUpdate();
        }
        $servicio = $consulta->find($servicioId);

        if (!$servicio) {
            return $this->error('Servicio no encontrado.', 404);
        }

        $proveedorUserId = (int) $servicio->proveedor?->user_id;

        return match (true) {
            $servicio->cliente_id === $user->id => [$servicio, (int) $user->id, $proveedorUserId],
            $proveedorUserId === $user->id => [$servicio, (int) $user->id, (int) $servicio->cliente_id],
            default => $this->error('No tienes acceso a este servicio.', 403),
        };
    }

    /** @return array{0: ReservaMaterial, 1: int, 2: int}|JsonResponse [reserva, yo, contraparte] */
    private function contextoReserva(int $reservaId, User $user): array|JsonResponse
    {
        $reserva = ReservaMaterial::with(['comprador', 'publicacion.vendedor'])->find($reservaId);

        if (!$reserva) {
            return $this->error('Reserva no encontrada.', 404);
        }

        $compradorUserId = (int) $reserva->comprador?->user_id;
        $vendedorUserId = (int) $reserva->publicacion?->vendedor?->user_id;

        return match (true) {
            $compradorUserId === $user->id => [$reserva, (int) $user->id, $vendedorUserId],
            $vendedorUserId === $user->id => [$reserva, (int) $user->id, $compradorUserId],
            default => $this->error('No tienes acceso a esta reserva.', 403),
        };
    }

    /** Mensajes entre dos personas, en cualquiera de los dos sentidos. */
    private function mensajesEntre(int $yo, int $otro)
    {
        return Mensaje::query()->where(function ($q) use ($yo, $otro) {
            $q->where(fn ($q2) => $q2->where('emisor_id', $yo)->where('receptor_id', $otro))
                ->orWhere(fn ($q2) => $q2->where('emisor_id', $otro)->where('receptor_id', $yo));
        });
    }

    /**
     * Lista los mensajes de un hilo y marca como leidos SOLO los recibidos que
     * pertenecen a ese mismo conjunto (nunca los de otros contextos).
     */
    private function respuestaConversacion($consulta, Request $request, int $yo, int $contraparteId, ?array $contexto): JsonResponse
    {
        $consulta->with(['emisor:id,name,role,foto_perfil', 'receptor:id,name,role,foto_perfil']);

        if ($request->query('last_id')) {
            $consulta->where('id', '>', (int) $request->query('last_id'));
        }

        $mensajes = $consulta->orderBy('created_at')->orderBy('id')->get();

        $recibidosSinLeer = $mensajes->where('receptor_id', $yo)->where('leido', false)->pluck('id');
        if ($recibidosSinLeer->isNotEmpty()) {
            Mensaje::whereIn('id', $recibidosSinLeer)->update(['leido' => true]);
        }

        $legadoIds = $mensajes->isEmpty() ? [] : $this->idsClasificados($yo, $contraparteId, "tipo = 'legado'");
        $mensajes->each(fn ($m) => $m->setAttribute('legado', in_array($m->id, $legadoIds, true)));

        $respuesta = ['mensajes' => $mensajes->values()];

        if ($contexto !== null) {
            $respuesta['contexto'] = $contexto;
            $respuesta['contraparte'] = User::select('id', 'name', 'role', 'foto_perfil')->find($contraparteId);
        }

        return response()->json($respuesta);
    }

    /** Serializa ambos canales de envio con la interrupcion de seguridad. */
    private function guardarServicio(int $servicioId, User $user, string $contenido, ?int $receptorEsperado = null): JsonResponse
    {
        return DB::transaction(function () use ($servicioId, $user, $contenido, $receptorEsperado) {
            // Relee permisos y estado bajo el mismo lock que toma interrumpir.
            // El lock se conserva hasta que el mensaje queda guardado o rechazado.
            $ctx = $this->contextoServicio($servicioId, $user, bloquear: true);
            if ($ctx instanceof JsonResponse) {
                return $ctx;
            }
            [$servicio, $yo, $contraparteId] = $ctx;

            if ($receptorEsperado !== null && $receptorEsperado !== $contraparteId) {
                return $this->error('El servicio indicado no te vincula con ese usuario.', 403);
            }
            if ($servicio->estado === self::ESTADO_SERVICIO_SOLO_LECTURA) {
                return $this->error('Este servicio fue interrumpido por seguridad: el chat es de solo lectura.', 409);
            }

            return $this->guardar([
                'emisor_id' => $yo,
                'receptor_id' => $contraparteId,
                'servicio_id' => $servicio->id,
                'contenido' => $contenido,
            ]);
        });
    }

    private function guardar(array $datos): JsonResponse
    {
        $mensaje = Mensaje::create($datos);
        $mensaje->load(['emisor:id,name,role,foto_perfil', 'receptor:id,name,role,foto_perfil']);

        return response()->json(['message' => 'Mensaje enviado', 'mensaje' => $mensaje], 201);
    }

    /**
     * Servicios que vinculan a dos usuarios, en cualquiera de los dos
     * sentidos. No filtra por estado: no se corta la conversacion al terminar.
     *
     * @return \Illuminate\Support\Collection<int, int>
     */
    private function serviciosEnComun(int $unUsuario, int $otroUsuario)
    {
        return Servicio::query()
            ->join('proveedores', 'proveedores.id', '=', 'servicios.proveedor_id')
            ->where(function ($q) use ($unUsuario, $otroUsuario) {
                $q->where(fn ($a) => $a->where('servicios.cliente_id', $unUsuario)->where('proveedores.user_id', $otroUsuario))
                    ->orWhere(fn ($b) => $b->where('servicios.cliente_id', $otroUsuario)->where('proveedores.user_id', $unUsuario));
            })
            ->orderBy('servicios.id')
            ->pluck('servicios.id')
            ->map(fn ($id) => (int) $id);
    }

    /**
     * IDs de mensajes con una contraparte que cumplen un filtro sobre la
     * clasificacion (`tipo`, `contexto_id`). Siempre resuelto en SQL.
     *
     * @return list<int>
     */
    private function idsClasificados(int $yo, int $contraparteId, string $filtro): array
    {
        $clasificados = $this->sqlMensajesClasificados($yo);

        $filas = DB::select("
            WITH c AS ({$clasificados}),
            ctx AS (
                SELECT c.*, CASE c.tipo WHEN 'reserva' THEN c.reserva_material_id WHEN 'servicio' THEN c.servicio_id ELSE 0 END AS contexto_id
                FROM c
            )
            SELECT id FROM ctx WHERE contraparte_id = " . (int) $contraparteId . " AND ({$filtro})
        ");

        return array_map(fn ($f) => (int) $f->id, $filas);
    }

    /**
     * Mensajes del usuario con su clasificacion: 'reserva' o 'servicio' solo si
     * ese contexto vincula realmente a emisor y receptor; 'legado' en cualquier
     * otro caso (sin contexto o con un contexto ajeno). El id del usuario se
     * castea a entero antes de interpolarse.
     */
    private function sqlMensajesClasificados(int $yo): string
    {
        return "
            SELECT m.id, m.contenido, m.created_at, m.leido, m.emisor_id, m.receptor_id,
                   m.servicio_id, m.reserva_material_id,
                   CASE WHEN m.emisor_id = {$yo} THEN m.receptor_id ELSE m.emisor_id END AS contraparte_id,
                   CASE
                       WHEN m.reserva_material_id IS NOT NULL AND EXISTS (
                           SELECT 1 FROM reservas_material r
                           JOIN publicaciones_material pm ON pm.id = r.publicacion_id
                           JOIN proveedores pc ON pc.id = r.comprador_id
                           JOIN proveedores pv ON pv.id = pm.vendedor_id
                           WHERE r.id = m.reserva_material_id
                             AND ((pc.user_id = m.emisor_id AND pv.user_id = m.receptor_id)
                               OR (pc.user_id = m.receptor_id AND pv.user_id = m.emisor_id))
                       ) THEN 'reserva'
                       WHEN m.servicio_id IS NOT NULL AND EXISTS (
                           SELECT 1 FROM servicios s
                           JOIN proveedores p ON p.id = s.proveedor_id
                           WHERE s.id = m.servicio_id
                             AND ((s.cliente_id = m.emisor_id AND p.user_id = m.receptor_id)
                               OR (s.cliente_id = m.receptor_id AND p.user_id = m.emisor_id))
                       ) THEN 'servicio'
                       ELSE 'legado'
                   END AS tipo
            FROM mensajes m
            WHERE m.emisor_id = {$yo} OR m.receptor_id = {$yo}
        ";
    }

    /**
     * Completa las filas de la bandeja con contraparte y datos del contexto
     * usando una consulta por tipo (sin N+1).
     *
     * @param array<int, object> $filas
     * @return list<array<string, mixed>>
     */
    private function presentarHilos(array $filas): array
    {
        if ($filas === []) {
            return [];
        }

        $filas = collect($filas);

        $usuarios = User::select('id', 'name', 'role', 'foto_perfil')
            ->whereIn('id', $filas->pluck('contraparte_id')->unique())
            ->get()->keyBy('id');

        $servicios = Servicio::with('categoria:id,nombre')
            ->whereIn('id', $filas->where('tipo', 'servicio')->pluck('contexto_id'))
            ->get()->keyBy('id');

        $reservas = ReservaMaterial::with('publicacion:id,titulo')
            ->whereIn('id', $filas->where('tipo', 'reserva')->pluck('contexto_id'))
            ->get()->keyBy('id');

        return $filas->map(function ($fila) use ($usuarios, $servicios, $reservas) {
            $tipo = $fila->tipo;
            $contextoId = $tipo === 'legado' ? null : (int) $fila->contexto_id;

            $contexto = match ($tipo) {
                'servicio' => [
                    'titulo' => $servicios[$contextoId]?->publicacion_titulo
                        ?? $servicios[$contextoId]?->categoria?->nombre
                        ?? "Servicio #{$contextoId}",
                    'estado' => $servicios[$contextoId]?->estado,
                ],
                'reserva' => [
                    'titulo'         => $reservas[$contextoId]?->publicacion?->titulo ?? "Reserva #{$contextoId}",
                    'estado'         => $reservas[$contextoId]?->estado,
                    'publicacion_id' => $reservas[$contextoId]?->publicacion_id,
                ],
                default => ['titulo' => 'Historial anterior', 'estado' => null],
            };

            $soloLectura = $tipo === 'legado'
                || ($tipo === 'servicio' && ($servicios[$contextoId]?->estado === self::ESTADO_SERVICIO_SOLO_LECTURA));

            return [
                'tipo'          => $tipo,
                'contexto_id'   => $contextoId,
                'contexto'      => $contexto,
                'contraparte'   => $usuarios[(int) $fila->contraparte_id] ?? null,
                'ultimo_mensaje' => [
                    'id'         => (int) $fila->ultimo_id,
                    'contenido'  => $fila->ultimo_contenido,
                    'emisor_id'  => (int) $fila->ultimo_emisor_id,
                    'created_at' => Carbon::parse($fila->ultimo_at)->toIso8601String(),
                ],
                'no_leidos'     => (int) $fila->no_leidos,
                'solo_lectura'  => $soloLectura,
            ];
        })->values()->all();
    }
}
