/**
 * Survey Types - Encuestas Sintéticas v1
 * 
 * Modelo de datos para definición, ejecución y resultados de encuestas
 */

import type { SyntheticAgent } from './agent';

// ===========================================
// Question Types
// ===========================================

export type QuestionType = 'single_choice' | 'likert_scale' | 'multiple_choice' | 'text';

export interface QuestionOption {
  id: string;
  label: string;
  value: string | number;
}

export interface BaseQuestion {
  id: string;
  type: QuestionType;
  text: string;
  required: boolean;
}

export interface SingleChoiceQuestion extends BaseQuestion {
  type: 'single_choice';
  options: QuestionOption[];
}

export interface LikertScaleQuestion extends BaseQuestion {
  type: 'likert_scale';
  min: number;
  max: number;
  minLabel: string;
  maxLabel: string;
}

export interface MultipleChoiceQuestion extends BaseQuestion {
  type: 'multiple_choice';
  options: QuestionOption[];
}

export interface TextQuestion extends BaseQuestion {
  type: 'text';
  maxLength?: number;
}

export type SurveyQuestion = 
  | SingleChoiceQuestion 
  | LikertScaleQuestion 
  | MultipleChoiceQuestion 
  | TextQuestion;

// ===========================================
// Survey Definition
// ===========================================

export interface SurveySegment {
  regionCode?: string;
  comunaCode?: string;
  sex?: string;
  ageGroup?: string;
  incomeDecile?: number;
  educationLevel?: string;
  connectivityLevel?: string;
  agentType?: string;
}

export interface SurveyDefinition {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  sampleSize: number;
  segment: SurveySegment;
  questions: SurveyQuestion[];
}

// ===========================================
// Survey Run & Responses
// ===========================================

export type ResponseValue = string | number | string[] | null;

export interface AgentResponse {
  agentId: string;
  questionId: string;
  value: ResponseValue;
  confidence: number; // 0-1, how confident the synthetic response is
  reasoning: string; // brief explanation of why this response was chosen
}

export interface SurveyRun {
  id: string;
  surveyId: string;
  startedAt: string;
  completedAt: string;
  totalAgents: number;
  responses: AgentResponse[];
  metadata: {
    segmentMatched: number;
    sampleSizeRequested: number;
    sampleSizeActual: number;
  };
}

// ===========================================
// Survey Results
// ===========================================

export interface SingleChoiceResult {
  questionId: string;
  questionType: 'single_choice';
  questionText: string;
  totalResponses: number;
  distribution: Record<string, { count: number; percentage: number; label: string }>;
}

export interface LikertResult {
  questionId: string;
  questionType: 'likert_scale';
  questionText: string;
  totalResponses: number;
  average: number;
  median: number;
  distribution: Record<number, { count: number; percentage: number }>;
  minLabel: string;
  maxLabel: string;
}

export interface MultipleChoiceResult {
  questionId: string;
  questionType: 'multiple_choice';
  questionText: string;
  totalResponses: number;
  distribution: Record<string, { count: number; percentage: number; label: string }>;
}

export interface TextResult {
  questionId: string;
  questionType: 'text';
  questionText: string;
  totalResponses: number;
  sampleResponses: string[];
}

export type QuestionResult = 
  | SingleChoiceResult 
  | LikertResult 
  | MultipleChoiceResult 
  | TextResult;

export interface SurveyResult {
  surveyId: string;
  runId: string;
  generatedAt: string;
  summary: {
    totalQuestions: number;
    totalResponses: number;
    uniqueAgents: number;
  };
  results: QuestionResult[];
}

// ===========================================
// Heuristic Rules for Synthetic Responses
// ===========================================

export interface ResponseHeuristic {
  id: string;
  name: string;
  description: string;
  applicableTo: QuestionType[];
  weight: (agent: SyntheticAgent) => number;
  apply: (agent: SyntheticAgent, question: SurveyQuestion) => ResponseValue;
}

// ===========================================
// Survey State (for UI)
// ===========================================

export type SurveyViewMode = 'list' | 'create' | 'configure' | 'results';

export interface SurveyState {
  surveys: SurveyDefinition[];
  currentSurvey: SurveyDefinition | null;
  currentRun: SurveyRun | null;
  currentResults: SurveyResult | null;
  viewMode: SurveyViewMode;
  isLoading: boolean;
  error: string | null;
}
