/**
 * Script de estabilidad: Ejecuta múltiples iteraciones de la encuesta
 * y analiza la variabilidad de las distribuciones.
 */

import { runCademSurvey } from '../../src/app/survey/cademAdapter';
import { aggregateSurveyResponses } from '../../src/app/survey/surveyAggregator';

// Survey definition for testing
// Textos deben coincidir con patrones en questionInterpreter.ts
const TEST_SURVEY = {
  id: 'cadem-w13-2026',
  title: 'Test Survey',
  topic: 'political',
  questions: [
    { id: 'P1', text: '¿Usted aprueba o desaprueba la gestión del gobierno?', type: 'single_choice', options: ['approve', 'disapprove', 'no_response'] },
    { id: 'P2', text: '¿Cree usted que el país va por el buen camino o el mal camino?', type: 'single_choice', options: ['good_path', 'bad_path', 'no_response'] },
    { id: 'P3', text: '¿Cómo ve el futuro del país? ¿Muy optimista o muy pesimista?', type: 'single_choice', options: ['optimistic', 'pessimistic', 'no_response'] },
    { id: 'P4', text: '¿Cómo cree que está la situación económica chilena?', type: 'single_choice', options: ['very_good', 'good', 'bad', 'very_bad', 'no_response'] },
    { id: 'P5', text: '¿Cómo está la situación económica actual de usted y su familia?', type: 'single_choice', options: ['very_good', 'good', 'bad', 'very_bad', 'no_response'] },
    { id: 'P6', text: '¿Se considera de izquierda o de derecha?', type: 'single_choice', options: ['left', 'center_left', 'center', 'center_right', 'right', 'independent', 'no_response'] },
  ],
};

// Generate test agents
function generateTestAgents(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    agentId: `agent-${i}`,
    age: 25 + Math.floor(Math.random() * 50),
    sex: Math.random() > 0.5 ? 'M' : 'F',
    educationLevel: ['basic', 'medium', 'technical', 'university'][Math.floor(Math.random() * 4)],
    incomeDecile: Math.floor(Math.random() * 10) + 1,
    povertyStatus: Math.random() > 0.8 ? 'poor' : 'non_poor',
    regionCode: '13',
    communeCode: '13101',
    connectivityLevel: ['low', 'medium', 'high'][Math.floor(Math.random() * 3)],
    digitalExposure: ['low', 'medium', 'high'][Math.floor(Math.random() * 3)],
    preferredChannel: ['mobile', 'desktop', 'mixed'][Math.floor(Math.random() * 3)],
    agentType: 'synthetic',
  }));
}

interface DistributionSnapshot {
  [questionCode: string]: {
    [option: string]: number; // porcentaje
  };
}

interface StabilityStats {
  mean: number;
  stdDev: number;
  min: number;
  max: number;
  range: number;
  stability: 'high' | 'medium' | 'low';
}

interface StabilityReport {
  iterations: number;
  agentsPerIteration: number;
  questionCount: number;
  totalTimeMs: number;
  distributions: {
    [questionCode: string]: {
      [option: string]: StabilityStats;
    };
  };
  summary: {
    highStability: number;
    mediumStability: number;
    lowStability: number;
    totalOptions: number;
  };
}

/**
 * Ejecuta múltiples iteraciones y recolecta distribuciones
 */
async function runIterations(
  iterations: number,
  agentCount: number,
): Promise<DistributionSnapshot[]> {
  const snapshots: DistributionSnapshot[] = [];

  for (let i = 0; i < iterations; i++) {
    const agents = generateTestAgents(agentCount);
    const responses = runCademSurvey({
      surveyDefinition: TEST_SURVEY,
      agents,
      weekKey: 'w13-2026',
      mode: 'cawi',
    });

    const result = aggregateSurveyResponses(responses);
    const snapshot: DistributionSnapshot = {};

    for (const q of result.questionResults) {
      snapshot[q.questionId] = {};
      for (const [option, pct] of Object.entries(q.distributionPct)) {
        snapshot[q.questionId][option] = pct;
      }
    }

    snapshots.push(snapshot);
  }

  return snapshots;
}

/**
 * Calcula estadísticas de estabilidad para una opción
 */
function calculateStabilityStats(values: number[]): StabilityStats {
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
  const stdDev = Math.sqrt(variance);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min;

  // Criterios de estabilidad basados en desviación estándar
  let stability: 'high' | 'medium' | 'low';
  if (stdDev < 3) {
    stability = 'high';
  } else if (stdDev < 6) {
    stability = 'medium';
  } else {
    stability = 'low';
  }

  return {
    mean: Math.round(mean * 10) / 10,
    stdDev: Math.round(stdDev * 10) / 10,
    min: Math.round(min * 10) / 10,
    max: Math.round(max * 10) / 10,
    range: Math.round(range * 10) / 10,
    stability,
  };
}

/**
 * Genera reporte de estabilidad
 */
