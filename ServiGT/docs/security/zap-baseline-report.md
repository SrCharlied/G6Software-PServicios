# ZAP Baseline — Sprint 7 ServiGT

**Task:** 6.3 · Regresión OWASP y cierre
**Herramienta:** `ghcr.io/zaproxy/zaproxy:stable` (ZAP by Checkmarx), imagen `781a2bdaea47`
**Commit escaneado:** `dev@c29a0ed`
**Fecha:** 07/09/2026
**Responsable:** CL

## Alcance y límites

El escaneo se ejecutó **únicamente contra el stack local**, por la red interna de Docker Compose (`servigt_servigt_net`), sobre datos sintéticos sembrados por `sync_schema.php`. No se tocó ningún servicio de producción ni de terceros. `zap-baseline.py` es un escaneo **pasivo** con spider: observa tráfico y cabeceras, no lanza payloads de ataque ni intenta explotar nada.

Esta corrida es el **antes**. Se hizo a propósito con las tasks **4.1, 3.1 y 2.4 todavía sin integrar**: si se esperaba a que entraran, la línea de comparación del antes/después dejaba de existir. El *después* se corre al cerrar el sprint con el mismo comando.

### Comando exacto

```bash
docker run --rm --network servigt_servigt_net \
  -v "<ruta>/zap:/zap/wrk:rw" -u 0 \
  ghcr.io/zaproxy/zaproxy:stable \
  zap-baseline.py -t http://backend:8000 -r zap-backend.html -w zap-backend.md -I
```

> **Nota operativa.** El contenedor de ZAP **no** alcanza `localhost`: `localhost` dentro del contenedor es el propio contenedor. Hay que unirlo a la red de Compose con `--network servigt_servigt_net` y apuntar al **nombre del servicio** (`backend`, `frontend_prod`), no a un puerto del host. Se pierde media hora si no se sabe.

## Resultados

| Objetivo | High | Medium | Low | WARN | PASS |
|---|---:|---:|---:|---:|---:|
| `http://backend:8000` | 0 | 2 | 7 | 9 | 58 |
| `http://frontend_prod:80` | 0 | 0 | 5 | 5 | 62 |

**Cero alertas de riesgo alto en ambos objetivos.** Las dos únicas de riesgo **Medium** están las dos en el backend y son *CSP Header Not Set* y *Missing Anti-clickjacking Header* — ambas clasificadas abajo como aceptadas, así que conviene leer su justificación con atención: son las alertas más severas de toda la corrida.

El contraste entre los dos objetivos es en sí mismo la evidencia de la task 4.2: los headers que Nginx agrega al export web eliminan cuatro alertas que el backend sí presenta (CSP ausente, `X-Content-Type-Options` ausente, anti-clickjacking ausente y `Permissions-Policy` ausente).

## Clasificación de cada alerta

Conforme al criterio de la task: toda alerta queda **corregida**, **aceptada**, **falsa positiva** o **follow-up**.

### `backend:8000` — 9 alertas

| Alerta | ZAP ID | Clasificación | Justificación |
|---|---|---|---|
| CSP Header Not Set | 10038 | **Aceptado** | El backend es una API JSON consumida por Bearer token; no renderiza HTML propio en el flujo de la aplicación. La CSP que importa es la del cliente web, y ya está aplicada en `frontend_prod` (task 4.2). |
| Missing Anti-clickjacking Header | 10020 | **Aceptado** | Mismo motivo: nada del backend se embebe en un iframe. El `frame-ancestors 'none'` y `X-Frame-Options: DENY` del cliente web sí están puestos. |
| X-Content-Type-Options Header Missing | 10021 | **Follow-up** | Bajo esfuerzo, bajo riesgo. Un `nosniff` global en el backend es una línea de middleware. Sprint 8. |
| Permissions-Policy Header Not Set | 10063 | **Aceptado** | Sin relevancia para una API sin superficie de navegador. |
| Cross-Origin-{Embedder,Opener,Resource}-Policy Missing | 90004 | **Aceptado** | Son tres alertas distintas que ZAP agrupa bajo el mismo id. Aplican a documentos que aíslan recursos cross-origin; no a respuestas JSON. |
| Server leaks info via `X-Powered-By` | 10037 | **Follow-up** | Confirma el hallazgo detectado al capturar los headers. Revela `PHP/8.3.33`, lo que facilita buscar advisories de esa versión exacta. Se cierra con `expose_php = Off`. Sprint 8. |
| Cookie No HttpOnly Flag | 10010 | **Falso positivo (en el flujo real)** | La cookie proviene de la ruta web de bienvenida de Laravel, no del flujo de la API: la autenticación usa Bearer token y `bootstrap/app.php` documenta explícitamente que **no** se usa `statefulApi()` ni cookies. La ruta web no forma parte del producto. Se convierte en hallazgo real solo si alguna vez se sirve UI desde Laravel. |
| Session Management Response Identified | 10112 | **Informativo** | ZAP detectó un patrón de sesión; consecuencia de la misma cookie de la ruta web. Sin acción. |
| Non-Storable Content | 10049 | **Falso positivo** | Es consecuencia de `Cache-Control: no-cache, private`, que es lo correcto para respuestas autenticadas. ZAP lo marca como observación, no como defecto. |

