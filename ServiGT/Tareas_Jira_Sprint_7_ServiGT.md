# Tareas Jira-ready — Sprint 7 ServiGT

**Sprint:** Sprint 7 · 26/08/2026–09/09/2026  
**Base:** `origin/dev` en `35770f8`  
**Carga total:** 27 tasks · 47 SP · 141 h  
**Destino de PR:** `dev`

> Cada bloque corresponde a una Task de Jira. Usa el título como **Summary**, copia el resto en **Description**, coloca los Story Points y `Original Estimate`, y vincula la task con el Epic indicado. Los reviewers son responsables técnicos; no necesariamente deben agregarse como assignee.

## Resumen de Epics

| Epic | Nombre | Tasks | SP | Horas |
|---|---|---:|---:|---:|
| EPIC 1 | Baseline OWASP y cadena de suministro reproducible | 5 | 8 | 24 h |
| EPIC 2 | Control de acceso, documentos privados, serialización y Premium | 6 | 11 | 33 h |
| EPIC 3 | Autenticación, rate limiting y sesión segura | 4 | 8 | 24 h |
| EPIC 4 | Configuración segura, headers y excepciones | 3 | 6 | 18 h |
| EPIC 5 | Publicaciones de servicios ofrecidos | 6 | 10 | 30 h |
| EPIC 6 | UI, regresión OWASP y cierre | 3 | 4 | 12 h |
| **Total** |  | **27** | **47** | **141 h** |

---

# EPIC 1 — Baseline OWASP y cadena de suministro reproducible

## 1.1 — Levantar matriz OWASP Top 10 de ServiGT

- **Issue type:** Task
- **SP / Original Estimate:** 1 SP / 3 h
- **Assignee:** MR
- **Reviewer:** JA
- **Fecha probable:** 26/08/2026
- **Prioridad:** Highest
- **Labels:** `SEC`, `DOC`, `OWASP`, `SPRINT-7`
- **Depende de:** ninguna

### Descripción
Crear la matriz inicial OWASP sobre `origin/dev@35770f8`, vinculando activo, amenaza, evidencia de código, severidad, control propuesto, task responsable y riesgo residual.

### Criterios de aceptación
- [ ] Cubre OWASP Top 10:2025 y el mapeo API Security 2023 aplicable.
- [ ] Cada hallazgo cita evidencia real y una task o follow-up.
- [ ] Distingue vulnerabilidad confirmada, decisión de producto y riesgo residual.
- [ ] Se guarda en la ubicación documental ratificada y bajo Git.

### Evidencia
Matriz Markdown inicial y enlace al commit probado.

## 1.2 — Versionar lockfile y corregir dependencias frontend compatibles

- **Issue type:** Task
- **SP / Original Estimate:** 2 SP / 6 h
- **Assignee:** MR
- **Reviewer:** PT
- **Fecha probable:** 26–27/08/2026
- **Prioridad:** Highest
- **Labels:** `FE`, `SEC`, `SUPPLY-CHAIN`, `SPRINT-7`
- **Depende de:** ninguna

### Descripción
Crear `package-lock.json`, migrar Docker/CI a `npm ci` y clasificar advisories frontend sin usar `npm audit fix --force`.

### Criterios de aceptación
- [ ] `npm ci` instala desde el lockfile en una copia limpia.
- [ ] Docker y CI dejan de usar `npm install`.
- [ ] Vulnerabilidades altas/críticas se corrigen de forma compatible o quedan justificadas.
- [ ] Jest y build web permanecen verdes.

### Evidencia
Salida de `npm ci`, `npm audit`, Jest y `npm run build:web`.

## 1.3 — Crear CI backend reproducible con PostgreSQL

- **Issue type:** Task
- **SP / Original Estimate:** 1 SP / 3 h
- **Assignee:** CL
- **Reviewer:** D
- **Fecha probable:** 27–28/08/2026
- **Prioridad:** Highest
- **Labels:** `BE`, `DEVOPS`, `CI`, `SEC`, `SPRINT-7`
- **Depende de:** 1.4

### Descripción
Crear el job backend de GitHub Actions con PostgreSQL provisionado, `init.sql`, Composer audit y la ejecución canónica de PHPUnit.

