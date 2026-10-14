<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StorePedidoRequest extends FormRequest
{
    public function authorize(): bool
    {
        // Solo un cliente publica pedidos (Task 1.1, Sprint 9). Se decide aqui y
        // no en el controlador para que un rol incorrecto reciba 403 antes de la
        // validacion, sin enterarse de las reglas del formulario.
        return $this->user()?->role === 'cliente';
    }

    public function rules(): array
    {
        return [
            'descripcion'  => ['required', 'string', 'min:10', 'max:2000'],
            'categoria_id' => ['required', 'integer', 'exists:categorias,id'],
            'direccion'    => ['required', 'string', 'max:255'],
            'urgencia'     => ['required', 'in:baja,media,alta'],
        ];
    }

    public function messages(): array
    {
        return [
            'descripcion.min'      => 'La descripcion debe tener al menos 10 caracteres.',
            'categoria_id.exists'  => 'La categoria seleccionada no existe.',
            'urgencia.in'          => 'La urgencia debe ser baja, media o alta.',
        ];
    }
}
