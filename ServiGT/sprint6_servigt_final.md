# Sprint 6 – ServiGT

## Información del Sprint

- **Inicio:** martes 4 de agosto de 2026
- **Entrega:** martes 18 de agosto de 2026
- **Duración:** 15 días calendario, 11 días hábiles incluyendo la entrega
- **Equipo:** 6 integrantes
- **Capacidad técnica estimada:** 47 Story Points
- **Rama de integración:** `dev`
- **Prototipo visual de referencia:** `Servigt_d_design/`
- **Tendencia de velocidad:** Sprint 1 = 22 SP · Sprint 2 = 28 SP · Sprint 3 = 36 SP · Sprint 4 = 42 SP · Sprint 5 = 45 SP técnicos · **Sprint 6 = 47 SP objetivo**
- **Guía académica:** pendiente de publicación. Los requisitos adicionales del profesor se incorporarán como actividades transversales, sin inflar los SP técnicos de los integrantes.

> Los fines de semana del 8–9 y 15–16 de agosto se consideran **buffer opcional**, no días comprometidos de desarrollo.

---

## Objetivo del Sprint

### Versión extensa

El Sprint 6 tiene como objetivo completar el revamp visual de la aplicación interna de ServiGT, corrigiendo inconsistencias responsive y unificando la experiencia de cliente, proveedor y administrador mediante componentes reutilizables, navegación móvil y layouts adaptados para escritorio. Además, se iniciará el módulo de monetización de proveedores con paquetes configurables de créditos, un flujo simulado de compra y las bases del estado Premium, incluyendo vigencia mensual, acreditación recurrente, badge y beneficios visuales.

El sprint parte de una auditoría técnica y visual sobre la rama `dev`. Esta confirmó que Flow A, Flow B, la lógica de créditos, la recarga administrativa, las notificaciones de adjudicación y las pruebas existentes ya funcionan. Por lo tanto, ese trabajo no se vuelve a estimar. El alcance se concentra únicamente en pendientes reales y verificables.

### Versión corta

Completar el revamp visual interno de ServiGT e iniciar la monetización mediante paquetes de créditos y un estado Premium para proveedores.

---

# Alcance principal

## Enfoque 1 — Terminar el revamp visual

- Crear una base visual reutilizable antes de modificar pantallas en paralelo.
- Completar navegación móvil en las rutas protegidas.
- Evitar layouts desktop excesivamente estirados.
- Completar el revamp de cliente, proveedor y administrador.
- Mejorar notificaciones, chat, solicitudes, calificación y estados visuales.
- Validar 1440px, 1024px y 390px.

## Enfoque 2 — Iniciar monetización

- Mostrar correctamente el saldo del proveedor.
- Crear paquetes de créditos almacenados en base de datos.
- Implementar compra simulada e inmediata.
- Registrar compras, estados e historial.
- Implementar Premium por 30 días.
- Otorgar 10 créditos por activación o renovación Premium.
- Mostrar badge, vigencia y beneficios Premium.

---

# Línea base confirmada — no se vuelve a estimar

- Flow A completo: solicitud directa, aceptación, inicio, finalización y calificación.
- Flow B completo: pedido, cotizaciones, adjudicación y creación de servicio.
- Primeras 3 cotizaciones gratuitas.
- Cotizaciones 4 a 6 con costo de 1 crédito.
- Máximo de 6 cotizaciones por pedido.
- Recarga manual de créditos por administrador.
- Notificaciones de adjudicación para ganador y proveedores no seleccionados.
- Filtro de rechazo aplicado únicamente a cotizaciones en estado `enviada`.
- `InternalLayout` montado en las 13 rutas protegidas.
- Campana de notificaciones disponible en desktop.
- Migraciones duplicadas y configuración fija de Docker corregidas.
- Pruebas backend, pruebas frontend y build web existentes en verde al cierre de la auditoría.

---

# Decisiones de producto ratificadas

