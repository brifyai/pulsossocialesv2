/**
 * Dual Mode Adapter v1.0
 *
 * Permite ejecutar encuestas en modo dual:
 * - LEGACY: Usa el motor de respuestas sintéticas original
 * - OPINION_ENGINE: Usa el nuevo motor de opinión con estados persistentes
 * - HYBRID: Usa ambos y compara resultados
 *
 * Esto facilita la transición gradual y permite A/B testing.
 */

import { generateCademResponseAsync } from './cademAdapterAsync';
import { generateQuickResponse } from '../opinionEngine/opinionEngine';
import { interpretQuestion } from '../opinionEngine/questionInterpreter';
import { buildInitialTopicStates } from '../opinionEngine/topicStateSeed';

import type { OpinionatedResponse } from '../opinionEngine/types';
import type { CademSurveyQuestion } from './cademAdapter';
import type { CademAgentAsync } from './cademAdapterAsync';
import type { OpinionResponseValue } from '../../types/opinion';

export type ExecutionMode = 'legacy' | 'opinion_engine' | 'hybrid';

export interface DualModeConfig {
  mode: ExecutionMode;
  /** Porcentaje de agentes que usan opinion_engine en modo hybrid (0-100) */
  hybridSplit?: number;
  /** Si se debe persistir estados en modo opinion_engine */
  persistStates?: boolean;
  /** Si se debe comparar resultados en modo hybrid */
  enableComparison?: boolean;
}

export interface DualModeResult {
  mode: ExecutionMode;
  agentId: string;
  questionId: string;

  // Resultado principal (según modo)
  primaryResponse: OpinionatedResponse;
  primarySource: 'legacy' | 'opinion_engine';

  // Resultado secundario (solo en modo hybrid)
  secondaryResponse?: OpinionatedResponse;
  secondarySource?: 'legacy' | 'opinion_engine';

  // Comparación (solo en modo hybrid)
  comparison?: {
    valuesMatch: boolean;
    confidenceDiff: number;
    reasoningSimilar: boolean;
  };

  // Metadata
  processingTime: number;
  usedPersistedState: boolean;
}

export interface DualModeSurveyResult {
  surveyId: string;
  mode: ExecutionMode;
  agentResults: DualModeResult[];
  summary: {
    totalAgents: number;
    legacyCount: number;
    opinionEngineCount: number;
    avgProcessingTime: number;
    matchRate?: number; // Solo en hybrid
  };
}

const DEFAULT_CONFIG: DualModeConfig = {
  mode: 'opinion_engine',
  hybridSplit: 50,
  persistStates: true,
  enableComparison: true,
};

/**
 * Genera una respuesta en modo dual
 */
export async function generateDualModeResponse(
  agent: CademAgentAsync,
  question: CademSurveyQuestion,
  config: DualModeConfig = DEFAULT_CONFIG,
  context?: {
    questionIndex: number;
    totalQuestions: number;
    previousResponses?: Array<{ questionId: string; value: OpinionResponseValue }>;
  },
): Promise<DualModeResult> {
  const startTime = Date.now();

  switch (config.mode) {
    case 'legacy':
      return await executeLegacyMode(agent, question, context, startTime);

    case 'opinion_engine':
      return await executeOpinionEngineMode(agent, question, context, startTime, config);

    case 'hybrid':
      return await executeHybridMode(agent, question, context, startTime, config);

    default:
      throw new Error(`Unknown execution mode: ${config.mode}`);
  }
}

/**
 * Ejecuta en modo legacy (motor original simplificado)
 * Usa generateQuickResponse como aproximación del motor legacy
 */
async function executeLegacyMode(
  agent: CademAgentAsync,
  question: CademSurveyQuestion,
  context?: { questionIndex: number; totalQuestions: number; previousResponses?: Array<{ questionId: string; value: OpinionResponseValue }> },
  startTime?: number,
): Promise<DualModeResult> {
  // Usar generateQuickResponse como aproximación del motor legacy
  const interpretedQuestion = interpretQuestion({
    id: question.id,
    text: question.text,
    type: question.type,
    options: question.options,
    periodicity: question.periodicity,
  });

  const response = generateQuickResponse(agent, interpretedQuestion);
  const processingTime = Date.now() - (startTime ?? Date.now());

  return {
    mode: 'legacy',
    agentId: agent.agentId,
    questionId: question.id,
    primaryResponse: response,
    primarySource: 'legacy',
    processingTime,
    usedPersistedState: false,
  };
}

