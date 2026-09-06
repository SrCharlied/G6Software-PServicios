# Matriz OWASP Top 10 — ServiGT

Matriz de riesgos de seguridad de ServiGT mapeada a OWASP Top 10:2025 y OWASP API Security Top 10:2023, basada en evidencia real de código (controladores, modelos, middleware, rutas, configuración y Docker Compose).

- **Levantada:** 2026-08-28 sobre `dev@50ddc0b` (task 1.1).
- **Cerrada:** 2026-09-08 al final del Sprint 7 (task 6.3), con el estado **antes / después** de cada fila.
- **Metodología:** revisión de código sobre cada cambio, suite backend canónica (`docker compose --profile test run --rm backend_test`), suite frontend (`npx jest --ci`), build web (`npm run build:web`) y escaneo ZAP Baseline contra el stack local con datos sintéticos.

## Cómo leer la matriz

Cada fila indica un **tipo**:
- **Vulnerabilidad confirmada**: evidencia de código muestra el hueco de forma directa, sin necesitar interpretación de reglas de negocio.
- **Decisión de producto**: el comportamiento existe a propósito y es correcto para el modelo de marketplace de contacto directo, pero no estaba explícito en el código, por lo que se hizo explícito en vez de dejarlo como comportamiento implícito de un modelo sin `$hidden`.
- **Riesgo residual aceptado**: el hueco existe, tiene impacto bajo/medio, y se documenta con fecha de revisión en vez de bloquearlo.

---

## 1. OWASP Top 10:2025 — estado al cierre