## Paquetes de créditos

| Paquete | Precio | Créditos base | Bonus | Total | Costo por crédito |
|---|---:|---:|---:|---:|---:|
| Inicial | Q39 | 8 | 0 | 8 | Q4.88 |
| Impulso | Q115 | 25 | 5 | 30 | Q3.83 |
| Profesional | Q459 | 110 | 25 | 135 | Q3.40 |
| Negocio | Q765 | 190 | 60 | 250 | Q3.06 |

### Reglas de compra

- El precio oficial se almacena y cobra en quetzales.
- La equivalencia en dólares es secundaria y se muestra con `≈`.
- La compra será simulada durante Sprint 6.
- No se capturan números de tarjeta, CVV ni datos bancarios reales.
- Una compra completada acredita créditos inmediatamente.
- Los créditos comprados no expiran durante el MVP.
- Una misma compra no puede acreditar créditos dos veces.
- Estados: `pendiente`, `completada`, `fallida`, `cancelada`.
- Cada compra tiene una referencia visible con formato similar a `SGT-XXXXX`.
- Los paquetes pueden activarse, desactivarse y ordenarse sin modificar código.

## Premium

| Regla | Definición |
|---|---|
| Precio | Q115 mensuales |
| Vigencia | 30 días |
| Créditos incluidos | 10 por activación o renovación |
| Tipo de transacción | `bono`, con motivo `Bono mensual Premium` |
| Badge Premium | Sí, distinto de `VerifiedBadge` |
| Visibilidad | Impulso limitado, sin reemplazar reputación o relevancia |
| Personalización | Preparación para portada y perfil mejorado |
| Renovación bancaria automática | Fuera de Sprint 6 |
| Cambio de slots de cotización | No |
| Publicaciones múltiples de servicios | Sprint posterior |

### Posicionamiento comercial

- **Paquete Impulso Q115:** 30 créditos para consumo puntual.
- **Premium Q115/mes:** 10 créditos recurrentes más badge, visibilidad, vigencia y personalización.
- Premium no sustituye la compra de paquetes y no altera la regla de 3 cotizaciones gratis / máximo 6.

### Aclaración de dominio

Actualmente `Servicio` representa una contratación entre cliente y proveedor, no una publicación ofrecida. El beneficio “1 publicación gratuita y múltiples publicaciones Premium” requiere crear una entidad específica de publicaciones y queda postergado.

---

# Decisiones de UX y nomenclatura

- Cliente ve la opción **Mis servicios**.
- Proveedor ve la opción **Trabajos**.
- Ambas pueden utilizar internamente la ruta técnica `/solicitudes`.
- `CalificarProveedorScreen` se conserva como pantalla independiente en `/calificar/{id}`; no se convierte a modal durante Sprint 6.
- Los tipos genéricos del prototipo (`message`, `payment`, `request`, `review`, `system`) solo sirven para estilo. La navegación usa los 9 tipos reales del backend.
- Dark mode no entra al Sprint 6 aunque el prototipo tenga variantes oscuras.
- La pantalla completa de notificaciones no entra; se mejora la campana/modal existente.

---

# Modelo centralizado de trabajo

| Integrante | Frente técnico principal | SP |
|---|---|---:|
| CL — Carlos López | APIs transversales, notificaciones, pruebas e integración funcional | 7 |
| JA — Juan Salguero | Backend de compra de créditos y persistencia Premium | 8 |
| MR — Mar | Primitivas visuales y revamp completo del cliente | 8 |
| AS — Antony Saz | Acreditación Premium y frontend de monetización | 8 |
| PT — Pablo Toledo | Layout, navegación móvil, pantallas cliente complementarias y Premium visual | 8 |
| D — David López | Revamp proveedor, administrador, chat y responsive | 8 |
| **TOTAL** |  | **47 SP** |

> Jira, LOGT, documentación académica, evidencias y coordinación no se contabilizan dentro de los SP técnicos individuales.

