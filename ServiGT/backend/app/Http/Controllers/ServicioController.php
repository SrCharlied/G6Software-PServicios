<?php

namespace App\Http\Controllers;

use App\Models\Notificacion;
use App\Models\Proveedor;
use App\Models\PublicacionServicio;
use App\Models\Servicio;
use App\Http\Resources\ServicioResource;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ServicioController extends Controller
{
    use ApiResponse;

    public function store(Request $request): JsonResponse
    {
        // Cuando la solicitud nace de una publicacion, todo lo que define el
        // trato sale de la fila y no del cuerpo. Los campos que el cliente
        // pudiera mandar se descartan ANTES de validar: si se validaran para
        // luego pisarlos, un `proveedor_id` inexistente devolveria un 422
        // confuso sobre un campo que la peticion ni siquiera usa.
        if ($request->filled('publicacion_id')) {
            $request->request->remove('proveedor_id');
            $request->request->remove('categoria_id');
            $request->request->remove('monto_acordado');
        }

        $validated = $request->validate([
            // `proveedor_id` deja de ser obligatorio cuando la solicitud nace
            // de una publicacion: en ese caso se deriva de la publicacion, que
            // es dato del servidor, y no de lo que mande el cliente.
            'proveedor_id'   => 'required_without:publicacion_id|exists:proveedores,id',
            'publicacion_id' => 'sometimes|integer|exists:publicaciones_servicio,id',
            'categoria_id'   => 'nullable|exists:categorias,id',
            'descripcion'    => 'required|string|max:1000',
            'fecha_agendada' => 'nullable|date|after:now',
            'direccion'      => 'nullable|string|max:500',
            'monto_acordado' => 'nullable|numeric|min:0',
        ]);

        $user = $request->user();

        // Contratacion desde una publicacion (task 5.6).
        //
        // Proveedor, categoria, titulo y precio de referencia se leen de la
        // fila: si se confiara en el cliente, cualquiera podria mandar el
        // `proveedor_id` de un proveedor y el `publicacion_id` de otro, o
        // inventar un precio que luego apareceria en el historial como si lo
        // hubiera publicado el proveedor.
        //
        // Tampoco se acepta `monto_acordado` por esta via: el precio de
        // referencia no es el monto final, se negocia aparte, y aceptarlo aqui
        // dejaria cerrado un precio que el proveedor nunca acepto.
        //
        // El snapshot (`publicacion_titulo`, `publicacion_precio_referencial`)
        // se copia a proposito: editar o borrar la publicacion despues no debe
        // reescribir lo que se contrato, y la FK es ON DELETE SET NULL.
        $publicacion = null;
        if (isset($validated['publicacion_id'])) {
            $publicacion = PublicacionServicio::with('proveedor')
                ->where('estado', 'activa')
                ->find($validated['publicacion_id']);

            if (!$publicacion) {
                return $this->error('La publicacion no esta disponible.', 404);
            }

            $validated['proveedor_id'] = $publicacion->proveedor_id;
            $validated['categoria_id'] = $publicacion->categoria_id;
            $validated['publicacion_titulo'] = $publicacion->titulo;
            $validated['publicacion_precio_referencial'] = $publicacion->precio_referencial;
        }

        // Solo un cliente contrata. Antes bastaba con estar autenticado, asi
        // que un proveedor podia crear servicios y aparecer en ambos lados.
        if ($user->role !== 'cliente') {
            return $this->error('Solo un cliente puede solicitar un servicio.', 403);
        }

        // Y nadie se contrata a si mismo: era la primera pieza de la cadena
        // que permitia inflar la calificacion propia sin que interviniera
        // ningun tercero.
        $proveedorSolicitado = Proveedor::find($validated['proveedor_id']);
        if ($proveedorSolicitado && $proveedorSolicitado->user_id === $user->id) {
            return $this->error('No puedes solicitarte un servicio a ti mismo.', 403);
        }

        $validated['cliente_id']    = $user->id;
        $validated['estado']        = 'pendiente';
        $validated['codigo_inicio'] = str_pad((string) random_int(0, 999999), 6, '0', STR_PAD_LEFT);

        $servicio = Servicio::create($validated);
        $servicio->load(['cliente', 'proveedor', 'categoria']);

        $proveedor = $servicio->proveedor;
        if ($proveedor?->user_id) {
            Notificacion::create([
                'destinatario_id' => $proveedor->user_id,
                'tipo'            => 'nueva_solicitud',
                'titulo'          => 'Nueva solicitud de servicio',
                'mensaje'         => "{$request->user()->name} solicito tu servicio: {$validated['descripcion']}",
                'datos'           => ['servicio_id' => $servicio->id],
            ]);
        }

        return $this->success('Solicitud enviada exitosamente', [
            'servicio' => new ServicioResource($servicio),
        ], 201);
    }

    public function show(int $id, Request $request): JsonResponse
    {
        $servicio = Servicio::with(['cliente', 'proveedor.categoria', 'categoria', 'calificaciones.autor:id,name', 'pago'])
            ->find($id);

        if (!$servicio) {
            return $this->error('Servicio no encontrado', 404);
        }

        $userId          = $request->user()->id;
        $proveedorUserId = $servicio->proveedor?->user_id;

        if ($servicio->cliente_id !== $userId && $proveedorUserId !== $userId) {
            return $this->error('No tienes permiso para ver este servicio', 403);
        }

        return $this->success('OK', ['servicio' => new ServicioResource($servicio)]);
    }

    public function solicitudesProveedor(Request $request): JsonResponse
    {
        $user      = $request->user();
        $proveedor = $user->proveedor;

        if (!$proveedor) {
            return $this->error('No tienes perfil de proveedor', 404);
        }

        $estado = $request->query('estado');
        $query  = Servicio::with(['cliente', 'categoria'])
            ->where('proveedor_id', $proveedor->id);

        if ($estado) {
            $query->where('estado', $estado);
        }

        $servicios = $query->orderBy('created_at', 'desc')->get();

        return $this->success('OK', [
            'servicios' => ServicioResource::collection($servicios),
            'total' => $servicios->count(),
        ]);
    }

    public function solicitudesCliente(Request $request): JsonResponse
    {
        $estado = $request->query('estado');
        $query  = Servicio::with(['proveedor.categoria', 'categoria', 'calificaciones.autor:id,name'])
            ->where('cliente_id', $request->user()->id);

        if ($estado) {
            $query->where('estado', $estado);
        }

        $servicios = $query->orderBy('created_at', 'desc')->get();

        return $this->success('OK', ['servicios' => ServicioResource::collection($servicios)]);
    }

    public function aceptar(int $id, Request $request): JsonResponse
    {
        $servicio = $this->getServicioProveedor($id, $request);
        if ($servicio instanceof JsonResponse) return $servicio;

        if ($servicio->estado !== 'pendiente') {
            return $this->error('Solo se pueden aceptar solicitudes pendientes', 422);
        }

        $servicio->update(['estado' => 'aceptado']);

        Notificacion::create([
            'destinatario_id' => $servicio->cliente_id,
            'tipo'            => 'solicitud_aceptada',
            'titulo'          => 'Solicitud aceptada',
            'mensaje'         => 'El proveedor acepto tu solicitud de servicio.',
            'datos'           => ['servicio_id' => $servicio->id],
        ]);

        $servicio->loadMissing(['cliente', 'proveedor.categoria', 'categoria']);

        return $this->success('Solicitud aceptada', ['servicio' => new ServicioResource($servicio)]);
    }

    public function rechazar(int $id, Request $request): JsonResponse
    {
        $servicio = $this->getServicioProveedor($id, $request);
        if ($servicio instanceof JsonResponse) return $servicio;

        if ($servicio->estado !== 'pendiente') {
            return $this->error('Solo se pueden rechazar solicitudes pendientes', 422);
        }

        $request->validate(['motivo' => 'nullable|string|max:500']);

        $servicio->update([
            'estado'             => 'rechazado',
            'motivo_cancelacion' => $request->motivo,
        ]);

        Notificacion::create([
            'destinatario_id' => $servicio->cliente_id,
            'tipo'            => 'solicitud_rechazada',
            'titulo'          => 'Solicitud rechazada',
            'mensaje'         => 'El proveedor no pudo aceptar tu solicitud.',
            'datos'           => ['servicio_id' => $servicio->id],
        ]);

        $servicio->loadMissing(['cliente', 'proveedor.categoria', 'categoria']);

        return $this->success('Solicitud rechazada', ['servicio' => new ServicioResource($servicio)]);
    }

    public function actualizarEstado(int $id, Request $request): JsonResponse
    {
        $servicio = $this->getServicioProveedor($id, $request);
        if ($servicio instanceof JsonResponse) return $servicio;

        $request->validate([
            'estado' => 'required|in:en_camino,completado,cancelado',
        ]);

        $servicio->update(['estado' => $request->estado]);

        if ($request->estado === 'completado') {
            $this->notificarServicioCalificable($servicio);
        }

        $servicio->loadMissing(['cliente', 'proveedor.categoria', 'categoria']);

        return $this->success('Estado actualizado', ['servicio' => new ServicioResource($servicio)]);
    }

    public function iniciar(int $id, Request $request): JsonResponse
    {
        $request->validate([
            'codigo' => 'required|string|size:6',
        ]);

        $servicio = $this->getServicioProveedor($id, $request);
        if ($servicio instanceof JsonResponse) return $servicio;

        if ($servicio->estado !== 'aceptado') {
            return $this->error('Solo se puede iniciar un servicio aceptado', 422);
        }

        if (!hash_equals((string) $servicio->codigo_inicio, (string) $request->codigo)) {
            return $this->error('Codigo de inicio invalido', 422);
        }

        $servicio->update(['estado' => 'en_progreso']);

        Notificacion::create([
            'destinatario_id' => $servicio->cliente_id,
            'tipo'            => 'servicio_iniciado',
            'titulo'          => 'Servicio iniciado',
            'mensaje'         => 'El proveedor inicio el servicio.',
            'datos'           => ['servicio_id' => $servicio->id],
        ]);

        $servicio->loadMissing(['cliente', 'proveedor.categoria', 'categoria']);

        return $this->success('Servicio iniciado', ['servicio' => new ServicioResource($servicio)]);
    }

    public function finalizar(int $id, Request $request): JsonResponse
    {
        $servicio = $this->getServicioProveedor($id, $request);
        if ($servicio instanceof JsonResponse) return $servicio;

        if ($servicio->estado !== 'en_progreso') {
            return $this->error('Solo se puede finalizar un servicio en progreso', 422);
        }

        $codigoFin = str_pad((string) random_int(0, 999999), 6, '0', STR_PAD_LEFT);

        $servicio->update([
            'codigo_fin' => $codigoFin,
            'estado'     => 'por_confirmar',
        ]);

        Notificacion::create([
            'destinatario_id' => $servicio->cliente_id,
            'tipo'            => 'servicio_por_confirmar',
            'titulo'          => 'Confirma la finalizacion del servicio',
            'mensaje'         => 'El proveedor termino el trabajo. Pide el codigo de 6 digitos para confirmar la finalizacion.',
            'datos'           => ['servicio_id' => $servicio->id],
        ]);

        $request->attributes->set('exponer_codigo_fin_servicio', $servicio->id);

        return $this->success('Servicio listo para confirmar', [
            'servicio'   => new ServicioResource($servicio->loadMissing(['cliente', 'proveedor.categoria', 'categoria'])),
            'codigo_fin' => $codigoFin,
        ]);
    }

    public function confirmarFin(int $id, Request $request): JsonResponse
    {
        $request->validate([
            'codigo' => 'required|string|size:6',
        ]);

        $servicio = $this->getServicioCliente($id, $request);
        if ($servicio instanceof JsonResponse) return $servicio;

        if ($servicio->estado !== 'por_confirmar') {
            return $this->error('Este servicio no esta esperando confirmacion', 422);
        }

        if (!hash_equals((string) $servicio->codigo_fin, (string) $request->codigo)) {
            return $this->error('Codigo incorrecto', 422);
        }

        $servicio->update(['estado' => 'completado']);

        $servicio->loadMissing('proveedor');
        if ($servicio->proveedor?->user_id) {
            Notificacion::create([
                'destinatario_id' => $servicio->proveedor->user_id,
                'tipo'            => 'servicio_completado',
                'titulo'          => 'Servicio confirmado',
                'mensaje'         => 'El cliente confirmo la finalizacion del servicio.',
                'datos'           => ['servicio_id' => $servicio->id],
            ]);
        }

        $this->notificarServicioCalificable($servicio);

        $servicio->loadMissing(['cliente', 'proveedor.categoria', 'categoria']);

        return $this->success('Servicio completado', ['servicio' => new ServicioResource($servicio)]);
    }

    // ── Helper ────────────────────────────────────────────────────────────────

    private function getServicioProveedor(int $id, Request $request)
    {
        $servicio = Servicio::find($id);
        if (!$servicio) {
            return $this->error('Servicio no encontrado', 404);
        }

        $proveedor = $request->user()->proveedor;
        if (!$proveedor || $servicio->proveedor_id !== $proveedor->id) {
            return $this->error('No tienes permiso para gestionar este servicio', 403);
        }

        return $servicio;
    }

    private function getServicioCliente(int $id, Request $request)
    {
        $servicio = Servicio::find($id);
        if (!$servicio) {
            return $this->error('Servicio no encontrado', 404);
        }

        if ($servicio->cliente_id !== $request->user()->id) {
            return $this->error('No tienes permiso para confirmar este servicio', 403);
        }

        return $servicio;
    }

    private function notificarServicioCalificable(Servicio $servicio): void
    {
        $yaExiste = Notificacion::where('destinatario_id', $servicio->cliente_id)
            ->where('tipo', 'servicio_calificable')
            ->where('datos->servicio_id', $servicio->id)
            ->exists();

        if ($yaExiste) {
            return;
        }

        $servicio->loadMissing('proveedor');

        Notificacion::create([
            'destinatario_id' => $servicio->cliente_id,
            'tipo'            => 'servicio_calificable',
            'titulo'          => 'Servicio listo para calificar',
            'mensaje'         => 'El servicio fue completado. Ya puedes calificar a ' . ($servicio->proveedor?->nombre ?? 'tu proveedor') . '.',
            'datos'           => ['servicio_id' => $servicio->id],
        ]);
    }
}
