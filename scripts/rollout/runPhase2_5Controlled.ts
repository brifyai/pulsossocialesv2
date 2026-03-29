/**
 * Script de ejecución para Fase 2.5 - Activación Controlada de Eventos
 * Ejecuta encuesta con 100 agentes, eventos habilitados, monitoreo intensivo
 * 
 * Fase 2.5: Puente entre Fase 2 (500 agentes sin eventos) y Fase 3 (500 agentes con eventos)
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Cargar variables de entorno desde archivo .env
function loadEnvFile() {
  const envPath = path.join(__dirname, '../../.env');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf-8');
    const lines = envContent.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const [key, ...valueParts] = trimmed.split('=');
        if (key && valueParts.length > 0) {
          const value = valueParts.join('=').trim();
          // Remover comillas si existen
          const cleanValue = value.replace(/^["']|["']$/g, '');
          if (!process.env[key]) {
            process.env[key] = cleanValue;
          }
        }
      }
    }
  }
}

// Cargar .env antes de cualquier otra operación
loadEnvFile();

// Cargar variables de entorno
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Error: Variables de entorno VITE_SUPABASE_URL y VITE_SUPABASE_SERVICE_KEY/VITE_SUPABASE_ANON_KEY son requeridas');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Parsear argumentos
const args = process.argv.slice(2);
const surveyId = args.find(arg => arg.startsWith('--survey-id='))?.split('=')[1];
const sampleSize = parseInt(args.find(arg => arg.startsWith('--sample-size='))?.split('=')[1] || '100');
const eventWeekKey = args.find(arg => arg.startsWith('--event-week-key='))?.split('=')[1] || '2026-W13';

// Importar dinámicamente los módulos del motor CADEM
async function loadSurveyRunner() {
  const { runSurvey } = await import('../../src/app/survey/surveyRunner.ts');
  return { runSurvey };
}

interface SurveyResult {
  surveyId: string;
  responses: any[];
  summary: {
    totalAgents: number;
    completed: number;
    errors: number;
    noResponse: number;
    completionRate: number;
    errorRate: number;
    noResponseRate: number;
    avgConfidence: number;
    duration: number;
  };
}

async function fetchSurveyDefinition(surveyId: string): Promise<any | null> {
  console.log(`📥 Cargando definición de encuesta ${surveyId}...`);

  const { data, error } = await supabase
    .from('survey_definitions')
    .select('*')
    .eq('id', surveyId)
    .single();

  if (error) {
    console.error('❌ Error al cargar encuesta:', error.message);
    return null;
  }

  if (!data) {
    console.error('❌ Encuesta no encontrada');
    return null;
  }

  console.log('   ✓ Encuesta cargada:', data.name);
  return data;
}

async function fetchRandomAgents(count: number): Promise<any[]> {
  console.log(`\n📥 Obteniendo ${count} agentes aleatorios de Supabase...`);

  const { data: agents, error } = await supabase
    .from('synthetic_agents')
    .select('*')
    .limit(count);

  if (error) {
    console.error('❌ Error al obtener agentes:', error.message);
    throw error;
  }

  if (!agents || agents.length === 0) {
    throw new Error('No se encontraron agentes en la base de datos');
  }

  console.log(`   ✓ Obtenidos ${agents.length} agentes`);
  return agents;
}

/**
 * Convierte agentes de Supabase al formato CademAdapterAgent
 */
function toCademAdapterAgents(agents: any[]): any[] {
  return agents.map(agent => ({
    agentId: agent.agent_id,
    age: agent.age,
    sex: agent.sex,
    educationLevel: agent.education_level,
    incomeDecile: agent.income_decile,
    povertyStatus: agent.poverty_status,
    regionCode: agent.region_code,
    communeCode: agent.comuna_code,
    connectivityLevel: agent.connectivity_level,
    digitalExposure: agent.digital_exposure_level,
    preferredChannel: agent.preferred_survey_channel,
    agentType: agent.agent_type,
  }));
}

async function executeSurvey(
  surveyDef: any,
  agents: any[],
  eventWeekKey: string
): Promise<SurveyResult> {
  console.log('\n🚀 Ejecutando encuesta con eventos habilitados...');
  console.log(`   Survey ID: ${surveyDef.id}`);
  console.log(`   Agentes: ${agents.length}`);
  console.log(`   Event week key: ${eventWeekKey}`);
  console.log(`   Use events: true`);
  console.log(`   Persist state: true`);

  const startTime = Date.now();

  // Cargar módulos dinámicamente
  const { runSurvey } = await loadSurveyRunner();

  // Convertir agentes al formato esperado
  const adapterAgents = toCademAdapterAgents(agents);

  // Preparar definición de encuesta para el motor
  const cademSurvey = {
    id: surveyDef.id,
    name: surveyDef.name,
    questions: surveyDef.questions || [],
    metadata: surveyDef.metadata || {}
  };

  // Ejecutar encuesta CON eventos
  const result = await runSurvey({
    surveyDefinition: cademSurvey,
    agents: adapterAgents,
    engineMode: 'cadem',
    persistState: true,
    weekKey: eventWeekKey,
    useEvents: true,
    eventWindowSize: 2,
    debug: true
  });

  const duration = Date.now() - startTime;

  // Calcular métricas
  const totalAgents = agents.length;
  const completed = result.responses?.filter((r: any) => r.value !== null).length || 0;
  const errors = result.responses?.filter((r: any) => r.value === null && r.confidence === 0).length || 0;
  const noResponse = result.responses?.filter((r: any) => r.value === null && r.confidence > 0).length || 0;
  
  const completionRate = (completed / (totalAgents * (surveyDef.questions?.length || 1))) * 100;
  const errorRate = (errors / (totalAgents * (surveyDef.questions?.length || 1))) * 100;
  const noResponseRate = (noResponse / (totalAgents * (surveyDef.questions?.length || 1))) * 100;
  
  const avgConfidence = result.responses
    ?.filter((r: any) => r.confidence > 0)
    .reduce((sum: number, r: any) => sum + r.confidence, 0) / (completed || 1) || 0;

  return {
    surveyId: surveyDef.id,
    responses: result.responses || [],
    summary: {
      totalAgents,
      completed,
      errors,
      noResponse,
      completionRate,
      errorRate,
      noResponseRate,
      avgConfidence,
      duration
    }
  };
}

