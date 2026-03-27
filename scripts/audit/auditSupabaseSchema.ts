/**
 * Script de auditoría de esquema de Supabase
 * Solo lectura - no modifica datos
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// Configuración desde variables de entorno
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || '';

// Tablas a auditar
const TABLES_TO_AUDIT = [
  'synthetic_agents',
  'synthetic_agent_batches',
  'survey_definitions',
  'survey_runs',
  'survey_responses',
  'agent_topic_state',
  'agent_panel_state',
  'territories',
  'benchmarks',
  'benchmark_indicators',
];

interface TableInfo {
  name: string;
  exists: boolean;
  rowCount: number | null;
  columns: Array<{ name: string; type: string; nullable: boolean }>;
  sampleRows: unknown[];
  error?: string;
}

async function auditTable(supabase: ReturnType<typeof createClient>, tableName: string): Promise<TableInfo> {
  console.log(`\n📋 Auditando tabla: ${tableName}`);

  try {
    // Verificar si la tabla existe contando filas
    const { count, error: countError } = await supabase
      .from(tableName)
      .select('*', { count: 'exact', head: true });

    if (countError) {
      if (countError.message.includes('does not exist') || countError.code === '42P01') {
        return {
          name: tableName,
          exists: false,
          rowCount: null,
          columns: [],
          sampleRows: [],
          error: 'Tabla no existe',
        };
      }
      throw countError;
    }

    // Obtener información de columnas usando una consulta SQL
    const { data: columnsData, error: columnsError } = await supabase.rpc(
      'get_table_columns',
      { table_name: tableName }
    );

    let columns: Array<{ name: string; type: string; nullable: boolean }> = [];

    if (columnsError || !columnsData) {
      // Fallback: intentar obtener columnas de una fila de ejemplo
      const { data: sampleData } = await supabase
        .from(tableName)
        .select('*')
        .limit(1);

      if (sampleData && sampleData.length > 0) {
        columns = Object.keys(sampleData[0]).map(key => ({
          name: key,
          type: typeof sampleData[0][key],
          nullable: sampleData[0][key] === null,
        }));
      }
    } else {
      columns = columnsData;
    }

    // Obtener 3 filas de ejemplo
    const { data: sampleRows, error: sampleError } = await supabase
      .from(tableName)
      .select('*')
      .limit(3);

    if (sampleError) {
      console.warn(`  ⚠️ Error obteniendo muestra: ${sampleError.message}`);
    }

    console.log(`  ✅ Existe: ${count ?? '?'} filas, ${columns.length} columnas`);

    return {
      name: tableName,
      exists: true,
      rowCount: count,
      columns,
      sampleRows: sampleRows || [],
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error desconocido';
    console.error(`  ❌ Error: ${message}`);

    return {
      name: tableName,
      exists: false,
      rowCount: null,
      columns: [],
      sampleRows: [],
      error: message,
    };
  }
}

function generateReport(results: TableInfo[]): string {
  const timestamp = new Date().toISOString();

  let report = `# Auditoría de Esquema Supabase\n\n`;
  report += `**Fecha:** ${timestamp}\n\n`;
  report += `**URL:** ${SUPABASE_URL}\n\n`;
  report += `---\n\n`;

  // Resumen
  const existingTables = results.filter(r => r.exists);
  const missingTables = results.filter(r => !r.exists);

  report += `## Resumen\n\n`;
  report += `- **Tablas auditadas:** ${results.length}\n`;
  report += `- **Tablas existentes:** ${existingTables.length}\n`;
  report += `- **Tablas faltantes:** ${missingTables.length}\n\n`;

  // Tablas existentes
  report += `## Tablas Existentes\n\n`;
  report += `| Tabla | Filas | Columnas |\n`;
  report += `|-------|-------|----------|\n`;

  for (const table of existingTables.sort((a, b) => (b.rowCount || 0) - (a.rowCount || 0))) {
    report += `| ${table.name} | ${table.rowCount ?? '?'} | ${table.columns.length} |\n`;
  }

  report += `\n`;

  // Tablas faltantes
  if (missingTables.length > 0) {
    report += `## Tablas Faltantes\n\n`;
    for (const table of missingTables) {
      report += `- ❌ **${table.name}**: ${table.error}\n`;
    }
    report += `\n`;
  }

  // Detalle por tabla
  report += `## Detalle por Tabla\n\n`;

  for (const table of existingTables) {
    report += `### ${table.name}\n\n`;
    report += `- **Filas:** ${table.rowCount ?? '?'}\n`;
    report += `- **Columnas:** ${table.columns.length}\n\n`;

    if (table.columns.length > 0) {
      report += `#### Columnas\n\n`;
      report += `| Columna | Tipo | Nullable |\n`;
      report += `|---------|------|----------|\n`;

      for (const col of table.columns) {
        report += `| ${col.name} | ${col.type} | ${col.nullable ? 'Sí' : 'No'} |\n`;
      }

      report += `\n`;
    }

    if (table.sampleRows.length > 0) {
      report += `#### Muestra de Datos (${table.sampleRows.length} filas)\n\n`;
      report += `\`\`\`json\n`;
      report += JSON.stringify(table.sampleRows, null, 2);
      report += `\n\`\`\`\n\n`;
    }

    report += `---\n\n`;
  }

  return report;
}

async function main(): Promise<void> {
  console.log('='.repeat(80));
  console.log('AUDITORÍA DE ESQUEMA SUPABASE');
  console.log('='.repeat(80));

  // Validar configuración
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error('❌ Error: Variables de entorno VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY requeridas');
    process.exit(1);
  }

  console.log(`\n🔗 Conectando a: ${SUPABASE_URL}`);

  // Crear cliente
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  // Verificar conexión
  const { error: testError } = await supabase.from('territories').select('id', { count: 'exact', head: true });

  if (testError && testError.message.includes('does not exist')) {
    console.log('⚠️ Tabla territories no existe, probando conexión básica...');
  } else if (testError) {
    console.error(`❌ Error de conexión: ${testError.message}`);
    process.exit(1);
  }

  console.log('✅ Conexión exitosa\n');

  // Auditar cada tabla
  const results: TableInfo[] = [];

  for (const tableName of TABLES_TO_AUDIT) {
    const info = await auditTable(supabase, tableName);
    results.push(info);
  }

  // Generar reporte
  console.log('\n' + '='.repeat(80));
  console.log('GENERANDO REPORTE');
  console.log('='.repeat(80));

  const report = generateReport(results);

  // Guardar reporte
  const outputDir = path.resolve('docs/cadem-v3');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const outputPath = path.join(outputDir, 'SUPABASE_SCHEMA_AUDIT.md');
  fs.writeFileSync(outputPath, report, 'utf-8');

  console.log(`\n✅ Reporte guardado en: ${outputPath}`);

  // Resumen en consola
  console.log('\n' + '='.repeat(80));
  console.log('RESUMEN');
  console.log('='.repeat(80));

  const existing = results.filter(r => r.exists);
  const missing = results.filter(r => !r.exists);

  console.log(`\nTablas existentes (${existing.length}):`);
  for (const table of existing.sort((a, b) => (b.rowCount || 0) - (a.rowCount || 0))) {
    console.log(`  ✅ ${table.name}: ${table.rowCount ?? '?'} filas`);
  }

  if (missing.length > 0) {
    console.log(`\nTablas faltantes (${missing.length}):`);
    for (const table of missing) {
      console.log(`  ❌ ${table.name}`);
    }
  }

  console.log('\n' + '='.repeat(80));
}

main().catch(error => {
  console.error('Error fatal:', error);
  process.exit(1);
});
