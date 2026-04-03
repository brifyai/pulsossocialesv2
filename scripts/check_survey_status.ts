/**
 * Script para verificar el status de las encuestas
 * Identifica por qué algunas encuestas no son visibles para el rol anónimo
 */

import { createClient } from '@supabase/supabase-js';
import './utils/loadEnv.ts';

const supabaseUrl = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error('❌ Missing required environment variables');
  process.exit(1);
}

async function checkSurveyStatus() {
  console.log('🔍 Checking survey status and visibility details...\n');

  const serviceClient = createClient(supabaseUrl, serviceKey);

  // Obtener todas las encuestas con todos sus campos relevantes
  const { data: surveys, error } = await serviceClient
    .from('survey_definitions')
    .select('id, name, status, created_by, created_at, deleted_at')
    .is('deleted_at', null)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }

  console.log(`Total surveys in DB: ${surveys?.length || 0}\n`);

  // Analizar cada encuesta
  const visibleToAnon: any[] = [];
  const notVisibleToAnon: any[] = [];

  surveys?.forEach((s: any) => {
    // Según la política RLS: status IN ('active', 'completed', 'archived')
    const isVisible = ['active', 'completed', 'archived'].includes(s.status);

    if (isVisible) {
      visibleToAnon.push(s);
    } else {
      notVisibleToAnon.push(s);
    }
  });

  console.log('=== VISIBLE TO ANON (status = active/completed/archived) ===');
  console.log(`Count: ${visibleToAnon.length}`);
  visibleToAnon.forEach((s: any) => {
    console.log(`   - ${s.name}`);
    console.log(`     status: ${s.status}, created_by: ${s.created_by || 'null'}`);
  });

  console.log('\n=== NOT VISIBLE TO ANON (status != active/completed/archived) ===');
  console.log(`Count: ${notVisibleToAnon.length}`);
  notVisibleToAnon.forEach((s: any) => {
    console.log(`   - ${s.name}`);
    console.log(`     status: ${s.status}, created_by: ${s.created_by || 'null'}`);
  });

  // Verificar si hay un patrón con created_by
  console.log('\n=== ANALYSIS BY created_by ===');
  const withCreatedBy = surveys?.filter((s: any) => s.created_by !== null) || [];
  const withoutCreatedBy = surveys?.filter((s: any) => s.created_by === null) || [];

  console.log(`Surveys WITH created_by: ${withCreatedBy.length}`);
  withCreatedBy.forEach((s: any) => {
    console.log(`   - ${s.name} (status: ${s.status})`);
  });

  console.log(`\nSurveys WITHOUT created_by: ${withoutCreatedBy.length}`);
  withoutCreatedBy.forEach((s: any) => {
    console.log(`   - ${s.name} (status: ${s.status})`);
  });

  // Verificar políticas RLS actuales
  console.log('\n=== CURRENT RLS POLICIES ===');
  const { data: policies, error: policyError } = await serviceClient
    .from('pg_policies')
    .select('*')
    .eq('tablename', 'survey_definitions');

  if (policyError) {
    console.log('Could not fetch policies directly, trying SQL...');
    // Intentar con RPC
    const { data: sqlPolicies, error: sqlError } = await serviceClient.rpc('get_policies_for_table', {
      table_name: 'survey_definitions'
    });
    if (sqlError) {
      console.log('SQL Error:', sqlError.message);
    } else {
      console.log(sqlPolicies);
    }
  } else {
    console.log('Policies found:', policies);
  }
}

checkSurveyStatus().catch(console.error);
