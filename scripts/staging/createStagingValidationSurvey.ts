/**
 * Script para crear la encuesta de staging STAGING_VALIDATION_RUN_001
 * Inserta una encuesta en survey_definitions con configuración CADEM
 * Usa el schema real: questions se almacenan como JSON embebido en survey_definitions
 * 
 * 🔒 REQUIERE: SUPABASE_SERVICE_KEY (no permite fallback a ANON_KEY)
 */

import { serviceClient } from '../utils/serviceClient';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Cliente Supabase centralizado (valida entorno automáticamente)
const supabase = serviceClient;

// Configuración de la encuesta de staging
const SURVEY_NAME = 'Staging Test 001 - CADEM Calibrated';
const SURVEY_SLUG = `staging-test-001-cadem-calibrated-${Date.now()}`;

// Preguntas a incluir (usando IDs del catálogo CADEM)
const QUESTION_IDS = [
  'q_approval',
  'q_economy_personal',
  'q_optimism'
];

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
  console.log('📝 Creando encuesta de staging...');
  console.log(`   Nombre: ${SURVEY_NAME}`);
  console.log(`   Slug: ${SURVEY_SLUG}`);
  console.log(`   Sample size: 200`);
  console.log(`   Engine mode: cadem`);
  
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
    description: 'Primera validación operativa del motor CADEM v4.10',
    status: 'draft',
    sample_size: 200,
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
      persist_state: false,
      engine_version: 'cadem-v1.1',
      baseline_tag: 'cadem-calibrated-v4.10',
      staging_run: '001',
      created_for: 'validation',
      question_count: questions.length
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
  console.log('🚀 STAGING VALIDATION RUN 001 - Creación de Encuesta\n');
  
  // Verificar si ya existe
  const existingSurvey = await checkExistingSurvey();
  if (existingSurvey) {
    console.log(`⚠️  La encuesta "${SURVEY_NAME}" ya existe con ID: ${existingSurvey.id}`);
    
    if (existingSurvey.hasQuestions) {
      console.log('   ✓ La encuesta ya tiene preguntas embebidas');
      console.log('   Usando encuesta existente...\n');
      
      // Mostrar información de la encuesta existente
      const { data } = await supabase
        .from('survey_definitions')
        .select('*')
        .eq('id', existingSurvey.id)
        .single();
      
      console.log('📋 Información de la encuesta:');
      console.log(`   ID: ${existingSurvey.id}`);
      console.log(`   Status: ${data?.status}`);
      console.log(`   Sample size: ${data?.sample_size}`);
      console.log(`   Engine mode: ${data?.metadata?.engine_mode}`);
      console.log(`   Engine version: ${data?.metadata?.engine_version}`);
      console.log(`   Preguntas: ${data?.questions?.length || 0}`);
      
      return;
    } else {
      console.log('   ⚠️  La encuesta existe pero NO tiene preguntas embebidas');
      console.log('   Se recreará la encuesta con el schema correcto...\n');
      
      // Eliminar la encuesta existente para recrearla
      const deleted = await deleteSurvey(existingSurvey.id);
      if (!deleted) {
        console.error('❌ No se pudo eliminar la encuesta existente');
        process.exit(1);
      }
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
  
  console.log('📚 Preguntas seleccionadas del catálogo:');
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
  
  console.log('\n🎉 Encuesta de staging creada exitosamente!');
  console.log('\n📋 Resumen:');
  console.log(`   ID: ${surveyId}`);
  console.log(`   Nombre: ${SURVEY_NAME}`);
  console.log(`   Slug: ${SURVEY_SLUG}`);
  console.log(`   Status: draft`);
  console.log(`   Sample size: 200`);
  console.log(`   Engine mode: cadem`);
  console.log(`   Persist state: false`);
  console.log(`   Engine version: cadem-v1.1`);
  console.log(`   Preguntas: ${selectedQuestions.length}`);
  console.log('\n➡️  Próximo paso: Ejecutar la encuesta con runStagingValidationSurvey.ts');
}

main().catch(error => {
  console.error('❌ Error inesperado:', error);
  process.exit(1);
});
