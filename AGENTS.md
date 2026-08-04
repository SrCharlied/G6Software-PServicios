# ServiGT — Guía para agentes de desarrollo

Este archivo define las reglas de trabajo para cualquier agente de IA que modifique este repositorio. Aplica desde la raíz a todo el proyecto, salvo que exista un `AGENTS.md` más específico en una subcarpeta.

## 1. Proyecto y arquitectura

ServiGT es un marketplace de servicios para Guatemala con tres roles:

- `cliente`
- `proveedor`
- `admin`

Stack principal:

- Backend: Laravel, Sanctum y PostgreSQL.
- Frontend: Expo, React Native Web y Expo Router.
- Infraestructura local: Docker Compose.
- Código ejecutable: `ServiGT/`.
- Backend: `ServiGT/backend/`.
- Frontend: `ServiGT/frontend/`.
- Esquema SQL: `ServiGT/database/init.sql`.
- Sincronización idempotente: `ServiGT/backend/docker/sync_schema.php`.
- Prototipo visual: `Servigt_d_design/`.

El prototipo define intención visual. No es el contrato del backend. Verifica rutas, payloads, estados y permisos contra el código real.

## 2. Antes de modificar código

1. Revisa la rama y el working tree con `git status`.
2. Preserva cambios humanos sin commit. No los sobrescribas ni reviertas.
3. Usa `origin/dev` como línea base de integración, pero no cambies de rama ni hagas reset automáticamente.
4. Ejecuta `git fetch origin dev` y compara la rama actual con `origin/dev`.
5. Verifica que la tarea no esté ya implementada en el código actual.
6. Lee los modelos, controladores, rutas, pantallas, servicios API y tests relacionados antes de editar.
7. Identifica archivos compartidos y dependencias antes de comenzar.
8. Limita el cambio al alcance solicitado. No hagas refactors oportunistas ajenos a la tarea.
9. Si falta una decisión de producto, detente y pregunta. No inventes reglas de negocio.
10. Si la tarea ya está resuelta, repórtalo antes de tomar trabajo no asignado.

## 3. Flujo Git

- `main` es la rama estable.
- `dev` es la rama de integración.
- Las feature branches parten de un `dev` actualizado.
- Los Pull Requests regresan a `dev`.
- No hagas push directo a `main`.
- No hagas force-push, `git reset --hard` ni limpieza destructiva sin aprobación humana explícita.
- No hagas commit, push, merge o PR salvo que la tarea lo solicite.
- Mantén commits enfocados en una sola tarea.
- Usa mensajes descriptivos en español y modo imperativo.

Ejemplos:

```text
Agrega compra simulada de créditos
Corrige navegación móvil de notificaciones
Divide panel proveedor en componentes
```

Antes de resolver un conflicto de merge, entiende ambas implementaciones. Nunca uses “Accept Both” a ciegas.

## 4. Vocabulario y dominio

### Servicio

Transacción uno-a-uno entre cliente y proveedor. Puede originarse por contratación directa o por adjudicación de una cotización.

`Servicio` no representa una publicación ofrecida por un proveedor. No lo reutilices como entidad de catálogo.

### Pedido

Publicación abierta de un cliente describiendo una necesidad para que proveedores envíen cotizaciones.

### Cotización

Oferta económica de un proveedor asociada a un pedido.

### Crédito

Moneda interna del proveedor utilizada para cotizaciones pagadas y otras funciones definidas por producto.

### Flow A — contratación directa

```text
Cliente busca proveedor
→ solicita servicio
→ proveedor acepta
→ código de inicio
→ trabajo en progreso
→ código de fin
→ cliente confirma
→ calificación
```

### Flow B — marketplace de demanda

```text
Cliente publica pedido
→ proveedores cotizan
→ cliente acepta una cotización
→ se crea un servicio
→ continúa el mismo flujo de ejecución de Flow A
```

## 5. Invariantes de cotizaciones y créditos

No cambies estas reglas sin aprobación explícita:

