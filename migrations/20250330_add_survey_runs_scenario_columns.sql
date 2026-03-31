-- =============================================================================
-- Migration: Add Scenario Builder columns to survey_runs
-- Date: 2026-03-30
-- Description: Agrega columnas necesarias para el Scenario Builder v1.2
--
-- Columnas agregadas:
-- - scenario_event_id: UUID del escenario asociado (nullable para baseline)
-- - scenario_name: Nombre del escenario para mostrar en UI
-- - avg_confidence: Confianza promedio de los resultados
-- - total_agents: Total de agentes procesados
-- - total_responses: Total de respuestas generadas
-- - results: JSONB con los resultados de la encuesta
-- - metadata: JSONB con metadatos adicionales
-- =============================================================================

-- Agregar columnas a survey_runs
ALTER TABLE survey_runs
ADD COLUMN IF NOT EXISTS scenario_event_id UUID REFERENCES scenario_events(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS scenario_name VARCHAR(200),
ADD COLUMN IF NOT EXISTS avg_confidence FLOAT DEFAULT 0.0,
ADD COLUMN IF NOT EXISTS total_agents INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_responses INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS results JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

-- Crear índice para búsquedas por escenario
CREATE INDEX IF NOT EXISTS idx_survey_runs_scenario_event_id 
ON survey_runs(scenario_event_id) 
WHERE scenario_event_id IS NOT NULL;

-- Crear índice para búsquedas de baseline (sin escenario)
CREATE INDEX IF NOT EXISTS idx_survey_runs_baseline 
ON survey_runs(created_at) 
WHERE scenario_event_id IS NULL;

-- Comentarios para documentación
COMMENT ON COLUMN survey_runs.scenario_event_id IS 'ID del escenario asociado (NULL para baseline)';
COMMENT ON COLUMN survey_runs.scenario_name IS 'Nombre del escenario para mostrar en UI';
COMMENT ON COLUMN survey_runs.avg_confidence IS 'Confianza promedio de los resultados (0-1)';
COMMENT ON COLUMN survey_runs.total_agents IS 'Total de agentes procesados en el run';
COMMENT ON COLUMN survey_runs.total_responses IS 'Total de respuestas generadas';
COMMENT ON COLUMN survey_runs.results IS 'Resultados de la encuesta en formato JSON';
COMMENT ON COLUMN survey_runs.metadata IS 'Metadatos adicionales del run';

-- Verificar columnas agregadas
SELECT 'Columnas agregadas a survey_runs:' as info;
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'survey_runs' 
AND column_name IN ('scenario_event_id', 'scenario_name', 'avg_confidence', 'total_agents', 'total_responses', 'results', 'metadata')
ORDER BY ordinal_position;
