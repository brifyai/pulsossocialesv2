/**
 * Script para diagnosticar el problema de run_id mismatch
 * entre survey_runs y survey_responses
 */

import { createClient } from '@supabase/supabase-js';
import { loadEnv } from './utils/loadEnv';

// Cargar variables de entorno
loadEnv();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'http://localhost:8000';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB1bHNvc3NvY2lhbGVzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDEwMDQ4MDAsImV4cCI6MTg5ODc3MTIwMH0.abc123';

async function diagnoseRunIdIssue() {
  console.log('🔍 Diagnosticando problema de run_id...\n');
  console.log('Supabase URL:', SUPABASE_URL);
  console.log('Anon Key:', SUPABASE_ANON_KEY.substring(0, 20) + '...\n');

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  // 1. Obtener los últimos 5 runs
  console.log('📊 Obteniendo últimos 5 survey_runs...');
  const { data: runs, error: runsError } = await supabase
    .from('survey_runs')
    .select('id, survey_id, created_at, sample_size_actual')
    .order('created_at', { ascending: false })
    .limit(5);

  if (runsError) {
    console.error('❌ Error obteniendo runs:', runsError);
    return;
  }

  console.log(`✅ Encontrados ${runs?.length || 0} runs:\n`);
  
  for (const run of runs || []) {
    console.log(`  Run ID: ${run.id}`);
    console.log(`  Survey ID: ${run.survey_id}`);
    console.log(`  Created: ${run.created_at}`);
    console.log(`  Sample Size: ${run.sample_size_actual}`);
    
    // Contar respuestas para este run
    const { count, error: countError } = await supabase
      .from('survey_responses')
      .select('*', { count: 'exact', head: true })
      .eq('run_id', run.id);
    
    if (countError) {
      console.error(`  ❌ Error contando respuestas:`, countError);
    } else {
      console.log(`  Responses: ${count || 0}`);
    }
    console.log('');
  }

  // 2. Obtener respuestas que no coinciden con ningún run
  console.log('\n📊 Buscando respuestas huérfanas (sin run_id coincidente)...');
  const { data: responses, error: respError } = await supabase
    .from('survey_responses')
    .select('run_id, count(*)')
    .group('run_id')
    .order('count', { ascending: false })
    .limit(10);

  if (respError) {
    console.error('❌ Error obteniendo respuestas:', respError);
    return;
  }

  console.log(`\n✅ Encontrados ${responses?.length || 0} run_ids en survey_responses:\n`);
  
  for (const resp of responses || []) {
    // Verificar si el run existe
    const { data: runExists, error: existsError } = await supabase
      .from('survey_runs')
      .select('id')
      .eq('id', resp.run_id)
      .single();
    
    const exists = !!runExists && !existsError;
    console.log(`  Run ID: ${resp.run_id}`);
    console.log(`  Count: ${resp.count}`);
    console.log(`  Run exists: ${exists ? '✅ Sí' : '❌ No (HUÉRFANO)'}`);
    console.log('');
  }

  // 3. Verificar si hay runs sin respuestas
  console.log('\n📊 Verificando runs sin respuestas...');
  for (const run of runs || []) {
    const { count, error } = await supabase
      .from('survey_responses')
      .select('*', { count: 'exact', head: true })
      .eq('run_id', run.id);
    
    if (!error && (count || 0) === 0) {
      console.log(`  ⚠️  Run sin respuestas: ${run.id}`);
    }
  }
}

diagnoseRunIdIssue().catch(console.error);
