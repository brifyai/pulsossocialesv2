/**
 * Survey Service
 * 
 * Servicio para ejecutar encuestas y generar resultados agregados.
 */

import type { SyntheticAgent } from '../../types/agent';
import type { 
  SurveyDefinition, 
  SurveyRun, 
  SurveyResult,
  SurveyQuestion,
  AgentResponse,
  SingleChoiceResult,
  LikertResult,
  QuestionResult
} from '../../types/survey';
import { filterAgents } from '../../data/syntheticAgents';
import { generateSurveyResponses, calculateConfidenceStats } from './syntheticResponseEngine';

// ===========================================
// Survey Storage (in-memory for v1)
// ===========================================

const surveys: Map<string, SurveyDefinition> = new Map();
const surveyRuns: Map<string, SurveyRun> = new Map();
const surveyResults: Map<string, SurveyResult> = new Map();

// ===========================================
// Survey CRUD Operations
// ===========================================

/**
 * Crea una nueva encuesta
 */
export function createSurvey(definition: Omit<SurveyDefinition, 'id' | 'createdAt'>): SurveyDefinition {
  const survey: SurveyDefinition = {
    ...definition,
    id: `survey_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    createdAt: new Date().toISOString()
  };
  
  surveys.set(survey.id, survey);
  console.log(`📋 Survey created: ${survey.name} (${survey.id})`);
  return survey;
}

/**
 * Obtiene una encuesta por ID
 */
export function getSurvey(id: string): SurveyDefinition | undefined {
  return surveys.get(id);
}

/**
 * Obtiene todas las encuestas
 */
export function getAllSurveys(): SurveyDefinition[] {
  return Array.from(surveys.values()).sort((a, b) => 
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

/**
 * Elimina una encuesta
 */
export function deleteSurvey(id: string): boolean {
  const deleted = surveys.delete(id);
  if (deleted) {
    console.log(`🗑️ Survey deleted: ${id}`);
  }
  return deleted;
}

// ===========================================
// Survey Execution
// ===========================================

/**
 * Ejecuta una encuesta sobre agentes que coinciden con el segmento
 */
export async function runSurvey(surveyId: string): Promise<SurveyRun> {
  const survey = getSurvey(surveyId);
  if (!survey) {
    throw new Error(`Survey not found: ${surveyId}`);
  }
  
  console.log(`🚀 Running survey: ${survey.name}`);
  const startedAt = new Date().toISOString();
  
  // 1. Filtrar agentes según segmento
  const segmentFilters: Record<string, string | number | undefined> = {};
  if (survey.segment.regionCode) segmentFilters.regionCode = survey.segment.regionCode;
  if (survey.segment.comunaCode) segmentFilters.comunaCode = survey.segment.comunaCode;
  if (survey.segment.sex) segmentFilters.sex = survey.segment.sex;
  if (survey.segment.ageGroup) segmentFilters.ageGroup = survey.segment.ageGroup;
  if (survey.segment.incomeDecile) segmentFilters.incomeDecile = survey.segment.incomeDecile;
  if (survey.segment.educationLevel) segmentFilters.educationLevel = survey.segment.educationLevel;
  if (survey.segment.connectivityLevel) segmentFilters.connectivityLevel = survey.segment.connectivityLevel;
  if (survey.segment.agentType) segmentFilters.agentType = survey.segment.agentType;
  
  const matchedAgents = await filterAgents(segmentFilters);
  console.log(`  📊 Matched ${matchedAgents.length} agents from segment`);
  
  // 2. Samplear si es necesario
  let selectedAgents: SyntheticAgent[];
  if (survey.sampleSize > 0 && survey.sampleSize < matchedAgents.length) {
    // Sampleo aleatorio simple
    selectedAgents = matchedAgents
      .sort(() => Math.random() - 0.5)
      .slice(0, survey.sampleSize);
    console.log(`  🎲 Sampled ${selectedAgents.length} agents`);
  } else {
    selectedAgents = matchedAgents;
  }
  
  // 3. Generar respuestas sintéticas
  console.log(`  🤖 Generating synthetic responses...`);
  const responses = generateSurveyResponses(selectedAgents, survey.questions);
  
  // 4. Crear registro de ejecución
  const run: SurveyRun = {
    id: `run_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    surveyId: survey.id,
    startedAt,
    completedAt: new Date().toISOString(),
    totalAgents: selectedAgents.length,
    responses,
    metadata: {
      segmentMatched: matchedAgents.length,
      sampleSizeRequested: survey.sampleSize,
      sampleSizeActual: selectedAgents.length
    }
  };
  
  surveyRuns.set(run.id, run);
  console.log(`  ✅ Survey run completed: ${run.id}`);
  
  // 5. Generar resultados agregados
  const results = generateSurveyResults(survey, run);
  surveyResults.set(results.surveyId, results);
  
  return run;
}

