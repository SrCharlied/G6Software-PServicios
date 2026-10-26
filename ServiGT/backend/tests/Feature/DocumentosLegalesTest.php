<?php

namespace Tests\Feature;

use App\Models\DocumentoLegal;
use App\Models\User;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\DB;
use Laravel\Sanctum\Sanctum;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

class DocumentosLegalesTest extends TestCase
{
    use DatabaseTransactions;

    private function fixture(string $tipo, string $version = 'fixture-1', int $days = -1): DocumentoLegal
    {
        return DocumentoLegal::create(['tipo' => $tipo, 'version' => $version, 'titulo' => 'Documento de prueba', 'contenido' => 'Fixture exclusivo de tests, no documento legal real aprobado.', 'aprobado_por' => 'Fixture de prueba', 'aprobado_at' => now()->subDays(2), 'vigente_desde' => now()->addDays($days)]);
    }

    public function test_sin_textos_aprobados_no_inventa_documentos(): void
    {
        $this->getJson('/api/legal/documentos/vigentes')->assertStatus(503);
        $this->fixture('terminos');
        $this->getJson('/api/legal/documentos/vigentes')->assertStatus(503);
    }

    public function test_publicos_con_y_sin_sesion_solo_version_vigente(): void
    {
        $this->fixture('terminos', 'fixture-0', -2);
        $terms = $this->fixture('terminos');
        $privacy = $this->fixture('privacidad');
        $this->fixture('privacidad', 'fixture-futura', 1);
        foreach ([null, User::factory()->create()] as $user) {
            if ($user) Sanctum::actingAs($user);
            $response = $this->getJson('/api/legal/documentos/vigentes')->assertOk()->assertJsonCount(2, 'documentos');
            $this->assertEqualsCanonicalizing([$terms->id, $privacy->id], array_column($response->json('documentos'), 'id'));
            $this->assertSame(hash('sha256', $terms->contenido), $terms->hash);
            $response->assertJsonMissingPath('documentos.0.aprobado_por');
        }
    }

    public static function mutations(): array { return [['update'], ['delete']]; }

    #[DataProvider('mutations')]
    public function test_documento_no_puede_mutar_ni_por_sql(string $operation): void
    {
        $document = $this->fixture('terminos');
        $this->expectException(QueryException::class);
        DB::transaction(function () use ($document, $operation) {
            $query = DB::table('documentos_legales')->where('id', $document->id);
            if ($operation === 'update') $query->update(['contenido' => 'Cambio indebido']);
            else $query->delete();
        });
    }
}
