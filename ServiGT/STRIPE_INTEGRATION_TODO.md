# Integración Stripe Checkout — pendientes y referencia

Fuente única de verdad para terminar la configuración. Producto: **paquetes de créditos** (catálogo externo, tabla `paquetes_creditos`; no se usa el catálogo de Stripe).

## Values to Replace

Los siguientes valores deben ajustarse antes de producción.

**Files containing placeholders / environment-specific values:**
- [backend/config/services.php](backend/config/services.php)
- [.env.example](.env.example)

| Field | Current Value | What to Set |
|-------|--------------|-------------|
| `mode` | `payment` (fijo en código) | Correcto para créditos (cobro único). No cambiar a `subscription` sin decisión de producto. |
| `line_items[].price` | **no se usa**: se envía `price_data` calculado desde `paquetes_creditos` | Nada. El monto sale de la BD; no hay Price IDs que reemplazar. |
| `STRIPE_SECRET_KEY` | vacío | `sk_test_...` (local) / `sk_live_...` (solo con `APP_ENV=production`). |
| `STRIPE_PUBLISHABLE_KEY` | vacío | `pk_test_...` / `pk_live_...`. |
| `STRIPE_WEBHOOK_SECRET` | vacío | `whsec_...` del endpoint (producción) o de `stripe listen` (local). |
| `STRIPE_RETURN_ORIGIN` | `http://localhost:8086` | Origen público del frontend en cada ambiente. |
| `STRIPE_CURRENCY` | `gtq` | Confirmar que tu cuenta Stripe admite GTQ. Si no, hay que decidir moneda (GTQ es la oficial de ServiGT). |
| `PAYMENTS_DRIVER` | `simulated` | `stripe` para activar el cobro real (desactiva la compra simulada). |

> **Tu `ServiGT/.env` actual usa los nombres `secret_key` y `publishable_key`.** Docker Compose y Laravel esperan `STRIPE_SECRET_KEY` y `STRIPE_PUBLISHABLE_KEY`; con los nombres actuales el backend no ve las claves. Renómbralas y añade `PAYMENTS_DRIVER=stripe` y `STRIPE_WEBHOOK_SECRET`.

## Configured Parameters

Parámetros de Checkout Studio ya fijados.

**Files containing these parameters:**
- [backend/app/Http/Controllers/PagoStripeController.php](backend/app/Http/Controllers/PagoStripeController.php) (`obtenerOCrearSesion`)
- [backend/config/services.php](backend/config/services.php) (versión de API)
- [frontend/src/components/StripeCheckoutForm.web.js](frontend/src/components/StripeCheckoutForm.web.js) (apariencia y SDK)

| Parameter | Value |
|-----------|-------|
| ui_mode | `form` |
| mode | `payment` |
| billing_address_collection | `auto` |
| phone_number_collection.enabled | `false` |
| automatic_tax.enabled | `false` |
| submit_type | `auto` |
| integration_identifier | `custom_embedded_web_0001` |
| payment_method_collection | no se envía (solo aplica a `subscription`) |
| Stripe-Version | `2026-09-30.endive` (`STRIPE_API_VERSION`) |
| Stripe.js | `https://js.stripe.com/dahlia/stripe.js`, inicializado con `initCheckoutFormSdk` |

Parámetros añadidos por ServiGT (no vienen de Checkout Studio): `client_reference_id`, `metadata[compra_id|proveedor_id|referencia]` y `return_url` (`{STRIPE_RETURN_ORIGIN}/pago-exitoso?compra_id=..&session_id={CHECKOUT_SESSION_ID}`). **`return_url` no pude verificarlo contra la documentación de `ui_mode: form`**; si Stripe lo rechaza, quitarlo o sustituirlo por el parámetro que indique la referencia de la API.

## Setup y siguientes pasos

### Variables de entorno (`ServiGT/.env`, no versionado)

```
PAYMENTS_DRIVER=stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_RETURN_ORIGIN=http://localhost:8086
```

