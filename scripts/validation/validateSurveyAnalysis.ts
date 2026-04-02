/**
 * Script de Validación Funcional - Análisis Individual de Encuesta
 *
 * Uso: npx tsx scripts/validation/validateSurveyAnalysis.ts <runId>
 *
 * Ejemplo: npx tsx scripts/validation/validateSurveyAnalysis.ts run_abc123
 */

import { getSurveyRun, getSurveyResultsByRun } from '../../src/app/survey/surveyService';
import { analyzeSurveyResult } from '../../src/app/survey/analysis/surveyAnalysisService';
import type { SurveyAnalysis } from '../../src/app/survey/analysis/types';

// ===========================================
// Colores para terminal
// ===========================================
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
};

// ===========================================
// Helpers de formato
// ===========================================
function success(text: string): string {
  return `${colors.green}✓${colors.reset} ${text}`;
}

function warning(text: string): string {
  return `${colors.yellow}⚠${colors.reset} ${text}`;
}

function error(text: string): string {
  return `${colors.red}✗${colors.reset} ${text}`;
}

function info(text: string): string {
  return `${colors.blue}ℹ${colors.reset} ${text}`;
}

function section(title: string): void {
  console.log(`\n${colors.cyan}═══ ${title} ═══${colors.reset}`);
}

function subsection(title: string): void {
  console.log(`\n${colors.magenta}▸ ${title}${colors.reset}`);
}

// ===========================================
// Validaciones de métricas
// ===========================================
interface ValidationResult {
  metric: string;
  value: number | string;
  expected: string;
  status: 'ok' | 'warning' | 'error';
  message?: string;
}

function validateMetric(
  name: string,
  value: number,
  min: number,
  max: number,
  unit: string = ''
): ValidationResult {
  const status: 'ok' | 'warning' | 'error' =
    value >= min && value <= max ? 'ok' : value < min * 0.5 || value > max * 1.5 ? 'error' : 'warning';

  return {
    metric: name,
    value: unit === '%' ? `${(value * 100).toFixed(1)}%` : value.toFixed(3),
    expected: `${min}-${max}${unit}`,
    status,
    message: status !== 'ok' ? `Fuera de rango esperado` : undefined,
  };
}

function printValidation(result: ValidationResult): void {
  const icon = result.status === 'ok' ? '✓' : result.status === 'warning' ? '⚠' : '✗';
  const color = result.status === 'ok' ? colors.green : result.status === 'warning' ? colors.yellow : colors.red;

  console.log(`  ${color}${icon}${colors.reset} ${result.metric}: ${result.value} (esperado: ${result.expected})`);
  if (result.message) {
    console.log(`    ${colors.gray}→ ${result.message}${colors.reset}`);
  }
}

