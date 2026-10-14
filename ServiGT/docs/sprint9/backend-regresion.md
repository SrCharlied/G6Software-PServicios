# Regresión backend de permisos y concurrencia — Sprint 9

Task 7.1 · Owner: CL (Carlos López) · Reviewer: D (David López) · 2026-10-12.

> Todos los comandos de este documento se ejecutaron; los resultados son los reales, incluidos los fallos y las repeticiones. Una corrida repetida se registra como tal, nunca se reemplaza por la buena.

## 1. Línea base y entorno

| Dato | Valor |
|---|---|
| SHA base | `fbc74f1` (`dev` = `origin/dev`), con 1.1–5.4 y 6.2 integrados |
| PHP / Laravel | 8.3.35 / 13.30.1 |
| PostgreSQL | 16.15, aislamiento `read committed` (servicio `db_test`, `postgres:16-alpine`, en tmpfs) |
| Comando base | `docker compose --profile test run --rm backend_test` desde `ServiGT/` |

La suite corre sobre PostgreSQL aunque `phpunit.xml` declare SQLite: Compose inyecta `DB_CONNECTION=pgsql` y las variables del proceso ganan al XML. **Ninguna prueba de concurrencia de este documento corre sobre SQLite ni dentro de una transacción de prueba.**

## 2. Resultados

| Gate | Resultado |
|---|---|
| Suite backend en `fbc74f1`, 1.ª corrida | **90 failed**, 461 passed — `relation "reportes_seguridad" does not exist`. Fallo de entorno (§6.1), no del producto |
| Suite backend en `fbc74f1`, tras recrear `db_test` | **551 passed** (2438 aserciones) |
| Suite backend con los cambios de esta task | **588 passed** (2642 aserciones), 32 s |
| `MatrizAutorizacionTest` | 65 → **99 pruebas** (279 aserciones) |
| Grupo `concurrencia` (`--group concurrencia`) | **24 passed** (157 aserciones), 6 clases |
| Jest, como referencia del incremento | 1.ª corrida en frío: 188/189 (timeout de 5 s en `LoginScreen`, §6.1). 2.ª corrida: **189/189**, 22 suites |

## 3. Matriz negativa consolidada

`MatrizAutorizacionTest` sigue dirigida por tablas: agregar un endpoint es agregar una fila. Se extendió a todo el incremento:

| Caso | Qué se agregó |
|---|---|
| Sin sesión (401) | Las 28 rutas nuevas del Sprint 9 (materiales, reservas, hilos de mensajes, Centro de seguridad y su cola admin) y `POST /servicios/{id}/cancelar` (Sprint 8), que faltaba |
| Rol incorrecto (403) | Cliente → perfil de proveedor (1.1) y bolsa de materiales. Proveedor → publicar pedidos y adjudicar (1.1). Cliente y proveedor → cola admin de seguridad. Admin → bolsa, hilos y Centro de seguridad de un servicio ajeno |
| Recurso ajeno | Hilo y Centro de seguridad de un servicio de terceros; lote, reservas e hilo de reserva ajenos; reporte de seguridad visto por la contraparte o por un tercero (con control positivo: el autor sí entra) |
| Inexistente (404) | 19 rutas del Sprint 9 y 2 de la cola admin |
| Estado inválido | Un representante por dominio: solicitar un lote vendido, retirar uno reservado, aceptar una reserva rechazada, cancelar la de un lote vendido, interrumpir un servicio completado y escribir en el chat de uno interrumpido |

**Endurecimiento de la propia matriz.** `assertDenegado` acepta 401, 403 o 404, y una ruta mal escrita también responde 404, desde el router. Una fila con errata pasaba en falso. Ahora cada fila que acepta 404 comprueba primero que su ruta esté registrada. Se verificó metiendo una errata a propósito (`reservas-materail`): la fila falló con "no corresponde a ninguna ruta registrada" y se restauró.

## 4. Carreras reales

