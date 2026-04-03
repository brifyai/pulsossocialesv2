/**
 * Script para actualizar el status de las encuestas de producción
 * Cambia el status de 'draft' a 'active' para que sean visibles en el frontend
 */

import { createClient } from '@supabase/supabase-js';
import './utils/loadEnv.ts';

const supabaseUrl = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error('❌ Missing required environment variables');
  process.exit(1);
}

// Lista de encuestas que deben estar activas (basado en el análisis)
const surveysToActivate = [
  'Fase 3 v1.2 - Activación Eventos',
  'Fase 2.5 - Activación Eventos (100 agentes)',
  'Fase 3 - Escalamiento Final v1.1',
  'Fase 2 - Escalamiento Controlado v1.1',
  'Fase 1 - Rollout Controlado v1.1',
  'B2 Longitudinal Test - CADEM v4.10',
  'Staging Test 001 - CADEM Calibrated',
  'Tracking Político-Económico v1 - CADEM',
  'Tracking Político-Económico v1 - Legacy',
];

async function fixSurveyStatus() {
  console.log('🔧 Fixing survey status from draft to active...\n');

  const serviceClient = createClient(supabaseUrl, serviceKey);

  // Obtener todas las encuestas en draft
  const { data: draftSurveys, error: fetchError } = await serviceClient
    .from('survey_definitions')
    .select('id, name, status')
    .eq('status', 'draft')
    .is('deleted_at', null);

  if (fetchError) {
    console.error('❌ Error fetching surveys:', fetchError.message);
    process.exit(1);
  }

  console.log(`Found ${draftSurveys?.length || 0} surveys in draft status:`);
  draftSurveys?.forEach((s: any) => {
    const shouldActivate = surveysToActivate.some(name => s.name.includes(name) || name.includes(s.name));
    console.log(`   - ${s.name} ${shouldActivate ? '(will activate)' : '(will keep draft)'}`);
  });

  // Actualizar cada encuesta
  let activatedCount = 0;
  let skippedCount = 0;

  for (const survey of draftSurveys || []) {
    // Verificar si esta encuesta debe ser activada
    const shouldActivate = surveysToActivate.some(name =>
      survey.name.includes(name) || name.includes(survey.name)
    );

    if (shouldActivate) {
      console.log(`\n📝 Activating: ${survey.name}`);

      const { error: updateError } = await serviceClient
        .from('survey_definitions')
        .update({ status: 'active', updated_at: new Date().toISOString() })
        .eq('id', survey.id);

      if (updateError) {
        console.error(`   ❌ Failed: ${updateError.message}`);
      } else {
        console.log('   ✅ Activated successfully');
        activatedCount++;
      }
    } else {
      console.log(`\n⏭️  Skipping: ${survey.name} (keeping draft)`);
      skippedCount++;
    }
  }

  console.log('\n' + '='.repeat(50));
  console.log('📊 Summary:');
  console.log(`   Activated: ${activatedCount}`);
  console.log(`   Skipped: ${skippedCount}`);
  console.log(`   Total processed: ${draftSurveys?.length || 0}`);

  // Verificar el resultado final
  console.log('\n🔍 Verifying final state...');
  const { data: finalSurveys, error: finalError } = await serviceClient
    .from('survey_definitions')
    .select('id, name, status')
    .is('deleted_at', null)
    .order('created_at', { ascending: false });

  if (finalError) {
    console.error('❌ Error verifying:', finalError.message);
  } else {
    const activeCount = finalSurveys?.filter((s: any) => s.status === 'active').length || 0;
    const draftCount = finalSurveys?.filter((s: any) => s.status === 'draft').length || 0;

    console.log(`\nFinal state:`);
    console.log(`   Active surveys: ${activeCount}`);
    console.log(`   Draft surveys: ${draftCount}`);
    console.log(`   Total: ${finalSurveys?.length || 0}`);

    console.log('\n✅ Surveys should now be visible in the frontend!');
    console.log('   Refresh the page to see all surveys.');
  }
}

fixSurveyStatus().catch(console.error);
