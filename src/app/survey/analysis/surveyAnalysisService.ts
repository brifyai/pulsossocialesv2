/**
 * Survey Analysis Service - MVP
 *
 * Servicio principal de análisis de encuestas.
 * Orquesta el análisis completo de una ejecución de encuesta.
 */

import type { SurveyRun, SurveyResult, AgentResponse } from '../../../types/survey';
import type { SurveyAnalysis, QuestionAnalysis, KeyInsight } from './types';
import { analyzeQuestionResult } from './questionAnalysis';

// ===========================================
// Exportaciones para Tests
// ===========================================

/** Exportar generateGlobalInsights para tests */
export { generateGlobalInsights };

/** Exportar buildExecutiveSummary para tests */
export { buildExecutiveSummary };

/** Tipo exportado para compatibilidad con tests */
export type { SurveyResult, SurveyRun } from '../../../types/survey';

/** Tipo exportado para compatibilidad con tests */
export type AnalyzedSurveyResult = SurveyAnalysis;

// ===========================================
// Función Principal
// ===========================================

/**
 * Analiza un resultado de encuesta completo y genera un análisis enriquecido.
 *
 * @param result - Resultado de encuesta del sistema
 * @param run - Ejecución de encuesta (opcional, para acceder a responses individuales)
 * @returns Análisis completo de la encuesta
 */
export function analyzeSurveyResult(
  result: SurveyResult,
  run?: SurveyRun
): SurveyAnalysis {
  const responsesByQuestion = groupResponsesByQuestion(run?.responses ?? []);

  // Analizar cada pregunta
  const questionAnalyses: QuestionAnalysis[] = result.results.map((questionResult) => {
    const responses = responsesByQuestion.get(questionResult.questionId) ?? [];
    return analyzeQuestionResult(questionResult, responses);
  });

  // Calcular métricas globales
  const globalMetrics = calculateGlobalMetrics(questionAnalyses);

  // Generar insights globales
  const globalInsights = generateGlobalInsights(questionAnalyses);

  // Construir resumen ejecutivo
  const executiveSummary = buildExecutiveSummary(questionAnalyses, globalMetrics, result);

  // Calcular nivel de consenso general
  const supportedCount = questionAnalyses.filter((q) => q.supported).length;
  const consensusLevel = calculateOverallConsensusLevel(questionAnalyses);

  return {
    surveyId: result.surveyId,
    runId: result.runId,
    generatedAt: new Date().toISOString(),
    summary: {
      totalQuestions: result.summary.totalQuestions,
      supportedQuestions: supportedCount,
      unsupportedQuestions: result.summary.totalQuestions - supportedCount,
      totalResponses: result.summary.totalResponses,
      overallConsensusLevel: consensusLevel,
      averageConfidence: globalMetrics.averageConfidence,
      segmentationAvailable: false, // MVP: sin segmentación por ahora
    },
    questionAnalyses,
    globalInsights,
    globalMetrics,
    executiveSummary,
  };
}

// ===========================================
// Helpers de Agrupación
// ===========================================

/**
 * Agrupa respuestas individuales por questionId para acceso eficiente.
 */
function groupResponsesByQuestion(
  responses: AgentResponse[]
): Map<string, AgentResponse[]> {
  const map = new Map<string, AgentResponse[]>();

  for (const response of responses) {
    const existing = map.get(response.questionId) ?? [];
    existing.push(response);
    map.set(response.questionId, existing);
  }

  return map;
}

// ===========================================
// Cálculo de Métricas Globales
// ===========================================

/**
 * Calcula métricas globales a partir de los análisis de preguntas.
 */
function calculateGlobalMetrics(
  questionAnalyses: QuestionAnalysis[]
): SurveyAnalysis['globalMetrics'] {
  const supportedAnalyses = questionAnalyses.filter((q) => q.supported && q.metrics);

  if (supportedAnalyses.length === 0) {
    return {
      averageConfidence: 0,
      averageEntropy: 0,
      questionsWithDominance: 0,
      questionsWithPolarization: 0,
      nonResponseRate: 0,
    };
  }

  const totalConfidence = supportedAnalyses.reduce(
    (sum, q) => sum + (q.metrics?.averageConfidence ?? 0),
    0
  );

  const totalEntropy = supportedAnalyses.reduce(
    (sum, q) => sum + (q.metrics?.entropy ?? 0),
    0
  );

  const questionsWithDominance = supportedAnalyses.filter(
    (q) => (q.metrics?.dominantPercentage ?? 0) > 50
  ).length;

  const questionsWithPolarization = supportedAnalyses.filter(
    (q) => (q.metrics?.polarizationLevel ?? 'medium') === 'high'
  ).length;

  const totalNonResponse = supportedAnalyses.reduce(
    (sum, q) => sum + (q.metrics?.nonResponseRate ?? 0),
    0
  );

  return {
    averageConfidence: totalConfidence / supportedAnalyses.length,
    averageEntropy: totalEntropy / supportedAnalyses.length,
    questionsWithDominance,
    questionsWithPolarization,
    nonResponseRate: totalNonResponse / supportedAnalyses.length,
  };
}

