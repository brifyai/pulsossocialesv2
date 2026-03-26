-- =============================================================================
-- Migration: Add updated_by column to survey_definitions
-- Fecha: 2025-03-25
-- =============================================================================

-- Agregar columna updated_by si no existe
ALTER TABLE survey_definitions 
ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES users(id);

-- Agregar comentario descriptivo
COMMENT ON COLUMN survey_definitions.updated_by IS 'Usuario que realizó la última actualización';

-- Actualizar registros existentes para que tengan updated_by = created_by
UPDATE survey_definitions 
SET updated_by = created_by 
WHERE updated_by IS NULL AND created_by IS NOT NULL;

-- Verificar que la columna se agregó correctamente
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'survey_definitions'
ORDER BY ordinal_position;
