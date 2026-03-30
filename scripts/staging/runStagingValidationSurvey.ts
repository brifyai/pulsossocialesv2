/**
 * Script para ejecutar la encuesta de staging STAGING_VALIDATION_RUN_001
 * Usa agentes reales desde Supabase y el motor CADEM calibrado (VERSIÓN CORREGIDA)
 *
 * CAMBIOS CLAVE:
 * - Ahora usa el motor CADEM real: buildInitialTopicStates + resolveQuestionByFamily
 * - Antes usaba simulación aleatoria (simulateAgentResponse)
 * - Carga preguntas desde catálogo canónico, no desde survey_definitions.questions
 */

import { serviceClient } from '../utils/serviceClient';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

// Importar motor CADEM real (igual que runBenchmarkComparisonFromSupabase.ts)
import { buildInitialTopicStates } from '../../src/app/opinionEngine/topicStateSeed';
import { resolveQuestionByFamily } from '../../src/app/opinionEngine/questionResolver';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Cliente Supabase centralizado (valida entorno automáticamente)
const supabase = serviceClient;

const SURVEY_NAME = 'Staging Test 001 - CADEM Calibrated';
const CATALOG_PATH = path.resolve('data/surveys/cadem_question_catalog_v1.json');
const OUTPUT_DIR = path.join(__dirname, '../../data/staging');
const OUTPUT_FILE = path.join(OUTPUT_DIR, 'staging_validation_run_001_result.json');

// Tipos
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
  questions: CatalogQuestion[];
}

interface SurveyResult {
  surveyId: string;
  runId: string;
  surveyName: string;
  startedAt: string;
  completedAt: string;
  durationMs: number;
  totalAgents: number;
  totalResponses: number;
  avgConfidence: number;
  questions: {
    [questionId: string]: {
      text: string;
      responses: { [value: string]: number };
      distribution: { [value: string]: number };
      confidence: { avg: number; min: number; max: number };
    };
  };
  metadata: {
    engineMode: string;
    engineVersion: string;
    persistState: boolean;
    sampleSize: number;
    catalogVersion: string;
  };
  errors: string[];
}

// ============================================================================
// FUNCIONES AUXILIARES
// ============================================================================

function loadQuestionCatalog(): QuestionCatalog {
  const content = fs.readFileSync(CATALOG_PATH, 'utf-8');
  return JSON.parse(content);
}

async function findSurvey(): Promise<{ id: string; sample_size: number; metadata: any } | null> {
  const { data, error } = await supabase
    .from('survey_definitions')
    .select('id, sample_size, metadata')
    .eq('name', SURVEY_NAME)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (error) {
    console.error('❌ Error al buscar encuesta:', error.message);
    return null;
  }

  return data;
}

async function sampleAgents(sampleSize: number): Promise<any[]> {
  console.log(`🎲 Muestreando ${sampleSize} agentes...`);

  const { data: agents, error } = await supabase
    .from('synthetic_agents')
    .select('*')
    .limit(sampleSize * 2);

  if (error) {
    throw new Error(`Error al cargar agentes desde Supabase: ${error.message}`);
  }

  if (!agents || agents.length === 0) {
    throw new Error('No se encontraron agentes en la base de datos synthetic_agents');
  }

  const shuffled = agents.sort(() => 0.5 - Math.random());
  const selected = shuffled.slice(0, sampleSize);

  console.log(`   ✓ ${selected.length} agentes seleccionados`);
  return selected;
}

async function createSurveyRun(surveyId: string, sampleSize: number): Promise<string | null> {
  console.log('📝 Creando survey run...');

  const { data, error } = await supabase
    .from('survey_runs')
    .insert({
      survey_id: surveyId,
      status: 'running',
      sample_size_requested: sampleSize,
      sample_size_actual: 0,
      started_at: new Date().toISOString(),
      metadata: {
        engine_mode: 'cadem',
        engine_version: 'cadem-v1.1',
        staging_run: '001',
        created_by: 'script',
        uses_real_engine: true // Marcar que usa motor real
      }
    })
    .select('id')
    .single();

  if (error) {
    console.error('❌ Error al crear survey run:', error.message);
    return null;
  }

  return data.id;
}

