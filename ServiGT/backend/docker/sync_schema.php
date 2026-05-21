<?php

declare(strict_types=1);

$host = getenv('DB_HOST') ?: 'db';
$port = getenv('DB_PORT') ?: '5432';
$database = getenv('DB_DATABASE') ?: 'servigt';
$username = getenv('DB_USERNAME') ?: 'servigt_user';
$password = getenv('DB_PASSWORD') ?: 'servigt_secret';

$dsn = sprintf('pgsql:host=%s;port=%s;dbname=%s', $host, $port, $database);

$attempts = 0;
$maxAttempts = 20;

while (true) {
    try {
        $pdo = new PDO($dsn, $username, $password, [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        ]);
        break;
    } catch (Throwable $e) {
        $attempts++;
        if ($attempts >= $maxAttempts) {
            fwrite(STDERR, "[!] No se pudo conectar a PostgreSQL para sincronizar esquema: {$e->getMessage()}\n");
            exit(1);
        }

        sleep(1);
    }
}

$statements = [
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS telefono VARCHAR(20)",
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS foto_perfil VARCHAR(500)",
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS documento_verificado BOOLEAN NOT NULL DEFAULT FALSE",
    "CREATE TABLE IF NOT EXISTS personal_access_tokens (
        id BIGSERIAL PRIMARY KEY,
        tokenable_type VARCHAR(255) NOT NULL,
        tokenable_id BIGINT NOT NULL,
        name VARCHAR(255) NOT NULL,
        token VARCHAR(64) NOT NULL UNIQUE,
        abilities TEXT,
        last_used_at TIMESTAMP WITHOUT TIME ZONE,
        expires_at TIMESTAMP WITHOUT TIME ZONE,
        created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
    )",
    "CREATE INDEX IF NOT EXISTS idx_pat_tokenable ON personal_access_tokens (tokenable_type, tokenable_id)",
    "ALTER TABLE proveedores ADD COLUMN IF NOT EXISTS user_id BIGINT",
    "ALTER TABLE proveedores ADD COLUMN IF NOT EXISTS foto_perfil VARCHAR(500)",
    "ALTER TABLE proveedores ADD COLUMN IF NOT EXISTS tarifa_hora DECIMAL(10,2)",
    "ALTER TABLE proveedores ADD COLUMN IF NOT EXISTS tarifa_proyecto DECIMAL(10,2)",
    "ALTER TABLE proveedores ADD COLUMN IF NOT EXISTS calificacion_promedio DECIMAL(3,2) NOT NULL DEFAULT 0.00",
    "ALTER TABLE proveedores ADD COLUMN IF NOT EXISTS total_calificaciones INT NOT NULL DEFAULT 0",
    "ALTER TABLE proveedores ADD COLUMN IF NOT EXISTS nivel VARCHAR(20) NOT NULL DEFAULT 'novato'",
    "CREATE TABLE IF NOT EXISTS documentos_proveedores (
        id BIGSERIAL PRIMARY KEY,
        proveedor_id BIGINT NOT NULL REFERENCES proveedores(id) ON DELETE CASCADE,
        tipo_documento VARCHAR(100) NOT NULL,
        nombre_archivo VARCHAR(500) NOT NULL,
        ruta_archivo VARCHAR(500) NOT NULL,
        estado_validacion VARCHAR(20) NOT NULL DEFAULT 'pendiente',
        created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
    )",
    "CREATE TABLE IF NOT EXISTS proveedor_categorias (
        proveedor_id BIGINT NOT NULL REFERENCES proveedores(id) ON DELETE CASCADE,
        categoria_id BIGINT NOT NULL REFERENCES categorias(id) ON DELETE CASCADE,
        PRIMARY KEY (proveedor_id, categoria_id)
    )",
    "CREATE TABLE IF NOT EXISTS disponibilidad (
        id BIGSERIAL PRIMARY KEY,
        proveedor_id BIGINT NOT NULL REFERENCES proveedores(id) ON DELETE CASCADE,
        dia_semana INT NOT NULL CHECK (dia_semana BETWEEN 0 AND 6),
        hora_inicio TIME NOT NULL,
        hora_fin TIME NOT NULL,
        disponible BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE (proveedor_id, dia_semana)
    )",
    "CREATE TABLE IF NOT EXISTS servicios (
        id BIGSERIAL PRIMARY KEY,
        cliente_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        proveedor_id BIGINT NOT NULL REFERENCES proveedores(id) ON DELETE CASCADE,
        categoria_id BIGINT REFERENCES categorias(id) ON DELETE SET NULL,
        descripcion TEXT NOT NULL,
        estado VARCHAR(20) NOT NULL DEFAULT 'pendiente'
            CHECK (estado IN ('pendiente','aceptado','en_camino','en_progreso','completado','cancelado','rechazado')),
        fecha_agendada TIMESTAMP WITHOUT TIME ZONE,
        direccion VARCHAR(500),
        monto_acordado DECIMAL(10,2),
        codigo_inicio VARCHAR(10),
        codigo_fin VARCHAR(10),
        motivo_cancelacion TEXT,
        created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
    )",
    "CREATE TABLE IF NOT EXISTS pagos (
        id BIGSERIAL PRIMARY KEY,
        servicio_id BIGINT NOT NULL REFERENCES servicios(id) ON DELETE CASCADE,
        monto DECIMAL(10,2) NOT NULL,
        metodo_pago VARCHAR(50) NOT NULL DEFAULT 'efectivo'
            CHECK (metodo_pago IN ('efectivo','transferencia','tarjeta')),
        estado VARCHAR(20) NOT NULL DEFAULT 'pendiente'
            CHECK (estado IN ('pendiente','completado','fallido','reembolsado')),
        referencia VARCHAR(255),
        fecha_pago TIMESTAMP WITHOUT TIME ZONE,
        created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
    )",
    "CREATE TABLE IF NOT EXISTS calificaciones (
        id BIGSERIAL PRIMARY KEY,
        servicio_id BIGINT NOT NULL REFERENCES servicios(id) ON DELETE CASCADE,
        autor_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        destinatario_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        puntuacion INT NOT NULL CHECK (puntuacion BETWEEN 1 AND 5),
        comentario TEXT,
        es_verificada BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE (servicio_id, autor_id)
    )",
    "CREATE TABLE IF NOT EXISTS mensajes (
        id BIGSERIAL PRIMARY KEY,
        emisor_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        receptor_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        servicio_id BIGINT REFERENCES servicios(id) ON DELETE SET NULL,
        contenido TEXT NOT NULL CHECK (LENGTH(BTRIM(contenido)) > 0),
        leido BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
    )",
    "CREATE TABLE IF NOT EXISTS notificaciones (
        id BIGSERIAL PRIMARY KEY,
        destinatario_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        tipo VARCHAR(50) NOT NULL,
        titulo VARCHAR(255) NOT NULL,
        mensaje TEXT NOT NULL,
        datos JSONB,
        leida BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
    )",
    "CREATE TABLE IF NOT EXISTS creditos_proveedor (
        proveedor_id BIGINT PRIMARY KEY REFERENCES proveedores(id) ON DELETE CASCADE,
        saldo INT NOT NULL DEFAULT 0 CHECK (saldo >= 0),
        updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
    )",
    "CREATE TABLE IF NOT EXISTS transacciones_credito (
        id BIGSERIAL PRIMARY KEY,
        proveedor_id BIGINT NOT NULL REFERENCES proveedores(id) ON DELETE CASCADE,
        tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('bono','gasto','recarga')),
        monto INT NOT NULL CHECK (monto > 0),
        motivo VARCHAR(255) NOT NULL,
        referencia_id BIGINT,
        created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
    )",
    "CREATE TABLE IF NOT EXISTS pedidos (
        id BIGSERIAL PRIMARY KEY,
        cliente_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        descripcion TEXT NOT NULL,
        categoria_id BIGINT REFERENCES categorias(id) ON DELETE SET NULL,
        direccion VARCHAR(500),
        urgencia VARCHAR(10) NOT NULL DEFAULT 'media'
            CHECK (urgencia IN ('baja','media','alta')),
        estado VARCHAR(20) NOT NULL DEFAULT 'abierto'
            CHECK (estado IN ('abierto','adjudicado','cerrado','expirado')),
        fecha_expiracion TIMESTAMP WITHOUT TIME ZONE NOT NULL,
        created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
    )",
    "CREATE INDEX IF NOT EXISTS idx_docs_proveedor_id ON documentos_proveedores (proveedor_id)",
    "CREATE INDEX IF NOT EXISTS idx_proveedores_user_id ON proveedores (user_id)",
    "CREATE INDEX IF NOT EXISTS idx_proveedores_categoria_id ON proveedores (categoria_id)",
    "CREATE INDEX IF NOT EXISTS idx_proveedores_departamento ON proveedores (departamento)",
    "CREATE INDEX IF NOT EXISTS idx_disponibilidad_proveedor ON disponibilidad (proveedor_id)",
    "CREATE UNIQUE INDEX IF NOT EXISTS idx_proveedores_user_id_unique ON proveedores (user_id) WHERE user_id IS NOT NULL",
    "CREATE INDEX IF NOT EXISTS idx_servicios_cliente ON servicios (cliente_id)",
    "CREATE INDEX IF NOT EXISTS idx_servicios_proveedor ON servicios (proveedor_id)",
    "CREATE INDEX IF NOT EXISTS idx_servicios_estado ON servicios (estado)",
    "CREATE INDEX IF NOT EXISTS idx_pagos_servicio ON pagos (servicio_id)",
    "CREATE INDEX IF NOT EXISTS idx_calif_destinatario ON calificaciones (destinatario_id)",
    "CREATE INDEX IF NOT EXISTS idx_calif_servicio ON calificaciones (servicio_id)",
    "CREATE INDEX IF NOT EXISTS idx_mensajes_emisor_receptor ON mensajes (emisor_id, receptor_id, created_at DESC)",
    "CREATE INDEX IF NOT EXISTS idx_mensajes_servicio ON mensajes (servicio_id)",
    "CREATE INDEX IF NOT EXISTS idx_notif_destinatario ON notificaciones (destinatario_id, leida)",
    "CREATE INDEX IF NOT EXISTS idx_pedidos_cliente ON pedidos (cliente_id)",
    "CREATE INDEX IF NOT EXISTS idx_pedidos_estado ON pedidos (estado)",
    "CREATE INDEX IF NOT EXISTS idx_pedidos_categoria ON pedidos (categoria_id)",
    "CREATE INDEX IF NOT EXISTS idx_trans_cred_proveedor ON transacciones_credito (proveedor_id, created_at DESC)",
];

