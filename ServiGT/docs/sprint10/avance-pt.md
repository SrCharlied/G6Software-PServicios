# Sprint 10 - avance verificable de Pablo Toledo

Fecha: 2026-10-26, America/Guatemala. Rama: `sprint-10-pablo`.
**NO es un cierre exitoso del sprint.** Faltan decisiones/documentos humanos,
el flujo de eliminacion y gates externos sobre el SHA que se integre.

## Preparacion y alcance

Se leyeron AGENTS.md y el documento operativo del Sprint 10. Se consulto
`origin/dev` con `git fetch origin dev` desde WSL: la rama estaba limpia,
sin divergencia, en `da89b15d8f8a7931b5f1e08d9449fb4210fb5d82`.
No se cambio de rama, sobrescribio trabajo ajeno ni hizo push/merge/PR.
Se verifico identidad WSL: `xPat95`, `tol24355@uvg.edu.gt`.
La correccion Git del usuario autoriza commits y prevalece sobre el adjunto
que originalmente pedia no hacerlos.

## Las doce actividades PT

| Actividad | Estado real |
|---|---|
| 1.2.c Perfil | Implementada y probada; telefono local de ocho digitos, descripcion 20-500, contador y fixtures |
| 1.3.c Registro | Ya integrada en `369c50a`/`20ed7d0`; verificada y consumidores ampliados para el contrato legal |
| 1.4.b Logout | Implementada en sidebar, menu movil y ProviderHeader; cancelacion, bloqueo de doble envio y errores |
| 2.2.a Documentos publicos | Rutas/pantallas/API implementadas; lectura efectiva del texto aprobada pendiente de recibir el contenido |
| 2.2.b Aceptacion | Implementada y probada con PostgreSQL y fixtures aislados; falta publicar documentos reales aprobados para alta E2E real |
| 3.2.a Eliminacion | Pendiente: no hay contrato de 3.1 integrado ni politicas ratificadas localizadas; no se inventaron endpoints ni consecuencias |
| 3.2.b Limpieza tras eliminacion | Infraestructura local preparada y probada (`endSession`, espera de limpieza); falta integrarla al exito real de 3.1 y probar sus errores |
| 4.1.c Comprobantes | Ya integrada en `8e7742e`/`da89b15`; vista, historial, folio, impresion e historicas verificados por tests, sin duplicarla |
| 6.1.c Responsive/CI/despliegue | Responsive y smoke de lectura ejecutados; CI base consultado. CI del incremento/SHA desplegado pendientes |
| 6.1.d Evidencia tecnica | Este informe, contrato, matriz, capturas y resultados; no afirma Done con dependencias pendientes |
| 7.1.a Planning/Jira | Checklist preparado; sin acceso Jira, congelacion/reuniones no verificadas |
| 7.1.logt-pt LOGT | Formato y hitos Git verificables preparados; tiempos/interrupciones requieren registro humano |

## Dependencias directas y transitivas

`1.2.c -> 1.2.a/b`: faltaban. Se normaliza exclusivamente `####-####` en
users/proveedores, idempotentemente; se conservan null, prefijos y datos no
reconocidos para revision. API requiere telefono y descripcion al crear,
`sometimes|required` al actualizar, sin romper payloads parciales.
Se corrigio el fixture de carrera para exigir el mensaje de duplicado real.

El perfil enviaba `color_acento: null` sin cambios y el backend lo rechazaba
sin Premium. Se omite el color intacto para no bloquear edicion ordinaria
de 1.2.c. No se implemento indiscriminadamente toda HU 1.1.

`1.3.c -> 1.3.a/b`: resueltas en la base. Se preservan confirmacion, tope
bcrypt, DNS configurable seguro y resolvedor sustituible en tests; no se
consulta DNS externo en las pruebas de registro.

