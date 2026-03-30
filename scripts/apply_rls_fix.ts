/**
 * Script para aplicar fix de RLS a scenario_events
 * Usa service key para bypassar RLS
 * 
 * ⚠️ REQUIERE: SUPABASE_SERVICE_KEY en .env.scripts
 * NO usar ANON_KEY - las migraciones requieren privilegios de service_role
 */

import { serviceClient } from './utils/serviceClient';

// El cliente serviceClient ya está validado y configurado con SERVICE_KEY
const client = serviceClient;
console.log('🔗 Usando serviceClient con SERVICE_KEY');

const FIX_SQL = `
-- Eliminar políticas existentes para recrearlas
DROP POLICY IF EXISTS "Allow public read" ON scenario_events;
DROP POLICY IF EXISTS "Allow authenticated insert" ON scenario_events;
DROP POLICY IF EXISTS "Allow authenticated update" ON scenario_events;
DROP POLICY IF EXISTS "Allow authenticated delete" ON scenario_events;

-- Política: Lectura pública (todos pueden ver escenarios)
CREATE POLICY "Allow public read" ON scenario_events
    FOR SELECT USING (true);

-- Política: INSERT permitido para usuarios autenticados
CREATE POLICY "Allow authenticated insert" ON scenario_events
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Política: UPDATE permitido para usuarios autenticados
CREATE POLICY "Allow authenticated update" ON scenario_events
    FOR UPDATE USING (auth.role() = 'authenticated');

-- Política: DELETE permitido para usuarios autenticados
CREATE POLICY "Allow authenticated delete" ON scenario_events
    FOR DELETE USING (auth.role() = 'authenticated');

-- Asegurar que RLS está habilitado
ALTER TABLE scenario_events ENABLE ROW LEVEL SECURITY;
`;

async function applyRLSFix() {
  console.log('🔧 Aplicando fix de RLS a scenario_events...\n');

  try {
    // Intentar ejecutar SQL usando rpc exec_sql
    const { error } = await client.rpc('exec_sql', { sql: FIX_SQL });

    if (error) {
      console.error('❌ Error al aplicar fix via RPC:', error.message);
      console.log('\n⚠️  Debes aplicar la migración manualmente:');
      console.log('   1. Ve al SQL Editor de Supabase Dashboard');
      console.log('   2. Ejecuta el contenido de: migrations/20250330_fix_scenario_events_rls.sql');
      process.exit(1);
    }

    console.log('✅ Fix de RLS aplicado exitosamente');
    console.log('\n📋 Políticas configuradas:');
    console.log('   - Allow public read (SELECT)');
    console.log('   - Allow authenticated insert (INSERT)');
    console.log('   - Allow authenticated update (UPDATE)');
    console.log('   - Allow authenticated delete (DELETE)');

  } catch (err) {
    console.error('❌ Error inesperado:', err);
    process.exit(1);
  }
}

applyRLSFix();
