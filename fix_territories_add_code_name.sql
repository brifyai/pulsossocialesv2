-- =============================================================================
-- FIX: Agregar columnas code y name a tabla territories
-- Ejecutar en Supabase SQL Editor para solucionar:
-- ERROR: column territories.code does not exist
-- =============================================================================

-- 1. Agregar columnas code y name si no existen
DO $$
BEGIN
    -- Agregar columna code
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'territories' AND column_name = 'code'
    ) THEN
        ALTER TABLE territories ADD COLUMN code VARCHAR(20);
        RAISE NOTICE '✅ Columna code agregada';
    ELSE
        RAISE NOTICE 'ℹ️ Columna code ya existe';
    END IF;

    -- Agregar columna name
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'territories' AND column_name = 'name'
    ) THEN
        ALTER TABLE territories ADD COLUMN name VARCHAR(200);
        RAISE NOTICE '✅ Columna name agregada';
    ELSE
        RAISE NOTICE 'ℹ️ Columna name ya existe';
    END IF;

    -- Agregar columna level si no existe
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'territories' AND column_name = 'level'
    ) THEN
        ALTER TABLE territories ADD COLUMN level VARCHAR(20) DEFAULT 'region';
        RAISE NOTICE '✅ Columna level agregada';
    ELSE
        RAISE NOTICE 'ℹ️ Columna level ya existe';
    END IF;
END $$;

-- 2. Migrar datos: region_code -> code, region_name -> name para regiones
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

-- 3. Migrar datos para comunas: comuna_code -> code, comuna_name -> name
UPDATE territories 
SET 
    code = COALESCE(code, comuna_code),
    name = COALESCE(name, comuna_name),
    level = COALESCE(level, 'comuna')
WHERE level = 'comuna' OR (comuna_code IS NOT NULL AND level IS NULL);

-- 4. Hacer columnas NOT NULL donde sea necesario (solo si tienen datos)
DO $$
BEGIN
    -- Verificar si code tiene datos antes de hacer NOT NULL
    IF EXISTS (SELECT 1 FROM territories WHERE code IS NOT NULL LIMIT 1) THEN
        ALTER TABLE territories ALTER COLUMN code SET NOT NULL;
        RAISE NOTICE '✅ Columna code ahora es NOT NULL';
    END IF;
    
    -- Verificar si name tiene datos antes de hacer NOT NULL
    IF EXISTS (SELECT 1 FROM territories WHERE name IS NOT NULL LIMIT 1) THEN
        ALTER TABLE territories ALTER COLUMN name SET NOT NULL;
        RAISE NOTICE '✅ Columna name ahora es NOT NULL';
    END IF;
    
    -- Verificar si level tiene datos antes de hacer NOT NULL
    IF EXISTS (SELECT 1 FROM territories WHERE level IS NOT NULL LIMIT 1) THEN
        ALTER TABLE territories ALTER COLUMN level SET NOT NULL;
        RAISE NOTICE '✅ Columna level ahora es NOT NULL';
    END IF;
END $$;

-- 5. Crear índices para mejorar performance
CREATE INDEX IF NOT EXISTS idx_territories_code ON territories(code);
CREATE INDEX IF NOT EXISTS idx_territories_level ON territories(level);
CREATE INDEX IF NOT EXISTS idx_territories_level_code ON territories(level, code);

-- 6. Crear constraint UNIQUE (eliminar primero si existe)
ALTER TABLE territories DROP CONSTRAINT IF EXISTS territories_code_level_key;
ALTER TABLE territories ADD CONSTRAINT territories_code_level_key UNIQUE (code, level);

-- 7. Verificar datos migrados
SELECT 
    level, 
    COUNT(*) as total,
    COUNT(code) as with_code,
    COUNT(name) as with_name
FROM territories 
GROUP BY level
ORDER BY level;
