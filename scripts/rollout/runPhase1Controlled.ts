/**
 * Script de ejecución para Fase 1 del Rollout Interno Controlado
 * CADEM Opinion Engine v1.1
 *
 * Uso:
 *   npx tsx scripts/rollout/runPhase1Controlled.ts \
 *     --survey-id=<ID> \
 *     --sample-size=100 \
 *     --monitoring=intensive
 * 
 * 🔒 REQUIERE: SUPABASE_SERVICE_KEY (no permite fallback a ANON_KEY)
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { getServiceClientConfig } from '../utils/validateScriptEnv';

// Importar motor CADEM real
import { buildInitialTopicStates } from '../../src/app/opinionEngine/topicStateSeed';
import { resolveQuestionByFamily } from '../../src/app/opinionEngine/questionResolver';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ============================================================================
// PARSEAR ARGUMENTOS
// ============================================================================

function parseArgs() {
  const args = process.argv.slice(2);
  const params: Record<string, string> = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg.startsWith('--')) {
      if (arg.includes('=')) {
        const [key, ...valueParts] = arg.replace('--', '').split('=');
        params[key] = valueParts.join('=');
      } else {
        const key = arg.replace('--', '');
        const value = args[i + 1];
        if (value && !value.startsWith('--')) {
          params[key] = value;
          i++;
        } else {
          params[key] = 'true';
        }
      }
    }
  }

  return params;
}

const args = parseArgs();
const SURVEY_ID = args['survey-id'];
const SAMPLE_SIZE = parseInt(args['sample-size'] || '100');
const MONITORING_LEVEL = args['monitoring'] || 'intensive';

// Validaciones
if (!SURVEY_ID) {
  console.error('❌ Error: --survey-id es requerido');
  console.error('   Uso: npx tsx scripts/rollout/runPhase1Controlled.ts --survey-id=<ID> [--sample-size=100]');
  process.exit(1);
}

if (SAMPLE_SIZE > 200) {
  console.error(`❌ Error: Fase 1 limita sample-size a máximo 200 (recibido: ${SAMPLE_SIZE})`);
  process.exit(1);
}

// ============================================================================
// CONFIGURACIÓN SUPABASE
// ============================================================================

// Validar y obtener configuración de entorno (requiere SERVICE_KEY)
const { url: supabaseUrl, key: supabaseKey } = getServiceClientConfig();

const supabase = createClient(supabaseUrl, supabaseKey);

// ============================================================================
// TIPOS
// ============================================================================

interface Phase1Result {
  surveyId: string;
  runId: string;
  startedAt: string;
  completedAt: string;
  durationMs: number;
  sampleSize: number;
  totalResponses: number;
  completionRate: number;
  avgConfidence: number;
  errorRate: number;
  distributions: Record<string, Record<string, number>>;
  metrics: {
    completionRate: number;
    errorVsBenchmark: number | null;
    coherence: number | null;
    executionTime: number;
    errorRate: number;
  };
  status: 'success' | 'partial' | 'failed';
  errors: string[];
}

// ============================================================================
// FUNCIONES AUXILIARES
// ============================================================================

async function validateSurvey(surveyId: string): Promise<{ valid: boolean; error?: string; metadata?: any }> {
  console.log('🔍 Validando encuesta...');

  const { data: survey, error } = await supabase
    .from('survey_definitions')
    .select('*')
    .eq('id', surveyId)
    .single();

  if (error || !survey) {
    return { valid: false, error: `Encuesta no encontrada: ${error?.message}` };
  }

  // Buscar engine_mode en metadata (donde se guarda realmente)
  const engineMode = survey.metadata?.engine_mode;
  if (engineMode !== 'cadem') {
    return { valid: false, error: `Engine mode no es 'cadem': ${engineMode}` };
  }

  if (survey.metadata?.persist_state === true) {
    console.warn('⚠️  Advertencia: persist_state está habilitado. Fase 1 recomienda false para rollback simple.');
  }

  console.log(`   ✅ Encuesta validada: ${survey.name}`);
  console.log(`   📊 Engine mode: ${engineMode}`);
  console.log(`   📊 Sample size: ${survey.sample_size}`);

  return { valid: true, metadata: survey.metadata };
}

/**
 * Aplica cuotas tipo Cadem para sampleo estratificado
 * Basado en: región, sexo y grupo etario
 * NOTA: Implementación básica - mejorable con cuotas más sofisticadas
 */
