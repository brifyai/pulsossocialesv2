/**
 * Script para crear la encuesta de Fase 3 v1.2 con Eventos Habilitados
 * Inserta una encuesta en survey_definitions con configuración CADEM v1.2
 * Usa el schema real: questions se almacenan como JSON embebido en survey_definitions
 * 
 * Fase 3 v1.2: 100-200 agentes, eventos habilitados, persistencia activada
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Cargar variables de entorno
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Error: Variables de entorno VITE_SUPABASE_URL y VITE_SUPABASE_SERVICE_KEY/VITE_SUPABASE_ANON_KEY son requeridas');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Configuración de la encuesta de Fase 3 v1.2
const SURVEY_NAME = 'Fase 3 v1.2 - Activación Eventos';
const SURVEY_SLUG = `fase-3-v12-eventos-${Date.now()}`;

// Preguntas a incluir (usando IDs del catálogo CADEM)
// Fase 3 v1.2: Mismas 3 preguntas que Fases 1-3 v1.1 para mantener comparabilidad
const QUESTION_IDS = [
  'q_approval',
  'q_economy_personal',
  'q_optimism'
];

// Parsear argumentos de línea de comandos
const args = process.argv.slice(2);
const useEvents = args.includes('--use-events=true') || args.includes('--use-events');
const eventWeekKey = args.find(arg => arg.startsWith('--event-week-key='))?.split('=')[1] || '2026-W13';
const persistState = args.includes('--persist-state=true') || args.includes('--persist-state');

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
  console.log('📝 Creando encuesta de Fase 3 v1.2...');
  console.log(`   Nombre: ${SURVEY_NAME}`);
  console.log(`   Slug: ${SURVEY_SLUG}`);
  console.log(`   Sample size: 100-200 (conservador para primera prueba)`);
  console.log(`   Engine mode: cadem`);
  console.log(`   Engine version: cadem-v1.2`);
  console.log(`   Use events: ${useEvents}`);
  console.log(`   Event week key: ${eventWeekKey}`);
  console.log(`   Persist state: ${persistState}`);

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
    description: 'Fase 3 v1.2 - Primera activación controlada de eventos con 100-200 agentes',
    status: 'draft',
    sample_size: 100, // Conservador para primera prueba
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
      persist_state: persistState,
      use_events: useEvents,
      event_week_key: eventWeekKey,
      engine_version: 'cadem-v1.2',
      baseline_tag: 'fase-3-v12-events-activation',
      rollout_phase: '3-v1.2',
      created_for: 'rollout-events-v1.2',
      question_count: questions.length,
      sample_method: 'cadem_quotas',
      previous_phase: '3-v1.1',
      phase_comparison: 'same_questions_as_fase_1_2_3_v1.1',
      performance_note: 'Expected ~2-4 min execution time for 100 agents',
      monitoring: 'intensive'
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
  console.log('🚀 FASE 3 v1.2 ROLLOUT - Creación de Encuesta con Eventos\n');
  console.log('   Activación controlada de eventos');
  console.log('   Sample size: 100-200 agentes (conservador)');
  console.log('   Mismas 3 preguntas que Fases 1-3 v1.1');
  console.log('   Eventos habilitados: true');
  console.log('   Persistencia: true');
  console.log('   Event week key: 2026-W13\n');
  console.log('   ⚠️  NOTA: Tiempo esperado ~2-4 minutos para 100 agentes\n');

  // Verificar si ya existe
  const existingSurvey = await checkExistingSurvey();
  if (existingSurvey) {
    console.log(`⚠️  La encuesta "${SURVEY_NAME}" ya existe con ID: ${existingSurvey.id}`);
    console.log('   Se recreará la encuesta con configuración actualizada...\n');

    // Eliminar la encuesta existente para recrearla
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

  console.log('📚 Preguntas seleccionadas del catálogo (mismas que Fases 1-3 v1.1):');
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

  console.log('\n🎉 Encuesta de Fase 3 v1.2 creada exitosamente!');
  console.log('\n📋 Resumen:');
  console.log(`   ID: ${surveyId}`);
  console.log(`   Nombre: ${SURVEY_NAME}`);
  console.log(`   Slug: ${SURVEY_SLUG}`);
  console.log(`   Status: draft`);
  console.log(`   Sample size: 100 (conservador)`);
  console.log(`   Engine mode: cadem`);
  console.log(`   Engine version: cadem-v1.2`);
  console.log(`   Use events: ${useEvents}`);
  console.log(`   Event week key: ${eventWeekKey}`);
  console.log(`   Persist state: ${persistState}`);
  console.log(`   Preguntas: ${selectedQuestions.length}`);
  console.log(`   Sample method: cadem_quotas`);
  console.log(`   Fase anterior: 3-v1.1 (comparabilidad mantenida)`);
  console.log(`   Tiempo esperado: ~2-4 minutos para 100 agentes`);
  console.log('\n➡️  Próximo paso: Ejecutar la encuesta con:');
  console.log(`   npx tsx scripts/rollout/runPhase3Controlled.ts --survey-id=${surveyId} --sample-size=100 --use-events=true --event-week-key=${eventWeekKey} --persist-state=true --monitoring=intensive`);
  console.log('\n⚠️  ADVERTENCIA: Esta es la primera activación de eventos en entorno controlado.');
  console.log('   Mantener sample size conservador (100) y monitoreo intensivo.');
}

main().catch(error => {
  console.error('❌ Error inesperado:', error);
  process.exit(1);
});
