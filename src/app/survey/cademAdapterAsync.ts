/**
 * CADEM Adapter Async v1.1
 *
 * Async version of the CADEM adapter with persistence support.
 * Uses opinionStateLoader to resolve agent states from database or seed.
 * Persists updated states after each survey run.
 *
 * This enables longitudinal tracking of agent opinions across multiple survey runs.
 */

import { interpretQuestion } from '../opinionEngine/questionInterpreter';
import { generateOpinionatedResponse } from '../opinionEngine/opinionEngine';
import { resolveAgentState } from '../opinionEngine/opinionStateLoader';
import { saveTopicStates, savePanelState } from '../../services/supabase/repositories/opinionStateRepository';

import type { OpinionatedResponse, QuestionContext } from '../opinionEngine/types';
import type { PanelState } from '../panel/types';
import type { TopicState } from '../opinionEngine/types';
import type { OpinionResponseValue } from '../../types/opinion';
import type { CademSurveyQuestion, CademAdapterAgent } from './cademAdapter';

/**
 * Extended agent type with all demographic fields needed for seed generation.
 * This matches the TopicStateSeedAgent interface.
 */
export interface CademAgentAsync extends CademAdapterAgent {
  agentId: string;
}

/**
 * Result of a single question response.
 */
export interface CademResponseResult {
  questionId: string;
  response: OpinionatedResponse;
  updatedTopicStates: TopicState[];
  updatedPanelState: PanelState;
}

/**
 * Result of a complete survey run for an agent.
 */
export interface CademSurveyResult {
  agentId: string;
  responses: CademResponseResult[];
  finalTopicStates: TopicState[];
  finalPanelState: PanelState;
  completedAt: Date;
}

/**
 * Generate a response for a single CADEM question.
 * Uses persisted state if available, otherwise generates from seed.
 *
 * @param agent - Agent with demographic data
 * @param question - CADEM question
 * @param context - Optional context from previous responses
 * @returns Response result with updated states
 */
export async function generateCademResponseAsync(
  agent: CademAgentAsync,
  question: CademSurveyQuestion,
  context?: {
    questionIndex: number;
    totalQuestions: number;
    previousResponses?: Array<{ questionId: string; value: OpinionResponseValue }>;
    surveyId?: string;
    surveyTopic?: string;
    weekKey?: string;
    mode?: 'cawi' | 'cati' | 'mixed';
  },
): Promise<CademResponseResult> {
  // Resolve agent state (from DB or seed)
  const { topicStates, panelState } = await resolveAgentState(agent);

  // Interpret the question
  const interpretedQuestion = interpretQuestion({
    id: question.id,
    text: question.text,
    type: question.type,
    options: question.options,
    periodicity: question.periodicity,
  });

  // Build question context
  const questionContext: QuestionContext = {
    questionIndex: (context?.questionIndex ?? 0) + 1,
    totalQuestions: context?.totalQuestions ?? 1,
    surveyId: context?.surveyId,
    surveyTopic: context?.surveyTopic,
    weekKey: context?.weekKey,
    mode: context?.mode ?? 'cawi',
    previousResponses: context?.previousResponses ?? [],
  };

  // Generate response using the opinion engine
  const response = generateOpinionatedResponse({
    agent,
    interpretedQuestion,
    topicStates,
    panelState,
    context: questionContext,
  });

  // Note: Panel state updates (fatigue, etc.) are handled by the opinion engine
  // Topic states are not updated here - they are updated by event exposure
  // This maintains consistency with the longitudinal model

  return {
    questionId: question.id,
    response,
    updatedTopicStates: topicStates, // Unchanged for now
    updatedPanelState: panelState, // Engine may have modified this
  };
}

/**
 * Run a complete CADEM survey for an agent.
 * Persists final states to database.
 *
 * @param agent - Agent with demographic data
 * @param questions - Array of CADEM questions
 * @param surveyContext - Optional survey context
 * @returns Complete survey result
 */
export async function runCademSurveyAsync(
  agent: CademAgentAsync,
  questions: CademSurveyQuestion[],
  surveyContext?: {
    surveyId?: string;
    surveyTopic?: string;
    weekKey?: string;
    mode?: 'cawi' | 'cati' | 'mixed';
  },
): Promise<CademSurveyResult> {
  const responses: CademResponseResult[] = [];
  const previousResponses: Array<{ questionId: string; value: OpinionResponseValue }> = [];

  // Resolve initial state
  let { topicStates, panelState } = await resolveAgentState(agent);

  for (let i = 0; i < questions.length; i++) {
    const question = questions[i];

    const result = await generateCademResponseAsync(agent, question, {
      questionIndex: i,
      totalQuestions: questions.length,
      previousResponses,
      surveyId: surveyContext?.surveyId,
      surveyTopic: surveyContext?.surveyTopic,
      weekKey: surveyContext?.weekKey,
      mode: surveyContext?.mode,
    });

    responses.push(result);
    previousResponses.push({
      questionId: question.id,
      value: result.response.value,
    });

    // Update states for next question
    panelState = result.updatedPanelState;
  }

  // Persist final states
  try {
    await Promise.all([
      saveTopicStates(agent.agentId, topicStates),
      savePanelState(panelState),
    ]);
  } catch (error) {
    console.warn(`[CademAdapterAsync] Failed to persist states for ${agent.agentId}:`, error);
    // Continue without persisting - survey is still valid
  }

  return {
    agentId: agent.agentId,
    responses,
    finalTopicStates: topicStates,
    finalPanelState: panelState,
    completedAt: new Date(),
  };
}

/**
 * Run a CADEM survey for multiple agents in batch.
 * More efficient for large-scale simulations.
 *
 * @param agents - Array of agents with demographic data
 * @param questions - Array of CADEM questions
 * @param surveyContext - Optional survey context
 * @returns Array of survey results
 */
export async function runCademSurveyBatchAsync(
  agents: CademAgentAsync[],
  questions: CademSurveyQuestion[],
  surveyContext?: {
    surveyId?: string;
    surveyTopic?: string;
    weekKey?: string;
    mode?: 'cawi' | 'cati' | 'mixed';
  },
): Promise<CademSurveyResult[]> {
  const results: CademSurveyResult[] = [];

  for (const agent of agents) {
    try {
      const result = await runCademSurveyAsync(agent, questions, surveyContext);
      results.push(result);
    } catch (error) {
      console.error(`[CademAdapterAsync] Failed to run survey for agent ${agent.agentId}:`, error);
      // Continue with other agents
    }
  }

  return results;
}
