import { interpretQuestion } from '../opinionEngine/questionInterpreter';
import { generateOpinionatedResponse } from '../opinionEngine/opinionEngine';
import { buildInitialTopicStates } from '../opinionEngine/topicStateSeed';
import { buildInitialPanelState } from '../panel/panelStateManager';
import { processMultipleEvents } from '../events/eventImpact';

import type { OpinionatedResponse } from '../opinionEngine/types';
import type { TopicState } from '../opinionEngine/types';
import type { PanelState } from '../panel/types';
import type { WeeklyEvent } from '../events/types';
import type { SyntheticAgent } from '../../types/agent';

export interface CademAdapterAgent {
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

export interface CademSurveyQuestion {
  id: string;
  text: string;
  type?: string;
  options?: string[];
  periodicity?: 'permanent' | 'monthly' | 'lower_frequency' | 'ad_hoc';
}

export interface CademSurveyDefinition {
  id: string;
  title?: string;
  topic?: string;
  questions: CademSurveyQuestion[];
}

export interface AdaptedSurveyResponse {
  surveyId: string;
  questionId: string;
  agentId: string;
  value: OpinionatedResponse['value'];
  confidence: number;
  reasoning: string;
  factors: OpinionatedResponse['factors'];
  processingTime: number;
  createdAt: Date;
  engineMode: 'cadem' | 'legacy';
  engineVersion: string;
}

export interface AgentStateBundle {
  topicStates?: TopicState[];
  panelState?: PanelState;
}

export interface RunCademSurveyInput {
  surveyDefinition: CademSurveyDefinition;
  agents: CademAdapterAgent[];
  agentStateMap?: Record<string, AgentStateBundle>;
  weekKey?: string;
  mode?: 'cawi' | 'cati' | 'mixed';
  weeklyEvents?: WeeklyEvent[];
}

/**
 * Convierte un CademAdapterAgent a SyntheticAgent para el sistema de eventos.
 * Mapea campos de camelCase a snake_case según corresponda.
 * Usa valores por defecto seguros para campos no disponibles en CademAdapterAgent.
 */
function toSyntheticAgent(agent: CademAdapterAgent): SyntheticAgent {
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
    region_name: 'Metropolitana', // Valor por defecto
    comuna_code: agent.communeCode ?? agent.regionCode ?? '13',
    comuna_name: 'Santiago', // Valor por defecto
    urbanicity: 'urban', // Valor por defecto
    sex,
    age,
    age_group,
    household_size: 3, // Valor por defecto
    household_type: 'family', // Valor por defecto
    income_decile: agent.incomeDecile ?? 5,
    poverty_status,
    education_level,
    occupation_status: 'employed', // Valor por defecto
    occupation_group: null,
    socioeconomic_level,
    connectivity_level,
    digital_exposure_level,
    preferred_survey_channel,
    agent_type,
    backbone_key: agent.agentId,
    subtel_profile_key: null,
    casen_profile_key: null,
    generation_notes: 'Converted from CademAdapterAgent for event processing',
    location_lat: null,
    location_lng: null,
  };
}

/**
 * Ejecuta una encuesta tipo Cadem sobre una lista de agentes.
 * V1.2: usa estados en memoria y aplica impactos de eventos si se proporcionan.
 */
export function runCademSurvey(
  input: RunCademSurveyInput,
): AdaptedSurveyResponse[] {
  const {
    surveyDefinition,
    agents,
    agentStateMap = {},
    weekKey,
    mode = 'cawi',
    weeklyEvents,
  } = input;

  const responses: AdaptedSurveyResponse[] = [];

  for (const agent of agents) {
    const stateBundle = agentStateMap[agent.agentId] ?? {};

    let topicStates =
      stateBundle.topicStates ?? buildInitialTopicStates(agent);

    const panelState =
      stateBundle.panelState ?? buildInitialPanelState(agent);

    // Aplicar impactos de eventos si se proporcionan
    if (weeklyEvents && weeklyEvents.length > 0) {
      // Convertir topicStates a Record<string, number> para processMultipleEvents
      const topicStatesRecord: Record<string, number> = {};
      for (const ts of topicStates) {
        topicStatesRecord[ts.topic] = ts.score;
      }

      // Procesar eventos
      const eventResult = processMultipleEvents(
        toSyntheticAgent(agent),
        weeklyEvents,
        topicStatesRecord
      );

      // Convertir de vuelta a TopicState[]
      topicStates = topicStates.map(ts => ({
        ...ts,
        score: eventResult.finalTopicStates[ts.topic] ?? ts.score,
        updatedAt: new Date(),
      }));
    }

    for (let i = 0; i < surveyDefinition.questions.length; i++) {
      const rawQuestion = surveyDefinition.questions[i];
      const interpretedQuestion = interpretQuestion(rawQuestion);

      const result = generateOpinionatedResponse({
        agent,
        interpretedQuestion,
        topicStates,
        panelState,
        context: {
          questionIndex: i + 1,
          totalQuestions: surveyDefinition.questions.length,
          surveyId: surveyDefinition.id,
          surveyTopic: surveyDefinition.topic,
          weekKey,
          mode,
        },
      });

      responses.push({
        surveyId: surveyDefinition.id,
        questionId: rawQuestion.id,
        agentId: agent.agentId,
        value: result.value,
        confidence: result.confidence,
        reasoning: result.reasoning,
        factors: result.factors,
        processingTime: result.processingTime,
        createdAt: new Date(),
        engineMode: 'cadem',
        engineVersion: 'cadem-v1.2',
      });
    }
  }

  return responses;
}
