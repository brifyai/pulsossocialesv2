/**
 * Script de benchmark CADEM usando agentes reales de Supabase
 * Refactorizado para usar catálogo canónico de preguntas y motor CADEM real
 * VERSIÓN STANDALONE - No depende de surveyRunner.ts
 *
 * Solo lectura - no modifica datos de agentes ni benchmarks
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// Importar directamente el motor CADEM (estos no usan import.meta.env)
import { buildInitialTopicStates } from '../../src/app/opinionEngine/topicStateSeed';
import { resolveQuestionByFamily } from '../../src/app/opinionEngine/questionResolver';

// Configuración desde variables de entorno
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || '';

// Configuración del benchmark
const SAMPLE_SIZE = parseInt(process.env.SAMPLE_SIZE || '1000', 10);

// ============================================================================
// TIPOS
// ============================================================================

interface AgentFromDB {
  id: string;
  agent_id?: string;
  age?: number;
  sex?: string;
  region_code?: string;
  comuna_code?: string;
  education_level?: string;
  income_decile?: number;
  connectivity_level?: string;
  digital_exposure?: string;
  preferred_channel?: string;
  agent_type?: string;
  poverty_status?: string;
  occupation_status?: string;
  urbanicity?: string;
}

interface CademAdapterAgent {
  agentId: string;
  age: number;
  sex: 'male' | 'female' | 'unknown';
  regionCode: string;
  comunaCode: string;
  educationLevel: string;
  incomeDecile: number;
  connectivityLevel: 'high' | 'medium' | 'low';
  digitalExposure: 'high' | 'medium' | 'low';
  preferredChannel: 'mobile' | 'desktop' | 'mixed';
  agentType: 'student' | 'worker' | 'retired' | 'unemployed';
  povertyStatus: 'vulnerable' | 'middle_class' | 'affluent';
  occupationStatus: 'employed' | 'unemployed' | 'student' | 'retired';
  urbanicity: 'urban' | 'suburban' | 'rural';
}

interface CademSurveyQuestion {
  id: string;
  text: string;
  type: 'single_choice' | 'likert_scale' | 'open_text';
  options: string[];
  periodicity: 'permanent' | 'monthly' | 'lower_frequency' | 'ad_hoc';
}

interface CademSurveyDefinition {
  id: string;
  title: string;
  topic: string;
  questions: CademSurveyQuestion[];
}

interface BenchmarkQuestion {
  id: string;
  text: string;
  responses: Array<{
    value: string;
    percentage: number;
    count: number;
  }>;
}

interface BenchmarkWave {
  wave_id: number;
  date: string;
  day: string;
  sample_size: number;
  questions: Record<string, {
    completeness: string;
    note?: string;
    values: Record<string, number>;
  }>;
}

interface BenchmarkData {
  metadata: {
    source: string;
    period: string;
    waves_count: number;
    total_sample: number;
    created_at: string;
    version: string;
  };
  waves: BenchmarkWave[];
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

interface SurveyResultAggregated {
  questionId: string;
  responses: Record<string, number>;
  total: number;
}

interface ComparisonResult {
  questionId: string;
  questionText: string;
  benchmark: Array<{ value: string; percentage: number }>;
  simulation: Array<{ value: string; percentage: number }>;
  differences: Array<{ value: string; diff: number }>;
  mae: number;
  maxDiff: number;
}

// Catálogo canónico de preguntas CADEM
interface CatalogQuestion {
  id: string;
  text: string;
  type: string;
  options: string[];
  periodicity: string;
  metadata: {
    family: string;
    topic: string;
    targetEntity?: string;
    responseFormat: string;
  };
}

interface QuestionCatalog {
  version: string;
  description: string;
  questions: CatalogQuestion[];
}

// ============================================================================
// FUNCIONES
// ============================================================================

/**
 * Carga el catálogo canónico de preguntas CADEM
 */
function loadQuestionCatalog(): QuestionCatalog {
  const catalogPath = path.resolve('data/surveys/cadem_question_catalog_v1.json');

  if (!fs.existsSync(catalogPath)) {
    throw new Error(`Catálogo de preguntas no encontrado: ${catalogPath}`);
  }

  const content = fs.readFileSync(catalogPath, 'utf-8');
  const catalog = JSON.parse(content) as QuestionCatalog;

  console.log(`✅ Catálogo cargado: ${catalog.questions.length} preguntas (v${catalog.version})`);
  return catalog;
}

