-- =============================================================================
-- Pulsos Sociales - Schema de Base de Datos
-- Supabase Self-Hosted / PostgreSQL 15
-- =============================================================================
--
-- Este archivo crea el schema inicial para Pulsos Sociales.
-- Ejecutar en Supabase Studio SQL Editor o via psql.
--
-- =============================================================================

-- =============================================================================
-- EXTENSIONES
-- =============================================================================

-- UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- PostGIS para datos geoespaciales (si está disponible)
-- CREATE EXTENSION IF NOT EXISTS "postgis";

-- =============================================================================
-- TABLAS PRINCIPALES
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. USERS - Usuarios de la aplicación (Auth propio, NO Supabase Auth)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Identificación
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    
    -- Perfil
    name VARCHAR(255),
    avatar TEXT,
    
    -- Roles y permisos
    role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('user', 'admin', 'moderator')),
    is_active BOOLEAN DEFAULT TRUE,
    email_verified BOOLEAN DEFAULT FALSE,
    
    -- Tracking
    last_login_at TIMESTAMPTZ,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para users
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_active ON users(is_active);

-- Comentarios
COMMENT ON TABLE users IS 'Usuarios de la aplicación - Auth propio sin dependencia de GoTrue';
COMMENT ON COLUMN users.password_hash IS 'Hash SHA-256 del password con salt';

-- Trigger para updated_at
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Política RLS para users
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Permitir lectura de usuarios activos (para login)
CREATE POLICY "Allow read active users" ON users
    FOR SELECT USING (is_active = true);

-- -----------------------------------------------------------------------------
-- 2. TERRITORIES - Territorios administrativos de Chile
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS territories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Identificación administrativa
    country_code VARCHAR(2) NOT NULL DEFAULT 'CL',
    region_code VARCHAR(10) NOT NULL,           -- Ej: 'CL-13'
    region_name VARCHAR(100) NOT NULL,          -- Ej: 'Metropolitana de Santiago'
    comuna_code VARCHAR(10) NOT NULL UNIQUE,    -- Ej: '13101'
    comuna_name VARCHAR(100) NOT NULL,          -- Ej: 'Santiago'
    
    -- Geometría (GeoJSON como JSONB)
    geometry JSONB,
    bbox NUMERIC[4],                            -- [minX, minY, maxX, maxY]
    
    -- Población
    population_total INTEGER,
    population_urban INTEGER,
    population_rural INTEGER,
    
    -- Metadatos
    source VARCHAR(50) DEFAULT 'ine',
    source_year INTEGER DEFAULT 2017,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT valid_country CHECK (country_code = 'CL'),
    CONSTRAINT valid_region_code CHECK (region_code ~ '^CL-[0-9]+$')
);

-- Índices para territories
CREATE INDEX IF NOT EXISTS idx_territories_region_code ON territories(region_code);
CREATE INDEX IF NOT EXISTS idx_territories_comuna_code ON territories(comuna_code);
CREATE INDEX IF NOT EXISTS idx_territories_comuna_name ON territories(comuna_name);
CREATE INDEX IF NOT EXISTS idx_territories_geometry ON territories USING GIN(geometry);

-- Comentarios
COMMENT ON TABLE territories IS 'Territorios administrativos de Chile (regiones y comunas)';
COMMENT ON COLUMN territories.comuna_code IS 'Código único de comuna según INE';
COMMENT ON COLUMN territories.geometry IS 'GeoJSON Polygon/MultiPolygon de la comuna';

