-- =============================================================================
-- Migración: Agregar columnas faltantes a synthetic_agents
-- Fecha: 2025-03-24
-- =============================================================================

-- Agregar columnas faltantes para el enriquecimiento de agentes
ALTER TABLE synthetic_agents 
ADD COLUMN IF NOT EXISTS version VARCHAR(20),
ADD COLUMN IF NOT EXISTS country_code VARCHAR(2) DEFAULT 'CL',
ADD COLUMN IF NOT EXISTS region_code VARCHAR(10),
ADD COLUMN IF NOT EXISTS comuna_code VARCHAR(10),
ADD COLUMN IF NOT EXISTS province_code VARCHAR(10),
ADD COLUMN IF NOT EXISTS urbanicity VARCHAR(20) CHECK (urbanicity IN ('urban', 'rural', 'mixed')),
ADD COLUMN IF NOT EXISTS household_type VARCHAR(20),
ADD COLUMN IF NOT EXISTS poverty_status VARCHAR(20),
ADD COLUMN IF NOT EXISTS occupation_status VARCHAR(50),
ADD COLUMN IF NOT EXISTS employment_status VARCHAR(50),
ADD COLUMN IF NOT EXISTS preferred_survey_channel VARCHAR(20) CHECK (preferred_survey_channel IN ('online', 'phone', 'in_person', 'mixed'));

-- Actualizar columnas existentes para permitir NULL si es necesario
ALTER TABLE synthetic_agents 
ALTER COLUMN location_lat DROP NOT NULL,
ALTER COLUMN location_lng DROP NOT NULL;

-- Crear índices para las nuevas columnas
CREATE INDEX IF NOT EXISTS idx_agents_region_code ON synthetic_agents(region_code);
CREATE INDEX IF NOT EXISTS idx_agents_comuna_code ON synthetic_agents(comuna_code);
CREATE INDEX IF NOT EXISTS idx_agents_employment_status ON synthetic_agents(employment_status);
CREATE INDEX IF NOT EXISTS idx_agents_urbanicity ON synthetic_agents(urbanicity);

-- Comentarios
COMMENT ON COLUMN synthetic_agents.version IS 'Versión del agente sintético';
COMMENT ON COLUMN synthetic_agents.country_code IS 'Código del país (CL para Chile)';
COMMENT ON COLUMN synthetic_agents.region_code IS 'Código de la región';
COMMENT ON COLUMN synthetic_agents.comuna_code IS 'Código de la comuna';
COMMENT ON COLUMN synthetic_agents.province_code IS 'Código de la provincia';
COMMENT ON COLUMN synthetic_agents.urbanicity IS 'Tipo de zona: urban, rural, mixed';
COMMENT ON COLUMN synthetic_agents.household_type IS 'Tipo de hogar';
COMMENT ON COLUMN synthetic_agents.poverty_status IS 'Estado de pobreza';
COMMENT ON COLUMN synthetic_agents.occupation_status IS 'Estado ocupacional';
COMMENT ON COLUMN synthetic_agents.employment_status IS 'Estado de empleo';
COMMENT ON COLUMN synthetic_agents.preferred_survey_channel IS 'Canal preferido para encuestas';

-- Verificar que las columnas se agregaron correctamente
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'synthetic_agents' 
ORDER BY ordinal_position;