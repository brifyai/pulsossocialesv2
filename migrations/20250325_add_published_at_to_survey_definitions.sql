-- =============================================================================
-- Migration: Agregar columna published_at a survey_definitions
-- Fecha: 2025-03-25
-- =============================================================================

-- Agregar columna published_at si no existe
ALTER TABLE survey_definitions
ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ;

-- Comentario para documentación
COMMENT ON COLUMN survey_definitions.published_at IS 'Fecha de publicación de la encuesta (null si está en draft)';

-- Verificar que la columna se agregó correctamente
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'survey_definitions'
AND column_name = 'published_at';
