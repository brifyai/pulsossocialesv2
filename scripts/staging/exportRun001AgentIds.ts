/**
 * Script para exportar los agent_id usados en Staging Validation Run 001
 * Paso 1 del B2 Longitudinal Test
 *
 * Exporta los agentes del último survey_run de "Staging Test 001 - CADEM Calibrated"
 * para usarlos en las olas longitudinales.
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

const SURVEY_NAME = 'Staging Test 001 - CADEM Calibrated';
const OUTPUT_FILE = path.join(__dirname, '../../data/staging/agents_run_001_ids.json');

interface ExportResult {
  survey_id: string;
  run_id: string;
  total_agents: number;
  unique_agents: number;
  agent_ids: string[];
  exported_at: string;
}

async function exportRun001AgentIds(): Promise<ExportResult | null> {
  console.log('🔍 Exportando agentes del Staging Validation Run 001\n');
  console.log('==============================================\n');

  try {
    // 1. Buscar la encuesta por título
    console.log(`1. Buscando encuesta: "${SURVEY_NAME}"...`);
    // Primero listar encuestas disponibles para debug
    console.log('\n   🔍 Buscando encuestas existentes...');
    const { data: allSurveys } = await supabase
      .from('survey_definitions')
      .select('id, name')
      .limit(20);

    if (allSurveys && allSurveys.length > 0) {
      console.log('   📋 Encuestas disponibles:');
      allSurveys.forEach(s => console.log(`      - "${s.name}" (${s.id})`));
    }

    // Buscar la encuesta específica
    const { data: surveys, error: surveyError } = await supabase
      .from('survey_definitions')
      .select('id, name')
      .eq('name', SURVEY_NAME)
      .limit(1);

    if (surveyError) {
      console.error(`   ❌ Error al buscar encuesta: ${surveyError.message}`);
      return null;
    }

    if (!surveys || surveys.length === 0) {
      console.error(`   ❌ Encuesta no encontrada: "${SURVEY_NAME}"`);
      return null;
    }

    const survey = surveys[0];

    console.log(`   ✅ Encuesta encontrada: ${survey.id}`);
    console.log(`   📋 Nombre: ${survey.name}\n`);

    // 2. Buscar el último survey_run
    console.log('2. Buscando el último survey_run...');
    const { data: runs, error: runsError } = await supabase
      .from('survey_runs')
      .select('id, started_at, completed_at, status')
      .eq('survey_id', survey.id)
      .order('started_at', { ascending: false })
      .limit(1);

    if (runsError || !runs || runs.length === 0) {
      console.error(`   ❌ No se encontraron runs: ${runsError?.message || 'Sin runs'}`);
      return null;
    }

    const run = runs[0];
    console.log(`   ✅ Run encontrado: ${run.id}`);
    console.log(`   📊 Estado: ${run.status}`);
    console.log(`   🕐 Iniciado: ${new Date(run.started_at).toLocaleString()}\n`);

    // 3. Extraer agent_ids de survey_responses
    console.log('3. Extrayendo agent_ids de survey_responses...');
    const { data: responses, error: responsesError } = await supabase
      .from('survey_responses')
      .select('agent_id')
      .eq('run_id', run.id);

    if (responsesError) {
      console.error(`   ❌ Error al obtener responses: ${responsesError.message}`);
      return null;
    }

    if (!responses || responses.length === 0) {
      console.error('   ❌ No se encontraron responses en este run');
      return null;
    }

    // 4. Deduplicar agent_ids
    const allAgentIds = responses.map(r => r.agent_id);
    const uniqueAgentIds = [...new Set(allAgentIds)];

    console.log(`   📊 Total responses: ${allAgentIds.length}`);
    console.log(`   👥 Agentes únicos: ${uniqueAgentIds.length}\n`);

    // 5. Crear resultado
    const result: ExportResult = {
      survey_id: survey.id,
      run_id: run.id,
      total_agents: allAgentIds.length,
      unique_agents: uniqueAgentIds.length,
      agent_ids: uniqueAgentIds,
      exported_at: new Date().toISOString()
    };

    // 6. Guardar archivo
    console.log('4. Guardando archivo...');
    const outputDir = path.dirname(OUTPUT_FILE);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(result, null, 2));
    console.log(`   ✅ Archivo guardado: ${OUTPUT_FILE}\n`);

    // 7. Resumen
    console.log('==============================================');
    console.log('📊 RESUMEN DE EXPORTACIÓN\n');
    console.log(`Survey ID:    ${result.survey_id}`);
    console.log(`Run ID:       ${result.run_id}`);
    console.log(`Total agents: ${result.total_agents}`);
    console.log(`Unique agents: ${result.unique_agents}`);
    console.log(`Exported at:  ${result.exported_at}`);
    console.log('\n==============================================');
    console.log('✅ Exportación completada exitosamente');
    console.log('==============================================\n');

    return result;

  } catch (error) {
    console.error('❌ Error inesperado:', error);
    return null;
  }
}

// Ejecutar
exportRun001AgentIds().then(result => {
  if (result) {
    console.log('\n💡 Siguiente paso:');
    console.log('   Crear encuesta B2 y ejecutar:');
    console.log('   npx tsx scripts/staging/runLongitudinalWave.ts --wave=1 --survey-id=<ID> --agent-ids-file=data/staging/agents_run_001_ids.json\n');
    process.exit(0);
  } else {
    console.error('\n❌ Exportación fallida\n');
    process.exit(1);
  }
});
