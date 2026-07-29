# Tarea 3 — Pruebas Automatizadas · ServiGT
### CC3091 Ingeniería de Software 2 · Grupo 6

Guion de presentación (Google Slides) + resultados reales de la implementación.

---

## 📊 Resultados obtenidos (datos para citar en la presentación y el video)

| Capa | Herramienta | Pruebas | Estado | Tiempo |
|------|-------------|---------|--------|--------|
| **Backend** (Laravel/PHP) | PHPUnit | **32** (15 unitarias + 17 de integración) | ✅ 32/32 · 59 aserciones | ~2.0 s |
| **Frontend** (React Native/Expo) | Jest + Testing Library | **16** (12 de utilidades + 4 de componente) | ✅ 16/16 | ~2.9 s |
| **TOTAL** | | **48 pruebas** | ✅ **48/48 verde** | ~5 s |

> **Hallazgo destacable:** al automatizar las pruebas, una de ellas
> (`test_listado_abiertos_incluye_cotizaciones_count`) **detectó una
> inconsistencia real**: el endpoint público `/pedidos/abiertos` no incluía
> el conteo de cotizaciones (`withCount`) que sí tenía `/pedidos/mios`. Se
> corrigió con una línea. **Esto es evidencia concreta de que las pruebas
> aportan valor** — úsalo en la sección de conclusiones.

---

## 🎥 Comandos para el video (todo se ejecuta DENTRO de los contenedores)

```bash
# 0. Mostrar el entorno
docker ps                                            # los 3 contenedores arriba

# 1. Backend — 32 pruebas
docker exec servigt_backend php artisan test

# (opcional) solo unitarias / solo integración
docker exec servigt_backend php artisan test --testsuite=Unit
docker exec servigt_backend php artisan test --testsuite=Feature

# 2. Frontend — 16 pruebas
docker exec servigt_frontend npm test
```

**Frase clave para el video:** *"Ejecutamos las pruebas dentro del contenedor
con `docker exec`, en el mismo entorno aislado donde corre la aplicación —
igual que lo haría un pipeline de CI/CD."*

**Demo de robustez (recomendada, suma en la rúbrica de 25 pts):** rompe a
propósito una aserción → corre → muestra el ❌ rojo → repárala → verde.
Demuestra que la prueba realmente valida algo.

---

## 🖥️ Guion diapositiva por diapositiva

### Slide 1 — Portada
- **Título:** Pruebas Unitarias Automatizadas en ServiGT
- Curso CC3091 – Ingeniería de Software 2 · Semestre II 2026 · Grupo 6
- Integrantes · Fecha

### Slide 2 — Contexto y motivación
- ServiGT: marketplace que conecta **clientes** con **proveedores de servicios**.
- A medida que crecen las historias de usuario, crecen los escenarios a validar.
- Probar a mano no escala → **automatización de pruebas unitarias**.
- *Nota del presentador:* mencionar que el proyecto tiene backend y frontend
  separados, cada uno con su propio stack de pruebas.

### Slide 3 — ¿Qué vamos a probar? (arquitectura)
- **Backend:** Laravel 13 (PHP 8.3) + PostgreSQL, API REST con Sanctum.
- **Frontend:** React Native 0.76 + Expo (Expo Router), web.
- Diagrama simple: `[Frontend Expo] → API REST → [Backend Laravel] → [PostgreSQL]`
- Todo corre en **Docker** (3 contenedores: db, backend, frontend).

---

### 🟦 BLOQUE 1 — Herramientas existentes (20 pts)

### Slide 4 — Frameworks de testing en el BACKEND (PHP)
| Herramienta | Qué es | Nota |
|-------------|--------|------|
| **PHPUnit** | Estándar de facto para PHP; base de Laravel | ✅ elegido |
| **Pest** | Sintaxis moderna sobre PHPUnit | Alternativa |
| Mockery | Librería de *mocks/stubs* | Complementaria |

### Slide 5 — Frameworks de testing en el FRONTEND (JS/React Native)
| Herramienta | Qué es | Nota |
|-------------|--------|------|
| **Jest** | Motor de pruebas de JS (Meta) | ✅ elegido |
| **jest-expo** | Preset de Jest afinado para Expo | ✅ elegido |
| **React Native Testing Library** | Renderiza y consulta componentes | ✅ elegido |
| Vitest | Alternativa moderna a Jest | No aplica a RN |
| Detox / Maestro | Pruebas E2E (no unitarias) | Fuera de alcance |

---

### 🟦 BLOQUE 2 — Justificación de la elección (25 pts)

### Slide 6 — Por qué PHPUnit (backend)
- **Integración nativa:** viene incluido en Laravel; `php artisan test` sin configurar nada.
- **Robustez:** `RefreshDatabase`, *factories*, *assertions* HTTP y de base de datos.
- **SQLite en memoria:** las pruebas corren aisladas, sin tocar la BD real, en milisegundos.
- **Comunidad y documentación:** +20 años de madurez, documentación oficial de Laravel.