/**
 * Obtiene una ejecución por ID
 */
export function getSurveyRun(runId: string): SurveyRun | undefined {
  return surveyRuns.get(runId);
}

/**
 * Obtiene todas las ejecuciones de una encuesta
 */
export function getSurveyRuns(surveyId: string): SurveyRun[] {
  return Array.from(surveyRuns.values())
    .filter(run => run.surveyId === surveyId)
    .sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime());
}

// ===========================================
// Results Generation
// ===========================================

/**
 * Genera resultados agregados de una encuesta
 */
function generateSurveyResults(survey: SurveyDefinition, run: SurveyRun): SurveyResult {
  const results: QuestionResult[] = [];
  
  for (const question of survey.questions) {
    const questionResponses = run.responses.filter(r => r.questionId === question.id);
    
    switch (question.type) {
      case 'single_choice':
        results.push(generateSingleChoiceResult(question, questionResponses));
        break;
      case 'likert_scale':
        results.push(generateLikertResult(question as any, questionResponses));
        break;
      case 'multiple_choice':
        results.push(generateMultipleChoiceResult(question as any, questionResponses));
        break;
      case 'text':
        results.push(generateTextResult(question as any, questionResponses));
        break;
    }
  }
  
  const result: SurveyResult = {
    surveyId: survey.id,
    runId: run.id,
    generatedAt: new Date().toISOString(),
    summary: {
      totalQuestions: survey.questions.length,
      totalResponses: run.responses.length,
      uniqueAgents: run.totalAgents
    },
    results
  };
  
  return result;
}

/**
 * Genera resultado para pregunta de opción única
 */
function generateSingleChoiceResult(
  question: SurveyQuestion,
  responses: AgentResponse[]
): SingleChoiceResult {
  const q = question as any;
  const distribution: Record<string, { count: number; percentage: number; label: string }> = {};
  
  // Inicializar con todas las opciones
  q.options.forEach((opt: any) => {
    distribution[opt.value] = { count: 0, percentage: 0, label: opt.label };
  });
  
  // Contar respuestas
  responses.forEach(r => {
    const value = r.value as string;
    if (distribution[value]) {
      distribution[value].count++;
    }
  });
  
  // Calcular porcentajes
  const total = responses.length;
  Object.keys(distribution).forEach(key => {
    distribution[key].percentage = total > 0 
      ? Math.round((distribution[key].count / total) * 1000) / 10 
      : 0;
  });
  
  return {
    questionId: question.id,
    questionType: 'single_choice',
    questionText: question.text,
    totalResponses: total,
    distribution
  };
}

/**
 * Genera resultado para escala Likert
 */
function generateLikertResult(
  question: any,
  responses: AgentResponse[]
): LikertResult {
  const values = responses.map(r => r.value as number).filter(v => typeof v === 'number');
  const total = values.length;
  
  // Calcular estadísticas
  const sum = values.reduce((a, b) => a + b, 0);
  const average = total > 0 ? sum / total : 0;
  const sorted = [...values].sort((a, b) => a - b);
  const median = total > 0 
    ? (total % 2 === 0 
      ? (sorted[total / 2 - 1] + sorted[total / 2]) / 2 
      : sorted[Math.floor(total / 2)])
    : 0;
  
  // Distribución
  const distribution: Record<number, { count: number; percentage: number }> = {};
  for (let i = question.min; i <= question.max; i++) {
    distribution[i] = { count: 0, percentage: 0 };
  }
  
  values.forEach(v => {
    if (distribution[v]) {
      distribution[v].count++;
    }
  });
  
  Object.keys(distribution).forEach(key => {
    const numKey = parseInt(key);
    distribution[numKey].percentage = total > 0 
      ? Math.round((distribution[numKey].count / total) * 1000) / 10 
      : 0;
  });
  
  return {
    questionId: question.id,
    questionType: 'likert_scale',
    questionText: question.text,
    totalResponses: responses.length,
    average: Math.round(average * 10) / 10,
    median,
    distribution,
    minLabel: question.minLabel,
    maxLabel: question.maxLabel
  };
}

