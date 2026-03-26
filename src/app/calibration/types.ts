/**
 * Tipos del módulo calibration para CADEM Opinion Engine v1.
 */

/** Distribución simple por categoría */
export interface BenchmarkDistribution {
  label: string;
  value: number;
}

/** Objetivo de calibración */
export interface CalibrationTarget {
  questionId: string;
  topic?: string;
  segment?: string;
  syntheticDistribution: BenchmarkDistribution[];
  benchmarkDistribution: BenchmarkDistribution[];
}

/** Métricas de drift entre mediciones */
export interface DriftMetrics {
  absoluteShift: number;
  relativeShift?: number;
  severity: 'low' | 'medium' | 'high';
}

/** Resultado de validación sintético vs benchmark */
export interface ValidationResult {
  questionId: string;
  segment?: string;
  mae: number;
  rmse?: number;
  similarityScore: number;
  divergenceAreas: string[];
  recommendation?: string;
}

/** Parámetros calibrables del motor */
export interface CalibrationParams {
  demographicWeight: number;
  topicStateWeight: number;
  memoryWeight: number;
  eventWeight: number;
  fatigueWeight: number;
  noResponseWeight: number;
  responseNoiseWeight: number;
}
