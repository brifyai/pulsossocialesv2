/**
 * Script para corregir paréntesis extra en archivos SQL
 * Elimina el paréntesis extra que quedó al eliminar ON CONFLICT
 */

import * as fs from 'fs';
import * as path from 'path';

const INPUT_DIR = '/Users/camiloalegria/Desktop/AIntelligence/Simulador 1MM usuarios/output/sql_for_editor_final';
const OUTPUT_DIR = '/Users/camiloalegria/Desktop/AIntelligence/Simulador 1MM usuarios/output/sql_for_editor_ready';

// Función para corregir un archivo SQL
function fixSqlFile(inputPath: string, outputPath: string): void {
  const content = fs.readFileSync(inputPath, 'utf-8');

  // Reemplazar ) ); por ); (eliminar paréntesis extra)
  const fixedContent = content.replace(/\) \);$/gm, ');');

  fs.writeFileSync(outputPath, fixedContent, 'utf-8');
}

// Función principal
async function main() {
  console.log('=== Corrigiendo paréntesis extra en archivos SQL ===\n');

  // Crear directorio de salida si no existe
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  // Procesar archivos batch_*.sql
  const files = fs.readdirSync(INPUT_DIR)
    .filter(f => f.match(/batch_\d+\.sql$/))
    .sort();

  console.log(`Encontrados ${files.length} archivos para corregir\n`);

  for (const file of files) {
    const inputPath = path.join(INPUT_DIR, file);
    const outputPath = path.join(OUTPUT_DIR, file);

    fixSqlFile(inputPath, outputPath);
    console.log(`✓ ${file} → corregido`);
  }

  console.log('\n=== Proceso completado ===');
  console.log(`Total archivos corregidos: ${files.length}`);
  console.log(`Ubicación: ${OUTPUT_DIR}`);
  console.log(`\nLos archivos ahora tienen la sintaxis correcta.`);
}

main().catch(console.error);
