# Verificación de despliegue Sprint 9 — 13 de octubre de 2026

## Resultado

El frontend público ya contiene las rutas del Sprint 9. La evidencia del bundle `entry-b046789ca1f8ffe3edaa63bac97d3f5f.js` y Last-Modified del 29 de septiembre corresponde al despliegue anterior, reemplazado en esta sesión.

## 1. Checkout y Pull Requests

- Directorio Git: `/home/deiv/G6Software-PServicios`; aplicación: `ServiGT/`.
- Rama desplegada: `main`; SHA examinado: `5ce17a0fcbf9f51c1e75f3ddb0a149b43254162e`.
- `git fetch origin dev main` ejecutado; `HEAD...origin/main`: 0/0; `HEAD...origin/dev`: 3/0. No hay commits de dev pendientes de integrar en este checkout.
- La API pública de GitHub confirmó PR #57 y PR #58 fusionados: 14 de octubre a las 00:21:41 y 00:25:12 UTC, respectivamente (13 de octubre en Guatemala).
- Existen los archivos de rutas `bolsa-materiales/index.js`, `bolsa-materiales/mias.js`, `reservas-materiales.js`, `admin/reportes-seguridad.js` y `seguridad/servicios/[id].js` en `frontend/app/(protected)`.
- Se preservaron modificaciones previas en Docker Compose y archivos de pruebas de rendimiento. Este commit solo agrega evidencia.

## 2. Servicio público

- Configuración activa consultada mediante la API local de Caddy (`localhost:2019/config/`), además de `systemctl show caddy`.
- Caddy usa `/etc/caddy/Caddyfile`; `servigtdev.com` envía el tráfico de aplicación a `127.0.0.1:8087`.
- Ese puerto corresponde a `servigt_frontend_prod`, puerto interno 80. El frontend de desarrollo está en 8086 y no atiende el dominio.
- `www.servigtdev.com` devuelve 301 al dominio raíz conservando la ruta.

## 3. Imagen, build y archivos

- Contexto de build: `./frontend`; Dockerfile: `frontend/Dockerfile`; target: `frontend_prod`.
- `frontend_build` ejecuta `npm run build:web` (`expo export --platform web`) con API `/api`; `frontend_prod` copia `dist` a `/usr/share/nginx/html`.
- El contenedor no tiene montajes que oculten los archivos publicados.
- Antes de actualizar, el contenedor público fue creado el 29 de septiembre; recrear el contenedor de desarrollo no lo reemplazó.
- En la sesión se ejecutaron correctamente:
  - `docker compose --profile prod build frontend_prod`
  - `docker compose --profile prod up -d --no-deps --force-recreate frontend_prod`
- Contenedor público actual creado el 14 de octubre a las 00:39:36 UTC.
- Imagen actual: `sha256:3669aaa2e7f052721cb21384460f32e140f8f1284c38c3398a73dc10cd72a7cb`.
- HTML público: Last-Modified `Wed, 14 Oct 2026 00:39:28 GMT`.
- Bundle público: `entry-775ea5f1bf8efbd7e7dc2d19f2ed6a75.js`; HTTP 200. Su hash SHA-256 coincide con el archivo dentro del contenedor.
- El bundle incluye las rutas de bolsa de materiales, reservas y reportes de seguridad.
- `/api/health` responde OK con PostgreSQL conectado.

## Capturas y límites

Capturas reales de Chromium mediante Playwright, con anchos 1440, 1024 y 390 px. Los nombres indican el ancho y la URL solicitada. `verificacion-rutas.json` registra URL solicitada, URL final, HTTP y presencia de “Unmatched Route”.

Las capturas son sin autenticación: las rutas protegidas redirigen a la pantalla pública. No prueban el contenido interno ni los permisos de cliente/proveedor/admin. No se crearon usuarios, servicios ni datos smoke. No se usaron credenciales ni se incluyeron secretos.

Se verificó disponibilidad y resolución de rutas; no se ejecutó la suite de tests porque no se modificó código de aplicación.
