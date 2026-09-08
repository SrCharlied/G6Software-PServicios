# Matriz OWASP antes/después — Sprint 7 ServiGT

**Task:** 6.3 · Regresión OWASP y cierre
**Antes:** `dev@50ddc0b` (28/08/2026) — estado sobre el que se levantó [`owasp-top10-matriz.md`](owasp-top10-matriz.md)
**Después:** `dev@c29a0ed` (06/09/2026)
**Estado del documento:** en construcción. Nueve tasks del sprint siguen abiertas, así que la columna *Después* de algunas filas todavía dice pendiente.

> Este documento **no reemplaza** a `owasp-top10-matriz.md`, que es el levantamiento inicial de la task 1.1. Lo que agrega es la trazabilidad que exige la task 6.3: por cada hallazgo, qué task lo cerró, en qué commit o PR y cuál prueba lo cubre. Una fila sin prueba no cuenta como cerrada.

## Cómo leer

- **Corregido** — el control está en el código y hay una prueba automatizada que falla si se retira.
- **Corregido parcial** — el control está aplicado pero queda una porción declarada y justificada.
- **Ya implementado** — la categoría se revisó en 1.1 y el control ya existía; se conserva para dejar constancia de que se revisó.
- **Pendiente** — hay una task del Sprint 7 asignada y todavía no integrada.
- **Follow-up** — hallazgo real sin task en este sprint; entra al Product Backlog con fecha de revisión.

---

## 1. Hallazgos cerrados

| # | Hallazgo | Sev. | Estado | Task | Commit / PR | Prueba que lo cubre |
|---|---|---|---|---|---|---|
| A01 | BOLA en subida de documentos: cualquier autenticado subía a nombre de otro `proveedor_id` | Alta | Corregido | 2.2 | `e7c75df` · PR #29 | `ProviderDocumentPrivacyTest` |
| A01 | BOLA en lectura de documentos: se listaban DPI y comprobantes de terceros | Alta | Corregido | 2.2 | `e7c75df` · PR #29 | `ProviderDocumentPrivacyTest` |
| A01 / A06 | Mass assignment de `user_id` en `POST /providers` | Alta | Corregido | 2.1 | `eabd355`, `d33df36` · PR #29 | `ProviderAuthorizationTest::test_store_ignora_user_id_del_payload_y_usa_el_autenticado` |
| A02 | Documentos de identidad en disco `public`, servidos por symlink sin autenticación | Alta | Corregido | 2.2 | `e7c75df` + `6dffb99` (migración de legados) · PR #29 | `ProviderDocumentPrivacyTest`, `MigrarDocumentosAPrivadoTest` |
| A01 (API3) | `GET /providers` y `/providers/{id}` exponían `email`, `user_id` y campos internos de Premium sin autenticación | Media | Corregido parcial | 2.5 | `8e7cc48` | `ProveedorSerializacionTest` |
| A01 (API1) | `GET /providers/user/{userId}` permitía leer el perfil ajeno con sus documentos, estando autenticado | Media | Corregido | 2.5 | `8e7cc48` | `ProveedorSerializacionTest::test_lookup_legado_por_user_id_ajeno_responde_403` |
| A01 (API3) | `Servicio` sin `$hidden`: el proveedor recibía `codigo_inicio` por API y podía iniciar sin el cliente | Alta | Corregido | 2.6 | `75fb272` | `ServicioResourceActorAwareTest` |
| A06 (API6) | Autocontratación y autocalificación: un proveedor recorría Flow A solo y se calificaba, inflando el orden del directorio | Media | Corregido | 2.3 | `8e7cc48`, `5f7b1e9` | `AutocontratacionYMensajeriaTest` |
| A06 (API6) | `POST /mensajes` aceptaba cualquier `receptor_id` sin relación previa | Media | Corregido | 2.3 | `5f7b1e9` | `AutocontratacionYMensajeriaTest` |
| A03 | Frontend sin lockfile versionado: la instalación no era reproducible | Baja-Media | Corregido | 1.2 | `c989c09` · PR #30 | Verificable con `npm ci` desde el lockfile |
| A04 / A07 | Token Sanctum en `localStorage` en texto plano, y logout sin limpiar cachés de chat | Media | Corregido | 3.4 | `6b7ab04` · PR #32 | `sessionStorage.test.js` |
| A10 | Excepciones no controladas podían filtrar SQL, rutas y stack traces | — | Ya implementado | 4.3 | `75fb272` | `SecureErrorAndHealthTest` |
| A05 | Inyección SQL / de comandos | — | Ya implementado | 1.1 (revisión) | — | Sin uso de SQL crudo con input; revisado por grep en 1.1 |
| A08 | Integridad de saldo, compras y adjudicación | — | Ya implementado | 1.1 (revisión) | `CreditoComprarTest`, `CotizacionCreationTest` | Locks + `idempotency_key` único por proveedor |

### Controles nuevos que no cierran un hallazgo pero suben el piso

| Control | Task | Commit / PR | Prueba |
|---|---|---|---|
| Matriz automatizada de autorización: 401 en las 54 rutas protegidas, rol incorrecto, ownership ajeno, ID inexistente y estado inválido | 2.3 | `5f7b1e9` | `MatrizAutorizacionTest` — 65 casos |
| Headers de seguridad en el export web servido por Nginx, como target separado del de desarrollo | 4.2 | `67e08e6` · PR #34 | Verificable con `curl -I` sobre `frontend_prod` |
| Manejo centralizado de 401/403/429 y revalidación de sesión contra `/me` | 3.3 | `0530c74` | `api.test.js`, `SessionContext.test.js` |
| CI que ejecuta la suite contra PostgreSQL provisionado y bloquea el PR | 1.3 | `2cb3f96` | El propio workflow `ci-backend.yml` |
| Contrato transaccional del límite de publicaciones y ausencia de estados parciales | 5.4 | `55e68a3` | `PublicacionServicioContratoTest` |