## Reglas de ownership

- Cada task tiene un único owner.
- Cada task tiene un reviewer principal.
- Las primitivas y el layout se integran antes del revamp paralelo.
- MR y D cruzan revisiones visuales: D revisa cliente y MR revisa proveedor/admin.
- PT revisa únicamente elementos globales y cierre visual, evitando convertirse en reviewer universal.
- Los PR se mantienen pequeños y se integran continuamente en `dev`.

---

# Definition of Ready

Una task puede pasar a `In Progress` cuando:

- Se verificó contra la última versión de `dev`.
- Se confirmó que no está ya terminada.
- Tiene owner y reviewer.
- Incluye un título claro y un resultado concreto.
- Tiene criterios de aceptación verificables.
- Identifica dependencias y archivos probables.
- Tiene diseño de referencia cuando aplica.
- Su estimación corresponde al trabajo restante real.

---

# Definition of Done

Una task se considera terminada cuando:

- Está mergeada a `dev` mediante Pull Request.
- Fue revisada por el reviewer definido.
- Cumple sus criterios de aceptación.
- No introduce errores nuevos en consola, frontend o backend.
- Los tests relacionados están en verde.
- `npm run build:web` continúa funcionando cuando aplica.
- Las tareas visuales se validan en 1440px, 1024px y 390px.
- Los endpoints siguen el formato de `ApiResponse`.
- Cada endpoint nuevo queda documentado con método, ruta, autenticación, request y ejemplo de response.
- Las operaciones monetarias usan transacciones de base de datos.
- Las compras y acreditaciones Premium son idempotentes.
- No se ocultan errores reales mediante valores por defecto silenciosos.
- Se adjunta evidencia básica para la entrega.

---

# Sprint Backlog

**Convención:** `[BE]` backend · `[FE]` frontend · `[DB]` base de datos · `[UX]` experiencia visual · `[QA]` pruebas · `[FS]` full-stack · `[REF]` refactor.

Los textos de la columna **Título para Jira** están diseñados para copiarse directamente como nombre del issue y permanecer por debajo del límite de 255 caracteres.

---

## EPIC 1 — Base visual, saldo y navegación interna · 8 SP

| Task | Título para Jira | SP | Tipo | Owner | Reviewer |
|---|---|---:|---|---|---|
| 1.1 | Implementar GET /mi-credito con saldo real, manejo visible de errores y prueba automática para eliminar el falso “Saldo: 0” del proveedor | 1 | FS | CL | JA |
| 1.2 | Centrar el contenido de InternalLayout con maxWidth 1120, padding responsive y comportamiento correcto en desktop de 1440px y 1024px | 1 | FE/UX | PT | CL |
| 1.3 | Crear navegación móvil en InternalLayout bajo 900px con header, menú por rol, campana, badge de no leídas y acceso a las rutas protegidas | 2 | FE/UX | PT | D |
| 1.4 | Hacer interactivo NotificationBell para navegar según los 9 tipos reales del backend y marcar cada notificación como leída al tocarla | 2 | FE | CL | D |
| 1.5 | Unificar tokens visuales y crear primitivas reutilizables Button, Input, Card, Avatar, Stars, StatusChip y encabezado compartido a partir del prototipo | 2 | FE/UX | MR | PT |
| **Total** |  | **8** |  |  |  |

### Detalle de navegación de notificaciones

Tipos reales que debe manejar la task 1.4:

- `nueva_solicitud`
- `solicitud_aceptada`
- `solicitud_rechazada`
- `servicio_iniciado`
- `servicio_por_confirmar`
- `servicio_completado`
- `servicio_calificable`
- `cotizacion_aceptada`
- `cotizacion_rechazada`

La navegación usa `item.datos` y aplica fallback seguro si falta un identificador.

---

## EPIC 2 — Revamp completo del flujo cliente · 9 SP

