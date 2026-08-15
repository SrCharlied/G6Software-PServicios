# Estimación de Costos y Tiempo de Desarrollo — ServiGT

**Curso:** CC3091 — Ingeniería de Software
**Grupo:** G6 — Proyecto ServiGT (plataforma de servicios a domicilio, Guatemala)
**Método aplicado:** Puntos de Casos de Uso (PCU / *Use Case Points*, Gustav Karner, 1993)
**Fecha de estimación:** julio 2026

---

## 0. Glosario: qué es cada sigla

Antes de calcular nada, conviene tener claro qué significa cada término y qué papel juega en la cadena.

| Sigla | Nombre completo | Qué es, en una frase | Unidad |
|---|---|---|---|
| **FPA** | Factor de Peso de los Actores | Cuánto "pesa" todo lo que interactúa con el sistema desde afuera | puntos |
| **FPCU** | Factor de Peso de los Casos de Uso | Cuánto "pesa" todo lo que el sistema hace por dentro | puntos |
| **PCU** | Puntos de Casos de Uso (sin ajustar) | El tamaño funcional bruto del sistema: `FPA + FPCU` | puntos |
| **FCT** | Factor de Complejidad Técnica | Multiplicador que corrige el tamaño según qué tan exigente es la **tecnología** | adimensional |
| **FA** | Factor de Ambiente | Multiplicador que corrige el tamaño según qué tan capaz es el **equipo** | adimensional |
| **PCUA** | Puntos de Casos de Uso Ajustados | El tamaño funcional real: `PCU × FCT × FA` | puntos |
| **FC** | Factor de Conversión | Cuántas horas de trabajo cuesta producir un punto | h-h / punto |
| **h-h** | Hora-hombre | Una hora de trabajo de una persona | horas |

### La cadena completa, en una imagen

```
   CONTEO                    AJUSTE                   CONVERSIÓN
┌────────────┐          ┌──────────────┐          ┌───────────────┐
│ Actores    │──FPA──┐  │              │          │               │
│            │       ├─▶│ PCU = 299    │──× FCT──▶│ PCUA = 319.82 │
│ Casos de   │──FPCU─┘  │  (tamaño     │  × FA    │  (tamaño      │
│ uso        │          │   bruto)     │          │   ajustado)   │
└────────────┘          └──────────────┘          └───────┬───────┘
                                                          │ × FC (20 h-h)
                                                          ▼
                                              ┌───────────────────────┐
                                              │ ESFUERZO = 6,396 h-h  │
                                              └───────────┬───────────┘
                                          ┌───────────────┴───────────────┐
                                          ▼                               ▼
                            ┌─────────────────────────┐     ┌───────────────────────┐
                            │ ÷ personas              │     │ × tarifa por hora     │
                            │ TIEMPO = 6.7 meses      │     │ COSTO = Q 815,810     │
                            └─────────────────────────┘     └───────────────────────┘
```

**La idea de fondo:** primero se mide *cuánto* sistema hay (en puntos, no en líneas de código), luego se corrige esa medida por dos realidades — qué tan difícil es técnicamente y qué tan bueno es el equipo — y por último se traduce a horas, y de horas a días y a quetzales.

---

## 1. Marco de la estimación

### 1.1 ¿Por qué estimar?

Todo proyecto de software debe responder tres preguntas antes de escribir la primera línea de código: **cuánto trabajo cuesta**, **cuánto tiempo toma** y **cuánto dinero requiere**. Sin esas tres cifras no hay contrato, no hay presupuesto y no hay cronograma defendible ante un cliente.

### 1.2 Análisis de factibilidad de ServiGT

| Dimensión | Qué evalúa | Situación en ServiGT | Veredicto |
|---|---|---|---|
| **Organizativa** | Estructuras y personas disponibles | Equipo de 7 integrantes con roles repartidos (backend, frontend, BD, QA). Flujo de ramas y PRs en GitHub operativo. | Viable |
| **Económica** | Costos contra beneficios | Costo de desarrollo frente al modelo de ingresos por créditos que los proveedores consumen al cotizar. | Viable con reservas |
| **Técnica** | Habilidades y recursos | Stack conocido: Laravel 11 + PostgreSQL 16 + Expo/React Native Web sobre Docker Compose. Sin dependencias exóticas. | Viable |
| **Temporal** | Fechas comprometidas | Ventana académica de un semestre (feb–jul 2026), insuficiente para el alcance comercial completo. | **Restrictiva** |

### 1.3 Variables a estimar

| Variable | Unidad | De dónde sale |
|---|---|---|
| Tamaño funcional | Puntos de Casos de Uso (PCUA) | Conteo ponderado de actores y casos de uso |
| Esfuerzo | horas-hombre (h-h) | PCUA × Factor de Conversión |
| Tiempo | semanas / meses calendario | Esfuerzo ÷ personas disponibles |
| Costo directo | Quetzales (GTQ) / Dólares (USD) | Esfuerzo × tarifa por hora × coeficiente indirecto |

### 1.4 Por qué PCU y no COCOMO

| Criterio | Métodos por **tamaño** (COCOMO, Putnam) | Métodos por **funcionalidad** (Puntos de Función, **PCU**) |
|---|---|---|
| Insumo que exigen | Miles de líneas de código (KLOC) | Casos de uso y actores |
| Cuándo se pueden aplicar | Requieren código escrito o un proyecto histórico comparable | Aplicables desde la fase de análisis |
| Ajuste a ServiGT | El grupo no tiene histórico de KLOC de proyectos previos | ServiGT **sí** tiene su modelo de casos de uso definido |

Se usa **PCU** como método principal y **COCOMO básico** únicamente como contraste del cronograma (sección 7.3).

---

## 2. FPA — Factor de Peso de los Actores

### 2.1 ¿Qué es un actor y por qué se pesa?

Un **actor** es cualquier entidad externa al sistema que interactúa con él: una persona, otro sistema o un proceso automático. No es un usuario individual, sino un **rol**: los 3,000 clientes de ServiGT son *un solo* actor "Cliente".

**¿Por qué se les asigna peso?** Porque construir la interfaz para un actor cuesta trabajo, y ese trabajo depende del canal por el que se comunica:

- Un **sistema externo que habla por API** ya emite JSON estructurado. Basta consumirlo. → barato
- Un **sistema que habla por protocolo o texto plano** exige parseo, validación y manejo de errores. → intermedio
- Una **persona frente a una pantalla** exige diseño visual, formularios, validaciones amigables, mensajes de error entendibles, estados de carga, accesibilidad y pruebas de usabilidad. → caro

Por eso una persona pesa **tres veces** lo que una API.

### 2.2 Tabla de criterios

| Tipo de actor | Criterio de clasificación | Peso |
|---|---|---|
| Simple | Otro sistema que se comunica vía API o Web Service | **1** |
| Medio | Otro sistema vía protocolo definido o interfaz de línea de texto | **2** |
| Complejo | Persona que interactúa mediante interfaz gráfica | **3** |

### 2.3 Identificación de los actores de ServiGT

| # | Actor | Qué hace en el sistema | Evidencia en el código | Canal | Tipo | Peso |
|---|---|---|---|---|---|---|
| A1 | **Cliente** | Publica pedidos, solicita servicios directos, acepta cotizaciones, confirma finalización y califica | `users.role = 'cliente'`; pantallas `PublicarPedidoScreen`, `MisPedidosScreen` | GUI Expo | Complejo | **3** |
| A2 | **Proveedor** | Ofrece servicios, cotiza pedidos consumiendo créditos, gestiona disponibilidad y ejecuta servicios | `users.role = 'proveedor'`; `ProviderDashboardScreen`, `CotizacionController` | GUI Expo | Complejo | **3** |
| A3 | **Administrador** | Verifica proveedores, recarga créditos y consulta estadísticas del negocio | `users.role = 'admin'`; middleware `EnsureIsAdmin`, `AdminController` | GUI Expo | Complejo | **3** |
| A4 | **Visitante** | Navega el sitio público sin autenticarse: landing, categorías, fichas y calificaciones de proveedores | Rutas públicas de `api.php`; `LandingScreen`, `ServiciosScreen`, `NosotrosScreen` | GUI Web | Complejo | **3** |
| A5 | **Programador de tareas** | Proceso automático que cierra los pedidos vencidos sin intervención humana | `App\Console\Commands\ExpirarPedidos` | Invocación programada | Simple | **1** |
| A6 | **Pasarela de pago** | Servicio externo que procesa cobros con tarjeta y transferencia | `pagos.metodo_pago IN ('efectivo','transferencia','tarjeta')` | API REST | Simple | **1** |

