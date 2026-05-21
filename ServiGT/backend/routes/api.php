<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\AdminController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\CategoriaController;
use App\Http\Controllers\ProviderController;
use App\Http\Controllers\HealthController;
use App\Http\Controllers\MessageController;
use App\Http\Controllers\ServicioController;
use App\Http\Controllers\SolicitudController;
use App\Http\Controllers\DisponibilidadController;
use App\Http\Controllers\CalificacionController;
use App\Http\Controllers\NotificacionController;
use App\Http\Controllers\PedidoController;

/*
|--------------------------------------------------------------------------
| API Routes - ServiGT Guatemala
|--------------------------------------------------------------------------
|
| Rutas publicas: health, login, register, listado de proveedores/categorias
| Rutas protegidas (auth:sanctum): modificar perfil, documentos, logout
|
*/

// ── Rutas publicas ─────────────────────────────────────────────────────────

Route::get('/health', [HealthController::class, 'check']);

// Autenticacion
Route::post('/register', [AuthController::class, 'register']);
Route::post('/login',    [AuthController::class, 'login']);

// Consultas publicas
Route::get('/categorias',              [CategoriaController::class, 'index']);
Route::get('/pedidos/abiertos',        [PedidoController::class, 'abiertos']);
Route::get('/providers',      [ProviderController::class, 'index']);
Route::get('/providers/{id}', [ProviderController::class, 'show'])->where('id', '[0-9]+');

// Calificaciones publicas de un proveedor
Route::get('/providers/{id}/calificaciones', [CalificacionController::class, 'porProveedor'])->where('id', '[0-9]+');

// Disponibilidad publica de un proveedor
Route::get('/providers/{id}/disponibilidad', [DisponibilidadController::class, 'index'])->where('id', '[0-9]+');

// ── Rutas protegidas (requieren token Bearer) ──────────────────────────────

Route::middleware('auth:sanctum')->group(function () {

    // Sesion del usuario autenticado
    Route::get('/me',      [AuthController::class, 'me']);
    Route::post('/logout', [AuthController::class, 'logout']);

    // Perfil de proveedor
    Route::get('/providers/user/{userId}', [ProviderController::class, 'showByUser']);
    Route::post('/providers',              [ProviderController::class, 'store']);
    Route::put('/providers/{id}',          [ProviderController::class, 'update'])->where('id', '[0-9]+');

    // Foto de perfil del proveedor
    Route::post('/providers/{id}/foto', [ProviderController::class, 'uploadFoto'])->where('id', '[0-9]+');

    // Documentos del proveedor
    Route::get('/providers/{id}/documentos',  [ProviderController::class, 'getDocumentos']);
    Route::post('/providers/{id}/documentos', [ProviderController::class, 'uploadDocumento']);

    // ── Servicios / Solicitudes ──────────────────────────────────────────────
    // Cliente solicita un servicio
    Route::post('/servicios', [ServicioController::class, 'store']);
    Route::post('/solicitudes', [SolicitudController::class, 'store']);
    Route::get('/solicitudes/enviadas', [SolicitudController::class, 'enviadas']);
    Route::get('/solicitudes/recibidas', [SolicitudController::class, 'recibidas']);
    // Proveedor ve sus solicitudes entrantes
    Route::get('/servicios/proveedor', [ServicioController::class, 'solicitudesProveedor']);
    // Cliente ve sus solicitudes
    Route::get('/servicios/cliente',   [ServicioController::class, 'solicitudesCliente']);
    // Ver detalle de un servicio
    Route::get('/servicios/{id}', [ServicioController::class, 'show'])->where('id', '[0-9]+');
    // Proveedor acepta/rechaza
    Route::post('/servicios/{id}/aceptar',  [ServicioController::class, 'aceptar'])->where('id', '[0-9]+');
    Route::post('/servicios/{id}/rechazar', [ServicioController::class, 'rechazar'])->where('id', '[0-9]+');
    // Proveedor inicia el servicio validando el codigo de inicio del cliente
    Route::post('/servicios/{id}/iniciar',  [ServicioController::class, 'iniciar'])->where('id', '[0-9]+');
    // Actualizar estado general (en_camino, en_progreso, completado, cancelado)
    Route::put('/servicios/{id}/estado', [ServicioController::class, 'actualizarEstado'])->where('id', '[0-9]+');

    // ── Disponibilidad ───────────────────────────────────────────────────────
    // Ver mi disponibilidad (proveedor autenticado)
    Route::get('/disponibilidad/mia',  [DisponibilidadController::class, 'miDisponibilidad']);
    // Guardar/actualizar mi disponibilidad
    Route::post('/disponibilidad',     [DisponibilidadController::class, 'guardar']);

    // ── Calificaciones ───────────────────────────────────────────────────────
    Route::post('/calificaciones', [CalificacionController::class, 'store']);
    Route::post('/servicios/{id}/calificar', [CalificacionController::class, 'calificarServicio'])->where('id', '[0-9]+');

    // ── Mensajes / Chat ──────────────────────────────────────────────────────
    // Enviar mensaje
    Route::post('/mensajes', [MessageController::class, 'store']);
    // Ver conversacion con otro usuario
    Route::get('/mensajes/conversacion/{userId}', [MessageController::class, 'conversacion'])->where('userId', '[0-9]+');
    // Listar todas mis conversaciones
    Route::get('/mensajes/conversaciones', [MessageController::class, 'misConversaciones']);

    // ── Pedidos (Marketplace de Demanda) ─────────────────────────────────────
    Route::post('/pedidos',           [PedidoController::class, 'store']);
    Route::get('/pedidos/mios',       [PedidoController::class, 'mios']);

    // ── Notificaciones ───────────────────────────────────────────────────────
    Route::get('/notificaciones',                [NotificacionController::class, 'index']);
    Route::put('/notificaciones/{id}/leer',      [NotificacionController::class, 'marcarLeida'])->where('id', '[0-9]+');
    Route::put('/notificaciones/leer-todas',     [NotificacionController::class, 'marcarTodasLeidas']);

    // ── Admin (requiere rol admin) ──────────────────────────────────────────
    Route::middleware('admin')->prefix('admin')->group(function () {
        Route::get('/stats',       [AdminController::class, 'stats']);
        Route::get('/usuarios',    [AdminController::class, 'listUsers']);
        Route::get('/proveedores', [AdminController::class, 'listProviders']);
    });
});
