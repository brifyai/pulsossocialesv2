/**
 * Benchmark Comparator
 * Compara resultados sintéticos del motor CADEM contra benchmarks reales
 */

import * as fs from 'fs';
import * as path from 'path';

// ============================================================================
// TYPES
// ============================================================================

export type DistributionType = 'full_distribution' | 'grouped_distribution' | 'partial_distribution';
export type CalibrationTarget = 'strict' | 'soft';
export type DivergenceLevel = 'low' | 'medium' | 'high';

export interface BenchmarkValue {
  [key: string]: number;
}

export interface BenchmarkQuestion {
  questionLabel: string;
  distributionType: DistributionType;
  expectedCalibrationTarget: CalibrationTarget;
  weighted_average: BenchmarkValue;
  trend: string;
  trend_note: string;
}

export interface BenchmarkConsolidated {
  period: string;
  total_sample: number;
  questions: {
    [questionId: string]: BenchmarkQuestion;
  };
}

export interface BenchmarkData {
  metadata: {
    source: string;
    period: string;
    waves_count: number;
    total_sample: number;
    created_at: string;
    version: string;
  };
  waves: unknown[];
  consolidated: BenchmarkConsolidated;
  data_quality: {
    completeness_summary: {
      full: string[];
      partial: string[];
      grouped: string[];
    };
    notes: string[];
  };
}

export interface SyntheticResult {
  questionId: string;
  distribution: {
    [option: string]: number;
  };
}

export interface OptionComparison {
  option: string;
  syntheticValue: number;
  benchmarkValue: number;
  absoluteError: number;
  divergenceLevel: DivergenceLevel;
}

export interface QuestionComparison {
  questionId: string;
  questionLabel: string;
  distributionType: DistributionType;
  calibrationTarget: CalibrationTarget;
  optionComparisons: OptionComparison[];
  mae: number;
  maxError: number;
  overallDivergence: DivergenceLevel;
}

export interface BenchmarkComparison {
  metadata: {
    benchmarkPeriod: string;
    benchmarkSource: string;
    totalQuestions: number;
    timestamp: string;
  };
  questions: QuestionComparison[];
  overallMAE: number;
  summary: {
    lowDivergence: number;
    mediumDivergence: number;
    highDivergence: number;
  };
}

// ============================================================================
// CONSTANTS
// ============================================================================

const DIVERGENCE_THRESHOLDS = {
  low: 5,
  medium: 10,
} as const;

// ============================================================================
// FUNCTIONS
// ============================================================================

/**
 * Carga un benchmark desde un archivo JSON
 */
export function loadBenchmark(filePath: string): BenchmarkData {
  const absolutePath = path.resolve(filePath);

  if (!fs.existsSync(absolutePath)) {
    throw new Error(`Benchmark file not found: ${absolutePath}`);
  }

  const content = fs.readFileSync(absolutePath, 'utf-8');
  const benchmark: BenchmarkData = JSON.parse(content);

  // Validación básica
  if (!benchmark.consolidated || !benchmark.consolidated.questions) {
    throw new Error('Invalid benchmark format: missing consolidated.questions');
  }

  return benchmark;
}

/**
 * Determina el nivel de divergencia basado en el error absoluto
 */
function getDivergenceLevel(error: number): DivergenceLevel {
  if (error <= DIVERGENCE_THRESHOLDS.low) return 'low';
  if (error <= DIVERGENCE_THRESHOLDS.medium) return 'medium';
  return 'high';
}

/**
 * Compara una distribución sintética contra un benchmark
 * Soporta: full_distribution, grouped_distribution, partial_distribution
 */
function compareDistributions(
  syntheticDistribution: { [option: string]: number },
  benchmarkValues: BenchmarkValue,
  distributionType: DistributionType
): OptionComparison[] {
  const comparisons: OptionComparison[] = [];

  // Para grouped_distribution, mapeamos las claves
  const keyMapping: { [key: string]: string } = {
    'optimistic': 'optimistic_total',
    'pessimistic': 'pessimistic_total',
    'positive': 'positive_total',
    'negative': 'negative_total',
    'approve': 'approve',
    'disapprove': 'disapprove',
    'no_response': 'no_response',
    'good_path': 'good_path',
    'bad_path': 'bad_path',
  };

  for (const [syntheticKey, syntheticValue] of Object.entries(syntheticDistribution)) {
    // Mapear la clave sintética a la clave del benchmark
    let benchmarkKey = syntheticKey;

    if (distributionType === 'grouped_distribution') {
      // Buscar el mapeo apropiado
      for (const [syn, bench] of Object.entries(keyMapping)) {
        if (syntheticKey.toLowerCase().includes(syn)) {
          benchmarkKey = bench;
          break;
        }
      }
    }

    const benchmarkValue = benchmarkValues[benchmarkKey];

    // Si no hay valor de benchmark para esta opción, saltar
    if (benchmarkValue === undefined) continue;

    const absoluteError = Math.abs(syntheticValue - benchmarkValue);

    comparisons.push({
      option: syntheticKey,
      syntheticValue,
      benchmarkValue,
      absoluteError,
      divergenceLevel: getDivergenceLevel(absoluteError),
    });
  }

  return comparisons;
}

/**
 * Compara un resultado sintético contra el benchmark consolidado
 */
