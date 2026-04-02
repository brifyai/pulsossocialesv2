/**
 * Question Analysis - MVP
 *
 * Analiza una pregunta individual a partir de un QuestionResult.
 * Soporta: single_choice, likert_scale
 * Degrada elegantemente para: multiple_choice, text
 */

import type {
  QuestionResult,
  AgentResponse,
  SingleChoiceResult,
  LikertResult,
} from '../../../types/survey';
import type { QuestionAnalysis as QuestionAnalysisType, KeyInsight } from './types';
import { SUPPORTED_QUESTION_TYPES } from './types';
import { buildDistributionMetrics } from './distributionMetrics';

// ===========================================
// Exportaciones para Tests
// ===========================================

/** Alias para analyzeQuestionResult - usado en tests */
export const analyzeQuestion = analyzeQuestionResult;

/** Tipo exportado para compatibilidad con tests */
export type { QuestionResult } from '../../../types/survey';

/** Tipo exportado para compatibilidad con tests */
export type AnalyzedQuestion = QuestionAnalysisType;

// ===========================================
// Función Principal
// ===========================================

/**
 * Analiza un QuestionResult y genera un análisis completo.
 *
 * @param result - Resultado de pregunta del sistema
 * @param responses - Respuestas individuales de agentes (opcional, para confidence)
 * @returns Análisis completo de la pregunta
 */
export function analyzeQuestionResult(
  result: QuestionResult,
  responses?: AgentResponse[]
): QuestionAnalysisType {
  const questionType = result.questionType;

  // Verificar si el tipo está soportado
  if (!isSupportedType(questionType)) {
    return buildUnsupportedQuestionAnalysis(result);
  }

  // Analizar según tipo
  switch (questionType) {
    case 'single_choice':
      return analyzeSingleChoiceResult(result as SingleChoiceResult, responses);
    case 'likert_scale':
      return analyzeLikertResult(result as LikertResult, responses);
    default:
      // Fallback por seguridad (no debería llegar aquí)
      return buildUnsupportedQuestionAnalysis(result);
  }
}

// ===========================================
// Análisis por Tipo
// ===========================================

/**
 * Analiza una pregunta de tipo single_choice.
 */
function analyzeSingleChoiceResult(
  result: SingleChoiceResult,
  responses?: AgentResponse[]
): QuestionAnalysisType {
  // Extraer distribución simple (solo counts) y labels desde el resultado
  const { distribution: distributionCounts, labels } = extractSingleChoiceData(result);
  const totalCount = result.totalResponses;

  // Construir métricas
  const metrics = buildDistributionMetrics(
    distributionCounts,
    totalCount,
    responses ?? [],
    labels,
    false // no es likert
  );

  // Construir distribución detallada
  const detailedDistribution = buildDetailedDistribution(
    distributionCounts,
    labels,
    totalCount
  );

  // Generar insights básicos
  const insights = generateBasicInsights(result.questionId, metrics, 'single_choice');

  return {
    questionId: result.questionId,
    questionText: result.questionText,
    questionType: result.questionType,
    supported: true,
    totalResponses: totalCount,
    metrics,
    distribution: detailedDistribution,
    segmentBreakdowns: [], // Se llena en segmentAnalysis.ts
    insights,
  };
}

/**
 * Analiza una pregunta de tipo likert_scale.
 */
