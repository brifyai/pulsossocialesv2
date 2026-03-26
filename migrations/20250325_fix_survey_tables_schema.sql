-- =============================================================================
-- FIX: Survey Tables Schema Alignment
-- Fecha: 2026-03-25
-- 
-- Este migration alinea las tablas de encuestas con el schema esperado por
-- el código TypeScript en src/types/database.ts
--
-- Problemas resueltos:
-- 1. Falta columna 'agents_matched' en survey_runs
-- 2. Falta columna 'agent_snapshot' en survey_responses
-- 3. Falta tabla 'survey_results'
-- 4. Tipo de run_id debe soportar IDs generados como 'run_1774486958233_e9phi10je'
-- =============================================================================

-- =============================================================================
-- 1. FIX survey_runs - Agregar columnas faltantes
-- =============================================================================

-- Agregar columnas que faltan en survey_runs
ALTER TABLE survey_runs 
ADD COLUMN IF NOT EXISTS run_number INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS name VARCHAR(200),
ADD COLUMN IF NOT EXISTS segment_applied JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS agents_matched INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS error_details JSONB,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Crear trigger para updated_at en survey_runs
DROP TRIGGER IF EXISTS update_survey_runs_updated_at ON survey_runs;
CREATE TRIGGER update_survey_runs_updated_at
    BEFORE UPDATE ON survey_runs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Actualizar run_number para registros existentes usando CTE
WITH numbered_runs AS (
    SELECT id, ROW_NUMBER() OVER (PARTITION BY survey_id ORDER BY created_at) as rn
    FROM survey_runs
    WHERE run_number IS NULL OR run_number = 1
)
UPDATE survey_runs sr
SET run_number = nr.rn
FROM numbered_runs nr
WHERE sr.id = nr.id;

-- =============================================================================
-- 2. FIX survey_responses - Agregar columnas faltantes y cambiar tipos
-- =============================================================================

-- Eliminar foreign key constraint antes de cambiar el tipo
ALTER TABLE survey_responses 
DROP CONSTRAINT IF EXISTS survey_responses_run_id_fkey;

-- Cambiar run_id de UUID a TEXT para soportar IDs generados como 'run_1774486958233_e9phi10je'
ALTER TABLE survey_responses 
ALTER COLUMN run_id TYPE TEXT USING run_id::TEXT;

-- Cambiar agent_id de UUID a TEXT para soportar IDs como 'AGENT-CL13-000001'
ALTER TABLE survey_responses 
ALTER COLUMN agent_id TYPE TEXT USING agent_id::TEXT;

-- Eliminar foreign key constraint de agent_id si existe
ALTER TABLE survey_responses 
DROP CONSTRAINT IF EXISTS survey_responses_agent_id_fkey;

-- Agregar columnas que faltan en survey_responses
ALTER TABLE survey_responses 
ADD COLUMN IF NOT EXISTS question_type VARCHAR(50) DEFAULT 'single_choice',
ADD COLUMN IF NOT EXISTS heuristics_applied TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS agent_snapshot JSONB DEFAULT '{}';

-- Actualizar question_type basado en el valor almacenado
UPDATE survey_responses 
SET question_type = CASE 
    WHEN jsonb_typeof(value) = 'array' THEN 'multiple_choice'
    WHEN jsonb_typeof(value) = 'number' THEN 'likert_scale'
    ELSE 'single_choice'
END
WHERE question_type IS NULL OR question_type = 'single_choice';

-- =============================================================================
-- 3. CREATE survey_results - Tabla faltante para resultados agregados
-- =============================================================================

CREATE TABLE IF NOT EXISTS survey_results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Referencias (run_id como TEXT para soportar IDs generados por la app)
    survey_id UUID NOT NULL REFERENCES survey_definitions(id) ON DELETE CASCADE,
    run_id TEXT NOT NULL,  -- Cambiado de UUID a TEXT para soportar 'run_1774486958233_e9phi10je'
    
    -- Resumen
    summary JSONB NOT NULL DEFAULT '{}',
    -- Ejemplo: {"totalQuestions": 5, "totalResponses": 1000, "uniqueAgents": 1000}
    
    -- Resultados por pregunta
    results JSONB NOT NULL DEFAULT '[]',
    -- Ejemplo: [{"questionId": "q1", "questionType": "single_choice", ...}]
    
    -- Metadata
    generated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para survey_results
CREATE INDEX IF NOT EXISTS idx_survey_results_survey ON survey_results(survey_id);
CREATE INDEX IF NOT EXISTS idx_survey_results_run ON survey_results(run_id);

-- Trigger para updated_at
DROP TRIGGER IF EXISTS update_survey_results_updated_at ON survey_results;
CREATE TRIGGER update_survey_results_updated_at
    BEFORE UPDATE ON survey_results
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Comentarios
COMMENT ON TABLE survey_results IS 'Resultados agregados de encuestas por corrida';
COMMENT ON COLUMN survey_results.run_id IS 'ID de la corrida (puede ser UUID o string generado como run_1234567890_abc)';
COMMENT ON COLUMN survey_results.summary IS 'Resumen de la encuesta: totalQuestions, totalResponses, uniqueAgents';
COMMENT ON COLUMN survey_results.results IS 'Resultados por pregunta en formato JSON';

-- Política RLS para survey_results
ALTER TABLE survey_results ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow anonymous read" ON survey_results;
CREATE POLICY "Allow anonymous read" ON survey_results
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow anonymous insert" ON survey_results;
CREATE POLICY "Allow anonymous insert" ON survey_results
    FOR INSERT WITH CHECK (true);

-- =============================================================================
-- 4. FIX survey_runs - Cambiar agents_selected de UUID[] a TEXT[]
-- =============================================================================

-- La columna agents_selected actualmente es UUID[] pero debería ser TEXT[]
-- para soportar IDs de agentes que pueden ser strings
ALTER TABLE survey_runs 
ALTER COLUMN agents_selected TYPE TEXT[] USING agents_selected::TEXT[];

-- =============================================================================
-- 5. VERIFICACIÓN - Mostrar estructura actualizada
-- =============================================================================

-- Verificar columnas de survey_runs
SELECT 'survey_runs columns:' as info;
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'survey_runs' 
ORDER BY ordinal_position;

-- Verificar columnas de survey_responses
SELECT 'survey_responses columns:' as info;
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'survey_responses' 
ORDER BY ordinal_position;

-- Verificar columnas de survey_results
SELECT 'survey_results columns:' as info;
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'survey_results' 
ORDER BY ordinal_position;

-- =============================================================================
-- FIN DEL MIGRATION
-- =============================================================================
