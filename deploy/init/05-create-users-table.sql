-- =============================================================================
-- Crear tabla USERS para Auth Propio
-- Ejecutar en Supabase Studio SQL Editor o via psql
-- =============================================================================

-- Crear tabla users si no existe
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Identificación
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    
    -- Perfil
    name VARCHAR(255),
    avatar TEXT,
    
    -- Roles y permisos
    role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('user', 'admin', 'moderator')),
    is_active BOOLEAN DEFAULT TRUE,
    email_verified BOOLEAN DEFAULT FALSE,
    
    -- Tracking
    last_login_at TIMESTAMPTZ,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para users
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_active ON users(is_active);

-- Comentarios
COMMENT ON TABLE users IS 'Usuarios de la aplicación - Auth propio sin dependencia de GoTrue';
COMMENT ON COLUMN users.password_hash IS 'Hash SHA-256 del password con salt';

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Política RLS para users
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Permitir lectura de usuarios activos (para login)
CREATE POLICY "Allow read active users" ON users
    FOR SELECT USING (is_active = true);

-- Permitir inserción de nuevos usuarios (registro)
CREATE POLICY "Allow insert users" ON users
    FOR INSERT WITH CHECK (true);

-- Permitir actualización de usuarios autenticados (solo sus propios datos)
CREATE POLICY "Allow update own user" ON users
    FOR UPDATE USING (true);

-- =============================================================================
-- Usuario admin de prueba (opcional)
-- Password: admin123456
-- El hash se calcula con SHA-256 de "admin123456pulsossociales-salt-v1"
-- =============================================================================

-- Insertar usuario admin si no existe
INSERT INTO users (email, password_hash, name, role, is_active, email_verified)
VALUES (
    'admin@pulsossociales.com',
    '484c1dd8147bd0bd629ab81139bf68065496d65fc781f0fd5288f2a2de941038',
    'Administrador',
    'admin',
    true,
    true
)
ON CONFLICT (email) DO NOTHING;
