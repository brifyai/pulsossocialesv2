-- =============================================================================
-- FIX v2: Agregar columnas code y name a tabla territories
-- Ejecutar en Supabase SQL Editor para solucionar:
-- ERROR: column territories.code does not exist
-- =============================================================================

-- 1. Agregar columnas code y name si no existen (permitir NULL inicialmente)
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
        ALTER TABLE territories ADD COLUMN level VARCHAR(20);
        RAISE NOTICE '✅ Columna level agregada';
    ELSE
        RAISE NOTICE 'ℹ️ Columna level ya existe';
    END IF;
END $$;

-- 2. Primero, establecer level para todas las filas que no lo tengan
UPDATE territories 
SET level = CASE 
    WHEN region_code IS NOT NULL AND comuna_code IS NULL THEN 'region'
    WHEN comuna_code IS NOT NULL THEN 'comuna'
    ELSE 'region'
END
WHERE level IS NULL;

-- 3. Migrar datos para REGIONES: region_code -> code, region_name -> name
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
        ELSE region_code  -- Si no coincide, usar el valor original
    END,
    name = COALESCE(name, region_name, 'Sin nombre')
WHERE level = 'region';

-- 4. Migrar datos para COMUNAS: comuna_code -> code, comuna_name -> name
UPDATE territories 
SET 
    code = COALESCE(code, comuna_code, 'UNKNOWN'),
    name = COALESCE(name, comuna_name, 'Sin nombre')
WHERE level = 'comuna';

-- 5. Verificar que no hay NULLs antes de hacer NOT NULL
DO $$
DECLARE
    null_count INTEGER;
BEGIN
    -- Verificar code
    SELECT COUNT(*) INTO null_count FROM territories WHERE code IS NULL;
    IF null_count > 0 THEN
        RAISE NOTICE '⚠️ Hay % filas con code NULL, asignando valores por defecto...', null_count;
        UPDATE territories SET code = 'UNKNOWN_' || id::text WHERE code IS NULL;
    END IF;

    -- Verificar name
    SELECT COUNT(*) INTO null_count FROM territories WHERE name IS NULL;
    IF null_count > 0 THEN
        RAISE NOTICE '⚠️ Hay % filas con name NULL, asignando valores por defecto...', null_count;
        UPDATE territories SET name = 'Sin nombre' WHERE name IS NULL;
    END IF;

    -- Verificar level
    SELECT COUNT(*) INTO null_count FROM territories WHERE level IS NULL;
    IF null_count > 0 THEN
        RAISE NOTICE '⚠️ Hay % filas con level NULL, asignando valores por defecto...', null_count;
        UPDATE territories SET level = 'region' WHERE level IS NULL;
    END IF;
END $$;

-- 6. Ahora sí podemos hacer las columnas NOT NULL
ALTER TABLE territories ALTER COLUMN code SET NOT NULL;
ALTER TABLE territories ALTER COLUMN name SET NOT NULL;
ALTER TABLE territories ALTER COLUMN level SET NOT NULL;

-- 7. Crear índices para mejorar performance
CREATE INDEX IF NOT EXISTS idx_territories_code ON territories(code);
CREATE INDEX IF NOT EXISTS idx_territories_level ON territories(level);
CREATE INDEX IF NOT EXISTS idx_territories_level_code ON territories(level, code);

-- 8. Crear constraint UNIQUE (eliminar primero si existe)
ALTER TABLE territories DROP CONSTRAINT IF EXISTS territories_code_level_key;
ALTER TABLE territories ADD CONSTRAINT territories_code_level_key UNIQUE (code, level);

-- 9. Verificar datos migrados
SELECT 
    level, 
    COUNT(*) as total,
    COUNT(code) as with_code,
    COUNT(name) as with_name
FROM territories 
GROUP BY level
ORDER BY level;
