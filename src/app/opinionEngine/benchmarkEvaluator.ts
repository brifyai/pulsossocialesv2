/**
 * Benchmark Evaluator v1.0
 *
 * Compara resultados de encuestas sintéticas con benchmarks reales (CADEM, etc.)
 * Calcula métricas de calidad: MAE, bias, correlación.
 * Genera reportes de calibración para ajustar el motor de opinión.
 */

import type { OpinionResponseValue } from '../../types/opinion';

/**
 * Representa un benchmark real (ej: resultado CADEM)
 */
export interface BenchmarkData {
  indicatorId: string;
  indicatorName: string;
  category: string;
  value: number; // Porcentaje o promedio
  sampleSize?: number;
  marginOfError?: number;
  confidenceInterval?: { lower: number; upper: number };
  date: string;
  source: string;
}

/**
 * Representa un resultado sintético agregado
 */
export interface SyntheticResult {
  indicatorId: string;
  indicatorName: string;
  value: number; // Porcentaje o promedio
  sampleSize: number;
  stdDev?: number;
}

/**
 * Resultado de comparación entre sintético y benchmark
 */
export interface ComparisonResult {
  indicatorId: string;
  indicatorName: string;
  category: string;
  syntheticValue: number;
  benchmarkValue: number;
  absoluteError: number;
  relativeError: number;
  withinMargin: boolean;
  benchmarkMargin?: number;
}

/**
 * Métricas agregadas de calidad
 */
export interface QualityMetrics {
  mae: number; // Mean Absolute Error
  rmse: number; // Root Mean Square Error
  mape: number; // Mean Absolute Percentage Error
  bias: number; // Sesgo medio (sintético - benchmark)
  correlation: number; // Correlación Pearson
  withinMargin: number; // % de indicadores dentro del margen de error
  totalIndicators: number;
}

/**
 * Reporte completo de evaluación
 */
export interface BenchmarkReport {
  reportId: string;
  generatedAt: string;
  surveyId: string;
  benchmarkSource: string;
  comparisons: ComparisonResult[];
  metrics: QualityMetrics;
  summary: string;
  recommendations: string[];
}

/**
 * Compara un resultado sintético con un benchmark
 */
export function compareWithBenchmark(
  synthetic: SyntheticResult,
  benchmark: BenchmarkData,
): ComparisonResult {
  const absoluteError = Math.abs(synthetic.value - benchmark.value);
  const relativeError = benchmark.value !== 0
    ? (absoluteError / benchmark.value) * 100
    : 0;

  const margin = benchmark.marginOfError ?? 3.0; // Default 3% margin
  const withinMargin = absoluteError <= margin;

  return {
    indicatorId: synthetic.indicatorId,
    indicatorName: synthetic.indicatorName,
    category: benchmark.category,
    syntheticValue: synthetic.value,
    benchmarkValue: benchmark.value,
    absoluteError,
    relativeError,
    withinMargin,
    benchmarkMargin: margin,
  };
}

/**
 * Calcula métricas agregadas de calidad
 */
export function calculateQualityMetrics(
  comparisons: ComparisonResult[],
): QualityMetrics {
  if (comparisons.length === 0) {
    return {
      mae: 0,
      rmse: 0,
      mape: 0,
      bias: 0,
      correlation: 0,
      withinMargin: 0,
      totalIndicators: 0,
    };
  }

  const errors = comparisons.map(c => c.absoluteError);
  const relativeErrors = comparisons.map(c => c.relativeError);
  const biases = comparisons.map(c => c.syntheticValue - c.benchmarkValue);

  const mae = errors.reduce((a, b) => a + b, 0) / errors.length;
  const rmse = Math.sqrt(errors.reduce((a, b) => a + b * b, 0) / errors.length);
  const mape = relativeErrors.reduce((a, b) => a + b, 0) / relativeErrors.length;
  const bias = biases.reduce((a, b) => a + b, 0) / biases.length;

  // Correlación Pearson
  const syntheticValues = comparisons.map(c => c.syntheticValue);
  const benchmarkValues = comparisons.map(c => c.benchmarkValue);
  const correlation = calculatePearsonCorrelation(syntheticValues, benchmarkValues);

  const withinMarginCount = comparisons.filter(c => c.withinMargin).length;
  const withinMargin = (withinMarginCount / comparisons.length) * 100;

  return {
    mae,
    rmse,
    mape,
    bias,
    correlation,
    withinMargin,
    totalIndicators: comparisons.length,
  };
}

/**
 * Calcula correlación de Pearson entre dos arrays
 */
function calculatePearsonCorrelation(x: number[], y: number[]): number {
  if (x.length !== y.length || x.length === 0) {
    return 0;
  }

  const n = x.length;
  const sumX = x.reduce((a, b) => a + b, 0);
  const sumY = y.reduce((a, b) => a + b, 0);
  const sumXY = x.reduce((total, xi, i) => total + xi * y[i], 0);
  const sumX2 = x.reduce((total, xi) => total + xi * xi, 0);
  const sumY2 = y.reduce((total, yi) => total + yi * yi, 0);

  const numerator = n * sumXY - sumX * sumY;
  const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));

  return denominator === 0 ? 0 : numerator / denominator;
}

/**
 * Genera un reporte completo de benchmark
 */
