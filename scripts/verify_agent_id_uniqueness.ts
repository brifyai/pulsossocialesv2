/**
 * Script para verificar unicidad de agent_id en synthetic_agents
 * Necesario antes de crear Foreign Keys
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ Error: Variables de entorno no configuradas');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function verifyUniqueness() {
  console.log('🔍 Verificando unicidad de agent_id en synthetic_agents...\n');

  try {
    // Consulta para encontrar duplicados
    const { data, error } = await supabase
      .from('synthetic_agents')
      .select('agent_id')
      .order('agent_id');

    if (error) {
      console.error('❌ Error al consultar:', error.message);
      process.exit(1);
    }

    if (!data || data.length === 0) {
      console.log('⚠️  No se encontraron agentes en la tabla');
      process.exit(1);
    }

    // Contar duplicados
    const counts: Record<string, number> = {};
    for (const row of data) {
      counts[row.agent_id] = (counts[row.agent_id] || 0) + 1;
    }

    const duplicates = Object.entries(counts)
      .filter(([_, count]) => count > 1)
      .map(([agent_id, count]) => ({ agent_id, count }));

    console.log(`📊 Total de registros: ${data.length}`);
    console.log(`📊 Agentes únicos: ${Object.keys(counts).length}`);
    console.log(`📊 Duplicados encontrados: ${duplicates.length}\n`);

    if (duplicates.length > 0) {
      console.log('❌ DUPLICADOS ENCONTRADOS:');
      console.log('agent_id | repeticiones');
      console.log('---------|-------------');
      duplicates.slice(0, 10).forEach(d => {
        console.log(`${d.agent_id} | ${d.count}`);
      });
      if (duplicates.length > 10) {
        console.log(`... y ${duplicates.length - 10} más`);
      }
      console.log('\n⚠️  NO se pueden crear Foreign Keys hasta resolver duplicados');
      process.exit(1);
    } else {
      console.log('✅ agent_id es ÚNICO - Se pueden crear Foreign Keys');
      process.exit(0);
    }

  } catch (err) {
    console.error('❌ Error inesperado:', err);
    process.exit(1);
  }
}

verifyUniqueness();
