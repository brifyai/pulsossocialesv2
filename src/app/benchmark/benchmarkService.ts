/**
 * Benchmark Service - Sprint 12C
 *
 * Servicio para gestionar benchmarks de referencia y comparaciones
 * con resultados sintéticos. Integrado con Supabase.
 */

import type {
  Benchmark,
  SurveyBenchmarkComparison,
  IndicatorComparison,
  ComparisonGap
} from '../../types/benchmark';
import type { SurveyResult, QuestionResult, SingleChoiceResult, LikertResult } from '../../types/survey';
import {
  getBenchmarks,
  getBenchmarkById,
  saveComparison as saveComparisonToDb,
  getComparisonsBySurveyId
} from '../../services/supabase/repositories/benchmarkRepository';

// ===========================================
// Cache local
// ===========================================

let benchmarksCache: Benchmark[] | null = null;
let cacheTimestamp: number = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutos

// ===========================================
// Storage
// ===========================================

const comparisons: Map<string, SurveyBenchmarkComparison> = new Map();

// ===========================================
// Helper Functions
// ===========================================

function isCacheValid(): boolean {
  return benchmarksCache !== null && (Date.now() - cacheTimestamp) < CACHE_TTL;
}

function updateCache(benchmarks: Benchmark[]): void {
  benchmarksCache = benchmarks;
  cacheTimestamp = Date.now();
}

// Helper para convertir DbBenchmark a Benchmark
function dbBenchmarkToBenchmark(dbBenchmark: any, indicators: any[] = []): Benchmark {
  return {
    id: dbBenchmark.id,
    source: {
      id: dbBenchmark.source_id,
      name: dbBenchmark.name,
      organization: dbBenchmark.organization,
      year: dbBenchmark.year,
      url: dbBenchmark.url,
      description: dbBenchmark.description
    },
    indicators: indicators.map(ind => ({
      id: ind.indicator_id,
      name: ind.name,
      description: ind.description,
      category: ind.category,
      unit: ind.unit,
      value: {
        value: ind.value,
        percentage: ind.percentage,
        sampleSize: ind.sample_size,
        marginOfError: ind.margin_of_error,
        confidenceInterval: ind.confidence_interval
      },
      compatibleQuestionTypes: ind.compatible_question_types || [],
      compatibleSegments: ind.compatible_segments || []
    })),
    coverage: {
      geographic: dbBenchmark.coverage_geographic || [],
      temporal: {
        start: dbBenchmark.coverage_temporal_start,
        end: dbBenchmark.coverage_temporal_end
      }
    },
    createdAt: dbBenchmark.created_at
  };
}

// ===========================================
// Benchmark CRUD (Async)
// ===========================================

/**
 * Obtiene todos los benchmarks desde Supabase
 */
export async function getAllBenchmarks(): Promise<Benchmark[]> {
  if (isCacheValid() && benchmarksCache) {
    return benchmarksCache;
  }

  try {
    const dbBenchmarks = await getBenchmarks();
    const benchmarks: Benchmark[] = [];

    for (const dbBenchmark of dbBenchmarks) {
      const result = await getBenchmarkById(dbBenchmark.id);
      if (result) {
        benchmarks.push(dbBenchmarkToBenchmark(result.benchmark, result.indicators));
      }
    }

    updateCache(benchmarks);
    return benchmarks;
  } catch (error) {
    console.error('[BenchmarkService] Error fetching benchmarks:', error);
    return benchmarksCache || [];
  }
}

/**
 * Obtiene un benchmark por ID
 */
export async function getBenchmark(id: string): Promise<Benchmark | null> {
  // Check cache first
  if (benchmarksCache) {
    const cached = benchmarksCache.find(b => b.id === id);
    if (cached) return cached;
  }

  try {
    const result = await getBenchmarkById(id);
    if (!result) return null;
    return dbBenchmarkToBenchmark(result.benchmark, result.indicators);
  } catch (error) {
    console.error(`[BenchmarkService] Error fetching benchmark ${id}:`, error);
    return null;
  }
}

/**
 * Obtiene benchmarks por categoría
 */
export async function getBenchmarksByCategory(category: string): Promise<Benchmark[]> {
  const all = await getAllBenchmarks();
  return all.filter(b =>
    b.indicators.some(i => i.category === category)
  );
}

/**
 * Obtiene todas las categorías disponibles
 */
