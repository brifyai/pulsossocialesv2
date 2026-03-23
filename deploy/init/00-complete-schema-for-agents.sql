-- =============================================================================
-- SCHEMA COMPLETO PARA PULSOS SOCIALES - V2.0
-- Crea todas las tablas necesarias incluyendo synthetic_agents con campos v4.1.0
-- =============================================================================

-- =============================================================================
-- 1. EXTENSIONES
-- =============================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================================================
-- 2. TABLA: TERRITORIES (Territorios de Chile)
-- =============================================================================
CREATE TABLE IF NOT EXISTS territories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    country_code VARCHAR(2) NOT NULL DEFAULT 'CL',
    region_code VARCHAR(10) NOT NULL,
    region_name VARCHAR(100) NOT NULL,
    comuna_code VARCHAR(10) NOT NULL UNIQUE,
    comuna_name VARCHAR(100) NOT NULL,
    geometry JSONB,
    bbox NUMERIC[4],
    population_total INTEGER,
    population_urban INTEGER,
    population_rural INTEGER,
    source VARCHAR(50) DEFAULT 'ine',
    source_year INTEGER DEFAULT 2017,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT valid_country CHECK (country_code = 'CL')
);

CREATE INDEX IF NOT EXISTS idx_territories_region_code ON territories(region_code);
CREATE INDEX IF NOT EXISTS idx_territories_comuna_code ON territories(comuna_code);
CREATE INDEX IF NOT EXISTS idx_territories_comuna_name ON territories(comuna_name);

-- =============================================================================
-- 3. TABLA: SYNTHETIC_AGENTS (Agentes Sintéticos v4.1.0)
-- =============================================================================
CREATE TABLE IF NOT EXISTS synthetic_agents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Identificación
    agent_id VARCHAR(50) NOT NULL UNIQUE,
    batch_id VARCHAR(50) NOT NULL,
    version VARCHAR(20) DEFAULT 'v4.1.0',
    
    -- Ubicación
    country_code VARCHAR(2) DEFAULT 'CL',
    region_code VARCHAR(10),
    comuna_code VARCHAR(10),
    province_code VARCHAR(10),
    urbanicity VARCHAR(10) CHECK (urbanicity IN ('urban', 'rural')),
    
    -- Demografía
    sex VARCHAR(10) CHECK (sex IN ('male', 'female')),
    age INTEGER CHECK (age >= 0 AND age <= 120),
    age_group VARCHAR(20) CHECK (age_group IN ('child', 'youth', 'young_adult', 'adult', 'middle_age', 'senior', 'elderly')),
    
    -- Socioeconómico
    household_type VARCHAR(20),
    poverty_status VARCHAR(50),
    education_level VARCHAR(50) CHECK (education_level IN ('none', 'primary', 'secondary', 'technical', 'university', 'postgraduate')),
    occupation_status VARCHAR(50),
    occupation_group VARCHAR(100),
    socioeconomic_level VARCHAR(20),
    income_decile INTEGER CHECK (income_decile >= 1 AND income_decile <= 10),
    
    -- Digital
    connectivity_level VARCHAR(20) CHECK (connectivity_level IN ('none', 'low', 'medium', 'high')),
    digital_exposure_level VARCHAR(20) CHECK (digital_exposure_level IN ('low', 'medium', 'high')),
    preferred_survey_channel VARCHAR(20) CHECK (preferred_survey_channel IN ('phone', 'online', 'in_person')),
    has_smartphone BOOLEAN DEFAULT FALSE,
    has_computer BOOLEAN DEFAULT FALSE,
    internet_quality VARCHAR(20),
    
    -- Ubicación geográfica
    location_lat NUMERIC(10, 8),
    location_lng NUMERIC(11, 8),
    
    -- Traceabilidad
    backbone_key VARCHAR(100),
    subtel_profile_key VARCHAR(100),
    casen_profile_key VARCHAR(100),
    synthesis_version VARCHAR(20) DEFAULT 'v4.1.0',
    generation_notes TEXT,
    
    -- Tipo de agente
    agent_type VARCHAR(20),
    
    -- Metadata
    metadata JSONB DEFAULT '{}',
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para synthetic_agents
CREATE INDEX IF NOT EXISTS idx_agents_agent_id ON synthetic_agents(agent_id);
CREATE INDEX IF NOT EXISTS idx_agents_batch_id ON synthetic_agents(batch_id);
CREATE INDEX IF NOT EXISTS idx_agents_country_code ON synthetic_agents(country_code);
CREATE INDEX IF NOT EXISTS idx_agents_region_code ON synthetic_agents(region_code);
CREATE INDEX IF NOT EXISTS idx_agents_comuna_code ON synthetic_agents(comuna_code);
CREATE INDEX IF NOT EXISTS idx_agents_urbanicity ON synthetic_agents(urbanicity);
CREATE INDEX IF NOT EXISTS idx_agents_sex ON synthetic_agents(sex);
CREATE INDEX IF NOT EXISTS idx_agents_age_group ON synthetic_agents(age_group);
CREATE INDEX IF NOT EXISTS idx_agents_education ON synthetic_agents(education_level);
CREATE INDEX IF NOT EXISTS idx_agents_poverty ON synthetic_agents(poverty_status);
CREATE INDEX IF NOT EXISTS idx_agents_connectivity ON synthetic_agents(connectivity_level);
CREATE INDEX IF NOT EXISTS idx_agents_digital_exposure ON synthetic_agents(digital_exposure_level);
CREATE INDEX IF NOT EXISTS idx_agents_survey_channel ON synthetic_agents(preferred_survey_channel);

