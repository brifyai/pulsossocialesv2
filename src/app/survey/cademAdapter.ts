import { interpretQuestion } from '../opinionEngine/questionInterpreter';
import { generateOpinionatedResponse } from '../opinionEngine/opinionEngine';
import { buildInitialTopicStates } from '../opinionEngine/topicStateSeed';
import { buildInitialPanelState } from '../panel/panelStateManager';

import type { OpinionatedResponse } from '../opinionEngine/types';
import type { TopicState } from '../opinionEngine/types';
import type { PanelState } from '../panel/types';

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
}

/**
 * Ejecuta una encuesta tipo Cadem sobre una lista de agentes.
 * V1: usa estados en memoria si no existen estados persistidos.
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
  } = input;

  const responses: AdaptedSurveyResponse[] = [];

  for (const agent of agents) {
    const stateBundle = agentStateMap[agent.agentId] ?? {};

    const topicStates =
      stateBundle.topicStates ?? buildInitialTopicStates(agent);

    const panelState =
      stateBundle.panelState ?? buildInitialPanelState(agent);

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
      });
    }
  }

  return responses;
}