### Criterios de aceptación
- [ ] El job reproduce `docker compose --profile test run --rm backend_test` o un entorno equivalente con `db_test`.
- [ ] No ejecuta `php artisan test` sin base provisionada.
- [ ] Bloquea PR hacia `dev` cuando PHPUnit o Composer audit fallan según la política acordada.
- [ ] La evidencia cita comando, imagen, fecha, tests y assertions.

### Evidencia
Run de Actions y salida completa de PHPUnit.

## 1.4 — Fijar backend Laravel/Sanctum con Composer

- **Issue type:** Task
- **SP / Original Estimate:** 3 SP / 9 h
- **Assignee:** D
- **Reviewer:** JA
- **Fecha probable:** 26–28/08/2026
- **Prioridad:** Highest
- **Labels:** `BE`, `DEVOPS`, `SUPPLY-CHAIN`, `SPRINT-7`
- **Depende de:** ninguna

### Descripción
Versionar `composer.json` y `composer.lock`, fijar Laravel/Sanctum y reemplazar `composer create-project latest` por un build determinista.

### Criterios de aceptación
- [ ] Dos builds limpios resuelven las mismas versiones.
- [ ] El Dockerfile instala desde manifest/lockfile versionados.
- [ ] Los archivos personalizados y configuración siguen entrando a la imagen.
- [ ] Suite backend canónica permanece verde.

### Evidencia
Versiones instaladas, hashes del lockfile y logs de dos builds.

## 1.5 — Crear CI frontend, audits y normalización de Git

- **Issue type:** Task
- **SP / Original Estimate:** 1 SP / 3 h
- **Assignee:** MR
- **Reviewer:** PT
- **Fecha probable:** 27–28/08/2026
- **Prioridad:** High
- **Labels:** `FE`, `DEVOPS`, `CI`, `SEC`, `SPRINT-7`
- **Depende de:** 1.2

### Descripción
Crear el job frontend con `npm ci`, Jest, build web, audit, detección básica de secretos, `git diff --check` y `.gitattributes`.

### Criterios de aceptación
- [ ] CI ejecuta Jest y build web en PR hacia `dev`.
- [ ] `.gitattributes` incluye `* text=auto` y no introduce un diff masivo.
- [ ] Se ejecuta detección básica de secretos sin publicar valores sensibles.
- [ ] `git diff --check` queda limpio.

### Evidencia
Run de Actions, salida Jest/build y diff de `.gitattributes`.

---

# EPIC 2 — Control de acceso, documentos privados, serialización y Premium

## 2.1 — Derivar identidad y centralizar autorización de proveedor

- **Issue type:** Task
- **SP / Original Estimate:** 2 SP / 6 h
- **Assignee:** JA
- **Reviewer:** CL
- **Fecha probable:** 31/08/2026
- **Prioridad:** Highest
- **Labels:** `BE`, `SEC`, `A01`, `BOLA`, `SPRINT-7`
- **Depende de:** ninguna

### Descripción
Eliminar confianza en `user_id` del frontend y aplicar autorización deny-by-default para perfil propio y rutas administrativas.

### Criterios de aceptación
- [ ] `POST /providers` deriva usuario y rol desde Sanctum.
- [ ] Solo proveedor crea su perfil y no puede duplicarlo.
- [ ] Recursos ajenos responden 403; inexistentes, 404.
- [ ] Admin usa middleware y ruta explícita.

### Evidencia
Tests de usuario propio, ajeno, rol incorrecto y payload manipulado.

## 2.2 — Corregir BOLA y almacenar documentos en privado

- **Issue type:** Task
- **SP / Original Estimate:** 3 SP / 9 h
- **Assignee:** JA
- **Reviewer:** D
- **Fecha probable:** 31/08–02/09/2026
- **Prioridad:** Highest
- **Labels:** `BE`, `FE`, `SEC`, `FILES`, `BOLA`, `SPRINT-7`
- **Depende de:** 2.1

### Descripción
Validar ownership, mover documentos de identidad a disco privado, crear descarga autorizada, migrar existentes y persistirlos en Docker.

### Criterios de aceptación
- [ ] Propietario y admin autorizado pueden consultar/descargar; tercero recibe 403.
- [ ] Ruta privada y nombre físico nunca salen en respuestas públicas.
- [ ] MIME, extensión, tamaño y fallos de storage se validan en backend.
- [ ] El volumen cubre `storage/app` o un volumen privado y sobrevive rebuild.
- [ ] Existe estrategia de migración sin exposición temporal.

