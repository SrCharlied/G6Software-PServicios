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

> **Actualizacion.** El diff de ZAP si se ejecuto despues, el 2026-09-29.
> Resultados en la seccion 8; no altera las conclusiones de esta seccion.

## 7. Verificación independiente y defecto encontrado

Ejecutada el 2026-09-29 sobre `6a64a9b`, contra el **stack de desarrollo**
(`localhost:8085`, base `pservicios`) y no contra el servidor efímero. El
propósito era doble: reproducir los resultados de la sección 6 con otro script
y cerrar la asimetría de entornos, ya que el "antes" de la sección 2 se capturó
en ese mismo stack y la comparación no era equivalente.

**Los números de la sección 6 reproducen exactamente:** 155 passed / 376
aserciones en la matriz extendida y 5 passed / 71 en el throttle aislado.

```bash
python docs/sprint8/evidencia/verificacion-independiente.py
# RESULTADO: 16 correctas, 0 fallidas
```

### Defecto: el código de inicio desaparecía en `en_camino`

La primera corrida dio 15 de 16. La comprobación que falló:

```
[FALLA] el cliente SIGUE viendo su codigo_inicio en en_camino
        antes=048614  despues=None
```

`/iniciar` admite el código desde `aceptado` o desde `en_camino`
(`ServicioController::iniciar`), así que el contrato ratificado estaba bien
implementado en el controlador. El problema era de **exposición**, en dos capas
que no se actualizaron cuando `en_camino` pasó a ser un estado alcanzable:

| Archivo | Antes | Después |
|---|---|---|
| `app/Http/Resources/ServicioResource.php:62` | `['aceptado','en_progreso','por_confirmar','completado']` | se agregó `'en_camino'` |
| `frontend/src/screens/SolicitudesScreen.js:29` | `Set(['pendiente','aceptado'])` | se agregó `'en_camino'` |

**Impacto.** El proveedor marcaba que iba en camino, el cliente refrescaba y el
código se le esfumaba. El proveedor le pedía seis dígitos que el cliente ya no
podía leer, y el servicio quedaba atascado salvo que los hubiera memorizado.
Contradecía el criterio de aceptación de S8-01: *"si se conserva `en_camino`,
existe una salida válida mediante código de inicio"*.

No es una vulnerabilidad: no expone datos ni permite saltarse un control. Es un
callejón sin salida funcional, el mismo que S8-01 venía a eliminar, reaparecido
un paso más adelante.

**Por qué no lo detectó nadie.** Ninguna prueba leía el código en `en_camino`;
el E2E de 6.3 no ejercita ese estado; y las pruebas de concurrencia —incluidas
las propias— pasan el código directo al endpoint sin pasar por la lectura del
cliente, así que lo atravesaban sin verlo.

**Regresión añadida**, roja antes del arreglo y verde después:

- `backend/tests/Feature/ServicioResourceActorAwareTest.php` —
  `test_cliente_conserva_su_codigo_inicio_cuando_el_servicio_va_en_camino`
- `frontend/src/screens/SolicitudesScreen.test.js` — bloque
  `SolicitudesScreen codigo de inicio`, con `aceptado` y `en_camino` por tabla
  más el caso negativo de `en_progreso`

### Gates tras la corrección

```bash
docker compose --profile test run --rm backend_test
# Tests: 305 passed (1137 assertions)

docker exec servigt_frontend npx jest --ci
# Test Suites: 16 passed | Tests: 104 passed

docker exec servigt_frontend npx expo export --platform web
# Exported: dist — bundle 1.83 MB
```

> **Aviso sobre las imágenes.** `backend_test` solo monta `./backend/tests`, y
> el contenedor `frontend` no monta código. Un cambio en `app/` o en
> `frontend/src` no se refleja sin `docker compose build`. Una medición previa
> de Jest en este sprint arrojó 14 suites / 82 tests contra una imagen obsoleta;
> la cifra real con imagen reconstruida es 16 / 104.

### Deuda menor, no corregida

`ESTADOS_CON_CODIGO` incluye `'pendiente'`, pero el backend nunca expone el
código en ese estado. Es inofensivo —el frontend solo pinta lo que recibe— y
queda reportado en vez de corregido, por estar fuera del alcance de este
arreglo.

## 8. Diff de ZAP contra el escaneo del 07/09/2026

Complementario, como indica el recorte de S8-05: *"el diff de ZAP puede ser
complementario; no sustituye pruebas negativas"*.

**Misma herramienta y misma metodología que en Sprint 7.** Imagen
`ghcr.io/zaproxy/zaproxy:stable`, ID `781a2bdaea47` — el mismo ID del escaneo
del 07/09, así que un cambio de versión no explica ninguna diferencia. Escaneo
pasivo con spider por la red interna de Compose, contra `backend` y
`frontend_prod` por nombre de servicio.

```bash
docker run --rm --network servigt_servigt_net -v "<ruta>:/zap/wrk:rw" -u 0 \
  ghcr.io/zaproxy/zaproxy:stable zap-baseline.py \
  -t http://backend:8000 -r zap-backend.html -w zap-backend.md -I

docker run --rm --network servigt_servigt_net -v "<ruta>:/zap/wrk:rw" -u 0 \
  ghcr.io/zaproxy/zaproxy:stable zap-baseline.py \
  -t http://frontend_prod:80 -r zap-frontend.html -w zap-frontend.md -I
```