| # | Activo | Amenaza (estado inicial) | Control aplicado | Task | Prueba que lo fija | Estado |
|---|---|---|---|---|---|---|
| A01 | `POST /providers/{id}/documentos` | **BOLA** — cualquier usuario autenticado subía un documento a nombre de cualquier `proveedor_id` ajeno | Ownership vía `ProveedorPolicy::manage` antes de aceptar el archivo | 2.1, 2.2 | `ProviderDocumentPrivacyTest`, `ProviderAuthorizationTest` | **Corregida** |
| A01 | `GET /providers/{id}/documentos` | **BOLA** — cualquier usuario autenticado listaba documentos (DPI, comprobantes) de cualquier proveedor | Misma policy; la ruta física nunca sale en respuestas | 2.2 | `ProviderDocumentPrivacyTest` | **Corregida** |
| A01 / A06 | `POST /providers` | Mass assignment de `user_id`: se podía crear un perfil asociado a la cuenta de otro | `user_id` se deriva de Sanctum; el del cuerpo se ignora | 2.1 | `ProviderAuthorizationTest`, `MatrizAutorizacionTest` | **Corregida** |
| A02 | Documentos de identidad en `storage/app/public` | Storage público sin control de acceso; combinado con la fila anterior, cualquiera enumeraba y descargaba DPI de terceros | Disco privado (`storage/app/private`), descarga autenticada, comando de migración de los legados, volumen propio que sobrevive rebuild | 2.2 | `ProviderDocumentPrivacyTest`, `MigrarDocumentosAPrivadoTest` | **Corregida** |
| A01 | `POST /calificaciones` | `destinatario_id` venía del cuerpo sin validarse contra el servicio: se podía calificar a un proveedor con el que nunca se trabajó | El destinatario se deriva de la contraparte real del servicio | 6.3 | `RegresionOwaspTest::test_no_se_puede_calificar_a_un_tercero_ajeno_al_servicio` | **Corregida** |
| A01 | Autocontratación y autocalificación | Un mismo usuario podía crear el servicio, aceptarlo y calificarse | Solo rol cliente contrata; se bloquea contratarse a sí mismo y calificarse | 2.3 | `AutocontratacionYMensajeriaTest` | **Corregida** |
| A02 | Secretos de `docker-compose.yml` | `APP_KEY` y `DB_PASSWORD` escritos en el repositorio; `APP_DEBUG: "true"` en el servicio `backend` | Sin valores por defecto: salen de `ServiGT/.env` (no versionado). El entrypoint aborta el arranque si falta alguna y nunca las imprime. `APP_DEBUG` por defecto `false` | 4.1 | `ConfiguracionSeguraTest` + arranque con volumen limpio (§4) | **Corregida** |
| A02 | Cuenta de administrador | Una base vacía creaba `admin@gmail.com` con contraseña `admin` | `ADMIN_PASSWORD` obligatoria y de mínimo 12 caracteres; sin ella el arranque falla | 4.1 | Arranque con volumen limpio (§4) | **Corregida** |
| A02 | Datos demo | Diez proveedores con contraseña compartida se sembraban en cualquier ambiente | `SEED_DEMO_DATA` explícito, activo por defecto solo en `local` | 4.1 | Arranque con volumen limpio (§4) | **Corregida** |
| A03 | Backend (dependencias PHP) | Sin `composer.json`/`composer.lock`: la imagen instalaba la última versión disponible en build-time | Manifiesto y lockfile versionados, `platform.php` fijado a 8.3, `composer install` en el Dockerfile, `composer audit` bloqueante en CI | 1.4, 1.3 | Dos builds `--no-cache` resuelven el mismo árbol (§4) | **Corregida** |
| A03 | Frontend (dependencias JS) | Sin `package-lock.json` comiteado | Lockfile versionado, `npm ci` en Docker y CI, `axios` actualizado a 1.20.0 (cierra el advisory de SSRF/credential leak) | 1.2, 1.5 | Job `CI frontend` | **Corregida** — con residual, ver §3 |
| A04 / A07 | Token de sesión en el dispositivo | Token en `localStorage` en todas las plataformas; en nativo eso significaba que la sesión no se recordaba y el error quedaba silenciado | Adapter por plataforma: `expo-secure-store` en nativo, `localStorage` en web, migración del token legado y borrado de token, perfil y caché de chat al cerrar sesión | 3.4 | `storage.test.js`, `api.test.js` | **Corregida** — con residual en web, ver §3 |
| A07 | Tokens de Sanctum | Sin `config/sanctum.php`: `expiration = null`, los tokens no caducaban nunca | `config/sanctum.php` versionado con expiración de 30 días | 6.3 | `RegresionOwaspTest::test_los_tokens_de_sanctum_tienen_expiracion_configurada` | **Corregida** |
| A07 | Registro y login | `min:6` aceptaba `123456`; el correo se guardaba sin normalizar | 10 caracteres con letras y números, tope de 72 bytes (bcrypt trunca ahí), correo normalizado y respuesta de login no enumerable con tiempo constante | 3.1 | `AuthSecurityTest` | **Corregida** |
| A01 / A03 (API3) | `GET /providers`, `GET /providers/{id}` | Devolvían el modelo crudo: `email`, `user_id` y campos internos de Premium a cualquier visitante anónimo | `ProveedorResource` con tres vistas explícitas (catálogo, detalle, propio) | 2.5 | `ProveedorSerializacionTest` | **Corregida** |
| A01 (API3) | `GET /servicios/{id}` | `codigo_inicio` y `codigo_fin` viajaban a quien no debía verlos | `ServicioResource` actor-aware | 2.6 | `ServicioResourceActorAwareTest` | **Corregida** |
| A01 | Personalización de marca (portada, `color_acento`) | Cualquier proveedor podía usarla sin haber pagado Premium nunca | Policy `personalizarMarca` sobre `premiumEstado()`; al vencer, el perfil público vuelve al degradado sin borrar archivos | 2.4 | `PremiumPersonalizacionTest` | **Corregida** |
| A05 | Toda la capa de datos (`app/`) | Inyección SQL / de comandos | Grep exhaustivo: solo 2 usos de SQL crudo, ambos cadenas estáticas sin interpolación; cero `whereRaw`/`DB::statement`; cero `exec`/`eval` | — | — | **Sin hallazgo** (revisado 2026-08-28 y 2026-09-08) |
| A06 | Nombres de archivo en uploads | Nombre original del usuario usado sin sanitizar | Sin cambios: mitigado por Flysystem/`storeAs`, que no permite escapar del directorio destino | — | — | **Riesgo residual aceptado**, ver §3 |
| A06 (API6) | `POST /pedidos` | Sin `throttle`, pese a disparar notificaciones a todos los proveedores de la categoría | `throttle:pedidos` (10/min por usuario) | 6.3 | `RegresionOwaspTest::test_publicar_pedidos_esta_limitado` | **Corregida** |
| A04 (API4) | Login, registro, mensajes, uploads, compra, Premium | Sin límites por IP/usuario | Rate limiting diferenciado con clave por usuario cuando aplica | 3.2 | `RateLimitingTest` | **Corregida** |
| A08 | Compras de créditos, cotizaciones, publicaciones | Integridad de saldo, adjudicación y cupos | Ya existían `idempotency_key`, `DB::transaction()` + `lockForUpdate()` e índice único; el límite de publicaciones se aplica bajo el mismo patrón | 5.3 | `PublicacionServicioLimiteTest`, `PublicacionServicioContratoTest` | **Sin hallazgo nuevo** |
| A09 | Logging | Sin logging de eventos de seguridad (login fallido, 403, ráfagas de 429) | Sin cambios; no hay fuga de credenciales en logs, pero tampoco capacidad de detección | — | — | **Riesgo residual aceptado**, ver §3 |
| A10 | Manejo de errores y health | Excepciones no controladas podían filtrar SQL, rutas y credenciales | Render centralizado con mensajes genéricos y correlation ID; cabeceras de seguridad en todas las respuestas | 4.3, 6.3 | `SecureErrorAndHealthTest`, `ConfiguracionSeguraTest` | **Corregida** |

