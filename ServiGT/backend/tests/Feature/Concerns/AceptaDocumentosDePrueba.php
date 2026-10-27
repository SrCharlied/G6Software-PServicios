<?php

namespace Tests\Feature\Concerns;

use App\Models\DocumentoLegal;

trait AceptaDocumentosDePrueba
{
    protected function aceptacionesDePrueba(): array
    {
        $documents = DocumentoLegal::aprobadosVigentes();
        if ($documents->count() !== 2) {
            foreach (['terminos', 'privacidad'] as $type) {
                DocumentoLegal::create(['tipo' => $type, 'version' => 'fixture-1', 'titulo' => 'Solo pruebas', 'contenido' => 'Fixture de tests, no texto legal aprobado para publicar.', 'aprobado_por' => 'Fixture aislado de prueba', 'aprobado_at' => now()->subDay(), 'vigente_desde' => now()->subDay()]);
            }
            $documents = DocumentoLegal::aprobadosVigentes();
        }
        return $documents->map(fn ($doc) => ['documento_legal_id' => $doc->id, 'version' => $doc->version, 'aceptado' => true])->all();
    }
}
