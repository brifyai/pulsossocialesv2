-- =============================================================================
-- MIGRACIÓN: Fix RLS para scenario_events v3 - Permitir escritura a anon
-- Fecha: 2025-03-30
-- Objetivo: Permitir INSERT/UPDATE/DELETE para usuarios anónimos (anon key)
--           ya que la app usa custom auth, no Supabase Auth
-- =============================================================================

-- =============================================================================
-- 1. SCENARIO_EVENTS - Políticas para anon (custom auth)
-- =============================================================================

-- Eliminar políticas existentes para recrearlas
DROP POLICY IF EXISTS "Allow public read" ON scenario_events;
DROP POLICY IF EXISTS "Allow authenticated insert" ON scenario_events;
DROP POLICY IF EXISTS "Allow authenticated update" ON scenario_events;
DROP POLICY IF EXISTS "Allow authenticated delete" ON scenario_events;
DROP POLICY IF EXISTS "Allow all authenticated" ON scenario_events;
DROP POLICY IF EXISTS "Allow anon insert" ON scenario_events;
DROP POLICY IF EXISTS "Allow anon update" ON scenario_events;
DROP POLICY IF EXISTS "Allow anon delete" ON scenario_events;

-- Política: Lectura pública (todos pueden ver escenarios)
CREATE POLICY "Allow public read" ON scenario_events
    FOR SELECT USING (true);

-- Política: INSERT permitido para usuarios anónimos (anon)
-- NOTA: La app usa custom auth, no Supabase Auth, por eso usamos anon
CREATE POLICY "Allow anon insert" ON scenario_events
    FOR INSERT WITH CHECK (true);

-- Política: UPDATE permitido para usuarios anónimos
CREATE POLICY "Allow anon update" ON scenario_events
    FOR UPDATE USING (true);

-- Política: DELETE permitido para usuarios anónimos
CREATE POLICY "Allow anon delete" ON scenario_events
    FOR DELETE USING (true);

-- =============================================================================
-- 2. VERIFICAR QUE RLS ESTÁ HABILITADO
-- =============================================================================

-- Asegurar que RLS está habilitado en la tabla
ALTER TABLE scenario_events ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- 3. VERIFICACIÓN
-- =============================================================================

-- Verificar políticas creadas
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'scenario_events'
ORDER BY policyname;

-- =============================================================================
-- FIN DE MIGRACIÓN
-- =============================================================================