### `frontend_prod:80` — 5 alertas

| Alerta | ZAP ID | Clasificación | Justificación |
|---|---|---|---|
| CSP: `style-src unsafe-inline` | 10055 | **Aceptado con justificación técnica** | React Native Web inyecta estilos en línea en tiempo de ejecución; quitar `unsafe-inline` rompe el render. Es el precio del stack, no un descuido. El resto de la directiva sí es estricta: `script-src 'self'`, `object-src 'none'`, `frame-ancestors 'none'`, `base-uri 'self'`, `form-action 'self'`. |
| Server leaks version via `Server` header | 10036 | **Follow-up** | Revela `nginx/1.27.5`. Se cierra con `server_tokens off;`. Misma clase que el `X-Powered-By` del backend. Sprint 8. |
| Cross-Origin-{Embedder,Opener,Resource}-Policy Missing | 90004 | **Follow-up** | Aquí sí aplican, porque el objetivo es un documento HTML. Agregarlas exige verificar que no rompan el bundle de Expo. Bajo riesgo, requiere prueba. Sprint 8. |
| Non-Storable Content | 10049 | **Falso positivo** | Lo dispara el `Cache-Control: no-store` que la task 4.2 puso **a propósito** para que el bundle autenticado no quede en caché. La alerta es literalmente el control funcionando. |
| Modern Web Application | 10109 | **Informativo** | ZAP avisa que el objetivo es una SPA y que el spider pasivo ve poco. Sin acción; explica por qué el conteo de URLs es bajo. |

## Resumen de la clasificación

| Clasificación | Cantidad |
|---|---:|
| Corregido | 0 |
| Aceptado con justificación | 6 |
| Falso positivo | 3 |
| Follow-up a Sprint 8 | 4 |
| Informativo | 2 |

Ninguna alerta quedó sin clasificar, y **ninguna se declaró corregida**: sería falso, porque este escaneo es el punto de partida, no el de llegada.

## Lo que este escaneo NO prueba

Con honestidad, porque un baseline pasivo se malinterpreta con facilidad:

- **No prueba la autorización.** ZAP escaneó sin autenticarse, así que no recorrió ni una ruta protegida. Todo lo que sabemos de BOLA, ownership y roles viene de `MatrizAutorizacionTest` (65 casos) y de las suites de documentos y publicaciones, no de aquí.
- **No es un pentest.** No hay escaneo activo, ni fuzzing, ni intento de explotación. `zap-baseline.py` observa; no ataca.
- **No cubre el cliente de desarrollo.** Se escaneó `frontend_prod`, que es el target de entrega. El servicio `frontend` con `expo start --web` no lleva los headers y no debe llevarlos: es una herramienta de desarrollo.
- **Cero alertas altas no significa ausencia de vulnerabilidades.** Significa que no hay ninguna detectable de forma pasiva y sin autenticación.

## Reproducir

```bash
cd ServiGT
export COMPOSE_PROJECT_NAME=servigt
docker compose up -d db backend frontend_prod

Z="$(pwd)/../zap-out" && mkdir -p "$Z"

docker run --rm --network servigt_servigt_net -v "$Z:/zap/wrk:rw" -u 0 \
  ghcr.io/zaproxy/zaproxy:stable zap-baseline.py \
  -t http://backend:8000 -r zap-backend.html -w zap-backend.md -I

docker run --rm --network servigt_servigt_net -v "$Z:/zap/wrk:rw" -u 0 \
  ghcr.io/zaproxy/zaproxy:stable zap-baseline.py \
  -t http://frontend_prod:80 -r zap-frontend.html -w zap-frontend.md -I
```

La salida cruda de esta corrida queda versionada en [`zap-2026-09-07/`](zap-2026-09-07/):

- [`zap-backend.md`](zap-2026-09-07/zap-backend.md)
- [`zap-frontend.md`](zap-2026-09-07/zap-frontend.md)

Los reportes HTML equivalentes (68 KB y 43 KB) se dejan fuera del repositorio por ruido en el diff y se adjuntan a la evidencia de entrega del sprint.
