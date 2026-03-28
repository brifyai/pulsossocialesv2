/**
 * Script para crear la encuesta B2 Longitudinal Test en Supabase
 * Crea una encuesta con motor CADEM y persistencia activada
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuración
const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Error: Variables de entorno VITE_SUPABASE_URL y VITE_SUPABASE_SERVICE_KEY/VITE_SUPABASE_ANON_KEY son requeridas');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Constantes
const SURVEY_NAME = 'B2 Longitudinal Test - CADEM v4.10';
const CATALOG_FILE = path.join(__dirname, '../../data/surveys/cadem_question_catalog_v1.json');

// Preguntas requeridas para B2
const REQUIRED_QUESTION_IDS = ['q_approval', 'q_optimism', 'q_economy_personal'];

interface QuestionCatalog {
  questions: Array<{
    id: string;
    text: string;
    type: string;
    category: string;
    options?: Array<{
      id: string;
      text: string;
      value?: number;
    }>;
  }>;
}

interface SurveyDefinition {
  name: string;
  slug: string;
  description: string;
  status: string;
  sample_size: number;
  questions: any[];
  segment: any;
  metadata: any;
}

// ============================================================================
// FUNCIONES AUXILIARES
// ============================================================================

function loadQuestionCatalog(): QuestionCatalog | null {
  console.log('1. Cargando catálogo de preguntas...');

  if (!fs.existsSync(CATALOG_FILE)) {
    console.error(`   ❌ Catálogo no encontrado: ${CATALOG_FILE}`);
    return null;
  }

  try {
    const data = JSON.parse(fs.readFileSync(CATALOG_FILE, 'utf-8'));
    console.log(`   ✅ Catálogo cargado: ${data.questions?.length || 0} preguntas`);
    return data;
  } catch (error) {
    console.error(`   ❌ Error al cargar catálogo: ${error}`);
    return null;
  }
}

function extractQuestions(catalog: QuestionCatalog): any[] {
  console.log('\n2. Extrayendo preguntas requeridas...');

  const questions: any[] = [];

  for (const qid of REQUIRED_QUESTION_IDS) {
    const question = catalog.questions?.find(q => q.id === qid);

    if (!question) {
      console.error(`   ❌ Pregunta no encontrada en catálogo: ${qid}`);
      continue;
    }

    questions.push({
      id: question.id,
      text: question.text,
      type: question.type,
      category: question.category,
      options: question.options || []
    });

    console.log(`   ✅ ${qid}: ${question.text.substring(0, 50)}...`);
  }

  console.log(`   📊 Total preguntas extraídas: ${questions.length}`);
  return questions;
}

async function checkExistingSurvey(): Promise<string | null> {
  console.log('\n3. Verificando si ya existe la encuesta...');

  const { data: existing, error } = await supabase
    .from('survey_definitions')
    .select('id, name')
    .eq('name', SURVEY_NAME)
    .maybeSingle();

  if (error) {
    console.error(`   ⚠️ Error al verificar: ${error.message}`);
    return null;
  }

  if (existing) {
    console.log(`   ℹ️ Encuesta ya existe: ${existing.id}`);
    return existing.id;
  }

  console.log('   ✅ No existe, se creará nueva');
  return null;
}

async function createSurvey(questions: any[]): Promise<string | null> {
  console.log('\n4. Creando encuesta en Supabase...');

  const surveyData: SurveyDefinition = {
    name: SURVEY_NAME,
    slug: 'b2-longitudinal-test-cadem-v4-10',
    description: 'Validación longitudinal del motor CADEM calibrado con persistencia activada',
    status: 'draft',
    sample_size: 200,
    questions: questions,
    segment: {
      target_population: 'general_national',
      filters: {},
      stratification: {
        region: true,
        gender: true,
        age_group: true
      }
    },
    metadata: {
      engine_mode: 'cadem',
      persist_state: true,
      engine_version: 'cadem-v1.1',
      baseline_tag: 'cadem-calibrated-v4.10',
      test_type: 'longitudinal',
      staging_run: 'B2',
      created_by: 'createB2LongitudinalSurvey.ts',
      created_at: new Date().toISOString()
    }
  };

  const { data: survey, error } = await supabase
    .from('survey_definitions')
    .insert(surveyData)
    .select('id, name')
    .single();

  if (error || !survey) {
    console.error(`   ❌ Error al crear encuesta: ${error?.message || 'Unknown error'}`);
    return null;
  }

  console.log(`   ✅ Encuesta creada: ${survey.id}`);
  return survey.id;
}

// ============================================================================
// FUNCIÓN PRINCIPAL
// ============================================================================

async function main() {
  console.log('\n📝 CREANDO ENCUESTA B2 LONGITUDINAL TEST\n');
  console.log('==============================================\n');
  console.log(`Nombre: ${SURVEY_NAME}`);
  console.log(`Motor: CADEM v1.1`);
  console.log(`Persistencia: Activada\n`);
  console.log('==============================================\n');

  // 1. Cargar catálogo
  const catalog = loadQuestionCatalog();
  if (!catalog) {
    console.error('\n❌ No se pudo cargar el catálogo de preguntas\n');
    process.exit(1);
  }

  // 2. Extraer preguntas
  const questions = extractQuestions(catalog);
  if (questions.length !== REQUIRED_QUESTION_IDS.length) {
    console.error(`\n❌ No se encontraron todas las preguntas requeridas (${questions.length}/${REQUIRED_QUESTION_IDS.length})\n`);
    process.exit(1);
  }

  // 3. Verificar si ya existe
  const existingId = await checkExistingSurvey();
  if (existingId) {
    console.log('\n==============================================');
    console.log('ℹ️ ENCUESTA YA EXISTE\n');
    console.log(`Survey ID: ${existingId}`);
    console.log(`Nombre: ${SURVEY_NAME}`);
    console.log('\n==============================================');
    console.log('✅ Usar este ID para ejecutar las olas:');
    console.log(`   npx tsx scripts/staging/runLongitudinalWave.ts --wave=1 --survey-id=${existingId}\n`);
    process.exit(0);
  }

  // 4. Crear encuesta
  const surveyId = await createSurvey(questions);
  if (!surveyId) {
    console.error('\n❌ No se pudo crear la encuesta\n');
    process.exit(1);
  }

  // 5. Resumen
  console.log('\n==============================================');
  console.log('📊 RESUMEN DE ENCUESTA CREADA\n');
  console.log(`Survey ID:    ${surveyId}`);
  console.log(`Nombre:       ${SURVEY_NAME}`);
  console.log(`Estado:       draft`);
  console.log(`Sample size:  200`);
  console.log(`Engine mode:  cadem`);
  console.log(`Persistencia: true`);
  console.log(`Preguntas:    ${questions.length}`);
  console.log('\nPreguntas incluidas:');
  questions.forEach((q, i) => {
    console.log(`   ${i + 1}. ${q.id}: ${q.text.substring(0, 60)}...`);
  });

  console.log('\n==============================================');
  console.log('✅ ENCUESTA CREADA EXITOSAMENTE\n');
  console.log('Próximo paso: Exportar agentes del Run 001');
  console.log('   npx tsx scripts/staging/exportRun001AgentIds.ts\n');
  console.log('Luego ejecutar Ola 1:');
  console.log(`   npx tsx scripts/staging/runLongitudinalWave.ts --wave=1 --survey-id=${surveyId} --wave-date=2026-03-27\n`);
  console.log('==============================================\n');

  process.exit(0);
}

main().catch(error => {
  console.error('\n❌ Error inesperado:', error);
  process.exit(1);
});
