<?php

namespace App\Http\Controllers;

use App\Models\DocumentoProveedor;
use App\Models\Proveedor;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class ProviderController extends Controller
{
    use ApiResponse;

    public function index(): JsonResponse
    {
        $proveedores = Proveedor::with('categoria')
            ->orderBy('calificacion_promedio', 'desc')
            ->get();

        return $this->success('OK', ['proveedores' => $proveedores]);
    }

    public function show(int $id): JsonResponse
    {
        $proveedor = Proveedor::with(['categoria', 'categorias', 'documentos', 'disponibilidad'])
            ->find($id);

        if (!$proveedor) {
            return $this->error('Proveedor no encontrado', 404);
        }

        return $this->success('OK', ['proveedor' => $proveedor]);
    }

    public function showByUser(int $userId): JsonResponse
    {
        $proveedor = Proveedor::with(['categoria', 'categorias', 'documentos', 'disponibilidad'])
            ->where('user_id', $userId)
            ->first();

        if (!$proveedor) {
            return $this->error('Perfil de proveedor no encontrado', 404);
        }

        return $this->success('OK', ['proveedor' => $proveedor]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'user_id'           => 'nullable|exists:users,id',
            'nombre'            => 'required|string|max:255',
            'email'             => 'required|email|unique:proveedores,email',
            'telefono'          => 'nullable|string|max:20',
            'descripcion'       => 'nullable|string',
            'departamento'      => 'required|string|max:100',
            'municipio'         => 'nullable|string|max:100',
            'categoria_id'      => 'nullable|exists:categorias,id',
            'categoria_ids'     => 'sometimes|array|min:1',
            'categoria_ids.*'   => 'exists:categorias,id',
            'tarifa_hora'       => 'nullable|numeric|min:0',
            'tarifa_proyecto'   => 'nullable|numeric|min:0',
            'nivel'             => 'nullable|in:novato,intermedio,experto',
        ]);

        $categoriaIds = $validated['categoria_ids'] ?? [];
        unset($validated['categoria_ids']);

        // Derive primary categoria_id from first selection when not explicitly set
        if (empty($validated['categoria_id']) && !empty($categoriaIds)) {
            $validated['categoria_id'] = $categoriaIds[0];
        }

        $proveedor = Proveedor::create($validated);

        if (!empty($categoriaIds)) {
            $proveedor->categorias()->sync($categoriaIds);
        } elseif (!empty($validated['categoria_id'])) {
            $proveedor->categorias()->sync([$validated['categoria_id']]);
        }

        $proveedor->load(['categoria', 'categorias']);

        return $this->success('Proveedor creado exitosamente', ['proveedor' => $proveedor], 201);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $proveedor = Proveedor::find($id);
        if (!$proveedor) {
            return $this->error('Proveedor no encontrado', 404);
        }

        if ($proveedor->user_id !== $request->user()->id) {
            return $this->error('No tienes permiso para editar este perfil', 403);
        }

        $validated = $request->validate([
            'nombre'            => 'sometimes|required|string|max:255',
            'telefono'          => 'nullable|string|max:20',
            'descripcion'       => 'nullable|string',
            'departamento'      => 'sometimes|required|string|max:100',
            'municipio'         => 'nullable|string|max:100',
            'categoria_id'      => 'sometimes|nullable|exists:categorias,id',
            'categoria_ids'     => 'sometimes|array|min:1',
            'categoria_ids.*'   => 'exists:categorias,id',
            'tarifa_hora'       => 'nullable|numeric|min:0',
            'tarifa_proyecto'   => 'nullable|numeric|min:0',
            'nivel'             => 'nullable|in:novato,intermedio,experto',
        ]);

        $categoriaIds = $validated['categoria_ids'] ?? null;
        unset($validated['categoria_ids']);

        if ($categoriaIds !== null) {
            $validated['categoria_id'] = $categoriaIds[0];
            $proveedor->categorias()->sync($categoriaIds);
        }

        $proveedor->update($validated);
        $proveedor->load(['categoria', 'categorias', 'documentos', 'disponibilidad']);

        return $this->success('Perfil actualizado correctamente', ['proveedor' => $proveedor]);
    }

    public function getDocumentos(int $id): JsonResponse
    {
        $proveedor = Proveedor::find($id);
        if (!$proveedor) {
            return $this->error('Proveedor no encontrado', 404);
        }

        return $this->success('OK', [
            'documentos' => DocumentoProveedor::where('proveedor_id', $id)
                ->orderBy('created_at', 'desc')
                ->get(),
        ]);
    }

    public function uploadDocumento(Request $request, int $id): JsonResponse
    {
        $proveedor = Proveedor::find($id);
        if (!$proveedor) {
            return $this->error('Proveedor no encontrado', 404);
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

        return $this->success('Documento subido correctamente', ['documento' => $documento], 201);
    }
}
