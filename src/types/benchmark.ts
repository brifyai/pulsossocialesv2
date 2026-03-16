/**
 * Benchmark Types - Sprint 7A
 * 
 * Modelo de datos para benchmarks de referencia y comparación
 * con resultados sintéticos.
 */

// Types are used in service layer

// ===========================================
// Benchmark Definition
// ===========================================

export interface BenchmarkSource {
  id: string;
  name: string;
  organization: string;
  year: number;
  url?: string;
  description?: string;
}

export interface BenchmarkValue {
  value: number;
  percentage?: number;
  sampleSize?: number;
  confidenceInterval?: [number, number]; // [min, max]
  marginOfError?: number;
}

export interface BenchmarkIndicator {
  id: string;
  name: string;
  description: string;
  category: string;
  unit: 'percentage' | 'average' | 'index' | 'count';
  value: BenchmarkValue;
  // Metadata para mapeo con encuestas sintéticas
  compatibleQuestionTypes: ('single_choice' | 'likert_scale' | 'multiple_choice' | 'text')[];
  compatibleSegments: string[]; // region codes, 'national', etc.
}

export interface Benchmark {
  id: string;
  source: BenchmarkSource;
  indicators: BenchmarkIndicator[];
  coverage: {
    geographic: string[]; // region codes or 'national'
    demographic?: string[];
    temporal: {
      start: string; // ISO date
      end: string;
    };
  };
  createdAt: string;
}

// ===========================================
// Comparison Result
// ===========================================

export interface ComparisonGap {
  absolute: number; // diferencia absoluta
  relative: number; // diferencia relativa (porcentaje)
  direction: 'above' | 'below' | 'match'; // sintético vs benchmark
  significance: 'high' | 'medium' | 'low'; // qué tan significativa es la diferencia
}

export interface IndicatorComparison {
  benchmarkId: string;
  indicatorId: string;
  indicatorName: string;
  category: string;
  unit: string;
  
  // Valores
  syntheticValue: number;
  benchmarkValue: number;
  
  // Gap
  gap: ComparisonGap;
  
  // Metadata
  syntheticSampleSize: number;
  benchmarkSampleSize?: number;
  syntheticConfidence?: number;
  benchmarkConfidenceInterval?: [number, number];
}

export interface SurveyBenchmarkComparison {
  id: string;
  surveyId: string;
  surveyName: string;
  benchmarkId: string;
  benchmarkName: string;
  comparedAt: string;
  
  // Resultados
  comparisons: IndicatorComparison[];
  
  // Resumen
  summary: {
    totalIndicators: number;
    matchedIndicators: number;
    aboveBenchmark: number;
    belowBenchmark: number;
    matchBenchmark: number;
    averageGap: number; // gap promedio absoluto
  };
}

// ===========================================
// UI State
// ===========================================

export type BenchmarkViewMode = 'list' | 'compare' | 'detail';

export interface BenchmarkState {
  benchmarks: Benchmark[];
  selectedBenchmark: Benchmark | null;
  selectedSurvey: string | null; // surveyId
  selectedIndicator: string | null;
  currentComparison: SurveyBenchmarkComparison | null;
  viewMode: BenchmarkViewMode;
  isLoading: boolean;
  error: string | null;
}
