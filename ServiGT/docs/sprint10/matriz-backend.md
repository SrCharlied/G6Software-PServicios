# Matriz funcional backend - alcance PT y dependencias

Fecha: 2026-10-26. PostgreSQL de Compose. `php -m` no lista PCOV/Xdebug:
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
| Anonimizado/reauth/bloqueos/revocacion | 3.1 no integrado, politicas pendientes | Pendiente |
| Retencion y limpieza de archivos/manifiesto | 3.1 no integrado, politicas pendientes | Pendiente |

8/10 filas cuentan con pruebas aprobadas: **80% de esta matriz definida**,
no 80% de lineas ni de todo el Sprint 10. Las dos filas faltantes son
criticas y bloquean eliminacion/cierre, aunque el resto este verde.
Resultado suite final: 697 pruebas, 3179 aserciones. La aprobacion humana
y la prueba integrada con contenido legal real permanecen pendientes.
