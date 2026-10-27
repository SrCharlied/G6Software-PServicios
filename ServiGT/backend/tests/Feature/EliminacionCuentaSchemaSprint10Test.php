<?php

namespace Tests\Feature;

use App\Models\SolicitudEliminacionCuenta;
use App\Models\User;
use App\Services\SolicitudEliminacionService;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

/**
 * Task 3.1.a (Sprint 10): estado de cuenta y solicitud idempotente de
 * eliminacion, protegidos por constraints de la base.
 */
class EliminacionCuentaSchemaSprint10Test extends TestCase
{
    use DatabaseTransactions;

    private function usuario(string $role = 'cliente'): User
    {
        return User::create([
            'name'     => 'Usuario eliminacion',
            'email'    => 'elim_' . uniqid() . '@servigt.test',
            'password' => 'secreto-de-prueba',
            'role'     => $role,
        ])->refresh();
    }

    private function servicio(): SolicitudEliminacionService
    {
        return app(SolicitudEliminacionService::class);
    }

    private function rechaza(callable $intento): void
    {
        try {
            DB::transaction($intento);
            $this->fail('La base debio rechazar el cambio');
        } catch (QueryException $e) {
            $this->addToAssertionCount(1);
        }
    }

    public function test_toda_cuenta_nace_activa(): void
    {
        $user = $this->usuario();

        $this->assertSame('activa', $user->estado_cuenta);
        $this->assertNull($user->anonimizada_at);
        $this->assertFalse($user->estaAnonimizada());
        $this->assertSame(0, DB::table('users')->where('estado_cuenta', '!=', 'activa')->whereNull('anonimizada_at')->count());
    }

    public function test_estado_y_fecha_de_anonimizacion_deben_ser_coherentes(): void
    {
        $user = $this->usuario();

        $this->rechaza(fn () => DB::table('users')->where('id', $user->id)->update(['estado_cuenta' => 'anonimizada']));
        $this->rechaza(fn () => DB::table('users')->where('id', $user->id)->update(['anonimizada_at' => now()]));
        $this->rechaza(fn () => DB::table('users')->where('id', $user->id)->update(['estado_cuenta' => 'borrada']));

        DB::table('users')->where('id', $user->id)->update(['estado_cuenta' => 'anonimizada', 'anonimizada_at' => now()]);
        $this->assertTrue($user->refresh()->estaAnonimizada());
    }

    public function test_estado_cuenta_no_es_asignable_en_masa(): void
    {
        $user = User::create([
            'name'          => 'Masivo',
            'email'         => 'masivo_' . uniqid() . '@servigt.test',
            'password'      => 'secreto-de-prueba',
            'role'          => 'cliente',
            'estado_cuenta' => 'anonimizada',
        ])->refresh();

        $this->assertSame('activa', $user->estado_cuenta);
    }

    public function test_la_misma_clave_devuelve_la_misma_solicitud(): void
    {
        $user = $this->usuario();

        $primera = $this->servicio()->solicitar($user, 'clave-1');
        $repetida = $this->servicio()->solicitar($user, 'clave-1');

        $this->assertSame($primera->id, $repetida->id);
        $this->assertSame(SolicitudEliminacionCuenta::PENDIENTE, $primera->estado);
        $this->assertSame([], $primera->manifiesto_archivos);
        $this->assertSame(1, SolicitudEliminacionCuenta::where('user_id', $user->id)->count());
    }

    public function test_otra_clave_converge_a_la_solicitud_vigente(): void
    {
        $user = $this->usuario('proveedor');

        $primera = $this->servicio()->solicitar($user, 'clave-a');
        $segunda = $this->servicio()->solicitar($user, 'clave-b');

        $this->assertSame($primera->id, $segunda->id);
        $this->assertSame(1, SolicitudEliminacionCuenta::where('user_id', $user->id)->count());
    }

