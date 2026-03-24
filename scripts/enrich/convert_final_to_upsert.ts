/**
 * Script para convertir archivos SQL finales a formato UPSERT
 * Esto permite actualizar registros existentes sin errores de duplicados
 */

import * as fs from 'fs';
import * as path from 'path';

const INPUT_DIR = '/Users/camiloalegria/Desktop/AIntelligence/Simulador 1MM usuarios/output/sql_batches_final';
const OUTPUT_DIR = '/Users/camiloalegria/Desktop/AIntelligence/Simulador 1MM usuarios/output/sql_batches_upsert';

// Lista de todos los campos en orden
const ALL_FIELDS = [
  'agent_id', 'batch_id', 'version', 'territory_id', 'country_code', 'region_code',
  'comuna_code', 'province_code', 'urbanicity', 'sex', 'age', 'age_group',
  'household_size', 'household_type', 'income_decile', 'poverty_status',
  'education_level', 'occupation_status', 'occupation_group', 'socioeconomic_level',
  'connectivity_level', 'digital_exposure_level', 'preferred_survey_channel',
  'agent_type', 'backbone_key', 'subtel_profile_key', 'casen_profile_key',
  'location_lat', 'location_lng', 'employment_status', 'generation_notes',
  'metadata', 'created_at', 'updated_at', 'sex_code', 'age_group_code',
  'education_level_code', 'occupation_status_code', 'occupation_category_code',
  'ciuo_code', 'caenes_code', 'marital_status_code', 'indigenous_people_code',
  'disability_status_code', 'internet_quality', 'has_smartphone', 'has_computer'
];

// Campos a excluir del UPDATE (generalmente PKs y timestamps de creación)
const EXCLUDE_FROM_UPDATE = ['agent_id', 'created_at'];

// Función para extraer valores de una línea INSERT
function extractInsertValues(line: string): { fields: string[], values: string[] } | null {
  const match = line.match(/INSERT INTO synthetic_agents \((.+?)\) VALUES \((.+?)\);?$/);
  if (!match) return null;

  const fieldsStr = match[1];
  const valuesStr = match[2];

  // Parsear campos
  const fields = fieldsStr.split(',').map(f => f.trim());

  // Parsear valores considerando comillas y JSON
  const values: string[] = [];
  let current = '';
  let inQuotes = false;
  let inJson = false;
  let quoteChar = '';

  for (let i = 0; i < valuesStr.length; i++) {
    const char = valuesStr[i];

    if (!inQuotes && (char === "'" || char === '"')) {
      inQuotes = true;
      quoteChar = char;
      current += char;
    } else if (inQuotes && char === quoteChar) {
      inQuotes = false;
      quoteChar = '';
      current += char;
    } else if (char === '{' && !inQuotes) {
      inJson = true;
      current += char;
    } else if (char === '}' && !inQuotes) {
      inJson = false;
      current += char;
    } else if (char === ',' && !inQuotes && !inJson) {
      values.push(current.trim());
      current = '';
      continue;
    } else {
      current += char;
    }
  }
  values.push(current.trim());

  return { fields, values };
}

// Función para construir el UPSERT
function buildUpsert(fields: string[], values: string[]): string {
  // Crear el SET clause para el UPDATE
  const setClauses: string[] = [];

  for (let i = 0; i < fields.length; i++) {
    const field = fields[i];
    const value = values[i];

    // Excluir campos que no deben actualizarse
    if (EXCLUDE_FROM_UPDATE.includes(field)) continue;

    setClauses.push(`${field} = ${value}`);
  }

  // Agregar updated_at = NOW()
  setClauses.push('updated_at = NOW()');

  const fieldsList = fields.join(', ');
  const valuesList = values.join(', ');
  const setClause = setClauses.join(', ');

  return `INSERT INTO synthetic_agents (${fieldsList}) VALUES (${valuesList}) ON CONFLICT (agent_id) DO UPDATE SET ${setClause};`;
}

// Procesar un archivo SQL
async function processFile(inputPath: string, outputPath: string): Promise<void> {
  console.log(`Procesando: ${path.basename(inputPath)}`);

  const content = fs.readFileSync(inputPath, 'utf-8');
  const lines = content.split('\n');
  const outputLines: string[] = [];
  let processedCount = 0;

  for (const line of lines) {
    if (line.trim().startsWith('INSERT INTO')) {
      const extracted = extractInsertValues(line);
      if (extracted) {
        const upsert = buildUpsert(extracted.fields, extracted.values);
        outputLines.push(upsert);
        processedCount++;
      } else {
        outputLines.push(line);
      }
    } else {
      outputLines.push(line);
    }
  }

  fs.writeFileSync(outputPath, outputLines.join('\n'), 'utf-8');
  console.log(`  ✓ Convertidos ${processedCount} INSERTs a UPSERTs`);
}

// Función principal
async function main() {
  console.log('=== Convirtiendo archivos SQL a UPSERTs ===\n');

  // Crear directorio de salida si no existe
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  // Procesar archivos _final.sql
  const files = fs.readdirSync(INPUT_DIR)
    .filter(f => f.match(/insert_agents_batch_\d+_enriched_final\.sql$/))
    .sort();

  console.log(`Encontrados ${files.length} archivos para procesar\n`);

  for (const file of files) {
    const inputPath = path.join(INPUT_DIR, file);
    const outputPath = path.join(OUTPUT_DIR, file.replace('_final.sql', '_upsert.sql'));
    await processFile(inputPath, outputPath);
  }

  console.log('\n=== Proceso completado ===');
  console.log(`Archivos UPSERT generados en: ${OUTPUT_DIR}`);
  console.log('\nPara ejecutar en la base de datos:');
  console.log('  psql -U postgres -d postgres -f <archivo_upsert.sql>');
}

main().catch(console.error);
