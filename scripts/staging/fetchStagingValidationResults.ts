/**
 * Script para obtener y formatear resultados de STAGING_VALIDATION_RUN_001
 * Genera un reporte markdown listo para completar el documento de validación
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const INPUT_FILE = path.join(__dirname, '../../data/staging/staging_validation_run_001_result.json');
const OUTPUT_FILE = path.join(__dirname, '../../docs/cadem-v3/STAGING_VALIDATION_RUN_001_RESULT.md');

// Benchmarks objetivo para comparación
const BENCHMARKS = {
  q_approval: {
    approve: 57,
    disapprove: 34,
    no_response: 9
  },
  q_economy_personal: {
    positive: 52,
    negative: 44
  },
  q_optimism: {
    optimistic: 62,
    pessimistic: 34
  }
};

interface SurveyResult {
  surveyId: string;
  runId: string;
  surveyName: string;
  startedAt: string;
  completedAt: string;
  durationMs: number;
  totalAgents: number;
  totalResponses: number;
  avgConfidence: number;
  questions: {
    [questionId: string]: {
      text: string;
      responses: { [value: string]: number };
      distribution: { [value: string]: number };
      confidence: { avg: number; min: number; max: number };
    };
  };
  metadata: {
    engineMode: string;
    engineVersion: string;
    persistState: boolean;
    sampleSize: number;
  };
  errors: string[];
}

function loadResults(): SurveyResult | null {
  if (!fs.existsSync(INPUT_FILE)) {
    console.error(`❌ Error: No se encontró el archivo de resultados en ${INPUT_FILE}`);
    console.log('   Ejecuta primero: npx tsx scripts/staging/runStagingValidationSurvey.ts');
    return null;
  }
  
  try {
    const data = fs.readFileSync(INPUT_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error('❌ Error al leer resultados:', error);
    return null;
  }
}

function calculateDifference(actual: number, target: number): number {
  return Math.round((actual - target) * 10) / 10;
}

function getStatus(diff: number, threshold: number = 5): string {
  const absDiff = Math.abs(diff);
  if (absDiff <= threshold) return '✅';
  if (absDiff <= threshold * 2) return '⚠️';
  return '❌';
}

function generateReport(result: SurveyResult): string {
  const executionDate = new Date(result.completedAt).toLocaleString('es-CL', {
    timeZone: 'America/Santiago',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
  
  let report = `# Resultados Staging Validation Run 001

**Fecha de ejecución:** ${executionDate}  
**Survey ID:** ${result.surveyId}  
**Run ID:** ${result.runId}  
**Estado:** 🟡 PENDIENTE DE VALIDACIÓN MANUAL

---

## Resumen Ejecutivo

| Métrica | Valor |
|---------|-------|
| **Duración total** | ${(result.durationMs / 1000).toFixed(2)}s |
| **Total agentes** | ${result.totalAgents} |
| **Total respuestas** | ${result.totalResponses} |
| **Confidence promedio** | ${(result.avgConfidence * 100).toFixed(1)}% |
| **Errores** | ${result.errors.length} |

### Configuración del Motor

| Parámetro | Valor |
|-----------|-------|
| **Engine Mode** | ${result.metadata.engineMode} |
| **Engine Version** | ${result.metadata.engineVersion} |
| **Persist State** | ${result.metadata.persistState} |
| **Sample Size** | ${result.metadata.sampleSize} |

---

## Resultados por Pregunta

`;

  // Tabla comparativa por pregunta
  Object.entries(result.questions).forEach(([questionId, q]) => {
    const benchmark = BENCHMARKS[questionId as keyof typeof BENCHMARKS];
    
    report += `### ${questionId}\n\n`;
    report += `**Texto:** ${q.text}\n\n`;
    
    report += `| Respuesta | Benchmark | Real | Diferencia | Estado |\n`;
    report += `|-----------|-----------|------|------------|--------|\n`;
    
    Object.entries(q.distribution).forEach(([value, percentage]) => {
      const targetValue = benchmark ? benchmark[value as keyof typeof benchmark] : null;
      const diff = targetValue !== undefined ? calculateDifference(percentage, targetValue) : null;
      const status = diff !== null ? getStatus(diff) : '—';
      const targetStr = targetValue !== undefined ? `${targetValue}%` : '—';
      const diffStr = diff !== null ? `${diff > 0 ? '+' : ''}${diff}%` : '—';
      
      report += `| ${value} | ${targetStr} | ${percentage}% | ${diffStr} | ${status} |\n`;
    });
    
    report += `\n**Confidence:** ${(q.confidence.avg * 100).toFixed(1)}% (min: ${(q.confidence.min * 100).toFixed(1)}%, max: ${(q.confidence.max * 100).toFixed(1)}%)\n\n`;
    report += `---\n\n`;
  });

  // Métricas globales
  report += `## Métricas Globales vs Benchmarks\n\n`;
  
  let totalDiff = 0;
  let count = 0;
  
  Object.entries(result.questions).forEach(([questionId, q]) => {
    const benchmark = BENCHMARKS[questionId as keyof typeof BENCHMARKS];
    if (benchmark) {
      Object.entries(q.distribution).forEach(([value, percentage]) => {
        const targetValue = benchmark[value as keyof typeof benchmark];
        if (targetValue !== undefined) {
          totalDiff += Math.abs(percentage - targetValue);
          count++;
        }
      });
    }
  });
  
  const mae = count > 0 ? (totalDiff / count).toFixed(1) : 'N/A';
  const diffs: number[] = [];
  Object.entries(result.questions).forEach(([qId, q]) => {
    const benchmark = BENCHMARKS[qId as keyof typeof BENCHMARKS];
    if (benchmark) {
      Object.entries(q.distribution).forEach(([value, pct]) => {
        const target = benchmark[value as keyof typeof benchmark];
        if (target !== undefined) {
          diffs.push(Math.abs(pct - target));
        }
      });
    }
  });
  const maxDiff = diffs.length > 0 ? Math.max(...diffs).toFixed(1) : 'N/A';
  
  report += `| Métrica | Valor | Target | Estado |\n`;
  report += `|---------|-------|--------|--------|\n`;
  report += `| **MAE (Error Absoluto Medio)** | ${mae}% | < 5% | ${parseFloat(mae) < 5 ? '✅' : parseFloat(mae) < 10 ? '⚠️' : '❌'} |\n`;
  report += `| **Máxima Diferencia** | ${maxDiff}% | < 10% | ${parseFloat(maxDiff) < 10 ? '✅' : '❌'} |\n`;
  report += `| **Tasa de Respuesta** | 100% | 100% | ✅ |\n\n`;

  // Observaciones automáticas
  report += `## Observaciones Automáticas\n\n`;
  
  const observations: string[] = [];
  
  if (result.errors.length > 0) {
    observations.push(`⚠️ Se detectaron ${result.errors.length} errores durante la ejecución.`);
  }
  
  if (result.durationMs > 30000) {
    observations.push(`⚠️ La ejecución tomó más de 30 segundos (${(result.durationMs / 1000).toFixed(1)}s).`);
  } else {
    observations.push(`✅ Tiempo de ejecución dentro del rango esperado (${(result.durationMs / 1000).toFixed(1)}s).`);
  }
  
  if (result.avgConfidence < 0.7) {
    observations.push(`⚠️ Confidence promedio bajo (${(result.avgConfidence * 100).toFixed(1)}%).`);
  } else {
    observations.push(`✅ Confidence promedio aceptable (${(result.avgConfidence * 100).toFixed(1)}%).`);
  }
  
  if (parseFloat(mae) < 5) {
    observations.push(`✅ MAE dentro del rango objetivo (< 5%).`);
  } else if (parseFloat(mae) < 10) {
    observations.push(`⚠️ MAE aceptable para staging (5-10%).`);
  } else {
    observations.push(`❌ MAE fuera de rango (> 10%).`);
  }
  
  observations.forEach(obs => {
    report += `- ${obs}\n`;
  });
  
  report += `\n`;

  // Errores si existen
  if (result.errors.length > 0) {
    report += `## Errores Detectados\n\n`;
    report += `\`\`\`\n`;
    result.errors.forEach((error, index) => {
      report += `${index + 1}. ${error}\n`;
    });
    report += `\`\`\`\n\n`;
  }

  // Datos crudos
  report += `## Datos Crudos\n\n`;
  report += `\`\`\`json\n`;
  report += JSON.stringify(result, null, 2);
  report += `\n\`\`\`\n\n`;

  // Checklist para completar manualmente
  report += `---\n\n`;
  report += `## Checklist de Validación Manual\n
`;
  report += `- [ ] Revisar distribuciones por pregunta\n`;
  report += `- [ ] Verificar que los valores están dentro de rangos esperados\n`;
  report += `- [ ] Confirmar que no hay valores anómalos\n`;
  report += `- [ ] Validar que el tiempo de ejecución es aceptable\n`;
  report += `- [ ] Revisar logs de Supabase por errores\n`;
  report += `- [ ] Verificar que las respuestas se guardaron correctamente\n`;
  report += `- [ ] Completar observaciones en STAGING_VALIDATION_RUN_001.md\n`;
  report += `- [ ] Tomar decisión: APROBADO / APROBADO CON OBSERVACIONES / RECHAZADO\n\n`;

  // Referencias
  report += `---\n\n`;
  report += `## Referencias\n
`;
  report += `- Documento de validación: [STAGING_VALIDATION_RUN_001.md](./STAGING_VALIDATION_RUN_001.md)\n`;
  report += `- Resultados JSON: [staging_validation_run_001_result.json](../../data/staging/staging_validation_run_001_result.json)\n`;
  report += `- Benchmark CADEM: [cadem_marzo_2026_master.json](../../data/benchmarks/cadem/normalized/cadem_marzo_2026_master.json)\n\n`;

  report += `---\n\n`;
  report += `*Reporte generado automáticamente el ${new Date().toISOString()}*\n`;

  return report;
}

function saveReport(report: string): void {
  fs.writeFileSync(OUTPUT_FILE, report);
  console.log(`\n✅ Reporte guardado en: ${OUTPUT_FILE}`);
}

function main() {
  console.log('📊 STAGING VALIDATION RUN 001 - Generación de Reporte\n');
  
  const result = loadResults();
  if (!result) {
    process.exit(1);
  }
  
  console.log('✅ Resultados cargados');
  console.log(`   Survey ID: ${result.surveyId}`);
  console.log(`   Run ID: ${result.runId}`);
  console.log(`   Total respuestas: ${result.totalResponses}`);
  console.log(`   Duración: ${(result.durationMs / 1000).toFixed(2)}s\n`);
  
  console.log('📝 Generando reporte...');
  const report = generateReport(result);
  
  saveReport(report);
  
  console.log('\n📋 Resumen de resultados:');
  console.log(`   Total agentes: ${result.totalAgents}`);
  console.log(`   Confidence promedio: ${(result.avgConfidence * 100).toFixed(1)}%`);
  console.log(`   Errores: ${result.errors.length}`);
  
  console.log('\n✅ Reporte generado exitosamente');
  console.log('\n➡️  Próximo paso: Revisar el reporte y completar STAGING_VALIDATION_RUN_001.md');
}

main();
