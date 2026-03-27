/**
 * Script standalone de comparación de benchmarks CADEM
 * No requiere imports del src - todo está autocontenido
 */

import * as fs from 'fs';
import * as path from 'path';

// ============================================================================
// TYPES
// ============================================================================

interface BenchmarkData {
  metadata: {
    source: string;
    period: string;
    total_sample: number;
    margin_of_error?: number;
    confidence_level?: number;
    fieldwork_start?: string;
    fieldwork_end?: string;
  };
  consolidated: {
    questions: Record<string, {
      questionLabel: string;
      distributionType: string;
      expectedCalibrationTarget: string;
      weighted_average: Record<string, number>;
      trend?: string;
      trend_note?: string;
    }>;
  };
}

interface SyntheticResult {
  questionId: string;
  distribution: Record<string, number>;
}

interface QuestionComparison {
  questionId: string;
  questionText: string;
  labels: Record<string, string>;
  calibrationTarget: string;
  benchmarkDistribution: Record<string, number>;
  syntheticDistribution: Record<string, number>;
  differences: Record<string, number>;
  mae: number;
  maxDeviation: number;
  isCalibrated: boolean;
}

interface BenchmarkComparison {
  metadata: {
    benchmarkSource: string;
    benchmarkPeriod: string;
    totalSample: number;
    syntheticSample: number;
    comparisonDate: string;
  };
  questions: QuestionComparison[];
  overallMAE: number;
  summary: {
    totalQuestions: number;
    calibratedQuestions: number;
    lowDivergence: number;
    mediumDivergence: number;
    highDivergence: number;
  };
}

interface CademAdapterAgent {
  agentId: string;
  age: number;
  sex: string;
  educationLevel: string;
  incomeDecile: number;
  regionCode: string;
  agentType: string;
  connectivityLevel: string;
  povertyStatus: string;
  digitalExposure: string;
  preferredChannel: string;
}

interface CademSurveyQuestion {
  id: string;
  text: string;
  type: string;
  options: string[];
  periodicity: string;
}

interface CademSurveyDefinition {
  id: string;
  title: string;
  topic: string;
  questions: CademSurveyQuestion[];
}

interface SurveyResponse {
  agentId: string;
  questionId: string;
  response: string;
  confidence: number;
  timestamp: string;
}

interface SurveyResult {
  surveyId: string;
  responses: SurveyResponse[];
  totalResponses: number;
  duration: number;
}

// ============================================================================
// BENCHMARK COMPARATOR (Inline)
// ============================================================================

function loadBenchmark(filePath: string): BenchmarkData {
  const fullPath = path.resolve(filePath);
  const content = fs.readFileSync(fullPath, 'utf-8');
  return JSON.parse(content) as BenchmarkData;
}

function calculateMAE(differences: Record<string, number>): number {
  const values = Object.values(differences);
  if (values.length === 0) return 0;
  return values.reduce((sum, val) => sum + Math.abs(val), 0) / values.length;
}

function calculateMaxDeviation(differences: Record<string, number>): number {
  const values = Object.values(differences);
  if (values.length === 0) return 0;
  return Math.max(...values.map(Math.abs));
}

// Mapeo de opciones individuales a categorías agrupadas del benchmark
const OPTION_GROUPING: Record<string, Record<string, string[]>> = {
  q_optimism: {
    optimistic_total: ['optimistic', 'very_optimistic'],
    pessimistic_total: ['pessimistic', 'very_pessimistic'],
  },
  q_economy_national: {
    positive_total: ['positive', 'very_good', 'good'],
    negative_total: ['negative', 'very_bad', 'bad'],
  },
  q_economy_personal: {
    positive_total: ['positive', 'very_good', 'good'],
    negative_total: ['negative', 'very_bad', 'bad'],
  },
};

