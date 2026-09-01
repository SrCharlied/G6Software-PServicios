<?php

namespace App\Http\Controllers;

use App\Models\DocumentoProveedor;
use App\Models\Proveedor;
use App\Traits\ApiResponse;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class ProviderController extends Controller
{
    use ApiResponse, AuthorizesRequests;

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
        if (Proveedor::where('user_id', $request->user()->id)->exists()) {
            return $this->error('Ya tienes un perfil de proveedor.', 422);
        }

        $validated = $request->validate([
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

        // La identidad se deriva de la sesion, nunca del payload: evita que un
        // cliente cree un perfil de proveedor a nombre de otro usuario.
        $validated['user_id'] = $request->user()->id;

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

        $this->authorize('manage', $proveedor);

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
            // Hex de 6 digitos con almohadilla. Se valida en el servidor para
            // que no entre nada que luego se inyecte como color en la UI.
            'color_acento'      => 'nullable|regex:/^#[0-9a-fA-F]{6}$/',
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

    public function getDocumentos(Request $request, int $id): JsonResponse
    {
        $proveedor = Proveedor::find($id);
        if (!$proveedor) {
            return $this->error('Proveedor no encontrado', 404);
        }

        $this->authorize('manage', $proveedor);

        return $this->success('OK', [
            'documentos' => DocumentoProveedor::where('proveedor_id', $id)
                ->orderBy('created_at', 'desc')
                ->get(),
        ]);
    }

    public function uploadFoto(Request $request, int $id): JsonResponse
    {
        $proveedor = Proveedor::find($id);
        if (!$proveedor) {
            return $this->error('Proveedor no encontrado', 404);
        }

        $this->authorize('manage', $proveedor);

        $request->validate([
            'foto' => 'required|image|mimes:jpg,jpeg,png,webp|max:3072',
        ]);

        $file   = $request->file('foto');
        $nombre = time() . '_' . $file->getClientOriginalName();
        $ruta   = $file->storeAs('fotos/' . $id, $nombre, 'public');

        // Guardar ruta relativa (sin dominio) para que funcione en cualquier entorno.
        // El frontend prefija con la URL base del API.
        $relativePath = '/storage/' . $ruta;

        $proveedor->update(['foto_perfil' => $relativePath]);

        return $this->success('Foto de perfil actualizada', ['foto_perfil' => $relativePath]);
    }

    /**
     * Imagen de portada del perfil publico. Mismo contrato que uploadFoto: se
     * guarda la ruta relativa y el frontend la prefija con la URL base del
     * API. Se separa en su propia carpeta para que borrar una no toque la
     * otra.
     */
    public function uploadPortada(Request $request, int $id): JsonResponse
    {
        $proveedor = Proveedor::find($id);
        if (!$proveedor) {
            return $this->error('Proveedor no encontrado', 404);
        }

        $this->authorize('manage', $proveedor);

        // La portada se muestra a lo ancho, asi que admite mas peso que el
        // avatar: 6 MB contra los 3 MB de la foto de perfil.
        $request->validate([
            'portada' => 'required|image|mimes:jpg,jpeg,png,webp|max:6144',
        ]);

        $file   = $request->file('portada');
        $nombre = time() . '_' . $file->getClientOriginalName();
        $ruta   = $file->storeAs('portadas/' . $id, $nombre, 'public');

        $relativePath = '/storage/' . $ruta;

        $proveedor->update(['portada' => $relativePath]);

        return $this->success('Portada actualizada', ['portada' => $relativePath]);
    }

    /**
     * Quita la portada y devuelve el perfil al degradado de marca. Es una
     * accion propia y no un update con null porque el formulario manda campos
     * parciales: sin esto no habria forma de distinguir "no toques la portada"
     * de "borrala".
     */
    public function deletePortada(Request $request, int $id): JsonResponse
    {
        $proveedor = Proveedor::find($id);
        if (!$proveedor) {
            return $this->error('Proveedor no encontrado', 404);
        }

        $this->authorize('manage', $proveedor);

        $proveedor->update(['portada' => null]);

        return $this->success('Portada eliminada', ['portada' => null]);
    }

    public function uploadDocumento(Request $request, int $id): JsonResponse
    {
        $proveedor = Proveedor::find($id);
        if (!$proveedor) {
            return $this->error('Proveedor no encontrado', 404);
        }

        $this->authorize('manage', $proveedor);

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