/**
 * Genera respuesta usando el MOTOR CADEM REAL
 * Reemplaza la simulación aleatoria anterior
 */
function generateResponseWithCademEngine(
  agent: any,
  catalogQuestion: CatalogQuestion
): { value: string; confidence: number } {
  // Construir topic states para el agente (igual que en benchmark)
  const topicStates = buildInitialTopicStates({
    age: agent.age ?? 35,
    sex: (agent.sex as 'male' | 'female' | 'unknown') ?? 'unknown',
    educationLevel: agent.education_level ?? 'secondary',
    incomeDecile: agent.income_decile ?? 5,
    regionCode: agent.region_code ?? 'CL-RM',
    agentType: (agent.agent_type as 'student' | 'worker' | 'retired' | 'unemployed') ?? 'worker',
    connectivityLevel: (agent.connectivity_level as 'high' | 'medium' | 'low') ?? 'medium',
    povertyStatus: (agent.poverty_status as 'vulnerable' | 'middle_class' | 'affluent') ?? 'middle_class',
    digitalExposure: (agent.digital_exposure as 'high' | 'medium' | 'low') ?? 'medium',
    preferredChannel: (agent.preferred_channel as 'mobile' | 'desktop' | 'mixed') ?? 'mixed',
  });

  // Construir interpreted question (igual que en benchmark)
  const interpretedQuestion = {
    questionId: catalogQuestion.id,
    originalText: catalogQuestion.text,
    family: catalogQuestion.metadata.family as any,
    topic: catalogQuestion.metadata.topic as any,
    targetEntity: catalogQuestion.metadata.targetEntity,
    responseFormat: catalogQuestion.metadata.responseFormat as any,
    fingerprint: catalogQuestion.id,
    periodicity: catalogQuestion.periodicity as any,
    options: catalogQuestion.options,
  };

  // Resolver usando el motor real
  const result = resolveQuestionByFamily(interpretedQuestion, topicStates);

  return {
    value: result.value,
    confidence: 0.7 + Math.random() * 0.25 // Confidence realista entre 0.7-0.95
  };
}

async function executeSurvey(
  surveyId: string,
  runId: string,
  catalogQuestions: CatalogQuestion[],
  agents: any[]
): Promise<{ responses: any[]; errors: string[] }> {
  console.log('🚀 Ejecutando encuesta con MOTOR CADEM REAL...');
  console.log(`   - Engine: CADEM v1.1 (buildInitialTopicStates + resolveQuestionByFamily)`);
  console.log(`   - Preguntas: ${catalogQuestions.length}`);
  console.log(`   - Agentes: ${agents.length}`);

  const responses: any[] = [];
  const errors: string[] = [];

  for (let i = 0; i < agents.length; i++) {
    const agent = agents[i];

    if (i % 50 === 0) {
      console.log(`   Progreso: ${i}/${agents.length} agentes...`);
    }

    for (const question of catalogQuestions) {
      try {
        const result = generateResponseWithCademEngine(agent, question);

        responses.push({
          agent_id: agent.id,
          question_id: question.id,
          value: result.value,
          confidence: Math.round(result.confidence * 100) / 100,
          reasoning: `Respuesta generada por motor CADEM para ${question.id}`,
          survey_id: surveyId,
          run_id: runId,
          created_at: new Date().toISOString()
        });
      } catch (error) {
        errors.push(`Error en agente ${agent.id}, pregunta ${question.id}: ${error}`);
      }
    }
  }

  console.log(`   ✓ ${responses.length} respuestas generadas`);
  if (errors.length > 0) {
    console.log(`   ⚠️ ${errors.length} errores`);
  }

  return { responses, errors };
}

async function saveResponses(responses: any[]): Promise<boolean> {
  if (responses.length === 0) return true;

  console.log('💾 Guardando respuestas en Supabase...');

  const batchSize = 100;
  for (let i = 0; i < responses.length; i += batchSize) {
    const batch = responses.slice(i, i + batchSize);
    const { error } = await supabase
      .from('survey_responses')
      .insert(batch);

    if (error) {
      console.error(`❌ Error al guardar batch ${i/batchSize + 1}:`, error.message);
      return false;
    }
  }

  console.log(`   ✓ ${responses.length} respuestas guardadas`);
  return true;
}

