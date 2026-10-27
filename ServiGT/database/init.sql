-- ============================================================
-- ServiGT Guatemala — Esquema PostgreSQL (fuente unica de verdad)
-- ============================================================
--
-- Este archivo es el UNICO lugar donde se define el esquema.
-- Lo aplica backend/docker/sync_schema.php en CADA arranque del
-- contenedor backend, dentro de una sola transaccion.
--
-- Reglas para editarlo:
--   1. Todo statement debe ser IDEMPOTENTE (IF NOT EXISTS, bloques
--      DO con guarda). Se ejecuta en cada arranque, no solo el primero.
--   2. Nunca borrar datos. Nada de DROP TABLE / DELETE / TRUNCATE.
--   3. Para columnas nuevas sobre tablas ya desplegadas, agregarlas
--      al CREATE TABLE de la seccion 1 *y* como ALTER ... ADD COLUMN
--      IF NOT EXISTS en la seccion 2, para que las BD existentes
--      converjan al mismo esquema sin recrear el volumen.
--
-- Los seeds que requieren hash bcrypt (admin, proveedores de ejemplo)
-- viven en sync_schema.php porque SQL puro no puede generarlos.
-- ============================================================


-- ============================================================
-- 1. Tablas base (en orden de dependencias de llave foranea)
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
    estado_cuenta VARCHAR(20) NOT NULL DEFAULT 'activa',
    anonimizada_at TIMESTAMP WITHOUT TIME ZONE,
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
    premium_inicio_at TIMESTAMP WITHOUT TIME ZONE NULL,
    premium_vence_at TIMESTAMP WITHOUT TIME ZONE NULL,
    premium_ciclo_key VARCHAR(80),
    premium_renovaciones INT NOT NULL DEFAULT 0 CHECK (premium_renovaciones >= 0),
    portada VARCHAR(500),
    color_acento VARCHAR(7),
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

-- Paquetes de creditos comprables (catalogo administrable sin tocar codigo)
CREATE TABLE IF NOT EXISTS paquetes_creditos (
    id BIGSERIAL PRIMARY KEY,
    nombre VARCHAR(50) NOT NULL UNIQUE,
    precio_gtq DECIMAL(10,2) NOT NULL CHECK (precio_gtq > 0),
    creditos_base INT NOT NULL CHECK (creditos_base > 0),
    creditos_bonus INT NOT NULL DEFAULT 0 CHECK (creditos_bonus >= 0),
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    orden INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_paquetes_creditos_activo ON paquetes_creditos (activo, orden);

-- Compras de creditos (simuladas durante el MVP: sin datos bancarios reales)
CREATE TABLE IF NOT EXISTS compras_creditos (
    id BIGSERIAL PRIMARY KEY,
    proveedor_id BIGINT NOT NULL REFERENCES proveedores(id) ON DELETE CASCADE,
    paquete_id BIGINT NOT NULL REFERENCES paquetes_creditos(id) ON DELETE RESTRICT,
    monto_gtq DECIMAL(10,2) NOT NULL CHECK (monto_gtq > 0),
    creditos_otorgados INT NOT NULL CHECK (creditos_otorgados > 0),
    estado VARCHAR(20) NOT NULL DEFAULT 'pendiente'
        CHECK (estado IN ('pendiente','completada','fallida','cancelada')),
    referencia VARCHAR(20) NOT NULL UNIQUE,
    idempotency_key VARCHAR(100) NOT NULL,
    completada_at TIMESTAMP WITHOUT TIME ZONE,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT compras_creditos_proveedor_idem_uk UNIQUE (proveedor_id, idempotency_key)
);
CREATE INDEX IF NOT EXISTS idx_compras_creditos_proveedor ON compras_creditos (proveedor_id, created_at DESC);

-- Pasarela Stripe (Checkout Session). La compra nace 'pendiente' y solo el webhook
-- firmado (o la reconciliacion server-side contra la API de Stripe) la completa.
ALTER TABLE compras_creditos ADD COLUMN IF NOT EXISTS metodo_pago VARCHAR(20) NOT NULL DEFAULT 'simulado';
ALTER TABLE compras_creditos ADD COLUMN IF NOT EXISTS stripe_session_id VARCHAR(255);
ALTER TABLE compras_creditos ADD COLUMN IF NOT EXISTS fallo_motivo VARCHAR(255);
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'compras_creditos'::regclass
          AND conname = 'compras_creditos_metodo_pago_chk'
    ) THEN
        ALTER TABLE compras_creditos ADD CONSTRAINT compras_creditos_metodo_pago_chk
            CHECK (metodo_pago IN ('simulado','stripe'));
    END IF;
END $$;
CREATE UNIQUE INDEX IF NOT EXISTS uk_compras_creditos_stripe_session
    ON compras_creditos (stripe_session_id) WHERE stripe_session_id IS NOT NULL;

-- Comprobante informativo (HU 4.1). Solo las compras que se completan despues de
-- esta version guardan snapshot; el folio es `referencia`. Las compras historicas
-- ya completadas conservan NULL y no reciben comprobante completo. No es un
-- documento fiscal (sin FEL ni PDF).
ALTER TABLE compras_creditos ADD COLUMN IF NOT EXISTS comprobante_snapshot JSONB;
ALTER TABLE compras_creditos ADD COLUMN IF NOT EXISTS comprobante_emitido_at TIMESTAMP WITHOUT TIME ZONE;
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'compras_creditos'::regclass
          AND conname = 'compras_creditos_comprobante_chk'
    ) THEN
        ALTER TABLE compras_creditos ADD CONSTRAINT compras_creditos_comprobante_chk
            CHECK (
                (comprobante_snapshot IS NULL AND comprobante_emitido_at IS NULL)
                OR (comprobante_snapshot IS NOT NULL AND comprobante_emitido_at IS NOT NULL
                    AND estado = 'completada')
            );
    END IF;
