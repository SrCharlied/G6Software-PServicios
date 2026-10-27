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
