-- =============================================================================
-- DIAGNÓSTICO DE TABLAS - Pulso Social (VERSIÓN FINAL)
-- =============================================================================
-- Esta versión usa una función PL/pgSQL para evitar evaluación temprana
-- PASO 1: Ejecutar la creación de la función
-- PASO 2: Ejecutar el SELECT que usa la función
-- =============================================================================

-- PASO 1: Crear función auxiliar (ejecutar primero)
CREATE OR REPLACE FUNCTION get_table_count(p_table_name TEXT)
RETURNS TABLE (
    table_name TEXT,
    status TEXT,
    row_count TEXT
) AS $$
BEGIN
    -- Verificar si tabla existe
    IF EXISTS (
        SELECT 1 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = p_table_name
    ) THEN
        -- Tabla existe, retornar conteo
        RETURN QUERY 
        SELECT 
            p_table_name::TEXT,
            'EXISTS'::TEXT,
            (SELECT COUNT(*)::TEXT FROM pg_catalog.pg_class 
             WHERE relname = p_table_name 
             AND relkind = 'r')::TEXT;
    ELSE
        -- Tabla no existe
        RETURN QUERY 
        SELECT p_table_name::TEXT, 'NOT FOUND'::TEXT, 'N/A'::TEXT;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- PASO 2: Ejecutar diagnóstico (ejecutar después de crear la función)
SELECT * FROM get_table_count('territories')
UNION ALL
SELECT * FROM get_table_count('synthetic_agents')
UNION ALL
SELECT * FROM get_table_count('survey_definitions')
UNION ALL
SELECT * FROM get_table_count('survey_runs')
UNION ALL
SELECT * FROM get_table_count('survey_results')
UNION ALL
SELECT * FROM get_table_count('survey_responses')
ORDER BY table_name;
