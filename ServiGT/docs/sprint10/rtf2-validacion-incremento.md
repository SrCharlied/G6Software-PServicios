# Sprint 10 — trazabilidad RTF2 y validación del incremento

**Responsable:** Antony Saz (AS)

**Reviewer:** Juan Salguero (JA)

**HU:** 8.2 — Documentar RTF2 y validación del incremento con usuarios

**Última actualización técnica:** 2026-10-22

**Estado del documento:** borrador operativo; faltan revisión, integración y sesiones reales.

## Regla de evidencia

Una observación solo cambia a `Corregida` cuando existe implementación integrada,
prueba ejecutada en verde y evidencia enlazada. `Implementada localmente` no equivale
a `Corregida`. Las sesiones, comentarios, métricas, capturas, PR, SHA y resultados de
CI deben registrarse con sus valores reales; no se reconstruyen ni se inventan.

El repositorio no contiene el artefacto original de RTF2. Los títulos de la tabla son
una paráfrasis de las diez correcciones descritas en el plan operativo del Sprint 10.
Antes del cierre, el reviewer debe agregar el vínculo y el texto/identificador exacto
de cada observación del informe fuente.

## Matriz de las diez observaciones

| ID provisional | Observación resumida | Estado al 2026-10-22 | Resolución o Product Backlog | Prueba/evidencia técnica | Evidencia pendiente |
|---|---|---|---|---|---|
| RTF2-01 | Editar perfil queda bloqueado por reenviar personalización Premium sin cambios | Implementada localmente; no integrada | HU 1.1: omitir color intacto, permitir quitar portada/color y restringir solo agregar o reemplazar | `PremiumPersonalizacionTest.php`; `ProviderEditProfileScreen.test.js` | PR, SHA integrado, CI y captura 1440/1024/390 |
| RTF2-02 | Teléfono y descripción profesional se validan de forma inconsistente | Pendiente de trabajo/revisión del owner | HU 1.2 | Por enlazar | PR, tests de frontera y backfill limpio/existente |
| RTF2-03 | Registro no confirma contraseña y la validación de dominio rompe escenarios válidos | Pendiente de trabajo/revisión del owner | HU 1.3 | Por enlazar | PR, contrato API, tests y decisión DNS |
| RTF2-04 | La aceptación de solicitud directa ocurre sin confirmación | Implementada localmente; no integrada | HU 1.4: modal con cliente, categoría y descripción; cancelar no llama API; error conserva contexto | `ProviderDashboardScreen.test.js`; `ServicioCard.test.js` | PR, SHA integrado, CI y captura responsive |
| RTF2-05 | Cerrar sesión ocurre sin confirmación en superficies activas | Implementada localmente; no integrada | HU 1.4: confirmación en sidebar, menú móvil y `ProviderHeader` | `InternalLayout.test.js`; `ProviderHeader.test.js`; `ConfirmActionModal.test.js` | PR, SHA integrado, CI y captura responsive |
| RTF2-06 | Conteo/refresco de notificaciones puede ocultar no leídas o presentar un error como cero | Pendiente de trabajo/revisión del owner | HU 1.5 | Por enlazar | PR, prueba de más de 50, foco, error y rutas |
| RTF2-07 | Categorías múltiples no tienen una fuente de verdad completa en catálogo y búsqueda | Pendiente de trabajo/revisión del owner | HU 1.6 | Por enlazar | Backfill, PR, rollback, búsqueda y capturas |
| RTF2-08 | El perfil público no resume la experiencia profesional | Implementada localmente; no integrada | HU 1.7: campo opcional de 1,000 caracteres, ownership, API y sección pública separada | `ExperienciaProfesionalTest.php`; `ProviderEditProfileScreen.test.js`; `ProviderDetailScreen.test.js` | Esquema limpio/existente, PR, SHA, CI y capturas |
| RTF2-09 | Cotizaciones validan el cuerpo antes de autorizar al actor | Pendiente de verificación del owner/reviewer | HU 5.1.a o Product Backlog si no se integra | Por enlazar | Retest 403 tercero / 422 participante, PR y SHA |
| RTF2-10 | Reportes de seguridad validan el cuerpo antes de autorizar rol/participación | Pendiente de verificación del owner/reviewer | HU 5.1.b o Product Backlog si no se integra | Por enlazar | Retest de privacidad/estados, PR y SHA |

## Guion de demostración del incremento

Usar la misma versión y datos de prueba para todas las sesiones. Registrar el SHA
desplegado antes de comenzar.

