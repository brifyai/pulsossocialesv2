# Análisis Completo del Esquema de Base de Datos
## Pulsos Sociales - Supabase Self-Hosted en EasyPanel

**Fecha:** 23 de Marzo, 2026  
**Versión:** 2.0  
**Entorno:** Supabase Self-Hosted / EasyPanel

---

## Resumen Ejecutivo

Este documento describe **TODAS** las tablas necesarias para el correcto funcionamiento de la aplicación Pulsos Sociales en un entorno de Supabase self-hosted en EasyPanel.

### Tablas Totales: 12 tablas principales + 1 tabla de auth de Supabase

---

## 1. Tablas Core (Fundamentales)

### 1.1 `territories` - Territorios Administrativos
**Propósito:** Almacena regiones y comunas de Chile con datos geoespaciales.

```sql
CREATE TABLE territories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    level VARCHAR(20) NOT NULL CHECK (level IN ('region', 'comuna', 'provincia')),
    code VARCHAR(10) NOT NULL,                    -- RM, VA, 13101, etc.
    region_code VARCHAR(10),                      -- Código de región padre
    name VARCHAR(100) NOT NULL,                   -- Nombre del territorio
    region_name VARCHAR(100),                     -- Nombre de la región
    population_total INTEGER,
    population_urban INTEGER,
    population_rural INTEGER,
    centroid JSONB,                               -- [lng, lat]
    geometry JSONB,                               -- GeoJSON
    bbox NUMERIC[4],                              -- [minX, minY, maxX, maxY]
    source VARCHAR(50) DEFAULT 'ine',
    source_year INTEGER DEFAULT 2017,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_code_level UNIQUE (code, level)
);
```

**Índices Recomendados:**
```sql
CREATE INDEX idx_territories_level ON territories(level);
CREATE INDEX idx_territories_code ON territories(code);
CREATE INDEX idx_territories_region_code ON territories(region_code);
CREATE INDEX idx_territories_name ON territories(name);
CREATE INDEX idx_territories_centroid ON territories USING GIN(centroid);
CREATE INDEX idx_territories_geometry ON territories USING GIN(geometry);
```

**RLS:**
```sql
ALTER TABLE territories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow anonymous read" ON territories FOR SELECT USING (true);
```

**Datos Iniciales Requeridos:**
- 16 regiones de Chile (RM, VA, etc.)
- 346 comunas de Chile
- Población total: ~19.5 millones

---

### 1.2 `synthetic_agents` - Agentes Sintéticos
**Propósito:** Almacena los agentes sintéticos generados por el pipeline.

