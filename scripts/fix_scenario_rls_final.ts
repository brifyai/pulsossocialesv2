#!/usr/bin/env tsx
/**
 * Script final para arreglar RLS de scenario_events
 * Usa serviceClient para operaciones privilegiadas
 */

import { getServiceClient } from './utils/serviceClient';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

// Cargar variables de entorno
dotenv.config({ path: resolve(process.cwd(), '.env.scripts') });
dotenv.config({ path: resolve(process.cwd(), '.env') });

const supabase = getServiceClient();

async function fixScenarioRLS() {
  console.log('🔧 Fix final de RLS para scenario_events\n');

  // 1. Verificar estado actual
  console.log('1️⃣ Verificando estado actual de RLS...');
  const { data: policies, error: policiesError } = await supabase
    .from('pg_policies')
    .select('policyname, cmd, qual, with_check')
    .eq('tablename', 'scenario_events');

  if (policiesError) {
    console.log('   ⚠️  No se pudo leer pg_policies:', policiesError.message);
  } else {
    console.log(`   📋 Políticas actuales (${policies?.length || 0}):`);
    policies?.forEach((p: any) => {
      console.log(`      - ${p.policyname} (${p.cmd})`);
    });
  }

  // 2. Eliminar políticas existentes una por una
  console.log('\n2️⃣ Eliminando políticas existentes...');
  const policiesToDrop = [
    'Allow public read',
    'Allow authenticated insert',
    'Allow authenticated update',
    'Allow authenticated delete',
    'Allow all authenticated',
    'Allow anon insert',
    'Allow anon update',
    'Allow anon delete'
  ];

  for (const policyName of policiesToDrop) {
    const { error } = await supabase.rpc('exec_sql', {
      sql: `DROP POLICY IF EXISTS "${policyName}" ON scenario_events`
    });
    if (error) {
      console.log(`   ⚠️  DROP "${policyName}" - ${error.message}`);
    } else {
      console.log(`   ✅ DROP "${policyName}"`);
    }
  }

  // 3. Crear nuevas políticas permisivas para anon
  console.log('\n3️⃣ Creando nuevas políticas permisivas...');

  const newPolicies = [
    { name: 'Allow public read', cmd: 'SELECT', check: 'true' },
    { name: 'Allow anon insert', cmd: 'INSERT', check: 'true' },
    { name: 'Allow anon update', cmd: 'UPDATE', check: 'true' },
    { name: 'Allow anon delete', cmd: 'DELETE', check: 'true' }
  ];

  for (const policy of newPolicies) {
    let sql: string;
    if (policy.cmd === 'INSERT') {
      sql = `CREATE POLICY "${policy.name}" ON scenario_events FOR INSERT WITH CHECK (${policy.check})`;
    } else if (policy.cmd === 'SELECT') {
      sql = `CREATE POLICY "${policy.name}" ON scenario_events FOR SELECT USING (${policy.check})`;
    } else {
      sql = `CREATE POLICY "${policy.name}" ON scenario_events FOR ${policy.cmd} USING (${policy.check})`;
    }

    const { error } = await supabase.rpc('exec_sql', { sql });
    if (error) {
      console.log(`   ❌ CREATE "${policy.name}" - ${error.message}`);
    } else {
      console.log(`   ✅ CREATE "${policy.name}" (${policy.cmd})`);
    }
  }

  // 4. Asegurar RLS habilitado
  console.log('\n4️⃣ Habilitando RLS...');
  const { error: rlsError } = await supabase.rpc('exec_sql', {
    sql: 'ALTER TABLE scenario_events ENABLE ROW LEVEL SECURITY'
  });
  if (rlsError) {
    console.log('   ⚠️  ENABLE RLS -', rlsError.message);
  } else {
    console.log('   ✅ RLS habilitado');
  }

  // 5. Forzar recarga del schema cache
  console.log('\n5️⃣ Forzando recarga de schema cache...');
  const { error: notifyError } = await supabase.rpc('exec_sql', {
    sql: 'NOTIFY pgrst, \'reload schema\''
  });
  if (notifyError) {
    console.log('   ⚠️  NOTIFY -', notifyError.message);
  } else {
    console.log('   ✅ Schema cache notificado');
  }

  // 6. Verificar estado final
  console.log('\n6️⃣ Verificando estado final...');
  const { data: finalPolicies, error: finalError } = await supabase
    .from('pg_policies')
    .select('policyname, cmd, qual, with_check')
    .eq('tablename', 'scenario_events');

  if (finalError) {
    console.log('   ❌ Error:', finalError.message);
  } else {
    console.log(`   ✅ Tabla tiene ${finalPolicies?.length || 0} políticas:`);
    finalPolicies?.forEach((p: any) => {
      console.log(`      - ${p.policyname} (${p.cmd})`);
    });
  }

  // 7. Probar inserción con service key
  console.log('\n7️⃣ Probando inserción con SERVICE KEY...');
  const testData = {
    name: 'Test Service Key',
    description: 'Prueba con service key',
    category: 'economy',
    sentiment: 0.5,
    intensity: 0.5,
    salience: 0.5,
    severity: 'low',
    target_entities: [],
    status: 'draft'
  };

  const { data: insertData, error: insertError } = await supabase
    .from('scenario_events')
    .insert(testData)
    .select()
    .single();

  if (insertError) {
    console.log('   ❌ Error:', insertError.message, `(código: ${insertError.code})`);
  } else {
    console.log('   ✅ Inserción exitosa:', insertData.id);
    await supabase.from('scenario_events').delete().eq('id', insertData.id);
    console.log('   🧹 Limpieza completada');
  }

  console.log('\n✨ Fix completado');
  console.log('\n⚠️  IMPORTANTE: Si el frontend sigue fallando, el problema puede ser:');
  console.log('   1. El ANON_KEY no tiene permisos suficientes');
  console.log('   2. Hay un middleware bloqueando requests');
  console.log('   3. El schema cache no se actualizó (esperar 1-2 minutos)');
}

fixScenarioRLS().catch(console.error);
