-- ===========================================
-- Fix Benchmarks Schema - Sprint 12C
-- Agrega columnas faltantes a tabla existente
-- ===========================================

-- Verificar qué columnas existen actualmente
DO $$
DECLARE
    col_name TEXT;
    col_exists BOOLEAN;
BEGIN
    -- Lista de columnas que deben existir
    FOR col_name IN 
        SELECT unnest(ARRAY[
            'source_id', 'name', 'organization', 'year', 'description', 
            'url', 'coverage_geographic', 'coverage_temporal_start', 
            'coverage_temporal_end', 'pdf_url', 'pdf_extracted_data', 
            'status', 'created_by', 'created_at', 'updated_at'
        ])
    LOOP
        SELECT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'benchmarks' AND column_name = col_name
        ) INTO col_exists;
        
        IF NOT col_exists THEN
            RAISE NOTICE 'Columna % no existe, necesita ser agregada', col_name;
        END IF;
    END LOOP;
END $$;

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
    ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id),
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- ===========================================
-- Crear constraints si no existen
-- ===========================================
DO $$
BEGIN
    -- Verificar si ya existe el constraint UNIQUE
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'benchmarks_source_id_key' 
        AND conrelid = 'benchmarks'::regclass
    ) THEN
        -- Solo agregar UNIQUE si no hay duplicados
        IF NOT EXISTS (
            SELECT source_id, COUNT(*) 
            FROM benchmarks 
            WHERE source_id IS NOT NULL 
            GROUP BY source_id 
            HAVING COUNT(*) > 1
        ) THEN
            ALTER TABLE benchmarks ADD CONSTRAINT benchmarks_source_id_key UNIQUE (source_id);
        END IF;
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'No se pudo agregar constraint UNIQUE: %', SQLERRM;
END $$;

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
    compared_by UUID REFERENCES auth.users(id),
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
-- RLS Policies
-- ===========================================
ALTER TABLE benchmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE benchmark_indicators ENABLE ROW LEVEL SECURITY;
ALTER TABLE benchmark_comparisons ENABLE ROW LEVEL SECURITY;
ALTER TABLE benchmark_pdf_extractions ENABLE ROW LEVEL SECURITY;

-- Eliminar policies existentes
DROP POLICY IF EXISTS "Benchmarks visible to all" ON benchmarks;
DROP POLICY IF EXISTS "Benchmarks manageable by admins" ON benchmarks;
DROP POLICY IF EXISTS "Indicators visible to all" ON benchmark_indicators;
DROP POLICY IF EXISTS "Indicators manageable by admins" ON benchmark_indicators;
DROP POLICY IF EXISTS "Comparisons visible to owner" ON benchmark_comparisons;
DROP POLICY IF EXISTS "Comparisons insertable by authenticated" ON benchmark_comparisons;

-- Crear policies
CREATE POLICY "Benchmarks visible to all" ON benchmarks
    FOR SELECT USING (status = 'active' OR status IS NULL);

CREATE POLICY "Benchmarks manageable by admins" ON benchmarks
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "Indicators visible to all" ON benchmark_indicators
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM benchmarks 
            WHERE id = benchmark_indicators.benchmark_id 
            AND (status = 'active' OR status IS NULL)
        )
    );

CREATE POLICY "Indicators manageable by admins" ON benchmark_indicators
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "Comparisons visible to owner" ON benchmark_comparisons
    FOR SELECT USING (compared_by = auth.uid());

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
