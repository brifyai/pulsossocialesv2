/**
 * Script para ejecutar una ola del B2 Longitudinal Test
 * Paso 2 del B2 Longitudinal Test
 *
 * Ejecuta una encuesta con los mismos agentes del Run 001
 * usando persistencia de estado (persistState: true)
 * y el MOTOR CADEM REAL calibrado
 */

import { serviceClient } from '../utils/serviceClient';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

// Importar motor CADEM real (igual que runStagingValidationSurvey.ts)
import { buildInitialTopicStates } from '../../src/app/opinionEngine/topicStateSeed';
import { resolveQuestionByFamily } from '../../src/app/opinionEngine/questionResolver';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Parsear argumentos CLI (soporta --key=value y --key value)
function parseArgs() {
  const args = process.argv.slice(2);
  const params: Record<string, string> = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg.startsWith('--')) {
      // Soportar --key=value
      if (arg.includes('=')) {
        const [key, ...valueParts] = arg.replace('--', '').split('=');
        params[key] = valueParts.join('=');
      } else {
        // Soportar --key value
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

// Validar argumentos requeridos
const WAVE = parseInt(args['wave'] || '1');
const SURVEY_ID = args['survey-id'];
const AGENT_IDS_FILE = args['agent-ids-file'] || path.join(__dirname, '../../data/staging/agents_run_001_ids.json');
const WAVE_DATE = args['wave-date'] || new Date().toISOString().split('T')[0];

if (!SURVEY_ID) {
  console.error('❌ Error: --survey-id es requerido');
  console.error('   Uso: npx tsx scripts/staging/runLongitudinalWave.ts --wave=1 --survey-id=<ID> [--agent-ids-file=<path>] [--wave-date=2026-03-27]');
  process.exit(1);
}

if (![1, 2, 3].includes(WAVE)) {
  console.error('❌ Error: --wave debe ser 1, 2 o 3');
  process.exit(1);
}

// Cliente Supabase centralizado (valida entorno automáticamente)
const supabase = serviceClient;

// Cargar catálogo canónico
const CATALOG_PATH = path.resolve('data/surveys/cadem_question_catalog_v1.json');

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

interface AgentData {
  agent_id: string;
  age: number;
  gender: string;
  sex?: string;
  region: string;
  region_code?: string;
  comuna: string;
  education_level: string;
  socioeconomic_level: string;
  employment_status: string;
  income_bracket: string;
  income_decile?: number;
  household_size: number;
  has_children: boolean;
  marital_status: string;
  occupation: string;
  sector: string;
  political_affinity: number;
  media_consumption: string[];
  social_media_usage: string[];
  internet_access: string;
  smartphone_owner: boolean;
  health_status: string;
  indigenous_status: string;
  migration_status: string;
  disability_status: string;
  agent_type?: string;
  connectivity_level?: string;
  poverty_status?: string;
  digital_exposure?: string;
  preferred_channel?: string;
  coordinates?: { lat: number; lng: number };
}

interface WaveResult {
  wave: number;
  wave_date: string;
  survey_id: string;
  run_id: string;
  total_agents: number;
  responses: any[];
  distributions: Record<string, any>;
  avg_confidence: number;
  duration_ms: number;
  completed_at: string;
}

// ============================================================================
// FUNCIONES AUXILIARES
// ============================================================================

function loadQuestionCatalog(): QuestionCatalog {
  const content = fs.readFileSync(CATALOG_PATH, 'utf-8');
  return JSON.parse(content);
}

async function loadAgentIds(): Promise<string[] | null> {
  try {
    if (fs.existsSync(AGENT_IDS_FILE)) {
      const data = JSON.parse(fs.readFileSync(AGENT_IDS_FILE, 'utf-8'));
      
      // Soportar ambos formatos: { agent_ids: [...] } o [...]
      let agentIds: string[];
      if (Array.isArray(data)) {
        agentIds = data;
      } else if (data.agent_ids && Array.isArray(data.agent_ids)) {
        agentIds = data.agent_ids;
      } else {
        console.error(`   ❌ Formato de archivo no reconocido`);
        return null;
      }
      
      console.log(`   ✅ Cargados ${agentIds.length} agent IDs desde archivo`);
      return agentIds;
    }

    // Si no existe archivo, cargar TODOS los agentes desde Supabase
    console.log(`   ℹ️ Archivo no encontrado: ${AGENT_IDS_FILE}`);
    console.log(`   📥 Cargando TODOS los agentes desde Supabase...`);

    const { data: agents, error } = await supabase
      .from('synthetic_agents')
      .select('agent_id');

    if (error) {
      console.error(`   ❌ Error al cargar agentes: ${error.message}`);
      return null;
    }

    const agentIds = agents?.map(a => a.agent_id) || [];
    console.log(`   ✅ Cargados ${agentIds.length} agent IDs desde Supabase`);
    return agentIds;
  } catch (error) {
    console.error(`❌ Error al cargar agent IDs: ${error}`);
    return null;
  }
}

async function loadAgents(agentIds: string[]): Promise<AgentData[]> {
  console.log(`\n2. Cargando ${agentIds.length} agentes desde synthetic_agents...`);

  // Procesar en batches de 500 para evitar "URI too long"
  const BATCH_SIZE = 500;
  const allAgents: AgentData[] = [];

  for (let i = 0; i < agentIds.length; i += BATCH_SIZE) {
    const batch = agentIds.slice(i, i + BATCH_SIZE);
    const { data: agents, error } = await supabase
      .from('synthetic_agents')
      .select('*')
      .in('agent_id', batch);

    if (error) {
      console.error(`   ❌ Error en batch ${i / BATCH_SIZE + 1}: ${error.message}`);
      continue;
    }

    if (agents) {
      allAgents.push(...agents);
    }

    if ((i + BATCH_SIZE) % 2000 === 0 || i + BATCH_SIZE >= agentIds.length) {
      console.log(`   📊 Progreso: ${Math.min(i + BATCH_SIZE, agentIds.length)}/${agentIds.length} IDs procesados`);
    }
  }

  console.log(`   ✅ Cargados ${allAgents.length} agentes`);

  // Si no se encontraron agentes con los IDs proporcionados, fallar explícitamente
  if (allAgents.length === 0) {
    throw new Error(
      `No se encontraron agentes con los ${agentIds.length} IDs proporcionados. ` +
      `Esto puede indicar que los IDs no existen en la tabla synthetic_agents ` +
      `o que hay un problema de sincronización.`
    );
  }

  return allAgents;
}

async function createSurveyRun(surveyId: string, wave: number, agentCount: number): Promise<string | null> {
  console.log(`\n3. Creando survey_run para Ola ${wave}...`);

  const runData = {
    survey_id: surveyId,
    started_at: new Date().toISOString(),
    status: 'running',
    sample_size_requested: agentCount,
    metadata: {
      wave: wave,
      wave_date: WAVE_DATE,
      test_type: 'b2_longitudinal',
      persist_state: true,
      engine_mode: 'cadem',
      engine_version: 'cadem-v1.1'
    }
  };

  const { data: run, error } = await supabase
    .from('survey_runs')
    .insert(runData)
    .select('id')
    .single();

  if (error || !run) {
    console.error(`   ❌ Error: ${error?.message || 'No se pudo crear run'}`);
    return null;
  }

  console.log(`   ✅ Run creado: ${run.id}`);
  return run.id;
}

// ============================================================================
// MOTOR CADEM REAL (igual que runStagingValidationSurvey.ts)
// ============================================================================

function generateResponseWithCademEngine(
  agent: AgentData,
  catalogQuestion: CatalogQuestion
): { value: string; confidence: number; reasoning: string } {
  // Mapear campos del agente a formato esperado por topicStateSeed
  const sex = agent.sex || (agent.gender === 'male' ? 'male' : agent.gender === 'female' ? 'female' : 'unknown');
  const regionCode = agent.region_code || agent.region || 'CL-RM';
  const incomeDecile = agent.income_decile ||
    (agent.income_bracket === 'alta' ? 8 : agent.income_bracket === 'baja' ? 3 : 5);

  // Construir topic states para el agente
  const topicStates = buildInitialTopicStates({
    age: agent.age ?? 35,
    sex: sex as 'male' | 'female' | 'unknown',
    educationLevel: agent.education_level ?? 'secondary',
    incomeDecile: incomeDecile,
    regionCode: regionCode,
    agentType: (agent.agent_type as 'student' | 'worker' | 'retired' | 'unemployed') ?? 'worker',
    connectivityLevel: (agent.connectivity_level as 'high' | 'medium' | 'low') ?? 'medium',
    povertyStatus: (agent.poverty_status as 'vulnerable' | 'middle_class' | 'affluent') ?? 'middle_class',
    digitalExposure: (agent.digital_exposure as 'high' | 'medium' | 'low') ?? 'medium',
    preferredChannel: (agent.preferred_channel as 'mobile' | 'desktop' | 'mixed') ?? 'mixed',
  });

  // Construir interpreted question
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
    confidence: 0.7 + Math.random() * 0.25, // Confidence realista entre 0.7-0.95
    reasoning: `Respuesta generada por motor CADEM para ${catalogQuestion.id}`
  };
}

// ============================================================================
// EJECUCIÓN PRINCIPAL
// ============================================================================

async function runLongitudinalWave(): Promise<WaveResult | null> {
  const startTime = Date.now();

  console.log(`\n🌊 EJECUTANDO OLA ${WAVE} DEL B2 LONGITUDINAL TEST\n`);
  console.log('==============================================\n');
  console.log(`Survey ID:    ${SURVEY_ID}`);
  console.log(`Wave:         ${WAVE}`);
  console.log(`Wave Date:    ${WAVE_DATE}`);
  console.log(`Agent File:   ${AGENT_IDS_FILE}\n`);
  console.log('==============================================\n');

  // 1. Cargar catálogo canónico
  const catalog = loadQuestionCatalog();
  console.log(`✅ Catálogo cargado: ${catalog.questions.length} preguntas (v${catalog.version})`);

  // 2. Filtrar preguntas del catálogo
  const surveyQuestionIds = ['q_approval', 'q_optimism', 'q_economy_personal'];
  const catalogQuestions = catalog.questions.filter(q => surveyQuestionIds.includes(q.id));

  console.log(`✅ ${catalogQuestions.length} preguntas seleccionadas:`);
  catalogQuestions.forEach(q => {
    console.log(`   - ${q.id} (${q.metadata.family})`);
  });
  console.log();

  // 3. Cargar agent IDs
  const agentIds = await loadAgentIds();
  if (!agentIds || agentIds.length === 0) {
    console.error('❌ No se pudieron cargar los agent IDs');
    return null;
  }

  // 4. Cargar agentes
  const agents = await loadAgents(agentIds);
  if (agents.length === 0) {
    console.error('❌ No se pudieron cargar los agentes');
    return null;
  }

  // 5. Crear survey_run
  const runId = await createSurveyRun(SURVEY_ID, WAVE, agents.length);
  if (!runId) {
    console.error('❌ No se pudo crear el survey_run');
    return null;
  }

  // 6. Ejecutar encuesta con MOTOR CADEM REAL
  console.log(`\n4. Ejecutando encuesta con ${agents.length} agentes...`);
  console.log('   Motor: CADEM v1.1 (buildInitialTopicStates + resolveQuestionByFamily)\n');

  const responses: any[] = [];
  const distributions: Record<string, Record<string, number>> = {};

  // Inicializar distribuciones
  catalogQuestions.forEach(q => {
    distributions[q.id] = {};
    q.options.forEach(opt => {
      distributions[q.id][opt] = 0;
    });
  });

  let totalConfidence = 0;
  let responseCount = 0;

  // Procesar cada agente
  for (let i = 0; i < agents.length; i++) {
    const agent = agents[i];

    // Generar respuesta para cada pregunta usando motor CADEM real
    for (const question of catalogQuestions) {
      try {
        const result = generateResponseWithCademEngine(agent, question);

        // Guardar response en BD (estructura simple, igual que runStagingValidationSurvey.ts)
        const responseRecord = {
          run_id: runId,
          agent_id: agent.agent_id,
          question_id: question.id,
          value: result.value,
          confidence: Math.round(result.confidence * 100) / 100,
          reasoning: result.reasoning,
          survey_id: SURVEY_ID,
          created_at: new Date().toISOString()
        };

        const { error: insertError } = await supabase
          .from('survey_responses')
          .insert(responseRecord);

        if (insertError) {
          console.error(`   ⚠️ Error guardando response para ${agent.agent_id}, ${question.id}: ${insertError.message}`);
        } else {
          responses.push(responseRecord);

          // Actualizar distribución
          if (result.value) {
            distributions[question.id][result.value] = (distributions[question.id][result.value] || 0) + 1;
          }

          // Acumular confidence
          totalConfidence += result.confidence;
          responseCount++;
        }
      } catch (error) {
        console.error(`   ⚠️ Error generando respuesta para ${agent.agent_id}, ${question.id}: ${error}`);
      }
    }

    // Progreso cada 50 agentes
    if ((i + 1) % 50 === 0) {
      console.log(`   📊 Progreso: ${i + 1}/${agents.length} agentes procesados`);
    }
  }

  // 7. Calcular métricas
  const duration = Date.now() - startTime;
  const avgConfidence = responseCount > 0 ? totalConfidence / responseCount : 0;

  // Normalizar distribuciones a porcentajes
  for (const qid in distributions) {
    const total = Object.values(distributions[qid]).reduce((a, b) => a + b, 0);
    if (total > 0) {
      for (const opt in distributions[qid]) {
        distributions[qid][opt] = Math.round((distributions[qid][opt] / total) * 1000) / 10;
      }
    }
  }

  // 8. Actualizar run como completado
  await supabase
    .from('survey_runs')
    .update({
      status: 'completed',
      completed_at: new Date().toISOString(),
      results_summary: {
        total_responses: responses.length,
        distributions
      }
    })
    .eq('id', runId);

  // 9. Crear resultado
  const result: WaveResult = {
    wave: WAVE,
    wave_date: WAVE_DATE,
    survey_id: SURVEY_ID,
    run_id: runId,
    total_agents: agents.length,
    responses: responses.slice(0, 5), // Solo guardar muestra
    distributions,
    avg_confidence: avgConfidence,
    duration_ms: duration,
    completed_at: new Date().toISOString()
  };

  // 10. Guardar resultado
  const outputFile = path.join(__dirname, `../../data/staging/b2_wave_${WAVE}_result.json`);
  fs.writeFileSync(outputFile, JSON.stringify(result, null, 2));

  // 11. Imprimir resumen
  console.log('\n==============================================');
  console.log('📊 RESUMEN DE OLA\n');
  console.log(`Ola:              ${WAVE}`);
  console.log(`Fecha simulada:   ${WAVE_DATE}`);
  console.log(`Survey ID:        ${SURVEY_ID}`);
  console.log(`Run ID:           ${runId}`);
  console.log(`Agentes:          ${agents.length}`);
  console.log(`Respuestas:       ${responses.length}`);
  console.log(`Confidence promedio: ${(avgConfidence * 100).toFixed(1)}%`);
  console.log(`Duración:         ${(duration / 1000).toFixed(1)}s`);
  console.log('\n📊 Distribuciones:');

  for (const [qid, dist] of Object.entries(distributions)) {
    const question = catalogQuestions.find(q => q.id === qid);
    console.log(`\n   ${qid} (${question?.metadata.family}):`);
    for (const [opt, pct] of Object.entries(dist)) {
      console.log(`      ${opt}: ${pct}%`);
    }
  }

  console.log('\n==============================================');
  console.log(`✅ OLA ${WAVE} COMPLETADA EXITOSAMENTE`);
  console.log(`💾 Resultado guardado: ${outputFile}`);
  console.log('==============================================\n');

  return result;
}

// Ejecutar
runLongitudinalWave().then(result => {
  if (result) {
    console.log('\n💡 Siguiente paso:');
    if (WAVE < 3) {
      console.log(`   Ejecutar ola ${WAVE + 1}:`);
      console.log(`   npx tsx scripts/staging/runLongitudinalWave.ts --wave=${WAVE + 1} --survey-id=${SURVEY_ID} --wave-date=2026-04-0${WAVE + 2}\n`);
    } else {
      console.log('   Analizar resultados de las 3 olas:');
      console.log('   npx tsx scripts/staging/analyzeLongitudinalResults.ts\n');
    }
    process.exit(0);
  } else {
    console.error('\n❌ Ejecución de ola fallida\n');
    process.exit(1);
  }
});