1. Proveedor sin Premium edita nombre/descripción sin recibir un 403.
2. Proveedor con Premium vencido quita una portada o color histórico.
3. Proveedor intenta aceptar una solicitud directa, cancela y comprueba que sigue pendiente.
4. Proveedor confirma la aceptación y observa el nuevo estado; repetir toque no duplica la acción.
5. Usuario intenta cerrar sesión desde la superficie que corresponda y cancela antes de confirmar.
6. Proveedor edita el resumen de experiencia y un cliente lo consulta en el detalle público.
7. Demostrar las demás correcciones RTF2 solo cuando sus PR estén integrados y sus gates estén verdes.

## Registro de validación con usuarios

**Estado actual:** no ejecutada. No hay comentarios ni evidencia de participantes
registrados en el repositorio al 2026-10-22.

No guardar nombres, correos, rostros ni credenciales en este archivo. Usar códigos
anónimos y enlazar evidencia almacenada según el protocolo aprobado.

| Participante | Fecha/hora | SHA probado | Tareas completadas | Dificultades observadas | Comentario textual autorizado/paráfrasis | Evidencia | Consentimiento verificado por |
|---|---|---|---:|---|---|---|---|
| P01 | Pendiente | Pendiente | Pendiente | Pendiente | Pendiente | Pendiente | Pendiente |
| P02 | Pendiente | Pendiente | Pendiente | Pendiente | Pendiente | Pendiente | Pendiente |
| P03 | Pendiente | Pendiente | Pendiente | Pendiente | Pendiente | Pendiente | Pendiente |
| P04 | Pendiente | Pendiente | Pendiente | Pendiente | Pendiente | Pendiente | Pendiente |
| P05 | Pendiente | Pendiente | Pendiente | Pendiente | Pendiente | Pendiente | Pendiente |

## Resumen de hallazgos de la demo

Completar únicamente después de las sesiones:

- Participantes válidos: pendiente.
- Tasa de finalización por tarea: pendiente.
- Errores o abandonos observados: pendiente.
- Comentarios recurrentes: pendiente.
- Cambios aceptados para este sprint: pendiente.
- Hallazgos diferidos con vínculo al Product Backlog: pendiente.
- Ventajas y limitaciones frente a la línea base: pendiente.

## Evidencia técnica de cierre

| Gate | Comando/enlace | Resultado real | Fecha | Responsable |
|---|---|---|---|---|
| Backend HU 1.1 | `docker compose --profile test run --rm backend_test tests/Feature/PremiumPersonalizacionTest.php tests/Feature/ExperienciaProfesionalTest.php` | Bloqueado: Docker Desktop apagado; no existe `dockerDesktopLinuxEngine` | 2026-10-22 | AS |
| Backend HU 1.7 | mismo comando anterior | Bloqueado por el mismo entorno; sintaxis PHP validada sin errores | 2026-10-22 | AS |
| Frontend focal | `npm test -- --runInBand ProviderEditProfileScreen.test.js ProviderDashboardScreen.test.js ProviderDetailScreen.test.js InternalLayout.test.js ProviderHeader.test.js ConfirmActionModal.test.js ServicioCard.test.js` | 7 suites, 26 tests, todos en verde; warnings no bloqueantes de `act(...)` | 2026-10-22 | AS |
| Suite frontend | `npm test -- --runInBand` | 34/36 suites y 297/299 tests pasaron en conjunto; dos pruebas ajenas fallaron por carrera/timeout y pasaron aisladas (2 suites, 39 tests) | 2026-10-22 | AS/MR |
| Build web | `npm run build:web` | Exitoso; Expo exportó `dist` | 2026-10-22 | AS/MR |
| Esquema limpio | `docker compose up --build` sobre base limpia | Pendiente | — | D/AS |
| Volumen existente | reinicio con volumen y verificación de datos/constraint | Pendiente | — | D/AS |
| Responsive | capturas 1440, 1024 y 390 px | Pendiente | — | AS/PT |
| Pull Request | URL y reviewer distinto del owner | Pendiente | — | AS/JA |
| Integración | SHA integrado a `dev` | Pendiente | — | AS |
| CI | URL del workflow sobre el SHA integrado | Pendiente | — | AS/PT |

## Criterio de cierre de HU 8.2

- Las diez filas tienen identificador/vínculo exacto al RTF2 original.
- Cada fila está clasificada como `Corregida`, `Diferida` o `No reproducible`, con evidencia.
- Toda fila `Corregida` enlaza implementación integrada y prueba verde.
- Toda fila `Diferida` enlaza una entrada real del Product Backlog y no se presenta como resuelta.
- La demo usa un SHA identificado y recoge comentarios/evidencia de participantes reales.
- El reviewer JA verifica esta matriz antes de mover la tarjeta a `Done`.
