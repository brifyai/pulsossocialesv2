/**
 * Script para corregir valores NaN en archivos SQL
 * Reemplaza NaN por NULL en coordenadas y otros campos numéricos
 */

import * as fs from 'fs';
import * as path from 'path';

const INPUT_DIR = '/Users/camiloalegria/Desktop/AIntelligence/Simulador 1MM usuarios/output/sql_for_editor_ready';
const OUTPUT_DIR = '/Users/camiloalegria/Desktop/AIntelligence/Simulador 1MM usuarios/output/sql_for_editor_final';

// Función para corregir un archivo SQL
function fixSqlFile(inputPath: string, outputPath: string): void {
  let content = fs.readFileSync(inputPath, 'utf-8');

  // Reemplazar NaN por NULL (case insensitive)
  content = content.replace(/\bNaN\b/g, 'NULL');

  fs.writeFileSync(outputPath, content, 'utf-8');
}

// Función principal
async function main() {
  console.log('=== Corrigiendo valores NaN en archivos SQL ===\n');

  // Crear directorio de salida si no existe
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  // Procesar archivos batch_*.sql
  const files = fs.readdirSync(INPUT_DIR)
    .filter(f => f.match(/batch_\d+\.sql$/))
    .sort();

  console.log(`Encontrados ${files.length} archivos para corregir\n`);

  let nanCount = 0;

  for (const file of files) {
    const inputPath = path.join(INPUT_DIR, file);
    const outputPath = path.join(OUTPUT_DIR, file);

    const content = fs.readFileSync(inputPath, 'utf-8');
    const nanMatches = content.match(/\bNaN\b/g);
    if (nanMatches) {
      nanCount += nanMatches.length;
    }

    fixSqlFile(inputPath, outputPath);
    console.log(`✓ ${file} → corregido`);
  }

  console.log('\n=== Proceso completado ===');
  console.log(`Total archivos corregidos: ${files.length}`);
  console.log(`Total valores NaN reemplazados: ${nanCount}`);
  console.log(`Ubicación: ${OUTPUT_DIR}`);
  console.log(`\nLos archivos ahora tienen NULL en lugar de NaN.`);
}

main().catch(console.error);