-- -----------------------------------------------------------------------------
-- 2. SYNTHETIC_AGENTS - Agentes sintéticos generados
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS synthetic_agents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Identificación
    agent_id VARCHAR(50) NOT NULL UNIQUE,       -- Ej: 'AGENT-CL13-000001'
    batch_id VARCHAR(50) NOT NULL,              -- Lote de generación
    territory_id UUID REFERENCES territories(id),
    
    -- Demografía
    sex VARCHAR(10) CHECK (sex IN ('male', 'female')),
    age INTEGER CHECK (age >= 0 AND age <= 120),
    age_group VARCHAR(20) CHECK (age_group IN ('child', 'youth', 'young_adult', 'adult', 'senior', 'elderly')),
    
    -- Socioeconómico
    income_decile INTEGER CHECK (income_decile >= 1 AND income_decile <= 10),
    education_level VARCHAR(50) CHECK (education_level IN ('none', 'primary', 'secondary', 'technical', 'university', 'postgraduate')),
    employment_status VARCHAR(50),
    
    -- Digital
    connectivity_level VARCHAR(20) CHECK (connectivity_level IN ('none', 'low', 'medium', 'high')),
    has_smartphone BOOLEAN DEFAULT FALSE,
    has_computer BOOLEAN DEFAULT FALSE,
    internet_quality VARCHAR(20),
    
    -- Ubicación (dentro del territorio)
    location_lat NUMERIC(10, 8),
    location_lng NUMERIC(11, 8),
    
    -- Traceabilidad
    backbone_key VARCHAR(100),                  -- Referencia al backbone
    synthesis_version VARCHAR(20) DEFAULT '1.0',
    
    -- Metadatos
    metadata JSONB DEFAULT '{}',
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para synthetic_agents
CREATE INDEX IF NOT EXISTS idx_agents_batch_id ON synthetic_agents(batch_id);
CREATE INDEX IF NOT EXISTS idx_agents_territory ON synthetic_agents(territory_id);
CREATE INDEX IF NOT EXISTS idx_agents_region ON synthetic_agents(agent_id);
CREATE INDEX IF NOT EXISTS idx_agents_age_group ON synthetic_agents(age_group);
CREATE INDEX IF NOT EXISTS idx_agents_income ON synthetic_agents(income_decile);
CREATE INDEX IF NOT EXISTS idx_agents_connectivity ON synthetic_agents(connectivity_level);

-- Comentarios
COMMENT ON TABLE synthetic_agents IS 'Agentes sintéticos generados por el pipeline de población';
COMMENT ON COLUMN synthetic_agents.backbone_key IS 'Referencia a la fila del backbone usada para generar este agente';

-- -----------------------------------------------------------------------------
-- 3. SURVEY_DEFINITIONS - Definiciones de encuestas
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS survey_definitions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Identificación
    name VARCHAR(200) NOT NULL,
    slug VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    
    -- Segmentación objetivo
    segment JSONB DEFAULT '{}',
    -- Ejemplo: {"region_codes": ["CL-13"], "age_groups": ["adult"], "income_deciles": [1,2,3]}
    
    -- Preguntas
    questions JSONB NOT NULL DEFAULT '[]',
    -- Ejemplo: [{"id": "q1", "type": "single_choice", "text": "...", "options": [...]}]
    
    -- Configuración
    config JSONB DEFAULT '{}',
    -- Ejemplo: {"sample_size": 1000, "confidence_level": 0.95}
    
    -- Estado
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'paused', 'completed', 'archived')),
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    published_at TIMESTAMPTZ,  -- Fecha de publicación (null si está en draft)
    created_by UUID,  -- Referencia a auth.users si se usa auth
    
    -- Metadatos
    metadata JSONB DEFAULT '{}'
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_surveys_slug ON survey_definitions(slug);
CREATE INDEX IF NOT EXISTS idx_surveys_status ON survey_definitions(status);
CREATE INDEX IF NOT EXISTS idx_surveys_segment ON survey_definitions USING GIN(segment);

-- Comentarios
COMMENT ON TABLE survey_definitions IS 'Definiciones de encuestas sintéticas';
COMMENT ON COLUMN survey_definitions.questions IS 'Array de preguntas en formato JSON';
COMMENT ON COLUMN survey_definitions.segment IS 'Criterios de segmentación para selección de agentes';

-- -----------------------------------------------------------------------------
-- 4. SURVEY_RUNS - Ejecuciones de encuestas
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS survey_runs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Referencias
    survey_id UUID NOT NULL REFERENCES survey_definitions(id) ON DELETE CASCADE,
    
    -- Estado
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'paused', 'completed', 'failed')),
    
    -- Progreso
    progress_percent INTEGER DEFAULT 0 CHECK (progress_percent >= 0 AND progress_percent <= 100),
    current_batch INTEGER DEFAULT 0,
    total_batches INTEGER DEFAULT 0,
    
    -- Muestra
    sample_size_requested INTEGER NOT NULL,
    sample_size_actual INTEGER DEFAULT 0,
    agents_selected UUID[],  -- Array de IDs de agentes seleccionados
    
    -- Resultados agregados
    results_summary JSONB DEFAULT '{}',
    -- Ejemplo: {"total_responses": 950, "completion_rate": 0.95}
    
    -- Benchmarks comparados
    benchmark_comparison_id UUID,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    
    -- Error (si falla)
    error_message TEXT,
    
    -- Metadatos
    metadata JSONB DEFAULT '{}'
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_survey_runs_survey ON survey_runs(survey_id);
CREATE INDEX IF NOT EXISTS idx_survey_runs_status ON survey_runs(status);

