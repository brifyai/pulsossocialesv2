import { runCademSurvey } from './cademAdapter';
import { runCademSurveyBatchAsync } from './cademAdapterAsync';
import type { CademAdapterAgent, CademSurveyDefinition } from './cademAdapter';
import type { UnifiedSurveyResponse, EngineMode, AgentPersistenceMeta } from './unifiedResponseEngine';

export interface SurveyRunnerInput {
  surveyDefinition: CademSurveyDefinition;
  agents: CademAdapterAgent[];
  engineMode: EngineMode;
  persistState?: boolean;
  weekKey?: string;
  debug?: boolean;
}

export interface SurveyRunnerResult {
  responses: UnifiedSurveyResponse[];
  engineMode: EngineMode;
  engineVersion: string;
  agentCount: number;
  questionCount: number;
  totalResponses: number;
  durationMs: number;
  persistenceMeta?: AgentPersistenceMeta[];
}

/**
 * Runner principal de encuestas - Entrypoint oficial.
 *
 * Modos soportados:
 * - engineMode='legacy': Motor heurístico original (placeholder)
 * - engineMode='cadem' + persistState=false: CADEM sync/in-memory
 * - engineMode='cadem' + persistState=true: CADEM async con persistencia en Supabase
 *
 * @param input - Configuración de la encuesta
 * @returns Resultado de la encuesta con metadata de persistencia
 */
export async function runSurvey(input: SurveyRunnerInput): Promise<SurveyRunnerResult> {
  const startTime = Date.now();

  const {
    surveyDefinition,
    agents,
    engineMode,
    persistState = false,
    weekKey,
    debug = false,
  } = input;

  let responses: UnifiedSurveyResponse[] = [];
  let persistenceMeta: AgentPersistenceMeta[] | undefined;

  // Modo legacy: motor heurístico original
  if (engineMode === 'legacy') {
    console.warn('[SurveyRunner] Legacy mode no implementado todavía. Usar engineMode: cadem');
    return {
      responses: [],
      engineMode: 'legacy',
      engineVersion: 'legacy-v1',
      agentCount: agents.length,
      questionCount: surveyDefinition.questions.length,
      totalResponses: 0,
      durationMs: Date.now() - startTime,
    };
  }

  // Modo cadem con persistencia (async)
  if (engineMode === 'cadem' && persistState) {
    const results = await runCademSurveyBatchAsync(
      agents.map(a => ({ ...a, agentId: a.agentId })),
      surveyDefinition.questions,
      {
        surveyId: surveyDefinition.id,
        surveyTopic: surveyDefinition.topic,
        weekKey,
        mode: 'cawi',
      }
    );

    // Flatten responses from all agents
    for (const result of results) {
      for (const r of result.responses) {
        responses.push({
          surveyId: surveyDefinition.id,
          questionId: r.questionId,
          agentId: result.agentId,
          value: r.response.value !== null && r.response.value !== undefined ? String(r.response.value) : null,
          confidence: r.response.confidence,
          reasoning: r.response.reasoning,
          engineMode: 'cadem',
          engineVersion: result.engineVersion,
          factors: r.response.factors,
          processingTime: r.response.processingTime,
          createdAt: new Date(),
          persistenceMeta: result.persistenceMeta,
        });
      }
    }

    // Collect persistence metadata
    persistenceMeta = results.map(r => r.persistenceMeta);

    if (debug) {
      const savedCount = persistenceMeta.filter(m => m.saveStatus === 'saved').length;
      const failedCount = persistenceMeta.filter(m => m.saveStatus === 'failed').length;
      console.log(`[SurveyRunner] Persistencia: ${savedCount} guardados, ${failedCount} fallidos`);
    }
  }

  // Modo cadem sin persistencia (sync/in-memory)
  if (engineMode === 'cadem' && !persistState) {
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
      engineVersion: r.engineVersion,
      factors: r.factors,
      processingTime: r.processingTime,
      createdAt: r.createdAt,
    }));
  }

  if (debug) {
    console.log(`[SurveyRunner] engineMode=${engineMode}`);
    console.log(`[SurveyRunner] persistState=${persistState}`);
    console.log(`[SurveyRunner] agents=${agents.length}`);
    console.log(`[SurveyRunner] questions=${surveyDefinition.questions.length}`);
    console.log(`[SurveyRunner] responses=${responses.length}`);
  }

  return {
    responses,
    engineMode,
    engineVersion: 'cadem-v1.1',
    agentCount: agents.length,
    questionCount: surveyDefinition.questions.length,
    totalResponses: responses.length,
    durationMs: Date.now() - startTime,
    persistenceMeta,
  };
}
