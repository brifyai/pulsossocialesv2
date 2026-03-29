/**
 * CADEM Adapter Async v1.2 (Event-Enabled)
 *
 * Async version of the CADEM adapter with persistence support.
 * Uses opinionStateLoader to resolve agent states from database or seed.
 * Persists updated states after each survey run.
 * 
 * v1.2: Added event impact support - applies weekly event impacts to agent states
 *       before generating responses.
 *
 * This enables longitudinal tracking of agent opinions across multiple survey runs.
 */

import { interpretQuestion } from '../opinionEngine/questionInterpreter';
import { generateOpinionatedResponse } from '../opinionEngine/opinionEngine';
import { resolveAgentState } from '../opinionEngine/opinionStateLoader';
import { opinionStateRepository } from '../../services/supabase/repositories/opinionStateRepository';
import { processMultipleEvents } from '../events/eventImpact';

import type { OpinionatedResponse, QuestionContext } from '../opinionEngine/types';
import type { PanelState } from '../panel/types';
import type { TopicState } from '../opinionEngine/types';
import type { OpinionResponseValue } from '../../types/opinion';
import type { CademSurveyQuestion, CademAdapterAgent } from './cademAdapter';
import type { WeeklyEvent } from '../events/types';
import type { SyntheticAgent } from '../../types/agent';

/**
 * Convierte un CademAdapterAgent a SyntheticAgent para el sistema de eventos.
 * Mapea campos de camelCase a snake_case según corresponda.
 * Usa valores por defecto seguros para campos no disponibles en CademAdapterAgent.
 */
export function toSyntheticAgent(agent: CademAdapterAgent): SyntheticAgent {
  // Determinar age_group basado en age
  const age = agent.age ?? 35;
  let age_group: import('../../types/agent').AgeGroup = 'adult';
  if (age < 18) age_group = 'youth';
  else if (age < 35) age_group = 'adult';
  else if (age < 60) age_group = 'middle_age';
  else age_group = 'senior';

  // Mapear sex a tipo correcto
  const sex: import('../../types/agent').Sex = agent.sex === 'female' ? 'female' : 'male';

  // Mapear educationLevel a EducationLevel
  const educationLevelMap: Record<string, import('../../types/agent').EducationLevel> = {
    'none': 'none',
    'primary': 'primary',
    'secondary': 'secondary',
    'technical': 'technical',
    'university': 'university',
    'postgraduate': 'postgraduate',
  };
  const education_level = agent.educationLevel 
    ? (educationLevelMap[agent.educationLevel] ?? 'secondary')
    : 'secondary';

  // Mapear povertyStatus a PovertyStatus
  const povertyStatusMap: Record<string, import('../../types/agent').PovertyStatus> = {
    'extreme_poverty': 'extreme_poverty',
    'poverty': 'poverty',
    'vulnerable': 'vulnerable',
    'middle_class': 'middle_class',
    'upper_middle': 'upper_middle',
    'upper_class': 'upper_class',
  };
  const poverty_status = agent.povertyStatus
    ? (povertyStatusMap[agent.povertyStatus] ?? 'middle_class')
    : 'middle_class';

  // Mapear connectivityLevel a ConnectivityLevel
  const connectivityMap: Record<string, import('../../types/agent').ConnectivityLevel> = {
    'none': 'none',
    'low': 'low',
    'medium': 'medium',
    'high': 'high',
    'very_high': 'very_high',
  };
  const connectivity_level = agent.connectivityLevel
    ? (connectivityMap[agent.connectivityLevel] ?? 'medium')
    : 'medium';

  // Mapear digitalExposure a DigitalExposureLevel
  const digitalExposureMap: Record<string, import('../../types/agent').DigitalExposureLevel> = {
    'none': 'none',
    'low': 'low',
    'medium': 'medium',
    'high': 'high',
    'very_high': 'very_high',
  };
  const digital_exposure_level = agent.digitalExposure
    ? (digitalExposureMap[agent.digitalExposure] ?? 'medium')
    : 'medium';

  // Mapear preferredChannel a SurveyChannel
  const channelMap: Record<string, import('../../types/agent').SurveyChannel> = {
    'phone': 'phone',
    'online': 'online',
    'in_person': 'in_person',
    'mixed': 'mixed',
  };
  const preferred_survey_channel = agent.preferredChannel
    ? (channelMap[agent.preferredChannel] ?? 'online')
    : 'online';

  // Mapear agentType a SyntheticAgentType
  const agentTypeMap: Record<string, import('../../types/agent').SyntheticAgentType> = {
    'resident': 'resident',
    'retiree': 'retiree',
    'student': 'student',
    'entrepreneur': 'entrepreneur',
    'worker': 'worker',
  };
  const agent_type = agent.agentType
    ? (agentTypeMap[agent.agentType] ?? 'resident')
    : 'resident';

  // Inferir socioeconomic_level basado en incomeDecile o povertyStatus
  let socioeconomic_level: import('../../types/agent').SocioeconomicLevel = 'medium';
  if (agent.incomeDecile !== undefined) {
    if (agent.incomeDecile <= 3) socioeconomic_level = 'low';
    else if (agent.incomeDecile >= 8) socioeconomic_level = 'high';
    else socioeconomic_level = 'medium';
  } else if (agent.povertyStatus) {
    if (['extreme_poverty', 'poverty'].includes(agent.povertyStatus)) {
      socioeconomic_level = 'low';
    } else if (['upper_middle', 'upper_class'].includes(agent.povertyStatus)) {
      socioeconomic_level = 'high';
    }
  }

  return {
    agent_id: agent.agentId,
    synthetic_batch_id: 'cadem-adapter-batch',
    source_version: 'cadem-v1.2',
    created_at: new Date().toISOString(),
    country_code: 'CL',
    region_code: agent.regionCode ?? '13',
    region_name: 'Metropolitana', // Valor por defecto, no disponible en CademAdapterAgent
    comuna_code: agent.communeCode ?? agent.regionCode ?? '13',
    comuna_name: 'Santiago', // Valor por defecto, no disponible en CademAdapterAgent
    urbanicity: 'urban', // Valor por defecto, no disponible en CademAdapterAgent
    sex,
    age,
    age_group,
    household_size: 3, // Valor por defecto, no disponible en CademAdapterAgent
    household_type: 'family', // Valor por defecto, no disponible en CademAdapterAgent
    income_decile: agent.incomeDecile ?? 5,
    poverty_status,
    education_level,
    occupation_status: 'employed', // Valor por defecto, no disponible en CademAdapterAgent
    occupation_group: null, // No disponible en CademAdapterAgent
    socioeconomic_level,
    connectivity_level,
    digital_exposure_level,
    preferred_survey_channel,
    agent_type,
    backbone_key: agent.agentId, // Usar agentId como fallback
    subtel_profile_key: null, // No disponible en CademAdapterAgent
    casen_profile_key: null, // No disponible en CademAdapterAgent
    generation_notes: 'Converted from CademAdapterAgent for event processing',
    location_lat: null, // No disponible en CademAdapterAgent
    location_lng: null, // No disponible en CademAdapterAgent
  };
}

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
 * Metadata de persistencia del estado del agente.
 */
