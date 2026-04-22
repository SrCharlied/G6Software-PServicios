<?php

namespace App\Http\Controllers;

use App\Models\DocumentoProveedor;
use App\Models\Proveedor;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class ProviderController extends Controller
{
    public function index(Request $request)
    {
        $categoria = trim((string) $request->query('categoria', ''));

        $query = Proveedor::with('categoria');

        if ($categoria) {
            $query->whereHas('categoria', function ($q) use ($categoria) {
                $q->where('nombre', 'ILIKE', '%' . $categoria . '%');
            });
        }

        $proveedores = $query->get();

        return response()->json([
            'proveedores' => $proveedores
        ]);
    }

    public function show(int $id): JsonResponse
    {
        $proveedor = Proveedor::with(['categoria', 'categorias', 'documentos', 'disponibilidad'])
            ->find($id);

        if (!$proveedor) {
            return response()->json(['message' => 'Proveedor no encontrado'], 404);
        }

        return response()->json(['proveedor' => $proveedor]);
    }

    public function showByUser(int $userId): JsonResponse
    {
        $proveedor = Proveedor::with(['categoria', 'categorias', 'documentos', 'disponibilidad'])
            ->where('user_id', $userId)
            ->first();

        if (!$proveedor) {
            return response()->json(['message' => 'Perfil de proveedor no encontrado'], 404);
        }

        return response()->json(['proveedor' => $proveedor]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'user_id'          => 'nullable|exists:users,id',
            'nombre'           => 'required|string|max:255',
            'email'            => 'required|email|unique:proveedores,email',
            'telefono'         => 'nullable|string|max:20',
            'descripcion'      => 'nullable|string',
            'departamento'     => 'required|string|max:100',
            'municipio'        => 'nullable|string|max:100',
            'categoria_id'     => 'required|exists:categorias,id',
            'tarifa_hora'      => 'nullable|numeric|min:0',
            'tarifa_proyecto'  => 'nullable|numeric|min:0',
            'nivel'            => 'nullable|in:novato,intermedio,experto',
        ]);

        $proveedor = Proveedor::create($validated);
        $proveedor->load('categoria');

        return response()->json([
            'message'   => 'Proveedor creado exitosamente',
            'proveedor' => $proveedor,
        ], 201);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $proveedor = Proveedor::find($id);
        if (!$proveedor) {
            return response()->json(['message' => 'Proveedor no encontrado'], 404);
        }

        // Solo el dueño puede editar
        if ($proveedor->user_id !== $request->user()->id) {
            return response()->json(['message' => 'No autorizado'], 403);
        }

        $validated = $request->validate([
            'nombre'           => 'sometimes|required|string|max:255',
            'telefono'         => 'nullable|string|max:20',
            'descripcion'      => 'nullable|string',
            'departamento'     => 'sometimes|required|string|max:100',
            'municipio'        => 'nullable|string|max:100',
            'categoria_id'     => 'sometimes|required|exists:categorias,id',
            'tarifa_hora'      => 'nullable|numeric|min:0',
            'tarifa_proyecto'  => 'nullable|numeric|min:0',
            'nivel'            => 'nullable|in:novato,intermedio,experto',
        ]);

        $proveedor->update($validated);
        $proveedor->load(['categoria', 'documentos', 'disponibilidad']);

        return response()->json([
            'message'   => 'Proveedor actualizado',
            'proveedor' => $proveedor,
        ]);
    }

    public function getDocumentos(int $id): JsonResponse
    {
        $proveedor = Proveedor::find($id);
        if (!$proveedor) {
            return response()->json(['message' => 'Proveedor no encontrado'], 404);
        }

        return response()->json([
            'documentos' => DocumentoProveedor::where('proveedor_id', $id)
                ->orderBy('created_at', 'desc')
                ->get(),
        ]);
    }

    public function uploadDocumento(Request $request, int $id): JsonResponse
    {
        $proveedor = Proveedor::find($id);
        if (!$proveedor) {
            return response()->json(['message' => 'Proveedor no encontrado'], 404);
        }

        $request->validate([
            'documento'      => 'required|file|mimes:pdf,jpg,jpeg,png|max:5120',
            'tipo_documento' => 'required|string|max:100',
        ]);

        $file          = $request->file('documento');
        $nombreArchivo = time() . '_' . $file->getClientOriginalName();
        $ruta          = $file->storeAs('documentos/' . $id, $nombreArchivo, 'public');

        $documento = DocumentoProveedor::create([
            'proveedor_id'      => $id,
            'tipo_documento'    => $request->tipo_documento,
            'nombre_archivo'    => $file->getClientOriginalName(),
            'ruta_archivo'      => Storage::url($ruta),
            'estado_validacion' => 'pendiente',
        ]);

        return response()->json([
            'message'   => 'Documento subido',
            'documento' => $documento,
        ], 201);
    }
}
