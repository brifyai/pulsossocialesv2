-- =============================================================================
-- FIX: Actualizar password del usuario admin
-- Ejecutar si el login con admin@pulsossociales.com / admin123456 falla
-- =============================================================================

-- Actualizar el password_hash del usuario admin al valor correcto
-- El hash correcto es SHA-256 de "admin123456pulsossociales-salt-v1"
UPDATE users 
SET password_hash = '484c1dd8147bd0bd629ab81139bf68065496d65fc781f0fd5288f2a2de941038',
    updated_at = NOW()
WHERE email = 'admin@pulsossociales.com';

-- Verificar que se actualizó
SELECT email, name, role, is_active, updated_at 
FROM users 
WHERE email = 'admin@pulsossociales.com';
