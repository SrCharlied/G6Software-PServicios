<?php

namespace Tests\Feature;

use App\Models\Notificacion;
use App\Models\User;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * HU 1.5.a (Sprint 10): `no_leidas` de GET /api/notificaciones es el total
 * exacto del usuario, no el conteo dentro de las 50 notificaciones que
 * devuelve la lista.
 */
class NotificacionConteoSprint10Test extends TestCase
{
    use DatabaseTransactions;

    public function test_no_leidas_cuenta_todas_aunque_superen_el_limite_de_la_lista(): void
    {
        $user = $this->crearUsuario();
        $this->crearNotificaciones($user, 55, leida: false);
        Sanctum::actingAs($user);

        $this->getJson('/api/notificaciones')
            ->assertOk()
            ->assertJsonCount(50, 'notificaciones')
            ->assertJsonPath('no_leidas', 55);
    }

    public function test_no_leidas_incluye_las_antiguas_fuera_de_la_lista(): void
    {
        $user = $this->crearUsuario();
        // 3 no leidas antiguas quedan fuera de las 50 mas recientes, todas leidas.
        $this->crearNotificaciones($user, 3, leida: false, haceDias: 10);
        $this->crearNotificaciones($user, 50, leida: true);
        Sanctum::actingAs($user);

        $response = $this->getJson('/api/notificaciones')->assertOk()->assertJsonPath('no_leidas', 3);

        $this->assertNotContains(false, array_column($response->json('notificaciones'), 'leida'));
    }

    public function test_no_leidas_ignora_las_de_otros_usuarios(): void
    {
        $user = $this->crearUsuario();
        $otro = $this->crearUsuario();
        $this->crearNotificaciones($user, 2, leida: false);
        $this->crearNotificaciones($user, 1, leida: true);
        $this->crearNotificaciones($otro, 4, leida: false);
        Sanctum::actingAs($user);

        $this->getJson('/api/notificaciones')
            ->assertOk()
            ->assertJsonCount(3, 'notificaciones')
            ->assertJsonPath('no_leidas', 2);
    }

    private function crearUsuario(): User
    {
        return User::create([
            'name'     => 'Usuario Conteo',
            'email'    => 'conteo.' . uniqid() . '@servigt.test',
            'password' => 'password-test',
            'role'     => 'proveedor',
        ]);
    }

    private function crearNotificaciones(User $user, int $cantidad, bool $leida, int $haceDias = 0): void
    {
        for ($i = 0; $i < $cantidad; $i++) {
            $notif = Notificacion::create([
                'destinatario_id' => $user->id,
                'tipo'            => 'nueva_solicitud',
                'titulo'          => 'Notificacion de prueba',
                'mensaje'         => 'Mensaje de prueba',
                'datos'           => ['servicio_id' => $i + 1],
                'leida'           => $leida,
            ]);

            if ($haceDias > 0) {
                $fecha = now()->subDays($haceDias)->subMinutes($i);
                $notif->forceFill(['created_at' => $fecha, 'updated_at' => $fecha])->saveQuietly();
            }
        }
    }
}
