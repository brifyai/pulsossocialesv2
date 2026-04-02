/**
 * Comparison Service - Baseline vs Scenario
 *
 * Servicio para comparar dos ejecuciones de encuesta:
 * - Baseline (sin escenario)
 * - Escenario (con eventos aplicados)
 *
 * Calcula deltas, impact scores e insights de comparación.
 */

import type {
  SurveyAnalysis,
  QuestionAnalysis,
  QuestionComparison,
  ComparisonSummary,
  MetricChange,
  DistributionChange,
  ChangeDirection,
  ChangeMagnitude,
  KeyInsight,
  ComparisonOptions,
  DistributionMetrics,
} from './types';

import { DEFAULT_COMPARISON_OPTIONS } from './types';

// ===========================================
// Helper: Extracción segura de métricas comparables
// ===========================================

/**
 * Extrae métricas numéricas comparables desde DistributionMetrics.
 * Solo incluye campos numéricos válidos para comparación estadística.
 */
function extractComparableMetrics(metrics: DistributionMetrics): Record<string, number> {
  const comparable: Record<string, number> = {};

  // Métricas numéricas directas
  if (typeof metrics.dominantPercentage === 'number') {
    comparable.dominantPercentage = metrics.dominantPercentage;
  }
  if (typeof metrics.dominanceRatio === 'number') {
    comparable.dominanceRatio = metrics.dominanceRatio;
  }
  if (typeof metrics.entropy === 'number') {
    comparable.entropy = metrics.entropy;
  }
  if (typeof metrics.concentration === 'number') {
    comparable.concentration = metrics.concentration;
  }
  if (typeof metrics.polarization === 'number') {
    comparable.polarization = metrics.polarization;
  }
  if (typeof metrics.nonResponseRate === 'number') {
    comparable.nonResponseRate = metrics.nonResponseRate;
  }
  if (typeof metrics.averageConfidence === 'number') {
    comparable.averageConfidence = metrics.averageConfidence;
  }
  if (typeof metrics.standardDeviation === 'number') {
    comparable.standardDeviation = metrics.standardDeviation;
  }

  return comparable;
}

// ===========================================
// Funciones Públicas
// ===========================================

/**
 * Compara dos análisis de encuesta: baseline vs escenario
 */
export function compareSurveys(
  baselineAnalysis: SurveyAnalysis,
  scenarioAnalysis: SurveyAnalysis,
  options: ComparisonOptions = {}
): ComparisonSummary {
  const opts = { ...DEFAULT_COMPARISON_OPTIONS, ...options };

  // Validar que ambos análisis sean de la misma encuesta
  if (baselineAnalysis.surveyId !== scenarioAnalysis.surveyId) {
    throw new Error(
      `Cannot compare different surveys: ${baselineAnalysis.surveyId} vs ${scenarioAnalysis.surveyId}`
    );
  }

  // Comparar preguntas que existen en ambos análisis
  const comparisons: QuestionComparison[] = [];
  const baselineQuestions = new Map(baselineAnalysis.questionAnalyses.map(q => [q.questionId, q]));

  for (const scenarioQuestion of scenarioAnalysis.questionAnalyses) {
    const baselineQuestion = baselineQuestions.get(scenarioQuestion.questionId);

    if (baselineQuestion && baselineQuestion.supported && scenarioQuestion.supported) {
      const comparison = compareQuestions(baselineQuestion, scenarioQuestion, opts);
      if (opts.includeUnchanged || comparison.impactLevel !== 'none') {
        comparisons.push(comparison);
      }
    }
  }

  // Ordenar por impact score descendente
  comparisons.sort((a, b) => b.impactScore - a.impactScore);

  // Calcular métricas globales
  const questionsWithSignificantChange = comparisons.filter(
    c => c.impactLevel !== 'none'
  ).length;

  const questionsWithDominantChange = comparisons.filter(
    c => c.dominantChanged
  ).length;

  const averageImpactScore =
    comparisons.length > 0
      ? comparisons.reduce((sum, c) => sum + c.impactScore, 0) / comparisons.length
      : 0;

  // Generar insights globales
  const globalInsights = generateGlobalInsights(comparisons, opts);

  return {
    baselineRunId: baselineAnalysis.runId,
    scenarioRunId: scenarioAnalysis.runId,
    comparedAt: new Date().toISOString(),
    totalQuestionsCompared: comparisons.length,
    questionsWithSignificantChange,
    questionsWithDominantChange,
    averageImpactScore,
    overallImpactLevel: calculateImpactLevel(averageImpactScore, opts.highImpactThreshold ?? 0.5),
    mostAffectedQuestions: comparisons.slice(0, 5).map(c => ({
      questionId: c.questionId,
      questionText: c.questionText,
      impactScore: c.impactScore,
    })),
    globalInsights,
  };
}

