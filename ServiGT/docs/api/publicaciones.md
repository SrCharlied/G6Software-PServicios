# API — Publicaciones de servicios ofrecidos

Contrato de los endpoints del Epic 5 del Sprint 7. Autenticación por token Bearer de Sanctum (`Authorization: Bearer <token>`) salvo donde diga *público*.

El límite de publicaciones activas —**1 gratis, 3 con Premium activo**— se aplica **siempre en el backend**, dentro de una transacción que bloquea al proveedor antes de contar (`PublicacionServicioController`). El frontend nunca lo calcula: lo lee del campo `cupos`.

---

## `GET /api/publicaciones` — catálogo público

*Público.* Devuelve solo publicaciones efectivamente visibles: activas y dentro de la ventana del límite de su proveedor.

**Query params (todos opcionales)**

| Campo | Tipo | Notas |
|---|---|---|
| `categoria_id` | entero | Debe existir en `categorias`. |
| `proveedor_id` | entero | Debe existir en `proveedores`. Es el que usa el perfil público. |
| `per_page` | entero | 1–50, por defecto 15. |
| `page` | entero | Por defecto 1. |

**200**

```json
{
  "message": "OK",
  "publicaciones": [
    {
      "id": 12,
      "titulo": "Instalacion de tuberia PVC",
      "descripcion": "Instalacion y reparacion en vivienda, materiales aparte.",
      "precio_referencial": 350.0,
      "imagen": "/storage/publicaciones/4/12_1757180000.jpg",
      "estado": "activa",
      "created_at": "2026-09-04T18:12:03+00:00",
      "updated_at": "2026-09-04T18:12:03+00:00",
      "categoria": { "id": 1, "nombre": "Plomería" },
      "proveedor": {
        "id": 4,
        "nombre": "Juan Perez",
        "telefono": "5555-0101",
        "foto_perfil": "/storage/fotos/4/…",
        "calificacion_promedio": 4.8,
        "premium_estado": "activo"
      }
    }
  ],
  "meta": { "total": 1, "per_page": 15, "current_page": 1, "last_page": 1 }
}
```

`precio_referencial` en `null` significa **a cotizar**, no gratis. `meta` cuenta solo lo visible: la ventana del límite se aplica antes de paginar.

---

## `GET /api/publicaciones/{id}` — detalle público

*Público.* **200** con `{ "publicacion": { … } }`. Responde **404** si la publicación no está activa o quedó fuera de la ventana de visibilidad de su proveedor; nunca revela que existe pero está oculta.

---

## `GET /api/publicaciones/mias` — listado propio

*Requiere rol `proveedor` con perfil creado.* Incluye las inactivas.

**200**

```json
{
  "message": "OK",
  "publicaciones": [ … ],
  "total": 2,
  "cupos": {
    "limite": 1,
    "activas": 1,
    "disponibles": 0,
    "premium_estado": "nunca",
    "limite_premium": 3
  }
}
```

`cupos.disponibles` nunca es negativo: un proveedor cuyo Premium acaba de vencer puede tener 3 activas contra un límite de 1 hasta que la siguiente escritura normalice los excedentes bajo lock.

**403** si el usuario no es proveedor, o es proveedor sin perfil.

---

## `POST /api/publicaciones` — crear

*Requiere rol `proveedor` con perfil.* `throttle:uploads` (10/min por usuario). Acepta `application/json` o `multipart/form-data` (obligatorio si se manda imagen).

| Campo | Reglas |
|---|---|
| `titulo` | requerido, 5–120 caracteres |
| `descripcion` | requerido, 20–1000 caracteres |
| `categoria_id` | opcional, debe existir |
| `precio_referencial` | opcional, numérico ≥ 0, ≤ 999999.99 |
| `estado` | opcional, `activa` o `inactiva` (por defecto `activa`) |
| `imagen` | opcional, `jpg/jpeg/png/webp`, máx. 4 MB |

`proveedor_id` **no se acepta**: se deriva del token.

- **201** `{ "publicacion": { … } }`
- **422** validación, o límite alcanzado: `Alcanzaste el limite de publicaciones activas (1).`
- **403** rol incorrecto o sin perfil de proveedor

---

## `PUT /api/publicaciones/{id}` — editar

*Requiere ser el proveedor propietario.* `throttle:uploads`. Mismos campos, todos opcionales, más `eliminar_imagen` (booleano).

Con imagen hay que usar `POST` con `_method=PUT`: PHP no parsea el cuerpo de un `PUT` multipart.

- **200** `{ "publicacion": { … } }` · **403** publicación ajena · **404** inexistente · **422** validación o límite al reactivar

---

## `POST /api/publicaciones/{id}/activar` · `POST /api/publicaciones/{id}/desactivar`

*Requiere ser el proveedor propietario.* Activar cuenta contra el mismo límite que crear, bajo el mismo lock.

- **200** `{ "publicacion": { … } }` · **403** / **404** / **422** igual que arriba

---

## `DELETE /api/publicaciones/{id}` — eliminar

*Requiere ser el proveedor propietario.* Borra también la imagen del disco público.

- **200** `{ "message": "Publicacion eliminada correctamente." }`

Los servicios ya contratados **no se tocan**: la FK es `ON DELETE SET NULL` y conservan su snapshot.

---

## `POST /api/servicios` — contratar (cambio del Sprint 7)

*Requiere rol `cliente`.* Ahora acepta `publicacion_id` como alternativa a `proveedor_id`.

| Campo | Reglas |
|---|---|
| `publicacion_id` | opcional, debe existir |
| `proveedor_id` | requerido **si no** se manda `publicacion_id` |
| `descripcion` | requerido, ≤ 1000 caracteres |
| `direccion` | opcional, ≤ 500 |
| `fecha_agendada` | opcional, posterior a ahora |
| `monto_acordado` | opcional; **se ignora** cuando se manda `publicacion_id` |

Con `publicacion_id`, el backend **deriva del servidor** `proveedor_id`, `categoria_id`, `publicacion_titulo` y `publicacion_precio_referencial`; ignora los que mande el cliente. El título y el precio se copian como snapshot: editar o borrar la publicación después no reescribe lo contratado.

- **201** `{ "servicio": { …, "publicacion_id": 12, "publicacion_titulo": "…", "publicacion_precio_referencial": 350.0 } }`
- **404** la publicación no está activa
- **403** el usuario no es cliente, o intenta contratarse a sí mismo
- **401** sin autenticar

---

## Errores

Todos los errores siguen el contrato de la task 4.3: mensaje genérico, sin SQL ni stack, y un `correlation_id` que también aparece en el log del backend.

```json
{ "message": "No tienes permiso para administrar esta publicacion.", "correlation_id": "99a2ce06-…" }
```
