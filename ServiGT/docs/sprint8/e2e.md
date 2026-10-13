# Sprint 8 - verificación integrada de flujos

Ejecución final: 2026-09-29 sobre `b8b5328`, usando PostgreSQL `db_test`
efímero y una suite HTTP de Laravel con transacciones por prueba.

## Cobertura agregada

`ServicioFlujosSprint8Test` recorre mediante endpoints reales:

1. **Flow A:** cliente contrata directamente, proveedor acepta, cliente obtiene
   código de inicio, proveedor inicia y finaliza, cliente confirma con código
   de fin y califica al proveedor real.
2. **Flow B:** cliente publica pedido, proveedor cotiza, cliente adjudica,
   continúa el ciclo completo con ambos códigos y finalmente califica.
3. **Cancelación directa:** cliente cancela antes de iniciar, el proveedor es
   notificado y el servicio cancelado no puede aceptarse después.
4. **Cancelación adjudicada:** se crea el servicio mediante pedido y
   cotización reales, el cliente cancela, un reintento no duplica la
   notificación y el proveedor no puede iniciar el terminal cancelado.

Los recorridos comprueban además:

- destinatario real de la calificación y `es_verificada`;
- notificaciones de inicio, por confirmar, completado y calificable;
- notificación única `servicio_cancelado`;
- pedido permanece `adjudicado` y cotización permanece `aceptada` al cancelar;
- el saldo del proveedor no cambia al adjudicar, completar ni cancelar el
  primer slot gratuito.

## Resultados reales

Prueba focalizada:

```bash
docker compose --profile test run --rm backend_test \
  tests/Feature/ServicioFlujosSprint8Test.php

# Tests: 3 passed (70 assertions) - 0.79 s
```

Regresión relacionada desde una `db_test` limpia:

```bash
docker compose --profile test run --rm backend_test \
  tests/Feature/ServicioFlujosSprint8Test.php \
  tests/Feature/ServicioCancelacionTest.php \
  tests/Feature/MonetizacionNoRompeFlujosTest.php \
  tests/Feature/CreditosYAceptacionTest.php \
  tests/Feature/CalificacionDestinatarioTest.php

# Tests: 40 passed (267 assertions) - 1.78 s
```

## Incidencia de entorno

La primera corrida combinada obtuvo 31 tests verdes y 9 fallos en suites
antiguas que usan conteos globales. El backend de k6 seguía conectado al mismo
`db_test` y había dejado nueve servicios y una calificación smoke fuera de las
transacciones PHPUnit. Se detuvieron Expo y `k6_backend_target`, se eliminó
solo la base tmpfs autorizada con:

```bash
docker rm -f k6_backend_target
docker compose --profile test down db_test -v
```

La repetición en frío produjo los 40/40 resultados indicados arriba. No se
modificó producción ni se suavizaron las aserciones para resolver esa
contaminación.

## Límite conocido

El esquema actual no persiste una referencia `servicio -> pedido/cotización`.
La prueba conserva el vínculo del recorrido usando los IDs devueltos por la
adjudicación y verifica las tres entidades, pero no afirma una trazabilidad que
la base no modela. Agregarla está fuera del alcance ratificado de Sprint 8.