---

## 2. OWASP API Security Top 10:2023 — estado al cierre

| API # | Nombre | Estado al cierre |
|---|---|---|
| API1 | Broken Object Level Authorization | **Cerrada.** `uploadDocumento`, `getDocumentos` y `ProviderController::store` derivan identidad de Sanctum y pasan por `ProveedorPolicy`. Cubierta por `MatrizAutorizacionTest`, que recorre no autenticado, rol incorrecto, ownership ajeno, ID inexistente y estado inválido. |
| API2 | Broken Authentication | **Cerrada.** Reglas de contraseña, normalización de correo, respuesta no enumerable con tiempo constante (task 3.1) y tokens con expiración (task 6.3). |
| API3 | Broken Object Property Level Authorization | **Cerrada.** `ProveedorResource`, `ServicioResource` actor-aware y `PublicacionServicioResource` declaran allowlist explícita; `destinatario_id` y `proveedor_id` se derivan del servidor. |
| API4 | Unrestricted Resource Consumption | **Cerrada.** Rate limiting en todos los flujos sensibles, incluido `POST /pedidos`. El catálogo de publicaciones pagina; `GET /providers` sigue sin paginar (ver §3). |
| API5 | Broken Function Level Authorization | **Sin hallazgo.** `EnsureIsAdmin` verifica el rol y todas las rutas `/admin/*` están agrupadas bajo él. |
| API6 | Unrestricted Access to Sensitive Business Flows | **Cerrada.** Mensajería exige un Servicio común (task 2.3); publicar pedidos tiene límite; cotizaciones y créditos ya usaban locks e idempotencia. |
| API7 | Server Side Request Forgery | **No aplica.** El backend no hace requests HTTP salientes a URLs provistas por el usuario ni a terceros. |
| API8 | Security Misconfiguration | **Cerrada.** Sin secretos versionados, `APP_DEBUG=false` por defecto, CORS por ambiente, cabeceras de seguridad en backend y Nginx, sin sesión de navegador en un servicio de API. |
| API9 | Improper Inventory Management | **Riesgo residual aceptado.** Sigue sin haber una especificación consolidada (OpenAPI/Postman) de las ~50 rutas. Ver §3. |
| API10 | Unsafe Consumption of APIs | **No aplica.** El backend no consume APIs de terceros. |