/**
 * Construye el surveyDefinition a partir del catálogo canónico
 */
function buildSurveyDefinition(catalog: QuestionCatalog): CademSurveyDefinition {
  const surveyId = `cadem_benchmark_${new Date().toISOString().split('T')[0]}`;

  const questions = catalog.questions.map(q => ({
    id: q.id,
    text: q.text,
    type: q.type as 'single_choice' | 'likert_scale' | 'open_text',
    options: q.options,
    periodicity: q.periodicity as 'permanent' | 'monthly' | 'lower_frequency' | 'ad_hoc',
  }));

  return {
    id: surveyId,
    title: 'CADEM Benchmark',
    topic: 'cadem_benchmark',
    questions,
  };
}

/**
 * Transforma agentes de la base de datos al formato CademAdapterAgent
 */
function transformAgentsToCademFormat(agents: AgentFromDB[]): CademAdapterAgent[] {
  return agents.map(agent => ({
    agentId: agent.agent_id || agent.id,
    age: agent.age ?? 35,
    sex: (agent.sex as 'male' | 'female' | 'unknown') ?? 'unknown',
    regionCode: agent.region_code ?? 'CL-RM',
    comunaCode: agent.comuna_code ?? 'CL-RM-13101',
    educationLevel: agent.education_level ?? 'secondary',
    incomeDecile: agent.income_decile ?? 5,
    connectivityLevel: (agent.connectivity_level as 'high' | 'medium' | 'low') ?? 'medium',
    digitalExposure: (agent.digital_exposure as 'high' | 'medium' | 'low') ?? 'medium',
    preferredChannel: (agent.preferred_channel as 'mobile' | 'desktop' | 'mixed') ?? 'mixed',
    agentType: (agent.agent_type as 'student' | 'worker' | 'retired' | 'unemployed') ?? 'worker',
    povertyStatus: (agent.poverty_status as 'vulnerable' | 'middle_class' | 'affluent') ?? 'middle_class',
    occupationStatus: (agent.occupation_status as 'employed' | 'unemployed' | 'student' | 'retired') ?? 'employed',
    urbanicity: (agent.urbanicity as 'urban' | 'suburban' | 'rural') ?? 'urban',
  }));
}

async function loadAgentsFromSupabase(
  supabase: any,
  sampleSize: number
): Promise<CademAdapterAgent[]> {
  console.log(`\n📥 Cargando ${sampleSize} agentes desde Supabase...`);

  const { data, error } = await supabase
    .from('synthetic_agents')
    .select('*')
    .limit(sampleSize);

  if (error) {
    throw new Error(`Error cargando agentes: ${error.message}`);
  }

  if (!data || data.length === 0) {
    throw new Error('No se encontraron agentes en la base de datos');
  }

  const agents = transformAgentsToCademFormat(data as AgentFromDB[]);
  console.log(`✅ Cargados ${agents.length} agentes`);
  return agents;
}

function transformWavesToQuestions(data: BenchmarkData): BenchmarkQuestion[] {
  // Tomar la primera wave como referencia
  const firstWave = data.waves[0];
  if (!firstWave) {
    throw new Error('No se encontraron waves en el benchmark');
  }

  const questions: BenchmarkQuestion[] = [];

  for (const [questionId, questionData] of Object.entries(firstWave.questions)) {
    const responses: Array<{ value: string; percentage: number; count: number }> = [];

    for (const [value, percentage] of Object.entries(questionData.values)) {
      responses.push({
        value,
        percentage,
        count: Math.round((percentage / 100) * firstWave.sample_size),
      });
    }

    questions.push({
      id: questionId,
      text: '', // El benchmark no tiene el texto completo
      responses,
    });
  }

  return questions;
}

async function loadBenchmarkData(): Promise<BenchmarkQuestion[]> {
  console.log('\n📥 Cargando benchmark CADEM...');

  const benchmarkPath = path.resolve('data/benchmarks/cadem/normalized/cadem_marzo_2026_master.json');

  if (!fs.existsSync(benchmarkPath)) {
    throw new Error(`Benchmark no encontrado: ${benchmarkPath}`);
  }

  const content = fs.readFileSync(benchmarkPath, 'utf-8');
  const data = JSON.parse(content) as BenchmarkData;

  const questions = transformWavesToQuestions(data);

  console.log(`✅ Benchmark cargado: ${data.metadata.period}, ${data.waves.length} waves, ${questions.length} preguntas`);
  return questions;
}