function groupSyntheticDistribution(
  questionId: string,
  syntheticDistribution: Record<string, number>
): Record<string, number> {
  const grouping = OPTION_GROUPING[questionId];
  if (!grouping) {
    // Sin agrupación definida, retornar distribución original
    return { ...syntheticDistribution };
  }

  const grouped: Record<string, number> = {};

  // Inicializar grupos en 0
  for (const groupKey of Object.keys(grouping)) {
    grouped[groupKey] = 0;
  }

  // Sumar opciones individuales a sus grupos
  for (const [option, value] of Object.entries(syntheticDistribution)) {
    let assigned = false;
    for (const [groupKey, individualOptions] of Object.entries(grouping)) {
      if (individualOptions.includes(option)) {
        grouped[groupKey] = (grouped[groupKey] ?? 0) + value;
        assigned = true;
        break;
      }
    }
    // Si no se asignó a ningún grupo (ej: no_response), mantenerlo
    if (!assigned) {
      grouped[option] = value;
    }
  }

  return grouped;
}

function compareSyntheticVsBenchmark(
  syntheticResults: SyntheticResult[],
  benchmark: BenchmarkData
): BenchmarkComparison {
  const comparisons: QuestionComparison[] = [];

  // Iterar sobre las preguntas en consolidated.questions
  for (const [questionId, benchmarkQuestion] of Object.entries(benchmark.consolidated.questions)) {
    const syntheticResult = syntheticResults.find(
      r => r.questionId === questionId
    );

    if (!syntheticResult) {
      console.warn(`⚠️  Pregunta no encontrada en resultados sintéticos: ${questionId}`);
      continue;
    }

    // Agrupar distribución sintética según el tipo de pregunta
    const groupedSyntheticDistribution = groupSyntheticDistribution(
      questionId,
      syntheticResult.distribution
    );

    // Para q_direction con completeness=partial, ignorar no_response en el cálculo de error
    const isPartial = benchmarkQuestion.distributionType === 'partial_distribution';

    // Calcular diferencias por opción
    const differences: Record<string, number> = {};
    const allOptions = new Set([
      ...Object.keys(benchmarkQuestion.weighted_average),
      ...Object.keys(groupedSyntheticDistribution),
    ]);

    for (const option of allOptions) {
      const benchmarkValue = benchmarkQuestion.weighted_average[option] ?? 0;
      const syntheticValue = groupedSyntheticDistribution[option] ?? 0;
      differences[option] = syntheticValue - benchmarkValue;
    }

    // Calcular MAE y maxDeviation solo con opciones relevantes
    const relevantDifferences: Record<string, number> = {};
    for (const [option, diff] of Object.entries(differences)) {
      // Para partial_distribution, ignorar no_response en el cálculo de error principal
      if (isPartial && option === 'no_response') {
        continue;
      }
      relevantDifferences[option] = diff;
    }

    const mae = calculateMAE(relevantDifferences);
    const maxDeviation = calculateMaxDeviation(relevantDifferences);

    // Crear labels a partir de las claves del weighted_average
    const labels: Record<string, string> = {};
    for (const key of Object.keys(benchmarkQuestion.weighted_average)) {
      labels[key] = key.replace(/_/g, ' ');
    }

    comparisons.push({
      questionId,
      questionText: benchmarkQuestion.questionLabel,
      labels,
      calibrationTarget: benchmarkQuestion.expectedCalibrationTarget,
      benchmarkDistribution: benchmarkQuestion.weighted_average,
      syntheticDistribution: groupedSyntheticDistribution,
      differences,
      mae,
      maxDeviation,
      isCalibrated: maxDeviation <= 5, // Umbral de 5pp
    });
  }

  const overallMAE = comparisons.length > 0
    ? comparisons.reduce((sum, q) => sum + q.mae, 0) / comparisons.length
    : 0;

  return {
    metadata: {
      benchmarkSource: benchmark.metadata.source,
      benchmarkPeriod: benchmark.metadata.period,
      totalSample: benchmark.metadata.total_sample,
      syntheticSample: syntheticResults.length > 0 ? 300 : 0, // Aproximado
      comparisonDate: new Date().toISOString(),
    },
    questions: comparisons,
    overallMAE,
    summary: {
      totalQuestions: comparisons.length,
      calibratedQuestions: comparisons.filter(q => q.isCalibrated).length,
      lowDivergence: comparisons.filter(q => q.maxDeviation <= 5).length,
      mediumDivergence: comparisons.filter(q => q.maxDeviation > 5 && q.maxDeviation <= 10).length,
      highDivergence: comparisons.filter(q => q.maxDeviation > 10).length,
    },
  };
}