```sql
CREATE TABLE synthetic_agents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_id VARCHAR(50) NOT NULL UNIQUE,         -- AGENT-CL13-000001
    batch_id VARCHAR(50) NOT NULL,
    territory_id UUID REFERENCES territories(id),
    
    -- Demografía
    sex VARCHAR(10) CHECK (sex IN ('male', 'female')),
    age INTEGER CHECK (age >= 0 AND age <= 120),
    age_group VARCHAR(20) CHECK (age_group IN ('child', 'youth', 'young_adult', 'adult', 'senior', 'elderly')),
    
    -- Ubicación
    country_code VARCHAR(2) DEFAULT 'CL',
    region_code VARCHAR(10),
    comuna_code VARCHAR(10),
    urbanicity VARCHAR(10) CHECK (urbanicity IN ('urban', 'rural')),
    location_lat NUMERIC(10, 8),
    location_lng NUMERIC(11, 8),
    
    -- Socioeconómico
    income_decile INTEGER CHECK (income_decile >= 1 AND income_decile <= 10),
    poverty_status VARCHAR(50),
    education_level VARCHAR(50),
    employment_status VARCHAR(50),
    occupation_group VARCHAR(100),
    socioeconomic_level VARCHAR(20),
    
    -- Hogar
    household_size INTEGER,
    household_type VARCHAR(20),
    
    -- Digital
    connectivity_level VARCHAR(20),
    digital_exposure_level VARCHAR(20),
    preferred_survey_channel VARCHAR(20),
    has_smartphone BOOLEAN DEFAULT FALSE,
    has_computer BOOLEAN DEFAULT FALSE,
    internet_quality VARCHAR(20),
    
    -- Funcional
    agent_type VARCHAR(20),
    
    -- Traceabilidad
    backbone_key VARCHAR(100),
    subtel_profile_key VARCHAR(100),
    casen_profile_key VARCHAR(100),
    synthesis_version VARCHAR(20) DEFAULT '1.0',
    generation_notes TEXT,
    
    -- Metadata
    metadata JSONB DEFAULT '{}',
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Índices Recomendados:**
```sql
CREATE INDEX idx_agents_batch_id ON synthetic_agents(batch_id);
CREATE INDEX idx_agents_territory ON synthetic_agents(territory_id);
CREATE INDEX idx_agents_region ON synthetic_agents(region_code);
CREATE INDEX idx_agents_comuna ON synthetic_agents(comuna_code);
CREATE INDEX idx_agents_age_group ON synthetic_agents(age_group);
CREATE INDEX idx_agents_income ON synthetic_agents(income_decile);
CREATE INDEX idx_agents_connectivity ON synthetic_agents(connectivity_level);
CREATE INDEX idx_agents_agent_type ON synthetic_agents(agent_type);
CREATE INDEX idx_agents_sex ON synthetic_agents(sex);
```

**RLS:**
```sql
ALTER TABLE synthetic_agents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow anonymous read" ON synthetic_agents FOR SELECT USING (true);
```

**Volumen Actual:**
- **25,000 agentes generados** y listos para carga
- Ubicación: `/Users/camiloalegria/Desktop/AIntelligence/Simulador 1MM usuarios/output/sql_batches/`
- Formato: 50 archivos SQL (500 agentes por archivo)
- Batch ID: `BATCH-V4-1-20250318`
- Versión: `v4.1.0`
- Fecha de generación: 18 de Marzo, 2026

**Estructura de Archivos:**
```
sql_batches/
├── insert_agents_batch_001.sql  (500 registros)
├── insert_agents_batch_002.sql  (500 registros)
├── ...
├── insert_agents_batch_050.sql  (500 registros)
└── ejecutar_todos.sh            (script bash)
```

**Campos Incluidos:**
- `agent_id` - ID único del agente
- `batch_id` - Identificador del batch
- `version` - Versión del generador (v4.1.0)
- `country_code` - Código de país (CL)
- `region_code` - Código de región (1-16)
- `comuna_code` - Código de comuna
- `province_code` - Código de provincia
- `urbanicity` - urban/rural
- `sex` - male/female
- `age` - Edad (0-120)
- `age_group` - child, youth, adult, middle_age, senior
- `household_type` - Tipo de hogar
- `poverty_status` - Estado de pobreza
- `education_level` - none, primary, secondary, technical, university, postgraduate
- `occupation_status` - Estado laboral
- `connectivity_level` - low, medium, high
- `digital_exposure_level` - low, medium, high
- `preferred_survey_channel` - phone, online, in_person
- `created_at` / `updated_at` - Timestamps

**Volumen Esperado a Futuro:**
- Producción: 1-5 millones de agentes
- Considerar particionamiento por región en producción

**Instrucciones de Carga:**
Ver guía completa en: `/Users/camiloalegria/Desktop/AIntelligence/Simulador 1MM usuarios/output/sql_batches/GUIA_CARGA_SUPABASE.md`

**Opciones de Carga:**
1. **Carga Manual**: Copiar/pegar cada archivo SQL en Supabase Studio
2. **Carga con psql**: `psql "$SUPABASE_DB_URL" -f "insert_agents_batch_001.sql"`
3. **Script Automatizado**: `./ejecutar_todos.sh`

---

### 1.3 `synthetic_agent_batches` - Batches de Generación
**Propósito:** Metadata de cada ejecución del generador de agentes.

```sql
CREATE TABLE synthetic_agent_batches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    batch_id VARCHAR(50) NOT NULL UNIQUE,         -- BATCH-20240315-001
    
    -- Configuración
    version VARCHAR(20) NOT NULL,                 -- v1.0.0
    schema_version VARCHAR(20) DEFAULT 'v1',
    
    -- Cobertura
    country_code VARCHAR(2) DEFAULT 'CL',
    region_codes TEXT[],                          -- ['CL-13', 'CL-05']
    comuna_codes TEXT[],                          -- null = todas
    
    -- Estadísticas
    total_agents_requested INTEGER,
    total_agents_generated INTEGER,
    fields_with_null TEXT[],
    
    -- Fuentes de datos
    data_sources JSONB DEFAULT '{}',
    
    -- Estado
    status VARCHAR(20) DEFAULT 'generating' CHECK (status IN ('generating', 'completed', 'failed', 'validated')),
    validation_report JSONB,
    
    -- Timestamps
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Índices:**
```sql
CREATE INDEX idx_batches_status ON synthetic_agent_batches(status);
CREATE INDEX idx_batches_created ON synthetic_agent_batches(created_at DESC);
```

