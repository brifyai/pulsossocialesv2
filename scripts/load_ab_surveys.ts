/**
 * Script para cargar las encuestas A/B de comparación de motores
 * Uso: npx tsx scripts/load_ab_surveys.ts
 */
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'http://localhost:54321';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';

const supabase = createClient(supabaseUrl, supabaseKey);

interface SurveyDefinition {
  title: string;
  description: string;
  engine_mode: 'legacy' | 'cadem';
  persist_state: boolean;
  status: 'draft' | 'active' | 'completed' | 'archived';
  target_audience: {
    segment: string;
    ageRange: number[];
    regions: string[];
    gender: string[];
  };
  sample_size: number;
  questions: unknown[];
  metadata: Record<string, unknown>;
}

async function loadSurvey(filePath: string): Promise<void> {
  const content = fs.readFileSync(filePath, 'utf-8');
  const survey = JSON.parse(content);

  const surveyDef: SurveyDefinition = {
    title: survey.title,
    description: survey.description,
    engine_mode: survey.engineMode,
    persist_state: survey.persistState,
    status: survey.status,
    target_audience: survey.targetAudience,
    sample_size: survey.sampleSize,
    questions: survey.questions,
    metadata: survey.metadata,
  };

  const { data, error } = await supabase
    .from('survey_definitions')
    .insert(surveyDef)
    .select()
    .single();

  if (error) {
    console.error(`Error cargando ${path.basename(filePath)}:`, error);
    return;
  }

  console.log(`✅ Encuesta cargada: ${survey.title} (ID: ${data.id})`);
}

async function main() {
  const surveysDir = path.join(__dirname, '..', 'data', 'surveys');

  try {
    // Cargar Encuesta A (Legacy)
    await loadSurvey(path.join(surveysDir, 'encuesta_a_legacy.json'));

    // Cargar Encuesta B (CADEM)
    await loadSurvey(path.join(surveysDir, 'encuesta_b_cadem.json'));

    console.log('\n🎉 Ambas encuestas A/B cargadas exitosamente');
    console.log('\nPara ejecutar la comparación:');
    console.log('  1. Activa Encuesta A desde el panel de administración');
    console.log('  2. Ejecuta con 300 agentes');
    console.log('  3. Guarda resultados');
    console.log('  4. Activa Encuesta B y repite');
    console.log('  5. Compara métricas entre ambas');
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

main();
