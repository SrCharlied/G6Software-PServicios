# API de materiales — Sprint 9

Bolsa de materiales para **proveedores**. Un proveedor publica el material sobrante de un servicio que el cliente canceló **cuando ya iba en camino**; otros proveedores lo solicitan y se contactan por el chat interno. El pago y la entrega ocurren fuera de ServiGT.

> Contrato implementado en la rama `sprint9/materiales-mensajeria-contextual` (Tasks 2.1 a 2.4, 4.1 y 4.2). Es el contrato **actual**, no necesariamente el definitivo: quien lo cambie debe agregar pruebas de regresión.

Todas las rutas usan prefijo `/api`, `auth:sanctum` y devuelven JSON con `success` y `message` (más `correlation_id`). Solo el rol `proveedor` con perfil completo accede; `cliente`/`admin` reciben `403` y anónimos `401`. La identidad sale del token: ningún ID del body autoriza una acción.

## Reglas

- Un lote por servicio. Elegible solo si `servicio.estado = cancelado` y `servicio.cancelado_desde = en_camino`. Las cancelaciones históricas (`cancelado_desde` nulo) no son elegibles.
- El vendedor es siempre el proveedor del servicio.
- 1 a 3 imágenes (JPG/JPEG/PNG/WebP, máx. 4 MB) en disco público; cantidad > 0; unidad y departamento obligatorios; el precio referencial acepta Q0.
- Estados del lote: `disponible` → `reservado` → `vendido`, o `retirado`. `vendido` y `retirado` son terminales.
- Varias solicitudes `pendiente` por lote; una sola `aceptada`. Un comprador no repite una solicitud pendiente, aceptada ni rechazada sobre el mismo lote (sí tras cancelar). El vendedor no se reserva a sí mismo.
- Nunca se expone teléfono ni correo. El contacto es el chat de la reserva (`/api/mensajes/reservas/{id}`).

## Lotes

### `GET /api/materiales`
Catálogo: lotes `disponible` o `reservado` de **otros** proveedores. Query: `departamento`, `q` (título/descripción), `per_page` (1–50), `page`.
Respuesta: `{ publicaciones: [Lote], meta: { total, per_page, current_page, last_page } }`.

### `GET /api/materiales/mias`
Todos mis lotes (incluye terminales), con `reservas_pendientes`. Respuesta: `{ publicaciones, total }`.

### `GET /api/materiales/{id}`
Visible si el lote está activo, es mío o tengo una reserva sobre él; si no, `404`. Respuesta: `{ publicacion: Lote }`.

### `POST /api/materiales` (multipart/form-data)
Campos: `servicio_id`, `titulo` (3–120), `descripcion` (10–1000), `cantidad`, `unidad` (≤30), `precio_referencial` (≥0), `departamento`, `municipio?`, `imagenes[]` (1–3).
`201 { publicacion }`. Errores: `404` servicio inexistente · `403` no eres el proveedor del servicio · `409` el servicio ya tiene lote · `422` no elegible o validación. Si algo falla a mitad, no quedan filas ni archivos.

### `PUT /api/materiales/{id}`
Edita un lote `disponible` propio. Clientes con archivos: `POST` con `_method=PUT` (multipart). Campos opcionales como en la creación, más `imagenes[]` (agregar) y `eliminar_imagenes[]` (IDs a borrar). **No enviar archivos no borra imágenes**; el lote conserva entre 1 y 3.
Errores: `403` no es mío · `404` · `422` (estado no editable, imágenes fuera de rango o ajenas).

### `POST /api/materiales/{id}/retirar`
Solo `disponible`; uno `reservado` exige cancelar la reserva antes (`422`). Rechaza y notifica las solicitudes pendientes.

### `POST /api/materiales/{id}/vendido`
Solo el vendedor; desde `disponible` o `reservado`. Terminal.

**Lote**
```json
{
  "id": 7, "titulo": "Tubería PVC sobrante", "descripcion": "…",
  "cantidad": 10, "unidad": "metros", "precio_referencial": 150,
  "departamento": "Guatemala", "municipio": "Mixco",
  "estado": "disponible", "es_mio": false,
  "imagenes": [{ "id": 1, "url": "/storage/materiales/7/…jpg", "orden": 1 }],
  "vendedor": { "id": 3, "nombre": "…", "foto_perfil": null, "calificacion_promedio": 4.5 },
  "mi_reserva": { "id": 12, "estado": "pendiente" }
}
```
`mi_reserva` solo aparece para compradores; `servicio_id` y `reservas_pendientes`, solo para el vendedor.

## Reservas

### `POST /api/materiales/{id}/reservas`
Body JSON: `mensaje_inicial` (≤1000), `idempotency_key` (≤80). Crea la reserva `pendiente`, el primer mensaje del hilo y la notificación al vendedor. Repetir la misma clave sobre el mismo lote devuelve la misma reserva con `200` sin duplicar nada.
`201 { reserva }`. Errores: `403` lote propio · `404` · `409` clave usada en otro lote, o solicitud vigente/rechazada previa · `422` lote no disponible o validación.

### `GET /api/materiales/{id}/reservas`
Solicitudes recibidas por un lote propio (`403` si no eres el vendedor). `{ reservas, total }`.

### `GET /api/reservas-material`
Mis reservas como comprador, todos los estados. `per_page` opcional. `{ reservas, meta }`.

### `GET /api/reservas-material/{id}`
Detalle para comprador o vendedor (`403` a otros, `404` si no existe).

### `POST /api/reservas-material/{id}/aceptar` · `/rechazar` · `/cancelar`
- **aceptar** (vendedor, reserva `pendiente`, lote `disponible`): reserva → `aceptada`, lote → `reservado`, las demás `pendiente` → `rechazada`. Una reserva `cancelada` no se convierte en rechazada.
- **rechazar** (vendedor, `pendiente`): → `rechazada`; el lote sigue disponible.
- **cancelar**: el comprador cancela `pendiente` o `aceptada`; el vendedor solo `aceptada`. Cancelar una aceptada libera el lote (`disponible`).

Todas devuelven `{ reserva }`. Errores: `403` sin permiso · `404` · `422` estado inválido. Bloqueo: lote primero y reserva después.

**Reserva**
```json
{
  "id": 12, "publicacion_id": 7, "estado": "pendiente",
  "mensaje_inicial": "…", "rol": "vendedor",
  "acciones": ["aceptar", "rechazar"],
  "chat": { "tipo": "reserva", "id": 12 },
  "comprador": { "id": 4, "nombre": "…", "foto_perfil": null, "calificacion_promedio": 4.2 },
  "publicacion": { "id": 7, "titulo": "…", "estado": "disponible", "imagen_principal": "/storage/…", "vendedor": { "id": 3, "nombre": "…" } }
}
```
`rol` es `comprador` o `vendedor` según el usuario; `acciones` lista lo que el backend permite ahora (el frontend solo lo pinta).

## Servicio (`ServicioResource`)
Dos campos nuevos, calculados por el backend y solo con valor para el proveedor del servicio:
- `puede_publicar_materiales` (bool): cancelado desde `en_camino` y sin lote.
- `publicacion_material_id` (int|null): el lote ya publicado.

## Notificaciones
Tipos: `reserva_material_solicitada` (al vendedor), `reserva_material_aceptada` y `reserva_material_rechazada` (al comprador), `reserva_material_cancelada` (a la contraparte de quien cancela).
`datos` lleva **solo** `{ reserva_id, publicacion_id }`: sin teléfono, correo ni datos de otros solicitantes.
