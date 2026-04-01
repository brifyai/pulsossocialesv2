/**
 * Script para poblar los campos CADEM en synthetic_agents:
 * - cadem_socioeconomic_level (basado en income_decile y education_level)
 * - cadem_age_group (basado en age)
 * - cadem_region_group (basado en region_code)
 * 
 * Mapeo CADEM Nivel Socioeconómico:
 * - ABC1: Deciles 9-10 + educación universitaria/postgrado
 * - C2: Deciles 7-8 + educación universitaria/postgrado
 * - C3: Deciles 5-6 + educación técnica/universitaria
 * - D: Deciles 3-4 + educación secundaria/técnica
 * - E: Deciles 1-2 + educación primaria/secundaria
 * 
 * Mapeo CADEM Grupos de Edad:
 * - 18-29: 18-29 años
 * - 30-49: 30-49 años
 * - 50-69: 50-69 años
 * - 70+: 70+ años
 * 
 * Mapeo CADEM Grupos Regionales:
 * - Metropolitana: Región Metropolitana (CL-13)
 * - Norte: Tarapacá, Antofagasta, Atacama, Coquimbo (CL-01, CL-02, CL-03, CL-04)
 * - Centro: Valparaíso, O'Higgins, Maule, Ñuble, Biobío (CL-05, CL-06, CL-07, CL-16, CL-08)
 * - Sur: Araucanía, Los Ríos, Los Lagos, Aysén, Magallanes (CL-09, CL-14, CL-10, CL-11, CL-12)
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.scripts' });

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Error: Se requieren SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY (o SUPABASE_SERVICE_KEY)');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

type CademLevel = 'ABC1' | 'C2' | 'C3' | 'D' | 'E';
type CademAgeGroup = '18-29' | '30-49' | '50-69' | '70+';
type CademRegionGroup = 'Metropolitana' | 'Norte' | 'Centro' | 'Sur';

interface AgentData {
  agent_id: string;
  income_decile: number | null;
  education_level: string | null;
  age: number | null;
  region_code: string | null;
}

/**
 * Determina el nivel socioeconómico CADEM basado en decil de ingreso y educación
 */
