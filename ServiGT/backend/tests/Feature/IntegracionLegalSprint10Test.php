<?php

namespace Tests\Feature;

use App\Models\DocumentoLegal;
use App\Models\User;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\DB;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

class IntegracionLegalSprint10Test extends TestCase
{
    use DatabaseTransactions;

    public static function esquemasAnteriores(): array
    {
        return [['pablo'], ['dev']];
    }

    #[DataProvider('esquemasAnteriores')]
    public function test_ambos_esquemas_convergen_sin_perder_documentos_ni_aceptaciones(string $origen): void
    {
        // DDL exclusivamente en db_test y revertido por DatabaseTransactions.
        $this->assertSame('testing', app()->environment());
        $this->assertSame('pservicios_test', DB::connection()->getDatabaseName());
        DB::statement('DROP TABLE aceptaciones_legales');
        DB::statement('DROP TABLE documentos_legales');
        $hash = $origen === 'pablo' ? 'hash' : 'hash_sha256';
        $aprobacion = $origen === 'pablo'
            ? ', aprobado_por VARCHAR(255) NOT NULL, aprobado_at TIMESTAMPTZ NOT NULL'
            : '';
        DB::unprepared("CREATE TABLE documentos_legales (
            id BIGSERIAL PRIMARY KEY, tipo VARCHAR(20) NOT NULL, version VARCHAR(20) NOT NULL,
            titulo VARCHAR(255) NOT NULL, contenido TEXT NOT NULL, {$hash} CHAR(64) NOT NULL,
            vigente_desde TIMESTAMPTZ NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
            {$aprobacion}, UNIQUE (tipo, version))");
        DB::unprepared('CREATE TABLE aceptaciones_legales (
            id BIGSERIAL PRIMARY KEY, user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
            documento_legal_id BIGINT NOT NULL REFERENCES documentos_legales(id) ON DELETE RESTRICT,
            aceptado_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP, UNIQUE (user_id, documento_legal_id))');

        $user = User::factory()->create();
        foreach (DocumentoLegal::TIPOS as $tipo) {
            $documento = [
                'tipo' => $tipo, 'version' => 'fixture-anterior', 'titulo' => 'Solo pruebas',
                'contenido' => "Fixture historico {$tipo}", $hash => hash('sha256', "Fixture historico {$tipo}"),
                'vigente_desde' => now()->subDay(),
            ];
            if ($origen === 'pablo') {
                $documento += ['aprobado_por' => 'Fixture de test', 'aprobado_at' => now()->subDays(2)];
            }
            $id = DB::table('documentos_legales')->insertGetId($documento);
            DB::table('aceptaciones_legales')->insert(['user_id' => $user->id, 'documento_legal_id' => $id]);
        }
        $documentosAntes = DB::table('documentos_legales')->orderBy('id')->get();
        $aceptacionesAntes = DB::table('aceptaciones_legales')->orderBy('id')->get();

        foreach ([1, 2] as $intento) {
            DB::unprepared(file_get_contents('/app/database/init.sql'));
            $this->assertEquals($aceptacionesAntes, DB::table('aceptaciones_legales')->orderBy('id')->get());
            foreach ($documentosAntes as $antes) {
                $actual = DocumentoLegal::findOrFail($antes->id);
                $this->assertSame($antes->contenido, $actual->contenido);
                $this->assertSame($antes->{$hash}, $actual->hash_sha256);
                $this->assertSame($actual->hash_sha256, $actual->hash);
                $this->assertSame($origen === 'pablo' ? 'Fixture de test' : null, $actual->aprobado_por);
                $this->assertSame($antes->created_at, $actual->getRawOriginal('created_at'));
            }
        }
        $this->assertCount(2, DocumentoLegal::vigentesPorTipo());
        $this->assertCount($origen === 'pablo' ? 2 : 0, DocumentoLegal::aprobadosVigentes());
        $response = $this->getJson('/api/legal/documentos/vigentes');
        $origen === 'pablo' ? $response->assertOk() : $response->assertStatus(503);

        try {
            DB::transaction(fn () => DB::table('aceptaciones_legales')->where('user_id', $user->id)->delete());
            $this->fail('La evidencia de aceptacion debe permanecer inmutable');
        } catch (QueryException $e) {
            $this->assertStringContainsString('inmutable', $e->getMessage());
        }
    }

    public function test_publicacion_sin_aprobacion_no_desplaza_la_version_aprobada_del_api(): void
    {
        foreach (DocumentoLegal::TIPOS as $tipo) {
            DocumentoLegal::create([
                'tipo' => $tipo, 'version' => 'fixture-aprobada', 'titulo' => 'Prueba', 'contenido' => 'Solo test',
                'vigente_desde' => now()->subDays(2), 'aprobado_por' => 'Fixture', 'aprobado_at' => now()->subDays(3),
            ]);
            DocumentoLegal::create([
                'tipo' => $tipo, 'version' => 'fixture-sin-aprobar', 'titulo' => 'Prueba', 'contenido' => 'Solo test',
                'vigente_desde' => now()->subDay(),
            ]);
        }
        $this->assertSame('fixture-sin-aprobar', DocumentoLegal::vigentesPorTipo()['terminos']->version);
        $response = $this->getJson('/api/legal/documentos/vigentes')->assertOk()->assertJsonCount(2, 'documentos');
        foreach ($response->json('documentos') as $documento) {
            $this->assertSame('fixture-aprobada', $documento['version']);
            $this->assertSame($documento['hash_sha256'], $documento['hash']);
        }
    }
}
