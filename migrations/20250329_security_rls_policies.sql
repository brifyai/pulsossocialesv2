-- =============================================================================
-- MIGRACIÓN: Políticas RLS de Seguridad - Phase 1
-- Fecha: 2025-03-29
-- Objetivo: Restringir acceso anónimo y permitir solo lectura pública
-- =============================================================================

-- =============================================================================
-- NOTA IMPORTANTE SOBRE SERVICE KEY vs ANON KEY
-- =============================================================================
-- SERVICE_KEY: Bypassa todas las políticas RLS. Usar SOLO en scripts backend.
-- ANON_KEY: Sujeto a políticas RLS. Usar en frontend.
--
-- Esta migración asume que:
-- - Frontend usa ANON_KEY (VITE_SUPABASE_ANON_KEY)
-- - Scripts usan SERVICE_KEY (SUPABASE_SERVICE_KEY)
-- =============================================================================

-- =============================================================================
-- 1. TERRITORIES - Solo lectura pública
-- =============================================================================

-- Eliminar políticas existentes
DROP POLICY IF EXISTS "Allow anonymous read" ON territories;
DROP POLICY IF EXISTS "Allow public read" ON territories;

-- Política: Lectura pública para todos
CREATE POLICY "Allow public read" ON territories
    FOR SELECT USING (true);

-- Nota: No hay políticas de INSERT/UPDATE/DELETE para anon
-- Estas operaciones requieren SERVICE_KEY

-- =============================================================================
-- 2. SYNTHETIC_AGENTS - Solo lectura pública, sin acceso a datos sensibles
-- =============================================================================

DROP POLICY IF EXISTS "Allow anonymous read" ON synthetic_agents;
DROP POLICY IF EXISTS "Allow public read" ON synthetic_agents;

-- Política: Lectura pública (datos agregados, no individuales sensibles)
CREATE POLICY "Allow public read" ON synthetic_agents
    FOR SELECT USING (true);

-- Nota: El frontend no debería exponer datos personales sensibles
-- Considerar crear una vista pública sin campos sensibles en el futuro

-- =============================================================================
-- 3. SURVEY_DEFINITIONS - Lectura pública para encuestas publicadas
-- =============================================================================

DROP POLICY IF EXISTS "Allow anonymous read" ON survey_definitions;
DROP POLICY IF EXISTS "Allow public read" ON survey_definitions;
DROP POLICY IF EXISTS "Allow public read published" ON survey_definitions;

-- Política: Lectura solo de encuestas publicadas (no drafts)
CREATE POLICY "Allow public read published" ON survey_definitions
    FOR SELECT USING (status IN ('active', 'completed', 'archived'));

-- Nota: Las encuestas en 'draft' solo son accesibles con SERVICE_KEY

-- =============================================================================
-- 4. SURVEY_RUNS - Lectura pública para runs completados
-- =============================================================================

DROP POLICY IF EXISTS "Allow anonymous read" ON survey_runs;
DROP POLICY IF EXISTS "Allow public read" ON survey_runs;
DROP POLICY IF EXISTS "Allow public read completed" ON survey_runs;

-- Política: Lectura solo de runs completados
CREATE POLICY "Allow public read completed" ON survey_runs
    FOR SELECT USING (status = 'completed');

-- Nota: Runs en ejecución o fallidos solo accesibles con SERVICE_KEY

-- =============================================================================
-- 5. SURVEY_RESPONSES - Lectura pública (datos agregados)
-- =============================================================================

DROP POLICY IF EXISTS "Allow anonymous read" ON survey_responses;
DROP POLICY IF EXISTS "Allow public read" ON survey_responses;

-- Política: Lectura pública de respuestas
CREATE POLICY "Allow public read" ON survey_responses
    FOR SELECT USING (true);

-- Nota: Considerar anonimizar agent_id en el futuro para privacidad

-- =============================================================================
-- 6. BENCHMARKS - Lectura pública
-- =============================================================================

DROP POLICY IF EXISTS "Allow anonymous read" ON benchmarks;
DROP POLICY IF EXISTS "Allow public read" ON benchmarks;

CREATE POLICY "Allow public read" ON benchmarks
    FOR SELECT USING (true);

-- =============================================================================
-- 7. BENCHMARK_COMPARISONS - Lectura pública
-- =============================================================================

DROP POLICY IF EXISTS "Allow anonymous read" ON benchmark_comparisons;
DROP POLICY IF EXISTS "Allow public read" ON benchmark_comparisons;

CREATE POLICY "Allow public read" ON benchmark_comparisons
    FOR SELECT USING (true);

-- =============================================================================
-- 8. USERS - Solo lectura de usuarios activos (para login)
-- =============================================================================

DROP POLICY IF EXISTS "Allow read active users" ON users;

-- Mantener política existente - solo usuarios activos visibles
CREATE POLICY "Allow read active users" ON users
    FOR SELECT USING (is_active = true);

-- =============================================================================
-- 9. TABLAS DE EVENTOS (si existen) - Lectura pública
-- =============================================================================

-- Weekly events
DROP POLICY IF EXISTS "Allow anonymous read" ON weekly_events;
DROP POLICY IF EXISTS "Allow public read" ON weekly_events;

DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'weekly_events') THEN
        CREATE POLICY "Allow public read" ON weekly_events
            FOR SELECT USING (true);
    END IF;
END $$;

-- Event impact logs
DROP POLICY IF EXISTS "Allow anonymous read" ON event_impact_logs;
DROP POLICY IF EXISTS "Allow public read" ON event_impact_logs;

DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'event_impact_logs') THEN
        CREATE POLICY "Allow public read" ON event_impact_logs
            FOR SELECT USING (true);
    END IF;
END $$;

-- Scenario events
DROP POLICY IF EXISTS "Allow anonymous read" ON scenario_events;
DROP POLICY IF EXISTS "Allow public read" ON scenario_events;

DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'scenario_events') THEN
        CREATE POLICY "Allow public read" ON scenario_events
            FOR SELECT USING (true);
    END IF;
END $$;

-- =============================================================================
-- 10. TABLAS DE ESTADO DE AGENTES - Solo lectura pública
-- =============================================================================

-- Agent topic state
DROP POLICY IF EXISTS "Allow anonymous read" ON agent_topic_state;
DROP POLICY IF EXISTS "Allow public read" ON agent_topic_state;

DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'agent_topic_state') THEN
        CREATE POLICY "Allow public read" ON agent_topic_state
            FOR SELECT USING (true);
    END IF;
END $$;

-- Agent panel state
DROP POLICY IF EXISTS "Allow anonymous read" ON agent_panel_state;
DROP POLICY IF EXISTS "Allow public read" ON agent_panel_state;

DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'agent_panel_state') THEN
        CREATE POLICY "Allow public read" ON agent_panel_state
            FOR SELECT USING (true);
    END IF;
END $$;

-- =============================================================================
-- VERIFICACIÓN: Confirmar que RLS está habilitado en todas las tablas
-- =============================================================================

-- Verificar estado de RLS
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
    AND tablename IN (
        'users',
        'territories',
        'synthetic_agents',
        'survey_definitions',
        'survey_runs',
        'survey_responses',
        'benchmarks',
        'benchmark_comparisons',
        'weekly_events',
        'event_impact_logs',
        'scenario_events',
        'agent_topic_state',
        'agent_panel_state'
    )
ORDER BY tablename;

-- =============================================================================
-- FIN DE MIGRACIÓN
-- =============================================================================
