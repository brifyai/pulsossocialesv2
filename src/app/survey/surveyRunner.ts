import { runCademSurvey } from './cademAdapter';
import type { CademAdapterAgent, CademSurveyDefinition } from './cademAdapter';
import type { UnifiedSurveyResponse, EngineMode } from './unifiedResponseEngine';

export interface SurveyRunnerInput {
  surveyDefinition: CademSurveyDefinition;
  agents: CademAdapterAgent[];
  engineMode: EngineMode;
  weekKey?: string;
  debug?: boolean;
}

export interface SurveyRunnerResult {
  responses: UnifiedSurveyResponse[];
  engineMode: EngineMode;
  agentCount: number;
  questionCount: number;
  totalResponses: number;
  durationMs: number;
}

/**
 * Runner principal de encuestas.
 * Decide qué motor usar según engineMode.
 * En V1 solo soporta 'cadem'.
 * El modo 'legacy' se puede enchufar más adelante.
 */
export function runSurvey(input: SurveyRunnerInput): SurveyRunnerResult {
  const startTime = Date.now();

  const {
    surveyDefinition,
    agents,
    engineMode,
    weekKey,
    debug = false,
  } = input;

  let responses: UnifiedSurveyResponse[] = [];

  if (engineMode === 'cadem') {
    const rawResponses = runCademSurvey({
      surveyDefinition,
      agents,
      weekKey,
      mode: 'cawi',
    });

    responses = rawResponses.map((r) => ({
      surveyId: r.surveyId,
      questionId: r.questionId,
      agentId: r.agentId,
      value: r.value !== null && r.value !== undefined ? String(r.value) : null,
      confidence: r.confidence,
      reasoning: r.reasoning,
      engineMode: 'cadem',
      factors: r.factors,
      processingTime: r.processingTime,
      createdAt: r.createdAt,
    }));
  }

  if (engineMode === 'legacy') {
    // Placeholder para conectar con syntheticResponseEngine existente
    console.warn('[SurveyRunner] Legacy mode no implementado todavía. Usar engineMode: cadem');
  }

  if (debug) {
    console.log(`[SurveyRunner] engineMode=${engineMode}`);
    console.log(`[SurveyRunner] agents=${agents.length}`);
    console.log(`[SurveyRunner] questions=${surveyDefinition.questions.length}`);
    console.log(`[SurveyRunner] responses=${responses.length}`);
  }

  return {
    responses,
    engineMode,
    agentCount: agents.length,
    questionCount: surveyDefinition.questions.length,
    totalResponses: responses.length,
    durationMs: Date.now() - startTime,
  };
}
