import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSurveyResponses() {
  console.log('🔍 Verificando respuestas en survey_responses...\n');

  // Verificar respuestas del run_id de la ola 1
  const runId = '7138fb03-25d2-4261-816a-c7493be3ae5d';

  const { data, error, count } = await supabase
    .from('survey_responses')
    .select('*', { count: 'exact' })
    .eq('run_id', runId);

  if (error) {
    console.log('❌ Error:', error.message);
    return;
  }

  console.log(`✅ Total de respuestas guardadas: ${count}`);
  console.log(`   Run ID: ${runId}\n`);

  if (!data || data.length === 0) {
    console.log('⚠️ No se encontraron respuestas para este run_id');
    return;
  }

  // Agrupar por pregunta
  const byQuestion: Record<string, Record<string, number>> = {};
  data.forEach((r: any) => {
    if (!byQuestion[r.question_id]) byQuestion[r.question_id] = {};
    if (!byQuestion[r.question_id][r.value]) byQuestion[r.question_id][r.value] = 0;
    byQuestion[r.question_id][r.value]++;
  });

  console.log('📊 Distribución por pregunta:');
  console.log(JSON.stringify(byQuestion, null, 2));

  // Verificar estructura de una respuesta
  console.log('\n📋 Muestra de respuesta (primera):');
  console.log(JSON.stringify(data[0], null, 2));
}

checkSurveyResponses().catch(console.error);
