/**
 * Script de depuración para ejecutar encuesta CADEM con agentes reales de Supabase
 * Detecta por qué el benchmark devuelve 0% en todas las categorías sintéticas
 * Solo lectura - no modifica datos
 *
 * NOTA: Usa runCademSurvey directamente (sync) para evitar dependencias de Supabase
 * en el motor de opinión.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { runCademSurvey } from '../../src/app/survey/cademAdapter';
import type { CademAdapterAgent, CademSurveyDefinition, AdaptedSurveyResponse } from '../../src/app/survey/cademAdapter';

// Configuración desde variables de entorno (process.env para Node.js)
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';

// Tipos
interface AgentFromDB {
  id: string;
  agent_id: string;
  age: number;
  sex: string;
  region_code: string;
  comuna_code: string;
  education_level: string;
  income_decile: number;
  connectivity_level: string;
  digital_exposure_level?: string;
  preferred_survey_channel?: string;
  agent_type: string;
  poverty_status: string;
  socioeconomic_level?: string;
  occupation_status?: string;
  urbanicity?: string;
  location_lat?: number;
  location_lng?: number;
}

interface DebugResult {
  totalResponses: number;
  uniqueQuestionIds: string[];
  rawResponses: Array<{
    questionId: string;
    value: string | number | string[] | null;
    confidence: number;
    engineMode: string;
    agentId: string;
  }>;
  uniqueValuesByQuestion: Record<string, (string | number | string[] | null)[]>;
}

// Preguntas CADEM
const CADEM_QUESTIONS = [
  {
    id: 'q_approval',
    text: '¿Aprueba o desaprueba la forma como el gobierno está manejando los problemas del país?',
    options: ['Aprueba', 'Desaprueba', 'No responde'],
    periodicity: 'permanent' as const,
  },
  {
    id: 'q_direction',
    text: '¿Cree usted que el país va por el camino correcto o por el camino equivocado?',
    options: ['Buen camino', 'Mal camino', 'No responde'],
    periodicity: 'permanent' as const,
  },
  {
    id: 'q_optimism',
    text: '¿Cree que dentro de un año la situación del país será mejor, igual o peor?',
    options: ['Muy optimista', 'Optimista', 'Pesimista', 'Muy pesimista', 'No responde'],
    periodicity: 'permanent' as const,
  },
  {
    id: 'q_economy_national',
    text: '¿Cómo evalúa la situación económica actual del país?',
    options: ['Muy buena', 'Buena', 'Mala', 'Muy mala', 'No responde'],
    periodicity: 'permanent' as const,
  },
  {
    id: 'q_economy_personal',
    text: '¿Cómo evalúa su situación económica personal actual?',
    options: ['Muy buena', 'Buena', 'Mala', 'Muy mala', 'No responde'],
    periodicity: 'permanent' as const,
  },
];

// Mapear agente de DB a formato CademAdapterAgent
function mapAgentFromDB(dbAgent: AgentFromDB): CademAdapterAgent {
  return {
    agentId: dbAgent.agent_id || dbAgent.id,
    age: dbAgent.age,
    sex: dbAgent.sex,
    educationLevel: dbAgent.education_level,
    incomeDecile: dbAgent.income_decile,
    connectivityLevel: dbAgent.connectivity_level,
    digitalExposure: dbAgent.digital_exposure_level,
    preferredChannel: dbAgent.preferred_survey_channel,
    agentType: dbAgent.agent_type,
    povertyStatus: dbAgent.poverty_status,
    regionCode: dbAgent.region_code,
    communeCode: dbAgent.comuna_code,
  };
}

// Crear definición de encuesta mínima
function createMinimalSurvey(): CademSurveyDefinition {
  return {
    id: 'debug-survey-' + Date.now(),
    title: 'Debug Survey CADEM',
    topic: 'politics',
    questions: CADEM_QUESTIONS,
  };
}

// Cargar agentes desde Supabase
async function loadAgentsFromSupabase(
  supabase: SupabaseClient,
  limit: number = 5
): Promise<AgentFromDB[]> {
  console.log(`\n📥 Cargando ${limit} agentes desde Supabase...`);

  const { data, error } = await supabase
    .from('synthetic_agents')
    .select('*')
    .limit(limit);

  if (error) {
    throw new Error(`Error cargando agentes: ${error.message}`);
  }

  if (!data || data.length === 0) {
    throw new Error('No se encontraron agentes en la base de datos');
  }

  console.log(`✅ Cargados ${data.length} agentes`);
  return data as unknown as AgentFromDB[];
}

// Analizar resultados
function analyzeResults(responses: AdaptedSurveyResponse[], engineMode: string): DebugResult {
  console.log('\n📊 Analizando resultados...');

  const uniqueQuestionIds = Array.from(new Set(responses.map(r => r.questionId)));

  const rawResponses = responses.slice(0, 20).map(r => ({
    questionId: r.questionId,
    value: r.value,
    confidence: r.confidence,
    engineMode: engineMode,
    agentId: r.agentId,
  }));

  const uniqueValuesByQuestion: Record<string, (string | number | string[] | null)[]> = {};

  for (const questionId of uniqueQuestionIds) {
    const questionResponses = responses.filter(r => r.questionId === questionId);
    const uniqueValues = Array.from(new Set(questionResponses.map(r => r.value)));
    uniqueValuesByQuestion[questionId] = uniqueValues;
  }

  return {
    totalResponses: responses.length,
    uniqueQuestionIds,
    rawResponses,
    uniqueValuesByQuestion,
  };
}

// Imprimir resultados de depuración
function printDebugResults(result: DebugResult): void {
  console.log('\n' + '='.repeat(80));
  console.log('RESULTADOS DE DEPURACIÓN');
  console.log('='.repeat(80));

  console.log(`\n📈 Total de respuestas: ${result.totalResponses}`);
  console.log(`📋 QuestionIds únicos: ${result.uniqueQuestionIds.join(', ')}`);

  console.log('\n📝 Primeras 20 respuestas crudas:');
  console.log('-'.repeat(80));
  console.log('| QuestionId | Value      | Confidence | EngineMode | AgentId         |');
  console.log('-'.repeat(80));

  for (const resp of result.rawResponses) {
    const valueStr = String(resp.value ?? 'null').padEnd(10).substring(0, 10);
    const confStr = resp.confidence.toFixed(2).padEnd(10);
    const agentStr = resp.agentId.substring(0, 15).padEnd(15);
    console.log(`| ${resp.questionId.padEnd(10)} | ${valueStr} | ${confStr} | ${resp.engineMode.padEnd(10)} | ${agentStr} |`);
  }
  console.log('-'.repeat(80));

  console.log('\n🔍 Valores únicos por pregunta:');
  for (const [questionId, values] of Object.entries(result.uniqueValuesByQuestion)) {
    console.log(`\n  ${questionId}:`);
    console.log(`    Valores únicos: ${values.length}`);
    console.log(`    Valores: ${values.map(v => `"${v ?? 'null'}"`).join(', ')}`);
  }

  // Verificar si hay valores 0, vacíos o null
  console.log('\n⚠️  Verificación de valores problemáticos:');
  let hasZeroValues = false;
  for (const [questionId, values] of Object.entries(result.uniqueValuesByQuestion)) {
    const hasZero = values.some(v => v === '0' || v === '' || v === null || v === undefined);
    const allNull = values.every(v => v === null || v === undefined);
    if (allNull) {
      console.log(`  ❌ ${questionId}: TODOS los valores son null/undefined`);
      hasZeroValues = true;
    } else if (hasZero) {
      console.log(`  ⚠️  ${questionId}: Contiene valores 0/vacíos/null`);
      hasZeroValues = true;
    } else {
      console.log(`  ✅ ${questionId}: Sin valores problemáticos`);
    }
  }

  if (!hasZeroValues) {
    console.log('\n  ✅ Todas las preguntas tienen valores válidos');
  }

  console.log('\n' + '='.repeat(80));
}

// Función principal
async function main(): Promise<void> {
  console.log('='.repeat(80));
  console.log('DEBUG RUN SURVEY FROM SUPABASE');
  console.log('='.repeat(80));

  // Validar configuración
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error('❌ Error: Variables de entorno SUPABASE_URL y SUPABASE_ANON_KEY requeridas');
    console.error('   Puedes usar SUPABASE_URL o VITE_SUPABASE_URL');
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
    // 1. Cargar 5 agentes reales
    const dbAgents = await loadAgentsFromSupabase(supabase, 5);

    // 2. Mapear al formato CademAdapterAgent
    const agents = dbAgents.map(mapAgentFromDB);

    console.log('\n👤 Agentes cargados:');
    for (const agent of agents) {
      console.log(`  - ${agent.agentId}: ${agent.sex}, ${agent.age} años, ${agent.regionCode}, decil ${agent.incomeDecile}`);
    }

    // 3. Crear encuesta mínima
    const survey = createMinimalSurvey();

    console.log('\n📋 Encuesta creada:');
    console.log(`  ID: ${survey.id}`);
    console.log(`  Preguntas: ${survey.questions.map(q => q.id).join(', ')}`);

    // 4. Ejecutar encuesta con runCademSurvey (sync, sin persistencia)
    console.log('\n🎲 Ejecutando encuesta con motor CADEM (sync)...');
    const startTime = Date.now();

    const rawResponses = runCademSurvey({
      surveyDefinition: survey,
      agents,
      weekKey: 'debug-week',
      mode: 'cawi',
    });

    const durationMs = Date.now() - startTime;

    console.log(`\n✅ Encuesta completada:`);
    console.log(`   - Respuestas: ${rawResponses.length}`);
    console.log(`   - Agentes: ${agents.length}`);
    console.log(`   - Preguntas: ${survey.questions.length}`);
    console.log(`   - Duración: ${durationMs}ms`);

    // 5. Analizar resultados
    const debugResult = analyzeResults(rawResponses, 'cadem');

    // 6. Imprimir resultados
    printDebugResults(debugResult);

    console.log('\n✅ Depuración completada exitosamente');
    console.log('='.repeat(80));

  } catch (error) {
    console.error('\n❌ Error:', error instanceof Error ? error.message : error);
    console.error(error instanceof Error ? error.stack : '');
    process.exit(1);
  }
}

// Ejecutar
main().catch(error => {
  console.error('Error fatal:', error);
  process.exit(1);
});
