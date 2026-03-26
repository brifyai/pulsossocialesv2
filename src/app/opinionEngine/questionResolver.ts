import type {
  ApprovalAnswer,
  CountryDirectionAnswer,
  EconomicPerceptionAnswer,
  OptimismAnswer,
  PoliticalIdentityAnswer,
  SecurityPerceptionAnswer,
  TopicKey,
} from '../../types/opinion';
import type { InterpretedQuestion, TopicState } from './types';
import { getTopicState, clamp } from './topicStateSeed';

interface ResolverResult<TValue> {
  value: TValue;
  confidence: number;
  reasoning: string;
}

function randomNoise(scale = 0.06): number {
  return (Math.random() * 2 - 1) * scale;
}

function scoreWithNoise(score: number, scale = 0.06): number {
  return clamp(score + randomNoise(scale), -1, 1);
}

function resolveNoResponse(score: number, baseProbability = 0.02): boolean {
  const uncertaintyBoost = Math.max(0, 0.12 - Math.abs(score)) * 0.25;
  return Math.random() < baseProbability + uncertaintyBoost;
}

function confidenceFromScore(score: number, stateConfidence = 0.6): number {
  return clamp(0.45 + Math.abs(score) * 0.35 + stateConfidence * 0.2, 0.2, 0.98);
}

function getRequiredTopicState(
  topicStates: TopicState[],
  topic: TopicKey,
): TopicState {
  const state = getTopicState(topicStates, topic);

  if (!state) {
    return {
      topic,
      score: 0,
      confidence: 0.4,
      salience: 0.5,
      volatility: 0.5,
      updatedAt: new Date(),
    };
  }

  return state;
}

export function resolveApprovalQuestion(
  topicStates: TopicState[],
): ResolverResult<ApprovalAnswer> {
  const state = getRequiredTopicState(topicStates, 'government_approval');
  const score = scoreWithNoise(state.score, 0.07);

  if (resolveNoResponse(score, 0.02)) {
    return {
      value: 'no_response',
      confidence: 0.25,
      reasoning: 'El agente muestra baja claridad o preferencia por no responder.',
    };
  }

  const value: ApprovalAnswer = score >= 0 ? 'approve' : 'disapprove';

  return {
    value,
    confidence: confidenceFromScore(score, state.confidence),
    reasoning:
      value === 'approve'
        ? 'La aprobación del gobierno del agente es netamente favorable.'
        : 'La evaluación del gobierno del agente es netamente desfavorable.',
  };
}

export function resolveCountryDirectionQuestion(
  topicStates: TopicState[],
): ResolverResult<CountryDirectionAnswer> {
  const state = getRequiredTopicState(topicStates, 'country_direction');
  const score = scoreWithNoise(state.score, 0.07);

  if (resolveNoResponse(score, 0.02)) {
    return {
      value: 'no_response',
      confidence: 0.25,
      reasoning: 'El agente no logra formarse una opinión clara sobre el rumbo del país.',
    };
  }

  const value: CountryDirectionAnswer = score >= 0 ? 'good_path' : 'bad_path';

  return {
    value,
    confidence: confidenceFromScore(score, state.confidence),
    reasoning:
      value === 'good_path'
        ? 'El agente percibe que el país avanza en una dirección positiva.'
        : 'El agente percibe que el país va por un mal camino.',
  };
}

export function resolveOptimismQuestion(
  topicStates: TopicState[],
): ResolverResult<OptimismAnswer> {
  const state = getRequiredTopicState(topicStates, 'country_optimism');
  const score = scoreWithNoise(state.score, 0.08);

  if (resolveNoResponse(score, 0.03)) {
    return {
      value: 'no_response',
      confidence: 0.25,
      reasoning: 'El agente no expresa una expectativa definida sobre el futuro del país.',
    };
  }

  let value: OptimismAnswer;

  // Thresholds más estrechos para capturar más extremos
  if (score >= 0.4) {
    value = 'very_optimistic';
  } else if (score >= 0) {
    value = 'optimistic';
  } else if (score <= -0.4) {
    value = 'very_pessimistic';
  } else {
    value = 'pessimistic';
  }

  return {
    value,
    confidence: confidenceFromScore(score, state.confidence),
    reasoning: 'La respuesta refleja el nivel de expectativa del agente sobre el futuro del país.',
  };
}