-- Comentarios
COMMENT ON TABLE synthetic_agents IS 'Agentes sintéticos generados por el pipeline de población v4.1.0';
COMMENT ON COLUMN synthetic_agents.agent_id IS 'ID único del agente (ej: 2807908_1_1)';
COMMENT ON COLUMN synthetic_agents.batch_id IS 'Identificador del lote de generación';
COMMENT ON COLUMN synthetic_agents.region_code IS 'Código de región (1-16)';
COMMENT ON COLUMN synthetic_agents.comuna_code IS 'Código de comuna (ej: 1101)';

-- =============================================================================
-- 4. TABLA: SURVEY_DEFINITIONS (Definiciones de Encuestas)
-- =============================================================================
CREATE TABLE IF NOT EXISTS survey_definitions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(200) NOT NULL,
    slug VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    segment JSONB DEFAULT '{}',
    questions JSONB NOT NULL DEFAULT '[]',
    config JSONB DEFAULT '{}',
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'paused', 'completed', 'archived')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID,
    metadata JSONB DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_surveys_slug ON survey_definitions(slug);
CREATE INDEX IF NOT EXISTS idx_surveys_status ON survey_definitions(status);

-- =============================================================================
-- 5. TABLA: SURVEY_RUNS (Ejecuciones de Encuestas)
-- =============================================================================
CREATE TABLE IF NOT EXISTS survey_runs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    survey_id UUID NOT NULL REFERENCES survey_definitions(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'paused', 'completed', 'failed')),
    progress_percent INTEGER DEFAULT 0 CHECK (progress_percent >= 0 AND progress_percent <= 100),
    current_batch INTEGER DEFAULT 0,
    total_batches INTEGER DEFAULT 0,
    sample_size_requested INTEGER NOT NULL,
    sample_size_actual INTEGER DEFAULT 0,
    agents_selected UUID[],
    results_summary JSONB DEFAULT '{}',
    benchmark_comparison_id UUID,
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_survey_runs_survey ON survey_runs(survey_id);
CREATE INDEX IF NOT EXISTS idx_survey_runs_status ON survey_runs(status);