function printBenchmarkComparison(comparison: BenchmarkComparison): void {
  console.log('\n' + '='.repeat(80));
  console.log('BENCHMARK COMPARISON REPORT');
  console.log('='.repeat(80));
  console.log(`Benchmark: ${comparison.metadata.benchmarkSource}`);
  console.log(`Período: ${comparison.metadata.benchmarkPeriod}`);
  console.log(`Muestra Benchmark: ${comparison.metadata.totalSample}`);
  console.log(`Muestra Sintética: ${comparison.metadata.syntheticSample}`);
  console.log(`Fecha Comparación: ${comparison.metadata.comparisonDate}`);
  console.log('-'.repeat(80));

  for (const q of comparison.questions) {
    console.log(`\n[${q.questionId}] ${q.questionText}`);
    console.log(`Target: ${q.calibrationTarget}`);
    console.log(`MAE: ${q.mae.toFixed(2)}pp | Max Dev: ${q.maxDeviation.toFixed(2)}pp | ${q.isCalibrated ? '✅' : '❌'}`);
    console.log('-'.repeat(60));

    // Encontrar todas las opciones únicas
    const allOptions = new Set([
      ...Object.keys(q.benchmarkDistribution),
      ...Object.keys(q.syntheticDistribution),
    ]);

    console.log(`${'Opción'.padEnd(25)} ${'Benchmark'.padStart(10)} ${'Sintético'.padStart(10)} ${'Diferencia'.padStart(10)}`);
    console.log('-'.repeat(60));

    for (const option of allOptions) {
      const label = q.labels[option] ?? option;
      const benchmark = q.benchmarkDistribution[option] ?? 0;
      const synthetic = q.syntheticDistribution[option] ?? 0;
      const diff = q.differences[option] ?? 0;
      const diffStr = diff > 0 ? `+${diff.toFixed(1)}` : diff.toFixed(1);
      const diffIndicator = Math.abs(diff) <= 5 ? '✓' : Math.abs(diff) <= 10 ? '~' : '✗';

      console.log(
        `${label.padEnd(25)} ${benchmark.toFixed(1).padStart(10)} ${synthetic.toFixed(1).padStart(10)} ${diffStr.padStart(8)}pp ${diffIndicator}`
      );
    }
  }

  console.log('\n' + '='.repeat(80));
  console.log('SUMMARY');
  console.log('='.repeat(80));
  console.log(`MAE General: ${comparison.overallMAE.toFixed(2)} pp`);
  console.log(`Preguntas Calibradas: ${comparison.summary.calibratedQuestions}/${comparison.summary.totalQuestions}`);
  console.log(`Divergencia Baja (≤5pp): ${comparison.summary.lowDivergence}`);
  console.log(`Divergencia Media (5-10pp): ${comparison.summary.mediumDivergence}`);
  console.log(`Divergencia Alta (>10pp): ${comparison.summary.highDivergence}`);
  console.log('='.repeat(80));
}

function exportComparisonToJson(comparison: BenchmarkComparison, filePath: string): void {
  const fullPath = path.resolve(filePath);
  fs.writeFileSync(fullPath, JSON.stringify(comparison, null, 2), 'utf-8');
}

// ============================================================================
// SURVEY RUNNER (Simplified Inline)
// ============================================================================

