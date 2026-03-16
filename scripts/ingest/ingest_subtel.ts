/**
 * Ingest SUBTEL Data
 * 
 * Este script ingiere datos de SUBTEL (Subsecretaría de Telecomunicaciones).
 * 
 * INPUT:
 *   - Archivos crudos de SUBTEL (CSV, XLSX)
 *   - Ubicación: data/raw/subtel/
 * 
 * OUTPUT:
 *   - JSON en data/interim/subtel_raw.json
 * 
 * ETAPA: Ingestión
 */

import * as fs from 'fs';
import * as path from 'path';

const RAW_DATA_PATH = path.join(process.cwd(), 'data/raw/subtel');
const OUTPUT_PATH = path.join(process.cwd(), 'data/interim/subtel_raw.json');

interface SubtelRawRecord {
  region_code: string;
  commune_code?: string;
  fixed_internet_connections: number;
  broadband_connections: number;
  average_speed_mbps: number;
  mobile_connections: number;
  connections_4g: number;
  connections_5g: number;
  population_4g_coverage: number;
  population_5g_coverage: number;
  internet_household_penetration: number;
  mobile_penetration: number;
  active_operators: number;
}

/**
 * Verificar archivos crudos
 */
function checkRawFiles(): boolean {
  if (!fs.existsSync(RAW_DATA_PATH)) {
    console.warn(`⚠️ Directorio no encontrado: ${RAW_DATA_PATH}`);
    return false;
  }
  const files = fs.readdirSync(RAW_DATA_PATH);
  if (files.length === 0) {
    console.warn('⚠️ No hay archivos crudos en el directorio SUBTEL');
    return false;
  }
  console.log(`📁 Archivos encontrados en ${RAW_DATA_PATH}:`);
  files.forEach(f => console.log(`   - ${f}`));
  return true;
}

/**
 * Cargar datos crudos de SUBTEL
 * PLACEHOLDER: Implementar según formato exacto
 */
function loadRawSubtelData(): SubtelRawRecord[] {
  console.log('📥 [PLACEHOLDER] Cargando datos crudos de SUBTEL...');
  
  // Placeholder con datos de ejemplo
  const sampleData: SubtelRawRecord[] = [
    {
      region_code: 'RM',
      commune_code: '131',
      fixed_internet_connections: 2150000,
      broadband_connections: 2100000,
      average_speed_mbps: 250,
      mobile_connections: 8500000,
      connections_4g: 7200000,
      connections_5g: 1300000,
      population_4g_coverage: 99.5,
      population_5g_coverage: 75.0,
      internet_household_penetration: 85.0,
      mobile_penetration: 120.0,
      active_operators: 5,
    },
    {
      region_code: 'VA',
      commune_code: '051',
      fixed_internet_connections: 520000,
      broadband_connections: 510000,
      average_speed_mbps: 180,
      mobile_connections: 2100000,
      connections_4g: 1850000,
      connections_5g: 250000,
      population_4g_coverage: 98.0,
      population_5g_coverage: 45.0,
      internet_household_penetration: 72.0,
      mobile_penetration: 115.0,
      active_operators: 4,
    },
  ];
  
  return sampleData;
}

/**
 * Guardar datos crudos
 */
function saveRawData(data: SubtelRawRecord[]): void {
  const outputDir = path.dirname(OUTPUT_PATH);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(data, null, 2));
  console.log(`✅ Datos crudos guardados en: ${OUTPUT_PATH}`);
}

/**
 * Función principal
 */
export function ingestSubtel(): void {
  console.log('🚀 Iniciando ingestión de SUBTEL...');
  console.log('='.repeat(50));
  
  if (!checkRawFiles()) {
    console.log('📝 Generando datos de ejemplo para desarrollo...');
  }
  
  const rawData = loadRawSubtelData();
  console.log(`📊 Registros cargados: ${rawData.length}`);
  
  saveRawData(rawData);
  
  console.log('='.repeat(50));
  console.log('✅ Ingestión de SUBTEL completada');
}

if (process.argv[1]?.includes('pipeline.ts')) {
  ingestSubtel();
}

export default ingestSubtel;