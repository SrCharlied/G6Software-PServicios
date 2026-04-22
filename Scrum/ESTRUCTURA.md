# Estructura del Proyecto - ServiGT Guatemala

## Raiz del proyecto (`/Scrum`)

```
Scrum/
├── docker-compose.yml    # Orquestador de todos los servicios
├── backend/              # API REST (Laravel PHP)
├── frontend/             # Interfaz de usuario (React Native / Expo Web)
└── ESTRUCTURA.md         # Este archivo
```

### `docker-compose.yml`
Define y conecta los 3 servicios del proyecto:
- **db** (PostgreSQL 16) - Base de datos en puerto `5432`
- **backend** (Laravel) - API REST en puerto `8000`
- **frontend** (Expo Web) - Interfaz en puerto `8081`

Configura las variables de entorno, dependencias entre servicios (el backend espera a que la BD este sana antes de iniciar), y el volumen persistente para los datos de PostgreSQL.

---

## Backend (`/backend`) - API REST Laravel

```
backend/
├── Dockerfile                          # Imagen Docker del backend
├── .dockerignore                       # Archivos excluidos del build
├── docker/
│   └── entrypoint.sh                   # Script de inicio del contenedor
├── bootstrap/
│   └── app.php                         # Configuracion principal de Laravel
├── config/
│   └── cors.php                        # Configuracion CORS (permite peticiones del frontend)
├── routes/
│   └── api.php                         # Definicion de todas las rutas/endpoints de la API
├── app/
│   ├── Http/Controllers/
│   │   ├── HealthController.php        # Endpoint de salud del sistema
│   │   ├── CategoriaController.php     # Controlador de categorias (lectura)
│   │   └── ProveedorController.php     # Controlador de proveedores (CRUD completo)
│   └── Models/
│       ├── Categoria.php               # Modelo Eloquent de categorias
│       └── Proveedor.php               # Modelo Eloquent de proveedores
└── database/
    ├── migrations/
    │   ├── 2024_01_01_000001_create_categorias_table.php   # Crea tabla categorias
    │   └── 2024_01_01_000002_create_proveedores_table.php  # Crea tabla proveedores
    └── seeders/
        └── DatabaseSeeder.php          # Datos iniciales (8 categorias + 10 proveedores)
```

### Detalle de cada archivo:

#### `Dockerfile`
Construye la imagen del backend. Usa PHP 8.3, instala las extensiones necesarias para PostgreSQL (`pdo_pgsql`), instala Composer, crea un proyecto Laravel limpio, y luego copia encima los archivos personalizados del proyecto (rutas, controladores, modelos, migraciones, etc.).

#### `docker/entrypoint.sh`
Script que se ejecuta cada vez que el contenedor inicia:
1. Genera el archivo `.env` de Laravel a partir de las variables de entorno de Docker
2. Ejecuta las migraciones de base de datos (crea las tablas)
3. Ejecuta el seeder (carga datos de prueba)
4. Limpia la cache de Laravel
5. Inicia el servidor de desarrollo en el puerto 8000

#### `bootstrap/app.php`
Configuracion central de Laravel. Define:
- Que archivo de rutas usar (`routes/api.php` para la API)
- Configuracion de middleware
- Manejo de excepciones

#### `config/cors.php`
Permite que el frontend (en puerto 8081) haga peticiones al backend (puerto 8000). Sin esto, el navegador bloquearia las peticiones por politica de seguridad "Same-Origin". Actualmente permite todos los origenes (`*`).

#### `routes/api.php`
Define todos los endpoints disponibles de la API:

| Metodo | Ruta | Controlador | Descripcion |
|--------|------|-------------|-------------|
| GET | `/api/health` | HealthController@check | Estado del sistema |
| GET | `/api/categorias` | CategoriaController@index | Listar categorias |
| GET | `/api/categorias/{id}` | CategoriaController@show | Ver una categoria |
| GET | `/api/proveedores` | ProveedorController@index | Listar proveedores |
| GET | `/api/proveedores/{id}` | ProveedorController@show | Ver un proveedor |
| POST | `/api/proveedores` | ProveedorController@store | Crear proveedor |
| PUT | `/api/proveedores/{id}` | ProveedorController@update | Actualizar proveedor |
| DELETE | `/api/proveedores/{id}` | ProveedorController@destroy | Eliminar proveedor |

#### `HealthController.php`
Endpoint simple que verifica:
- Que el backend esta respondiendo
- Que la conexion a PostgreSQL funciona
- Devuelve el estado en formato JSON

#### `CategoriaController.php`
- `index()`: Devuelve todas las categorias con el conteo de proveedores que tiene cada una
- `show()`: Devuelve una categoria especifica con todos sus proveedores