export function resolveEconomicPerceptionQuestion(
  topicStates: TopicState[],
  topic: TopicKey,
): ResolverResult<EconomicPerceptionAnswer> {
  const state = getRequiredTopicState(topicStates, topic);
  const score = scoreWithNoise(state.score, 0.08);

  if (resolveNoResponse(score, 0.025)) {
    return {
      value: 'no_response',
      confidence: 0.25,
      reasoning: 'El agente no responde la evaluación económica.',
    };
  }

  let value: EconomicPerceptionAnswer;

  // Thresholds más estrechos para capturar más extremos
  if (score >= 0.4) {
    value = 'very_good';
  } else if (score >= 0) {
    value = 'good';
  } else if (score <= -0.4) {
    value = 'very_bad';
  } else {
    value = 'bad';
  }

  return {
    value,
    confidence: confidenceFromScore(score, state.confidence),
    reasoning: 'La respuesta surge de la percepción económica latente del agente.',
  };
}

export function resolveSecurityPerceptionQuestion(
  topicStates: TopicState[],
): ResolverResult<SecurityPerceptionAnswer> {
  const state = getRequiredTopicState(topicStates, 'security_perception');
  const score = scoreWithNoise(state.score, 0.08);

  if (resolveNoResponse(score, 0.025)) {
    return {
      value: 'no_response',
      confidence: 0.25,
      reasoning: 'El agente no manifiesta una percepción definida de seguridad.',
    };
  }

  let value: SecurityPerceptionAnswer;

  if (score >= 0.5) {
    value = 'very_safe';
  } else if (score >= 0) {
    value = 'safe';
  } else if (score <= -0.5) {
    value = 'very_unsafe';
  } else {
    value = 'unsafe';
  }

  return {
    value,
    confidence: confidenceFromScore(score, state.confidence),
    reasoning: 'La respuesta refleja la percepción subjetiva de seguridad del agente.',
  };
}

export function resolveIdeologyQuestion(
  topicStates: TopicState[],
): ResolverResult<PoliticalIdentityAnswer> {
  const state = getRequiredTopicState(topicStates, 'political_identity');
  const score = scoreWithNoise(state.score, 0.06);

  if (resolveNoResponse(score, 0.05)) {
    return {
      value: 'no_response',
      confidence: 0.25,
      reasoning: 'El agente no declara una identidad política definida.',
    };
  }

  let value: PoliticalIdentityAnswer;

  // Thresholds más estrechos para reducir colapso al centro
  if (score >= 0.55) {
    value = 'right';
  } else if (score >= 0.18) {
    value = 'center_right';
  } else if (score > -0.18 && score < 0.18) {
    // Centro más estrecho: solo scores muy cercanos a 0
    value = 'center';
  } else if (score > -0.55) {
    value = 'center_left';
  } else {
    value = 'left';
  }

  return {
    value,
    confidence: confidenceFromScore(score, state.confidence),
    reasoning: 'La respuesta representa la ubicación ideológica persistente del agente.',
  };
}

export function resolveQuestionByFamily(
  interpretedQuestion: InterpretedQuestion,
  topicStates: TopicState[],
): ResolverResult<
  | ApprovalAnswer
  | CountryDirectionAnswer
  | OptimismAnswer
  | EconomicPerceptionAnswer
  | SecurityPerceptionAnswer
  | PoliticalIdentityAnswer
> {
  switch (interpretedQuestion.family) {
    case 'approval':
      return resolveApprovalQuestion(topicStates);

    case 'direction':
      return resolveCountryDirectionQuestion(topicStates);

    case 'optimism':
      return resolveOptimismQuestion(topicStates);

    case 'economic_perception':
      return resolveEconomicPerceptionQuestion(
        topicStates,
        interpretedQuestion.topic ?? 'economy_national',
      );

    case 'security_perception':
      return resolveSecurityPerceptionQuestion(topicStates);

    case 'ideology':
      return resolveIdeologyQuestion(topicStates);

    default:
      return {
        value: 'no_response',
        confidence: 0.2,
        reasoning: 'La familia de pregunta aún no está soportada en esta versión.',
      };
  }
}
