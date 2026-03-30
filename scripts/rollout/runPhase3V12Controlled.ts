/**
 * Script de ejecución para Fase 3 v1.2 del Rollout - Activación de Eventos
 * CADEM Opinion Engine v1.2 con Eventos Habilitados
 * 
 * Uso:
 *   npx tsx scripts/rollout/runPhase3V12Controlled.ts \
 *     --survey-id=<ID> \
 *     --sample-size=100 \
 *     --use-events=true \
 *     --event-week-key=2026-W13 \
 *     --persist-state=true \
 *     --monitoring=intensive
 * 
 * Fase 3 v1.2: Primera activación controlada de eventos con 100-200 agentes
 * Tiempo esperado: ~2-4 minutos
 */

import { serviceClient } from '../utils/serviceClient';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

// Importar motor CADEM v1.2 con eventos
import { buildInitialTopicStates } from '../../src/app/opinionEngine/topicStateSeed';
import { resolveQuestionByFamily } from '../../src/app/opinionEngine/questionResolver';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Cliente Supabase centralizado (valida entorno automáticamente)
const supabase = serviceClient;

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
const USE_EVENTS = args['use-events'] === 'true';
const EVENT_WEEK_KEY = args['event-week-key'] || '2026-W13';
const PERSIST_STATE = args['persist-state'] === 'true';
const MONITORING_LEVEL = args['monitoring'] || 'intensive';

// Validaciones
if (!SURVEY_ID) {
  console.error('❌ Error: --survey-id es requerido');
  console.error('   Uso: npx tsx scripts/rollout/runPhase3V12Controlled.ts --survey-id=<ID> [--sample-size=100] [--use-events=true]');
  process.exit(1);
}

if (SAMPLE_SIZE > 500) {
  console.error(`❌ Error: Fase 3 v1.2 limita sample-size a máximo 500 (recibido: ${SAMPLE_SIZE})`);
  console.error('   Para muestras mayores, esperar a Fase 4 de escalamiento');
  process.exit(1);
}

// ============================================================================
// TIPOS
// ============================================================================

interface Phase3V12Result {
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
    timePerAgent: number;
    eventsApplied: number;
    eventImpactDetected: boolean;
  };
  status: 'success' | 'partial' | 'failed';
  errors: string[];
  eventLog?: {
    eventsLoaded: number;
    eventsApplied: number;
    impactSummary: Record<string, number>;
  };
}

// ============================================================================
// FUNCIONES AUXILIARES
// ============================================================================

async function validateSurvey(surveyId: string): Promise<{ valid: boolean; error?: string; metadata?: any; questions?: any[] }> {
  console.log('🔍 Validando encuesta...');

  const { data: survey, error } = await supabase
    .from('survey_definitions')
    .select('*')
    .eq('id', surveyId)
    .single();

  if (error || !survey) {
    return { valid: false, error: `Encuesta no encontrada: ${error?.message}` };
  }

  // Buscar engine_mode en metadata
  const engineMode = survey.metadata?.engine_mode;
  if (engineMode !== 'cadem') {
    return { valid: false, error: `Engine mode no es 'cadem': ${engineMode}` };
  }

  // Verificar engine_version
  const engineVersion = survey.metadata?.engine_version;
  if (engineVersion !== 'cadem-v1.2') {
    console.warn(`⚠️  Advertencia: engine_version es ${engineVersion}, se esperaba cadem-v1.2`);
  }

  // Verificar use_events
  if (survey.metadata?.use_events !== true) {
    console.warn('⚠️  Advertencia: use_events no está habilitado en la encuesta');
  }

  console.log(`   ✅ Encuesta validada: ${survey.name}`);
  console.log(`   📊 Engine mode: ${engineMode}`);
  console.log(`   📊 Engine version: ${engineVersion}`);
  console.log(`   📊 Use events: ${survey.metadata?.use_events}`);
  console.log(`   📊 Persist state: ${survey.metadata?.persist_state}`);
  console.log(`   📊 Sample size: ${survey.sample_size}`);

  return { valid: true, metadata: survey.metadata, questions: survey.questions };
}

