# Smoke de lectura - despliegue observado

Fecha local: 2026-10-26. No se desplego codigo ni se modifico el servidor.

Comando ejecutado mediante PowerShell (GET sin credenciales):

```powershell
Invoke-WebRequest -Uri 'https://servigtdev.com/api/health' -UseBasicParsing -TimeoutSec 20
```

Respuesta HTTP 200, Content-Type application/json:

```json
{"status":"ok","app":"ServiGT Guatemala","backend":"Laravel PHP","database":{"driver":"pgsql","status":"connected"},"correlation_id":"9b353942-ade7-40f0-ae13-e8120c73a1e4","timestamp":"2026-10-27T00:01:50+00:00"}
```

El timestamp UTC corresponde al 26 de octubre local. Se observaron tambien
X-Content-Type-Options nosniff, X-Frame-Options DENY, CSP y Referrer-Policy.
No se los presenta como una auditoria exhaustiva de seguridad.

Portada HTTPS: 200 text/html. `www` termina en el dominio canonico.
HTTP respondio 308 (PowerShell lo reporta como excepcion de redireccion).

Playwright real sin mocks de respuestas ni credenciales:

```bash
npx playwright test e2e/sprint10-deploy-smoke.spec.js
```

Se ejecuto junto con el focal responsive local: 3 casos de despliegue de
los 13 aprobados totales. Verifica health, portada ServiGT y login visible
sin overflow a 1440/1024/390 px. Intercepta para abortar cualquier metodo
distinto de GET/HEAD: no registra, compra, autentica ni elimina datos.

**SHA desplegado: no corroborado.** Ni health ni headers identifican Git.
Este smoke no prueba que el incremento local este desplegado ni reemplaza
la revision/CI del SHA integrado. Captura real: `s10-deploy-login-390.png`.

## Smoke del incremento integrado (2026-11-06)

`e2e/sprint10-deploy-smoke.spec.js` ahora corrobora la version con
**huellas**: comportamientos publicos, de solo lectura, que solo existen
desde el Sprint 10. Sigue sin iniciar sesion ni escribir datos.

| Prueba | Que demuestra |
|---|---|
| Health y cabeceras de seguridad | Servicio arriba, BD conectada, CSP/nosniff/DENY |
| `GET /api/cuenta/eliminacion/impacto` sin sesion = `401` | 3.1.b desplegada (antes `404`) |
| `GET /api/providers?categoria_id=abc` = `422` | 1.6.b desplegada (antes `200`) |
| Catalogo con `categorias`, maximo 3, principal primero | 1.6.b desplegada |
| `/notificaciones`, `/me`, `/cuenta/...` sin sesion = `401` | Rutas privadas protegidas |
| Bundle con `/cuenta/eliminacion/impacto` y `seleccionadas` | 3.2 y 1.6.c en el frontend publicado |
| Portada, login y `/cuenta` sin sesion a 1440/1024/390 | Pantallas sin overflow; `/cuenta` redirige a `/landing` |

### Como ejecutarlo

Desde `ServiGT/frontend/`, con Node 20 o superior (Playwright 1.63 no corre
en Node 18, que es el del contenedor del frontend):

```bash
npm ci
npx playwright install chromium
npx playwright test e2e/sprint10-deploy-smoke.spec.js
```

Variables opcionales: `E2E_DEPLOY_URL` (por defecto
`https://servigtdev.com`), `E2E_DEPLOY_API` (por defecto `<URL>/api`) y
`E2E_CHROMIUM_PATH` para usar un Chromium ya instalado. Para validar contra
una replica local del despliegue: `docker compose --profile prod up -d --build
backend frontend_prod` y `E2E_DEPLOY_URL=http://localhost:8087`.

Las capturas quedan en `test-results/s10-deploy-login-{1440,1024,390}.png`.

### Resultados del 2026-11-06

| Destino | Version | Resultado |
|---|---|---|
| Replica local `frontend_prod` :8087 | `dev` en `9e1003a` | **10/10** |
| `https://servigtdev.com` | anterior al Sprint 10 | **2/10**: pasan salud y cabeceras; fallan las 5 huellas (`404`, `200`, sin `categorias`, bundle sin la 3.2/1.6.c) y las 3 pantallas (`/cuenta` no existe) |

El 2/10 es la linea base esperada: el despliegue todavia no tiene el
incremento. Despues de desplegar `dev` el resultado esperado es 10/10; ese es
el criterio para dar por desplegado el Sprint 10.