-- =============================================================================
-- 6. TABLA: SURVEY_RESPONSES (Respuestas Individuales)
-- =============================================================================
CREATE TABLE IF NOT EXISTS survey_responses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    survey_id UUID NOT NULL REFERENCES survey_definitions(id) ON DELETE CASCADE,
    run_id UUID NOT NULL REFERENCES survey_runs(id) ON DELETE CASCADE,
    agent_id UUID REFERENCES synthetic_agents(id),
    question_id VARCHAR(100) NOT NULL,
    value JSONB NOT NULL,
    confidence NUMERIC(3, 2) CHECK (confidence >= 0 AND confidence <= 1),
    reasoning TEXT,
    response_time_ms INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_responses_survey ON survey_responses(survey_id);
CREATE INDEX IF NOT EXISTS idx_responses_run ON survey_responses(run_id);
CREATE INDEX IF NOT EXISTS idx_responses_agent ON survey_responses(agent_id);

-- =============================================================================
-- 7. TABLA: SURVEY_RESULTS (Resultados Agregados)
-- =============================================================================
CREATE TABLE IF NOT EXISTS survey_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    run_id UUID NOT NULL REFERENCES survey_runs(id) ON DELETE CASCADE,
    survey_id UUID NOT NULL REFERENCES survey_definitions(id) ON DELETE CASCADE,
    result_type VARCHAR(50) NOT NULL DEFAULT 'aggregated',
    result_data JSONB NOT NULL DEFAULT '{}',
    summary JSONB DEFAULT '{}',
    results JSONB DEFAULT '[]',
    metadata JSONB DEFAULT '{}',
    generated_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_survey_results_run_id ON survey_results(run_id);
CREATE INDEX IF NOT EXISTS idx_survey_results_survey_id ON survey_results(survey_id);

-- =============================================================================
-- 8. TABLA: BENCHMARKS (Datos de Referencia)
-- =============================================================================
CREATE TABLE IF NOT EXISTS benchmarks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    source VARCHAR(50) NOT NULL CHECK (source IN ('casen', 'subtel', 'cep', 'ine', 'custom')),
    source_year INTEGER NOT NULL,
    source_name VARCHAR(200),
    description TEXT,
    coverage JSONB DEFAULT '{}',
    indicators JSONB NOT NULL DEFAULT '[]',
    raw_data JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_benchmarks_source ON benchmarks(source, source_year);

-- =============================================================================
-- 9. TABLA: BENCHMARK_COMPARISONS
-- =============================================================================
CREATE TABLE IF NOT EXISTS benchmark_comparisons (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    survey_id UUID REFERENCES survey_definitions(id),
    run_id UUID REFERENCES survey_runs(id),
    benchmark_id UUID NOT NULL REFERENCES benchmarks(id),
    comparisons JSONB NOT NULL DEFAULT '[]',
    summary JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'
);

-- =============================================================================
-- 10. FUNCIONES Y TRIGGERS
-- =============================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers para updated_at (DROP IF EXISTS primero para evitar errores)
DROP TRIGGER IF EXISTS update_territories_updated_at ON territories;
CREATE TRIGGER update_territories_updated_at
    BEFORE UPDATE ON territories
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_synthetic_agents_updated_at ON synthetic_agents;
CREATE TRIGGER update_synthetic_agents_updated_at
    BEFORE UPDATE ON synthetic_agents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_survey_definitions_updated_at ON survey_definitions;
CREATE TRIGGER update_survey_definitions_updated_at
    BEFORE UPDATE ON survey_definitions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_survey_runs_updated_at ON survey_runs;
CREATE TRIGGER update_survey_runs_updated_at
    BEFORE UPDATE ON survey_runs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_survey_results_updated_at ON survey_results;
CREATE TRIGGER update_survey_results_updated_at
    BEFORE UPDATE ON survey_results
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_benchmarks_updated_at ON benchmarks;
CREATE TRIGGER update_benchmarks_updated_at
    BEFORE UPDATE ON benchmarks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- 11. ROW LEVEL SECURITY (RLS)
-- =============================================================================
ALTER TABLE territories ENABLE ROW LEVEL SECURITY;
ALTER TABLE synthetic_agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE survey_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE survey_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE survey_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE survey_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE benchmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE benchmark_comparisons ENABLE ROW LEVEL SECURITY;

