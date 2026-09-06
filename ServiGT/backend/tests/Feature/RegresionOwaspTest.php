<?php

namespace Tests\Feature;

use App\Models\Calificacion;
use App\Models\Categoria;
use App\Models\Proveedor;
use App\Models\Servicio;
use App\Models\User;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\Cache;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * Task 6.3 — regresion de abuso sobre la matriz OWASP.
 *
 * Esta clase no repite lo que ya cubren las suites por task (autorizacion,
 * documentos privados, serializacion, limites). Cubre las filas de la matriz
 * `docs/security/owasp-top10-matriz.md` que se cerraron al final del sprint y
 * que no tenian una suite propia:
 *
 *  - A01/API3: `destinatario_id` derivado en `POST /calificaciones`.
 *  - A06/API6: `POST /pedidos` con rate limiting.
 *  - A07:      tokens Sanctum con expiracion configurada.
 *  - A02/API8: la API no devuelve configuracion ni secretos.
 */
class RegresionOwaspTest extends TestCase
{
    use DatabaseTransactions;

    protected function setUp(): void
    {
        parent::setUp();
        Cache::flush();
    }

    private function servicioCompletado(): Servicio
    {
        $clienteUser = User::factory()->create(['role' => 'cliente']);
        $proveedorUser = User::factory()->create(['role' => 'proveedor']);

        $proveedor = Proveedor::create([
            'user_id'      => $proveedorUser->id,
            'nombre'       => 'Proveedor Regresion',
            'email'        => $proveedorUser->email,
            'telefono'     => '5555-0400',
            'departamento' => 'Guatemala',
            'municipio'    => 'Guatemala',
            'categoria_id' => Categoria::query()->value('id'),
        ]);

        return Servicio::create([
            'cliente_id'   => $clienteUser->id,
            'proveedor_id' => $proveedor->id,
            'categoria_id' => $proveedor->categoria_id,
            'descripcion'  => 'Servicio ya completado, listo para calificar.',
            'estado'       => 'completado',
        ]);
    }

    /**
     * A01/API3 — el destinatario de una calificacion se deriva del servicio.
     *
     * Antes el cuerpo mandaba `destinatario_id` y solo se validaba que el
     * usuario existiera y que quien calificaba fuera parte del servicio: un
     * cliente podia hundir el promedio de un proveedor con el que nunca
     * trabajo, usando el id de un servicio propio.
     */
    public function test_no_se_puede_calificar_a_un_tercero_ajeno_al_servicio(): void
    {
        $servicio = $this->servicioCompletado();

        $proveedorVictimaUser = User::factory()->create(['role' => 'proveedor']);
        Proveedor::create([
            'user_id'      => $proveedorVictimaUser->id,
            'nombre'       => 'Proveedor Ajeno',
            'email'        => $proveedorVictimaUser->email,
            'telefono'     => '5555-0401',
            'departamento' => 'Guatemala',
            'municipio'    => 'Guatemala',
            'categoria_id' => Categoria::query()->value('id'),
        ]);

        Sanctum::actingAs($servicio->cliente);

        $this->postJson('/api/calificaciones', [
            'servicio_id'     => $servicio->id,
            'destinatario_id' => $proveedorVictimaUser->id,
            'puntuacion'      => 1,
            'comentario'      => 'Intento de calificar a quien no me atendio.',
        ])->assertStatus(201);

        // La calificacion se creo, pero contra la contraparte real, no contra
        // el usuario que mando el atacante.
        $calificacion = Calificacion::where('servicio_id', $servicio->id)->firstOrFail();

        $this->assertSame($servicio->proveedor->user_id, $calificacion->destinatario_id);
        $this->assertNotSame($proveedorVictimaUser->id, $calificacion->destinatario_id);

        // Y al proveedor ajeno no le entro ninguna calificacion. Se comprueba
        // sobre las filas y no sobre el promedio porque el observer recalcula
        // el promedio desde las filas reales: mirar el promedio mediria el
        // observer, no el control que se quiere probar.
        $this->assertFalse(
            Calificacion::where('destinatario_id', $proveedorVictimaUser->id)->exists(),
            'El proveedor ajeno recibio una calificacion de un servicio en el que no participo.'
        );
    }

    /** A06/API6 — publicar pedidos tiene limite: dispara notificaciones masivas. */
    public function test_publicar_pedidos_esta_limitado(): void
    {
        $cliente = User::factory()->create(['role' => 'cliente']);
        Sanctum::actingAs($cliente);

        $payload = [
            'categoria_id' => Categoria::query()->value('id'),
            'titulo'       => 'Pedido de prueba de limite',
            'descripcion'  => 'Descripcion suficientemente larga para pasar la validacion del pedido.',
            'departamento' => 'Guatemala',
            'municipio'    => 'Guatemala',
        ];

        $ultimoStatus = null;
        for ($i = 0; $i < 12; $i++) {
            $ultimoStatus = $this->postJson('/api/pedidos', $payload)->getStatusCode();
            if ($ultimoStatus === 429) {
                break;
            }
        }

        $this->assertSame(429, $ultimoStatus, 'POST /pedidos debe responder 429 al exceder el limite.');
    }

    /**
     * A07 — los tokens Sanctum caducan.
     *
     * Sin `config/sanctum.php` publicado se usaba el default del paquete
     * (`expiration = null`), es decir tokens eternos.
     */
    public function test_los_tokens_de_sanctum_tienen_expiracion_configurada(): void
    {
        $expiracion = config('sanctum.expiration');

        $this->assertNotNull($expiracion, 'Sanctum sin expiracion deja tokens que no caducan nunca.');
        $this->assertGreaterThan(0, $expiracion);
        // Un mes es el techo acordado; mas que eso vuelve el control simbolico.
        $this->assertLessThanOrEqual(60 * 24 * 31, $expiracion);
    }

    /** A02/API8 — ninguna respuesta publica devuelve configuracion ni secretos. */
    public function test_las_rutas_publicas_no_filtran_configuracion(): void
    {
        foreach (['/api/health', '/api/categorias', '/api/providers', '/api/publicaciones'] as $ruta) {
            $cuerpo = $this->getJson($ruta)->assertSuccessful()->getContent();

            foreach (['APP_KEY', 'base64:', 'DB_PASSWORD', 'ADMIN_PASSWORD', '$2y$'] as $fragmento) {
                $this->assertStringNotContainsString(
                    $fragmento,
                    $cuerpo,
                    "La ruta {$ruta} filtro `{$fragmento}`."
                );
            }
        }
    }

    /** A01/API3 — el catalogo publico no expone correo ni user_id de nadie. */
    public function test_el_catalogo_publico_no_expone_datos_de_cuenta(): void
    {
        $this->servicioCompletado();

        $cuerpo = $this->getJson('/api/providers')->assertSuccessful()->json();
        $primero = $cuerpo['proveedores'][0] ?? null;

        $this->assertNotNull($primero, 'El catalogo deberia devolver al menos un proveedor.');
        $this->assertArrayNotHasKey('email', $primero);
        $this->assertArrayNotHasKey('user_id', $primero);
        $this->assertArrayNotHasKey('premium_vence_at', $primero);
    }
}