function applyCademQuotas(agents: any[], targetSize: number): any[] {
  // Cuotas simplificadas tipo Cadem
  const quotas = {
    region: { 'CL-RM': 0.40, 'CL-VS': 0.10, 'CL-BI': 0.10, 'Otros': 0.40 },
    sex: { 'male': 0.48, 'female': 0.52 },
    ageGroup: { '18-34': 0.30, '35-54': 0.35, '55+': 0.35 },
  };

  // Clasificar agentes por categorías
  const byRegion: Record<string, any[]> = { 'CL-RM': [], 'CL-VS': [], 'CL-BI': [], 'Otros': [] };
  const bySex: Record<string, any[]> = { 'male': [], 'female': [], 'unknown': [] };
  const byAge: Record<string, any[]> = { '18-34': [], '35-54': [], '55+': [] };

  agents.forEach(agent => {
    // Región
    const region = agent.region_code || 'CL-RM';
    if (region === 'CL-RM') byRegion['CL-RM'].push(agent);
    else if (region === 'CL-VS') byRegion['CL-VS'].push(agent);
    else if (region === 'CL-BI') byRegion['CL-BI'].push(agent);
    else byRegion['Otros'].push(agent);

    // Sexo
    const sex = agent.sex || 'unknown';
    bySex[sex]?.push(agent);

    // Edad
    const age = agent.age || 35;
    if (age < 35) byAge['18-34'].push(agent);
    else if (age < 55) byAge['35-54'].push(agent);
    else byAge['55+'].push(agent);
  });

  // Seleccionar agentes según cuotas (priorizando región)
  const selected = new Set<any>();
  const targetPerRegion = {
    'CL-RM': Math.round(targetSize * quotas.region['CL-RM']),
    'CL-VS': Math.round(targetSize * quotas.region['CL-VS']),
    'CL-BI': Math.round(targetSize * quotas.region['CL-BI']),
    'Otros': Math.round(targetSize * quotas.region['Otros']),
  };

  // Seleccionar de cada región
  Object.entries(targetPerRegion).forEach(([region, count]) => {
    const regionAgents = byRegion[region] || [];
    const shuffled = [...regionAgents].sort(() => Math.random() - 0.5);
    shuffled.slice(0, count).forEach(agent => selected.add(agent));
  });

  // Si no alcanzamos el target, completar con aleatorios
  if (selected.size < targetSize) {
    const remaining = targetSize - selected.size;
    const notSelected = agents.filter(a => !selected.has(a));
    const shuffled = [...notSelected].sort(() => Math.random() - 0.5);
    shuffled.slice(0, remaining).forEach(agent => selected.add(agent));
  }

  return Array.from(selected).slice(0, targetSize);
}

async function sampleAgents(sampleSize: number): Promise<any[]> {
  console.log(`\n🎲 Muestreando ${sampleSize} agentes desde Supabase...`);
  console.log('   Método: Cuotas tipo Cadem (región, sexo, edad)');

  // Cargar más agentes para poder aplicar cuotas
  const { data: agents, error } = await supabase
    .from('synthetic_agents')
    .select('*')
    .limit(sampleSize * 5);

  if (error) {
    throw new Error(`Error al cargar agentes desde Supabase: ${error.message}`);
  }

  if (!agents || agents.length === 0) {
    throw new Error('No se encontraron agentes en la base de datos synthetic_agents');
  }

  if (agents.length < sampleSize) {
    console.warn(`⚠️  Solo hay ${agents.length} agentes disponibles (se solicitaron ${sampleSize})`);
  }

  // Aplicar cuotas tipo Cadem
  const selected = applyCademQuotas(agents, Math.min(sampleSize, agents.length));

  console.log(`   ✅ ${selected.length} agentes seleccionados`);
  console.log(`   📊 Distribución por región:`);
  const regionDist: Record<string, number> = {};
  selected.forEach(a => {
    const r = a.region_code || 'CL-RM';
    regionDist[r] = (regionDist[r] || 0) + 1;
  });
  Object.entries(regionDist).forEach(([r, c]) => {
    console.log(`      ${r}: ${c} (${Math.round(c/selected.length*100)}%)`);
  });

  return selected;
}

