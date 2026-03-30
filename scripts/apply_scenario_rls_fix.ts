#!/usr/bin/env tsx
/**
 * Script para aplicar el fix de RLS en scenario_events
 * Ejecutar: npx tsx scripts/apply_scenario_rls_fix.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

// Cargar variables de entorno
dotenv.config({ path: resolve(process.cwd(), '.env.scripts') });
dotenv.config({ path: resolve(process.cwd(), '.env') });

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('❌ Error: Se requieren SUPABASE_URL y SUPABASE_SERVICE_KEY');
  console.error('   Asegúrate de tener .env.scripts configurado');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

async function applyRLSFix() {
  console.log('🔧 Aplicando fix de RLS para scenario_events...\n');

  // SQL para arreglar las políticas RLS
  const fixSQL = `
-- Eliminar TODAS las políticas existentes
DROP POLICY IF EXISTS "Allow public read" ON scenario_events;
DROP POLICY IF EXISTS "Allow authenticated insert" ON scenario_events;
DROP POLICY IF EXISTS "Allow authenticated update" ON scenario_events;
DROP POLICY IF EXISTS "Allow authenticated delete" ON scenario_events;
DROP POLICY IF EXISTS "Allow all authenticated" ON scenario_events;
DROP POLICY IF EXISTS "Allow anon insert" ON scenario_events;
DROP POLICY IF EXISTS "Allow anon update" ON scenario_events;
DROP POLICY IF EXISTS "Allow anon delete" ON scenario_events;

-- Crear políticas que permitan todo a anon (para custom auth)
CREATE POLICY "Allow public read" ON scenario_events
    FOR SELECT USING (true);

CREATE POLICY "Allow anon insert" ON scenario_events
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow anon update" ON scenario_events
    FOR UPDATE USING (true);

CREATE POLICY "Allow anon delete" ON scenario_events
    FOR DELETE USING (true);

-- Asegurar que RLS está habilitado
ALTER TABLE scenario_events ENABLE ROW LEVEL SECURITY;

-- Verificar políticas
SELECT 
    policyname,
    cmd,
    qual::text as using_expression,
    with_check::text as with_check_expression
FROM pg_policies
WHERE tablename = 'scenario_events'
ORDER BY policyname;
  `;

  try {
    console.log('📋 Ejecutando SQL de fix...');
    
    // Ejecutar el SQL
    const { data, error } = await supabase.rpc('exec_sql', { sql: fixSQL });
    
    if (error) {
      console.error('❌ Error ejecutando SQL:', error.message);
      
      // Intentar método alternativo: ejecutar cada statement por separado
      console.log('\n🔄 Intentando método alternativo...\n');
      
      const statements = [
        'DROP POLICY IF EXISTS "Allow public read" ON scenario_events',
        'DROP POLICY IF EXISTS "Allow authenticated insert" ON scenario_events',
        'DROP POLICY IF EXISTS "Allow authenticated update" ON scenario_events',
        'DROP POLICY IF EXISTS "Allow authenticated delete" ON scenario_events',
        'DROP POLICY IF EXISTS "Allow all authenticated" ON scenario_events',
        'DROP POLICY IF EXISTS "Allow anon insert" ON scenario_events',
        'DROP POLICY IF EXISTS "Allow anon update" ON scenario_events',
        'DROP POLICY IF EXISTS "Allow anon delete" ON scenario_events',
        'CREATE POLICY "Allow public read" ON scenario_events FOR SELECT USING (true)',
        'CREATE POLICY "Allow anon insert" ON scenario_events FOR INSERT WITH CHECK (true)',
        'CREATE POLICY "Allow anon update" ON scenario_events FOR UPDATE USING (true)',
        'CREATE POLICY "Allow anon delete" ON scenario_events FOR DELETE USING (true)',
        'ALTER TABLE scenario_events ENABLE ROW LEVEL SECURITY'
      ];
      
      for (const stmt of statements) {
        try {
          const { error: stmtError } = await supabase.rpc('exec_sql', { sql: stmt });
          if (stmtError) {
            console.log(`   ⚠️  ${stmt.substring(0, 50)}... - ${stmtError.message}`);
          } else {
            console.log(`   ✅ ${stmt.substring(0, 50)}...`);
          }
        } catch (e) {
          console.log(`   ⚠️  ${stmt.substring(0, 50)}... - Error`);
        }
      }
    } else {
      console.log('✅ SQL ejecutado correctamente');
      console.log('Resultado:', data);
    }

    // Verificar el estado final
    console.log('\n🔍 Verificando estado de RLS...');
    const { data: policies, error: policiesError } = await supabase
      .from('pg_policies')
      .select('policyname, cmd, qual, with_check')
      .eq('tablename', 'scenario_events');

    if (policiesError) {
      console.log('   ⚠️  No se pudo verificar políticas:', policiesError.message);
    } else {
      console.log(`   ✅ Tabla tiene ${policies?.length || 0} políticas:`);
      policies?.forEach((p: any) => {
        console.log(`      - ${p.policyname} (${p.cmd})`);
      });
    }

    // Probar inserción
    console.log('\n🧪 Probando inserción de prueba...');
    const testScenario = {
      name: 'Test RLS Fix',
      description: 'Escenario de prueba para verificar RLS',
      category: 'economy',
      sentiment: 0.5,
      intensity: 0.7,
      salience: 0.8,
      severity: 'moderate',
      target_entities: [],
      status: 'draft'
    };

    const { data: insertData, error: insertError } = await supabase
      .from('scenario_events')
      .insert(testScenario)
      .select()
      .single();

    if (insertError) {
      console.error('   ❌ Error en inserción:', insertError.message);
      console.error('   Código:', insertError.code);
    } else {
      console.log('   ✅ Inserción exitosa:', insertData.id);
      
      // Limpiar escenario de prueba
      await supabase.from('scenario_events').delete().eq('id', insertData.id);
      console.log('   🧹 Escenario de prueba eliminado');
    }

  } catch (error) {
    console.error('❌ Error inesperado:', error);
  }
}

applyRLSFix();