/**
 * Genera resultado para multiple choice (simplificado)
 */
function generateMultipleChoiceResult(
  question: any,
  responses: AgentResponse[]
): any {
  return {
    questionId: question.id,
    questionType: 'multiple_choice',
    questionText: question.text,
    totalResponses: responses.length,
    distribution: {},
    note: 'Multiple choice analysis not implemented in v1'
  };
}

/**
 * Genera resultado para texto (simplificado)
 */
function generateTextResult(
  question: any,
  responses: AgentResponse[]
): any {
  const sampleResponses = responses
    .map(r => r.value as string)
    .filter(v => v && v !== 'Respuesta de texto no implementada en v1')
    .slice(0, 5);
  
  return {
    questionId: question.id,
    questionType: 'text',
    questionText: question.text,
    totalResponses: responses.length,
    sampleResponses
  };
}

// ===========================================
// Results Access
// ===========================================

/**
 * Obtiene resultados de una encuesta
 */
export function getSurveyResults(surveyId: string): SurveyResult | undefined {
  return surveyResults.get(surveyId);
}

/**
 * Obtiene estadísticas de confianza de una ejecución
 */
export function getRunConfidenceStats(runId: string): {
  average: number;
  min: number;
  max: number;
  distribution: Record<string, number>;
} | null {
  const run = surveyRuns.get(runId);
  if (!run) return null;
  return calculateConfidenceStats(run.responses);
}

// ===========================================
// Sample Surveys
// ===========================================

/**
 * Crea encuestas de ejemplo para demostración
 */
export function createSampleSurveys(): void {
  if (surveys.size > 0) return; // Ya existen encuestas
  
  // Encuesta 1: Satisfacción con servicios digitales
  createSurvey({
    name: 'Satisfacción con Servicios Digitales',
    description: 'Medir la satisfacción de los ciudadanos con los servicios digitales públicos',
    sampleSize: 100,
    segment: {
      regionCode: '13', // Metropolitana
      connectivityLevel: 'medium'
    },
    questions: [
      {
        id: 'q1',
        type: 'single_choice',
        text: '¿Con qué frecuencia usa servicios públicos en línea?',
        required: true,
        options: [
          { id: 'opt1', label: 'Diariamente', value: 'daily' },
          { id: 'opt2', label: 'Semanalmente', value: 'weekly' },
          { id: 'opt3', label: 'Mensualmente', value: 'monthly' },
          { id: 'opt4', label: 'Raramente', value: 'rarely' },
          { id: 'opt5', label: 'Nunca', value: 'never' }
        ]
      },
      {
        id: 'q2',
        type: 'likert_scale',
        text: '¿Qué tan satisfecho está con la calidad de los servicios digitales?',
        required: true,
        min: 1,
        max: 5,
        minLabel: 'Muy insatisfecho',
        maxLabel: 'Muy satisfecho'
      },
      {
        id: 'q3',
        type: 'likert_scale',
        text: '¿Qué tan fácil es acceder a los servicios en línea?',
        required: true,
        min: 1,
        max: 5,
        minLabel: 'Muy difícil',
        maxLabel: 'Muy fácil'
      }
    ]
  });
  
  // Encuesta 2: Preocupaciones económicas
  createSurvey({
    name: 'Preocupaciones Económicas',
    description: 'Entender las preocupaciones económicas de diferentes segmentos',
    sampleSize: 150,
    segment: {
      incomeDecile: 5
    },
    questions: [
      {
        id: 'q1',
        type: 'likert_scale',
        text: '¿Qué tan preocupado está por la situación económica actual?',
        required: true,
        min: 1,
        max: 5,
        minLabel: 'Nada preocupado',
        maxLabel: 'Muy preocupado'
      },
      {
        id: 'q2',
        type: 'single_choice',
        text: '¿Ha tenido dificultades para pagar gastos básicos en los últimos 3 meses?',
        required: true,
        options: [
          { id: 'opt1', label: 'Sí, frecuentemente', value: 'often' },
          { id: 'opt2', label: 'Sí, ocasionalmente', value: 'sometimes' },
          { id: 'opt3', label: 'No, nunca', value: 'never' }
        ]
      },
      {
        id: 'q3',
        type: 'likert_scale',
        text: '¿Considera que su situación económica mejorará en el próximo año?',
        required: true,
        min: 1,
        max: 5,
        minLabel: 'Empeorará mucho',
        maxLabel: 'Mejorará mucho'
      }
    ]
  });
  
  console.log('📋 Sample surveys created');
}
