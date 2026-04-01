import type { InterpretedQuestion, OpinionatedResponse, QuestionContext, ResponseFactor } from './types';
import type { TopicState } from './types';
import { resolveQuestionByFamily } from './questionResolver';
import { buildInitialTopicStates } from './topicStateSeed';
import type { PanelState } from '../panel/types';
import {
  FATIGUE_CONFIG,
  CONFIDENCE_CONFIG,
  RESPONSE_FACTORS,
} from './engineConfig';

// Interfaz mínima del agente que espera el motor
export interface OpinionEngineAgent {
  agentId: string;
  age?: number;
  sex?: string;
  educationLevel?: string;
  incomeDecile?: number;
  povertyStatus?: string;
  regionCode?: string;
  communeCode?: string;
  connectivityLevel?: string;
  digitalExposure?: string;
  preferredChannel?: string;
  agentType?: string;
}

interface EngineInput {
  agent: OpinionEngineAgent;
  interpretedQuestion: InterpretedQuestion;
  topicStates: TopicState[]; // En V1 asumimos que vienen de fuera o se crean aquí
  panelState?: PanelState;
  context: QuestionContext;
}

/**
 * Calcula el factor de fatiga según la posición en la encuesta.
 * 0 = sin fatiga, 1 = máxima fatiga
 */
function calculateFatigueFactor(questionIndex: number, totalQuestions: number): number {
  if (totalQuestions <= 1) return 0;
  const progress = questionIndex / totalQuestions;
  // Fatiga crece no linealmente (más rápido al final)
  return Math.pow(progress, FATIGUE_CONFIG.GROWTH_EXPONENT) * FATIGUE_CONFIG.MAX_IMPACT;
}

/**
 * Ajusta la confianza de la respuesta por efectos del panel.
 */
function adjustConfidenceForPanel(
  baseConfidence: number,
  panelState: PanelState | undefined,
  fatigueFactor: number,
): number {
  let adjusted = baseConfidence;

  // Fatiga reduce confianza
  adjusted -= fatigueFactor * CONFIDENCE_CONFIG.FATIGUE_REDUCTION_FACTOR;

  // Quality score del panelista ajusta (buenos panelistas mantienen confianza)
  if (panelState) {
    adjusted += (panelState.qualityScore - CONFIDENCE_CONFIG.BASE_CENTER) * CONFIDENCE_CONFIG.QUALITY_SCORE_FACTOR;
  }

  // Clamp entre valores mínimo y máximo
  return Math.max(CONFIDENCE_CONFIG.MIN_VALUE, Math.min(CONFIDENCE_CONFIG.MAX_VALUE, adjusted));
}

/**
 * Genera los factores explicativos de la respuesta.
 */
function buildResponseFactors(
  topicStates: TopicState[],
  interpretedQuestion: InterpretedQuestion,
  _panelState: PanelState | undefined,
  fatigueFactor: number,
): ResponseFactor[] {
  const factors: ResponseFactor[] = [];

  // Factor principal: estado del tema
  const relevantTopic = topicStates.find(t => t.topic === interpretedQuestion.topic);
  if (relevantTopic) {
    factors.push({
      type: 'topic_state',
      weight: RESPONSE_FACTORS.TOPIC_STATE,
      description: `Estado latente en ${relevantTopic.topic}: score ${relevantTopic.score.toFixed(2)}`,
    });
  }

  // Factor demográfico (implícito en el score inicial)
  factors.push({
    type: 'demographic',
    weight: RESPONSE_FACTORS.DEMOGRAPHIC,
    description: 'Perfil demográfico y socioeconómico del agente',
  });

  // Factor de fatiga
  if (fatigueFactor > 0.1) {
    factors.push({
      type: 'panel_fatigue',
      weight: fatigueFactor * RESPONSE_FACTORS.PANEL_FATIGUE,
      description: `Fatiga de encuesta: ${(fatigueFactor * 100).toFixed(0)}%`,
    });
  }

  // Factor de contexto de pregunta
  factors.push({
    type: 'question_context',
    weight: RESPONSE_FACTORS.QUESTION_CONTEXT,
    description: `Posición ${interpretedQuestion.responseFormat} en encuesta`,
  });

  // Ruido aleatorio (siempre presente pero pequeño)
  factors.push({
    type: 'random_noise',
    weight: RESPONSE_FACTORS.RANDOM_NOISE,
    description: 'Variabilidad estocástica inherente',
  });

  return factors;
}

/**
 * Motor principal de generación de respuestas opinadas.
 * Orquesta el proceso completo desde el agente hasta la respuesta.
 * VERSIÓN SÍNCRONA - sin operaciones async por ahora
 */
export function generateOpinionatedResponse(
  input: EngineInput,
): OpinionatedResponse {
  const startTime = Date.now();

  const { agent, interpretedQuestion, topicStates, context } = input;

  // Asegurar que tenemos topic states (si no, crearlos - en producción vendrían de BD)
  let currentTopicStates = topicStates;
  if (!currentTopicStates || currentTopicStates.length === 0) {
    currentTopicStates = buildInitialTopicStates(agent);
  }

  // Calcular fatiga
  const fatigueFactor = calculateFatigueFactor(context.questionIndex, context.totalQuestions);

  // Resolver la pregunta según su familia
  const resolved = resolveQuestionByFamily(interpretedQuestion, currentTopicStates);

  // Ajustar confianza por efectos de panel
  const finalConfidence = adjustConfidenceForPanel(
    resolved.confidence,
    input.panelState,
    fatigueFactor,
  );

  // Construir factores explicativos
  const factors = buildResponseFactors(
    currentTopicStates,
    interpretedQuestion,
    input.panelState,
    fatigueFactor,
  );

  // Ajustar reasoning si hay fatiga significativa
  let finalReasoning = resolved.reasoning;
  if (fatigueFactor > FATIGUE_CONFIG.SIGNIFICANT_THRESHOLD) {
    finalReasoning += ' (Respuesta potencialmente afectada por fatiga de encuesta)';
  }

  const processingTime = Date.now() - startTime;

  return {
    value: resolved.value,
    confidence: finalConfidence,
    reasoning: finalReasoning,
    factors,
    processingTime,
  };
}

/**
 * Versión simplificada para testing rápido.
 * No requiere panel state ni contexto complejo.
 */
export function generateQuickResponse(
  agent: OpinionEngineAgent,
  interpretedQuestion: InterpretedQuestion,
  topicStates?: TopicState[],
): OpinionatedResponse {
  const states = topicStates || buildInitialTopicStates(agent);

  const mockContext: QuestionContext = {
    questionIndex: 1,
    totalQuestions: 10,
  };

  const mockPanelState: PanelState = {
    agentId: agent.agentId,
    eligibleWeb: true,
    participationPropensity: 0.7,
    panelFatigue: 0.1,
    qualityScore: 0.8,
    cooldownUntil: null,
    invites30d: 2,
    completions30d: 1,
    lastInvitedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    lastCompletedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
  };

  return generateOpinionatedResponse({
    agent,
    interpretedQuestion,
    topicStates: states,
    panelState: mockPanelState,
    context: mockContext,
  });
}
