#!/usr/bin/env ts-node
/**
 * Seed script for synthetic_agents table
 * Loads agents from data/processed/synthetic_agents_v1.json
 * 
 * ⚠️ REQUIERE: SUPABASE_SERVICE_KEY en .env.scripts
 * NO usar ANON_KEY - el seeding requiere privilegios de service_role
 */

import * as fs from 'fs';
import * as path from 'path';
import { SupabaseClient } from '@supabase/supabase-js';
import { serviceClient } from '../utils/serviceClient';

// Types matching the JSON structure
interface AgentData {
  agent_id: string;
  synthetic_batch_id: string;
  source_version: string;
  created_at: string;
  country_code: string;
  region_code: string;
  region_name: string;
  comuna_code: string;
  comuna_name: string;
  urbanicity: string;
  sex: string;
  age: number;
  age_group: string;
  household_size: number;
  household_type: string;
  income_decile: number | null;
  poverty_status: string | null;
  education_level: string | null;
  occupation_status: string | null;
  occupation_group: string | null;
  socioeconomic_level: string | null;
  connectivity_level: string | null;
  digital_exposure_level: string | null;
  preferred_survey_channel: string | null;
  agent_type: string;
  backbone_key: string;
  subtel_profile_key: string | null;
  casen_profile_key: string | null;
  generation_notes: string;
}

