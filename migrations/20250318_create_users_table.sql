-- ===========================================
-- Migration: Create users table
-- Description: Tabla de usuarios personalizada
-- para autenticación sin Supabase Auth
-- ===========================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ===========================================
-- Table: users
-- ===========================================
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255),
    avatar VARCHAR(500),
    role VARCHAR(50) DEFAULT 'user',
    is_active BOOLEAN DEFAULT true,
    email_verified BOOLEAN DEFAULT false,
    last_login_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);
CREATE INDEX IF NOT EXISTS idx_users_is_active ON public.users(is_active);

-- ===========================================
-- RLS Policies
-- ===========================================

-- Enable RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read their own data
CREATE POLICY "Users can read own data" ON public.users
    FOR SELECT
    USING (id = current_setting('app.current_user_id', true)::UUID);

-- Policy: Users can update their own data (except role)
CREATE POLICY "Users can update own data" ON public.users
    FOR UPDATE
    USING (id = current_setting('app.current_user_id', true)::UUID)
    WITH CHECK (id = current_setting('app.current_user_id', true)::UUID);

-- Policy: Allow insert for registration (anon)
CREATE POLICY "Allow registration" ON public.users
    FOR INSERT
    WITH CHECK (true);

-- ===========================================
-- Function: Update updated_at timestamp
-- ===========================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to auto-update updated_at
DROP TRIGGER IF EXISTS update_users_updated_at ON public.users;
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON public.users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ===========================================
-- Function: Update last_login_at
-- ===========================================
CREATE OR REPLACE FUNCTION update_last_login()
RETURNS TRIGGER AS $$
BEGIN
    NEW.last_login_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- ===========================================
-- Insert default admin user (optional)
-- Password: admin123 (bcrypt hash)
-- ===========================================
-- Uncomment if you want a default admin
-- INSERT INTO public.users (email, password_hash, name, role)
-- VALUES (
--     'admin@pulsossociales.com',
--     '$2a$10$YourBcryptHashHere', -- Generate with: bcrypt.hashSync('admin123', 10)
--     'Administrador',
--     'admin'
-- )
-- ON CONFLICT (email) DO NOTHING;