export function generateBenchmarkReport(
  surveyId: string,
  benchmarkSource: string,
  syntheticResults: SyntheticResult[],
  benchmarkData: BenchmarkData[],
): BenchmarkReport {
  // Emparejar resultados por indicatorId
  const comparisons: ComparisonResult[] = [];

  for (const synthetic of syntheticResults) {
    const benchmark = benchmarkData.find(b => b.indicatorId === synthetic.indicatorId);
    if (benchmark) {
      comparisons.push(compareWithBenchmark(synthetic, benchmark));
    }
  }

  const metrics = calculateQualityMetrics(comparisons);

  // Generar summary
  let summary: string;
  if (metrics.mae < 2) {
    summary = `Excelente calibración. MAE: ${metrics.mae.toFixed(2)}%, correlación: ${metrics.correlation.toFixed(3)}`;
  } else if (metrics.mae < 4) {
    summary = `Buena calibración. MAE: ${metrics.mae.toFixed(2)}%, correlación: ${metrics.correlation.toFixed(3)}`;
  } else if (metrics.mae < 6) {
    summary = `Calibración aceptable. MAE: ${metrics.mae.toFixed(2)}%, correlación: ${metrics.correlation.toFixed(3)}`;
  } else {
    summary = `Calibración deficiente. MAE: ${metrics.mae.toFixed(2)}%, correlación: ${metrics.correlation.toFixed(3)}`;
  }

  // Generar recomendaciones
  const recommendations: string[] = [];

  if (metrics.bias > 2) {
    recommendations.push('El modelo tiende a sobrestimar. Considerar ajustar sesgos en topic states.');
  } else if (metrics.bias < -2) {
    recommendations.push('El modelo tiende a subestimar. Considerar ajustar sesgos en topic states.');
  }

  if (metrics.correlation < 0.8) {
    recommendations.push('Baja correlación. Revisar la estructura de dependencias entre topics.');
  }

  if (metrics.withinMargin < 70) {
    recommendations.push('Menos del 70% dentro del margen. Considerar aumentar ruido/variabilidad.');
  }

  if (recommendations.length === 0) {
    recommendations.push('El modelo está bien calibrado. No se requieren ajustes mayores.');
  }

  return {
    reportId: `report-${Date.now()}`,
    generatedAt: new Date().toISOString(),
    surveyId,
    benchmarkSource,
    comparisons,
    metrics,
    summary,
    recommendations,
  };
}

/**
 * Agrega respuestas de encuesta a resultados sintéticos
 */
export function aggregateSurveyResponses(
  responses: Array<{ questionId: string; value: OpinionResponseValue }>,
  questionMapping: Record<string, { indicatorId: string; indicatorName: string; category: string }>,
): SyntheticResult[] {
  const grouped = new Map<string, { values: number[]; name: string; category: string }>();

  for (const response of responses) {
    const mapping = questionMapping[response.questionId];
    if (!mapping) continue;

    // Convertir valor a número (asumiendo respuestas categóricas)
    let numericValue: number | null = null;

    if (typeof response.value === 'string') {
      // Mapeo simple para respuestas de aprobación
      if (response.value === 'approve') numericValue = 100;
      else if (response.value === 'disapprove') numericValue = 0;
      else if (response.value === 'good_path') numericValue = 100;
      else if (response.value === 'bad_path') numericValue = 0;
      else if (response.value === 'very_optimistic') numericValue = 100;
      else if (response.value === 'optimistic') numericValue = 66;
      else if (response.value === 'pessimistic') numericValue = 33;
      else if (response.value === 'very_pessimistic') numericValue = 0;
      else if (response.value === 'no_response') numericValue = null;
    } else if (typeof response.value === 'number') {
      numericValue = response.value;
    }

    if (numericValue !== null) {
      const existing = grouped.get(mapping.indicatorId);
      if (existing) {
        existing.values.push(numericValue);
      } else {
        grouped.set(mapping.indicatorId, {
          values: [numericValue],
          name: mapping.indicatorName,
          category: mapping.category,
        });
      }
    }
  }

  // Calcular promedios
  const results: SyntheticResult[] = [];
  for (const [indicatorId, data] of grouped) {
    const sum = data.values.reduce((a, b) => a + b, 0);
    const mean = sum / data.values.length;

    // Calcular desviación estándar
    const squaredDiffs = data.values.map(v => Math.pow(v - mean, 2));
    const variance = squaredDiffs.reduce((a, b) => a + b, 0) / squaredDiffs.length;
    const stdDev = Math.sqrt(variance);

    results.push({
      indicatorId,
      indicatorName: data.name,
      value: mean,
      sampleSize: data.values.length,
      stdDev,
    });
  }

  return results;
}

/**
 * Exporta reporte a formato JSON
 */
export function exportReportToJson(report: BenchmarkReport): string {
  return JSON.stringify(report, null, 2);
}

/**
 * Exporta reporte a formato CSV
 */
export function exportReportToCsv(report: BenchmarkReport): string {
  const lines: string[] = [
    'Indicator ID,Indicator Name,Category,Synthetic Value,Benchmark Value,Absolute Error,Relative Error,Within Margin',
  ];

  for (const comp of report.comparisons) {
    lines.push(
      `${comp.indicatorId},"${comp.indicatorName}",${comp.category},${comp.syntheticValue.toFixed(2)},${comp.benchmarkValue.toFixed(2)},${comp.absoluteError.toFixed(2)},${comp.relativeError.toFixed(2)},${comp.withinMargin ? 'Yes' : 'No'}`,
    );
  }

  // Agregar métricas
  lines.push('');
  lines.push('Metric,Value');
  lines.push(`MAE,${report.metrics.mae.toFixed(2)}`);
  lines.push(`RMSE,${report.metrics.rmse.toFixed(2)}`);
  lines.push(`MAPE,${report.metrics.mape.toFixed(2)}`);
  lines.push(`Bias,${report.metrics.bias.toFixed(2)}`);
  lines.push(`Correlation,${report.metrics.correlation.toFixed(3)}`);
  lines.push(`Within Margin,${report.metrics.withinMargin.toFixed(1)}%`);

  return lines.join('\n');
}
