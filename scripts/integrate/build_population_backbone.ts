/**
 * Build Population Backbone
 * 
 * Integra datos de censo y CASEN para crear el backbone de población.
 * 
 * INPUT:
 *   - data/interim/census_normalized.json
 *   - data/interim/casen_normalized.json
 * 
 * OUTPUT:
 *   - data/processed/population_backbone.json
 * 
 * ETAPA: Integración
 */

import * as fs from 'fs';
import * as path from 'path';

const CENSUS_INPUT = path.join(process.cwd(), 'data/interim/census_normalized.json');
const CASEN_INPUT = path.join(process.cwd(), 'data/interim/casen_normalized.json');
const OUTPUT_PATH = path.join(process.cwd(), 'data/processed/population_backbone.json');

interface PopulationBackbone {
  territory_code: string;
  territory_name: string;
  territory_level: string;
  
  // Del censo
  total_population: number;
  male_population: number;
  female_population: number;
  age_0_14: number;
  age_15_64: number;
  age_65_plus: number;
  age_dependency_ratio: number;
  
  // De CASEN
  avg_per_capita_income: number;
  income_quintile_avg: number;
  poverty_rate: number;
  extreme_poverty_rate: number;
  
  // Calculados
  population_density?: number;
  median_income?: number;
  
  // Metadatos
  census_year: number;
  casen_year: number;
  created_at: string;
}

/**
 * Cargar datos normalizados
 */
function loadCensusData(): any[] {
  if (!fs.existsSync(CENSUS_INPUT)) {
    console.warn(`⚠️ Archivo no encontrado: ${CENSUS_INPUT}`);
    return [];
  }
  return JSON.parse(fs.readFileSync(CENSUS_INPUT, 'utf-8'));
}

function loadCasenData(): any[] {
  if (!fs.existsSync(CASEN_INPUT)) {
    console.warn(`⚠️ Archivo no encontrado: ${CASEN_INPUT}`);
    return [];
  }
  return JSON.parse(fs.readFileSync(CASEN_INPUT, 'utf-8'));
}

/**
 * Construir backbone integrando fuentes
 */
function buildPopulationBackbone(): PopulationBackbone[] {
  console.log('🏗️ Construyendo population_backbone...');
  
  const censusData = loadCensusData();
  const casenData = loadCasenData();
  
  // Indexar CASEN por territorio
  const casenByTerritory = new Map<string, any>();
  for (const record of casenData) {
    casenByTerritory.set(record.territory_code, record);
  }
  
  // Integrar
  const backbone: PopulationBackbone[] = [];
  
  for (const census of censusData) {
    const code = census.territory_code;
    const casen = casenByTerritory.get(code);
    
    backbone.push({
      territory_code: code,
      territory_name: census.territory_name,
      territory_level: census.territory_level,
      
      // Census
      total_population: census.total_population,
      male_population: census.male_population,
      female_population: census.female_population,
      age_0_14: census.age_0_14,
      age_15_64: census.age_15_64,
      age_65_plus: census.age_65_plus,
      age_dependency_ratio: census.age_dependency_ratio,
      
      // CASEN
      avg_per_capita_income: casen?.per_capita_income || 0,
      income_quintile_avg: casen?.income_quintile || 0,
      poverty_rate: casen?.poverty_rate || 0,
      extreme_poverty_rate: casen?.extreme_poverty_rate || 0,
      
      // Metadatos
      census_year: 2024,
      casen_year: 2022,
      created_at: new Date().toISOString(),
    });
  }
  
  return backbone;
}

/**
 * Guardar resultado
 */
function saveBackbone(data: PopulationBackbone[]): void {
  const outputDir = path.dirname(OUTPUT_PATH);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(data, null, 2));
  console.log(`✅ Population backbone guardado en: ${OUTPUT_PATH}`);
}

/**
 * Función principal
 */
export function buildPopulationBackbonePipeline(): void {
  console.log('🚀 Iniciando construcción de population_backbone...');
  console.log('='.repeat(50));
  
  const data = buildPopulationBackbone();
  console.log(`📊 Registros creados: ${data.length}`);
  
  saveBackbone(data);
  
  console.log('='.repeat(50));
  console.log('✅ population_backbone completado');
}

if (process.argv[1]?.includes('pipeline.ts')) {
  buildPopulationBackbonePipeline();
}

export default buildPopulationBackbonePipeline;