#### `ProveedorController.php`
CRUD completo:
- `index()`: Lista todos los proveedores con su categoria
- `show()`: Muestra un proveedor especifico
- `store()`: Crea un nuevo proveedor (valida campos requeridos, email unico, etc.)
- `update()`: Actualiza un proveedor existente
- `destroy()`: Elimina un proveedor

#### `Categoria.php` (Modelo)
Representa la tabla `categorias`. Campos: `nombre`, `descripcion`, `icono`. Tiene relacion "uno a muchos" con proveedores (una categoria tiene muchos proveedores).

#### `Proveedor.php` (Modelo)
Representa la tabla `proveedores`. Campos: `nombre`, `email`, `telefono`, `descripcion`, `departamento`, `municipio`, `categoria_id`. Tiene relacion "muchos a uno" con categoria (cada proveedor pertenece a una categoria).

#### Migraciones
Definen la estructura de las tablas en la base de datos:
- **categorias**: id, nombre, descripcion, icono, timestamps
- **proveedores**: id, nombre, email (unico), telefono, descripcion, departamento, municipio, categoria_id (llave foranea a categorias), timestamps

#### `DatabaseSeeder.php`
Carga datos iniciales de prueba:
- 8 categorias de servicios: Plomeria, Electricidad, Carpinteria, Limpieza, Jardineria, Tecnologia, Albanileria, Transporte
- 10 proveedores de ejemplo distribuidos en diferentes departamentos de Guatemala

---

## Frontend (`/frontend`) - React Native / Expo Web

```
frontend/
├── Dockerfile              # Imagen Docker del frontend
├── .dockerignore            # Archivos excluidos del build
├── package.json            # Dependencias y scripts de npm
├── app.json                # Configuracion de Expo
├── babel.config.js         # Configuracion de Babel (transpilador JS)
├── assets/                 # (vacio) Para imagenes, iconos, fuentes
├── src/
│   ├── App.js              # Aplicacion principal (toda la UI)
│   ├── components/         # (vacio) Para componentes reutilizables
│   └── screens/            # (vacio) Para pantallas individuales
```

### Detalle de cada archivo:

#### `Dockerfile`
Usa Node.js 20 Alpine. Copia el `package.json`, instala dependencias con `npm install`, copia el resto del proyecto, y arranca Expo en modo web en el puerto 8081.

#### `package.json`
Define las dependencias del proyecto:
- **expo** (v52): Framework para React Native
- **react** (v18.3): Libreria de UI
- **react-native** (v0.76): Framework mobile (con soporte web via Expo)

Scripts disponibles: `start`, `web`, `android`, `ios`.

#### `app.json`
Configuracion de Expo:
- Nombre de la app: "ServiGT Guatemala"
- Plataformas: iOS, Android, Web
- Puerto del bundler: 8081
- Color de barra de estado: azul (#1a73e8)

#### `babel.config.js`
Configuracion basica del transpilador Babel con el preset de Expo. Convierte el codigo JSX/moderno a JavaScript compatible con navegadores.

#### `src/App.js`
Es el archivo principal y actualmente contiene TODA la logica del frontend en un solo archivo:

**Conexion con el backend:**
- Hace 3 peticiones paralelas al iniciar: `/api/health`, `/api/categorias`, `/api/proveedores`
- URL de la API: `http://localhost:8000/api` (web) o `http://10.0.2.2:8000/api` (emulador Android)

**Estados que maneja:**
- `health`: Estado de conexion del backend
- `categorias`: Lista de categorias de servicios
- `proveedores`: Lista de proveedores
- `selectedCat`: Categoria seleccionada para filtrar
- `loading`: Indicador de carga
- `error`: Mensaje de error si falla la conexion

**Pantallas:**
1. **Cargando**: Spinner con texto "Conectando con ServiGT..."
2. **Error**: Mensaje de error con boton de reintentar
3. **Principal**: Header azul + tarjeta de estado del sistema + chips de categorias (filtro horizontal) + tarjetas de proveedores con nombre, categoria, descripcion, ubicacion y telefono

---

## Flujo completo de la aplicacion

```
1. docker compose up
   ├── PostgreSQL inicia y se marca como "healthy"
   ├── Backend inicia:
   │   ├── Genera .env
   │   ├── Corre migraciones (crea tablas)
   │   ├── Corre seeders (carga datos de prueba)
   │   └── Inicia servidor en :8000
   └── Frontend inicia:
       └── Expo sirve la app web en :8081

2. Usuario abre http://localhost:8081
   └── App.js carga y hace fetch() a:
       ├── GET /api/health      → Muestra estado del sistema
       ├── GET /api/categorias  → Muestra chips de filtro
       └── GET /api/proveedores → Muestra tarjetas de proveedores

3. Usuario interactua:
   └── Puede filtrar proveedores por categoria usando los chips
```