foreach ($statements as $statement) {
    $pdo->exec($statement);
}

$pdo->exec(<<<'SQL'
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'proveedores_user_id_foreign'
    ) THEN
        ALTER TABLE proveedores
        ADD CONSTRAINT proveedores_user_id_foreign
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
    END IF;
END $$;
SQL);

// ── Seed admin por defecto ─────────────────────────────────────────────────
$adminEmail    = getenv('ADMIN_EMAIL')    ?: 'admin@gmail.com';
$adminPassword = getenv('ADMIN_PASSWORD') ?: 'admin';
$adminName     = getenv('ADMIN_NAME')     ?: 'Administrador ServiGT';

$check = $pdo->prepare('SELECT id FROM users WHERE email = :email LIMIT 1');
$check->execute(['email' => $adminEmail]);
if (!$check->fetch()) {
    $hash = password_hash($adminPassword, PASSWORD_BCRYPT);
    $insert = $pdo->prepare(
        'INSERT INTO users (name, email, password, role) VALUES (:name, :email, :password, :role)'
    );
    $insert->execute([
        'name'     => $adminName,
        'email'    => $adminEmail,
        'password' => $hash,
        'role'     => 'admin',
    ]);
    echo "[*] Admin por defecto creado: {$adminEmail}\n";
}