- Las primeras 3 cotizaciones de un pedido son gratuitas.
- Las cotizaciones 4, 5 y 6 cuestan 1 crédito cada una.
- Un pedido permite máximo 6 cotizaciones.
- Un proveedor puede cotizar una sola vez al mismo pedido.
- Una edición de cotización cuesta 1 crédito según la lógica actual.
- Los créditos gastados no se devuelven si el proveedor no gana.
- Premium no modifica los slots de cotización durante Sprint 6.
- Los cambios de saldo deben ser atómicos y seguros ante concurrencia.

Cuando se acepta una cotización:

1. Bloquea el pedido dentro de una transacción.
2. Verifica propietario, estado y expiración.
3. Verifica que la cotización pertenezca al pedido y esté `enviada`.
4. Crea un `Servicio` con cliente, proveedor, categoría, dirección, descripción, monto y código de inicio.
5. Marca la cotización ganadora como `aceptada`.
6. Marca únicamente las otras cotizaciones `enviada` como `rechazada`.
7. Conserva estados como `retirada`; no los conviertas en `rechazada`.
8. Marca el pedido como `adjudicado`.
9. Genera las notificaciones correspondientes.

Usa `DB::transaction()` y `lockForUpdate()` para adjudicación, balances, compras y renovaciones.

## 6. Monetización

### Paquetes de créditos ratificados

| Paquete | Precio | Base | Bonus | Total |
|---|---:|---:|---:|---:|
| Inicial | Q39 | 8 | 0 | 8 |
| Impulso | Q115 | 25 | 5 | 30 |
| Profesional | Q459 | 110 | 25 | 135 |
| Negocio | Q765 | 190 | 60 | 250 |

Reglas:

- GTQ es la moneda oficial almacenada y cobrada.
- La equivalencia USD es secundaria y aproximada.
- Sprint 6 utiliza compra simulada.
- No captures ni almacenes número de tarjeta, CVV o datos bancarios reales.
- Estados de compra: `pendiente`, `completada`, `fallida`, `cancelada`.
- Una compra completada acredita créditos inmediatamente.
- Toda compra necesita una referencia visible y un `idempotency_key` único.
- Repetir una petición no puede acreditar créditos dos veces.
- Los créditos comprados no expiran durante el MVP.

### Tipos de transacción

- `bono`: créditos otorgados por el sistema, incluido Premium.
- `gasto`: consumo de créditos.
- `recarga`: créditos agregados manualmente por admin.
- `compra`: créditos adquiridos por el proveedor.

No registres una compra como `recarga`; deben distinguirse en el historial.

### Premium ratificado

- Precio: Q115.
- Vigencia: 30 días.
- Créditos: 10 por activación o renovación.
- Tipo de transacción: `bono`.
- Motivo recomendado: `Bono mensual Premium`.
- Estados de UI: nunca activado, activo y vencido.
- `PremiumBadge` es distinto de `VerifiedBadge`.
- Premium ofrece badge, vigencia, visibilidad limitada y personalización.
- Premium no altera el límite de cotizaciones durante Sprint 6.
- Publicaciones múltiples de servicios quedan fuera hasta crear una entidad específica.
- Una activación o renovación debe ser idempotente por ciclo.

## 7. Base de datos

La fuente efectiva del esquema en Docker es:

- `ServiGT/database/init.sql`
- `ServiGT/backend/docker/sync_schema.php`

Cuando cambies el esquema:

1. Actualiza ambos archivos.
2. Mantén las operaciones idempotentes.
3. Verifica una base limpia.
4. Verifica una base con volumen existente.
5. Preserva datos y constraints existentes.
6. No resuelvas el cambio únicamente con una migración Laravel aislada.
7. Actualiza modelos, `$fillable`, casts, relaciones y tests relacionados.
8. Si modificas un `CHECK`, contempla instalaciones existentes y no solo el `CREATE TABLE` inicial.

El `CHECK` de `transacciones_credito.tipo` debe admitir:

```text
bono
gasto
recarga
compra
```

No uses la tabla `pagos` para compras de créditos: está asociada semánticamente a pagos de servicios.

## 8. Convenciones backend

