/**
 * Script de prueba para ejecutar encuestas con escenarios hipotéticos
 * Versión validación MVP - 5 preguntas CADEM estándar
 *
 * Uso:
 *   npx ts-node scripts/test/runScenarioSurvey.ts --scenario-id <uuid> --agents 100
 *
 * Este script permite:
 * 1. Ejecutar una encuesta baseline (sin escenario)
 * 2. Ejecutar la misma encuesta con un escenario hipotético
 * 3. Comparar los resultados con deltas
 */

import { runSurvey } from '../../src/app/survey/surveyRunner.ts';
import { getScenarioById } from '../../src/app/events/scenarioEventStore.ts';
import { getAgents } from '../../src/services/supabase/repositories/agentRepository.ts';
import type { CademSurveyDefinition } from '../../src/app/survey/cademAdapter.ts';
import type { SyntheticAgent } from '../../src/types/agent.ts';
import type { UnifiedSurveyResponse } from '../../src/app/survey/unifiedResponseEngine.ts';

interface RunOptions {
  scenarioId?: string;
  agentCount: number;
  debug: boolean;
  useEvents: boolean;
  weekKey: string;
  compareBaseline: boolean;
}

interface QuestionResult {
  questionId: string;
  questionText: string;
  distribution: Map<string, number>;
  totalResponses: number;
}

interface ComparisonResult {
  baseline: QuestionResult;
  scenario: QuestionResult;
  deltas: Map<string, number>; // percentage point differences
}

function parseArgs(): RunOptions {
  const args = process.argv.slice(2);
  const options: RunOptions = {
    agentCount: 50,
    debug: true,
    useEvents: false,
    weekKey: '2026-W12',
    compareBaseline: true,
  };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--scenario-id':
        options.scenarioId = args[++i];
        break;
      case '--agents':
        options.agentCount = parseInt(args[++i], 10);
        break;
      case '--week-key':
        options.weekKey = args[++i];
        break;
      case '--use-events':
        options.useEvents = true;
        break;
      case '--no-debug':
        options.debug = false;
        break;
      case '--no-compare':
        options.compareBaseline = false;
        break;
      case '--help':
        console.log(`
Uso: npx ts-node scripts/test/runScenarioSurvey.ts [opciones]

Opciones:
  --scenario-id <uuid>   ID del escenario hipotético a aplicar
  --agents <n>           Número de agentes (default: 50)
  --week-key <key>       Semana para eventos (default: 2026-W12)
  --use-events           Habilitar eventos reales
  --no-debug             Desactivar modo debug
  --no-compare           No comparar con baseline
  --help                 Mostrar esta ayuda

Ejemplos:
  # Ejecutar baseline (sin escenario)
  npx ts-node scripts/test/runScenarioSurvey.ts

  # Ejecutar con escenario y comparar
  npx ts-node scripts/test/runScenarioSurvey.ts --scenario-id abc-123 --agents 100
        `);
        process.exit(0);
        break;
    }
  }

  return options;
}

// ============================================================================
// DEFINICIÓN DE ENCUESTA CADEM ESTÁNDAR (5 PREGUNTAS)
// ============================================================================

const CADEM_SURVEY_DEFINITION: CademSurveyDefinition = {
  id: `cadem-validation-${Date.now()}`,
  topic: 'cadem_standard',
  questions: [
    {
      id: 'q_approval',
      text: '¿Aprueba o desaprueba la forma como el gobierno está conduciendo el país?',
      type: 'single_choice',
      options: ['Aprueba', 'Desaprueba', 'No sabe/No responde'],
    },
    {
      id: 'q_direction',
      text: '¿Cree Ud. que el país va por el camino correcto o por el camino equivocado?',
      type: 'single_choice',
      options: ['Camino correcto', 'Camino equivocado', 'No sabe/No responde'],
    },
    {
      id: 'q_optimism',
      text: '¿Cree Ud. que dentro de un año el país estará mejor, igual o peor que ahora?',
      type: 'single_choice',
      options: ['Mejor', 'Igual', 'Peor', 'No sabe/No responde'],
    },
    {
      id: 'q_economy_national',
      text: '¿Cómo cree Ud. que estará la situación económica del país dentro de un año?',
      type: 'single_choice',
      options: ['Mejorará', 'Será la misma', 'Empeorará', 'No sabe/No responde'],
    },
    {
      id: 'q_economy_personal',
      text: '¿Cómo cree Ud. que estará la situación económica de su hogar dentro de un año?',
      type: 'single_choice',
      options: ['Mejorará', 'Será la misma', 'Empeorará', 'No sabe/No responde'],
    },
  ],
};