### Evidencia
Tests BOLA/upload, `curl` de descarga y rebuild con archivo persistente.

## 2.3 — Corregir autocontratación y mensajería; crear matriz de autorización

- **Issue type:** Task
- **SP / Original Estimate:** 2 SP / 6 h
- **Assignee:** CL
- **Reviewer:** JA
- **Fecha probable:** 01–02/09/2026
- **Prioridad:** Highest
- **Labels:** `BE`, `QA`, `SEC`, `A01`, `API6`, `SPRINT-7`
- **Depende de:** 2.1, 2.5, 2.6

### Descripción
Cerrar autocontratación/autocalificación y exigir un Servicio común para mensajería; agregar matriz negativa de autorización para flujos críticos.

### Criterios de aceptación
- [ ] Solo rol cliente crea servicios y no puede contratar su propio perfil proveedor.
- [ ] El mismo usuario no puede completar ambos lados ni calificarse.
- [ ] `POST /mensajes` exige Servicio común; una cotización no adjudicada no habilita chat.
- [ ] Matriz cubre no autenticado, rol incorrecto, ownership ajeno, ID inexistente y estado inválido.

### Evidencia
Tests end-to-end de autocontratación, auto-rating y mensajería.

## 2.4 — Restringir personalización a Premium activo

- **Issue type:** Task
- **SP / Original Estimate:** 1 SP / 3 h
- **Assignee:** D
- **Reviewer:** AS
- **Fecha probable:** 01/09/2026
- **Prioridad:** High
- **Labels:** `BE`, `FE`, `SEC`, `PREMIUM`, `SPRINT-7`
- **Depende de:** ninguna

### Descripción
Aplicar autorización Premium a portada/color y cubrir estados nunca, activo y vencido reutilizando `premiumEstado()`.

### Criterios de aceptación
- [ ] Nunca activado y vencido reciben 403 al modificar.
- [ ] Premium activo puede modificar portada/color.
- [ ] Vencimiento no borra archivos y la UI usa fallback seguro.
- [ ] PremiumBadge y verificación siguen siendo conceptos distintos.

### Evidencia
Tests de los tres estados y validación visual básica.

## 2.5 — Crear ProveedorResource y contrato /providers/me

- **Issue type:** Task
- **SP / Original Estimate:** 1 SP / 3 h
- **Assignee:** CL
- **Reviewer:** PT
- **Fecha probable:** 01/09/2026
- **Prioridad:** Highest
- **Labels:** `BE`, `SEC`, `API3`, `RESOURCE`, `SPRINT-7`
- **Depende de:** 2.1

### Descripción
Crear contratos allowlist para catálogo, detalle público y perfil propio, y migrar restauración de sesión a `/providers/me`.

### Criterios de aceptación
- [ ] Público no recibe email, user_id, documentos ni campos Premium internos.
- [ ] Teléfono conserva el contrato actual; badge usa un indicador Premium derivado mínimo.
- [ ] `/providers/me` deriva identidad desde sesión.
- [ ] Lookup legado por `userId` ajeno responde 403/404.
- [ ] Frontend conserva catálogo, búsqueda, detalle y restauración.

### Evidencia
Tests de serialización y suites frontend/backend.

## 2.6 — Crear ServicioResource actor-aware para Flow A

- **Issue type:** Task
- **SP / Original Estimate:** 2 SP / 6 h
- **Assignee:** AS
- **Reviewer:** JA
- **Fecha probable:** 01–02/09/2026
- **Prioridad:** Highest
- **Labels:** `BE`, `SEC`, `API3`, `FLOW-A`, `SPRINT-7`
- **Depende de:** 2.1

### Descripción
Aplicar Resource actor-aware a detalle/listados de servicios y restringir los códigos según actor, estado y transición.

### Criterios de aceptación
- [ ] Proveedor nunca recibe `codigo_inicio` por API.
- [ ] Cliente recibe el código de inicio autorizado; tercero no recibe códigos.
- [ ] `codigo_fin` solo aparece en el handoff legítimo del proveedor.
- [ ] La prueba de abuso falla antes y pasa después.
- [ ] Flow A completo permanece verde.

