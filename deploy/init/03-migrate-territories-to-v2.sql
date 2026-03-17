-- =============================================================================
-- MIGRACIÓN: Actualizar tabla territories al Modelo Alineado v2.0
-- Fecha: 2026-03-16
-- 
-- Este script migra la tabla territories existente al nuevo modelo:
-- - Agrega columnas: level, code, centroid
-- - Migra datos de region_code -> code
-- - Actualiza índices y constraints
-- =============================================================================

-- =============================================================================
-- 1. VERIFICAR ESTADO ACTUAL
-- =============================================================================
\echo '=== Verificando estado actual de la tabla territories ==='

-- Verificar si existe la tabla
SELECT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'territories'
) as table_exists;

-- Verificar columnas actuales
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'territories'
ORDER BY ordinal_position;

-- =============================================================================
-- 2. AGREGAR COLUMNAS NUEVAS (si no existen)
-- =============================================================================
\echo '=== Agregando columnas nuevas ==='

-- Agregar columna level
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'territories' AND column_name = 'level'
    ) THEN
        ALTER TABLE territories ADD COLUMN level VARCHAR(20) NOT NULL DEFAULT 'region';
        \echo 'Columna level agregada';
    ELSE
        \echo 'Columna level ya existe';
    END IF;
END $$;

-- Agregar columna code
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'territories' AND column_name = 'code'
    ) THEN
        ALTER TABLE territories ADD COLUMN code VARCHAR(20);
        \echo 'Columna code agregada';
    ELSE
        \echo 'Columna code ya existe';
    END IF;
END $$;

-- Agregar columna centroid (tipo POINT)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'territories' AND column_name = 'centroid'
    ) THEN
        ALTER TABLE territories ADD COLUMN centroid POINT;
        \echo 'Columna centroid agregada';
    ELSE
        \echo 'Columna centroid ya existe';
    END IF;
END $$;

-- Agregar columna region_name (si no existe)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'territories' AND column_name = 'region_name'
    ) THEN
        ALTER TABLE territories ADD COLUMN region_name VARCHAR(200);
        \echo 'Columna region_name agregada';
    ELSE
        \echo 'Columna region_name ya existe';
    END IF;
END $$;

-- =============================================================================
-- 3. MIGRAR DATOS EXISTENTES
-- =============================================================================
\echo '=== Migrando datos existentes ==='

-- Mapeo de códigos antiguos (CL-XX) a códigos cortos (RM, VA, etc.)
UPDATE territories 
SET code = CASE region_code
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
    ELSE region_code  -- Si no coincide, mantener el valor original
END
WHERE code IS NULL OR code = '';

-- Actualizar level para registros existentes
UPDATE territories 
SET level = 'region' 
WHERE level IS NULL OR level = '';

-- Actualizar region_name con region_name existente
UPDATE territories 
SET region_name = name 
WHERE region_name IS NULL AND level = 'region';

\echo 'Datos migrados';

-- =============================================================================
-- 4. ACTUALIZAR CONSTRAINTS
-- =============================================================================
\echo '=== Actualizando constraints ==='

-- Hacer code NOT NULL después de la migración
ALTER TABLE territories 
ALTER COLUMN code SET NOT NULL;

-- Eliminar constraint UNIQUE antiguo si existe (region_code, comuna_code)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_name = 'territories' 
        AND constraint_name = 'territories_region_code_comuna_code_key'
    ) THEN
        ALTER TABLE territories DROP CONSTRAINT territories_region_code_comuna_code_key;
        \echo 'Constraint antiguo eliminado';
    END IF;
END $$;

-- Agregar constraint UNIQUE nuevo (code, level)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_name = 'territories' 
        AND constraint_name = 'territories_code_level_key'
    ) THEN
        ALTER TABLE territories ADD CONSTRAINT territories_code_level_key UNIQUE (code, level);
        \echo 'Constraint UNIQUE (code, level) agregado';
    ELSE
        \echo 'Constraint UNIQUE (code, level) ya existe';
    END IF;
END $$;

-- =============================================================================
-- 5. ACTUALIZAR ÍNDICES
-- =============================================================================
\echo '=== Actualizando índices ==='

-- Índice para búsquedas por level
CREATE INDEX IF NOT EXISTS idx_territories_level ON territories(level);

-- Índice para búsquedas por code
CREATE INDEX IF NOT EXISTS idx_territories_code ON territories(code);

-- Índice para búsquedas por region_code (para comunas)
CREATE INDEX IF NOT EXISTS idx_territories_region_code ON territories(region_code);

\echo 'Índices creados';

-- =============================================================================
-- 6. ACTUALIZAR VISTA region_summary
-- =============================================================================
\echo '=== Actualizando vista region_summary ==='

DROP VIEW IF EXISTS region_summary;

CREATE VIEW region_summary AS
SELECT 
    code,
    name,
    population_total,
    centroid
FROM territories
WHERE level = 'region'
ORDER BY code;

\echo 'Vista region_summary actualizada';

-- =============================================================================
-- 7. VERIFICACIÓN FINAL
-- =============================================================================
\echo '=== Verificación final ==='

-- Verificar estructura final
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'territories'
ORDER BY ordinal_position;

-- Verificar datos migrados
SELECT 
    code,
    name,
    level,
    CASE WHEN centroid IS NOT NULL THEN '✓' ELSE '✗' END as has_centroid
FROM territories
WHERE level = 'region'
ORDER BY code;

\echo '=== Migración completada ===';