/**
 * Ejecuta en modo opinion_engine (nuevo motor)
 */
async function executeOpinionEngineMode(
  agent: CademAgentAsync,
  question: CademSurveyQuestion,
  context?: { questionIndex: number; totalQuestions: number; previousResponses?: Array<{ questionId: string; value: OpinionResponseValue }> },
  startTime?: number,
  config?: DualModeConfig,
): Promise<DualModeResult> {
  // Usar el nuevo motor con persistencia
  const result = await generateCademResponseAsync(agent, question, {
    questionIndex: context?.questionIndex ?? 0,
    totalQuestions: context?.totalQuestions ?? 1,
    previousResponses: context?.previousResponses,
  });

  const processingTime = Date.now() - (startTime ?? Date.now());

  return {
    mode: 'opinion_engine',
    agentId: agent.agentId,
    questionId: question.id,
    primaryResponse: result.response,
    primarySource: 'opinion_engine',
    processingTime,
    usedPersistedState: config?.persistStates ?? true,
  };
}

/**
 * Ejecuta en modo hybrid (ambos motores y comparación)
 */
async function executeHybridMode(
  agent: CademAgentAsync,
  question: CademSurveyQuestion,
  context?: { questionIndex: number; totalQuestions: number; previousResponses?: Array<{ questionId: string; value: OpinionResponseValue }> },
  startTime?: number,
  config?: DualModeConfig,
): Promise<DualModeResult> {
  // Ejecutar ambos motores
  const [legacyResult, opinionResult] = await Promise.all([
    executeLegacyMode(agent, question, context, startTime),
    executeOpinionEngineMode(agent, question, context, startTime, config),
  ]);

  // Comparar resultados
  const comparison = compareResponses(legacyResult.primaryResponse, opinionResult.primaryResponse);

  // Decidir cuál es primario (por defecto opinion_engine)
  const primaryIsOpinion = true;

  return {
    mode: 'hybrid',
    agentId: agent.agentId,
    questionId: question.id,
    primaryResponse: primaryIsOpinion ? opinionResult.primaryResponse : legacyResult.primaryResponse,
    primarySource: primaryIsOpinion ? 'opinion_engine' : 'legacy',
    secondaryResponse: primaryIsOpinion ? legacyResult.primaryResponse : opinionResult.primaryResponse,
    secondarySource: primaryIsOpinion ? 'legacy' : 'opinion_engine',
    comparison,
    processingTime: Math.max(legacyResult.processingTime, opinionResult.processingTime),
    usedPersistedState: config?.persistStates ?? true,
  };
}

/**
 * Compara dos respuestas
 */
function compareResponses(
  legacy: OpinionatedResponse,
  opinion: OpinionatedResponse,
): { valuesMatch: boolean; confidenceDiff: number; reasoningSimilar: boolean } {
  const valuesMatch = legacy.value === opinion.value;
  const confidenceDiff = Math.abs(legacy.confidence - opinion.confidence);

  // Heurística simple: comparar longitud y palabras clave del reasoning
  const legacyWords = new Set(legacy.reasoning.toLowerCase().split(' '));
  const opinionWords = new Set(opinion.reasoning.toLowerCase().split(' '));
  const intersection = new Set([...legacyWords].filter(x => opinionWords.has(x)));
  const similarity = intersection.size / Math.max(legacyWords.size, opinionWords.size);
  const reasoningSimilar = similarity > 0.5;

  return {
    valuesMatch,
    confidenceDiff,
    reasoningSimilar,
  };
}

/**
 * Ejecuta una encuesta completa en modo dual
 */