END $$;

-- El snapshot es inmutable: una vez escrito no cambia, ni tampoco los datos de la
-- compra que respalda. Y solo puede nacer en el mismo momento en que la compra se
-- completa: una compra ya completada sin snapshot (historica) no puede recibirlo.
CREATE OR REPLACE FUNCTION compras_creditos_comprobante_inmutable() RETURNS trigger AS $fn$
BEGIN
    IF OLD.comprobante_snapshot IS NOT NULL THEN
        IF NEW.comprobante_snapshot IS DISTINCT FROM OLD.comprobante_snapshot
           OR NEW.comprobante_emitido_at IS DISTINCT FROM OLD.comprobante_emitido_at
           OR NEW.referencia IS DISTINCT FROM OLD.referencia
           OR NEW.proveedor_id IS DISTINCT FROM OLD.proveedor_id
           OR NEW.paquete_id IS DISTINCT FROM OLD.paquete_id
           OR NEW.monto_gtq IS DISTINCT FROM OLD.monto_gtq
           OR NEW.creditos_otorgados IS DISTINCT FROM OLD.creditos_otorgados
           OR NEW.estado IS DISTINCT FROM OLD.estado
           OR NEW.completada_at IS DISTINCT FROM OLD.completada_at THEN
            RAISE EXCEPTION 'El comprobante de la compra % es inmutable', OLD.referencia;
        END IF;
    ELSIF NEW.comprobante_snapshot IS NOT NULL AND OLD.estado = 'completada' THEN
        RAISE EXCEPTION 'La compra % ya estaba completada: no admite comprobante', OLD.referencia;
    END IF;

    RETURN NEW;
END;
$fn$ LANGUAGE plpgsql;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_compras_creditos_comprobante_inmutable') THEN
        CREATE TRIGGER trg_compras_creditos_comprobante_inmutable
            BEFORE UPDATE ON compras_creditos
            FOR EACH ROW EXECUTE FUNCTION compras_creditos_comprobante_inmutable();
    END IF;
END $$;