| Task | Título para Jira | SP | Tipo | Owner | Reviewer |
|---|---|---:|---|---|---|
| 2.1 | Aplicar revamp a Home del cliente con contenedor centrado, grid responsive de proveedores, KPIs y cards basadas en las nuevas primitivas | 2 | FE/UX | MR | D |
| 2.2 | Aplicar revamp a Detalle de proveedor y Solicitar servicio con layout desktop de dos columnas, formulario legible y componentes compartidos | 2 | FE/UX | MR | D |
| 2.3 | Aplicar revamp a Mis pedidos con separación visual de servicios directos y pedidos, StatusChip compartido, grid desktop y estados vacíos | 2 | FE/UX | MR | D |
| 2.4 | Aplicar revamp a Publicar pedido y Detalle de pedido con formulario centrado, CreditBalance real, SlotMeter, ExpiryBar y cotizaciones responsive | 1 | FE/UX | PT | MR |
| 2.5 | Aplicar revamp a Solicitudes y Calificar proveedor, usando “Mis servicios” para cliente y conservando /calificar/{id} como pantalla independiente | 2 | FE/UX | PT | MR |
| **Total** |  | **9** |  |  |  |

### Criterios de aceptación del Epic 2

- Flow A y Flow B mantienen su funcionamiento.
- Las pantallas usan las primitivas del Epic 1.
- Los formularios no se estiran a todo el ancho en desktop.
- Los listados utilizan grid cuando existe espacio.
- Saldo, slots y expiración se muestran claramente.
- Solicitudes y calificación quedan cubiertas por el revamp.
- No hay desbordamientos a 390px.

---

## EPIC 3 — Revamp de proveedor, administrador y chat · 8 SP

| Task | Título para Jira | SP | Tipo | Owner | Reviewer |
|---|---|---:|---|---|---|
| 3.1 | Dividir ProviderDashboardScreen en pantalla y componentes de oportunidades, servicios, cards y modales; eliminar src/App.js si continúa sin imports | 2 | FE/REF | D | CL |
| 3.2 | Aplicar revamp al Dashboard proveedor y Oportunidades con KPIs, grid responsive, saldo visible, filtros y navegación “Trabajos” | 2 | FE/UX | D | MR |
| 3.3 | Aplicar revamp al perfil del proveedor y preparar superficies para saldo, PremiumBadge, vigencia, portada y personalización básica | 2 | FE/UX | D | MR |
| 3.4 | Adaptar Admin y Chat a 1024px y 390px, reemplazando el panel fijo de 360px cuando falte espacio y agregando regreso visible en la lista móvil | 2 | FE/UX | D | MR |
| **Total** |  | **8** |  |  |  |

### Criterios de aceptación del Epic 3

- `ProviderDashboardScreen` deja de ser un archivo monolítico.
- Proveedor inicia en su dashboard.
- Admin y proveedor tienen navegación móvil.
- Chat mantiene dos paneles cuando hay espacio y cambia a navegación móvil cuando no lo hay.
- El perfil queda listo para mostrar créditos y Premium.

---

## EPIC 4 — Paquetes y compra simulada de créditos: backend · 7 SP

| Task | Título para Jira | SP | Tipo | Owner | Reviewer |
|---|---|---:|---|---|---|
| 4.1 | Crear paquetes_creditos y compras_creditos en init.sql y sync_schema.php; ampliar CHECK de transacciones a “compra” y soportar volúmenes existentes de forma idempotente | 2 | DB/BE | JA | CL |
| 4.2 | Implementar GET /creditos/paquetes para listar paquetes activos con precio GTQ, créditos base, bonus, total, ahorro y orden de visualización | 1 | BE | JA | CL |
| 4.3 | Implementar POST /creditos/comprar simulado con estados, referencia SGT-XXXXX, transacción atómica, acreditación inmediata e idempotency_key único | 2 | BE | JA | CL |
| 4.4 | Implementar GET /creditos/transacciones con historial paginado de compras, bonos, gastos y recargas para el proveedor autenticado | 1 | BE | JA | AS |
| 4.5 | Crear pruebas de paquetes, compra simulada, permisos, saldo, transacción tipo compra, estados y protección contra doble acreditación | 1 | QA/BE | CL | JA |
| **Total** |  | **7** |  |  |  |