export async function runDualModeSurvey(
  agents: CademAgentAsync[],
  questions: CademSurveyQuestion[],
  config: DualModeConfig = DEFAULT_CONFIG,
  surveyContext?: { surveyId?: string; surveyTopic?: string },
): Promise<DualModeSurveyResult> {
  const startTime = Date.now();
  const results: DualModeResult[] = [];

  // En modo hybrid, dividir agentes según hybridSplit
  let legacyAgents: CademAgentAsync[] = [];
  let opinionAgents: CademAgentAsync[] = [];

  if (config.mode === 'hybrid' && config.hybridSplit !== undefined) {
    const splitIndex = Math.floor(agents.length * (config.hybridSplit / 100));
    opinionAgents = agents.slice(0, splitIndex);
    legacyAgents = agents.slice(splitIndex);
  } else if (config.mode === 'legacy') {
    legacyAgents = agents;
  } else {
    opinionAgents = agents;
  }

  // Procesar agentes legacy
  for (const agent of legacyAgents) {
    for (let i = 0; i < questions.length; i++) {
      const result = await generateDualModeResponse(
        agent,
        questions[i],
        { ...config, mode: 'legacy' },
        { questionIndex: i, totalQuestions: questions.length },
      );
      results.push(result);
    }
  }

  // Procesar agentes opinion_engine
  for (const agent of opinionAgents) {
    if (config.mode === 'hybrid' && config.enableComparison) {
      // En hybrid con comparación, ejecutar ambos
      for (let i = 0; i < questions.length; i++) {
        const result = await generateDualModeResponse(
          agent,
          questions[i],
          { ...config, mode: 'hybrid' },
          { questionIndex: i, totalQuestions: questions.length },
        );
        results.push(result);
      }
    } else {
      // Solo opinion_engine
      for (let i = 0; i < questions.length; i++) {
        const result = await generateDualModeResponse(
          agent,
          questions[i],
          { ...config, mode: 'opinion_engine' },
          { questionIndex: i, totalQuestions: questions.length },
        );
        results.push(result);
      }
    }
  }

  const totalTime = Date.now() - startTime;

  // Calcular estadísticas
  const legacyCount = results.filter(r => r.primarySource === 'legacy').length;
  const opinionCount = results.filter(r => r.primarySource === 'opinion_engine').length;
  const avgProcessingTime = results.length > 0
    ? results.reduce((sum, r) => sum + r.processingTime, 0) / results.length
    : 0;

  // Calcular match rate en modo hybrid
  let matchRate: number | undefined;
  if (config.mode === 'hybrid') {
    const hybridResults = results.filter(r => r.mode === 'hybrid' && r.comparison);
    const matches = hybridResults.filter(r => r.comparison?.valuesMatch).length;
    matchRate = hybridResults.length > 0 ? (matches / hybridResults.length) * 100 : undefined;
  }

  return {
    surveyId: surveyContext?.surveyId ?? `survey-${Date.now()}`,
    mode: config.mode,
    agentResults: results,
    summary: {
      totalAgents: agents.length,
      legacyCount,
      opinionEngineCount: opinionCount,
      avgProcessingTime,
      matchRate,
    },
  };
}

/**
 * Obtiene estadísticas de comparación de un resultado dual
 */
export function getDualModeStats(result: DualModeSurveyResult): {
  matchRate: number;
  avgConfidenceDiff: number;
  reasoningSimilarity: number;
} {
  const hybridResults = result.agentResults.filter(r => r.mode === 'hybrid' && r.comparison);

  if (hybridResults.length === 0) {
    return { matchRate: 0, avgConfidenceDiff: 0, reasoningSimilarity: 0 };
  }

  const matches = hybridResults.filter(r => r.comparison?.valuesMatch).length;
  const matchRate = (matches / hybridResults.length) * 100;

  const avgConfidenceDiff = hybridResults.reduce(
    (sum, r) => sum + (r.comparison?.confidenceDiff ?? 0),
    0,
  ) / hybridResults.length;

  const similarReasoning = hybridResults.filter(r => r.comparison?.reasoningSimilar).length;
  const reasoningSimilarity = (similarReasoning / hybridResults.length) * 100;

  return {
    matchRate,
    avgConfidenceDiff,
    reasoningSimilarity,
  };
}

/**
 * Recomienda modo basado en resultados de hybrid
 */
export function recommendMode(stats: { matchRate: number; avgConfidenceDiff: number }): ExecutionMode {
  if (stats.matchRate > 95 && stats.avgConfidenceDiff < 0.1) {
    return 'opinion_engine'; // Muy similar, usar nuevo motor
  } else if (stats.matchRate < 70) {
    return 'hybrid'; // Muy diferente, seguir comparando
  } else {
    return 'hybrid'; // Moderadamente similar, seguir monitoreando
  }
}