export async function getCategories(): Promise<string[]> {
  const all = await getAllBenchmarks();
  const categories = new Set<string>();
  all.forEach(b => {
    b.indicators.forEach(i => categories.add(i.category));
  });
  return Array.from(categories).sort();
}

/**
 * Busca benchmarks por texto
 */
export async function searchBenchmarks(query: string): Promise<Benchmark[]> {
  try {
    const dbBenchmarks = await getBenchmarks({ search: query });
    const benchmarks: Benchmark[] = [];

    for (const dbBenchmark of dbBenchmarks) {
      const result = await getBenchmarkById(dbBenchmark.id);
      if (result) {
        benchmarks.push(dbBenchmarkToBenchmark(result.benchmark, result.indicators));
      }
    }

    return benchmarks;
  } catch (error) {
    console.error('[BenchmarkService] Error searching benchmarks:', error);
    return [];
  }
}

/**
 * Invalida el cache de benchmarks
 */
export function invalidateCache(): void {
  benchmarksCache = null;
  cacheTimestamp = 0;
}

// ===========================================
// Comparison Logic
// ===========================================

/**
 * Calcula el gap entre valor sintético y benchmark
 */
function calculateGap(synthetic: number, benchmark: number, _unit: string): ComparisonGap {
  const absolute = synthetic - benchmark;
  const relative = benchmark !== 0 ? (absolute / benchmark) * 100 : 0;

  let direction: 'above' | 'below' | 'match';
  if (Math.abs(absolute) < 0.01) direction = 'match';
  else if (absolute > 0) direction = 'above';
  else direction = 'below';

  // Significancia basada en diferencia relativa
  let significance: 'high' | 'medium' | 'low';
  const absRelative = Math.abs(relative);
  if (absRelative > 20) significance = 'high';
  else if (absRelative > 10) significance = 'medium';
  else significance = 'low';

  return {
    absolute: Math.round(absolute * 100) / 100,
    relative: Math.round(relative * 10) / 10,
    direction,
    significance
  };
}

/**
 * Extrae valor numérico de un resultado de pregunta
 */
function extractValueFromResult(result: QuestionResult): number | null {
  switch (result.questionType) {
    case 'single_choice':
      // Para single_choice, tomamos el porcentaje de la opción más seleccionada
      const scResult = result as SingleChoiceResult;
      const values = Object.values(scResult.distribution);
      if (values.length === 0) return null;
      // Retornar el porcentaje más alto como referencia
      return Math.max(...values.map(v => v.percentage));

    case 'likert_scale':
      const likertResult = result as LikertResult;
      return likertResult.average;

    default:
      return null;
  }
}

/**
 * Compara una encuesta sintética con un benchmark
 */
