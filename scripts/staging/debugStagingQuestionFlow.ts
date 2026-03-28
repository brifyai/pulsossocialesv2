/**
 * Script de debug para comparar el flujo de preguntas entre benchmark y staging
 * Inspecciona exactamente cómo se interpretan y resuelven las preguntas
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

// Importar motor CADEM real
import { buildInitialTopicStates } from '../../src/app/opinionEngine/topicStateSeed';
import { resolveQuestionByFamily } from '../../src/app/opinionEngine/questionResolver';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuración
const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Error: Variables de entorno requeridas');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const SURVEY_NAME = 'Staging Test 001 - CADEM Calibrated';
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

async function loadCatalog(): Promise<QuestionCatalog> {
  const content = fs.readFileSync(CATALOG_PATH, 'utf-8');
  return JSON.parse(content);
}

async function findSurvey() {
  const { data, error } = await supabase
    .from('survey_definitions')
    .select('id, name, questions, metadata')
    .eq('name', SURVEY_NAME)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();
  
  if (error) {
    console.error('❌ Error:', error.message);
    return null;
  }
  return data;
}

async function loadSampleAgents(count: number = 5) {
  const { data, error } = await supabase
    .from('synthetic_agents')
    .select('*')
    .limit(count);
  
  if (error) {
    console.error('❌ Error cargando agentes:', error.message);
    return [];
  }
  
  return data || [];
}

function transformAgentToCademFormat(agent: any) {
  return {
    agentId: agent.agent_id || agent.id,
    age: agent.age ?? 35,
    sex: agent.sex ?? 'unknown',
    regionCode: agent.region_code ?? 'CL-RM',
    comunaCode: agent.comuna_code ?? 'CL-RM-13101',
    educationLevel: agent.education_level ?? 'secondary',
    incomeDecile: agent.income_decile ?? 5,
    connectivityLevel: agent.connectivity_level ?? 'medium',
    digitalExposure: agent.digital_exposure ?? 'medium',
    preferredChannel: agent.preferred_channel ?? 'mixed',
    agentType: agent.agent_type ?? 'worker',
    povertyStatus: agent.poverty_status ?? 'middle_class',
    occupationStatus: agent.occupation_status ?? 'employed',
    urbanicity: agent.urbanicity ?? 'urban',
  };
}

function generateWithCademEngine(agent: any, catalogQuestion: CatalogQuestion): string {
  const cademAgent = transformAgentToCademFormat(agent);
  
  // Construir topic states
  const topicStates = buildInitialTopicStates({
    age: cademAgent.age,
    sex: cademAgent.sex as any,
    educationLevel: cademAgent.educationLevel,
    incomeDecile: cademAgent.incomeDecile,
    regionCode: cademAgent.regionCode,
    agentType: cademAgent.agentType as any,
    connectivityLevel: cademAgent.connectivityLevel as any,
    povertyStatus: cademAgent.povertyStatus as any,
    digitalExposure: cademAgent.digitalExposure as any,
    preferredChannel: cademAgent.preferredChannel as any,
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

  // Resolver
  const result = resolveQuestionByFamily(interpretedQuestion, topicStates);
  return result.value;
}

function simulateResponse(options: string[]): string {
  // Simulación simplificada (como está en runStagingValidationSurvey.ts)
  const randomIndex = Math.floor(Math.random() * options.length);
  return options[randomIndex];
}

async function main() {
  console.log('🔍 DEBUG: Comparando flujos de preguntas\n');
  console.log('=' .repeat(80));

  // 1. Cargar catálogo y encuesta
  const catalog = await loadCatalog();
  const survey = await findSurvey();
  
  if (!survey) {
    console.error('❌ Encuesta no encontrada');
    process.exit(1);
  }

  console.log('\n📋 ENCUESTA DE STAGING:');
  console.log(`   ID: ${survey.id}`);
  console.log(`   Nombre: ${survey.name}`);
  console.log(`   Preguntas en JSON: ${survey.questions?.length || 0}`);

  console.log('\n📚 CATÁLOGO CANÓNICO:');
  console.log(`   Versión: ${catalog.version}`);
  console.log(`   Preguntas: ${catalog.questions.length}`);

  // 2. Comparar preguntas
  console.log('\n' + '='.repeat(80));
  console.log('COMPARACIÓN DE PREGUNTAS');
  console.log('='.repeat(80));

  for (const stagingQ of survey.questions || []) {
    const catalogQ = catalog.questions.find(q => q.id === stagingQ.key);
    
    console.log(`\n📝 ${stagingQ.key}:`);
    console.log(`   Staging text: ${stagingQ.text?.substring(0, 60)}...`);
    
    if (catalogQ) {
      console.log(`   Catalog text: ${catalogQ.text?.substring(0, 60)}...`);
      console.log(`   Family: ${catalogQ.metadata.family}`);
      console.log(`   Topic: ${catalogQ.metadata.topic}`);
      console.log(`   Options staging: ${stagingQ.options?.join(', ')}`);
      console.log(`   Options catalog: ${catalogQ.options?.join(', ')}`);
      
      // Verificar diferencias
      const stagingOpts = (stagingQ.options || []).sort();
      const catalogOpts = (catalogQ.options || []).sort();
      const optionsMatch = JSON.stringify(stagingOpts) === JSON.stringify(catalogOpts);
      console.log(`   ⚠️ Options match: ${optionsMatch ? '✅' : '❌'}`);
    } else {
      console.log('   ❌ NO ENCONTRADA EN CATÁLOGO');
    }
  }

  // 3. Cargar agentes de muestra
  console.log('\n' + '='.repeat(80));
  console.log('COMPARACIÓN DE RESPUESTAS (5 agentes)');
  console.log('='.repeat(80));

  const agents = await loadSampleAgents(5);
  console.log(`\n👥 Agentes cargados: ${agents.length}`);

  // 4. Para cada pregunta, comparar respuestas
  const questionsToTest = ['q_approval', 'q_optimism', 'q_economy_personal'];
  
  for (const qid of questionsToTest) {
    const catalogQ = catalog.questions.find(q => q.id === qid);
    if (!catalogQ) continue;

    console.log(`\n🎯 ${qid} (${catalogQ.metadata.family}):`);
    console.log(`   Texto: ${catalogQ.text}`);
    console.log(`   Options: ${catalogQ.options.join(', ')}`);
    console.log('\n   Agente | Motor CADEM | Simulación | Match?');
    console.log('   ' + '-'.repeat(50));

    for (let i = 0; i < agents.length; i++) {
      const agent = agents[i];
      
      // Respuesta con motor CADEM real
      const cademResponse = generateWithCademEngine(agent, catalogQ);
      
      // Respuesta con simulación simplificada
      const simResponse = simulateResponse(catalogQ.options);
      
      const match = cademResponse === simResponse ? '✅' : '❌';
      console.log(`   ${i + 1}      | ${cademResponse.padEnd(12)} | ${simResponse.padEnd(10)} | ${match}`);
    }
  }

  // 5. Estadísticas de no_response
  console.log('\n' + '='.repeat(80));
  console.log('ANÁLISIS DE no_response (100 respuestas por pregunta)');
  console.log('='.repeat(80));

  for (const qid of questionsToTest) {
    const catalogQ = catalog.questions.find(q => q.id === qid);
    if (!catalogQ) continue;

    let cademNoResponse = 0;
    let simNoResponse = 0;
    const total = 100;

    for (let i = 0; i < total; i++) {
      // Usar el mismo agente para consistencia
      const agent = agents[i % agents.length];
      
      const cademResp = generateWithCademEngine(agent, catalogQ);
      const simResp = simulateResponse(catalogQ.options);
      
      if (cademResp === 'no_response') cademNoResponse++;
      if (simResp === 'no_response') simNoResponse++;
    }

    console.log(`\n${qid}:`);
    console.log(`   Motor CADEM: ${cademNoResponse}/${total} no_response (${(cademNoResponse/total*100).toFixed(1)}%)`);
    console.log(`   Simulación:  ${simNoResponse}/${total} no_response (${(simNoResponse/total*100).toFixed(1)}%)`);
    
    if (cademNoResponse !== simNoResponse) {
      console.log(`   ⚠️ DIFERENCIA SIGNIFICATIVA`);
    }
  }

  // 6. Resumen de hallazgos
  console.log('\n' + '='.repeat(80));
  console.log('HALLAZGOS CLAVE');
  console.log('='.repeat(80));
  
  console.log('\n1. PROBLEMA PRINCIPAL:');
  console.log('   El staging usa SIMULACIÓN ALEATORIA en lugar del MOTOR CADEM REAL');
  console.log('   -> simulateAgentResponse() selecciona opciones al azar');
  console.log('   -> runBenchmarkComparisonFromSupabase.ts usa generateResponseWithCademEngine()');
  
  console.log('\n2. DIFERENCIAS EN OPCIONES:');
  for (const stagingQ of survey.questions || []) {
    const catalogQ = catalog.questions.find(q => q.id === stagingQ.key);
    if (catalogQ) {
      const stagingOpts = (stagingQ.options || []).sort();
      const catalogOpts = (catalogQ.options || []).sort();
      if (JSON.stringify(stagingOpts) !== JSON.stringify(catalogOpts)) {
        console.log(`   ❌ ${stagingQ.key}: opciones diferentes`);
        console.log(`      Staging: ${stagingOpts.join(', ')}`);
        console.log(`      Catalog: ${catalogOpts.join(', ')}`);
      }
    }
  }
  
  console.log('\n3. RECOMENDACIÓN:');
  console.log('   Refactorizar runStagingValidationSurvey.ts para usar:');
  console.log('   - buildInitialTopicStates() del agente');
  console.log('   - resolveQuestionByFamily() del catálogo canónico');
  console.log('   - Mismo flujo que runBenchmarkComparisonFromSupabase.ts');

  console.log('\n' + '='.repeat(80));
}

main().catch(console.error);
