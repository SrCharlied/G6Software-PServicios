<?php

namespace App\Policies;

use App\Models\Proveedor;
use App\Models\User;

class ProveedorPolicy
{
    /**
     * Dueno del perfil o administrador pueden gestionar el proveedor:
     * editar datos, foto, portada y documentos.
     */
    public function manage(User $user, Proveedor $proveedor): bool
    {
        return $user->role === 'admin' || $user->id === $proveedor->user_id;
    }
}
