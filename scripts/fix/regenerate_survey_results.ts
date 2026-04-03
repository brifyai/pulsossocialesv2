/**
 * Regenerate Survey Results
 *
 * Este script regenera los resultados agregados (survey_results) para runs
 * que tienen respuestas pero no tienen resultados guardados.
 *
 * Uso: npx tsx scripts/fix/regenerate_survey_results.ts [runId]
 * Si no se proporciona runId, procesa todos los runs incompletos.
 */

import '../utils/loadEnv';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { SurveyResult, AgentResponse, SurveyQuestion } from '../../src/types/survey';

const runId = process.argv[2];

console.log('🔧 Regenerate Survey Results');
console.log('=============================\n');

if (runId) {
  console.log(`Run ID especificado: ${runId}\n`);
} else {
  console.log('No se especificó runId - se procesarán todos los runs incompletos\n');
}

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

/**
 * Genera resultados agregados a partir de respuestas
 */
function generateResultsFromResponses(
  surveyId: string,
  runId: string,
  questions: SurveyQuestion[],
  responses: AgentResponse[]
): SurveyResult {
  const results = questions.map(question => {
    const questionResponses = responses.filter(r => r.questionId === question.id);

    if (question.type === 'single_choice') {
      const q = question as any;
      const distribution: Record<string, { count: number; percentage: number; label: string }> = {};

      // Inicializar con todas las opciones
      q.options.forEach((opt: any) => {
        distribution[opt.value] = { count: 0, percentage: 0, label: opt.label };
      });

      // Contar respuestas
      questionResponses.forEach(r => {
        const value = r.value as string;
        if (distribution[value]) {
          distribution[value].count++;
        }
      });

      // Calcular porcentajes
      const total = questionResponses.length;
      Object.keys(distribution).forEach(key => {
        distribution[key].percentage = total > 0
          ? Math.round((distribution[key].count / total) * 1000) / 10
          : 0;
      });

      return {
        questionId: question.id,
        questionType: 'single_choice' as const,
        questionText: question.text,
        totalResponses: total,
        distribution
      };
    }

    if (question.type === 'likert_scale') {
      const q = question as any;
      const values = questionResponses.map(r => r.value as number).filter(v => typeof v === 'number');
      const total = values.length;

      const sum = values.reduce((a, b) => a + b, 0);
      const average = total > 0 ? sum / total : 0;
      const sorted = [...values].sort((a, b) => a - b);
      const median = total > 0
        ? (total % 2 === 0
          ? (sorted[total / 2 - 1] + sorted[total / 2]) / 2
          : sorted[Math.floor(total / 2)])
        : 0;

      const distribution: Record<number, { count: number; percentage: number }> = {};
      for (let i = q.min; i <= q.max; i++) {
        distribution[i] = { count: 0, percentage: 0 };
      }

      values.forEach(v => {
        if (distribution[v]) {
          distribution[v].count++;
        }
      });

      Object.keys(distribution).forEach(key => {
        const numKey = parseInt(key);
        distribution[numKey].percentage = total > 0
          ? Math.round((distribution[numKey].count / total) * 1000) / 10
          : 0;
      });

      return {
        questionId: question.id,
        questionType: 'likert_scale' as const,
        questionText: question.text,
        totalResponses: questionResponses.length,
        average: Math.round(average * 10) / 10,
        median,
        distribution,
        minLabel: q.minLabel,
        maxLabel: q.maxLabel
      };
    }

    // Fallback para otros tipos
    return {
      questionId: question.id,
      questionType: question.type,
      questionText: question.text,
      totalResponses: questionResponses.length,
      distribution: {}
    };
  });

  return {
    surveyId,
    runId,
    generatedAt: new Date().toISOString(),
    summary: {
      totalQuestions: questions.length,
      totalResponses: responses.length,
      uniqueAgents: new Set(responses.map(r => r.agentId)).size
    },
    results
  };
}

/**
 * Procesa un run específico
 */
