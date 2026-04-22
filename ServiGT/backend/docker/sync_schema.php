<?php

declare(strict_types=1);

$host = getenv('DB_HOST') ?: 'db';
$port = getenv('DB_PORT') ?: '5432';
$database = getenv('DB_DATABASE') ?: 'pservicios';
$username = getenv('DB_USERNAME') ?: 'pservicios_user';
$password = getenv('DB_PASSWORD') ?: 'pservicios_secret';

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

echo "[*] Esquema PostgreSQL sincronizado.\n";
