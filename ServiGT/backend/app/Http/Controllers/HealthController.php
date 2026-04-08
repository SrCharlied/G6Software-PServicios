<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

class HealthController extends Controller
{
    public function check(): JsonResponse
    {
        try {
            DB::connection()->getPdo();
            $dbStatus = 'connected';
        } catch (\Exception $e) {
            $dbStatus = 'error: ' . $e->getMessage();
        }

        return response()->json([
            'status'   => 'ok',
            'app'      => 'PServicios Guatemala',
            'backend'  => 'Laravel PHP',
            'database' => [
                'driver' => config('database.default'),
                'status' => $dbStatus,
            ],
            'timestamp' => now()->toIso8601String(),
        ]);
    }
}