// ── Seed proveedores de ejemplo ────────────────────────────────────────────
$sampleProviders = [
    ['Juan Perez',      'Plomeria',     'Guatemala',      'Mixco',              '5555-0101', 75.00, 4.8, 'experto',     'Plomero con 15 anos de experiencia en instalaciones residenciales.'],
    ['Maria Lopez',     'Electricidad', 'Sacatepequez',   'Antigua Guatemala',  '5555-0102', 90.00, 4.5, 'experto',     'Electricista certificada, instalaciones y reparaciones.'],
    ['Carlos Ramirez',  'Pintura',      'Quetzaltenango', 'Quetzaltenango',     '5555-0103', 60.00, 4.2, 'intermedio',  'Pintura de interiores y exteriores con acabados finos.'],
    ['Ana Garcia',      'Carpinteria',  'Chimaltenango',  'Chimaltenango',      '5555-0104', 85.00, 4.7, 'experto',     'Muebles a la medida y reparaciones de madera.'],
    ['Luis Morales',    'Limpieza',     'Guatemala',      'Guatemala',          '5555-0105', 45.00, 4.0, 'intermedio',  'Limpieza profunda de hogares y oficinas.'],
    ['Sofia Castillo',  'Jardineria',   'Escuintla',      'Escuintla',          '5555-0106', 50.00, 3.9, 'intermedio',  'Diseno y mantenimiento de jardines.'],
    ['Pedro Vasquez',   'Albanileria',  'Huehuetenango',  'Huehuetenango',      '5555-0107', 70.00, 4.3, 'intermedio',  'Construccion y remodelacion de obra civil.'],
    ['Lucia Mendez',    'Mecanica',     'Izabal',         'Puerto Barrios',     '5555-0108', 80.00, 4.6, 'experto',     'Mecanica automotriz general y diagnostico.'],
    ['Diego Hernandez', 'Tecnologia',   'Guatemala',      'Villa Nueva',        '5555-0109', 95.00, 4.4, 'intermedio',  'Soporte tecnico, redes y reparacion de equipos.'],
    ['Elena Flores',    'Ensenanza',    'Alta Verapaz',   'Coban',              '5555-0110', 55.00, 4.9, 'experto',     'Tutoria academica de matematicas y ciencias.'],
];

