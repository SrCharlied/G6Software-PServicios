<?php

namespace App\Http\Controllers;

use App\Models\Proveedor;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ProviderController extends Controller
{
    public function index(): JsonResponse
    {
        $proveedores = Proveedor::with('categoria')->get();

        return response()->json([
            'message'     => 'Lista de proveedores',
            'proveedores' => $proveedores,
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'nombre'       => 'required|string|max:255',
            'email'        => 'required|email|unique:proveedores,email',
            'telefono'     => 'nullable|string|max:20',
            'descripcion'  => 'nullable|string',
            'departamento' => 'required|string|max:100',
            'municipio'    => 'nullable|string|max:100',
            'categoria_id' => 'required|exists:categorias,id',
        ]);

        $proveedor = Proveedor::create($validated);
        $proveedor->load('categoria');

        return response()->json([
            'message'   => 'Proveedor creado exitosamente',
            'proveedor' => $proveedor,
        ], 201);
    }
}
