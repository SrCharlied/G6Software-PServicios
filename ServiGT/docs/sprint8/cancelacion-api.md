# Cancelacion de servicios

## `POST /api/servicios/{id}/cancelar`

Cancela un servicio antes de que el trabajo haya iniciado.

- Autenticacion: token Sanctum en `Authorization: Bearer <token>`.
- Autorizacion: solo el cliente propietario del servicio.
- Estados permitidos: `pendiente`, `aceptado`, `en_camino`.
- Body opcional: `{ "motivo": "Texto de hasta 500 caracteres" }`.
- Exito: `200`, con `message` y el `servicio` actualizado en estado `cancelado`.
- Errores: `401` sin sesion, `403` para otro usuario o rol, `404` si no existe y `422` si el estado no permite cancelar.

La operacion notifica al proveedor con el tipo `servicio_cancelado`. Un reintento
sobre el servicio ya cancelado devuelve `422` y no crea otra notificacion. La
cancelacion no modifica pedidos, cotizaciones ni saldos de creditos.