// ============================================================================
// FUNCIONES AUXILIARES
// ============================================================================

function analyzeQuestionResponses(
  questionId: string,
  questionText: string,
  responses: UnifiedSurveyResponse[]
): QuestionResult {
  const questionResponses = responses.filter(r => r.questionId === questionId);
  const distribution = new Map<string, number>();

  for (const response of questionResponses) {
    const value = response.value !== null && response.value !== undefined
      ? String(response.value)
      : 'no_response';
    distribution.set(value, (distribution.get(value) || 0) + 1);
  }

  return {
    questionId,
    questionText,
    distribution,
    totalResponses: questionResponses.length,
  };
}

function calculateDeltas(
  baseline: QuestionResult,
  scenario: QuestionResult
): Map<string, number> {
  const deltas = new Map<string, number>();

  // Get all unique values from both distributions
  const allValues = new Set([
    ...Array.from(baseline.distribution.keys()),
    ...Array.from(scenario.distribution.keys()),
  ]);

  for (const value of allValues) {
    const baselineCount = baseline.distribution.get(value) || 0;
    const scenarioCount = scenario.distribution.get(value) || 0;

    const baselinePct = baseline.totalResponses > 0
      ? (baselineCount / baseline.totalResponses) * 100
      : 0;
    const scenarioPct = scenario.totalResponses > 0
      ? (scenarioCount / scenario.totalResponses) * 100
      : 0;

    deltas.set(value, scenarioPct - baselinePct);
  }

  return deltas;
}

function printDistribution(result: QuestionResult, indent: string = '   '): void {
  const sorted = Array.from(result.distribution.entries())
    .sort((a, b) => b[1] - a[1]);

  for (const [value, count] of sorted) {
    const pct = result.totalResponses > 0
      ? ((count / result.totalResponses) * 100).toFixed(1)
      : '0.0';
    console.log(`${indent}${String(value).padEnd(20)}: ${count.toString().padStart(3)} (${pct.padStart(5)}%)`);
  }
}

function printComparison(comparison: ComparisonResult): void {
  console.log(`   ${comparison.baseline.questionText.substring(0, 50)}...`);
  console.log();

  // Get all unique values
  const allValues = new Set([
    ...Array.from(comparison.baseline.distribution.keys()),
    ...Array.from(comparison.scenario.distribution.keys()),
  ]);

  // Sort by baseline frequency
  const sortedValues = Array.from(allValues).sort((a, b) => {
    const countA = comparison.baseline.distribution.get(a) || 0;
    const countB = comparison.baseline.distribution.get(b) || 0;
    return countB - countA;
  });

  console.log('   ' + 'Respuesta'.padEnd(20) + 'Baseline'.padStart(12) + 'Escenario'.padStart(12) + 'Delta'.padStart(12));
  console.log('   ' + '-'.repeat(56));

  for (const value of sortedValues) {
    const baselineCount = comparison.baseline.distribution.get(value) || 0;
    const scenarioCount = comparison.scenario.distribution.get(value) || 0;
    const delta = comparison.deltas.get(value) || 0;

    const baselinePct = comparison.baseline.totalResponses > 0
      ? (baselineCount / comparison.baseline.totalResponses) * 100
      : 0;
    const scenarioPct = comparison.scenario.totalResponses > 0
      ? (scenarioCount / comparison.scenario.totalResponses) * 100
      : 0;

    const deltaStr = delta >= 0 ? `+${delta.toFixed(1)}` : delta.toFixed(1);
    const deltaEmoji = delta > 5 ? '📈' : delta < -5 ? '📉' : '➡️';

    console.log(
      '   ' +
      String(value).padEnd(20) +
      `${baselinePct.toFixed(1)}%`.padStart(11) +
      `${scenarioPct.toFixed(1)}%`.padStart(11) +
      `${deltaStr}% ${deltaEmoji}`.padStart(12)
    );
  }

  console.log();
}

// ============================================================================
// FUNCIÓN PRINCIPAL
// ============================================================================