### 2.4 Cálculo del FPA

| Tipo | Actores que caen aquí | Cantidad | × Peso | = Subtotal |
|---|---|---|---|---|
| Complejo | A1 Cliente, A2 Proveedor, A3 Administrador, A4 Visitante | 4 | × 3 | **12** |
| Medio | — | 0 | × 2 | **0** |
| Simple | A5 Programador de tareas, A6 Pasarela de pago | 2 | × 1 | **2** |
| **Total** | | **6 actores** | | **FPA = 14** |

```
FPA = (4 × 3) + (0 × 2) + (2 × 1)
FPA = 12 + 0 + 2
FPA = 14 puntos
```

> **Lectura del resultado:** el 86 % del peso de los actores (12 de 14 puntos) proviene de personas frente a una pantalla. ServiGT es un sistema **dominado por la interfaz de usuario**, no por integraciones máquina-a-máquina. Eso explica por qué el frontend consume tanto esfuerzo en el proyecto.

> **Nota de alcance:** el actor A6 corresponde a funcionalidad prevista en el esquema de base de datos pero aún no integrada. Se incluye porque esta estimación cubre el **producto comercial completo**, no solo el MVP entregado en el curso.

---

## 3. FPCU — Factor de Peso de los Casos de Uso

### 3.1 ¿Qué es un caso de uso y qué es una transacción?

Un **caso de uso** es un objetivo completo que un actor logra con el sistema. La prueba para saber si algo es un caso de uso legítimo: *si el actor se detuviera ahí, ¿habría logrado algo de valor?* "Iniciar sesión" sí lo es. "Hacer clic en el botón azul" no lo es.

Una **transacción** es un par estímulo-respuesta **atómico** entre el actor y el sistema: el actor hace algo, el sistema responde, y ese par completo o sucede o no sucede — no queda a medias. **No** es un clic, **no** es un endpoint HTTP y **no** es una consulta SQL.

El método usa el conteo de transacciones como proxy del tamaño: mientras más pasos tenga el flujo principal, más lógica, más validaciones y más pruebas hay que escribir.

### 3.2 Tabla de criterios

| Tipo de caso de uso | Transacciones en el flujo principal | Peso |
|---|---|---|
| Simple | Menos de 4 | **5** |
| Medio | De 4 a 7 | **10** |
| Complejo | Más de 7 | **15** |

### 3.3 Cómo se contaron las transacciones — tres ejemplos trabajados

Para que el conteo sea auditable, se muestra el desglose de un caso de cada tipo.

**Ejemplo de caso SIMPLE — CU-02 «Iniciar y cerrar sesión»**

| # | Transacción |
|---|---|
| 1 | El usuario envía correo y contraseña |
| 2 | El sistema valida las credenciales y emite un token Sanctum |
| 3 | El sistema devuelve el perfil y redirige según el rol |
| | **3 transacciones → menos de 4 → Simple → peso 5** |

**Ejemplo de caso MEDIO — CU-15 «Publicar pedido»**

| # | Transacción |
|---|---|
| 1 | El cliente abre el formulario de publicación |
| 2 | El sistema carga el catálogo de categorías disponibles |
| 3 | El cliente captura título, descripción, categoría, presupuesto y fecha límite |
| 4 | El sistema valida los datos contra `StorePedidoRequest` |
| 5 | El sistema persiste el pedido en estado `abierto` |
| 6 | El sistema confirma y lo publica en el tablero de oportunidades |
| | **6 transacciones → entre 4 y 7 → Medio → peso 10** |

**Ejemplo de caso COMPLEJO — CU-19 «Aceptar cotización y generar el servicio»**

| # | Transacción |
|---|---|
| 1 | El cliente abre el detalle de su pedido |
| 2 | El sistema lista todas las cotizaciones recibidas con datos del proveedor |
| 3 | El cliente selecciona una cotización y pulsa aceptar |
| 4 | El sistema valida que el pedido siga abierto y que el cliente sea su dueño |
| 5 | El sistema marca esa cotización como aceptada |
| 6 | El sistema rechaza automáticamente las demás cotizaciones del pedido |
| 7 | El sistema crea el registro de `servicio` a partir de la cotización ganadora |
| 8 | El sistema cambia el estado del pedido a adjudicado |
| 9 | El sistema notifica al proveedor ganador y a los no seleccionados |
| | **9 transacciones → más de 7 → Complejo → peso 15** |

### 3.4 Catálogo completo de casos de uso

#### Módulo 1 — Cuenta y perfil

| ID | Caso de uso | Actor principal | Trans. | Tipo | Peso |
|---|---|---|---|---|---|
| CU-01 | Registrar usuario (cliente o proveedor) | Visitante | 5 | Medio | 10 |
| CU-02 | Iniciar y cerrar sesión | Cliente / Proveedor / Admin | 3 | Simple | 5 |
| CU-03 | Crear y editar perfil de proveedor | Proveedor | 6 | Medio | 10 |
| CU-04 | Gestionar documentos de verificación y foto de perfil | Proveedor | 5 | Medio | 10 |
| | | | | **Subtotal M1** | **35** |

#### Módulo 2 — Catálogo, búsqueda y disponibilidad

| ID | Caso de uso | Actor principal | Trans. | Tipo | Peso |
|---|---|---|---|---|---|
| CU-05 | Explorar sitio público (landing, servicios, nosotros, categorías) | Visitante | 3 | Simple | 5 |
| CU-06 | Buscar y filtrar proveedores | Cliente / Visitante | 4 | Medio | 10 |
| CU-07 | Consultar ficha del proveedor (perfil + calificaciones + disponibilidad) | Cliente / Visitante | 6 | Medio | 10 |
| CU-08 | Configurar disponibilidad semanal | Proveedor | 4 | Medio | 10 |
| | | | | **Subtotal M2** | **35** |

#### Módulo 3 — Ciclo de vida del servicio directo

| ID | Caso de uso | Actor principal | Trans. | Tipo | Peso |
|---|---|---|---|---|---|
| CU-09 | Solicitar servicio a un proveedor | Cliente | 5 | Medio | 10 |
| CU-10 | Aceptar o rechazar solicitud entrante | Proveedor | 4 | Medio | 10 |
| CU-11 | Iniciar servicio validando código de inicio | Proveedor | 5 | Medio | 10 |
| CU-12 | Finalizar servicio y confirmar con código de fin | Proveedor / Cliente | 7 | Medio | 10 |
| CU-13 | Actualizar y dar seguimiento al estado del servicio | Proveedor / Cliente | 4 | Medio | 10 |
| CU-14 | Consultar bandeja de solicitudes | Cliente / Proveedor | 3 | Simple | 5 |
| | | | | **Subtotal M3** | **55** |

#### Módulo 4 — Marketplace de demanda (pedidos y cotizaciones)

| ID | Caso de uso | Actor principal | Trans. | Tipo | Peso |
|---|---|---|---|---|---|
| CU-15 | Publicar pedido | Cliente | 6 | Medio | 10 |
| CU-16 | Explorar pedidos abiertos con filtros | Proveedor | 5 | Medio | 10 |
| CU-17 | Cotizar un pedido consumiendo créditos | Proveedor | 9 | **Complejo** | 15 |
| CU-18 | Editar cotización enviada | Proveedor | 4 | Medio | 10 |
| CU-19 | Aceptar cotización y generar el servicio | Cliente | 9 | **Complejo** | 15 |
| CU-20 | Expirar automáticamente los pedidos vencidos | Prog. de tareas | 4 | Medio | 10 |
| | | | | **Subtotal M4** | **70** |