`2.2 -> 2.1.a-d -> 1.3`: texto/aprobacion no encontrados. Se preparo
esquema inmutable, hash y consulta publica sin sembrar aprobaciones. Se
implemento registro transaccional de usuario+dos aceptaciones, token luego
del commit, 409 obsoleto, rollback y login historico sin reaceptacion.
Los fixtures legales se crean exclusivamente en tests PostgreSQL efimeros
y se identifican como tales. [Contrato real](legal-api.md).

**Impacto operativo:** la base local conserva cero documentos aprobados.
GET vigente responde 503 y el formulario informa el bloqueo. No puede
completarse un registro nuevo sin documentos reales aprobados; no hay
bypass ni checkboxes marcados por defecto. No se modifica el login existente.

`3.2 -> 3.1.a-d -> 1.2`: 1.2 ya resuelta; 3.1 sigue ausente. Se pregunto
por politicas de bloqueo, PII, archivos y retencion acordadas. No se tomo
una decision de producto destructiva por defecto ni se hizo DELETE de
usuarios/proveedores. El cierre local reutiliza el adapter real para token,
usuario y prefijos `chat_`; no llama logout con un token ya revocado.

`4.1.c -> 4.1.a/b`: ya resueltas. No se agregaron PDF backend, FEL,
facturacion fiscal ni cambios a Stripe/pagos existentes.

`6.1.c/d -> 6.1.a/b e historias integradas`: se ejecutaron gates locales
del codigo presente; no se declaran integradas tareas ajenas ausentes ni
se sustituye reviewer, CI remoto o aceptacion academica.

## Commits funcionales creados

| SHA | Cambio |
|---|---|
| `963d880` | Normaliza telefonos historicos sin alterar datos desconocidos |
| `23954be` | Valida telefono local y descripcion profesional en perfiles |
| `57d48a0` | Alinea formularios de perfil con telefono local y contador profesional |
| `0537779` | Confirma cierre de sesion en las tres superficies activas |
| `6476ef8` | Agrega documentos legales inmutables y consulta publica versionada |
| `da9c43f` | Muestra terminos y privacidad en rutas publicas independientes |
| `e0f2e67` | Registra aceptaciones legales vigentes de forma atomica |
| `a67f2ad` | Exige aceptacion legal explicita y recupera versiones obsoletas |
| `a8883a0` | Espera limpieza de sesion y permite cierre local tras revocacion |
| `74bb94a` | Preserva convergencia del backfill en esquemas anteriores |

Diez commits con cambios funcionales, sin commits vacios, merges de relleno
ni alteraciones cosmeticas para aumentar el conteo. El commit de evidencia
posterior no se necesita para alcanzar ese minimo.
SHA de produccion revisado: `74bb94a6ebacd4e54c2b2aaa22e89c7e0bc5a735`.
SHA del informe: `git log -1 --format='%H %s' -- docs/sprint10/avance-pt.md`.

## Comandos y resultados ejecutados

Docker desde ServiGT; npm/npx locales desde frontend, con `.cmd` en PowerShell.