-- Comentarios
COMMENT ON TABLE survey_runs IS 'Ejecuciones individuales de encuestas';

-- -----------------------------------------------------------------------------
-- 5. SURVEY_RESPONSES - Respuestas individuales
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS survey_responses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Referencias
    survey_id UUID NOT NULL REFERENCES survey_definitions(id) ON DELETE CASCADE,
    run_id UUID NOT NULL REFERENCES survey_runs(id) ON DELETE CASCADE,
    agent_id UUID REFERENCES synthetic_agents(id),
    
    -- Respuesta
    question_id VARCHAR(100) NOT NULL,
    value JSONB NOT NULL,  -- Puede ser string, number, array, etc.
    
    -- Metadatos de la respuesta
    confidence NUMERIC(3, 2) CHECK (confidence >= 0 AND confidence <= 1),
    reasoning TEXT,  -- Razonamiento del agente (si aplica)
    response_time_ms INTEGER,  -- Tiempo de respuesta
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Metadatos
    metadata JSONB DEFAULT '{}'
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_responses_survey ON survey_responses(survey_id);
CREATE INDEX IF NOT EXISTS idx_responses_run ON survey_responses(run_id);
CREATE INDEX IF NOT EXISTS idx_responses_agent ON survey_responses(agent_id);
CREATE INDEX IF NOT EXISTS idx_responses_question ON survey_responses(question_id);

-- Comentarios
COMMENT ON TABLE survey_responses IS 'Respuestas individuales de agentes a encuestas';

-- -----------------------------------------------------------------------------
-- 6. BENCHMARKS - Datos de referencia (CASEN, SUBTEL, etc.)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS benchmarks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Identificación
    source VARCHAR(50) NOT NULL CHECK (source IN ('casen', 'subtel', 'cep', 'ine', 'custom')),
    source_year INTEGER NOT NULL,
    source_name VARCHAR(200),
    description TEXT,
    
    -- Cobertura
    coverage JSONB DEFAULT '{}',
    -- Ejemplo: {"geographic": ["CL-13", "CL-05"], "temporal": {"start": "2022-01", "end": "2022-12"}}
    
    -- Indicadores
    indicators JSONB NOT NULL DEFAULT '[]',
    -- Ejemplo: [{"id": "income_median", "name": "Ingreso Mediano", "value": 650000, "unit": "CLP"}]
    
    -- Datos crudos (opcional)
    raw_data JSONB,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Metadatos
    metadata JSONB DEFAULT '{}'
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_benchmarks_source ON benchmarks(source, source_year);
CREATE INDEX IF NOT EXISTS idx_benchmarks_coverage ON benchmarks USING GIN(coverage);

-- Comentarios
COMMENT ON TABLE benchmarks IS 'Datos de referencia de fuentes oficiales (CASEN, SUBTEL, etc.)';

