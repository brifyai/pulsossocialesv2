/**
 * Script para dividir los archivos SQL en 100 archivos más pequeños
 * 25,000 registros totales → 100 archivos de 250 registros cada uno
 */

import * as fs from 'fs';
import * as path from 'path';

const INPUT_DIR = '/Users/camiloalegria/Desktop/AIntelligence/Simulador 1MM usuarios/output/sql_for_editor_fixed';
const OUTPUT_DIR = '/Users/camiloalegria/Desktop/AIntelligence/Simulador 1MM usuarios/output/sql_for_editor_100';

// Función para extraer todos los INSERTs de un archivo
function extractInserts(filePath: string): string[] {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');

  const inserts: string[] = [];
  let currentInsert: string[] = [];
  let inInsert = false;

  for (const line of lines) {
    // Detectar inicio de DELETE (que precede a cada INSERT)
    if (line.trim().startsWith('DELETE FROM synthetic_agents')) {
      // Si hay un INSERT anterior, guardarlo
      if (currentInsert.length > 0) {
        inserts.push(currentInsert.join('\n'));
        currentInsert = [];
      }
      inInsert = true;
      currentInsert.push(line);
    } else if (inInsert) {
      currentInsert.push(line);
      // Detectar fin de INSERT (línea que termina con );)
      if (line.trim().endsWith(');')) {
        inserts.push(currentInsert.join('\n'));
        currentInsert = [];
        inInsert = false;
      }
    }
  }

  // Guardar el último si existe
  if (currentInsert.length > 0) {
    inserts.push(currentInsert.join('\n'));
  }

  return inserts;
}

// Función principal
async function main() {
  console.log('=== Dividiendo archivos SQL en 100 archivos más pequeños ===\n');

  // Crear directorio de salida si no existe
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  // Leer todos los archivos batch
  const files = fs.readdirSync(INPUT_DIR)
    .filter(f => f.match(/batch_\d+\.sql$/))
    .sort();

  console.log(`Encontrados ${files.length} archivos originales\n`);

  // Extraer todos los INSERTs de todos los archivos
  const allInserts: string[] = [];
  for (const file of files) {
    const filePath = path.join(INPUT_DIR, file);
    const inserts = extractInserts(filePath);
    allInserts.push(...inserts);
    console.log(`✓ ${file}: ${inserts.length} registros extraídos`);
  }

  console.log(`\nTotal de registros: ${allInserts.length}`);

  // Calcular cuántos archivos necesitamos (100 archivos de ~250 registros)
  const totalRecords = allInserts.length;
  const numFiles = 100;
  const recordsPerFile = Math.ceil(totalRecords / numFiles);

  console.log(`\nDividiendo en ${numFiles} archivos de ~${recordsPerFile} registros cada uno\n`);

  // Crear los 100 archivos
  let recordIndex = 0;
  for (let fileNum = 1; fileNum <= numFiles; fileNum++) {
    const fileName = `batch_${fileNum.toString().padStart(3, '0')}.sql`;
    const outputPath = path.join(OUTPUT_DIR, fileName);

    // Header del archivo
    const header = `-- Batch ${fileNum}/${numFiles}
-- Generado: ${new Date().toISOString()}
-- Fuentes: Censo 2024, CASEN 2024, SUBTEL 2025

`;

    // Obtener los registros para este archivo
    const startIdx = (fileNum - 1) * recordsPerFile;
    const endIdx = Math.min(startIdx + recordsPerFile, totalRecords);
    const fileRecords = allInserts.slice(startIdx, endIdx);

    // Escribir el archivo
    const content = header + fileRecords.join('\n\n') + '\n';
    fs.writeFileSync(outputPath, content, 'utf-8');

    console.log(`✓ ${fileName}: ${fileRecords.length} registros`);
  }

  console.log('\n=== Proceso completado ===');
  console.log(`Total archivos creados: ${numFiles}`);
  console.log(`Registros por archivo: ~${recordsPerFile}`);
  console.log(`Ubicación: ${OUTPUT_DIR}`);
  console.log(`\nLos archivos son más pequeños y deberían funcionar en el SQL Editor de Supabase.`);
}

main().catch(console.error);