### Evidencia
Tests de cliente, proveedor, tercero y regresión Flow A.

---

# EPIC 3 — Autenticación, rate limiting y sesión segura

## 3.1 — Fortalecer registro y login

- **Issue type:** Task
- **SP / Original Estimate:** 2 SP / 6 h
- **Assignee:** JA
- **Reviewer:** CL
- **Fecha probable:** 31/08–01/09/2026
- **Prioridad:** Highest
- **Labels:** `BE`, `SEC`, `AUTH`, `A07`, `SPRINT-7`
- **Depende de:** ninguna

### Descripción
Fortalecer Password rules, normalizar email y usar respuestas no enumerables en login/registro.

### Criterios de aceptación
- [ ] Contraseña débil se rechaza y contraseñas largas válidas funcionan.
- [ ] Email se normaliza antes de buscar/guardar.
- [ ] Login no revela si el correo existe.
- [ ] Tests cubren credenciales débiles, válidas y duplicadas.

### Evidencia
`AuthSecurityTest` y respuestas API.

## 3.2 — Aplicar rate limiting diferenciado

- **Issue type:** Task
- **SP / Original Estimate:** 2 SP / 6 h
- **Assignee:** AS
- **Reviewer:** JA
- **Fecha probable:** 01–02/09/2026
- **Prioridad:** Highest
- **Labels:** `BE`, `SEC`, `RATE-LIMIT`, `API4`, `SPRINT-7`
- **Depende de:** 3.1

### Descripción
Aplicar límites apropiados a login, registro, mensajes, uploads, compra y Premium con claves por IP/usuario.

### Criterios de aceptación
- [ ] Exceso responde 429 con mensaje y ventana clara.
- [ ] El usuario se recupera al vencer la ventana.
- [ ] Operaciones autenticadas usan clave por usuario cuando aplica.
- [ ] Happy paths normales no quedan bloqueados.

### Evidencia
Tests 429 y recuperación de ventana.

## 3.3 — Centralizar 401/403/429 y revalidar sesión

- **Issue type:** Task
- **SP / Original Estimate:** 2 SP / 6 h
- **Assignee:** PT
- **Reviewer:** D
- **Fecha probable:** 02–03/09/2026
- **Prioridad:** Highest
- **Labels:** `FE`, `SEC`, `SESSION`, `SPRINT-7`
- **Depende de:** contrato de error de 4.3

### Descripción
Crear error común que preserve status, interceptor de respuesta, revalidación `/me` y limpieza/redirección sin loops.

### Criterios de aceptación
- [ ] Todas las funciones exportadas preservan status HTTP.
- [ ] 401 limpia sesión una vez; 403 conserva sesión; 429 muestra espera.
- [ ] `restore()` consulta `/me` y no confía en rol local.
- [ ] No quedan fallbacks silenciosos que conviertan errores en datos válidos.

### Evidencia
Tests de `api.js` y `SessionContext`.

## 3.4 — Crear storage seguro por plataforma y limpiar cachés

- **Issue type:** Task
- **SP / Original Estimate:** 2 SP / 6 h
- **Assignee:** PT
- **Reviewer:** AS
- **Fecha probable:** 03–04/09/2026
- **Prioridad:** High
- **Labels:** `FE`, `SEC`, `STORAGE`, `SPRINT-7`
- **Depende de:** 3.3

### Descripción
Crear adapter por plataforma, migrar token legado y eliminar conversaciones/cachés privados al cerrar sesión.

### Criterios de aceptación
- [ ] Native no depende de localStorage.
- [ ] Web documenta el riesgo residual si conserva bearer accesible a JavaScript.
- [ ] Logout local funciona aunque falle la red.
- [ ] Token, perfil, parámetros y chat cache se eliminan.

### Evidencia
Tests del adapter, migración y logout.

---

# EPIC 4 — Configuración segura, headers y excepciones

## 4.1 — Extraer secretos y asegurar configuración por ambiente

- **Issue type:** Task
- **SP / Original Estimate:** 2 SP / 6 h
- **Assignee:** D
- **Reviewer:** CL
- **Fecha probable:** 02–03/09/2026
- **Prioridad:** Highest
- **Labels:** `DEVOPS`, `BE`, `SEC`, `A02`, `SPRINT-7`
- **Depende de:** 1.4

