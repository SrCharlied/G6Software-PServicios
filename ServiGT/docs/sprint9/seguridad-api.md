# API del Centro de seguridad — Sprint 9

Reporte de incidentes de un servicio, interrupción atómica, evidencia privada y cola administrativa auditable.

> Contrato implementado en la rama `sprint9/seguridad-reportes-admin` (Tasks 5.1 a 5.4). Es el contrato **actual**, no necesariamente el definitivo: quien lo cambie debe agregar pruebas de regresión.

**Alcance honesto:** ServiGT registra y deja trazabilidad. No hay despacho de emergencias, monitoreo 24/7, SLA, sanción, devolución ni suspensión automática.

Prefijo `/api`, `auth:sanctum`, respuestas JSON con `success` y `message` (más `correlation_id`).

## Reglas

- **Quién reporta:** el cliente o el proveedor del servicio. Tercero y admin → `403`; servicio inexistente → `404`.
- **Cuándo:** solo con el servicio en `aceptado`, `en_camino`, `en_progreso` o `por_confirmar` (`422` en otro caso).
- **Reporte simple** no cambia el servicio; la contraparte puede crear después su propio reporte.
- **Interrupción:** reporte obligatorio + estado terminal `interrumpido_seguridad` + `codigo_inicio` y `codigo_fin` en `NULL`, todo en una transacción con `lockForUpdate()` sobre el servicio (el mismo lock de `finalizar`, `confirmar-fin` y `cancelar`). Nunca existe un servicio interrumpido sin reporte. Una sola interrupción por servicio (índice único en BD).
- Un servicio `interrumpido_seguridad` no se puede iniciar, finalizar, confirmar, cancelar, calificar, aceptar, rechazar ni reabrir. Su chat queda de solo lectura (ver `mensajeria-api.md`).
- **Privacidad:** el reporte, sus evidencias y las notas internas solo los ven el reportante y el admin. La contraparte recibe una notificación **genérica** (`datos = { servicio_id }`, sin categoría, descripción ni archivos).
- **Idempotencia:** `idempotency_key` única por reportante (BD). Repetirla sobre la misma operación devuelve `200` con el mismo reporte; usarla en otra operación o servicio → `409`.
- **Categorías (provisionales):** `amenaza_o_acoso`, `conducta_inapropiada`, `robo_o_dano`, `emergencia`, `otro`.

## Participantes

### `POST /api/servicios/{id}/seguridad/reportes`
### `POST /api/servicios/{id}/seguridad/interrumpir`
Body: `categoria`, `descripcion` (5–2000), `idempotency_key` (≤80).
`201 { reporte, servicio }` (`200` si es una repetición idempotente). En `interrumpir`, `servicio.estado = interrumpido_seguridad` y no trae códigos.
Errores: `403` no participa · `404` · `409` clave usada en otra operación · `422` estado no disponible o validación.

### `GET /api/seguridad/reportes/{id}`
Solo el reportante y el admin. `{ reporte }` — sin historial ni notas.

```json
{
  "id": 8, "servicio_id": 3, "categoria": "emergencia", "descripcion": "…",
  "interrumpio_servicio": true, "estado": "recibido",
  "evidencias": [{ "id": 1, "orden": 1, "nombre": "foto.png", "mime": "image/png", "tamano_bytes": 1024 }],
  "puede_adjuntar_evidencia": true, "created_at": "…"
}
```

### `POST /api/seguridad/reportes/{id}/evidencias` (multipart)
Solo el reportante. Campo `archivos[]` (1–3 por subida, **máximo 3 por reporte**), JPG/PNG/PDF de hasta **5 MB**. El tipo se detecta **por contenido** (`finfo`), no por la extensión ni el MIME declarado. Se guardan en el **disco privado** (`storage/app/private/seguridad/{reporte}/{uuid}.{ext}`) con nombre aleatorio, y se registra el SHA-256.
Es una operación **posterior y separada** del reporte: no forma parte de la transacción de interrupción. Si algo falla, no quedan filas ni archivos huérfanos.
`201 { reporte }`. Errores: `403` no eres el reportante · `404` · `422` formato, tamaño o tope.

### `GET /api/seguridad/reportes/{id}/evidencias/{evidenciaId}/descargar`
Solo el reportante y el admin. Responde como `attachment` con `X-Content-Type-Options: nosniff` y `Cache-Control: private, no-store`. `404` si la evidencia no pertenece a ese reporte o el archivo ya no existe.

**No existe** URL pública ni se serializa la ruta física en ninguna respuesta, y **no hay endpoint de borrado** para el cliente.

## Administración

Requiere rol `admin` (`401` sin sesión, `403` para cliente/proveedor).

### `GET /api/admin/reportes-seguridad`
Query: `estado`, `categoria`, `interrumpio` (bool), `servicio_id`, `per_page` (1–50), `page`. Más recientes primero.
`{ reportes: [AdminReporte], meta: { total, per_page, current_page, last_page } }`. Cada item trae `estado` (**del reporte**), `servicio.estado` (**actual del servicio**, independiente), `reportante`, `evidencias_count` y `transiciones_permitidas`.

### `GET /api/admin/reportes-seguridad/{id}`
Detalle con `evidencias` (metadatos, sin ruta) e `historial` auditable (actor, estado anterior/nuevo, `nota_interna`, `correlation_id`).

### `POST /api/admin/reportes-seguridad/{id}/estado`
Body: `estado`, `nota_interna?` (≤2000). Transiciones: `recibido → en_revision → resuelto | descartado`; `resuelto` y `descartado` son terminales. Bajo lock, con un evento por cambio. El actor es siempre el admin autenticado.
`200 { reporte }`. Errores: `404` · `422` transición inválida o validación.
**Resolver o descartar no modifica ni reabre el servicio.**

## Auditoría
`historial_reportes_seguridad` es inmutable: un trigger rechaza todo `UPDATE`, salvo que la FK anonimice al actor (`actor_id → NULL`) cuando se borra su usuario. No bloquea el borrado en cascada.

## Notificaciones
`servicio_seguridad_reporte` (reporte simple) y `servicio_interrumpido_seguridad` (interrupción), a la contraparte, con `datos = { servicio_id }`. Cambiar el estado desde el panel admin **no** genera notificaciones.

## Esquema
`servicios.estado` pasa a `VARCHAR(30)` con `interrumpido_seguridad` en el `CHECK`; tablas `reportes_seguridad`, `evidencias_reporte_seguridad` e `historial_reportes_seguridad`. Todo idempotente en `database/init.sql` (verificado en base limpia y en volumen existente) y comprobado en `docker/sync_schema.php`.
