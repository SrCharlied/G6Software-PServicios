# Sprint 8 - cierre técnico del incremento

Fecha: 2026-09-29. Rama: `sprint-8-pablo`. SHA evaluado antes de agregar este
documento: `0442eecfe7d9cf76344c43aaeb0c325207b24042`.

La rama partió del commit `5f19664`. Al inicio, la referencia local
`origin/dev` y `HEAD` no tenían diferencias. `git fetch origin dev` no pudo
actualizar esa referencia desde PowerShell por `Host key verification failed`;
el remoto SSH está configurado en WSL. No se hizo reset, merge, push ni PR.

## Estado por task

| Task | Estado | Evidencia principal |
|---|---|---|
| 1.1 Transiciones seguras | Verificada en la base de integración | Suite completa y concurrencia |
| 1.2 Concurrencia | Completa | `ServicioConcurrenciaTest`, commit `6ee6c3e` |
| 2.1 Cancelación backend | Completa | [Contrato API](cancelacion-api.md), commit `2b2ff2f` |
| 2.2 Cancelación frontend | Completa | Jest + responsive, commit `277d70f` |
| 2.3 Rutas de notificación | Completa | `notificationRoutes.test.js`, incluida en `277d70f` |
| 3.1 Destinatario de calificación | Completa | `CalificacionDestinatarioTest`, commit `360ba3e` |
| 4.1 Seguridad de registro API | Verificada en la base de integración | `AuthSecurityTest` |
| 4.2 Registro frontend | Completa | `RegisterScreen.test.js`, commit `da0d564` |
| 5.1 Entorno k6 | Ya disponible y reutilizado | `tests/performance/` |
| 5.2 Carga y estrés | Completa | [Rendimiento](rendimiento.md), commit `03cf0d5` |
| 5.3 Regresión de seguridad | Completa | [Seguridad](seguridad.md), commit `cf703ef` |
| 6.1 Responsive | Completa | [Checklist responsive](responsive.md), commit `b8b5328` |
| 6.2 Gates y cierre | Completa | Este documento y resultados siguientes |
| 6.3 Flujos integrados | Completa | [E2E](e2e.md), commit `0442eec` |

## Gates finales

| Gate | Comando | Resultado real |
|---|---|---|
| Backend focal | `docker compose --profile test run --rm backend_test ServicioFlujos... ServicioCancelacion... ServicioConcurrencia... CalificacionDestinatario... AuthSecurity...` | 45 tests, 205 aserciones, verde |
| Frontend focal | `npm test -- --ci --runInBand` con 4 archivos focales | 4 suites, 35 tests, verde |
| Backend completo | `docker compose --profile test run --rm backend_test` | 305 tests, 1137 aserciones, 11.96 s, verde (rejecutado, ver nota) |
| Frontend completo | `npm test -- --ci --runInBand` | 16 suites, 104 tests, 14.65 s, verde (rejecutado, ver nota) |
| Build web | `npm run build:web` | Export web generado en `frontend/dist`, verde |
| Responsive E2E | `npx playwright test e2e/sprint8-responsive.spec.js` | 6 tests, 12.3 s, verde |
| Diff | `git diff --check 5f19664..HEAD` | Sin errores |

> **Nota de reejecución (2026-09-29, posterior a este documento).** La revisión
> independiente de 5.3 encontró un defecto en el contrato de `en_camino`: el
> cliente perdía de vista su `codigo_inicio` al pasar a ese estado, dejando el
> servicio sin salida. Se corrigió en `ServicioResource.php` y
> `SolicitudesScreen.js`, con regresión en ambas capas. Las dos filas marcadas
> arriba se volvieron a ejecutar sobre el incremento corregido; las demás no se
> reejecutaron y conservan la medición original. Detalle en
> [seguridad.md](seguridad.md), sección 7.

| Secretos básicos | nombres sensibles y patrones de llaves/tokens sobre el diff | Sin coincidencias |

El frontend completo aún imprime warnings `act(...)` de animaciones en
`RegisterScreen.test.js` y de una actualización asíncrona en
`MisPublicacionesScreen.test.js`. Las suites pasan; no se tocaron porque no son
la causa de un fallo ni forman parte del alcance funcional.

