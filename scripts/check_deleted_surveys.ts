/**
 * Script para verificar encuestas eliminadas (soft delete)
 */

import { createClient } from '@supabase/supabase-js';
import './utils/loadEnv';

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Faltan variables de entorno');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSurveys() {
  console.log('🔍 Verificando encuestas en la base de datos...\n');
  
  // Obtener todas las encuestas
  const { data: allSurveys, error } = await supabase
    .from('survey_definitions')
    .select('id, name, deleted_at, created_at')
    .order('created_at', { ascending: false });
  
  if (error) {
    console.error('❌ Error:', error);
    return;
  }
  
  console.log('=== RESUMEN ===');
  console.log('Total de encuestas:', allSurveys?.length || 0);
  
  const active = allSurveys?.filter(s => !s.deleted_at) || [];
  const deleted = allSurveys?.filter(s => s.deleted_at) || [];
  
  console.log('\n✅ ACTIVAS:', active.length);
  active.forEach(s => console.log(`  - ${s.name}`));
  
  console.log('\n🗑️  ELIMINADAS (soft delete):', deleted.length);
  deleted.forEach(s => {
    const deletedDate = s.deleted_at?.split('T')[0] || 'fecha desconocida';
    console.log(`  - ${s.name} (eliminada: ${deletedDate})`);
  });
  
  console.log('\n=== EXPLICACIÓN ===');
  console.log('Las encuestas eliminadas no aparecen en el frontend porque:');
  console.log('1. El repositorio filtra automáticamente .is("deleted_at", null)');
  console.log('2. Esto es el comportamiento esperado de soft delete');
  console.log('3. Los datos se mantienen en la BD para referencia histórica');
}

checkSurveys();