### Slide 7 — Por qué Jest + Testing Library (frontend)
- **Recomendado por Expo:** `jest-expo` es el preset oficial de la plataforma.
- **Popularidad:** Jest es el runner más usado del ecosistema JS (millones de descargas/semana).
- **Filosofía correcta:** Testing Library prueba lo que **ve el usuario** (textos, roles), no detalles internos.
- **Rápido:** 16 pruebas en <3 s, sin emulador ni navegador.

### Slide 8 — Tabla comparativa (ataca directo la rúbrica)
| Criterio | PHPUnit | Jest + RNTL |
|----------|---------|-------------|
| Comunidad | Enorme (núcleo de Laravel) | Enorme (núcleo de React/RN) |
| Documentación | Oficial y extensa | Oficial y extensa |
| Rendimiento | ~2 s / 32 pruebas | ~3 s / 16 pruebas |
| Popularidad | Estándar de PHP | Estándar de JS |
| Robustez | Factories, BD en memoria | Mocks, render aislado |
| Integración | `php artisan test` | `npm test` |

---

### 🟦 BLOQUE 3 — Ejemplos y demo (35 pts)

### Slide 9 — Estrategia de pruebas por capa
- **Unitarias puras** (sin BD/red): reglas de validación, lógica de modelos, utilidades.
- **De integración** (con BD en memoria): endpoints de la API de punta a punta.
- Total: **48 pruebas automatizadas**.

### Slide 10 — Backend · Ejemplo 1: crear pedido (integración)
- Archivo: `backend/tests/Feature/PedidoCreationTest.php`
- Prueba: cliente autenticado crea un pedido → `201` + estado `abierto`.
- Mostrar también: usuario sin token → `401`; descripción corta → `422`.
- *Concepto:* `actingAs()`, `postJson()`, `assertJsonPath()`, `assertDatabaseHas()`.

### Slide 11 — Backend · Ejemplo 2 y 3: expiración y validación (unitarias)
- `backend/tests/Unit/StorePedidoRequestTest.php` → reglas de validación aisladas.
- `backend/tests/Unit/ApiResponseTest.php` → forma del JSON de respuesta.
- `backend/tests/Feature/PedidoExpirationTest.php` → el comando `pedidos:expirar`
  marca vencidos y respeta estados finales.

### Slide 12 — Frontend · Ejemplo 1: validaciones (unitarias puras)
- Archivo: `frontend/src/utils/validation.test.js`
- Funciones puras: `validateEmail`, `validatePhone`, `validatePassword`, etc.
- *Historia real:* una prueba reveló que `validateRequired(0)` devuelve `false`
  (el `0` se trata como vacío por `v || ''`) → documentado como caso de borde.

### Slide 13 — Frontend · Ejemplo 2 y 3: componente (Testing Library)
- Archivo: `frontend/src/components/ServiGTLogo.test.js`
- Renderiza `<ServiGTLogo />` y verifica que muestre "GT" y el ícono "S".
- Prueba distintos props (`mode`, `layout`) sin que el componente falle.
- *Concepto:* `render()`, `getByText()` — se prueba lo que ve el usuario.

### Slide 14 — Demo en vivo / Video
- `docker exec servigt_backend php artisan test` → **32/32** ✅
- `docker exec servigt_frontend npm test` → **16/16** ✅
- (Opcional) romper y reparar una aserción para demostrar robustez.

---

### 🟦 BLOQUE 4 — Conclusiones (20 pts)

### Slide 15 — Conclusiones
- **Tiempo:** escribir 48 pruebas tomó pocas horas; **ejecutarlas todas tarda ~5 s**.
  El costo de escribirlas se recupera en la primera regresión evitada.
- **Eficiencia:** SQLite en memoria + render aislado hacen la suite instantánea → se puede correr en cada cambio.
- **Valor comprobado:** las pruebas **detectaron un bug real** (`cotizaciones_count`)
  y un caso de borde (`validateRequired(0)`).
- **Experiencia:** PHPUnit y Jest tienen curva de aprendizaje baja gracias a su
  integración nativa (`php artisan test`, `npm test`) y su documentación.
- **Recomendación:** mantener la disciplina de escribir una prueba por cada
  historia de usuario nueva e integrarlas en un pipeline de CI/CD.

### Slide 16 — Cierre
- 48 pruebas · 2 stacks · 100% verde · corriendo en contenedores.
- Preguntas.

---

## 📁 Archivos entregados en este trabajo

**Backend** (`ServiGT/backend/`)
- `tests/Unit/ApiResponseTest.php`, `StorePedidoRequestTest.php`, `PedidoModelTest.php` (nuevos)
- `tests/Feature/PedidoCreationTest.php`, `PedidoExpirationTest.php`, `PedidoListTest.php` (ya existían)
- `database/migrations/2024_05_01_*` y `database/factories/CategoriaFactory.php`, `PedidoFactory.php` (nuevos, solo para testing)
- `phpunit.xml` (fuerza SQLite en memoria en las pruebas)
- `Dockerfile` (ahora copia la infraestructura de pruebas a la imagen)
- `app/Http/Controllers/PedidoController.php` (fix: `withCount('cotizaciones')` en `abiertos()`)

**Frontend** (`ServiGT/frontend/`)
- `src/utils/validation.test.js` (nuevo)
- `src/components/ServiGTLogo.test.js` (nuevo)
- `package.json` (Jest + jest-expo + Testing Library + script `test`)