**Arnés.** `Concerns/CompiteConProcesos` (JA): cada petición rival la atiende un **proceso PHP independiente** que arranca la aplicación completa, con un token Sanctum real. El proceso padre retiene un `FOR UPDATE` sobre la fila disputada y la suelta solo cuando `pg_stat_activity` muestra a todos los hijos esperando un lock (`wait_event_type = 'Lock'`). Si alguno no llega a esperar, la prueba falla: no habría carrera real. Esta task le agregó, de forma opcional, archivos por petición (envío multipart). Las 21 carreras que ya existían pasan sin cambios.

| Carrera | Prueba | Estado |
|---|---|---|
| Publicación duplicada (2.2) | `Sprint9ConcurrencyRegressionTest` | **Nueva**: faltaba |
| Aceptación de reserva (2.3) | `ReservaMaterialConcurrencySprint9Test` | Existente (JA) |
| Interrupción contra finalización (5.2) | `SecurityInterruptionConcurrencySprint9Test` | Existente (JA) |
| Cancelar contra interrumpir (Sprint 8 × 5.2) | `Sprint9ConcurrencyRegressionTest` | **Nueva**: solo existe cuando los dos dominios conviven |
| Vender contra cancelar la reserva aceptada (2.2 × 2.3) | `Sprint9ConcurrencyRegressionTest` | **Nueva**: ídem |

También corren en el grupo la edición contra adjudicación de cotizaciones (1.2), las transiciones admin de reportes (5.4) y las del servicio (Sprint 8).

## 5. Verificación por mutación

Para cada defensa: se desactiva **una sola**, se reconstruye la imagen de pruebas (el código de `app/` va horneado en ella), se corre la prueba y se restaura el archivo comprobando byte a byte (`cmp`). Al final se reconstruye la imagen limpia. Ningún cambio de mutación quedó en el repositorio.

| Defensa desactivada | Detectada por | Resultado |
|---|---|---|
| 2.3 · lock del lote en las transiciones de reserva | Solo la carrera de JA | Las 29 pruebas secuenciales siguen en verde. Una aceptación termina en 500 |
| 2.3 · chequeos `pendiente`/`disponible` al aceptar | 2 carreras + 2 secuenciales | Rojo |
| 2.3 · idempotencia de la solicitud | 1 carrera + 1 secuencial | Rojo |
| 2.3 · lote cerrado en `cancelar` y en `acciones` (arreglo `3e5df6a`) | Su prueba de regresión, cada una por separado | Rojo |
| 4.1 · filtro por servicio, acceso al hilo de servicio y de reserva, marcado de leídos, receptor del body | Pruebas de JA | Rojo (5 de 6) |
| 4.1 · filtro por reserva | **Ninguna**, hasta `fbc74f1` | Brecha. Se agregó el caso del mismo comprador con dos reservas del mismo vendedor: ahora rojo |
| 5.2 · lock del servicio al interrumpir | 3 de 4 carreras de JA | Las 30 secuenciales siguen en verde. Sobrevivió un `codigo_fin` en un servicio interrumpido |
| 5.2 · validación del estado previo | 1 carrera + 6 secuenciales | Rojo |
| 5.2 · idempotencia de la interrupción | 1 carrera + 1 secuencial | Rojo |
| 7.1 · lock del lote en reservas (carrera vender/cancelar) | Carrera nueva | **3/3 rojo**: el lote vendido volvió a `disponible` |
| 7.1 · lock del servicio al interrumpir (carrera cancelar/interrumpir) | Carrera nueva | **3/3 rojo**: la interrupción pisó una cancelación ya confirmada |
| 7.1 · chequeo de duplicado + traducción a 409 al publicar | Carrera nueva | **3/3 rojo**: el perdedor recibe 500 |
| 7.1 · lock del servicio al publicar | — | 3/3 verde. **Esperado:** el índice único `publicaciones_material.servicio_id` y la traducción a 409 cubren el duplicado. El lock es la primera capa, no la única |

**Conclusión.** Los locks de lote (2.3) y de servicio (5.2) solo los detectan las carreras: con ellos desactivados, todas las pruebas secuenciales siguen en verde. Eso demuestra que estas carreras son concurrencia real y no pruebas secuenciales con otro nombre. En la prueba de cancelar contra interrumpir se observaron los dos órdenes de llegada entre corridas, y ambos terminan en un estado coherente.

## 6. Hallazgos y follow-ups

### 6.1 Entorno

