-- ============================================================================
-- SCRIPT DE VERIFICACIÓN POST-MIGRACIÓN RLS v4
-- Fecha: 2025-03-30
-- Descripción: Verifica que las policies RLS v4 se aplicaron correctamente
-- ============================================================================

-- ============================================================================
-- 1. VERIFICAR RLS HABILITADO
-- ============================================================================
SELECT 
    'RLS STATUS' as check_type,
    tablename,
    CASE WHEN rowsecurity THEN '✅ ENABLED' ELSE '❌ DISABLED' END as status
FROM pg_tables
WHERE tablename IN ('scenario_events', 'weekly_events', 'event_impact_logs')
ORDER BY tablename;

-- ============================================================================
-- 2. VERIFICAR POLICIES EXISTENTES
-- ============================================================================
SELECT 
    'POLICIES' as check_type,
    tablename,
    policyname,
    cmd as command,
    CASE 
        WHEN policyname LIKE '%anon%' THEN '❌ CONTAINS ANON'
        WHEN policyname LIKE '%public%' THEN '❌ CONTAINS PUBLIC'
        ELSE '✅ OK'
    END as security_check
FROM pg_policies
WHERE tablename IN ('scenario_events', 'weekly_events', 'event_impact_logs')
ORDER BY tablename, policyname;

-- ============================================================================
-- 3. CONTAR POLICIES POR TABLA
-- ============================================================================
SELECT 
    'POLICY COUNT' as check_type,
    tablename,
    COUNT(*) as policy_count,
    CASE 
        WHEN tablename = 'scenario_events' AND COUNT(*) = 5 THEN '✅ EXPECTED (5)'
        WHEN tablename IN ('weekly_events', 'event_impact_logs') AND COUNT(*) = 2 THEN '✅ EXPECTED (2)'
        ELSE '⚠️ UNEXPECTED'
    END as validation
FROM pg_policies
WHERE tablename IN ('scenario_events', 'weekly_events', 'event_impact_logs')
GROUP BY tablename
ORDER BY tablename;

-- ============================================================================
-- 4. VERIFICAR ÍNDICES EN scenario_events
-- ============================================================================
SELECT 
    'INDEXES' as check_type,
    tablename,
    indexname,
    CASE 
        WHEN indexname = 'idx_scenario_events_user_id' THEN '✅ USER_ID INDEX'
        WHEN indexname = 'idx_scenario_events_status' THEN '✅ STATUS INDEX'
        WHEN indexname = 'idx_scenario_events_category' THEN '✅ CATEGORY INDEX'
        ELSE 'ℹ️ OTHER'
    END as purpose
FROM pg_indexes
WHERE tablename = 'scenario_events'
AND schemaname = 'public'
ORDER BY indexname;

-- ============================================================================
-- 5. VERIFICAR ESTRUCTURA DE scenario_events
-- ============================================================================
SELECT 
    'COLUMNS' as check_type,
    column_name,
    data_type,
    CASE 
        WHEN column_name = 'user_id' THEN '✅ USER REFERENCE'
        WHEN column_name = 'id' THEN '✅ PRIMARY KEY'
        ELSE 'ℹ️ OTHER'
    END as importance
FROM information_schema.columns
WHERE table_name = 'scenario_events'
AND table_schema = 'public'
ORDER BY ordinal_position;

-- ============================================================================
-- 6. CONTAR ESCENARIOS POR USUARIO
-- ============================================================================
SELECT 
    'SCENARIOS BY USER' as check_type,
    COALESCE(user_id::text, 'NULL') as user_id,
    COUNT(*) as scenario_count,
    CASE 
        WHEN user_id IS NULL THEN '⚠️ NEEDS ASSIGNMENT'
        ELSE '✅ ASSIGNED'
    END as status
FROM scenario_events
GROUP BY user_id
ORDER BY scenario_count DESC;

-- ============================================================================
-- 7. VERIFICAR ESCENARIOS SIN USER_ID
-- ============================================================================
SELECT 
    'NULL USER CHECK' as check_type,
    COUNT(*) as null_user_count,
    CASE 
        WHEN COUNT(*) = 0 THEN '✅ ALL ASSIGNED'
        ELSE '⚠️ NEEDS FIX: UPDATE scenario_events SET user_id = ... WHERE user_id IS NULL'
    END as action_required
FROM scenario_events
WHERE user_id IS NULL;

-- ============================================================================
-- 8. RESUMEN DE VERIFICACIÓN
-- ============================================================================
DO $$
DECLARE
    v_scenario_policies INTEGER;
    v_weekly_policies INTEGER;
    v_logs_policies INTEGER;
    v_null_users INTEGER;
    v_rls_enabled INTEGER;
BEGIN
    -- Contar policies
    SELECT COUNT(*) INTO v_scenario_policies 
    FROM pg_policies WHERE tablename = 'scenario_events';
    
    SELECT COUNT(*) INTO v_weekly_policies 
    FROM pg_policies WHERE tablename = 'weekly_events';
    
    SELECT COUNT(*) INTO v_logs_policies 
    FROM pg_policies WHERE tablename = 'event_impact_logs';
    
    -- Contar escenarios sin user_id
    SELECT COUNT(*) INTO v_null_users 
    FROM scenario_events WHERE user_id IS NULL;
    
    -- Contar tablas con RLS habilitado
    SELECT COUNT(*) INTO v_rls_enabled
    FROM pg_tables 
    WHERE tablename IN ('scenario_events', 'weekly_events', 'event_impact_logs')
    AND rowsecurity = true;
    
    -- Mostrar resumen
    RAISE NOTICE '========================================';
    RAISE NOTICE 'VERIFICACIÓN RLS v4 - RESUMEN';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'RLS Enabled: %/3 tables', v_rls_enabled;
    RAISE NOTICE 'scenario_events policies: % (expected 5)', v_scenario_policies;
    RAISE NOTICE 'weekly_events policies: % (expected 2)', v_weekly_policies;
    RAISE NOTICE 'event_impact_logs policies: % (expected 2)', v_logs_policies;
    RAISE NOTICE 'Scenarios without user_id: %', v_null_users;
    
    -- Validar
    IF v_rls_enabled = 3 AND 
       v_scenario_policies = 5 AND 
       v_weekly_policies = 2 AND 
       v_logs_policies = 2 THEN
        RAISE NOTICE '✅ ALL CHECKS PASSED';
    ELSE
        RAISE NOTICE '⚠️ SOME CHECKS FAILED - Review output above';
    END IF;
    RAISE NOTICE '========================================';
END $$;
