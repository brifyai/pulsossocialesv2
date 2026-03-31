-- ============================================================================
-- FIX RLS EMERGENCIA - Sistema usa Auth propio, no Supabase Auth
-- Por eso auth.uid() no funciona - el usuario no está en Supabase Auth
-- ============================================================================

-- 1. Limpiar TODAS las policies existentes
DROP POLICY IF EXISTS "Users can view own scenarios" ON scenario_events;
DROP POLICY IF EXISTS "Users can insert own scenarios" ON scenario_events;
DROP POLICY IF EXISTS "Users can update own scenarios" ON scenario_events;
DROP POLICY IF EXISTS "Users can delete own scenarios" ON scenario_events;
DROP POLICY IF EXISTS "Service role full access" ON scenario_events;
DROP POLICY IF EXISTS "Allow public read" ON scenario_events;
DROP POLICY IF EXISTS "Allow authenticated insert" ON scenario_events;
DROP POLICY IF EXISTS "Allow authenticated update" ON scenario_events;
DROP POLICY IF EXISTS "Allow authenticated delete" ON scenario_events;
DROP POLICY IF EXISTS "Allow all operations" ON scenario_events;
DROP POLICY IF EXISTS "Allow all" ON scenario_events;

-- 2. Deshabilitar RLS completamente (solución temporal para que funcione)
ALTER TABLE scenario_events DISABLE ROW LEVEL SECURITY;

-- 3. Alternativa: Si quieres mantener RLS, usar policy que verifique user_id no null
-- ALTER TABLE scenario_events ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Allow all with user_id"
--     ON scenario_events
--     FOR ALL
--     USING (user_id IS NOT NULL)
--     WITH CHECK (user_id IS NOT NULL);

-- 4. Verificar que user_id existe y tiene índice
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'scenario_events' 
        AND column_name = 'user_id'
    ) THEN
        ALTER TABLE scenario_events ADD COLUMN user_id UUID;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_scenario_events_user_id ON scenario_events(user_id);

-- 5. Verificar estado final
SELECT 
    schemaname,
    tablename,
    rowsecurity AS rls_enabled
FROM pg_tables 
WHERE tablename = 'scenario_events';