## Evidencia integrada

- Seguridad: 155 tests / 376 aserciones más 5 tests / 71 aserciones de rate
  limiting; smoke HTTP con 14 comprobaciones confirma que H1, H2 y H3 no se
  reproducen. Ver [seguridad.md](seguridad.md).
- Carga: 5137 requests, 0% fallidas, p95 público 15.78 ms y autenticado
  17.14 ms con 25 VUs.
- Estrés: 35102 requests, 0% fallidas, p95 665.56 ms y máximo 793.27 ms con
  techo de 100 VUs y recuperación a cero. Ver [rendimiento.md](rendimiento.md).
- Flow A, Flow B y cancelaciones: suite focal 3/3 con 70 aserciones; regresión
  relacionada 40/40 con 267 aserciones. Ver [e2e.md](e2e.md).
- UI: registro, cancelación, error, campana y navegación cliente/proveedor en
  1440, 1024 y 390 px, sin overflow horizontal. Ver
  [responsive.md](responsive.md) y sus nueve capturas.

## Fallos en frío y retests

Se conservaron los fallos de preparación relevantes en vez de ocultarlos:

1. La primera cancelación backend usó una imagen Docker vieja y devolvió 404;
   tras reconstruir, una aserción del test asumía un `id` inexistente en
   `creditos_proveedor`. Corregido el test, la suite quedó verde.
2. Los primeros focos frontend detectaron un nombre de mock inválido para Jest
   y una dependencia de iconos/fuentes no aislada. Se corrigió únicamente el
   arnés y luego pasó la suite completa.
3. El primer test de registro usó un selector ambiguo para `Crear cuenta`; se
   agregó un label accesible y el foco quedó verde.
4. El smoke de seguridad intentó usar `requests`, ausente en el host; el script
   pasó a `urllib` estándar. El primer backend HTTP cayó en SQLite por un `.env`
   mal generado; se reinició y `/health` confirmó `pgsql/connected` antes de
   medir.
5. Playwright requirió instalar dependencias declaradas y Chromium. Luego se
   corrigieron selectores, rotación de token y sincronización de capturas. La
   corrida final pasó 6/6.
6. Una regresión combinada falló 9 tests por datos smoke que k6 dejó en la misma
   `db_test`. Se retiró el backend de k6, se destruyó solo la base tmpfs y la
   repetición en frío pasó 40/40.

## Límites y riesgos residuales

- No se ejecutó un ZAP nuevo. La regresión de seguridad se sustenta en suites
  negativas y smoke HTTP, no en un diff de escaneo dinámico.
- No existe trazabilidad persistida `servicio -> pedido/cotización`; la suite
  E2E verifica los IDs del recorrido, pero agregar esa relación sigue fuera de
  alcance.
- Las cifras de rendimiento corresponden a Docker Desktop y
  `php artisan serve` en una máquina local, no a infraestructura productiva.
- `npm install` reportó 26 vulnerabilidades en el árbol existente (18
  moderadas, 7 altas y 1 crítica). No se ejecutó `npm audit fix` porque podría
  cambiar versiones o introducir rupturas fuera del sprint; requiere una tarea
  de dependencias separada.
- Los warnings `act(...)` indicados arriba son deuda de tests no bloqueante.

## Commits del incremento

| Commit | Mensaje |
|---|---|
| `2b2ff2f` | Implementa cancelacion cliente de servicios |
| `277d70f` | Integra cancelacion de servicios en frontend |
| `da0d564` | Alinea formulario de registro con politica backend |
| `6ee6c3e` | Completa concurrencia entre cancelacion e inicio |
| `360ba3e` | Corrige destinatario de calificaciones |
| `cf703ef` | Consolida regresion de seguridad del Sprint 8 |
| `03cf0d5` | Actualiza evidencia de rendimiento del Sprint 8 |
| `b8b5328` | Documenta validacion responsive del Sprint 8 |
| `0442eec` | Verifica flujos integrados del Sprint 8 |

El commit que agrega este cierre se crea después de estos gates. Su hash y el
estado Git final se reportan fuera del propio documento para evitar una
referencia circular.
