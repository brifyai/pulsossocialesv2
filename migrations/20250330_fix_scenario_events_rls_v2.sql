-- =============================================================================
-- MIGRACIÓN: Fix RLS para scenario_events v2 - Usando auth.uid() correctamente
-- Fecha: 2025-03-30
-- Objetivo: Agregar políticas INSERT/UPDATE/DELETE para usuarios autenticados
-- =============================================================================

-- =============================================================================
-- 1. SCENARIO_EVENTS - Agregar políticas de escritura para usuarios autenticados
-- =============================================================================

-- Eliminar políticas existentes para recrearlas
DROP POLICY IF EXISTS "Allow public read" ON scenario_events;
DROP POLICY IF EXISTS "Allow authenticated insert" ON scenario_events;
DROP POLICY IF EXISTS "Allow authenticated update" ON scenario_events;
DROP POLICY IF EXISTS "Allow authenticated delete" ON scenario_events;
DROP POLICY IF EXISTS "Allow all authenticated" ON scenario_events;

-- Política: Lectura pública (todos pueden ver escenarios)
CREATE POLICY "Allow public read" ON scenario_events
    FOR SELECT USING (true);

-- Política: INSERT permitido para usuarios autenticados (auth.uid() IS NOT NULL)
CREATE POLICY "Allow authenticated insert" ON scenario_events
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Política: UPDATE permitido para usuarios autenticados
CREATE POLICY "Allow authenticated update" ON scenario_events
    FOR UPDATE USING (auth.uid() IS NOT NULL);

-- Política: DELETE permitido para usuarios autenticados
CREATE POLICY "Allow authenticated delete" ON scenario_events
    FOR DELETE USING (auth.uid() IS NOT NULL);

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
