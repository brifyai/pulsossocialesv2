-- ===========================================
-- Benchmarks Tables - Sprint 12C
-- Tablas para almacenar benchmarks de referencia
-- ===========================================

-- Tabla principal de benchmarks
CREATE TABLE IF NOT EXISTS benchmarks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_id VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    organization VARCHAR(255) NOT NULL,
    year INTEGER NOT NULL,
    description TEXT,
    url VARCHAR(500),
    coverage_geographic TEXT[] DEFAULT '{}',
    coverage_temporal_start DATE,
    coverage_temporal_end DATE,
    pdf_url VARCHAR(500), -- URL del PDF subido
    pdf_extracted_data JSONB, -- Datos extraídos del PDF por IA
    status VARCHAR(50) DEFAULT 'active', -- active, processing, error, archived
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla de indicadores de benchmarks
CREATE TABLE IF NOT EXISTS benchmark_indicators (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    benchmark_id UUID NOT NULL REFERENCES benchmarks(id) ON DELETE CASCADE,
    indicator_id VARCHAR(100) NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100) NOT NULL,
    unit VARCHAR(50) NOT NULL, -- percentage, average, count
    value DECIMAL(10,4) NOT NULL,
    percentage DECIMAL(5,2), -- Si aplica
    sample_size INTEGER,
    margin_of_error DECIMAL(5,2),
    confidence_interval JSONB, -- {lower: x, upper: y}
    compatible_question_types TEXT[] DEFAULT '{}',
    compatible_segments TEXT[] DEFAULT '{}',
    page_number INTEGER, -- Página del PDF donde se encontró
    extracted_confidence DECIMAL(3,2), -- Confianza de la extracción (0-1)
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(benchmark_id, indicator_id)
);

-- Tabla para almacenar comparaciones realizadas
CREATE TABLE IF NOT EXISTS benchmark_comparisons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    survey_id UUID NOT NULL REFERENCES surveys(id) ON DELETE CASCADE,
    benchmark_id UUID NOT NULL REFERENCES benchmarks(id) ON DELETE CASCADE,
    compared_by UUID REFERENCES auth.users(id),
    compared_at TIMESTAMPTZ DEFAULT NOW(),
    summary JSONB NOT NULL, -- Resumen de la comparación
    comparisons JSONB NOT NULL, -- Detalle de cada indicador comparado
    notes TEXT
);

-- Tabla para tracking de extracción de PDFs
CREATE TABLE IF NOT EXISTS benchmark_pdf_extractions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    benchmark_id UUID NOT NULL REFERENCES benchmarks(id) ON DELETE CASCADE,
    pdf_url VARCHAR(500) NOT NULL,
    extraction_status VARCHAR(50) DEFAULT 'pending', -- pending, processing, completed, error
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

-- Benchmarks: todos pueden ver los activos, solo admins pueden modificar
CREATE POLICY "Benchmarks visible to all" ON benchmarks
    FOR SELECT USING (status = 'active');

CREATE POLICY "Benchmarks manageable by admins" ON benchmarks
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Indicators: mismo acceso que benchmarks
CREATE POLICY "Indicators visible to all" ON benchmark_indicators
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM benchmarks 
            WHERE id = benchmark_indicators.benchmark_id AND status = 'active'
        )
    );

CREATE POLICY "Indicators manageable by admins" ON benchmark_indicators
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Comparisons: usuarios ven las suyas
CREATE POLICY "Comparisons visible to owner" ON benchmark_comparisons
    FOR SELECT USING (compared_by = auth.uid());

CREATE POLICY "Comparisons insertable by authenticated" ON benchmark_comparisons
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- ===========================================
-- Functions
-- ===========================================

-- Función para actualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_benchmarks_updated_at 
    BEFORE UPDATE ON benchmarks 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_benchmark_indicators_updated_at 
    BEFORE UPDATE ON benchmark_indicators 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Función para buscar benchmarks por texto
CREATE OR REPLACE FUNCTION search_benchmarks(search_query TEXT)
RETURNS TABLE (
    id UUID,
    name VARCHAR,
    organization VARCHAR,
    year INTEGER,
    relevance DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        b.id,
        b.name,
        b.organization,
        b.year,
        ts_rank(
            to_tsvector('spanish', b.name || ' ' || COALESCE(b.description, '')),
            plainto_tsquery('spanish', search_query)
        )::DECIMAL as relevance
    FROM benchmarks b
    WHERE b.status = 'active'
    AND (
        b.name ILIKE '%' || search_query || '%'
        OR b.organization ILIKE '%' || search_query || '%'
        OR b.description ILIKE '%' || search_query || '%'
    )
    ORDER BY relevance DESC, b.year DESC;
END;
$$ LANGUAGE plpgsql;

-- ===========================================
-- Comments
-- ===========================================

COMMENT ON TABLE benchmarks IS 'Tabla de benchmarks de referencia para comparar con encuestas sintéticas';
COMMENT ON TABLE benchmark_indicators IS 'Indicadores individuales dentro de cada benchmark';
COMMENT ON TABLE benchmark_comparisons IS 'Historial de comparaciones entre encuestas y benchmarks';
COMMENT ON TABLE benchmark_pdf_extractions IS 'Tracking de extracción de datos desde PDFs';
