# Sprint 9 - Tarea 7.3: Pruebas e integracion final

Fecha local: 2026-10-12; backend UTC: 2026-10-13.
Rama: `7.3-sprint-9`. Owner: Pablo Toledo. Reviewer: Carlos Lopez.
Estado: tarea 7.3 verificada tecnicamente; todos los gates finales aprobados.
La aprobacion humana del equipo sigue pendiente.

## Base y cambios necesarios

Se leyeron `../AGENTS.md`, `ServiGT-Plan-Sprint-9-Asignado.md`, rutas,
modelos, controladores, contratos, pantallas, servicios y tests relacionados.
`git fetch origin dev` se ejecuto desde WSL. Base `d89bf51`, coincidente
con `origin/dev`, merge de PR 53. Se conservaron los commits anteriores.
3.1, 3.2 y 4.3 estaban integradas (`cf7cd73`, `79627a6`, `7092ab9`): no se
rehicieron. Los resultados anteriores 448 backend/211 Jest/9 E2E eran
parciales, antes de integrar seguridad; no son los resultados de este cierre.

5.1-5.4, admin 6.2 y regresion 7.1 ya estaban integradas. Faltaban UI 6.1
y evidencia global 7.2. Se corrigieron las dependencias realmente encontradas:

| Tarea/correccion | Commit |
|---|---|
| 1.1 Listado por rol, sin pedir al proveedor el endpoint exclusivo de clientes | `cdf1462` |
| 3.4 Navegacion de seis tipos reales de notificacion | `5c4c2e3` |
| 6.1 Centro de seguridad, reporte, interrupcion y evidencia | `de1f405` |
| Regresion 6.1: recargar tarjetas al regresar desde Seguridad | `db4de72` |
| 7.2 Responsive y evidencia | `966d7a7` |
| 7.3 E2E y este informe | Commit con el mensaje obligatorio de cierre |

No se modificaron backend, esquema, reglas de negocio, login, CI ni layout
global. SHA completo del ultimo cambio de produccion probado:
`db4de727947610a712a078b1a8163441fd43f3ba`.
Los commits siguientes agregan pruebas/documentacion. El SHA del propio
commit que contiene este informe se obtiene sin autorreferencia circular:

```bash
git log -1 --format='%H %s' -- docs/sprint9/cierre.md
```

## Recorridos reales

`frontend/e2e/sprint9-critical-flows.spec.js`: 13 casos Chromium seriales,
API y PostgreSQL reales, sin interceptar requests ni IDs quemados. Registra
cliente y dos proveedores, crea sus perfiles por API y captura los tokens
nuevos del login real. Cada cuenta reutiliza esa sesion real entre pantallas.

**Materiales:** cancelar desde `en_camino`, publicar desde Historial con PNG
y Q0, editar conservando imagen, reservar idempotentemente, aceptar, escribir
por ambas partes en el chat contextual y vender. Comprueba permisos de
cliente, tercero, anonimo y admin; lote terminal y aislamiento de no leidos
entre dos servicios con la misma persona y una reserva.

**Seguridad desde ambos roles:** reporte simple conserva `aceptado`, reenvio
idempotente y PDF privado posterior. Autor descarga; contraparte, tercero y
anonimo no acceden. No hay rutas privadas, hashes ni notas internas en el
JSON del autor. `/storage/...` responde 403/404 y no entrega PDF. Interrumpir
requiere confirmacion, termina el servicio, oculta codigos y bloquea avance,
cancelacion y escritura de chat. Volver con el boton real actualiza tarjeta
y acciones; proveedor encuentra el servicio en Historial. Chat historico
legible sin composer. Notificaciones sanitizadas: solo `servicio_id`.

**Admin:** credenciales configuradas localmente, leidas dentro de Docker en
memoria sin imprimirlas ni guardarlas. Descarga autorizada, transicion
`recibido -> en_revision -> resuelto`, historial auditable, nota no visible
al autor, rechazo de reapertura y servicio todavia terminal. Sin sanciones,
reembolsos ni cambios automaticos de saldo.

**Esquema existente:** ultimo E2E reaplica `sync_schema.php` dos veces sobre
diez tablas pobladas por el recorrido. Compara conteos y SHA-256 de filas
ordenadas, sin imprimir datos sensibles: todo permanece igual. Reaplicacion
manual posterior a limpieza: mismos 2 usuarios preexistentes y huella igual.
Base limpia: `db_test` tmpfs desde `init.sql` y suite PostgreSQL. No se borran
volumenes ni datos humanos.

## Revision de 7.1 y 7.2

