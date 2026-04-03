/**
 * Debug UI Analysis Loading
 *
 * Simula el flujo exacto que hace la UI para cargar el análisis
 * y verifica dónde se pierden los datos.
 */

import '../utils/loadEnv';

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { AgentResponse } from '../../src/types/survey';

const runId = process.argv[2] || '8495a1f6-05ce-4c7f-91a9-b1eb01b5ae33';

console.log('🔬 Debug: UI Analysis Loading');
console.log('=====================================\n');
console.log(`Run ID: ${runId}\n`);

// Create Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase: SupabaseClient = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false }
});

async function debugAnalysisLoading() {
  try {
    // Paso 1: Verificar que el run existe
    console.log('📋 Paso 1: Verificar run en survey_runs');
    const { data: run, error: runError } = await supabase
      .from('survey_runs')
      .select('*')
      .eq('id', runId)
      .single();

    if (runError) {
      console.error(`   ❌ Error: ${runError.message}`);
      return;
    }

    if (!run) {
      console.error('   ❌ Run no encontrado');
      return;
    }

    console.log(`   ✅ Run encontrado:`);
    console.log(`      - Survey ID: ${run.survey_id}`);
    console.log(`      - Sample Size Actual: ${run.sample_size_actual}`);
    console.log(`      - Results Summary:`, run.results_summary);

    // Paso 2: Verificar respuestas en survey_responses
    console.log('\n📋 Paso 2: Verificar respuestas en survey_responses');
    const { data: responses, error: respError } = await supabase
      .from('survey_responses')
      .select('*')
      .eq('run_id', runId);

    if (respError) {
      console.error(`   ❌ Error: ${respError.message}`);
    } else {
      console.log(`   ✅ Respuestas encontradas: ${responses?.length || 0}`);
      if (responses && responses.length > 0) {
        console.log(`   - Primera respuesta:`, {
          agent_id: responses[0].agent_id,
          question_id: responses[0].question_id,
          value: responses[0].value
        });
      }
    }

    // Paso 3: Verificar resultados en survey_results
    console.log('\n📋 Paso 3: Verificar resultados en survey_results');
    const { data: results, error: resultsError } = await supabase
      .from('survey_results')
      .select('*')
      .eq('run_id', runId)
      .single();

    if (resultsError) {
      console.error(`   ❌ Error: ${resultsError.message}`);
    } else if (!results) {
      console.error('   ❌ No se encontraron resultados para este run');
    } else {
      console.log(`   ✅ Resultados encontrados:`);
      console.log(`      - Total Questions: ${results.summary?.totalQuestions}`);
      console.log(`      - Total Responses: ${results.summary?.totalResponses}`);
      console.log(`      - Unique Agents: ${results.summary?.uniqueAgents}`);
      console.log(`      - Número de resultados: ${results.results?.length}`);
    }

    // Paso 4: Simular el flujo de getSurveyAnalysisByRun
    console.log('\n📋 Paso 4: Simular flujo de getSurveyAnalysisByRun');

    // 4.1: Obtener run (como lo hace getSurveyRun)
    console.log('   4.1: Obtener run desde DB...');
    // Nota: fromDbSurveyRun NO incluye respuestas
    const runWithoutResponses = {
      id: run.id,
      surveyId: run.survey_id,
      startedAt: run.started_at || run.created_at,
      completedAt: run.completed_at || run.created_at,
      totalAgents: run.sample_size_actual,
      responses: [], // <-- SIEMPRE vacío cuando viene de DB
      metadata: {
        segmentMatched: run.agents_matched,
        sampleSizeRequested: run.sample_size_requested,
        sampleSizeActual: run.sample_size_actual,
        resultsSummary: run.results_summary,
      },
    };
    console.log(`      - Run obtenido, responses: ${runWithoutResponses.responses.length}`);

    // 4.2: Intentar cargar respuestas (como lo hace getSurveyAnalysisByRun)
    console.log('   4.2: Intentar cargar respuestas desde DB...');
    const { data: dbResponses } = await supabase
      .from('survey_responses')
      .select('*')
      .eq('run_id', runId);

    if (dbResponses && dbResponses.length > 0) {
      const mappedResponses: AgentResponse[] = dbResponses.map(r => ({
        agentId: r.agent_id,
        questionId: r.question_id,
        value: r.value as string | number | string[] | null,
        confidence: r.confidence,
        reasoning: r.reasoning,
      }));
      runWithoutResponses.responses = mappedResponses;
      console.log(`      ✅ Respuestas cargadas: ${mappedResponses.length}`);
    } else {
      console.log(`      ⚠️ No se encontraron respuestas en DB`);
    }

    // 4.3: Verificar si se puede generar análisis
    console.log('   4.3: Verificar si se puede generar análisis...');
    if (!results) {
      console.log('      ❌ No hay resultados - análisis imposible');
    } else if (runWithoutResponses.responses.length === 0) {
      console.log('      ⚠️ No hay respuestas - análisis sin confidence');
    } else {
      console.log('      ✅ Datos completos - análisis posible');
    }

    // Paso 5: Verificar RLS policies
    console.log('\n📋 Paso 5: Verificar RLS policies (usando service role)');
    console.log('   ℹ️ Este script usa SERVICE_ROLE_KEY, por lo que ignora RLS');
    console.log('   ℹ️ La UI usa anon_key, que está sujeto a RLS');

    // Verificar si hay algún problema de permisos
    const { error: permError } = await supabase
      .from('survey_responses')
      .select('id', { count: 'exact', head: true })
      .eq('run_id', runId);

    if (permError) {
      console.log(`   ⚠️ Error de permisos posible: ${permError.message}`);
    } else {
      console.log('   ✅ Acceso a survey_responses OK (con service role)');
    }

    console.log('\n=====================================');
    console.log('💡 Diagnóstico completado');

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

debugAnalysisLoading();
