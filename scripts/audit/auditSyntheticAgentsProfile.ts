/**
 * Script de auditoría del perfil de synthetic_agents
 * Solo lectura - no modifica datos
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// Configuración desde variables de entorno
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || '';

interface Distribution {
  value: string;
  count: number;
  percentage: number;
}

interface ColumnStats {
  name: string;
  nullCount: number;
  nullPercentage: number;
  uniqueValues: number;
  distribution: Distribution[];
}

interface AuditResult {
  totalAgents: number;
  columnsAnalyzed: string[];
  columnStats: ColumnStats[];
  timestamp: string;
}

const COLUMNS_TO_ANALYZE = [
  'sex',
  'age',
  'region_code',
  'comuna_code',
  'education_level',
  'income_decile',
  'connectivity_level',
  'digital_exposure',
  'preferred_channel',
  'agent_type',
  'poverty_status',
];

async function getColumnDistribution(
  supabase: ReturnType<typeof createClient>,
  column: string,
  totalCount: number
): Promise<ColumnStats | null> {
  console.log(`  📊 Analizando columna: ${column}`);

  try {
    // Contar nulos
    const { count: nullCount, error: nullError } = await supabase
      .from('synthetic_agents')
      .select(column, { count: 'exact', head: true })
      .is(column, null);

    if (nullError) {
      console.warn(`    ⚠️ Error contando nulos: ${nullError.message}`);
    }

    // Obtener distribución de valores
    const { data, error } = await supabase
      .from('synthetic_agents')
      .select(column)
      .not(column, 'is', null);

    if (error) {
      console.warn(`    ⚠️ Columna no existe o error: ${error.message}`);
      return null;
    }

    // Calcular distribución
    const valueCounts: Record<string, number> = {};
    let validCount = 0;

    for (const row of data) {
      const value = row[column];
      if (value !== null && value !== undefined) {
        const key = String(value);
        valueCounts[key] = (valueCounts[key] || 0) + 1;
        validCount++;
      }
    }

    const uniqueValues = Object.keys(valueCounts).length;

    // Top 10 valores más frecuentes
    const distribution: Distribution[] = Object.entries(valueCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([value, count]) => ({
        value,
        count,
        percentage: Math.round((count / totalCount) * 1000) / 10,
      }));

    const finalNullCount = nullCount ?? (totalCount - validCount);

    return {
      name: column,
      nullCount: finalNullCount,
      nullPercentage: Math.round((finalNullCount / totalCount) * 1000) / 10,
      uniqueValues,
      distribution,
    };
  } catch (error) {
    console.error(`    ❌ Error analizando ${column}:`, error);
    return null;
  }
}

async function getAgeDistribution(
  supabase: ReturnType<typeof createClient>,
  totalCount: number
): Promise<ColumnStats | null> {
  console.log(`  📊 Analizando distribución de edades`);

  try {
    const { data, error } = await supabase
      .from('synthetic_agents')
      .select('age');

    if (error) {
      console.warn(`    ⚠️ Error: ${error.message}`);
      return null;
    }

    // Rangos de edad
    const ageBands: Record<string, number> = {
      '18-24': 0,
      '25-34': 0,
      '35-44': 0,
      '45-54': 0,
      '55-64': 0,
      '65+': 0,
      'null': 0,
    };

    for (const row of data) {
      const age = row.age;
      if (age === null || age === undefined) {
        ageBands['null']++;
      } else if (age < 25) {
        ageBands['18-24']++;
      } else if (age < 35) {
        ageBands['25-34']++;
      } else if (age < 45) {
        ageBands['35-44']++;
      } else if (age < 55) {
        ageBands['45-54']++;
      } else if (age < 65) {
        ageBands['55-64']++;
      } else {
        ageBands['65+']++;
      }
    }

    const distribution: Distribution[] = Object.entries(ageBands)
      .filter(([_, count]) => count > 0)
      .map(([value, count]) => ({
        value,
        count,
        percentage: Math.round((count / totalCount) * 1000) / 10,
      }))
      .sort((a, b) => b.count - a.count);

    return {
      name: 'age_bands',
      nullCount: ageBands['null'],
      nullPercentage: Math.round((ageBands['null'] / totalCount) * 1000) / 10,
      uniqueValues: 6,
      distribution,
    };
  } catch (error) {
    console.error(`    ❌ Error analizando edades:`, error);
    return null;
  }
}

function generateReport(result: AuditResult): string {
  let report = `# Auditoría de Perfil de Synthetic Agents\n\n`;
  report += `**Fecha:** ${result.timestamp}\n\n`;
  report += `**Total de Agentes:** ${result.totalAgents.toLocaleString()}\n\n`;
  report += `---\n\n`;

  // Resumen
  report += `## Resumen de Columnas\n\n`;
  report += `| Columna | Valores Nulos | % Nulos | Valores Únicos |\n`;
  report += `|---------|---------------|---------|----------------|\n`;

  for (const stat of result.columnStats) {
    report += `| ${stat.name} | ${stat.nullCount.toLocaleString()} | ${stat.nullPercentage}% | ${stat.uniqueValues} |\n`;
  }

  report += `\n`;

  // Distribuciones detalladas
  report += `## Distribuciones Detalladas\n\n`;

  for (const stat of result.columnStats) {
    report += `### ${stat.name}\n\n`;
    report += `- **Valores nulos:** ${stat.nullCount.toLocaleString()} (${stat.nullPercentage}%)\n`;
    report += `- **Valores únicos:** ${stat.uniqueValues}\n\n`;

    if (stat.distribution.length > 0) {
      report += `| Valor | Cantidad | Porcentaje |\n`;
      report += `|-------|----------|------------|\n`;

      for (const dist of stat.distribution) {
        report += `| ${dist.value} | ${dist.count.toLocaleString()} | ${dist.percentage}% |\n`;
      }
    }

    report += `\n`;
  }

  return report;
}

async function main(): Promise<void> {
  console.log('='.repeat(80));
  console.log('AUDITORÍA DE PERFIL DE SYNTHETIC AGENTS');
  console.log('='.repeat(80));

  // Validar configuración
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error('❌ Error: Variables de entorno VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY requeridas');
    process.exit(1);
  }

  console.log(`\n🔗 Conectando a: ${SUPABASE_URL}`);

  // Crear cliente
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  // Verificar conexión y contar agentes
  const { count, error } = await supabase
    .from('synthetic_agents')
    .select('*', { count: 'exact', head: true });

  if (error) {
    console.error(`❌ Error conectando a synthetic_agents: ${error.message}`);
    process.exit(1);
  }

  const totalAgents = count || 0;
  console.log(`✅ Conexión exitosa - ${totalAgents.toLocaleString()} agentes encontrados\n`);

  if (totalAgents === 0) {
    console.error('❌ No hay agentes en la base de datos');
    process.exit(1);
  }

  // Analizar cada columna
  console.log('📊 Analizando distribuciones:');
  const columnStats: ColumnStats[] = [];

  for (const column of COLUMNS_TO_ANALYZE) {
    const stats = await getColumnDistribution(supabase, column, totalAgents);
    if (stats) {
      columnStats.push(stats);
    }
  }

  // Análisis especial de edades
  const ageStats = await getAgeDistribution(supabase, totalAgents);
  if (ageStats) {
    columnStats.push(ageStats);
  }

  // Generar resultado
  const result: AuditResult = {
    totalAgents,
    columnsAnalyzed: COLUMNS_TO_ANALYZE,
    columnStats,
    timestamp: new Date().toISOString(),
  };

  // Generar reporte
  console.log('\n' + '='.repeat(80));
  console.log('GENERANDO REPORTE');
  console.log('='.repeat(80));

  const report = generateReport(result);

  // Guardar reporte
  const outputDir = path.resolve('docs/cadem-v3');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const outputPath = path.join(outputDir, 'SYNTHETIC_AGENTS_AUDIT.md');
  fs.writeFileSync(outputPath, report, 'utf-8');

  console.log(`\n✅ Reporte guardado en: ${outputPath}`);

  // Resumen en consola
  console.log('\n' + '='.repeat(80));
  console.log('RESUMEN');
  console.log('='.repeat(80));
  console.log(`\nTotal de agentes: ${totalAgents.toLocaleString()}`);
  console.log('\nColumnas analizadas:');
  for (const stat of columnStats) {
    console.log(`  ${stat.name}: ${stat.nullPercentage}% nulos, ${stat.uniqueValues} únicos`);
  }

  console.log('\n' + '='.repeat(80));
}

main().catch(error => {
  console.error('Error fatal:', error);
  process.exit(1);
});