Sin dependencias nuevas: el backend habla con la API REST de Stripe mediante el cliente HTTP de Laravel y Stripe.js se carga desde `js.stripe.com` (requisito PCI, nunca empaquetado).

### Webhook local

```bash
stripe listen --forward-to localhost:8085/api/stripe/webhook
```

Copia el `whsec_...` que imprime a `STRIPE_WEBHOOK_SECRET` y reinicia el backend. En el Dashboard (producción) suscribe el endpoint a:
`checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.async_payment_failed`, `checkout.session.expired`.
Para Premium suscríbelo además a: `invoice.paid`, `invoice.payment_failed`, `customer.subscription.updated`, `customer.subscription.deleted`.

Aunque el webhook no llegue, `GET /api/creditos/compras/{id}` concilia con Stripe, así que el saldo se acredita igualmente al volver del pago.

### Archivos nuevos

```
backend/app/Http/Controllers/PagoStripeController.php
backend/app/Services/StripeClient.php
backend/app/Services/StripeCompraService.php
backend/app/Services/StripeWebhookVerifier.php
backend/app/Services/StripeException.php
backend/tests/Feature/PagoStripeTest.php
frontend/src/components/StripeCheckoutForm.js        (stub nativo)
frontend/src/components/StripeCheckoutForm.web.js    (formulario embebido)
```
Modificados: `database/init.sql` (columnas `metodo_pago`, `stripe_session_id`, `fallo_motivo`; tabla `stripe_eventos`), `docker-compose.yml`, `.env.example`, `routes/api.php`, `config/services.php`, `CreditoController`, `CompraCredito`, `AppServiceProvider`, `CreditosScreen`, `api.js`, ruta `creditos.js`.

### Cómo funciona

1. El proveedor elige un paquete → `POST /api/creditos/pagos/sesion`. El backend crea una compra `pendiente` (clave de idempotencia única por proveedor) y una Checkout Session con el precio **de la BD**.
2. El frontend monta el formulario embebido con el `client_secret`. Ningún dato de tarjeta toca ServiGT.
3. Al confirmar, Stripe redirige a `/pago-exitoso?compra_id=…`. Esa pantalla consulta la compra (el backend la concilia con Stripe) y solo muestra "Pago realizado con éxito" si figura `completada`; si no, muestra pendiente, no completado o error.
4. El webhook firmado (o la conciliación) completa la compra **una sola vez**: bloquea compra, proveedor y saldo en una transacción, verifica monto y moneda, acredita y registra una transacción `compra`.

### Seguridad e idempotencia

- Firma `Stripe-Signature` (HMAC-SHA256, comparación en tiempo constante, tolerancia 300 s); cuerpo crudo.
- `stripe_eventos.event_id` (PK) descarta reenvíos; si el procesamiento falla se revierte todo y Stripe reintenta.
- `Idempotency-Key: servigt-compra-{id}` en la creación de la sesión; `UNIQUE(proveedor_id, idempotency_key)` y `UNIQUE(stripe_session_id)` en BD.
- Nunca se acredita si monto o moneda no coinciden con el paquete; `cancelada` es terminal.
- El monto jamás viene del request. Una `sk_live_` se rechaza fuera de `APP_ENV=production`.
- Con `PAYMENTS_DRIVER=stripe`, `POST /api/creditos/comprar` (simulada) responde 403.
- Los logs no incluyen payloads ni claves.

### Endpoints