export async function compareSurveyWithBenchmark(
  surveyResult: SurveyResult,
  benchmarkId: string
): Promise<SurveyBenchmarkComparison | null> {
  const benchmark = await getBenchmark(benchmarkId);
  if (!benchmark) {
    console.error(`Benchmark not found: ${benchmarkId}`);
    return null;
  }

  console.log(`🔍 Comparing survey ${surveyResult.surveyId} with benchmark ${benchmarkId}`);

  const indicatorComparisons: IndicatorComparison[] = [];

  // Intentar mapear cada indicador del benchmark con una pregunta de la encuesta
  for (const indicator of benchmark.indicators) {
    // Buscar pregunta compatible
    const compatibleResult = surveyResult.results.find(r =>
      indicator.compatibleQuestionTypes.includes(r.questionType as any)
    );

    if (compatibleResult) {
      const syntheticValue = extractValueFromResult(compatibleResult);

      if (syntheticValue !== null) {
        const comparison: IndicatorComparison = {
          benchmarkId: benchmark.id,
          indicatorId: indicator.id,
          indicatorName: indicator.name,
          category: indicator.category,
          unit: indicator.unit,
          syntheticValue: Math.round(syntheticValue * 100) / 100,
          benchmarkValue: indicator.value.value,
          gap: calculateGap(syntheticValue, indicator.value.value, indicator.unit),
          syntheticSampleSize: surveyResult.summary.uniqueAgents,
          benchmarkSampleSize: indicator.value.sampleSize,
          benchmarkConfidenceInterval: indicator.value.confidenceInterval
        };

        indicatorComparisons.push(comparison);
      }
    }
  }

  // Calcular resumen
  const above = indicatorComparisons.filter(c => c.gap.direction === 'above').length;
  const below = indicatorComparisons.filter(c => c.gap.direction === 'below').length;
  const match = indicatorComparisons.filter(c => c.gap.direction === 'match').length;
  const averageGap = indicatorComparisons.length > 0
    ? indicatorComparisons.reduce((sum, c) => sum + Math.abs(c.gap.absolute), 0) / indicatorComparisons.length
    : 0;

  const comparison: SurveyBenchmarkComparison = {
    id: `comp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    surveyId: surveyResult.surveyId,
    surveyName: `Encuesta ${surveyResult.surveyId.slice(-6)}`,
    benchmarkId: benchmark.id,
    benchmarkName: `${benchmark.source.name} (${benchmark.source.year})`,
    comparedAt: new Date().toISOString(),
    comparisons: indicatorComparisons,
    summary: {
      totalIndicators: benchmark.indicators.length,
      matchedIndicators: indicatorComparisons.length,
      aboveBenchmark: above,
      belowBenchmark: below,
      matchBenchmark: match,
      averageGap: Math.round(averageGap * 100) / 100
    }
  };

  comparisons.set(comparison.id, comparison);

  // Guardar comparación en Supabase (async, no bloqueante)
  try {
    // Convertir IndicatorComparison[] a DbIndicatorComparison[]
    const dbComparisons = comparison.comparisons.map(comp => ({
      benchmarkId: comp.benchmarkId,
      indicatorId: comp.indicatorId,
      indicatorName: comp.indicatorName,
      category: comp.category,
      unit: comp.unit,
      syntheticValue: comp.syntheticValue,
      benchmarkValue: comp.benchmarkValue,
      gap: comp.gap,
      syntheticSampleSize: comp.syntheticSampleSize,
      benchmarkSampleSize: comp.benchmarkSampleSize ?? null,
      benchmarkConfidenceInterval: comp.benchmarkConfidenceInterval
        ? { lower: comp.benchmarkConfidenceInterval[0], upper: comp.benchmarkConfidenceInterval[1] }
        : null
    }));

    await saveComparisonToDb(
      surveyResult.surveyId,
      benchmarkId,
      comparison.summary,
      dbComparisons as any
    );
  } catch (error) {
    console.warn('[BenchmarkService] Could not save comparison to Supabase:', error);
  }

  console.log(`✅ Comparison created: ${comparison.id}`, comparison.summary);

  return comparison;
}

/**
 * Obtiene una comparación por ID
 */
export function getComparison(id: string): SurveyBenchmarkComparison | undefined {
  return comparisons.get(id);
}

/**
 * Obtiene todas las comparaciones de una encuesta
 */
export async function getComparisonsForSurvey(surveyId: string): Promise<SurveyBenchmarkComparison[]> {
  // Primero buscar en memoria
  const localComparisons = Array.from(comparisons.values())
    .filter(c => c.surveyId === surveyId)
    .sort((a, b) => new Date(b.comparedAt).getTime() - new Date(a.comparedAt).getTime());

  if (localComparisons.length > 0) {
    return localComparisons;
  }

  // Si no hay en memoria, buscar en Supabase
  try {
    const dbComparisons = await getComparisonsBySurveyId(surveyId);
    return dbComparisons.map((dbComp: any) => ({
      id: dbComp.id,
      surveyId: dbComp.survey_id,
      surveyName: `Encuesta ${dbComp.survey_id.slice(-6)}`,
      benchmarkId: dbComp.benchmark_id,
      benchmarkName: dbComp.benchmark_name || 'Benchmark',
      comparedAt: dbComp.compared_at,
      comparisons: dbComp.comparisons as IndicatorComparison[],
      summary: dbComp.summary as SurveyBenchmarkComparison['summary']
    }));
  } catch (error) {
    console.error(`[BenchmarkService] Error fetching comparisons for survey ${surveyId}:`, error);
    return [];
  }
}

// ===========================================
// Helpers
// ===========================================

export function formatGap(gap: ComparisonGap): string {
  const sign = gap.direction === 'above' ? '+' : gap.direction === 'below' ? '-' : '';
  return `${sign}${Math.abs(gap.relative)}%`;
}

export function getGapColor(gap: ComparisonGap): string {
  if (gap.direction === 'match') return 'var(--success-color, #4caf50)';
  if (gap.significance === 'high') return 'var(--error-color, #f44336)';
  if (gap.significance === 'medium') return 'var(--warning-color, #ff9800)';
  return 'var(--text-secondary, #888)';
}
