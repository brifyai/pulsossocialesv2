/**
 * Build Territories Master
 * 
 * Construye el master de territorios de Chile integrando la jerarquía completa.
 * 
 * INPUT:
 *   - scripts/config/territories.ts (configuración base)
 * 
 * OUTPUT:
 *   - data/processed/territories_master.json
 * 
 * ETAPA: Integración
 */

import * as fs from 'fs';
import * as path from 'path';
import { CHILE_TERRITORIES, type ChileTerritory } from '../config/territories';

const OUTPUT_PATH = path.join(process.cwd(), 'data/processed/territories_master.json');

interface TerritoryMaster extends ChileTerritory {
  // Metadatos
  created_at: string;
  source: string;
  
  // Геометría (placeholder para futuro GeoJSON)
  geometry?: any;
}

/**
 * Construir master de territorios
 */
function buildTerritoriesMaster(): TerritoryMaster[] {
  console.log('🏗️ Construyendo master de territorios...');
  
  const territories: TerritoryMaster[] = CHILE_TERRITORIES.map(t => ({
    ...t,
    created_at: new Date().toISOString(),
    source: 'INE Chile',
  }));
  
  return territories;
}

/**
 * Guardar resultado
 */
function saveMaster(data: TerritoryMaster[]): void {
  const outputDir = path.dirname(OUTPUT_PATH);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(data, null, 2));
  console.log(`✅ Master de territorios guardado en: ${OUTPUT_PATH}`);
}

/**
 * Función principal
 */
export function buildTerritoriesMasterPipeline(): void {
  console.log('🚀 Iniciando construcción de territories_master...');
  console.log('='.repeat(50));
  
  const data = buildTerritoriesMaster();
  console.log(`📊 Territorios creados: ${data.length}`);
  
  saveMaster(data);
  
  console.log('='.repeat(50));
  console.log('✅ territories_master completado');
}

if (process.argv[1]?.includes('pipeline.ts')) {
  buildTerritoriesMasterPipeline();
}

export default buildTerritoriesMasterPipeline;