-- Eventos de webhook ya procesados: la PK es el arbitro de la idempotencia.
CREATE TABLE IF NOT EXISTS stripe_eventos (
    event_id VARCHAR(255) PRIMARY KEY,
    tipo VARCHAR(100) NOT NULL,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Premium con Stripe: pago unico de 30 dias o suscripcion mensual recurrente.
-- La cancelacion es al final del ciclo: premium_vence_at no se toca, solo se
-- apaga la renovacion (premium_cancela_al_final) y Stripe deja de cobrar.
ALTER TABLE proveedores ADD COLUMN IF NOT EXISTS premium_recurrente BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE proveedores ADD COLUMN IF NOT EXISTS premium_cancela_al_final BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE proveedores ADD COLUMN IF NOT EXISTS stripe_customer_id VARCHAR(255);
ALTER TABLE proveedores ADD COLUMN IF NOT EXISTS stripe_subscription_id VARCHAR(255);
CREATE UNIQUE INDEX IF NOT EXISTS uk_proveedores_stripe_subscription
    ON proveedores (stripe_subscription_id) WHERE stripe_subscription_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS pagos_premium (
    id BIGSERIAL PRIMARY KEY,
    proveedor_id BIGINT NOT NULL REFERENCES proveedores(id) ON DELETE CASCADE,
    recurrente BOOLEAN NOT NULL DEFAULT FALSE,
    estado VARCHAR(20) NOT NULL DEFAULT 'pendiente'
        CHECK (estado IN ('pendiente','completada','fallida','cancelada')),
    referencia VARCHAR(20) NOT NULL UNIQUE,
    idempotency_key VARCHAR(100) NOT NULL,
    stripe_session_id VARCHAR(255),
    fallo_motivo VARCHAR(255),
    completada_at TIMESTAMP WITHOUT TIME ZONE,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT pagos_premium_proveedor_idem_uk UNIQUE (proveedor_id, idempotency_key)
);
CREATE UNIQUE INDEX IF NOT EXISTS uk_pagos_premium_stripe_session
    ON pagos_premium (stripe_session_id) WHERE stripe_session_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_pagos_premium_proveedor ON pagos_premium (proveedor_id, created_at DESC);

-- Publicaciones de servicios ofrecidos por proveedores
CREATE TABLE IF NOT EXISTS publicaciones_servicio (
    id BIGSERIAL PRIMARY KEY,
    proveedor_id BIGINT NOT NULL REFERENCES proveedores(id) ON DELETE CASCADE,
    categoria_id BIGINT REFERENCES categorias(id) ON DELETE SET NULL,
    titulo VARCHAR(120) NOT NULL,
    descripcion TEXT NOT NULL,
    precio_referencial DECIMAL(10,2),
    imagen VARCHAR(500),
    estado VARCHAR(20) NOT NULL DEFAULT 'activa'
        CHECK (estado IN ('activa','inactiva')),
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_publicaciones_servicio_visible
    ON publicaciones_servicio (estado, categoria_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_publicaciones_servicio_proveedor
    ON publicaciones_servicio (proveedor_id, estado);

-- Servicios (solicitudes de trabajo)
CREATE TABLE IF NOT EXISTS servicios (
    id BIGSERIAL PRIMARY KEY,
    cliente_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    proveedor_id BIGINT NOT NULL REFERENCES proveedores(id) ON DELETE CASCADE,
    publicacion_id BIGINT REFERENCES publicaciones_servicio(id) ON DELETE SET NULL,
    publicacion_titulo VARCHAR(120),
    publicacion_precio_referencial DECIMAL(10,2),
    categoria_id BIGINT REFERENCES categorias(id) ON DELETE SET NULL,
    descripcion TEXT NOT NULL,
    estado VARCHAR(20) NOT NULL DEFAULT 'pendiente'
        CHECK (estado IN ('pendiente','aceptado','en_camino','en_progreso','por_confirmar','completado','cancelado','rechazado')),
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
-- 2. Convergencia de BD preexistentes
-- ============================================================
-- Los CREATE TABLE de arriba no tocan una tabla que ya existe. Estos
-- statements alinean bases creadas por versiones anteriores del esquema
-- (o por migraciones de Laravel) sin destruir datos.

ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(20) NOT NULL DEFAULT 'cliente';
ALTER TABLE users ADD COLUMN IF NOT EXISTS telefono VARCHAR(20);
ALTER TABLE users ADD COLUMN IF NOT EXISTS foto_perfil VARCHAR(500);
ALTER TABLE users ADD COLUMN IF NOT EXISTS documento_verificado BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE proveedores ADD COLUMN IF NOT EXISTS user_id BIGINT;
ALTER TABLE proveedores ADD COLUMN IF NOT EXISTS foto_perfil VARCHAR(500);
ALTER TABLE proveedores ADD COLUMN IF NOT EXISTS tarifa_hora DECIMAL(10,2);
ALTER TABLE proveedores ADD COLUMN IF NOT EXISTS tarifa_proyecto DECIMAL(10,2);
ALTER TABLE proveedores ADD COLUMN IF NOT EXISTS calificacion_promedio DECIMAL(3,2) NOT NULL DEFAULT 0.00;
ALTER TABLE proveedores ADD COLUMN IF NOT EXISTS total_calificaciones INT NOT NULL DEFAULT 0;
ALTER TABLE proveedores ADD COLUMN IF NOT EXISTS nivel VARCHAR(20) NOT NULL DEFAULT 'novato';

-- El chat se agrego despues, sobre bases que ya tenian la tabla mensajes
-- incompleta.
ALTER TABLE mensajes ADD COLUMN IF NOT EXISTS emisor_id BIGINT REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE mensajes ADD COLUMN IF NOT EXISTS receptor_id BIGINT REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE mensajes ADD COLUMN IF NOT EXISTS servicio_id BIGINT REFERENCES servicios(id) ON DELETE SET NULL;
ALTER TABLE mensajes ADD COLUMN IF NOT EXISTS contenido TEXT;
ALTER TABLE mensajes ADD COLUMN IF NOT EXISTS leido BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE mensajes ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE mensajes ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Un proveedor como maximo por usuario. Indice parcial: admite varios
-- proveedores heredados sin user_id, pero impide duplicar el vinculo.
CREATE UNIQUE INDEX IF NOT EXISTS idx_proveedores_user_id_unique
    ON proveedores (user_id) WHERE user_id IS NOT NULL;

-- FK proveedores.user_id -> users.id. Se busca por columna y no por
-- nombre: el CREATE TABLE la nombra "proveedores_user_id_fkey" y una
-- version previa de este script la creaba como "..._foreign", con lo
-- que se llegaban a tener las dos apuntando a lo mismo.
DO $$
DECLARE
    duplicada TEXT;
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conrelid = 'proveedores'::regclass
          AND contype = 'f'
          AND conkey = ARRAY[(
              SELECT attnum FROM pg_attribute
              WHERE attrelid = 'proveedores'::regclass AND attname = 'user_id'
          )]::smallint[]
    ) THEN
        ALTER TABLE proveedores
            ADD CONSTRAINT proveedores_user_id_fkey
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
    END IF;

    -- Limpiar la FK redundante que dejo la version anterior.
    FOR duplicada IN
        SELECT conname
        FROM pg_constraint
        WHERE conrelid = 'proveedores'::regclass
          AND contype = 'f'
          AND conname = 'proveedores_user_id_foreign'
          AND EXISTS (
              SELECT 1 FROM pg_constraint otra
              WHERE otra.conrelid = 'proveedores'::regclass
                AND otra.contype = 'f'
                AND otra.conname = 'proveedores_user_id_fkey'
          )
    LOOP
        EXECUTE format('ALTER TABLE proveedores DROP CONSTRAINT %I', duplicada);
    END LOOP;
END $$;

-- servicios.estado gano el valor 'por_confirmar'. Solo se recrea el CHECK
-- si al actual le falta: recrearlo en cada arranque tomaria un lock
-- exclusivo y reescanearia la tabla completa sin necesidad.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'servicios'::regclass
          AND conname = 'servicios_estado_check'
          AND pg_get_constraintdef(oid) LIKE '%por_confirmar%'
    ) THEN
        ALTER TABLE servicios DROP CONSTRAINT IF EXISTS servicios_estado_check;
        ALTER TABLE servicios ADD CONSTRAINT servicios_estado_check
            CHECK (estado IN ('pendiente','aceptado','en_camino','en_progreso','por_confirmar','completado','cancelado','rechazado'));
    END IF;
END $$;


-- proveedores gana premium_vence_at: NULL = nunca activado, fecha futura =
-- activo, fecha pasada = vencido. El estado se deriva de esta unica columna
-- para no duplicar la fuente de verdad en un campo de estado aparte.
ALTER TABLE proveedores ADD COLUMN IF NOT EXISTS premium_inicio_at TIMESTAMP WITHOUT TIME ZONE NULL;
ALTER TABLE proveedores ADD COLUMN IF NOT EXISTS premium_vence_at TIMESTAMP WITHOUT TIME ZONE NULL;
ALTER TABLE proveedores ADD COLUMN IF NOT EXISTS premium_ciclo_key VARCHAR(80);
ALTER TABLE proveedores ADD COLUMN IF NOT EXISTS premium_renovaciones INT NOT NULL DEFAULT 0;

-- Personalizacion del perfil del proveedor: imagen de portada y color de
-- acento. Ambas opcionales; un perfil sin ellas se dibuja con el degradado
-- de marca de siempre.
ALTER TABLE proveedores ADD COLUMN IF NOT EXISTS portada VARCHAR(500);
ALTER TABLE proveedores ADD COLUMN IF NOT EXISTS color_acento VARCHAR(7);

-- Publicaciones y trazabilidad nullable desde servicios. El snapshot conserva
-- datos minimos aunque luego la publicacion se edite o elimine.
CREATE TABLE IF NOT EXISTS publicaciones_servicio (
    id BIGSERIAL PRIMARY KEY,
    proveedor_id BIGINT NOT NULL REFERENCES proveedores(id) ON DELETE CASCADE,
    categoria_id BIGINT REFERENCES categorias(id) ON DELETE SET NULL,
    titulo VARCHAR(120) NOT NULL,
    descripcion TEXT NOT NULL,
    precio_referencial DECIMAL(10,2),
    imagen VARCHAR(500),
    estado VARCHAR(20) NOT NULL DEFAULT 'activa'
        CHECK (estado IN ('activa','inactiva')),
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_publicaciones_servicio_visible
    ON publicaciones_servicio (estado, categoria_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_publicaciones_servicio_proveedor
    ON publicaciones_servicio (proveedor_id, estado);

ALTER TABLE servicios ADD COLUMN IF NOT EXISTS publicacion_id BIGINT REFERENCES publicaciones_servicio(id) ON DELETE SET NULL;
ALTER TABLE servicios ADD COLUMN IF NOT EXISTS publicacion_titulo VARCHAR(120);
ALTER TABLE servicios ADD COLUMN IF NOT EXISTS publicacion_precio_referencial DECIMAL(10,2);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'servicios'::regclass
          AND contype = 'f'
          AND conkey = ARRAY[(
              SELECT attnum FROM pg_attribute
              WHERE attrelid = 'servicios'::regclass AND attname = 'publicacion_id'
          )]::smallint[]
    ) THEN
        ALTER TABLE servicios
            ADD CONSTRAINT servicios_publicacion_id_fkey
            FOREIGN KEY (publicacion_id) REFERENCES publicaciones_servicio(id) ON DELETE SET NULL;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'proveedores'::regclass
          AND conname = 'proveedores_premium_renovaciones_check'
    ) THEN
        ALTER TABLE proveedores ADD CONSTRAINT proveedores_premium_renovaciones_check
            CHECK (premium_renovaciones >= 0);
    END IF;
END $$;

-- transacciones_credito.tipo gano el valor 'compra'. Igual que arriba, solo
-- se recrea el CHECK si al actual le falta, para no tomar el lock en cada arranque.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'transacciones_credito'::regclass
          AND conname = 'transacciones_credito_tipo_check'
          AND pg_get_constraintdef(oid) LIKE '%compra%'
    ) THEN
        ALTER TABLE transacciones_credito DROP CONSTRAINT IF EXISTS transacciones_credito_tipo_check;
        ALTER TABLE transacciones_credito ADD CONSTRAINT transacciones_credito_tipo_check
            CHECK (tipo IN ('bono','gasto','recarga','compra'));
    END IF;
END $$;

-- La unicidad de idempotency_key nacio global, pero el controlador siempre la
-- consulta acotada al proveedor autenticado. Esa asimetria hacia que la clave
-- de un proveedor bloqueara la de otro: la consulta no veia la fila ajena,
-- pasaba el chequeo y reventaba contra el UNIQUE con un 500. La clave solo
-- tiene que ser unica DENTRO de cada proveedor.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'compras_creditos'::regclass
          AND conname = 'compras_creditos_proveedor_idem_uk'
    ) THEN
        ALTER TABLE compras_creditos DROP CONSTRAINT IF EXISTS compras_creditos_idempotency_key_key;
        ALTER TABLE compras_creditos ADD CONSTRAINT compras_creditos_proveedor_idem_uk
            UNIQUE (proveedor_id, idempotency_key);
    END IF;
