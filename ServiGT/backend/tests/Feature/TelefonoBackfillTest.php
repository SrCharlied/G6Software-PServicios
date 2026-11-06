<?php

namespace Tests\Feature;

use App\Models\Proveedor;
use App\Models\User;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class TelefonoBackfillTest extends TestCase
{
    use DatabaseTransactions;

    public function test_base_anterior_sin_columna_telefono_converge(): void
    {
        // Solo db_test y dentro de la transaccion que se revierte al terminar.
        $this->assertSame('testing', app()->environment());
        DB::statement('ALTER TABLE users DROP COLUMN telefono');
        DB::unprepared(file_get_contents('/app/database/init.sql'));
        $this->assertTrue(\Illuminate\Support\Facades\Schema::hasColumn('users', 'telefono'));
    }

    public function test_backfill_es_idempotente_y_preserva_valores_no_reconocidos(): void
    {
        $records = [];
        foreach (['5555-0101', '55550102', '+502 55550103', null] as $phone) {
            $user = User::factory()->proveedor()->create(['telefono' => $phone]);
            $provider = Proveedor::create(['user_id' => $user->id, 'nombre' => 'Perfil historico', 'email' => $user->email, 'departamento' => 'Guatemala', 'telefono' => $phone]);
            $records[] = [$user, $provider, $phone === '5555-0101' ? '55550101' : $phone];
        }
        foreach ([1, 2] as $attempt) {
            DB::unprepared(file_get_contents('/app/database/init.sql'));
            foreach ($records as [$user, $provider, $expected]) {
                $this->assertSame($expected, $user->fresh()->telefono);
                $this->assertSame($expected, $provider->fresh()->telefono);
            }
        }
    }
}
