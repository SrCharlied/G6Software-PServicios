<?php

namespace App\Services;

use App\Models\CompraCredito;
use App\Models\Cotizacion;
use App\Models\Disponibilidad;
use App\Models\DocumentoProveedor;
use App\Models\PagoPremium;
use App\Models\Pedido;
use App\Models\Proveedor;
use App\Models\PublicacionServicio;
use App\Models\ReservaMaterial;
use App\Models\Servicio;
use App\Models\SolicitudEliminacionCuenta;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * Anonimizacion transaccional de cuentas (Task 3.1.b, Sprint 10).
 *
 * Eliminar una cuenta = anonimizar + revocar acceso. Nunca DELETE de users ni
 * de proveedores: las FK con ON DELETE CASCADE se llevarian servicios,
 * compras, cotizaciones y reportes. Politicas ratificadas por el equipo
 * (2026-11-05):
 *
 *  - Bloquean: servicios activos (como cliente o proveedor), reservas de
 *    material pendientes/aceptadas (como comprador o vendedor), compras de
 *    creditos o pagos Premium pendientes, y Premium con renovacion automatica
 *    vigente en Stripe.
 *  - Se cierran solos: pedidos abiertos del cliente (sus cotizaciones
 *    `enviada` pasan a `rechazada`) y cotizaciones `enviada` del proveedor
 *    (pasan a `retirada`). Los creditos gastados no se devuelven.
 *  - Administradores: no usan este flujo (lo corta el controlador con 403).
 *  - Tombstone: nombre "Usuario eliminado", correo
 *    eliminado+{id}@servigt.invalid, contrasena aleatoria, sin telefono ni
 *    foto. En el proveedor se limpian contacto, descripcion, experiencia,
 *    portada, color y disponibilidad; sus publicaciones quedan inactivas.
 *  - Se conserva: servicios, compras, transacciones, calificaciones,
 *    mensajes, reportes de seguridad y aceptaciones legales.
 *  - Se revocan todos los tokens Sanctum.
 *
 * Los archivos se borran DESPUES del commit (3.1.c): si la transaccion se
 * revierte, nada se borro del disco. Un fallo de borrado deja la solicitud
 * en limpieza_pendiente y el comando programado reintenta.
 */
class AnonimizacionCuentaService
{
    public const NOMBRE_TOMBSTONE = 'Usuario eliminado';
    public const NOMBRE_PROVEEDOR_TOMBSTONE = 'Proveedor eliminado';
    public const DOMINIO_TOMBSTONE = 'servigt.invalid';

    public const SERVICIO_ESTADOS_ACTIVOS = ['pendiente', 'aceptado', 'en_camino', 'en_progreso', 'por_confirmar'];
    public const RESERVA_ESTADOS_ACTIVOS = ['pendiente', 'aceptada'];

    private const MENSAJES_BLOQUEO = [
        'servicios_activos'  => 'Tienes servicios en curso. Finalizalos o cancelalos antes de eliminar tu cuenta.',
        'reservas_material'  => 'Tienes reservas de material pendientes o aceptadas.',
        'compras_pendientes' => 'Tienes compras de creditos o pagos Premium pendientes.',
        'premium_recurrente' => 'Tu Premium se renueva automaticamente. Cancela la renovacion antes de eliminar tu cuenta.',
    ];

    public function __construct(
        private readonly SolicitudEliminacionService $solicitudes,
        private readonly LimpiezaArchivosCuentaService $limpieza,
    ) {
    }

    /**
     * Vista previa para la pantalla de confirmacion (3.2.a): que bloquea hoy
     * y que se cerrara automaticamente. No modifica nada.
     */
    public function impacto(User $user): array
    {
        $proveedor = Proveedor::where('user_id', $user->id)->first();
        $bloqueos = $this->bloqueos($user, $proveedor);

        return [
            'puede_eliminar' => $bloqueos === [],
            'bloqueos'       => $bloqueos,
            'se_cerrara'     => [
                'pedidos_abiertos'      => Pedido::where('cliente_id', $user->id)->where('estado', 'abierto')->count(),
                'cotizaciones_enviadas' => $proveedor
                    ? Cotizacion::where('proveedor_id', $proveedor->id)->where('estado', 'enviada')->count()
                    : 0,
            ],
        ];
    }

    /**
     * Ejecuta la eliminacion de forma idempotente por `idempotencyKey`.
     *
     * Devuelve la solicitud en uno de estos estados:
     *  - rechazada: habia bloqueos; la cuenta queda intacta.
     *  - limpieza_pendiente / completada: cuenta anonimizada y sin acceso.
     */
    public function eliminar(User $user, string $idempotencyKey): SolicitudEliminacionCuenta
    {
        $solicitud = $this->solicitudes->solicitar($user, $idempotencyKey);

        if ($solicitud->estado === SolicitudEliminacionCuenta::PENDIENTE) {
            $solicitud = DB::transaction(fn () => $this->anonimizarBajoLock($solicitud));
        }

        // Fuera de la transaccion: el disco no participa del rollback.
        if ($solicitud->estado === SolicitudEliminacionCuenta::LIMPIEZA_PENDIENTE) {
            $solicitud = $this->limpieza->limpiar($solicitud);
        }

        return $solicitud;
    }