function generateSyntheticAgents(count: number): CademAdapterAgent[] {
  const agents: CademAdapterAgent[] = [];

  const regions = [
    { code: 'CL-RM', weight: 0.40 },
    { code: 'CL-VS', weight: 0.12 },
    { code: 'CL-BI', weight: 0.12 },
    { code: 'CL-MA', weight: 0.10 },
    { code: 'CL-AR', weight: 0.08 },
    { code: 'CL-LR', weight: 0.06 },
    { code: 'CL-LL', weight: 0.05 },
    { code: 'CL-CO', weight: 0.04 },
    { code: 'CL-TA', weight: 0.03 },
  ];

  const sexes = ['male', 'female'];
  const educationLevels = ['primary', 'secondary', 'technical', 'university'];
  const agentTypes = ['employed', 'student', 'retired', 'unemployed'];
  const connectivityLevels = ['low', 'medium', 'high'];

  for (let i = 0; i < count; i++) {
    const random = Math.random();
    let cumulativeWeight = 0;
    let selectedRegion = regions[0].code;
    for (const region of regions) {
      cumulativeWeight += region.weight;
      if (random <= cumulativeWeight) {
        selectedRegion = region.code;
        break;
      }
    }

    const age = Math.floor(18 + Math.random() * 62);
    const sex = sexes[Math.floor(Math.random() * sexes.length)];
    const educationLevel = educationLevels[Math.floor(Math.random() * educationLevels.length)];
    const incomeDecile = Math.floor(1 + Math.random() * 10);
    const agentType = agentTypes[Math.floor(Math.random() * agentTypes.length)];
    const connectivityLevel = connectivityLevels[Math.floor(Math.random() * connectivityLevels.length)];

    agents.push({
      agentId: `agent_${i.toString().padStart(4, '0')}`,
      age,
      sex,
      educationLevel,
      incomeDecile,
      regionCode: selectedRegion,
      agentType,
      connectivityLevel,
      povertyStatus: incomeDecile <= 3 ? 'poor' : incomeDecile <= 6 ? 'vulnerable' : 'middle_class',
      digitalExposure: connectivityLevel === 'high' ? 'high' : connectivityLevel === 'medium' ? 'medium' : 'low',
      preferredChannel: connectivityLevel === 'high' ? 'mobile_app' : connectivityLevel === 'medium' ? 'web' : 'phone',
    });
  }

  return agents;
}

// Importar el motor real de opinionEngine
import { buildInitialTopicStates } from '../../src/app/opinionEngine/topicStateSeed';
import { resolveQuestionByFamily } from '../../src/app/opinionEngine/questionResolver';
import { interpretQuestion } from '../../src/app/opinionEngine/questionInterpreter';

function generateResponse(agent: CademAdapterAgent, question: CademSurveyQuestion): string {
  // Usar el motor real de opinionEngine
  const topicStates = buildInitialTopicStates({
    age: agent.age,
    sex: agent.sex,
    educationLevel: agent.educationLevel,
    incomeDecile: agent.incomeDecile,
    regionCode: agent.regionCode,
    agentType: agent.agentType,
    connectivityLevel: agent.connectivityLevel,
    povertyStatus: agent.povertyStatus,
    digitalExposure: agent.digitalExposure,
    preferredChannel: agent.preferredChannel,
  });

    // Interpretar la pregunta
    const interpretedQuestion = interpretQuestion({
      id: question.id,
      text: question.text,
      type: question.type,
      options: question.options,
      periodicity: question.periodicity as 'permanent' | 'monthly' | 'lower_frequency' | 'ad_hoc',
    });

  if (!interpretedQuestion) {
    return 'no_response';
  }

  // Resolver usando el motor real
  const result = resolveQuestionByFamily(interpretedQuestion, topicStates);
  return result.value;
}

async function runSurvey(params: {
  surveyDefinition: CademSurveyDefinition;
  agents: CademAdapterAgent[];
  engineMode: string;
  persistState: boolean;
  debug: boolean;
}): Promise<SurveyResult> {
  const responses: SurveyResponse[] = [];
  const startTime = Date.now();

  for (const agent of params.agents) {
    for (const question of params.surveyDefinition.questions) {
      const response = generateResponse(agent, question);
      responses.push({
        agentId: agent.agentId,
        questionId: question.id,
        response,
        confidence: 0.7 + Math.random() * 0.3,
        timestamp: new Date().toISOString(),
      });
    }
  }

  return {
    surveyId: params.surveyDefinition.id,
    responses,
    totalResponses: responses.length,
    duration: Date.now() - startTime,
  };
}

