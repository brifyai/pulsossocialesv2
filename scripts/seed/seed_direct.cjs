#!/usr/bin/env node
/**
 * Direct seed script using fetch API
 * No external dependencies required
 * 
 * ACTUALIZADO: 2026-03-16 - Compatible con modelo territories alineado
 * - Soporta códigos cortos (RM, VA, etc.)
 * - Usa campos: level, code, name, centroid
 */

const fs = require('fs');
const path = require('path');

// Region code mapping (short code -> CL-XX format) - Para referencia
const REGION_CODE_MAP = {
  'AP': 'CL-15', 'TA': 'CL-01', 'AN': 'CL-02', 'AT': 'CL-03',
  'CO': 'CL-04', 'VA': 'CL-05', 'LI': 'CL-06', 'ML': 'CL-07',
  'BI': 'CL-08', 'NB': 'CL-16', 'AR': 'CL-09', 'LR': 'CL-14',
  'LL': 'CL-10', 'AI': 'CL-11', 'MA': 'CL-12', 'RM': 'CL-13'
};

class SupabaseClient {
  constructor(url, key) {
    this.url = url;
    this.key = key;
  }

  async request(table, method, body = null, query = '') {
    const url = `${this.url}/rest/v1/${table}${query}`;
    const options = {
      method,
      headers: {
        'apikey': this.key,
        'Authorization': `Bearer ${this.key}`,
        'Content-Type': 'application/json',
        'Prefer': method === 'POST' ? 'resolution=merge-duplicates' : ''
      }
    };
    if (body) options.body = JSON.stringify(body);

    const response = await fetch(url, options);
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`HTTP ${response.status}: ${error}`);
    }
    return response.json().catch(() => null);
  }

  from(table) {
    return {
      select: (cols) => ({
        then: async (cb) => {
          const data = await this.request(table, 'GET', null, `?select=${cols}`);
          return cb({ data, error: null });
        }
      }),
      upsert: (data, opts) => ({
        then: async (cb) => {
          try {
            await this.request(table, 'POST', data);
            return cb({ data: null, error: null });
          } catch (err) {
            return cb({ data: null, error: err });
          }
        }
      })
    };
  }
}

async function seedTerritories(supabase) {
  const results = { inserted: 0, errors: [] };

  const dataPath = path.join(__dirname, '../../data/processed/territories_master.json');
  const rawData = fs.readFileSync(dataPath, 'utf-8');
  const territories = JSON.parse(rawData);

  console.log(`📊 Found ${territories.length} territories to insert`);

  for (const t of territories) {
    // Build territory data matching the NEW schema (modelo alineado)
    // Mapeo: JSON -> SQL
    // t.id/t.code -> code (código corto: RM, VA, etc.)
    // t.name -> name
    // t.level -> level (default 'region' si no existe)
    // t.population -> population_total
    // t.centroid -> centroid (convertir array [lng, lat] a formato POINT)
    
    // Convertir centroid de array [lng, lat] a formato string para PostgreSQL POINT
    // Formato: (lng,lat) sin espacios
    let centroidPoint = null;
    if (t.centroid && Array.isArray(t.centroid) && t.centroid.length === 2) {
      centroidPoint = `(${t.centroid[0]},${t.centroid[1]})`;
    }
    
    // Mapear código corto a formato CL-XX para region_code
    const shortCode = t.code || t.id;
    const regionCodeMap = {
      'AP': 'CL-15', 'TA': 'CL-01', 'AN': 'CL-02', 'AT': 'CL-03',
      'CO': 'CL-04', 'VA': 'CL-05', 'LI': 'CL-06', 'ML': 'CL-07',
      'BI': 'CL-08', 'NB': 'CL-16', 'AR': 'CL-09', 'LR': 'CL-14',
      'LL': 'CL-10', 'AI': 'CL-11', 'MA': 'CL-12', 'RM': 'CL-13'
    };
    const regionCodeFormatted = regionCodeMap[shortCode] || shortCode;
    
    const territoryData = {
      level: t.level || 'region',
      code: shortCode,                             // Código corto: RM, VA, etc.
      name: t.name,                                // Nombre del territorio
      // Para regiones, usar el formato CL-XX como region_code
      // Para comunas, usar el region_code del JSON (que ya debería estar en formato CL-XX)
      region_code: t.level === 'comuna' ? t.region_code : regionCodeFormatted,
      region_name: t.level === 'comuna' ? t.region_name : t.name,
      population_total: t.population || 0,
      centroid: centroidPoint,                     // Formato POINT(lng lat)
      source: t.source || 'ine',
      source_year: t.source_year || 2017
    };

    try {
      await supabase.request('territories', 'POST', territoryData);
      results.inserted++;
      process.stdout.write(`\r   Inserted: ${results.inserted}/${territories.length}`);
    } catch (err) {
      results.errors.push(`${t.code}: ${err.message}`);
    }
  }

  console.log();
  return results;
}