---

## 3. Riesgos residuales aceptados

Fecha de revisión sugerida: **2026-12-08** (90 días desde el cierre) o antes de cualquier salida a producción real, lo que ocurra primero.

| Riesgo | Por qué se acepta | Qué lo dispararía a "corregir ya" |
|---|---|---|
| **Bearer accesible a JavaScript en web** | Cerrarlo exige mover la sesión a cookie `httpOnly` + CSRF, lo que cambia Sanctum, CORS y todo el cliente: es un cambio de alcance propio. Se mitiga con CSP `script-src 'self'` (task 4.2) y limpieza completa al cerrar sesión (task 3.4). Documentado en `frontend/src/services/storage.js`. | Cualquier funcionalidad que renderice HTML o contenido de usuario sin sanitizar. |
| **Advisories transitivos del árbol de Expo SDK 52** (`metro`, `tar`, `postcss`, `@xmldom/xmldom`) | Son dependencias de build, no del bundle que se sirve, y cerrarlas exige subir de SDK mayor. `npm audit` corre en CI de forma informativa para que el inventario quede en cada PR. | Que alguno pase a afectar código que llega al navegador, o que aparezca un exploit activo. |
| **Nombres de archivo de uploads sin sanear** | Flysystem/`storeAs` no permite escapar del directorio destino, y el nombre nunca se refleja en HTML. `PublicacionServicioController` ya usa solo la extensión validada. | Que algún flujo empiece a devolver el nombre original en una respuesta que el navegador interprete. |
| **Sin logging ni alerting de eventos de seguridad** (A09) | No hay fuga de datos sensibles en logs, que es lo que bloqueaba; falta la capacidad de *detección*, que es una capacidad operativa nueva y no una corrección. | Un incidente real, o el paso a un entorno con usuarios reales. |
| **Sin inventario consolidado de la API** (API9) | AGENTS.md §8 exige documentar cada endpoint nuevo; falta el documento único. | Que se abra la API a un consumidor externo. |
| **`GET /providers` y `GET /providers/{id}/calificaciones` sin paginar** | Requiere autenticación en el segundo caso y el volumen actual es de decenas de filas. | Crecimiento del catálogo, o un incidente de consumo de recursos. |
| **CORS con comodín en `local`** | Solo aplica con `APP_ENV=local`. Con `APP_ENV=production` la lista viene de `CORS_ALLOWED_ORIGINS` y, vacía, el navegador bloquea todo cross-origin (verificado en §4). | Que alguien despliegue con `APP_ENV=local` en un servidor accesible. |

---

## 4. Evidencia de cierre (2026-09-08)

### Suite backend canónica

```
docker compose --profile test run --rm backend_test
Tests:  276 passed (1009 assertions)
```

Imagen: `servigt-backend_test:latest`, PHP 8.3 sobre `php:8.3-cli`, Laravel Framework 13.30.1, PostgreSQL 16 (`db_test`) con `database/init.sql`.

### Suite frontend y build web

```
npx jest --ci
Test Suites: 12 passed, 12 total
Tests:       107 passed, 107 total

npm run build:web
Exported: dist
```

### Cadena de suministro reproducible (task 1.4)

Dos builds `docker build --no-cache` del mismo commit:

```
build 1: 111 paquetes, sha256: ce5135160c78ca3b
build 2: 111 paquetes, sha256: ce5135160c78ca3b
```

`composer audit`: `No security vulnerability advisories found.`

### Arranque con volumen limpio (task 4.1)

Sin `.env`, el contenedor **no arranca**:

```
[!] Faltan variables de entorno obligatorias: APP_KEY DB_PASSWORD ADMIN_PASSWORD
```

