# Sprint 8 — Task 5.2: resultados de carga y estrés

**Owner:** JA. **Fecha de ejecución:** 2026-09-27.

Ejecutado sin los fixes de las tasks 1.1, 2.1 y 3.1 (fuera del alcance de esta
sesión, owners D/AS) y sin ratificación formal de los umbrales por producto:
los resultados describen el comportamiento **actual** del backend, no el
incremento final del sprint. Los umbrales usados son la propuesta de S8-05
tal como está en el plan, codificados como `thresholds` en los scripts de
`ServiGT/tests/performance/`.

## Entorno

- Imagen: `servigt-backend_test:latest`, reconstruida el 2026-09-27 a partir
  del código de esta sesión (incluye los cambios de la task 4.1).
- Servidor bajo prueba: contenedor dedicado (`k6_backend_target`) sirviendo
  `php artisan serve` contra `db_test` (PostgreSQL 16, tmpfs, perfil `test`),
  **no** contra `servigt_db` (desarrollo) ni concurrente con PHPUnit.
- Generador: `grafana/k6:latest`, digest
  `sha256:e66db15b860113878fa74670e31f5e274830b7b6e42c8bff28b2f2d86a257603`,
  corriendo en un contenedor Docker separado en la misma red
  (`servigt_servigt_net`).
- Hardware: máquina local de desarrollo (Windows + Docker Desktop), sin
  aislamiento de recursos entre el generador y el servidor — ambos compiten
  por el mismo CPU/host. Esto es una limitación real de la medición, no un
  entorno de referencia.
- Comandos exactos y cómo reproducir el entorno: `ServiGT/tests/performance/README.md`.

## Carga (`carga.js`)

Rampa 0→5→25→25→0 VUs a lo largo de 5 minutos. 70% lecturas públicas
(`/health`, `/categorias`, `/providers`, `/publicaciones`,
`/pedidos/abiertos`), 30% autenticadas (`/me`) con 10 tokens generados en
`setup()` (fuera del bucle).

| Métrica | Resultado | Objetivo propuesto | Cumple |
|---|---:|---:|:--:|
| p95 lecturas públicas | 595 ms | < 800 ms | ✅ |
| p95 autenticado (`/me`) | 604 ms | < 1.5 s | ✅ |
| Tasa de error de negocio | 0.00% | < 1% | ✅ |
| `http_req_failed` | 0.00% (0/4207) | < 5% | ✅ |
| Throughput | 4207 requests, 13.69 req/s | — | — |

**Todos los umbrales propuestos se cumplieron** en esta corrida, contra el
código actual (task 4.1 incluida) y con hasta 25 VUs concurrentes.

## Estrés (`estres.js`)

Escalonado 10%→25%→50%→75%→100% de `STRESS_MAX_VUS=100` en pasos de 90s,
sostenido 2 minutos en el techo, luego 2 minutos de rampa a 0 para observar
recuperación. Solo lecturas públicas (sin autenticación, para no mezclar el
costo de bcrypt con la señal de saturación HTTP general).

| Métrica | Resultado |
|---|---:|
| VUs máximos alcanzados | 100 (techo configurado, no se abortó) |
| `http_req_failed` | 0.00% (0/14675) |
| Requests totales | 14675, 24.39 req/s |
| p95 de latencia (con 100 VUs) | 2.84 s |
| p95 de latencia (con 25 VUs, referencia de `carga.js`) | 0.60 s |

**No se determinó el punto de ruptura dentro del techo de 100 VUs**: el
servidor no devolvió errores HTTP en ningún momento, pero la latencia p95 se
degradó ~4.7× entre 25 y 100 VUs concurrentes (600 ms → 2.84 s), señal de que
el servidor se acerca a saturación de recursos (probablemente el límite de
`php artisan serve`, que es mono-hilo/de desarrollo, no un servidor de
producción) sin llegar todavía a rechazar peticiones. No se reporta un techo
de capacidad como si fuera un resultado medido: el umbral de seguridad del
script (`http_req_failed rate<0.5` con `abortOnFail`) nunca se activó, así
que la prueba corrió completa sin interrupción.

## Limitaciones y honestidad de la medición

- `php artisan serve` es un servidor de desarrollo, no representa el
  comportamiento de un despliegue con PHP-FPM/Nginx u Octane; la
  degradación de latencia observada puede no reflejar capacidad real de
  producción.
