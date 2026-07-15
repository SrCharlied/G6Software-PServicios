# G6Software-PServicios — ServiGT
Proyecto de servicios.
Ingeniería de Sofwtare I
Ing. Erick Marroquín

Integrantes:

Carlos López
David López
Mariana Castañeda
Antony Saz
Juan Salguero
Pablo Toledo

Este es un proyecto enfocado a brindar una plataforma en la cual clientes y proveedores de servicios puedan interacturar. El producto se llama **ServiGT**: un marketplace de servicios para Guatemala con tres roles (cliente, proveedor, admin), construido con Laravel + PostgreSQL en el backend y Expo/React Native (web) en el frontend. El código vive en la carpeta [`ServiGT/`](ServiGT/).

## Contenido de cada carpeta

- **Avances 1**: Archivos pdf y docx de los avances de la primera fase del proyecto
- **Avances 2**: Avances de la segunda fase del proyecto
- **Avances 3**: Pendiente de completar
- **Corte 1**: Archivos pdf y docx de los archivos hechos en la fase 1 y pdf de la presentación
- **Corte 2**: Entrega del segundo corte del proyecto
- **Corte 3**: Pendiente de completar (se documentará el cierre del Sprint 5 aquí)
- **Scrum**: Documentación del proceso Scrum del equipo
- **ServiGT**: Código fuente del proyecto (backend Laravel, frontend Expo, `docker-compose.yml`)
- **ServiGt-Design.zip**: Mockups y sistema visual de referencia (pantallas exportadas por rol: público, cliente, proveedor, admin, versión mobile y desktop)

## Sprint 5

**Objetivo**: cerrar el flujo de marketplace de demanda de ServiGT (pedido → cotización → cliente acepta → se crea servicio) y aplicar un revamp visual completo a la app interna, además de incorporar pruebas unitarias automatizadas y estimación de tiempo/costo del proyecto.

- **Fechas**: 10 al 27 de julio de 2026 (desarrollo/documentación), presentación el 28 de julio de 2026.
- **Capacidad**: 48 Story Points entre 6 integrantes.
- **Flow B** (a completar este sprint): cliente publica un pedido abierto → proveedores envían cotizaciones (las primeras 3 son gratis, de la 4ta a la 6ta cuestan 1 crédito, máximo 6 por pedido) → el cliente acepta una cotización → se crea un servicio que continúa con código de inicio, código de fin y calificación, igual que el flujo de contratación directa (**Flow A**, ya funcional desde sprints anteriores).
- **Revamp visual**: nuevo sistema de diseño (colores, botones, inputs, cards, badges, layouts de escritorio) aplicado a las pantallas de cliente, proveedor, admin, chat, pedidos y cotizaciones.
- **Otras entregas**: recarga manual de créditos desde el panel de administrador, pruebas unitarias con PHPUnit/Laravel Test, y estimación de tiempo/costo del proyecto.

### Estado a la fecha

- ✅ **Backend de créditos y límite de cotizaciones**: cobro de crédito a partir de la 4ta cotización, registro de transacciones de gasto, bloqueo por saldo insuficiente, límite de 6 cotizaciones por pedido.
- ✅ **Backend de aceptación de cotizaciones**: endpoint para que el cliente dueño de un pedido acepte una cotización, creación automática del servicio y actualización de estados (pedido → `adjudicado`, cotización ganadora → `aceptada`, resto → `rechazada`).
- ✅ **Cobertura de pruebas automatizadas** para créditos, límites, aceptación y casos borde (permisos, IDs cruzados, estados inválidos).
- ⏳ Recarga manual de créditos desde admin, notificaciones de adjudicación, revamp visual completo, y el resto de la documentación del sprint (estimación de costo/tiempo, LOGT, retrospectiva) — en progreso.