Con `.env` completo y `docker compose down -v` previo:

```
[*] Configuracion efectiva:
    app.env=local  app.debug=false  cors.allowed_origins=*
[*] Admin por defecto creado: admin@servigt.gt
```

- La credencial legada `admin@gmail.com` / `admin` responde **401**; la del `.env` responde **200**.
- Ninguna contraseña aparece en `docker logs servigt_backend` (0 coincidencias).

### CORS por ambiente (tasks 4.1 y 4.2)

Con `APP_ENV=production` y `CORS_ALLOWED_ORIGINS=http://localhost:8087`:

```
app.env=production  app.debug=false  cors.allowed_origins=http://localhost:8087
```

Un preflight desde `Origin: https://atacante.example` recibe `Access-Control-Allow-Origin: http://localhost:8087`, que **no coincide** con el origen que pidió, así que el navegador bloquea la respuesta. El origen autorizado sí coincide y pasa.

### Cabeceras del frontend productivo (task 4.2)

`curl -I http://localhost:8087/` devuelve CSP (`script-src 'self'`), `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `Permissions-Policy` y las tres cabeceras de aislamiento de origen. Se verificó que también salen en respuestas 404 y sobre el bundle con hash.

### ZAP Baseline local (task 6.3)

Escaneos contra el stack local con datos sintéticos, sin tocar ningún entorno remoto. Reportes en `docs/security/evidencia/`.

**Frontend productivo** (`http://frontend_prod:80`):

| | Antes de 4.2/6.3 | Después |
|---|---|---|
| FAIL | 0 | 0 |
| WARN | 4 | 3 |
| PASS | 63 | 64 |

Las 3 advertencias restantes se aceptan:
- `CSP: style-src unsafe-inline` — react-native-web inyecta las hojas de estilo en tiempo de ejecución; quitarlo rompe toda la UI. `script-src` sí es estricto, que es la directiva que mitiga XSS.
- `Storable but Non-Cacheable Content` y `Modern Web Application` — informativas, describen correctamente una SPA con `index.html` sin caché.

**API** (`http://backend:8000`):

| | Antes de 6.3 | Después |
|---|---|---|
| FAIL | 0 | 0 |
| WARN | 10 | 2 |
| PASS | 57 | 65 |

Cerradas en el camino: CSP ausente, falta de anti-clickjacking, `X-Content-Type-Options` ausente, `X-Powered-By` expuesto, cookie de sesión sin `HttpOnly` y las tres cabeceras de aislamiento de origen. Se retiró el grupo de middleware `web` (el backend no tiene vistas ni sesión de navegador) y los estáticos `robots.txt`/`favicon.ico`, que se servían fuera del middleware.

Las 2 restantes se aceptan:
- `Non-Storable Content` — informativa y correcta para una API.
- `Cross-Domain Misconfiguration` — es el comodín de CORS con `APP_ENV=local`; con `APP_ENV=production` queda restringido, según lo verificado arriba.

---

## 5. Resumen

De los hallazgos levantados el 2026-08-28:

- **17 corregidas con prueba que falla antes y pasa después**, incluidas las cuatro de severidad Alta (los dos BOLA sobre documentos, el mass assignment de `user_id` y la exposición de documentos de identidad por storage público).
- **2 categorías sin hallazgo** tras revisión (A05 Injection, API5 BFLA), más el invariante de créditos y cotizaciones de A08, que ya estaba correctamente implementado.
- **2 categorías no aplicables** (API7 SSRF, API10 Unsafe Consumption): el backend no realiza requests HTTP salientes.
- **6 riesgos residuales aceptados** con fecha de revisión y disparador explícito (§3).

A diferencia de la versión inicial de esta matriz, que era puramente un registro de auditoría sin cambios de código asociados, esta versión enlaza cada fila con la task que la cerró y con la prueba automatizada que impide que vuelva.
