import { runCademSurvey } from './cademAdapter';
import { runCademSurveyBatchAsync } from './cademAdapterAsync';
import { generateSurveyResponses } from './syntheticResponseEngine';
import { getEventsByWeekKey, getWeekKeyWindow } from '../events/eventStore';
import { getScenarioById, scenarioToWeeklyEvent } from '../events/scenarioEventStore';
import type { CademAdapterAgent, CademSurveyDefinition } from './cademAdapter';
import type { UnifiedSurveyResponse, EngineMode, AgentPersistenceMeta } from './unifiedResponseEngine';
import type { SyntheticAgent } from '../../types/agent';
import type { SurveyQuestion } from '../../types/survey';
import type { WeeklyEvent } from '../events/types';

export interface SurveyRunnerInput {
  surveyDefinition: CademSurveyDefinition;
  agents: CademAdapterAgent[];
  engineMode: EngineMode;
  persistState?: boolean;
  weekKey?: string;
  debug?: boolean;
  useEvents?: boolean;
  eventWindowSize?: number;
  /** ID del escenario hipotético a aplicar (opcional) */
  scenarioEventId?: string;
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
    useEvents = false,
    eventWindowSize = 2,
    scenarioEventId,
  } = input;

  let responses: UnifiedSurveyResponse[] = [];
  let persistenceMeta: AgentPersistenceMeta[] | undefined;
  let weeklyEvents: WeeklyEvent[] = [];

  // Cargar eventos si está habilitado y hay weekKey
  if (useEvents && weekKey) {
    const weekKeys = getWeekKeyWindow(weekKey, eventWindowSize);
    const eventResults = await Promise.all(
      weekKeys.map(wk => getEventsByWeekKey(wk))
    );
    
    weeklyEvents = eventResults.flatMap(r => r.events);
    
    if (debug) {
      console.log(`[SurveyRunner] Eventos cargados: ${weeklyEvents.length} eventos en ventana ${eventWindowSize} semanas`);
      weeklyEvents.forEach(e => console.log(`  - ${e.weekKey}: ${e.title} (${e.category}, ${e.severity})`));
    }
  }

  // Cargar escenario hipotético si se proporciona
  if (scenarioEventId) {
    const scenarioResult = await getScenarioById(scenarioEventId);
    
    if (scenarioResult.success && scenarioResult.data) {
      const scenarioEvent = scenarioToWeeklyEvent(scenarioResult.data, weekKey || 'SCENARIO');
      weeklyEvents.push(scenarioEvent);
      
      if (debug) {
        console.log(`[SurveyRunner] Escenario aplicado: ${scenarioEvent.title}`);
        console.log(`  - Categoría: ${scenarioEvent.category}`);
        console.log(`  - Severidad: ${scenarioEvent.severity}`);
        console.log(`  - Sentimiento: ${scenarioEvent.sentiment}`);
        console.log(`  - Intensidad: ${scenarioEvent.intensity}`);
      }
    } else {
      console.warn(`[SurveyRunner] No se pudo cargar el escenario ${scenarioEventId}: ${scenarioResult.error}`);
    }
  }

  // Modo legacy: motor heurístico original
  if (engineMode === 'legacy') {
    // Convertir CademAdapterAgent a SyntheticAgent para el motor legacy
    const legacyAgents = agents.map(agent => ({
      agent_id: agent.agentId,
      age: agent.age ?? 35,
      sex: agent.sex ?? 'unknown',
      education_level: agent.educationLevel ?? 'secondary',
      income_decile: agent.incomeDecile ?? 5,
      poverty_status: agent.povertyStatus ?? 'middle_class',
      region_code: agent.regionCode ?? 'CL-RM',
      connectivity_level: agent.connectivityLevel ?? 'medium',
      urbanicity: agent.connectivityLevel === 'high' ? 'urban' : 'mixed',
      occupation_status: agent.agentType === 'student' ? 'student' : agent.agentType === 'retired' ? 'retired' : 'employed',
    })) as SyntheticAgent[];

    // Convertir preguntas al formato legacy
    const legacyQuestions = surveyDefinition.questions.map(q => {
      if (q.options && q.options.length > 0) {
        // Es single_choice
        return {
          id: q.id,
          text: q.text,
          type: 'single_choice',
          options: q.options.map((opt, idx) => ({
            id: `opt_${idx}`,
            label: opt,
            value: opt,
          })),
        } as unknown as SurveyQuestion;
      }
      // Es likert_scale por defecto
      return {
        id: q.id,
        text: q.text,
        type: 'likert_scale',
        min: 1,
        max: 5,
        labels: ['Muy en desacuerdo', 'En desacuerdo', 'Neutral', 'De acuerdo', 'Muy de acuerdo'],
        minLabel: 'Muy en desacuerdo',
        maxLabel: 'Muy de acuerdo',
        required: true,
      } as unknown as SurveyQuestion;
    });

    const legacyResponses = generateSurveyResponses(legacyAgents, legacyQuestions);

    responses = legacyResponses.map((r) => ({
      surveyId: surveyDefinition.id,
      questionId: r.questionId,
      agentId: r.agentId,
      value: r.value !== null && r.value !== undefined ? String(r.value) : null,
      confidence: r.confidence,
      reasoning: r.reasoning,
      engineMode: 'legacy',
      engineVersion: 'legacy-v1',
      createdAt: new Date(),
    }));

    if (debug) {
      console.log(`[SurveyRunner] Legacy mode: ${responses.length} respuestas generadas`);
    }
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
      },
      weeklyEvents // Pasar eventos para aplicar impactos
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
    engineVersion: engineMode === 'legacy' ? 'legacy-v1' : 'cadem-v1.1',
    agentCount: agents.length,
    questionCount: surveyDefinition.questions.length,
    totalResponses: responses.length,
    durationMs: Date.now() - startTime,
    persistenceMeta,
  };
}