    /**
     * @return list<array{codigo:string, mensaje:string, cantidad:int}>
     */
    public function bloqueos(User $user, ?Proveedor $proveedor): array
    {
        $conteos = [
            'servicios_activos' => Servicio::whereIn('estado', self::SERVICIO_ESTADOS_ACTIVOS)
                ->where(function ($q) use ($user, $proveedor) {
                    $q->where('cliente_id', $user->id);
                    if ($proveedor) {
                        $q->orWhere('proveedor_id', $proveedor->id);
                    }
                })
                ->count(),
            'reservas_material'  => 0,
            'compras_pendientes' => 0,
            'premium_recurrente' => 0,
        ];

        if ($proveedor) {
            $conteos['reservas_material'] = ReservaMaterial::whereIn('estado', self::RESERVA_ESTADOS_ACTIVOS)
                ->where(function ($q) use ($proveedor) {
                    $q->where('comprador_id', $proveedor->id)
                        ->orWhereHas('publicacion', fn ($p) => $p->where('vendedor_id', $proveedor->id));
                })
                ->count();

            $conteos['compras_pendientes'] =
                CompraCredito::where('proveedor_id', $proveedor->id)->where('estado', 'pendiente')->count()
                + PagoPremium::where('proveedor_id', $proveedor->id)->where('estado', 'pendiente')->count();

            $renuevaSolo = $proveedor->premium_recurrente
                && !$proveedor->premium_cancela_al_final
                && $proveedor->stripe_subscription_id !== null
                && $proveedor->premium_vence_at !== null
                && $proveedor->premium_vence_at->isFuture();
            $conteos['premium_recurrente'] = $renuevaSolo ? 1 : 0;
        }

        $bloqueos = [];
        foreach ($conteos as $codigo => $cantidad) {
            if ($cantidad > 0) {
                $bloqueos[] = ['codigo' => $codigo, 'mensaje' => self::MENSAJES_BLOQUEO[$codigo], 'cantidad' => $cantidad];
            }
        }

        return $bloqueos;
    }

    private function anonimizarBajoLock(SolicitudEliminacionCuenta $solicitud): SolicitudEliminacionCuenta
    {
        // Mismo orden de locks que SolicitudEliminacionService: usuario y
        // luego solicitud. Dos intentos simultaneos se serializan aqui y el
        // segundo ve la solicitud ya resuelta.
        $user = User::whereKey($solicitud->user_id)->lockForUpdate()->firstOrFail();
        $actual = SolicitudEliminacionCuenta::whereKey($solicitud->id)->lockForUpdate()->firstOrFail();

        if ($actual->estado !== SolicitudEliminacionCuenta::PENDIENTE) {
            return $actual;
        }

        $proveedor = Proveedor::where('user_id', $user->id)->lockForUpdate()->first();

        $bloqueos = $this->bloqueos($user, $proveedor);
        if ($bloqueos !== []) {
            $actual->update([
                'estado'         => SolicitudEliminacionCuenta::RECHAZADA,
                'motivo_rechazo' => implode(',', array_column($bloqueos, 'codigo')),
            ]);

            return $actual;
        }

        // El manifiesto se toma antes de limpiar las rutas del perfil.
        $actual->setRelation('user', $user);
        $this->limpieza->capturarManifiesto($actual);

        $this->cerrarOperacionesAbiertas($user, $proveedor);

        if ($proveedor) {
            $this->anonimizarProveedor($proveedor);
        }

        $ahora = now();
        $user->forceFill([
            'name'           => self::NOMBRE_TOMBSTONE,
            'email'          => 'eliminado+' . $user->id . '@' . self::DOMINIO_TOMBSTONE,
            'password'       => Str::random(64),
            'telefono'       => null,
            'foto_perfil'    => null,
            'estado_cuenta'  => 'anonimizada',
            'anonimizada_at' => $ahora,
        ])->save();

        // Todas las sesiones, no solo la actual.
        $user->tokens()->delete();

        $actual->update([
            'estado'         => SolicitudEliminacionCuenta::LIMPIEZA_PENDIENTE,
            'anonimizada_at' => $ahora,
        ]);

        return $actual;
    }

    private function cerrarOperacionesAbiertas(User $user, ?Proveedor $proveedor): void
    {
        $pedidosAbiertos = Pedido::where('cliente_id', $user->id)->where('estado', 'abierto')->lockForUpdate()->pluck('id');
        if ($pedidosAbiertos->isNotEmpty()) {
            // Solo `enviada` pasa a rechazada; `retirada` se conserva.
            Cotizacion::whereIn('pedido_id', $pedidosAbiertos)->where('estado', 'enviada')
                ->update(['estado' => 'rechazada']);
            Pedido::whereIn('id', $pedidosAbiertos)->update(['estado' => 'cerrado']);
        }

        if ($proveedor) {
            Cotizacion::where('proveedor_id', $proveedor->id)->where('estado', 'enviada')
                ->update(['estado' => 'retirada']);
        }
    }

    private function anonimizarProveedor(Proveedor $proveedor): void
    {
        $proveedor->forceFill([
            'nombre'              => self::NOMBRE_PROVEEDOR_TOMBSTONE,
            'email'               => 'eliminado+p' . $proveedor->id . '@' . self::DOMINIO_TOMBSTONE,
            'telefono'            => null,
            'descripcion'         => null,
            'experiencia_resumen' => null,
            'municipio'           => null,
            'foto_perfil'         => null,
            'portada'             => null,
            'color_acento'        => null,
        ])->save();

        Disponibilidad::where('proveedor_id', $proveedor->id)->delete();

        PublicacionServicio::where('proveedor_id', $proveedor->id)
            ->update(['estado' => 'inactiva', 'imagen' => null]);

        // La fila se conserva como rastro de verificacion; el archivo sale por
        // el manifiesto y el nombre original (suele llevar el nombre real) se
        // reemplaza.
        DocumentoProveedor::where('proveedor_id', $proveedor->id)
            ->update(['nombre_archivo' => 'documento-eliminado']);
    }
}
