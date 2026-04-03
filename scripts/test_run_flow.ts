/**
 * Script para probar el flujo completo de creación de run y respuestas
 * y verificar si hay problema con los IDs
 */

import { createClient } from '@supabase/supabase-js';
import { loadEnv } from './utils/loadEnv';

// Cargar variables de entorno
loadEnv();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'http://localhost:8000';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB1bHNvc3NvY2lhbGVzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDEwMDQ4MDAsImV4cCI6MTg5ODc3MTIwMH0.abc123';

async function testRunFlow() {
  console.log('🧪 Probando flujo de run y respuestas...\n');
  
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  
  // 1. Crear un run local con ID temporal
  const localRunId = `run_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  console.log('1️⃣  ID local generado:', localRunId);
  
  // 2. Simular la conversión a DB (como hace toDbSurveyRun)
  const dbRunData = {
    survey_id: 'test-survey-123',
    name: null,
    status: 'completed',
    segment_applied: {},
    sample_size_requested: 100,
    sample_size_actual: 100,
    agents_matched: 100,
    progress_percent: 100,
    current_agent_index: 100,
    results_summary: { total_responses: 100 },
    error_message: null,
    error_details: null,
    started_at: new Date().toISOString(),
    completed_at: new Date().toISOString(),
    // NOTA: No incluimos 'id' aquí, la DB generará uno
  };
  
  console.log('2️⃣  Datos para insertar (sin ID):', dbRunData.survey_id);
  
  // 3. Insertar en DB
  console.log('\n3️⃣  Insertando run en DB...');
  const { data: insertedRun, error } = await supabase
    .from('survey_runs')
    .insert(dbRunData)
    .select()
    .single();
  
  if (error) {
    console.error('❌ Error insertando run:', error);
    return;
  }
  
  console.log('✅ Run insertado con ID:', insertedRun.id);
  console.log('   ID local original:', localRunId);
  
  // 4. Ahora guardar una respuesta con el ID de la DB
  console.log('\n4️⃣  Guardando respuesta de prueba...');
  
  const testResponse = {
    survey_id: 'test-survey-123',
    run_id: insertedRun.id, // Usar el ID de la DB, no el local
    agent_id: 'test-agent-001',
    question_id: 'q1',
    question_type: 'single_choice',
    value: 'test',
    confidence: 0.9,
    reasoning: 'Test response',
    heuristics_applied: [],
    agent_snapshot: { age: 30, sex: 'male' }
  };
  
  const { data: savedResponse, error: respError } = await supabase
    .from('survey_responses')
    .insert(testResponse)
    .select()
    .single();
  
  if (respError) {
    console.error('❌ Error guardando respuesta:', respError);
  } else {
    console.log('✅ Respuesta guardada con run_id:', savedResponse.run_id);
  }
  
  // 5. Verificar que la respuesta se puede recuperar
  console.log('\n5️⃣  Verificando que la respuesta se puede recuperar...');
  const { data: responses, error: fetchError } = await supabase
    .from('survey_responses')
    .select('*')
    .eq('run_id', insertedRun.id);
  
  if (fetchError) {
    console.error('❌ Error recuperando respuestas:', fetchError);
  } else {
    console.log(`✅ Encontradas ${responses?.length || 0} respuestas para run_id ${insertedRun.id}`);
  }
  
  // 6. Limpiar datos de prueba
  console.log('\n6️⃣  Limpiando datos de prueba...');
  await supabase.from('survey_responses').delete().eq('run_id', insertedRun.id);
  await supabase.from('survey_runs').delete().eq('id', insertedRun.id);
  console.log('✅ Datos de prueba eliminados');
}

testRunFlow().catch(console.error);