### Descripción
Retirar secretos fijos, admin predecible y passwords en logs; desactivar debug, restringir CORS y verificar configuración runtime.

### Criterios de aceptación
- [ ] Compose no contiene APP_KEY/passwords reutilizables.
- [ ] ADMIN_PASSWORD es obligatoria y nunca se imprime.
- [ ] Datos demo quedan separados por ambiente.
- [ ] CORS y debug se leen desde `config()` tras `config:clear`.
- [ ] Base limpia no crea admin con credencial default.

### Evidencia
Arranque con volumen limpio, `config()` y revisión de logs.

## 4.2 — Servir export web con Nginx y headers seguros

- **Issue type:** Task
- **SP / Original Estimate:** 2 SP / 6 h
- **Assignee:** PT
- **Reviewer:** D
- **Fecha probable:** 03–04/09/2026
- **Prioridad:** High
- **Labels:** `FE`, `DEVOPS`, `SEC`, `NGINX`, `SPRINT-7`
- **Depende de:** 1.2

### Descripción
Agregar target `frontend_prod` con `expo export`, Nginx, API relativa y headers CSP/frame/nosniff/referrer/permissions compatibles.

### Criterios de aceptación
- [ ] El target productivo no reemplaza hot reload de desarrollo.
- [ ] Nginx sirve export estático y proxy `/api` a backend.
- [ ] CSP y headers no rompen navegación ni bundle.
- [ ] CORS se valida con Origin y navegador cross-origin, no con cliente nativo.

### Evidencia
Headers, build/export y smoke web en 1440/1024/390.

## 4.3 — Endurecer excepciones y health con correlation ID

- **Issue type:** Task
- **SP / Original Estimate:** 2 SP / 6 h
- **Assignee:** AS
- **Reviewer:** CL
- **Fecha probable:** 02–04/09/2026
- **Prioridad:** Highest
- **Labels:** `BE`, `SEC`, `ERRORS`, `LOGGING`, `SPRINT-7`
- **Depende de:** ninguna

### Descripción
Responder errores y health con información mínima, correlation ID y logs estructurados sin payloads sensibles.

### Criterios de aceptación
- [ ] Error 500 no expone SQL, stack, host, rutas ni credenciales.
- [ ] Respuesta y log comparten correlation ID.
- [ ] Logs excluyen password, token y documentos.
- [ ] Health no concatena mensajes de excepciones y tiene prueba negativa.
- [ ] Contrato de errores queda acordado con 3.3.

### Evidencia
Tests de excepciones/health y muestra de logs sanitizados.

---

# EPIC 5 — Publicaciones de servicios ofrecidos

## 5.1 — Crear esquema y modelos de publicaciones

- **Issue type:** Task
- **SP / Original Estimate:** 2 SP / 6 h
- **Assignee:** D
- **Reviewer:** JA
- **Fecha probable:** 02–03/09/2026
- **Prioridad:** Highest
- **Labels:** `DB`, `BE`, `PUBLICACIONES`, `SPRINT-7`
- **Depende de:** 1.4

### Descripción
Crear `publicaciones_servicio`, modelo `PublicacionServicio` y referencia nullable `servicios.publicacion_id` con snapshot histórico.

### Criterios de aceptación
- [ ] Actualiza `init.sql` y `sync_schema.php` de forma idempotente.
- [ ] Base limpia y volumen existente convergen sin pérdida.
- [ ] FK usa `ON DELETE SET NULL`.
- [ ] Modelos, fillable/casts/relaciones quedan actualizados.
- [ ] No se crea una migración aislada como tercera fuente divergente.

### Evidencia
Aplicación en base limpia y existente, más inspección de constraints.

## 5.2 — Implementar API segura de publicaciones

- **Issue type:** Task
- **SP / Original Estimate:** 2 SP / 6 h
- **Assignee:** AS
- **Reviewer:** CL
- **Fecha probable:** 03–04/09/2026
- **Prioridad:** Highest
- **Labels:** `BE`, `SEC`, `PUBLICACIONES`, `API`, `SPRINT-7`
- **Depende de:** 5.1

### Descripción
Crear catálogo público y CRUD propio para listar, crear, editar, activar, desactivar y eliminar publicaciones.