| Método | Ruta | Auth | Request | Response |
|---|---|---|---|---|
| POST | `/api/creditos/pagos/sesion` | Sanctum, proveedor, `throttle:purchase` | `{paquete_id, idempotency_key}` | 201/200 `{compra, client_secret, publishable_key}`; 409 si la clave se usó con otro paquete o la compra está cancelada/expirada; 503 si Stripe no está habilitado; 502 si Stripe falla |
| GET | `/api/creditos/compras/{id}` | Sanctum, proveedor (compra propia, 404 si ajena) | — | `{compra, saldo}` |
| POST | `/api/stripe/webhook` | Firma Stripe (sin Sanctum), `throttle:stripe-webhook` | evento Stripe | 200; 400 firma inválida; 503 sin secreto; 500 error (Stripe reintenta) |
| GET | `/api/creditos/paquetes` | Sanctum | — | añade `pasarela: "simulated" \| "stripe"` |

### Tarjetas de prueba (modo test)

- Éxito: `4242 4242 4242 4242`
- Rechazada: `4000 0000 0000 0002`
- Requiere 3DS: `4000 0025 0000 3155`
- Cualquier fecha futura, CVC de 3 dígitos y código postal cualquiera.

### Siguientes pasos

- Rotar la clave `sk_test_...` que se pegó en el chat y usar solo variables de entorno.
- Probar el flujo completo con `stripe listen` y las tarjetas de prueba.
- Confirmar moneda GTQ en la cuenta Stripe y el `return_url` de `ui_mode: form`.
- Pagos nativos móvil quedan como follow-up (hoy móvil muestra un aviso).
- Reembolsos/disputas: no hay política definida (los créditos gastados no se devuelven); requiere decisión de producto.

## Premium (Q115): pago único o suscripción mensual

- **Pago único:** `mode: payment`, 30 días. **Suscripción:** `mode: subscription` con `price_data.recurring.interval = month` (en suscripción se envía `payment_method_collection: always` y no `submit_type`).
- Cada ciclo pagado extiende 30 días (suma al vencimiento si sigue vigente) y acredita 10 créditos como `bono` **una sola vez**: la clave del ciclo es el id de pago o de factura de Stripe, dentro del motivo del bono.
- **Cancelar** (`POST /api/premium/suscripcion/cancelar`) hace `cancel_at_period_end=true` en Stripe: Premium sigue activo hasta `premium_vence_at` y no se vuelve a cobrar. Es idempotente; si Stripe falla no se marca como cancelada.
- **No existe activación gratuita** con `PAYMENTS_DRIVER=stripe`: `POST /api/premium/activar` responde 403. Con `simulated` se conserva (y sus tests).
- Si Premium está activo no se puede pagar de nuevo (409); se renueva al vencer, o solo si es suscripción.
- Esquema: `proveedores.premium_recurrente|premium_cancela_al_final|stripe_customer_id|stripe_subscription_id` y tabla `pagos_premium`.

| Método | Ruta | Auth | Request | Response |
|---|---|---|---|---|
| POST | `/api/premium/pagos/sesion` | Sanctum, proveedor, `throttle:purchase` | `{recurrente: bool, idempotency_key}` | 201/200 `{pago, client_secret, publishable_key}`; 409 si ya está activo, clave usada con otra modalidad o pago cancelado; 503/502 como en créditos |
| GET | `/api/premium/pagos/{id}` | Sanctum, proveedor (propio, 404 si ajeno) | — | `{pago, premium}` (concilia con Stripe si está pendiente) |
| POST | `/api/premium/suscripcion/cancelar` | Sanctum, proveedor, `throttle:premium` | — | 200 estado Premium con `cancela_al_final: true`; 409 sin suscripción; 502 si Stripe falla |
| GET | `/api/premium/mi-estado` | Sanctum | — | añade `recurrente`, `cancela_al_final`, `proximo_cobro_at` |

**Sin verificar contra Stripe real:** las renovaciones (`invoice.paid`) y la cancelación se probaron con eventos simulados; el payload de `invoice.paid` cambió de forma entre versiones de la API y el código acepta las dos (`subscription` y `parent.subscription_details.subscription`). Conviene validar una suscripción completa con `stripe trigger` o una prueba real (los ciclos de prueba se pueden adelantar con Test Clocks).

Recursos: https://support.stripe.com · https://docs.stripe.com/mcp
