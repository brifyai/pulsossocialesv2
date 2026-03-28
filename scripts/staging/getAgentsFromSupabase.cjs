const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabaseUrl = 'https://supabase.pulsossociales.com';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyAgCiAgICAicm9sZSI6ICJzZXJ2aWNlX3JvbGUiLAogICAgImlzcyI6ICJzdXBhYmFzZS1kZW1vIiwKICAgICJpYXQiOiAxNjQxNzY5MjAwLAogICAgImV4cCI6IDE3OTk1MzU2MDAKfQ.DaYlNEoUrrEn2Ig7tqibS-PHK5vgusbcbo7X36XVt4Q';

const supabase = createClient(supabaseUrl, supabaseKey);

async function getAgents() {
  console.log('🔍 Buscando agentes en Supabase...\n');

  // Buscar responses del survey_run d87bcac0-047c-4414-9b46-12d324b875c8
  const runId = 'd87bcac0-047c-4414-9b46-12d324b875c8';

  console.log(`Buscando responses para run_id: ${runId}`);

  const { data: responses, error } = await supabase
    .from('survey_responses')
    .select('agent_id')
    .eq('run_id', runId);

  if (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }

  if (!responses || responses.length === 0) {
    console.error('❌ No se encontraron responses');
    process.exit(1);
  }

  // Extraer IDs únicos
  const agentIds = [...new Set(responses.map(r => r.agent_id))];

  console.log(`\n📊 Total responses: ${responses.length}`);
  console.log(`👥 Agentes únicos: ${agentIds.length}`);
  console.log(`\nPrimeros 10 agentes:`);
  agentIds.slice(0, 10).forEach(id => console.log(`  - ${id}`));

  // Guardar archivo
  const outputFile = 'data/staging/agents_run_001_ids.json';
  fs.writeFileSync(outputFile, JSON.stringify(agentIds, null, 2));

  console.log(`\n✅ Archivo guardado: ${outputFile}`);
  console.log(`   Contiene ${agentIds.length} agentes`);
}

getAgents().catch(console.error);