export function compareSyntheticVsBenchmark(
  syntheticResults: SyntheticResult[],
  benchmark: BenchmarkData
): BenchmarkComparison {
  const questions: QuestionComparison[] = [];
  let totalLow = 0;
  let totalMedium = 0;
  let totalHigh = 0;
  let totalMAE = 0;

  for (const syntheticResult of syntheticResults) {
    const questionId = syntheticResult.questionId;
    const benchmarkQuestion = benchmark.consolidated.questions[questionId];

    if (!benchmarkQuestion) {
      console.warn(`Question ${questionId} not found in benchmark`);
      continue;
    }

    const optionComparisons = compareDistributions(
      syntheticResult.distribution,
      benchmarkQuestion.weighted_average,
      benchmarkQuestion.distributionType
    );

    // Calcular MAE para esta pregunta
    const mae = optionComparisons.length > 0
      ? optionComparisons.reduce((sum, comp) => sum + comp.absoluteError, 0) / optionComparisons.length
      : 0;

    // Calcular error máximo
    const maxError = optionComparisons.length > 0
      ? Math.max(...optionComparisons.map(comp => comp.absoluteError))
      : 0;

    // Determinar divergencia general de la pregunta
    let overallDivergence: DivergenceLevel = 'low';
    if (maxError > DIVERGENCE_THRESHOLDS.medium) {
      overallDivergence = 'high';
      totalHigh++;
    } else if (maxError > DIVERGENCE_THRESHOLDS.low) {
      overallDivergence = 'medium';
      totalMedium++;
    } else {
      totalLow++;
    }

    totalMAE += mae;

    questions.push({
      questionId,
      questionLabel: benchmarkQuestion.questionLabel,
      distributionType: benchmarkQuestion.distributionType,
      calibrationTarget: benchmarkQuestion.expectedCalibrationTarget,
      optionComparisons,
      mae,
      maxError,
      overallDivergence,
    });
  }

  const overallMAE = questions.length > 0 ? totalMAE / questions.length : 0;

  return {
    metadata: {
      benchmarkPeriod: benchmark.consolidated.period,
      benchmarkSource: benchmark.metadata.source,
      totalQuestions: questions.length,
      timestamp: new Date().toISOString(),
    },
    questions,
    overallMAE,
    summary: {
      lowDivergence: totalLow,
      mediumDivergence: totalMedium,
      highDivergence: totalHigh,
    },
  };
}

/**
 * Imprime una comparación de benchmark en formato legible
 */
export function printBenchmarkComparison(comparison: BenchmarkComparison): void {
  console.log('\n' + '='.repeat(80));
  console.log('BENCHMARK COMPARISON REPORT');
  console.log('='.repeat(80));
  console.log(`Benchmark: ${comparison.metadata.benchmarkSource}`);
  console.log(`Period: ${comparison.metadata.benchmarkPeriod}`);
  console.log(`Generated: ${comparison.metadata.timestamp}`);
  console.log(`Total Questions: ${comparison.metadata.totalQuestions}`);
  console.log('-'.repeat(80));

  // Resumen general
  console.log('\n📊 SUMMARY');
  console.log(`   Overall MAE: ${comparison.overallMAE.toFixed(2)} pp`);
  console.log(`   Low Divergence (≤5pp):    ${comparison.summary.lowDivergence} questions`);
  console.log(`   Medium Divergence (5-10pp): ${comparison.summary.mediumDivergence} questions`);
  console.log(`   High Divergence (>10pp):  ${comparison.summary.highDivergence} questions`);

  // Detalle por pregunta
  console.log('\n📋 QUESTION DETAILS');
  console.log('-'.repeat(80));

  for (const question of comparison.questions) {
    const divergenceEmoji = question.overallDivergence === 'low' ? '✅' :
                           question.overallDivergence === 'medium' ? '⚠️' : '❌';

    console.log(`\n${divergenceEmoji} ${question.questionLabel} (${question.questionId})`);
    console.log(`   Type: ${question.distributionType} | Target: ${question.calibrationTarget}`);
    console.log(`   MAE: ${question.mae.toFixed(2)} pp | Max Error: ${question.maxError.toFixed(2)} pp`);

    console.log('   Options:');
    for (const option of question.optionComparisons) {
      const errorEmoji = option.divergenceLevel === 'low' ? '✓' :
                        option.divergenceLevel === 'medium' ? '~' : '✗';
      console.log(`      ${errorEmoji} ${option.option}: ` +
                  `synthetic=${option.syntheticValue.toFixed(1)}% ` +
                  `benchmark=${option.benchmarkValue.toFixed(1)}% ` +
                  `error=${option.absoluteError.toFixed(1)}pp`);
    }
  }

  // Recomendaciones
  console.log('\n💡 RECOMMENDATIONS');
  console.log('-'.repeat(80));

  const highDivergenceQuestions = comparison.questions.filter(q => q.overallDivergence === 'high');
  const mediumDivergenceQuestions = comparison.questions.filter(q => q.overallDivergence === 'medium');

  if (highDivergenceQuestions.length > 0) {
    console.log('High Priority (requires calibration):');
    for (const q of highDivergenceQuestions) {
      console.log(`   - ${q.questionLabel}: max error ${q.maxError.toFixed(1)}pp`);
    }
  }

  if (mediumDivergenceQuestions.length > 0) {
    console.log('Medium Priority (optional calibration):');
    for (const q of mediumDivergenceQuestions) {
      console.log(`   - ${q.questionLabel}: max error ${q.maxError.toFixed(1)}pp`);
    }
  }

  if (highDivergenceQuestions.length === 0 && mediumDivergenceQuestions.length === 0) {
    console.log('✅ All questions within acceptable divergence thresholds');
  }

  console.log('\n' + '='.repeat(80));
}

/**
 * Exporta la comparación a un archivo JSON
 */
export function exportComparisonToJson(
  comparison: BenchmarkComparison,
  outputPath: string
): void {
  const content = JSON.stringify(comparison, null, 2);
  fs.writeFileSync(outputPath, content, 'utf-8');
  console.log(`Comparison exported to: ${outputPath}`);
}
