import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.scripts' });

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

console.log('SUPABASE_URL:', supabaseUrl ? '✅ Configurado' : '❌ No configurado');
console.log('SUPABASE_SERVICE_KEY:', supabaseServiceKey ? '✅ Configurado' : '❌ No configurado');

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Error: Se requieren credenciales');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function testConnection() {
  console.log('\n🔍 Probando conexión a Supabase...');
  console.log('URL:', supabaseUrl);

  try {
    const { data, error } = await supabase
      .from('synthetic_agents')
      .select('agent_id, cadem_socioeconomic_level, cadem_age_group, cadem_region_group')
      .limit(1);

    if (error) {
      console.error('❌ Error:', error.message);
      console.error('Código:', error.code);
      process.exit(1);
    } else {
      console.log('✅ Conexión exitosa');
      console.log('Datos:', data);
    }
  } catch (err) {
    console.error('❌ Error inesperado:', err);
    process.exit(1);
  }
}

testConnection();
