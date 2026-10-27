<?php

namespace Tests\Feature;

use App\Models\AceptacionLegal;
use App\Models\DocumentoLegal;
use App\Models\User;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

/**
 * Task 2.1.b (Sprint 10): el esquema efectivo (init.sql) versiona documentos
 * legales de forma inmutable y registra aceptaciones unicas por version.
 */
class LegalSchemaSprint10Test extends TestCase
{
    use DatabaseTransactions;

    private function documento(string $tipo, string $version, array $extra = []): DocumentoLegal
    {
        return DocumentoLegal::create(array_merge([
            'tipo'          => $tipo,
            'version'       => $version,
            'titulo'        => "Documento {$tipo} {$version}",
            'contenido'     => "Contenido de prueba {$tipo} {$version}",
            'vigente_desde' => now()->subDay(),
        ], $extra))->refresh();
    }

    private function usuario(): User
    {
        return User::create([
            'name'     => 'Usuario legal',
            'email'    => 'legal_' . uniqid() . '@servigt.test',
            'password' => 'secreto-de-prueba',
            'role'     => 'cliente',
        ]);
    }

    public function test_existen_las_tablas_legales(): void
    {
        foreach (['documentos_legales', 'aceptaciones_legales'] as $tabla) {
            $this->assertTrue((bool) DB::selectOne('SELECT to_regclass(?) IS NOT NULL AS ok', [$tabla])->ok, "Falta {$tabla}");
        }
    }

    public function test_el_hash_lo_calcula_la_base_e_ignora_el_enviado(): void
    {
        $doc = DocumentoLegal::create([
            'tipo'          => 'terminos',
            'version'       => 't-hash',
            'titulo'        => 'Terminos',
            'contenido'     => 'Texto con tilde: términos',
            'vigente_desde' => now()->subDay(),
        ]);
        DB::table('documentos_legales')->insert([
            'tipo'          => 'privacidad',
            'version'       => 'p-hash',
            'titulo'        => 'Privacidad',
            'contenido'     => 'Texto con tilde: términos',
            'hash_sha256'   => str_repeat('0', 64),
            'vigente_desde' => now()->subDay(),
        ]);

        $esperado = hash('sha256', 'Texto con tilde: términos');
        $this->assertSame($esperado, $doc->refresh()->hash_sha256);
        $this->assertSame($esperado, DB::table('documentos_legales')->where('version', 'p-hash')->value('hash_sha256'));
    }

    public function test_una_version_publicada_no_se_edita_ni_se_borra(): void
    {
        $doc = $this->documento('terminos', 't-inmutable');

        foreach ([
            fn () => DB::table('documentos_legales')->where('id', $doc->id)->update(['contenido' => 'otro']),
            fn () => DB::table('documentos_legales')->where('id', $doc->id)->update(['vigente_desde' => now()->addYear()]),
            fn () => DB::table('documentos_legales')->where('id', $doc->id)->delete(),
        ] as $intento) {
            try {
                DB::transaction($intento);
                $this->fail('La base debio rechazar el cambio');
            } catch (QueryException $e) {
                $this->assertStringContainsString('inmutable', $e->getMessage());
            }
        }

        $this->assertSame('Contenido de prueba terminos t-inmutable', $doc->refresh()->contenido);
    }

    public function test_rechaza_tipos_desconocidos_y_versiones_duplicadas(): void
    {
        $this->documento('privacidad', 'p-dup');

        foreach ([['cookies', 'c-1'], ['privacidad', 'p-dup']] as [$tipo, $version]) {
            try {
                DB::transaction(fn () => $this->documento($tipo, $version, ['vigente_desde' => now()->subHours(2)]));
                $this->fail("Debio rechazar {$tipo} {$version}");
            } catch (QueryException $e) {
                $this->addToAssertionCount(1);
            }
        }
    }

    public function test_la_vigente_es_la_mas_reciente_ya_alcanzada_por_tipo(): void
    {
        $antigua   = $this->documento('terminos', 't-vieja', ['vigente_desde' => now()->subDays(20)]);
        $actual    = $this->documento('terminos', 't-actual', ['vigente_desde' => now()->subDays(10)]);
        $this->documento('terminos', 't-futura', ['vigente_desde' => now()->addDays(5)]);
        $privacidad = $this->documento('privacidad', 'p-actual', ['vigente_desde' => now()->subDays(3)]);

        $vigentes = DocumentoLegal::vigentesPorTipo();

        $this->assertSame($actual->id, $vigentes['terminos']->id);
        $this->assertSame($privacidad->id, $vigentes['privacidad']->id);
        $this->assertNotSame($antigua->id, $vigentes['terminos']->id);
    }

    public function test_aceptacion_unica_por_version_e_inmutable(): void
    {
        $user = $this->usuario();
        $doc  = $this->documento('terminos', 't-acepta');

        $aceptacion = AceptacionLegal::create(['user_id' => $user->id, 'documento_legal_id' => $doc->id])->refresh();
        $this->assertNotNull($aceptacion->aceptado_at);
        $this->assertSame(1, $user->aceptacionesLegales()->count());

        foreach ([
            fn () => AceptacionLegal::create(['user_id' => $user->id, 'documento_legal_id' => $doc->id]),
            fn () => DB::table('aceptaciones_legales')->where('id', $aceptacion->id)->update(['aceptado_at' => now()->subYear()]),
            fn () => DB::table('aceptaciones_legales')->where('id', $aceptacion->id)->delete(),
        ] as $intento) {
            try {
                DB::transaction($intento);
                $this->fail('La base debio rechazar el cambio');
            } catch (QueryException $e) {
                $this->addToAssertionCount(1);
            }
        }
    }

    public function test_la_aceptacion_impide_borrar_al_usuario_en_cascada(): void
    {
        $user = $this->usuario();
        $doc  = $this->documento('privacidad', 'p-restrict');
        AceptacionLegal::create(['user_id' => $user->id, 'documento_legal_id' => $doc->id]);

        $this->expectException(QueryException::class);
        DB::table('users')->where('id', $user->id)->delete();
    }
}
