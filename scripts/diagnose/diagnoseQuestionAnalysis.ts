#!/usr/bin/env tsx
/**
 * Diagnóstico: QuestionAnalysisList muestra N/A, 0%, 0.00
 * 
 * Este script verifica si el problema es:
 * A) Datos históricos rotos (pre-fix de persistencia)
 * B) Bug actual en el componente
 * 
 * Uso: npx tsx scripts/diagnose/diagnoseQuestionAnalysis.ts [runId]
 */

// Cargar variables de entorno PRIMERO (side-effect import)
import '../utils/loadEnv';

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || 'http://localhost:8000';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_SERVICE_KEY) {
  console.error('❌ Error: SUPABASE_SERVICE_KEY no está configurado');
  console.error('Asegúrate de tener un archivo .env.scripts con la clave de servicio');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

interface RunInfo {
  id: string;
  survey_id: string;
  created_at: string;
  completed_at: string | null;
  sample_size_actual: number;
  total_responses_from_summary: number | null;
  era: 'POST-FIX' | 'PRE-FIX';
}

interface DiagnosisResult {
  runId: string;
  runExists: boolean;
  runInfo: RunInfo | null;
  responseCount: number;
  uniqueQuestions: number;
  uniqueAgents: number;
  isOrphan: boolean;
  hasMismatch: boolean;
  expectedResponses: number;
  actualResponses: number;
}

async function diagnoseRun(runId: string): Promise<DiagnosisResult> {
  console.log(`\n🔍 Diagnosticando run: ${runId}\n`);

  // 1. Verificar si el run existe
  const { data: runData, error: runError } = await supabase
    .from('survey_runs')
    .select('*')
    .eq('id', runId)
    .single();

  if (runError || !runData) {
    console.log('❌ Run NO encontrado en survey_runs');
    
    // Verificar si hay respuestas huérfanas con este ID
    const { data: orphanResponses, error: orphanError } = await supabase
      .from('survey_responses')
      .select('id, created_at')
      .eq('run_id', runId)
      .limit(5);
    
    if (!orphanError && orphanResponses && orphanResponses.length > 0) {
      console.log(`⚠️  PERO hay ${orphanResponses.length} respuestas huérfanas con este run_id!`);
      console.log('   Esto confirma el bug de persistencia.');
    }

    return {
      runId,
      runExists: false,
      runInfo: null,
      responseCount: orphanResponses?.length || 0,
      uniqueQuestions: 0,
      uniqueAgents: 0,
      isOrphan: true,
      hasMismatch: false,
      expectedResponses: 0,
      actualResponses: orphanResponses?.length || 0,
    };
  }

  console.log('✅ Run encontrado:');
  console.log(`   ID: ${runData.id}`);
  console.log(`   Survey ID: ${runData.survey_id}`);
  console.log(`   Creado: ${runData.created_at}`);
  console.log(`   Sample Size Actual: ${runData.sample_size_actual}`);
  console.log(`   Responses (summary): ${runData.results_summary?.total_responses || 'N/A'}`);

  // Determinar era (pre/post fix)
  const fixDate = new Date('2025-04-03T00:00:00Z');
  const runDate = new Date(runData.created_at);
  const era = runDate > fixDate ? 'POST-FIX' : 'PRE-FIX';
  console.log(`   Era: ${era}`);

  // 2. Contar respuestas asociadas
  const { data: responses, error: responsesError } = await supabase
    .from('survey_responses')
    .select('id, question_id, agent_id, value, created_at')
    .eq('run_id', runId);

  if (responsesError) {
    console.error('❌ Error al obtener respuestas:', responsesError.message);
  }

  const responseCount = responses?.length || 0;
  const uniqueQuestions = new Set(responses?.map(r => r.question_id) || []).size;
  const uniqueAgents = new Set(responses?.map(r => r.agent_id) || []).size;

  console.log(`\n📊 Respuestas:`);
  console.log(`   Total: ${responseCount}`);
  console.log(`   Preguntas únicas: ${uniqueQuestions}`);
  console.log(`   Agentes únicos: ${uniqueAgents}`);

  // 3. Verificar mismatch
  const expectedResponses = runData.results_summary?.total_responses || runData.sample_size_actual || 0;
  const hasMismatch = expectedResponses > 0 && responseCount === 0;

  if (hasMismatch) {
    console.log(`\n⚠️  MISMATCH DETECTADO:`);
    console.log(`   Esperadas: ${expectedResponses}`);
    console.log(`   Reales: ${responseCount}`);
    console.log(`   Esto explica por qué QuestionAnalysisList muestra ceros.`);
  } else if (responseCount === 0) {
    console.log(`\n⚠️  No hay respuestas asociadas a este run.`);
    console.log(`   El run existe pero sin datos de respuestas.`);
  } else {
    console.log(`\n✅ Las respuestas están correctamente asociadas.`);
  }

  // 4. Mostrar distribución por pregunta
  if (responseCount > 0) {
    const questionDistribution: Record<string, number> = {};
    responses?.forEach(r => {
      questionDistribution[r.question_id] = (questionDistribution[r.question_id] || 0) + 1;
    });

    console.log(`\n📋 Distribución por pregunta:`);
    Object.entries(questionDistribution)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .forEach(([qid, count]) => {
        console.log(`   ${qid}: ${count} respuestas`);
      });
  }

  return {
    runId,
    runExists: true,
    runInfo: {
      id: runData.id,
      survey_id: runData.survey_id,
      created_at: runData.created_at,
      completed_at: runData.completed_at,
      sample_size_actual: runData.sample_size_actual,
      total_responses_from_summary: runData.results_summary?.total_responses,
      era,
    },
    responseCount,
    uniqueQuestions,
    uniqueAgents,
    isOrphan: false,
    hasMismatch,
    expectedResponses,
    actualResponses: responseCount,
  };
}

async function getRecentRuns(limit: number = 5): Promise<string[]> {
  console.log(`\n📋 Obteniendo los ${limit} runs más recientes...\n`);

  const { data: runs, error } = await supabase
    .from('survey_runs')
    .select('id, created_at')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error || !runs) {
    console.error('❌ Error al obtener runs:', error?.message);
    return [];
  }

  console.log('Runs encontrados:');
  runs.forEach((run, i) => {
    const date = new Date(run.created_at);
    const fixDate = new Date('2025-04-03T00:00:00Z');
    const era = date > fixDate ? 'POST-FIX' : 'PRE-FIX';
    console.log(`  ${i + 1}. ${run.id} (${era})`);
  });

  return runs.map(r => r.id);
}

