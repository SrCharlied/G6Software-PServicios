<?php

namespace App\Http\Controllers;

use App\Models\Notificacion;
use App\Models\Solicitud;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SolicitudController extends Controller
{
    use ApiResponse;

    public function store(Request $request): JsonResponse
    {
        $request->merge([
            'descripcion' => $request->input('descripcion', $request->input('mensaje')),
        ]);

        $validated = $request->validate([
            'proveedor_id'   => 'required|exists:proveedores,id',
            'categoria_id'   => 'nullable|exists:categorias,id',
            'descripcion'    => 'required|string|max:1000',
            'fecha_agendada' => 'nullable|date|after:now',
            'direccion'      => 'nullable|string|max:500',
            'monto_acordado' => 'nullable|numeric|min:0',
        ]);

        $validated['cliente_id'] = $request->user()->id;
        $validated['estado']     = 'pendiente';

        $solicitud = Solicitud::create($validated);
        $solicitud->load(['cliente', 'proveedor', 'categoria']);

        $proveedor = $solicitud->proveedor;
        if ($proveedor?->user_id) {
            Notificacion::create([
                'destinatario_id' => $proveedor->user_id,
                'tipo'            => 'nueva_solicitud',
                'titulo'          => 'Nueva solicitud de servicio',
                'mensaje'         => "{$request->user()->name} solicito tu servicio: {$validated['descripcion']}",
                'datos'           => ['solicitud_id' => $solicitud->id],
            ]);
        }

        return $this->success('Solicitud enviada exitosamente', ['solicitud' => $solicitud], 201);
    }

    public function enviadas(Request $request): JsonResponse
    {
        $solicitudes = Solicitud::with(['proveedor.categoria', 'categoria'])
            ->where('cliente_id', $request->user()->id)
            ->orderBy('created_at', 'desc')
            ->get();

        return $this->success('OK', [
            'solicitudes' => $solicitudes,
            'total'       => $solicitudes->count(),
        ]);
    }

    public function recibidas(Request $request): JsonResponse
    {
        $proveedor = $request->user()->proveedor;

        if (!$proveedor) {
            return $this->error('No tienes perfil de proveedor', 404);
        }

        $solicitudes = Solicitud::with(['cliente', 'categoria'])
            ->where('proveedor_id', $proveedor->id)
            ->orderBy('created_at', 'desc')
            ->get();

        return $this->success('OK', [
            'solicitudes' => $solicitudes,
            'total'       => $solicitudes->count(),
        ]);
    }
}