| Comando | Resultado observado |
|---|---|
| `docker compose up -d --build` | Aprobado; se inicio Docker Desktop y se preservaron volumenes |
| `docker compose --profile test build backend_test` | Aprobado; imagen reconstruida tras cambios backend |
| `docker compose --profile test up -d --force-recreate --wait db_test` | Aprobado; exclusivamente tmpfs de tests, no datos persistentes |
| `docker compose --profile test run --rm backend_test tests/Feature/TelefonoBackfillTest.php --compact` | Final: 2 aprobados, 18 aserciones, 0.71 s; datos existentes y columna antigua ausente |
| `... --filter 'ProviderValidationSprint10Test\|ProviderAuthorizationTest\|RoleSeparationSprint9Test\|PremiumPersonalizacionTest' --compact` | 41 aprobados, 185 aserciones |
| `... tests/Feature/DocumentosLegalesTest.php --compact` | 4 aprobados, 14 aserciones |
| `... --filter 'RegistroLegalTest\|AuthSecurityTest\|RegistroConfirmacionYDominioTest\|RateLimitingTest' --compact` | 31 aprobados antes de ampliar los dos casos negativos finales |
| `... tests/Feature/RegistroLegalTest.php --compact` | 7 aprobados, 28 aserciones, incluye rollback y bloqueo sin textos |
| `docker compose --profile test run --rm backend_test --compact` | Final backend: 697 aprobados, 3179 aserciones, 30.22 s |
| `docker exec servigt_frontend npm test -- --runInBand RegisterScreen ProviderEditProfileScreen LogoutButton LogoutSurfaces LegalDocumentScreen --silent` | 5 suites, 27 aprobados |
| `docker exec servigt_frontend npm test -- --runInBand SessionContext sessionStorage --silent` | 2 suites, 9 aprobados |
| `docker exec servigt_frontend npm test -- --ci --runInBand --coverage --coverageReporters=json --coverageReporters=json-summary` | Final Jest: 37 suites, 326 aprobados, 20.395 s; warnings visibles |
| `docker exec servigt_frontend npm run build:web` | Aprobado; exportacion dist, bundle 1.96 MB |
| `npx.cmd playwright test e2e/sprint10-responsive.spec.js e2e/sprint10-deploy-smoke.spec.js` | Final: 13 aprobados, 29.0 s |
| `docker exec servigt_backend php -m` | Sin PCOV/Xdebug; no se afirma cobertura de lineas backend |
| `docker exec servigt_backend php /app/docker/sync_schema.php` (dos veces) | Misma huella y conteos antes/despues en volumen existente |
| `docker compose ps` | DB/backend healthy; frontend activo en http://localhost:8086 |
| `git diff origin/dev --check` y `git diff --cached --check` desde WSL | Sin errores; se elimino una linea vacia final del manifest |
| Patrones de secretos de CI sobre archivos textuales modificados | Sin coincidencias; valores sensibles no se imprimen |

Los puntos suspensivos de comandos focales significan el mismo prefijo
`docker compose --profile test run --rm backend_test`, no ejecuciones omitidas.
Backend completo previo a legal: 685 aprobados/3135 aserciones; gate previo
al ajuste de orden SQL: 696/3180. Las aserciones de carreras pueden variar
por el orden efectivo de llegada; se registra cada resultado sin corregirlo
artificialmente. Jest previo
al cierre local: 324 aprobados. Se distinguen de los gates finales.

Cobertura Istanbul final del conjunto cargado por Jest: lineas **69.44%**,
sentencias **67.05%**, funciones **61.08%**, ramas **63.13%**. No se presenta
como 80% global ni como cobertura de todo el frontend no cargado por tests.
Ver `evidencia/cobertura-jest.json` y [matriz backend](matriz-backend.md).

## Responsive, smoke y CI

Nueve casos con fixtures de presentacion en Chromium a 1440/1024/390,
sin datos fake en produccion: legal publico con/sin sesion, error/reintento,
registro sin premarcar, mismatch, 409, payload, perfil y logout. Un caso
adicional consulta API local real: health 200 y legal 503 por falta de textos.
Tres casos leen el despliegue real, sin iniciar sesion ni escribir datos.
Capturas inspeccionadas: lectura, ajustes de linea, contador, dialogo y
ausencia de overflow. No equivalen a sesiones UX humanas ni a alta legal real.

GET de `https://servigtdev.com/` y `/api/health`: **200**, PostgreSQL conectado.
Browser confirma portada y formulario de login a los tres anchos. `www`
redirige al dominio canonico. PowerShell reporto 308 en HTTP; no fue un 500.
Health/headers no aportan SHA Git: **SHA desplegado no corroborado**.

