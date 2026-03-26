import type { UnifiedSurveyResponse } from './unifiedResponseEngine';

export interface QuestionDistribution {
  questionId: string;
  total: number;
  distribution: Record<string, number>;
  distributionPct: Record<string, number>;
  avgConfidence: number;
}

export interface SurveyAggregatedResult {
  surveyId: string;
  totalResponses: number;
  agentCount: number;
  questionResults: QuestionDistribution[];
}

/**
 * Agrega respuestas individuales en distribuciones por pregunta.
 */
export function aggregateSurveyResponses(
  responses: UnifiedSurveyResponse[],
): SurveyAggregatedResult {
  if (responses.length === 0) {
    return {
      surveyId: '',
      totalResponses: 0,
      agentCount: 0,
      questionResults: [],
    };
  }

  const surveyId = responses[0].surveyId;
  const agentIds = new Set(responses.map((r) => r.agentId));
  const questionIds = [...new Set(responses.map((r) => r.questionId))];

  const questionResults: QuestionDistribution[] = questionIds.map((questionId) => {
    const questionResponses = responses.filter((r) => r.questionId === questionId);
    const total = questionResponses.length;

    const distribution: Record<string, number> = {};
    let totalConfidence = 0;

    for (const response of questionResponses) {
      const key = response.value !== null && response.value !== undefined
        ? String(response.value)
        : 'no_response';

      distribution[key] = (distribution[key] ?? 0) + 1;
      totalConfidence += response.confidence;
    }

    const distributionPct: Record<string, number> = {};
    for (const [key, count] of Object.entries(distribution)) {
      distributionPct[key] = Math.round((count / total) * 1000) / 10;
    }

    return {
      questionId,
      total,
      distribution,
      distributionPct,
      avgConfidence: total > 0 ? Math.round((totalConfidence / total) * 100) / 100 : 0,
    };
  });

  return {
    surveyId,
    totalResponses: responses.length,
    agentCount: agentIds.size,
    questionResults,
  };
}

/**
 * Imprime resultados en consola para debugging.
 */
export function printAggregatedResults(result: SurveyAggregatedResult): void {
  console.log('\n========================================');
  console.log(`RESULTADOS: ${result.surveyId}`);
  console.log(`Agentes: ${result.agentCount} | Respuestas: ${result.totalResponses}`);
  console.log('========================================');

  for (const q of result.questionResults) {
    console.log(`\n[${q.questionId}] (n=${q.total}, conf=${q.avgConfidence})`);
    for (const [option, pct] of Object.entries(q.distributionPct)) {
      const bar = '█'.repeat(Math.round(pct / 5));
      console.log(`  ${option.padEnd(20)} ${bar} ${pct}%`);
    }
  }

  console.log('\n========================================\n');
}
