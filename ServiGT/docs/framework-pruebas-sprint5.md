# Framework de pruebas - Sprint 5

## Framework seleccionado

Para Sprint 5 se usa PHPUnit con Laravel Test. Es el framework incluido por Laravel y permite probar endpoints, autenticacion con Sanctum, validaciones, modelos y cambios en base de datos sin agregar una herramienta externa al proyecto.

## Justificacion

- Ya viene integrado en el proyecto Laravel creado por el contenedor del backend.
- Permite ejecutar pruebas HTTP con `getJson`, `postJson` y aserciones sobre respuestas JSON.
- Permite validar persistencia con aserciones como `assertDatabaseHas`.
- Funciona bien para reglas criticas del sprint: creditos, cotizaciones, permisos de admin y aceptacion de cotizaciones.
- Reduce riesgo en flujos que dependen de varias tablas, como saldo del proveedor y transacciones de credito.

## Como ejecutar

Desde la raiz de `ServiGT`, levantar el entorno:

```bash
docker compose up -d --build
```

Ejecutar las pruebas dentro del contenedor del backend:

```bash
docker compose exec backend php artisan test
```

Para correr solo la prueba de recarga manual:

```bash
docker compose exec backend php artisan test --filter=AdminRecargaCreditosTest
```

## Casos cubiertos por Antony Saz

- Admin puede agregar creditos a un proveedor.
- La recarga aumenta el saldo existente del proveedor.
- Si el proveedor no tenia registro en `creditos_proveedor`, la recarga crea el saldo inicial.
- Cada recarga registra una transaccion tipo `recarga`.
- Un usuario que no es admin recibe `403` y no altera saldo ni transacciones.

## Evidencia sugerida para entrega

Guardar una captura o salida de consola con:

- Comando ejecutado.
- Numero de pruebas ejecutadas.
- Resultado final exitoso o fallido.
- Si falla alguna prueba, breve nota de causa y correccion aplicada.

## Nota de alcance

La recarga manual no implementa pagos reales. Solo registra una operacion administrativa auditada para que los creditos queden disponibles en las reglas de cotizacion pagada.