---

## 2. Tablas de Encuestas

### 2.1 `survey_definitions` - Definiciones de Encuestas
**Propósito:** Almacena las definiciones de encuestas creadas por usuarios.

```sql
CREATE TABLE survey_definitions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Identificación
    name VARCHAR(200) NOT NULL,
    slug VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    
    -- Segmentación objetivo (JSONB)
    segment JSONB DEFAULT '{}',
    -- Ejemplo: {"region_codes": ["CL-13"], "age_groups": ["adult"], "income_deciles": [1,2,3]}
    
    -- Preguntas (JSONB)
    questions JSONB NOT NULL DEFAULT '[]',
    -- Ejemplo: [{"id": "q1", "type": "single_choice", "text": "...", "options": [...]}]
    
    -- Configuración
    sample_size INTEGER NOT NULL DEFAULT 100,
    config JSONB DEFAULT '{}',
    
    -- Estado
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'paused', 'completed', 'archived')),
    
    -- Autoría
    created_by UUID,
    updated_by UUID,
    published_at TIMESTAMPTZ,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Metadata
    metadata JSONB DEFAULT '{}'
);
```

**Índices:**
```sql
CREATE INDEX idx_surveys_slug ON survey_definitions(slug);
CREATE INDEX idx_surveys_status ON survey_definitions(status);
CREATE INDEX idx_surveys_segment ON survey_definitions USING GIN(segment);
CREATE INDEX idx_surveys_created_by ON survey_definitions(created_by);
```

**RLS:**
```sql
ALTER TABLE survey_definitions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow anonymous read" ON survey_definitions FOR SELECT USING (true);
CREATE POLICY "Allow anonymous insert" ON survey_definitions FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anonymous update" ON survey_definitions FOR UPDATE USING (true);
CREATE POLICY "Allow anonymous delete" ON survey_definitions FOR DELETE USING (true);
```

---

### 2.2 `survey_runs` - Ejecuciones de Encuestas
**Propósito:** Registra cada ejecución de una encuesta.

```sql
CREATE TABLE survey_runs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    survey_id UUID NOT NULL REFERENCES survey_definitions(id) ON DELETE CASCADE,
    
    -- Identificación
    run_number INTEGER,                           -- Secuencial por survey
    name VARCHAR(200),                            -- Ej: "Ejecución #3 - Marzo 2024"
    
    -- Estado
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'paused', 'completed', 'failed')),
    
    -- Progreso
    progress_percent INTEGER DEFAULT 0 CHECK (progress_percent >= 0 AND progress_percent <= 100),
    current_batch INTEGER DEFAULT 0,
    total_batches INTEGER DEFAULT 0,
    current_agent_index INTEGER DEFAULT 0,
    
    -- Muestra
    sample_size_requested INTEGER NOT NULL,
    sample_size_actual INTEGER DEFAULT 0,
    agents_selected UUID[],                       -- Array de IDs de agentes
    agents_matched INTEGER DEFAULT 0,
    
    -- Segmento aplicado
    segment_applied JSONB DEFAULT '{}',
    
    -- Resultados agregados
    results_summary JSONB DEFAULT '{}',
    -- Ejemplo: {"total_responses": 950, "completion_rate": 0.95, "average_confidence": 0.85}
    
    -- Benchmarks comparados
    benchmark_comparison_id UUID,
    
    -- Error (si falla)
    error_message TEXT,
    error_details JSONB,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Metadata
    metadata JSONB DEFAULT '{}'
);
```

