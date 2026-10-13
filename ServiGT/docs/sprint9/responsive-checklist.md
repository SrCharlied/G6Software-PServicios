# Sprint 9 - Tarea 7.2: Responsive y estados del incremento

Fecha: 2026-10-12. Rama: `7.3-sprint-9`. Base integrada: `d89bf51`.
Revision tecnica automatizada y visual; la aprobacion humana del reviewer
permanece pendiente. No se redisenaron pantallas funcionales.

## Alcance y metodo

`frontend/e2e/sprint9-responsive.spec.js` contiene 21 casos Chromium:
6 vistas y un caso terminal, cada uno en 1440, 1024 y 390 px (alto 900).
Los fixtures interceptan la API solo dentro de Playwright para reproducir
carga, contenido, vacio, fallo y reintento de forma determinista. No son
cuentas ni fallbacks de produccion. La integracion real se verifica por
separado en `sprint9-critical-flows.spec.js` con cuentas y PostgreSQL reales.

| Vista | Loading | Contenido | Vacio | Error/reintento | 1440/1024/390 |
|---|---|---|---|---|---|
| Catalogo de materiales | Si | Si | Si | Si | Aprobado |
| Mis lotes | Si | Si | Si | Si | Aprobado |
| Mis reservas | Si | Si | Si | Si | Aprobado |
| Bandeja contextual | Si | Si | Si | Si | Aprobado |
| Centro de seguridad participante | Si | Si | Sin servicio: error, no vacio falso | Si; ayuda sigue visible | Aprobado |
| Cola administrativa y detalle | Si | Si | Si | Si | Aprobado |
| Servicio interrumpido | No aplica | Estado terminal | No aplica | Codigos y acciones incompatibles ocultos | Aprobado |

Se comprueba ausencia de overflow horizontal en todos los estados. En
390 px, proveedor y admin conservan el menu movil y su enlace de panel.
El detalle admin conserva estado terminal y campo de nota privada. No se
presenta un HTTP 500 como lista vacia o saldo valido.

## Comandos y resultados

Desde `ServiGT/frontend/`, con Docker levantado:

```bash
npx playwright test e2e/sprint9-responsive.spec.js
npx playwright test
```

El comando focal se ejecuto: **21 aprobados**, 27.9 s. La suite completa
se registra con su resultado final en [cierre.md](cierre.md), junto con
los fallos de arnes observados en ejecuciones intermedias. No se usan
`skip`, reintentos automaticos ni ampliacion global del timeout.

## Evidencia visual

Las capturas reproducibles quedan en `frontend/test-results/s9-*.png`.
La evidencia minima versionada usa exclusivamente fixtures de presentacion
y esta en `evidencia/`: catalogo, reservas, mensajes, seguridad y detalle
admin a 390 px; seguridad a 1024 px; detalle admin a 1440 px.
Se revisan dimensiones, legibilidad, controles, menu movil y ausencia de
superposiciones visibles. Los archivos no incluyen tokens ni reportes reales.

## Limites

Se valida React Native Web con Chromium. No equivale a una prueba fisica
Android/iOS ni a una auditoria completa de accesibilidad. El flujo real de
seguridad y descarga privada tiene cobertura E2E independiente, no se
deduce de estas capturas. No se cambiaron `InternalLayout` ni tokens globales.
