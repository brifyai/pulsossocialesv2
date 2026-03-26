import type { OpinionatedResponse } from '../opinionEngine/types';

/**
 * Modo del motor de respuestas.
 * legacy: motor heurístico original
 * cadem: motor de opinión nuevo con topic states
 */
export type EngineMode = 'legacy' | 'cadem';

/**
 * Respuesta unificada compatible con ambos motores.
 */
export interface UnifiedSurveyResponse {
  surveyId: string;
  questionId: string;
  agentId: string;
  value: string | number | string[] | null;
  confidence: number;
  reasoning?: string;
  engineMode: EngineMode;
  engineVersion: string;
  factors?: OpinionatedResponse['factors'];
  processingTime?: number;
  createdAt: Date;
  /**
   * Metadata de persistencia del estado del agente.
   * Solo presente cuando engineMode === 'cadem' y persistState === true.
   */
  persistenceMeta?: AgentPersistenceMeta;
}

/**
 * Metadata de persistencia del estado del agente.
 */
export interface AgentPersistenceMeta {
  agentId: string;
  topicStateSource: 'persisted' | 'seeded';
  panelStateSource: 'persisted' | 'seeded';
  saveStatus: 'saved' | 'failed';
  timestamp: Date;
}

/**
 * Reporte de comparación entre motores.
 */
export interface EngineComparisonReport {
  surveyId: string;
  questionId: string;
  legacyDistribution: Record<string, number>;
  cademDistribution: Record<string, number>;
  divergenceScore: number;
  recommendation: string;
}