function determineCademLevel(
  incomeDecile: number | null,
  educationLevel: string | null
): CademLevel {
  // Si no hay datos de ingreso, usar solo educación como proxy
  if (incomeDecile === null) {
    if (!educationLevel) return 'D'; // Default medio-bajo
    
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

  // Mapeo basado en decil de ingreso (principal) + educación (ajuste)
  // Ajustado para reflejar mejor la distribución real de Chile
  if (incomeDecile === 10) {
    // Decil 10: ABC1 solo con educación universitaria/postgrado
    if (educationLevel === 'postgraduate' || educationLevel === 'university') {
      return 'ABC1';
    }
    return 'C2';
  } else if (incomeDecile === 9) {
    // Decil 9: C2 (no ABC1 para mantener distribución realista ~8-12%)
    return 'C2';
  } else if (incomeDecile >= 7) {
    // Deciles 7-8: C2 o C3
    if (educationLevel === 'postgraduate' || educationLevel === 'university') {
      return 'C2';
    }
    return 'C3';
  } else if (incomeDecile >= 5) {
    // Deciles 5-6: C3
    return 'C3';
  } else if (incomeDecile >= 3) {
    // Deciles 3-4: D
    return 'D';
  } else {
    // Deciles 1-2: E
    return 'E';
  }
}

/**
 * Determina el grupo de edad CADEM basado en la edad
 */
function determineCademAgeGroup(age: number | null): CademAgeGroup {
  if (age === null) return '30-49'; // Default grupo medio
  
  if (age >= 18 && age <= 29) return '18-29';
  if (age >= 30 && age <= 49) return '30-49';
  if (age >= 50 && age <= 69) return '50-69';
  if (age >= 70) return '70+';
  
  // Para menores de 18, asignar al grupo más cercano
  return '18-29';
}

/**
 * Determina el grupo regional CADEM basado en el código de región
 */
function determineCademRegionGroup(regionCode: string | null): CademRegionGroup {
  if (!regionCode) return 'Metropolitana'; // Default
  
  // Mapeo de regiones a grupos CADEM
  const regionMapping: Record<string, CademRegionGroup> = {
    // Metropolitana
    'CL-13': 'Metropolitana',
    
    // Norte
    'CL-01': 'Norte', // Tarapacá
    'CL-02': 'Norte', // Antofagasta
    'CL-03': 'Norte', // Atacama
    'CL-04': 'Norte', // Coquimbo
    'CL-15': 'Norte', // Arica y Parinacota
    
    // Centro
    'CL-05': 'Centro', // Valparaíso
    'CL-06': 'Centro', // O'Higgins
    'CL-07': 'Centro', // Maule
    'CL-16': 'Centro', // Ñuble
    'CL-08': 'Centro', // Biobío
    
    // Sur
    'CL-09': 'Sur', // Araucanía
    'CL-14': 'Sur', // Los Ríos
    'CL-10': 'Sur', // Los Lagos
    'CL-11': 'Sur', // Aysén
    'CL-12': 'Sur', // Magallanes
  };
  
  return regionMapping[regionCode] || 'Centro';
}

async function populateCademFields() {
  console.log('🚀 Iniciando población de campos CADEM...\n');

  try {
    // Verificar que las columnas existen
    console.log('🔍 Verificando columnas CADEM...');
    const { error: checkError } = await supabase
      .from('synthetic_agents')
      .select('cadem_socioeconomic_level, cadem_age_group, cadem_region_group')
      .limit(1);

    if (checkError) {
      console.error('❌ Error: Las columnas CADEM no existen');
      console.error('   Ejecuta primero: npx ts-node scripts/apply_migrations.ts');
      process.exit(1);
    }
    console.log('✅ Columnas verificadas\n');

    // Obtener agentes sin campos CADEM
    console.log('📊 Obteniendo agentes...');
    const { data: agents, error: fetchError } = await supabase
      .from('synthetic_agents')
      .select('agent_id, income_decile, education_level, age, region_code')
      .or('cadem_socioeconomic_level.is.null,cadem_age_group.is.null,cadem_region_group.is.null')
      .limit(10000);

    if (fetchError) {
      console.error('❌ Error al obtener agentes:', fetchError.message);
      process.exit(1);
    }

    if (!agents || agents.length === 0) {
      console.log('✅ Todos los agentes ya tienen campos CADEM asignados');
      return;
    }

    console.log(`📝 Procesando ${agents.length} agentes...\n`);

    // Procesar en batches
    const batchSize = 1000;
    const levelStats: Record<CademLevel, number> = {
      ABC1: 0,
      C2: 0,
      C3: 0,
      D: 0,
      E: 0
    };
    const ageStats: Record<CademAgeGroup, number> = {
      '18-29': 0,
      '30-49': 0,
      '50-69': 0,
      '70+': 0
    };
    const regionStats: Record<CademRegionGroup, number> = {
      'Metropolitana': 0,
      'Norte': 0,
      'Centro': 0,
      'Sur': 0
    };

    for (let i = 0; i < agents.length; i += batchSize) {
      const batch = agents.slice(i, i + batchSize);
      const updates = batch.map((agent: AgentData) => {
        const cademLevel = determineCademLevel(agent.income_decile, agent.education_level);
        const cademAgeGroup = determineCademAgeGroup(agent.age);
        const cademRegionGroup = determineCademRegionGroup(agent.region_code);
        
        levelStats[cademLevel]++;
        ageStats[cademAgeGroup]++;
        regionStats[cademRegionGroup]++;
        
        return {
          agent_id: agent.agent_id,
          cadem_socioeconomic_level: cademLevel,
          cadem_age_group: cademAgeGroup,
          cadem_region_group: cademRegionGroup
        };
      });

      // Actualizar en Supabase usando upsert
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
    console.log('\n📈 Distribución Nivel Socioeconómico CADEM:');
    console.log(`   ABC1: ${levelStats.ABC1} (${((levelStats.ABC1 / agents.length) * 100).toFixed(1)}%)`);
    console.log(`   C2:   ${levelStats.C2} (${((levelStats.C2 / agents.length) * 100).toFixed(1)}%)`);
    console.log(`   C3:   ${levelStats.C3} (${((levelStats.C3 / agents.length) * 100).toFixed(1)}%)`);
    console.log(`   D:    ${levelStats.D} (${((levelStats.D / agents.length) * 100).toFixed(1)}%)`);
    console.log(`   E:    ${levelStats.E} (${((levelStats.E / agents.length) * 100).toFixed(1)}%)`);

    console.log('\n📈 Distribución Grupos de Edad CADEM:');
    console.log(`   18-29: ${ageStats['18-29']} (${((ageStats['18-29'] / agents.length) * 100).toFixed(1)}%)`);
    console.log(`   30-49: ${ageStats['30-49']} (${((ageStats['30-49'] / agents.length) * 100).toFixed(1)}%)`);
    console.log(`   50-69: ${ageStats['50-69']} (${((ageStats['50-69'] / agents.length) * 100).toFixed(1)}%)`);
    console.log(`   70+:   ${ageStats['70+']} (${((ageStats['70+'] / agents.length) * 100).toFixed(1)}%)`);

    console.log('\n📈 Distribución Grupos Regionales CADEM:');
    console.log(`   Metropolitana: ${regionStats['Metropolitana']} (${((regionStats['Metropolitana'] / agents.length) * 100).toFixed(1)}%)`);
    console.log(`   Norte:         ${regionStats['Norte']} (${((regionStats['Norte'] / agents.length) * 100).toFixed(1)}%)`);
    console.log(`   Centro:        ${regionStats['Centro']} (${((regionStats['Centro'] / agents.length) * 100).toFixed(1)}%)`);
    console.log(`   Sur:           ${regionStats['Sur']} (${((regionStats['Sur'] / agents.length) * 100).toFixed(1)}%)`);

    console.log('\n✅ Población completada exitosamente');

  } catch (error) {
    console.error('❌ Error inesperado:', error);
    process.exit(1);
  }
}

// Ejecutar si se llama directamente
const isMainModule = import.meta.url === `file://${process.argv[1]}`;
if (isMainModule) {
  populateCademFields();
}

export { populateCademFields, determineCademLevel, determineCademAgeGroup, determineCademRegionGroup };
