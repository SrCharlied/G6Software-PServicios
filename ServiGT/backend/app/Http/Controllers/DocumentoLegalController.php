<?php

namespace App\Http\Controllers;

use App\Models\DocumentoLegal;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;

class DocumentoLegalController extends Controller
{
    use ApiResponse;

    public function vigentes(): JsonResponse
    {
        $documentos = DocumentoLegal::aprobadosVigentes();
        if ($documentos->count() !== 2) return $this->error('No hay terminos y privacidad aprobados y vigentes disponibles.', 503);
        return $this->success('Documentos legales vigentes', ['documentos' => $documentos])->header('Cache-Control', 'no-store');
    }
}
