-- ===========================================
-- DIAGNÓSTICO: QuestionAnalysisList muestra N/A, 0%, 0.00
-- Objetivo: Determinar si es problema de datos históricos o de componente
-- ===========================================

-- 1. VERIFICAR ÚLTIMOS RUNS Y SUS FECHAS
-- Esto nos dice si los runs son recientes (post-fix) o antiguos (pre-fix)
SELECT
    id,
    survey_id,
    created_at,
    completed_at,
    sample_size_actual,
    results_summary->>'total_responses' as total_responses_from_summary,
    CASE
        WHEN created_at > '2025-04-03T00:00:00Z' THEN 'POST-FIX'
        ELSE 'PRE-FIX'
    END as era
FROM survey_runs
ORDER BY created_at DESC
LIMIT 10;

-- 2. PARA UN RUN ESPECÍFICO (reemplaza 'RUN_ID_AQUI' con el ID del run problemático)
-- Verificar si tiene respuestas asociadas
-- SELECT
--     r.id as run_id,
--     r.survey_id,
--     r.created_at,
--     COUNT(sr.id) as response_count,
--     r.results_summary->>'total_responses' as expected_responses
-- FROM survey_runs r
-- LEFT JOIN survey_responses sr ON sr.run_id = r.id
-- WHERE r.id = 'RUN_ID_AQUI'
-- GROUP BY r.id, r.survey_id, r.created_at, r.results_summary;

-- 3. DETECTAR RESPUESTAS HUÉRFANAS (run_id que no existe en survey_runs)
-- Esto confirma el bug de persistencia
SELECT
    sr.run_id,
    COUNT(*) as orphan_count,
    MIN(sr.created_at) as first_response,
    MAX(sr.created_at) as last_response
FROM survey_responses sr
LEFT JOIN survey_runs r ON r.id = sr.run_id
WHERE r.id IS NULL
GROUP BY sr.run_id
ORDER BY orphan_count DESC
LIMIT 20;

-- 4. VERIFICAR DISTRIBUCIÓN DE RESPUESTAS POR RUN
-- Útil para ver si hay runs con muchas respuestas vs runs vacíos
SELECT
    sr.run_id,
    COUNT(*) as response_count,
    COUNT(DISTINCT sr.question_id) as unique_questions,
    MIN(sr.created_at) as first_response,
    MAX(sr.created_at) as last_response
FROM survey_responses sr
GROUP BY sr.run_id
ORDER BY response_count DESC
LIMIT 20;

-- 5. VERIFICAR SI HAY RUNS SIN RESPUESTAS
-- Esto indica que el run se creó pero las respuestas no se guardaron
SELECT
    r.id as run_id,
    r.survey_id,
    r.created_at,
    r.sample_size_actual,
    COALESCE(sr.response_count, 0) as actual_responses,
    r.results_summary->>'total_responses' as expected_responses
FROM survey_runs r
LEFT JOIN (
    SELECT run_id, COUNT(*) as response_count
    FROM survey_responses
    GROUP BY run_id
) sr ON sr.run_id = r.id
WHERE COALESCE(sr.response_count, 0) = 0
ORDER BY r.created_at DESC
LIMIT 20;

-- 6. VERIFICAR ESTRUCTURA DE RESPUESTAS PARA UN RUN ESPECÍFICO
-- Reemplaza 'RUN_ID_AQUI' con el ID del run que estás analizando
-- SELECT
--     sr.question_id,
--     COUNT(*) as answer_count,
--     COUNT(DISTINCT sr.agent_id) as unique_agents,
--     MIN(sr.value::text) as min_value,
--     MAX(sr.value::text) as max_value
-- FROM survey_responses sr
-- WHERE sr.run_id = 'RUN_ID_AQUI'
-- GROUP BY sr.question_id
-- ORDER BY sr.question_id;

-- 7. RESUMEN EJECUTIVO
-- Estadísticas generales para entender la magnitud del problema
SELECT
    'Total Runs' as metric,
    COUNT(*)::text as value
FROM survey_runs
UNION ALL
SELECT
    'Total Responses',
    COUNT(*)::text
FROM survey_responses
UNION ALL
SELECT
    'Runs with Responses',
    COUNT(DISTINCT run_id)::text
FROM survey_responses
UNION ALL
SELECT
    'Orphan Responses (no matching run)',
    COUNT(*)::text
FROM survey_responses sr
LEFT JOIN survey_runs r ON r.id = sr.run_id
WHERE r.id IS NULL
UNION ALL
SELECT
    'Runs without Responses',
    COUNT(*)::text
FROM survey_runs r
LEFT JOIN survey_responses sr ON sr.run_id = r.id
WHERE sr.id IS NULL;