### Reglas técnicas de esquema

- La fuente de esquema utilizada por los contenedores es `ServiGT/database/init.sql`.
- Los cambios también deben reflejarse en `ServiGT/backend/docker/sync_schema.php`.
- No se acepta resolver únicamente con una migración Laravel aislada.
- El `CHECK` final de `transacciones_credito.tipo` debe admitir:

```text
bono
gasto
recarga
compra
```

- Debe verificarse una base limpia y una base existente.

### Esquema mínimo de `paquetes_creditos`

- `id`
- `nombre`
- `precio_gtq`
- `creditos_base`
- `creditos_bonus`
- `activo`
- `orden`
- timestamps

### Esquema mínimo de `compras_creditos`

- `id`
- `proveedor_id`
- `paquete_id`
- `monto_gtq`
- `creditos_otorgados`
- `estado`
- `referencia`
- `idempotency_key`
- `completada_at`
- timestamps

---

## EPIC 5 — Estado Premium base · 6 SP

| Task | Título para Jira | SP | Tipo | Owner | Reviewer |
|---|---|---:|---|---|---|
| 5.1 | Agregar estado, inicio y expiración Premium mediante init.sql y sync_schema.php, aplicando el cambio de forma idempotente sobre bases existentes | 1 | DB/BE | JA | CL |
| 5.2 | Implementar activación simulada Premium por Q115 durante 30 días y endpoint de consulta para estados nunca, activo y vencido | 1 | BE | JA | AS |
| 5.3 | Otorgar exactamente 10 créditos por activación o renovación Premium usando transacción tipo bono e idempotencia por ciclo | 2 | BE | AS | JA |
| 5.4 | Exponer estado Premium, fechas, días restantes, renovaciones y beneficios para dashboard, perfil público y administración | 1 | BE | AS | CL |
| 5.5 | Crear pruebas de activación, expiración, renovación y acreditación única de 10 créditos Premium sin alterar slots de cotización | 1 | QA/BE | CL | JA |
| **Total** |  | **6** |  |  |  |

### Reglas técnicas Premium

- Vigencia de 30 días desde cada activación o renovación.
- Cada ciclo acredita 10 créditos una sola vez.
- Los créditos Premium usan `tipo = bono`.
- El motivo debe identificar el ciclo Premium.
- Premium no cambia la regla de 3 cotizaciones gratis y máximo 6.
- Repetir una solicitud no extiende ni acredita dos veces el mismo ciclo.

---

## EPIC 6 — Frontend de créditos, compra y Premium · 6 SP

| Task | Título para Jira | SP | Tipo | Owner | Reviewer |
|---|---|---:|---|---|---|
| 6.1 | Crear pantalla Créditos del proveedor con saldo real, historial paginado, medidor de slots, estados de transacción y acceso a paquetes | 2 | FE | AS | PT |
| 6.2 | Crear selección de los 4 paquetes y Checkout simulado sin datos bancarios, con confirmación, estados de compra y actualización inmediata del saldo | 2 | FE | AS | JA |
| 6.3 | Integrar PremiumBadge, estado, vigencia y beneficios en dashboard proveedor y perfil público siguiendo los estados nunca, activo y vencido | 1 | FE/UX | PT | AS |
| 6.4 | Crear superficie administrativa “Créditos y Premium” con compras, filtros, estados, KPIs y vigencia por proveedor según el prototipo desktop/móvil | 1 | FE | AS | D |
| **Total** |  | **6** |  |  |  |

### Criterios de aceptación del Epic 6

