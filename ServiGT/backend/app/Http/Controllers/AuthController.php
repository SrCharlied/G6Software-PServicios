<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Validation\Rules\Password;

class AuthController extends Controller
{
    use ApiResponse;

    /**
     * Reglas de contrasena (task 3.1).
     *
     * Antes bastaba con `min:6`, que acepta `123456`. Ahora se exigen 10
     * caracteres con letras y numeros. El tope de 72 no es arbitrario: bcrypt
     * trunca en 72 bytes, asi que sin este limite una passphrase larga se
     * guardaria recortada en silencio y dos contrasenas distintas que
     * compartan los primeros 72 bytes abririan la misma cuenta.
     *
     * @return array<int, mixed>
     */
    private function reglasDePassword(): array
    {
        return [
            'required',
            'string',
            'max:72',
            Password::min(10)->letters()->numbers(),
        ];
    }

    /**
     * Normaliza el correo antes de buscarlo o guardarlo (task 3.1).
     *
     * Sin esto ` Admin@ServiGT.GT ` y `admin@servigt.gt` son cuentas distintas
     * para la validacion `unique` y para el login: se podian registrar dos
     * usuarios que el humano lee como el mismo, y quien se registraba con
     * mayusculas no podia entrar escribiendolo en minusculas.
     */
    private function normalizarEmail(?string $email): string
    {
        return Str::lower(trim((string) $email));
    }

    public function register(Request $request): JsonResponse
    {
        $request->merge(['email' => $this->normalizarEmail($request->input('email'))]);

        $validated = $request->validate([
            'name'     => 'required|string|max:255',
            'email'    => 'required|email:rfc|max:255|unique:users,email',
            'password' => $this->reglasDePassword(),
            'role'     => 'required|in:cliente,proveedor',
        ]);

        $user  = User::create($validated);
        $token = $user->createToken('auth-token')->plainTextToken;

        return $this->success('Usuario registrado exitosamente', [
            'user'  => $user,
            'token' => $token,
        ], 201);
    }

    public function login(Request $request): JsonResponse
    {
        $request->merge(['email' => $this->normalizarEmail($request->input('email'))]);

        $request->validate([
            'email'    => 'required|email',
            'password' => 'required|string',
        ], [
            'email.required'    => 'El correo electronico es obligatorio.',
            'email.email'       => 'Ingresa un correo electronico valido.',
            'password.required' => 'La contrasena es obligatoria.',
            'password.string'   => 'La contrasena no es valida.',
        ]);

        $user = User::where('email', $request->email)->first();

        // Se compara contra un hash descartable cuando el usuario no existe
        // para que el tiempo de respuesta sea el mismo exista o no la cuenta.
        // Sin esto el mensaje generico no sirve de nada: la diferencia de
        // latencia entre "no busque hash" y "compare bcrypt" ya enumera
        // correos registrados.
        if (!$user) {
            Hash::check($request->password, self::HASH_DESCARTABLE);

            return $this->error('Credenciales incorrectas', 401);
        }

        if (!Hash::check($request->password, $user->password)) {
            return $this->error('Credenciales incorrectas', 401);
        }

        // Revocar tokens anteriores y crear uno nuevo
        $user->tokens()->delete();
        $token = $user->createToken('auth-token')->plainTextToken;

        return $this->success('Login exitoso', [
            'user'  => $user,
            'token' => $token,
        ]);
    }

    /**
     * Hash bcrypt de una cadena que no corresponde a ninguna cuenta. Se deja
     * como constante y no se genera al vuelo porque generarlo costaria mas que
     * verificarlo, e invertiria justo la diferencia de tiempo que se quiere
     * eliminar.
     */
    private const HASH_DESCARTABLE = '$2y$12$T4mQ0Yl9r1Wc7uV3bK8xhu5aJ2sE6dG0nP4iR8fL1zX7cM3vB9oOq';

    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()->delete();

        return $this->success('Sesion cerrada correctamente');
    }

    public function me(Request $request): JsonResponse
    {
        return $this->success('OK', ['user' => $request->user()]);
    }
}