/**
 * Genera una respuesta usando el motor CADEM real
 * Usa metadatos del catálogo canónico para evitar problemas de detección
 */
function generateResponseWithCademEngine(
  agent: CademAdapterAgent,
  question: CademSurveyQuestion,
  catalogQuestion: CatalogQuestion
): string {
  // Construir topic states para el agente
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

  // Usar metadatos del catálogo canónico directamente
  const interpretedQuestion = {
    questionId: question.id,
    originalText: question.text,
    family: catalogQuestion.metadata.family as any,
    topic: catalogQuestion.metadata.topic as any,
    targetEntity: catalogQuestion.metadata.targetEntity,
    responseFormat: catalogQuestion.metadata.responseFormat as any,
    fingerprint: question.id,
    periodicity: question.periodicity,
    options: question.options,
  };

  // Resolver usando el motor real
  const result = resolveQuestionByFamily(interpretedQuestion, topicStates);
  return result.value;
}

/**
 * Ejecuta la encuesta usando el motor CADEM real (implementación standalone)
 */
async function runCademSurveyWithEngine(
  surveyDefinition: CademSurveyDefinition,
  agents: CademAdapterAgent[],
  catalog: QuestionCatalog
): Promise<SurveyResultAggregated[]> {
  console.log('\n🎲 Ejecutando encuesta con motor CADEM...');
  console.log(`   - Engine mode: cadem`);
  console.log(`   - Agentes: ${agents.length}`);
  console.log(`   - Preguntas: ${surveyDefinition.questions.length}`);

  const startTime = Date.now();
  const responses: SurveyResponse[] = [];

  // Crear mapa de preguntas del catálogo para acceso rápido
  const catalogQuestionsMap = new Map<string, CatalogQuestion>();
  for (const q of catalog.questions) {
    catalogQuestionsMap.set(q.id, q);
  }

  // Generar respuestas para cada agente y cada pregunta
  for (const agent of agents) {
    for (const question of surveyDefinition.questions) {
      const catalogQuestion = catalogQuestionsMap.get(question.id);
      if (!catalogQuestion) {
        console.warn(`⚠️ Pregunta ${question.id} no encontrada en catálogo`);
        continue;
      }
      const response = generateResponseWithCademEngine(agent, question, catalogQuestion);
      responses.push({
        agentId: agent.agentId,
        questionId: question.id,
        response,
        confidence: 0.7 + Math.random() * 0.3,
        timestamp: new Date().toISOString(),
      });
    }
  }

  const duration = Date.now() - startTime;
  console.log(`✅ Encuesta completada en ${duration}ms`);
  console.log(`   - Respuestas generadas: ${responses.length}`);

  // Agrupar respuestas por pregunta
  const responsesByQuestion: Record<string, Record<string, number>> = {};

  for (const response of responses) {
    if (!responsesByQuestion[response.questionId]) {
      responsesByQuestion[response.questionId] = {};
    }

    const currentCount = responsesByQuestion[response.questionId][response.response] || 0;
    responsesByQuestion[response.questionId][response.response] = currentCount + 1;
  }

  // Convertir a formato SurveyResultAggregated
  const surveyResults: SurveyResultAggregated[] = [];
  for (const [questionId, responseCounts] of Object.entries(responsesByQuestion)) {
    const total = Object.values(responseCounts).reduce((sum, count) => sum + count, 0);
    surveyResults.push({
      questionId,
      responses: responseCounts,
      total,
    });
  }

  return surveyResults;
}

/**
 * Agrega valores de respuesta según el tipo de pregunta
 * El motor genera valores individuales (very_optimistic, optimistic, etc.)
 * pero el benchmark usa valores agregados (optimistic_total, pessimistic_total)
 */