### Criterios de aceptación
- [ ] Solo proveedor propietario administra sus publicaciones.
- [ ] Anónimo, cliente y proveedor ajeno reciben 401/403.
- [ ] Catálogo muestra solo publicaciones efectivamente visibles.
- [ ] Validación backend cubre campos e imagen; frontend no sustituye esta validación.
- [ ] Errores usan el contrato seguro de 4.3.

### Evidencia
Tests de CRUD, roles, ownership y payload inválido.

## 5.3 — Aplicar límites transaccionales gratis/Premium

- **Issue type:** Task
- **SP / Original Estimate:** 1 SP / 3 h
- **Assignee:** JA
- **Reviewer:** AS
- **Fecha probable:** 04/09/2026
- **Prioridad:** Highest
- **Labels:** `BE`, `DB`, `PREMIUM`, `LOCKING`, `SPRINT-7`
- **Depende de:** 5.1

### Descripción
Aplicar límite efectivo 1 gratis/3 Premium bajo transacción, bloqueando proveedor antes de contar; normalizar excedentes por vencimiento.

### Criterios de aceptación
- [ ] Crear/activar bloquea al proveedor antes del conteo.
- [ ] Gratis no supera 1; Premium activo no supera 3.
- [ ] GET público no muta; tras vencer muestra solo la activa más antigua.
- [ ] Siguiente escritura autenticada normaliza flags bajo lock.
- [ ] No se borran publicaciones por vencimiento.

### Evidencia
Tests secuenciales, vencimiento, activación y revisión del camino transaccional.

## 5.4 — Probar CRUD, autorización y contrato transaccional

- **Issue type:** Task
- **SP / Original Estimate:** 2 SP / 6 h
- **Assignee:** CL
- **Reviewer:** JA
- **Fecha probable:** 04–07/09/2026
- **Prioridad:** Highest
- **Labels:** `BE`, `QA`, `PUBLICACIONES`, `SPRINT-7`
- **Depende de:** 5.2, 5.3

### Descripción
Crear suite backend de publicaciones con CRUD, roles, ownership, límites, vencimiento, IDs manipulados, rollback y contrato del lock.

### Criterios de aceptación
- [ ] Happy path y casos 401/403/404/422 están cubiertos.
- [ ] Límite 1/3, activación de inactiva y vencimiento están cubiertos.
- [ ] Rollback no deja datos parciales.
- [ ] No se etiqueta un hook monohilo como prueba de concurrencia.
- [ ] Contención real, si se ejecuta, usa dos conexiones PostgreSQL y evidencia separada.

### Evidencia
Salida del archivo específico y suite backend completa.

## 5.5 — Crear gestión proveedor de publicaciones

- **Issue type:** Task
- **SP / Original Estimate:** 1 SP / 3 h
- **Assignee:** MR
- **Reviewer:** PT
- **Fecha probable:** 04–07/09/2026
- **Prioridad:** High
- **Labels:** `FE`, `PUBLICACIONES`, `SPRINT-7`
- **Depende de:** 5.2, 5.3, 6.1

### Descripción
Crear listado/formulario proveedor, contador de cupos y acciones activar/desactivar con rutas Expo coordinadas.

### Criterios de aceptación
- [ ] Incluye archivo de ruta, mapa de `dashboard.js` y `InternalLayout.js`.
- [ ] Presenta loading, vacío, error y límite alcanzado.
- [ ] Contador refleja 1/1 o hasta 3 Premium desde API.
- [ ] No implementa reglas de cupo solo en frontend.

### Evidencia
Jest y validación visual 1440/1024/390.

## 5.6 — Mostrar publicaciones y contratar desde perfil público

- **Issue type:** Task
- **SP / Original Estimate:** 2 SP / 6 h
- **Assignee:** PT
- **Reviewer:** D
- **Fecha probable:** 04–07/09/2026
- **Prioridad:** Highest
- **Labels:** `FE`, `BE`, `PUBLICACIONES`, `FLOW-A`, `SPRINT-7`
- **Depende de:** 5.2, 5.3, 6.1, 2.6

### Descripción
Mostrar publicaciones activas, retirar chat sin relación y crear solicitud vinculada derivando datos/snapshot desde backend.