Reportes crudos en `docs/security/zap-2026-09-29/`.

### Resultado

| Objetivo | 07/09 | 29/09 | FAIL-NEW |
|---|---|---|---|
| backend | Med 2, Low 7, Info 3 | Med 1, Low 5, Info 2 | 0 (WARN-NEW 8, PASS 59) |
| frontend_prod | Med 1, Low 4, Info 2 | Med 1, Low 4, Info 2 | 0 (WARN-NEW 5, PASS 62) |

Cero alertas High y cero `FAIL-NEW` en ambos. **Ninguna alerta nueva**: el
Sprint 8 no introdujo regresiones detectables por escaneo pasivo.

En el frontend el resultado es **idéntico alerta por alerta**, lo que es
coherente: el sprint no tocó la configuración de nginx.

### Las cuatro alertas que desaparecieron no son mérito del Sprint 8

En el backend dejaron de reportarse `Cross-Origin-Embedder-Policy`,
`Cross-Origin-Opener-Policy`, `Missing Anti-clickjacking Header` y
`Storable and Cacheable Content`. Antes de anotarlo como mejora se verificó la
causa, y no es la que parece:

- **No se agregaron cabeceras.** No existe middleware de cabeceras de seguridad
  —`app/Http/Middleware/` solo contiene `CorrelationId` y `EnsureIsAdmin`— y la
  respuesta actual del backend sigue sin `X-Frame-Options`, COOP ni COEP.
- **Cambió la superficie.** El commit `e29b2ce` (Sprint 7, task 4.1) sustituyó
  la página de bienvenida de Laravel en `/` por un JSON mínimo. Esas cuatro
  reglas se disparan sobre respuestas HTML, así que dejaron de aplicar.

Es remediación legítima —se eliminó una superficie que no hacía falta— pero es
**trabajo del Sprint 7 medido tarde**, no una mejora de este sprint. El escaneo
del 07/09 se corrió antes de que ese commit aterrizara.

### Corrección a la documentación de esa ruta

El comentario de `backend/routes/web.php` afirma que la ruta nueva responde
*"sin sesión"*. No es exacto: `GET /` con `Accept: text/html` sigue emitiendo
dos cookies.

```
Set-Cookie: XSRF-TOKEN=...;    path=/; samesite=lax          (sin httponly)
Set-Cookie: servigt-session=...; path=/; httponly; samesite=lax
```

El grupo `web` sigue aplicando el middleware de sesión aunque la respuesta sea
JSON. Por eso `Cookie No HttpOnly Flag` sobrevive en el escaneo: corresponde a
`XSRF-TOKEN`, que **no debe** ser HttpOnly porque el cliente necesita leerlo.
Es un falso positivo conocido de ZAP con Laravel, pero la afirmación del
comentario debe corregirse o la ruta debe salir del grupo `web`. Queda como
follow-up, fuera del alcance de esta task.

### Qué no demuestra este diff

Un baseline pasivo observa tráfico y cabeceras: no autentica, no recorre flujos
de negocio y no ejercita autorización. **No aporta ninguna evidencia sobre H1,
H2 ni H3**, que son fallos de lógica. Esa evidencia son la matriz negativa de
la sección 6 y la verificación independiente de la sección 7. Por eso el plan
lo clasifica como complementario y no como sustituto.

## 9. Limpieza de datos smoke

Paso 8 de S8-05 (*"limpiar exclusivamente fixtures autorizados"*), ejecutado el
2026-09-29 con autorización explícita del responsable.

Se ensayó primero dentro de una transacción con `ROLLBACK` para ver el impacto
real antes de confirmar nada, y el borrado definitivo llevó una guarda que
aborta la transacción si el estado final no es el esperado.

```sql
BEGIN;
DELETE FROM users WHERE email LIKE 'smoke\_%';   -- 48 filas
-- guarda: aborta si no quedan exactamente 11 usuarios y 0 smoke
COMMIT;
```

El borrado se apoya en las ocho claves foráneas hacia `users`, todas en
`ON DELETE CASCADE`: `proveedores`, `servicios`, `pedidos`, `calificaciones`
(autor y destinatario), `mensajes` (emisor y receptor) y `notificaciones`.

| Tabla | Antes | Después |
|---|---:|---:|
| users | 59 | 11 |
| proveedores | 33 | 10 |
| servicios | 24 | 0 |
| pedidos | 2 | 0 |
| cotizaciones | 2 | 0 |
| calificaciones | 8 | 0 |
| mensajes | 1 | 0 |
| notificaciones | 73 | 0 |
| publicaciones | 7 | 0 |

Los 11 usuarios restantes son exactamente los del seed: diez proveedores
`proveedorN@servigt.gt` y `admin@servigt.gt`. Se verificó antes de borrar que
las siete publicaciones eran todas `smoke_` y que `sync_schema.php` no siembra
publicaciones, así que quedar en cero es el estado limpio original y no una
pérdida.

Comprobación posterior:

```
GET /api/health          -> ok, pgsql connected
GET /api/providers       -> 10 proveedores
GET /api/categorias      -> 10 categorias
POST /api/login (admin)  -> HTTP 200
frontend :8086 / :8087   -> HTTP 200
```

La base de la suite (`pservicios_test`, tmpfs) no se tocó: es independiente de
`pservicios` y se recrea en cada arranque de `db_test`.