[backend-regresion.md](backend-regresion.md), commit `b23effe`, incluye matriz
negativa, estados invalidos, seis clases de carreras y verificacion por
mutaciones. Se reejecutaron suite completa y grupo `concurrencia`. Las
aserciones de carreras pueden variar por orden de llegada: grupo actual
156, historico 157. No se repitieron mutaciones: se reviso su evidencia;
no hay codigo mutado en esta rama. Su hallazgo de chat legacy quedo resuelto
al integrar 4.3; el E2E actual verifica hilos tipados y aislamiento. Las
preguntas de producto y riesgos residuales de ese informe no se ocultan.

[responsive-checklist.md](responsive-checklist.md): 21 casos a 1440/1024/390
px, catalogo, lotes, reservas, bandeja, Seguridad y admin; loading, contenido,
vacio cuando aplica, error/reintento, terminales, menu movil y overflow.
Fixtures solo dentro de Playwright; no sustituyen la integracion real.
Capturas minimas revisadas en `evidencia/`, sin sesiones ni reportes reales.
La captura de modal admin espera el campo en viewport y desactiva animacion
solo al tomar la imagen, no en produccion.

## Comandos y resultados reales

Docker desde `ServiGT/`; npm/npx desde `ServiGT/frontend/`. En PowerShell
se usaron `.cmd` porque el host bloquea los wrappers `.ps1`; Git desde WSL.

| Gate | Comando ejecutado | Resultado |
|---|---|---|
| Stack | `docker compose up --build -d` | Aprobado; volumen preservado |
| Imagen tests | `docker compose --profile test build backend_test` | Aprobado |
| Base limpia actualizada | `docker compose --profile test up -d --force-recreate --wait db_test` | Healthy; solo tmpfs de tests |
| Backend completo | `docker compose --profile test run --rm backend_test --compact` | 588 aprobados, 2642 aserciones, 24.87 s |
| Carreras | `docker compose --profile test run --rm backend_test --group concurrencia --compact` | 24 aprobados, 156 aserciones, 7.49 s |
| Seguridad focal | `npm.cmd test -- --runInBand ServiceSafetyScreen --silent` | 12 aprobados |
| Componentes afectados iniciales | `npm.cmd test -- --runInBand ServiceSafetyScreen ServicioCard SolicitudesScreen --silent` | 37 aprobados antes de ampliar regresiones |
| Notificaciones focal | `npm.cmd test -- --runInBand notificationRoutes --silent` | 13 aprobados |
| Retorno a servicios final | `npm.cmd test -- --runInBand SolicitudesScreen --silent` | 16 aprobados |
| Jest final | `docker exec servigt_frontend npm test -- --ci --runInBand` | 29 suites, 258 aprobados, 12.798 s; warnings visibles |
| Build final | `docker exec servigt_frontend npm run build:web` | Exportacion aprobada, bundle 1.92 MB |
| Responsive focal inicial | `npx.cmd playwright test e2e/sprint9-responsive.spec.js` | 21 aprobados, 27.9 s |
| E2E critico focal final | `npx.cmd playwright test e2e/sprint9-critical-flows.spec.js` | 13 aprobados, 24.4 s; retorno y esquema incluidos |
| Todos los E2E finales | `npx.cmd playwright test` | 52 aprobados, 0 fallidos, 0 omitidos, 3.0 min |
| Esquema manual existente | `docker exec servigt_backend php /app/docker/sync_schema.php` | Demo desactivado, misma huella antes/despues |
| Diff | `git diff --check` y `git diff --cached --check` desde WSL | Sin errores; codigo y documentos revisados |
| Salud | `docker compose ps` | DB/backend healthy; frontend en 8086 |

Tambien pasaron Jest local 29/256 antes de ampliar recuperacion, Docker
29/257 despues y Docker 29/258 con `--silent` antes del gate final sin
silenciar warnings. Un E2E completo previo paso 51/51 y otro 52/52 tras
agregar esquema, antes de ampliar la comprobacion de retorno.

## Fallos y reintentos registrados

1. TDD inicial rojo: faltaba `ServiceSafetyScreen`; se implemento 6.1.
2. E2E esperaba 404 en ruta publica privada, recibio 403: ambos deniegan.
   Ahora exige 403/404 y cuerpo no PDF, sin permitir acceso para pasar.
3. Registros y logins repetidos recibieron 429. Fixtures respetan
   `Retry-After` y reutilizan sesiones reales. Solo preparacion tiene 90 s
   para esperar una ventana real de hasta 60 s; tests conservan 30 s.
   Un segundo argumento numerico del hook no configuraba timeout: se uso
   `test.setTimeout` dentro del hook. No se tocaron limites ni CI.
4. Primer gate completo: 3 fallidos/43 aprobados/5 no ejecutados. Selector
   de correo duplicado coincidia con dos textos; el test siguiente dependia
   del usuario de un worker reiniciado que generaba otro timestamp. Secuencia
   ahora serial y selector preciso. Fixture Sprint 8 no contemplaba 429.
