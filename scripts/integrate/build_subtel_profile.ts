/**
 * Build SUBTEL Profile
 * 
 * Integra datos de conectividad de SUBTEL con territorios.
 * 
 * INPUT:
 *   - data/interim/subtel_normalized.json
 *   - data/processed/territories_master.json
 * 
 * OUTPUT:
 *   - data/processed/subtel_profile.json
 * 
 * ETAPA: Integración
 */

import * as fs from 'fs';
import * as path from 'path';

const SUBTEL_INPUT = path.join(process.cwd(), 'data/interim/subtel_normalized.json');
const TERRITORIES_INPUT = path.join(process.cwd(), 'data/processed/territories_master.json');
const OUTPUT_PATH = path.join(process.cwd(), 'data/processed/subtel_profile.json');

interface SubtelProfile {
  territory_code: string;
  territory_name: string;
  territory_level: string;
  
  // Conectividad fija
  fixed_internet_connections: number;
  broadband_connections: number;
  average_speed_mbps: number;
  
  // Móvil
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
  
  // Calculados
  connectivity_index?: number;
  
  // Metadatos
  year: number;
  created_at: string;
}

/**
 * Cargar datos
 */
function loadSubtelData(): any[] {
  if (!fs.existsSync(SUBTEL_INPUT)) {
    console.warn(`⚠️ Archivo no encontrado: ${SUBTEL_INPUT}`);
    return [];
  }
  return JSON.parse(fs.readFileSync(SUBTEL_INPUT, 'utf-8'));
}

function loadTerritories(): any[] {
  if (!fs.existsSync(TERRITORIES_INPUT)) {
    console.warn(`⚠️ Archivo no encontrado: ${TERRITORIES_INPUT}`);
    return [];
  }
  return JSON.parse(fs.readFileSync(TERRITORIES_INPUT, 'utf-8'));
}

/**
 * Construir perfil de conectividad
 */
function buildSubtelProfile(): SubtelProfile[] {
  console.log('🏗️ Construyendo subtel_profile...');
  
  const subtelData = loadSubtelData();
  const territories = loadTerritories();
  
  // Indexar territorios
  const territoryMap = new Map<string, any>();
  for (const t of territories) {
    territoryMap.set(t.code, t);
  }
  
  const profiles: SubtelProfile[] = [];
  
  for (const data of subtelData) {
    const territory = territoryMap.get(data.territory_code);
    
    // Calcular índice de conectividad (0-100)
    const speedScore = Math.min(data.average_speed_mbps / 300, 1) * 25;
    const broadbandScore = Math.min(data.broadband_connections / 1000000, 1) * 25;
    const mobile4gScore = (data.population_4g_coverage / 100) * 25;
    const mobile5gScore = (data.population_5g_coverage / 100) * 25;
    const connectivityIndex = speedScore + broadbandScore + mobile4gScore + mobile5gScore;
    
    profiles.push({
      territory_code: data.territory_code,
      territory_name: territory?.name || data.territory_name,
      territory_level: 'region',
      
      fixed_internet_connections: data.fixed_internet_connections,
      broadband_connections: data.broadband_connections,
      average_speed_mbps: data.average_speed_mbps,
      
      mobile_connections: data.mobile_connections,
      connections_4g: data.connections_4g,
      connections_5g: data.connections_5g,
      mobile_4g_pct: data.mobile_4g_pct,
      mobile_5g_pct: data.mobile_5g_pct,
      
      population_4g_coverage: data.population_4g_coverage,
      population_5g_coverage: data.population_5g_coverage,
      
      internet_household_penetration: data.internet_household_penetration,
      mobile_penetration: data.mobile_penetration,
      
      active_operators: data.active_operators,
      
      connectivity_index: Math.round(connectivityIndex),
      
      year: 2024,
      created_at: new Date().toISOString(),
    });
  }
  
  return profiles;
}

/**
 * Guardar resultado
 */
function saveProfile(data: SubtelProfile[]): void {
  const outputDir = path.dirname(OUTPUT_PATH);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(data, null, 2));
  console.log(`✅ SUBTEL profile guardado en: ${OUTPUT_PATH}`);
}

/**
 * Función principal
 */
export function buildSubtelProfilePipeline(): void {
  console.log('🚀 Iniciando construcción de subtel_profile...');
  console.log('='.repeat(50));
  
  const data = buildSubtelProfile();
  console.log(`📊 Perfiles creados: ${data.length}`);
  
  saveProfile(data);
  
  console.log('='.repeat(50));
  console.log('✅ subtel_profile completado');
}

if (process.argv[1]?.includes('pipeline.ts')) {
  buildSubtelProfilePipeline();
}

export default buildSubtelProfilePipeline;