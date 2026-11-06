# Eliminación de cuenta (HU 3.1.b): contrato implementado

Eliminar una cuenta significa **anonimizarla y revocarle el acceso**. Nunca
se hace `DELETE` de `users` ni de `proveedores`, porque sus FK con
`ON DELETE CASCADE` se llevarían servicios, compras, cotizaciones y reportes.

Servicio: `App\Services\AnonimizacionCuentaService`.
Controlador: `EliminacionCuentaController`.

## Políticas ratificadas (2026-11-05)

| Tema | Decisión |
|---|---|
| Qué bloquea la eliminación | Servicios activos (`pendiente`, `aceptado`, `en_camino`, `en_progreso`, `por_confirmar`) como cliente o como proveedor; reservas de material `pendiente` o `aceptada`, como comprador o como vendedor; compras de créditos o pagos Premium `pendiente`; Premium con renovación automática vigente en Stripe. |
| Qué se cierra solo | Los pedidos `abierto` del cliente pasan a `cerrado`, y las cotizaciones `enviada` de esos pedidos pasan a `rechazada` (las `retirada` no cambian). Las cotizaciones `enviada` del proveedor pasan a `retirada`. Los créditos gastados no se devuelven. |
| Administradores | No pueden eliminarse con este flujo: reciben `403` antes de validar. Así la plataforma nunca se queda sin administradores. |
| Tombstone del usuario | `name` = «Usuario eliminado»; `email` = `eliminado+{id}@servigt.invalid`; contraseña aleatoria; `telefono` y `foto_perfil` en `null`; `estado_cuenta` = `anonimizada` y `anonimizada_at` con la fecha. |
| Tombstone del proveedor | `nombre` = «Proveedor eliminado»; `email` = `eliminado+p{id}@servigt.invalid`; teléfono, descripción, experiencia, municipio, foto, portada y color en `null`. Se borra la disponibilidad. Las publicaciones quedan `inactiva` y sin imagen. Los documentos conservan su fila, pero `nombre_archivo` pasa a «documento-eliminado». |
| Qué se conserva | Servicios, compras, transacciones de crédito, calificaciones, mensajes, reportes de seguridad y aceptaciones legales. |
| Sesiones | Se revocan **todos** los tokens Sanctum, no solo el de la sesión actual. |
| Archivos | El manifiesto (3.1.c) se captura dentro de la transacción y antes de limpiar las rutas. Los archivos se borran **después** del commit; si el borrado falla, la solicitud queda en `limpieza_pendiente` y `cuentas:limpiar-archivos` la reintenta. |

## GET /api/cuenta/eliminacion/impacto

Requiere Sanctum, con rol `cliente` o `proveedor`; un admin recibe `403`. Es
una vista previa para la pantalla 3.2.a y no modifica nada.

```json
{
  "success": true,
  "message": "OK",
  "puede_eliminar": false,
  "bloqueos": [
    {"codigo": "servicios_activos", "mensaje": "Tienes servicios en curso. ...", "cantidad": 1}
  ],
  "se_cerrara": {"pedidos_abiertos": 1, "cotizaciones_enviadas": 0}
}
```

Los códigos de bloqueo posibles son `servicios_activos`, `reservas_material`,
`compras_pendientes` y `premium_recurrente`.

## POST /api/cuenta/eliminacion

Requiere Sanctum. Tiene un límite de 5 solicitudes por minuto por usuario
(`throttle:eliminacion-cuenta`).

```json
{"password": "<contraseña actual>", "confirmacion": "ELIMINAR", "idempotency_key": "<uuid por intento>"}
```

| Respuesta | Cuándo |
|---|---|
| `200` con `solicitud: {id, estado, anonimizada_at}` | La cuenta quedó anonimizada. `estado` es `completada`, o `limpieza_pendiente` si aún quedan archivos por borrar. Para el cliente, la cuenta ya está eliminada en ambos casos. |
| `409` con `bloqueos` (los actuales) y `motivo` | Hay operaciones activas. La cuenta queda intacta y la solicitud se registra como `rechazada`. |
| `422` en `password` | La contraseña es incorrecta (reautenticación). No se crea ninguna solicitud. |
| `422` en `confirmacion` / `idempotency_key` | Falta escribir exactamente `ELIMINAR` o falta una clave válida. |
| `403` | Usuario admin, con cualquier cuerpo. |
| `401` | Sin sesión, o un token ya revocado. |

**Idempotencia:**

- Repetir la misma clave devuelve la misma solicitud y no anonimiza dos veces.
- Si un intento falla a mitad de camino, la transacción completa se
  revierte: la cuenta, el perfil, las sesiones y los archivos quedan intactos
  y la solicitud sigue `pendiente`. Un reintento con otra clave retoma esa
  misma solicitud y la termina.
- Después de un `409`, hay que resolver los bloqueos y reintentar con una
  clave nueva.

**Indicaciones para el frontend (3.2.b):**

- Solo después de un `200` se limpian el token, el usuario y el chat locales.
- Ante `409`, `422` o un error de red, la sesión se conserva y se muestra el
  error real.
- Después de un `200`, el token ya no sirve: cualquier llamada posterior
  responde `401`.

## Efectos colaterales

- `POST /api/servicios` a un proveedor anonimizado responde `404`, igual que
  su detalle público. El catálogo, las publicaciones y los materiales ya lo
  excluían desde la 3.1.c.
- El login con las credenciales anteriores responde `401`: el correo y la
  contraseña cambiaron.

## Límites conocidos

- Las operaciones nuevas que creen otros usuarios no esperan al lock de la
  eliminación: un cliente podría crear un servicio contra el proveedor justo
  mientras se anonimiza. El servicio quedaría `pendiente` sin nadie que lo
  acepte. La ventana es de milisegundos y no hay pérdida de datos.
- No se envían notificaciones a los proveedores cuyas cotizaciones se
  rechazan porque el pedido se cerró.
- La cancelación de la suscripción de Stripe no se hace automáticamente:
  bloquea la eliminación hasta que el proveedor la cancela.

Pruebas: `backend/tests/Feature/AnonimizacionCuentaSprint10Test.php` (12):
roles, validación, reautenticación, cliente, proveedor, archivos, bloqueos,
retención, idempotencia y rollback con reintento.
