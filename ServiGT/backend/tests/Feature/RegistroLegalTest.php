<?php

namespace Tests\Feature;

use App\Models\AceptacionLegal;
use App\Models\User;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Tests\Feature\Concerns\AceptaDocumentosDePrueba;
use Tests\TestCase;

class RegistroLegalTest extends TestCase
{
    use DatabaseTransactions, AceptaDocumentosDePrueba;

    private function payload(): array
    {
        return ['name' => 'Cuenta de prueba', 'email' => 'legal@servigt.test', 'password' => 'Password123!', 'password_confirmation' => 'Password123!', 'role' => 'cliente', 'aceptaciones_legales' => $this->aceptacionesDePrueba()];
    }

    public function test_crea_ambas_aceptaciones_con_usuario_y_token(): void
    {
        $id = $this->postJson('/api/register', $this->payload())->assertCreated()->json('user.id');
        $this->assertSame(2, AceptacionLegal::where('user_id', $id)->count());
        $this->assertDatabaseCount('personal_access_tokens', 1);
    }

    public function test_faltante_o_sin_marcar_no_crea_usuario(): void
    {
        $data = $this->payload(); unset($data['aceptaciones_legales']);
        $this->postJson('/api/register', $data)->assertUnprocessable()->assertJsonValidationErrors('aceptaciones_legales');
        $data = $this->payload(); $data['aceptaciones_legales'][0]['aceptado'] = false;
        $this->postJson('/api/register', $data)->assertUnprocessable()->assertJsonValidationErrors('aceptaciones_legales.0.aceptado');
        $this->assertDatabaseCount('users', 0);
        $this->assertDatabaseCount('personal_access_tokens', 0);
    }

    public function test_version_obsoleta_responde_409_sin_escribir(): void
    {
        $data = $this->payload(); $data['aceptaciones_legales'][0]['version'] = 'obsoleta';
        $this->postJson('/api/register', $data)->assertStatus(409);
        $data = $this->payload(); $data['aceptaciones_legales'][0]['documento_legal_id'] = 99999999;
        $this->postJson('/api/register', $data)->assertStatus(409);
        $this->assertDatabaseCount('users', 0);
        $this->assertDatabaseCount('aceptaciones_legales', 0);
    }

    public function test_error_al_persistir_aceptacion_revierte_usuario_y_no_emite_token(): void
    {
        $data = $this->payload();
        $dispatcher = AceptacionLegal::getEventDispatcher();
        AceptacionLegal::setEventDispatcher(clone $dispatcher);
        try {
            AceptacionLegal::creating(fn () => throw new \RuntimeException('Fallo inducido exclusivamente en test'));
            $this->postJson('/api/register', $data)->assertStatus(500);
            $this->assertDatabaseCount('users', 0);
            $this->assertDatabaseCount('aceptaciones_legales', 0);
            $this->assertDatabaseCount('personal_access_tokens', 0);
        } finally { AceptacionLegal::setEventDispatcher($dispatcher); }
    }

    public function test_login_historico_no_exige_reaceptar_documentos(): void
    {
        $user = User::factory()->create(['password' => 'Password123!']);
        $this->postJson('/api/login', ['email' => $user->email, 'password' => 'Password123!'])->assertOk();
        $this->assertDatabaseCount('aceptaciones_legales', 0);
    }

    public function test_sin_documentos_y_con_ids_arbitrarios_no_hay_bypass(): void
    {
        $data = ['name' => 'Prueba', 'email' => 'legal@servigt.test', 'password' => 'Password123!', 'password_confirmation' => 'Password123!', 'role' => 'cliente', 'aceptaciones_legales' => [
            ['documento_legal_id' => 99998, 'version' => 'inexistente', 'aceptado' => true],
            ['documento_legal_id' => 99999, 'version' => 'inexistente', 'aceptado' => true],
        ]];
        $this->postJson('/api/register', $data)->assertStatus(503);
        $this->assertDatabaseCount('users', 0);
        $this->assertDatabaseCount('personal_access_tokens', 0);
    }

    public function test_no_se_puede_aceptar_dos_veces_el_mismo_documento(): void
    {
        $data = $this->payload(); $data['aceptaciones_legales'][1] = $data['aceptaciones_legales'][0];
        $this->postJson('/api/register', $data)->assertUnprocessable()->assertJsonValidationErrors('aceptaciones_legales.0.documento_legal_id');
        $this->assertDatabaseCount('users', 0);
    }
}