---

## 2. Hallazgos abiertos con task asignada

Verificados en el código el 07/09/2026.

| # | Hallazgo | Sev. | Task | Evidencia de que sigue abierto |
|---|---|---|---|---|
| A02 / API8 | `APP_KEY`, contraseñas de base y `APP_DEBUG: "true"` versionados en `docker-compose.yml`; `config/cors.php` con `allowed_origins => ['*']` | Media | **4.1** | `docker-compose.yml:10,39,40,120,143`; `config/cors.php:6` |
| A02 | Administrador por defecto predecible (`admin@gmail.com`) y contraseña de proveedores de ejemplo impresa en el log de arranque | Media | **4.1** | `backend/docker/sync_schema.php` |
| A03 / A08 | Backend sin `composer.json` ni `composer.lock`: cada build resuelve otro árbol. Medido: la imagen pasó de Laravel 13.29.0 a 13.30.1 entre dos builds del mismo commit | Media | **1.4** | No existe `backend/composer.json` |
| A07 | Registro acepta contraseñas de 6 caracteres, sin reglas de complejidad | Media | **3.1** | `AuthController.php:20` — `'password' => 'required|string|min:6'` |
| A01 | Portada y color de acento se presentan como beneficio Premium pero no se restringen por vigencia | Baja-Media | **2.4** | Cero menciones de Premium en `ProviderController` |
| A02 | Sin `.gitattributes`: los finales de línea dependen de la máquina de cada integrante | Baja | **1.5** | No existe `.gitattributes` en la raíz |

---

## 3. Follow-ups sin task en este sprint

Hallazgos reales del levantamiento 1.1 que **no** tienen task asignada en el Sprint 7. Se registran aquí con fecha de revisión en vez de declararse resueltos. Verificados el 07/09/2026.

| # | Hallazgo | Sev. | Evidencia | Revisar en |
|---|---|---|---|---|
| A01 (API3) | `POST /calificaciones` toma `destinatario_id` del body sin validarlo contra el `servicio_id`; se puede calificar a un proveedor sin haber tenido servicio con él. Contrasta con `calificarServicio`, que sí lo deriva | Media | `CalificacionController::store` — `'destinatario_id' => 'required|exists:users,id'` | Sprint 8 |
| A07 | No existe `config/sanctum.php`, así que los tokens **nunca expiran**. Agrava el riesgo del token en el navegador | Media | El archivo no existe | Sprint 8 |
| A01 (API3) | `GET /providers/{id}/calificaciones` expone el `email` del autor de la reseña en ruta pública | Media | `CalificacionController::porProveedor` — `with('autor')` sin Resource | Sprint 8 |
| A06 (API6) | `POST /pedidos` sin `throttle`, a diferencia de login, registro, mensajes, uploads, compras, Premium y publicaciones | Baja-Media | `routes/api.php:118` | Sprint 8 |
| A06 | Nombre original del archivo usado sin sanear al guardar en disco (solo prefijado con timestamp) | Baja | `ProviderController.php:223,257,302` | Sprint 8 |
| A09 | Sin logging ni alerta de eventos de seguridad: no se registran login fallidos, 403 ni ráfagas de 429 | Media | `bootstrap/app.php` solo loguea excepciones ≥500 | Sprint 8 |
| API9 | Sin inventario consolidado de la API (OpenAPI o equivalente) para ~60 rutas | Media | `routes/api.php` | Sprint 8 |
| A02 | El backend responde `X-Powered-By: PHP/8.3.33`, revelando la versión exacta del intérprete. **Hallazgo nuevo**, no estaba en el levantamiento 1.1: se detectó al capturar la evidencia de headers el 07/09 | Baja | `curl -I http://localhost:8085/api/health` | Sprint 8 — se cierra con `expose_php = Off` |

---

## 4. ZAP Baseline

Ver [`zap-baseline-report.md`](zap-baseline-report.md).

El escaneo se ejecuta **únicamente contra el stack local** por la red interna de Compose y con datos sintéticos, conforme al alcance ratificado del sprint. La corrida del 07/09/2026 es el **antes**: se hizo a propósito con 4.1, 3.1 y 2.4 todavía sin integrar, para que exista una línea de comparación. Sin esa corrida, el antes/después de esas tres tasks no se puede sustentar.

---

## 5. Evidencia de regresión

Ver [`regresion-sprint7.md`](regresion-sprint7.md).

---

## 6. Lectura honesta del cierre

Al 07/09/2026 hay **18 de 27 tasks integradas**. Los hallazgos de severidad **Alta** del levantamiento inicial están todos cerrados y con prueba: los tres BOLA de documentos, el mass assignment de `user_id`, el almacenamiento público de documentos de identidad y la fuga de los códigos de Flow A.

Lo que queda abierto se concentra en configuración (4.1), cadena de suministro (1.4) y política de contraseñas (3.1). Ninguno de los tres es una vulnerabilidad de acceso: son deuda de configuración y de reproducibilidad, con impacto acotado a un entorno local según `AGENTS.md` §13, y con task asignada.

El éxito de este sprint no es afirmar que ServiGT quedó sin vulnerabilidades. Es que **cada riesgo identificado tiene hoy un estado explícito**: corregido con prueba, pendiente con task, o aceptado con fecha de revisión. Ninguna fila de este documento dice "resuelto" sin una prueba que lo respalde.