function aggregateSurveyResponses(responses: SurveyResponse[]): {
  questionResults: Array<{
    questionId: string;
    distribution: Record<string, number>;
    distributionPct: Record<string, number>;
  }>;
} {
  const questionMap = new Map<string, Map<string, number>>();

  for (const response of responses) {
    if (!questionMap.has(response.questionId)) {
      questionMap.set(response.questionId, new Map());
    }
    const optionMap = questionMap.get(response.questionId)!;
    optionMap.set(response.response, (optionMap.get(response.response) ?? 0) + 1);
  }

  const questionResults = Array.from(questionMap.entries()).map(([questionId, optionMap]) => {
    const total = Array.from(optionMap.values()).reduce((sum, count) => sum + count, 0);
    const distribution: Record<string, number> = {};
    const distributionPct: Record<string, number> = {};

    for (const [option, count] of optionMap.entries()) {
      distribution[option] = count;
      distributionPct[option] = parseFloat(((count / total) * 100).toFixed(1));
    }

    return { questionId, distribution, distributionPct };
  });

  return { questionResults };
}

// ============================================================================
// CONFIGURACIÓN
// ============================================================================

const CONFIG = {
  AGENT_COUNT: 1000,  // Aumentado de 300 a 1000 para reducir ruido muestral
  BENCHMARK_PATH: 'data/benchmarks/cadem/normalized/cadem_marzo_2026_master.json',
  OUTPUT_PATH: 'data/benchmarks/cadem/comparison_results.json',
  ENGINE_MODE: 'cadem' as const,
};

const SURVEY_DEFINITION: CademSurveyDefinition = {
  id: 'cadem_calibration_survey_001',
  title: 'Encuesta de Calibración CADEM - Marzo 2026',
  topic: 'opinion_publica',
  questions: [
    {
      id: 'q_approval',
      text: '¿Aprueba o desaprueba la forma como el gobierno está conduciendo el país?',
      type: 'single_choice',
      options: ['approve', 'disapprove', 'no_response'],
      periodicity: 'permanent',
    },
    {
      id: 'q_direction',
      text: '¿Cree usted que el país va por buen camino o mal camino?',
      type: 'single_choice',
      options: ['good_path', 'bad_path', 'no_response'],
      periodicity: 'permanent',
    },
    {
      id: 'q_optimism',
      text: '¿Cómo cree que estará el futuro del país?',
      type: 'single_choice',
      options: ['very_optimistic', 'optimistic', 'pessimistic', 'very_pessimistic', 'no_response'],
      periodicity: 'permanent',
    },
    {
      id: 'q_economy_national',
      text: '¿Cómo evalúa la situación económica actual del país?',
      type: 'single_choice',
      options: ['very_good', 'good', 'bad', 'very_bad', 'no_response'],
      periodicity: 'permanent',
    },
    {
      id: 'q_economy_personal',
      text: '¿Cómo evalúa su situación económica personal actual?',
      type: 'single_choice',
      options: ['very_good', 'good', 'bad', 'very_bad', 'no_response'],
      periodicity: 'permanent',
    },
  ],
};

// ============================================================================
// FUNCIÓN PRINCIPAL
// ============================================================================