#### Módulo 5 — Créditos y pagos

| ID | Caso de uso | Actor principal | Trans. | Tipo | Peso |
|---|---|---|---|---|---|
| CU-21 | Consultar saldo y movimientos de créditos | Proveedor | 3 | Simple | 5 |
| CU-22 | Recargar créditos a un proveedor | Administrador | 5 | Medio | 10 |
| CU-23 | Registrar y liquidar el pago del servicio | Cliente / Proveedor | 6 | Medio | 10 |
| CU-24 | Pagar con tarjeta mediante pasarela externa | Cliente / Pasarela | 9 | **Complejo** | 15 |
| | | | | **Subtotal M5** | **40** |

#### Módulo 6 — Comunicación

| ID | Caso de uso | Actor principal | Trans. | Tipo | Peso |
|---|---|---|---|---|---|
| CU-25 | Conversar por chat con la contraparte | Cliente / Proveedor | 6 | Medio | 10 |
| CU-26 | Recibir y gestionar notificaciones | Cliente / Proveedor | 5 | Medio | 10 |
| | | | | **Subtotal M6** | **20** |

#### Módulo 7 — Reputación

| ID | Caso de uso | Actor principal | Trans. | Tipo | Peso |
|---|---|---|---|---|---|
| CU-27 | Calificar al proveedor y recalcular su reputación | Cliente | 6 | Medio | 10 |
| | | | | **Subtotal M7** | **10** |

#### Módulo 8 — Administración

| ID | Caso de uso | Actor principal | Trans. | Tipo | Peso |
|---|---|---|---|---|---|
| CU-28 | Consultar panel de estadísticas | Administrador | 4 | Medio | 10 |
| CU-29 | Administrar usuarios y verificar proveedores | Administrador | 6 | Medio | 10 |
| | | | | **Subtotal M8** | **20** |

### 3.5 Cálculo del FPCU

| Tipo | Casos de uso que caen aquí | Cantidad | × Peso | = Subtotal |
|---|---|---|---|---|
| Simple | CU-02, CU-05, CU-14, CU-21 | 4 | × 5 | **20** |
| Medio | CU-01, 03, 04, 06, 07, 08, 09, 10, 11, 12, 13, 15, 16, 18, 20, 22, 23, 25, 26, 27, 28, 29 | 22 | × 10 | **220** |
| Complejo | CU-17, CU-19, CU-24 | 3 | × 15 | **45** |
| **Total** | | **29 casos de uso** | | **FPCU = 285** |

```
FPCU = (4 × 5) + (22 × 10) + (3 × 15)
FPCU = 20 + 220 + 45
FPCU = 285 puntos
```

### 3.6 Distribución del peso funcional por módulo

| Módulo | Casos de uso | Puntos | % del FPCU |
|---|---|---|---|
| M4 — Marketplace de demanda | 6 | 70 | **24.6 %** |
| M3 — Ciclo de vida del servicio | 6 | 55 | 19.3 % |
| M5 — Créditos y pagos | 4 | 40 | 14.0 % |
| M1 — Cuenta y perfil | 4 | 35 | 12.3 % |
| M2 — Catálogo y disponibilidad | 4 | 35 | 12.3 % |
| M6 — Comunicación | 2 | 20 | 7.0 % |
| M8 — Administración | 2 | 20 | 7.0 % |
| M7 — Reputación | 1 | 10 | 3.5 % |
| **Total** | **29** | **285** | **100 %** |

> **Lectura del resultado:** el marketplace de demanda (publicar pedido → cotizar → aceptar) concentra casi **una cuarta parte** del sistema y contiene 2 de los 3 casos de uso complejos. Es el corazón del negocio y también el mayor foco de riesgo técnico.

---

## 4. PCU — Puntos de Casos de Uso sin ajustar

### 4.1 ¿Qué es el PCU?

El PCU es el **tamaño funcional bruto** del sistema. Es el equivalente conceptual a los metros cuadrados de una construcción: dice cuánto sistema hay que construir, **sin decir todavía** qué tan difícil es construirlo ni quién lo va a construir.

Es un número **independiente de la tecnología y del equipo**. El mismo sistema tendría los mismos 299 puntos si se escribiera en Laravel, en Java o en Python.

### 4.2 Cálculo

```
PCU = FPA + FPCU
```

| Componente | Descripción | Valor | % del total |
|---|---|---|---|
| FPA | Peso de los 6 actores | 14 | 4.7 % |
| FPCU | Peso de los 29 casos de uso | 285 | 95.3 % |
| **PCU** | **Tamaño funcional bruto** | **299** | **100 %** |

```
PCU = 14 + 285
PCU = 299 puntos
```

> **PCU = 299 puntos**

> **Lectura del resultado:** los actores aportan menos del 5 % del tamaño. Esto es normal y confirma que el conteo está bien hecho: en el método PCU, el peso real está siempre en la funcionalidad, no en quién la usa. Un conteo donde los actores pesaran 20 % o más indicaría casos de uso mal identificados o demasiado agregados.

---

## 5. FCT — Factor de Complejidad Técnica

### 5.1 ¿Qué es el FCT?

El FCT responde a la pregunta: **¿qué tan exigente es la tecnología de este proyecto en particular?**

Dos sistemas con los mismos 299 puntos no cuestan lo mismo si uno corre en una sola máquina y el otro debe funcionar en web, Android e iOS al mismo tiempo. El FCT es el multiplicador que captura esa diferencia.

Son **13 factores técnicos**, cada uno con un **peso fijo** (definido por el método, no negociable) y un **valor de 0 a 5** que asigna el estimador según el proyecto:

- **Valor 0** = el factor es irrelevante para este proyecto
- **Valor 3** = presencia media, lo normal
- **Valor 5** = el factor es crítico y dominante

### 5.2 La fórmula y sus constantes

```
FCT = 0.6 + 0.01 × Σ(Peso × Valor)
```

**¿De dónde salen el 0.6 y el 0.01?** Son constantes de calibración diseñadas para que un proyecto **promedio dé aproximadamente 1.00** (es decir, que no altere el tamaño). Comprobación: si los 13 factores tuvieran valor 3 (medio), y sabiendo que la suma de los pesos es 14:

```
Σ = 3 × 14 = 42   →   FCT = 0.6 + 0.42 = 1.02 ≈ 1.00  ✓
```

**Rango posible del FCT:**

| Escenario | Σ(Peso × Valor) | FCT | Efecto |
|---|---|---|---|
| Todos los factores en 0 (mínima exigencia técnica) | 0 | **0.60** | Reduce el tamaño 40 % |
| Todos los factores en 3 (proyecto promedio) | 42 | **1.02** | Neutro |
| Todos los factores en 5 (máxima exigencia) | 70 | **1.30** | Aumenta el tamaño 30 % |

### 5.3 Evaluación de los 13 factores en ServiGT

