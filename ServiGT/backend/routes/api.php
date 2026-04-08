<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\ProviderController;
use App\Http\Controllers\HealthController;

/*
|--------------------------------------------------------------------------
| API Routes - PServicios Guatemala
|--------------------------------------------------------------------------
*/

// Health check
Route::get('/health', [HealthController::class, 'check']);

// Autenticación
Route::post('/register', [AuthController::class, 'register']);
Route::post('/login', [AuthController::class, 'login']);

// Proveedores
Route::get('/providers', [ProviderController::class, 'index']);
Route::post('/providers', [ProviderController::class, 'store']);
