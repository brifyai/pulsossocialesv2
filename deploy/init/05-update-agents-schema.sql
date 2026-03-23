-- =============================================================================
-- ACTUALIZACIÓN DE SCHEMA PARA AGENTES V4.1.0
-- Añade campos faltantes para compatibilidad con los 25,000 agentes generados
-- =============================================================================

-- Añadir columnas faltantes a synthetic_agents
ALTER TABLE synthetic_agents 
    ADD COLUMN IF NOT EXISTS country_code VARCHAR(2) DEFAULT 'CL',
    ADD COLUMN IF NOT EXISTS region_code VARCHAR(10),
    ADD COLUMN IF NOT EXISTS comuna_code VARCHAR(10),
    ADD COLUMN IF NOT EXISTS urbanicity VARCHAR(10) CHECK (urbanicity IN ('urban', 'rural')),
    ADD COLUMN IF NOT EXISTS household_type VARCHAR(20),
    ADD COLUMN IF NOT EXISTS poverty_status VARCHAR(50),
    ADD COLUMN IF NOT EXISTS occupation_group VARCHAR(100),
    ADD COLUMN IF NOT EXISTS socioeconomic_level VARCHAR(20),
    ADD COLUMN IF NOT EXISTS digital_exposure_level VARCHAR(20) CHECK (digital_exposure_level IN ('low', 'medium', 'high')),
    ADD COLUMN IF NOT EXISTS preferred_survey_channel VARCHAR(20) CHECK (preferred_survey_channel IN ('phone', 'online', 'in_person')),
    ADD COLUMN IF NOT EXISTS agent_type VARCHAR(20),
    ADD COLUMN IF NOT EXISTS subtel_profile_key VARCHAR(100),
    ADD COLUMN IF NOT EXISTS casen_profile_key VARCHAR(100),
    ADD COLUMN IF NOT EXISTS generation_notes TEXT;

-- Actualizar constraint de education_level para incluir 'none'
ALTER TABLE synthetic_agents 
    DROP CONSTRAINT IF EXISTS synthetic_agents_education_level_check;

ALTER TABLE synthetic_agents 
    ADD CONSTRAINT synthetic_agents_education_level_check 
    CHECK (education_level IN ('none', 'primary', 'secondary', 'technical', 'university', 'postgraduate'));

-- Actualizar constraint de connectivity_level para incluir 'none'
ALTER TABLE synthetic_agents 
    DROP CONSTRAINT IF EXISTS synthetic_agents_connectivity_level_check;

ALTER TABLE synthetic_agents 
    ADD CONSTRAINT synthetic_agents_connectivity_level_check 
    CHECK (connectivity_level IN ('none', 'low', 'medium', 'high'));

-- Crear índices adicionales para los nuevos campos
CREATE INDEX IF NOT EXISTS idx_agents_country_code ON synthetic_agents(country_code);
CREATE INDEX IF NOT EXISTS idx_agents_region_code ON synthetic_agents(region_code);
CREATE INDEX IF NOT EXISTS idx_agents_comuna_code ON synthetic_agents(comuna_code);
CREATE INDEX IF NOT EXISTS idx_agents_urbanicity ON synthetic_agents(urbanicity);
CREATE INDEX IF NOT EXISTS idx_agents_poverty_status ON synthetic_agents(poverty_status);
CREATE INDEX IF NOT EXISTS idx_agents_digital_exposure ON synthetic_agents(digital_exposure_level);
CREATE INDEX IF NOT EXISTS idx_agents_survey_channel ON synthetic_agents(preferred_survey_channel);

-- Comentarios para los nuevos campos
COMMENT ON COLUMN synthetic_agents.country_code IS 'Código de país (CL)';
COMMENT ON COLUMN synthetic_agents.region_code IS 'Código de región (1-16)';
COMMENT ON COLUMN synthetic_agents.comuna_code IS 'Código de comuna';
COMMENT ON COLUMN synthetic_agents.urbanicity IS 'Urbano o rural';
COMMENT ON COLUMN synthetic_agents.household_type IS 'Tipo de hogar';
COMMENT ON COLUMN synthetic_agents.poverty_status IS 'Estado de pobreza';
COMMENT ON COLUMN synthetic_agents.digital_exposure_level IS 'Nivel de exposición digital';
COMMENT ON COLUMN synthetic_agents.preferred_survey_channel IS 'Canal preferido para encuestas';

-- Verificar estructura actualizada
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'synthetic_agents' 
ORDER BY ordinal_position;
