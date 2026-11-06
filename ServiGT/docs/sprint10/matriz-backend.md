# Matriz funcional backend - Sprint 10 integrado

Fecha: 2026-11-05, sobre `dev` en `d3ce952` (incluye 1.6.b, 3.1.b, 5.1,
1.5.a y 1.5.b/c). PostgreSQL de Compose. `php -m` no lista PCOV/Xdebug:
no hay porcentaje medido de lineas backend. Esto es una matriz funcional,
no una forma de atribuir cobertura de codigo o cierre a tareas incompletas.

| Flujo | Evidencia de la suite ejecutada | Estado |
|---|---|---|
| Telefonos historicos y convergencia | TelefonoBackfillTest, dos aplicaciones y valores desconocidos preservados | Aprobado |
| Perfil, fronteras y ownership | ProviderValidationSprint10Test, ProviderAuthorizationTest, RoleSeparationSprint9Test | Aprobado |
| Confirmacion de password/rollback | RegistroConfirmacionYDominioTest, AuthSecurityTest | Aprobado |
| DNS configurable y seguro | RegistroConfirmacionYDominioTest, resolvedor sustituido sin DNS externo | Aprobado |
| Documentos publicos/inmutables | DocumentosLegalesTest: vigente/futuro, SQL UPDATE/DELETE denegados | Aprobado con fixtures aislados |
| Registro y aceptaciones atomicas | RegistroLegalTest: faltante/duplicado/obsoleto/rollback/sin textos/login historico | Aprobado con fixtures aislados |
| Sesion y limites existentes | AuthSecurityTest, RateLimitingTest y matriz de autorizacion existente | Aprobado |
| Comprobante propio/snapshot/historicas | ComprobanteCompraTest y suite completa de creditos | Aprobado |
| Anonimizado/reauth/bloqueos/revocacion | AnonimizacionCuentaSprint10Test (12): auth, admin 403, password, bloqueos 409 y reintento, tombstone con historial, tokens revocados, idempotencia, rollback | Aprobado |
| Retencion y limpieza de archivos/manifiesto | LimpiezaArchivosCuentaSprint10Test (9), EliminacionCuentaSchemaSprint10Test (10) | Aprobado |
| Categorias multiples (1.6.b) | CategoriasMultiplesSprint10Test (15): maximo 3, principal dentro del conjunto, rollback, catalogo y filtro | Aprobado |
| Autorizar antes de validar (5.1) | AutorizarAntesDeValidarSprint10Test (10) | Aprobado |
| Conteo de notificaciones no leidas (1.5.a) | NotificacionConteoSprint10Test (3), NotificacionLecturaTest | Aprobado |

13/13 filas cuentan con pruebas aprobadas: **100% de esta matriz definida**,
no 100% de lineas ni de todo el Sprint 10.

Resultado suite final backend: 772 pruebas, 3560 aserciones, 0 fallos
(`docker compose --profile test run --rm backend_test`, `db_test` recreada).
Frontend en el mismo SHA: Jest 43 suites / 377 pruebas en verde y
`npm run build:web` exporta `dist`.

Pendiente fuera de esta matriz: aprobacion humana, prueba integrada con
contenido legal real, pantalla de eliminacion (3.2), limite de 3 categorias
en la UI (1.6.c), despliegue y smoke sobre el SHA desplegado (6.1).
