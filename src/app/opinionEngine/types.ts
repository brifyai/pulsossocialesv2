import type {
  TopicKey,
  QuestionFamily,
  ResponseFormat,
  OpinionResponseValue,
} from '../../types/opinion';

/**
 * Estado latente de opinión del agente para un tema específico.
 * score:
 * -1 = postura muy negativa / opuesta
 *  0 = neutral / ambivalente
 *  1 = postura muy positiva / favorable
 */
export interface TopicState {
  topic: TopicKey;
  score: number;
  confidence: number;
  salience: number;
  volatility: number;
  updatedAt: Date;
}

/**
 * Vector resumido de opinión del agente.
 * Útil para inspección, debugging y análisis agregado.
 */
export interface OpinionVector {
  governmentApproval?: number;
  countryDirection?: number;
  countryOptimism?: number;
  economyPersonal?: number;
  economyNational?: number;
  employment?: number;
  consumption?: number;
  institutionalTrust?: number;
  politicalIdentity?: number;
  securityPerception?: number;
}

/**
 * Representación estructurada de una pregunta de encuesta.
 */
export interface InterpretedQuestion {
  questionId: string;
  originalText: string;
  family: QuestionFamily;
  topic?: TopicKey;
  targetEntity?: string;
  responseFormat: ResponseFormat;
  fingerprint: string;
  periodicity?: 'permanent' | 'monthly' | 'lower_frequency' | 'ad_hoc';
  options?: string[];
}

/**
 * Contexto de ejecución de la respuesta.
 */
export interface QuestionContext {
  questionIndex: number;
  totalQuestions: number;
  surveyId?: string;
  surveyTopic?: string;
  weekKey?: string;
  mode?: 'cawi' | 'cati' | 'mixed';
  previousResponses?: Array<{
    questionId: string;
    value: OpinionResponseValue;
  }>;
}

/**
 * Factor explicativo que influyó en la respuesta.
 */
export interface ResponseFactor {
  type:
    | 'topic_state'
    | 'memory'
    | 'panel_fatigue'
    | 'demographic'
    | 'event'
    | 'response_style'
    | 'random_noise'
    | 'question_context';
  weight: number;
  description: string;
}

/**
 * Respuesta generada por el motor.
 */
export interface OpinionatedResponse {
  value: OpinionResponseValue;
  confidence: number;
  reasoning: string;
  factors: ResponseFactor[];
  processingTime: number;
}

/**
 * Resultado de exposición del agente a un evento.
 */
export interface EventExposureResult {
  eventId: string;
  exposureProbability: number;
  wasExposed: boolean;
  attentionWeight: number;
}

/**
 * Interpretación del agente sobre un evento.
 */
export interface EventInterpretation {
  interpretedSentiment: number;
  impactStrength: number;
  affectedTopics: TopicKey[];
}

/**
 * Log de actualización de opinión por evento.
 */
export interface OpinionUpdateLog {
  eventId: string;
  affectedTopics: TopicKey[];
  previousScores: Partial<Record<TopicKey, number>>;
  newScores: Partial<Record<TopicKey, number>>;
  summary: string;
}