export interface AsyncAgentPersistenceMeta {
  agentId: string;
  topicStateSource: 'persisted' | 'seeded';
  panelStateSource: 'persisted' | 'seeded';
  saveStatus: 'saved' | 'failed';
  timestamp: Date;
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
  engineVersion: string;
  persistenceMeta: AsyncAgentPersistenceMeta;
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
 * @param weeklyEvents - Optional array of weekly events to apply before survey
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
  weeklyEvents?: WeeklyEvent[],
): Promise<CademSurveyResult> {
  const responses: CademResponseResult[] = [];
  const previousResponses: Array<{ questionId: string; value: OpinionResponseValue }> = [];

  // Resolve initial state (from DB or seed)
  const { topicStates, panelState, source: stateSource } = await resolveAgentState(agent);

  // Track if states were loaded from DB or seeded
  const topicStateSource: 'persisted' | 'seeded' = stateSource.topic === 'db' ? 'persisted' : 'seeded';
  const panelStateSource: 'persisted' | 'seeded' = stateSource.panel === 'db' ? 'persisted' : 'seeded';

  // Convert topicStates array to record for event processing
  let topicStatesRecord: Record<string, number> = {};
  for (const ts of topicStates) {
    topicStatesRecord[ts.topic] = ts.score;
  }

  // Apply event impacts if events are provided
  if (weeklyEvents && weeklyEvents.length > 0) {
    const eventResult = processMultipleEvents(
      toSyntheticAgent(agent),
      weeklyEvents,
      topicStatesRecord
    );
    topicStatesRecord = eventResult.finalTopicStates;
    
    // Convert back to TopicState array
    const updatedTopicStates: TopicState[] = topicStates.map(ts => ({
      ...ts,
      score: topicStatesRecord[ts.topic] ?? ts.score,
      updatedAt: new Date(),
    }));
    
    // Update current states with event impacts
    topicStates.splice(0, topicStates.length, ...updatedTopicStates);
  }

  let currentTopicStates = topicStates;
  let currentPanelState = panelState;

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
    currentPanelState = result.updatedPanelState;
  }

  // Persist final states
  let saveStatus: 'saved' | 'failed' = 'saved';
  try {
    await Promise.all([
      opinionStateRepository.saveTopicStates(agent.agentId, currentTopicStates),
      opinionStateRepository.savePanelState(currentPanelState),
    ]);
    console.log(`[CademAdapterAsync] States persisted for ${agent.agentId}`);
  } catch (error) {
    console.warn(`[CademAdapterAsync] Failed to persist states for ${agent.agentId}:`, error);
    saveStatus = 'failed';
    // Continue without persisting - survey is still valid
  }

  const persistenceMeta: AsyncAgentPersistenceMeta = {
    agentId: agent.agentId,
    topicStateSource,
    panelStateSource,
    saveStatus,
    timestamp: new Date(),
  };

  return {
    agentId: agent.agentId,
    responses,
    finalTopicStates: currentTopicStates,
    finalPanelState: currentPanelState,
    completedAt: new Date(),
    engineVersion: 'cadem-v1.2',
    persistenceMeta,
  };
}

/**
 * Run a CADEM survey for multiple agents in batch.
 * More efficient for large-scale simulations.
 *
 * @param agents - Array of agents with demographic data
 * @param questions - Array of CADEM questions
 * @param surveyContext - Optional survey context
 * @param weeklyEvents - Optional array of weekly events to apply before survey
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
  weeklyEvents?: WeeklyEvent[],
): Promise<CademSurveyResult[]> {
  const results: CademSurveyResult[] = [];

  for (const agent of agents) {
    try {
      const result = await runCademSurveyAsync(agent, questions, surveyContext, weeklyEvents);
      results.push(result);
    } catch (error) {
      console.error(`[CademAdapterAsync] Failed to run survey for agent ${agent.agentId}:`, error);
      // Continue with other agents
    }
  }

  return results;
}
