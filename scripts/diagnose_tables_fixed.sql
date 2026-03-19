-- =============================================================================
-- DIAGNÓSTICO DE TABLAS - Pulso Social (VERSIÓN CORREGIDA)
-- =============================================================================
-- Corregido: conflicto de nombres entre parámetro y columna
-- =============================================================================

-- PASO 1: Crear función auxiliar
CREATE OR REPLACE FUNCTION get_table_count(p_target_table TEXT)
RETURNS TABLE (
    tbl_name TEXT,
    tbl_status TEXT,
    tbl_count TEXT
) AS $$
BEGIN
    -- Verificar si tabla existe (usando alias para evitar conflicto)
    IF EXISTS (
        SELECT 1 
        FROM information_schema.tables t
        WHERE t.table_schema = 'public' 
        AND t.table_name = p_target_table
    ) THEN
        -- Tabla existe, retornar conteo real usando EXECUTE dinámico
        RETURN QUERY 
        EXECUTE format('SELECT %L::TEXT, %L::TEXT, COUNT(*)::TEXT FROM %I', 
                       p_target_table, 'EXISTS', p_target_table);
    ELSE
        -- Tabla no existe
        RETURN QUERY 
        SELECT p_target_table::TEXT, 'NOT FOUND'::TEXT, 'N/A'::TEXT;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- PASO 2: Ejecutar diagnóstico
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
ORDER BY tbl_name;
