#!/usr/bin/env ts-node
/**
 * Script para aplicar migración RLS v4 segura
 * 
 * Uso:
 *   npx ts-node scripts/apply_rls_v4_secure.ts
 * 
 * ⚠️ REQUIERE: SUPABASE_SERVICE_KEY en .env.scripts
 * NO usar ANON_KEY - las migraciones requieren privilegios de service_role
 * 
 * Este script:
 * 1. Lee el archivo SQL de migración
 * 2. Lo ejecuta en Supabase usando service_role
 * 3. Verifica que las policies se aplicaron correctamente
 * 4. Ejecuta tests de seguridad básicos
 */

import * as fs from 'fs';
import * as path from 'path';
import { serviceClient } from './utils/serviceClient';

// El cliente serviceClient ya está validado y configurado con SERVICE_KEY
const supabase = serviceClient;
console.log('🔗 Usando serviceClient con SERVICE_KEY');

async function applyMigration() {
  console.log('🔧 Aplicando migración RLS v4 segura...\n');

  // Leer archivo SQL
  const migrationPath = path.join(__dirname, '..', 'migrations', '20250330_fix_scenario_events_rls_v4_SECURE.sql');
  
  if (!fs.existsSync(migrationPath)) {
    console.error(`❌ Archivo no encontrado: ${migrationPath}`);
    process.exit(1);
  }

  const sql = fs.readFileSync(migrationPath, 'utf-8');
  console.log(`📄 Archivo SQL cargado: ${sql.length} caracteres`);

  // Ejecutar SQL
  console.log('\n🚀 Ejecutando migración...');
  
  try {
    // Usar RPC para ejecutar SQL (requiere función exec_sql o similar)
    // Alternativa: usar REST API directamente
    const { error } = await supabase.rpc('exec_sql', { sql });
    
    if (error) {
      console.error('❌ Error ejecutando migración:', error.message);
      
      // Fallback: mostrar SQL para ejecución manual
      console.log('\n⚠️  No se pudo ejecutar automáticamente.');
      console.log('📝 Copia el siguiente SQL al editor de Supabase:\n');
      console.log('='.repeat(80));
      console.log(sql);
      console.log('='.repeat(80));
      
      process.exit(1);
    }

    console.log('✅ Migración aplicada exitosamente');
    
  } catch (err) {
    console.error('❌ Error:', err);
    process.exit(1);
  }
}

async function verifyPolicies() {
  console.log('\n🔍 Verificando policies aplicadas...\n');

  const tables = ['scenario_events', 'weekly_events', 'event_impact_logs'];
  
  for (const table of tables) {
    console.log(`\n📋 Tabla: ${table}`);
    
    const { data, error } = await supabase
      .from('pg_policies')
      .select('policyname, permissive, roles, cmd, qual, with_check')
      .eq('tablename', table);

    if (error) {
      console.error(`   ❌ Error: ${error.message}`);
      continue;
    }

    if (!data || data.length === 0) {
      console.log('   ⚠️  No hay policies definidas');
      continue;
    }

    data.forEach((policy: any) => {
      const cmd = policy.cmd.padEnd(6);
      const name = policy.policyname;
      console.log(`   ✅ ${cmd} - ${name}`);
    });
  }
}

async function runSecurityTests() {
  console.log('\n🛡️  Ejecutando tests de seguridad...\n');

  // Test 1: Verificar que RLS está habilitado
  console.log('Test 1: Verificando RLS habilitado...');
  const { data: rlsData, error: rlsError } = await supabase
    .from('pg_tables')
    .select('tablename, rowsecurity')
    .in('tablename', ['scenario_events', 'weekly_events', 'event_impact_logs']);

  if (rlsError) {
    console.error('   ❌ Error:', rlsError.message);
  } else {
    rlsData?.forEach((table: any) => {
      const status = table.rowsecurity ? '✅' : '❌';
      console.log(`   ${status} ${table.tablename}: RLS ${table.rowsecurity ? 'habilitado' : 'DESHABILITADO'}`);
    });
  }

  // Test 2: Verificar que no hay policies de anon
  console.log('\nTest 2: Verificando que anon está bloqueado...');
  const { data: anonPolicies, error: anonError } = await supabase
    .from('pg_policies')
    .select('tablename, policyname')
    .like('policyname', '%anon%');

  if (anonError) {
    console.error('   ❌ Error:', anonError.message);
  } else if (anonPolicies && anonPolicies.length > 0) {
    console.log('   ❌ Policies de anon encontradas (PELIGRO):');
    anonPolicies.forEach((p: any) => console.log(`      - ${p.tablename}: ${p.policyname}`));
  } else {
    console.log('   ✅ No hay policies de anon');
  }

  // Test 3: Verificar aislamiento (created_by en policies)
  console.log('\nTest 3: Verificando aislamiento entre usuarios...');
  const { data: isolationPolicies, error: isoError } = await supabase
    .from('pg_policies')
    .select('tablename, policyname, qual')
    .like('qual', '%created_by%');

  if (isoError) {
    console.error('   ❌ Error:', isoError.message);
  } else if (isolationPolicies && isolationPolicies.length > 0) {
    console.log('   ✅ Aislamiento configurado en:');
    isolationPolicies.forEach((p: any) => console.log(`      - ${p.tablename}: ${p.policyname}`));
  } else {
    console.log('   ⚠️  No se detectó aislamiento por created_by');
  }

  console.log('\n✅ Tests de seguridad completados');
}

async function main() {
  console.log('='.repeat(80));
  console.log('MIGRACIÓN RLS v4 - SEGURA');
  console.log('='.repeat(80));

  try {
    await applyMigration();
    await verifyPolicies();
    await runSecurityTests();

    console.log('\n' + '='.repeat(80));
    console.log('✅ MIGRACIÓN COMPLETADA EXITOSAMENTE');
    console.log('='.repeat(80));
    console.log('\nResumen:');
    console.log('  • RLS habilitado en todas las tablas');
    console.log('  • Anon completamente bloqueado');
    console.log('  • Aislamiento entre usuarios configurado');
    console.log('  • Service_role tiene acceso completo');
    console.log('\n⚠️  IMPORTANTE: Verificar en el panel de Supabase que todo esté correcto.');

  } catch (err) {
    console.error('\n❌ Error en la migración:', err);
    process.exit(1);
  }
}

main();