-- Políticas de lectura anónima
DROP POLICY IF EXISTS "Allow anonymous read" ON territories;
CREATE POLICY "Allow anonymous read" ON territories FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow anonymous read" ON synthetic_agents;
CREATE POLICY "Allow anonymous read" ON synthetic_agents FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow anonymous read" ON survey_definitions;
CREATE POLICY "Allow anonymous read" ON survey_definitions FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow anonymous read" ON survey_runs;
CREATE POLICY "Allow anonymous read" ON survey_runs FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow anonymous read" ON survey_responses;
CREATE POLICY "Allow anonymous read" ON survey_responses FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow anonymous read" ON survey_results;
CREATE POLICY "Allow anonymous read" ON survey_results FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow anonymous read" ON benchmarks;
CREATE POLICY "Allow anonymous read" ON benchmarks FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow anonymous read" ON benchmark_comparisons;
CREATE POLICY "Allow anonymous read" ON benchmark_comparisons FOR SELECT USING (true);

-- Políticas de escritura anónima (para desarrollo)
DROP POLICY IF EXISTS "Allow anonymous insert" ON survey_definitions;
CREATE POLICY "Allow anonymous insert" ON survey_definitions FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anonymous insert" ON survey_runs;
CREATE POLICY "Allow anonymous insert" ON survey_runs FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anonymous insert" ON survey_responses;
CREATE POLICY "Allow anonymous insert" ON survey_responses FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anonymous insert" ON survey_results;
CREATE POLICY "Allow anonymous insert" ON survey_results FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anonymous insert" ON synthetic_agents;
CREATE POLICY "Allow anonymous insert" ON synthetic_agents FOR INSERT WITH CHECK (true);

-- =============================================================================
-- 12. DATOS INICIALES: Regiones de Chile
-- =============================================================================
INSERT INTO territories (region_code, region_name, comuna_code, comuna_name, population_total) VALUES
    ('CL-15', 'Arica y Parinacota', '15101', 'Arica', 226068),
    ('CL-01', 'Tarapacá', '01101', 'Iquique', 330558),
    ('CL-02', 'Antofagasta', '02101', 'Antofagasta', 607534),
    ('CL-03', 'Atacama', '03101', 'Copiapó', 286168),
    ('CL-04', 'Coquimbo', '04101', 'La Serena', 757586),
    ('CL-05', 'Valparaíso', '05101', 'Valparaíso', 1815902),
    ('RM', 'Metropolitana de Santiago', '13101', 'Santiago', 7112808),
    ('CL-06', 'Libertador General Bernardo O''Higgins', '06101', 'Rancagua', 914555),
    ('CL-07', 'Maule', '07101', 'Talca', 1044950),
    ('CL-16', 'Ñuble', '16101', 'Chillán', 480609),
    ('CL-08', 'Biobío', '08101', 'Concepción', 1556805),
    ('CL-09', 'La Araucanía', '09101', 'Temuco', 957224),
    ('CL-14', 'Los Ríos', '14101', 'Valdivia', 384837),
    ('CL-10', 'Los Lagos', '10101', 'Puerto Montt', 828708),
    ('CL-11', 'Aysén del General Carlos Ibáñez del Campo', '11101', 'Coyhaique', 103158),
    ('CL-12', 'Magallanes y de la Antártica Chilena', '12101', 'Punta Arenas', 166533)
ON CONFLICT (comuna_code) DO NOTHING;

-- =============================================================================
-- 13. VERIFICACIÓN
-- =============================================================================
SELECT 'Tablas creadas exitosamente' as status;

SELECT table_name, 
       (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count
FROM information_schema.tables t
WHERE table_schema = 'public' 
  AND table_name IN ('territories', 'synthetic_agents', 'survey_definitions', 'survey_runs', 
                     'survey_responses', 'survey_results', 'benchmarks', 'benchmark_comparisons')
ORDER BY table_name;