- La pantalla muestra el saldo real del backend.
- Los paquetes coinciden exactamente con precios, base, bonus y total ratificados.
- No se solicitan datos bancarios reales.
- La compra actualiza el saldo una sola vez.
- Se representan compras completadas, pendientes, fallidas y canceladas.
- PremiumBadge es distinto de VerifiedBadge.
- Premium muestra estados nunca, activo y vencido.
- Admin puede visualizar compras y vigencia Premium.

---

## EPIC 7 — Pruebas integrales, regresión visual y demo · 3 SP

| Task | Título para Jira | SP | Tipo | Owner | Reviewer |
|---|---|---:|---|---|---|
| 7.1 | Ejecutar y ampliar pruebas E2E de compra, Premium, saldo, créditos, Flow A y Flow B; validar que monetización no rompa servicios ni cotizaciones | 2 | QA/FS | CL | JA |
| 7.2 | Ejecutar regresión visual en 1440px, 1024px y 390px, corregir inconsistencias globales y preparar el recorrido de demostración | 1 | QA/UX | PT | MR |
| **Total** |  | **3** |  |  |  |

---

# Resumen ejecutivo del backlog

| Epic | Tasks | SP |
|---|---:|---:|
| 1. Base visual, saldo y navegación | 5 | 8 |
| 2. Revamp completo del cliente | 5 | 9 |
| 3. Revamp proveedor/admin/chat | 4 | 8 |
| 4. Compra simulada backend | 5 | 7 |
| 5. Premium backend | 5 | 6 |
| 6. Frontend de monetización | 4 | 6 |
| 7. Integración y demo | 2 | 3 |
| **TOTAL** | **30 tasks** | **47 SP** |

---

# Asignación por integrante

## CL — Carlos López · 7 SP

| Task | SP | Responsabilidad |
|---|---:|---|
| 1.1 | 1 | Saldo real y manejo de error |
| 1.4 | 2 | Navegación de notificaciones |
| 4.5 | 1 | Tests de compra e idempotencia |
| 5.5 | 1 | Tests Premium |
| 7.1 | 2 | E2E y regresión funcional |
| **Total** | **7** | **Únicamente tareas técnicas de la app** |

### Coordinaciones

- Con PT para `InternalLayout` y regresión visual.
- Con JA para contratos y pruebas de monetización.
- Con D para destinos de notificaciones.

## JA — Juan Salguero · 8 SP

| Task | SP | Responsabilidad |
|---|---:|---|
| 4.1 | 2 | Esquema de paquetes/compras y constraint `compra` |
| 4.2 | 1 | Listado de paquetes |
| 4.3 | 2 | Compra simulada e idempotencia |
| 4.4 | 1 | Historial de créditos |
| 5.1 | 1 | Persistencia Premium |
| 5.2 | 1 | Activación y consulta Premium |
| **Total** | **8** |  |

### Coordinaciones

- Con AS para contratos consumidos por frontend.
- Con CL para tests y revisión transaccional.

## MR — Mar · 8 SP

| Task | SP | Responsabilidad |
|---|---:|---|
| 1.5 | 2 | Tokens y primitivas visuales |
| 2.1 | 2 | Home cliente |
| 2.2 | 2 | Detalle de proveedor y solicitud directa |
| 2.3 | 2 | Mis pedidos y estados |
| **Total** | **8** |  |

### Coordinaciones

- Entregar primitivas temprano para no bloquear al equipo.
- D revisa sus pantallas; MR revisa las pantallas de D.
- PT conserva autoridad sobre layout global y cierre visual.

## AS — Antony Saz · 8 SP

| Task | SP | Responsabilidad |
|---|---:|---|
| 5.3 | 2 | Acreditación Premium por ciclo |
| 5.4 | 1 | API de estado y beneficios Premium |
| 6.1 | 2 | Pantalla Créditos |
| 6.2 | 2 | Paquetes y Checkout |
| 6.4 | 1 | Administración de Créditos y Premium |
| **Total** | **8** |  |

