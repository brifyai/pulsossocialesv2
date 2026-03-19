-- =============================================================================
-- DIAGNÓSTICO SIMPLE DE TABLAS - Pulso Social
-- =============================================================================
-- Versión sin funciones, solo queries directos
-- Ejecutar en: SQL Editor de Supabase
-- =============================================================================

-- Verificar cada tabla individualmente con queries separados
-- Esto evita errores de evaluación temprana

-- 1. territories
SELECT 'territories' AS table_name, 
       'EXISTS' AS status, 
       (SELECT COUNT(*)::TEXT FROM territories) AS row_count
WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'territories')
UNION ALL
SELECT 'territories', 'NOT FOUND', 'N/A'
WHERE NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'territories')

UNION ALL

-- 2. synthetic_agents
SELECT 'synthetic_agents', 
       'EXISTS', 
       (SELECT COUNT(*)::TEXT FROM synthetic_agents)
WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'synthetic_agents')
UNION ALL
SELECT 'synthetic_agents', 'NOT FOUND', 'N/A'
WHERE NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'synthetic_agents')

UNION ALL

-- 3. survey_definitions
SELECT 'survey_definitions', 
       'EXISTS', 
       (SELECT COUNT(*)::TEXT FROM survey_definitions)
WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'survey_definitions')
UNION ALL
SELECT 'survey_definitions', 'NOT FOUND', 'N/A'
WHERE NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'survey_definitions')

UNION ALL

-- 4. survey_runs
SELECT 'survey_runs', 
       'EXISTS', 
       (SELECT COUNT(*)::TEXT FROM survey_runs)
WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'survey_runs')
UNION ALL
SELECT 'survey_runs', 'NOT FOUND', 'N/A'
WHERE NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'survey_runs')

UNION ALL

-- 5. survey_results
SELECT 'survey_results', 
       'EXISTS', 
       (SELECT COUNT(*)::TEXT FROM survey_results)
WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'survey_results')
UNION ALL
SELECT 'survey_results', 'NOT FOUND', 'N/A'
WHERE NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'survey_results')

UNION ALL

-- 6. survey_responses
SELECT 'survey_responses', 
       'EXISTS', 
       (SELECT COUNT(*)::TEXT FROM survey_responses)
WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'survey_responses')
UNION ALL
SELECT 'survey_responses', 'NOT FOUND', 'N/A'
WHERE NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'survey_responses')

ORDER BY table_name;
