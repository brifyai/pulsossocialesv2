-- =============================================================================
-- FIX: Verificar y corregir esquema de tabla territories
-- Ejecutar si hay errores de 'column territories.code does not exist'
-- =============================================================================

-- 1. Verificar columnas existentes
SELECT 
    column_name, 
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'territories' 
ORDER BY ordinal_position;

-- 2. Agregar columnas code y name si no existen
DO $$
BEGIN
    -- Agregar columna code
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'territories' AND column_name = 'code'
    ) THEN
        ALTER TABLE territories ADD COLUMN code VARCHAR(20);
        RAISE NOTICE 'Columna code agregada';
    END IF;

    -- Agregar columna name
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'territories' AND column_name = 'name'
    ) THEN
        ALTER TABLE territories ADD COLUMN name VARCHAR(200);
        RAISE NOTICE 'Columna name agregada';
    END IF;

    -- Agregar columna level si no existe
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'territories' AND column_name = 'level'
    ) THEN
        ALTER TABLE territories ADD COLUMN level VARCHAR(20) DEFAULT 'region';
        RAISE NOTICE 'Columna level agregada';
    END IF;
END $$;

-- 3. Migrar datos: region_code -> code, region_name -> name para regiones
UPDATE territories 
SET 
    code = CASE region_code
        WHEN 'CL-15' THEN 'AP'
        WHEN 'CL-01' THEN 'TA'
        WHEN 'CL-02' THEN 'AN'
        WHEN 'CL-03' THEN 'AT'
        WHEN 'CL-04' THEN 'CO'
        WHEN 'CL-05' THEN 'VA'
        WHEN 'CL-06' THEN 'LI'
        WHEN 'CL-07' THEN 'ML'
        WHEN 'CL-08' THEN 'BI'
        WHEN 'CL-16' THEN 'NB'
        WHEN 'CL-09' THEN 'AR'
        WHEN 'CL-14' THEN 'LR'
        WHEN 'CL-10' THEN 'LL'
        WHEN 'CL-11' THEN 'AI'
        WHEN 'CL-12' THEN 'MA'
        WHEN 'CL-13' THEN 'RM'
        ELSE code
    END,
    name = COALESCE(name, region_name),
    level = COALESCE(level, 'region')
WHERE level = 'region' OR level IS NULL;

-- 4. Migrar datos para comunas: comuna_code -> code, comuna_name -> name
UPDATE territories 
SET 
    code = COALESCE(code, comuna_code),
    name = COALESCE(name, comuna_name),
    level = COALESCE(level, 'comuna')
WHERE level = 'comuna' OR (comuna_code IS NOT NULL AND level IS NULL);

-- 5. Hacer columnas NOT NULL donde sea necesario
ALTER TABLE territories ALTER COLUMN code SET NOT NULL;
ALTER TABLE territories ALTER COLUMN name SET NOT NULL;
ALTER TABLE territories ALTER COLUMN level SET NOT NULL;

-- 6. Crear índices
CREATE INDEX IF NOT EXISTS idx_territories_code ON territories(code);
CREATE INDEX IF NOT EXISTS idx_territories_level ON territories(level);
CREATE INDEX IF NOT EXISTS idx_territories_level_code ON territories(level, code);

-- 7. Crear constraint UNIQUE
ALTER TABLE territories DROP CONSTRAINT IF EXISTS territories_code_level_key;
ALTER TABLE territories ADD CONSTRAINT territories_code_level_key UNIQUE (code, level);

-- 8. Verificar datos migrados
SELECT level, code, name, region_code, region_name, COUNT(*) as count
FROM territories 
GROUP BY level, code, name, region_code, region_name
ORDER BY level, code;