### Coordinaciones

- Con JA para esquemas y contratos.
- Con PT para PremiumBadge y coherencia visual.
- Con D para integración administrativa.

## PT — Pablo Toledo · 8 SP

| Task | SP | Responsabilidad |
|---|---:|---|
| 1.2 | 1 | Contenedor desktop de InternalLayout |
| 1.3 | 2 | Navegación móvil global |
| 2.4 | 1 | Publicar y detalle de pedido |
| 2.5 | 2 | Solicitudes y calificación |
| 6.3 | 1 | Premium visual en dashboard/perfil |
| 7.2 | 1 | Regresión visual y demo |
| **Total** | **8** |  |

### Coordinaciones

- Merge de 1.2 y 1.3 antes del revamp paralelo.
- Revisar primitivas de MR, no construir una segunda versión.
- Liderar cierre visual sin revisar cada PR del sprint.

## D — David López · 8 SP

| Task | SP | Responsabilidad |
|---|---:|---|
| 3.1 | 2 | Refactor de ProviderDashboard |
| 3.2 | 2 | Dashboard y oportunidades |
| 3.3 | 2 | Perfil proveedor y Premium |
| 3.4 | 2 | Admin y chat responsive |
| **Total** | **8** |  |

### Coordinaciones

- Revisar el revamp cliente de MR.
- MR revisa proveedor/admin.
- Coordinar destinos de notificaciones con CL.

---

# Dependencias

```text
1.2 + 1.3 + 1.5  ───────────────→ Epics 2 y 3
1.1 + 4.4         ───────────────→ 6.1
4.1               ───────────────→ 4.2, 4.3 y 5.1
4.2 + 4.3         ───────────────→ 6.2
5.1 + 5.2 + 5.3   ───────────────→ 5.4, 6.3 y 6.4
Epics 1–6         ───────────────→ Epic 7
```

## Gate visual

Las tareas 1.2, 1.3 y 1.5 deben estar mergeadas antes de que el revamp por rol avance de forma masiva.

## Gate monetización

El contrato de paquetes, compra y Premium debe acordarse entre JA y AS antes de construir el checkout.

---

# Calendario tentativo

## 4–7 de agosto — Cimientos

| Fecha | Objetivo técnico |
|---|---|
| Mar 04/08 | Iniciar 1.1, 1.2, 1.5, 4.1 y 5.1 |
| Mié 05/08 | Header móvil, primitivas, esquema y constraint `compra` |
| Jue 06/08 | Notificaciones navegables, paquetes y activación Premium |
| Vie 07/08 | Gate 1: base visual y contratos backend mergeados a `dev` |

## 8–9 de agosto — Buffer opcional

- Sin entregables obligatorios.
- Solo recuperación de bloqueos o correcciones voluntarias.

## 10–14 de agosto — Revamp y monetización

| Fecha | Objetivo técnico |
|---|---|
| Lun 10/08 | Iniciar revamp cliente, proveedor y admin sobre la base mergeada |
| Mar 11/08 | Pantalla Créditos, historial y dashboard proveedor |
| Mié 12/08 | Checkout simulado, Solicitudes/Calificar y perfil Premium |
| Jue 13/08 | Gate 2: frontend y backend de monetización conectados |
| Vie 14/08 | Administración Créditos/Premium, chat responsive y primera regresión |

## 15–16 de agosto — Buffer opcional

- Sin tareas obligatorias.
- Absorbe atrasos de integración si fueran necesarios.

## 17–18 de agosto — Cierre

| Fecha | Objetivo técnico |
|---|---|
| Lun 17/08 | Tests completos, build web, regresión visual, release candidate y demo |
| Mar 18/08 | Entrega del Sprint 6 |

---

# Checkpoints

## Gate 1 — viernes 7 de agosto

