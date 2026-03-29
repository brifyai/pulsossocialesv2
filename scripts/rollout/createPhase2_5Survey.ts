/**
 * Script para crear la encuesta de Fase 2.5 - Activación Controlada de Eventos
 * Inserta una encuesta en survey_definitions con configuración CADEM v1.2
 * 
 * Fase 2.5: 100 agentes, eventos habilitados, persistencia activada
 * Propósito: Validar sistema de eventos antes de escalar a 500 agentes (Fase 3)
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
          const cleanValue = value.replace(/^["']|["']$/g, '');
          if (!process.env[key]) {
            process.env[key] = cleanValue;
          }
        }
      }
    }
  }
}

loadEnvFile();

// Cargar variables de entorno
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Error: Variables de entorno VITE_SUPABASE_URL y VITE_SUPABASE_SERVICE_KEY/VITE_SUPABASE_ANON_KEY son requeridas');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Configuración de la encuesta de Fase 2.5
const SURVEY_NAME = 'Fase 2.5 - Activación Eventos (100 agentes)';
const SURVEY_SLUG = `fase-2-5-eventos-${Date.now()}`;

// Preguntas a incluir (mismas 3 preguntas que Fases 1-2 para mantener comparabilidad)
const QUESTION_IDS = [
  'q_approval',
  'q_economy_personal',
  'q_optimism'
];

// Parsear argumentos de línea de comandos
const args = process.argv.slice(2);
const eventWeekKey = args.find(arg => arg.startsWith('--event-week-key='))?.split('=')[1] || '2026-W13';

async function loadQuestionCatalog(): Promise<any[]> {
  const catalogPath = path.join(__dirname, '../../data/surveys/cadem_question_catalog_v1.json');

  if (!fs.existsSync(catalogPath)) {
    console.error(`❌ Error: No se encontró el catálogo de preguntas en ${catalogPath}`);
    process.exit(1);
  }

  const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf-8'));
  return catalog.questions || catalog;
}

async function checkExistingSurvey(): Promise<{ id: string; hasQuestions: boolean } | null> {
  const { data, error } = await supabase
    .from('survey_definitions')
    .select('id, name, questions')
    .eq('name', SURVEY_NAME)
    .maybeSingle();

  if (error) {
    console.error('❌ Error al verificar encuesta existente:', error.message);
    return null;
  }

  if (!data) return null;

  return {
    id: data.id,
    hasQuestions: data.questions && Array.isArray(data.questions) && data.questions.length > 0
  };
}

async function deleteSurvey(surveyId: string): Promise<boolean> {
  console.log(`🗑️  Eliminando encuesta existente ${surveyId}...`);

  const { error } = await supabase
    .from('survey_definitions')
    .delete()
    .eq('id', surveyId);

  if (error) {
    console.error('❌ Error al eliminar encuesta:', error.message);
    return false;
  }

  console.log('   ✓ Encuesta eliminada');
  return true;
}

async function createSurveyWithQuestions(questions: any[]): Promise<string | null> {
  console.log('📝 Creando encuesta de Fase 2.5...');
  console.log(`   Nombre: ${SURVEY_NAME}`);
  console.log(`   Slug: ${SURVEY_SLUG}`);
  console.log(`   Sample size: 100 (conservador para primera prueba con eventos)`);
  console.log(`   Engine mode: cadem`);
  console.log(`   Engine version: cadem-v1.2`);
  console.log(`   Use events: true`);
  console.log(`   Event week key: ${eventWeekKey}`);
  console.log(`   Persist state: true`);

  // Preparar las preguntas en formato JSON embebido
  const embeddedQuestions = questions.map((q, index) => ({
    id: q.id,
    key: q.id,
    text: q.text,
    type: q.type || 'single_choice',
    options: q.options || [],
    order_index: index,
    category: q.category,
    benchmark_target: q.benchmark_target,
    canonical: q.canonical
  }));

  const surveyData = {
    name: SURVEY_NAME,
    slug: SURVEY_SLUG,
    description: 'Fase 2.5 - Primera activación controlada de eventos con 100 agentes (puente entre Fase 2 y Fase 3)',
    status: 'draft',
    sample_size: 100,
    questions: embeddedQuestions,
    segment: {
      type: 'national',
      filters: {},
      quotas: {
        enabled: true,
        type: 'cadem',
        variables: ['region', 'age_group', 'sex', 'education_level']
      }
    },
    metadata: {
      engine_mode: 'cadem',
      persist_state: true,
      use_events: true,
      event_week_key: eventWeekKey,
      engine_version: 'cadem-v1.2',
      baseline_tag: 'fase-2-5-events-activation',
      rollout_phase: '2.5',
      created_for: 'rollout-events-v1.2',
      question_count: questions.length,
      sample_method: 'cadem_quotas',
      previous_phase: '2',
      next_phase: '3',
      phase_comparison: 'same_questions_as_fase_1_2',
      performance_note: 'Expected ~2-3 min execution time for 100 agents',
      monitoring: 'intensive',
      purpose: 'Validate event system before scaling to 500 agents'
    }
  };

  const { data, error } = await supabase
    .from('survey_definitions')
    .insert(surveyData)
    .select('id')
    .single();

  if (error) {
    console.error('❌ Error al crear encuesta:', error.message);
    return null;
  }

  return data.id;
}

async function main() {
  console.log('🚀 FASE 2.5 ROLLOUT - Creación de Encuesta con Eventos\n');
  console.log('   Fase intermedia: 100 agentes con eventos activados');
  console.log('   Propósito: Validar sistema de eventos antes de escalar a 500 agentes');
  console.log('   Sample size: 100 agentes (conservador)');
  console.log('   Engine mode: cadem');
  console.log('   Engine version: cadem-v1.2');
  console.log('   Eventos habilitados: true');
  console.log('   Persistencia: true');
  console.log('   Event week key: 2026-W13\n');
  console.log('   ⚠️  NOTA: Tiempo esperado ~2-3 minutos para 100 agentes\n');

  // Verificar si ya existe
  const existingSurvey = await checkExistingSurvey();
  if (existingSurvey) {
    console.log(`⚠️  La encuesta "${SURVEY_NAME}" ya existe con ID: ${existingSurvey.id}`);
    console.log('   Se recreará la encuesta con configuración actualizada...\n');

    const deleted = await deleteSurvey(existingSurvey.id);
    if (!deleted) {
      console.error('❌ No se pudo eliminar la encuesta existente');
      process.exit(1);
    }
  }

  // Cargar catálogo de preguntas
  const catalog = await loadQuestionCatalog();
  const selectedQuestions = catalog.filter(q => QUESTION_IDS.includes(q.id));

  if (selectedQuestions.length !== QUESTION_IDS.length) {
    console.error('❌ Error: No se encontraron todas las preguntas en el catálogo');
    console.log('   Preguntas buscadas:', QUESTION_IDS);
    console.log('   Preguntas encontradas:', selectedQuestions.map(q => q.id));
    process.exit(1);
  }

  console.log('📚 Preguntas seleccionadas del catálogo (mismas que Fases 1-2):');
  selectedQuestions.forEach(q => {
    console.log(`   - ${q.id}: ${q.text.substring(0, 60)}...`);
  });
  console.log();

  // Crear encuesta con preguntas embebidas
  const surveyId = await createSurveyWithQuestions(selectedQuestions);
  if (!surveyId) {
    process.exit(1);
  }

  console.log(`✅ Encuesta creada con ID: ${surveyId}`);
  console.log(`   ✓ ${selectedQuestions.length} preguntas embebidas en survey_definitions.questions`);

  console.log('\n🎉 Encuesta de Fase 2.5 creada exitosamente!');
  console.log('\n📋 Resumen:');
  console.log(`   ID: ${surveyId}`);
  console.log(`   Nombre: ${SURVEY_NAME}`);
  console.log(`   Slug: ${SURVEY_SLUG}`);
  console.log(`   Status: draft`);
  console.log(`   Sample size: 100`);
  console.log(`   Engine mode: cadem`);
  console.log(`   Engine version: cadem-v1.2`);
  console.log(`   Use events: true`);
  console.log(`   Event week key: ${eventWeekKey}`);
  console.log(`   Persist state: true`);
  console.log(`   Preguntas: ${selectedQuestions.length}`);
  console.log(`   Sample method: cadem_quotas`);
  console.log(`   Fase anterior: 2 (500 agentes, sin eventos)`);
  console.log(`   Fase siguiente: 3 (500 agentes, con eventos)`);
  console.log(`   Tiempo esperado: ~2-3 minutos para 100 agentes`);
  console.log('\n➡️  Próximo paso: Ejecutar la encuesta con:');
  console.log(`   npx tsx scripts/rollout/runPhase2_5Controlled.ts --survey-id=${surveyId} --sample-size=100`);
  console.log('\n⚠️  ADVERTENCIA: Esta es la primera activación de eventos en entorno controlado.');
  console.log('   Se monitoreará intensivamente: completion rate, error rate, confidence,');
  console.log('   no_response, event_impact_logs, y duración total.');
}

main().catch(error => {
  console.error('❌ Error inesperado:', error);
  process.exit(1);
});