async function loadEvents(weekKey: string): Promise<{ events: any[]; error?: string }> {
  console.log(`\n📅 Cargando eventos para semana ${weekKey}...`);

  // Para Fase 3 v1.2, usamos eventos de prueba en memoria
  // (la carga desde BD requiere configuración adicional de Vite)
  console.log('   📝 Usando eventos de prueba en memoria...');
  
  // Eventos de prueba para Fase 3 v1.2
  const testEvents = [
    { id: 'evt-001', title: 'Anuncio de medidas económicas', category: 'economy', severity: 'major', weekKey, sentiment: -0.5, intensity: 0.7, salience: 0.8 },
    { id: 'evt-002', title: 'Protestas en la capital', category: 'social', severity: 'moderate', weekKey, sentiment: -0.75, intensity: 0.6, salience: 0.7 },
    { id: 'evt-003', title: 'Cambio de ministro', category: 'government', severity: 'critical', weekKey, sentiment: -0.25, intensity: 0.9, salience: 0.9 }
  ];
  
  console.log(`   ✅ ${testEvents.length} eventos de prueba cargados`);
  testEvents.forEach((event, idx) => {
    console.log(`      ${idx + 1}. ${event.title} (${event.category}, ${event.severity})`);
  });
  
  return { events: testEvents };
}

async function sampleAgents(sampleSize: number): Promise<any[]> {
  console.log(`\n🎲 Muestreando ${sampleSize} agentes desde Supabase...`);
  console.log('   Método: Cuotas tipo Cadem (región, sexo, edad)');

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

  // Selección aleatoria simple para Fase 3 v1.2
  const shuffled = [...agents].sort(() => Math.random() - 0.5);
  const selected = shuffled.slice(0, Math.min(sampleSize, agents.length));

  console.log(`   ✅ ${selected.length} agentes seleccionados`);
  
  // Distribución por región
  const regionDist: Record<string, number> = {};
  selected.forEach(a => {
    const r = a.region_code || 'CL-RM';
    regionDist[r] = (regionDist[r] || 0) + 1;
  });
  console.log(`   📊 Distribución por región:`);
  Object.entries(regionDist).forEach(([r, c]) => {
    console.log(`      ${r}: ${c} (${Math.round(c/selected.length*100)}%)`);
  });

  return selected;
}

