-- =============================================================================
-- MIGRACIÓN: Actualizar tabla territories para modelo alineado
-- Fecha: 2026-03-16
-- Objetivo: Soportar regiones y comunas con códigos cortos (RM, VA, etc.)
-- =============================================================================

-- =============================================================================
-- PASO 1: Backup de datos existentes (si los hay)
-- =============================================================================
-- Crear tabla temporal de backup
CREATE TABLE IF NOT EXISTS territories_backup AS SELECT * FROM territories;

-- =============================================================================
-- PASO 2: Eliminar tabla existente y sus dependencias
-- =============================================================================
-- Eliminar triggers
DROP TRIGGER IF EXISTS update_territories_updated_at ON territories;

-- Eliminar políticas RLS
DROP POLICY IF EXISTS "Allow anonymous read" ON territories;

-- Eliminar índices
DROP INDEX IF EXISTS idx_territories_region_code;
DROP INDEX IF EXISTS idx_territories_comuna_code;
DROP INDEX IF EXISTS idx_territories_comuna_name;
DROP INDEX IF EXISTS idx_territories_geometry;

-- Eliminar tabla
DROP TABLE IF EXISTS territories CASCADE;

-- =============================================================================
-- PASO 3: Crear nueva tabla territories con modelo alineado
-- =============================================================================
CREATE TABLE territories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Identificación jerárquica
    level VARCHAR(20) NOT NULL CHECK (level IN ('region', 'comuna', 'provincia')),
    
    -- Códigos de identificación (flexibles)
    code VARCHAR(10) NOT NULL,                    -- Código primario: RM, VA, 13101, etc.
    region_code VARCHAR(10),                      -- Código de región padre (para comunas)
    
    -- Nombres
    name VARCHAR(100) NOT NULL,                   -- Nombre del territorio
    region_name VARCHAR(100),                     -- Nombre de la región (para comunas)
    
    -- Datos demográficos
    population_total INTEGER,
    population_urban INTEGER,
    population_rural INTEGER,
    
    -- Geometría
    centroid JSONB,                               -- [lng, lat] como JSONB
    geometry JSONB,                               -- GeoJSON Polygon/MultiPolygon
    bbox NUMERIC[4],                              -- [minX, minY, maxX, maxY]
    
    -- Metadatos
    source VARCHAR(50) DEFAULT 'ine',
    source_year INTEGER DEFAULT 2017,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT unique_code_level UNIQUE (code, level)  -- Un código puede existir en diferentes niveles
);

-- =============================================================================
-- PASO 4: Crear índices optimizados
-- =============================================================================
CREATE INDEX idx_territories_level ON territories(level);
CREATE INDEX idx_territories_code ON territories(code);
CREATE INDEX idx_territories_region_code ON territories(region_code);
CREATE INDEX idx_territories_name ON territories(name);
CREATE INDEX idx_territories_centroid ON territories USING GIN(centroid);
CREATE INDEX idx_territories_geometry ON territories USING GIN(geometry);

-- =============================================================================
-- PASO 5: Recrear trigger para updated_at
-- =============================================================================
CREATE TRIGGER update_territories_updated_at
    BEFORE UPDATE ON territories
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- PASO 6: Recrear políticas RLS
-- =============================================================================
ALTER TABLE territories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow anonymous read" ON territories
    FOR SELECT USING (true);

-- =============================================================================
-- PASO 7: Actualizar vista region_summary
-- =============================================================================
DROP VIEW IF EXISTS region_summary;

CREATE OR REPLACE VIEW region_summary AS
SELECT 
    t.code AS region_code,
    t.name AS region_name,
    COUNT(DISTINCT c.code) AS comuna_count,
    SUM(t.population_total) AS total_population,
    COUNT(DISTINCT sa.id) AS agent_count
FROM territories t
LEFT JOIN territories c ON c.region_code = t.code AND c.level = 'comuna'
LEFT JOIN synthetic_agents sa ON sa.territory_id = t.id
WHERE t.level = 'region'
GROUP BY t.code, t.name
ORDER BY t.code;

-- =============================================================================
-- PASO 8: Comentarios
-- =============================================================================
COMMENT ON TABLE territories IS 'Territorios administrativos de Chile (regiones y comunas)';
COMMENT ON COLUMN territories.code IS 'Código único del territorio (RM, VA, 13101, etc.)';
COMMENT ON COLUMN territories.level IS 'Nivel administrativo: region, comuna, provincia';
COMMENT ON COLUMN territories.centroid IS 'Centroide del territorio como [lng, lat]';
COMMENT ON COLUMN territories.geometry IS 'GeoJSON Polygon/MultiPolygon del territorio';

-- =============================================================================
-- FIN DE LA MIGRACIÓN
-- =============================================================================