- **`db_test` aplica `init.sql` solo al arrancar.** Vive en tmpfs y `run --rm backend_test` no la reinicia. Después de traer un cambio de esquema, la suite da un falso rojo masivo (`relation ... does not exist`). Solución: `docker compose --profile test up -d --force-recreate --wait db_test`. Es una base efímera sin datos reales.
- **`backend_test` monta solo `tests/`**: después de cambiar `app/` o de hacer pull hay que `docker compose --profile test build backend_test`, o se prueba código viejo.
- **El `testTimeout` de 20 s de Jest se perdió** al resolver el conflicto del merge `4d60f6f` (26-sep). Por eso reaparece el timeout de 5 s en frío. Se restaura con una línea en `frontend/package.json`.

### 6.2 Producto y owners

Ninguno es un bloqueante de permisos o concurrencia del backend.

| Hallazgo | Owner | Estado |
|---|---|---|
| Se podía cancelar la reserva de un lote vendido | CL (2.3) | **Corregido** en `3e5df6a` |
| Aislamiento por reserva sin cobertura | CL (4.1) | **Cubierto** en `fbc74f1` |
| El chat de la app usa los endpoints legacy: con dos o más servicios con la misma persona responde 409, y en una reserva los mensajes no aparecen y responder da 403. La bolsa de materiales no tiene contacto usable en la UI | PT (4.3) | Abierto |
| Al cancelar una reserva aceptada, las rechazadas automáticamente al aceptarla no pueden volver a solicitar el lote | Producto | Pregunta abierta |
| El chat de una reserva rechazada o cancelada sigue abierto | Producto | Pregunta abierta |
| Reportar e interrumpir validan el cuerpo antes de comprobar que el usuario participe: un tercero ve un 422 con un cuerpo inválido | D/AS (5.2) | Abierto, severidad baja |
| `CotizacionController::update` no exige rol proveedor y valida antes de autorizar | JA (1.2) | Abierto, severidad baja |
| `reportes_seguridad.reportante_id ON DELETE CASCADE` borra reportes e historial al borrar el usuario, y el historial admite `DELETE` directo | D (5.1) | A discutir: el centro se define como auditable |

## 7. Esquema de la 5.1 sobre un volumen existente

Se aplicó el `init.sql` de `fbc74f1` sobre la base de desarrollo real, que tenía el `CHECK` y el `VARCHAR(20)` anteriores, 14 usuarios y 3 servicios. Antes se hizo un respaldo con `pg_dump`.

| Comprobación | Primer arranque | Segundo arranque (idempotencia) |
|---|---|---|
| `reportes_seguridad`, `evidencias_reporte_seguridad`, `historial_reportes_seguridad` | Creadas | Sin cambios |
| `servicios.estado` | `VARCHAR(20)` → `VARCHAR(30)` | Sin cambios |
| `servicios_estado_check` | Incluye `interrumpido_seguridad`; uno solo | Uno solo, no se duplica |
| Trigger de historial inmutable · índice de interrupción única | 1 · 1 | 1 · 1 |
| Datos | 14 usuarios; 3 servicios con los mismos estados | Iguales |

La base limpia quedó cubierta por la suite: `db_test` se recreó desde `init.sql` y pasaron las 551 pruebas.

## 8. Archivos de esta task

- `backend/tests/Feature/MatrizAutorizacionTest.php` (modificado)
- `backend/tests/Feature/Sprint9ConcurrencyRegressionTest.php` (nuevo)
- `backend/tests/Feature/Concerns/CompiteConProcesos.php` (modificado: archivos opcionales, compatible con sus usos previos)
- `docs/sprint9/backend-regresion.md` (este documento)

## 9. Cómo reproducir

```bash
# Desde ServiGT/
docker compose --profile test build backend_test
docker compose --profile test up -d --force-recreate --wait db_test
docker compose --profile test run --rm backend_test                                   # suite completa
docker compose --profile test run --rm backend_test --group concurrencia              # carreras
docker compose --profile test run --rm backend_test tests/Feature/MatrizAutorizacionTest.php
docker compose --profile test run --rm backend_test tests/Feature/Sprint9ConcurrencyRegressionTest.php
```
