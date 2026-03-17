-- =============================================================================
-- SQL PARA CORREGIR SCHEMA - Ejecutar en Supabase SQL Editor
-- =============================================================================

-- 1. Hacer comuna_code y comuna_name nullable (para regiones)
ALTER TABLE territories ALTER COLUMN comuna_code DROP NOT NULL;
ALTER TABLE territories ALTER COLUMN comuna_name DROP NOT NULL;

-- 2. Actualizar el CHECK constraint de connectivity_level para incluir 'very_high'
ALTER TABLE synthetic_agents DROP CONSTRAINT IF EXISTS synthetic_agents_connectivity_level_check;
ALTER TABLE synthetic_agents ADD CONSTRAINT synthetic_agents_connectivity_level_check 
    CHECK (connectivity_level IN ('none', 'low', 'medium', 'high', 'very_high'));

-- 3. Verificar los cambios
SELECT 
    column_name,
    is_nullable,
    data_type
FROM information_schema.columns 
WHERE table_name = 'territories' 
AND column_name IN ('comuna_code', 'comuna_name', 'region_code', 'region_name')
ORDER BY column_name;