async function seedAgents(supabase) {
  const results = { inserted: 0, errors: [], skipped: 0 };

  const dataPath = path.join(__dirname, '../../data/processed/synthetic_agents_v1.json');
  const rawData = fs.readFileSync(dataPath, 'utf-8');
  const { agents } = JSON.parse(rawData);

  console.log(`📊 Found ${agents.length} agents to insert`);

  // Get territories for mapping (code -> id) - NUEVO: usar 'code' en lugar de 'region_code'
  const territories = await supabase.request('territories', 'GET', null, '?select=id,code');
  const territoryMap = new Map(territories.map(t => [t.code, t.id]));

  console.log(`   Loaded ${territories.length} territories for mapping`);

  for (const agent of agents) {
    // Map short region code directly to territory code (RM, VA, etc.)
    const territoryId = territoryMap.get(agent.region_code);

    if (!territoryId) {
      results.skipped++;
      if (results.skipped <= 5) {
        console.log(`   ⚠️  No territory found for code: ${agent.region_code}`);
      }
      continue;
    }

    // Map employment_status to employment_status (schema uses employment_status)
    const agentData = {
      agent_id: agent.agent_id,
      batch_id: agent.synthetic_batch_id,
      territory_id: territoryId,
      sex: agent.sex,
      age: agent.age,
      age_group: agent.age_group,
      income_decile: agent.income_decile,
      education_level: agent.education_level,
      employment_status: agent.occupation_status, // Map occupation_status -> employment_status
      connectivity_level: agent.connectivity_level,
      has_smartphone: agent.connectivity_level === 'very_high' || agent.connectivity_level === 'high',
      has_computer: agent.digital_exposure_level === 'very_high' || agent.digital_exposure_level === 'high',
      internet_quality: agent.connectivity_level,
      backbone_key: agent.backbone_key,
      synthesis_version: agent.source_version,
      metadata: {
        household_size: agent.household_size,
        household_type: agent.household_type,
        poverty_status: agent.poverty_status,
        occupation_group: agent.occupation_group,
        socioeconomic_level: agent.socioeconomic_level,
        digital_exposure_level: agent.digital_exposure_level,
        preferred_survey_channel: agent.preferred_survey_channel,
        agent_type: agent.agent_type,
        subtel_profile_key: agent.subtel_profile_key,
        generation_notes: agent.generation_notes
      }
    };

    try {
      await supabase.request('synthetic_agents', 'POST', agentData);
      results.inserted++;
      if (results.inserted % 100 === 0) {
        process.stdout.write(`\r   Inserted: ${results.inserted}/${agents.length}`);
      }
    } catch (err) {
      results.errors.push(`${agent.agent_id}: ${err.message}`);
    }
  }

  console.log(`\r   Inserted: ${results.inserted}/${agents.length}`);
  return results;
}

async function main() {
  console.log('╔════════════════════════════════════════════════════════════════╗');
  console.log('║     🌱 PULSOS SOCIALES - DATABASE SEED                        ║');
  console.log('║     Modelo Alineado v2.0 (Códigos Cortos)                     ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');

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
  const supabase = new SupabaseClient(supabaseUrl, supabaseKey);

  const results = {
    territories: { inserted: 0, errors: [] },
    agents: { inserted: 0, errors: [], skipped: 0 },
  };

  console.log('┌────────────────────────────────────────────────────────────────┐');
  console.log('│ STEP 1: Seeding Territories (Modelo Alineado)                  │');
  console.log('│        level, code, name, centroid                             │');
  console.log('└────────────────────────────────────────────────────────────────┘\n');

  try {
    results.territories = await seedTerritories(supabase);
    console.log(`\n✅ Territories: ${results.territories.inserted} inserted`);
    if (results.territories.errors.length > 0) {
      console.error(`   ⚠️  ${results.territories.errors.length} errors`);
      results.territories.errors.slice(0, 5).forEach(e => console.error(`      - ${e}`));
    }
  } catch (err) {
    console.error('💥 Fatal error seeding territories:', err);
    process.exit(1);
  }

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
      results.agents.errors.slice(0, 5).forEach(e => console.error(`      - ${e}`));
    }
  } catch (err) {
    console.error('💥 Fatal error seeding agents:', err);
    process.exit(1);
  }

  console.log('\n╔════════════════════════════════════════════════════════════════╗');
  console.log('║                      SEED SUMMARY                              ║');
  console.log('╠════════════════════════════════════════════════════════════════╣');
  console.log(`║  Territories inserted:  ${results.territories.inserted.toString().padStart(6)}                          ║`);
  console.log(`║  Agents inserted:       ${results.agents.inserted.toString().padStart(6)}                          ║`);
  console.log(`║  Agents w/o territory:  ${results.agents.skipped.toString().padStart(6)}                          ║`);
  console.log(`║  Total errors:          ${(results.territories.errors.length + results.agents.errors.length).toString().padStart(6)}                          ║`);
  console.log('╚════════════════════════════════════════════════════════════════╝\n');

  const totalErrors = results.territories.errors.length + results.agents.errors.length;
  if (totalErrors === 0) {
    console.log('🎉 Seed completed successfully!');
    process.exit(0);
  } else {
    console.error(`⚠️  Seed completed with ${totalErrors} errors`);
    process.exit(1);
  }
}

main().catch(err => {
  console.error('💥 Unhandled error:', err);
  process.exit(1);
});
