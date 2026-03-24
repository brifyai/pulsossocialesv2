/**
 * Script para modificar archivos SQL existentes y agregar ON CONFLICT DO UPDATE
 * Convierte INSERT simple a UPSERT
 */

import * as fs from 'fs';
import * as path from 'path';

const ENRICHED_DIR = '/Users/camiloalegria/Desktop/AIntelligence/Simulador 1MM usuarios/output/sql_batches_enriched';

// Campos a actualizar en el ON CONFLICT (todos excepto agent_id y created_at)
const UPDATE_FIELDS = [
  'batch_id', 'version', 'country_code', 'region_code', 'comuna_code',
  'province_code', 'urbanicity', 'sex', 'age', 'age_group', 'household_type',
  'poverty_status', 'education_level', 'occupation_status', 'connectivity_level',
  'digital_exposure_level', 'preferred_survey_channel', 'location_lat',
  'location_lng', 'income_decile', 'employment_status', 'metadata', 'updated_at'
];

function fixSQLFile(filePath: string): void {
  console.log(`🔧 Procesando: ${path.basename(filePath)}`);

  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');

  const fixedLines = lines.map(line => {
    // Solo procesar líneas INSERT INTO
    if (!line.trim().startsWith('INSERT INTO synthetic_agents')) {
      return line;
    }

    // Verificar si ya tiene ON CONFLICT
    if (line.includes('ON CONFLICT')) {
      return line;
    }

    // Convertir INSERT a UPSERT
    // Buscar el patrón: INSERT INTO ... VALUES (...);
    const match = line.match(/^(INSERT INTO synthetic_agents \([^)]+\) VALUES \([^)]+\));?$/);
    if (!match) {
      return line;
    }

    const insertPart = match[1];
    const updateSet = UPDATE_FIELDS.map(f => `${f} = EXCLUDED.${f}`).join(', ');

    return `${insertPart} ON CONFLICT (agent_id) DO UPDATE SET ${updateSet};`;
  });

  // Guardar archivo modificado
  fs.writeFileSync(filePath, fixedLines.join('\n'));
  console.log(`  ✅ Archivo actualizado`);
}

function main(): void {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║  CONVERSIÓN DE INSERT A UPSERT (ON CONFLICT DO UPDATE)     ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  if (!fs.existsSync(ENRICHED_DIR)) {
    console.error(`❌ Directorio no encontrado: ${ENRICHED_DIR}`);
    process.exit(1);
  }

  const files = fs.readdirSync(ENRICHED_DIR)
    .filter(f => f.endsWith('.sql'))
    .map(f => path.join(ENRICHED_DIR, f))
    .sort();

  console.log(`📁 Encontrados ${files.length} archivos SQL\n`);

  let processed = 0;
  for (const file of files) {
    fixSQLFile(file);
    processed++;
  }

  console.log(`\n✅ ${processed} archivos procesados exitosamente`);
  console.log('\n📝 Ahora puedes ejecutar los archivos SQL sin errores de duplicado');
}

main();