function generateStabilityReport(
  snapshots: DistributionSnapshot[],
  iterations: number,
  agentsPerIteration: number,
  totalTimeMs: number,
): StabilityReport {
  const report: StabilityReport = {
    iterations,
    agentsPerIteration,
    questionCount: 0,
    totalTimeMs,
    distributions: {},
    summary: {
      highStability: 0,
      mediumStability: 0,
      lowStability: 0,
      totalOptions: 0,
    },
  };

  // Obtener todas las preguntas y opciones del primer snapshot
  const firstSnapshot = snapshots[0];
  const questions = Object.keys(firstSnapshot);
  report.questionCount = questions.length;

  for (const question of questions) {
    report.distributions[question] = {};
    const options = Object.keys(firstSnapshot[question]);

    for (const option of options) {
      const values = snapshots.map((s) => s[question][option]);
      const stats = calculateStabilityStats(values);

      report.distributions[question][option] = stats;
      report.summary.totalOptions++;

      if (stats.stability === 'high') {
        report.summary.highStability++;
      } else if (stats.stability === 'medium') {
        report.summary.mediumStability++;
      } else {
        report.summary.lowStability++;
      }
    }
  }

  return report;
}

/**
 * Imprime reporte formateado
 */
function printStabilityReport(report: StabilityReport): void {
  console.log('\n' + '='.repeat(70));
  console.log('REPORTE DE ESTABILIDAD - CADEM Opinion Engine');
  console.log('='.repeat(70));
  console.log(`Iteraciones: ${report.iterations}`);
  console.log(`Agentes por iteración: ${report.agentsPerIteration}`);
  console.log(`Preguntas: ${report.questionCount}`);
  console.log(`Tiempo total: ${report.totalTimeMs}ms`);
  console.log(`Tiempo promedio por iteración: ${Math.round(report.totalTimeMs / report.iterations)}ms`);
  console.log('');

  console.log('RESUMEN DE ESTABILIDAD');
  console.log('-'.repeat(70));
  console.log(`Alta (σ < 3pp):    ${report.summary.highStability}/${report.summary.totalOptions} opciones`);
  console.log(`Media (3-6pp):     ${report.summary.mediumStability}/${report.summary.totalOptions} opciones`);
  console.log(`Baja (> 6pp):      ${report.summary.lowStability}/${report.summary.totalOptions} opciones`);
  console.log('');

  console.log('DETALLE POR PREGUNTA');
  console.log('-'.repeat(70));

  for (const [question, options] of Object.entries(report.distributions)) {
    console.log(`\n[${question}]`);

    for (const [option, stats] of Object.entries(options)) {
      const stabilityIcon = stats.stability === 'high' ? '✓' : stats.stability === 'medium' ? '~' : '✗';
      const bar = '█'.repeat(Math.min(Math.round(stats.mean / 2), 25));
      const rangeStr = `[${stats.min.toFixed(1)}-${stats.max.toFixed(1)}]`;

      console.log(
        `  ${stabilityIcon} ${option.padEnd(18)} ${bar.padEnd(25)} ` +
        `${stats.mean.toFixed(1)}% σ=${stats.stdDev.toFixed(1)} ${rangeStr}`
      );
    }
  }

  console.log('\n' + '='.repeat(70));
  console.log('INTERPRETACIÓN');
  console.log('-'.repeat(70));

  const highPct = (report.summary.highStability / report.summary.totalOptions) * 100;
  const lowPct = (report.summary.lowStability / report.summary.totalOptions) * 100;

  if (highPct > 80) {
    console.log('✓ Sistema MUY ESTABLE. Las distribuciones son consistentes.');
    console.log('  El ruido aleatorio está bien calibrado.');
  } else if (highPct > 60 && lowPct < 20) {
    console.log('✓ Sistema ESTABLE. Mayoría de opciones con variabilidad aceptable.');
    console.log('  Algunas opciones podrían beneficiarse de más agentes.');
  } else if (lowPct > 30) {
    console.log('✗ Sistema INESTABLE. Mucha variabilidad entre corridas.');
    console.log('  Posibles causas:');
    console.log('    - Muestra muy pequeña');
    console.log('    - Exceso de ruido en el modelo');
    console.log('    - Sensibilidad extrema a condiciones iniciales');
  } else {
    console.log('~ Sistema MODERADAMENTE ESTABLE.');
    console.log('  Revisar opciones marcadas con ~ o ✗');
  }

  console.log('='.repeat(70) + '\n');
}

/**
 * Ejecuta el test de estabilidad
 */
async function main(): Promise<void> {
  const ITERATIONS = 10;
  const AGENT_COUNT = 100; // Más agentes para mejor estabilidad

  console.log(`\nIniciando test de estabilidad...`);
  console.log(`Configuración: ${ITERATIONS} iteraciones × ${AGENT_COUNT} agentes`);
  console.log('Esto puede tomar unos segundos...\n');

  const startTime = Date.now();
  const snapshots = await runIterations(ITERATIONS, AGENT_COUNT);
  const totalTime = Date.now() - startTime;

  const report = generateStabilityReport(snapshots, ITERATIONS, AGENT_COUNT, totalTime);
  printStabilityReport(report);
}

// Ejecutar
main().catch(console.error);

export { runIterations, generateStabilityReport, calculateStabilityStats };
export type { StabilityReport, StabilityStats, DistributionSnapshot };
