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
    "CREATE INDEX IF NOT EXISTS idx_docs_proveedor_id ON documentos_proveedores (proveedor_id)",
    "CREATE INDEX IF NOT EXISTS idx_proveedores_user_id ON proveedores (user_id)",
    "CREATE INDEX IF NOT EXISTS idx_proveedores_categoria_id ON proveedores (categoria_id)",
    "CREATE INDEX IF NOT EXISTS idx_proveedores_departamento ON proveedores (departamento)",
    "CREATE INDEX IF NOT EXISTS idx_disponibilidad_proveedor ON disponibilidad (proveedor_id)",
];

foreach ($statements as $statement) {
    $pdo->exec($statement);
}

echo "[*] Esquema PostgreSQL sincronizado.\n";
