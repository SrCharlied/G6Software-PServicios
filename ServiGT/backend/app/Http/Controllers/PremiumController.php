<?php

namespace App\Http\Controllers;

use App\Models\ActivacionPremium;
use App\Models\CreditoProveedor;
use App\Models\Proveedor;
use App\Models\TransaccionCredito;
use App\Traits\ApiResponse;
use Illuminate\Database\QueryException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class PremiumController extends Controller
{
    use ApiResponse;

    /** Precio mensual ratificado para Sprint 6, cobrado en quetzales. */
    public const PRECIO_GTQ = 115.00;

    /** Vigencia de cada ciclo, contada desde la activacion o renovacion. */
    public const DIAS_VIGENCIA = 30;

    /** Creditos que acredita cada ciclo, una sola vez. */
    public const CREDITOS_POR_CICLO = 10;

    /**
     * Beneficios visibles del plan. Se exponen desde el backend para que
     * dashboard, perfil publico y administracion muestren la misma lista y no
     * haya tres copias divergentes en el frontend.
     */
    public const BENEFICIOS = [
        'Badge Premium visible en tu perfil y en los listados.',
        'Impulso de visibilidad sin desplazar reputacion ni relevancia.',
        '10 creditos incluidos por cada mes activo.',
        'Vigencia de 30 dias con renovacion cuando la necesites.',
        'Portada y perfil mejorado (personalizacion en preparacion).',
    ];

    /**
     * POST /api/premium/activar
     *
     * Activacion o renovacion simulada por Q115. No se procesa ningun pago
     * real ni se capturan datos bancarios. Cada llamada abre un ciclo nuevo
     * que vence 30 dias despues (no acumula los dias del ciclo anterior) y
     * acredita exactamente 10 creditos como transaccion de tipo `bono`.
     *
     * Request:  { idempotency_key?: string }
     * Idempotencia: repetir la misma `idempotency_key` devuelve el ciclo ya
     * registrado sin extender la vigencia ni acreditar de nuevo. Ademas
     * UNIQUE (proveedor_id, ciclo) impide que dos peticiones simultaneas
     * acrediten el mismo ciclo dos veces.
     */
    public function activar(Request $request): JsonResponse
    {
        $proveedor = Proveedor::where('user_id', $request->user()->id)->first();

        if (!$proveedor) {
            return $this->error('Solo los proveedores pueden activar Premium.', 403);
        }

        try {
            $validated = $request->validate([
                'idempotency_key' => 'sometimes|string|max:100',
            ]);
        } catch (ValidationException $e) {
            return $this->error('Datos de activacion invalidos.', 422, $e->errors());
        }

        $idempotencyKey = $validated['idempotency_key'] ?? (string) Str::uuid();

        $existente = ActivacionPremium::where('proveedor_id', $proveedor->id)
            ->where('idempotency_key', $idempotencyKey)
            ->first();

        if ($existente) {
            return $this->success('Premium ya activado con esa solicitud.', [
                'activacion' => $this->formatearActivacion($existente),
                'premium'    => $this->estadoDe($proveedor->fresh()),
                'saldo'      => $this->saldoDe($proveedor->id),
            ]);
        }

        try {
            $resultado = DB::transaction(function () use ($proveedor, $idempotencyKey) {
                $proveedorLock = Proveedor::query()->lockForUpdate()->findOrFail($proveedor->id);

                $ciclo    = ((int) $proveedorLock->premium_renovaciones) + 1;
                $inicioAt = now();
                $venceAt  = now()->addDays(self::DIAS_VIGENCIA);

                $activacion = ActivacionPremium::create([
                    'proveedor_id'       => $proveedorLock->id,
                    'ciclo'              => $ciclo,
                    'monto_gtq'          => self::PRECIO_GTQ,
                    'creditos_otorgados' => self::CREDITOS_POR_CICLO,
                    'inicio_at'          => $inicioAt,
                    'vence_at'           => $venceAt,
                    'referencia'         => $this->generarReferenciaUnica(),
                    'idempotency_key'    => $idempotencyKey,
                ]);

                $credito = CreditoProveedor::query()
                    ->where('proveedor_id', $proveedorLock->id)
                    ->lockForUpdate()
                    ->first();

                if (!$credito) {
                    $credito = CreditoProveedor::create([
                        'proveedor_id' => $proveedorLock->id,
                        'saldo'        => 0,
                        'updated_at'   => now(),
                    ]);
                }

                $credito->saldo += self::CREDITOS_POR_CICLO;
                $credito->updated_at = now();
                $credito->save();

                // El motivo identifica el ciclo para que el historial permita
                // auditar que cada ciclo acredito una unica vez.
                TransaccionCredito::create([
                    'proveedor_id'  => $proveedorLock->id,
                    'tipo'          => 'bono',
                    'monto'         => self::CREDITOS_POR_CICLO,
                    'motivo'        => "Bono mensual Premium - ciclo {$ciclo}",
                    'referencia_id' => $activacion->id,
                ]);

                $proveedorLock->premium_inicio_at    = $inicioAt;
                $proveedorLock->premium_vence_at     = $venceAt;
                $proveedorLock->premium_renovaciones = $ciclo;
                $proveedorLock->save();

                return [
                    'activacion' => $activacion,
                    'proveedor'  => $proveedorLock,
                    'saldo'      => (int) $credito->saldo,
                ];
            });
        } catch (QueryException $e) {
            // Solo se absorbe el choque contra UNIQUE (proveedor_id, ciclo) o
            // contra idempotency_key: otra peticion identica gano la carrera y
            // ya dejo el ciclo acreditado. Cualquier otro fallo de BD se
            // propaga; convertirlo en exito ocultaria un error real.
            $ganadora = ActivacionPremium::where('proveedor_id', $proveedor->id)
                ->where('idempotency_key', $idempotencyKey)
                ->first();

            if (!$ganadora) {
                throw $e;
            }

            return $this->success('Premium ya activado con esa solicitud.', [
                'activacion' => $this->formatearActivacion($ganadora),
                'premium'    => $this->estadoDe($proveedor->fresh()),
                'saldo'      => $this->saldoDe($proveedor->id),
            ]);
        }

        $estado = $this->estadoDe($resultado['proveedor']);

        return $this->success('Premium activado correctamente.', array_merge($estado, [
            'activacion' => $this->formatearActivacion($resultado['activacion']),
            'premium'    => $estado,
            'saldo'      => $resultado['saldo'],
        ]), 201);
    }

    /**
     * GET /api/premium/mi-estado
     *
     * Estado Premium del proveedor autenticado en los tres estados posibles:
     * `nunca`, `activo` y `vencido`. Incluye fechas, dias restantes,
     * renovaciones acumuladas, precio y beneficios para que el frontend no
     * tenga que codificar esos valores.
     */
    public function miEstado(Request $request): JsonResponse
    {
        $proveedor = Proveedor::where('user_id', $request->user()->id)->first();

        if (!$proveedor) {
            return $this->error('Solo los proveedores tienen estado Premium.', 403);
        }

        $estado = $this->estadoDe($proveedor);

        $ultima = ActivacionPremium::where('proveedor_id', $proveedor->id)
            ->orderByDesc('ciclo')
            ->first();

        return $this->success('Estado Premium obtenido correctamente.', array_merge($estado, [
            'premium'         => $estado,
            'ultima_activacion' => $ultima ? $this->formatearActivacion($ultima) : null,
            'saldo'           => $this->saldoDe($proveedor->id),
        ]));
    }

    /**
     * Bloque de estado comun a activar() y miEstado(). Se devuelve tanto en la
     * raiz como bajo `premium` para que la UI pueda leer cualquiera de los dos
     * sin ambiguedad.
     */
    private function estadoDe(Proveedor $proveedor): array
    {
        return array_merge($proveedor->premiumResumen(), [
            'precio_gtq'          => self::PRECIO_GTQ,
            'dias_vigencia'       => self::DIAS_VIGENCIA,
            'creditos_por_ciclo'  => self::CREDITOS_POR_CICLO,
            'beneficios'          => self::BENEFICIOS,
        ]);
    }

    private function saldoDe(int $proveedorId): int
    {
        return (int) (CreditoProveedor::where('proveedor_id', $proveedorId)->value('saldo') ?? 0);
    }

    private function formatearActivacion(ActivacionPremium $activacion): array
    {
        return [
            'id'                 => $activacion->id,
            'ciclo'              => $activacion->ciclo,
            'monto_gtq'          => (float) $activacion->monto_gtq,
            'creditos_otorgados' => $activacion->creditos_otorgados,
            'inicio_at'          => $activacion->inicio_at,
            'vence_at'           => $activacion->vence_at,
            'referencia'         => $activacion->referencia,
        ];
    }

    /**
     * Referencia visible SGT-XXXXX, con el mismo formato que las compras de
     * creditos. La columna es UNIQUE; el reintento cubre la colision.
     */
    private function generarReferenciaUnica(): string
    {
        do {
            $referencia = 'SGT-' . str_pad((string) random_int(0, 99999), 5, '0', STR_PAD_LEFT);
        } while (ActivacionPremium::where('referencia', $referencia)->exists());

        return $referencia;
    }
}
