/**
 * Script de Validación Funcional - Comparación Baseline vs Escenario
 *
 * Uso: npx tsx scripts/validation/validateComparison.ts <baselineRunId> <scenarioRunId>
 *
 * Ejemplo: npx tsx scripts/validation/validateComparison.ts run_abc123 run_def456
 */

import { getSurveyRun, getSurveyResultsByRun } from '../../src/app/survey/surveyService';
import { analyzeSurveyResult } from '../../src/app/survey/analysis/surveyAnalysisService';
import { compareSurveys } from '../../src/app/survey/analysis/comparisonService';
import type { ComparisonSummary, QuestionComparison } from '../../src/app/survey/analysis/types';

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
async function validateComparison(baselineRunId: string, scenarioRunId: string): Promise<void> {
  console.log(`${colors.cyan}╔════════════════════════════════════════════════════════════╗${colors.reset}`);
  console.log(`${colors.cyan}║     Validación de Comparación - Baseline vs Escenario      ║${colors.reset}`);
  console.log(`${colors.cyan}╚════════════════════════════════════════════════════════════╝${colors.reset}`);
  console.log(`\nBaseline: ${colors.green}${baselineRunId}${colors.reset}`);
  console.log(`Escenario: ${colors.yellow}${scenarioRunId}${colors.reset}`);
  console.log(`Hora: ${new Date().toLocaleString('es-CL')}`);

  // ===========================================
  // Paso 1: Cargar datos del baseline
  // ===========================================
  section('1. Carga de Datos - Baseline');

  const baselineRun = await getSurveyRun(baselineRunId);
  if (!baselineRun) {
    console.log(error(`No se encontró el baseline run: ${baselineRunId}`));
    process.exit(1);
  }
  console.log(success(`Baseline cargado: ${baselineRun.surveyId}`));
  console.log(`  Engine: ${baselineRun.engineMode || 'legacy'}`);
  console.log(`  Agentes: ${baselineRun.totalAgents}`);
  console.log(`  Escenario: ${baselineRun.metadata?.scenarioName || 'Ninguno (baseline puro)'}`);

  const baselineResults = await getSurveyResultsByRun(baselineRunId);
  if (!baselineResults) {
    console.log(error(`No se encontraron resultados para baseline: ${baselineRunId}`));
    process.exit(1);
  }
  console.log(success(`Resultados baseline: ${baselineResults.results.length} preguntas`));

  // ===========================================
  // Paso 2: Cargar datos del escenario
  // ===========================================
  section('2. Carga de Datos - Escenario');

  const scenarioRun = await getSurveyRun(scenarioRunId);
  if (!scenarioRun) {
    console.log(error(`No se encontró el scenario run: ${scenarioRunId}`));
    process.exit(1);
  }
  console.log(success(`Escenario cargado: ${scenarioRun.surveyId}`));
  console.log(`  Engine: ${scenarioRun.engineMode || 'legacy'}`);
  console.log(`  Agentes: ${scenarioRun.totalAgents}`);
  console.log(`  Escenario: ${scenarioRun.metadata?.scenarioName || 'Ninguno'}`);

  const scenarioResults = await getSurveyResultsByRun(scenarioRunId);
  if (!scenarioResults) {
    console.log(error(`No se encontraron resultados para escenario: ${scenarioRunId}`));
    process.exit(1);
  }
  console.log(success(`Resultados escenario: ${scenarioResults.results.length} preguntas`));

  // ===========================================
  // Paso 3: Validar compatibilidad
  // ===========================================
  section('3. Validación de Compatibilidad');

  if (baselineRun.surveyId !== scenarioRun.surveyId) {
    console.log(error(`Los runs son de encuestas diferentes:`));
    console.log(`  Baseline: ${baselineRun.surveyId}`);
    console.log(`  Escenario: ${scenarioRun.surveyId}`);
    process.exit(1);
  }
  console.log(success(`Ambos runs son de la misma encuesta: ${baselineRun.surveyId}`));

  if (baselineRun.totalAgents !== scenarioRun.totalAgents) {
    console.log(warning(`Diferente número de agentes:`));
    console.log(`  Baseline: ${baselineRun.totalAgents}`);
    console.log(`  Escenario: ${scenarioRun.totalAgents}`);
    console.log(`  ${colors.gray}→ Esto puede afectar la comparabilidad${colors.reset}`);
  } else {
    console.log(success(`Mismo número de agentes: ${baselineRun.totalAgents}`));
  }

  // ===========================================
  // Paso 4: Ejecutar análisis individuales
  // ===========================================
  section('4. Análisis Individuales');

  let baselineAnalysis;
  let scenarioAnalysis;

  try {
    const startTime = Date.now();
    baselineAnalysis = analyzeSurveyResult(baselineResults, baselineRun);
    console.log(success(`Análisis baseline completado en ${Date.now() - startTime}ms`));

    const startTime2 = Date.now();
    scenarioAnalysis = analyzeSurveyResult(scenarioResults, scenarioRun);
    console.log(success(`Análisis escenario completado en ${Date.now() - startTime2}ms`));
  } catch (err) {
    console.log(error(`Error al ejecutar análisis: ${err}`));
    process.exit(1);
  }

  // ===========================================
  // Paso 5: Ejecutar comparación
  // ===========================================
  section('5. Ejecución de Comparación');

  let comparison: ComparisonSummary;
  try {
    const startTime = Date.now();
    comparison = compareSurveys(baselineAnalysis, scenarioAnalysis);
    console.log(success(`Comparación completada en ${Date.now() - startTime}ms`));
  } catch (err) {
    console.log(error(`Error al ejecutar comparación: ${err}`));
    process.exit(1);
  }

  // ===========================================
  // Paso 6: Validar métricas de comparación
  // ===========================================
  section('6. Métricas de Comparación');

  const comparisonValidations: ValidationResult[] = [
    validateMetric('averageImpactScore', comparison.averageImpactScore, 0.05, 0.6),
  ];

  comparisonValidations.forEach(printValidation);

  // Coverage
  const coverageResult: ValidationResult = {
    metric: 'Preguntas comparadas',
    value: `${comparison.totalQuestionsCompared}`,
    expected: `${baselineResults.results.length}`,
    status: comparison.totalQuestionsCompared === baselineResults.results.length ? 'ok' : 'warning',
  };
  printValidation(coverageResult);

  // Cambios significativos
  const significantChangeRate = comparison.questionsWithSignificantChange / comparison.totalQuestionsCompared;
  const significantResult: ValidationResult = {
    metric: 'Tasa de cambio significativo',
    value: `${(significantChangeRate * 100).toFixed(1)}%`,
    expected: '10%-50%',
    status: significantChangeRate >= 0.1 && significantChangeRate <= 0.5 ? 'ok' : significantChangeRate > 0.5 ? 'warning' : 'ok',
  };
  printValidation(significantResult);

  // Cambios en dominante
  const dominantChangeRate = comparison.questionsWithDominantChange / comparison.totalQuestionsCompared;
  const dominantResult: ValidationResult = {
    metric: 'Tasa de cambio en dominante',
    value: `${(dominantChangeRate * 100).toFixed(1)}%`,
    expected: '0%-30%',
    status: dominantChangeRate <= 0.3 ? 'ok' : 'warning',
  };
  printValidation(dominantResult);

  // Nivel de impacto general
  console.log(`\n  Nivel de impacto general: ${colors.cyan}${comparison.overallImpactLevel}${colors.reset}`);

  // ===========================================
  // Paso 7: Preguntas más afectadas
  // ===========================================
  section('7. Preguntas Más Afectadas');

  if (comparison.mostAffectedQuestions.length === 0) {
    console.log(info('No se detectaron preguntas afectadas significativamente'));
  } else {
    comparison.mostAffectedQuestions.forEach((q, i) => {
      const impactColor = q.impactScore > 0.5 ? colors.red : q.impactScore > 0.25 ? colors.yellow : colors.gray;
      console.log(`\n  ${impactColor}#${i + 1}${colors.reset} ${q.questionText.substring(0, 60)}...`);
      console.log(`     Impact Score: ${impactColor}${q.impactScore.toFixed(3)}${colors.reset}`);
    });
  }

  // ===========================================
  // Paso 8: Detalle de comparaciones
  // ===========================================
  section('8. Detalle de Comparaciones');

  // Obtener las comparaciones completas (necesitamos recrearlas)
  const { compareSurveys: compareWithDetails } = await import('../../src/app/survey/analysis/comparisonService');
  const fullComparison = compareWithDetails(baselineAnalysis, scenarioAnalysis, { includeUnchanged: true });

  // Mostrar top 3 comparaciones con más cambios
  const topComparisons = fullComparison
    .sort((a: QuestionComparison, b: QuestionComparison) => b.impactScore - a.impactScore)
    .slice(0, 3);

  topComparisons.forEach((comp: QuestionComparison, i: number) => {
    console.log(`\n  ${colors.magenta}Comparación ${i + 1}:${colors.reset} ${comp.questionText.substring(0, 60)}...`);
    console.log(`    Impacto: ${comp.impactLevel} (${comp.impactScore.toFixed(3)})`);

    if (comp.dominantChanged) {
      console.log(`    ${colors.yellow}⚠ Cambio en respuesta dominante:${colors.reset}`);
      console.log(`      Baseline: ${comp.baselineDominant}`);
      console.log(`      Escenario: ${comp.scenarioDominant}`);
    }

    if (comp.metricChanges.length > 0) {
      console.log(`    Cambios en métricas:`);
      comp.metricChanges
        .filter((m) => m.isSignificant)
        .slice(0, 3)
        .forEach((m) => {
          const direction = m.direction === 'increased' ? '↑' : m.direction === 'decreased' ? '↓' : '→';
          console.log(`      ${direction} ${m.metric}: ${m.baselineValue.toFixed(2)} → ${m.scenarioValue.toFixed(2)}`);
        });
    }

    if (comp.distributionChanges.length > 0) {
      const topChange = comp.distributionChanges[0];
      if (Math.abs(topChange.percentagePointChange) > 2) {
        console.log(`    Mayor cambio en distribución:`);
        console.log(`      ${topChange.optionLabel}: ${topChange.baselinePercentage.toFixed(1)}% → ${topChange.scenarioPercentage.toFixed(1)}% (${topChange.percentagePointChange > 0 ? '+' : ''}${topChange.percentagePointChange.toFixed(1)}pp)`);
      }
    }

    if (comp.insights.length > 0) {
      console.log(`    Insights:`);
      comp.insights.forEach((insight) => {
        console.log(`      • ${insight.title}`);
      });
    }
  });

  // ===========================================
  // Paso 9: Insights globales
  // ===========================================
  section('9. Insights Globales de Comparación');

  if (comparison.globalInsights.length === 0) {
    console.log(info('No se generaron insights globales'));
  } else {
    comparison.globalInsights.forEach((insight, i) => {
      const severityColor =
        insight.severity === 'important' ? colors.red : insight.severity === 'warning' ? colors.yellow : colors.gray;
      console.log(`\n  ${severityColor}[${insight.severity.toUpperCase()}]${colors.reset} ${insight.title}`);
      console.log(`     ${insight.description}`);
    });
  }

  // ===========================================
  // Paso 10: Resumen de validación
  // ===========================================
  section('10. Resumen de Validación');

  const allValidations = [...comparisonValidations, coverageResult, significantResult, dominantResult];
  const errors = allValidations.filter((v) => v.status === 'error').length;
  const warnings = allValidations.filter((v) => v.status === 'warning').length;
  const ok = allValidations.filter((v) => v.status === 'ok').length;

  console.log(`  ${colors.green}✓${colors.reset} Validaciones OK: ${ok}`);
  if (warnings > 0) console.log(`  ${colors.yellow}⚠${colors.reset} Advertencias: ${warnings}`);
  if (errors > 0) console.log(`  ${colors.red}✗${colors.reset} Errores: ${errors}`);

  // Veredicto
  const hasScenario = !!scenarioRun.metadata?.scenarioName;
  const expectedImpact = hasScenario ? comparison.averageImpactScore > 0.1 : comparison.averageImpactScore < 0.1;

  console.log(`\n  ${colors.gray}Análisis de coherencia:${colors.reset}`);
  if (hasScenario) {
    console.log(`  • Escenario aplicado: ${colors.cyan}${scenarioRun.metadata?.scenarioName}${colors.reset}`);
    console.log(`  • Impacto esperado: ${colors.cyan}ALTO${colors.reset} (porque hay escenario)`);
    console.log(`  • Impacto detectado: ${comparison.averageImpactScore > 0.1 ? colors.green : colors.yellow}${comparison.averageImpactScore > 0.1 ? 'ALTO' : 'BAJO'}${colors.reset}`);

    if (comparison.averageImpactScore > 0.1) {
      console.log(`  ${colors.green}✓${colors.reset} Coherente: El escenario generó cambios detectables`);
    } else {
      console.log(`  ${colors.yellow}⚠${colors.reset} Inesperado: El escenario no generó cambios significativos`);
    }
  } else {
    console.log(`  • Escenario aplicado: ${colors.gray}NINGUNO${colors.reset}`);
    console.log(`  • Impacto esperado: ${colors.cyan}BAJO${colors.reset} (comparación de dos baselines)`);
    console.log(`  • Impacto detectado: ${comparison.averageImpactScore < 0.1 ? colors.green : colors.yellow}${comparison.averageImpactScore < 0.1 ? 'BAJO' : 'ALTO'}${colors.reset}`);

    if (comparison.averageImpactScore < 0.1) {
      console.log(`  ${colors.green}✓${colors.reset} Coherente: Sin escenario, los cambios son mínimos`);
    } else {
      console.log(`  ${colors.yellow}⚠${colors.reset} Inesperado: Hay cambios significativos sin escenario`);
    }
  }

  // Resultado final
  if (errors === 0 && expectedImpact) {
    console.log(`\n${colors.green}╔════════════════════════════════════════════════════════════╗${colors.reset}`);
    console.log(`${colors.green}║  ✅ VALIDACIÓN EXITOSA - Comparación coherente             ║${colors.reset}`);
    console.log(`${colors.green}╚════════════════════════════════════════════════════════════╝${colors.reset}`);
  } else if (errors === 0) {
    console.log(`\n${colors.yellow}╔════════════════════════════════════════════════════════════╗${colors.reset}`);
    console.log(`${colors.yellow}║  ⚠️  VALIDACIÓN CON ADVERTENCIAS - Revisar coherencia      ║${colors.reset}`);
    console.log(`${colors.yellow}╚════════════════════════════════════════════════════════════╝${colors.reset}`);
  } else {
    console.log(`\n${colors.red}╔════════════════════════════════════════════════════════════╗${colors.reset}`);
    console.log(`${colors.red}║  ❌ VALIDACIÓN FALLIDA - Se detectaron errores críticos    ║${colors.reset}`);
    console.log(`${colors.red}╚════════════════════════════════════════════════════════════╝${colors.reset}`);
  }

  // ===========================================
  // Paso 11: Recomendaciones
  // ===========================================
  section('11. Recomendaciones');

  if (comparison.questionsWithSignificantChange === 0 && hasScenario) {
    console.log(warning('El escenario no generó cambios significativos. Verificar:' ));
    console.log('  • Que el escenario esté correctamente configurado');
    console.log('  • Que las preguntas sean sensibles al tipo de evento del escenario');
    console.log('  • Que el impacto del escenario no sea muy bajo');
  }

  if (comparison.questionsWithDominantChange > comparison.totalQuestionsCompared * 0.3) {
    console.log(warning('Muchas preguntas cambiaron su respuesta dominante. Esto puede indicar:' ));
    console.log('  • Un escenario con impacto muy fuerte (verificar si es esperado)');
    console.log('  • Inestabilidad en las respuestas (revisar consistencia del motor)');
  }

  if (comparison.averageImpactScore > 0.5 && !hasScenario) {
    console.log(warning('Alto impacto detectado sin escenario. Posibles causas:' ));
    console.log('  • Los runs usaron muestras de agentes diferentes');
    console.log('  • Hay variabilidad alta en el motor de respuestas');
    console.log('  • Recomendación: Usar fixedAgentIds para comparaciones válidas');
  }

  console.log('\n');
}

// ===========================================
// Entry point
// ===========================================
const baselineRunId = process.argv[2];
const scenarioRunId = process.argv[3];

if (!baselineRunId || !scenarioRunId) {
  console.error(`${colors.red}Error: Debes proporcionar dos runIds${colors.reset}`);
  console.error(`Uso: npx tsx scripts/validation/validateComparison.ts <baselineRunId> <scenarioRunId>`);
  console.error(`Ejemplo: npx tsx scripts/validation/validateComparison.ts run_abc123 run_def456`);
  process.exit(1);
}

validateComparison(baselineRunId, scenarioRunId).catch((err) => {
  console.error(`${colors.red}Error inesperado:${colors.reset}`, err);
  process.exit(1);
});
