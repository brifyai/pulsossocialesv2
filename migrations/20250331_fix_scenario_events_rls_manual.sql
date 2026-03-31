-- ============================================================================
-- FIX RLS SIMPLIFICADO PARA SCENARIO_EVENTS
-- Ejecutar manualmente en SQL Editor de Supabase
-- ============================================================================

-- 1. Limpiar policies existentes
DROP POLICY IF EXISTS "Users can view own scenarios" ON scenario_events;
DROP POLICY IF EXISTS "Users can insert own scenarios" ON scenario_events;
DROP POLICY IF EXISTS "Users can update own scenarios" ON scenario_events;
DROP POLICY IF EXISTS "Users can delete own scenarios" ON scenario_events;
DROP POLICY IF EXISTS "Service role full access" ON scenario_events;
DROP POLICY IF EXISTS "Allow public read" ON scenario_events;
DROP POLICY IF EXISTS "Allow authenticated insert" ON scenario_events;
DROP POLICY IF EXISTS "Allow authenticated update" ON scenario_events;
DROP POLICY IF EXISTS "Allow authenticated delete" ON scenario_events;

-- 2. Asegurar que RLS está habilitado
ALTER TABLE scenario_events ENABLE ROW LEVEL SECURITY;

-- 3. Crear policies simplificadas
-- SELECT: Usuarios autenticados ven sus propios escenarios
CREATE POLICY "Users can view own scenarios"
    ON scenario_events
    FOR SELECT
    USING (auth.uid() = user_id);

-- INSERT: Usuarios autenticados pueden insertar (user_id debe coincidir con auth.uid())
CREATE POLICY "Users can insert own scenarios"
    ON scenario_events
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- UPDATE: Solo pueden actualizar sus propios escenarios
CREATE POLICY "Users can update own scenarios"
    ON scenario_events
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- DELETE: Solo pueden eliminar sus propios escenarios
CREATE POLICY "Users can delete own scenarios"
    ON scenario_events
    FOR DELETE
    USING (auth.uid() = user_id);

-- 4. Service role bypass (para scripts)
CREATE POLICY "Service role full access"
    ON scenario_events
    FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

-- 5. Verificar que user_id existe
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

-- 6. Crear índice para performance
CREATE INDEX IF NOT EXISTS idx_scenario_events_user_id ON scenario_events(user_id);