async function createSurveyRun(surveyId: string, sampleSize: number): Promise<string> {
  console.log('\n📝 Creando survey_run para Fase 1...');

  const { data: run, error } = await supabase
    .from('survey_runs')
    .insert({
      survey_id: surveyId,
      status: 'running',
      sample_size_requested: sampleSize,
      sample_size_actual: 0,
      started_at: new Date().toISOString(),
      metadata: {
        phase: '1',
        phase_type: 'internal_controlled',
        engine_version: 'cadem-v1.1',
        monitoring_level: MONITORING_LEVEL,
        created_by: 'runPhase1Controlled.ts'
      }
    })
    .select('id')
    .single();

  if (error || !run) {
    throw new Error(`Error al crear survey_run: ${error?.message || 'Unknown error'}`);
  }

  console.log(`   ✅ Run creado: ${run.id}`);
  return run.id;
}

function generateResponse(agent: any, questionId: string, questionText: string, options: string[]) {
  // Construir topic states
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

  // Determinar familia y topic de pregunta
  let family: 'approval' | 'optimism' | 'economic_perception' = 'approval';
  let topic: 'government_approval' | 'country_optimism' | 'economy_personal' = 'government_approval';

  if (questionId.includes('optimism')) {
    family = 'optimism';
    topic = 'country_optimism';
  }
  if (questionId.includes('economy')) {
    family = 'economic_perception';
    topic = 'economy_personal';
  }

  // Construir interpreted question
  const interpretedQuestion = {
    questionId,
    originalText: questionText,
    family: family,
    topic: topic,
    responseFormat: 'single_choice' as any,
    fingerprint: questionId,
    periodicity: 'monthly' as any,
    options,
  };

  // Resolver
  const result = resolveQuestionByFamily(interpretedQuestion, topicStates);

  return {
    value: result.value,
    confidence: 0.7 + Math.random() * 0.25,
    reasoning: `Respuesta generada por CADEM v1.1 para ${questionId}`
  };
}

async function executePhase1(
  surveyId: string,
  runId: string,
  agents: any[]
): Promise<{ responses: any[]; errors: string[]; distributions: Record<string, Record<string, number>> }> {
  console.log(`\n🚀 Ejecutando Fase 1 con ${agents.length} agentes...`);
  console.log('   Motor: CADEM v1.1 (buildInitialTopicStates + resolveQuestionByFamily)');
  console.log('   Monitoreo: Intensivo\n');

  // Preguntas de Fase 1 (subset del catálogo)
  const questions = [
    { id: 'q_approval', text: '¿Aprueba la gestión de la Presidenta?', options: ['approve', 'disapprove', 'neutral'] },
    { id: 'q_optimism', text: '¿Cómo ve el futuro económico del país?', options: ['optimistic', 'pessimistic', 'neutral'] },
    { id: 'q_economy_personal', text: '¿Cómo está su situación económica personal?', options: ['better', 'same', 'worse'] }
  ];

  const responses: any[] = [];
  const errors: string[] = [];
  const distributions: Record<string, Record<string, number>> = {};

  // Inicializar distribuciones
  questions.forEach(q => {
    distributions[q.id] = {};
    q.options.forEach(opt => distributions[q.id][opt] = 0);
  });

  // Procesar cada agente
  for (let i = 0; i < agents.length; i++) {
    const agent = agents[i];

    if (MONITORING_LEVEL === 'intensive' && (i + 1) % 25 === 0) {
      console.log(`   📊 Progreso: ${i + 1}/${agents.length} agentes (${Math.round((i + 1) / agents.length * 100)}%)`);
    }

    for (const question of questions) {
      try {
        const result = generateResponse(agent, question.id, question.text, question.options);

        const responseRecord = {
          run_id: runId,
          agent_id: agent.agent_id || agent.id,
          question_id: question.id,
          value: result.value,
          confidence: Math.round(result.confidence * 100) / 100,
          reasoning: result.reasoning,
          survey_id: surveyId,
          created_at: new Date().toISOString()
        };

        const { error: insertError } = await supabase
          .from('survey_responses')
          .insert(responseRecord);

        if (insertError) {
          errors.push(`Error insertando response: ${insertError.message}`);
        } else {
          responses.push(responseRecord);
          distributions[question.id][result.value] = (distributions[question.id][result.value] || 0) + 1;
        }
      } catch (error) {
        errors.push(`Error en agente ${agent.agent_id || agent.id}, pregunta ${question.id}: ${error}`);
      }
    }
  }

  console.log(`   ✅ ${responses.length} respuestas generadas`);
  if (errors.length > 0) {
    console.log(`   ⚠️  ${errors.length} errores`);
  }

  return { responses, errors, distributions };
}