**Índices:**
```sql
CREATE INDEX idx_survey_runs_survey ON survey_runs(survey_id);
CREATE INDEX idx_survey_runs_status ON survey_runs(status);
CREATE INDEX idx_survey_runs_created ON survey_runs(created_at DESC);
```

**RLS:**
```sql
ALTER TABLE survey_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow anonymous read" ON survey_runs FOR SELECT USING (true);
CREATE POLICY "Allow anonymous insert" ON survey_runs FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anonymous update" ON survey_runs FOR UPDATE USING (true);
CREATE POLICY "Allow anonymous delete" ON survey_runs FOR DELETE USING (true);
```

---

### 2.3 `survey_responses` - Respuestas Individuales
**Propósito:** Almacena cada respuesta individual de los agentes.

**⚠️ NOTA:** Esta tabla puede crecer muy rápido. Considerar:
- Particionamiento por survey_id
- Política de retención (TTL)
- Compresión de datos antiguos

```sql
CREATE TABLE survey_responses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Referencias
    survey_id UUID NOT NULL REFERENCES survey_definitions(id) ON DELETE CASCADE,
    run_id UUID NOT NULL REFERENCES survey_runs(id) ON DELETE CASCADE,
    agent_id UUID REFERENCES synthetic_agents(id),
    
    -- Respuesta
    question_id VARCHAR(100) NOT NULL,
    question_type VARCHAR(50),
    value JSONB NOT NULL,                         -- Puede ser string, number, array, etc.
    
    -- Metadata de la respuesta
    confidence NUMERIC(3, 2) CHECK (confidence >= 0 AND confidence <= 1),
    reasoning TEXT,                               -- Razonamiento del agente
    heuristics_applied TEXT[],                    -- ['income_based', 'age_correlated']
    response_time_ms INTEGER,
    
    -- Traceabilidad
    agent_snapshot JSONB,                         -- Datos del agente en momento de respuesta
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Metadata
    metadata JSONB DEFAULT '{}'
);
```

**Índices:**
```sql
CREATE INDEX idx_responses_survey ON survey_responses(survey_id);
CREATE INDEX idx_responses_run ON survey_responses(run_id);
CREATE INDEX idx_responses_agent ON survey_responses(agent_id);
CREATE INDEX idx_responses_question ON survey_responses(question_id);
CREATE INDEX idx_responses_created ON survey_responses(created_at DESC);
```

**RLS:**
```sql
ALTER TABLE survey_responses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow anonymous read" ON survey_responses FOR SELECT USING (true);
```

---

### 2.4 `survey_results` - Resultados Agregados
**Propósito:** Almacena resultados calculados/aggregados de encuestas (Sprint 11C).

```sql
CREATE TABLE survey_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Relaciones
    run_id UUID NOT NULL,
    survey_id UUID NOT NULL,
    
    -- Tipo de resultado
    result_type VARCHAR(50) NOT NULL DEFAULT 'aggregated',
    -- Tipos: 'aggregated', 'demographic_breakdown', 'territorial'
    
    -- Datos del resultado (JSONB flexible)
    result_data JSONB NOT NULL DEFAULT '{}',
    
    -- Resumen
    summary JSONB DEFAULT '{}',
    -- Ejemplo: {"totalQuestions": 5, "totalResponses": 1000, "uniqueAgents": 1000}
    
    -- Resultados por pregunta
    results JSONB DEFAULT '[]',
    
    -- Metadata
    metadata JSONB DEFAULT '{}',
    generated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

**Índices:**
```sql
CREATE INDEX idx_survey_results_run_id ON survey_results(run_id);
CREATE INDEX idx_survey_results_survey_id ON survey_results(survey_id);
CREATE INDEX idx_survey_results_survey_run ON survey_results(survey_id, run_id);
CREATE INDEX idx_survey_results_type ON survey_results(result_type);
CREATE INDEX idx_survey_results_data_gin ON survey_results USING GIN(result_data);
CREATE INDEX idx_survey_results_created ON survey_results(created_at DESC);
```

**Foreign Keys:**
```sql
ALTER TABLE survey_results 
    ADD CONSTRAINT fk_survey_results_run 
    FOREIGN KEY (run_id) REFERENCES survey_runs(id) ON DELETE CASCADE;

