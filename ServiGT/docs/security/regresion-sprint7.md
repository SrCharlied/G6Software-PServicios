# Evidencia de regresión — Sprint 7 ServiGT

**Task:** 6.3 · Regresión OWASP y cierre
**Commit probado:** `dev@c29a0ed`
**Fecha:** 07/09/2026
**Responsable:** CL

Esta es la línea de comparación congelada antes de que entren las nueve tasks restantes del sprint. Todo lo que sigue se ejecutó; nada está transcrito de una corrida anterior.

---

## 1. Suite backend

**Comando** (el único válido, según `AGENTS.md` §11):

```bash
docker compose --profile test run --rm backend_test
```

**Resultado:**

```text
Tests:    238 passed (859 assertions)
```

**Entorno:** PostgreSQL 16 en el servicio `db_test`, con `database/init.sql` aplicado por `docker-entrypoint-initdb.d`.

> Invocar `php artisan test` sin ese entorno hace que la aplicación caiga al SQLite en memoria que declara `phpunit.xml`, donde no existen las tablas del esquema: produce decenas de fallos por `no such table`. Es un falso rojo. Cualquier evidencia de pruebas del backend que no cite el comando de Compose no es válida.

**Progresión durante el sprint:** 104 → 146 → 173 → 238 pruebas.

## 2. Suite frontend

**Comando:**

```bash
docker exec servigt_frontend npx jest --ci
```

**Resultado:**

```text
Test Suites: 9 passed, 9 total
Tests:       65 passed, 65 total
```

**Progresión durante el sprint:** 48 → 65 pruebas.

## 3. Build web

**Comando:**

```bash
docker exec servigt_frontend npx expo export --platform web
```

**Resultado:** `Exported: dist` — bundle web generado sin errores.

## 4. Imagen de entrega

**Comando:**

```bash
docker compose build frontend_prod
```

**Resultado:** `Image servigt-frontend_prod Built`.

El `Dockerfile` del frontend es multi-etapa: `frontend_dev` conserva `expo start --web` con hot reload para el equipo, y `frontend_prod` sirve el `expo export` con Nginx. Son servicios distintos de Compose, tal como se ratificó: el target de entrega no reemplaza al de desarrollo.

## 5. Headers de seguridad

### `frontend_prod` — puerto 8087 (task 4.2, integrada)

```text
$ curl -I http://localhost:8087/

Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline';
    img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self'; object-src 'none';
    base-uri 'self'; form-action 'self'; frame-ancestors 'none'; manifest-src 'self'
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=(), usb=(), fullscreen=(self)
Cache-Control: no-store
```

No hay HSTS, que es correcto: `AGENTS.md` y el plan del sprint acordaron activarlo solo donde exista HTTPS real, y este target sirve HTTP en local.

### `backend` — puerto 8085

```text
$ curl -I http://localhost:8085/api/health

X-Correlation-ID: 35471dd6-548c-43c8-9d2a-535627745f0f
Access-Control-Allow-Origin: *
X-Powered-By: PHP/8.3.33
```

Dos lecturas:

- **`X-Correlation-ID` presente** confirma que la task 4.3 está operativa: cada respuesta trae un identificador rastreable en logs sin filtrar detalles internos.
- **`Access-Control-Allow-Origin: *`** es la prueba dura de que la task **4.1 sigue pendiente**. Es exactamente el hallazgo A02/API8 del levantamiento inicial, aún sin corregir.
- **`X-Powered-By: PHP/8.3.33`** revela la versión exacta del intérprete. **No estaba en el levantamiento de la task 1.1**: se detectó al capturar esta evidencia. No es explotable por sí solo, pero facilita a un atacante buscar advisories de esa versión concreta. Se registra como follow-up de severidad baja; se elimina con `expose_php = Off` en la configuración de PHP.

## 6. Qué NO se pudo verificar

Con honestidad, y porque la Definition of Done lo exige:

- **Regresión de publicaciones en la interfaz.** Las tasks 5.5, 5.6 y 6.1 no están integradas: no existe una sola línea del frontend que mencione publicaciones. El backend de publicaciones sí está cubierto por `PublicacionServicioApiTest`, `PublicacionServicioLimiteTest` y `PublicacionServicioContratoTest` — 23 pruebas en total. Lo que no se puede demostrar es el flujo de demo: proveedor creando una publicación con contador `1/1`, cliente viéndola en el perfil público y contratando desde ella.
- **Validación de UI en 1440 / 1024 / 390 px.** No se ejecutó en esta corrida.
- **Contención real de concurrencia.** Requiere dos conexiones PostgreSQL independientes; queda fuera de la suite por diseño y está documentado en `PublicacionServicioContratoTest`.

## 7. Cómo reproducir esta evidencia

```bash
cd ServiGT
export COMPOSE_PROJECT_NAME=servigt

docker compose up -d db backend frontend frontend_prod
docker compose --profile test run --rm backend_test
docker exec servigt_frontend npx jest --ci
docker exec servigt_frontend npx expo export --platform web
docker compose build frontend_prod
curl -I http://localhost:8087/
curl -I http://localhost:8085/api/health
```
