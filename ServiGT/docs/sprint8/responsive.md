# Checklist responsive — Sprint 8 (task 6.1, bloque S8-06)

> **Estado: checklist preparada, ejecución final pendiente.** Este documento
> cubre solo la fase de preparación de la task 6.1. La ejecución final
> (capturas + defectos reales) espera a que la task 2.2 esté integrada — ver
> sección "Estado de dependencias". Este archivo es evidencia de la 6.1, no
> el artefacto de cierre (`cierre.md`, task 6.2, owner PT).

## 0. Línea base

| Campo | Valor |
|---|---|
| Rama | `sprint8/2.3-6.1` |
| SHA | `e1dd453f70e9786e47dd582aa8445d4174a81b7f` |
| Fecha de preparación | 2026-09-28 |
| Owner | MR |
| Reviewer | PT |

## 1. Estado de dependencias

- **Task 2.2** (contrato de notificación `servicio_cancelado` + acción de
  cancelación en la UI del cliente): **no integrada** a la fecha de
  preparación. Evidencia en código:
  - `ServiGT/frontend/src/utils/notificationRoutes.js` — el mapa `DESTINOS`
    solo registra 9 tipos (`nueva_solicitud`, `solicitud_aceptada`,
    `solicitud_rechazada`, `servicio_iniciado`, `servicio_por_confirmar`,
    `servicio_completado`, `servicio_calificable`, `cotizacion_aceptada`,
    `cotizacion_rechazada`); `servicio_cancelado` no está presente.
  - `ServiGT/frontend/src/utils/notificationRoutes.test.js` (líneas ~69-85)
    documenta explícitamente el contrato como pendiente ("Contrato pendiente
    S8-02: servicio_cancelado ... el mapping real en DESTINOS lo integra PT
    en la task 2.2").
  - `ServiGT/frontend/src/services/api.js:413` define
    `actualizarEstadoServicio(id, estado)` pero no tiene ningún caller en
    `src/` — no hay ningún botón o acción en pantalla que la invoque.
  - Las pantallas actuales (`MisPedidosScreen.js`, `SolicitudesScreen.js`,
    `ProviderDashboardScreen.js`, `AdminDashboardScreen.js`,
    `CreditosScreen.js`) solo muestran `cancelado` como badge de **solo
    lectura** (`StatusChip`), nunca como acción disparable por el cliente.
- **Task 4.2** (servir export web con Nginx y headers seguros): **integrada**
  (commit `67e08e6`). Es infraestructura de build/despliegue, no aporta
  pantallas nuevas relevantes para esta checklist.

**Conclusión:** el flujo de **cancelación** no tiene todavía una acción real
que revisar en los 3 breakpoints — solo existe el estado visual de solo
lectura. Ejecutar la checklist de cancelación ahora no produciría evidencia
válida de cierre. Los otros tres flujos (registro, estados/error,
navegación) sí tienen pantallas completas en el código actual, pero la
ejecución real (capturas, breakpoints en vivo) no se ha hecho todavía —
queda pendiente de confirmación para no adelantar trabajo fuera del orden de
fases de la task.

## 2. Checklist (flujo × breakpoint)

Para cada celda al ejecutar: revisar visualmente, adjuntar captura o
descripción puntual, y registrar cualquier defecto en la sección 4 (pantalla,
breakpoint, descripción, owner sugerido).

### 2.1 Registro

Pantallas: `ServiGT/frontend/app/(auth)/register.js` →
`ServiGT/frontend/src/screens/RegisterScreen.js`.

- [ ] 1440px — layout del formulario, legibilidad, validaciones visibles,
      CTA de envío accesible sin scroll excesivo.
- [ ] 1024px — igual, foco en si el formulario se comprime o desborda.
- [ ] 390px — foco en scroll vertical, campos no cortados, teclado no tapa
      el CTA, mensajes de validación no se superponen.

### 2.2 Cancelación de servicio (cliente)

**Bloqueado — no ejecutar hasta que la task 2.2 esté integrada.** Pantallas
relacionadas hoy (solo lectura del estado, sin acción de cancelar):
`MisPedidosScreen.js`, `SolicitudesScreen.js`, `ProviderDashboardScreen.js`,
`AdminDashboardScreen.js`, `CreditosScreen.js`.

- [ ] 1440px — pendiente de 2.2
- [ ] 1024px — pendiente de 2.2
- [ ] 390px — pendiente de 2.2

### 2.3 Estados de loading / vacío / error

Pantallas representativas (cliente y proveedor, servicios/pedidos/cotizaciones):

- `MisPedidosScreen.js:340` — error de carga.
- `PedidoDetailScreen.js:353` — error de carga; `:473` — estado vacío.
- `SolicitudesScreen.js:271` — loading ("Cargando solicitudes..."); `:287-289`
  — vacío diferenciado por tab (enviadas/recibidas).
- `PedidosAbiertosScreen.js:152` — error; `:178-179` — vacío ("No hay pedidos
  abiertos").
- `CreditosScreen.js:388` — loading; `:414` — error; `:537` — vacío
  (historial).
- `provider/SolicitudesPanel.js:46,56` — vacíos proveedor ("No tienes
  solicitudes pendientes" / "No tienes servicios en curso").

- [ ] 1440px — cada estado visible sin overlap de texto, spinner centrado,
      CTA de reintento si aplica.
- [ ] 1024px — igual.
- [ ] 390px — igual, foco en truncamiento de mensajes de error largos.

### 2.4 Navegación

Componentes: `ServiGT/frontend/src/components/InternalLayout.js`
(`NAV_BY_ROLE`, constante `DESKTOP_MIN_WIDTH = 900`),
`ServiGT/frontend/src/components/NotificationBell.js`.

- [ ] 1440px — sidebar visible, ítems correctos según rol
      (cliente/proveedor/admin), campana de notificaciones funcional.
- [ ] 1024px — sidebar aún visible (>900px), sin overlap con el contenido
      principal.
- [ ] 390px — navegación móvil (tab bar), campana accesible, sin polling
      duplicado de notificaciones entre versión desktop y móvil.

## 3. Evidencia

_(a completar durante la ejecución — captura o descripción puntual por cada
celda marcada arriba)_

## 4. Defectos registrados

| # | Pantalla | Breakpoint | Descripción | Owner sugerido |
|---|---|---|---|---|
| — | — | — | — | — |

## 5. Limitaciones

- Flujo de cancelación no ejecutable: depende de la task 2.2 (sin integrar a
  la fecha de este documento).
- Ejecución real de los flujos de registro, estados/error y navegación
  todavía no realizada — este documento cubre solo la fase de preparación.
