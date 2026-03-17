-- =============================================================================
-- MIGRACIÓN SIMPLE: Actualizar tabla territories al Modelo Alineado v2.0
-- Compatible con Supabase SQL Editor
-- =============================================================================

-- 1. AGREGAR COLUMNAS NUEVAS
ALTER TABLE territories ADD COLUMN IF NOT EXISTS level VARCHAR(20) NOT NULL DEFAULT 'region';
ALTER TABLE territories ADD COLUMN IF NOT EXISTS code VARCHAR(20);
ALTER TABLE territories ADD COLUMN IF NOT EXISTS name VARCHAR(200);
ALTER TABLE territories ADD COLUMN IF NOT EXISTS centroid POINT;
ALTER TABLE territories ADD COLUMN IF NOT EXISTS region_name VARCHAR(200);

-- 2. MIGRAR DATOS EXISTENTES (códigos CL-XX a códigos cortos)
UPDATE territories SET code = 'AP' WHERE region_code = 'CL-15' AND code IS NULL;
UPDATE territories SET code = 'TA' WHERE region_code = 'CL-01' AND code IS NULL;
UPDATE territories SET code = 'AN' WHERE region_code = 'CL-02' AND code IS NULL;
UPDATE territories SET code = 'AT' WHERE region_code = 'CL-03' AND code IS NULL;
UPDATE territories SET code = 'CO' WHERE region_code = 'CL-04' AND code IS NULL;
UPDATE territories SET code = 'VA' WHERE region_code = 'CL-05' AND code IS NULL;
UPDATE territories SET code = 'LI' WHERE region_code = 'CL-06' AND code IS NULL;
UPDATE territories SET code = 'ML' WHERE region_code = 'CL-07' AND code IS NULL;
UPDATE territories SET code = 'BI' WHERE region_code = 'CL-08' AND code IS NULL;
UPDATE territories SET code = 'NB' WHERE region_code = 'CL-16' AND code IS NULL;
UPDATE territories SET code = 'AR' WHERE region_code = 'CL-09' AND code IS NULL;
UPDATE territories SET code = 'LR' WHERE region_code = 'CL-14' AND code IS NULL;
UPDATE territories SET code = 'LL' WHERE region_code = 'CL-10' AND code IS NULL;
UPDATE territories SET code = 'AI' WHERE region_code = 'CL-11' AND code IS NULL;
UPDATE territories SET code = 'MA' WHERE region_code = 'CL-12' AND code IS NULL;
UPDATE territories SET code = 'RM' WHERE region_code = 'CL-13' AND code IS NULL;

-- 3. ACTUALIZAR name CON region_name
UPDATE territories SET name = region_name WHERE name IS NULL AND region_name IS NOT NULL;
-- Si region_name no existe, usar el nombre de la región existente
UPDATE territories SET name = region_name WHERE name IS NULL;

-- 4. HACER code NOT NULL
ALTER TABLE territories ALTER COLUMN code SET NOT NULL;

-- 5. CREAR ÍNDICES
CREATE INDEX IF NOT EXISTS idx_territories_level ON territories(level);
CREATE INDEX IF NOT EXISTS idx_territories_code ON territories(code);
CREATE INDEX IF NOT EXISTS idx_territories_region_code ON territories(region_code);

-- 6. CREAR CONSTRAINT UNIQUE
ALTER TABLE territories DROP CONSTRAINT IF EXISTS territories_code_level_key;
ALTER TABLE territories ADD CONSTRAINT territories_code_level_key UNIQUE (code, level);

-- 7. ACTUALIZAR VISTA
DROP VIEW IF EXISTS region_summary;
CREATE VIEW region_summary AS
SELECT code, name, population_total, centroid
FROM territories
WHERE level = 'region'
ORDER BY code;

-- 8. VERIFICACIÓN
SELECT 'Columnas actuales:' as info;
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'territories'
ORDER BY ordinal_position;

SELECT 'Datos migrados:' as info;
SELECT code, name, level FROM territories ORDER BY code;