async function runSingleSurvey(
  options: RunOptions,
  surveyDef: CademSurveyDefinition,
  agents: any[],
  scenarioId?: string,
  label: string = 'Survey'
): Promise<{ responses: UnifiedSurveyResponse[]; duration: number }> {
  console.log(`🚀 Ejecutando ${label}...`);
  console.log(`   Modo: cadem`);
  console.log(`   Persistencia: desactivada`);
  console.log(`   Eventos: ${options.useEvents ? 'activados' : 'desactivados'}`);
  console.log(`   Escenario: ${scenarioId || 'ninguno'}`);
  console.log();

  const startTime = Date.now();

  const result = await runSurvey({
    surveyDefinition: surveyDef,
    agents,
    engineMode: 'cadem',
    persistState: false,
    weekKey: options.weekKey,
    debug: options.debug,
    useEvents: options.useEvents,
    scenarioEventId: scenarioId,
  });

  const duration = Date.now() - startTime;

  console.log(`✅ ${label} completado en ${duration}ms`);
  console.log(`   Respuestas: ${result.totalResponses}`);
  console.log();

  return { responses: result.responses, duration };
}

async function main() {
  const options = parseArgs();

  console.log('========================================');
  console.log('  Scenario Survey Runner - Validation');
  console.log('  5 Preguntas CADEM Estándar');
  console.log('========================================');
  console.log();

  // Verificar escenario si se proporciona
  let scenarioName = 'Baseline';
  if (options.scenarioId) {
    console.log(`🔍 Verificando escenario: ${options.scenarioId}`);
    const scenarioResult = await getScenarioById(options.scenarioId);

    if (!scenarioResult.success || !scenarioResult.data) {
      console.error(`❌ Error: No se pudo cargar el escenario: ${scenarioResult.error}`);
      process.exit(1);
    }

    const scenario = scenarioResult.data;
    scenarioName = scenario.name;
    console.log('✅ Escenario encontrado:');
    console.log(`   Nombre: ${scenario.name}`);
    console.log(`   Categoría: ${scenario.category}`);
    console.log(`   Severidad: ${scenario.severity}`);
    console.log(`   Sentimiento: ${scenario.sentiment}`);
    console.log(`   Intensidad: ${scenario.intensity}`);
    console.log();
  } else {
    console.log('📊 Modo: Baseline (sin escenario)');
    console.log();
  }

  // Cargar agentes
  console.log(`🤖 Cargando ${options.agentCount} agentes...`);
  const agentsResult = await getAgents({ page: 1, pageSize: options.agentCount });

  if (!agentsResult.data || agentsResult.data.length === 0) {
    console.error('❌ Error: No se encontraron agentes en la base de datos');
    process.exit(1);
  }

  // Mapear agentes al formato del survey runner
  const agents = agentsResult.data
    .slice(0, options.agentCount)
    .map((agent: SyntheticAgent) => ({
      agentId: agent.agent_id,
      age: agent.age ?? 35,
      sex: agent.sex ?? 'unknown',
      educationLevel: agent.education_level ?? 'secondary',
      incomeDecile: agent.income_decile ?? 5,
      povertyStatus: agent.poverty_status ?? 'middle_class',
      regionCode: agent.region_code ?? 'CL-RM',
      connectivityLevel: agent.connectivity_level ?? 'medium',
      agentType: agent.agent_type ?? 'general',
    }));

  console.log(`✅ ${agents.length} agentes cargados`);
  console.log();

  // Mostrar definición de encuesta
  console.log('📋 Encuesta CADEM Estándar:');
  console.log(`   ID: ${CADEM_SURVEY_DEFINITION.id}`);
  console.log(`   Preguntas: ${CADEM_SURVEY_DEFINITION.questions.length}`);
  CADEM_SURVEY_DEFINITION.questions.forEach((q, i) => {
    console.log(`   ${i + 1}. ${q.id}: ${q.text.substring(0, 50)}...`);
  });
  console.log();

  // ============================================================================
  // EJECUCIÓN BASELINE (si hay escenario y se quiere comparar)
  // ============================================================================

  let baselineResponses: UnifiedSurveyResponse[] = [];
  let scenarioResponses: UnifiedSurveyResponse[] = [];
  let baselineDuration = 0;
  let scenarioDuration = 0;

  if (options.scenarioId && options.compareBaseline) {
    console.log('========================================');
    console.log('  FASE 1: BASELINE (sin escenario)');
    console.log('========================================');
    console.log();

    const baselineResult = await runSingleSurvey(
      options,
      CADEM_SURVEY_DEFINITION,
      agents,
      undefined,
      'Baseline'
    );

    baselineResponses = baselineResult.responses;
    baselineDuration = baselineResult.duration;
  }

  // ============================================================================
  // EJECUCIÓN CON ESCENARIO
  // ============================================================================

  if (options.scenarioId) {
    console.log('========================================');
    console.log(`  FASE 2: ESCENARIO - ${scenarioName.toUpperCase()}`);
    console.log('========================================');
    console.log();
  }

  const scenarioResult = await runSingleSurvey(
    options,
    CADEM_SURVEY_DEFINITION,
    agents,
    options.scenarioId,
    options.scenarioId ? 'Escenario' : 'Baseline'
  );

  scenarioResponses = scenarioResult.responses;
  scenarioDuration = scenarioResult.duration;

  // ============================================================================
  // ANÁLISIS Y COMPARACIÓN
  // ============================================================================

  console.log('========================================');
  console.log('  RESULTADOS');
  console.log('========================================');
  console.log();

  // Analizar cada pregunta
  const comparisons: ComparisonResult[] = [];

  for (const question of CADEM_SURVEY_DEFINITION.questions) {
    const scenarioAnalysis = analyzeQuestionResponses(
      question.id,
      question.text,
      scenarioResponses
    );

    if (options.scenarioId && options.compareBaseline && baselineResponses.length > 0) {
      // Modo comparación
      const baselineAnalysis = analyzeQuestionResponses(
        question.id,
        question.text,
        baselineResponses
      );

      const deltas = calculateDeltas(baselineAnalysis, scenarioAnalysis);

      comparisons.push({
        baseline: baselineAnalysis,
        scenario: scenarioAnalysis,
        deltas,
      });
    } else {
      // Modo solo escenario o solo baseline
      console.log(`📊 ${question.id}: ${question.text.substring(0, 50)}...`);
      printDistribution(scenarioAnalysis);
      console.log();
    }
  }

  // Imprimir comparaciones si hay
  if (comparisons.length > 0) {
    console.log('========================================');
    console.log('  COMPARACIÓN BASELINE vs ESCENARIO');
    console.log('========================================');
    console.log();

    for (const comparison of comparisons) {
      printComparison(comparison);
    }

    // Resumen de impacto
    console.log('========================================');
    console.log('  RESUMEN DE IMPACTO DEL ESCENARIO');
    console.log('========================================');
    console.log();

    for (const comparison of comparisons) {
      const questionId = comparison.baseline.questionId;

      // Encontrar el cambio más significativo
      let maxDelta = 0;
      let maxDeltaValue = '';

      for (const [value, delta] of comparison.deltas.entries()) {
        if (Math.abs(delta) > Math.abs(maxDelta)) {
          maxDelta = delta;
          maxDeltaValue = value;
        }
      }

      const direction = maxDelta > 0 ? '↑' : maxDelta < 0 ? '↓' : '→';
      const impact = Math.abs(maxDelta) > 10 ? 'ALTO' :
                     Math.abs(maxDelta) > 5 ? 'MEDIO' : 'BAJO';

      console.log(`   ${questionId}:`);
      console.log(`      Mayor cambio: ${maxDeltaValue} ${direction} ${Math.abs(maxDelta).toFixed(1)}pp`);
      console.log(`      Impacto: ${impact}`);
      console.log();
    }

    // Métricas de rendimiento
    console.log('========================================');
    console.log('  MÉTRICAS DE RENDIMIENTO');
    console.log('========================================');
    console.log();
    console.log(`   Duración baseline:  ${baselineDuration}ms`);
    console.log(`   Duración escenario: ${scenarioDuration}ms`);
    console.log(`   Overhead:           ${scenarioDuration - baselineDuration}ms`);
    console.log();
  }

  // Estadísticas de confianza
  const confidences = scenarioResponses
    .map(r => r.confidence)
    .filter((c): c is number => c !== undefined);

  if (confidences.length > 0) {
    const avgConfidence = confidences.reduce((a, b) => a + b, 0) / confidences.length;
    console.log(`🎯 Confianza promedio: ${avgConfidence.toFixed(2)}`);
    console.log();
  }

  console.log('✅ Ejecución completada');
}

main().catch(error => {
  console.error('❌ Error:', error);
  process.exit(1);
});