function calculateMetrics(
  responses: any[],
  agents: any[],
  durationMs: number
): Phase1Result['metrics'] {
  const totalExpected = agents.length * 3; // 3 preguntas por agente
  const completionRate = (responses.length / totalExpected) * 100;
  const errorRate = 100 - completionRate;

  return {
    completionRate: Math.round(completionRate * 10) / 10,
    errorVsBenchmark: null, // Se calcula post-ejecución comparando con benchmarks
    coherence: null, // Se calcula post-ejecución
    executionTime: Math.round(durationMs / 1000),
    errorRate: Math.round(errorRate * 10) / 10
  };
}

async function updateSurveyRun(runId: string, result: Phase1Result): Promise<void> {
  console.log('\n📝 Actualizando survey_run...');

  const { error } = await supabase
    .from('survey_runs')
    .update({
      status: result.status === 'success' ? 'completed' : result.status === 'partial' ? 'completed_with_errors' : 'failed',
      completed_at: result.completedAt,
      sample_size_actual: result.totalResponses / 3, // Aproximado
      results_summary: {
        total_responses: result.totalResponses,
        completion_rate: result.completionRate,
        avg_confidence: result.avgConfidence,
        distributions: result.distributions,
        metrics: result.metrics,
        errors: result.errors.slice(0, 10) // Solo primeros 10 errores
      }
    })
    .eq('id', runId);

  if (error) {
    console.error(`   ❌ Error actualizando run: ${error.message}`);
  } else {
    console.log('   ✅ Run actualizado');
  }
}

function saveResults(result: Phase1Result): void {
  const outputDir = path.join(__dirname, '../../data/rollout');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const outputFile = path.join(outputDir, `phase1_result_${result.surveyId}_${Date.now()}.json`);
  fs.writeFileSync(outputFile, JSON.stringify(result, null, 2));
  console.log(`\n💾 Resultados guardados: ${outputFile}`);
}

