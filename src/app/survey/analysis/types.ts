/**
 * Survey Analysis Types - MVP
 *
 * Tipos mínimos para el módulo analítico de encuestas.
 * Soporta: single_choice, likert_scale
 * Degrada elegantemente si no hay datos de agentes.
 */

import type { SurveyRun, SurveyResult } from '../../../types/survey';

// ===========================================
// Snapshot mínimo de agente para análisis
// ===========================================

/**
 * Snapshot reducido de agente con solo los campos necesarios para segmentación.
 * Esto refleja lo que realmente se guarda en surveyService.ts
 */
export interface AgentAnalysisSnapshot {
  agent_id: string;
  sex?: string;
  age?: number;
  age_group?: string;
  region_code?: string;
  income_decile?: number;
  education_level?: string;
}

// ===========================================
// Tipos Auxiliares
// ===========================================

/** Nivel de polarización derivado de entropía */
export type PolarizationLevel = 'low' | 'medium' | 'high';

/** Severidad del insight */
export type InsightSeverity = 'info' | 'warning' | 'important';

/** Tipos de insight automático */
export type InsightType = 'dominance' | 'polarization' | 'segment_gap' | 'low_confidence' | 'scenario_impact';

/** Dirección del cambio en comparaciones */
export type ChangeDirection = 'increased' | 'decreased' | 'stable';

/** Magnitud del cambio */
export type ChangeMagnitude = 'negligible' | 'small' | 'moderate' | 'large';

/** Dimensiones de segmentación soportadas (nombres reales del dominio) */
export type SegmentDimension =
  | 'sex'
  | 'age_group'
  | 'region_code'
  | 'income_decile'
  | 'education_level';

/** Tipos de pregunta soportados en el MVP */
export type SupportedQuestionType = 'single_choice' | 'likert_scale';

// ===========================================
// Métricas de Distribución - CONTRATO CONSOLIDADO
// ===========================================

/**
 * Métricas estadísticas de una distribución de respuestas.
 * CONTRATO ÚNICO Y DEFINITIVO para el MVP.
 */
export interface DistributionMetrics {
  /** Respuesta más frecuente (string o número, null si no hay) */
  dominantResponse: string | number | null;

  /** Porcentaje de la respuesta dominante (0-100) */
  dominantPercentage: number;

  /** Ratio de dominancia: % dominante / % segunda opción */
  dominanceRatio: number;

  /** Entropía de Shannon normalizada (0-1) */
  entropy: number;

  /** Índice de concentración: 1 - entropía (0-1) */
  concentration: number;

  /** Polarización numérica (0-1) */
  polarization: number;

  /** Nivel de polarización como string */
  polarizationLevel: PolarizationLevel;

  /** Tasa de no respuesta (0-100) */
  nonResponseRate: number;

  /** Confidence promedio de las respuestas (0-1) */
  averageConfidence: number;

  /** Desviación estándar (solo para likert) */
  standardDeviation?: number;
}

// ===========================================
// Breakdown por Segmento
// ===========================================

/**
 * Análisis de una pregunta en un segmento específico
 */
export interface SegmentBreakdown {
  /** Dimensión de segmentación */
  dimension: SegmentDimension;

  /** Valor del segmento (ej: "male", "18-29") */
  segmentValue: string;

  /** Etiqueta legible (ej: "Hombres", "18-29 años") */
  segmentLabel: string;

  /** Cantidad de respuestas en este segmento */
  sampleSize: number;

  /** Porcentaje del total */
  percentageOfTotal: number;

  /** Métricas de distribución en este segmento */
  metrics: DistributionMetrics;

  /** Distribución de respuestas (opción -> porcentaje) */
  distribution: Record<string, number>;

  /** Diferencia vs total en puntos porcentuales (para respuesta dominante) */
  differenceFromTotal?: number;

  /** Si la diferencia es significativa (> umbral) */
  isSignificantlyDifferent: boolean;
}

/**
 * Análisis por dimensión de segmentación
 */
export interface SegmentAnalysis {
  /** Dimensión analizada */
  dimension: SegmentDimension;

  /** Etiqueta legible de la dimensión */
  dimensionLabel: string;

  /** Breakdown por cada valor del segmento */
  breakdowns: SegmentBreakdown[];

  /** Indica si el análisis fue posible (requiere datos de agentes) */
  available: boolean;

  /** Razón si no está disponible */
  unavailableReason?: string;
}

// ===========================================
// Comparaciones Baseline vs Escenario
// ===========================================

/**
 * Cambio en una métrica específica entre baseline y escenario
 */
export interface MetricChange {
  /** Nombre de la métrica */
  metric: string;

  /** Valor en baseline */
  baselineValue: number;

  /** Valor en escenario */
  scenarioValue: number;

  /** Diferencia absoluta */
  absoluteChange: number;

  /** Cambio porcentual relativo */
  relativeChange: number;

  /** Dirección del cambio */
  direction: ChangeDirection;

  /** Magnitud del cambio */
  magnitude: ChangeMagnitude;