END $$;

-- Las categorias se sembraron sin tildes ni ñ. Este renombre corre ANTES del
-- seed a proposito: si corriera despues, el seed ya habria insertado la
-- version acentuada junto a la vieja y el UPDATE chocaria con el UNIQUE de
-- nombre. La guarda cubre el caso de que ambas ya convivan.
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN
        SELECT * FROM (VALUES
            ('Plomeria',    'Plomería',    'Servicios de plomería y fontanería'),
            ('Carpinteria', 'Carpintería', 'Trabajos en madera y muebles'),
            ('Jardineria',  'Jardinería',  'Mantenimiento de jardines y áreas verdes'),
            ('Albanileria', 'Albañilería', 'Construcción y reparaciones de obra civil'),
            ('Mecanica',    'Mecánica',    'Reparación de vehículos y maquinaria'),
            ('Tecnologia',  'Tecnología',  'Soporte técnico y reparación de equipos'),
            ('Ensenanza',   'Enseñanza',   'Clases particulares y tutoría académica')
        ) AS t(viejo, nuevo, descripcion)
    LOOP
        IF EXISTS (SELECT 1 FROM categorias WHERE nombre = r.viejo)
           AND NOT EXISTS (SELECT 1 FROM categorias WHERE nombre = r.nuevo) THEN
            UPDATE categorias
               SET nombre = r.nuevo, descripcion = r.descripcion
             WHERE nombre = r.viejo;
        END IF;
    END LOOP;