async function main(): Promise<void> {
  console.log('\n' + '='.repeat(80));
  console.log('CADEM BENCHMARK COMPARISON (STANDALONE)');
  console.log('='.repeat(80));
  console.log(`Agentes: ${CONFIG.AGENT_COUNT}`);
  console.log(`Engine Mode: ${CONFIG.ENGINE_MODE}`);
  console.log(`Benchmark: ${CONFIG.BENCHMARK_PATH}`);
  console.log('-'.repeat(80));

  try {
    // 1. Cargar benchmark
    console.log('\n📥 Cargando benchmark...');
    const benchmark = loadBenchmark(CONFIG.BENCHMARK_PATH);
    console.log(`   ✓ Benchmark cargado: ${benchmark.metadata.source}`);
    console.log(`   ✓ Período: ${benchmark.metadata.period}`);
    console.log(`   ✓ Muestra total: ${benchmark.metadata.total_sample}`);

    // 2. Generar agentes sintéticos
    console.log('\n👥 Generando agentes sintéticos...');
    const agents = generateSyntheticAgents(CONFIG.AGENT_COUNT);
    console.log(`   ✓ ${agents.length} agentes generados`);

    // Mostrar distribución demográfica
    const regionCounts: Record<string, number> = {};
    for (const agent of agents) {
      const region = agent.regionCode ?? 'unknown';
      regionCounts[region] = (regionCounts[region] ?? 0) + 1;
    }
    console.log('   Distribución por región:');
    for (const [region, count] of Object.entries(regionCounts).sort((a, b) => b[1] - a[1])) {
      const pct = ((count / agents.length) * 100).toFixed(1);
      console.log(`      ${region}: ${count} (${pct}%)`);
    }

    // 3. Ejecutar encuesta
    console.log('\n📝 Ejecutando encuesta...');
    const startTime = Date.now();

    const surveyResult = await runSurvey({
      surveyDefinition: SURVEY_DEFINITION,
      agents,
      engineMode: CONFIG.ENGINE_MODE,
      persistState: false,
      debug: false,
    });

    const duration = Date.now() - startTime;
    console.log(`   ✓ Encuesta completada en ${duration}ms`);
    console.log(`   ✓ Respuestas generadas: ${surveyResult.totalResponses}`);

    // 4. Agregar resultados
    console.log('\n📊 Agregando resultados...');
    const aggregated = aggregateSurveyResponses(surveyResult.responses);
    console.log(`   ✓ ${aggregated.questionResults.length} preguntas agregadas`);

    // Mostrar distribuciones sintéticas
    console.log('\n   Distribuciones sintéticas:');
    for (const q of aggregated.questionResults) {
      console.log(`   [${q.questionId}]`);
      for (const [option, pct] of Object.entries(q.distributionPct)) {
        const bar = '█'.repeat(Math.round(pct / 5));
        console.log(`      ${option.padEnd(20)} ${bar} ${pct}%`);
      }
    }

    // 5. Preparar resultados sintéticos para comparación
    const syntheticResults: SyntheticResult[] = aggregated.questionResults.map(q => ({
      questionId: q.questionId,
      distribution: q.distributionPct,
    }));

    // 6. Comparar contra benchmark
    console.log('\n🔍 Comparando contra benchmark...');
    const comparison = compareSyntheticVsBenchmark(syntheticResults, benchmark);

    // 7. Imprimir reporte
    printBenchmarkComparison(comparison);

    // 8. Exportar resultados
    const outputPath = path.resolve(CONFIG.OUTPUT_PATH);
    exportComparisonToJson(comparison, outputPath);

    console.log('\n✅ Comparación completada exitosamente');
    console.log(`   Resultados exportados a: ${outputPath}`);

    // Resumen final
    console.log('\n📈 RESUMEN DE CALIBRACIÓN');
    console.log('-'.repeat(80));
    console.log(`MAE General: ${comparison.overallMAE.toFixed(2)} pp`);
    console.log(`Divergencia Baja (≤5pp): ${comparison.summary.lowDivergence} preguntas`);
    console.log(`Divergencia Media (5-10pp): ${comparison.summary.mediumDivergence} preguntas`);
    console.log(`Divergencia Alta (>10pp): ${comparison.summary.highDivergence} preguntas`);

    if (comparison.summary.highDivergence === 0 && comparison.summary.mediumDivergence === 0) {
      console.log('\n✅ Motor calibrado correctamente - todas las preguntas dentro de umbral aceptable');
    } else if (comparison.summary.highDivergence === 0) {
      console.log('\n⚠️  Calibración aceptable - algunas preguntas requieren ajuste menor');
    } else {
      console.log('\n❌ Calibración requerida - preguntas con alta divergencia detectadas');
    }

    console.log('\n' + '='.repeat(80));

  } catch (error) {
    console.error('\n❌ Error en la comparación:');
    console.error(error);
    process.exit(1);
  }
}

// ============================================================================
// EJECUCIÓN
// ============================================================================

main();
