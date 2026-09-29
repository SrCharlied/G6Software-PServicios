# Regresión de seguridad focalizada — Sprint 8 (task 5.3, bloque S8-05 paso 7)

> **Estado: evidencia "antes" congelada.** La columna "después" queda abierta
> hasta que aterricen 1.1, 2.1 y 3.1. Este documento no declara el sprint
> cerrado ni afirma que el sistema sea seguro: fija el punto de partida contra
> el que se medirá la corrección.

## 0. Línea base

| Campo | Valor |
|---|---|
| Rama | `dev` |
| SHA | `2ff160fbed3d6723a338957eedc00cf895234279` |
| Fecha de captura | 2026-09-27 23:52 UTC |
| Backend | Laravel 13.30.1 sobre PHP 8.3.35 (NTS) |
| Base de la suite | PostgreSQL 16, `pservicios_test` en tmpfs (`db_test`) |
| Base de la reproducción | PostgreSQL 16, `pservicios` (stack local de desarrollo) |
| Generador y servidor | Mismo host físico, sin aislamiento de CPU ni de red |

**Por qué se captura ahora.** H1 y H2 dejan de existir en cuanto D cierre 1.1 y
2.1. Una vez corregidos ya no se puede medir el "antes", así que la evidencia se
toma mientras el defecto sigue vivo. Es el mismo criterio con el que se corrió
el ZAP del 07/09/2026 antes de cerrar CORS en Sprint 7.

## 1. Matriz negativa consolidada