ALTER TABLE survey_results 
    ADD CONSTRAINT fk_survey_results_survey 
    FOREIGN KEY (survey_id) REFERENCES survey_definitions(id) ON DELETE CASCADE;
```

**RLS:**
```sql
ALTER TABLE survey_results ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow anonymous read access" ON survey_results FOR SELECT TO anon USING (true);
CREATE POLICY "Allow anonymous insert access" ON survey_results FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Allow anonymous update access" ON survey_results FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow anonymous delete access" ON survey_results FOR DELETE TO anon USING (true);
```

---

## 3. Tablas de Benchmarks

### 3.1 `benchmarks` - Datos de Referencia
**Propósito:** Almacena datos oficiales de CASEN, SUBTEL, CEP, INE, etc.

```sql
CREATE TABLE benchmarks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Identificación
    source VARCHAR(50) NOT NULL CHECK (source IN ('casen', 'subtel', 'cep', 'ine', 'custom')),
    source_year INTEGER NOT NULL,
    source_name VARCHAR(200),
    source_organization VARCHAR(200),
    description TEXT,
    source_url TEXT,
    
    -- Cobertura
    coverage JSONB DEFAULT '{}',
    -- Ejemplo: {"geographic": ["CL-13", "CL-05"], "temporal": {"start": "2022-01", "end": "2022-12"}}
    
    -- Indicadores (JSONB)
    indicators JSONB NOT NULL DEFAULT '[]',
    -- Ejemplo: [{"id": "income_median", "name": "Ingreso Mediano", "value": 650000, "unit": "CLP"}]
    
    -- Datos crudos (opcional)
    raw_data JSONB,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Metadata
    metadata JSONB DEFAULT '{}'
);
```

**Índices:**
```sql
CREATE INDEX idx_benchmarks_source ON benchmarks(source, source_year);
CREATE INDEX idx_benchmarks_coverage ON benchmarks USING GIN(coverage);
CREATE INDEX idx_benchmarks_indicators ON benchmarks USING GIN(indicators);
```

**RLS:**
```sql
ALTER TABLE benchmarks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow anonymous read" ON benchmarks FOR SELECT USING (true);
```

---

### 3.2 `benchmark_comparisons` - Comparaciones Sintético vs Benchmark
**Propósito:** Almacena comparaciones entre resultados de encuestas y benchmarks oficiales.

```sql
CREATE TABLE benchmark_comparisons (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Referencias
    survey_id UUID REFERENCES survey_definitions(id),
    run_id UUID REFERENCES survey_runs(id),
    benchmark_id UUID NOT NULL REFERENCES benchmarks(id),
    
    -- Comparaciones por indicador
    comparisons JSONB NOT NULL DEFAULT '[]',
    -- Ejemplo: [{"indicator": "income_median", "benchmark_value": 650000, "synthetic_value": 645000, "gap": -0.007}]
    
    -- Resumen
    summary JSONB DEFAULT '{}',
    -- Ejemplo: {"total_indicators": 10, "matched_indicators": 8, "average_gap": 0.05}
    
    -- Timestamps
    compared_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Metadata
    metadata JSONB DEFAULT '{}'
);
```

**Índices:**
```sql
CREATE INDEX idx_comparisons_survey ON benchmark_comparisons(survey_id);
CREATE INDEX idx_comparisons_benchmark ON benchmark_comparisons(benchmark_id);
CREATE INDEX idx_comparisons_run ON benchmark_comparisons(run_id);
```

**RLS:**
```sql
ALTER TABLE benchmark_comparisons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow anonymous read" ON benchmark_comparisons FOR SELECT USING (true);
```

---

## 4. Tablas de Utilidad

### 4.1 `pipeline_runs` - Registro de Ejecuciones del Pipeline
**Propósito:** Tracking de ejecuciones del pipeline de datos.

```sql
CREATE TABLE pipeline_runs (
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
    
    -- Metadata
    metadata JSONB DEFAULT '{}'
);
```

**Índices:**
```sql
CREATE INDEX idx_pipeline_runs_type ON pipeline_runs(run_type);
CREATE INDEX idx_pipeline_runs_status ON pipeline_runs(status);
CREATE INDEX idx_pipeline_runs_created ON pipeline_runs(created_at DESC);
```

---

### 4.2 `users` - Usuarios de la Aplicación (Opcional)
**Propósito:** Autenticación personalizada (si no se usa Supabase Auth).

```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(100),
    avatar TEXT,
    role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('user', 'admin', 'moderator')),
    is_active BOOLEAN DEFAULT true,
    email_verified BOOLEAN DEFAULT false,
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Índices:**
```sql
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
```