| Factor | Descripción | Peso | Valor | Producto | Justificación en ServiGT |
|---|---|---|---|---|---|
| T1 | Sistema distribuido | 2 | 4 | **8.0** | Tres contenedores independientes (frontend Expo, API Laravel, PostgreSQL) comunicándose en red Docker, con healthchecks y arranque ordenado |
| T2 | Performance / tiempo de respuesta | 1 | 3 | **3.0** | Listados con filtros y chat requieren respuesta ágil, pero no hay requisito de tiempo real estricto |
| T3 | Eficiencia del usuario final | 1 | 4 | **4.0** | El proveedor debe poder cotizar en pocos toques; el producto compite directamente contra WhatsApp |
| T4 | Procesamiento interno complejo | 1 | 3 | **3.0** | Débito de créditos, máquina de estados del servicio, generación y validación de códigos de inicio/fin |
| T5 | Código reutilizable | 1 | 3 | **3.0** | Trait `ApiResponse`, API Resources, componentes compartidos entre web y móvil |
| T6 | Facilidad de instalación | 0.5 | 4 | **2.0** | `docker compose up` levanta todo, con sincronización idempotente del esquema en cada arranque |
| T7 | Facilidad de uso | 0.5 | 5 | **2.5** | Usuarios finales no técnicos: plomeros, electricistas, amas de casa |
| T8 | Portabilidad | 2 | 4 | **8.0** | Un solo código base Expo que debe correr en Web, Android e iOS |
| T9 | Facilidad de cambio | 1 | 3 | **3.0** | Catálogo de categorías y reglas de costo de cotización parametrizables sin tocar código |
| T10 | Concurrencia | 1 | 4 | **4.0** | Varios proveedores cotizan el mismo pedido en paralelo; el débito de créditos debe ser consistente |
| T11 | Objetivos especiales de seguridad | 1 | 4 | **4.0** | Sanctum, roles, middleware de admin, custodia de documentos de identidad y datos personales |
| T12 | Acceso directo a terceras partes | 1 | 2 | **2.0** | Pasarela de pago prevista pero no integrada; hoy solo almacenamiento local de archivos |
| T13 | Entrenamiento especial a usuarios | 1 | 1 | **1.0** | Interfaz autoexplicativa, no se contempla capacitación formal |
| | **Suma de pesos = 14** | | | **Σ = 47.5** | |

### 5.4 Cálculo paso a paso

```
Paso 1 — Sumar los productos:
Σ = 8.0 + 3.0 + 4.0 + 3.0 + 3.0 + 2.0 + 2.5 + 8.0 + 3.0 + 4.0 + 4.0 + 2.0 + 1.0
Σ = 47.5

Paso 2 — Multiplicar por 0.01:
0.01 × 47.5 = 0.475

Paso 3 — Sumar la constante base:
FCT = 0.6 + 0.475
FCT = 1.075
```

> **FCT = 1.075**

**Ubicación dentro del rango posible:**

```
0.60 ────────────────────────────────●──── 1.30
mínimo                            1.075   máximo
                            (68 % del rango)
```

> **Lectura del resultado:** ServiGT es **7.5 % más complejo** que un sistema técnicamente neutro. Los dos factores de peso 2 son los que dominan: **T8 Portabilidad** (8.0 puntos) y **T1 Sistema distribuido** (8.0 puntos) aportan juntos el **34 %** de toda la complejidad técnica. Traducido a decisiones: la elección de Expo para cubrir tres plataformas y de Docker para separar los servicios es precisamente lo que encarece el proyecto — a cambio de alcance y mantenibilidad.

**Los cinco factores que más pesan:**

| Posición | Factor | Producto | % de Σ |
|---|---|---|---|
| 1º (empate) | T1 Sistema distribuido | 8.0 | 16.8 % |
| 1º (empate) | T8 Portabilidad | 8.0 | 16.8 % |
| 3º (empate) | T3 Eficiencia del usuario final | 4.0 | 8.4 % |
| 3º (empate) | T10 Concurrencia | 4.0 | 8.4 % |
| 3º (empate) | T11 Seguridad | 4.0 | 8.4 % |
| | **Subtotal top 5** | **28.0** | **59 %** |

---

## 6. FA — Factor de Ambiente

### 6.1 ¿Qué es el FA?

El FA responde a una pregunta distinta a la del FCT: **¿qué tan capaz es el equipo que va a construir esto?**

El mismo sistema, con la misma tecnología, cuesta mucho menos si lo hace un equipo experimentado, motivado y dedicado a tiempo completo, que si lo hace un equipo novato que además está haciendo otra cosa.

Son **8 factores**, con la misma escala de valor 0 a 5, pero con una diferencia crucial: **dos de ellos tienen peso negativo**.

### 6.2 La fórmula y por qué resta

```
FA = 1.4 − 0.03 × Σ(Peso × Valor)
```

Fijate en el signo: aquí se **resta**. La lógica es inversa a la del FCT:

- **Más capacidad del equipo → Σ más grande → FA más pequeño → menos esfuerzo**
- **Menos capacidad del equipo → Σ más pequeño → FA más grande → más esfuerzo**

**Comprobación de la calibración.** Un equipo promedio tendría todos los factores en 3. Sabiendo que los pesos positivos suman 6.5 y los negativos suman −2:

```
Σ = 3 × 6.5 + 3 × (−2) = 19.5 − 6 = 13.5
FA = 1.4 − 0.03 × 13.5 = 1.4 − 0.405 = 0.995 ≈ 1.00  ✓
```

**Rango posible del FA:**

| Escenario | Σ | FA | Efecto |
|---|---|---|---|
| Equipo ideal (E1–E6 en 5, E7–E8 en 0) | 32.5 | **0.425** | Reduce el esfuerzo 57 % |
| Equipo promedio (todos en 3) | 13.5 | **0.995** | Neutro |
| Equipo en el peor caso (E1–E6 en 0, E7–E8 en 5) | −10.0 | **1.700** | Aumenta el esfuerzo 70 % |

### 6.3 Significado de la escala de valores

| Valor | Para E1–E6 (factores favorables) | Para E7–E8 (factores penalizantes) |
|---|---|---|
| 0 | Sin experiencia / ausente | El problema no existe |
| 1–2 | Baja | Poco presente |
| 3 | Media | Presencia media |
| 4 | Alta | Bastante presente |
| 5 | Experto / máxima | Problema severo |

### 6.4 Evaluación de los 8 factores en el equipo G6

| Factor | Descripción | Peso | Valor | Producto | Justificación en el equipo G6 |
|---|---|---|---|---|---|
| E1 | Familiaridad con el modelo de desarrollo | 1.5 | 3 | **4.5** | Scrum académico por sprints: conocido de cursos previos, pero no dominado en la práctica |
| E2 | Experiencia en la aplicación | 0.5 | 2 | **1.0** | Primer marketplace de servicios que construye el equipo; el dominio de negocio es nuevo |
| E3 | Experiencia en orientación a objetos | 1 | 3 | **3.0** | Base sólida en POO por cursos previos, aplicada correctamente en modelos y controladores |
| E4 | Capacidad del analista líder | 0.5 | 4 | **2.0** | Liderazgo técnico definido y activo: 19 merges revisados, ramas por feature |
| E5 | Motivación | 1 | 4 | **4.0** | Alta: 132 commits con participación efectiva de los 7 integrantes |
| E6 | Estabilidad de los requerimientos | 2 | 3 | **6.0** | El núcleo se mantuvo estable, pero el marketplace de pedidos se incorporó a mitad del proyecto |
| E7 | Personal a tiempo compartido | **−1** | 5 | **−5.0** | **Crítico:** los 7 integrantes son estudiantes con carga académica completa en paralelo |
| E8 | Dificultad del lenguaje | **−1** | 2 | **−2.0** | PHP y JavaScript son lenguajes de dificultad baja-media, con curva de aprendizaje suave |
| | Pesos positivos = 6.5 · negativos = −2 | | | **Σ = 13.5** | |

### 6.5 Cálculo paso a paso

```
Paso 1 — Sumar los productos positivos:
4.5 + 1.0 + 3.0 + 2.0 + 4.0 + 6.0 = 20.5

Paso 2 — Sumar los productos negativos:
(−5.0) + (−2.0) = −7.0

Paso 3 — Sumar todo:
Σ = 20.5 − 7.0 = 13.5

Paso 4 — Multiplicar por 0.03:
0.03 × 13.5 = 0.405

Paso 5 — Restar de la constante base:
FA = 1.4 − 0.405
FA = 0.995
```

> **FA = 0.995**

**Ubicación dentro del rango posible:**

```
0.425 ──────────────────●────────────────── 1.700
ideal              0.995 (neutro)          peor caso
```

> **Lectura del resultado — el hallazgo más interesante de la estimación.** El Σ del equipo G6 es **exactamente 13.5**, el mismo valor que daría un equipo teóricamente promedio. Esto no es casualidad estadística sino una **compensación real**: la motivación alta (E5 = 4) y la capacidad del líder (E4 = 4) anulan con precisión el castigo de la dedicación parcial (E7 = 5) y la falta de experiencia en el dominio (E2 = 2).
>
> **Consecuencia práctica:** el ambiente del equipo no encarece ni abarata el proyecto — lo deja igual. Pero también indica dónde está la palanca: si el equipo pudiera dedicarse a tiempo completo (E7 bajaría de 5 a 1), Σ subiría a 17.5, el FA bajaría a 0.875, y el esfuerzo total caería **12 %** — unas 770 horas-hombre.

