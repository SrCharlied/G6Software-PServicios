# Categorías múltiples (HU 1.6.b): contrato implementado

El pivote `proveedor_categorias` es la fuente de verdad de las categorías de
un perfil. `proveedores.categoria_id` guarda la categoría principal, y esa
principal siempre pertenece al pivote.

## Reglas

- Un perfil tiene como máximo **3** categorías (`ProviderController::MAX_CATEGORIAS`).
- Solo se aceptan categorías existentes del catálogo administrado. No hay
  categorías libres.
- No se aceptan IDs repetidos (`distinct`) ni IDs inexistentes.
- La principal es explícita: si viene `categoria_id`, debe estar dentro de
  `categoria_ids`. Si no viene, se toma la primera de `categoria_ids`.
- La principal y el pivote se guardan en una sola transacción. En la edición
  también se bloquea la fila del perfil (`lockForUpdate`), así que dos
  ediciones simultáneas se aplican una después de la otra.

## POST /api/providers

Requiere Sanctum y rol `proveedor`. Además de los campos del perfil, acepta:

```json
{"categoria_id": 2, "categoria_ids": [1, 2, 3]}
```

| Caso | Resultado |
|---|---|
| `categoria_ids` con 1 a 3 IDs válidos | `201`. El pivote queda con ese conjunto. |
| `categoria_id` sin `categoria_ids` | `201`. El pivote queda solo con la principal. |
| Ninguno de los dos | `201`, sin categorías (comportamiento previo). |
| Más de 3 IDs, IDs duplicados o inexistentes | `422` en `categoria_ids` / `categoria_ids.N`. No se crea el perfil. |
| `categoria_id` fuera de `categoria_ids` | `422` en `categoria_id`. No se crea el perfil. |

## PUT /api/providers/{id}

Requiere Sanctum. Solo puede editar el dueño del perfil o un admin
(policy `manage`).

| Caso | Resultado |
|---|---|
| `categoria_ids` (con o sin `categoria_id`) | Reemplaza el conjunto y la principal con las mismas reglas del alta. |
| Solo `categoria_id`, dentro del conjunto actual | Cambia la principal sin tocar el pivote. |
| Solo `categoria_id`, fuera del conjunto actual | `422` en `categoria_id`. Para cambiar el conjunto hay que enviar `categoria_ids`. |
| `categoria_id: null` | `422`. La principal se puede cambiar, pero no quitar. |
| Error de validación o fallo al guardar | No se modifica ni la principal ni el pivote. |

## GET /api/providers

Es público. Acepta un filtro opcional `?categoria_id={id}` (entero; si no es
entero responde `422`), que devuelve a los proveedores que ofrecen esa
categoría, ya sea como principal o como secundaria.

Cada fila del catálogo trae ahora `categorias: [{id, nombre}]`, con la
principal primero y el resto ordenado por nombre. `categoria` y
`categoria_id` se mantienen por compatibilidad. El detalle y el perfil propio
usan el mismo orden.

La búsqueda de texto del Home (`src/utils/busquedaProveedores.js`) compara
contra todas las categorías del perfil.

## UI (HU 1.6.c)

- `src/components/CategoriaSelector.js`, usado en el registro y en la edición
  de perfil: muestra el contador `N/3`, bloquea una cuarta categoría y deja
  elegir la principal de forma explícita. La principal va primero en la lista
  y se envía como `categoria_id`.
- Un perfil histórico con más de 3 categorías ve un aviso y no puede guardar
  hasta dejar 3 (validación local con el mismo mensaje que el límite).
- Tarjeta del catálogo: la principal y `+N` con las demás. Detalle: todas, con
  la principal marcada. Panel del proveedor: lista con «(principal)».
- Reglas puras en `src/utils/categoriasProveedor.js` (`MAX_CATEGORIAS = 3`,
  igual que el backend).
- Evidencia: `evidencia/s10-categorias-*.png` (1440, 1024 y 390).

## Fuera de esta task

- **1.6.d (MR):** pruebas ampliadas (históricos y UI).
- No hay `CHECK` ni trigger en la BD que limite el pivote a 3. El límite se
  aplica en la aplicación, con el lock. Si se quiere en la BD, el cambio de
  esquema le corresponde a D.

Pruebas: `backend/tests/Feature/CategoriasMultiplesSprint10Test.php` (15),
`frontend/src/utils/busquedaProveedores.test.js` (6),
`frontend/src/utils/categoriasProveedor.test.js` (6),
`frontend/src/components/CategoriaSelector.test.js` (3) y dos casos nuevos en
`frontend/src/screens/ProviderEditProfileScreen.test.js`.
