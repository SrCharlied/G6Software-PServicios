-- ============================================================
-- ServiGT Guatemala — Schema completo
-- ============================================================

-- Sanctum tokens
CREATE TABLE IF NOT EXISTS personal_access_tokens (
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
);
CREATE INDEX IF NOT EXISTS idx_pat_tokenable ON personal_access_tokens (tokenable_type, tokenable_id);

-- Usuarios (clientes y proveedores)
CREATE TABLE IF NOT EXISTS users (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('cliente', 'proveedor', 'admin')),
    telefono VARCHAR(20),
    foto_perfil VARCHAR(500),
    documento_verificado BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Categorias de servicio
CREATE TABLE IF NOT EXISTS categorias (
    id BIGSERIAL PRIMARY KEY,
    nombre VARCHAR(255) NOT NULL UNIQUE,
    descripcion TEXT,
    icono VARCHAR(255),
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Perfil de proveedor (extiende users)
CREATE TABLE IF NOT EXISTS proveedores (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    nombre VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    telefono VARCHAR(20),
    descripcion TEXT,
    departamento VARCHAR(100) NOT NULL,
    municipio VARCHAR(100),
    categoria_id BIGINT REFERENCES categorias(id) ON DELETE RESTRICT,
    foto_perfil VARCHAR(500),
    tarifa_hora DECIMAL(10,2),
    tarifa_proyecto DECIMAL(10,2),
    calificacion_promedio DECIMAL(3,2) NOT NULL DEFAULT 0.00,
    total_calificaciones INT NOT NULL DEFAULT 0,
    nivel VARCHAR(20) NOT NULL DEFAULT 'novato' CHECK (nivel IN ('novato','intermedio','experto')),
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_proveedores_user_id ON proveedores (user_id);
CREATE INDEX IF NOT EXISTS idx_proveedores_categoria_id ON proveedores (categoria_id);
CREATE INDEX IF NOT EXISTS idx_proveedores_departamento ON proveedores (departamento);

-- Documentos de identidad del proveedor
CREATE TABLE IF NOT EXISTS documentos_proveedores (
    id BIGSERIAL PRIMARY KEY,
    proveedor_id BIGINT NOT NULL REFERENCES proveedores(id) ON DELETE CASCADE,
    tipo_documento VARCHAR(100) NOT NULL,
    nombre_archivo VARCHAR(500) NOT NULL,
    ruta_archivo VARCHAR(500) NOT NULL,
    estado_validacion VARCHAR(20) NOT NULL DEFAULT 'pendiente'
        CHECK (estado_validacion IN ('pendiente', 'aprobado', 'rechazado')),
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_docs_proveedor_id ON documentos_proveedores (proveedor_id);

-- Categorias adicionales por proveedor (N:M)
CREATE TABLE IF NOT EXISTS proveedor_categorias (
    proveedor_id BIGINT NOT NULL REFERENCES proveedores(id) ON DELETE CASCADE,
    categoria_id BIGINT NOT NULL REFERENCES categorias(id) ON DELETE CASCADE,
    PRIMARY KEY (proveedor_id, categoria_id)
);

-- Disponibilidad semanal del proveedor
CREATE TABLE IF NOT EXISTS disponibilidad (
    id BIGSERIAL PRIMARY KEY,
    proveedor_id BIGINT NOT NULL REFERENCES proveedores(id) ON DELETE CASCADE,
    dia_semana INT NOT NULL CHECK (dia_semana BETWEEN 0 AND 6), -- 0=Dom, 1=Lun...
    hora_inicio TIME NOT NULL,
    hora_fin TIME NOT NULL,
    disponible BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (proveedor_id, dia_semana)
);
CREATE INDEX IF NOT EXISTS idx_disponibilidad_proveedor ON disponibilidad (proveedor_id);

-- Creditos del proveedor (saldo unico por proveedor)
CREATE TABLE IF NOT EXISTS creditos_proveedor (
    proveedor_id BIGINT PRIMARY KEY REFERENCES proveedores(id) ON DELETE CASCADE,
    saldo INT NOT NULL DEFAULT 0 CHECK (saldo >= 0),
    updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Log de movimientos de creditos (auditoria + historial)
CREATE TABLE IF NOT EXISTS transacciones_credito (
    id BIGSERIAL PRIMARY KEY,
    proveedor_id BIGINT NOT NULL REFERENCES proveedores(id) ON DELETE CASCADE,
    tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('bono','gasto','recarga')),
    monto INT NOT NULL CHECK (monto > 0),
    motivo VARCHAR(255) NOT NULL,
    referencia_id BIGINT,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_trans_cred_proveedor ON transacciones_credito (proveedor_id, created_at DESC);

-- Servicios (solicitudes de trabajo)
CREATE TABLE IF NOT EXISTS servicios (
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
);
CREATE INDEX IF NOT EXISTS idx_servicios_cliente ON servicios (cliente_id);
CREATE INDEX IF NOT EXISTS idx_servicios_proveedor ON servicios (proveedor_id);
CREATE INDEX IF NOT EXISTS idx_servicios_estado ON servicios (estado);

-- Pedidos (marketplace de demanda: cliente publica, proveedores cotizan)
CREATE TABLE IF NOT EXISTS pedidos (
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
);
CREATE INDEX IF NOT EXISTS idx_pedidos_cliente ON pedidos (cliente_id);
CREATE INDEX IF NOT EXISTS idx_pedidos_estado ON pedidos (estado);
CREATE INDEX IF NOT EXISTS idx_pedidos_categoria ON pedidos (categoria_id);

-- Cotizaciones (ofertas de proveedores a un pedido del cliente)
CREATE TABLE IF NOT EXISTS cotizaciones (
    id BIGSERIAL PRIMARY KEY,
    pedido_id BIGINT NOT NULL REFERENCES pedidos(id) ON DELETE CASCADE,
    proveedor_id BIGINT NOT NULL REFERENCES proveedores(id) ON DELETE CASCADE,
    monto DECIMAL(10,2) NOT NULL CHECK (monto > 0),
    mensaje TEXT NOT NULL,
    estado VARCHAR(20) NOT NULL DEFAULT 'enviada'
        CHECK (estado IN ('enviada','aceptada','rechazada','retirada')),
    costo_creditos INT NOT NULL DEFAULT 0 CHECK (costo_creditos >= 0),
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_cotizaciones_pedido_proveedor ON cotizaciones (pedido_id, proveedor_id);

-- Pagos
CREATE TABLE IF NOT EXISTS pagos (
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
);
CREATE INDEX IF NOT EXISTS idx_pagos_servicio ON pagos (servicio_id);

-- Calificaciones
CREATE TABLE IF NOT EXISTS calificaciones (
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
);
CREATE INDEX IF NOT EXISTS idx_calif_destinatario ON calificaciones (destinatario_id);
CREATE INDEX IF NOT EXISTS idx_calif_servicio ON calificaciones (servicio_id);

-- Mensajes (chat)
CREATE TABLE IF NOT EXISTS mensajes (
    id BIGSERIAL PRIMARY KEY,
    emisor_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    receptor_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    servicio_id BIGINT REFERENCES servicios(id) ON DELETE SET NULL,
    contenido TEXT NOT NULL CHECK (LENGTH(BTRIM(contenido)) > 0),
    leido BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_mensajes_emisor_receptor ON mensajes (emisor_id, receptor_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_mensajes_servicio ON mensajes (servicio_id);

-- Notificaciones
CREATE TABLE IF NOT EXISTS notificaciones (
    id BIGSERIAL PRIMARY KEY,
    destinatario_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    tipo VARCHAR(50) NOT NULL,
    titulo VARCHAR(255) NOT NULL,
    mensaje TEXT NOT NULL,
    datos JSONB,
    leida BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_notif_destinatario ON notificaciones (destinatario_id, leida);

-- ============================================================
-- Seed: Categorias iniciales
-- ============================================================
INSERT INTO categorias (nombre, descripcion, icono) VALUES
    ('Plomeria',      'Servicios de plomeria y fontaneria',          'wrench'),
    ('Electricidad',  'Instalaciones y reparaciones electricas',     'zap'),
    ('Pintura',       'Pintura de interiores y exteriores',          'brush'),
    ('Carpinteria',   'Trabajos en madera y muebles',                'hammer'),
    ('Limpieza',      'Servicios de limpieza del hogar y oficina',   'sparkles'),
    ('Jardineria',    'Mantenimiento de jardines y areas verdes',    'leaf'),
    ('Albanileria',   'Construccion y reparaciones de obra civil',   'building'),
    ('Mecanica',      'Reparacion de vehiculos y maquinaria',        'settings'),
    ('Tecnologia',    'Soporte tecnico y reparacion de equipos',     'monitor'),
    ('Ensenanza',     'Clases particulares y tutoria academica',     'book')
ON CONFLICT (nombre) DO NOTHING;