**Análisis de sensibilidad del FA:**

| Cambio hipotético | Nuevo Σ | Nuevo FA | Impacto en el esfuerzo |
|---|---|---|---|
| Dedicación a tiempo completo (E7: 5 → 1) | 17.5 | 0.875 | **−12.1 %** (−770 h-h) |
| Congelar requerimientos desde el inicio (E6: 3 → 5) | 17.5 | 0.875 | **−12.1 %** (−770 h-h) |
| Contratar un experto del dominio (E2: 2 → 5) | 15.0 | 0.950 | −4.5 % (−288 h-h) |
| Pérdida de motivación (E5: 4 → 1) | 10.5 | 1.085 | **+9.0 %** (+577 h-h) |

---

## 7. PCUA — Puntos de Casos de Uso Ajustados

### 7.1 ¿Qué es el PCUA?

El PCUA es el **tamaño funcional real** del sistema: el tamaño bruto (PCU) ya corregido por las dos realidades que lo rodean — la exigencia técnica (FCT) y la capacidad del equipo (FA).

Es el número que efectivamente se convierte en horas. Todo lo anterior existe para llegar aquí.

### 7.2 Cálculo paso a paso

```
PCUA = PCU × FCT × FA
```

| Paso | Operación | Resultado | Variación |
|---|---|---|---|
| Punto de partida | PCU | **299.000** | — |
| Ajuste técnico | 299 × 1.075 | **321.425** | **+22.425 pts (+7.5 %)** |
| Ajuste de ambiente | 321.425 × 0.995 | **319.818** | **−1.607 pts (−0.5 %)** |
| **Resultado final** | | **PCUA = 319.82** | **+20.82 pts (+7.0 %)** |

```
PCUA = 299 × 1.075 × 0.995
PCUA = 321.425 × 0.995
PCUA = 319.82 puntos ajustados
```

> **PCUA = 319.82 puntos**

> **Lectura del resultado:** el sistema "creció" un 7 % respecto de su tamaño bruto. Ese crecimiento es **casi enteramente técnico**: la portabilidad multiplataforma y la arquitectura distribuida agregan 22.4 puntos, mientras que el equipo devuelve apenas 1.6. En términos de negocio: *la decisión de arquitectura cuesta 14 veces más que la composición del equipo.*

---

## 8. FC — Factor de Conversión y Esfuerzo

### 8.1 ¿Qué es el FC?

El FC es el **tipo de cambio** entre puntos y horas: cuántas horas-hombre cuesta producir un punto de caso de uso ajustado.

Es el parámetro más discutido del método, porque no se deduce del proyecto sino de la **experiencia histórica**. Karner lo estableció empíricamente en **20 horas-hombre por punto** midiendo proyectos reales. Ese valor incluye *todo* el ciclo: análisis, diseño, codificación, pruebas, documentación y gestión — no solo escribir código.

### 8.2 Regla de calibración del FC

El FC se ajusta contando cuántos factores de ambiente están en zona desfavorable:

- Factores **E1 a E6** con valor **menor a 3** (el equipo está por debajo de la media en algo bueno)
- Factores **E7 y E8** con valor **mayor a 3** (el equipo está por encima de la media en algo malo)

**Conteo para el equipo G6:**

| Factor | Valor | ¿Desfavorable? | Razón |
|---|---|---|---|
| E1 Familiaridad con el modelo | 3 | No | No es < 3 |
| E2 Experiencia en la aplicación | 2 | **Sí** | 2 < 3 |
| E3 Experiencia en OO | 3 | No | No es < 3 |
| E4 Capacidad del analista líder | 4 | No | No es < 3 |
| E5 Motivación | 4 | No | No es < 3 |
| E6 Estabilidad de requerimientos | 3 | No | No es < 3 |
| E7 Personal a tiempo compartido | 5 | **Sí** | 5 > 3 |
| E8 Dificultad del lenguaje | 2 | No | No es > 3 |
| | | **Total: 2** | |

**Tabla de decisión:**

| Total de factores desfavorables | FC (h-h por punto) | Interpretación |
|---|---|---|
| **≤ 2** | **20** | **← caso de G6.** Condiciones normales |
| 3 o 4 | 28 | Condiciones adversas, sobrecosto del 40 % |
| ≥ 5 | — | **Alto riesgo: replantear el proyecto antes de continuar** |

> **FC = 20 horas-hombre por punto ajustado**

> **Lectura del resultado:** el equipo queda justo en el límite superior del tramo favorable. Un solo factor más en zona roja — por ejemplo, que la motivación cayera a 2 — dispararía el FC a 28 y el esfuerzo saltaría de 6,396 a 8,955 horas: **un sobrecosto de Q 326,400 por un solo factor humano**. Es el argumento cuantitativo más fuerte para invertir en el bienestar del equipo.

### 8.3 Cálculo del esfuerzo total

```
Esfuerzo = PCUA × FC
Esfuerzo = 319.82 × 20
Esfuerzo = 6,396.4 horas-hombre
```

> **Esfuerzo total ≈ 6,396 horas-hombre**

**Equivalencias del esfuerzo:**

| Expresado en | Cálculo | Resultado |
|---|---|---|
| Horas-hombre | — | **6,396 h-h** |
| Días-hombre (jornada de 8 h) | 6,396 ÷ 8 | 799.5 días-hombre |
| Meses-hombre (191 h/mes) | 6,396 ÷ 191 | **33.5 meses-hombre** |
| Años-hombre (2,292 h/año) | 6,396 ÷ 2,292 | 2.79 años-hombre |

### 8.4 Distribución del esfuerzo por fase

El método distribuye el esfuerzo total según proporciones típicas del ciclo de vida:

| Fase | % | Horas-hombre | Días-hombre | Qué incluye |
|---|---|---|---|---|
| Análisis | 10 % | **639.6** | 80.0 | Casos de uso, historias de usuario, modelo de dominio, reglas de negocio |
| Diseño | 20 % | **1,279.2** | 159.9 | Esquema de BD, contratos de API, mockups, arquitectura, diseño de pantallas |
| Implementación | 40 % | **2,558.4** | 319.8 | Controladores, modelos, pantallas Expo, migraciones, integraciones |
| Pruebas | 15 % | **959.4** | 119.9 | Suite PHPUnit, pruebas de integración, pruebas de aceptación (UAT) |
| Otras | 15 % | **959.4** | 119.9 | Docker, despliegue, documentación, reuniones, sprint reviews, gestión |
| **Total** | **100 %** | **6,396.0** | **799.5** | |

### 8.5 Distribución del esfuerzo por módulo

Se reparte el esfuerzo total en proporción al peso funcional de cada módulo (sección 3.6):

| Módulo | Puntos | % | Horas-hombre | Meses-hombre |
|---|---|---|---|---|
| M4 — Marketplace de demanda | 70 | 24.6 % | **1,570.9** | 8.2 |
| M3 — Ciclo de vida del servicio | 55 | 19.3 % | **1,234.3** | 6.5 |
| M5 — Créditos y pagos | 40 | 14.0 % | **897.7** | 4.7 |
| M1 — Cuenta y perfil | 35 | 12.3 % | **785.4** | 4.1 |
| M2 — Catálogo y disponibilidad | 35 | 12.3 % | **785.4** | 4.1 |
| M6 — Comunicación | 20 | 7.0 % | **448.8** | 2.3 |
| M8 — Administración | 20 | 7.0 % | **448.8** | 2.3 |
| M7 — Reputación | 10 | 3.5 % | **224.4** | 1.2 |
| **Total** | **285** | **100 %** | **6,396.0** | **33.5** |

---

## 9. Costo — desglose completo

### 9.1 La fórmula del método

