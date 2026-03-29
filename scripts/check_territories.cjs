const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://supabase.pulsossociales.com',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyAgCiAgICAicm9sZSI6ICJzZXJ2aWNlX3JvbGUiLAogICAgImlzcyI6ICJzdXBhYmFzZS1kZW1vIiwKICAgICJpYXQiOiAxNjQxNzY5MjAwLAogICAgImV4cCI6IDE3OTk1MzU2MDAKfQ.DaYlNEoUrrEn2Ig7tqibS-PHK5vgusbcbo7X36XVt4Q'
);

async function checkTerritories() {
  console.log('=== Verificando tabla territories ===\n');
  
  // Contar total
  const { count: total } = await supabase
    .from('territories')
    .select('*', { count: 'exact', head: true });
  
  console.log('Total territories:', total);
  
  // Verificar levels
  const { data: levels } = await supabase
    .from('territories')
    .select('level')
    .limit(10);
  
  console.log('\nMuestra de levels:', levels?.map(l => l.level));
  
  // Contar regiones
  const { data: regions } = await supabase
    .from('territories')
    .select('region_code, region_name, level')
    .eq('level', 'region');
  
  console.log('\nRegiones encontradas:', regions?.length || 0);
  if (regions && regions.length > 0) {
    console.log('Primera región:', regions[0]);
  }
  
  // Ver todas las regiones únicas
  const { data: allRegions } = await supabase
    .from('territories')
    .select('region_code, region_name, level')
    .order('region_code');
  
  const uniqueRegions = [...new Set(allRegions?.map(r => r.region_code).filter(Boolean))];
  console.log('\nCódigos únicos de regiones:', uniqueRegions);
}

checkTerritories().catch(console.error);