- Usa `App\Traits\ApiResponse` para respuestas JSON.
- Los endpoints protegidos usan Sanctum.
- Valida rol, autenticación y ownership del recurso.
- No confíes en IDs enviados por frontend.
- Valida estado previo antes de cada transición.
- Usa transacciones para operaciones multi-tabla.
- Usa locks para saldo, compra, renovación y adjudicación.
- Usa restricciones únicas además de validaciones de aplicación cuando exista riesgo de duplicados.
- Devuelve errores claros con códigos HTTP apropiados.
- No ocultes excepciones relevantes ni inventes éxito parcial.
- Evita consultas N+1; carga relaciones o contadores cuando sea necesario.
- Cada endpoint nuevo debe tener tests de happy path y casos de permisos/estado.
- Documenta método, ruta, autenticación, request y response de cada endpoint nuevo.

## 9. Convenciones frontend

- Las rutas protegidas utilizan `InternalLayout`.
- Valida UI en 1440px, 1024px y 390px.
- No crees otro layout global sin aprobación.
- Reutiliza las primitivas visuales compartidas antes de crear variantes locales.
- Usa tokens de tema; evita agregar colores hex arbitrarios dentro de screens.
- El contenido desktop debe tener ancho legible y no estirarse indefinidamente.
- Proveedor y admin deben conservar navegación móvil bajo 900px.
- `PremiumBadge` y `VerifiedBadge` representan conceptos distintos.
- Muestra estados de loading, vacío y error.
- No uses fallbacks silenciosos como `.catch(() => setSaldo(0))`.
- Un error de API no debe presentarse como un valor de negocio válido.
- Conserva las rutas funcionales existentes salvo que la tarea exija cambiarlas.
- Cliente usa el texto `Mis servicios`; proveedor usa `Trabajos` aunque la ruta interna sea `/solicitudes`.
- La calificación permanece como pantalla `/calificar/{id}` durante Sprint 6.

El prototipo `Servigt_d_design/` es referencia visual. Datos mock, categorías genéricas y rutas del prototipo no reemplazan el contrato real.

## 10. Notificaciones

Tipos reales del backend:

- `nueva_solicitud`
- `solicitud_aceptada`
- `solicitud_rechazada`
- `servicio_iniciado`
- `servicio_por_confirmar`
- `servicio_completado`
- `servicio_calificable`
- `cotizacion_aceptada`
- `cotizacion_rechazada`

La navegación usa el tipo concreto y `item.datos`.

Las categorías genéricas del prototipo (`message`, `payment`, `request`, `review`, `system`) solo pueden utilizarse para iconos o color. No son tipos de API.

Al tocar una notificación:

1. Marca la notificación individual como leída.
2. Navega al destino correspondiente.
3. Si falta un ID, aplica fallback seguro sin romper la app.
4. No dupliques polling al mostrar campana desktop y móvil.

## 11. Comandos y verificación

Desde `ServiGT/`:

### Levantar stack

```bash
docker compose up --build
```

Servicios esperados:

- Backend: `http://localhost:8085`
- Health: `http://localhost:8085/api/health`
- Frontend: `http://localhost:8086`

### Backend — suite completa

```bash
docker compose --profile test run --rm backend_test
```

### Backend — archivo específico

```bash
docker compose --profile test run --rm backend_test tests/Feature/NombreTest.php
```

### Frontend — tests

Con el stack levantado:

```bash
docker exec servigt_frontend npx jest --ci
```

O localmente desde `ServiGT/frontend/`:

```bash
npm test -- --runInBand
```

### Frontend — build web

Desde `ServiGT/frontend/`:

```bash
npm run build:web
```

### Orden de verificación

1. Ejecuta primero el test más específico de la tarea.
2. Ejecuta luego la suite afectada.
3. Ejecuta build web si modificaste frontend.
4. Ejecuta smoke/manual cuando el cambio cruza frontend, backend y DB.
5. Registra el comando y el resultado real.

No afirmes que una prueba pasó si no la ejecutaste. Si el entorno bloquea una prueba, informa el bloqueo de forma explícita.