```
Costo = Esfuerzo × Coeficiente indirecto × Tarifa por hora
```

Esta fórmula tiene tres piezas que hay que construir por separado. Se arma de abajo hacia arriba, en cuatro capas:

```
┌──────────────────────────────────────────────────────────┐
│ CAPA 4 · Margen comercial (solo si se vende a un cliente)│  ← precio de venta
├──────────────────────────────────────────────────────────┤
│ CAPA 3 · Costos indirectos                               │  ← infra, licencias, gestión
├──────────────────────────────────────────────────────────┤
│ CAPA 2 · Cargas patronales y prestaciones de ley         │  ← IGSS, aguinaldo, Bono 14…
├──────────────────────────────────────────────────────────┤
│ CAPA 1 · Salario nominal                                 │  ← lo que el dev ve en su boleta
└──────────────────────────────────────────────────────────┘
```

### 9.2 CAPA 1 — Salario nominal y mezcla de roles

Un proyecto no lo hace un solo perfil. El salario base es un **promedio ponderado** de la mezcla real de roles necesaria:

| Rol | FTE | Salario nominal mensual | Aporte ponderado | Responsabilidad en ServiGT |
|---|---|---|---|---|
| Líder técnico / analista | 1.0 | Q 18,000 | Q 18,000 | Arquitectura, casos de uso, revisión de PRs |
| Desarrollador backend (Laravel) | 1.5 | Q 13,000 | Q 19,500 | API, modelos, lógica de créditos y estados |
| Desarrollador frontend (Expo/RN) | 1.5 | Q 12,000 | Q 18,000 | Pantallas web y móvil, navegación, componentes |
| QA / tester | 0.5 | Q 10,000 | Q 5,000 | Suite PHPUnit, pruebas de integración, UAT |
| DevOps / base de datos | 0.5 | Q 14,000 | Q 7,000 | Docker, esquema PostgreSQL, despliegue, respaldos |
| **Total del equipo** | **5.0** | | **Q 67,500** | |

```
Salario nominal promedio ponderado = Q 67,500 ÷ 5.0 FTE = Q 13,500 mensuales
```

> **Salario nominal base de cálculo: Q 13,500 mensuales**

### 9.3 CAPA 2 — Cargas patronales y prestaciones de ley (Guatemala)

Lo que un empleado cuesta **no** es lo que aparece en su boleta de pago. Sobre el salario nominal se acumulan cuotas patronales obligatorias y prestaciones que hay que provisionar mes a mes:

| Concepto | Base legal | Tasa | Monto mensual |
|---|---|---|---|
| **Salario nominal** | Contrato | — | **Q 13,500.00** |
| Bonificación incentivo | Decreto 78-89 | fija | Q 250.00 |
| IGSS cuota patronal | Ley Orgánica del IGSS | 12.67 % | Q 1,710.45 |
| IRTRA | Decreto 43-92 | 1.00 % | Q 135.00 |
| INTECAP | Decreto 17-72 | 1.00 % | Q 135.00 |
| Aguinaldo (provisión 1/12) | Decreto 76-78 | 8.33 % | Q 1,125.00 |
| Bono 14 (provisión 1/12) | Decreto 42-92 | 8.33 % | Q 1,125.00 |
| Indemnización (provisión 1/12) | Código de Trabajo, Art. 82 | 8.33 % | Q 1,125.00 |
| Vacaciones — 15 días hábiles (provisión 1/12) | Código de Trabajo, Art. 130 | 4.17 % | Q 562.50 |
| **Costo laboral total mensual** | | | **Q 19,667.95** |

```
Factor de carga laboral = Q 19,667.95 ÷ Q 13,500.00 = 1.4569
```

> **Cada quetzal de salario nominal cuesta realmente Q 1.46 a la empresa.**

**Conversión a costo por hora:**

| Concepto | Valor | Base |
|---|---|---|
| Jornada ordinaria diurna | 44 h/semana | Código de Trabajo, Art. 116 |
| Semanas promedio por mes | 4.33 | 52 semanas ÷ 12 meses |
| **Horas ordinarias por mes** | **191 h** | 44 × 4.33 |
| Costo nominal por hora | Q 70.68 | Q 13,500 ÷ 191 |
| **Costo laboral cargado por hora** | **Q 102.97** | Q 19,667.95 ÷ 191 |

### 9.4 CAPA 3 — Costos indirectos

Son los gastos que la empresa incurre para que un desarrollador **pueda** trabajar, pero que no son su salario. Se expresan como costo mensual por persona:

| Concepto | Monto mensual por persona | Detalle |
|---|---|---|
| Infraestructura en la nube | Q 800.00 | Servidor de aplicación, PostgreSQL gestionado, almacenamiento de documentos y fotos, dominios, certificados SSL |
| Licencias y herramientas | Q 400.00 | GitHub, IDE, herramientas de diseño, monitoreo, gestión de proyecto |
| Equipo de cómputo amortizado | Q 333.00 | Laptop de Q 12,000 amortizada a 36 meses |
| Internet y servicios básicos | Q 300.00 | Conectividad, energía, telefonía |
| Espacio y estructura | Q 500.00 | Oficina o subsidio de trabajo remoto |
| Gestión y administración | Q 2,360.15 | 12 % del costo laboral: PM, contabilidad, RRHH, legal |
| **Total de costos indirectos** | **Q 4,693.15** | |

```
Coeficiente indirecto = (Q 19,667.95 + Q 4,693.15) ÷ Q 19,667.95
Coeficiente indirecto = Q 24,361.10 ÷ Q 19,667.95
Coeficiente indirecto = 1.2386
```

> **Coeficiente de costos indirectos = 1.2386** (los indirectos agregan 23.9 % sobre el costo laboral)

### 9.5 Tarifa final por hora-hombre

| Capa | Concepto | Monto mensual | Monto por hora | Acumulado |
|---|---|---|---|---|
| 1 | Salario nominal | Q 13,500.00 | Q 70.68 | Q 70.68 |
| 2 | + Cargas y prestaciones (×1.4569) | Q 6,167.95 | Q 32.29 | **Q 102.97** |
| 3 | + Costos indirectos (×1.2386) | Q 4,693.15 | Q 24.58 | **Q 127.55** |
| | **Costo interno por hora-hombre** | **Q 24,361.10** | | **Q 127.55** |

```
Tarifa por hora-hombre = Q 24,361.10 ÷ 191 h = Q 127.55
```

> **Tarifa interna: Q 127.55 por hora-hombre**

**Composición del quetzal invertido:**

| Destino de cada Q 100 de costo | Monto | % |
|---|---|---|
| Salario neto del desarrollador | Q 55.42 | 55.4 % |
| Cargas patronales y prestaciones de ley | Q 25.31 | 25.3 % |
| Costos indirectos (infra, licencias, gestión) | Q 19.27 | 19.3 % |
| **Total** | **Q 100.00** | **100 %** |

> ⚠️ **Validación humana requerida.** Las tasas de IGSS patronal, IRTRA e INTECAP, el monto de la bonificación incentivo y el tipo de cambio deben confirmarse contra las tablas vigentes del IGSS, el Código de Trabajo y el tipo de cambio de referencia de **Banguat** a la fecha de la propuesta. Los valores aquí usados son de referencia y no sustituyen una revisión contable.

### 9.6 Costo total del proyecto

```
Costo = Esfuerzo × Tarifa por hora-hombre
Costo = 6,396 h-h × Q 127.55
Costo = Q 815,810.00
```

Expresado en la forma del método (separando el coeficiente indirecto):

```
Costo = Esfuerzo × Coeficiente indirecto × Tarifa laboral cargada
Costo = 6,396 × 1.2386 × Q 102.97
Costo = Q 815,810.00   ✓ (mismo resultado)
```

Al tipo de cambio de referencia **Q 7.70 / USD 1.00**:

```
Costo ≈ USD 105,949
```

> ## **COSTO TOTAL ESTIMADO: Q 815,810.00 (≈ USD 105,949)**

### 9.7 Costo por fase

