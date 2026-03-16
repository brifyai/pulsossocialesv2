#!/usr/bin/env ts-node
/**
 * Master seed script for Pulsos Sociales database
 * Runs territories seed first, then agents seed
 */

import { createClient } from '@supabase/supabase-js';
import { seedTerritories } from './seed_territories';
import { seedAgents } from './seed_agents';

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
    territories: { inserted: 0, errors: [] as string[] },
    agents: { inserted: 0, errors: [] as string[], skipped: 0 },
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
if (require.main === module) {
  main().catch(err => {
    console.error('💥 Unhandled error:', err);
    process.exit(1);
  });
}
