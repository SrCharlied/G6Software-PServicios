# Pruebas de carga y estres (Task 5.1 / 5.2)

Scripts k6 para medir el comportamiento del backend de ServiGT bajo carga y
estres. Corren contra un servidor Laravel dedicado apuntando a la base de
datos efimera `db_test` (perfil `test` de `docker-compose.yml`), nunca contra
`servigt_db` (desarrollo) ni de forma concurrente con la suite de PHPUnit
(`backend_test`), para no compartir la misma base entre ambas cargas.

## Version fijada

Imagen `grafana/k6:latest` resuelta a `sha256:e66db15b860113878fa74670e31f5e274830b7b6e42c8bff28b2f2d86a257603`
el 2026-09-27. Fijar ese digest explícitamente si se requiere reproducibilidad
exacta entre corridas.

## 1. Levantar un backend dedicado sobre `db_test`

`db_test` ya se declara en `docker-compose.yml` (perfil `test`, tmpfs, se
destruye al bajarla). El servicio `backend_test` normalmente corre PHPUnit
(su `entrypoint` está fijado a `php artisan test`), así que para servir HTTP
hay que arrancar un contenedor aparte con la misma imagen pero sirviendo:

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

Notas sobre por qué el comando es así de largo:

- El `entrypoint` real del Dockerfile (`docker/entrypoint.sh`) sí generaría
  este `.env`, pero también corre `sync_schema.php`, que espera el volumen
  `./database:/app/database:ro` — ese volumen **no** está montado en el
  servicio `backend_test` (solo en `backend`), así que fallaría con
  `No se encontro el archivo de esquema`. `db_test` no lo necesita: Postgres
  ya aplica `init.sql` solo, vía `docker-entrypoint-initdb.d`.
- Sin escribir el `.env` a mano, el `php artisan serve` embebido de PHP no
  hereda las variables de entorno del contenedor hacia `$_SERVER` de la
  misma forma que el SAPI de CLI, así que Laravel cae al `DB_CONNECTION`
  por defecto del esqueleto (`sqlite`) en vez de usar `pgsql`/`db_test`. Se
  verificó con `/api/health`: sin este paso reportaba
  `"driver":"sqlite","status":"unavailable"` pese a que `docker exec ... env`
  sí mostraba `DB_CONNECTION=pgsql`.

Verificar antes de generar tráfico:

```bash
curl -s http://localhost:18000/api/health
# Debe responder "driver":"pgsql","status":"connected"
```

## 2. Ejecutar los scripts

Ambos scripts leen `BASE_URL` (por defecto `http://localhost:18000/api`, útil
si k6 corre en el host). Si k6 corre en un contenedor en la misma red de
Docker que `k6_backend_target`, usar el nombre del contenedor como host:

```bash
# Carga (rampa 5→25 VUs, ~5 min)
docker run --rm --network servigt_servigt_net \
  -e BASE_URL=http://k6_backend_target:8000/api \
  -v "$(pwd)/tests/performance:/scripts" \
  grafana/k6:latest run /scripts/carga.js

# Estres (escalonado hasta el techo, ~10 min + 2 min de recuperacion)
docker run --rm --network servigt_servigt_net \
  -e BASE_URL=http://k6_backend_target:8000/api \
  -e STRESS_MAX_VUS=100 \
  -v "$(pwd)/tests/performance:/scripts" \
  grafana/k6:latest run /scripts/estres.js
```

El nombre de la red (`servigt_servigt_net`) depende del nombre del proyecto
Compose; confirmarlo con `docker network ls | grep servigt` antes de correr.

## 3. Smoke antes de la campaña completa

Antes de una corrida larga, validar que el script y el generador funcionan
con una carga mínima y que el exit code refleja los checks:

```bash
docker run --rm --network servigt_servigt_net \
  -e BASE_URL=http://k6_backend_target:8000/api \
  -v "$(pwd)/tests/performance:/scripts" \
  grafana/k6:latest run --vus 1 --duration 10s /scripts/carga.js
echo "exit code: $?"
```

Un exit code distinto de 0 indica que algún `threshold` falló — revisar antes
de lanzar la campaña completa.

## 4. Limpieza

`setup()` en `carga.js` crea cuentas `smoke-k6-carga-<timestamp>-<n>@servigt.test`
en la base **efímera** `db_test` (tmpfs): desaparecen solas al bajar el
contenedor:

```bash
docker rm -f k6_backend_target
docker compose --profile test down db_test -v
```

No se generan cuentas smoke en `servigt_db` (desarrollo): estos scripts nunca
apuntan ahí.

## 5. Umbrales

Los `thresholds` codificados en `carga.js` (p95 lecturas < 800 ms, p95
autenticado < 1.5 s, tasa de error de negocio < 1%) son la **propuesta** de
S8-05, no una capacidad ya ratificada por producto — ver
`docs/sprint8/rendimiento.md` para el resultado real de la corrida y su
interpretación.