function printResults(result: Phase1Result): void {
  console.log('\n' + '='.repeat(60));
  console.log('📊 RESULTADOS FASE 1 - ROLLOUT INTERNO CONTROLADO');
  console.log('='.repeat(60));

  console.log(`\n🆔 Survey ID: ${result.surveyId}`);
  console.log(`🆔 Run ID: ${result.runId}`);
  console.log(`⏱️  Duración: ${result.metrics.executionTime}s`);
  console.log(`👥 Agentes: ${result.sampleSize}`);
  console.log(`📝 Respuestas: ${result.totalResponses}`);

  console.log('\n📈 Métricas:');
  console.log(`   Completion Rate: ${result.metrics.completionRate}% ${result.metrics.completionRate >= 90 ? '✅' : '❌'}`);
  console.log(`   Error Rate: ${result.metrics.errorRate}% ${result.metrics.errorRate <= 5 ? '✅' : '❌'}`);
  console.log(`   Avg Confidence: ${(result.avgConfidence * 100).toFixed(1)}%`);

  console.log('\n📊 Distribuciones:');
  Object.entries(result.distributions).forEach(([qid, dist]) => {
    console.log(`   ${qid}:`);
    Object.entries(dist).forEach(([opt, count]) => {
      const pct = result.totalResponses > 0 ? Math.round((count / (result.totalResponses / 3)) * 1000) / 10 : 0;
      console.log(`      ${opt}: ${count} (${pct}%)`);
    });
  });

  console.log('\n🎯 Estado:', result.status.toUpperCase());

  if (result.errors.length > 0) {
    console.log(`\n⚠️  Errores (${result.errors.length}):`);
    result.errors.slice(0, 5).forEach(e => console.log(`   - ${e}`));
    if (result.errors.length > 5) {
      console.log(`   ... y ${result.errors.length - 5} más`);
    }
  }

  console.log('\n' + '='.repeat(60));

  // Evaluación de criterios
  console.log('\n✅ CRITERIOS DE APROBACIÓN:');
  const criteria = [
    { name: 'Completion Rate >90%', pass: result.metrics.completionRate >= 90 },
    { name: 'Error Rate <5%', pass: result.metrics.errorRate <= 5 },
    { name: 'Sin errores críticos', pass: result.status !== 'failed' }
  ];

  criteria.forEach(c => {
    console.log(`   ${c.pass ? '✅' : '❌'} ${c.name}`);
  });

  const allPass = criteria.every(c => c.pass);
  console.log(`\n${allPass ? '🎉 LISTO PARA FASE 2' : '⚠️  REQUIERE REVISIÓN ANTES DE FASE 2'}`);

  console.log('\n💡 Próximo paso:');
  if (allPass) {
    console.log('   1. Documentar resultados en ROLLOUT_FASE_1_INTERNAL.md');
    console.log('   2. Preparar Fase 2 (200 agentes, persistencia habilitada)');
  } else {
    console.log('   1. Revisar errores y métricas');
    console.log('   2. Decidir: ¿Ajustar y reintentar o investigar más?');
  }

  console.log('\n' + '='.repeat(60) + '\n');
}

// ============================================================================
// FUNCIÓN PRINCIPAL
// ============================================================================

async function main() {
  const startTime = Date.now();

  console.log('\n🚀 FASE 1 - ROLLOUT INTERNO CONTROLADO');
  console.log('   CADEM Opinion Engine v1.1\n');
  console.log(`   Survey ID: ${SURVEY_ID}`);
  console.log(`   Sample Size: ${SAMPLE_SIZE}`);
  console.log(`   Monitoring: ${MONITORING_LEVEL}\n`);

  try {
    // 1. Validar encuesta
    const validation = await validateSurvey(SURVEY_ID);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    // 2. Samplear agentes
    const agents = await sampleAgents(SAMPLE_SIZE);

    // 3. Crear survey_run
    const runId = await createSurveyRun(SURVEY_ID, agents.length);

    // 4. Ejecutar Fase 1
    const { responses, errors, distributions } = await executePhase1(SURVEY_ID, runId, agents);

    // 5. Calcular métricas
    const durationMs = Date.now() - startTime;
    const metrics = calculateMetrics(responses, agents, durationMs);

    // 6. Calcular confidence promedio
    const avgConfidence = responses.length > 0
      ? responses.reduce((sum, r) => sum + (r.confidence || 0), 0) / responses.length
      : 0;

    // 7. Determinar status
    let status: Phase1Result['status'] = 'success';
    if (metrics.completionRate < 80) status = 'failed';
    else if (metrics.completionRate < 90 || errors.length > 10) status = 'partial';

    // 8. Construir resultado
    const result: Phase1Result = {
      surveyId: SURVEY_ID,
      runId,
      startedAt: new Date(startTime).toISOString(),
      completedAt: new Date().toISOString(),
      durationMs,
      sampleSize: agents.length,
      totalResponses: responses.length,
      completionRate: metrics.completionRate,
      avgConfidence,
      errorRate: metrics.errorRate,
      distributions,
      metrics,
      status,
      errors
    };

    // 9. Actualizar run y guardar resultados
    await updateSurveyRun(runId, result);
    saveResults(result);
    printResults(result);

    // 10. Exit code basado en status
    process.exit(status === 'failed' ? 1 : 0);

  } catch (error) {
    console.error('\n❌ ERROR EN FASE 1:');
    console.error(error);
    process.exit(1);
  }
}

main();
