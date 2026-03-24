/**
 * Script para convertir archivos SQL de INSERT a UPSERT (INSERT ... ON CONFLICT)
 * Procesa los archivos _complete.sql y los convierte a usar UPSERT
 */

import * as fs from 'fs';
import * as path from 'path';

const SQL_DIR = '/Users/camiloalegria/Desktop/AIntelligence/Simulador 1MM usuarios/output/sql_batches_enriched';

// Lista de campos a actualizar en caso de conflicto (todos excepto agent_id y created_at)
const UPDATE_FIELDS = [
  'batch_id', 'version', 'territory_id', 'country_code', 'region_code', 
  'comuna_code', 'province_code', 'urbanicity', 'sex', 'age', 'age_group', 
  'household_size', 'household_type', 'income_decile', 'poverty_status', 
  'education_level', 'occupation_status', 'occupation_group', 'socioeconomic_level',
  'connectivity_level', 'digital_exposure_level', 'preferred_survey_channel',
  'agent_type', 'backbone_key', 'subtel_profile_key', 'casen_profile_key',
  'location_lat', 'location_lng', 'employment_status', 'generation_notes',
  'metadata', 'updated_at'
];

function convertInsertToUpsert(line: string): string {
  // Buscar líneas INSERT INTO ... VALUES (...);
  const match = line.match(/^(INSERT INTO synthetic_agents \([^)]+\) VALUES \([^)]+\));$/);
  if (!match) return line;
  
  // Extraer la parte INSERT y VALUES
  const insertPart = match[1];
  
  // Crear la cláusula ON CONFLICT
  const updateClause = UPDATE_FIELDS.map(field => `${field} = EXCLUDED.${field}`).join(', ');
  
  return `${insertPart} ON CONFLICT (agent_id) DO UPDATE SET ${updateClause};`;
}

function processFile(inputPath: string, outputPath: string): void {
  console.log(`Procesando: ${path.basename(inputPath)}`);
  
  const content = fs.readFileSync(inputPath, 'utf-8');
  const lines = content.split('\n');
  
  const newLines: string[] = [];
  let convertedCount = 0;
  
  for (const line of lines) {
    if (line.trim().startsWith('INSERT INTO synthetic_agents')) {
      const newLine = convertInsertToUpsert(line);
      newLines.push(newLine);
      convertedCount++;
    } else {
      newLines.push(line);
    }
  }
  
  fs.writeFileSync(outputPath, newLines.join('\n'));
  console.log(`  ✓ Convertidos ${convertedCount} registros a UPSERT`);
}

function main(): void {
  console.log('=== Convirtiendo archivos SQL a UPSERT ===\n');
  
  // Procesar archivos _complete.sql del 001 al 050
  for (let i = 1; i <= 50; i++) {
    const batchNum = i.toString().padStart(3, '0');
    const inputFile = path.join(SQL_DIR, `insert_agents_batch_${batchNum}_enriched_complete.sql`);
    const outputFile = path.join(SQL_DIR, `insert_agents_batch_${batchNum}_enriched_upsert.sql`);
    
    if (fs.existsSync(inputFile)) {
      processFile(inputFile, outputFile);
    } else {
      console.log(`⚠ Archivo no encontrado: ${path.basename(inputFile)}`);
    }
  }
  
  console.log('\n=== Proceso completado ===');
  console.log('Archivos generados con sufijo "_upsert.sql"');
}

main();