    public function test_una_rechazada_permite_un_nuevo_intento(): void
    {
        $user = $this->usuario();
        $rechazada = $this->servicio()->solicitar($user, 'clave-r');
        $rechazada->update(['estado' => SolicitudEliminacionCuenta::RECHAZADA, 'motivo_rechazo' => 'Servicio activo']);

        $nueva = $this->servicio()->solicitar($user, 'clave-n');
        $mismaRechazada = $this->servicio()->solicitar($user, 'clave-r');

        $this->assertNotSame($rechazada->id, $nueva->id);
        $this->assertSame(SolicitudEliminacionCuenta::PENDIENTE, $nueva->estado);
        $this->assertSame($rechazada->id, $mismaRechazada->id);
        $this->assertSame(SolicitudEliminacionCuenta::RECHAZADA, $mismaRechazada->estado);
    }

    public function test_la_base_impide_dos_solicitudes_vigentes(): void
    {
        $user = $this->usuario();
        $this->servicio()->solicitar($user, 'clave-1');

        $this->rechaza(fn () => DB::table('solicitudes_eliminacion_cuenta')->insert([
            'user_id' => $user->id, 'idempotency_key' => 'clave-2', 'estado' => 'pendiente',
        ]));
    }

    public function test_constraints_de_estado_fechas_y_motivo(): void
    {
        $solicitud = $this->servicio()->solicitar($this->usuario(), 'clave-c');
        $id = $solicitud->id;

        // Rechazo sin motivo y motivo sin rechazo.
        $this->rechaza(fn () => DB::table('solicitudes_eliminacion_cuenta')->where('id', $id)->update(['estado' => 'rechazada']));
        $this->rechaza(fn () => DB::table('solicitudes_eliminacion_cuenta')->where('id', $id)->update(['motivo_rechazo' => 'x']));
        // Limpieza o completada sin fechas coherentes.
        $this->rechaza(fn () => DB::table('solicitudes_eliminacion_cuenta')->where('id', $id)->update(['estado' => 'limpieza_pendiente']));
        $this->rechaza(fn () => DB::table('solicitudes_eliminacion_cuenta')->where('id', $id)->update(['estado' => 'completada', 'anonimizada_at' => now()]));
        // Estado desconocido, manifiesto que no es arreglo, clave vacia.
        $this->rechaza(fn () => DB::table('solicitudes_eliminacion_cuenta')->where('id', $id)->update(['estado' => 'borrada']));
        $this->rechaza(fn () => DB::table('solicitudes_eliminacion_cuenta')->where('id', $id)->update(['manifiesto_archivos' => '{}']));
        $this->rechaza(fn () => DB::table('solicitudes_eliminacion_cuenta')->where('id', $id)->update(['idempotency_key' => ' ']));

        DB::table('solicitudes_eliminacion_cuenta')->where('id', $id)
            ->update(['estado' => 'limpieza_pendiente', 'anonimizada_at' => now()]);
        DB::table('solicitudes_eliminacion_cuenta')->where('id', $id)
            ->update(['estado' => 'completada', 'completada_at' => now()]);
        $this->assertSame('completada', $solicitud->refresh()->estado);
    }

    public function test_la_solicitud_impide_borrar_al_usuario(): void
    {
        $user = $this->usuario();
        $this->servicio()->solicitar($user, 'clave-d');

        $this->expectException(QueryException::class);
        DB::table('users')->where('id', $user->id)->delete();
    }

    public function test_el_manifiesto_no_se_serializa(): void
    {
        $solicitud = $this->servicio()->solicitar($this->usuario(), 'clave-h');
        $solicitud->update(['manifiesto_archivos' => [['disco' => 'local', 'ruta' => 'documentos/1/x.pdf']]]);

        $json = $solicitud->refresh()->toArray();
        $this->assertArrayNotHasKey('manifiesto_archivos', $json);
        $this->assertArrayNotHasKey('ultimo_error_limpieza', $json);
    }
}