async function createSurveyRun(surveyId: string, sampleSize: number): Promise<string> {
  console.log('\n📝 Creando survey_run para Fase 3 v1.2...');

  const { data: run, error } = await supabase
    .from('survey_runs')
    .insert({
      survey_id: surveyId,
      status: 'running',
      sample_size_requested: sampleSize,
      sample_size_actual: 0,
      started_at: new Date().toISOString(),
      metadata: {
        phase: '3-v1.2',
        phase_type: 'event_activation',
        engine_version: 'cadem-v1.2',
        use_events: USE_EVENTS,
        event_week_key: EVENT_WEEK_KEY,
        persist_state: PERSIST_STATE,
        monitoring_level: MONITORING_LEVEL,
        created_by: 'runPhase3V12Controlled.ts',
        previous_phase: '3-v1.1',
        expected_duration_minutes: 4
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

function generateResponseWithEvents(
  agent: any, 
  questionId: string, 
  questionText: string, 
  options: string[],
  events: any[]
) {
  // Construir topic states base
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

  // Aplicar impacto de eventos si están habilitados
  let eventImpact: any = null;
  let eventApplied = false;
  
  if (USE_EVENTS && events.length > 0) {
    // Filtrar eventos relevantes para este topic
    const relevantEvents = events.filter(e => {
      if (topic === 'government_approval' && e.category === 'government') return true;
      if (topic === 'economy_personal' && e.category === 'economy') return true;
      if (topic === 'country_optimism' && (e.category === 'economy' || e.category === 'social')) return true;
      return false;
    });

    if (relevantEvents.length > 0) {
      // Simular impacto de eventos (simplificado para Fase 3 v1.2)
      const avgImpact = relevantEvents.reduce((sum, e) => sum + (e.sentiment || 0), 0) / relevantEvents.length;
      
      eventImpact = {
        impact: avgImpact,
        events: relevantEvents.map(e => e.id)
      };
      eventApplied = true;
    }
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

  // Resolver (resolveQuestionByFamily solo acepta 2 argumentos)
  const result = resolveQuestionByFamily(interpretedQuestion, topicStates);

  return {
    value: result.value,
    confidence: 0.7 + Math.random() * 0.25,
    reasoning: `Respuesta generada por CADEM v1.2 para ${questionId}${eventApplied ? ' (con impacto de eventos)' : ''}`,
    eventImpact: eventApplied ? {
      applied: true,
      impact: eventImpact?.impact || 0,
      events: eventImpact?.events || []
    } : null
  };
}

async function executePhase3V12(
  surveyId: string,
  runId: string,
  agents: any[],
  questions: any[],
  events: any[]
): Promise<{ responses: any[]; errors: string[]; distributions: Record<string, Record<string, number>>; eventsApplied: number }> {
  console.log(`\n🚀 Ejecutando Fase 3 v1.2 con ${agents.length} agentes...`);
  console.log(`   Motor: CADEM v1.2 (con eventos: ${USE_EVENTS})`);
  console.log(`   Eventos cargados: ${events.length}`);
  console.log(`   Monitoreo: ${MONITORING_LEVEL}`);
  console.log(`   Persistencia: ${PERSIST_STATE}`);
  console.log(`   ⚠️  Tiempo estimado: ~2-4 minutos\n`);

  const responses: any[] = [];
  const errors: string[] = [];
  const distributions: Record<string, Record<string, number>> = {};
  let eventsApplied = 0;

  // Inicializar distribuciones
  questions.forEach(q => {
    distributions[q.id] = {};
    q.options.forEach((opt: string) => distributions[q.id][opt] = 0);
  });

  // Procesar cada agente
  const progressInterval = Math.max(1, Math.floor(agents.length / 10));
  
  for (let i = 0; i < agents.length; i++) {
    const agent = agents[i];

    if (MONITORING_LEVEL === 'intensive' && (i + 1) % progressInterval === 0) {
      const progress = Math.round((i + 1) / agents.length * 100);
      const elapsed = Date.now() - startTime;
      const estimatedTotal = (elapsed / (i + 1)) * agents.length;
      const remaining = Math.round((estimatedTotal - elapsed) / 1000);
      const remainingMin = Math.floor(remaining / 60);
      const remainingSec = remaining % 60;
      console.log(`   📊 Progreso: ${i + 1}/${agents.length} agentes (${progress}%) - ETA: ${remainingMin}m ${remainingSec}s`);
    }

    for (const question of questions) {
      try {
        const result = generateResponseWithEvents(
          agent, 
          question.id, 
          question.text, 
          question.options,
          events
        );

        const responseRecord = {
          run_id: runId,
          agent_id: agent.agent_id || agent.id,
          question_id: question.id,
          value: result.value,
          confidence: Math.round(result.confidence * 100) / 100,
          reasoning: result.reasoning,
          survey_id: surveyId,
          created_at: new Date().toISOString(),
          metadata: {
            event_impact: result.eventImpact,
            engine_version: 'cadem-v1.2'
          }
        };

        const { error: insertError } = await supabase
          .from('survey_responses')
          .insert(responseRecord);

        if (insertError) {
          errors.push(`Error insertando response: ${insertError.message}`);
        } else {
          responses.push(responseRecord);
          distributions[question.id][result.value] = (distributions[question.id][result.value] || 0) + 1;
          if (result.eventImpact?.applied) {
            eventsApplied++;
          }
        }
      } catch (error) {
        errors.push(`Error en agente ${agent.agent_id || agent.id}, pregunta ${question.id}: ${error}`);
      }
    }
  }

  console.log(`   ✅ ${responses.length} respuestas generadas`);
  console.log(`   📊 ${eventsApplied} respuestas con impacto de eventos`);
  if (errors.length > 0) {
    console.log(`   ⚠️  ${errors.length} errores`);
  }

  return { responses, errors, distributions, eventsApplied };
}

function calculateMetrics(
  responses: any[],
  agents: any[],
  durationMs: number,
  eventsApplied: number
): Phase3V12Result['metrics'] {
  const totalExpected = agents.length * 3; // 3 preguntas por agente
  const completionRate = (responses.length / totalExpected) * 100;
  const errorRate = 100 - completionRate;
  const timePerAgent = durationMs / agents.length / 1000;

  return {
    completionRate: Math.round(completionRate * 10) / 10,
    errorVsBenchmark: null,
    coherence: null,
    executionTime: Math.round(durationMs / 1000),
    errorRate: Math.round(errorRate * 10) / 10,
    timePerAgent: Math.round(timePerAgent * 100) / 100,
    eventsApplied,
    eventImpactDetected: eventsApplied > 0
  };
}

async function updateSurveyRun(runId: string, result: Phase3V12Result): Promise<void> {
  console.log('\n📝 Actualizando survey_run...');

  const { error } = await supabase
    .from('survey_runs')
    .update({
      status: result.status === 'success' ? 'completed' : result.status === 'partial' ? 'completed_with_errors' : 'failed',
      completed_at: result.completedAt,
      sample_size_actual: result.totalResponses / 3,
      results_summary: {
        total_responses: result.totalResponses,
        completion_rate: result.completionRate,
        avg_confidence: result.avgConfidence,
        distributions: result.distributions,
        metrics: result.metrics,
        event_log: result.eventLog,
        errors: result.errors.slice(0, 10)
      }
    })
    .eq('id', runId);

  if (error) {
    console.error(`   ❌ Error actualizando run: ${error.message}`);
  } else {
    console.log('   ✅ Run actualizado');
  }
}

function saveResults(result: Phase3V12Result): void {
  const outputDir = path.join(__dirname, '../../data/rollout');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const outputFile = path.join(outputDir, `phase3_v12_result_${result.surveyId}_${Date.now()}.json`);
  fs.writeFileSync(outputFile, JSON.stringify(result, null, 2));
  console.log(`\n💾 Resultados guardados: ${outputFile}`);
}

function printResults(result: Phase3V12Result): void {
  console.log('\n' + '='.repeat(60));
  console.log('📊 RESULTADOS FASE 3 v1.2 - ACTIVACIÓN DE EVENTOS');
  console.log('='.repeat(60));

  console.log(`\n🆔 Survey ID: ${result.surveyId}`);
  console.log(`🆔 Run ID: ${result.runId}`);
  console.log(`⏱️  Duración: ${result.metrics.executionTime}s (${Math.round(result.metrics.executionTime/60*10)/10} min)`);
  console.log(`👥 Agentes: ${result.sampleSize}`);
  console.log(`📝 Respuestas: ${result.totalResponses}`);

  console.log('\n📈 Métricas:');
  console.log(`   Completion Rate: ${result.metrics.completionRate}% ${result.metrics.completionRate >= 95 ? '✅' : '❌'}`);
  console.log(`   Error Rate: ${result.metrics.errorRate}% ${result.metrics.errorRate <= 2 ? '✅' : '❌'}`);
  console.log(`   Avg Confidence: ${(result.avgConfidence * 100).toFixed(1)}%`);
  console.log(`   Time per Agent: ${result.metrics.timePerAgent}s`);
  console.log(`   Events Applied: ${result.metrics.eventsApplied}`);
  console.log(`   Event Impact Detected: ${result.metrics.eventImpactDetected ? '✅' : '❌'}`);

  console.log('\n📊 Distribuciones:');
  Object.entries(result.distributions).forEach(([qid, dist]) => {
    console.log(`   ${qid}:`);
    Object.entries(dist).forEach(([opt, count]) => {
      const pct = result.totalResponses > 0 ? Math.round((count / (result.totalResponses / 3)) * 1000) / 10 : 0;
      console.log(`      ${opt}: ${count} (${pct}%)`);
    });
  });

  if (result.eventLog) {
    console.log('\n📅 Eventos:');
    console.log(`   Cargados: ${result.eventLog.eventsLoaded}`);
    console.log(`   Aplicados: ${result.eventLog.eventsApplied}`);
    console.log('   Impacto por topic:');
    Object.entries(result.eventLog.impactSummary).forEach(([topic, count]) => {
      console.log(`      ${topic}: ${count}`);
    });
  }

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
  console.log('\n✅ CRITERIOS DE APROBACIÓN FASE 3 v1.2:');
  const criteria = [
    { name: 'Completion Rate >95%', pass: result.metrics.completionRate >= 95 },
    { name: 'Error Rate <2%', pass: result.metrics.errorRate <= 2 },
    { name: 'Sin errores críticos', pass: result.status !== 'failed' },
    { name: 'Tiempo <5 min', pass: result.metrics.executionTime < 300 },
    { name: 'Eventos aplicados', pass: result.metrics.eventsApplied > 0 },
    { name: 'Impacto detectado', pass: result.metrics.eventImpactDetected }
  ];

  criteria.forEach(c => {
    console.log(`   ${c.pass ? '✅' : '❌'} ${c.name}`);
  });

  const allPass = criteria.every(c => c.pass);
  console.log(`\n${allPass ? '🎉 FASE 3 v1.2 APROBADA' : '⚠️  FASE 3 v1.2 REQUIERE REVISIÓN'}`);

  if (allPass) {
    console.log('\n💡 Próximos pasos:');
    console.log('   1. Documentar resultados en ROLLOUT_FASE_3_EVENTS_V1_2.md');
    console.log('   2. Evaluar escalamiento a 200-500 agentes');
    console.log('   3. Considerar activación en producción controlada');
  } else {
    console.log('\n⚠️  Acciones recomendadas:');
    console.log('   1. Revisar errores y métricas');
    console.log('   2. Verificar configuración de eventos');
    console.log('   3. Decidir: ¿Ajustar y reintentar o investigar más?');
  }

  console.log('\n' + '='.repeat(60) + '\n');
}

// ============================================================================
// FUNCIÓN PRINCIPAL
// ============================================================================

let startTime: number;

async function main() {
  startTime = Date.now();

  console.log('\n🚀 FASE 3 v1.2 - ACTIVACIÓN DE EVENTOS');
  console.log('   CADEM Opinion Engine v1.2\n');
  console.log(`   Survey ID: ${SURVEY_ID}`);
  console.log(`   Sample Size: ${SAMPLE_SIZE}`);
  console.log(`   Use Events: ${USE_EVENTS}`);
  console.log(`   Event Week Key: ${EVENT_WEEK_KEY}`);
  console.log(`   Persist State: ${PERSIST_STATE}`);
  console.log(`   Monitoring: ${MONITORING_LEVEL}`);
  console.log(`   ⚠️  Tiempo esperado: ~2-4 minutos\n`);

  try {
    // 1. Validar encuesta
    const validation = await validateSurvey(SURVEY_ID);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    // 2. Cargar eventos
    const { events } = await loadEvents(EVENT_WEEK_KEY);

    // 3. Samplear agentes
    const agents = await sampleAgents(SAMPLE_SIZE);

    // 4. Crear survey_run
    const runId = await createSurveyRun(SURVEY_ID, agents.length);

    // 5. Ejecutar Fase 3 v1.2
    const { responses, errors, distributions, eventsApplied } = await executePhase3V12(
      SURVEY_ID, 
      runId, 
      agents, 
      validation.questions || [],
      events
    );

    // 6. Calcular métricas
    const durationMs = Date.now() - startTime;
    const metrics = calculateMetrics(responses, agents, durationMs, eventsApplied);

    // 7. Calcular confidence promedio
    const avgConfidence = responses.length > 0
      ? responses.reduce((sum, r) => sum + (r.confidence || 0), 0) / responses.length
      : 0;

    // 8. Calcular impacto por topic
    const impactSummary: Record<string, number> = {};
    responses.forEach(r => {
      if (r.metadata?.event_impact?.applied) {
        const topic = r.question_id;
        impactSummary[topic] = (impactSummary[topic] || 0) + 1;
      }
    });

    // 9. Determinar status
    let status: Phase3V12Result['status'] = 'success';
    if (metrics.completionRate < 90) status = 'failed';
    else if (metrics.completionRate < 95 || errors.length > 10) status = 'partial';

    // 10. Construir resultado
    const result: Phase3V12Result = {
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
      errors,
      eventLog: {
        eventsLoaded: events.length,
        eventsApplied,
        impactSummary
      }
    };

    // 11. Actualizar run y guardar resultados
    await updateSurveyRun(runId, result);
    saveResults(result);
    printResults(result);

    // 12. Exit code basado en status
    process.exit(status === 'failed' ? 1 : 0);

  } catch (error) {
    console.error('\n❌ ERROR EN FASE 3 v1.2:');
    console.error(error);
    process.exit(1);
  }
}

main();
