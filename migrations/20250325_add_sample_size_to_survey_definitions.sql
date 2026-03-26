-- =============================================================================
-- Migración: Agregar columna sample_size a survey_definitions
-- Fecha: 2025-03-25
-- =============================================================================

-- Agregar columna sample_size si no existe
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'survey_definitions' 
        AND column_name = 'sample_size'
    ) THEN
        ALTER TABLE survey_definitions 
        ADD COLUMN sample_size INTEGER;
        
        RAISE NOTICE 'Columna sample_size agregada a survey_definitions';
    ELSE
        RAISE NOTICE 'La columna sample_size ya existe en survey_definitions';
    END IF;
END $$;

-- Verificar que la columna fue creada
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'survey_definitions'
AND column_name = 'sample_size';
