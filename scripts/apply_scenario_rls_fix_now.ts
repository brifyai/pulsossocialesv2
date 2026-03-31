/**
 * Script para aplicar fix de RLS a scenario_events
 * Ejecutar: npx tsx scripts/apply_scenario_rls_fix_now.ts
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

// Cargar variables de entorno
config({ path: '.env.scripts' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error('❌ Error: VITE_SUPABASE_URL y SUPABASE_SERVICE_KEY son requeridos');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function applyRlsFix() {
  console.log('🔧 Aplicando fix de RLS para scenario_events...\n');

  // SQL para fix de RLS - versión simplificada que permite INSERT a usuarios autenticados
  const sql = `
-- ============================================================================
-- FIX RLS SIMPLIFICADO PARA SCENARIO_EVENTS
-- ============================================================================

-- 1. Limpiar policies existentes
DROP POLICY IF EXISTS "Users can view own scenarios" ON scenario_events;
DROP POLICY IF EXISTS "Users can insert own scenarios" ON scenario_events;
DROP POLICY IF EXISTS "Users can update own scenarios" ON scenario_events;
DROP POLICY IF EXISTS "Users can delete own scenarios" ON scenario_events;
DROP POLICY IF EXISTS "Service role full access" ON scenario_events;

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

-- 4. Service role bypass (opcional, para scripts)
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
`;

  try {
    // Ejecutar SQL directamente usando rpc
    const { error } = await supabase.rpc('exec_sql', { sql });
    
    if (error) {
      console.error('❌ Error aplicando RLS:', error);
      
      // Intentar método alternativo: ejecutar como query directa
      console.log('\n🔄 Intentando método alternativo...');
      
      // Verificar si la función exec_sql existe
      const { data: funcExists, error: funcError } = await supabase
        .from('pg_proc')
        .select('proname')
        .eq('proname', 'exec_sql')
        .single();
        
      if (funcError || !funcExists) {
        console.log('⚠️ La función exec_sql no existe. Debes aplicar el SQL manualmente en el SQL Editor de Supabase.');
        console.log('\n📋 SQL a ejecutar:\n');
        console.log(sql);
        return;
      }
    } else {
      console.log('✅ RLS aplicado correctamente');
    }

    // Verificar policies creadas
    console.log('\n🔍 Verificando policies...');
    const { data: policies, error: policiesError } = await supabase
      .from('pg_policies')
      .select('policyname, tablename, permissive')
      .eq('tablename', 'scenario_events');

    if (policiesError) {
      console.error('❌ Error verificando policies:', policiesError);
    } else {
      console.log(`✅ ${policies?.length || 0} policies encontradas para scenario_events:`);
      policies?.forEach(p => {
        console.log(`   - ${p.policyname} (${p.permissive})`);
      });
    }

    // Verificar estructura de la tabla
    console.log('\n🔍 Verificando estructura de scenario_events...');
    const { data: columns, error: columnsError } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type')
      .eq('table_name', 'scenario_events')
      .eq('table_schema', 'public');

    if (columnsError) {
      console.error('❌ Error verificando columnas:', columnsError);
    } else {
      const hasUserId = columns?.some(c => c.column_name === 'user_id');
      console.log(`   user_id column: ${hasUserId ? '✅ Existe' : '❌ No existe'}`);
      
      if (!hasUserId) {
        console.log('⚠️ La columna user_id no existe. Debes agregarla manualmente.');
      }
    }

  } catch (error) {
    console.error('❌ Error inesperado:', error);
    console.log('\n📋 SQL para aplicar manualmente:\n');
    console.log(sql);
  }
}

applyRlsFix();