## 12. Casos mínimos de prueba

Para endpoints protegidos, considera:

- happy path autenticado;
- usuario no autenticado;
- rol incorrecto;
- recurso de otro usuario;
- ID inexistente;
- estado inválido;
- solicitud duplicada;
- rollback en error.

Para monetización, agrega:

- paquete inexistente o inactivo;
- compra duplicada;
- referencia única;
- acreditación única;
- saldo correcto;
- estado fallido/cancelado sin acreditación;
- Premium activo, vencido y nunca activado;
- renovación sin duplicar el bono.

Para UI, verifica:

- 1440px;
- 1024px;
- 390px;
- loading;
- vacío;
- error;
- navegación por rol.

## 13. Seguridad

- Nunca agregues `.env`, secretos, tokens, llaves privadas o credenciales reales al repositorio.
- No uses datos reales de tarjetas.
- No ejecutes limpieza destructiva de DB sin aprobación explícita.
- No borres ni resetees cambios de otro integrante.
- No modifiques producción ni servicios externos.
- Etiqueta datos smoke con un prefijo identificable.
- Limpia datos smoke de forma dirigida, nunca borrando toda la base.
- Evita registrar passwords, tokens Sanctum o payloads sensibles en logs.

Las credenciales presentes en Docker son solo para desarrollo local y no deben reutilizarse como credenciales de producción.

## 14. Control de alcance

- Implementa únicamente la task asignada.
- No agregues features porque aparezcan en el prototipo.
- No cambies reglas ratificadas sin aprobación.
- Dark mode queda fuera de Sprint 6.
- Recuperación de contraseña queda fuera de Sprint 6.
- Pagos reales quedan fuera de Sprint 6.
- Publicaciones múltiples quedan fuera de Sprint 6.
- Descuento Premium en paquetes queda fuera de Sprint 6.
- Mis cotizaciones y pantalla completa de notificaciones quedan fuera de Sprint 6.
- Trazabilidad `servicio → pedido/cotización` queda fuera de Sprint 6.
- Si descubres deuda fuera del alcance, repórtala como follow-up; no la implementes silenciosamente.

## 15. Archivos compartidos de alto riesgo

Coordina antes de modificar:

- `ServiGT/frontend/src/components/InternalLayout.js`
- `ServiGT/frontend/src/components/NotificationBell.js`
- `ServiGT/frontend/src/theme.js`
- componentes compartidos de UI;
- `ServiGT/backend/app/Http/Controllers/CotizacionController.php`
- `ServiGT/backend/docker/sync_schema.php`
- `ServiGT/database/init.sql`
- `ServiGT/docker-compose.yml`

No mezcles cambios no relacionados en estos archivos.

## 16. Definition of Done

Una tarea está terminada cuando:

- el código satisface los criterios solicitados;
- se ejecutaron pruebas relevantes;
- no hay regresiones conocidas;
- frontend y backend siguen compilando/arrancando cuando aplica;
- UI se validó en los breakpoints requeridos;
- endpoints nuevos están documentados;
- no se introdujeron secretos;
- el diff está limitado al alcance;
- se reportaron archivos y comandos ejecutados;
- se aclaró si los cambios quedaron locales, commiteados o enviados a una rama.

## 17. Reporte obligatorio al finalizar

Incluye siempre:

1. Resumen de lo implementado.
2. Archivos creados o modificados.
3. Decisiones técnicas relevantes.
4. Tests y comandos ejecutados.
5. Resultado real de cada prueba.
6. Verificación manual realizada.
7. Limitaciones o follow-ups.
8. Estado Git final.

No declares “completado” si no ejercitaste el código o si todavía existe un bloqueo conocido.

## 18. Compatibilidad con agentes

- Codex y otros agentes deben leer este `AGENTS.md` desde la raíz.
- Para Claude Code, crea un `CLAUDE.md` en la raíz con una sola línea:

```md
@AGENTS.md
```

- La carpeta `.agents/` puede almacenar explicaciones complementarias, pero las reglas críticas deben permanecer en este archivo porque `.agents/` no es detectada universalmente.