### Criterios de aceptación
- [ ] Perfil público muestra solo publicaciones efectivamente visibles.
- [ ] Botón de chat sin Servicio se retira o se convierte en solicitar servicio.
- [ ] Backend deriva proveedor/categoría y no confía en IDs/precio manipulados.
- [ ] Servicio conserva `publicacion_id` y snapshot histórico.
- [ ] Editar/desactivar publicación no altera contrataciones existentes.

### Evidencia
Tests backend/frontend y demo desde perfil hasta servicio creado.

---

# EPIC 6 — UI, regresión OWASP y cierre

## 6.1 — Crear PublicacionCard presentacional

- **Issue type:** Task
- **SP / Original Estimate:** 1 SP / 3 h
- **Assignee:** MR
- **Reviewer:** PT
- **Fecha probable:** 03–04/09/2026
- **Prioridad:** High
- **Labels:** `FE`, `UI`, `PUBLICACIONES`, `SPRINT-7`
- **Depende de:** contrato de props acordado con 5.5/5.6

### Descripción
Crear `PublicacionCard` presentacional y estados loading/vacío/error usando fixtures, sin llamadas API ni reglas de límite.

### Criterios de aceptación
- [ ] Cubre activa, precio referencial, modo cotizar y ausencia de imagen.
- [ ] No ejecuta API ni decide cupos.
- [ ] Es responsive en 1440, 1024 y 390 px.
- [ ] Tiene pruebas unitarias básicas.

### Evidencia
Jest y capturas/manual QA de los tres breakpoints.

## 6.3 — Ejecutar regresión OWASP y ZAP local

- **Issue type:** Task
- **SP / Original Estimate:** 2 SP / 6 h
- **Assignee:** CL
- **Reviewer:** JA
- **Fecha probable:** 08/09/2026
- **Prioridad:** Highest
- **Labels:** `SEC`, `QA`, `OWASP`, `ZAP`, `SPRINT-7`
- **Depende de:** Epics 1–5

### Descripción
Ejecutar abuso OWASP, ZAP Baseline local y regresión de Flow A/B, publicaciones y monetización; documentar antes/después.

### Criterios de aceptación
- [ ] ZAP solo apunta al stack local con datos sintéticos.
- [ ] Cada alerta queda corregida, aceptada, falsa positiva o follow-up.
- [ ] Matriz final enlaza PR, test y evidencia.
- [ ] Flow A, Flow B, créditos, compra, Premium y publicaciones permanecen verdes.

### Evidencia
Reporte ZAP, matriz final y logs completos de suites/build.

## 6.4 — Crear pruebas frontend de seguridad y publicaciones

- **Issue type:** Task
- **SP / Original Estimate:** 1 SP / 3 h
- **Assignee:** MR
- **Reviewer:** PT
- **Fecha probable:** 08/09/2026
- **Prioridad:** High
- **Labels:** `FE`, `QA`, `SEC`, `SPRINT-7`
- **Depende de:** 3.3, 3.4, 4.2, 5.5, 6.1

### Descripción
Agregar pruebas frontend de sesión, 401/403/429, CSP/build, storage por plataforma y gestión básica de publicaciones.

### Criterios de aceptación
- [ ] 401 limpia una vez; 403 conserva sesión; 429 muestra espera.
- [ ] Rol manipulado localmente no habilita dashboard sin `/me`.
- [ ] Gestión de publicaciones cubre loading, vacío, error y límite.
- [ ] Fallos API no se convierten en datos válidos.
- [ ] Jest y build web permanecen verdes.

### Evidencia
Salida Jest y build web final.

---

# Checklist común para mover una task a Done

- [ ] PR enfocado hacia `dev`; no push directo a `main`.
- [ ] Reviewer distinto del owner; dos revisores si cambia un límite de seguridad.
- [ ] Jira enlazado en PR y categoría OWASP cuando aplique.
- [ ] Prueba relevante falla antes y pasa después cuando aplica.
- [ ] Suite backend canónica continúa verde.
- [ ] Jest y build web continúan verdes cuando aplica.
- [ ] No hay secretos, tokens, passwords, documentos ni payloads sensibles en logs/diff.
- [ ] `git diff --check` limpio.
- [ ] Evidencia adjunta antes de mover a Done.
- [ ] No queda trabajo pendiente escondido; si falta alcance, la task permanece In Progress.