// ===========================================
// Funciones Internas
// ===========================================

/**
 * Compara dos preguntas individuales
 */
function compareQuestions(
  baseline: QuestionAnalysis,
  scenario: QuestionAnalysis,
  options: ComparisonOptions
): QuestionComparison {
  const opts = { ...DEFAULT_COMPARISON_OPTIONS, ...options };

  // Comparar métricas (solo si ambas existen)
  const metricChanges =
    baseline.metrics && scenario.metrics
      ? compareMetrics(
          extractComparableMetrics(baseline.metrics),
          extractComparableMetrics(scenario.metrics),
          opts
        )
      : [];

  // Comparar distribuciones
  const distributionChanges = compareDistributions(
    baseline.distribution!,
    scenario.distribution!,
    opts
  );

  // Calcular impact score
  const impactScore = calculateQuestionImpact(metricChanges, distributionChanges);

  // Generar insights específicos
  const insights = generateQuestionInsights(
    baseline,
    scenario,
    metricChanges,
    distributionChanges,
    opts
  );

  return {
    questionId: baseline.questionId,
    questionText: baseline.questionText,
    metricChanges,
    distributionChanges,
    baselineDominant: baseline.metrics?.dominantResponse ?? null,
    scenarioDominant: scenario.metrics?.dominantResponse ?? null,
    dominantChanged: baseline.metrics?.dominantResponse !== scenario.metrics?.dominantResponse,
    impactScore,
    impactLevel: calculateImpactLevel(impactScore, opts.highImpactThreshold ?? 0.5),
    insights,
  };
}

/**
 * Compara métricas entre dos ejecuciones
 */
function compareMetrics(
  baseline: Record<string, number>,
  scenario: Record<string, number>,
  options: ComparisonOptions
): MetricChange[] {
  const changes: MetricChange[] = [];
  const numericKeys = Object.keys(baseline).filter(
    key => typeof baseline[key] === 'number' && typeof scenario[key] === 'number'
  ) as string[];

  for (const metric of numericKeys) {
    const baselineValue = baseline[metric]!;
    const scenarioValue = scenario[metric]!;

    if (baselineValue === undefined || scenarioValue === undefined) continue;

    const absoluteChange = scenarioValue - baselineValue;
    const relativeChange = baselineValue !== 0 ? absoluteChange / baselineValue : 0;

    const direction = getChangeDirection(absoluteChange);
    const magnitude = getChangeMagnitude(
      Math.abs(absoluteChange),
      options.smallChangeThreshold ?? 2,
      options.moderateChangeThreshold ?? 5,
      options.largeChangeThreshold ?? 10
    );

    const isSignificant =
      Math.abs(absoluteChange) >= (options.significanceThreshold ?? 5);

    changes.push({
      metric,
      baselineValue,
      scenarioValue,
      absoluteChange,
      relativeChange,
      direction,
      magnitude,
      isSignificant,
    });
  }

  return changes;
}

/**
 * Compara distribuciones de respuestas
 */