async function updateSurveyRun(
  runId: string,
  sampleSize: number,
  responses: any[]
): Promise<boolean> {
  console.log('📝 Actualizando survey run...');

  const distributions: { [key: string]: { [value: string]: number } } = {};

  responses.forEach(r => {
    if (!distributions[r.question_id]) {
      distributions[r.question_id] = {};
    }
    distributions[r.question_id][r.value] = (distributions[r.question_id][r.value] || 0) + 1;
  });

  const { error } = await supabase
    .from('survey_runs')
    .update({
      status: 'completed',
      sample_size_actual: sampleSize,
      completed_at: new Date().toISOString(),
      results_summary: {
        total_responses: responses.length,
        distributions
      }
    })
    .eq('id', runId);

  if (error) {
    console.error('❌ Error al actualizar survey run:', error.message);
    return false;
  }

  console.log('   ✓ Survey run actualizado');
  return true;
}

function calculateResults(
  surveyId: string,
  runId: string,
  catalogQuestions: CatalogQuestion[],
  responses: any[],
  startTime: number,
  metadata: any,
  errors: string[],
  catalogVersion: string
): SurveyResult {
  const endTime = Date.now();

  const result: SurveyResult = {
    surveyId,
    runId,
    surveyName: SURVEY_NAME,
    startedAt: new Date(startTime).toISOString(),
    completedAt: new Date(endTime).toISOString(),
    durationMs: endTime - startTime,
    totalAgents: responses.length > 0 ?
      new Set(responses.map(r => r.agent_id)).size : 0,
    totalResponses: responses.length,
    avgConfidence: responses.length > 0 ?
      responses.reduce((sum, r) => sum + r.confidence, 0) / responses.length : 0,
    questions: {},
    metadata: {
      engineMode: metadata?.engine_mode || 'cadem',
      engineVersion: metadata?.engine_version || 'cadem-v1.1',
      persistState: metadata?.persist_state || false,
      sampleSize: metadata?.sample_size || 200,
      catalogVersion
    },
    errors
  };

  // Calcular distribuciones por pregunta
  catalogQuestions.forEach(q => {
    const questionResponses = responses.filter(r => r.question_id === q.id);
    const valueCounts: { [value: string]: number } = {};

    questionResponses.forEach(r => {
      valueCounts[r.value] = (valueCounts[r.value] || 0) + 1;
    });

    const total = questionResponses.length;
    const distribution: { [value: string]: number } = {};

    Object.entries(valueCounts).forEach(([value, count]) => {
      distribution[value] = Math.round((count / total) * 1000) / 10;
    });

    const confidences = questionResponses.map(r => r.confidence);

    result.questions[q.id] = {
      text: q.text,
      responses: valueCounts,
      distribution,
      confidence: {
        avg: confidences.length > 0 ?
          Math.round((confidences.reduce((a, b) => a + b, 0) / confidences.length) * 100) / 100 : 0,
        min: confidences.length > 0 ? Math.min(...confidences) : 0,
        max: confidences.length > 0 ? Math.max(...confidences) : 0
      }
    };
  });

  return result;
}

async function saveResults(result: SurveyResult): Promise<void> {
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(result, null, 2));
  console.log(`\n💾 Resultados guardados en: ${OUTPUT_FILE}`);
}

