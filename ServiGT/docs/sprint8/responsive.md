# Sprint 8 - checklist responsive acotada

Ejecución final: 2026-09-29 sobre `03cf0d5`, con Expo Web en `:8091` y el
backend dedicado en `:18000` conectado a PostgreSQL `db_test` efímero. La
prueba crea cuentas y un servicio con prefijo `smoke-responsive-`; no usa
mocks ni la base de desarrollo.

## Comando

```powershell
$env:E2E_BASE_URL='http://localhost:8091'
$env:E2E_API_URL='http://localhost:18000/api'
npx.cmd playwright test e2e/sprint8-responsive.spec.js

# 6 passed (12.3s)
```

## Matriz verificada

| Área | 1440 px | 1024 px | 390 px | Resultado |
|---|:---:|:---:|:---:|---|
| Registro | Sí | Sí | Sí | Formulario legible, controles completos y sin overflow horizontal. |
| Servicios del cliente | Sí | Sí | Sí | Navegación por rol, campana con badge, tarjeta y código visibles. |
| Confirmación de cancelación | Sí | Sí | Sí | Modal centrado, fondo bloqueado y ambas acciones visibles. |
| Error de cancelación concurrente | - | - | Sí | El 422 se muestra dentro del modal sin solapar acciones. |
| Trabajos del proveedor | - | Sí | Sí | Tab `Recibidas`, estado cancelado, campana y navegación visibles. |

Cada escenario también comprueba que `documentElement.scrollWidth` no exceda
el ancho visible. La prueba usa el token `servigt_token` de la sesión web para
simular una cancelación concurrente real y confirmar el manejo visual del 422.

## Evidencia

- Registro: [1440](evidencia/responsive/registro-1440.png),
  [1024](evidencia/responsive/registro-1024.png),
  [390](evidencia/responsive/registro-390.png).
- Confirmación de cancelación: [1440](evidencia/responsive/cancelacion-1440.png),
  [1024](evidencia/responsive/cancelacion-1024.png),
  [390](evidencia/responsive/cancelacion-390.png).
- Error móvil: [390](evidencia/responsive/cancelacion-error-390.png).
- Proveedor: [1024](evidencia/responsive/proveedor-1024.png),
  [390](evidencia/responsive/proveedor-390.png).

Las nueve capturas fueron inspeccionadas; no se encontraron solapamientos,
texto cortado que impida operar, acciones fuera del viewport ni navegación
ausente. No se modificó código de producción para esta task.

## Incidencias de preparación

1. La primera invocación no encontró `@playwright/test` en `node_modules`; se
   ejecutó `npm install` usando las versiones ya declaradas en el lockfile.
2. La segunda invocación no encontró el binario de Chromium; se instaló con
   `npx playwright install chromium`.
3. La primera corrida funcional encontró un selector ambiguo (`Mis servicios`)
   y la siguiente mostró que el login rota el token emitido al registrar. Se
   corrigió únicamente la prueba para seleccionar el título y leer el token de
   la sesión activa.
4. Una revisión de capturas detectó imágenes tomadas durante la animación del
   modal y el loading del proveedor. La prueba ahora espera ambos estados antes
   de guardar evidencia.

Ninguna de estas incidencias fue un defecto de producción. La corrida final
completa pasó una vez corregida la preparación y la sincronización del test.