function analyzeLikertResult(
  result: LikertResult,
  responses?: AgentResponse[]
): QuestionAnalysisType {
  // Extraer distribución simple (solo counts) y labels desde el resultado
  const { distribution: distributionCounts, labels } = extractLikertData(result);
  const totalCount = result.totalResponses;

  // Construir métricas
  const metrics = buildDistributionMetrics(
    distributionCounts,
    totalCount,
    responses ?? [],
    labels,
    true // es likert
  );

  // Construir distribución detallada
  const detailedDistribution = buildDetailedDistribution(
    distributionCounts,
    labels,
    totalCount
  );

  // Usar stats que ya vienen del resultado + calcular min/max
  const likertStats = {
    average: result.average,
    median: result.median,
    min: calculateLikertMin(result),
    max: calculateLikertMax(result),
  };

  // Generar insights básicos
  const insights = generateBasicInsights(result.questionId, metrics, 'likert_scale', likertStats);

  return {
    questionId: result.questionId,
    questionText: result.questionText,
    questionType: result.questionType,
    supported: true,
    totalResponses: totalCount,
    metrics,
    distribution: detailedDistribution,
    likertStats,
    segmentBreakdowns: [], // Se llena en segmentAnalysis.ts
    insights,
  };
}

// ===========================================
// Helpers de Extracción de Datos
// ===========================================

/**
 * Extrae distribución simple (counts) y labels desde SingleChoiceResult.
 *
 * Transforma:
 *   { approve: { count: 42, percentage: 52.5, label: 'Aprueba' } }
 * A:
 *   distribution: { approve: 42 }
 *   labels: { approve: 'Aprueba' }
 */
function extractSingleChoiceData(result: SingleChoiceResult): {
  distribution: Record<string, number>;
  labels: Record<string, string>;
} {
  const distribution: Record<string, number> = {};
  const labels: Record<string, string> = {};

  for (const [key, value] of Object.entries(result.distribution)) {
    distribution[key] = value.count;
    labels[key] = value.label ?? key;
  }

  return { distribution, labels };
}

/**
 * Extrae distribución simple (counts) y labels desde LikertResult.
 *
 * Transforma:
 *   { 1: { count: 5, percentage: 10 }, 2: { count: 10, percentage: 20 } }
 * A:
 *   distribution: { "1": 5, "2": 10 }
 *   labels: { "1": "Escala 1", "2": "Escala 2" }
 */
function extractLikertData(result: LikertResult): {
  distribution: Record<string, number>;
  labels: Record<string, string>;
} {
  const distribution: Record<string, number> = {};
  const labels: Record<string, string> = {};

  for (const [key, value] of Object.entries(result.distribution)) {
    const stringKey = String(key);
    distribution[stringKey] = value.count;
    // Generar label por defecto, o usar minLabel/maxLabel para extremos si aplica
    labels[stringKey] = generateLikertLabel(Number(key), result);
  }

  return { distribution, labels };
}

/**
 * Genera label para un valor Likert.
 * Usa minLabel/maxLabel para los extremos si están disponibles.
 */
function generateLikertLabel(value: number, result: LikertResult): string {
  const entries = Object.keys(result.distribution)
    .map((k) => Number(k))
    .sort((a, b) => a - b);

  const min = entries[0];
  const max = entries[entries.length - 1];

  if (value === min && result.minLabel) {
    return result.minLabel;
  }
  if (value === max && result.maxLabel) {
    return result.maxLabel;
  }

  return `Escala ${value}`;
}

/**
 * Calcula el valor mínimo de la escala Likert.
 */
function calculateLikertMin(result: LikertResult): number {
  const keys = Object.keys(result.distribution).map((k) => Number(k));
  return keys.length > 0 ? Math.min(...keys) : 1;
}

/**
 * Calcula el valor máximo de la escala Likert.
 */
function calculateLikertMax(result: LikertResult): number {
  const keys = Object.keys(result.distribution).map((k) => Number(k));
  return keys.length > 0 ? Math.max(...keys) : 5;
}

// ===========================================
// Helpers de Construcción
// ===========================================

/**
 * Construye análisis para preguntas no soportadas.
 */
function buildUnsupportedQuestionAnalysis(result: QuestionResult): QuestionAnalysisType {
  return {
    questionId: result.questionId,
    questionText: result.questionText,
    questionType: result.questionType,
    supported: false,
    unsupportedReason:
      `El tipo de pregunta "${result.questionType}" aún no está soportado por el módulo analítico MVP. ` +
      'Solo se soportan: single_choice, likert_scale.',
    totalResponses: result.totalResponses,
    segmentBreakdowns: [],
    insights: [],
  };
}

