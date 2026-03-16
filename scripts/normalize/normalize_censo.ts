/**
 * Normalize Census Data
 * 
 * Normaliza los datos crudos del censo al formato unificado del pipeline.
 * 
 * INPUT:
 *   - data/interim/census_raw.json
 * 
 * OUTPUT:
 *   - data/interim/census_normalized.json
 * 
 * ETAPA: Normalización
 */

import * as fs from 'fs';
import * as path from 'path';
import { CHILE_TERRITORIES } from '../config/territories';

const INPUT_PATH = path.join(process.cwd(), 'data/interim/census_raw.json');
const OUTPUT_PATH = path.join(process.cwd(), 'data/interim/census_normalized.json');

interface CensusNormalizedRecord {
  territory_code: string;
  territory_name: string;
  territory_level: string;
  
  // Demografía
  total_population: number;
  male_population: number;
  female_population: number;
  population_male_pct: number;
  population_female_pct: number;
  
  // Estructura de edad
  age_0_14: number;
  age_15_64: number;
  age_65_plus: number;
  age_dependency_ratio: number;
  median_age_estimate: number;
  
  // Vivienda
  total_dwellings: number;
  occupied_dwellings: number;
  dwelling_occupancy_rate: number;
  persons_per_dwelling: number;
  
  // Educación (tasas)
  education_no_rate: number;
  education_basic_rate: number;
  education_middle_rate: number;
  education_higher_rate: number;
  
  // Empleo (tasas)
  labor_participation_rate: number;
  employment_rate: number;
  unemployment_rate: number;
  inactivity_rate: number;
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
function normalizeRecord(raw: any): CensusNormalizedRecord | null {
  const territory = CHILE_TERRITORIES.find(t => t.code === raw.region_code);
  if (!territory) {
    console.warn(`⚠️ Territorio no encontrado: ${raw.region_code}`);
    return null;
  }
  
  const totalPop = raw.total_population || 0;
  const totalDwellings = raw.total_dwellings || 1;
  const activePop = raw.economically_active || 0;
  
  return {
    territory_code: raw.region_code,
    territory_name: territory.name,
    territory_level: 'region',
    
    // Demografía
    total_population: totalPop,
    male_population: raw.male_population || 0,
    female_population: raw.female_population || 0,
    population_male_pct: totalPop > 0 ? ((raw.male_population || 0) / totalPop) * 100 : 0,
    population_female_pct: totalPop > 0 ? ((raw.female_population || 0) / totalPop) * 100 : 0,
    
    // Edad
    age_0_14: raw.age_0_14 || 0,
    age_15_64: raw.age_15_64 || 0,
    age_65_plus: raw.age_65_plus || 0,
    age_dependency_ratio: totalPop > 0 
      ? (((raw.age_0_14 || 0) + (raw.age_65_plus || 0)) / (raw.age_15_64 || 1)) * 100 
      : 0,
    median_age_estimate: 35, // Estimación placeholder
    
    // Vivienda
    total_dwellings: raw.total_dwellings || 0,
    occupied_dwellings: raw.occupied_dwellings || 0,
    dwelling_occupancy_rate: totalDwellings > 0 
      ? ((raw.occupied_dwellings || 0) / totalDwellings) * 100 
      : 0,
    persons_per_dwelling: raw.occupied_dwellings > 0 
      ? totalPop / raw.occupied_dwellings 
      : 0,
    
    // Educación (tasas)
    education_no_rate: totalPop > 0 ? ((raw.no_education || 0) / totalPop) * 100 : 0,
    education_basic_rate: totalPop > 0 ? ((raw.basic_education || 0) / totalPop) * 100 : 0,
    education_middle_rate: totalPop > 0 ? ((raw.middle_education || 0) / totalPop) * 100 : 0,
    education_higher_rate: totalPop > 0 ? ((raw.higher_education || 0) / totalPop) * 100 : 0,
    
    // Empleo (tasas)
    labor_participation_rate: totalPop > 0 ? (activePop / totalPop) * 100 : 0,
    employment_rate: activePop > 0 ? ((raw.employed || 0) / activePop) * 100 : 0,
    unemployment_rate: activePop > 0 ? ((raw.unemployed || 0) / activePop) * 100 : 0,
    inactivity_rate: totalPop > 0 ? ((raw.inactive || 0) / totalPop) * 100 : 0,
  };
}

/**
 * Guardar datos normalizados
 */
function saveNormalizedData(data: CensusNormalizedRecord[]): void {
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
export function normalizeCensus(): void {
  console.log('🚀 Iniciando normalización del censo...');
  console.log('='.repeat(50));
  
  const rawData = loadRawData();
  console.log(`📊 Registros crudos: ${rawData.length}`);
  
  const normalizedData = rawData
    .map(normalizeRecord)
    .filter((r): r is CensusNormalizedRecord => r !== null);
  
  console.log(`📊 Registros normalizados: ${normalizedData.length}`);
  
  saveNormalizedData(normalizedData);
  
  console.log('='.repeat(50));
  console.log('✅ Normalización del censo completada');
}

if (process.argv[1]?.includes('pipeline.ts')) {
  normalizeCensus();
}

export default normalizeCensus;