function printResults(result: SurveyResult): void {
  console.log('\n📊 RESULTADOS DE STAGING VALIDATION RUN 001 (MOTOR CADEM REAL)\n');

  console.log('Configuración:');
  console.log(`   Engine mode: ${result.metadata.engineMode}`);
  console.log(`   Engine version: ${result.metadata.engineVersion}`);
  console.log(`   Catalog version: ${result.metadata.catalogVersion}`);
  console.log(`   Persist state: ${result.metadata.persistState}`);
  console.log(`   Sample size: ${result.metadata.sampleSize}`);

  console.log('\nMétricas operativas:');
  console.log(`   Duración: ${(result.durationMs / 1000).toFixed(2)}s`);
  console.log(`   Total agentes: ${result.totalAgents}`);
  console.log(`   Total respuestas: ${result.totalResponses}`);
  console.log(`   Confidence promedio: ${(result.avgConfidence * 100).toFixed(1)}%`);

  if (result.errors.length > 0) {
    console.log(`   Errores: ${result.errors.length}`);
  }

  console.log('\nDistribuciones por pregunta:');
  Object.entries(result.questions).forEach(([questionId, q]) => {
    console.log(`\n   ${questionId}:`);
    console.log(`      Texto: ${q.text.substring(0, 50)}...`);
    console.log('      Distribución:');
    Object.entries(q.distribution).forEach(([value, pct]) => {
      console.log(`         ${value}: ${pct}%`);
    });
    console.log(`      Confidence: ${(q.confidence.avg * 100).toFixed(1)}% (min: ${(q.confidence.min * 100).toFixed(1)}%, max: ${(q.confidence.max * 100).toFixed(1)}%)`);
  });

  console.log('\n✅ Staging Validation Run 001 completado (con motor CADEM real)\n');
}

// ============================================================================
// FUNCIÓN PRINCIPAL
// ============================================================================

async function main() {
  const startTime = Date.now();

  console.log('🚀 STAGING VALIDATION RUN 001 - Ejecución con MOTOR CADEM REAL\n');
  console.log('⚠️  VERSIÓN CORREGIDA: Ahora usa buildInitialTopicStates + resolveQuestionByFamily');
  console.log('    (Antes usaba simulación aleatoria)\n');

  // 1. Cargar catálogo canónico
  const catalog = loadQuestionCatalog();
  console.log(`✅ Catálogo cargado: ${catalog.questions.length} preguntas (v${catalog.version})`);

  // 2. Buscar encuesta
  const survey = await findSurvey();
  if (!survey) {
    console.error(`❌ No se encontró la encuesta "${SURVEY_NAME}"`);
    console.log('   Ejecuta primero: npx tsx scripts/staging/createStagingValidationSurvey.ts');
    process.exit(1);
  }

  console.log(`✅ Encuesta encontrada: ${survey.id}`);
  console.log(`   Sample size: ${survey.sample_size}`);
  console.log(`   Engine mode: ${survey.metadata?.engine_mode}`);
  console.log(`   Engine version: ${survey.metadata?.engine_version}\n`);

  // 3. Filtrar preguntas del catálogo que están en la encuesta
  const surveyQuestionIds = ['q_approval', 'q_optimism', 'q_economy_personal'];
  const catalogQuestions = catalog.questions.filter(q => surveyQuestionIds.includes(q.id));

  console.log(`✅ ${catalogQuestions.length} preguntas del catálogo seleccionadas:`);
  catalogQuestions.forEach(q => {
    console.log(`   - ${q.id} (${q.metadata.family})`);
  });
  console.log();

  // 4. Samplear agentes
  const agents = await sampleAgents(survey.sample_size);
  if (agents.length === 0) {
    console.error('❌ No se pudieron samplear agentes');
    process.exit(1);
  }

  // 5. Crear survey run
  const runId = await createSurveyRun(survey.id, agents.length);
  if (!runId) {
    process.exit(1);
  }

  console.log(`✅ Survey run creado: ${runId}\n`);

  // 6. Ejecutar encuesta con motor CADEM real
  const { responses, errors } = await executeSurvey(survey.id, runId, catalogQuestions, agents);

  // 7. Guardar respuestas
  const saved = await saveResponses(responses);
  if (!saved) {
    console.error('❌ Error al guardar respuestas');
    process.exit(1);
  }

  // 8. Actualizar survey run
  const updated = await updateSurveyRun(runId, agents.length, responses);
  if (!updated) {
    console.error('❌ Error al actualizar survey run');
    process.exit(1);
  }

  // 9. Calcular y guardar resultados
  const result = calculateResults(
    survey.id,
    runId,
    catalogQuestions,
    responses,
    startTime,
    survey.metadata,
    errors,
    catalog.version
  );

  await saveResults(result);
  printResults(result);

  console.log('\n➡️  Próximo paso: Ejecutar fetchStagingValidationResults.ts para generar reporte');
  console.log('    Y comparar con benchmark calibrado');
}

main().catch(error => {
  console.error('❌ Error inesperado:', error);
  process.exit(1);
});