$providerPassword = getenv('PROVIDER_SEED_PASSWORD') ?: 'Proveedor123!';
$providerHash = password_hash($providerPassword, PASSWORD_BCRYPT);
$createdProviders = 0;

$findCategoria   = $pdo->prepare('SELECT id FROM categorias WHERE nombre = :nombre LIMIT 1');
$findUserByEmail = $pdo->prepare('SELECT id FROM users WHERE email = :email LIMIT 1');
$insertUser      = $pdo->prepare(
    'INSERT INTO users (name, email, password, role, telefono) VALUES (:name, :email, :password, :role, :telefono) RETURNING id'
);
$insertProveedor = $pdo->prepare(
    'INSERT INTO proveedores (user_id, nombre, email, telefono, descripcion, departamento, municipio, categoria_id, tarifa_hora, calificacion_promedio, nivel)
     VALUES (:user_id, :nombre, :email, :telefono, :descripcion, :departamento, :municipio, :categoria_id, :tarifa_hora, :calificacion, :nivel)'
);

foreach ($sampleProviders as $i => $p) {
    [$name, $categoriaNombre, $departamento, $municipio, $telefono, $tarifa, $calificacion, $nivel, $descripcion] = $p;
    $email = 'proveedor' . ($i + 1) . '@servigt.gt';

    $findUserByEmail->execute(['email' => $email]);
    if ($findUserByEmail->fetch()) {
        continue; // ya existe, no duplicar
    }

    $findCategoria->execute(['nombre' => $categoriaNombre]);
    $categoriaId = $findCategoria->fetchColumn();
    if (!$categoriaId) {
        continue; // categoria no encontrada, saltar
    }

    $insertUser->execute([
        'name'     => $name,
        'email'    => $email,
        'password' => $providerHash,
        'role'     => 'proveedor',
        'telefono' => $telefono,
    ]);
    $userId = $insertUser->fetchColumn();

    $insertProveedor->execute([
        'user_id'      => $userId,
        'nombre'       => $name,
        'email'        => $email,
        'telefono'     => $telefono,
        'descripcion'  => $descripcion,
        'departamento' => $departamento,
        'municipio'    => $municipio,
        'categoria_id' => $categoriaId,
        'tarifa_hora'  => $tarifa,
        'calificacion' => $calificacion,
        'nivel'        => $nivel,
    ]);

    $createdProviders++;
}

if ($createdProviders > 0) {
    echo "[*] Proveedores de ejemplo creados: {$createdProviders} (password: {$providerPassword})\n";
}

echo "[*] Esquema PostgreSQL sincronizado.\n";