| Fase | % | Horas-hombre | Costo (Q) | Costo (USD) |
|---|---|---|---|---|
| Análisis | 10 % | 639.6 | **Q 81,581** | USD 10,595 |
| Diseño | 20 % | 1,279.2 | **Q 163,162** | USD 21,190 |
| Implementación | 40 % | 2,558.4 | **Q 326,324** | USD 42,380 |
| Pruebas | 15 % | 959.4 | **Q 122,371** | USD 15,892 |
| Otras (gestión, despliegue, doc.) | 15 % | 959.4 | **Q 122,371** | USD 15,892 |
| **Total** | **100 %** | **6,396.0** | **Q 815,810** | **USD 105,949** |

> **Lectura del resultado:** solo el 40 % del presupuesto se va en escribir código. El otro 60 % — Q 489,486 — se consume en entender el problema, diseñarlo, probarlo y operarlo. Es el error de presupuestación más común en proyectos pequeños: cotizar únicamente la implementación.

### 9.8 Costo por módulo funcional

| Módulo | Puntos | Horas-hombre | Costo (Q) | Costo (USD) | % del presupuesto |
|---|---|---|---|---|---|
| M4 — Marketplace de demanda | 70 | 1,570.9 | **Q 200,367** | USD 26,022 | 24.6 % |
| M3 — Ciclo de vida del servicio | 55 | 1,234.3 | **Q 157,436** | USD 20,446 | 19.3 % |
| M5 — Créditos y pagos | 40 | 897.7 | **Q 114,503** | USD 14,870 | 14.0 % |
| M1 — Cuenta y perfil | 35 | 785.4 | **Q 100,178** | USD 13,010 | 12.3 % |
| M2 — Catálogo y disponibilidad | 35 | 785.4 | **Q 100,178** | USD 13,010 | 12.3 % |
| M6 — Comunicación | 20 | 448.8 | **Q 57,244** | USD 7,434 | 7.0 % |
| M8 — Administración | 20 | 448.8 | **Q 57,244** | USD 7,434 | 7.0 % |
| M7 — Reputación | 10 | 224.4 | **Q 28,622** | USD 3,717 | 3.5 % |
| **Total** | **285** | **6,396.0** | **Q 815,810** | **USD 105,949** | **100 %** |

*(Diferencias menores por redondeo.)*

### 9.9 Costos unitarios de referencia

Estos indicadores sirven para cotizar cambios de alcance sin rehacer toda la estimación:

| Indicador | Cálculo | Valor |
|---|---|---|
| Costo por hora-hombre | — | **Q 127.55** |
| Costo por punto de caso de uso ajustado | Q 815,810 ÷ 319.82 | **Q 2,551** |
| Costo de un caso de uso **simple** (5 pts) | 5 × 1.075 × 0.995 × 20 × 127.55 | **Q 13,644** |
| Costo de un caso de uso **medio** (10 pts) | 10 × 1.075 × 0.995 × 20 × 127.55 | **Q 27,288** |
| Costo de un caso de uso **complejo** (15 pts) | 15 × 1.075 × 0.995 × 20 × 127.55 | **Q 40,932** |
| Costo de agregar un **actor complejo** (3 pts) | 3 × 1.075 × 0.995 × 20 × 127.55 | **Q 8,186** |
| Costo promedio por caso de uso | Q 815,810 ÷ 29 | Q 28,131 |

> **Uso práctico:** si el cliente pide un caso de uso medio adicional a mitad del proyecto, la cotización de ese cambio es **Q 27,288** — y ese número sale de la estimación, no de una negociación improvisada.

### 9.10 Análisis de sensibilidad

Ninguna estimación es un número único. Estos son los dos parámetros con mayor incertidumbre.

**A) Sensibilidad al Factor de Conversión (FC)**

| Escenario | FC | Esfuerzo (h-h) | Costo (Q) | Costo (USD) | Cuándo aplica |
|---|---|---|---|---|---|
| Optimista | 15 | 4,797 | **Q 611,895** | USD 79,467 | Equipo experimentado, requerimientos congelados desde el inicio |
| **Base (Karner)** | **20** | **6,396** | **Q 815,810** | **USD 105,949** | **Escenario recomendado para la propuesta** |
| Pesimista | 28 | 8,955 | **Q 1,142,210** | USD 148,339 | Rotación de personal o cambios significativos de alcance |

**B) Sensibilidad a la mezcla de seniority del equipo**

| Perfil del equipo | Salario nominal promedio | Tarifa/hora | Costo total (Q) | Variación |
|---|---|---|---|---|
| Predominantemente junior | Q 9,500 | Q 89.76 | **Q 574,105** | −29.6 % |
| **Mezcla semi-senior (base)** | **Q 13,500** | **Q 127.55** | **Q 815,810** | **—** |
| Predominantemente senior | Q 19,000 | Q 179.51 | **Q 1,148,146** | +40.7 % |

> **Rango completo de la estimación: Q 574,000 a Q 1,148,000.** La cifra a presentar como propuesta formal es la base.

### 9.11 Presupuesto propuesto

| Concepto | Monto (Q) | Monto (USD) |
|---|---|---|
| Costo directo estimado | Q 815,810 | USD 105,949 |
| Reserva de contingencia (15 %) | Q 122,372 | USD 15,892 |
| **Techo presupuestario interno** | **Q 938,182** | **USD 121,842** |
| Margen comercial (25 % sobre el costo) | Q 203,953 | USD 26,487 |
| **Precio de venta al cliente** | **Q 1,019,763** | **USD 132,437** |

> La **reserva de contingencia** cubre riesgos identificados (cambios de alcance, incidentes técnicos). El **margen comercial** es la utilidad de la empresa y solo aplica si el proyecto se vende a un tercero; para un desarrollo interno se presupuesta hasta el techo interno.

---

## 10. Tiempo de desarrollo

> El tiempo **no es un tema aparte** de los costos: el método PCU produce **esfuerzo**, y tanto el costo como el tiempo son dos lecturas del mismo número. El costo lo multiplica por una tarifa; el tiempo lo divide entre las personas disponibles.

### 10.1 Fórmula base

```
Tiempo = Esfuerzo ÷ cantidad de personas
```

### 10.2 Escenarios de calendario

| Escenario | Personas | Dedicación c/u | Capacidad semanal | Duración |
|---|---|---|---|---|
| **A — Equipo académico G6 (real)** | 7 | ~12 h/semana | 84 h | **76 semanas ≈ 17.5 meses** |
| **B — Equipo comercial reducido** | 5 | 44 h/semana | 220 h | **29 semanas ≈ 6.7 meses** |
| **C — Equipo comercial ampliado** | 7 | 44 h/semana | 308 h | **21 semanas ≈ 4.8 meses** |

### 10.3 Contraste con COCOMO básico (modelo orgánico)

La división lineal del escenario C ignora que agregar personas agrega costo de comunicación (Ley de Brooks). COCOMO corrige eso con una relación no lineal:

```
Esfuerzo en meses-persona: 6,396 h ÷ 191 h/mes = 33.5 MP

TDEV = 2.5 × (MP)^0.38
TDEV = 2.5 × (33.5)^0.38
TDEV = 2.5 × 3.80
TDEV = 9.5 meses

Personal promedio = 33.5 MP ÷ 9.5 meses ≈ 3.5 personas a tiempo completo
```

| Modelo | Duración | Personal |
|---|---|---|
| PCU lineal, 5 personas | 6.7 meses | 5 FTE constantes |
| PCU lineal, 7 personas | 4.8 meses | 7 FTE constantes |
| **COCOMO básico orgánico** | **9.5 meses** | **3.5 FTE promedio** |

> **Conclusión del contraste:** el rango realista de duración a tiempo completo es de **7 a 9.5 meses**. Comprimirlo por debajo de 6 meses agregando más personal **no** reduce el calendario proporcionalmente: solo incrementa el costo de coordinación. Ese es el valor de cruzar dos métodos — uno solo daría una falsa precisión.

### 10.4 Cronograma propuesto (escenario B — 5 personas a tiempo completo)