function aggregateResponses(
  responses: Record<string, number>,
  family: string
): Record<string, number> {
  const aggregated: Record<string, number> = {};

  switch (family) {
    case 'optimism':
      // Agregar: optimistic_total = very_optimistic + optimistic
      //          pessimistic_total = very_pessimistic + pessimistic
      aggregated['optimistic_total'] =
        (responses['very_optimistic'] || 0) + (responses['optimistic'] || 0);
      aggregated['pessimistic_total'] =
        (responses['very_pessimistic'] || 0) + (responses['pessimistic'] || 0);
      // Preservar no_response si existe
      if (responses['no_response']) {
        aggregated['no_response'] = responses['no_response'];
      }
      break;

    case 'economic_perception':
      // Agregar: positive_total = very_good + good
      //          negative_total = very_bad + bad
      aggregated['positive_total'] =
        (responses['very_good'] || 0) + (responses['good'] || 0);
      aggregated['negative_total'] =
        (responses['very_bad'] || 0) + (responses['bad'] || 0);
      // Preservar no_response si existe
      if (responses['no_response']) {
        aggregated['no_response'] = responses['no_response'];
      }
      break;

    default:
      // Para approval y direction, usar valores directamente
      for (const [key, value] of Object.entries(responses)) {
        aggregated[key] = value;
      }
  }

  return aggregated;
}

function compareResults(
  simulationResults: SurveyResultAggregated[],
  benchmarkQuestions: BenchmarkQuestion[],
  catalog: QuestionCatalog
): ComparisonResult[] {
  console.log('\n📊 Comparando resultados...');

  const comparisons: ComparisonResult[] = [];

  for (const simResult of simulationResults) {
    const catalogQuestion = catalog.questions.find(q => q.id === simResult.questionId);
    const benchmarkQuestion = benchmarkQuestions.find(q => q.id === simResult.questionId);

    if (!catalogQuestion || !benchmarkQuestion) {
      console.warn(`⚠️ Pregunta no encontrada: ${simResult.questionId}`);
      continue;
    }

    // Agregar respuestas según la familia de la pregunta
    const aggregatedResponses = aggregateResponses(
      simResult.responses,
      catalogQuestion.metadata.family
    );

    // Convertir a porcentajes
    const simPercentages: Array<{ value: string; percentage: number }> = [];
    for (const [value, count] of Object.entries(aggregatedResponses)) {
      simPercentages.push({
        value,
        percentage: Math.round((count / simResult.total) * 1000) / 10,
      });
    }

    // Calcular diferencias
    const differences: Array<{ value: string; diff: number }> = [];
    let mae = 0;
    let maxDiff = 0;

    for (const benchResp of benchmarkQuestion.responses) {
      const simResp = simPercentages.find(s => s.value === benchResp.value);
      const simPct = simResp?.percentage || 0;
      const diff = Math.abs(benchResp.percentage - simPct);

      differences.push({
        value: benchResp.value,
        diff: Math.round(diff * 10) / 10,
      });

      mae += diff;
      maxDiff = Math.max(maxDiff, diff);
    }

    mae = Math.round((mae / benchmarkQuestion.responses.length) * 10) / 10;

    comparisons.push({
      questionId: simResult.questionId,
      questionText: catalogQuestion.text,
      benchmark: benchmarkQuestion.responses.map(r => ({ value: r.value, percentage: r.percentage })),
      simulation: simPercentages,
      differences,
      mae,
      maxDiff,
    });
  }

  return comparisons;
}

