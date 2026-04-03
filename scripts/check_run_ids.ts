import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://supabase.pulsossociales.com';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB1bHNvc3NvY2lhbGVzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDE4MjY0MDAsImV4cCI6MTg5OTU5MjgwMH0.abcdefghijklmnop';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkRunIds() {
  console.log('Checking run_ids in survey_responses...');

  const { data, error } = await supabase
    .from('survey_responses')
    .select('run_id')
    .limit(100);

  if (error) {
    console.error('Error:', error);
    return;
  }

  const uniqueRunIds = [...new Set(data?.map(r => r.run_id) || [])];
  console.log('Unique run_ids in DB:', uniqueRunIds);
  console.log('Total responses:', data?.length || 0);

  // Check survey_runs table
  const { data: runs, error: runsError } = await supabase
    .from('survey_runs')
    .select('id, survey_id, created_at')
    .order('created_at', { ascending: false })
    .limit(10);

  if (runsError) {
    console.error('Error fetching runs:', runsError);
    return;
  }

  console.log('\nRecent survey_runs:');
  runs?.forEach(run => {
    console.log(`  - ${run.id} (survey: ${run.survey_id})`);
  });
}

checkRunIds();
