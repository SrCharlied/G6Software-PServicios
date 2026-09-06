<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\Cache;
use Tests\TestCase;

/**
 * Task 3.1 — registro y login endurecidos.
 *
 * Cada prueba de aqui falla contra el controlador anterior: `min:6` aceptaba
 * `123456`, el correo se guardaba tal cual llegaba y no habia normalizacion al
 * buscarlo.
 */
class AuthSecurityTest extends TestCase
{
    // El esquema lo crea `database/init.sql`, no las migraciones, asi que la
    // suite envuelve cada prueba en una transaccion en vez de recrear la base.
    use DatabaseTransactions;

    protected function setUp(): void
    {
        parent::setUp();

        // El rate limiting de la task 3.2 comparte contador entre pruebas
        // porque todas salen de la misma IP simulada. Se limpia para que estas
        // pruebas midan validacion y no throttling.
        Cache::flush();
    }

    /** @return array<string, mixed> */
    private function payloadRegistro(array $sobreescribir = []): array
    {
        return array_merge([
            'name'     => 'Usuario Prueba',
            'email'    => 'usuario.prueba@servigt.gt',
            'password' => 'ClaveSegura2026',
            'role'     => 'cliente',
        ], $sobreescribir);
    }

    public function test_registro_rechaza_contrasena_corta(): void
    {
        $this->postJson('/api/register', $this->payloadRegistro(['password' => '123456']))
            ->assertStatus(422)
            ->assertJsonValidationErrors('password');

        $this->assertDatabaseMissing('users', ['email' => 'usuario.prueba@servigt.gt']);
    }

    public function test_registro_rechaza_contrasena_sin_numeros(): void
    {
        $this->postJson('/api/register', $this->payloadRegistro(['password' => 'solamenteletras']))
            ->assertStatus(422)
            ->assertJsonValidationErrors('password');
    }

    public function test_registro_rechaza_contrasena_sin_letras(): void
    {
        $this->postJson('/api/register', $this->payloadRegistro(['password' => '1234567890123']))
            ->assertStatus(422)
            ->assertJsonValidationErrors('password');
    }

    public function test_registro_acepta_una_passphrase_larga_y_permite_iniciar_sesion(): void
    {
        // 60 caracteres: por debajo del truncado de bcrypt en 72 bytes, muy por
        // encima del minimo. Debe funcionar de punta a punta.
        $passphrase = 'caballo correcto bateria grapa numero 7 en la capital gt';

        $this->postJson('/api/register', $this->payloadRegistro(['password' => $passphrase]))
            ->assertStatus(201);

        $this->postJson('/api/login', [
            'email'    => 'usuario.prueba@servigt.gt',
            'password' => $passphrase,
        ])->assertStatus(200);
    }

    public function test_registro_rechaza_contrasena_que_bcrypt_truncaria(): void
    {
        // 80 bytes. Sin el tope de 72 se guardaria recortada en silencio y
        // cualquier variante que comparta el prefijo abriria la misma cuenta.
        $this->postJson('/api/register', $this->payloadRegistro([
            'password' => str_repeat('a1', 40),
        ]))->assertStatus(422)->assertJsonValidationErrors('password');
    }

    public function test_registro_normaliza_el_correo_antes_de_guardarlo(): void
    {
        $this->postJson('/api/register', $this->payloadRegistro([
            'email' => '  Usuario.Prueba@ServiGT.GT  ',
        ]))->assertStatus(201);

        $this->assertDatabaseHas('users', ['email' => 'usuario.prueba@servigt.gt']);
        $this->assertDatabaseMissing('users', ['email' => '  Usuario.Prueba@ServiGT.GT  ']);
    }

    public function test_el_correo_normalizado_impide_registrar_la_misma_cuenta_dos_veces(): void
    {
        $this->postJson('/api/register', $this->payloadRegistro())->assertStatus(201);

        $this->postJson('/api/register', $this->payloadRegistro([
            'email' => 'USUARIO.PRUEBA@SERVIGT.GT',
        ]))->assertStatus(422)->assertJsonValidationErrors('email');

        $this->assertSame(
            1,
            User::where('email', 'usuario.prueba@servigt.gt')->count()
        );
    }

    public function test_login_acepta_el_correo_en_mayusculas_con_espacios(): void
    {
        User::create([
            'name'     => 'Usuario Prueba',
            'email'    => 'usuario.prueba@servigt.gt',
            // El modelo castea `password` a `hashed`, asi que se pasa en claro:
            // volver a hashear aqui guardaria el hash de un hash.
            'password' => 'ClaveSegura2026',
            'role'     => 'cliente',
        ]);

        $this->postJson('/api/login', [
            'email'    => ' Usuario.Prueba@ServiGT.GT ',
            'password' => 'ClaveSegura2026',
        ])->assertStatus(200);
    }

    public function test_login_no_revela_si_el_correo_existe(): void
    {
        User::create([
            'name'     => 'Usuario Prueba',
            'email'    => 'usuario.prueba@servigt.gt',
            // El modelo castea `password` a `hashed`, asi que se pasa en claro:
            // volver a hashear aqui guardaria el hash de un hash.
            'password' => 'ClaveSegura2026',
            'role'     => 'cliente',
        ]);

        $existente = $this->postJson('/api/login', [
            'email'    => 'usuario.prueba@servigt.gt',
            'password' => 'ClaveEquivocada2026',
        ]);

        $inexistente = $this->postJson('/api/login', [
            'email'    => 'no.existe@servigt.gt',
            'password' => 'ClaveEquivocada2026',
        ]);

        $existente->assertStatus(401);
        $inexistente->assertStatus(401);

        // Mismo status y mismo cuerpo. El correlation id de la task 4.3 cambia
        // en cada request por diseno, asi que se compara todo lo demas: si el
        // controlador volviera a distinguir "no existe" de "clave incorrecta",
        // la diferencia apareceria aqui.
        $sinCorrelacion = static function (array $cuerpo): array {
            unset($cuerpo['correlation_id']);

            return $cuerpo;
        };

        $this->assertSame($existente->json('message'), $inexistente->json('message'));
        $this->assertSame(
            $sinCorrelacion($existente->json()),
            $sinCorrelacion($inexistente->json())
        );
    }

    public function test_login_no_filtra_el_hash_ni_la_contrasena_en_la_respuesta(): void
    {
        User::create([
            'name'     => 'Usuario Prueba',
            'email'    => 'usuario.prueba@servigt.gt',
            // El modelo castea `password` a `hashed`, asi que se pasa en claro:
            // volver a hashear aqui guardaria el hash de un hash.
            'password' => 'ClaveSegura2026',
            'role'     => 'cliente',
        ]);

        $respuesta = $this->postJson('/api/login', [
            'email'    => 'usuario.prueba@servigt.gt',
            'password' => 'ClaveSegura2026',
        ])->assertStatus(200);

        $this->assertArrayNotHasKey('password', $respuesta->json('user'));
        $this->assertStringNotContainsString('$2y$', $respuesta->getContent());
    }
}