function generateReport(
  comparisons: ComparisonResult[],
  sampleSize: number,
  timestamp: string,
  catalog: QuestionCatalog
): string {
  let report = `# Benchmark Comparison desde Supabase\n\n`;
  report += `**Fecha:** ${timestamp}\n\n`;
  report += `**Muestra:** ${sampleSize.toLocaleString()} agentes reales de Supabase\n\n`;
  report += `**Motor:** CADEM v1.1 (con catálogo canónico)\n\n`;
  report += `**Catálogo:** ${catalog.version}\n\n`;
  report += `---\n\n`;

  // Resumen
  const avgMae = comparisons.reduce((sum, c) => sum + c.mae, 0) / comparisons.length;
  const maxDiff = Math.max(...comparisons.map(c => c.maxDiff));

  report += `## Resumen\n\n`;
  report += `- **MAE promedio:** ${avgMae.toFixed(1)}%\n`;
  report += `- **Máxima diferencia:** ${maxDiff.toFixed(1)}%\n`;
  report += `- **Preguntas analizadas:** ${comparisons.length}\n\n`;

  // Tabla comparativa
  report += `## Comparación por Pregunta\n\n`;
  report += `| Pregunta | MAE | Max Diff |\n`;
  report += `|----------|-----|----------|\n`;

  for (const comp of comparisons) {
    report += `| ${comp.questionId} | ${comp.mae}% | ${comp.maxDiff}% |\n`;
  }

  report += `\n`;

  // Detalle por pregunta
  report += `## Detalle por Pregunta\n\n`;

  for (const comp of comparisons) {
    report += `### ${comp.questionId}\n\n`;
    report += `**${comp.questionText}**\n\n`;
    report += `- MAE: ${comp.mae}%\n`;
    report += `- Máxima diferencia: ${comp.maxDiff}%\n\n`;

    report += `| Respuesta | Benchmark | Simulación | Diferencia |\n`;
    report += `|-----------|-----------|------------|------------|\n`;

    for (const diff of comp.differences) {
      const bench = comp.benchmark.find(b => b.value === diff.value);
      const sim = comp.simulation.find(s => s.value === diff.value);
      report += `| ${diff.value} | ${bench?.percentage ?? 0}% | ${sim?.percentage ?? 0}% | ${diff.diff}% |\n`;
    }

    report += `\n`;
  }

  return report;
}

// ============================================================================
// FUNCIÓN PRINCIPAL
// ============================================================================

async function main(): Promise<void> {
  console.log('='.repeat(80));
  console.log('BENCHMARK COMPARISON DESDE SUPABASE (CON CATÁLOGO CANÓNICO)');
  console.log('='.repeat(80));
  console.log(`Sample size: ${SAMPLE_SIZE}`);

  // Validar configuración
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error('❌ Error: Variables de entorno VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY requeridas');
    process.exit(1);
  }

  console.log(`\n🔗 Conectando a: ${SUPABASE_URL}`);

  // Crear cliente
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  // Verificar conexión
  const { error: testError } = await supabase.from('synthetic_agents').select('id', { count: 'exact', head: true });

  if (testError) {
    console.error(`❌ Error de conexión: ${testError.message}`);
    process.exit(1);
  }

  console.log('✅ Conexión exitosa\n');

  try {
    // 1. Cargar catálogo canónico de preguntas
    const catalog = loadQuestionCatalog();

    // 2. Construir surveyDefinition desde el catálogo
    const surveyDefinition = buildSurveyDefinition(catalog);

    // 3. Cargar datos
    const agents = await loadAgentsFromSupabase(supabase, SAMPLE_SIZE);
    const benchmarkData = await loadBenchmarkData();

    // 4. Ejecutar encuesta con motor CADEM real
    const simulationResults = await runCademSurveyWithEngine(surveyDefinition, agents, catalog);

    // 5. Comparar resultados
    const comparisons = compareResults(simulationResults, benchmarkData, catalog);

    // 6. Generar reporte
    console.log('\n' + '='.repeat(80));
    console.log('GENERANDO REPORTE');
    console.log('='.repeat(80));

    const timestamp = new Date().toISOString();
    const report = generateReport(comparisons, agents.length, timestamp, catalog);

    // Guardar reporte
    const outputDir = path.resolve('docs/cadem-v3');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const outputPath = path.join(outputDir, 'BENCHMARK_COMPARISON_FROM_SUPABASE.md');
    fs.writeFileSync(outputPath, report, 'utf-8');

    console.log(`\n✅ Reporte guardado en: ${outputPath}`);

    // Resumen en consola
    console.log('\n' + '='.repeat(80));
    console.log('RESULTADOS');
    console.log('='.repeat(80));

    const avgMae = comparisons.reduce((sum, c) => sum + c.mae, 0) / comparisons.length;
    console.log(`\nMAE promedio: ${avgMae.toFixed(1)}%`);
    console.log(`Máxima diferencia: ${Math.max(...comparisons.map(c => c.maxDiff)).toFixed(1)}%`);

    console.log('\nPor pregunta:');
    for (const comp of comparisons) {
      console.log(`  ${comp.questionId}: MAE=${comp.mae}%, MaxDiff=${comp.maxDiff}%`);
    }

    console.log('\n' + '='.repeat(80));
  } catch (error) {
    console.error('\n❌ Error:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

main().catch(error => {
  console.error('Error fatal:', error);
  process.exit(1);
});