function compareDistributions(
  baseline: Record<string, { count: number; percentage: number; label: string }>,
  scenario: Record<string, { count: number; percentage: number; label: string }>,
  options: ComparisonOptions
): DistributionChange[] {
  const changes: DistributionChange[] = [];

  // Obtener todas las opciones únicas
  const allOptions = new Set([...Object.keys(baseline), ...Object.keys(scenario)]);

  for (const optionValue of allOptions) {
    const baselineData = baseline[optionValue];
    const scenarioData = scenario[optionValue];

    const baselinePercentage = baselineData?.percentage ?? 0;
    const scenarioPercentage = scenarioData?.percentage ?? 0;
    const percentagePointChange = scenarioPercentage - baselinePercentage;

    const direction = getChangeDirection(percentagePointChange);
    const magnitude = getChangeMagnitude(
      Math.abs(percentagePointChange),
      options.smallChangeThreshold ?? 2,
      options.moderateChangeThreshold ?? 5,
      options.largeChangeThreshold ?? 10
    );

    const isDominantInEither =
      (baselineData && baselineData.percentage > 50) ||
      (scenarioData && scenarioData.percentage > 50);

    changes.push({
      optionValue,
      optionLabel: baselineData?.label ?? scenarioData?.label ?? optionValue,
      baselinePercentage,
      scenarioPercentage,
      percentagePointChange,
      direction,
      magnitude,
      isDominantInEither,
    });
  }

  // Ordenar por magnitud de cambio
  return changes.sort((a, b) =>
    Math.abs(b.percentagePointChange) - Math.abs(a.percentagePointChange)
  );
}

/**
 * Calcula el impact score de una pregunta (0-1)
 */
function calculateQuestionImpact(
  metricChanges: MetricChange[],
  distributionChanges: DistributionChange[]
): number {
  // Peso de cambios en métricas (30%)
  const significantMetricChanges = metricChanges.filter(m => m.isSignificant).length;
  const metricScore =
    metricChanges.length > 0 ? significantMetricChanges / metricChanges.length : 0;

  // Peso de cambios en distribución (50%)
  const maxDistributionChange = distributionChanges.length > 0
    ? Math.max(...distributionChanges.map(d => Math.abs(d.percentagePointChange)))
    : 0;
  const distributionScore = Math.min(maxDistributionChange / 20, 1); // Normalizar a 20 puntos porcentuales

  // Peso de cambio en respuesta dominante (20%)
  const dominantChangeScore = distributionChanges.some(
    d => d.isDominantInEither && Math.abs(d.percentagePointChange) > 5
  )
    ? 1
    : 0;

  return metricScore * 0.3 + distributionScore * 0.5 + dominantChangeScore * 0.2;
}

/**
 * Determina el nivel de impacto
 */
function calculateImpactLevel(
  score: number,
  highThreshold: number
): 'none' | 'low' | 'medium' | 'high' {
  if (score === 0) return 'none';
  if (score < 0.2) return 'low';
  if (score < highThreshold) return 'medium';
  return 'high';
}

/**
 * Determina la dirección del cambio
 */
function getChangeDirection(change: number): ChangeDirection {
  if (Math.abs(change) < 0.001) return 'stable';
  return change > 0 ? 'increased' : 'decreased';
}

/**
 * Determina la magnitud del cambio
 */
function getChangeMagnitude(
  absoluteChange: number,
  smallThreshold: number,
  moderateThreshold: number,
  largeThreshold: number
): ChangeMagnitude {
  if (absoluteChange < smallThreshold) return 'negligible';
  if (absoluteChange < moderateThreshold) return 'small';
  if (absoluteChange < largeThreshold) return 'moderate';
  return 'large';
}

/**
 * Genera insights para una pregunta específica
 */
