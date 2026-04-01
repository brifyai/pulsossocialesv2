/**
 * Script para resetear y re-poblar cadem_socioeconomic_level con el algoritmo ajustado
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.scripts' });

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Error: Se requieren SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

type CademLevel = 'ABC1' | 'C2' | 'C3' | 'D' | 'E';

interface AgentData {
  agent_id: string;
  income_decile: number | null;
  education_level: string | null;
}

/**
 * Determina el nivel socioeconómico CADEM basado en decil de ingreso y educación
 * VERSIÓN AJUSTADA: ABC1 solo para decil 10 + educación universitaria/postgrado
 */
function determineCademLevel(
  incomeDecile: number | null,
  educationLevel: string | null
): CademLevel {
  // Si no hay datos de ingreso, usar solo educación como proxy
  if (incomeDecile === null) {
    if (!educationLevel) return 'D';
    
    switch (educationLevel) {
      case 'postgraduate':
      case 'university':
        return 'C2';
      case 'technical':
        return 'C3';
      case 'secondary':
        return 'D';
      case 'primary':
      case 'none':
        return 'E';
      default:
        return 'D';
    }
  }

  // VERSIÓN AJUSTADA: Más restrictivo con ABC1
  if (incomeDecile === 10) {
    // Decil 10: ABC1 solo con educación universitaria/postgrado
    if (educationLevel === 'postgraduate' || educationLevel === 'university') {
      return 'ABC1';
    }
    return 'C2';
  } else if (incomeDecile === 9) {
    // Decil 9: C2 (no ABC1)
    return 'C2';
  } else if (incomeDecile >= 7) {
    // Deciles 7-8: C2 o C3
    if (educationLevel === 'postgraduate' || educationLevel === 'university') {
      return 'C2';
    }
    return 'C3';
  } else if (incomeDecile >= 5) {
    return 'C3';
  } else if (incomeDecile >= 3) {
    return 'D';
  } else {
    return 'E';
  }
}

async function resetAndRepopulate() {
  console.log('🔄 Reset y re-población de cadem_socioeconomic_level...\n');

  try {
    // Paso 1: Resetear todos los valores a NULL
    console.log('🗑️  Paso 1: Limpiando valores existentes...');
    const { error: resetError } = await supabase
      .from('synthetic_agents')
      .update({ cadem_socioeconomic_level: null })
      .not('cadem_socioeconomic_level', 'is', null);

    if (resetError) {
      console.error('❌ Error al resetear:', resetError.message);
      process.exit(1);
    }
    console.log('✅ Valores limpiados\n');

    // Paso 2: Obtener todos los agentes
    console.log('📊 Paso 2: Obteniendo agentes...');
    const { data: agents, error: fetchError } = await supabase
      .from('synthetic_agents')
      .select('agent_id, income_decile, education_level')
      .limit(25000);

    if (fetchError) {
      console.error('❌ Error al obtener agentes:', fetchError.message);
      process.exit(1);
    }

    if (!agents || agents.length === 0) {
      console.log('⚠️  No hay agentes para procesar');
      return;
    }

    console.log(`📝 Procesando ${agents.length} agentes...\n`);

    // Paso 3: Procesar en batches
    const batchSize = 1000;
    const stats: Record<CademLevel, number> = {
      ABC1: 0,
      C2: 0,
      C3: 0,
      D: 0,
      E: 0
    };

    for (let i = 0; i < agents.length; i += batchSize) {
      const batch = agents.slice(i, i + batchSize);
      const updates = batch.map((agent: AgentData) => {
        const cademLevel = determineCademLevel(agent.income_decile, agent.education_level);
        stats[cademLevel]++;
        return {
          agent_id: agent.agent_id,
          cadem_socioeconomic_level: cademLevel
        };
      });

      const { error: updateError } = await supabase
        .from('synthetic_agents')
        .upsert(updates, { onConflict: 'agent_id' });

      if (updateError) {
        console.error(`❌ Error en batch ${i / batchSize + 1}:`, updateError.message);
        continue;
      }

      console.log(`✅ Batch ${i / batchSize + 1}/${Math.ceil(agents.length / batchSize)} completado`);
    }

    // Mostrar estadísticas
    console.log('\n📈 Nueva distribución CADEM:');
    console.log(`   ABC1: ${stats.ABC1} (${((stats.ABC1 / agents.length) * 100).toFixed(1)}%)`);
    console.log(`   C2:   ${stats.C2} (${((stats.C2 / agents.length) * 100).toFixed(1)}%)`);
    console.log(`   C3:   ${stats.C3} (${((stats.C3 / agents.length) * 100).toFixed(1)}%)`);
    console.log(`   D:    ${stats.D} (${((stats.D / agents.length) * 100).toFixed(1)}%)`);
    console.log(`   E:    ${stats.E} (${((stats.E / agents.length) * 100).toFixed(1)}%)`);

    console.log('\n✅ Re-población completada');
    console.log('\n💡 Distribución esperada más cercana a Chile real:');
    console.log('   ABC1: ~8-12% (antes era ~15%)');
    console.log('   C2:   ~18-22%');
    console.log('   C3:   ~22-28%');
    console.log('   D:    ~25-30%');
    console.log('   E:    ~15-20%');

  } catch (error) {
    console.error('❌ Error inesperado:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  resetAndRepopulate();
}

export { resetAndRepopulate };