// ===========================================
// Generación de Insights Globales
// ===========================================

/**
 * Genera insights a nivel de encuesta completa.
 */
function generateGlobalInsights(
  questionAnalyses: QuestionAnalysis[]
): KeyInsight[] {
  const insights: KeyInsight[] = [];
  const supportedAnalyses = questionAnalyses.filter((q) => q.supported);

  if (supportedAnalyses.length === 0) {
    insights.push({
      type: 'low_confidence',
      severity: 'warning',
      title: 'Sin preguntas analizables',
      description: 'Ninguna pregunta de esta encuesta está soportada por el módulo analítico MVP.',
    });
    return insights;
  }

  // Insight: Consistencia de confianza
  const confidences = supportedAnalyses.map((q) => q.metrics?.averageConfidence ?? 0);
  const avgConfidence = confidences.reduce((a, b) => a + b, 0) / confidences.length;

  if (avgConfidence < 0.6) {
    insights.push({
      type: 'low_confidence',
      severity: 'warning',
      title: 'Confianza general baja',
      description: `El confidence promedio de la encuesta (${(avgConfidence * 100).toFixed(1)}%) es bajo.`,
      supportingData: {
        metric: 'averageConfidence',
        value: avgConfidence,
        threshold: 0.6,
      },
    });
  }

  // Insight: Preguntas con respuesta predominante clara (>50% en lugar de >60%)
  const dominanceCount = supportedAnalyses.filter(
    (q) => (q.metrics?.dominantPercentage ?? 0) > 50
  ).length;

  if (dominanceCount > 0) {
    insights.push({
      type: 'dominance',
      severity: dominanceCount > supportedAnalyses.length * 0.5 ? 'important' : 'info',
      title: dominanceCount === 1 
        ? 'Una pregunta muestra respuesta predominante'
        : `${dominanceCount} preguntas con respuesta predominante clara`,
      description: `${dominanceCount} de ${supportedAnalyses.length} preguntas tienen una opción elegida por más del 50% de los agentes.`,
    });
  }

  // Insight: Alta dispersión general (>20% en lugar de >30%)
  const polarizationCount = supportedAnalyses.filter(
    (q) => (q.metrics?.polarizationLevel ?? 'medium') === 'high'
  ).length;

  if (polarizationCount > supportedAnalyses.length * 0.2) {
    insights.push({
      type: 'polarization',
      severity: 'warning',
      title: polarizationCount === 1
        ? 'Una pregunta muestra alta dispersión'
        : 'Alta dispersión en respuestas',
      description: `${polarizationCount} preguntas muestran distribución muy dispersa sin opción clara.`,
    });
  }

  // NUEVO: Agregar insights individuales de cada pregunta
  for (const questionAnalysis of supportedAnalyses) {
    if (questionAnalysis.insights && questionAnalysis.insights.length > 0) {
      for (const insight of questionAnalysis.insights) {
        // Adaptar el insight individual para mostrarlo en contexto global
        insights.push({
          ...insight,
          title: `${insight.title}`,
          description: `${insight.description} (Pregunta: "${questionAnalysis.questionText.substring(0, 80)}${questionAnalysis.questionText.length > 80 ? '...' : ''}")`,
        });
      }
    }
  }

  // Insight: Cobertura del análisis
  const unsupportedCount = questionAnalyses.filter((q) => !q.supported).length;
  if (unsupportedCount > 0) {
    insights.push({
      type: 'low_confidence',
      severity: 'info',
      title: 'Cobertura parcial del análisis',
      description: `${unsupportedCount} preguntas no fueron analizadas por limitaciones del MVP.`,
    });
  }

  return insights;
}

// ===========================================
// Construcción de Resumen Ejecutivo
// ===========================================

/**
 * Construye un resumen ejecutivo legible de la encuesta.
 */
