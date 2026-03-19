-- =============================================================================
-- MIGRACIÓN: Crear tabla survey_results
-- =============================================================================
-- Descripción: Tabla para almacenar resultados agregados de ejecuciones de encuestas
-- Fecha: 2025-03-18
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. CREAR TABLA
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS survey_results (
    -- Identificador único
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Relación con la ejecución de encuesta (survey_runs)
    run_id UUID NOT NULL,
    
    -- Relación con la definición de encuesta (survey_definitions)
    -- Nota: También disponible vía survey_runs, pero incluido para facilitar queries
    survey_id UUID NOT NULL,
    
    -- Tipo de resultado (ej: 'aggregated', 'demographic_breakdown', 'territorial')
    result_type VARCHAR(50) NOT NULL DEFAULT 'aggregated',
    
    -- Datos del resultado en formato JSONB (flexible para diferentes estructuras)
    result_data JSONB NOT NULL DEFAULT '{}',
    
    -- Metadata adicional opcional
    metadata JSONB DEFAULT '{}',
    
    -- Timestamps automáticos
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- 2. COMENTARIOS EN COLUMNAS (documentación)
-- -----------------------------------------------------------------------------
COMMENT ON TABLE survey_results IS 'Resultados agregados de ejecuciones de encuestas';
COMMENT ON COLUMN survey_results.id IS 'Identificador único del resultado';
COMMENT ON COLUMN survey_results.run_id IS 'Referencia a la ejecución de encuesta (survey_runs.id)';
COMMENT ON COLUMN survey_results.survey_id IS 'Referencia a la definición de encuesta (survey_definitions.id)';
COMMENT ON COLUMN survey_results.result_type IS 'Tipo de resultado: aggregated, demographic_breakdown, territorial, etc.';
COMMENT ON COLUMN survey_results.result_data IS 'Datos del resultado en formato JSONB';
COMMENT ON COLUMN survey_results.metadata IS 'Metadata adicional opcional';
COMMENT ON COLUMN survey_results.created_at IS 'Fecha de creación del registro';
COMMENT ON COLUMN survey_results.updated_at IS 'Fecha de última actualización';

-- -----------------------------------------------------------------------------
-- 3. ÍNDICES
-- -----------------------------------------------------------------------------
-- Índice para búsquedas por run_id (más común)
CREATE INDEX IF NOT EXISTS idx_survey_results_run_id 
    ON survey_results(run_id);

-- Índice para búsquedas por survey_id
CREATE INDEX IF NOT EXISTS idx_survey_results_survey_id 
    ON survey_results(survey_id);

-- Índice compuesto para queries frecuentes
CREATE INDEX IF NOT EXISTS idx_survey_results_survey_run 
    ON survey_results(survey_id, run_id);

-- Índice para búsquedas por tipo de resultado
CREATE INDEX IF NOT EXISTS idx_survey_results_type 
    ON survey_results(result_type);

-- Índice GIN para búsquedas dentro de result_data JSONB
CREATE INDEX IF NOT EXISTS idx_survey_results_data_gin 
    ON survey_results USING GIN(result_data);

-- Índice para ordenamiento por fecha de creación
CREATE INDEX IF NOT EXISTS idx_survey_results_created 
    ON survey_results(created_at DESC);

-- -----------------------------------------------------------------------------
-- 4. FOREIGN KEYS
-- -----------------------------------------------------------------------------
-- Nota: Solo agregamos FK si las tablas referenciadas existen
-- La FK a survey_runs
ALTER TABLE survey_results 
    ADD CONSTRAINT fk_survey_results_run 
    FOREIGN KEY (run_id) 
    REFERENCES survey_runs(id) 
    ON DELETE CASCADE;

-- La FK a survey_definitions
ALTER TABLE survey_results 
    ADD CONSTRAINT fk_survey_results_survey 
    FOREIGN KEY (survey_id) 
    REFERENCES survey_definitions(id) 
    ON DELETE CASCADE;

-- -----------------------------------------------------------------------------
-- 5. TRIGGER PARA updated_at
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_survey_results_updated_at
    BEFORE UPDATE ON survey_results
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- -----------------------------------------------------------------------------
-- 6. POLÍTICAS RLS (Row Level Security)
-- -----------------------------------------------------------------------------
-- Habilitar RLS
ALTER TABLE survey_results ENABLE ROW LEVEL SECURITY;

-- Política: Permitir lectura a usuarios anónimos (anon)
CREATE POLICY "Allow anonymous read access" ON survey_results
    FOR SELECT
    TO anon
    USING (true);

-- Política: Permitir escritura a usuarios anónimos (anon)
-- Nota: Ajustar según necesidades de seguridad del proyecto
CREATE POLICY "Allow anonymous insert access" ON survey_results
    FOR INSERT
    TO anon
    WITH CHECK (true);

-- Política: Permitir actualización a usuarios anónimos
CREATE POLICY "Allow anonymous update access" ON survey_results
    FOR UPDATE
    TO anon
    USING (true)
    WITH CHECK (true);

-- Política: Permitir eliminación a usuarios anónimos
CREATE POLICY "Allow anonymous delete access" ON survey_results
    FOR DELETE
    TO anon
    USING (true);

-- -----------------------------------------------------------------------------
-- 7. VERIFICACIÓN
-- -----------------------------------------------------------------------------
SELECT 'Tabla survey_results creada exitosamente' AS status;
