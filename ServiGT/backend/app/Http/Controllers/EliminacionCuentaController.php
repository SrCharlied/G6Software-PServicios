<?php

namespace App\Http\Controllers;

use App\Models\SolicitudEliminacionCuenta;
use App\Services\AnonimizacionCuentaService;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

/**
 * Eliminacion de la propia cuenta (HU 3.1.b, consumida por la pantalla 3.2).
 *
 * Solo cliente y proveedor. Un admin recibe 403 antes de validar el cuerpo
 * (politica ratificada: la baja de administradores va por fuera de este
 * flujo, asi nunca se queda la plataforma sin admins).
 */
class EliminacionCuentaController extends Controller
{
    use ApiResponse;

    public const CONFIRMACION = 'ELIMINAR';

    public function __construct(private readonly AnonimizacionCuentaService $servicio)
    {
    }

    /** GET /api/cuenta/eliminacion/impacto */
    public function impacto(Request $request): JsonResponse
    {
        if ($request->user()->role === 'admin') {
            return $this->error('Los administradores no pueden eliminar su cuenta desde aqui.', 403);
        }

        return $this->success('OK', $this->servicio->impacto($request->user()));
    }

    /** POST /api/cuenta/eliminacion */
    public function solicitar(Request $request): JsonResponse
    {
        $user = $request->user();

        if ($user->role === 'admin') {
            return $this->error('Los administradores no pueden eliminar su cuenta desde aqui.', 403);
        }

        $validated = $request->validate([
            'password'        => 'required|string',
            'confirmacion'    => 'required|string|in:' . self::CONFIRMACION,
            'idempotency_key' => 'required|string|max:80|regex:/\S/',
        ], [
            'confirmacion.in' => 'Escribe ELIMINAR para confirmar.',
        ]);

        // Reautenticacion: un token robado no basta para borrar la cuenta.
        if (!Hash::check($validated['password'], $user->password)) {
            throw ValidationException::withMessages(['password' => 'La contrasena no es correcta.']);
        }

        $solicitud = $this->servicio->eliminar($user, $validated['idempotency_key']);

        if ($solicitud->estado === SolicitudEliminacionCuenta::RECHAZADA) {
            // Bloqueos actuales, no los del intento: si el usuario resolvio uno,
            // la pantalla muestra solo lo que sigue pendiente.
            $impacto = $this->servicio->impacto($user->fresh());

            return response()->json([
                'success'  => false,
                'message'  => 'No se puede eliminar la cuenta mientras haya operaciones activas.',
                'bloqueos' => $impacto['bloqueos'],
                'motivo'   => $solicitud->motivo_rechazo,
            ], 409);
        }

        return $this->success('Cuenta eliminada. Se cerraron todas tus sesiones.', [
            'solicitud' => [
                'id'             => $solicitud->id,
                'estado'         => $solicitud->estado,
                'anonimizada_at' => $solicitud->anonimizada_at?->toIso8601String(),
            ],
        ]);
    }
}