- Generador y servidor comparten el mismo host físico (sin aislamiento de
  CPU/red dedicada), lo que puede inflar la latencia medida respecto a un
  entorno con generador remoto.
- El código probado no incluye los fixes de 1.1 (transiciones de estado),
  2.1 (cancelación) ni 3.1 (calificación) — la campaña de cierre real de
  S8-05 debe repetirse sobre el incremento final del sprint.
- No se ejecutó la matriz de seguridad H1/H2/H3 de S8-05 (paso 7 del plan):
  queda fuera de esta sesión, que cubrió solo las tasks de JA (4.1, 5.1, 5.2).

## Comandos ejecutados

```bash
docker compose --profile test up -d db_test
docker compose --profile test run --rm -d --name k6_backend_target -p 18000:8000 \
  --entrypoint sh backend_test -lc '<escribe .env y corre php artisan serve>'
curl -s http://localhost:18000/api/health   # confirmó driver pgsql / connected

docker run --rm --network servigt_servigt_net -e BASE_URL=http://k6_backend_target:8000/api \
  -v "$(pwd)/tests/performance:/scripts" grafana/k6:latest run /scripts/carga.js
# EXIT=0

docker run --rm --network servigt_servigt_net -e BASE_URL=http://k6_backend_target:8000/api \
  -e STRESS_MAX_VUS=100 -v "$(pwd)/tests/performance:/scripts" grafana/k6:latest run /scripts/estres.js
# EXIT=0

docker rm -f k6_backend_target
docker compose --profile test down db_test -v
```

## Corrida final sobre el incremento corregido

Esta corrida del 2026-09-29 reemplaza la medición preliminar como evidencia de
cierre. Se ejecutó sobre `cf703ef`, que incluye las correcciones de las tasks
1.1, 1.2, 2.1, 2.2, 3.1, 4.1 y 4.2. Se mantuvo el mismo entorno dedicado:
`servigt-backend_test`, PostgreSQL `db_test` en tmpfs y la imagen k6 con digest
`sha256:e66db15b860113878fa74670e31f5e274830b7b6e42c8bff28b2f2d86a257603`.

Antes de las campañas se verificó `/api/health`: driver `pgsql`, estado
`connected`. El smoke de 1 VU durante 10 segundos pasó con 20 requests HTTP,
0% de errores y todos los thresholds verdes.

### Carga final

Rampa completa 0->5->25->25->0 durante cinco minutos.

| Métrica | Resultado final | Objetivo propuesto | Cumple |
|---|---:|---:|:--:|
| p95 lecturas públicas | 15.78 ms | < 800 ms | Sí |
| p95 autenticado (`/me`) | 17.14 ms | < 1.5 s | Sí |
| Tasa de error de negocio | 0.00% (0/5127) | < 1% | Sí |
| `http_req_failed` | 0.00% (0/5137) | < 5% | Sí |
| Throughput | 5137 requests, 16.95 req/s | - | - |
| VUs máximos | 25 | 25 | Sí |

Resultado del proceso: exit code 0; 5127/5127 checks exitosos y ninguna
iteración interrumpida.

### Estrés final

Escalonado completo hasta `STRESS_MAX_VUS=100`, sostenido en el techo y con
rampa posterior a cero durante diez minutos totales.

| Métrica | Resultado final |
|---|---:|
| VUs máximos alcanzados | 100 |
| `http_req_failed` | 0.00% (0/35102) |
| Checks | 35102/35102 exitosos |
| Throughput | 35102 requests, 58.28 req/s |
| Latencia media | 280.09 ms |
| Latencia p95 | 665.56 ms |
| Latencia máxima | 793.27 ms |

Resultado del proceso: exit code 0. El freno `rate<0.5` no se activó y el
escenario regresó de 100 a 0 VUs sin requests interrumpidos. No se encontró un
punto de ruptura dentro del techo aprobado de la prueba.

### Interpretación final

- Los cuatro thresholds propuestos de carga se cumplen en esta máquina.
- Hasta 100 VUs no hubo respuestas fallidas ni errores de servidor.
- La latencia p95 aumentó de 16.39 ms en carga mixta a 665.56 ms en estrés,
  señal esperable de presión, pero sin pérdida de disponibilidad observada.
- Estos valores describen `php artisan serve` y Docker Desktop en una máquina
  local compartida. No son una promesa de capacidad de producción ni reemplazan
  una prueba sobre la infraestructura de despliegue real.