Se reutilizan las suites existentes, conforme al recorte de S8-05 ("reusar
suites existentes; ZAP complementario, no una campaña nueva obligatoria"). No se
escribieron pruebas nuevas para esta task: consolidar es agrupar y ejecutar lo
que ya cubre el contrato, no duplicarlo.

| Archivo | Tests | Qué cubre |
|---|---:|---|
| `MatrizAutorizacionTest` | 12 | No autenticado, rol incorrecto, recurso ajeno, ID inexistente y estado inválido, dirigido por tablas |
| `AuthSecurityTest` | 12 | Registro: política de contraseña, límite en bytes de bcrypt, Unicode, correos duplicados por caja, login no enumerable |
| `PublicacionServicioContratoTest` | 11 | Contrato de publicaciones y cupos |
| `ProviderAuthorizationTest` | 10 | Ownership del perfil de proveedor |
| `AutocontratacionYMensajeriaTest` | 8 | Autocontratación y apertura del canal de chat |
| `ProviderDocumentPrivacyTest` | 7 | Acceso restringido a documentos |
| `ConfiguracionSeguraTest` | 6 | Configuración sin fugas |
| `ServicioResourceActorAwareTest` | 4 | Exposición de `codigo_inicio` y `codigo_fin` por actor |
| `SecureErrorAndHealthTest` | 2 | El error 500 no filtra detalles; health no concatena excepciones |

**Comando y resultado real:**

```bash
docker compose --profile test run --rm backend_test --filter \
  "MatrizAutorizacionTest|ProviderAuthorizationTest|ProviderDocumentPrivacyTest|\
AutocontratacionYMensajeriaTest|ServicioResourceActorAwareTest|\
PublicacionServicioContratoTest|AuthSecurityTest|SecureErrorAndHealthTest|\
ConfiguracionSeguraTest"

# Tests: 125 passed (274 assertions) — 4.92 s
```

### Throttle, medido aparte

S8-05 paso 7 exige probar los límites por separado, para que un `429` no se
confunda con un fallo de autorización ni con error de capacidad.

```bash
docker compose --profile test run --rm backend_test tests/Feature/RateLimitingTest.php

# Tests: 5 passed (71 assertions)
```

Cubre: login excede el límite y se recupera al vencer la ventana; registro
limitado por IP; mensajes y uploads limitados por usuario autenticado; compra y
Premium limitados por usuario sin bloquear a otro proveedor.

### Cobertura negativa agregada de la suite

Conteo de aserciones de rechazo en `tests/`, como indicador de densidad —no de
suficiencia—:

| Respuesta | Aserciones |
|---|---:|
| 401 / no autenticado | 26 |
| 403 / prohibido | 33 |
| 404 / inexistente | 20 |
| 422 / estado o dato inválido | 36 |
| 429 / límite | 6 |

## 2. Reproducción de H1, H2 y H3

Ejecutadas contra el stack local con cuentas creadas por el propio script, todas
con prefijo `smoke_`. Atacante y víctima son cuentas de prueba: **no se tocó
ninguna cuenta real**. Corrida `smoke 409801`.

Para repetirlas sobre el incremento corregido, con el stack local arriba:

```bash
python ServiGT/docs/sprint8/evidencia/antes-h1-h2-h3.py
```

| Artefacto | Contenido |
|---|---|
| `evidencia/antes-h1-h2-h3.py` | Script de reproducción; genera sus propias cuentas `smoke_` |
| `evidencia/antes-h1-h2-h3.txt` | Salida literal de la corrida `409801`, sin tokens ni credenciales |

El script no imprime tokens ni contraseñas y usa un sufijo aleatorio por
corrida, así que puede reejecutarse sin colisionar con los datos anteriores.

### H1 — Bypass del handshake por `PUT /api/servicios/{id}/estado`

`actualizarEstado` verifica que quien llama sea el proveedor del servicio, pero
no valida el estado previo. La validación solo restringe el estado destino.

```
estado tras aceptar                     : aceptado
PUT /estado {completado} por proveedor  : HTTP 200
estado visto por el cliente             : completado
  -> el cliente nunca entregó codigo_inicio ni confirmó codigo_fin
queda calificable                       : HTTP 201
completado -> cancelado (terminal)      : HTTP 200 | estado cancelado
```

**Veredicto: reproducido.** El proveedor cierra el trabajo por su cuenta,
saltándose los dos códigos, y el servicio queda calificable sin que el cliente
confirme nada. Un estado terminal tampoco es inmutable.

**Impacto.** El handshake de dos códigos es el único control que acredita que el
trabajo ocurrió y que el cliente lo aceptó. Sin él, "completado" deja de ser
evidencia de nada.

**Atenuante.** `actualizarEstadoServicio` existe en
`frontend/src/services/api.js:413` pero **no tiene ningún llamador** en pantallas
ni componentes. La explotación requiere llamar a la API directamente; ninguna
interacción normal de la UI la produce.

### H2 — Ausencia de cancelación del cliente

```
POST /servicios/{id}/cancelar (cliente) : HTTP 404  (ruta inexistente)
PUT /estado {cancelado} por el cliente  : HTTP 403  No tienes permiso...
estado tras iniciar                     : en_progreso
proveedor cancela en pleno trabajo      : HTTP 200 | estado cancelado
```

**Veredicto: reproducido.** La asimetría es completa: el cliente no puede
cancelar por ninguna vía, y el proveedor puede cancelar unilateralmente incluso
con el trabajo ya iniciado. Las reglas aprobadas en el plan (§2) invierten
exactamente esto.

### H3 — Destinatario arbitrario en `POST /api/calificaciones`

Hasta esta corrida H3 figuraba como riesgo leído en código y **no reproducido**.
Queda reproducido.

`CalificacionController::store` valida que el **autor** sea parte de un servicio
completado, pero acepta `destinatario_id` del request con la sola regla
`exists:users,id`, y después recalcula promedio y total para ese id.

Escenario: el cliente completa un servicio legítimo con el **proveedor A** y
envía la calificación apuntando al **proveedor B**, con quien nunca contrató.

```
servicio legítimo cliente <-> proveedor A completado
reputación de B ANTES                   : promedio 0 | total 0
POST /calificaciones destinatario=B     : HTTP 201  Calificacion enviada
reputación de B DESPUES                 : promedio 1 | total 1
  -> el cliente nunca contrató a B; A no recibió la calificación
proveedor A se califica a sí mismo      : HTTP 201 | su promedio 5 | total 1
```

**Veredicto: reproducido, en sus dos variantes.** Se puede hundir la reputación
de un proveedor ajeno y se puede subir la propia. Ambas calificaciones quedan
marcadas `es_verificada = true`.

**Impacto.** La reputación ordena el catálogo público y es el criterio principal
de contratación. Es el más grave de los tres: a diferencia de H1 y H2, afecta a
un tercero que no participa en la transacción y no requiere ser proveedor del
servicio atacado.

**Atenuante.** La UI usa `/servicios/{id}/calificar`, que deriva el destinatario
del servicio (`CalificacionController.php:61`). La ruta vulnerable es la
alternativa, sin consumidores conocidos en el frontend.

## 3. Riesgos residuales conocidos

| # | Riesgo | Estado |
|---|---|---|
| R1 | Transiciones de servicio sin `lockForUpdate`: `ServicioController` tiene 0 usos, frente a 4 en `CotizacionController` y 2 en `CreditoController` | Cubierto por `ServicioConcurrenciaTest` (task 1.2), 6 pruebas en rojo esperando 1.1 |
| R2 | `en_camino` es un callejón sin salida: solo lo produce `/estado` y `/iniciar` exige `aceptado` | Contrato ratificado; implementa 1.1 |
| R3 | `PUT /estado` expuesto sin consumidores en la UI | Se elimina o se recorta en 1.1 |
| R4 | UI en 1440 / 1024 / 390 px no verificada en esta task | Corresponde a 6.1 (MR) |
| R5 | Campaña de carga y estrés corrida sobre código **sin** los fixes de 1.1, 2.1 y 3.1 | Declarado en `rendimiento.md`; debe repetirse sobre el incremento final |

## 4. Lo que falta para cerrar 5.3

1. Repetir esta matriz sobre el incremento final y llenar la columna "después".
2. Confirmar que H1, H2 y H3 dejan de reproducirse con el mismo script.
3. Diff de ZAP contra `docs/security/zap-2026-09-07/`, complementario y no
   sustituto de las pruebas negativas.
4. Limpieza dirigida de los datos `smoke_` de la base de desarrollo, con
   autorización explícita.

## 5. Alcance y honestidad de la medición

- Ningún resultado de este documento proviene de una corrida histórica: todos se
  ejecutaron sobre `2ff160f`.
- Las tres reproducciones usan la base de desarrollo, no la de la suite. Los
  datos quedan y están identificados con el prefijo `smoke_`.
- El conteo agregado de la sección 1 mide densidad de pruebas negativas, no
  suficiencia. Una matriz verde no demuestra ausencia de vulnerabilidades: las
  tres de esta página convivían con 271 pruebas en verde.
- No se ejecutó escaneo ZAP nuevo en esta captura. El del 07/09/2026 sigue
  siendo la referencia y su diff es trabajo de la fase "después".

## 6. Evidencia después de las correcciones

Esta sección reemplaza el estado pendiente de la captura histórica anterior.
Se ejecutó el 2026-09-29 sobre `360ba3e` y una base PostgreSQL efímera
`db_test`; no se usaron cuentas ni datos de desarrollo.

### Matriz negativa consolidada

```bash
docker compose --profile test run --rm backend_test --filter \
  "MatrizAutorizacionTest|ProviderAuthorizationTest|ProviderDocumentPrivacyTest|AutocontratacionYMensajeriaTest|ServicioResourceActorAwareTest|PublicacionServicioContratoTest|AuthSecurityTest|SecureErrorAndHealthTest|ConfiguracionSeguraTest|ServicioCancelacionTest|CalificacionDestinatarioTest|ServicioConcurrenciaTest"

# Tests: 155 passed (376 assertions) - 4.19 s

docker compose --profile test run --rm backend_test tests/Feature/RateLimitingTest.php

# Tests: 5 passed (71 assertions) - 0.48 s
```

La matriz incluye las regresiones nuevas de cancelación, transiciones
concurrentes y destinatario de calificaciones, además de las pruebas previas
de autenticación, autorización, privacidad, errores seguros y contratos.

### Smoke HTTP de H1, H2 y H3

```bash
python docs/sprint8/evidencia/despues-h1-h2-h3.py
```

Resultado real: `PASS`; las 14 comprobaciones pasaron. El script usa por
defecto `http://localhost:18000/api`, permite cambiarlo con `BASE_URL`, crea
solo datos `smoke_after_` y termina con código distinto de cero ante cualquier
regresión. La salida completa está en
`evidencia/despues-h1-h2-h3.txt`.

| Riesgo | Resultado después |
|---|---|
| H1: completar o cancelar mediante `PUT /estado` | No reproducido. Ambos destinos retornan 422 y el servicio conserva `aceptado`. |
| H2: cancelación ausente o posterior al inicio | No reproducido. El cliente cancela antes de iniciar; iniciar un cancelado y cancelar `en_progreso` retornan 422. |
| H3: destinatario arbitrario o autocalificación | No reproducido. La ruta histórica deriva el proveedor real; el tercero conserva 0 calificaciones y la autocalificación retorna 403. |

### Alcance restante

No se ejecutó un escaneo ZAP nuevo. El cierre se apoya en la matriz negativa,
el throttle aislado y el smoke HTTP reproducible; por ello no se afirma que
exista un diff ZAP posterior ni ausencia total de vulnerabilidades.