  /** Si el cambio es estadísticamente significativo */
  isSignificant: boolean;
}

/**
 * Cambio en la distribución de respuestas para una opción específica
 */
export interface DistributionChange {
  /** Valor de la opción */
  optionValue: string | number;

  /** Etiqueta legible */
  optionLabel: string;

  /** Porcentaje en baseline */
  baselinePercentage: number;

  /** Porcentaje en escenario */
  scenarioPercentage: number;

  /** Cambio en puntos porcentuales */
  percentagePointChange: number;

  /** Dirección del cambio */
  direction: ChangeDirection;

  /** Magnitud del cambio */
  magnitude: ChangeMagnitude;

  /** Si es la respuesta dominante en alguna de las ejecuciones */
  isDominantInEither: boolean;
}

/**
 * Comparación completa entre dos ejecuciones para una pregunta
 */
export interface QuestionComparison {
  /** ID de la pregunta */
  questionId: string;

  /** Texto de la pregunta */
  questionText: string;

  /** Métricas comparadas */
  metricChanges: MetricChange[];

  /** Cambios en distribución de respuestas */
  distributionChanges: DistributionChange[];

  /** Respuesta dominante en baseline */
  baselineDominant: string | number | null;

  /** Respuesta dominante en escenario */
  scenarioDominant: string | number | null;

  /** Si cambió la respuesta dominante */
  dominantChanged: boolean;

  /** Impacto general del escenario (score 0-1) */
  impactScore: number;

  /** Nivel de impacto */
  impactLevel: 'none' | 'low' | 'medium' | 'high';

  /** Insights específicos de esta comparación */
  insights: KeyInsight[];
}

/**
 * Resumen de comparación entre baseline y escenario
 */
export interface ComparisonSummary {
  /** ID de la ejecución baseline */
  baselineRunId: string;

  /** ID de la ejecución escenario */
  scenarioRunId: string;

  /** Timestamp de la comparación */
  comparedAt: string;

  /** Total de preguntas comparadas */
  totalQuestionsCompared: number;

  /** Preguntas con cambio significativo */
  questionsWithSignificantChange: number;

  /** Preguntas donde cambió la respuesta dominante */
  questionsWithDominantChange: number;

  /** Impacto promedio del escenario */
  averageImpactScore: number;

  /** Nivel de impacto general */
  overallImpactLevel: 'none' | 'low' | 'medium' | 'high';

  /** Preguntas más afectadas (top 5) */
  mostAffectedQuestions: Array<{
    questionId: string;
    questionText: string;
    impactScore: number;
  }>;

  /** Insights globales de la comparación */
  globalInsights: KeyInsight[];
}

// ===========================================
// Insights
// ===========================================

/**
 * Insight automático generado del análisis
 */
export interface KeyInsight {
  /** Tipo de insight */
  type: InsightType;

  /** Severidad */
  severity: InsightSeverity;

  /** Título corto */
  title: string;

  /** Descripción detallada */
  description: string;

  /** ID de pregunta relacionada (si aplica) */
  questionId?: string;

  /** Dimensión de segmento relacionada (si aplica) */
  segmentDimension?: SegmentDimension;

  /** Valor de segmento relacionado (si aplica) */
  segmentValue?: string;

  /** Datos de soporte para el insight */
  supportingData?: {
    metric: string;
    value: number;
    threshold?: number;
  };

  /** Datos específicos de comparación (si aplica) */
  comparisonData?: {
    baselineValue: number;
    scenarioValue: number;
    change: number;
  };
}

// ===========================================
// Análisis por Pregunta
// ===========================================

/**
 * Resultado del análisis de una pregunta individual
 */
export interface QuestionAnalysis {
  /** ID de la pregunta */
  questionId: string;

  /** Texto de la pregunta */
  questionText: string;

  /** Tipo de pregunta original */
  questionType: string;

  /** Si este tipo de pregunta está soportado por el MVP */
  supported: boolean;

  /** Mensaje si no está soportada */
  unsupportedReason?: string;

  /** Total de respuestas */
  totalResponses: number;

  /** Métricas de distribución (solo si supported = true) */
  metrics?: DistributionMetrics;

  /** Distribución completa de respuestas */
  distribution?: Record<string, {
    count: number;
    percentage: number;
    label: string;
  }>;

  /** Estadísticas específicas para likert (solo si aplica) */
  likertStats?: {
    average: number;
    median: number;
    min: number;
    max: number;
  };

  /** Análisis por segmentos (vacío si no hay datos de agentes) */
  segmentBreakdowns: SegmentBreakdown[];

  /** Insights específicos de esta pregunta */
  insights: KeyInsight[];
}

// ===========================================
// Resultado Completo del Análisis
// ===========================================

/**
 * Resultado del análisis de una ejecución de encuesta
 */
export interface SurveyAnalysis {
  /** ID de la encuesta */
  surveyId: string;

  /** ID de la ejecución */
  runId: string;

