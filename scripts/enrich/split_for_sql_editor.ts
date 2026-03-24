/**
 * Script para preparar archivos SQL UPSERT para el SQL Editor de Supabase
 * Crea exactamente 50 archivos (uno por batch) con todos los registros de cada batch
 */

import * as fs from 'fs';
import * as path from 'path';

const INPUT_DIR = '/Users/camiloalegria/Desktop/AIntelligence/Simulador 1MM usuarios/output/sql_batches_upsert';
const OUTPUT_DIR = '/Users/camiloalegria/Desktop/AIntelligence/Simulador 1MM usuarios/output/sql_for_editor';

// Función para procesar un archivo SQL completo (un batch = un archivo)
function processBatchFile(inputPath: string, outputDir: string, batchNum: string): void {
  const content = fs.readFileSync(inputPath, 'utf-8');
  
  // Nombre del archivo: batch_001.sql, batch_002.sql, etc.
  const outputFileName = `batch_${batchNum}.sql`;
  const outputPath = path.join(outputDir, outputFileName);

  fs.writeFileSync(outputPath, content, 'utf-8');
}

// Función principal
async function main() {
  console.log('=== Preparando archivos SQL para SQL Editor ===\n');

  // Crear directorio de salida si no existe
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  // Limpiar archivos anteriores
  const existingFiles = fs.readdirSync(OUTPUT_DIR);
  for (const file of existingFiles) {
    if (file.endsWith('.sql')) {
      fs.unlinkSync(path.join(OUTPUT_DIR, file));
    }
  }

  // Procesar archivos _upsert.sql
  const files = fs.readdirSync(INPUT_DIR)
    .filter(f => f.match(/insert_agents_batch_\d+_enriched_upsert\.sql$/))
    .sort();

  console.log(`Encontrados ${files.length} archivos para procesar\n`);

  for (const file of files) {
    const inputPath = path.join(INPUT_DIR, file);
    // Extraer número de batch del nombre
    const batchMatch = file.match(/batch_(\d+)_enriched_upsert\.sql$/);
    const batchNum = batchMatch ? batchMatch[1] : '000';

    processBatchFile(inputPath, OUTPUT_DIR, batchNum);

    console.log(`✓ ${file} → batch_${batchNum}.sql`);
  }

  console.log('\n=== Proceso completado ===');
  console.log(`Total archivos creados: ${files.length}`);
  console.log(`Ubicación: ${OUTPUT_DIR}`);
  console.log(`\nCada archivo contiene un batch completo (~500 registros).`);
  console.log('Puedes copiar y pegar cada archivo en el SQL Editor de Supabase.');
  console.log('\nEjemplo de uso:');
  console.log('  1. Abre el SQL Editor de Supabase');
  console.log('  2. Copia el contenido de batch_001.sql');
  console.log('  3. Pégalo y ejecuta');
  console.log('  4. Repite con batch_002.sql, batch_003.sql, etc.');
}

main().catch(console.error);