---

## 5. Tablas del Sistema Supabase

### 5.1 `auth.users` - Usuarios de Supabase Auth
**Propósito:** Gestión de autenticación por Supabase (ya existe, no crear manualmente).

**Nota:** Esta tabla es gestionada automáticamente por el servicio `auth` de Supabase. No debe modificarse directamente.

---

## 6. Vistas Recomendadas

### 6.1 `region_summary` - Resumen por Región
```sql
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
```

### 6.2 `active_surveys` - Encuestas Activas
```sql
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
```

---

## 7. Funciones Auxiliares

### 7.1 Trigger para `updated_at`
```sql
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

### 7.2 Aplicar triggers a todas las tablas
```sql
-- Territories
CREATE TRIGGER update_territories_updated_at
    BEFORE UPDATE ON territories
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Synthetic Agents
CREATE TRIGGER update_synthetic_agents_updated_at
    BEFORE UPDATE ON synthetic_agents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Survey Definitions
CREATE TRIGGER update_survey_definitions_updated_at
    BEFORE UPDATE ON survey_definitions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Survey Runs
CREATE TRIGGER update_survey_runs_updated_at
    BEFORE UPDATE ON survey_runs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Survey Results
CREATE TRIGGER update_survey_results_updated_at
    BEFORE UPDATE ON survey_results
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Benchmarks
CREATE TRIGGER update_benchmarks_updated_at
    BEFORE UPDATE ON benchmarks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Users (si existe)
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

---

## 8. Orden de Creación

### Paso 1: Extensiones
```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";  -- Para gen_random_uuid()
```

### Paso 2: Tablas Base (sin FK)
1. `territories`
2. `synthetic_agent_batches`
3. `pipeline_runs`
4. `benchmarks`
5. `users` (opcional)

### Paso 3: Tablas con FK
6. `synthetic_agents` (depende de territories)
7. `survey_definitions`
8. `survey_runs` (depende de survey_definitions)
9. `survey_responses` (depende de survey_definitions, survey_runs, synthetic_agents)
10. `survey_results` (depende de survey_definitions, survey_runs)
11. `benchmark_comparisons` (depende de survey_definitions, survey_runs, benchmarks)

### Paso 4: Índices y RLS
- Crear todos los índices
- Habilitar RLS en todas las tablas
- Crear políticas de seguridad

### Paso 5: Vistas y Funciones
- Crear vistas
- Crear funciones y triggers

---

## 9. Datos Iniciales Requeridos

### 9.1 Territorios (Chile)
**Regiones (16):**
```sql
INSERT INTO territories (level, code, name, population_total, source, source_year) VALUES
('region', 'CL-15', 'Arica y Parinacota', 226068, 'ine', 2017),
('region', 'CL-01', 'Tarapacá', 330558, 'ine', 2017),
('region', 'CL-02', 'Antofagasta', 607534, 'ine', 2017),
('region', 'CL-03', 'Atacama', 286168, 'ine', 2017),
('region', 'CL-04', 'Coquimbo', 757586, 'ine', 2017),
('region', 'CL-05', 'Valparaíso', 1815902, 'ine', 2017),
('region', 'RM', 'Metropolitana de Santiago', 7112808, 'ine', 2017),
('region', 'CL-06', 'Libertador General Bernardo O''Higgins', 914555, 'ine', 2017),
('region', 'CL-07', 'Maule', 1044950, 'ine', 2017),
('region', 'CL-16', 'Ñuble', 480609, 'ine', 2017),
('region', 'CL-08', 'Biobío', 1556805, 'ine', 2017),
('region', 'CL-09', 'La Araucanía', 957224, 'ine', 2017),
('region', 'CL-14', 'Los Ríos', 384837, 'ine', 2017),
('region', 'CL-10', 'Los Lagos', 828708, 'ine', 2017),
('region', 'CL-11', 'Aysén del General Carlos Ibáñez del Campo', 103158, 'ine', 2017),
('region', 'CL-12', 'Magallanes y de la Antártica Chilena', 166533, 'ine', 2017);
```

