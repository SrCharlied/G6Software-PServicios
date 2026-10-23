<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Laravel\Sanctum\PersonalAccessToken;
use Tests\TestCase;

/**
 * HU 1.3 — confirmacion de contrasena y validacion de dominio del correo.
 *
 * El resolvedor DNS se sustituye en cada prueba: ninguna depende de la red.
 */
class RegistroConfirmacionYDominioTest extends TestCase
{
    use DatabaseTransactions;

    private function payload(array $overrides = []): array
    {
        return array_merge([
            'name'                  => 'Usuaria de Prueba',
            'email'                 => 'nueva@servigt.test',
            'password'              => 'Password123!',
            'password_confirmation' => 'Password123!',
            'role'                  => 'cliente',
        ], $overrides);
    }

    /** Fija el resolvedor DNS y devuelve la lista de dominios consultados. */
    private function resolvedor(array $dominiosValidos): \ArrayObject
    {
        $consultados = new \ArrayObject();

        $this->app->instance('auth.resolvedor_dns', function (string $host) use ($dominiosValidos, $consultados) {
            $consultados[] = $host;

            return in_array($host, $dominiosValidos, true);
        });

        return $consultados;
    }

    // ── Confirmacion de contrasena (1.3.a) ───────────────────────────────

    public function test_registro_con_confirmacion_correcta_crea_usuario_y_token(): void
    {
        $this->postJson('/api/register', $this->payload())
            ->assertCreated()
            ->assertJsonStructure(['user' => ['id', 'email'], 'token'])
            ->assertJsonMissingPath('user.password_confirmation');

        $this->assertDatabaseHas('users', ['email' => 'nueva@servigt.test']);
    }

    public function test_registro_sin_confirmacion_responde_422_y_no_crea_nada(): void
    {
        $datos = $this->payload();
        unset($datos['password_confirmation']);

        $this->postJson('/api/register', $datos)
            ->assertStatus(422)
            ->assertJsonValidationErrors(['password']);

        $this->assertDatabaseMissing('users', ['email' => 'nueva@servigt.test']);
        $this->assertSame(0, PersonalAccessToken::count());
    }

    public function test_registro_con_confirmacion_distinta_responde_422_y_no_crea_nada(): void
    {
        $this->postJson('/api/register', $this->payload(['password_confirmation' => 'Otra-Password1!']))
            ->assertStatus(422)
            ->assertJsonValidationErrors(['password'])
            ->assertJsonMissingPath('token');

        $this->assertDatabaseMissing('users', ['email' => 'nueva@servigt.test']);
        $this->assertSame(0, PersonalAccessToken::count());
    }

    public function test_registro_con_confirmacion_vacia_responde_422(): void
    {
        $this->postJson('/api/register', $this->payload(['password_confirmation' => '']))
            ->assertStatus(422)
            ->assertJsonValidationErrors(['password']);

        $this->assertDatabaseCount('users', 0);
    }

    // ── Dominio del correo (1.3.b) ───────────────────────────────────────

    public function test_en_produccion_un_dominio_sin_dns_se_rechaza_aunque_este_en_la_lista(): void
    {
        $this->app['env'] = 'production';
        config(['auth.registro.dominios_reservados' => ['servigt.test']]);
        $this->resolvedor([]);

        $this->postJson('/api/register', $this->payload())
            ->assertStatus(422)
            ->assertJsonValidationErrors(['email']);

        $this->assertDatabaseMissing('users', ['email' => 'nueva@servigt.test']);
    }

    public function test_en_produccion_un_dominio_con_dns_se_acepta(): void
    {
        $this->app['env'] = 'production';
        $this->resolvedor(['dominio-real.com']);

        $this->postJson('/api/register', $this->payload(['email' => 'persona@dominio-real.com']))
            ->assertCreated();
    }

    public function test_en_testing_un_dominio_reservado_listado_se_acepta_sin_consultar_dns(): void
    {
        config(['auth.registro.dominios_reservados' => ['servigt.test']]);
        $consultados = $this->resolvedor([]);

        $this->postJson('/api/register', $this->payload())->assertCreated();

        $this->assertCount(0, $consultados);
    }

    public function test_en_testing_un_dominio_reservado_no_listado_se_rechaza(): void
    {
        config(['auth.registro.dominios_reservados' => []]);
        $this->resolvedor([]);

        $this->postJson('/api/register', $this->payload())
            ->assertStatus(422)
            ->assertJsonValidationErrors(['email']);
    }

    public function test_la_lista_aplica_a_dominios_exactos_no_a_subdominios(): void
    {
        config(['auth.registro.dominios_reservados' => ['servigt.test']]);
        $this->resolvedor([]);

        $this->postJson('/api/register', $this->payload(['email' => 'x@otro.servigt.test']))
            ->assertStatus(422)
            ->assertJsonValidationErrors(['email']);
    }
}
