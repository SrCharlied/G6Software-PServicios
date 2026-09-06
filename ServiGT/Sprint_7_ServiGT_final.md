# Sprint 7 – ServiGT

## Información del Sprint

- **Inicio:** miércoles 26 de agosto de 2026
- **Entrega:** miércoles 9 de septiembre de 2026
- **Duración:** 15 días calendario, 11 días hábiles incluyendo la entrega
- **Equipo:** 6 integrantes
- **Capacidad técnica estimada:** 47 Story Points
- **Rama de integración:** `dev`
- **Línea base técnica:** `origin/dev` en `35770f8`
- **Tema académico anticipado:** vulnerabilidades comunes basadas en OWASP Top 10
- **Referencia principal:** [OWASP Top 10:2025](https://owasp.org/Top10/2025/)
- **Referencia complementaria para APIs:** [OWASP API Security Top 10:2023](https://owasp.org/API-Security/editions/2023/en/0x00-toc/)
- **Tendencia de velocidad:** Sprint 1 = 22 SP · Sprint 2 = 28 SP · Sprint 3 = 36 SP · Sprint 4 = 42 SP · Sprint 5 = 45 SP · Sprint 6 = 47 SP objetivo · **Sprint 7 = 47 SP objetivo**
- **Guía académica oficial:** pendiente de publicación. Se reservan actividades transversales desde el inicio para evitar agregar trabajo administrativo tarde en Jira.

> Los fines de semana del 29–30 de agosto y 5–6 de septiembre son **buffer opcional**, no días comprometidos de desarrollo.

---

# Objetivo del Sprint

## Versión extensa

El Sprint 7 tiene como objetivo completar un pendiente funcional central de ServiGT y endurecer la seguridad del incremento construido hasta el Sprint 6. El equipo creará un módulo propio de publicaciones de servicios ofrecidos para que cada proveedor administre su catálogo sin confundir una oferta con una contratación. En paralelo identificará, corregirá y documentará vulnerabilidades comunes tomando como base OWASP Top 10:2025 y OWASP API Security Top 10:2023, con énfasis en control de acceso, autenticación, documentos privados, configuración segura, dependencias reproducibles y regresión automatizada.

El sprint no busca declarar que ServiGT queda “100 % seguro”. Busca producir una mejora verificable: riesgos concretos antes y después, controles aplicados en código y configuración, pruebas de abuso, auditorías de dependencias reproducibles y evidencia técnica vinculada con las categorías OWASP relevantes.

## Versión corta

Permitir que proveedores publiquen sus servicios —uno gratis y hasta tres con Premium— mientras se reducen vulnerabilidades reales mediante OWASP, pruebas y configuración segura.

---

# Enfoques del Sprint

## Enfoque 1 — Control de acceso y datos sensibles

- Corregir acceso horizontal indebido a documentos de proveedores.
- Mover documentos de identidad fuera del almacenamiento público.
- Proteger descarga y consulta mediante ownership o rol administrador.
- Validar permisos por rol y por recurso en endpoints críticos.
- Alinear portada y personalización con el beneficio Premium ratificado.

## Enfoque 2 — Autenticación, sesión y abuso

- Fortalecer política de contraseñas.
- Limitar intentos sobre login, registro y operaciones costosas.
- Manejar expiración y respuestas 401 de forma centralizada.
- Reducir exposición del token según plataforma.
- Evitar filtración de detalles internos en errores.

## Enfoque 3 — Configuración y cadena de suministro

- Sustituir instalaciones no deterministas por manifests y lockfiles.
- Revisar vulnerabilidades de npm y Composer sin aplicar actualizaciones destructivas a ciegas.
- Eliminar secretos y modo debug del archivo Compose versionado.
- Restringir CORS por ambiente.
- Agregar headers de seguridad y checks automáticos en GitHub Actions.

## Enfoque 4 — Pruebas y evidencia OWASP

- Crear matriz de riesgo antes/después.
- Agregar casos negativos de permisos, roles, IDs, uploads y rate limiting.
- Ejecutar análisis de dependencias y escaneo dinámico local básico.
- Mantener Flow A, Flow B, créditos y Premium sin regresiones.
- Preparar evidencia vinculada a cada control implementado.

## Enfoque 5 — Catálogo de servicios ofrecidos

- Crear una entidad `publicaciones_servicio` distinta de la contratación `Servicio`.
- Permitir al proveedor crear, editar, activar, desactivar y consultar sus publicaciones.
- Permitir una publicación activa al proveedor gratuito y hasta tres al proveedor Premium activo.
- Mostrar las publicaciones en el perfil público del proveedor.
- Iniciar una solicitud directa desde una publicación sin confiar en IDs o precios enviados por el frontend.
- Mantener una referencia opcional `servicio → publicación` para conservar el origen de la contratación.

---

# Línea base confirmada — no se vuelve a estimar

Al inicio del Sprint 7, `origin/dev` en `35770f8` tiene:

- Flow A y Flow B funcionales.
- Revamp visual de cliente, proveedor y administrador.
- Navegación móvil y layouts internos responsive.
- Paquetes y compra simulada de créditos.
- Idempotencia por proveedor en compra de créditos.
- Premium por ciclos de 30 días y bono de 10 créditos.
- Saldo, historial, checkout y administración de monetización.
- Portada y color de acento para perfil proveedor.
- 104 pruebas backend con 451 assertions en verde, ejecutadas con `docker compose --profile test run --rm backend_test`.
- 48 pruebas frontend en verde, en 5 suites.
- Build web exitoso.
- Esquema PostgreSQL reaplicable de forma idempotente.
- Sprint 6 fusionado a `main`; correcciones posteriores presentes en `dev`.

Este trabajo no se reestima. Sprint 7 agrega controles de seguridad y pruebas sobre esta línea base.

> **Cómo se reproduce el verde del backend.** El único comando válido es `docker compose --profile test run --rm backend_test`. Ese perfil levanta `db_test`, que recibe `init.sql` por `docker-entrypoint-initdb.d`, y el entorno de Compose hace que la aplicación resuelva `pgsql` sobre el host `db_test` —verificado: `config('database.default') = pgsql`, `variables_order = EGPCS`—. Ejecutar `php artisan test` en el contenedor **sin** ese entorno cae al SQLite en memoria que declara `phpunit.xml`, donde no existen las tablas, y produce decenas de fallos de `no such table`. No es un fallo de la suite sino del entorno, y es la trampa que debe evitar el job de CI de la task 1.3.

> **El conteo de pruebas depende del build.** La imagen verificada reporta 104 tests, que son exactamente los 104 métodos `test_` versionados. Una construcción distinta puede reportar más si el esqueleto de Laravel aporta sus propios `ExampleTest`. La imagen actual corre sobre **Laravel Framework 13.29.0**, resuelto por un `composer create-project laravel/laravel` sin versión fija: dos builds en fechas distintas producen backends distintos. Por eso toda evidencia de pruebas debe citar comando, imagen y fecha, y por eso existe la task 1.4.

> **Advertencia sobre la cobertura de partida.** La cobertura se concentra en monetización, pedidos y cotizaciones. Flow A sí tiene camino feliz ejercitado de extremo a extremo: `MonetizacionNoRompeFlujosTest` y `CreditosYAceptacionTest` llaman las rutas reales de creación, aceptación, inicio, finalización y confirmación de servicios. Lo que **no** existe es una suite dedicada de `AuthController`, `ProviderController`, `MessageController` o documentos, ni una matriz negativa amplia de autorización sobre `ServicioController`. Los Epics 2 y 3 escriben esas primeras pruebas, así que el número 104 no debe leerse como cobertura de autorización.

---

# Hallazgos técnicos que justifican el Sprint 7

La auditoría inicial encontró riesgos verificables en el código actual:

1. `GET /providers/{id}` es público y serializa la relación `documentos`, incluyendo nombre y ruta del archivo.
2. `GET /providers/{id}/documentos` permite consultar documentos sin comprobar ownership o rol administrador.
3. `POST /providers/{id}/documentos` permite subir un documento a otro proveedor porque no valida ownership.
4. Los documentos de identidad se guardan en el disco `public` y reciben una URL pública.
5. `POST /providers` acepta `user_id` enviado por el cliente en vez de derivarlo del usuario autenticado.
6. Login y registro no tienen rate limiting específico.
7. Registro permite contraseñas de solo seis caracteres.
8. CORS permite cualquier origen, método y header.
9. `docker-compose.yml` contiene `APP_KEY`, contraseñas y `APP_DEBUG=true` versionados.
10. El frontend guarda el bearer token web en `localStorage`.
11. El chat persiste conversaciones completas en almacenamiento accesible a JavaScript y logout no limpia esos cachés.
12. El frontend no tiene lockfile versionado y la instalación reporta dependencias vulnerables.
13. El backend se construye con `composer create-project` y `composer require` sin `composer.json` ni `composer.lock` propios, por lo que no es reproducible. Medido: la imagen construida el 25 de agosto resolvió **Laravel Framework 13.29.0** y Sanctum 4.3.3; nada en el repositorio fija esas versiones, así que un rebuild posterior puede traer otro framework y hasta un conteo de pruebas distinto.
14. No existe pipeline de CI publicado para tests, auditoría de dependencias o detección de secretos.
15. El contenedor frontend ejecuta `expo start --web`; la configuración Nginx existente no participa en ese despliegue ni aporta headers de seguridad.
16. Varios listados devuelven colecciones completas sin paginación o límites configurables seguros.
17. En entorno local, el catch-all puede devolver el mensaje interno de una excepción al cliente.
18. Los endpoints nuevos de portada no tienen cobertura automática de permisos y archivos inválidos.
19. La personalización se presenta como beneficio Premium, pero backend y frontend no restringen su uso según vigencia.

20. `Servicio` no define `$hidden`, por lo que `GET /servicios/proveedor` y `GET /servicios/{id}` entregan `codigo_inicio` y `codigo_fin` a ambas partes. El proveedor puede leer el código de inicio y llamar `POST /servicios/{id}/iniciar` sin que el cliente se lo entregue, lo que deja el control de dos códigos de Flow A sin efecto real. Evidencia: `app/Models/Servicio.php` líneas 14–29 sin `$hidden`; `ServicioController.php` línea 83 devuelve el modelo crudo; `iniciar()` compara con `hash_equals` un secreto ya entregado por API.
21. `Proveedor` tampoco define `$hidden` y `GET /providers` es público y sin paginación, así que un cliente anónimo obtiene `email`, `telefono`, `user_id`, `premium_ciclo_key` y `premium_renovaciones` de todos los proveedores. El hallazgo 1 solo cubre la relación `documentos`. Evidencia: `app/Models/Proveedor.php` sin `$hidden`; `ProviderController::index()` líneas 18–20.
22. `GET /providers/user/{userId}` es un segundo camino a los mismos documentos: está bajo `auth:sanctum`, acepta cualquier `userId` y carga la relación `documentos`. Es la ruta que consume `SessionContext.restore()`. Evidencia: `ProviderController::showByUser()` líneas 37–48.
23. `docker/sync_schema.php` versiona credenciales de administrador por defecto: `admin@gmail.com` con contraseña `admin` y rol `admin`, aseguradas en cada arranque sobre base nueva, más `Proveedor123!` para los diez proveedores de ejemplo, **que además se imprime en el log de arranque del contenedor**. El riesgo no es que existan datos de demostración locales, sino que el acceso administrativo sea predecible y que una contraseña viaje a los logs. Evidencia: `docker/sync_schema.php` líneas 71–73, 105 y 161.
24. `POST /servicios` no verifica que el usuario autenticado tenga rol `cliente` ni que `proveedor_id` sea distinto de su propio perfil. Un proveedor puede solicitarse un servicio a sí mismo, aceptarlo, iniciarlo aprovechando el hallazgo 20, finalizarlo, confirmarlo y calificarse; `CalificacionObserver` recalcula `calificacion_promedio`, que es el campo por el que ordena el directorio público. Evidencia: `ServicioController::store()` líneas 15–45.
25. `POST /mensajes` permite escribir a cualquier `user_id` sin exigir servicio, pedido o cotización en común; solo bloquea enviarse mensajes a uno mismo. El rate limiting acota el volumen, no el diseño. Evidencia: `MessageController::store()` líneas 12–33.

> Estos hallazgos son la línea base del sprint, no una declaración de explotación en producción.

> Los hallazgos 20 a 25 se agregaron tras verificar los diecinueve iniciales contra `origin/dev` en `35770f8`. El hallazgo 20 se corrige con serialización actor-aware en 2.6; el 21 con allowlist pública en 2.5. El hallazgo 22 comparte filtración de campos, pero además es BOLA porque permite elegir un `userId` ajeno: su ownership se corrige en 2.1 y el contrato `/providers/me` se cierra en 2.5.

---

# Mapeo OWASP aplicable

| Categoría | Aplicación en ServiGT | Epics |
|---|---|---|
| A01:2025 Broken Access Control | Ownership, roles, documentos, administración, Premium, campos serializados y códigos de Flow A | 2 |
| A02:2025 Security Misconfiguration | CORS, debug, secretos, headers, respuestas de health | 4 |
| A03:2025 Software Supply Chain Failures | npm, Composer, versiones reproducibles y CI | 1 |
| A04:2025 Cryptographic Failures | Manejo de tokens, llaves y datos sensibles | 3 y 4 |
| A05:2025 Injection | Validación, allowlists, filtros y pruebas con entradas hostiles | 5 |
| A06:2025 Insecure Design | Matriz de riesgo, amenazas y abuso de flujos | 1 |
| A07:2025 Authentication Failures | Contraseñas, rate limiting, tokens y expiración de sesión | 3 |
| A08:2025 Software or Data Integrity Failures | Lockfiles, imágenes reproducibles y checks de integridad | 1 |
| A09:2025 Security Logging and Alerting Failures | Eventos auditables sin datos sensibles | 6 |
| A10:2025 Mishandling of Exceptional Conditions | Error genérico, fail-closed y regresión de casos anormales | 4 y 6 |

## Mapeo OWASP API complementario

Se priorizan especialmente:

- API1:2023 Broken Object Level Authorization.
- API2:2023 Broken Authentication.
- API3:2023 Broken Object Property Level Authorization — hallazgos 20 y 21, cubiertos por 2.5 y 2.6.
- API4:2023 Unrestricted Resource Consumption.
- API5:2023 Broken Function Level Authorization.
- API6:2023 Unrestricted Access to Sensitive Business Flows — hallazgos 20, 24 y 25.
- API8:2023 Security Misconfiguration.
- API9:2023 Improper Inventory Management.

---

# Decisiones técnicas ratificadas para Sprint 7

## Alcance de seguridad

- El trabajo se realiza únicamente en desarrollo/local y ramas del repositorio.
- No se atacan servicios de producción ni sistemas de terceros.
- No se utilizan credenciales, tarjetas, documentos o información real de usuarios.
- Los datos de prueba llevan prefijo identificable y se eliminan de forma dirigida.
- OWASP es una guía de riesgos, no una certificación automática de seguridad.
- Cada hallazgo debe vincularse con evidencia de código, prueba o configuración.

## Autenticación y sesión

- Se mantiene Laravel Sanctum.
- No se reemplaza toda la arquitectura por JWT.
- Native utiliza almacenamiento seguro por plataforma cuando esté disponible.
- Web reduce persistencia del token y se protege adicionalmente con CSP y manejo centralizado de 401.
- Migrar completamente web a cookies HttpOnly puede quedar como follow-up si excede la capacidad; no se declara resuelto si el bearer token sigue accesible a JavaScript.
- MFA y recuperación de contraseña segura quedan fuera salvo que la guía oficial los exija.

## Dependencias

- No se usa `npm audit fix --force` de forma automática.
- Cada vulnerabilidad alta o crítica se clasifica por paquete, ruta transitiva, explotabilidad en ServiGT y actualización compatible.
- Los riesgos residuales aceptados quedan documentados con justificación y fecha de revisión.
- Frontend y backend deben construir a partir de manifests y lockfiles versionados.

## Documentos y archivos

- Fotos y portadas públicas permanecen separadas de documentos de identidad.
- Documentos de identidad se almacenan en disco privado.
- Solo el propietario y un administrador autorizado pueden consultar o descargar documentos.
- La respuesta pública del proveedor nunca incluye la ruta privada del documento.
- Nombres físicos de archivo son aleatorios; el nombre original solo puede conservarse como metadato seguro.
- Se validan extensión, MIME, tamaño y errores de almacenamiento.

## Serialización y respuestas de la API

- Ningún endpoint **de proveedor o de servicio** devuelve un modelo Eloquent crudo. El resto del backend —notificaciones, disponibilidad, mensajes, calificaciones— sigue serializando modelos y queda fuera del alcance de este sprint; se registra como riesgo residual con fecha de revisión en vez de declararse resuelto.
- El patrón de referencia ya existe en el repositorio: `app/Http/Resources/PedidoResource.php` es el único serializador con allowlist del backend y es el molde a replicar.
- Se crean `ProveedorResource` y `ServicioResource` con ese molde en vez de agregar `$hidden` modelo por modelo, para que la matriz 2.3 tenga un punto único donde probar qué campos salen.
- La respuesta pública de proveedor excluye `email`, `user_id`, `premium_ciclo_key`, `premium_renovaciones`, documentos y demás metadatos internos.
- Para evitar una regresión silenciosa, Sprint 7 conserva el contrato funcional actual de `telefono`: puede aparecer en catálogo, detalle público y resumen de solicitud. Cualquier reducción futura de esa exposición requiere decisión de producto y migración de búsqueda/UI.
- El estado Premium público se representa mediante un campo derivado mínimo (`es_premium` o contrato equivalente acordado con PT); no se publican ciclo, renovaciones ni datos de acreditación. El perfil propio obtiene el detalle completo desde su endpoint autenticado de Premium.
- La respuesta de servicio no incluye `codigo_inicio` para el proveedor ni serializa códigos fuera del actor, estado y transición que corresponden.
- Un campo nuevo en un modelo no aparece en una respuesta salvo que se agregue explícitamente al Resource.

## Configuración y despliegue web

- El servicio Nginx con `expo export` se agrega como **target adicional** (`frontend_prod`), no reemplaza el servicio de desarrollo: el equipo conserva `expo start --web` con hot reload.
- Se asume explícitamente que ese target cambia el contrato de red: puerto `8086:80` en vez de `8086:8081`, `EXPO_PUBLIC_API_URL` relativo (`/api`) porque `frontend/nginx/default.conf` ya hace `proxy_pass` a `backend:8000`, y CORS deja de aplicar en web por ser mismo origen.
- Por lo anterior, la restricción de CORS de la task 4.1 **no** se demuestra desde el frontend web servido por Nginx, que sería mismo origen, ni desde el cliente nativo, que no aplica CORS. Se demuestra inspeccionando los headers con `curl -H 'Origin: https://origen-no-autorizado'` y con una petición cross-origin real desde un navegador.
- Toda variable nueva se declara en el entorno del servicio y debe ser consumida por un archivo de `config/*.php`. Solo se materializa además en el heredoc de `backend/docker/entrypoint.sh` cuando exista una razón explícita para escribirla en `/app/.env`; no se mantienen dos fuentes con valores competidores.
- La verificación válida es leer `config()` dentro del contenedor después de `config:clear`, no limitarse a revisar Compose o `.env`.

## Mensajería — ratificada

**Un usuario no puede escribirle a otro sin relación previa.** El canal se abre únicamente a través de un servicio, originado por una solicitud directa o por la publicación de un proveedor. Esta decisión cierra el hallazgo 25 con corrección, no con riesgo residual.

- La regla operativa es una sola y es verificable: **`POST /mensajes` exige que exista un `Servicio` que vincule a emisor y receptor**, en cualquiera de los dos sentidos. No hay un segundo mecanismo de contacto.
- El origen de ese servicio puede ser una solicitud directa de Flow A o una contratación iniciada desde una publicación (task 5.6). En ambos casos el servicio existe antes que el primer mensaje, así que la regla no necesita casos especiales.
- El rate limiting de la task 3.2 sigue aplicando, pero acota el volumen del abuso, no quién puede contactar a quién. Ninguna de las dos medidas sustituye a la otra.
- **Consecuencia sobre Flow B, ratificada explícitamente:** antes de la adjudicación existe una cotización, no un servicio, así que cliente y proveedor **no** pueden chatear durante la fase de ofertas. Es coherente con el diseño actual: `PedidoController::show` ya oculta la identidad del proveedor a quien no es el dueño del pedido, y abrir el chat ahí filtraría justamente eso. Al adjudicar se crea el servicio y el canal queda abierto.
- **Consecuencia sobre la UI, a corregir:** hoy `ProviderDetailScreen` ofrece un botón de chat desde el perfil público, sin relación previa. Ese es el hallazgo 25 realizado en pantalla. El botón se retira o se convierte en la acción de solicitar el servicio, que es la que sí abre el canal.
- Solicitudes de contacto, bloqueo y reporte **no** entran a este sprint: son diseño adicional y van al Product Backlog. Lo que entra es la regla de autorización y su prueba.

## Premium y personalización

- Premium y verificación de identidad siguen siendo conceptos distintos; la regla viene de `AGENTS.md` §6 y §9 y no se relaja en este sprint. El repositorio tiene `ui/PremiumBadge.js` y `provider/ProviderBadges.js` (`Stars`, `StatusBadge`); **no existe un `VerifiedBadge`** y este sprint no lo crea. La validación de documentos permanece sin UI: `estado_validacion` sigue en `pendiente` porque nada lo mueve.
- Portada y color de acento se consideran personalización Premium durante Sprint 7.
- Un proveedor sin Premium recibe 403 al modificar personalización Premium.
- Vencimiento Premium no borra archivos automáticamente; bloquea nuevas modificaciones y aplica el fallback visual definido.
- Esta regla debe quedar cubierta por pruebas y comunicada claramente en UI.

## Publicaciones de servicios ofrecidos

- `Servicio` conserva su significado actual: contratación entre cliente y proveedor.
- La nueva entidad se denomina `PublicacionServicio` y usa la tabla `publicaciones_servicio`.
- Proveedor gratuito: máximo **1 publicación activa**.
- Proveedor Premium activo: máximo **3 publicaciones activas**.
- Publicaciones inactivas no consumen el límite, pero no aparecen en el catálogo público.
- Vencer Premium no borra publicaciones. El catálogo público aplica de inmediato un límite **efectivo**: conserva visible la publicación activa más antigua (`created_at`, luego `id`) y oculta el excedente sin mutar durante el `GET`. La siguiente operación autenticada de escritura normaliza los flags `activa` dentro de transacción y bajo lock; al renovar, el proveedor puede reactivar publicaciones hasta su nuevo límite.
- Solo el propietario administra sus publicaciones; admin puede moderar mediante ruta explícita si entra en alcance.
- Crear una contratación desde una publicación deriva proveedor, categoría y datos base desde backend; el cliente no decide el proveedor mediante un ID confiado ciegamente.
- El precio publicado es referencial y no sustituye `monto_acordado` de la contratación.
- Galería múltiple, destacados pagados, analytics y moderación avanzada quedan para un sprint posterior.

---

# Modelo centralizado de trabajo

| Integrante | Frente técnico principal | SP | Horas estimadas |
|---|---|---:|---:|
| CL — Carlos López | CI backend, controles de autorización, Resource público, pruebas del catálogo y regresión OWASP | 8 | 24 h |
| JA — Juan Salguero | Ownership, documentos privados, autenticación y límites de publicaciones | 8 | 24 h |
| MR — Mar | Baseline OWASP, dependencias/CI frontend, componentes y pruebas UI de publicaciones | 7 | 21 h |
| AS — Antony Saz | ServicioResource y Flow A, rate limiting, errores backend y API de publicaciones | 8 | 24 h |
| PT — Pablo Toledo | Sesión frontend, build web seguro y contratación visual desde publicaciones | 8 | 24 h |
| D — David López | Build backend, configuración, personalización Premium y esquema de publicaciones | 8 | 24 h |
| **TOTAL** |  | **47 SP** | **141 h** |

> La asignación prioriza frentes coherentes y minimiza dependencias cruzadas. `PublicacionCard` (6.1) alimenta 5.5 y 5.6, por lo que sigue en la ruta de publicaciones aunque pueda comenzar con fixtures. Health se integra en 4.3 y la validación UX de uploads pasa al Product Backlog; ninguna de las dos desaparece sin trazabilidad.

> **Riesgo de estimación conocido.** La task 3.3 permanece en 2 SP, pero el cambio alcanza el patrón de error de todas las funciones exportadas de `api.js`. Si al cierre del 3 de septiembre solo existe el interceptor y la limpieza de sesión, 3.3 permanece `In Progress`: no se marca Done ni acredita todos sus SP.

> Jira, LOGT, informe académico, retrospectiva y evidencias administrativas se planifican desde el inicio, pero no inflan los SP técnicos individuales.

> **Sobre el cambio de 45 a 47 SP — decidido.** El equipo ratificó 47 SP como una apuesta deliberada sobre la velocidad demostrada de 45. La redistribución posterior no aumenta ese objetivo: intercambia alcance periférico por estimaciones más honestas en configuración, serialización y publicaciones.
>
> **Ownership final.** El contrato de proveedor (2.5) queda con CL y el contrato sensible de servicios/Flow A (2.6) con AS. MR conserva un frente acotado: baseline, lockfile/CI frontend, componentes presentacionales y pruebas UI. PT asume la integración visual cross-stack de 5.6; D conserva build, configuración y esquema. Las cargas quedan entre 7 y 8 SP.

## Reglas de ownership y revisión

- Cada task tiene un owner y un reviewer principal.
- Ninguna persona aprueba su propio PR.
- Los PR regresan a `dev` desde feature branches actualizadas.
- Un PR debe cubrir una sola task o un corte técnico claramente justificable.
- Los cambios en auth, documentos, Docker, CORS y middleware requieren revisión de dos integrantes cuando afecten un límite de seguridad.
- CL coordina la matriz OWASP, pero no se convierte en reviewer universal.
- La evidencia de cada task la adjunta su owner antes de moverla a Done.

---

# Reestimación cerrada para cargar Jira

El equipo conserva el objetivo deliberado de **47 SP**, pero redistribuye alcance para que las tasks críticas no dependan de estimaciones que el propio plan consideraba inverosímiles:

| Ajuste | Resultado |
|---|---|
| 1.3 se divide | 1.3 cubre CI backend y 1.5 cubre CI frontend, audits, secretos y `.gitattributes`; el total del Epic 1 permanece en 8 SP. |
| 2.5 se divide | 2.5 cubre `ProveedorResource` y contratos públicos/propios; 2.6 cubre `ServicioResource`, códigos por actor y regresión de Flow A. |
| 4.1 sube de 1 a 2 SP | Refleja secretos, CORS, debug, seeds, variables y verificación de arranque. |
| 4.4 se absorbe en 4.3 | Health mínimo y su prueba forman parte del endurecimiento de excepciones; no desaparecen sus criterios. |
| 5.4 sube de 1 a 2 SP | Cubre CRUD, autorización, límites, vencimiento, rollback y contrato transaccional sin fingir concurrencia. |
| 5.6 sube de 1 a 2 SP | Reconoce que cruza backend, perfil público, solicitud vinculada, snapshot y retiro del chat inválido. |
| 6.1 baja de 2 a 1 SP | Se limita a un componente presentacional y estados visuales contra fixtures; no incluye API ni reglas de cupo. |
| 6.2 pasa al Product Backlog | La validación UX de uploads es complementaria; la validación autoritativa del backend permanece en 2.2/5.2. |

Después de estos intercambios, el backlog definitivo vuelve a sumar **27 tasks, 47 SP y 141 horas**. No quedan reestimaciones abiertas antes de crear Jira; cualquier cambio posterior debe reemplazar alcance equivalente y registrarse antes de iniciar el sprint.

---

# Definition of Ready

Una task puede pasar a `In Progress` cuando:

- Fue verificada contra `origin/dev` actualizado.
- Tiene categoría OWASP y riesgo concreto asociado.
- Tiene owner, reviewer, SP, estimación horaria y fecha probable.
- Define actor, recurso y comportamiento esperado cuando toca autorización.
- Incluye criterios positivos y negativos.
- Identifica archivos probables y dependencias.
- Define qué prueba debe fallar antes de la corrección.
- No requiere secretos reales ni pruebas contra producción.
- Si toca una decisión de producto, esa decisión quedó ratificada antes de implementar.

---

# Definition of Done

Una task se considera terminada cuando:

- Está mergeada a `dev` mediante Pull Request.
- Fue revisada por el reviewer definido.
- Incluye referencia al issue de Jira y categoría OWASP.
- La prueba de seguridad correspondiente falla antes y pasa después cuando aplica.
- Happy path, no autenticado, rol incorrecto, ownership ajeno, ID inexistente y payload inválido están cubiertos cuando corresponda.
- No expone stack traces, rutas internas, tokens, passwords o datos personales en respuestas o logs.
- `docker compose --profile test run --rm backend_test` continúa en verde.
- `npm test -- --runInBand` continúa en verde.
- `npm run build:web` continúa funcionando.
- `npm audit` y Composer audit quedan adjuntos con triage, no solo con conteos.
- `git diff --check` no reporta whitespace nuevo.
- Los cambios de esquema convergen en base limpia y volumen existente.
- Los endpoints nuevos o modificados documentan método, ruta, auth, rol, request, response y errores.
- El frontend presenta 401/403/429 y fallos de red como estados reales, no como valores de negocio válidos.
- Se adjunta evidencia básica antes de mover la task a Done.

---

# Sprint Backlog

**Convención:** `[SEC]` seguridad · `[BE]` backend · `[FE]` frontend · `[DB]` base de datos · `[QA]` pruebas · `[DEVOPS]` infraestructura · `[DOC]` documentación técnica.

Las horas corresponden a `Original Estimate` de Jira. Los Story Points permanecen en la task técnica o historia según la configuración disponible del proyecto.

---

## EPIC 1 — Baseline OWASP y cadena de suministro reproducible · 8 SP

| Task | Título para Jira | SP | Horas | Owner | Reviewer | Fecha probable |
|---|---|---:|---:|---|---|---|
| 1.1 | Levantar matriz OWASP Top 10 de ServiGT con activo, amenaza, evidencia, severidad, control y riesgo residual sobre origin/dev | 1 | 3 h | MR | JA | 26/08 |
| 1.2 | Versionar package-lock, reproducir npm ci y corregir dependencias frontend vulnerables compatibles con Expo sin usar audit fix force | 2 | 6 h | MR | PT | 26–27/08 |
| 1.3 | Crear CI backend reproducible con PostgreSQL db_test, Composer audit y ejecución canónica de PHPUnit en cada PR hacia dev | 1 | 3 h | CL | D | 27–28/08 |
| 1.4 | Crear composer.json y composer.lock propios, fijar versiones Laravel/Sanctum y volver determinista el Dockerfile backend sin create-project latest | 3 | 9 h | D | JA | 26–28/08 |
| 1.5 | Crear CI frontend con npm ci, Jest, build web, npm audit, detección básica de secretos, diff check y .gitattributes | 1 | 3 h | MR | PT | 27–28/08 |
| **Total** |  | **8** | **24 h** |  |  |  |

### Criterios de aceptación del Epic 1

- La matriz cubre las diez categorías OWASP 2025 e indica cuáles aplican y cuáles no.
- `npm ci` produce el mismo árbol desde el lockfile.
- El Dockerfile frontend y CI usan `npm ci`, no `npm install`.
- `axios` y cada dependencia directa con advisory aplicable se actualizan de forma compatible y se verifica Expo antes de aceptar riesgo residual.
- El backend deja de resolver Laravel y Sanctum arbitrariamente durante cada build.
- CI corre en PR hacia `dev` y bloquea merge si fallan tests o build.
- **El job de backend provisiona PostgreSQL y aplica `init.sql`, o ejecuta la suite a través del perfil `test` de Compose.** Invocar `php artisan test` sin base de datos hace que la aplicación caiga al SQLite en memoria que declara `phpunit.xml`, donde faltan casi todas las tablas: una auditoría externa lo comprobó y obtuvo **84 fallos de 106 por `no such table`**. Es un falso rojo, pero un CI mal configurado lo reproduce en cada PR y erosiona la confianza en la suite.
- El comentario de `phpunit.xml` que afirma garantizar SQLite en memoria se corrige o se elimina: en el entorno de Compose no se cumple, y sostener una afirmación falsa en el archivo que gobierna las pruebas es lo que produjo ese diagnóstico erróneo.
- Los audits distinguen riesgo directo, transitivo, explotable y residual.
- Ningún secreto real se agrega al repositorio o al historial.
- Existe un `.gitattributes` con `* text=auto` en la raíz del repositorio. Hoy no existe. `core.autocrlf` es configuración **de cada máquina**, no del repositorio —en el equipo hay al menos un entorno con `core.autocrlf=true` efectivo, donde un cambio de 7 líneas produjo en el Sprint 6 un diff de 439—, así que la normalización se justifica como prevención de diferencias entre desarrolladores y CI, no como corrección de una propiedad del repositorio. El DoD exige `git diff --check` limpio en todos ellos.

### Archivos probables

- `ServiGT/frontend/package.json`
- `ServiGT/frontend/package-lock.json`
- `ServiGT/backend/composer.json`
- `ServiGT/backend/composer.lock`
- `ServiGT/backend/Dockerfile`
- `.github/workflows/ci.yml`
- `.github/workflows/security.yml`
- `.gitattributes`
- `docs/security/owasp-matrix.md`

---

## EPIC 2 — Control de acceso, documentos privados, serialización y Premium · 11 SP

| Task | Título para Jira | SP | Horas | Owner | Reviewer | Fecha probable |
|---|---|---:|---:|---|---|---|
| 2.1 | Derivar identidad al crear perfil y centralizar autorización de proveedor deny-by-default para ownership y acceso administrativo | 2 | 6 h | JA | CL | 31/08 |
| 2.2 | Corregir BOLA de documentos: validar ownership, mover archivos a disco privado y crear descarga autorizada para propietario o admin | 3 | 9 h | JA | D | 31/08–02/09 |
| 2.3 | Corregir autocontratación y mensajería sin servicio común, y crear matriz automatizada de autorización por rol y recurso para flujos críticos | 2 | 6 h | CL | JA | 01–02/09 |
| 2.4 | Restringir portada y color de acento a Premium activo y cubrir nunca/activo/vencido con tests de autorización | 1 | 3 h | D | AS | 01/09 |
| 2.5 | Crear ProveedorResource con contratos de catálogo, detalle público y perfil propio; reemplazar la ruta manipulable por /providers/me | 1 | 3 h | CL | PT | 01/09 |
| 2.6 | Crear ServicioResource actor-aware y entregar códigos de Flow A únicamente al actor y transición autorizados | 2 | 6 h | AS | JA | 01–02/09 |
| **Total** |  | **11** | **33 h** |  |  |  |

### Criterios de aceptación del Epic 2

- Un cliente o proveedor ajeno no puede listar, subir o descargar documentos de otro proveedor.
- `POST /providers` ignora o rechaza `user_id` enviado y deriva identidad/rol desde el usuario autenticado.
- Solo rol proveedor crea su perfil y la unicidad impide perfiles duplicados por usuario.
- Admin accede solo mediante middleware y ruta documentada.
- `GET /providers/{id}` y cualquier respuesta pública excluyen la relación, nombre y ruta de documentos.
- La ruta física privada nunca aparece en respuestas públicas.
- Los tests cubren cambio de ID, rol incorrecto y recurso inexistente.
- Portada y color Premium responden 403 cuando Premium nunca fue activado o está vencido.
- La vista pública aplica fallback seguro sin romper el perfil.
- Reemplazar o eliminar archivo limpia el archivo anterior de forma dirigida cuando corresponde.
- Los documentos existentes tienen una estrategia de migración privada sin pérdida ni exposición temporal.
- La migración a disco privado ajusta el volumen: hoy `docker-compose.yml` monta `backend_storage` en `/app/storage/app/public`, así que un archivo escrito en `/app/storage/app/private/...` queda **fuera** del volumen y se pierde en el siguiente rebuild. El mount se mueve a `/app/storage/app` o se agrega un segundo volumen, y esto se verifica con un rebuild real, no solo con la suite.
- 2.5 aplica `ProveedorResource` a `GET /providers`, `GET /providers/{id}` y `GET /providers/me`; 2.6 aplica `ServicioResource` a `GET /servicios/{id}`, `GET /servicios/proveedor` y `GET /servicios/cliente`. Los demás controladores quedan fuera de alcance y se registran como riesgo residual.
- La ruta manipulable `GET /providers/user/{userId}` deja de ser el contrato de restauración: se elimina o queda restringida a una necesidad administrativa explícita. `SessionContext.restore()` migra a `/providers/me`.
- La respuesta pública de proveedor no contiene `email`, `user_id`, `premium_ciclo_key` ni `premium_renovaciones`.
- `telefono` conserva durante Sprint 7 el contrato funcional actual: aparece en catálogo público, detalle del proveedor y resumen de solicitud, y sigue disponible para búsqueda. `email` se excluye de toda respuesta pública. Una futura reducción del teléfono se registra como decisión de privacidad/producto separada, no como parte implícita de 2.5.
- La respuesta pública expone únicamente un indicador Premium derivado necesario para el badge; nunca `premium_ciclo_key`, `premium_renovaciones` ni datos de acreditación.
- La respuesta de servicio expone cada código solo a quien debe tenerlo, según actor y estado:
  - `codigo_inicio` lo ve **el cliente**, que es quien debe dictarlo. El proveedor **nunca** lo recibe por API.
  - `codigo_fin` lo ve **el proveedor** cuando lo genera al finalizar, y el cliente solo lo obtiene cuando el proveedor se lo entrega. No viaja en la respuesta del cliente antes de existir.
  - Un tercero no recibe ninguno de los dos, ni siquiera autenticado.
- Existe una prueba que falla antes de la corrección: el proveedor lee `codigo_inicio` por API e inicia el servicio sin intervención del cliente.
- `GET /providers/user/{userId}` deja de ser accesible como lookup de sesión. Un intento con otro `userId` responde 403/404 y no filtra documentos; el happy path propio usa `GET /providers/me`.
- `POST /mensajes` rechaza con 403 un receptor con el que el emisor no comparte ningún `Servicio`. Se cubren los tres casos: sin relación alguna, relación solo por cotización de un pedido aún no adjudicado, y relación por servicio existente en cualquiera de los dos sentidos.
- Un cliente o proveedor no puede figurar en ambos lados de la misma contratación. `POST /servicios` rechaza que `proveedor_id` corresponda al perfil del usuario autenticado y exige rol `cliente`; existe una prueba de que un proveedor no puede inflar su `calificacion_promedio` autocontratándose.
- Los agregados por defecto no filtran: agregar un campo al modelo no lo publica en la respuesta salvo que se agregue al Resource.

> **Nota de alcance.** Hoy `DocumentosPanel.js` no renderiza `ruta_archivo`, así que mover los documentos a disco privado no rompe ninguna pantalla — pero tampoco existe forma de que un proveedor vea su propio documento. La task 2.2 **crea** ese camino (`api.js` + `DocumentosPanel.js`), no solo lo protege. La revisión administrativa de documentos sigue fuera de alcance, por lo que el paso 4 del flujo de demo se demuestra con `curl` contra la ruta protegida.

> **Reuso disponible.** `Proveedor::premiumEstado()` (`app/Models/Proveedor.php`) ya devuelve `nunca | activo | vencido`. Las tasks 2.4 y 5.3 usan ese método y no escriben lógica de vigencia nueva.

### Archivos probables

- `ServiGT/backend/app/Http/Controllers/ProviderController.php`
- `ServiGT/backend/app/Policies/ProveedorPolicy.php`
- `ServiGT/backend/app/Models/DocumentoProveedor.php`
- `ServiGT/backend/routes/api.php`
- `ServiGT/backend/config/filesystems.php`
- `ServiGT/backend/tests/Feature/ProviderDocumentSecurityTest.php`
- `ServiGT/backend/tests/Feature/ProviderPremiumCustomizationTest.php`
- `ServiGT/backend/app/Http/Resources/ProveedorResource.php`
- `ServiGT/backend/app/Http/Resources/ServicioResource.php`
- `ServiGT/backend/app/Http/Controllers/ServicioController.php`
- `ServiGT/backend/app/Models/Servicio.php`
- `ServiGT/backend/tests/Feature/SerializacionPublicaTest.php`
- `ServiGT/docker-compose.yml`
- `ServiGT/backend/docker/entrypoint.sh`
- `ServiGT/frontend/src/services/api.js`
- `ServiGT/frontend/src/screens/provider/DocumentosPanel.js`
- `ServiGT/frontend/src/screens/ProviderEditProfileScreen.js`

---

## EPIC 3 — Autenticación, rate limiting y sesión segura · 8 SP

| Task | Título para Jira | SP | Horas | Owner | Reviewer | Fecha probable |
|---|---|---:|---:|---|---|---|
| 3.1 | Fortalecer registro y login con Password rules, mensajes no enumerables, normalización de email y pruebas de credenciales débiles | 2 | 6 h | JA | CL | 31/08–01/09 |
| 3.2 | Aplicar rate limiting diferenciado a login, registro, mensajes, uploads, compra y activación Premium con respuesta 429 verificable | 2 | 6 h | AS | JA | 01–02/09 |
| 3.3 | Revalidar sesión con /me y centralizar 401, 403 y 429; limpiar sesión inválida y redirigir sin loops ni fallbacks silenciosos | 2 | 6 h | PT | D | 02–03/09 |
| 3.4 | Crear storage seguro por plataforma para token y caché privado; migrar datos legados y limpiar conversaciones al cerrar sesión | 2 | 6 h | PT | AS | 03–04/09 |
| **Total** |  | **8** | **24 h** |  |  |  |

### Criterios de aceptación del Epic 3

- La contraseña cumple longitud y reglas ratificadas sin bloquear contraseñas largas válidas.
- Login no permite distinguir por mensaje si un correo existe.
- Intentos repetidos reciben 429 y se recuperan al vencer la ventana.
- Rate limiting usa claves apropiadas por IP y, cuando aplique, usuario autenticado.
- Un token inválido o vencido no deja la UI mostrando una sesión fantasma.
- Restaurar sesión consulta `/me` y no confía únicamente en el rol serializado localmente.
- Logout local ocurre aunque falle la red y elimina token, perfil, parámetros y cachés de chat del usuario.
- Native no depende de `localStorage`.
- El riesgo residual del token web queda documentado si no se migra a cookie HttpOnly.
- El frontend puede distinguir el status HTTP. Hoy no puede: `api.js` no tiene ningún interceptor de respuesta y cada una de sus funciones envuelve el fallo en `new Error(getErrorMessage(...))`, que descarta el código. Diferenciar 401, 403 y 429 exige cambiar ese patrón de error —propagar un error que conserve el status— en todas las funciones exportadas, no solo agregar el interceptor.
- `restore()` deja de confiar en el rol guardado localmente. Hoy lo toma de `localStorage` sin validar y `getMe()` existe pero nunca se llama, así que editar `localStorage` a rol administrador hace que la UI pinte el dashboard administrativo aunque el API responda 403.

### Archivos probables

- `ServiGT/backend/app/Http/Controllers/AuthController.php`
- `ServiGT/backend/app/Providers/AppServiceProvider.php`
- `ServiGT/backend/routes/api.php`
- `ServiGT/backend/tests/Feature/AuthSecurityTest.php`
- `ServiGT/backend/tests/Feature/RateLimitSecurityTest.php`
- `ServiGT/frontend/src/services/api.js`
- `ServiGT/frontend/src/services/sessionStorage.js`
- `ServiGT/frontend/src/context/SessionContext.js`
- `ServiGT/frontend/src/services/api.test.js`

---

## EPIC 4 — Configuración segura, headers y manejo de excepciones · 6 SP

| Task | Título para Jira | SP | Horas | Owner | Reviewer | Fecha probable |
|---|---|---:|---:|---|---|---|
| 4.1 | Extraer APP_KEY, credenciales de Compose y administrador por defecto; desactivar debug y restringir CORS mediante configuración por ambiente verificada en runtime | 2 | 6 h | D | CL | 02–03/09 |
| 4.2 | Servir el export web estático con Nginx y agregar CSP, frame-ancestors, nosniff, referrer policy y permisos compatibles con Expo | 2 | 6 h | PT | D | 03–04/09 |
| 4.3 | Endurecer excepciones y health: mensajes mínimos, correlation ID y logs estructurados sin payloads sensibles ni detalles de infraestructura | 2 | 6 h | AS | CL | 02–04/09 |
| **Total** |  | **6** | **18 h** |  |  |  |

### Criterios de aceptación del Epic 4

- El Compose versionado no contiene secretos reutilizables ni llaves fijas de aplicación.
- Desarrollo conserva una plantilla `.env.example` sin valores sensibles.
- CORS permite únicamente orígenes configurados.
- Producción no devuelve mensaje interno, SQL, stack trace ni ruta del servidor.
- Cada error 500 expone un correlation ID utilizable en logs.
- Los logs no guardan passwords, tokens Sanctum, documentos o payloads completos.
- CSP no rompe la navegación, fonts o bundle de Expo Web.
- La imagen de entrega sirve `expo export` con Nginx; no utiliza el servidor de desarrollo `expo start --web`.
- HSTS solo se activa donde exista HTTPS real.
- No existe administrador con credenciales por defecto. `ADMIN_PASSWORD` pasa a ser obligatoria y el script falla en vez de inventar un valor. Nota: el seed no reescribe la contraseña de un usuario ya existente, así que el problema es el arranque predecible sobre base nueva, no una rotación silenciosa.
- Ninguna contraseña se imprime en los logs de arranque. Hoy `sync_schema.php` la escribe en claro al sembrar los proveedores de ejemplo.
- Los datos de demostración se separan por ambiente: una base local con proveedores de ejemplo es legítima; un administrador con credenciales adivinables no lo es en ningún ambiente.
- Cada variable nueva llega efectivamente a `config()`: se declara en el entorno del proceso y un archivo de `config/` la consume. Si excepcionalmente también se materializa en el heredoc de `docker/entrypoint.sh`, ambos valores deben coincidir y existir una razón documentada; no se exige duplicar todas las variables en `.env`. La verificación se realiza dentro del contenedor después de `config:clear`.
- Cada archivo de configuración nuevo entra a la imagen. `backend/config/` contiene hoy un solo archivo y el `Dockerfile` lo copia uno por uno, así que publicar `filesystems.php` o `logging.php` sin agregar su línea de copia no tiene efecto.
- El target web servido por Nginx es adicional y no reemplaza el servicio de desarrollo, para no perder hot reload. Ese target implica puerto `8086:80`, URL de API relativa y CORS de mismo origen, por lo que la restricción de CORS de 4.1 se verifica con `curl -H 'Origin: …'` sobre los headers de respuesta y con una petición cross-origin desde un navegador, nunca desde el cliente nativo —que no implementa CORS— ni desde el propio frontend servido por Nginx.

### Archivos probables

- `ServiGT/docker-compose.yml`
- `ServiGT/.env.example`
- `ServiGT/backend/docker/entrypoint.sh`
- `ServiGT/backend/docker/sync_schema.php`
- `ServiGT/backend/Dockerfile`
- `ServiGT/backend/config/cors.php`
- `ServiGT/backend/bootstrap/app.php`
- `ServiGT/backend/app/Http/Controllers/HealthController.php`
- `ServiGT/frontend/Dockerfile`
- `ServiGT/frontend/nginx/default.conf`
- `ServiGT/backend/tests/Feature/SecurityConfigurationTest.php`
- `ServiGT/backend/tests/Feature/HealthSecurityTest.php`

---

## EPIC 5 — Publicaciones de servicios ofrecidos · 10 SP

| Task | Título para Jira | SP | Horas | Owner | Reviewer | Fecha probable |
|---|---|---:|---:|---|---|---|
| 5.1 | Crear publicaciones_servicio y PublicacionServicio con categoría, título, descripción, precio referencial, imagen, estado y referencia nullable desde Servicio | 2 | 6 h | D | JA | 02–03/09 |
| 5.2 | Implementar API segura para listar catálogo público y crear, editar, activar, desactivar o eliminar publicaciones propias | 2 | 6 h | AS | CL | 03–04/09 |
| 5.3 | Aplicar límite transaccional de una publicación efectiva gratis y tres Premium, bloqueando al proveedor antes de contar o activar y definiendo el tratamiento del vencimiento | 1 | 3 h | JA | AS | 04/09 |
| 5.4 | Crear pruebas de CRUD, ownership, roles, límites gratis/Premium, vencimiento, IDs manipulados, rollback y contrato del lock | 2 | 6 h | CL | JA | 04–07/09 |
| 5.5 | Crear gestión proveedor de publicaciones con listado, formulario, contador de cupos, acciones activar/desactivar y rutas coordinadas | 1 | 3 h | MR | PT | 04–07/09 |
| 5.6 | Mostrar publicaciones en perfil público, retirar chat sin relación e iniciar solicitud vinculada con datos y snapshot derivados por backend | 2 | 6 h | PT | D | 04–07/09 |
| **Total** |  | **10** | **30 h** |  |  |  |

### Esquema mínimo de `publicaciones_servicio`

- `id`
- `proveedor_id`
- `categoria_id`
- `titulo`
- `descripcion`
- `precio_desde`
- `unidad_precio` (`hora`, `proyecto`, `cotizar`)
- `imagen`
- `activa`
- timestamps

`servicios` agrega `publicacion_id` nullable con `ON DELETE SET NULL`; la contratación conserva una copia de descripción, categoría y monto para no cambiar históricamente si la publicación se edita.

> **Navegación.** Una pantalla nueva necesita tres cosas, no una: el archivo de ruta bajo `app/(protected)/`, una entrada en el mapa literal de `dashboard.js` —que hoy manda a `/home` cualquier destino desconocido en vez de fallar— y una entrada en el mapa de `src/components/InternalLayout.js`. En el Sprint 6 la pantalla de Créditos falló exactamente por omitir la segunda.

### Criterios de aceptación del Epic 5

- `Servicio` no se reutiliza como publicación ni cambia su significado transaccional.
- Solo un proveedor autenticado administra publicaciones propias.
- Cliente, proveedor ajeno y usuario no autenticado reciben 403/401 según corresponda.
- El catálogo público devuelve únicamente publicaciones activas y campos públicos.
- Proveedor gratuito no puede superar una publicación activa.
- Premium activo no puede superar tres publicaciones activas.
- El límite se verifica dentro de transacción con lock para impedir carreras.
- Al vencer Premium no se borran publicaciones. El catálogo público limita inmediatamente la visibilidad a la activa más antigua (`created_at`, luego `id`) sin mutar estado durante el `GET`.
- La siguiente creación, activación, edición relevante o desactivación autenticada bloquea al proveedor y normaliza los flags `activa`, conservando una y desactivando el excedente. La misma regla determinista se reutiliza en API, pruebas y UI.
- Activar una publicación inactiva también verifica el límite.
- La implementación ejecuta el conteo y la activación dentro de `DB::transaction()`, obtiene `lockForUpdate()` sobre la fila del proveedor **antes** de contar publicaciones efectivamente activas y vuelve a validar el límite después del lock.
- La suite de 5.4 cubre límites secuenciales, activación de una inactiva, rollback ante error y que el camino de escritura use la transacción/lock acordados. No se usa un hook de modelo para llamarlo “concurrencia”: sin una restricción única que represente el límite dinámico 1/3, ese hook puede insertar otra fila sin demostrar la exclusión mutua.
- La contención real se valida únicamente con dos conexiones o procesos PostgreSQL independientes. Si no se ejecuta ese escenario en Sprint 7, se registra como riesgo residual y follow-up; no se afirma que `lockForUpdate()` quedó probado por un proceso PHPUnit monohilo.
- Todas las pruebas backend se ejecutan mediante `docker compose --profile test run --rm backend_test`, que provisiona PostgreSQL `db_test`.
- Crear una solicitud desde publicación deriva proveedor y categoría en backend.
- Editar o desactivar una publicación no altera contrataciones históricas.
- Base limpia y volumen existente convergen mediante `init.sql` y `sync_schema.php`.
- Se aplica la regla de `AGENTS.md` §7: un cambio de esquema actualiza **tanto** `database/init.sql` **como** `backend/docker/sync_schema.php`, se mantiene idempotente y se verifica contra base limpia y contra volumen existente. No se resuelve con una migración Laravel aislada.
- La fuente efectiva del esquema Docker es el par `database/init.sql` + `backend/docker/sync_schema.php`, conforme a `AGENTS.md` §7. Las cuatro migrations históricas no representan el esquema completo —ni siquiera modelan todas las tablas actuales— y la suite canónica usa PostgreSQL `db_test` inicializado con `init.sql`. La tabla `publicaciones_servicio` se define en `init.sql`, la sincronización idempotente se actualiza en `sync_schema.php` y no se crea una migración Laravel aislada como tercera fuente divergente.

### Archivos probables

- `ServiGT/database/init.sql`
- `ServiGT/backend/docker/sync_schema.php`
- `ServiGT/backend/app/Models/PublicacionServicio.php`
- `ServiGT/backend/app/Models/Proveedor.php`
- `ServiGT/backend/app/Models/Servicio.php`
- `ServiGT/backend/app/Http/Controllers/PublicacionServicioController.php`
- `ServiGT/backend/app/Http/Controllers/ServicioController.php`
- `ServiGT/backend/routes/api.php`
- `ServiGT/backend/tests/Feature/PublicacionServicioTest.php`
- `ServiGT/backend/phpunit.xml`
- `ServiGT/frontend/src/screens/ProviderPublicacionesScreen.js`
- `ServiGT/frontend/src/screens/ProviderDetailScreen.js`
- `ServiGT/frontend/src/screens/SolicitudFormScreen.js`
- `ServiGT/frontend/app/(protected)/publicaciones.js`
- `ServiGT/frontend/app/(protected)/dashboard.js`
- `ServiGT/frontend/src/components/InternalLayout.js`

---

## EPIC 6 — UI periférica, regresión OWASP y cierre · 4 SP

| Task | Título para Jira | SP | Horas | Owner | Reviewer | Fecha probable |
|---|---|---:|---:|---|---|---|
| 6.1 | Crear PublicacionCard y estados loading/vacío/error responsive contra fixtures, sin lógica de API ni reglas de cupo | 1 | 3 h | MR | PT | 03–04/09 |
| 6.3 | Ejecutar suite de abuso OWASP y ZAP Baseline local; documentar antes/después y confirmar regresión de Flow A, Flow B, publicaciones y monetización | 2 | 6 h | CL | JA | 08/09 |
| 6.4 | Crear pruebas frontend de sesión, respuestas 401/403/429, CSP, almacenamiento por plataforma y gestión básica de publicaciones | 1 | 3 h | MR | PT | 08/09 |
| **Total** |  | **4** | **12 h** |  |  |  |

### Criterios de aceptación del Epic 6

- `PublicacionCard` es presentacional, reutilizable y no ejecuta reglas de límite.
- Estados loading, vacío y error funcionan en 1440px, 1024px y 390px.
- ZAP se ejecuta únicamente contra el stack local con datos sintéticos.
- Cada hallazgo ZAP se clasifica como corregido, falso positivo, aceptado o follow-up.
- La matriz OWASP final enlaza PR, test y evidencia.
- Flow A, Flow B, publicaciones, créditos, compra y Premium permanecen verdes.
- La UI diferencia 401, 403, 429, error de red y límite de publicaciones alcanzado.

### Archivos probables

- `ServiGT/frontend/src/components/ui/PublicacionCard.js`
- `ServiGT/frontend/src/components/ui/PublicacionCard.test.js`
- `ServiGT/frontend/src/services/api.test.js`
- `ServiGT/backend/tests/Feature/OwaspRegressionTest.php`
- `docs/security/owasp-before-after.md`
- `docs/security/zap-baseline-report.md`

---

# Resumen ejecutivo del backlog

| Epic | Tasks | SP | Horas |
|---|---:|---:|---:|
| 1. Baseline OWASP y cadena de suministro | 5 | 8 | 24 h |
| 2. Control de acceso, documentos privados y serialización | 6 | 11 | 33 h |
| 3. Autenticación, rate limiting y sesión | 4 | 8 | 24 h |
| 4. Configuración y excepciones | 3 | 6 | 18 h |
| 5. Publicaciones de servicios ofrecidos | 6 | 10 | 30 h |
| 6. UI periférica, regresión OWASP y cierre | 3 | 4 | 12 h |
| **TOTAL** | **27 tasks** | **47 SP** | **141 h** |

---

# Asignación por integrante

## CL — Carlos López · 8 SP · 24 h

| Task | SP | Horas | Responsabilidad |
|---|---:|---:|---|
| 1.3 | 1 | 3 h | CI backend con PostgreSQL y PHPUnit canónico |
| 2.3 | 2 | 6 h | Autocontratación, mensajería y matriz de autorización |
| 2.5 | 1 | 3 h | ProveedorResource y contrato `/providers/me` |
| 5.4 | 2 | 6 h | Pruebas backend de publicaciones y contrato transaccional |
| 6.3 | 2 | 6 h | Suite OWASP, ZAP y regresión |
| **Total** | **8** | **24 h** |  |

## JA — Juan Salguero · 8 SP · 24 h

| Task | SP | Horas | Responsabilidad |
|---|---:|---:|---|
| 2.1 | 2 | 6 h | Autorización e identidad derivada |
| 2.2 | 3 | 9 h | Documentos privados y BOLA |
| 3.1 | 2 | 6 h | Password y login seguro |
| 5.3 | 1 | 3 h | Límites transaccionales gratis/Premium y vencimiento |
| **Total** | **8** | **24 h** |  |

## MR — Mar · 7 SP · 21 h

| Task | SP | Horas | Responsabilidad |
|---|---:|---:|---|
| 1.1 | 1 | 3 h | Matriz OWASP y baseline documentado |
| 1.2 | 2 | 6 h | Lockfile y dependencias frontend |
| 1.5 | 1 | 3 h | CI frontend, auditoría y finales de línea |
| 5.5 | 1 | 3 h | Gestión proveedor de publicaciones |
| 6.1 | 1 | 3 h | Componente presentacional PublicacionCard |
| 6.4 | 1 | 3 h | Pruebas frontend de seguridad y publicaciones |
| **Total** | **7** | **21 h** |  |

## AS — Antony Saz · 8 SP · 24 h

| Task | SP | Horas | Responsabilidad |
|---|---:|---:|---|
| 2.6 | 2 | 6 h | ServicioResource y códigos de Flow A por actor |
| 3.2 | 2 | 6 h | Rate limiting |
| 4.3 | 2 | 6 h | Excepciones, correlation ID y health seguro |
| 5.2 | 2 | 6 h | API segura de publicaciones |
| **Total** | **8** | **24 h** |  |

## PT — Pablo Toledo · 8 SP · 24 h

| Task | SP | Horas | Responsabilidad |
|---|---:|---:|---|
| 3.3 | 2 | 6 h | Manejo frontend de 401/403/429 |
| 3.4 | 2 | 6 h | Storage de sesión por plataforma |
| 4.2 | 2 | 6 h | Export web, Nginx y CSP |
| 5.6 | 2 | 6 h | Perfil público y contratación vinculada desde publicación |
| **Total** | **8** | **24 h** |  |

## D — David López · 8 SP · 24 h

| Task | SP | Horas | Responsabilidad |
|---|---:|---:|---|
| 1.4 | 3 | 9 h | Backend reproducible con Composer |
| 2.4 | 1 | 3 h | Personalización Premium segura |
| 4.1 | 2 | 6 h | Secretos, debug, CORS y bootstrap seguro |
| 5.1 | 2 | 6 h | Esquema y modelos de publicaciones |
| **Total** | **8** | **24 h** |  |

---

# Dependencias

```text
1.1 ─────────────────────────────→ matriz final 6.3
1.4 ─────────────────────────────→ CI backend 1.3
1.2 ─────────────────────────────→ CI frontend 1.5
1.3 + 1.5 ───────────────────────→ Gate 1
2.1 ─────────────────────────────→ 2.2, 2.3 y contrato propio de 2.5
2.5 ─────────────────────────────→ frontend de perfiles y regresión 6.3
2.6 ─────────────────────────────→ pruebas de Flow A en 2.3 y regresión 6.3
3.1 ─────────────────────────────→ 3.2 y regresión 6.3
3.3 ─────────────────────────────→ 3.4 y pruebas 6.4
4.1 + 4.2 + 4.3 ────────────────→ regresión 6.3
5.1 ─────────────────────────────→ 5.2 y 5.3
5.2 + 5.3 ──────────────────────→ 5.4, 5.5 y corte backend de 5.6
6.1 ─────────────────────────────→ integración visual 5.5 y 5.6
Epics 1–5 ───────────────────────→ cierre técnico 6.3
3.3 + 3.4 + 4.2 + 5.5 + 6.1 ──→ pruebas frontend 6.4
5.6 (04–07/09) ─────────────────→ corte backend antes del 07/09; integración visual el 07/09
6.3 (08/09) ────────────────────→ regresión después de integrar 5.6, antes del Gate 3
```

## Gate de supply chain

Las tasks 1.2 y 1.4 deben integrarse antes de cerrar CI. No se permite que cada build resuelva versiones diferentes.

## Gate de autorización

La task 2.1 se integra antes de 2.2 y de la matriz amplia 2.3. Los documentos no se migran a privado sin una ruta autorizada de lectura.

Las tasks 2.5 y 2.6 cambian contratos consumidos por frontend. CL, AS y PT acuerdan antes de implementar la allowlist pública, el indicador Premium derivado y los códigos visibles por actor; es un cambio de contrato, no un detalle interno.

## Gate de sesión

La respuesta común para 401/403/429 debe acordarse entre AS y PT antes de modificar el interceptor frontend.

## Gate de archivos compartidos de alto riesgo

`AGENTS.md` §15 exige coordinar antes de tocar `docker-compose.yml`, `init.sql`, `sync_schema.php`, `InternalLayout.js`, `theme.js`, `NotificationBell.js`, `CotizacionController.php` y los componentes de UI compartidos, y prohíbe mezclar cambios no relacionados en ellos. Este sprint los toca desde varias tasks a la vez:

| Archivo compartido | Tasks que lo modifican | Acuerdo requerido |
|---|---|---|
| `docker-compose.yml` | 2.2 (volumen de storage privado) y 4.1 (secretos, debug, CORS) | D y JA acuerdan el orden; el mismo PR no mezcla volumen con secretos. |
| `backend/docker/entrypoint.sh` y `Dockerfile` | 1.4 (build determinista) y 4.1 (variables por ambiente) | 1.4 entra primero; 4.1 se apoya en el manifest ya fijado. |
| `database/init.sql` y `docker/sync_schema.php` | 4.1 (admin seed) y 5.1 (publicaciones) | Cortes separados; ambos aplican la regla de `AGENTS.md` §7 de actualizar los dos archivos y verificar base limpia y volumen existente. |
| `ServicioController.php` | 2.6 (Resource y códigos) y 5.6 (contratación desde publicación) | 2.6 define el contrato antes de que 5.6 lo extienda. |
| `InternalLayout.js` | 5.5 (ruta de publicaciones) | Cambio mínimo y aislado: solo la entrada del mapa de navegación. |

## Gate de publicaciones

La task 5.1 debe integrarse antes del CRUD y la UI. El contrato de 5.2 y la regla atómica 5.3 se acuerdan antes de conectar 5.5 y 5.6; `PublicacionCard` puede desarrollarse en aislamiento con fixtures sin bloquear ese gate.

---

# Calendario tentativo

## 26–28 de agosto — Baseline y cimientos

| Fecha | Objetivo técnico |
|---|---|
| Mié 26/08 | Iniciar 1.1, 1.2 y 1.4; cargar Sprint Backlog completo en Jira antes de iniciar |
| Jue 27/08 | Lockfiles reproducibles, primera matriz OWASP y pipeline en construcción |
| Vie 28/08 | Gate 1: builds deterministas, audits iniciales y CI mínimo en PR |

## 29–30 de agosto — Buffer opcional

- Sin entregables obligatorios.
- Solo recuperación de bloqueos voluntaria.
- No se usa el buffer para justificar planificación tardía.

## 31 de agosto–4 de septiembre — Hardening principal

| Fecha | Objetivo técnico |
|---|---|
| Lun 31/08 | Iniciar autorización, documentos privados y password policy |
| Mar 01/09 | BOLA, rate limiting, personalización Premium y matriz de roles |
| Mié 02/09 | Esquema de publicaciones, health seguro y contrato 401/403/429 |
| Jue 03/09 | API de publicaciones, sesión frontend, headers y componentes aislados |
| Vie 04/09 | Gate 2: seguridad principal y límites gratis/Premium integrados |

## 5–6 de septiembre — Buffer opcional

- Sin entregables obligatorios.
- No realizar pruebas contra producción.

## 7–9 de septiembre — Regresión, evidencia y entrega

| Fecha | Objetivo técnico |
|---|---|
| Lun 07/09 | Gestión y catálogo público de publicaciones, solicitud vinculada e integración visual |
| Mar 08/09 | Gate 3: OWASP/ZAP, regresión, tests, build, publicaciones y demo en verde |
| Mié 09/09 | Entrega Sprint 7, retrospectiva y cierre de evidencias |

---

# Checkpoints

## Gate 1 — viernes 28 de agosto

- Sprint Backlog completo ya creado en Jira.
- Matriz OWASP inicial disponible.
- Frontend y backend tienen manifests/lockfiles reproducibles.
- CI ejecuta tests y build.
- No existen secretos reales nuevos en Git.

## Gate 2 — viernes 4 de septiembre

- BOLA de documentos corregido.
- Documentos privados y descarga autorizada.
- Password policy y rate limiting activos.
- Portada Premium protegida.
- Respuestas de proveedor y servicio con allowlist; códigos de Flow A no viajan a quien no debe.
- Administrador por defecto eliminado y verificado sobre volumen limpio.
- CORS, debug, secretos y errores endurecidos, verificados dentro del contenedor.
- Sesión frontend maneja 401/403/429.
- Esquema, API y límites 1 gratis / 3 Premium de publicaciones integrados.
- Ninguna rama crítica permanece aislada de `dev`.

## Gate 3 — martes 8 de septiembre

- Suite backend y frontend verde.
- Build web verde.
- ZAP Baseline ejecutado localmente.
- Audits de npm y Composer clasificados.
- Matriz OWASP antes/después completa.
- Flujo de crear, editar, activar, listar y contratar desde publicación demostrable.
- Flow A, Flow B y monetización sin regresiones.
- Evidencias, LOGT, métricas y demo preparados.

---

# Flujo de demo esperado

## Control de acceso

1. Proveedor A consulta sus documentos.
2. Proveedor A intenta consultar o subir documento para Proveedor B y recibe 403.
3. Usuario no autenticado recibe 401.
4. Admin autorizado consulta el documento por ruta protegida.
5. La URL pública directa del archivo no funciona.
6. `curl` anónimo a `GET /api/providers` muestra que la respuesta ya no incluye correo, `user_id`, documentos ni claves internas de Premium; el teléfono conserva el contrato funcional actual y el badge usa solo el indicador derivado.
7. Proveedor A consulta `GET /api/providers/user/{id de B}` y recibe 403.
8. Proveedor autenticado consulta sus solicitudes y se muestra que la respuesta no trae `codigo_inicio`; el intento de iniciar sin el código del cliente falla.
9. Un proveedor intenta crear una solicitud hacia su propio perfil y recibe 403.
10. Arranque sobre volumen limpio y se muestra que el login con la credencial administrativa por defecto ya no funciona.

## Publicaciones de servicios

1. Proveedor gratuito crea una publicación y el contador muestra `1/1`.
2. Intentar activar una segunda publicación gratuita recibe error de límite.
3. Proveedor Premium puede mantener hasta tres publicaciones activas.
4. Un proveedor ajeno no puede editar ni desactivar publicaciones de otro.
5. Cliente abre el perfil público y solo ve publicaciones activas.
6. Cliente solicita un servicio desde una publicación y la contratación conserva `publicacion_id`.
7. Editar la publicación no modifica la descripción histórica de la contratación.

## Autenticación y abuso

1. Registro rechaza una contraseña débil.
2. Login incorrecto devuelve mensaje genérico.
3. Intentos repetidos reciben 429.
4. Token inválido limpia la sesión y redirige correctamente.
5. El usuario puede volver a iniciar sesión al terminar la ventana.

## Configuración y frontend

1. Se muestra que Compose no contiene secretos fijos.
2. CORS no autoriza un origen no permitido: `curl -H 'Origin: …'` permite inspeccionar que no se emite un `Access-Control-Allow-Origin` válido, y una petición cross-origin real queda bloqueada por el navegador.
3. Respuesta 500 muestra correlation ID, no stack trace.
4. Headers de seguridad aparecen en la respuesta web.
5. La UI presenta 401, 403, 429 y error de red de forma distinta.

## Cadena de suministro y QA

1. `npm ci` instala desde lockfile.
2. Composer instala desde manifest y lockfile propios.
3. GitHub Actions ejecuta tests y build.
4. Se muestra el audit antes/después con riesgos residuales explicados.
5. Se presenta la matriz OWASP con enlaces a PR y pruebas.
6. El CRUD y los límites de publicaciones quedan cubiertos por pruebas.
7. Flow A, Flow B, publicaciones, créditos y Premium siguen funcionando.

---

# Plan de pruebas

## Backend

Framework: PHPUnit mediante Laravel.

Casos mínimos nuevos:

- BOLA de documentos por lectura, subida y descarga.
- Admin autorizado y rol incorrecto.
- Provider ownership y recurso inexistente.
- Premium nunca, activo y vencido para personalización.
- Password débil, email normalizado y credenciales genéricas.
- Rate limit y recuperación después de ventana.
- Upload con MIME falso, exceso de tamaño y fallo de storage.
- Crear, editar, activar, desactivar y eliminar publicación propia.
- Cliente, anónimo y proveedor ajeno no administran publicaciones.
- Límites 1 gratis / 3 Premium bajo solicitudes secuenciales y concurrentes.
- Vencimiento Premium conserva datos y reduce publicaciones activas sin borrarlas.
- Solicitud desde publicación deriva proveedor/categoría y conserva snapshot histórico.
- Error 500 sin detalle interno.
- La respuesta pública de proveedor no contiene `email`, `user_id`, `premium_ciclo_key`, `premium_renovaciones` ni documentos, ni con un proveedor recién creado ni con uno Premium activo. El teléfono conserva el contrato actual y el badge usa únicamente el indicador Premium derivado acordado.
- `GET /providers/me` devuelve únicamente el perfil del usuario autenticado; el lookup legado con otro `userId` responde 403/404 y no filtra documentos.
- El proveedor no recibe `codigo_inicio` en ninguna respuesta, y un intento de iniciar el servicio con el código leído por API falla. Esta prueba debe fallar antes de la corrección.
- Un proveedor no puede crear un servicio en el que él mismo sea el proveedor, ni calificarse a sí mismo, ni alterar su `calificacion_promedio` por esa vía.
- Un usuario con rol `proveedor` no puede usar `POST /servicios` como cliente.
- `POST /mensajes` a un usuario sin servicio en común responde 403; con servicio en común responde 201 en ambos sentidos; con solo una cotización de un pedido no adjudicado responde 403.
- El health check no devuelve el mensaje de una excepción de base de datos: hoy `HealthController` concatena `$e->getMessage()`, que puede incluir host, usuario y nombre de la base.

## Frontend

Framework: Jest.

Casos mínimos nuevos:

- Interceptor 401 limpia sesión una vez y evita loops.
- 403 conserva sesión y muestra prohibición.
- 429 muestra espera/reintento.
- Storage adapter selecciona implementación por plataforma.
- Migración y eliminación del token legado.
- `PublicacionCard` cubre publicación activa, precio referencial, modo cotizar y ausencia de imagen.
- Gestión proveedor cubre contador 1/1 o 1/3, límite alcanzado, loading, vacío y error.
- Perfil público no renderiza publicaciones inactivas.
- Fallos API no se convierten en listas o valores válidos silenciosamente.
- Headers/CSP no rompen el build web.
- El interceptor propaga el status: un error de API llega a la pantalla con su código y no como una cadena de texto plana.
- Un rol manipulado en almacenamiento local no pinta una pantalla que no corresponde: la sesión se revalida contra `/me` antes de decidir la vista.

## Integración y sistema

- Stack local limpio.
- Base existente.
- ZAP Baseline contra localhost únicamente.
- Flow A completo.
- Flow B completo.
- CRUD proveedor de publicaciones.
- Catálogo público y solicitud vinculada.
- Límite 1 gratis / 3 Premium en casos secuenciales, activación de inactivas y rollback; si se ejecuta contención real, usar dos conexiones PostgreSQL y reportarla por separado.
- Compra idempotente.
- Premium sin alterar slots.
- Upload privado y autorización cruzada.
- Rebuild completo del stack después de mover documentos a disco privado, para confirmar que los archivos sobreviven al cambio de volumen.
- Arranque sobre volumen limpio confirmando que no se crea un administrador con contraseña por defecto.

## Evidencia mínima por ejecución

- Comando exacto.
- Commit probado.
- Fecha y responsable.
- Conteo de tests/assertions.
- Resultado y captura o log.
- Hallazgos residuales y follow-up.

---

# Estimación de tiempo y costo

## Técnica

Se usa estimación relativa por Story Points y estimación horaria por task:

- 1 SP ≈ 3 horas.
- 2 SP ≈ 6 horas.
- 3 SP ≈ 9 horas.

La capacidad total técnica es:

```text
47 SP × 3 h/SP = 141 horas
```

## Costo académico referencial

Para presupuesto académico se utiliza una tarifa blended provisional de **Q35 por hora**. Debe reemplazarse si el curso proporciona otra tarifa.

```text
141 h × Q35/h = Q4,935.00
Contingencia académica 10 % = Q493.50
Total referencial = Q5,428.50
```

La contingencia no representa Story Points adicionales ni trabajo oculto. Sirve para expresar riesgo de integración, herramientas y correcciones.

---

# Product Backlog actualizado

| Prioridad | Funcionalidad | Estado | Sprint |
|---:|---|---|---|
| 1 | Flow A de contratación directa | Terminado | Anterior a S6 |
| 2 | Flow B de pedidos y cotizaciones | Terminado | Anterior a S6 |
| 3 | Slots y créditos de cotización | Terminado | Anterior a S6 |
| 4 | Revamp interno y responsive | Terminado | Sprint 6 |
| 5 | Compra simulada de créditos | Terminado | Sprint 6 |
| 6 | Premium base y monetización | Terminado | Sprint 6 |
| 7 | Publicaciones ofrecidas: 1 gratis / 3 Premium | Planificado | Sprint 7 |
| 8 | Control de acceso y documentos privados | Planificado | Sprint 7 |
| 9 | Auth, rate limiting y sesión segura | Planificado | Sprint 7 |
| 10 | Configuración y cadena de suministro segura | Planificado | Sprint 7 |
| 11 | Regresión OWASP y ZAP local | Planificado | Sprint 7 |
| 12 | Recuperación segura de contraseña | Pendiente | Sprint posterior |
| 13 | Mis cotizaciones | Pendiente | Sprint posterior |
| 14 | Trazabilidad servicio → pedido/cotización | Pendiente | Sprint posterior |
| 15 | Galería y moderación avanzada de publicaciones | Pendiente | Sprint posterior |
| 16 | Solicitudes de contacto, bloqueo y reporte en mensajería | Pendiente | Sprint posterior |
| 17 | Pasarela de pago real | Pendiente | Sprint posterior |
| 18 | Pantalla completa de notificaciones | Pendiente | Sprint posterior |
| 19 | Dark mode | Pendiente | Sprint posterior |
| 20 | Helper UX compartido para validación previa de uploads | Pendiente | Sprint posterior |

---

# Riesgos y mitigaciones

| Riesgo | Mitigación |
|---|---|
| OWASP se convierte en checklist genérico | Cada task parte de un hallazgo real y exige evidencia antes/después. |
| Actualizar dependencias rompe Expo o Laravel | Lockfile, actualización dirigida, tests y no usar `--force`. |
| Auth cambia demasiado y rompe todos los roles | Mantener Sanctum, aplicar cambios incrementales y probar cliente/proveedor/admin. |
| Documentos privados dejan de abrir | Crear descarga autorizada antes de retirar URL pública. |
| CSP rompe Expo Web | Empezar en modo de observación local, ajustar fuentes mínimas y probar build. |
| Rate limiting bloquea usuarios legítimos | Límites diferenciados, mensajes 429 y ventanas verificadas. |
| Logging captura datos sensibles | Allowlist de campos y tests negativos sobre password/token/documento. |
| ZAP genera falsos positivos | Clasificar cada alerta con evidencia, no inflar número de vulnerabilidades. |
| La guía oficial llega tarde | Issues transversales creados desde el inicio y mapeo sin agregar alcance técnico improvisado. |
| El alcance movido reaparece sin estimar durante el sprint | Health queda trazado dentro de 4.3 y la validación UX de uploads queda explícitamente en Product Backlog; no se reintroducen como trabajo oculto. |
| 6.1 se retrasa y arrastra 5.5 y 5.6 | Desarrollar `PublicacionCard` contra fixtures desde el 3 de septiembre sin esperar la API, y acordar sus props antes de que 5.5 la consuma. |
| Integrar 5.6 demasiado tarde deja la regresión sin margen | Completar el corte backend entre el 4 y el 7 de septiembre, integrar la UI el 7 y ejecutar 6.3 el 8; cualquier atraso de 5.6 reduce el Gate 3 y debe escalarse el mismo día. |
| Las revisiones no tienen tiempo presupuestado | Los cambios de auth, documentos, Docker, CORS y middleware exigen dos revisores: reservar esa carga en el LOGT de cada reviewer, no solo en la del owner. |
| Cerrar el chat rompe una ruta que los usuarios ya usan | Retirar el botón del perfil público en el mismo PR que agrega la regla, para que nunca exista una pantalla que ofrezca una acción que el backend rechaza. |
| Se confunde publicación con contratación | Mantener entidad, modelo, rutas y vocabulario separados; `Servicio` no cambia de significado. |
| Dos requests superan el límite de publicaciones | Validar dentro de transacción y bloquear el proveedor antes de contar/activar. |
| Premium vence con tres publicaciones activas | Conservar datos, elegir una activa mediante regla determinista y desactivar el excedente sin borrar. |
| Se confunde auditoría local con pentest autorizado | Prohibir tráfico de pruebas contra producción o terceros. |
| Se agregan tareas después de iniciar Jira | Cargar backlog técnico y transversal completo antes de pulsar Start sprint. |
| Una variable nueva existe en Compose pero la aplicación nunca la usa | Exigir que `config/*.php` consuma el entorno y verificar `config()` tras `config:clear`; si el heredoc también la escribe, documentar y evitar valores competidores. |
| La prueba de publicaciones se presenta como concurrencia sin serlo | No usar hooks monohilo como prueba de locks. Cubrir secuencial, rollback y contrato transaccional; si se valida contención, ejecutar dos conexiones PostgreSQL y etiquetar la evidencia por separado. |
| Los documentos se pierden al moverse a disco privado | El volumen actual solo cubre `storage/app/public`: ajustar el mount y verificar con un rebuild real antes de cerrar 2.2. |
| Los Resources rompen pantallas que leen campos retirados | Acordar contratos 2.5/2.6 con PT, conservar teléfono según decisión ratificada, ofrecer indicador Premium derivado y ejecutar suites frontend/backend. |
| Los archivos de configuración nuevos no entran a la imagen | El `Dockerfile` copia `config/` archivo por archivo: agregar la línea de copia junto al archivo, en el mismo PR. |

---

# Fuera del alcance del Sprint 7

- Penetration testing sobre producción o servicios externos.
- Certificación formal OWASP.
- WAF empresarial o SIEM completo.
- MFA obligatorio.
- Recuperación de contraseña, salvo exigencia de la guía oficial.
- Migración total a OAuth/OIDC.
- Rotación de credenciales reales de producción no disponibles al equipo.
- Pasarela de pago real.
- Tarjeta, CVV o datos bancarios reales.
- Dark mode.
- Más de tres publicaciones activas para Premium.
- Galería múltiple, publicaciones destacadas, analytics y moderación avanzada.
- Descuento Premium en paquetes.
- Alteración de slots de cotización.
- Mis cotizaciones.
- Pantalla completa de notificaciones.
- Refactors visuales ajenos a seguridad.

---

# Actividades transversales sin SP técnico individual

Deben crearse en Jira antes de iniciar el sprint, aunque no sumen SP técnicos:

- Product Backlog histórico con prioridad y sprint de terminación.
- Sprint Backlog con horas, fechas, owner y reviewer.
- Burndown del Sprint 7.
- Velocidad histórica Sprints 1–7.
- LOGT/PSP0 por integrante.
- Presupuesto y tiempo real contra estimado.
- Informe OWASP antes/después.
- Evidencias de Planning, Daily, Review y Retrospective.
- Evidencia de socialización con Product Owner, potenciales usuarios o docente.
- Plan maestro de pruebas.
- Informe de ejecución de pruebas.
- Matriz de contribución individual.
- Documento académico final.

Estas actividades son colaborativas y no se usan para inflar la carga técnica individual.

> **Ubicación de la documentación.** Este documento vive hoy en `DOCS/` en la raíz del repositorio, que **no está bajo control de versiones** (`git status` la reporta como carpeta sin trackear) mientras que las rutas citadas en los epics apuntan a `docs/security/`, y ya existe un `ServiGT/docs/` con un archivo. Antes del Gate 1 hay que decidir una sola ubicación, agregarla a Git o ignorarla explícitamente, y corregir las rutas de los epics para que coincidan. Si no, la matriz OWASP que exige el Gate 3 puede terminar existiendo solo en la máquina de quien la escribió.

---

# Disciplina Jira y Git para proteger la rúbrica

## Jira

- Crear Epic → Historia/Task antes de iniciar el sprint.
- Story Points en historias/tasks técnicas según configuración.
- `Original Estimate` en horas para cada task.
- Definir prioridad, owner, reviewer y due date.
- Mover To Do → In Progress → Code Review → Done con fechas reales.
- No mover a Done sin PR, tests y evidencia.
- No agregar trabajo técnico tarde para reconstruir artificialmente el burndown.

## Git

- Feature branch desde `origin/dev` actualizado.
- PR pequeño hacia `dev` por task.
- Commits descriptivos en español y modo imperativo.
- No usar mensajes como `mi parte`, `cambios` o `fix` sin contexto.
- Evitar un único commit gigante por integrante.
- La rúbrica anterior exigía más de seis commits semanales por integrante: planificar **al menos siete commits significativos por semana**, derivados de ciclos reales de prueba, implementación y ajuste; nunca commits vacíos o artificiales.
- Cada integrante debe distribuir contribuciones durante ambas semanas.
- Reviewer distinto del owner.
- No push directo a `main`.

Ejemplos:

```text
Agrega límite de intentos al inicio de sesión
Protege descarga privada de documentos
Agrega catálogo de publicaciones del proveedor
Limita publicaciones activas según Premium
Restringe personalización a Premium activo
Oculta detalles internos en errores API
Fija dependencias backend con Composer lock
```

---

# Evidencia requerida para la entrega

1. Export del Product Backlog.
2. Export del Sprint Backlog antes del inicio.
3. Burndown.
4. Velocity chart.
5. LOGT/PSP0.
6. Presupuesto estimado vs real.
7. Matriz OWASP inicial y final.
8. Capturas o logs de CI.
9. `npm audit` y Composer audit con triage.
10. Reporte ZAP local.
11. Salida completa de PHPUnit y Jest, citando el comando exacto y la imagen usada. Para el backend el comando válido es `docker compose --profile test run --rm backend_test`; una corrida sin ese entorno no es evidencia.
12. Build web.
13. Evidencia de base limpia y existente cuando aplique.
14. PRs, reviewers y commits por integrante.
15. Evidencia de demo con roles, abuso de IDs y límites 1 gratis / 3 Premium.
16. Retrospectiva.
17. Evidencia de socialización con usuarios/docente.
18. Documento académico final.

---

# Resultado esperado al cierre

Al terminar el Sprint 7, ServiGT debe:

- impedir acceso horizontal a documentos, incluida la ruta autenticada por `user_id`;
- almacenar documentos sensibles de forma privada sin perderlos en el siguiente rebuild;
- dejar de serializar modelos crudos en proveedores y servicios: las respuestas públicas excluyen correo, `user_id`, documentos y claves internas de Premium; los códigos de Flow A solo aparecen en la transición y para el actor autorizado;
- impedir que un mismo usuario figure en ambos lados de una contratación y se califique a sí mismo;
- arrancar sin administrador con credenciales por defecto;
- aplicar permisos por rol y ownership con pruebas;
- limitar abuso de autenticación y operaciones costosas;
- fortalecer password y manejo de sesión;
- construir frontend y backend de forma reproducible;
- ejecutar tests y audits en CI;
- restringir CORS y eliminar debug/secretos fijos del Compose;
- enviar headers web de seguridad;
- responder errores sin filtrar detalles internos;
- permitir que el proveedor cree y gestione publicaciones propias;
- mostrar únicamente publicaciones activas en el perfil público;
- aplicar de forma atómica una publicación gratis y hasta tres Premium;
- crear solicitudes directas vinculadas sin cambiar el significado de `Servicio`;
- conservar Flow A, Flow B, publicaciones, créditos y Premium en verde;
- presentar una matriz OWASP antes/después respaldada por evidencia.

El éxito no se mide por afirmar “no hay vulnerabilidades”, sino por demostrar que riesgos concretos fueron identificados, reducidos, probados y documentados sin romper el producto.