function generateQuestionInsights(
  baseline: QuestionAnalysis,
  scenario: QuestionAnalysis,
  metricChanges: MetricChange[],
  distributionChanges: DistributionChange[],
  _options: ComparisonOptions
): KeyInsight[] {
  const insights: KeyInsight[] = [];

  // Insight: Cambio en respuesta dominante
  if (baseline.metrics?.dominantResponse !== scenario.metrics?.dominantResponse) {
    insights.push({
      type: 'scenario_impact',
      severity: 'important',
      title: 'Cambio en respuesta dominante',
      description: `La respuesta más frecuente cambió de "${baseline.metrics?.dominantResponse}" a "${scenario.metrics?.dominantResponse}"`,
      questionId: baseline.questionId,
      comparisonData: {
        baselineValue: baseline.metrics?.dominantPercentage ?? 0,
        scenarioValue: scenario.metrics?.dominantPercentage ?? 0,
        change: (scenario.metrics?.dominantPercentage ?? 0) - (baseline.metrics?.dominantPercentage ?? 0),
      },
    });
  }

  // Insight: Mayor cambio en opción específica
  const maxChange = distributionChanges[0];
  if (maxChange && maxChange.magnitude !== 'negligible') {
    const direction = maxChange.direction === 'increased' ? 'aumentó' : 'disminuyó';
    insights.push({
      type: 'scenario_impact',
      severity: maxChange.magnitude === 'large' ? 'important' : 'warning',
      title: `Cambio significativo: ${maxChange.optionLabel}`,
      description: `La opción "${maxChange.optionLabel}" ${direction} ${Math.abs(maxChange.percentagePointChange).toFixed(1)} puntos porcentuales`,
      questionId: baseline.questionId,
      comparisonData: {
        baselineValue: maxChange.baselinePercentage,
        scenarioValue: maxChange.scenarioPercentage,
        change: maxChange.percentagePointChange,
      },
    });
  }

  // Insight: Cambio en polarización
  const polarizationChange = metricChanges.find(m => m.metric === 'polarization');
  if (polarizationChange && polarizationChange.magnitude !== 'negligible') {
    const direction = polarizationChange.direction === 'increased' ? 'aumentó' : 'disminuyó';
    insights.push({
      type: 'scenario_impact',
      severity: 'info',
      title: `Polarización ${direction}`,
      description: `El nivel de polarización ${direction} de ${(polarizationChange.baselineValue * 100).toFixed(1)}% a ${(polarizationChange.scenarioValue * 100).toFixed(1)}%`,
      questionId: baseline.questionId,
      comparisonData: {
        baselineValue: polarizationChange.baselineValue,
        scenarioValue: polarizationChange.scenarioValue,
        change: polarizationChange.absoluteChange,
      },
    });
  }

  return insights;
}

/**
 * Genera insights globales de la comparación
 */
function generateGlobalInsights(
  comparisons: QuestionComparison[],
  _options: ComparisonOptions
): KeyInsight[] {
  const insights: KeyInsight[] = [];

  // Insight: Preguntas más afectadas
  const highImpactQuestions = comparisons.filter(c => c.impactLevel === 'high');
  if (highImpactQuestions.length > 0) {
    insights.push({
      type: 'scenario_impact',
      severity: 'important',
      title: 'Impacto significativo detectado',
      description: `${highImpactQuestions.length} preguntas muestran cambios significativos por el escenario`,
    });
  }

  // Insight: Cambios en respuestas dominantes
  const dominantChanges = comparisons.filter(c => c.dominantChanged);
  if (dominantChanges.length > 0) {
    insights.push({
      type: 'scenario_impact',
      severity: 'important',
      title: 'Cambios en preferencias',
      description: `En ${dominantChanges.length} preguntas, la respuesta más popular cambió con el escenario`,
    });
  }

  // Insight: Impacto general
  const averageImpact =
    comparisons.length > 0
      ? comparisons.reduce((sum, c) => sum + c.impactScore, 0) / comparisons.length
      : 0;

  if (averageImpact < 0.1) {
    insights.push({
      type: 'scenario_impact',
      severity: 'info',
      title: 'Impacto mínimo',
      description: 'El escenario tiene un efecto mínimo en las respuestas de la encuesta',
    });
  } else if (averageImpact > 0.5) {
    insights.push({
      type: 'scenario_impact',
      severity: 'warning',
      title: 'Impacto considerable',
      description: 'El escenario está generando cambios significativos en las respuestas',
    });
  }

  return insights;
}