GitHub Actions consultado por API publica, sin modificar GitHub:
[backend base](https://github.com/SrCharlied/G6Software-PServicios/actions/runs/39890384864),
[frontend base](https://github.com/SrCharlied/G6Software-PServicios/actions/runs/39890384815).
Ambos `completed/success` en `da89b15d8f8a7931b5f1e08d9449fb4210fb5d82`.
**Eso no es CI del incremento local.** Falta push/PR manual y CI de su SHA.
Se revisaron los workflows: backend PostgreSQL y frontend Jest/build/diff/
patrones de secretos. No se modificaron workflows ni se afirmo un nuevo run.

## Fallos y limitaciones, sin ocultarlos

- TDD backend inicial: 10 fallidos, API aceptaba campos invalidos con 201;
  despues de la correccion pasaron los focales y suite completa.
- Test nuevo de perfil: mock de fuentes Expo incompleto, luego selector que
  ignoraba el marcador de categoria seleccionada. Se corrigieron mocks/
  selector, no produccion para satisfacer un test defectuoso.
- Test logout: el texto desaparece durante loading; doble evento se prueba
  en el mismo batch. Mock de dimensiones debia aplicarse al modulo real.
- Primer responsive: 6 aprobados/3 fallidos. RN Web no exponia checked del
  checkbox con accessibilityState; se agrego `aria-checked` y se verifico
  desmarcado/marcado/reset mediante browser. Final: 13/13.
- Revision final SQL: se movio el backfill despues del ALTER que agrega
  telefono. La regresion simula la columna ausente solamente en db_test,
  dentro de una transaccion revertida. No altera esquemas humanos.
- Warnings de act/Animated (incluidos nuevos tests asincronos) y NO_COLOR
  visibles. No se cambiaron timeouts globales ni se silenciaron gates.
- Un probe PHP de cobertura fallo por quoting PowerShell; `php -m` fue la
  comprobacion corregida. El navegador web de investigacion no pudo acceder
  al sitio/GitHub; las consultas directas GET y Playwright si funcionaron.
- No se ejecutaron altas legales E2E reales ni k6: faltan textos aprobados.
  No se ejecuto la suite E2E historica completa ni scripts de limpieza que
  borran usuarios: requieren adaptacion a 3.1, tambien por las FK de aceptacion.
  No se inventaron aprobaciones ni borraron cuentas para volverlos verdes.
- No hay eliminacion de cuenta implementada. Faltan reglas ratificadas de
  operaciones activas/ultimo admin, PII y archivos por limpiar, retencion de
  comprobantes/reportes/evidencias e idempotencia del manifiesto. Se pidio
  la decision; no se sustituyo por un comportamiento destructivo inventado.
- No se tocaron features ajenas sin dependencia real (categorias multiples,
  experiencia, nueva politica Premium, notificaciones o pagos).

## Continuacion humana y tecnica

1. Entregar textos aprobados, version 1.0, responsables, fecha y vigencia;
   publicar esos registros reales sin alterar versiones existentes.
2. Ratificar/ubicar politicas de 3.1. Implementar anonimizado+revocacion,
   bloqueos, manifiesto y retencion; integrar 3.2.a y el exito/error de 3.2.b.
3. Adaptar limpieza smoke a anonimizado; luego ejecutar altas y eliminacion
   E2E reales. No reutilizar DELETE users como limpieza.
4. Completar reviewer y demas historias integradas necesarias para cerrar 6.1.
5. Usuario hace push/PR hacia dev, conserva los commits y comprueba CI del
   SHA integrado. Corroborar SHA desplegado mediante evidencia del host.
6. Completar [Planning/Jira](planning-jira-pt.md) y [LOGT](logt-pt.md) reales.

Archivos: ver [manifest del cambio](archivos-pt.md). No se versionan secretos,
tokens, logs sensibles, traces, node_modules ni dist. Los datos de tests no
se presentan como cuentas/aprobaciones humanas. El estado Git y el SHA del
commit de evidencia se verifican al finalizar y se entregan en el reporte.
