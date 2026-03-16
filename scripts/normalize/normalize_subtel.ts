/**
 * Normalize SUBTEL Data
 * 
 * Normaliza los datos crudos de SUBTEL al formato unificado del pipeline.
 * 
 * INPUT:
 *   - data/interim/subtel_raw.json
 * 
 * OUTPUT:
 *   - data/interim/subtel_normalized.json
 * 
 * ETAPA: Normalización
 */

import * as fs from 'fs';
import * as path from 'path';
import { CHILE_TERRITORIES } from '../config/territories';

const INPUT_PATH = path.join(process.cwd(), 'data/interim/subtel_raw.json');
const OUTPUT_PATH = path.join(process.cwd(), 'data/interim/subtel_normalized.json');

interface SubtelNormalizedRecord {
  territory_code: string;
  territory_name: string;
  territory_level: string;
  
  // Conectividad fija
  fixed_internet_connections: number;
  broadband_connections: number;
  average_speed_mbps: number;
  
  // Conectividad móvil
  mobile_connections: number;
  connections_4g: number;
  connections_5g: number;
  mobile_4g_pct: number;
  mobile_5g_pct: number;
  
  // Cobertura
  population_4g_coverage: number;
  population_5g_coverage: number;
  
  // Penetración
  internet_household_penetration: number;
  mobile_penetration: number;
  
  // Mercado
  active_operators: number;
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
function normalizeRecord(raw: any): SubtelNormalizedRecord | null {
  const territory = CHILE_TERRITORIES.find(t => t.code === raw.region_code);
  if (!territory) return null;
  
  const mobileTotal = raw.mobile_connections || 1;
  
  return {
    territory_code: raw.region_code,
    territory_name: territory.name,
    territory_level: 'region',
    
    fixed_internet_connections: raw.fixed_internet_connections || 0,
    broadband_connections: raw.broadband_connections || 0,
    average_speed_mbps: raw.average_speed_mbps || 0,
    
    mobile_connections: raw.mobile_connections || 0,
    connections_4g: raw.connections_4g || 0,
    connections_5g: raw.connections_5g || 0,
    mobile_4g_pct: (raw.connections_4g || 0) / mobileTotal * 100,
    mobile_5g_pct: (raw.connections_5g || 0) / mobileTotal * 100,
    
    population_4g_coverage: raw.population_4g_coverage || 0,
    population_5g_coverage: raw.population_5g_coverage || 0,
    
    internet_household_penetration: raw.internet_household_penetration || 0,
    mobile_penetration: raw.mobile_penetration || 0,
    
    active_operators: raw.active_operators || 0,
  };
}

/**
 * Guardar datos normalizados
 */
function saveNormalizedData(data: SubtelNormalizedRecord[]): void {
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
export function normalizeSubtel(): void {
  console.log('🚀 Iniciando normalización de SUBTEL...');
  console.log('='.repeat(50));
  
  const rawData = loadRawData();
  console.log(`📊 Registros crudos: ${rawData.length}`);
  
  const normalizedData = rawData
    .map(normalizeRecord)
    .filter((r): r is SubtelNormalizedRecord => r !== null);
  
  console.log(`📊 Registros normalizados: ${normalizedData.length}`);
  
  saveNormalizedData(normalizedData);
  
  console.log('='.repeat(50));
  console.log('✅ Normalización de SUBTEL completada');
}

if (process.argv[1]?.includes('pipeline.ts')) {
  normalizeSubtel();
}

export default normalizeSubtel;