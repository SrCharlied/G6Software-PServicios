<?php

namespace Tests\Feature;

use App\Models\Proveedor;
use App\Models\User;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Laravel\Sanctum\Sanctum;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

class ProviderValidationSprint10Test extends TestCase
{
    use DatabaseTransactions;

    private function payload(array $changes = []): array
    {
        return array_replace(['nombre' => 'Perfil prueba', 'email' => 'perfil@example.com', 'departamento' => 'Guatemala', 'telefono' => '55550101', 'descripcion' => str_repeat('a', 20)], $changes);
    }

    public static function invalidFields(): array
    {
        return [['telefono', null], ['telefono', '5555-0101'], ['telefono', '+50255550101'], ['telefono', '1234567'], ['telefono', '123456789'], ['telefono', 'abcdefgh'], ['descripcion', null], ['descripcion', str_repeat('a', 19)], ['descripcion', str_repeat('a', 501)]];
    }

    #[DataProvider('invalidFields')]
    public function test_store_y_update_rechazan_el_campo_con_causa_exacta(string $field, ?string $value): void
    {
        $user = User::factory()->proveedor()->create();
        Sanctum::actingAs($user);
        $this->postJson('/api/providers', $this->payload([$field => $value]))->assertUnprocessable()->assertJsonValidationErrors($field);
        $this->assertDatabaseMissing('proveedores', ['user_id' => $user->id]);
        $provider = Proveedor::create($this->payload(['user_id' => $user->id]));
        $this->putJson("/api/providers/{$provider->id}", [$field => $value])->assertUnprocessable()->assertJsonValidationErrors($field);
        $this->assertSame('55550101', $provider->fresh()->telefono);
        $this->assertSame(str_repeat('a', 20), $provider->fresh()->descripcion);
    }

    public function test_creacion_exige_campos_y_update_parcial_los_preserva(): void
    {
        $user = User::factory()->proveedor()->create();
        Sanctum::actingAs($user);
        $payload = $this->payload();
        unset($payload['telefono'], $payload['descripcion']);
        $this->postJson('/api/providers', $payload)->assertUnprocessable()->assertJsonValidationErrors(['telefono', 'descripcion']);
        $id = $this->postJson('/api/providers', $this->payload())->assertCreated()->json('proveedor.id');
        $this->putJson("/api/providers/{$id}", ['nombre' => 'Nombre actualizado'])->assertOk()->assertJsonPath('proveedor.telefono', '55550101');
        foreach ([20, 500] as $length) {
            $this->putJson("/api/providers/{$id}", ['descripcion' => str_repeat('a', $length)])->assertOk()->assertJsonPath('proveedor.descripcion', str_repeat('a', $length));
        }
    }
}