/**
 * Construye la distribución detallada con counts y percentages.
 */
function buildDetailedDistribution(
  distribution: Record<string, number>,
  labels: Record<string, string>,
  totalCount: number
): Record<string, { count: number; percentage: number; label: string }> {
  const detailed: Record<string, { count: number; percentage: number; label: string }> = {};

  for (const [value, count] of Object.entries(distribution)) {
    detailed[value] = {
      count,
      percentage: totalCount > 0 ? (count / totalCount) * 100 : 0,
      label: labels[value] ?? value,
    };
  }

  return detailed;
}

// ===========================================
// Generación de Insights
// ===========================================

/**
 * Genera insights básicos para una pregunta.
 */
function generateBasicInsights(
  questionId: string,
  metrics: import('./types').DistributionMetrics,
  questionType: string,
  likertStats?: { average: number; median: number; min: number; max: number }
): KeyInsight[] {
  const insights: KeyInsight[] = [];

  // Insight de dominancia
  if (metrics.dominantPercentage > 50) {
    insights.push({
      type: 'dominance',
      severity: metrics.dominantPercentage > 70 ? 'important' : 'info',
      title: 'Respuesta dominante clara',
      description: `La opción "${metrics.dominantResponse}" concentra el ${metrics.dominantPercentage.toFixed(1)}% de las respuestas.`,
      questionId,
      supportingData: {
        metric: 'dominantPercentage',
        value: metrics.dominantPercentage,
        threshold: 50,
      },
    });
  }

  // Insight de polarización/fragmentación
  const polarizationLevel = metrics.polarizationLevel ?? 'medium';
  if (polarizationLevel === 'high') {
    insights.push({
      type: 'polarization',
      severity: 'warning',
      title: 'Opinión fragmentada',
      description: 'La distribución de respuestas está muy dispersa, sin consenso claro.',
      questionId,
      supportingData: {
        metric: 'entropy',
        value: metrics.entropy,
        threshold: 0.8,
      },
    });
  }

  // Insight de baja confianza
  if (metrics.averageConfidence < 0.6) {
    insights.push({
      type: 'low_confidence',
      severity: 'warning',
      title: 'Baja confianza en respuestas',
      description: `El confidence promedio (${(metrics.averageConfidence * 100).toFixed(1)}%) es bajo.`,
      questionId,
      supportingData: {
        metric: 'averageConfidence',
        value: metrics.averageConfidence,
        threshold: 0.6,
      },
    });
  }

  // Insight específico para Likert
  if (questionType === 'likert_scale' && likertStats) {
    const midPoint = (likertStats.min + likertStats.max) / 2;
    const deviation = Math.abs(likertStats.average - midPoint);
    const maxDeviation = (likertStats.max - likertStats.min) / 2;

    if (deviation > maxDeviation * 0.3) {
      const direction = likertStats.average > midPoint ? 'alta' : 'baja';
      const directionTitle = likertStats.average > midPoint ? 'altos' : 'bajos';
      insights.push({
        type: 'dominance',
        severity: 'info',
        title: `Tendencia hacia valores ${directionTitle}`,
        description: `El promedio (${likertStats.average.toFixed(2)}) se inclina hacia la parte ${direction} de la escala.`,
        questionId,
        supportingData: {
          metric: 'likertAverage',
          value: likertStats.average,
        },
      });
    }
  }

  return insights;
}

// ===========================================
// Helpers de Validación
// ===========================================

/**
 * Verifica si un tipo de pregunta está soportado.
 */
function isSupportedType(type: string): boolean {
  return SUPPORTED_QUESTION_TYPES.includes(type as 'single_choice' | 'likert_scale');
}
