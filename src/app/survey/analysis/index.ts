/**
 * Survey Analysis Module - MVP
 *
 * Módulo de análisis de encuestas para Pulsos Sociales.
 * Proporciona análisis de distribución, métricas e insights.
 */

// ===========================================
// Tipos
// ===========================================
export type {
  DistributionMetrics,
  QuestionAnalysis,
  SurveyAnalysis,
  KeyInsight,
  SegmentBreakdown,
  SegmentAnalysis,
  SegmentDimension,
  AnalysisOptions,
  AnalysisInput,
  AgentAnalysisSnapshot,
  PolarizationLevel,
  InsightSeverity,
  InsightType,
  SupportedQuestionType,
  // Fase 3: Comparaciones
  ComparisonSummary,
  QuestionComparison,
  MetricChange,
  DistributionChange,
  ChangeDirection,
  ChangeMagnitude,
  ComparisonOptions,
} from './types';

// ===========================================
// Funciones de Métricas
// ===========================================
export {
  buildDistributionMetrics,
} from './distributionMetrics';

// ===========================================
// Análisis de Preguntas
// ===========================================
export { analyzeQuestionResult } from './questionAnalysis';

// ===========================================
// Servicio Principal
// ===========================================
export {
  analyzeSurveyResult,
  getMostPolarizedQuestions,
  getMostConsensusQuestions,
  getLowestConfidenceQuestions,
} from './surveyAnalysisService';

// ===========================================
// Servicio de Comparación (Fase 3)
// ===========================================
export { compareSurveys } from './comparisonService';

// ===========================================
// Constantes
// ===========================================
export {
  SUPPORTED_QUESTION_TYPES,
  DEFAULT_ANALYSIS_OPTIONS,
  DEFAULT_COMPARISON_OPTIONS,
  ANALYSIS_VERSION,
  SEGMENT_DIMENSION_LABELS,
} from './types';