- Saldo real consultable.
- `InternalLayout` centrado y con navegación móvil.
- Primitivas visuales mergeadas.
- Esquema de paquetes y Premium aplicado correctamente.
- Constraint `compra` funcionando.

## Gate 2 — jueves 13 de agosto

- Revamp principal visible.
- Compra simulada funcional.
- Premium activable por 30 días.
- Pantalla de créditos conectada.
- Sin ramas grandes aisladas de `dev`.

## Gate 3 — lunes 17 de agosto

- Tests verdes.
- Build web verde.
- 1440px, 1024px y 390px validados.
- Compra y Premium demostrables.
- Flow A y Flow B sin regresiones.
- Datos de demostración preparados.

---

# Flujo de demo esperado

## Revamp

1. Cliente recorre Home, proveedor, pedido y Mis servicios.
2. Proveedor recorre dashboard, oportunidades, Trabajos y créditos.
3. Admin abre Créditos y Premium.
4. Se muestra navegación desktop y móvil.
5. Se abre una notificación y navega al destino correcto.

## Compra

1. Proveedor abre Créditos.
2. Consulta saldo e historial.
3. Compara los cuatro paquetes.
4. Selecciona y confirma compra simulada.
5. Compra queda `completada`.
6. Saldo aumenta una vez.
7. Historial muestra la referencia.

## Premium

1. Proveedor activa Premium por Q115.
2. Sistema registra 30 días.
3. Se acreditan 10 créditos como `bono`.
4. PremiumBadge aparece en dashboard y perfil.
5. Admin consulta vigencia.
6. Repetir la solicitud no duplica créditos.
7. Se confirma que Premium no modifica slots de cotización.

---

# Riesgos y mitigaciones

| Riesgo | Mitigación |
|---|---|
| Constraint impide registrar compras | Task 4.1 amplía el CHECK y se prueba en volumen existente. |
| Divergencia entre esquemas | Actualizar `init.sql` y `sync_schema.php`; no usar solo migraciones aisladas. |
| PT se convierte en cuello de botella | Primitivas pasan a MR; reviews visuales se cruzan MR/D. |
| Conflictos durante el revamp | Gate visual antes de modificar pantallas en paralelo. |
| Compra acredita dos veces | Transacción, `idempotency_key`, restricción única y tests. |
| Premium altera lógica elogiada | No modifica slots de cotización durante Sprint 6. |
| Cronograma depende de fines de semana | Fines de semana son buffer, no días comprometidos. |
| Errores ocultos por fallback | DoD prohíbe convertir fallos de API en valores válidos silenciosos. |
| Prototipo se toma como contrato backend | Tipos, rutas y estados reales vienen del backend y del plan ratificado. |
| Se agregan features por existir en el prototipo | Dark mode, tab bar adicional y otras superficies requieren aprobación de alcance. |

---

# Fuera del alcance del Sprint 6

- Pasarela de pago real.
- Captura de tarjeta o CVV.
- Renovación bancaria automática.
- Reembolsos reales.
- Dark mode.
- Recuperación de contraseña.
- Módulo de publicaciones múltiples de servicios.
- Descuento Premium en paquetes.
- Alteración de slots gratuitos de cotización.
- Analítica avanzada.
- Pago completo de servicios dentro de la plataforma.
- Trazabilidad `servicio → pedido/cotización`.
- Pantalla Mis cotizaciones.
- Pantalla completa de notificaciones.
- Documentación retroactiva de todos los endpoints históricos.

---

# Actividades transversales sin SP técnico individual

- Gestión de Jira.
- LOGT.
- Evidencias.
- Burndown y velocidad.
- Documento académico.
- Retrospectiva.
- Preparación administrativa de la entrega.
- Requisitos adicionales de la guía del profesor.

Cada integrante aporta evidencia de sus propias tareas, pero estas actividades no se utilizan para inflar su carga técnica individual.