// ===========================================
// Función principal
// ===========================================
async function validateSurveyAnalysis(runId: string): Promise<void> {
  console.log(`${colors.cyan}╔════════════════════════════════════════════════════════════╗${colors.reset}`);
  console.log(`${colors.cyan}║     Validación Funcional - Módulo Analítico de Encuestas   ║${colors.reset}`);
  console.log(`${colors.cyan}╚════════════════════════════════════════════════════════════╝${colors.reset}`);
  console.log(`\nRun ID: ${colors.magenta}${runId}${colors.reset}`);
  console.log(`Hora: ${new Date().toLocaleString('es-CL')}`);

  // ===========================================
  // Paso 1: Cargar datos
  // ===========================================
  section('1. Carga de Datos');

  const run = await getSurveyRun(runId);
  if (!run) {
    console.log(error(`No se encontró el run: ${runId}`));
    process.exit(1);
  }
  console.log(success(`Run cargado: ${run.surveyId}`));
  console.log(`  Engine: ${run.engineMode || 'legacy'} ${run.engineVersion || ''}`);
  console.log(`  Agentes: ${run.totalAgents}`);
  console.log(`  Respuestas: ${run.responses?.length || 0}`);
  if (run.metadata?.scenarioName) {
    console.log(`  Escenario: ${run.metadata.scenarioName}`);
  }

  const results = await getSurveyResultsByRun(runId);
  if (!results) {
    console.log(error(`No se encontraron resultados para el run: ${runId}`));
    process.exit(1);
  }
  console.log(success(`Resultados cargados: ${results.results.length} preguntas`));

  // ===========================================
  // Paso 2: Ejecutar análisis
  // ===========================================
  section('2. Ejecución del Análisis');

  let analysis: SurveyAnalysis;
  try {
    const startTime = Date.now();
    analysis = analyzeSurveyResult(results, run);
    const duration = Date.now() - startTime;
    console.log(success(`Análisis completado en ${duration}ms`));
  } catch (err) {
    console.log(error(`Error al ejecutar análisis: ${err}`));
    process.exit(1);
  }

  // ===========================================
  // Paso 3: Validar métricas globales
  // ===========================================
  section('3. Métricas Globales');

  const globalValidations: ValidationResult[] = [
    validateMetric('averageConfidence', analysis.summary.averageConfidence, 0.3, 0.9),
    validateMetric('averageEntropy', analysis.globalMetrics.averageEntropy, 0.2, 0.9),
    validateMetric('nonResponseRate', analysis.globalMetrics.nonResponseRate, 0, 20, '%'),
  ];

  globalValidations.forEach(printValidation);

  // Coverage
  const coverage = (analysis.summary.supportedQuestions / analysis.summary.totalQuestions) * 100;
  const coverageResult: ValidationResult = {
    metric: 'Cobertura de preguntas',
    value: `${coverage.toFixed(0)}% (${analysis.summary.supportedQuestions}/${analysis.summary.totalQuestions})`,
    expected: '>70%',
    status: coverage >= 70 ? 'ok' : coverage >= 50 ? 'warning' : 'error',
  };
  printValidation(coverageResult);

  // Consensus level
  console.log(`\n  Nivel de consenso: ${colors.cyan}${analysis.summary.overallConsensusLevel}${colors.reset}`);

  // ===========================================
  // Paso 4: Resumen Ejecutivo
  // ===========================================
  section('4. Resumen Ejecutivo');

  if (analysis.executiveSummary) {
    console.log(`  Tono general: ${colors.cyan}${analysis.executiveSummary.overallTone}${colors.reset}`);
    console.log(`  Nivel de confianza: ${colors.cyan}${analysis.executiveSummary.confidenceLevel}${colors.reset}`);

    if (analysis.executiveSummary.keyFindings.length > 0) {
      subsection('Hallazgos clave');
      analysis.executiveSummary.keyFindings.forEach((finding, i) => {
        console.log(`  ${i + 1}. ${finding}`);
      });
    }
  }

  // ===========================================
  // Paso 5: Insights Globales
  // ===========================================
  section('5. Insights Globales');

  if (analysis.globalInsights.length === 0) {
    console.log(warning('No se generaron insights globales'));
  } else {
    analysis.globalInsights.forEach((insight, i) => {
      const severityColor =
        insight.severity === 'important' ? colors.red : insight.severity === 'warning' ? colors.yellow : colors.gray;
      console.log(`\n  ${severityColor}[${insight.severity.toUpperCase()}]${colors.reset} ${insight.title}`);
      console.log(`     ${insight.description}`);
    });
  }

  // ===========================================
  // Paso 6: Preguntas Destacadas
  // ===========================================
  section('6. Preguntas Destacadas');

  // Más polarizadas
  const polarized = analysis.questionAnalyses
    .filter((q) => q.supported && q.metrics?.polarizationLevel === 'high')
    .sort((a, b) => (b.metrics?.entropy || 0) - (a.metrics?.entropy || 0))
    .slice(0, 3);

  if (polarized.length > 0) {
    subsection('Más Polarizadas');
    polarized.forEach((q) => {
      console.log(`  • ${q.questionText.substring(0, 60)}...`);
      console.log(`    Entropía: ${q.metrics?.entropy?.toFixed(3)} | Dominante: ${q.metrics?.dominantResponse} (${q.metrics?.dominantPercentage?.toFixed(1)}%)`);
    });
  }

  // Más consenso
  const consensus = analysis.questionAnalyses
    .filter((q) => q.supported && (q.metrics?.dominantPercentage || 0) > 50)
    .sort((a, b) => (b.metrics?.dominantPercentage || 0) - (a.metrics?.dominantPercentage || 0))
    .slice(0, 3);

  if (consensus.length > 0) {
    subsection('Mayor Consenso');
    consensus.forEach((q) => {
      console.log(`  • ${q.questionText.substring(0, 60)}...`);
      console.log(`    Dominante: ${q.metrics?.dominantResponse} (${q.metrics?.dominantPercentage?.toFixed(1)}%)`);
    });
  }

  // Menor confianza
  const lowConfidence = analysis.questionAnalyses
    .filter((q) => q.supported)
    .sort((a, b) => (a.metrics?.averageConfidence || 1) - (b.metrics?.averageConfidence || 1))
    .slice(0, 3);

  if (lowConfidence.length > 0 && (lowConfidence[0].metrics?.averageConfidence || 1) < 0.6) {
    subsection('Menor Confianza');
    lowConfidence.forEach((q) => {
      console.log(`  • ${q.questionText.substring(0, 60)}...`);
      console.log(`    Confianza: ${((q.metrics?.averageConfidence || 0) * 100).toFixed(1)}%`);
    });
  }

  // ===========================================
  // Paso 7: Validación de preguntas individuales
  // ===========================================
  section('7. Muestra de Preguntas Analizadas');

  const sampleQuestions = analysis.questionAnalyses.filter((q) => q.supported).slice(0, 3);

  sampleQuestions.forEach((q, i) => {
    console.log(`\n  ${colors.magenta}Pregunta ${i + 1}:${colors.reset} ${q.questionText.substring(0, 70)}...`);
    console.log(`    Tipo: ${q.questionType} | Respuestas: ${q.totalResponses}`);

    if (q.metrics) {
      console.log(`    Dominante: ${colors.cyan}${q.metrics.dominantResponse}${colors.reset} (${q.metrics.dominantPercentage.toFixed(1)}%)`);
      console.log(`    Entropía: ${q.metrics.entropy.toFixed(3)} | Polarización: ${q.metrics.polarizationLevel}`);
      console.log(`    Confianza promedio: ${(q.metrics.averageConfidence * 100).toFixed(1)}%`);
    }

    if (q.insights.length > 0) {
      console.log(`    Insights: ${q.insights.length}`);
      q.insights.forEach((insight) => {
        console.log(`      - ${insight.title}`);
      });
    }
  });

  // ===========================================
  // Paso 8: Resumen de validación
  // ===========================================
  section('8. Resumen de Validación');

  const allValidations = [...globalValidations, coverageResult];
  const errors = allValidations.filter((v) => v.status === 'error').length;
  const warnings = allValidations.filter((v) => v.status === 'warning').length;
  const ok = allValidations.filter((v) => v.status === 'ok').length;

  console.log(`  ${colors.green}✓${colors.reset} Validaciones OK: ${ok}`);
  if (warnings > 0) console.log(`  ${colors.yellow}⚠${colors.reset} Advertencias: ${warnings}`);
  if (errors > 0) console.log(`  ${colors.red}✗${colors.reset} Errores: ${errors}`);

  if (errors === 0 && warnings === 0) {
    console.log(`\n${colors.green}╔════════════════════════════════════════════════════════════╗${colors.reset}`);
    console.log(`${colors.green}║  ✅ VALIDACIÓN EXITOSA - Todas las métricas en rango       ║${colors.reset}`);
    console.log(`${colors.green}╚════════════════════════════════════════════════════════════╝${colors.reset}`);
  } else if (errors === 0) {
    console.log(`\n${colors.yellow}╔════════════════════════════════════════════════════════════╗${colors.reset}`);
    console.log(`${colors.yellow}║  ⚠️  VALIDACIÓN CON ADVERTENCIAS - Revisar métricas        ║${colors.reset}`);
    console.log(`${colors.yellow}╚════════════════════════════════════════════════════════════╝${colors.reset}`);
  } else {
    console.log(`\n${colors.red}╔════════════════════════════════════════════════════════════╗${colors.reset}`);
    console.log(`${colors.red}║  ❌ VALIDACIÓN FALLIDA - Se detectaron errores críticos    ║${colors.reset}`);
    console.log(`${colors.red}╚════════════════════════════════════════════════════════════╝${colors.reset}`);
  }

  // ===========================================
  // Paso 9: Recomendaciones
  // ===========================================
  section('9. Recomendaciones');

  if (analysis.summary.supportedQuestions < analysis.summary.totalQuestions) {
    const unsupported = analysis.summary.totalQuestions - analysis.summary.supportedQuestions;
    console.log(info(`${unsupported} preguntas no soportadas. Considerar extender soporte para: ${analysis.questionAnalyses.filter((q) => !q.supported).map((q) => q.questionType).join(', ')}`));
  }

  if (analysis.summary.averageConfidence < 0.5) {
    console.log(warning('Confianza promedio baja. Revisar calidad de respuestas o mapeo de confidence.'));
  }

  if (analysis.globalMetrics.questionsWithPolarization > analysis.summary.supportedQuestions * 0.5) {
    console.log(info('Alta polarización general. Las respuestas están muy divididas.'));
  }

  console.log('\n');
}

// ===========================================
// Entry point
// ===========================================
const runId = process.argv[2];

if (!runId) {
  console.error(`${colors.red}Error: Debes proporcionar un runId${colors.reset}`);
  console.error(`Uso: npx tsx scripts/validation/validateSurveyAnalysis.ts <runId>`);
  console.error(`Ejemplo: npx tsx scripts/validation/validateSurveyAnalysis.ts run_abc123`);
  process.exit(1);
}

validateSurveyAnalysis(runId).catch((err) => {
  console.error(`${colors.red}Error inesperado:${colors.reset}`, err);
  process.exit(1);
});
