#!/usr/bin/env ts-node
/**
 * Seed script for territories table
 * Loads regions from data/processed/territories_master.json
 * 
 * ⚠️ REQUIERE: SUPABASE_SERVICE_KEY en .env.scripts
 * NO usar ANON_KEY - el seeding requiere privilegios de service_role
 */

import * as fs from 'fs';
import * as path from 'path';
import { SupabaseClient } from '@supabase/supabase-js';
import { serviceClient } from '../utils/serviceClient';

// Types matching the database schema
interface TerritoryData {
  id: string;
  name: string;
  code: string;
  level: 'region' | 'comuna';
  population: number;
  centroid: [number, number]; // [lng, lat]
  created_at: string;
  source: string;
}

interface TerritoryInsert {
  country_code: string;
  region_code: string;
  region_name: string;
  comuna_code: string;
  comuna_name: string;
  population_total: number;
  source: string;
  source_year: number;
}

// Region code mapping (from short code to CL-XX format)
const REGION_CODE_MAP: Record<string, string> = {
  'AP': 'CL-15', // Arica y Parinacota
  'TA': 'CL-01', // Tarapacá
  'AN': 'CL-02', // Antofagasta
  'AT': 'CL-03', // Atacama
  'CO': 'CL-04', // Coquimbo
  'VA': 'CL-05', // Valparaíso
  'RM': 'CL-13', // Metropolitana
  'LI': 'CL-06', // O'Higgins
  'ML': 'CL-07', // Maule
  'NB': 'CL-16', // Ñuble
  'BI': 'CL-08', // Biobío
  'AR': 'CL-09', // La Araucanía
  'LR': 'CL-14', // Los Ríos
  'LL': 'CL-10', // Los Lagos
  'AI': 'CL-11', // Aysén
  'MA': 'CL-12', // Magallanes
};

// Region names mapping
const REGION_NAMES: Record<string, string> = {
  'AP': 'Arica y Parinacota',
  'TA': 'Tarapacá',
  'AN': 'Antofagasta',
  'AT': 'Atacama',
  'CO': 'Coquimbo',
  'VA': 'Valparaíso',
  'RM': 'Metropolitana de Santiago',
  'LI': "O'Higgins",
  'ML': 'Maule',
  'NB': 'Ñuble',
  'BI': 'Biobío',
  'AR': 'La Araucanía',
  'LR': 'Los Ríos',
  'LL': 'Los Lagos',
  'AI': 'Aysén',
  'MA': 'Magallanes',
};

function loadTerritoriesData(): TerritoryData[] {
  const filePath = path.join(process.cwd(), 'data', 'processed', 'territories_master.json');
  const rawData = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(rawData) as TerritoryData[];
}

function transformToDbFormat(territories: TerritoryData[]): TerritoryInsert[] {
  return territories
    .filter(t => t.level === 'region')
    .map(t => {
      const regionCode = REGION_CODE_MAP[t.code] || `CL-${t.code}`;
      return {
        country_code: 'CL',
        region_code: regionCode,
        region_name: REGION_NAMES[t.code] || t.name,
        comuna_code: t.code, // Using region code as comuna_code for now (will be updated when comunas are added)
        comuna_name: t.name,
        population_total: t.population,
        source: t.source || 'INE',
        source_year: 2017,
      };
    });
}

async function seedTerritories(supabase: SupabaseClient): Promise<{ inserted: number; errors: string[] }> {
  const territories = loadTerritoriesData();
  console.log(`📊 Loaded ${territories.length} territories from JSON`);

  const dbData = transformToDbFormat(territories);
  console.log(`🔄 Transformed ${dbData.length} territories for database`);

  const errors: string[] = [];
  let inserted = 0;

  // Insert in batches of 10
  const BATCH_SIZE = 10;
  for (let i = 0; i < dbData.length; i += BATCH_SIZE) {
    const batch = dbData.slice(i, i + BATCH_SIZE);
    
    const { data, error } = await supabase
      .from('territories')
      .upsert(batch, { 
        onConflict: 'comuna_code',
        ignoreDuplicates: false 
      })
      .select();

    if (error) {
      console.error(`❌ Error inserting batch ${i / BATCH_SIZE + 1}:`, error.message);
      errors.push(error.message);
    } else {
      inserted += data?.length || 0;
      console.log(`✅ Inserted batch ${i / BATCH_SIZE + 1}: ${data?.length || 0} territories`);
    }
  }

  return { inserted, errors };
}

async function verifyTerritories(supabase: SupabaseClient): Promise<void> {
  const { data, error } = await supabase
    .from('territories')
    .select('region_code, region_name, comuna_code, comuna_name, population_total')
    .order('region_code');

  if (error) {
    console.error('❌ Error verifying territories:', error.message);
    return;
  }

  console.log(`\n📋 Verification: ${data?.length || 0} territories in database`);
  console.log('─'.repeat(80));
  
  data?.forEach(t => {
    console.log(`${t.region_code} | ${t.region_name.padEnd(25)} | ${t.comuna_code} | Pop: ${t.population_total?.toLocaleString() || 'N/A'}`);
  });
}

async function main() {
  console.log('🌱 Starting territories seed...\n');

  // Usar serviceClient que ya está validado y configurado con SERVICE_KEY
  const supabase = serviceClient;
  console.log('🔗 Usando serviceClient con SERVICE_KEY');

  // Run seed
  const result = await seedTerritories(supabase);

  if (result.errors.length > 0) {
    console.error(`\n❌ Completed with ${result.errors.length} errors`);
    result.errors.forEach(e => console.error(`  - ${e}`));
  } else {
    console.log(`\n✅ Successfully inserted ${result.inserted} territories`);
  }

  // Verify
  await verifyTerritories(supabase);

  console.log('\n🎉 Territories seed completed!');
}

// Run if called directly
if (require.main === module) {
  main().catch(err => {
    console.error('💥 Fatal error:', err);
    process.exit(1);
  });
}

export { seedTerritories, loadTerritoriesData };