| Fase | Horas | Semanas | Sem. acumulada | Hito de salida |
|---|---|---|---|---|
| Análisis | 639.6 | 2.9 | Sem. 3 | Catálogo de casos de uso aprobado por el cliente |
| Diseño | 1,279.2 | 5.8 | Sem. 9 | Esquema de BD y contrato de API congelados |
| Implementación | 2,558.4 | 11.6 | Sem. 21 | Todos los módulos funcionales en ambiente de pruebas |
| Pruebas | 959.4 | 4.4 | Sem. 25 | Suite automatizada en verde + UAT firmado |
| Otras (despliegue, doc., gestión) | 959.4 | 4.4 | Sem. 29 | Producción en línea y manuales entregados |
| **Total** | **6,396** | **29.1** | | **≈ 6.7 meses** |

### 10.5 Cronograma real ejecutado por el grupo G6

*(Reconstruido del historial de Git del repositorio.)*

| Sprint | Periodo | Commits | Alcance entregado |
|---|---|---|---|
| Arranque | 31 ene – feb 2026 | 12 | Definición del equipo, repositorio, documento de proyecto |
| Sprints 1–2 | abril 2026 | 49 | Docker Compose, autenticación Sanctum, perfiles de proveedor, catálogo, disponibilidad |
| Sprints 3–4 | mayo 2026 | 57 | Ciclo de vida del servicio con códigos, chat, marketplace de pedidos, cotizaciones, notificaciones |
| Sprint 5 | julio 2026 | 14 | Sistema de créditos, aceptación de cotizaciones, pruebas PHPUnit, consolidación del esquema |
| **Total** | **~24 semanas** | **132 commits, 19 merges** | **MVP funcional** |

### 10.6 Conciliación: estimación contra capacidad real

| Concepto | Valor |
|---|---|
| Esfuerzo estimado para el producto completo | **6,396 h-h** |
| Capacidad real del equipo (7 personas × 12 h/sem × 24 sem) | **2,016 h-h** |
| Cobertura de la capacidad sobre el alcance total | **31.5 %** |
| Déficit de esfuerzo | **4,380 h-h** |
| Costo equivalente del déficit | Q 558,669 |

**Lectura del resultado.** La estimación no está equivocada: **confirma cuantitativamente** que el alcance comercial completo de ServiGT es aproximadamente **tres veces mayor** que la capacidad de un equipo académico en un semestre. Ese es exactamente el tipo de conclusión para la que sirve estimar antes de empezar.

Por eso el entregable del curso es un **MVP** que cubre el núcleo del negocio (registro, catálogo, ciclo del servicio, marketplace de cotizaciones y créditos) y deja fuera de forma consciente:

| Fuera del MVP | Esfuerzo diferido | Costo diferido |
|---|---|---|
| CU-24 — Pasarela de pago con tarjeta | 300 h-h | Q 38,265 |
| Aplicación móvil nativa publicada en tiendas | 400 h-h | Q 51,020 |
| Endurecimiento de seguridad y auditoría | 250 h-h | Q 31,888 |
| Panel analítico avanzado y reportería | 200 h-h | Q 25,510 |
| Pruebas de carga y optimización de rendimiento | 180 h-h | Q 22,959 |
| **Total diferido** | **1,330 h-h** | **Q 169,642** |

---

## 11. Resumen ejecutivo

### 11.1 Cadena completa de cálculo

| # | Concepto | Fórmula | Resultado |
|---|---|---|---|
| 1 | Factor de Peso de Actores | (4×3) + (0×2) + (2×1) | **FPA = 14** |
| 2 | Factor de Peso de Casos de Uso | (4×5) + (22×10) + (3×15) | **FPCU = 285** |
| 3 | Puntos de Casos de Uso | 14 + 285 | **PCU = 299** |
| 4 | Factor de Complejidad Técnica | 0.6 + 0.01 × 47.5 | **FCT = 1.075** |
| 5 | Factor de Ambiente | 1.4 − 0.03 × 13.5 | **FA = 0.995** |
| 6 | Puntos Ajustados | 299 × 1.075 × 0.995 | **PCUA = 319.82** |
| 7 | Factor de Conversión | 2 factores desfavorables → tramo ≤2 | **FC = 20 h-h/pto** |
| 8 | **Esfuerzo** | 319.82 × 20 | **6,396 horas-hombre** |
| 9 | Tarifa por hora-hombre | Q 24,361.10 ÷ 191 h | **Q 127.55** |
| 10 | **Costo** | 6,396 × 127.55 | **Q 815,810 (USD 105,949)** |
| 11 | **Tiempo** | 6,396 ÷ (5 personas × 44 h/sem) | **29 semanas ≈ 6.7 meses** |

### 11.2 Cifras de decisión

| Indicador | Valor |
|---|---|
| Tamaño funcional ajustado | 319.82 PCUA |
| Esfuerzo total | 6,396 h-h (33.5 meses-persona) |
| **Costo directo estimado** | **Q 815,810** |
| Reserva de contingencia (15 %) | Q 122,372 |
| **Techo presupuestario interno** | **Q 938,182** |
| Precio de venta con margen del 25 % | Q 1,019,763 |
| Rango de sensibilidad | Q 574,000 – Q 1,148,000 |
| **Duración a tiempo completo (5 personas)** | **6.7 meses** |
| Duración según COCOMO orgánico | 9.5 meses con 3.5 FTE |
| Duración con la capacidad real de G6 | 17.5 meses → se entrega MVP en 6 meses |

### 11.3 Los cinco hallazgos de la estimación

1. **El 86 % del peso de los actores son personas frente a pantallas.** ServiGT es un producto dominado por la interfaz, no por integraciones. El presupuesto de frontend debe reflejarlo.

2. **La arquitectura pesa 14 veces más que el equipo.** El FCT agrega 22.4 puntos y el FA devuelve apenas 1.6. Las decisiones de portabilidad multiplataforma y contenedores son el principal motor de costo.

3. **El marketplace de demanda concentra el 24.6 % del sistema** y 2 de los 3 casos de uso complejos. Es donde debe concentrarse la revisión de diseño y la cobertura de pruebas.

4. **Solo el 40 % del presupuesto es codificación.** Q 489,486 de los Q 815,810 se consumen fuera del teclado. Cotizar solo la implementación subestima el proyecto en un 150 %.

5. **Un solo factor humano vale Q 326,400.** Si la motivación del equipo cayera lo suficiente para sumar un tercer factor desfavorable, el FC saltaría de 20 a 28 y el esfuerzo pasaría de 6,396 a 8,955 horas.

---

## 12. Supuestos y limitaciones

1. La estimación considera el **producto comercial completo**, incluida la pasarela de pago aún no implementada (CU-24 y actor A6).
2. La tarifa de **Q 127.55/hora-hombre** corresponde a la mezcla de roles de la sección 9.2. Un equipo con distinta composición desplaza el resultado hasta ±40 % (sección 9.10-B).
3. Los porcentajes de cuotas patronales, la bonificación incentivo y el tipo de cambio **requieren validación humana** contra las tablas vigentes del IGSS, el Código de Trabajo y el tipo de cambio de referencia de Banguat antes de usarse en una propuesta formal.
4. El método PCU asume requerimientos razonablemente estables. Cada cambio mayor de alcance obliga a recalcular desde el conteo de casos de uso; los costos unitarios de la sección 9.9 permiten cotizar cambios menores sin rehacer el ejercicio.
5. El conteo de transacciones se derivó del código fuente (`backend/routes/api.php`, controladores de `backend/app/Http/Controllers/`, esquema `database/init.sql` y pantallas de `frontend/src/screens/`) y refleja únicamente el **flujo principal** de cada caso de uso, sin contar flujos alternos ni de excepción.
6. No se incluyen costos posteriores a la entrega: hosting en producción, dominios, soporte a usuarios ni mantenimiento evolutivo.
7. La distribución del esfuerzo por módulo (sección 8.5) asume que el peso funcional es un proxy proporcional del esfuerzo real, lo cual es una aproximación: módulos con alta complejidad algorítmica pueden desviarse de esa proporción.
