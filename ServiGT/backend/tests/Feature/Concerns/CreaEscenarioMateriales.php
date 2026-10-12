<?php

namespace Tests\Feature\Concerns;

use App\Models\Categoria;
use App\Models\Proveedor;
use App\Models\PublicacionMaterial;
use App\Models\ReservaMaterial;
use App\Models\Servicio;
use App\Models\User;

/*
 * ── AVISO PARA QUIEN MODIFIQUE ESTA PRUEBA ────────────────────────────────
 * Estas pruebas fueron desarrolladas por JA (Juan Salguero) como parte de la
 * cadena de dependencias de las Tasks 3.3 y 4.2 de Sprint 9, y cubren el
 * alcance de la Task asignada a otra persona (Tasks 2.1 a 2.4 y 4.1, fixtures compartidos). Describen el contrato
 * actual, no el definitivo.
 *
 * Si vas a cambiar o ampliar el comportamiento de esta Task (nuevas reglas,
 * campos, estados o rutas), no basta con ajustar estas pruebas: agrega
 * pruebas de regresion que demuestren que lo que ya funcionaba sigue
 * funcionando (permisos por rol, ownership, estados invalidos, idempotencia
 * y concurrencia cuando aplique) y ejecuta la suite backend completa.
 * ───────────────────────────────────────────────────────────────────────────
 */
/**
 * Fixtures compartidos por las pruebas de materiales y mensajeria contextual
 * (Sprint 9). Se usan con DatabaseTransactions: nada se limpia a mano.
 */
trait CreaEscenarioMateriales
{
    private int $secMat = 0;
    private ?Categoria $categoriaMat = null;

    /** @var list<int> ids de usuarios creados; las pruebas sin DatabaseTransactions los limpian. */
    protected array $usuariosMat = [];

    protected function categoriaMat(): Categoria
    {
        return $this->categoriaMat ??= Categoria::create([
            'nombre'      => 'Categoria mat ' . uniqid(),
            'descripcion' => 'Categoria para pruebas de materiales',
        ]);
    }

    protected function crearCliente(): User
    {
        $this->secMat++;

        $user = User::create([
            'name'     => "Cliente Mat {$this->secMat}",
            'email'    => "cliente.mat.{$this->secMat}." . uniqid() . '@servigt.test',
            'password' => 'password-test',
            'role'     => 'cliente',
        ]);
        $this->usuariosMat[] = $user->id;

        return $user;
    }

    protected function crearProveedorComprador(): Proveedor
    {
        $this->secMat++;

        $user = User::create([
            'name'     => "Proveedor Mat {$this->secMat}",
            'email'    => "proveedor.mat.{$this->secMat}." . uniqid() . '@servigt.test',
            'password' => 'password-test',
            'role'     => 'proveedor',
        ]);
        $this->usuariosMat[] = $user->id;

        $proveedor = Proveedor::create([
            'user_id'      => $user->id,
            'nombre'       => $user->name,
            'email'        => $user->email,
            'telefono'     => '5555-' . str_pad((string) $this->secMat, 4, '0', STR_PAD_LEFT),
            'departamento' => 'Guatemala',
            'municipio'    => 'Guatemala',
            'categoria_id' => $this->categoriaMat()->id,
            'descripcion'  => 'Proveedor creado para pruebas de materiales',
        ]);

        return $proveedor->setRelation('user', $user);
    }

    /** Servicio entre un cliente nuevo y un proveedor (nuevo salvo que se pase uno). */
    protected function servicioConEstado(string $estado, ?Proveedor $proveedor = null, array $extra = []): Servicio
    {
        $proveedor ??= $this->crearProveedorComprador();
        $cliente = $this->crearCliente();

        $servicio = Servicio::create(array_merge([
            'cliente_id'     => $cliente->id,
            'proveedor_id'   => $proveedor->id,
            'categoria_id'   => $this->categoriaMat()->id,
            'descripcion'    => 'Trabajo de prueba para materiales',
            'direccion'      => 'Zona 1, Guatemala',
            'estado'         => $estado,
            'monto_acordado' => 300,
        ], $extra));

        return $servicio->setRelation('cliente', $cliente)->setRelation('proveedor', $proveedor);
    }

    protected function servicioCanceladoDesdeEnCamino(?Proveedor $proveedor = null): Servicio
    {
        return $this->servicioConEstado('cancelado', $proveedor, ['cancelado_desde' => 'en_camino']);
    }

    protected function crearLote(Servicio $servicio, array $extra = []): PublicacionMaterial
    {
        return PublicacionMaterial::create(array_merge([
            'servicio_id'        => $servicio->id,
            'vendedor_id'        => $servicio->proveedor_id,
            'titulo'             => 'Tubería PVC sobrante',
            'descripcion'        => 'Material comprado para un trabajo que fue cancelado.',
            'cantidad'           => 10,
            'unidad'             => 'metros',
            'precio_referencial' => 150,
            'departamento'       => 'Guatemala',
            'municipio'          => 'Mixco',
            'estado'             => 'disponible',
        ], $extra));
    }

    protected function crearReserva(PublicacionMaterial $lote, Proveedor $comprador, array $extra = []): ReservaMaterial
    {
        return ReservaMaterial::create(array_merge([
            'publicacion_id'  => $lote->id,
            'comprador_id'    => $comprador->id,
            'mensaje_inicial' => 'Me interesa el lote, ¿sigue disponible?',
            'estado'          => 'pendiente',
            'idempotency_key' => 'k-' . uniqid(),
        ], $extra));
    }
}
