# API de mensajería contextual — Sprint 9

Un mensaje pertenece a **un servicio**, a **una reserva de material** o a **ninguno** (historial anterior). Nunca a dos contextos a la vez (`CHECK` en BD). No existe tabla `conversaciones`.

> Contrato implementado en la rama `sprint9/materiales-mensajeria-contextual` (Tasks 4.1 y 4.2). Es el contrato actual; cambiarlo exige pruebas de regresión.

Prefijo `/api`, `auth:sanctum`. La contraparte se **deriva del recurso** autorizado: ningún `receptor_id`, `emisor_id`, `servicio_id` ni `reserva_material_id` del body decide acceso (se ignoran en los endpoints tipados).

## Endpoints tipados

| Método y ruta | Descripción |
|---|---|
| `GET /mensajes/servicios/{servicioId}?last_id=` | Mensajes del hilo del servicio. |
| `POST /mensajes/servicios/{servicioId}` | Enviar. Body: `{ "contenido": "…" }` (≤2000). |
| `GET /mensajes/reservas/{reservaId}?last_id=` | Mensajes del hilo de la reserva. |
| `POST /mensajes/reservas/{reservaId}` | Enviar. Body: `{ "contenido": "…" }`. |

Acceso: solo los dos participantes (cliente y proveedor del servicio; comprador y vendedor de la reserva). Tercero y admin → `403`; recurso inexistente → `404`; anónimo → `401`. Rate limit `messages`.

`GET` responde:
```json
{
  "mensajes": [{ "id": 1, "emisor_id": 5, "receptor_id": 9, "contenido": "…", "leido": false, "legado": false, "created_at": "…" }],
  "contexto": { "tipo": "servicio", "id": 3, "estado": "aceptado", "solo_lectura": false },
  "contraparte": { "id": 9, "name": "…", "role": "proveedor", "foto_perfil": null }
}
```
- `last_id` devuelve solo los mensajes nuevos (polling).
- Solo se marcan como leídos los mensajes recibidos **de ese hilo**.
- Un mensaje histórico con `servicio_id` de un servicio donde esas dos personas no son parte no aparece en ese hilo.
- Un servicio en `interrumpido_seguridad` (estado terminal de la Task 5.1) conserva la lectura y rechaza `POST` con `409`.
- El envío tipado y el legacy bloquean el servicio dentro de una transacción y revalidan participantes y estado antes de guardar. Si la interrupción confirma primero, el envío concurrente responde `409` sin crear mensajes; si el envío confirma primero, su mensaje permanece en el historial de solo lectura.

`POST` responde `201 { message, mensaje }`.

## Bandeja

### `GET /mensajes/hilos?per_page=&page=`
Un hilo por (contexto, contraparte), con último mensaje y no leídos **agrupados en SQL** (`DISTINCT ON` + ventana; no se carga el historial en PHP). Orden: más reciente primero. `per_page` 1–50 (20 por defecto).
```json
{
  "hilos": [{
    "tipo": "servicio | reserva | legado",
    "contexto_id": 3,
    "contexto": { "titulo": "Plomería", "estado": "aceptado" },
    "contraparte": { "id": 9, "name": "…", "role": "proveedor", "foto_perfil": null },
    "ultimo_mensaje": { "id": 40, "contenido": "…", "emisor_id": 9, "created_at": "…" },
    "no_leidos": 2,
    "solo_lectura": false
  }],
  "meta": { "total": 3, "per_page": 20, "current_page": 1, "last_page": 1 }
}
```
`tipo = legado` agrupa los mensajes sin contexto **o con un contexto que no vincula a sus dos extremos**; `contexto_id` es `null` y `solo_lectura` es `true`. No se hace backfill semántico ni se asigna "el servicio más reciente".

### `GET /mensajes/historial/{userId}`
Mensajes con esa persona que son historial anterior (`tipo = legado`). Solo lectura: no existe `POST`.

## Endpoints legacy (compatibilidad)

| Ruta | Comportamiento |
|---|---|
| `POST /mensajes` | `receptor_id`, `contenido` y `servicio_id?`. Deriva el **único** servicio en común y lo guarda en el mensaje. Con `servicio_id` explícito, solo si vincula a ambos (`403` si no). Con varios servicios y sin `servicio_id` → `409`. Sin servicio en común → `403`. |
| `GET /mensajes/conversacion/{userId}` | Historial anterior + mensajes del único servicio en común (cada mensaje lleva `legado`). Con varios servicios → `409`. |
| `GET /mensajes/conversaciones` | Último mensaje por contraparte, resuelto con `DISTINCT ON`. Mezcla contextos: use `/mensajes/hilos`. |

### Retiro previsto de los endpoints legacy
Cuando `ChatListScreen` y `ChatScreen` consuman los endpoints tipados y `/mensajes/hilos` (Task 4.3), los tres endpoints legacy quedan sin consumidores. Se retiran en un sprint posterior, después de confirmar en logs que no reciben tráfico. Hasta entonces no deben ampliarse.
