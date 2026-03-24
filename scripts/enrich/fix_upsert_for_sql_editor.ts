/**
 * Script para convertir archivos SQL a formato compatible con SQL Editor de Supabase
 * Agrega DELETE antes de cada INSERT para evitar conflictos de duplicados
 */

import * as fs from 'fs';
import * as path from 'path';

const INPUT_DIR = '/Users/camiloalegria/Desktop/AIntelligence/Simulador 1MM usuarios/output/sql_for_editor';
const OUTPUT_DIR = '/Users/camiloalegria/Desktop/AIntelligence/Simulador 1MM usuarios/output/sql_for_editor_fixed';

// Función para procesar un archivo SQL y agregar DELETE antes de cada INSERT
function fixSqlFile(inputPath: string, outputPath: string): void {
  const content = fs.readFileSync(inputPath, 'utf-8');
  const lines = content.split('\n');

  const outputLines: string[] = [];
  let headerEnded = false;

  for (const line of lines) {
    // Mantener comentarios y líneas vacías al inicio
    if (!headerEnded && (line.trim().startsWith('--') || line.trim() === '')) {
      outputLines.push(line);
      continue;
    }

    headerEnded = true;

    // Si es un INSERT, agregar DELETE antes
    if (line.trim().startsWith('INSERT INTO synthetic_agents')) {
      // Extraer el agent_id del VALUES
      const agentIdMatch = line.match(/VALUES \('([^']+)'/);
      if (agentIdMatch) {
        const agentId = agentIdMatch[1];
        outputLines.push(`DELETE FROM synthetic_agents WHERE agent_id = '${agentId}';`);
      }
    }

    outputLines.push(line);
  }

  fs.writeFileSync(outputPath, outputLines.join('\n'), 'utf-8');
}

// Función principal
async function main() {
  console.log('=== Corrigiendo archivos SQL para SQL Editor ===\n');

  // Crear directorio de salida si no existe
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  // Procesar archivos batch_*.sql
  const files = fs.readdirSync(INPUT_DIR)
    .filter(f => f.match(/batch_\d+\.sql$/))
    .sort();

  console.log(`Encontrados ${files.length} archivos para procesar\n`);

  for (const file of files) {
    const inputPath = path.join(INPUT_DIR, file);
    const outputPath = path.join(OUTPUT_DIR, file);

    fixSqlFile(inputPath, outputPath);
    console.log(`✓ ${file} → corregido`);
  }

  console.log('\n=== Proceso completado ===');
  console.log(`Total archivos corregidos: ${files.length}`);
  console.log(`Ubicación: ${OUTPUT_DIR}`);
  console.log(`\nCada archivo ahora incluye DELETE antes de cada INSERT.`);
  console.log('Esto evita errores de duplicados en el SQL Editor de Supabase.');
}

main().catch(console.error);