async function generateSummary() {
  console.log('\n' + '='.repeat(60));
  console.log('RESUMEN EJECUTIVO');
  console.log('='.repeat(60));

  // Estadísticas generales
  const { data: stats, error: statsError } = await supabase
    .rpc('get_survey_stats');

  if (!statsError && stats) {
    console.log('\n📊 Estadísticas generales:');
    console.log(`   Total Runs: ${stats.total_runs}`);
    console.log(`   Total Responses: ${stats.total_responses}`);
    console.log(`   Runs con respuestas: ${stats.runs_with_responses}`);
  }

  // Verificar respuestas huérfanas
  const { data: orphans, error: orphanError } = await supabase
    .from('survey_responses')
    .select('run_id', { count: 'exact' })
    .not('run_id', 'in', (
      supabase.from('survey_runs').select('id')
    ));

  if (!orphanError) {
    console.log(`   Respuestas huérfanas: ${orphans?.length || 0}`);
  }
}

async function main() {
  const runId = process.argv[2];

  console.log('🔬 Diagnóstico: QuestionAnalysisList');
  console.log('=====================================\n');

  if (runId) {
    // Diagnóstico de un run específico
    await diagnoseRun(runId);
  } else {
    // Diagnóstico de los runs más recientes
    console.log('No se especificó runId. Analizando runs recientes...\n');
    const recentRuns = await getRecentRuns(3);

    for (const id of recentRuns) {
      await diagnoseRun(id);
      console.log('\n' + '-'.repeat(60));
    }

    await generateSummary();
  }

  console.log('\n✅ Diagnóstico completado.\n');
  console.log('💡 Próximos pasos:');
  console.log('   1. Si el run es PRE-FIX: los datos están rotos, necesitas re-ejecutar');
  console.log('   2. Si el run es POST-FIX y tiene mismatch: el fix no funcionó');
  console.log('   3. Si el run tiene respuestas correctas: revisar QuestionAnalysisList');
}

main().catch(console.error);
