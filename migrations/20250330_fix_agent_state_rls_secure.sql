-- ============================================================================
-- MIGRACIÓN: Fortalecer RLS en tablas de persistencia de estados de agentes
-- Fecha: 2025-03-30
-- Objetivo: Reemplazar policies permisivas con policies seguras
-- ============================================================================

-- ============================================================================
-- PASO 1: Limpiar policies existentes en agent_topic_state
-- ============================================================================

DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON agent_topic_state;
DROP POLICY IF EXISTS "Allow read for anonymous users" ON agent_topic_state;

-- ============================================================================
-- PASO 2: Crear policies SEGURAS para agent_topic_state
-- ============================================================================

-- Habilitar RLS (si no está habilitado)
ALTER TABLE agent_topic_state ENABLE ROW LEVEL SECURITY;

-- POLICY 1: SELECT - Solo usuarios autenticados pueden leer
-- Nota: Los estados de agentes son datos sensibles, requieren autenticación
CREATE POLICY "Authenticated users can read agent topic states"
    ON agent_topic_state
    FOR SELECT
    USING (auth.role() = 'authenticated');

-- POLICY 2: INSERT/UPDATE/DELETE - Solo service_role (scripts/backend)
-- Los estados solo deben ser modificados por el sistema, no por usuarios directamente
CREATE POLICY "Service role can manage agent topic states"
    ON agent_topic_state
    FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

-- ============================================================================
-- PASO 3: Limpiar policies existentes en agent_panel_state
-- ============================================================================

DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON agent_panel_state;
DROP POLICY IF EXISTS "Allow read for anonymous users" ON agent_panel_state;

-- ============================================================================
-- PASO 4: Crear policies SEGURAS para agent_panel_state
-- ============================================================================

-- Habilitar RLS (si no está habilitado)
ALTER TABLE agent_panel_state ENABLE ROW LEVEL SECURITY;

-- POLICY 1: SELECT - Solo usuarios autenticados pueden leer
CREATE POLICY "Authenticated users can read agent panel states"
    ON agent_panel_state
    FOR SELECT
    USING (auth.role() = 'authenticated');

-- POLICY 2: INSERT/UPDATE/DELETE - Solo service_role
CREATE POLICY "Service role can manage agent panel states"
    ON agent_panel_state
    FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

-- ============================================================================
-- PASO 5: Verificación
-- ============================================================================

DO $$
DECLARE
    topic_policy_count INTEGER;
    panel_policy_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO topic_policy_count
    FROM pg_policies
    WHERE tablename = 'agent_topic_state';
    
    SELECT COUNT(*) INTO panel_policy_count
    FROM pg_policies
    WHERE tablename = 'agent_panel_state';
    
    RAISE NOTICE 'Policies en agent_topic_state: %', topic_policy_count;
    RAISE NOTICE 'Policies en agent_panel_state: %', panel_policy_count;
END $$;

-- ============================================================================
-- RESUMEN DE CAMBIOS
-- ============================================================================
--
-- ANTES (INSEGURO):
--   - Cualquier usuario autenticado podía: SELECT, INSERT, UPDATE, DELETE
--   - Usuarios anónimos podían: SELECT
--   - No había separación entre lectura y escritura
--
-- DESPUÉS (SEGURO):
--   ✅ Solo usuarios autenticados pueden leer (SELECT)
--   ✅ Solo service_role puede modificar (INSERT, UPDATE, DELETE)
--   ✅ Usuarios anónimos completamente bloqueados
--   ✅ Separación clara entre operaciones de lectura y escritura
--
-- ============================================================================