interface AgentInsert {
  agent_id: string;
  batch_id: string;
  territory_id: string | null; // Will be looked up from territories
  sex: string;
  age: number;
  age_group: string;
  income_decile: number | null;
  education_level: string | null;
  employment_status: string | null;
  connectivity_level: string | null;
  has_smartphone: boolean;
  has_computer: boolean;
  internet_quality: string | null;
  location_lat: number | null;
  location_lng: number | null;
  backbone_key: string | null;
  synthesis_version: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

// Map region codes from short to CL-XX format
const REGION_CODE_MAP: Record<string, string> = {
  'AP': 'CL-15', 'TA': 'CL-01', 'AN': 'CL-02', 'AT': 'CL-03',
  'CO': 'CL-04', 'VA': 'CL-05', 'RM': 'CL-13', 'LI': 'CL-06',
  'ML': 'CL-07', 'NB': 'CL-16', 'BI': 'CL-08', 'AR': 'CL-09',
  'LR': 'CL-14', 'LL': 'CL-10', 'AI': 'CL-11', 'MA': 'CL-12',
};

// Map connectivity levels to schema enum
function mapConnectivityLevel(level: string | null): string | null {
  if (!level) return null;
  const mapping: Record<string, string> = {
    'none': 'none',
    'low': 'low',
    'medium': 'medium',
    'high': 'high',
    'very_high': 'high', // Map very_high to high
  };
  return mapping[level] || 'medium';
}

// Map age groups to schema enum
function mapAgeGroup(group: string): string {
  const mapping: Record<string, string> = {
    'child': 'child',
    'youth': 'youth',
    'young_adult': 'young_adult',
    'adult': 'adult',
    'senior': 'senior',
    'elderly': 'elderly',
  };
  return mapping[group] || 'adult';
}

// Map education levels to schema enum
function mapEducationLevel(level: string | null): string | null {
  if (!level) return null;
  const mapping: Record<string, string> = {
    'none': 'none',
    'primary': 'primary',
    'secondary': 'secondary',
    'technical': 'technical',
    'university': 'university',
    'postgraduate': 'postgraduate',
  };
  return mapping[level] || null;
}

interface AgentsFile {
  metadata: {
    version: string;
    batch_id: string;
    total_agents: number;
    generated_at: string;
  };
  agents: AgentData[];
}

function loadAgentsData(): AgentsFile {
  const filePath = path.join(process.cwd(), 'data', 'processed', 'synthetic_agents_v1.json');
  const rawData = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(rawData) as AgentsFile;
}

async function getTerritoryMap(supabase: SupabaseClient): Promise<Map<string, string>> {
  // Build a map of comuna_code -> territory_id (UUID)
  const { data, error } = await supabase
    .from('territories')
    .select('id, comuna_code');

  if (error) {
    throw new Error(`Failed to load territories: ${error.message}`);
  }

  const map = new Map<string, string>();
  data?.forEach(t => {
    map.set(t.comuna_code, t.id);
  });

  return map;
}

function transformToDbFormat(
  agents: AgentData[],
  territoryMap: Map<string, string>,
  batchId: string
): AgentInsert[] {
  return agents.map(agent => {
    // Try to find territory by region code (since we only have regions in territories table)
    const regionCode = REGION_CODE_MAP[agent.region_code] || agent.region_code;
    const territoryId = territoryMap.get(agent.region_code) || null;

    return {
      agent_id: agent.agent_id,
      batch_id: batchId,
      territory_id: territoryId,
      sex: agent.sex,
      age: agent.age,
      age_group: mapAgeGroup(agent.age_group),
      income_decile: agent.income_decile,
      education_level: mapEducationLevel(agent.education_level),
      employment_status: agent.occupation_status,
      connectivity_level: mapConnectivityLevel(agent.connectivity_level),
      has_smartphone: agent.connectivity_level === 'high' || agent.connectivity_level === 'very_high',
      has_computer: agent.connectivity_level === 'high' || agent.connectivity_level === 'very_high',
      internet_quality: agent.connectivity_level,
      location_lat: null, // Not available in source
      location_lng: null, // Not available in source
      backbone_key: agent.backbone_key,
      synthesis_version: agent.source_version,
      metadata: {
        urbanicity: agent.urbanicity,
        household_size: agent.household_size,
        household_type: agent.household_type,
        poverty_status: agent.poverty_status,
        socioeconomic_level: agent.socioeconomic_level,
        digital_exposure_level: agent.digital_exposure_level,
        preferred_survey_channel: agent.preferred_survey_channel,
        agent_type: agent.agent_type,
        region_name: agent.region_name,
        comuna_name: agent.comuna_name,
      },
      created_at: agent.created_at,
    };
  });
}

async function seedAgents(supabase: SupabaseClient): Promise<{ inserted: number; errors: string[]; skipped: number }> {
  const data = loadAgentsData();
  console.log(`📊 Loaded ${data.agents.length} agents from JSON (batch: ${data.metadata.batch_id})`);

  // Get territory mapping
  console.log('🗺️  Loading territory mappings...');
  const territoryMap = await getTerritoryMap(supabase);
  console.log(`   Found ${territoryMap.size} territories`);

  const dbData = transformToDbFormat(data.agents, territoryMap, data.metadata.batch_id);
  
  // Count agents with/without territory
  const withTerritory = dbData.filter(a => a.territory_id).length;
  const withoutTerritory = dbData.filter(a => !a.territory_id).length;
  console.log(`🔄 Transformed ${dbData.length} agents:`);
  console.log(`   - With territory: ${withTerritory}`);
  console.log(`   - Without territory: ${withoutTerritory}`);

  const errors: string[] = [];
  let inserted = 0;
  let skipped = 0;

  // Insert in batches of 100
  const BATCH_SIZE = 100;
  for (let i = 0; i < dbData.length; i += BATCH_SIZE) {
    const batch = dbData.slice(i, i + BATCH_SIZE);
    
    const { data: result, error } = await supabase
      .from('synthetic_agents')
      .upsert(batch, { 
        onConflict: 'agent_id',
        ignoreDuplicates: false 
      })
      .select();

    if (error) {
      console.error(`❌ Error inserting batch ${i / BATCH_SIZE + 1}:`, error.message);
      errors.push(error.message);
    } else {
      inserted += result?.length || 0;
      console.log(`✅ Inserted batch ${i / BATCH_SIZE + 1}: ${result?.length || 0} agents`);
    }
  }

  return { inserted, errors, skipped: withoutTerritory };
}

async function verifyAgents(supabase: SupabaseClient): Promise<void> {
  // Count total agents
  const { count: totalCount, error: countError } = await supabase
    .from('synthetic_agents')
    .select('*', { count: 'exact', head: true });

  if (countError) {
    console.error('❌ Error counting agents:', countError.message);
    return;
  }

  // Count agents with territory
  const { count: withTerritory, error: territoryError } = await supabase
    .from('synthetic_agents')
    .select('*', { count: 'exact', head: true })
    .not('territory_id', 'is', null);

  if (territoryError) {
    console.error('❌ Error counting agents with territory:', territoryError.message);
    return;
  }

  // Sample some agents
  const { data: sample, error: sampleError } = await supabase
    .from('synthetic_agents')
    .select('agent_id, territory_id, sex, age, age_group, income_decile, connectivity_level')
    .limit(5);

  if (sampleError) {
    console.error('❌ Error sampling agents:', sampleError.message);
    return;
  }

  console.log(`\n📋 Verification:`);
  console.log(`   Total agents: ${totalCount}`);
  console.log(`   With territory: ${withTerritory}`);
  console.log(`   Without territory: ${(totalCount || 0) - (withTerritory || 0)}`);
  
  console.log('\n📋 Sample agents:');
  console.log('─'.repeat(100));
  sample?.forEach(a => {
    console.log(`${a.agent_id} | ${a.sex} | Age: ${a.age} | ${a.age_group.padEnd(12)} | Income: ${a.income_decile || 'N/A'} | Conn: ${a.connectivity_level || 'N/A'}`);
  });
}

async function main() {
  console.log('🌱 Starting agents seed...\n');

  // Usar serviceClient que ya está validado y configurado con SERVICE_KEY
  const supabase = serviceClient;
  console.log('🔗 Usando serviceClient con SERVICE_KEY');

  // Run seed
  const result = await seedAgents(supabase);

  if (result.errors.length > 0) {
    console.error(`\n❌ Completed with ${result.errors.length} errors`);
    result.errors.forEach(e => console.error(`  - ${e}`));
  } else {
    console.log(`\n✅ Successfully inserted ${result.inserted} agents`);
    if (result.skipped > 0) {
      console.log(`⚠️  ${result.skipped} agents without territory mapping`);
    }
  }

  // Verify
  await verifyAgents(supabase);

  console.log('\n🎉 Agents seed completed!');
}

// Run if called directly
if (require.main === module) {
  main().catch(err => {
    console.error('💥 Fatal error:', err);
    process.exit(1);
  });
}

export { seedAgents, loadAgentsData };