  /** Timestamp del análisis */
  generatedAt: string;

  /** Resumen ejecutivo */
  summary: {
    /** Total de preguntas analizadas */
    totalQuestions: number;

    /** Preguntas soportadas vs no soportadas */
    supportedQuestions: number;
    unsupportedQuestions: number;

    /** Total de respuestas */
    totalResponses: number;

    /** Nivel de consenso general */
    overallConsensusLevel: 'high' | 'medium' | 'low' | 'mixed';

    /** Confidence promedio global */
    averageConfidence: number;

    /** Si el análisis por segmentos estuvo disponible */
    segmentationAvailable: boolean;
  };

  /** Análisis por pregunta */
  questionAnalyses: QuestionAnalysis[];

  /** Análisis por segmentos (vacío si no hay datos de agentes) */
  segmentAnalyses?: SegmentAnalysis[];

  /** Insights globales de la encuesta */
  globalInsights: KeyInsight[];

  /** Metadata del análisis (opcional para MVP) */
  metadata?: {
    /** Duración del análisis en ms */
    analysisDurationMs: number;

    /** Versión del módulo */
    version: string;
  };

  /** Métricas globales calculadas del análisis */
  globalMetrics: {
    averageConfidence: number;
    averageEntropy: number;
    questionsWithDominance: number;
    questionsWithPolarization: number;
    nonResponseRate: number;
  };

  /** Resumen ejecutivo legible */
  executiveSummary?: {
    keyFindings: string[];
    overallTone: 'consensus' | 'fragmented' | 'neutral';
    confidenceLevel: 'high' | 'medium' | 'low';
  };
}

// ===========================================
// Opciones de Análisis
// ===========================================

/**
 * Opciones para configurar el análisis
 */
export interface AnalysisOptions {
  /** Segmentos a analizar (default: todos los disponibles) */
  segments?: SegmentDimension[];

  /** Umbral para considerar diferencia significativa (puntos porcentuales, default: 10) */
  significanceThreshold?: number;

  /** Umbral para considerar dominancia clara (ratio, default: 2) */
  dominanceThreshold?: number;

  /** Umbral de entropía para polarización alta (default: 0.8) */
  highPolarizationThreshold?: number;

  /** Umbral de entropía para polarización baja (default: 0.3) */
  lowPolarizationThreshold?: number;

  /** Umbral de confidence para alerta (default: 0.6) */
  lowConfidenceThreshold?: number;
}

/**
 * Opciones para configurar la comparación
 */
export interface ComparisonOptions {
  /** Umbral para considerar cambio significativo (puntos porcentuales, default: 5) */
  significanceThreshold?: number;

  /** Umbral para cambio pequeño (default: 2) */
  smallChangeThreshold?: number;

  /** Umbral para cambio moderado (default: 5) */
  moderateChangeThreshold?: number;

  /** Umbral para cambio grande (default: 10) */
  largeChangeThreshold?: number;

  /** Umbral de impacto score para considerar "alto" (default: 0.5) */
  highImpactThreshold?: number;

  /** Incluir preguntas sin cambios en el resultado (default: false) */
  includeUnchanged?: boolean;
}

// ===========================================
// Datos de Entrada
// ===========================================

/**
 * Datos necesarios para el análisis
 */
export interface AnalysisInput {
  /** Ejecución de la encuesta */
  surveyRun: SurveyRun;

  /** Resultados agregados */
  surveyResult: SurveyResult;

  /** Snapshots de agentes con datos demográficos (opcional) */
  agentSnapshots?: Map<string, AgentAnalysisSnapshot>;
}

// ===========================================
// Constantes del MVP
// ===========================================

/** Opciones por defecto */
export const DEFAULT_ANALYSIS_OPTIONS: AnalysisOptions = {
  segments: ['sex', 'age_group', 'region_code', 'income_decile', 'education_level'],
  significanceThreshold: 10,
  dominanceThreshold: 2,
  highPolarizationThreshold: 0.8,
  lowPolarizationThreshold: 0.3,
  lowConfidenceThreshold: 0.6,
};

/** Opciones por defecto para comparaciones */
export const DEFAULT_COMPARISON_OPTIONS: ComparisonOptions = {
  significanceThreshold: 5,
  smallChangeThreshold: 2,
  moderateChangeThreshold: 5,
  largeChangeThreshold: 10,
  highImpactThreshold: 0.5,
  includeUnchanged: false,
};

/** Version del MVP */
export const ANALYSIS_VERSION = '1.0.0-mvp';

/** Tipos de pregunta soportados */
export const SUPPORTED_QUESTION_TYPES: SupportedQuestionType[] = ['single_choice', 'likert_scale'];

/** Mapeo de dimensiones a etiquetas */
export const SEGMENT_DIMENSION_LABELS: Record<SegmentDimension, string> = {
  sex: 'Sexo',
  age_group: 'Grupo Etario',
  region_code: 'Región',
  income_decile: 'Decil de Ingreso',
  education_level: 'Nivel Educacional',
};