**Comunas (346):**
- Ver script `scripts/seed/seed_territories.ts` para datos completos

---

## 10. Consideraciones de Rendimiento

### 10.1 Tablas Grandes
| Tabla | Registros Esperados | Estrategia |
|-------|---------------------|------------|
| `synthetic_agents` | 1-5 millones | Índices en campos de filtro, considerar particionamiento |
| `survey_responses` | Millones | Particionamiento por survey_id, política de retención |
| `territories` | ~360 | Sin problemas de rendimiento |
| `survey_definitions` | < 1000 | Sin problemas |
| `benchmarks` | < 100 | Sin problemas |

### 10.2 Consultas Frecuentes
- Filtrar agentes por región/comuna → Índices en `region_code`, `comuna_code`
- Filtrar agentes por características → Índices en `age_group`, `income_decile`, `connectivity_level`
- Agregar respuestas por encuesta → Índice compuesto `(survey_id, question_id)`

### 10.3 Mantenimiento
```sql
-- Reindexar periódicamente
REINDEX INDEX idx_agents_region;
REINDEX INDEX idx_responses_survey;

-- Analizar tablas grandes
ANALYZE synthetic_agents;
ANALYZE survey_responses;

-- Vaciar caché de consultas (si es necesario)
-- SELECT pg_reload_conf();
```

---

## 11. Checklist de Implementación

### Pre-Deploy
- [ ] Crear extensiones PostgreSQL
- [ ] Crear todas las tablas en orden correcto
- [ ] Crear índices
- [ ] Habilitar RLS
- [ ] Crear políticas de seguridad
- [ ] Crear vistas
- [ ] Crear funciones y triggers

### Datos Iniciales
- [ ] Insertar regiones de Chile
- [ ] Insertar comunas de Chile
- [ ] Insertar benchmarks iniciales (CASEN, SUBTEL)

### Post-Deploy
- [ ] Verificar conexión desde aplicación
- [ ] Probar lectura de territories
- [ ] Probar creación de survey_definitions
- [ ] Probar ejecución de encuestas
- [ ] Verificar RLS funciona correctamente

---

## 12. Scripts de Verificación

### Verificar Tablas Existentes
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;
```

### Verificar Índices
```sql
SELECT tablename, indexname, indexdef 
FROM pg_indexes 
WHERE schemaname = 'public' 
ORDER BY tablename, indexname;
```

### Verificar RLS
```sql
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public';
```

### Verificar Políticas
```sql
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE schemaname = 'public';
```

---

## 13. Troubleshooting

### Problema: No se pueden leer datos
**Solución:** Verificar RLS está habilitado y políticas existen
```sql
-- Verificar RLS
SELECT * FROM pg_tables WHERE tablename = 'territories';

-- Verificar políticas
SELECT * FROM pg_policies WHERE tablename = 'territories';
```

### Problema: Consultas lentas
**Solución:** Verificar índices existen
```sql
-- Verificar índices de una tabla
SELECT * FROM pg_indexes WHERE tablename = 'synthetic_agents';

-- Analizar tabla
ANALYZE synthetic_agents;

-- Explicar plan de consulta
EXPLAIN ANALYZE SELECT * FROM synthetic_agents WHERE region_code = 'CL-13';
```

### Problema: Errores de FK
**Solución:** Verificar orden de creación de tablas y datos de referencia
```sql
-- Verificar FKs
SELECT
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY';
```

---

## 14. Referencias

- **Tipo de Datos TypeScript:** `src/types/database.ts`
- **Schema SQL Inicial:** `deploy/init/01-schema.sql`
- **Migración Territories:** `deploy/init/02-migrate-territories.sql`
- **Migración Survey Results:** `migrations/20250318_create_survey_results.sql`
- **Repositorios:** `src/services/supabase/repositories/`

---

**Documento generado el:** 23 de Marzo, 2026  
**Versión:** 2.0  
**Autor:** Análisis Automático del Sistema
