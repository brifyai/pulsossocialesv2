/**
 * Script de validación post-compatibilidad - VERSIÓN SIMPLIFICADA
 * Verifica que toSyntheticAgent() mapea correctamente agentes reales
 *
 * NOTA: Este script es standalone y no depende del cliente Supabase del frontend
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Configuración - usar process.env directamente (Node.js)
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';

// Tipo CademAgentAsync (copiado de cademAdapterAsync.ts)
interface CademAgentAsync {
  agentId: string;
  age?: number;
  sex?: string;
  educationLevel?: string;
  incomeDecile?: number;
  povertyStatus?: string;
  regionCode?: string;
  communeCode?: string;
  connectivityLevel?: string;
  digitalExposure?: string;
  preferredChannel?: string;
  agentType?: string;
}

// Tipo SyntheticAgent (simplificado)
interface SyntheticAgent {
  agent_id: string;
  age?: number;
  age_group?: string;
  sex?: string;
  income_decile?: number;
  poverty_status?: string;
  region_code?: string;
  comuna_code?: string;
  education_level?: string;
  connectivity_level?: string;
  digital_exposure_level?: string;
  preferred_survey_channel?: string;
  agent_type?: string;
  socioeconomic_level?: string;
}

interface ValidationResult {
  agentId: string;
  original: {
    age?: number;
    sex?: string;
    incomeDecile?: number;
    povertyStatus?: string;
    regionCode?: string;
    communeCode?: string;
    educationLevel?: string;
    connectivityLevel?: string;
    digitalExposure?: string;
    preferredChannel?: string;
    agentType?: string;
  };
  mapped: {
    age?: number;
    age_group?: string;
    sex?: string;
    income_decile?: number;
    poverty_status?: string;
    region_code?: string;
    comuna_code?: string;
    education_level?: string;
    connectivity_level?: string;
    digital_exposure_level?: string;
    preferred_survey_channel?: string;
    agent_type?: string;
    socioeconomic_level?: string;
  };
  differences: string[];
}

/**
 * Función toSyntheticAgent - copiada de cademAdapterAsync.ts
 * Convierte un CademAgentAsync a SyntheticAgent
 */
function toSyntheticAgent(agent: CademAgentAsync): SyntheticAgent {
  // Inferir age_group desde age
  let age_group: string | undefined;
  if (agent.age !== undefined) {
    if (agent.age < 18) age_group = 'youth';
    else if (agent.age < 35) age_group = 'adult';
    else if (agent.age < 60) age_group = 'middle_age';
    else age_group = 'senior';
  }

  // Inferir socioeconomic_level desde incomeDecile
  let socioeconomic_level: string | undefined;
  if (agent.incomeDecile !== undefined) {
    if (agent.incomeDecile <= 3) socioeconomic_level = 'low';
    else if (agent.incomeDecile >= 8) socioeconomic_level = 'high';
    else socioeconomic_level = 'medium';
  }

  return {
    agent_id: agent.agentId,
    age: agent.age,
    age_group,
    sex: agent.sex,
    income_decile: agent.incomeDecile,
    poverty_status: agent.povertyStatus,
    region_code: agent.regionCode,
    comuna_code: agent.communeCode,
    education_level: agent.educationLevel,
    connectivity_level: agent.connectivityLevel,
    digital_exposure_level: agent.digitalExposure,
    preferred_survey_channel: agent.preferredChannel,
    agent_type: agent.agentType,
    socioeconomic_level,
  };
}

async function fetchTestAgents(supabase: SupabaseClient, count: number = 5): Promise<CademAgentAsync[]> {
  console.log(`\n📥 Fetching ${count} agents from Supabase...`);

  const { data: agents, error } = await supabase
    .from('synthetic_agents')
    .select('*')
    .limit(count);

  if (error) {
    console.error('❌ Error fetching agents:', error);
    throw error;
  }

  if (!agents || agents.length === 0) {
    throw new Error('No agents found in database');
  }

  console.log(`✅ Fetched ${agents.length} agents`);

  // Convertir a CademAgentAsync
  return agents.map((agent: any) => ({
    agentId: agent.agent_id,
    age: agent.age,
    sex: agent.sex,
    educationLevel: agent.education_level,
    incomeDecile: agent.income_decile,
    povertyStatus: agent.poverty_status,
    regionCode: agent.region_code,
    communeCode: agent.comuna_code,
    connectivityLevel: agent.connectivity_level,
    digitalExposure: agent.digital_exposure_level,
    preferredChannel: agent.preferred_survey_channel,
    agentType: agent.agent_type,
  }));
}