END $$;

-- Electricidad no cambia de nombre, solo la descripcion gana tildes.
UPDATE categorias
   SET descripcion = 'Instalaciones y reparaciones eléctricas'
 WHERE nombre = 'Electricidad'
   AND descripcion = 'Instalaciones y reparaciones electricas';


-- ============================================================
-- Sprint 9: bolsa de materiales, origen de cancelacion y contexto de mensajes
-- ============================================================
-- Todo es idempotente y converge tanto en base limpia como en volumen
-- existente. No se infiere nada de datos historicos: `cancelado_desde`
-- queda NULL en cancelaciones anteriores y esas no son elegibles.

ALTER TABLE servicios ADD COLUMN IF NOT EXISTS cancelado_desde VARCHAR(20);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'servicios'::regclass
          AND conname = 'servicios_cancelado_desde_check'
    ) THEN
        ALTER TABLE servicios ADD CONSTRAINT servicios_cancelado_desde_check
            CHECK (cancelado_desde IS NULL OR cancelado_desde IN ('pendiente','aceptado','en_camino'));
    END IF;
END $$;

-- Lote de materiales: uno por servicio cancelado desde en_camino. El vendedor
-- es siempre el proveedor del servicio.
CREATE TABLE IF NOT EXISTS publicaciones_material (
    id BIGSERIAL PRIMARY KEY,
    servicio_id BIGINT NOT NULL UNIQUE REFERENCES servicios(id) ON DELETE CASCADE,
    vendedor_id BIGINT NOT NULL REFERENCES proveedores(id) ON DELETE CASCADE,
    titulo VARCHAR(120) NOT NULL,
    descripcion TEXT NOT NULL,
    cantidad DECIMAL(10,2) NOT NULL CHECK (cantidad > 0),
    unidad VARCHAR(30) NOT NULL,
    precio_referencial DECIMAL(10,2) NOT NULL DEFAULT 0 CHECK (precio_referencial >= 0),
    departamento VARCHAR(60) NOT NULL,
    municipio VARCHAR(100),
    estado VARCHAR(20) NOT NULL DEFAULT 'disponible'
        CHECK (estado IN ('disponible','reservado','vendido','retirado')),
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_pub_material_catalogo
    ON publicaciones_material (estado, departamento, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pub_material_vendedor
    ON publicaciones_material (vendedor_id, estado);

-- Imagenes de catalogo (publicas): de 1 a 3 por lote.
CREATE TABLE IF NOT EXISTS publicaciones_material_imagenes (
    id BIGSERIAL PRIMARY KEY,
    publicacion_id BIGINT NOT NULL REFERENCES publicaciones_material(id) ON DELETE CASCADE,
    ruta VARCHAR(500) NOT NULL,
    orden SMALLINT NOT NULL CHECK (orden BETWEEN 1 AND 3),
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (publicacion_id, orden)
);

-- Reserva/solicitud de un proveedor comprador sobre un lote. Varias pendientes
-- pueden coexistir; solo una aceptada. Un comprador no repite una solicitud
-- pendiente, aceptada ni rechazada sobre el mismo lote (cancelada si puede).
CREATE TABLE IF NOT EXISTS reservas_material (
    id BIGSERIAL PRIMARY KEY,
    publicacion_id BIGINT NOT NULL REFERENCES publicaciones_material(id) ON DELETE CASCADE,
    comprador_id BIGINT NOT NULL REFERENCES proveedores(id) ON DELETE CASCADE,
    mensaje_inicial TEXT NOT NULL CHECK (LENGTH(BTRIM(mensaje_inicial)) > 0),
    estado VARCHAR(20) NOT NULL DEFAULT 'pendiente'
        CHECK (estado IN ('pendiente','aceptada','rechazada','cancelada')),
    idempotency_key VARCHAR(80) NOT NULL,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (comprador_id, idempotency_key)
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_reserva_material_aceptada
    ON reservas_material (publicacion_id) WHERE estado = 'aceptada';
CREATE UNIQUE INDEX IF NOT EXISTS uq_reserva_material_comprador_vigente
    ON reservas_material (publicacion_id, comprador_id)
    WHERE estado IN ('pendiente','aceptada','rechazada');
CREATE INDEX IF NOT EXISTS idx_reservas_material_comprador
    ON reservas_material (comprador_id, estado, created_at DESC);

-- Un mensaje pertenece a un servicio, a una reserva o a ninguno (historial
-- anterior), nunca a ambos.
ALTER TABLE mensajes ADD COLUMN IF NOT EXISTS reserva_material_id BIGINT
    REFERENCES reservas_material(id) ON DELETE SET NULL;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'mensajes'::regclass
          AND conname = 'mensajes_un_solo_contexto_check'
    ) THEN
        ALTER TABLE mensajes ADD CONSTRAINT mensajes_un_solo_contexto_check
            CHECK (servicio_id IS NULL OR reserva_material_id IS NULL);
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_mensajes_reserva ON mensajes (reserva_material_id, created_at);
CREATE INDEX IF NOT EXISTS idx_mensajes_receptor_no_leidos
    ON mensajes (receptor_id) WHERE leido = FALSE;

-- ============================================================
-- Sprint 9: Centro de seguridad (reportes, evidencia privada y auditoria)
-- ============================================================
-- Idempotente: converge en base limpia y en volumen existente sin perder
-- datos. No depende de la deteccion vieja de 'por_confirmar' de arriba.

-- servicios.estado gana el estado terminal 'interrumpido_seguridad' (22
-- caracteres: no cabia en VARCHAR(20)). Cada paso se aplica solo si hace falta,
-- para no tomar un lock exclusivo ni reescribir la tabla en cada arranque.
DO $$
BEGIN
    IF (SELECT character_maximum_length FROM information_schema.columns
        WHERE table_name = 'servicios' AND column_name = 'estado') < 30 THEN
        ALTER TABLE servicios ALTER COLUMN estado TYPE VARCHAR(30);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'servicios'::regclass
          AND conname = 'servicios_estado_check'
          AND pg_get_constraintdef(oid) LIKE '%interrumpido_seguridad%'
    ) THEN
        ALTER TABLE servicios DROP CONSTRAINT IF EXISTS servicios_estado_check;
        ALTER TABLE servicios ADD CONSTRAINT servicios_estado_check
            CHECK (estado IN ('pendiente','aceptado','en_camino','en_progreso','por_confirmar','completado','cancelado','rechazado','interrumpido_seguridad'));
    END IF;
END $$;

-- Reporte de seguridad de un servicio. Lo ve solo su autor y el admin.
CREATE TABLE IF NOT EXISTS reportes_seguridad (
    id BIGSERIAL PRIMARY KEY,
    servicio_id BIGINT NOT NULL REFERENCES servicios(id) ON DELETE CASCADE,
    reportante_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    categoria VARCHAR(40) NOT NULL,
    descripcion TEXT NOT NULL CHECK (LENGTH(BTRIM(descripcion)) > 0),
    interrumpio_servicio BOOLEAN NOT NULL DEFAULT FALSE,
    estado_servicio_previo VARCHAR(30) NOT NULL,
    estado VARCHAR(20) NOT NULL DEFAULT 'recibido'
        CHECK (estado IN ('recibido','en_revision','resuelto','descartado')),
    idempotency_key VARCHAR(80) NOT NULL,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (reportante_id, idempotency_key)
);
-- Una sola interrupcion por servicio, protegida por la base y no solo por la app.
CREATE UNIQUE INDEX IF NOT EXISTS uq_reporte_seguridad_interrupcion
    ON reportes_seguridad (servicio_id) WHERE interrumpio_servicio;
CREATE INDEX IF NOT EXISTS idx_reportes_seguridad_cola
    ON reportes_seguridad (estado, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reportes_seguridad_servicio
    ON reportes_seguridad (servicio_id);

-- Evidencia privada: de 1 a 3 archivos por reporte. La ruta es fisica y nunca
-- se serializa en ninguna respuesta.
CREATE TABLE IF NOT EXISTS evidencias_reporte_seguridad (
    id BIGSERIAL PRIMARY KEY,
    reporte_id BIGINT NOT NULL REFERENCES reportes_seguridad(id) ON DELETE CASCADE,
    orden SMALLINT NOT NULL CHECK (orden BETWEEN 1 AND 3),
    ruta_privada VARCHAR(500) NOT NULL,
    nombre_original VARCHAR(255),
    mime VARCHAR(100) NOT NULL CHECK (mime IN ('image/jpeg','image/png','application/pdf')),
    tamano_bytes INT NOT NULL CHECK (tamano_bytes > 0 AND tamano_bytes <= 5242880),
    sha256 CHAR(64) NOT NULL,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (reporte_id, orden)
);

-- Auditoria: un evento por creacion y por cada cambio administrativo. Es
-- inmutable (el trigger rechaza UPDATE); no bloquea el borrado en cascada.
CREATE TABLE IF NOT EXISTS historial_reportes_seguridad (
    id BIGSERIAL PRIMARY KEY,
    reporte_id BIGINT NOT NULL REFERENCES reportes_seguridad(id) ON DELETE CASCADE,
    actor_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
    estado_anterior VARCHAR(20)
        CHECK (estado_anterior IS NULL OR estado_anterior IN ('recibido','en_revision','resuelto','descartado')),
    estado_nuevo VARCHAR(20) NOT NULL
        CHECK (estado_nuevo IN ('recibido','en_revision','resuelto','descartado')),
    nota_interna TEXT,
    correlation_id VARCHAR(64),
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_historial_reportes_seguridad
    ON historial_reportes_seguridad (reporte_id, id);

-- Unica excepcion: la FK `actor_id ... ON DELETE SET NULL` anonimiza al actor
-- cuando se borra su usuario (UPDATE interno de PostgreSQL). Se permite solo si
-- cambia unicamente actor_id de un valor a NULL; cualquier otro UPDATE se rechaza.
CREATE OR REPLACE FUNCTION historial_reportes_seguridad_inmutable() RETURNS trigger AS $fn$
BEGIN
    IF OLD.actor_id IS NOT NULL AND NEW.actor_id IS NULL
       AND (to_jsonb(NEW) - 'actor_id') = (to_jsonb(OLD) - 'actor_id') THEN
        RETURN NEW;
    END IF;

    RAISE EXCEPTION 'historial_reportes_seguridad es inmutable: no admite UPDATE';
END;
$fn$ LANGUAGE plpgsql;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_historial_reportes_seguridad_inmutable') THEN
        CREATE TRIGGER trg_historial_reportes_seguridad_inmutable
            BEFORE UPDATE ON historial_reportes_seguridad
            FOR EACH ROW EXECUTE FUNCTION historial_reportes_seguridad_inmutable();
    END IF;
END $$;

-- ============================================================
-- Sprint 10: documentos legales versionados y aceptacion (HU 2.1)
-- ============================================================
-- Cada version de terminos o privacidad es una fila inmutable. La vigente de
-- cada tipo se deriva (la de mayor vigente_desde ya alcanzado), asi que no hay
-- una bandera `vigente` que actualizar ni que pueda desincronizarse. Publicar
-- una version nueva es un INSERT; nunca se edita ni se borra una anterior, y
-- no exige reaceptacion a quien acepto una version previa.

CREATE TABLE IF NOT EXISTS documentos_legales (
    id BIGSERIAL PRIMARY KEY,
    tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('terminos','privacidad')),
    version VARCHAR(20) NOT NULL CHECK (LENGTH(BTRIM(version)) > 0),
    titulo VARCHAR(255) NOT NULL CHECK (LENGTH(BTRIM(titulo)) > 0),
    contenido TEXT NOT NULL CHECK (LENGTH(BTRIM(contenido)) > 0),
    -- SHA-256 hex del contenido. Lo calcula el trigger; el valor enviado se ignora.
    hash_sha256 CHAR(64) NOT NULL,
    vigente_desde TIMESTAMP WITHOUT TIME ZONE NOT NULL,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (tipo, version),
    UNIQUE (tipo, vigente_desde)
);
CREATE INDEX IF NOT EXISTS idx_documentos_legales_vigencia
    ON documentos_legales (tipo, vigente_desde DESC);

-- Una aceptacion por usuario y version. Es evidencia: RESTRICT impide perderla
-- por un borrado en cascada (la eliminacion de cuenta anonimiza, no borra).
CREATE TABLE IF NOT EXISTS aceptaciones_legales (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    documento_legal_id BIGINT NOT NULL REFERENCES documentos_legales(id) ON DELETE RESTRICT,
    aceptado_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (user_id, documento_legal_id)
);
CREATE INDEX IF NOT EXISTS idx_aceptaciones_legales_documento
    ON aceptaciones_legales (documento_legal_id);

CREATE OR REPLACE FUNCTION documentos_legales_hash() RETURNS trigger AS $fn$
BEGIN
    NEW.hash_sha256 := encode(sha256(convert_to(NEW.contenido, 'UTF8')), 'hex');
    RETURN NEW;
END;
$fn$ LANGUAGE plpgsql;

-- Compartida por ambas tablas: una version publicada o una aceptacion
-- registrada no se modifica ni se elimina.
CREATE OR REPLACE FUNCTION legal_inmutable() RETURNS trigger AS $fn$
BEGIN
    RAISE EXCEPTION '% es inmutable: no admite %', TG_TABLE_NAME, TG_OP;
END;
$fn$ LANGUAGE plpgsql;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_documentos_legales_hash') THEN
        CREATE TRIGGER trg_documentos_legales_hash
            BEFORE INSERT ON documentos_legales
            FOR EACH ROW EXECUTE FUNCTION documentos_legales_hash();
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_documentos_legales_inmutable') THEN
        CREATE TRIGGER trg_documentos_legales_inmutable
            BEFORE UPDATE OR DELETE ON documentos_legales
            FOR EACH ROW EXECUTE FUNCTION legal_inmutable();
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_aceptaciones_legales_inmutable') THEN
        CREATE TRIGGER trg_aceptaciones_legales_inmutable
            BEFORE UPDATE OR DELETE ON aceptaciones_legales
            FOR EACH ROW EXECUTE FUNCTION legal_inmutable();
    END IF;
END $$;

-- ============================================================
-- Sprint 10: estado de cuenta y solicitud de eliminacion (HU 3.1)
-- ============================================================
-- Eliminar una cuenta es anonimizarla y revocar su acceso: la fila de users
-- nunca se borra, para no arrastrar en cascada servicios, compras, reportes ni
-- aceptaciones legales. Todas las cuentas existentes convergen a 'activa'.

ALTER TABLE users ADD COLUMN IF NOT EXISTS estado_cuenta VARCHAR(20) NOT NULL DEFAULT 'activa';
ALTER TABLE users ADD COLUMN IF NOT EXISTS anonimizada_at TIMESTAMP WITHOUT TIME ZONE;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'users'::regclass
          AND conname = 'users_estado_cuenta_check'
    ) THEN
        ALTER TABLE users ADD CONSTRAINT users_estado_cuenta_check
            CHECK (
                (estado_cuenta = 'activa' AND anonimizada_at IS NULL)
                OR (estado_cuenta = 'anonimizada' AND anonimizada_at IS NOT NULL)
            );
    END IF;
END $$;

-- Una solicitud por intento. `idempotency_key` repite el mismo intento sin
-- duplicarlo; el indice parcial deja una sola solicitud en curso o completada
-- por usuario (una rechazada por operaciones activas no impide reintentar).
-- `manifiesto_archivos` se captura ANTES de anonimizar: despues ya no quedan
-- rutas en el perfil para saber que limpiar.
CREATE TABLE IF NOT EXISTS solicitudes_eliminacion_cuenta (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    idempotency_key VARCHAR(80) NOT NULL CHECK (LENGTH(BTRIM(idempotency_key)) > 0),
    estado VARCHAR(20) NOT NULL DEFAULT 'pendiente'
        CHECK (estado IN ('pendiente','rechazada','limpieza_pendiente','completada')),
    motivo_rechazo VARCHAR(255),
    manifiesto_archivos JSONB NOT NULL DEFAULT '[]'::jsonb
        CHECK (jsonb_typeof(manifiesto_archivos) = 'array'),
    intentos_limpieza INT NOT NULL DEFAULT 0 CHECK (intentos_limpieza >= 0),
    ultimo_error_limpieza TEXT,
    anonimizada_at TIMESTAMP WITHOUT TIME ZONE,
    completada_at TIMESTAMP WITHOUT TIME ZONE,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (user_id, idempotency_key),
    CONSTRAINT solicitudes_eliminacion_estado_fechas_check CHECK (
        (estado IN ('pendiente','rechazada') AND anonimizada_at IS NULL AND completada_at IS NULL)
        OR (estado = 'limpieza_pendiente' AND anonimizada_at IS NOT NULL AND completada_at IS NULL)
        OR (estado = 'completada' AND anonimizada_at IS NOT NULL AND completada_at IS NOT NULL)
    ),
    CONSTRAINT solicitudes_eliminacion_rechazo_check CHECK (
        (estado = 'rechazada') = (motivo_rechazo IS NOT NULL)
    )
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_solicitud_eliminacion_vigente
    ON solicitudes_eliminacion_cuenta (user_id)
    WHERE estado IN ('pendiente','limpieza_pendiente','completada');
CREATE INDEX IF NOT EXISTS idx_solicitudes_eliminacion_limpieza
    ON solicitudes_eliminacion_cuenta (estado, updated_at)
    WHERE estado = 'limpieza_pendiente';

-- ============================================================
-- Sprint 10: telefono local de 8 digitos (HU 1.2)
-- ============================================================
-- El formato canonico es de 8 digitos sin separador. Solo se normaliza el
-- formato heredado exacto ####-####; cualquier otro valor se deja intacto
-- para revisarlo a mano en lugar de adivinar. Tras el primer arranque el
-- patron ya no coincide, asi que el UPDATE no vuelve a tocar filas.
UPDATE users
   SET telefono = REPLACE(telefono, '-', '')
 WHERE telefono ~ '^[0-9]{4}-[0-9]{4}$';

UPDATE proveedores
   SET telefono = REPLACE(telefono, '-', '')
 WHERE telefono ~ '^[0-9]{4}-[0-9]{4}$';

-- ============================================================
-- 3. Seed de catalogo
-- ============================================================
INSERT INTO categorias (nombre, descripcion, icono) VALUES
    ('Plomería',      'Servicios de plomería y fontanería',          'wrench'),
    ('Electricidad',  'Instalaciones y reparaciones eléctricas',     'zap'),
    ('Pintura',       'Pintura de interiores y exteriores',          'brush'),
    ('Carpintería',   'Trabajos en madera y muebles',                'hammer'),
    ('Limpieza',      'Servicios de limpieza del hogar y oficina',   'sparkles'),
    ('Jardinería',    'Mantenimiento de jardines y áreas verdes',    'leaf'),
    ('Albañilería',   'Construcción y reparaciones de obra civil',   'building'),
    ('Mecánica',      'Reparación de vehículos y maquinaria',        'settings'),
    ('Tecnología',    'Soporte técnico y reparación de equipos',     'monitor'),
    ('Enseñanza',     'Clases particulares y tutoría académica',     'book')
ON CONFLICT (nombre) DO NOTHING;

-- Paquetes de creditos ratificados para Sprint 6 (precio oficial en GTQ)
INSERT INTO paquetes_creditos (nombre, precio_gtq, creditos_base, creditos_bonus, orden) VALUES
    ('Inicial',      39.00,  8,   0,  1),
    ('Impulso',      115.00, 25,  5,  2),
    ('Profesional',  459.00, 110, 25, 3),
    ('Negocio',      765.00, 190, 60, 4)
ON CONFLICT (nombre) DO NOTHING;
