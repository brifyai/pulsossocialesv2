/**
 * Normalize CASEN Data
 * 
 * Normaliza los datos crudos de CASEN al formato unificado del pipeline.
 * 
 * INPUT:
 *   - data/interim/casen_raw.json
 * 
 * OUTPUT:
 *   - data/interim/casen_normalized.json
 * 
 * ETAPA: Normalización
 */

import * as fs from 'fs';
import * as path from 'path';
import { CHILE_TERRITORIES } from '../config/territories';

const INPUT_PATH = path.join(process.cwd(), 'data/interim/casen_raw.json');
const OUTPUT_PATH = path.join(process.cwd(), 'data/interim/casen_normalized.json');

interface CasenNormalizedRecord {
  territory_code: string;
  territory_name: string;
  territory_level: string;
  
  // Ingresos
  household_monetary_income: number;
  household_autonomous_income: number;
  per_capita_income: number;
  income_quintile: number;
  income_quintile_label: string;
  
  // Vivienda
  dwelling_type: string;
  household_size: number;
  bedrooms: number;
  persons_per_room: number;
  
  // Demografía
  total_population: number;
  male_population: number;
  female_population: number;
  
  // Pobreza
  poverty_rate: number;
  extreme_poverty_rate: number;
  poverty_status_distribution: Record<string, number>;
}

/**
 * Cargar datos crudos
 */
function loadRawData(): any[] {
  if (!fs.existsSync(INPUT_PATH)) {
    console.warn(`⚠️ Archivo no encontrado: ${INPUT_PATH}`);
    return [];
  }
  const content = fs.readFileSync(INPUT_PATH, 'utf-8');
  return JSON.parse(content);
}

/**
 * Normalizar un registro
 */
function normalizeRecord(raw: any): CasenNormalizedRecord | null {
  const territory = CHILE_TERRITORIES.find(t => t.code === raw.region_code);
  if (!territory) return null;
  
  const quintileLabels: Record<number, string> = {
    1: 'Quintil I (20% más pobre)',
    2: 'Quintil II',
    3: 'Quintil III',
    4: 'Quintil IV',
    5: 'Quintil V (20% más rico)',
  };
  
  return {
    territory_code: raw.region_code,
    territory_name: territory.name,
    territory_level: 'region',
    
    household_monetary_income: raw.household_monetary_income || 0,
    household_autonomous_income: raw.household_autonomous_income || 0,
    per_capita_income: raw.per_capita_income || 0,
    income_quintile: raw.income_quintile || 0,
    income_quintile_label: quintileLabels[raw.income_quintile] || 'Sin dato',
    
    dwelling_type: raw.dwelling_type || 'sin_dato',
    household_size: raw.household_size || 1,
    bedrooms: raw.bedrooms || 1,
    persons_per_room: raw.bedrooms > 0 ? raw.household_size / raw.bedrooms : 0,
    
    total_population: raw.household_size || 0,
    male_population: raw.sex === 'm' ? 1 : 0,
    female_population: raw.sex === 'f' ? 1 : 0,
    
    poverty_rate: raw.poverty_status === 'pobre' ? 100 : 0,
    extreme_poverty_rate: raw.extreme_poverty ? 100 : 0,
    poverty_status_distribution: {
      no_pobre: raw.poverty_status === 'no_pobre' ? 1 : 0,
      pobre: raw.poverty_status === 'pobre' ? 1 : 0,
    },
  };
}

/**
 * Agregar por territorio
 */
function aggregateByTerritory(records: CasenNormalizedRecord[]): CasenNormalizedRecord[] {
  const aggregated = new Map<string, CasenNormalizedRecord>();
  
  for (const record of records) {
    const key = record.territory_code;
    if (!aggregated.has(key)) {
      aggregated.set(key, { ...record, poverty_status_distribution: { no_pobre: 0, pobre: 0 } });
    } else {
      const existing = aggregated.get(key)!;
      existing.household_monetary_income += record.household_monetary_income;
      existing.household_autonomous_income += record.household_autonomous_income;
      existing.per_capita_income += record.per_capita_income;
      existing.total_population += record.total_population;
      existing.male_population += record.male_population;
      existing.female_population += record.female_population;
      existing.poverty_rate += record.poverty_rate;
      existing.extreme_poverty_rate += record.extreme_poverty_rate;
      existing.poverty_status_distribution.no_pobre += record.poverty_status_distribution.no_pobre;
      existing.poverty_status_distribution.pobre += record.poverty_status_distribution.pobre;
    }
  }
  
  return Array.from(aggregated.values());
}

/**
 * Guardar datos normalizados
 */
function saveNormalizedData(data: CasenNormalizedRecord[]): void {
  const outputDir = path.dirname(OUTPUT_PATH);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(data, null, 2));
  console.log(`✅ Datos normalizados guardados en: ${OUTPUT_PATH}`);
}

/**
 * Función principal
 */
export function normalizeCasen(): void {
  console.log('🚀 Iniciando normalización de CASEN...');
  console.log('='.repeat(50));
  
  const rawData = loadRawData();
  console.log(`📊 Registros crudos: ${rawData.length}`);
  
  const normalizedData = rawData
    .map(normalizeRecord)
    .filter((r): r is CasenNormalizedRecord => r !== null);
  
  const aggregatedData = aggregateByTerritory(normalizedData);
  
  console.log(`📊 Registros normalizados: ${aggregatedData.length}`);
  
  saveNormalizedData(aggregatedData);
  
  console.log('='.repeat(50));
  console.log('✅ Normalización de CASEN completada');
}

if (process.argv[1]?.includes('pipeline.ts')) {
  normalizeCasen();
}

export default normalizeCasen;