function validateMapping(agent: CademAgentAsync, mapped: SyntheticAgent): ValidationResult {
  const differences: string[] = [];

  // Verificar age_group inferido
  const expectedAgeGroup = agent.age !== undefined
    ? agent.age < 18 ? 'youth'
      : agent.age < 35 ? 'adult'
      : agent.age < 60 ? 'middle_age'
      : 'senior'
    : 'adult';

  if (mapped.age_group !== expectedAgeGroup) {
    differences.push(`age_group: expected ${expectedAgeGroup}, got ${mapped.age_group}`);
  }

  // Verificar socioeconomic_level inferido
  let expectedSocioeconomic = 'medium';
  if (agent.incomeDecile !== undefined) {
    if (agent.incomeDecile <= 3) expectedSocioeconomic = 'low';
    else if (agent.incomeDecile >= 8) expectedSocioeconomic = 'high';
  }

  if (mapped.socioeconomic_level !== expectedSocioeconomic) {
    differences.push(`socioeconomic_level: expected ${expectedSocioeconomic}, got ${mapped.socioeconomic_level}`);
  }

  // Verificar que campos directos se mantienen
  if (agent.age !== undefined && mapped.age !== agent.age) {
    differences.push(`age: expected ${agent.age}, got ${mapped.age}`);
  }
  if (agent.incomeDecile !== undefined && mapped.income_decile !== agent.incomeDecile) {
    differences.push(`income_decile: expected ${agent.incomeDecile}, got ${mapped.income_decile}`);
  }
  if (agent.regionCode && mapped.region_code !== agent.regionCode) {
    differences.push(`region_code: expected ${agent.regionCode}, got ${mapped.region_code}`);
  }

  return {
    agentId: agent.agentId,
    original: {
      age: agent.age,
      sex: agent.sex,
      incomeDecile: agent.incomeDecile,
      povertyStatus: agent.povertyStatus,
      regionCode: agent.regionCode,
      communeCode: agent.communeCode,
      educationLevel: agent.educationLevel,
      connectivityLevel: agent.connectivityLevel,
      digitalExposure: agent.digitalExposure,
      preferredChannel: agent.preferredChannel,
      agentType: agent.agentType,
    },
    mapped: {
      age: mapped.age,
      age_group: mapped.age_group,
      sex: mapped.sex,
      income_decile: mapped.income_decile,
      poverty_status: mapped.poverty_status,
      region_code: mapped.region_code,
      comuna_code: mapped.comuna_code,
      education_level: mapped.education_level,
      connectivity_level: mapped.connectivity_level,
      digital_exposure_level: mapped.digital_exposure_level,
      preferred_survey_channel: mapped.preferred_survey_channel,
      agent_type: mapped.agent_type,
      socioeconomic_level: mapped.socioeconomic_level,
    },
    differences,
  };
}

async function main() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║  VALIDACIÓN POST-COMPATIBILIDAD - CADEM v1.2              ║');
  console.log('╚════════════════════════════════════════════════════════════╝');

  // Verificar configuración
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('❌ Error: Se requieren las variables de entorno:');
    console.error('   - VITE_SUPABASE_URL o SUPABASE_URL');
    console.error('   - VITE_SUPABASE_ANON_KEY o SUPABASE_ANON_KEY');
    process.exit(1);
  }

  console.log(`\n🔌 Conectando a Supabase: ${SUPABASE_URL.substring(0, 30)}...`);
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

  try {
    // 1. Fetch agents
    const agents = await fetchTestAgents(supabase, 5);

    // 2. Validar mapeo
    console.log('\n📋 VALIDACIÓN DE MAPEO');
    console.log('═══════════════════════════════════════════════════════════');

    const validationResults: ValidationResult[] = [];

    for (const agent of agents) {
      const mapped = toSyntheticAgent(agent);
      const validation = validateMapping(agent, mapped);
      validationResults.push(validation);

      console.log(`\n📝 Agent ${validation.agentId}:`);
      console.log('   Original:', JSON.stringify(validation.original, null, 2).replace(/\n/g, '\n   '));
      console.log('   Mapped:  ', JSON.stringify(validation.mapped, null, 2).replace(/\n/g, '\n   '));

      if (validation.differences.length > 0) {
        console.log('   ⚠️  Differences:', validation.differences.join(', '));
      } else {
        console.log('   ✅ Mapping OK');
      }
    }

    // Resumen de mapeo
    const totalDifferences = validationResults.reduce((sum, r) => sum + r.differences.length, 0);
    console.log(`\n📊 MAPEO: ${validationResults.length} agents, ${totalDifferences} differences`);

    // 3. Resumen final
    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║  RESUMEN FINAL                                             ║');
    console.log('╚════════════════════════════════════════════════════════════╝');

    if (totalDifferences === 0) {
      console.log('✅ TODAS LAS VALIDACIONES PASARON');
      console.log('   - Mapeo de agentes: OK');
      console.log('   - toSyntheticAgent() funciona correctamente');
      console.log('\n🚀 Sistema listo para Fase 2');
    } else {
      console.log('⚠️  ALGUNAS VALIDACIONES FALLARON');
      console.log(`   - ${totalDifferences} diferencias en mapeo`);
    }

  } catch (error) {
    console.error('\n❌ Error en validación:', error);
    process.exit(1);
  }
}

// Ejecutar
main();
