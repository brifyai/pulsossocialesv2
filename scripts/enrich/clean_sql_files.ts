/**
 * Script para limpiar archivos SQL - eliminar ON CONFLICT DO UPDATE
 * Ya que usamos DELETE antes de INSERT, no necesitamos ON CONFLICT
 */

import * as fs from 'fs';
import * as path from 'path';

const INPUT_DIR = '/Users/camiloalegria/Desktop/AIntelligence/Simulador 1MM usuarios/output/sql_for_editor_100';
const OUTPUT_DIR = '/Users/camiloalegria/Desktop/AIntelligence/Simulador 1MM usuarios/output/sql_for_editor_final';

// Función para limpiar un archivo SQL
function cleanSqlFile(inputPath: string, outputPath: string): void {
  const content = fs.readFileSync(inputPath, 'utf-8');

  // Eliminar todo desde ON CONFLICT hasta el final del INSERT
  // El patrón es: ON CONFLICT (agent_id) DO UPDATE SET ...);
  // Queremos mantener solo hasta VALUES (...);
  const cleanedContent = content.replace(/ON CONFLICT \(agent_id\) DO UPDATE SET[^;]*\);/g, ');');

  fs.writeFileSync(outputPath, cleanedContent, 'utf-8');
}

// Función principal
async function main() {
  console.log('=== Limpiando archivos SQL - eliminando ON CONFLICT ===\n');

  // Crear directorio de salida si no existe
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  // Procesar archivos batch_*.sql
  const files = fs.readdirSync(INPUT_DIR)
    .filter(f => f.match(/batch_\d+\.sql$/))
    .sort();

  console.log(`Encontrados ${files.length} archivos para limpiar\n`);

  for (const file of files) {
    const inputPath = path.join(INPUT_DIR, file);
    const outputPath = path.join(OUTPUT_DIR, file);

    cleanSqlFile(inputPath, outputPath);
    console.log(`✓ ${file} → limpiado`);
  }

  console.log('\n=== Proceso completado ===');
  console.log(`Total archivos limpiados: ${files.length}`);
  console.log(`Ubicación: ${OUTPUT_DIR}`);
  console.log(`\nLos archivos ahora solo tienen DELETE + INSERT simple.`);
  console.log('Se eliminó el ON CONFLICT DO UPDATE que causaba el error.');
}

main().catch(console.error);
