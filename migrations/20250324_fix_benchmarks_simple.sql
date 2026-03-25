-- ===========================================
-- Fix Benchmarks Schema - Versión Simple
-- Sin dependencia de user_profiles
-- ===========================================

-- ===========================================
-- Agregar columnas faltantes a benchmarks
-- ===========================================
ALTER TABLE benchmarks 
    ADD COLUMN IF NOT EXISTS source_id VARCHAR(100),
    ADD COLUMN IF NOT EXISTS name VARCHAR(255),
    ADD COLUMN IF NOT EXISTS organization VARCHAR(255),
    ADD COLUMN IF NOT EXISTS year INTEGER,
    ADD COLUMN IF NOT EXISTS description TEXT,
    ADD COLUMN IF NOT EXISTS url VARCHAR(500),
    ADD COLUMN IF NOT EXISTS coverage_geographic TEXT[] DEFAULT '{}',
    ADD COLUMN IF NOT EXISTS coverage_temporal_start DATE,
    ADD COLUMN IF NOT EXISTS coverage_temporal_end DATE,
    ADD COLUMN IF NOT EXISTS pdf_url VARCHAR(500),
    ADD COLUMN IF NOT EXISTS pdf_extracted_data JSONB,
    ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'active',
    ADD COLUMN IF NOT EXISTS created_by UUID,
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- ===========================================
-- Crear tablas relacionadas si no existen
-- ===========================================

-- Tabla de indicadores
CREATE TABLE IF NOT EXISTS benchmark_indicators (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    benchmark_id UUID NOT NULL REFERENCES benchmarks(id) ON DELETE CASCADE,
    indicator_id VARCHAR(100) NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100) NOT NULL,
    unit VARCHAR(50) NOT NULL,
    value DECIMAL(10,4) NOT NULL,
    percentage DECIMAL(5,2),
    sample_size INTEGER,
    margin_of_error DECIMAL(5,2),
    confidence_interval JSONB,
    compatible_question_types TEXT[] DEFAULT '{}',
    compatible_segments TEXT[] DEFAULT '{}',
    page_number INTEGER,
    extracted_confidence DECIMAL(3,2),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(benchmark_id, indicator_id)
);

-- Tabla de comparaciones
CREATE TABLE IF NOT EXISTS benchmark_comparisons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    survey_id UUID NOT NULL REFERENCES surveys(id) ON DELETE CASCADE,
    benchmark_id UUID NOT NULL REFERENCES benchmarks(id) ON DELETE CASCADE,
    compared_by UUID,
    compared_at TIMESTAMPTZ DEFAULT NOW(),
    summary JSONB NOT NULL,
    comparisons JSONB NOT NULL,
    notes TEXT
);

-- Tabla de extracciones PDF
CREATE TABLE IF NOT EXISTS benchmark_pdf_extractions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    benchmark_id UUID NOT NULL REFERENCES benchmarks(id) ON DELETE CASCADE,
    pdf_url VARCHAR(500) NOT NULL,
    extraction_status VARCHAR(50) DEFAULT 'pending',
    extracted_data JSONB,
    error_message TEXT,
    processing_started_at TIMESTAMPTZ,
    processing_completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===========================================
-- Indexes
-- ===========================================
CREATE INDEX IF NOT EXISTS idx_benchmarks_status ON benchmarks(status);
CREATE INDEX IF NOT EXISTS idx_benchmarks_year ON benchmarks(year);
CREATE INDEX IF NOT EXISTS idx_benchmarks_organization ON benchmarks(organization);

CREATE INDEX IF NOT EXISTS idx_benchmark_indicators_benchmark_id ON benchmark_indicators(benchmark_id);
CREATE INDEX IF NOT EXISTS idx_benchmark_indicators_category ON benchmark_indicators(category);

CREATE INDEX IF NOT EXISTS idx_benchmark_comparisons_survey ON benchmark_comparisons(survey_id);
CREATE INDEX IF NOT EXISTS idx_benchmark_comparisons_benchmark ON benchmark_comparisons(benchmark_id);

-- ===========================================
-- RLS Policies (simplificadas)
-- ===========================================
ALTER TABLE benchmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE benchmark_indicators ENABLE ROW LEVEL SECURITY;
ALTER TABLE benchmark_comparisons ENABLE ROW LEVEL SECURITY;
ALTER TABLE benchmark_pdf_extractions ENABLE ROW LEVEL SECURITY;

-- Eliminar policies existentes
DROP POLICY IF EXISTS "Benchmarks visible to all" ON benchmarks;
DROP POLICY IF EXISTS "Indicators visible to all" ON benchmark_indicators;
DROP POLICY IF EXISTS "Comparisons visible to all" ON benchmark_comparisons;

-- Policies simples: todos pueden ver todo
CREATE POLICY "Benchmarks visible to all" ON benchmarks
    FOR SELECT USING (true);

CREATE POLICY "Indicators visible to all" ON benchmark_indicators
    FOR SELECT USING (true);

CREATE POLICY "Comparisons visible to all" ON benchmark_comparisons
    FOR SELECT USING (true);

-- Solo usuarios autenticados pueden insertar/modificar
CREATE POLICY "Benchmarks insertable by authenticated" ON benchmarks
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Benchmarks updatable by authenticated" ON benchmarks
    FOR UPDATE USING (auth.uid() IS NOT NULL);

CREATE POLICY "Indicators insertable by authenticated" ON benchmark_indicators
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Comparisons insertable by authenticated" ON benchmark_comparisons
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- ===========================================
-- Functions y Triggers
-- ===========================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_benchmarks_updated_at ON benchmarks;
DROP TRIGGER IF EXISTS update_benchmark_indicators_updated_at ON benchmark_indicators;

CREATE TRIGGER update_benchmarks_updated_at 
    BEFORE UPDATE ON benchmarks 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_benchmark_indicators_updated_at 
    BEFORE UPDATE ON benchmark_indicators 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ===========================================
-- Verificación final
-- ===========================================
SELECT 
    'benchmarks' as tabla,
    COUNT(*) as columnas
FROM information_schema.columns 
WHERE table_name = 'benchmarks'
UNION ALL
SELECT 
    'benchmark_indicators' as tabla,
    COUNT(*) as columnas
FROM information_schema.columns 
WHERE table_name = 'benchmark_indicators'
UNION ALL
SELECT 
    'benchmark_comparisons' as tabla,
    COUNT(*) as columnas
FROM information_schema.columns 
WHERE table_name = 'benchmark_comparisons'
UNION ALL
SELECT 
    'benchmark_pdf_extractions' as tabla,
    COUNT(*) as columnas
FROM information_schema.columns 
WHERE table_name = 'benchmark_pdf_extractions';
