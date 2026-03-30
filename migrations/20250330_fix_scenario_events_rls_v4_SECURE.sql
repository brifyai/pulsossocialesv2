-- ============================================================================
-- MIGRACIÓN RLS V4 - SEGURA Y COMPLETA
-- Fecha: 2025-03-30
-- Objetivo: Corregir todas las vulnerabilidades de las versiones anteriores
-- ============================================================================

-- ============================================================================
-- PASO 0: Limpiar policies existentes (rollback seguro)
-- ============================================================================

-- Eliminar TODAS las policies existentes de scenario_events
DROP POLICY IF EXISTS "Allow public read" ON scenario_events;
DROP POLICY IF EXISTS "Allow authenticated insert" ON scenario_events;
DROP POLICY IF EXISTS "Allow authenticated update" ON scenario_events;
DROP POLICY IF EXISTS "Allow authenticated delete" ON scenario_events;
DROP POLICY IF EXISTS "Allow anon insert" ON scenario_events;
DROP POLICY IF EXISTS "Allow anon update" ON scenario_events;
DROP POLICY IF EXISTS "Allow anon delete" ON scenario_events;
DROP POLICY IF EXISTS "Enable read access for all users" ON scenario_events;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON scenario_events;
DROP POLICY IF EXISTS "Enable update for authenticated users only" ON scenario_events;
DROP POLICY IF EXISTS "Enable delete for authenticated users only" ON scenario_events;

-- ============================================================================
-- PASO 1: Asegurar que RLS está habilitado
-- ============================================================================

ALTER TABLE scenario_events ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- PASO 2: Crear policies SEGURAS para scenario_events
-- ============================================================================

-- POLICY 1: SELECT - Usuarios autenticados solo ven sus propios escenarios
-- O escenarios públicos (si aplica)
CREATE POLICY "Users can view own scenarios"
    ON scenario_events
    FOR SELECT
    USING (
        auth.role() = 'authenticated' 
        AND (
            user_id = auth.uid() 
            OR user_id IS NULL  -- Escenarios del sistema
        )
    );

-- POLICY 2: INSERT - Solo usuarios autenticados, solo sus propios registros
CREATE POLICY "Users can insert own scenarios"
    ON scenario_events
    FOR INSERT
    WITH CHECK (
        auth.role() = 'authenticated'
        AND user_id = auth.uid()
    );

-- POLICY 3: UPDATE - Solo usuarios autenticados, solo sus propios registros
CREATE POLICY "Users can update own scenarios"
    ON scenario_events
    FOR UPDATE
    USING (
        auth.role() = 'authenticated'
        AND user_id = auth.uid()
    )
    WITH CHECK (
        auth.role() = 'authenticated'
        AND user_id = auth.uid()
    );

-- POLICY 4: DELETE - Solo usuarios autenticados, solo sus propios registros
CREATE POLICY "Users can delete own scenarios"
    ON scenario_events
    FOR DELETE
    USING (
        auth.role() = 'authenticated'
        AND user_id = auth.uid()
    );

-- ============================================================================
-- PASO 3: Excepción para service_role (scripts y operaciones batch)
-- ============================================================================

-- NOTA: service_role bypass RLS por defecto en Supabase
-- Pero agregamos policies explícitas por claridad y documentación

CREATE POLICY "Service role full access"
    ON scenario_events
    FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

-- ============================================================================
-- PASO 4: Asegurar que user_id existe y tiene índice
-- ============================================================================

-- Nota: La tabla scenario_events usa user_id (no created_by)
-- Verificar que la columna user_id existe
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'scenario_events' 
        AND column_name = 'user_id'
    ) THEN
        ALTER TABLE scenario_events ADD COLUMN user_id UUID REFERENCES auth.users(id);
    END IF;
END $$;

-- Crear índice para performance de RLS (user_id ya existe según schema)
CREATE INDEX IF NOT EXISTS idx_scenario_events_user_id 
    ON scenario_events(user_id);

-- ============================================================================
-- PASO 5: RLS para weekly_events (si no existe)
-- ============================================================================

-- Habilitar RLS
ALTER TABLE IF EXISTS weekly_events ENABLE ROW LEVEL SECURITY;

-- Limpiar policies existentes
DROP POLICY IF EXISTS "Allow public read" ON weekly_events;
DROP POLICY IF EXISTS "Allow authenticated all" ON weekly_events;

-- Policies seguras para weekly_events
DROP POLICY IF EXISTS "Users can view weekly events" ON weekly_events;
CREATE POLICY "Users can view weekly events"
    ON weekly_events
    FOR SELECT
    USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Service role can manage weekly events" ON weekly_events;
CREATE POLICY "Service role can manage weekly events"
    ON weekly_events
    FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

-- ============================================================================
-- PASO 6: RLS para event_impact_logs (si no existe)
-- ============================================================================

-- Habilitar RLS
ALTER TABLE IF EXISTS event_impact_logs ENABLE ROW LEVEL SECURITY;

-- Limpiar policies existentes
DROP POLICY IF EXISTS "Allow public read" ON event_impact_logs;
DROP POLICY IF EXISTS "Allow authenticated all" ON event_impact_logs;

-- Policies seguras para event_impact_logs
DROP POLICY IF EXISTS "Users can view event impact logs" ON event_impact_logs;
CREATE POLICY "Users can view event impact logs"
    ON event_impact_logs
    FOR SELECT
    USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Service role can manage event impact logs" ON event_impact_logs;
CREATE POLICY "Service role can manage event impact logs"
    ON event_impact_logs
    FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

-- ============================================================================
-- PASO 7: Verificación y logging
-- ============================================================================

-- Verificar policies creadas
DO $$
DECLARE
    policy_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO policy_count
    FROM pg_policies
    WHERE tablename IN ('scenario_events', 'weekly_events', 'event_impact_logs');
    
    RAISE NOTICE 'Total policies creadas: %', policy_count;
END $$;

-- ============================================================================
-- RESUMEN DE CAMBIOS
-- ============================================================================
--
-- ANTES (v3 - INSEGURO):
--   - Anon podía: SELECT, INSERT, UPDATE, DELETE
--   - No había aislamiento entre usuarios
--   - No había excepción para service_role
--
-- DESPUÉS (v4 - SEGURO):
--   ✅ Solo usuarios autenticados pueden acceder
--   ✅ Cada usuario solo ve/modifica sus propios escenarios
--   ✅ Service_role tiene acceso completo (para scripts)
--   ✅ Anon está completamente bloqueado
--   ✅ weekly_events y event_impact_logs también protegidos
--
-- ============================================================================