-- -----------------------------------------------------------------------------
-- 7. BENCHMARK_COMPARISONS - Comparaciones sintético vs benchmark
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS benchmark_comparisons (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Referencias
    survey_id UUID REFERENCES survey_definitions(id),
    run_id UUID REFERENCES survey_runs(id),
    benchmark_id UUID NOT NULL REFERENCES benchmarks(id),
    
    -- Comparaciones
    comparisons JSONB NOT NULL DEFAULT '[]',
    -- Ejemplo: [{"indicator": "income_median", "benchmark_value": 650000, "synthetic_value": 645000, "gap": -0.007}]
    
    -- Resumen
    summary JSONB DEFAULT '{}',
    -- Ejemplo: {"total_indicators": 10, "matched_indicators": 8, "average_gap": 0.05}
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Metadatos
    metadata JSONB DEFAULT '{}'
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_comparisons_survey ON benchmark_comparisons(survey_id);
CREATE INDEX IF NOT EXISTS idx_comparisons_benchmark ON benchmark_comparisons(benchmark_id);

-- Comentarios
COMMENT ON TABLE benchmark_comparisons IS 'Comparaciones entre resultados sintéticos y benchmarks oficiales';

-- -----------------------------------------------------------------------------
-- 8. PIPELINE_RUNS - Registro de ejecuciones del pipeline
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS pipeline_runs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Identificación
    run_type VARCHAR(50) NOT NULL CHECK (run_type IN ('ingest', 'normalize', 'integrate', 'synthesize', 'validate', 'full')),
    run_name VARCHAR(200),
    
    -- Estado
    status VARCHAR(20) DEFAULT 'running' CHECK (status IN ('pending', 'running', 'completed', 'failed')),
    
    -- Progreso
    steps_total INTEGER DEFAULT 0,
    steps_completed INTEGER DEFAULT 0,
    
    -- Configuración
    config JSONB DEFAULT '{}',
    
    -- Resultados
    results JSONB DEFAULT '{}',
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    
    -- Error
    error_message TEXT,
    
    -- Metadatos
    metadata JSONB DEFAULT '{}'
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_pipeline_runs_type ON pipeline_runs(run_type);
CREATE INDEX IF NOT EXISTS idx_pipeline_runs_status ON pipeline_runs(status);

-- Comentarios
COMMENT ON TABLE pipeline_runs IS 'Registro de ejecuciones del pipeline de datos';

-- =============================================================================
-- FUNCIONES AUXILIARES
-- =============================================================================

-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers para updated_at
CREATE TRIGGER update_territories_updated_at
    BEFORE UPDATE ON territories
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_synthetic_agents_updated_at
    BEFORE UPDATE ON synthetic_agents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_survey_definitions_updated_at
    BEFORE UPDATE ON survey_definitions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_benchmarks_updated_at
    BEFORE UPDATE ON benchmarks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- VISTAS ÚTILES
-- =============================================================================

-- Vista de resumen por región
CREATE OR REPLACE VIEW region_summary AS
SELECT 
    t.region_code,
    t.region_name,
    COUNT(DISTINCT t.comuna_code) AS comuna_count,
    SUM(t.population_total) AS total_population,
    COUNT(DISTINCT sa.id) AS agent_count
FROM territories t
LEFT JOIN synthetic_agents sa ON sa.territory_id = t.id
GROUP BY t.region_code, t.region_name
ORDER BY t.region_code;

-- Vista de encuestas activas con progreso
CREATE OR REPLACE VIEW active_surveys AS
SELECT 
    sd.id,
    sd.name,
    sd.slug,
    sd.status,
    COUNT(sr.id) AS run_count,
    MAX(sr.created_at) AS last_run_at
FROM survey_definitions sd
LEFT JOIN survey_runs sr ON sr.survey_id = sd.id
WHERE sd.status IN ('active', 'draft')
GROUP BY sd.id, sd.name, sd.slug, sd.status;

-- =============================================================================
-- POLÍTICAS DE SEGURIDAD (RLS) - Opcional, para cuando se habilite auth
-- =============================================================================

-- Habilitar RLS en tablas
ALTER TABLE territories ENABLE ROW LEVEL SECURITY;
ALTER TABLE synthetic_agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE survey_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE survey_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE survey_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE benchmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE benchmark_comparisons ENABLE ROW LEVEL SECURITY;

-- Política por defecto: permitir lectura anónima
CREATE POLICY "Allow anonymous read" ON territories
    FOR SELECT USING (true);

CREATE POLICY "Allow anonymous read" ON synthetic_agents
    FOR SELECT USING (true);

CREATE POLICY "Allow anonymous read" ON survey_definitions
    FOR SELECT USING (true);

CREATE POLICY "Allow anonymous read" ON survey_runs
    FOR SELECT USING (true);

CREATE POLICY "Allow anonymous read" ON survey_responses
    FOR SELECT USING (true);

CREATE POLICY "Allow anonymous read" ON benchmarks
    FOR SELECT USING (true);

CREATE POLICY "Allow anonymous read" ON benchmark_comparisons
    FOR SELECT USING (true);

-- =============================================================================
-- DATOS INICIALES (Opcional)
-- =============================================================================

-- Insertar región Metropolitana como ejemplo
INSERT INTO territories (region_code, region_name, comuna_code, comuna_name, population_total)
VALUES 
    ('CL-13', 'Metropolitana de Santiago', '13101', 'Santiago', 404495)
ON CONFLICT (comuna_code) DO NOTHING;

-- =============================================================================
-- FIN DEL SCHEMA
-- =============================================================================