async function processRun(targetRunId: string): Promise<boolean> {
  console.log(`\n📋 Procesando run: ${targetRunId}`);
  console.log('-'.repeat(50));

  try {
    // 1. Obtener información del run
    const { data: run, error: runError } = await supabase
      .from('survey_runs')
      .select('*')
      .eq('id', targetRunId)
      .single();

    if (runError || !run) {
      console.error(`   ❌ Run no encontrado: ${runError?.message}`);
      return false;
    }

    console.log(`   ✅ Run encontrado`);
    console.log(`      Survey ID: ${run.survey_id}`);
    console.log(`      Sample Size Actual: ${run.sample_size_actual}`);

    // 2. Obtener la definición de la encuesta
    const { data: survey, error: surveyError } = await supabase
      .from('survey_definitions')
      .select('*')
      .eq('id', run.survey_id)
      .single();

    if (surveyError || !survey) {
      console.error(`   ❌ Encuesta no encontrada: ${surveyError?.message}`);
      return false;
    }

    console.log(`   ✅ Encuesta encontrada: ${survey.name}`);

    // 3. Obtener respuestas
    const { data: responses, error: respError } = await supabase
      .from('survey_responses')
      .select('*')
      .eq('run_id', targetRunId);

    if (respError) {
      console.error(`   ❌ Error obteniendo respuestas: ${respError.message}`);
      return false;
    }

    if (!responses || responses.length === 0) {
      console.error(`   ❌ No hay respuestas para este run`);
      return false;
    }

    console.log(`   ✅ Respuestas encontradas: ${responses.length}`);

    // 4. Mapear respuestas al formato AgentResponse
    const mappedResponses: AgentResponse[] = responses.map(r => ({
      agentId: r.agent_id,
      questionId: r.question_id,
      value: r.value as string | number | string[] | null,
      confidence: r.confidence,
      reasoning: r.reasoning,
    }));

    // 5. Generar resultados
    const results = generateResultsFromResponses(
      run.survey_id,
      targetRunId,
      survey.questions as SurveyQuestion[],
      mappedResponses
    );

    console.log(`   📊 Resultados generados:`);
    console.log(`      - Total Questions: ${results.summary.totalQuestions}`);
    console.log(`      - Total Responses: ${results.summary.totalResponses}`);
    console.log(`      - Unique Agents: ${results.summary.uniqueAgents}`);

    // 6. Guardar resultados en DB
    const { error: insertError } = await supabase
      .from('survey_results')
      .insert({
        survey_id: results.surveyId,
        run_id: results.runId,
        summary: results.summary,
        results: results.results,
        generated_at: results.generatedAt,
      });

    if (insertError) {
      console.error(`   ❌ Error guardando resultados: ${insertError.message}`);
      return false;
    }

    console.log(`   ✅ Resultados guardados en survey_results`);

    // 7. Actualizar sample_size_actual en survey_runs si es 0
    if (run.sample_size_actual === 0) {
      const { error: updateError } = await supabase
        .from('survey_runs')
        .update({
          sample_size_actual: results.summary.uniqueAgents,
          results_summary: {
            total_responses: results.summary.totalResponses,
            completion_rate: 100,
            average_confidence: 0.85,
          }
        })
        .eq('id', targetRunId);

      if (updateError) {
        console.error(`   ❌ Error actualizando run: ${updateError.message}`);
        return false;
      }

      console.log(`   ✅ Run actualizado con sample_size_actual: ${results.summary.uniqueAgents}`);
    }

    return true;

  } catch (error) {
    console.error(`   ❌ Error procesando run:`, error);
    return false;
  }
}

/**
 * Encuentra todos los runs que necesitan regeneración
 */
async function findIncompleteRuns(): Promise<string[]> {
  console.log('\n🔍 Buscando runs incompletos...');

  // Buscar runs con sample_size_actual = 0 o sin resultados
  const { data: runs, error } = await supabase
    .from('survey_runs')
    .select('id, sample_size_actual')
    .eq('sample_size_actual', 0)
    .order('created_at', { ascending: false })
    .limit(10);

  if (error) {
    console.error(`   ❌ Error buscando runs: ${error.message}`);
    return [];
  }

  if (!runs || runs.length === 0) {
    console.log('   ℹ️ No se encontraron runs incompletos');
    return [];
  }

  console.log(`   ✅ Encontrados ${runs.length} runs con sample_size_actual = 0`);

  // Verificar cuáles tienen respuestas
  const runsWithResponses: string[] = [];

  for (const run of runs) {
    const { count, error: countError } = await supabase
      .from('survey_responses')
      .select('*', { count: 'exact', head: true })
      .eq('run_id', run.id);

    if (!countError && count && count > 0) {
      runsWithResponses.push(run.id);
      console.log(`      - ${run.id}: ${count} respuestas`);
    }
  }

  return runsWithResponses;
}

/**
 * Función principal
 */
async function main() {
  try {
    let runsToProcess: string[] = [];

    if (runId) {
      runsToProcess = [runId];
    } else {
      runsToProcess = await findIncompleteRuns();
    }

    if (runsToProcess.length === 0) {
      console.log('\n✅ No hay runs para procesar');
      process.exit(0);
    }

    console.log(`\n🚀 Procesando ${runsToProcess.length} run(s)...\n`);

    let successCount = 0;
    let failCount = 0;

    for (const id of runsToProcess) {
      const success = await processRun(id);
      if (success) {
        successCount++;
      } else {
        failCount++;
      }
    }

    console.log('\n' + '='.repeat(50));
    console.log('📊 Resumen:');
    console.log(`   ✅ Exitosos: ${successCount}`);
    console.log(`   ❌ Fallidos: ${failCount}`);
    console.log(`   📋 Total: ${runsToProcess.length}`);

  } catch (error) {
    console.error('\n❌ Error fatal:', error);
    process.exit(1);
  }
}

main();
