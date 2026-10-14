# Capturas de las pantallas internas del Sprint 9

Estas capturas muestran el contenido real con sesiones autenticadas de proveedor y administrador, no la redirección pública de las capturas anteriores.

## Entorno

Se utilizó la misma imagen `servigt-frontend_prod` publicada en servigtdev.com, con el bundle `entry-775ea5f1bf8efbd7e7dc2d19f2ed6a75.js`, y la imagen backend actual. Los contenedores se ejecutaron en una red Docker aislada con PostgreSQL temporal y datos ficticios identificados por `SMOKE`. Se utilizaron tokens Sanctum válidos exclusivamente en esa base de prueba. No se simularon respuestas HTTP ni se alteró el sitio público.

## Capturas

Cada pantalla tiene versiones a 1440, 1024 y 390 px:

- `bolsa-materiales`: catálogo con lotes y precios.
- `mis-lotes`: publicaciones del proveedor y estados.
- `mis-reservas`: solicitudes del proveedor con datos y estados.
- `detalle-lote`: información del lote reservado.
- `centro-seguridad`: formulario del servicio #1, ayuda inmediata y acciones.
- `admin-reportes-seguridad`: cola administrativa con un reporte.
- `admin-detalle-reporte`: detalle del reporte ficticio.

## Verificación

Se ejecutó Chromium mediante Playwright contra el frontend y la API reales del entorno aislado. Antes de capturar se comprobó que cada URL conservara su ruta, que apareciera contenido específico de la pantalla, que no existiera “Unmatched Route” y que las llamadas API no devolvieran errores HTTP. Los 21 resultados están en `verificacion.json`.

Se inspeccionaron visualmente las capturas de bolsa de materiales, centro de seguridad y detalle administrativo. No se enviaron reportes ni se interrumpieron servicios desde la UI. Las capturas ilustran las pantallas con datos de prueba; no certifican las cuentas ni los registros del servidor público. No se modificó código de aplicación ni se ejecutó su suite de tests.

El entorno temporal se eliminó al terminar. Los tokens y credenciales de prueba quedaron fuera del repositorio.
