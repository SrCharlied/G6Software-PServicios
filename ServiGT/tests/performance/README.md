# Pruebas de carga y estres (Task 5.1 / 5.2)

Scripts k6 para medir el backend de ServiGT bajo carga y estres. Corren contra
un servidor Laravel dedicado apuntando a la base efimera `db_test` (perfil
`test` de `docker-compose.yml`), nunca contra `servigt_db` ni al mismo tiempo
que PHPUnit (`backend_test`).

## Version fijada

Usar siempre esta imagen para reproducibilidad:

```bash
K6_IMAGE=grafana/k6@sha256:e66db15b860113878fa74670e31f5e274830b7b6e42c8bff28b2f2d86a257603
```

Ese digest corresponde a la imagen resuelta el 2026-09-27. No usar
`grafana/k6:latest` en evidencia de sprint.

## 1. Levantar un backend dedicado sobre `db_test`

`db_test` ya se declara en `docker-compose.yml` con tmpfs y volumen de
`init.sql`. Para k6 se levanta un contenedor HTTP separado con la imagen de
`backend_test`, porque el servicio `backend_test` normal ejecuta PHPUnit.

```bash
# Desde ServiGT/
docker compose --profile test up -d db_test

docker compose --profile test run --rm -d --name k6_backend_target -p 18000:8000 \
  --entrypoint sh backend_test -lc '
cat > /app/.env <<EOF
APP_NAME=ServiGT
APP_ENV=testing
APP_KEY=$APP_KEY
APP_DEBUG=false
APP_URL=http://localhost:8000
APP_LOCALE=es
APP_FALLBACK_LOCALE=es
DB_CONNECTION=$DB_CONNECTION
DB_HOST=$DB_HOST
DB_PORT=$DB_PORT
DB_DATABASE=$DB_DATABASE
DB_USERNAME=$DB_USERNAME
DB_PASSWORD=$DB_PASSWORD
CACHE_STORE=array
SESSION_DRIVER=array
FILESYSTEM_DISK=public
EOF
php artisan config:clear
php artisan serve --host=0.0.0.0 --port=8000
'
```

Verificar la base efectiva antes de generar trafico:

```bash
curl -s http://localhost:18000/api/health
# Debe responder "driver":"pgsql","status":"connected"
```

Si responde `sqlite` o `unavailable`, no ejecutar k6: el servidor objetivo no
esta usando la base dedicada.

## 2. Ejecutar scripts

Confirmar el nombre de la red antes de correr:

```bash
docker network ls | grep servigt
```

Comandos previstos:

```bash
# Carga: rampa 5 a 25 VUs, aproximadamente 5 minutos.
docker run --rm --network servigt_servigt_net \
  -e BASE_URL=http://k6_backend_target:8000/api \
  -v "$(pwd)/tests/performance:/scripts" \
  "$K6_IMAGE" run /scripts/carga.js

# Estres: escalonado hasta techo explicito y recuperacion.
docker run --rm --network servigt_servigt_net \
  -e BASE_URL=http://k6_backend_target:8000/api \
  -e STRESS_MAX_VUS=100 \
  -v "$(pwd)/tests/performance:/scripts" \
  "$K6_IMAGE" run /scripts/estres.js
```

`carga.js` crea usuarios `smoke-k6-carga-<timestamp>-<n>@servigt.test` en
`setup()` y guarda los tokens solo en memoria de k6. No imprime tokens ni usa
secretos reales. El pool por defecto es 3 para respetar el throttle de registro
por IP; se puede ajustar con `AUTH_POOL_SIZE`.

## 3. Smoke del generador

Antes de una corrida larga, comprobar que el generador, la red y los checks
funcionan. `SMOKE=true` activa un escenario corto dentro del propio script; no
usar `--vus` ni `--duration`, porque los scripts declaran `options.scenarios`.

```bash
docker run --rm --network servigt_servigt_net \
  -e BASE_URL=http://k6_backend_target:8000/api \
  -e SMOKE=true \
  -e AUTH_POOL_SIZE=1 \
  -v "$(pwd)/tests/performance:/scripts" \
  "$K6_IMAGE" run /scripts/carga.js
echo "exit code: $?"
```

Un exit code distinto de 0 indica que algun threshold o check fallo. Revisar
antes de lanzar carga o estres completos.

## 4. Limpieza

La base `db_test` vive en tmpfs, asi que los fixtures desaparecen al bajar el
entorno:

```bash
docker rm -f k6_backend_target
docker compose --profile test down db_test -v
```

No borrar ni limpiar `servigt_db` como parte de estas pruebas.

## 5. Umbrales propuestos

`carga.js` codifica los objetivos propuestos por S8-05:

- p95 lecturas publicas menor a 800 ms.
- p95 autenticado menor a 1.5 s.
- errores de negocio menores al 1%.
- `http_req_failed` menor al 5%.
- checks con tasa mayor a 99%.

Estos umbrales son propuesta de sprint, no una capacidad ratificada por
producto. Los resultados reales se documentan en `docs/sprint8/rendimiento.md`.
