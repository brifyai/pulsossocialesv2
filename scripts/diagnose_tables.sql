-- =============================================================================
-- DIAGNÓSTICO DE TABLAS CRÍTICAS - Pulso Social
-- =============================================================================
-- Descripción: Verifica existencia y cantidad de registros en tablas críticas
-- Ejecutar en: SQL Editor de Supabase
-- =============================================================================

-- Función para obtener conteo de forma segura (evita error si tabla no existe)
CREATE OR REPLACE FUNCTION safe_count(p_table_name TEXT)
RETURNS TEXT AS $$
DECLARE
    v_count TEXT;
BEGIN
    -- Verificar si tabla existe primero
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = p_table_name
    ) THEN
        RETURN 'N/A';
    END IF;
    
    -- Ejecutar conteo dinámico solo si existe
    EXECUTE format('SELECT COUNT(*)::TEXT FROM %I', p_table_name) INTO v_count;
    RETURN v_count;
    
EXCEPTION WHEN OTHERS THEN
    RETURN 'ERROR';
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- RESULTADO DEL DIAGNÓSTICO
-- =============================================================================

SELECT 
    'territories' AS table_name,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'territories')
        THEN 'EXISTS' ELSE 'NOT FOUND'
    END AS status,
    safe_count('territories') AS row_count

UNION ALL

SELECT 
    'synthetic_agents',
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'synthetic_agents')
        THEN 'EXISTS' ELSE 'NOT FOUND'
    END,
    safe_count('synthetic_agents')

UNION ALL

SELECT 
    'survey_definitions',
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'survey_definitions')
        THEN 'EXISTS' ELSE 'NOT FOUND'
    END,
    safe_count('survey_definitions')

UNION ALL

SELECT 
    'survey_runs',
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'survey_runs')
        THEN 'EXISTS' ELSE 'NOT FOUND'
    END,
    safe_count('survey_runs')

UNION ALL

SELECT 
    'survey_results',
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'survey_results')
        THEN 'EXISTS' ELSE 'NOT FOUND'
    END,
    safe_count('survey_results')

UNION ALL

SELECT 
    'survey_responses',
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'survey_responses')
        THEN 'EXISTS' ELSE 'NOT FOUND'
    END,
    safe_count('survey_responses')

ORDER BY table_name;

-- =============================================================================
-- RESUMEN ADICIONAL
-- =============================================================================

SELECT 
    '=== RESUMEN ===' AS section,
    (SELECT COUNT(*)::TEXT FROM information_schema.tables 
     WHERE table_schema = 'public' 
     AND table_name IN ('territories', 'synthetic_agents', 'survey_definitions', 
                        'survey_runs', 'survey_results', 'survey_responses')) || ' tablas existen' AS summary,
    (6 - (SELECT COUNT(*) FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name IN ('territories', 'synthetic_agents', 'survey_definitions', 
                             'survey_runs', 'survey_results', 'survey_responses')))::TEXT || ' tablas faltan' AS missing;
