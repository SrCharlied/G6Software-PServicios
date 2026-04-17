<?php

namespace App\Http\Controllers;

use App\Models\Mensaje;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class MessageController extends Controller
{
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'cliente_id' => [
                'required',
                'integer',
                Rule::exists('users', 'id')->where(fn ($query) => $query->where('role', 'cliente')),
            ],
            'proveedor_id' => 'required|integer|exists:proveedores,id',
            'remitente' => 'required|in:cliente,proveedor',
            'contenido' => [
                'required',
                'string',
                'max:2000',
                function (string $attribute, mixed $value, \Closure $fail): void {
                    if (trim((string) $value) === '') {
                        $fail('El contenido del mensaje es obligatorio.');
                    }
                },
            ],
        ]);

        $mensaje = Mensaje::create($validated);
        $mensaje->load([
            'cliente:id,name,email,role',
            'proveedor:id,user_id,nombre,email,telefono,departamento,municipio,categoria_id',
        ]);

        return response()->json([
            'message' => 'Mensaje enviado exitosamente',
            'mensaje' => $mensaje,
        ], 201);
    }
}
