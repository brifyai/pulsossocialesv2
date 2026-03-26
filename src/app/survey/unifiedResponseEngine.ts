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
  factors?: OpinionatedResponse['factors'];
  processingTime?: number;
  createdAt: Date;
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