function buildExecutiveSummary(
  questionAnalyses: QuestionAnalysis[],
  globalMetrics: SurveyAnalysis['globalMetrics'],
  result: SurveyResult
): SurveyAnalysis['executiveSummary'] {
  const supportedAnalyses = questionAnalyses.filter((q) => q.supported);

  // Encontrar pregunta más polarizada
  const mostPolarized = supportedAnalyses
    .filter((q) => (q.metrics?.polarizationLevel ?? 'medium') === 'high')
    .sort((a, b) => (b.metrics?.entropy ?? 0) - (a.metrics?.entropy ?? 0))[0];

  // Encontrar pregunta con mayor concentración
  const mostConcentrated = supportedAnalyses
    .filter((q) => (q.metrics?.dominantPercentage ?? 0) > 50)
    .sort((a, b) => (b.metrics?.dominantPercentage ?? 0) - (a.metrics?.dominantPercentage ?? 0))[0];

  // Construir puntos clave
  const keyFindings: string[] = [];

  if (supportedAnalyses.length === 0) {
    keyFindings.push('No hay preguntas analizables en esta encuesta.');
  } else {
    keyFindings.push(
      `Se analizaron ${supportedAnalyses.length} de ${result.summary.totalQuestions} preguntas.`
    );

    if (globalMetrics.questionsWithDominance > 0) {
      keyFindings.push(
        `${globalMetrics.questionsWithDominance} preguntas muestran una opción claramente más elegida.`
      );
    }

    if (globalMetrics.questionsWithPolarization > 0) {
      keyFindings.push(
        `${globalMetrics.questionsWithPolarization} preguntas muestran alta dispersión en respuestas.`
      );
    }

    if (mostConcentrated) {
      const text = mostConcentrated.questionText;
      const truncated = text.length > 50 ? text.substring(0, 50) + '...' : text;
      keyFindings.push(
        `Mayor concentración: "${truncated}" ` +
          `con ${mostConcentrated.metrics?.dominantPercentage.toFixed(1)}% en "${mostConcentrated.metrics?.dominantResponse}".`
      );
    }

    if (mostPolarized) {
      const text = mostPolarized.questionText;
      const truncated = text.length > 50 ? text.substring(0, 50) + '...' : text;
      keyFindings.push(
        `Mayor dispersión: "${truncated}" ` +
          `con distribución muy diversa.`
      );
    }
  }

  return {
    keyFindings,
    overallTone:
      globalMetrics.questionsWithPolarization > globalMetrics.questionsWithDominance
        ? 'fragmented'
        : globalMetrics.questionsWithDominance > 0
          ? 'consensus'
          : 'neutral',
    confidenceLevel:
      globalMetrics.averageConfidence > 0.7
        ? 'high'
        : globalMetrics.averageConfidence > 0.5
          ? 'medium'
          : 'low',
  };
}

// ===========================================
// Helpers de Cálculo
// ===========================================

/**
 * Calcula el nivel de consenso general de la encuesta.
 */
function calculateOverallConsensusLevel(
  questionAnalyses: QuestionAnalysis[]
): 'high' | 'medium' | 'low' | 'mixed' {
  const supported = questionAnalyses.filter((q) => q.supported);
  if (supported.length === 0) return 'low';

  const highDominance = supported.filter((q) => (q.metrics?.dominantPercentage ?? 0) > 70).length;
  const highPolarization = supported.filter((q) => (q.metrics?.polarizationLevel ?? 'medium') === 'high').length;

  if (highDominance > supported.length * 0.6) return 'high';
  if (highPolarization > supported.length * 0.4) return 'low';
  if (highDominance > supported.length * 0.3) return 'medium';
  return 'mixed';
}

// ===========================================
// Funciones de Utilidad Pública
// ===========================================

/**
 * Obtiene las preguntas con mayor polarización de un análisis.
 */
export function getMostPolarizedQuestions(
  analysis: SurveyAnalysis,
  limit: number = 3
): QuestionAnalysis[] {
  return analysis.questionAnalyses
    .filter((q) => q.supported && (q.metrics?.polarizationLevel ?? 'medium') === 'high')
    .sort((a, b) => (b.metrics?.entropy ?? 0) - (a.metrics?.entropy ?? 0))
    .slice(0, limit);
}

/**
 * Obtiene las preguntas con mayor consenso de un análisis.
 */
export function getMostConsensusQuestions(
  analysis: SurveyAnalysis,
  limit: number = 3
): QuestionAnalysis[] {
  return analysis.questionAnalyses
    .filter((q) => q.supported && (q.metrics?.dominantPercentage ?? 0) > 50)
    .sort((a, b) => (b.metrics?.dominantPercentage ?? 0) - (a.metrics?.dominantPercentage ?? 0))
    .slice(0, limit);
}

/**
 * Obtiene las preguntas con menor confianza de un análisis.
 */
export function getLowestConfidenceQuestions(
  analysis: SurveyAnalysis,
  limit: number = 3
): QuestionAnalysis[] {
  return analysis.questionAnalyses
    .filter((q) => q.supported)
    .sort((a, b) => (a.metrics?.averageConfidence ?? 1) - (b.metrics?.averageConfidence ?? 1))
    .slice(0, limit);
}
