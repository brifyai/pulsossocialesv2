#!/usr/bin/env node
/**
 * Master seed script for Pulsos Sociales database
 * Runs territories seed first, then agents seed
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Region code mapping (short code -> CL-XX format)
const REGION_CODE_MAP = {
  'AP': 'CL-15', 'TA': 'CL-01', 'AN': 'CL-02', 'AT': 'CL-03',
  'CO': 'CL-04', 'VA': 'CL-05', 'LI': 'CL-06', 'ML': 'CL-07',
  'BI': 'CL-08', 'NB': 'CL-16', 'AR': 'CL-09', 'LR': 'CL-14',
  'LL': 'CL-10', 'AI': 'CL-11', 'MA': 'CL-12', 'RM': 'CL-13'
};

async function seedTerritories(supabase) {
  const results = { inserted: 0, errors: [] };

  // Load territories data
  const dataPath = path.join(__dirname, '../../data/processed/territories_master.json');
  const rawData = fs.readFileSync(dataPath, 'utf-8');
  const territories = JSON.parse(rawData);

  console.log(`📊 Found ${territories.length} territories to insert`);

  for (const t of territories) {
    // Map short code to CL-XX format
    const regionCode = REGION_CODE_MAP[t.code] || t.code;

    const territoryData = {
      id: regionCode,
      region_code: t.code,
      region_name: t.name,
      comuna_code: t.code,
      comuna_name: t.name,
      population_total: t.population || 0,
      centroid: t.centroid || null,
      metadata: {
        source: t.source || 'INE Chile',
        original_id: t.id,
        level: t.level
      }
    };

    const { error } = await supabase
      .from('territories')
      .upsert(territoryData, { onConflict: 'id' });

    if (error) {
      results.errors.push(`${t.code}: ${error.message}`);
    } else {
      results.inserted++;
      process.stdout.write(`\r   Inserted: ${results.inserted}/${territories.length}`);
    }
  }

  console.log(); // newline
  return results;
}

async function seedAgents(supabase) {
  const results = { inserted: 0, errors: [], skipped: 0 };

  // Load agents data
  const dataPath = path.join(__dirname, '../../data/processed/synthetic_agents_v1.json');
  const rawData = fs.readFileSync(dataPath, 'utf-8');
  const { agents } = JSON.parse(rawData);

  console.log(`📊 Found ${agents.length} agents to insert`);

  // Get territory mapping
  const { data: territories, error: terrError } = await supabase
    .from('territories')
    .select('id, region_code');

  if (terrError) {
    throw new Error(`Failed to fetch territories: ${terrError.message}`);
  }

  const territoryMap = new Map(territories.map(t => [t.region_code, t.id]));

  for (const agent of agents) {
    const territoryId = territoryMap.get(agent.region_code);

    if (!territoryId) {
      results.skipped++;
      continue;
    }

    const agentData = {
      agent_id: agent.agent_id,
      territory_id: territoryId,
      sex: agent.sex,
      age: agent.age,
      age_group: agent.age_group,
      household_size: agent.household_size,
      household_type: agent.household_type,
      income_decile: agent.income_decile,
      poverty_status: agent.poverty_status,
      education_level: agent.education_level,
      occupation_status: agent.occupation_status,
      occupation_group: agent.occupation_group,
      socioeconomic_level: agent.socioeconomic_level,
      connectivity_level: agent.connectivity_level,
      digital_exposure_level: agent.digital_exposure_level,
      preferred_survey_channel: agent.preferred_survey_channel,
      agent_type: agent.agent_type,
      metadata: {
        backbone_key: agent.backbone_key,
        subtel_profile_key: agent.subtel_profile_key,
        generation_notes: agent.generation_notes
      }
    };

    const { error } = await supabase
      .from('synthetic_agents')
      .upsert(agentData, { onConflict: 'agent_id' });

    if (error) {
      results.errors.push(`${agent.agent_id}: ${error.message}`);
    } else {
      results.inserted++;
      if (results.inserted % 100 === 0) {
        process.stdout.write(`\r   Inserted: ${results.inserted}/${agents.length}`);
      }
    }
  }

  console.log(`\r   Inserted: ${results.inserted}/${agents.length}`);
  return results;
}

async function main() {
  console.log('╔════════════════════════════════════════════════════════════════╗');
  console.log('║     🌱 PULSOS SOCIALES - DATABASE SEED                        ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');

  // Get Supabase credentials from environment
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase credentials.');
    console.error('   Set environment variables:');
    console.error('   - SUPABASE_URL or VITE_SUPABASE_URL');
    console.error('   - SUPABASE_SERVICE_ROLE_KEY or VITE_SUPABASE_ANON_KEY');
    process.exit(1);
  }

  console.log(`🔗 Connecting to: ${supabaseUrl}\n`);
  const supabase = createClient(supabaseUrl, supabaseKey);

  // Track results
  const results = {
    territories: { inserted: 0, errors: [] },
    agents: { inserted: 0, errors: [], skipped: 0 },
  };

  // ─────────────────────────────────────────────────────────────────
  // STEP 1: Seed Territories
  // ─────────────────────────────────────────────────────────────────
  console.log('┌────────────────────────────────────────────────────────────────┐');
  console.log('│ STEP 1: Seeding Territories                                    │');
  console.log('└────────────────────────────────────────────────────────────────┘\n');

  try {
    results.territories = await seedTerritories(supabase);
    console.log(`\n✅ Territories: ${results.territories.inserted} inserted`);
    if (results.territories.errors.length > 0) {
      console.error(`   ⚠️  ${results.territories.errors.length} errors`);
    }
  } catch (err) {
    console.error('💥 Fatal error seeding territories:', err);
    process.exit(1);
  }

  // ─────────────────────────────────────────────────────────────────
  // STEP 2: Seed Agents
  // ─────────────────────────────────────────────────────────────────
  console.log('\n┌────────────────────────────────────────────────────────────────┐');
  console.log('│ STEP 2: Seeding Synthetic Agents                               │');
  console.log('└────────────────────────────────────────────────────────────────┘\n');

  try {
    results.agents = await seedAgents(supabase);
    console.log(`\n✅ Agents: ${results.agents.inserted} inserted`);
    if (results.agents.skipped > 0) {
      console.log(`   ⚠️  ${results.agents.skipped} without territory mapping`);
    }
    if (results.agents.errors.length > 0) {
      console.error(`   ❌ ${results.agents.errors.length} errors`);
    }
  } catch (err) {
    console.error('💥 Fatal error seeding agents:', err);
    process.exit(1);
  }

  // ─────────────────────────────────────────────────────────────────
  // SUMMARY
  // ─────────────────────────────────────────────────────────────────
  console.log('\n╔════════════════════════════════════════════════════════════════╗');
  console.log('║                      SEED SUMMARY                              ║');
  console.log('╠════════════════════════════════════════════════════════════════╣');
  console.log(`║  Territories inserted:  ${results.territories.inserted.toString().padStart(6)}                          ║`);
  console.log(`║  Agents inserted:       ${results.agents.inserted.toString().padStart(6)}                          ║`);
  console.log(`║  Agents w/o territory:  ${results.agents.skipped.toString().padStart(6)}                          ║`);
  console.log(`║  Total errors:          ${(results.territories.errors.length + results.agents.errors.length).toString().padStart(6)}                          ║`);
  console.log('╚════════════════════════════════════════════════════════════════╝\n');

  // Final status
  const totalErrors = results.territories.errors.length + results.agents.errors.length;
  if (totalErrors === 0) {
    console.log('🎉 Seed completed successfully!');
    console.log('\nNext steps:');
    console.log('  1. Verify data in Supabase Studio');
    console.log('  2. Run validation queries');
    console.log('  3. Test application connectivity\n');
    process.exit(0);
  } else {
    console.error(`⚠️  Seed completed with ${totalErrors} errors`);
    process.exit(1);
  }
}

// Run if called directly
main().catch(err => {
  console.error('💥 Unhandled error:', err);
  process.exit(1);
});