async function saveResults(result: SurveyResult) {
  const timestamp = Date.now();
  const resultPath = path.join(__dirname, `../../data/rollout/phase2_5_result_${result.surveyId}_${timestamp}.json`);

  // Asegurar que el directorio existe
  const dir = path.dirname(resultPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  fs.writeFileSync(resultPath, JSON.stringify(result, null, 2));
  console.log(`\n💾 Resultados guardados en: ${resultPath}`);

  return resultPath;
}

function printResults(result: SurveyResult) {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║  RESULTADOS FASE 2.5 - ACTIVACIÓN DE EVENTOS              ║');
  console.log('╚════════════════════════════════════════════════════════════╝');

  console.log('\n📊 Métricas Principales:');
  console.log(`   Total agentes: ${result.summary.totalAgents}`);
  console.log(`   Completados: ${result.summary.completed} (${result.summary.completionRate.toFixed(1)}%)`);
  console.log(`   Errores: ${result.summary.errors} (${result.summary.errorRate.toFixed(1)}%)`);
  console.log(`   Sin respuesta: ${result.summary.noResponse} (${result.summary.noResponseRate.toFixed(1)}%)`);
  console.log(`   Confidence promedio: ${result.summary.avgConfidence.toFixed(2)}`);
  console.log(`   Duración: ${(result.summary.duration / 1000).toFixed(1)}s`);

  // Criterios de aprobación
  console.log('\n📋 Criterios de Aprobación Fase 2.5:');
  const checks = [
    { name: 'Completion rate > 95%', pass: result.summary.completionRate > 95 },
    { name: 'Error rate < 2%', pass: result.summary.errorRate < 2 },
    { name: 'No response < 5%', pass: result.summary.noResponseRate < 5 },
    { name: 'Confidence > 75%', pass: result.summary.avgConfidence > 0.75 }
  ];

  checks.forEach(check => {
    const status = check.pass ? '✅' : '❌';
    console.log(`   ${status} ${check.name}`);
  });

  const allPassed = checks.every(c => c.pass);
  
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  if (allPassed) {
    console.log('║  ✅ FASE 2.5 APROBADA                                      ║');
    console.log('║  Sistema de eventos validado. Listo para Fase 3.          ║');
  } else {
    console.log('║  ⚠️  FASE 2.5 REQUIERE REVISIÓN                            ║');
    console.log('║  Algunos criterios no se cumplieron. Revisar logs.        ║');
  }
  console.log('╚════════════════════════════════════════════════════════════╝');

  return allPassed;
}

async function main() {
  console.log('🚀 FASE 2.5 ROLLOUT - Ejecución con Eventos\n');
  console.log('   Sample size: 100 agentes');
  console.log('   Eventos habilitados: true');
  console.log('   Monitoreo: intensivo\n');

  if (!surveyId) {
    console.error('❌ Error: Se requiere --survey-id');
    console.log('   Uso: npx tsx scripts/rollout/runPhase2_5Controlled.ts --survey-id=<ID> [--sample-size=100]');
    process.exit(1);
  }

  try {
    // 1. Cargar definición de encuesta
    const surveyDef = await fetchSurveyDefinition(surveyId);
    if (!surveyDef) {
      process.exit(1);
    }

    // 2. Obtener agentes
    const agents = await fetchRandomAgents(sampleSize);

    // 3. Ejecutar encuesta
    const result = await executeSurvey(surveyDef, agents, eventWeekKey);

    // 4. Guardar resultados
    const resultPath = await saveResults(result);

    // 5. Imprimir resultados
    const approved = printResults(result);

    console.log('\n📁 Archivos generados:');
    console.log(`   Resultados: ${resultPath}`);

    if (approved) {
      console.log('\n🎉 Fase 2.5 completada exitosamente!');
      console.log('   Próximo paso: Fase 3 con 500 agentes y eventos');
      process.exit(0);
    } else {
      console.log('\n⚠️  Fase 2.5 requiere revisión antes de continuar a Fase 3');
      process.exit(1);
    }

  } catch (error) {
    console.error('\n❌ Error en ejecución:', error);
    process.exit(1);
  }
}

main();