5. Repeticion focal antigua: 3 aprobados/1 timeout de hook/5 no ejecutados
   antes de corregir su configuracion. Corrida completa intermedia:
   47 aprobados/2 fallidos/2 no ejecutados: registro aun sin preflight de
   ventana y ENOENT de traces por dos procesos Playwright contra el mismo
   directorio. Gate final sin Playwright solapado.
6. Inspeccion visual: captura del detalle admin antes de finalizar slide.
   Espera viewport y animacion desactivada solo en screenshot.
7. Retorno real desde Seguridad agregado: 9 aprobados/1 fallido/3 no
   ejecutados. Tarjeta aceptada con codigo y acciones tras interrupcion
   confirmada. Expo conserva pantallas del Stack y el fetch solo ocurria
   al montar. Se recarga con foco real en cliente/proveedor, sin estados
   optimistas ni consultas mientras la pantalla esta fuera de foco.
   Focal posterior 13/13 y regresion Jest de retorno aprobada.
8. `--group=concurrency`: "No tests found". Grupo real `concurrencia`:
   ejecucion corregida 24/24.
9. Warnings de `act`/Animated y `NO_COLOR` siguen visibles sin fallar tests.
   Instalar picker informo 87 avisos de auditoria del arbol completo; no
   se aplico `npm audit fix` ni refactor ajeno.

## Privacidad, smoke y revision visual

Diff y patrones de llaves/tokens revisados: sin secretos reales nuevos.
Sesiones/interceptor Bearer existentes; ownership en backend; no IDs
manuales para autorizar. Passwords smoke temporales y `fixture-token` solo
en tests visuales. Suites con sesiones reales sin traces. No se versionan
`.env`, tokens, logs, traces, builds ni archivos privados.

Ayuda sin esperar la API del servicio, aun cuando esta falla con sesion
validada; no promete monitoreo, despacho ni SLA. Recursos oficiales
consultados 2026-10-12:
[Bomberos Voluntarios](https://bomberosvoluntarios.org.gt/services/fires),
[Policia Nacional Civil](https://pnc.gob.gt/).

`afterAll` limpia correos exactos: cuentas, tokens, relaciones en cascada,
imagenes de sus lotes y evidencia privada de sus reportes. Prefijo smoke
validado y stack local obligatorio. Sin limpieza global de DB. La cuenta
del primer test antiguo fallido se identifico por timestamp y se limpio
dirigidamente. Comprobacion posterior: 0 cuentas `smoke-s9-*` restantes,
2 usuarios preexistentes preservados y ningun payload privado smoke en
`storage/logs/laravel.log`. Capturas versionadas solo contienen fixtures; Sprint 8
ahora escribe screenshots en `test-results`, preservando evidencia previa.

## Limites y follow-ups

- Web Chromium; no pruebas fisicas Android/iOS, `app.json` declara web.
  No auditoria exhaustiva de accesibilidad ni llamadas externas reales.
- Restaurar sesion en frio sin backend conserva el comportamiento actual
  de auth. No se cambio login ni se permitio acceso sin autorizacion.
- Preguntas de 7.1 siguen abiertas: reservas rechazadas tras cancelacion,
  chat de reservas canceladas/rechazadas, retencion de auditoria al borrar
  usuarios y orden de validacion/autorizacion. No se inventaron reglas.
- Falta aprobacion humana del reviewer y despliegue de produccion. El
  cierre tecnico no equivale al cierre organizativo del Sprint 9.

## Archivos y Git

1.1: `src/screens/SolicitudesScreen.js` y test. 3.4:
`src/utils/notificationRoutes.js` y test.
6.1: `app/(protected)/seguridad/servicios/[id].js`,
`src/screens/ServiceSafetyScreen.js` y test, `src/utils/serviceSafety.js`,
`src/services/api.js`, `package.json`/lockfile, rutas solicitudes/dashboard,
`SolicitudesScreen` y test, `ProviderDashboardScreen`,
`screens/provider/ServicioCard` y test, `ProviderBadges`.
7.2: `frontend/e2e/sprint9-responsive.spec.js`,
`docs/sprint9/responsive-checklist.md`, siete PNG de presentacion.
7.3: `frontend/e2e/sprint9-critical-flows.spec.js`, este documento,
`e2e/auth-registro.spec.js`, `e2e/sprint8-responsive.spec.js`,
`e2e/helpers/local-smoke.js`.

Commits enfocados en la rama actual, sin push/merge/PR. Todos los gates
finales pasaron. El commit de este informe lleva el mensaje solicitado;
su SHA y Git status se verifican y entregan al usuario despues de crearlo.
La evidencia responsive esta en `966d7a70880635615d2b2dc1ad6b504a5a8c0e77`.
