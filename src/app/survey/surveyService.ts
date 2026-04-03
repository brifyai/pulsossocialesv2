/**
 * Survey Service
 * 
 * Servicio para ejecutar encuestas y generar resultados agregados.
 * Sprint 11A - Persistencia de definiciones en Supabase con fallback local
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
import { sampleFromArray } from '../../utils/random';
// CADEM v1.1 - Import unified survey runner
import { runSurvey as runUnifiedSurvey } from './surveyRunner';
import type { CademAdapterAgent, CademSurveyDefinition } from './cademAdapter';

// Survey Analysis Integration - MVP
import type { SurveyAnalysis } from './analysis/types';
import { analyzeSurveyResult } from './analysis/surveyAnalysisService';
import {
  createSurveyDefinition,
  getSurveyDefinitions,
  getSurveyDefinitionById,
  deleteSurveyDefinition,
  isSurveyPersistenceAvailable,
  // Sprint 11B - Survey Runs
  createSurveyRunDb,
  getSurveyRunsBySurveyId,
  getSurveyRunById,
  isSurveyRunPersistenceAvailable,
  // Sprint 11C - Survey Results
  saveSurveyResultsDb,
  getSurveyResultsBySurveyId,
  getSurveyResultsByRunId,
  isSurveyResultPersistenceAvailable,
  // Sprint 11D - Survey Responses
  saveSurveyResponses,
  isSurveyResponsePersistenceAvailable,
  getSurveyResponsesByRunId,
} from '../../services/supabase/repositories/surveyRepository';

// ===========================================
// Survey Storage (in-memory fallback)
// ===========================================

const surveys: Map<string, SurveyDefinition> = new Map();
const surveyRuns: Map<string, SurveyRun> = new Map();
const surveyResults: Map<string, SurveyResult> = new Map();

// Flag para saber si ya cargamos desde DB
let hasLoadedFromDb = false;

// ===========================================
// Helper: Sync local cache with DB
// ===========================================

/**
 * Carga encuestas desde Supabase al cache local
 * Solo se ejecuta una vez al inicio
 */
async function syncFromDatabase(): Promise<void> {
  if (hasLoadedFromDb) return;
  
  const isAvailable = await isSurveyPersistenceAvailable();
  if (!isAvailable) {
    console.log('📋 [SurveyService] DB not available, using local storage');
    hasLoadedFromDb = true;
    return;
  }
  
  try {
    const dbSurveys = await getSurveyDefinitions();
    // Limpiar cache local y cargar desde DB
    surveys.clear();
    for (const survey of dbSurveys) {
      surveys.set(survey.id, survey);
    }
    console.log(`📋 [SurveyService] Loaded ${dbSurveys.length} surveys from DB`);
    hasLoadedFromDb = true;
  } catch (error) {
    console.error('[SurveyService] Error loading from DB:', error);
    // Continuar con cache local vacío
    hasLoadedFromDb = true;
  }
}

// ===========================================
// Survey CRUD Operations
// ===========================================

/**
 * Crea una nueva encuesta
 * Intenta guardar en Supabase primero, fallback a local
 */
export async function createSurvey(definition: Omit<SurveyDefinition, 'id' | 'createdAt'>): Promise<SurveyDefinition> {
  // Asegurar que tenemos datos sincronizados
  await syncFromDatabase();
  
  // Intentar guardar en DB primero
  const isAvailable = await isSurveyPersistenceAvailable();
  if (isAvailable) {
    try {
      const dbSurvey = await createSurveyDefinition(definition);
      if (dbSurvey) {
        // Guardar en cache local también
        surveys.set(dbSurvey.id, dbSurvey);
        console.log(`📋 Survey created in DB: ${dbSurvey.name} (${dbSurvey.id})`);
        return dbSurvey;
      }
    } catch (error) {
      console.warn('[SurveyService] DB save failed, falling back to local:', error);
    }
  }
  
  // Fallback: crear localmente
  const survey: SurveyDefinition = {
    ...definition,
    id: `survey_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    createdAt: new Date().toISOString()
  };
  
  surveys.set(survey.id, survey);
  console.log(`📋 Survey created locally: ${survey.name} (${survey.id})`);
  return survey;
}

/**
 * Obtiene una encuesta por ID
 * Busca primero en cache, luego en DB si no está
 */
export async function getSurvey(id: string): Promise<SurveyDefinition | undefined> {
  await syncFromDatabase();
  
  // Primero buscar en cache
  const cached = surveys.get(id);
  if (cached) return cached;
  
  // Si no está en cache y DB está disponible, buscar en DB
  const isAvailable = await isSurveyPersistenceAvailable();
  if (isAvailable) {
    try {
      const dbSurvey = await getSurveyDefinitionById(id);
      if (dbSurvey) {
        surveys.set(dbSurvey.id, dbSurvey); // Cachear
        return dbSurvey;
      }
    } catch (error) {
      console.warn('[SurveyService] Error fetching from DB:', error);
    }
  }
  
  return undefined;
}

/**
 * Obtiene todas las encuestas
 * Sincroniza desde DB si es necesario
 */
export async function getAllSurveys(): Promise<SurveyDefinition[]> {
  await syncFromDatabase();
  
  // Si DB está disponible, recargar para tener datos frescos
  const isAvailable = await isSurveyPersistenceAvailable();
  if (isAvailable) {
    try {
      const dbSurveys = await getSurveyDefinitions();
      // Actualizar cache
      surveys.clear();
      for (const survey of dbSurveys) {
        surveys.set(survey.id, survey);
      }
    } catch (error) {
      console.warn('[SurveyService] Error reloading from DB:', error);
    }
  }
  
  return Array.from(surveys.values()).sort((a, b) => 
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

/**
 * Elimina una encuesta (Soft Delete)
 * Marca la encuesta como eliminada en DB (soft delete), y siempre de cache local
 * Las encuestas eliminadas no se muestran en la lista pero permanecen en la base de datos
 */
export async function deleteSurvey(id: string): Promise<boolean> {
  await syncFromDatabase();
  
  // Intentar soft delete en DB primero
  const isAvailable = await isSurveyPersistenceAvailable();
  if (isAvailable) {
    try {
      const dbDeleted = await deleteSurveyDefinition(id);
      if (!dbDeleted) {
        console.error('[SurveyService] Failed to soft-delete survey from DB');
        return false;
      }
      console.log(`🗑️ Survey soft-deleted from DB: ${id}`);
    } catch (error) {
      console.error('[SurveyService] Error soft-deleting from DB:', error);
      return false;
    }
  }
  
  // Siempre eliminar de cache local
  const deleted = surveys.delete(id);
  if (deleted) {
    console.log(`🗑️ Survey removed from cache: ${id}`);
  }
  return deleted;
}

// ===========================================
// Survey Execution
// ===========================================

/**
 * Ejecuta una encuesta sobre agentes que coinciden con el segmento
 * Sprint 11B - Persiste la corrida en Supabase (sin respuestas)
 * R1 - Soporta scenarioEventId opcional para vincular con escenarios
 * R2 - Guarda metadata del escenario para trazabilidad
 * Fixed Sample - Soporta fixedAgentIds para comparaciones reproducibles baseline vs escenario
 */
export async function runSurvey(
  surveyId: string, 
  scenarioEventId?: string,
  fixedAgentIds?: string[]
): Promise<SurveyRun> {
  const survey = await getSurvey(surveyId);
  if (!survey) {
    throw new Error(`Survey not found: ${surveyId}`);
  }
  
  // R2 - Cargar información del escenario si se proporciona
  let scenarioInfo: { name?: string; category?: string; severity?: import('../events/types').ImpactSeverity } = {};
  if (scenarioEventId) {
    try {
      const { getScenarioById } = await import('../events/scenarioEventStore');
      const scenarioResult = await getScenarioById(scenarioEventId);
      if (scenarioResult.success && scenarioResult.data) {
        scenarioInfo = {
          name: scenarioResult.data.name,
          category: scenarioResult.data.category,
          severity: scenarioResult.data.severity,
        };
        console.log(`📋 Loaded scenario info: ${scenarioInfo.name} (${scenarioInfo.category})`);
      }
    } catch (error) {
      console.warn('[SurveyService] Could not load scenario info:', error);
    }
  }
  
  console.log(`🚀 Running survey: ${survey.name}${scenarioEventId ? ` (with scenario: ${scenarioEventId})` : ''}${fixedAgentIds ? ` (with ${fixedAgentIds.length} fixed agents)` : ''}`);
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
  let selectedAgentIds: string[] | undefined;
  
  if (fixedAgentIds && fixedAgentIds.length > 0) {
    // Usar agentes fijos para comparaciones reproducibles
    selectedAgents = matchedAgents.filter(agent => fixedAgentIds.includes(agent.agent_id));
    selectedAgentIds = fixedAgentIds;
    console.log(`  🔒 Using ${selectedAgents.length} fixed agents from baseline`);
    
    if (selectedAgents.length === 0) {
      console.warn('[SurveyService] No agents matched the fixedAgentIds. Falling back to normal sampling.');
      // Fallback: usar sampling normal si no hay match
      if (survey.sampleSize > 0 && survey.sampleSize < matchedAgents.length) {
        selectedAgents = sampleFromArray(matchedAgents, survey.sampleSize);
      } else {
        selectedAgents = matchedAgents;
      }
      selectedAgentIds = selectedAgents.map(a => a.agent_id);
    }
  } else if (survey.sampleSize > 0 && survey.sampleSize < matchedAgents.length) {
    // Sampleo aleatorio simple usando Fisher-Yates para distribución uniforme
    selectedAgents = sampleFromArray(matchedAgents, survey.sampleSize);
    selectedAgentIds = selectedAgents.map(a => a.agent_id);
    console.log(`  🎲 Sampled ${selectedAgents.length} agents`);
  } else {
    selectedAgents = matchedAgents;
    selectedAgentIds = selectedAgents.map(a => a.agent_id);
  }
  
  // 3. Generar respuestas sintéticas
  // CADEM v1.1 - Use unified survey runner when engineMode is 'cadem'
  const useCademEngine = survey.engineMode === 'cadem';
  let responses: AgentResponse[];
  
  if (useCademEngine) {
    console.log(`  🤖 Generating responses with CADEM engine v1.1...`);
    responses = await runCademSurveyWithAgents(survey, selectedAgents);
  } else {
    console.log(`  🤖 Generating synthetic responses with legacy engine...`);
    responses = generateSurveyResponses(selectedAgents, survey.questions);
  }
  
  // 4. Crear registro de ejecución local
  const localRun: SurveyRun = {
    id: `run_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    surveyId: survey.id,
    startedAt,
    completedAt: new Date().toISOString(),
    totalAgents: selectedAgents.length,
    responses,
    metadata: {
      segmentMatched: matchedAgents.length,
      sampleSizeRequested: survey.sampleSize,
      sampleSizeActual: selectedAgents.length,
      // R2 - Guardar metadata del escenario si existe
      ...(scenarioEventId && {
        scenarioEventId,
        scenarioName: scenarioInfo.name,
        scenarioCategory: scenarioInfo.category,
        scenarioSeverity: scenarioInfo.severity,
      }),
    },
    // CADEM v1.1 - Engine metadata
    engineMode: survey.engineMode || 'legacy',
    engineVersion: useCademEngine ? 'cadem-v1.1' : 'legacy-v1',
    persistState: survey.persistState || false,
    // Fixed Sample - Guardar IDs de agentes seleccionados para comparaciones reproducibles
    selectedAgentIds: selectedAgentIds || selectedAgents.map(a => a.agent_id)
  };
  
  // 5. Intentar persistir en DB (Sprint 11B)
  const isDbAvailable = await isSurveyRunPersistenceAvailable();
  if (isDbAvailable) {
    try {
      const dbRun = await createSurveyRunDb(localRun);
      if (dbRun) {
        // Usar el ID de la DB pero mantener las respuestas en local
        localRun.id = dbRun.id;
        console.log(`  💾 Survey run persisted to DB: ${dbRun.id}`);
      }
    } catch (error) {
      console.warn('[SurveyService] Failed to persist run to DB:', error);
    }
  }
  
  // 5.5 Persistir respuestas individuales (Sprint 11D)
  const isResponsesDbAvailable = await isSurveyResponsePersistenceAvailable();
  if (isResponsesDbAvailable && responses.length > 0) {
    try {
      // Crear snapshots de agentes para trazabilidad
      const agentSnapshots = new Map<string, Record<string, unknown>>();
      for (const agent of selectedAgents) {
        agentSnapshots.set(agent.agent_id, {
          age: agent.age,
          sex: agent.sex,
          education_level: agent.education_level,
          income_decile: agent.income_decile,
          connectivity_level: agent.connectivity_level,
          region_code: agent.region_code,
          comuna_code: agent.comuna_code,
        });
      }
      
      const saved = await saveSurveyResponses(localRun.id, survey.id, responses, agentSnapshots);
      if (saved) {
        console.log(`  💾 Survey responses persisted to DB: ${responses.length} responses`);
      }
    } catch (error) {
      console.warn('[SurveyService] Failed to persist responses to DB:', error);
    }
  }
  
  // 6. Guardar en cache local (siempre)
  surveyRuns.set(localRun.id, localRun);
  console.log(`  ✅ Survey run completed: ${localRun.id}`);
  
  // 7. Generar resultados agregados
  const results = generateSurveyResults(survey, localRun);
  surveyResults.set(results.surveyId, results);
  
  // 8. Intentar persistir resultados en DB (Sprint 11C)
  const isResultsDbAvailable = await isSurveyResultPersistenceAvailable();
  if (isResultsDbAvailable) {
    try {
      const saved = await saveSurveyResultsDb(results);
      if (saved) {
        console.log(`  📊 Survey results persisted to DB for run: ${localRun.id}`);
      }
    } catch (error) {
      console.warn('[SurveyService] Failed to persist results to DB:', error);
    }
  }
  
  return localRun;
}

/**
 * Obtiene una ejecución por ID
 * Sprint 11B - Intenta DB primero, fallback a local
 */
export async function getSurveyRun(runId: string): Promise<SurveyRun | undefined> {
  // Primero buscar en cache local
  const localRun = surveyRuns.get(runId);
  if (localRun) return localRun;
  
  // Si no está en cache y DB está disponible, buscar en DB
  const isDbAvailable = await isSurveyRunPersistenceAvailable();
  if (isDbAvailable) {
    try {
      const dbRun = await getSurveyRunById(runId);
      if (dbRun) {
        // Cachear localmente (sin respuestas, solo metadata)
        surveyRuns.set(dbRun.id, dbRun);
        return dbRun;
      }
    } catch (error) {
      console.warn('[SurveyService] Error fetching run from DB:', error);
    }
  }
  
  return undefined;
}

/**
 * Obtiene todas las ejecuciones de una encuesta
 * Sprint 11B - Sincroniza desde DB si está disponible
 */
export async function getSurveyRuns(surveyId: string): Promise<SurveyRun[]> {
  // Si DB está disponible, cargar runs persistidos
  const isDbAvailable = await isSurveyRunPersistenceAvailable();
  if (isDbAvailable) {
    try {
      const dbRuns = await getSurveyRunsBySurveyId(surveyId);
      // Merge: DB runs tienen prioridad, pero mantener respuestas locales si existen
      for (const dbRun of dbRuns) {
        const localRun = surveyRuns.get(dbRun.id);
        if (localRun) {
          // Mantener respuestas locales, usar metadata de DB
          surveyRuns.set(dbRun.id, { ...dbRun, responses: localRun.responses });
        } else {
          surveyRuns.set(dbRun.id, dbRun);
        }
      }
    } catch (error) {
      console.warn('[SurveyService] Error loading runs from DB:', error);
    }
  }
  
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
 * Sprint 11C - Intenta DB primero, fallback a local
 */
export async function getSurveyResults(surveyId: string): Promise<SurveyResult | undefined> {
  // Primero buscar en cache local
  const localResult = surveyResults.get(surveyId);
  if (localResult) return localResult;
  
  // Si no está en cache y DB está disponible, buscar en DB
  const isDbAvailable = await isSurveyResultPersistenceAvailable();
  if (isDbAvailable) {
    try {
      const dbResult = await getSurveyResultsBySurveyId(surveyId);
      if (dbResult) {
        // Cachear localmente
        surveyResults.set(surveyId, dbResult);
        return dbResult;
      }
    } catch (error) {
      console.warn('[SurveyService] Error fetching results from DB:', error);
    }
  }
  
  return undefined;
}

/**
 * Obtiene resultados de una corrida específica
 * Sprint 11C - Intenta DB primero, fallback a local
 */
export async function getSurveyResultsByRun(runId: string): Promise<SurveyResult | undefined> {
  // Buscar en cache local por runId
  const localResult = Array.from(surveyResults.values()).find(r => r.runId === runId);
  if (localResult) return localResult;
  
  // Si no está en cache y DB está disponible, buscar en DB
  const isDbAvailable = await isSurveyResultPersistenceAvailable();
  if (isDbAvailable) {
    try {
      const dbResult = await getSurveyResultsByRunId(runId);
      if (dbResult) {
        // Cachear localmente
        surveyResults.set(dbResult.surveyId, dbResult);
        return dbResult;
      }
    } catch (error) {
      console.warn('[SurveyService] Error fetching results by run from DB:', error);
    }
  }
  
  return undefined;
}

/**
 * @deprecated Usar getSurveyResults(surveyId) o getSurveyResultsByRun(runId)
 */
export function getSurveyResultsSync(surveyId: string): SurveyResult | undefined {
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
// Comparison Functions - Baseline vs Scenario
// ===========================================

export interface ComparisonOptions {
  baselineRunId: string;
  scenarioRunId: string;
}

export interface QuestionComparison {
  questionId: string;
  questionText: string;
  questionType: string;
  baseline: {
    totalResponses: number;
    distribution: Record<string, { count: number; percentage: number; label: string }>;
    average?: number;
    median?: number;
  };
  scenario: {
    totalResponses: number;
    distribution: Record<string, { count: number; percentage: number; label: string }>;
    average?: number;
    median?: number;
  };
  delta: {
    totalResponses: number;
    distribution: Record<string, { countDelta: number; percentageDelta: number; percentagePoints: number }>;
    averageDelta?: number;
    medianDelta?: number;
  };
  impact: {
    level: 'high' | 'medium' | 'low' | 'none';
    score: number; // 0-1, higher means more impact
    description: string;
  };
}

export interface SurveyComparison {
  surveyId: string;
  surveyName: string;
  baselineRunId: string;
  scenarioRunId: string;
  baselineRunName: string;
  scenarioRunName: string;
  scenarioEventId?: string;
  scenarioName?: string;
  generatedAt: string;
  summary: {
    totalQuestions: number;
    questionsWithHighImpact: number;
    questionsWithMediumImpact: number;
    questionsWithLowImpact: number;
    averageImpactScore: number;
  };
  comparisons: QuestionComparison[];
}

/**
 * Compara dos ejecuciones de encuesta: baseline vs escenario
 * Genera un análisis detallado de diferencias e impacto
 */
export async function compareSurveyRuns(
  surveyId: string,
  baselineRunId: string,
  scenarioRunId: string
): Promise<SurveyComparison | null> {
  // Obtener la encuesta
  const survey = await getSurvey(surveyId);
  if (!survey) {
    console.error(`[SurveyService] Survey not found: ${surveyId}`);
    return null;
  }

  // Obtener los runs
  const baselineRun = await getSurveyRun(baselineRunId);
  const scenarioRun = await getSurveyRun(scenarioRunId);

  if (!baselineRun || !scenarioRun) {
    console.error(`[SurveyService] Run not found: baseline=${baselineRunId}, scenario=${scenarioRunId}`);
    return null;
  }

  // Obtener resultados
  const baselineResults = await getSurveyResultsByRun(baselineRunId);
  const scenarioResults = await getSurveyResultsByRun(scenarioRunId);

  if (!baselineResults || !scenarioResults) {
    console.error(`[SurveyService] Results not found`);
    return null;
  }

  // Generar comparaciones por pregunta
  const comparisons: QuestionComparison[] = [];
  let highImpactCount = 0;
  let mediumImpactCount = 0;
  let lowImpactCount = 0;
  let totalImpactScore = 0;

  for (const baselineResult of baselineResults.results) {
    const scenarioResult = scenarioResults.results.find(
      r => r.questionId === baselineResult.questionId
    );

    if (!scenarioResult) continue;

    const comparison = compareQuestionResults(baselineResult, scenarioResult);
    comparisons.push(comparison);

    // Contar impactos
    if (comparison.impact.level === 'high') highImpactCount++;
    else if (comparison.impact.level === 'medium') mediumImpactCount++;
    else if (comparison.impact.level === 'low') lowImpactCount++;

    totalImpactScore += comparison.impact.score;
  }

  const totalQuestions = comparisons.length;
  const averageImpactScore = totalQuestions > 0 ? totalImpactScore / totalQuestions : 0;

  return {
    surveyId: survey.id,
    surveyName: survey.name,
    baselineRunId,
    scenarioRunId,
    baselineRunName: `Baseline (${formatDate(baselineRun.completedAt)})`,
    scenarioRunName: scenarioRun.metadata.scenarioName 
      ? `${scenarioRun.metadata.scenarioName} (${formatDate(scenarioRun.completedAt)})`
      : `Escenario (${formatDate(scenarioRun.completedAt)})`,
    scenarioEventId: scenarioRun.metadata.scenarioEventId,
    scenarioName: scenarioRun.metadata.scenarioName,
    generatedAt: new Date().toISOString(),
    summary: {
      totalQuestions,
      questionsWithHighImpact: highImpactCount,
      questionsWithMediumImpact: mediumImpactCount,
      questionsWithLowImpact: lowImpactCount,
      averageImpactScore: Math.round(averageImpactScore * 100) / 100,
    },
    comparisons,
  };
}

/**
 * Compara los resultados de una pregunta entre baseline y escenario
 */
function compareQuestionResults(
  baseline: QuestionResult,
  scenario: QuestionResult
): QuestionComparison {
  const baselineDist = getNormalizedDistribution(baseline);
  const scenarioDist = getNormalizedDistribution(scenario);

  // Calcular delta de distribución
  const allKeys = new Set([...Object.keys(baselineDist), ...Object.keys(scenarioDist)]);
  const deltaDistribution: Record<string, { countDelta: number; percentageDelta: number; percentagePoints: number }> = {};

  let maxPercentagePointChange = 0;

  for (const key of allKeys) {
    const baselineValue = baselineDist[key] || { count: 0, percentage: 0, label: key };
    const scenarioValue = scenarioDist[key] || { count: 0, percentage: 0, label: key };

    const countDelta = scenarioValue.count - baselineValue.count;
    const percentageDelta = baselineValue.percentage > 0 
      ? ((scenarioValue.percentage - baselineValue.percentage) / baselineValue.percentage)
      : 0;
    const percentagePoints = scenarioValue.percentage - baselineValue.percentage;

    deltaDistribution[key] = {
      countDelta,
      percentageDelta: Math.round(percentageDelta * 1000) / 10,
      percentagePoints: Math.round(percentagePoints * 10) / 10,
    };

    maxPercentagePointChange = Math.max(maxPercentagePointChange, Math.abs(percentagePoints));
  }

  // Calcular delta de estadísticas (para Likert)
  let averageDelta: number | undefined;
  let medianDelta: number | undefined;

  if (baseline.questionType === 'likert_scale' && scenario.questionType === 'likert_scale') {
    const baselineLikert = baseline as LikertResult;
    const scenarioLikert = scenario as LikertResult;

    if (baselineLikert.average !== undefined && scenarioLikert.average !== undefined) {
      averageDelta = Math.round((scenarioLikert.average - baselineLikert.average) * 100) / 100;
    }
    if (baselineLikert.median !== undefined && scenarioLikert.median !== undefined) {
      medianDelta = scenarioLikert.median - baselineLikert.median;
    }
  }

  // Calcular nivel de impacto
  const impactScore = Math.min(maxPercentagePointChange / 20, 1); // 20 percentage points = max impact
  let impactLevel: 'high' | 'medium' | 'low' | 'none';
  let impactDescription: string;

  if (impactScore >= 0.5) {
    impactLevel = 'high';
    impactDescription = 'Impacto significativo detectado';
  } else if (impactScore >= 0.25) {
    impactLevel = 'medium';
    impactDescription = 'Impacto moderado detectado';
  } else if (impactScore >= 0.1) {
    impactLevel = 'low';
    impactDescription = 'Impacto leve detectado';
  } else {
    impactLevel = 'none';
    impactDescription = 'Sin impacto significativo';
  }

  return {
    questionId: baseline.questionId,
    questionText: baseline.questionText,
    questionType: baseline.questionType,
    baseline: {
      totalResponses: baseline.totalResponses,
      distribution: baselineDist,
      ...(baseline.questionType === 'likert_scale' && {
        average: (baseline as LikertResult).average,
        median: (baseline as LikertResult).median,
      }),
    },
    scenario: {
      totalResponses: scenario.totalResponses,
      distribution: scenarioDist,
      ...(scenario.questionType === 'likert_scale' && {
        average: (scenario as LikertResult).average,
        median: (scenario as LikertResult).median,
      }),
    },
    delta: {
      totalResponses: scenario.totalResponses - baseline.totalResponses,
      distribution: deltaDistribution,
      ...(averageDelta !== undefined && { averageDelta }),
      ...(medianDelta !== undefined && { medianDelta }),
    },
    impact: {
      level: impactLevel,
      score: Math.round(impactScore * 100) / 100,
      description: impactDescription,
    },
  };
}

/**
 * Normaliza la distribución de resultados al formato estándar
 */
function getNormalizedDistribution(result: QuestionResult): Record<string, { count: number; percentage: number; label: string }> {
  if (result.questionType === 'single_choice') {
    return (result as SingleChoiceResult).distribution;
  }

  if (result.questionType === 'likert_scale') {
    const likert = result as LikertResult;
    const normalized: Record<string, { count: number; percentage: number; label: string }> = {};
    
    for (const [key, value] of Object.entries(likert.distribution)) {
      normalized[key] = {
        count: value.count,
        percentage: value.percentage,
        label: `Escala ${key}`,
      };
    }
    return normalized;
  }

  return {};
}

function formatDate(isoString: string): string {
  return new Date(isoString).toLocaleDateString('es-CL', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// ===========================================
// Export Functions - Sprint 13 - Enhanced Reporting
// ===========================================

export interface ExportOptions {
  includeMetadata?: boolean;
  includeRawResponses?: boolean;
  dateFormat?: 'iso' | 'locale';
  filename?: string;
}

/**
 * Genera un nombre de archivo consistente para exportaciones
 */
export function generateExportFilename(
  survey: SurveyDefinition, 
  runId: string, 
  format: 'json' | 'csv'
): string {
  const date = new Date().toISOString().split('T')[0];
  const sanitizedName = survey.name
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .substring(0, 30);
  return `pulso-social-${sanitizedName}-${date}-${runId.substring(0, 8)}.${format}`;
}

/**
 * Exporta resultados de una encuesta a JSON (mejorado)
 * Incluye metadatos completos y estructura jerárquica clara
 */
export function exportResultsToJson(
  survey: SurveyDefinition, 
  results: SurveyResult,
  run?: SurveyRun,
  options: ExportOptions = {}
): string {
  const { includeMetadata = true, includeRawResponses = false, dateFormat = 'iso' } = options;
  
  const formatDate = (dateStr: string) => {
    if (dateFormat === 'locale') {
      return new Date(dateStr).toLocaleString('es-CL');
    }
    return dateStr;
  };
  
  const exportData: any = {
    exportInfo: {
      version: '2.0',
      exportedAt: formatDate(new Date().toISOString()),
      format: 'json',
      tool: 'Pulsos Sociales - Encuestas Sintéticas'
    },
    survey: {
      id: survey.id,
      name: survey.name,
      description: survey.description,
      createdAt: formatDate(survey.createdAt),
      sampleSize: survey.sampleSize,
      segment: survey.segment,
      questions: survey.questions.map(q => ({
        id: q.id,
        type: q.type,
        text: q.text,
        required: q.required,
        ...(q.type === 'single_choice' && { options: (q as any).options }),
        ...(q.type === 'likert_scale' && { 
          min: (q as any).min, 
          max: (q as any).max,
          minLabel: (q as any).minLabel,
          maxLabel: (q as any).maxLabel
        })
      }))
    },
    execution: {
      runId: results.runId,
      executedAt: formatDate(results.generatedAt),
      summary: {
        totalQuestions: results.summary.totalQuestions,
        totalResponses: results.summary.totalResponses,
        uniqueAgents: results.summary.uniqueAgents,
        responseRate: 100 // Tasa de respuesta siempre 100% (todos los agentes seleccionados responden todas las preguntas)
      }
    },
    results: results.results.map(result => {
      const base = {
        questionId: result.questionId,
        questionType: result.questionType,
        questionText: result.questionText,
        totalResponses: result.totalResponses
      };
      
      if (result.questionType === 'single_choice') {
        const sc = result as SingleChoiceResult;
        return {
          ...base,
          distribution: Object.entries(sc.distribution).map(([key, data]) => ({
            option: key,
            label: data.label,
            count: data.count,
            percentage: data.percentage
          })).sort((a, b) => b.count - a.count)
        };
      } else if (result.questionType === 'likert_scale') {
        const likert = result as LikertResult;
        return {
          ...base,
          statistics: {
            average: likert.average,
            median: likert.median,
            minLabel: likert.minLabel,
            maxLabel: likert.maxLabel
          },
          distribution: Object.entries(likert.distribution).map(([key, data]) => ({
            value: parseInt(key),
            count: data.count,
            percentage: data.percentage
          }))
        };
      }
      return base;
    })
  };
  
  // Incluir metadatos adicionales si se solicita
  if (includeMetadata && run) {
    exportData.execution.metadata = {
      segmentMatched: run.metadata.segmentMatched,
      sampleSizeRequested: run.metadata.sampleSizeRequested,
      sampleSizeActual: run.metadata.sampleSizeActual,
      executionTime: new Date(run.completedAt).getTime() - new Date(run.startedAt).getTime()
    };
  }
  
  // Incluir respuestas raw si se solicita
  if (includeRawResponses && run) {
    exportData.rawResponses = run.responses.map(r => ({
      agentId: r.agentId,
      questionId: r.questionId,
      value: r.value,
      confidence: r.confidence,
      reasoning: r.reasoning
    }));
  }
  
  return JSON.stringify(exportData, null, 2);
}

/**
 * Exporta resultados de una encuesta a CSV (mejorado)
 * Genera formato tabular limpio y analizable
 */
export function exportResultsToCsv(
  survey: SurveyDefinition,
  results: SurveyResult,
  run?: SurveyRun,
  _options: ExportOptions = {}
): string {
  const lines: string[] = [];

  // Header informativo
  lines.push('# Pulsos Sociales - Exportación de Resultados');
  lines.push('# Formato: CSV v2.0');
  lines.push('#');
  lines.push('# INFORMACIÓN DE ENCUESTA');
  lines.push('Survey ID,' + escapeCsv(survey.id));
  lines.push('Survey Name,' + escapeCsv(survey.name));
  lines.push('Description,' + escapeCsv(survey.description || ''));
  lines.push('Created At,' + escapeCsv(survey.createdAt));
  lines.push('');
  lines.push('# INFORMACIÓN DE EJECUCIÓN');
  lines.push('Run ID,' + escapeCsv(results.runId));
  lines.push('Generated At,' + escapeCsv(results.generatedAt));
  if (run) {
    lines.push('Total Agents,' + run.totalAgents);
    lines.push('Segment Matched,' + run.metadata.segmentMatched);
  }
  lines.push('');
  
  // Resumen ejecutivo
  lines.push('# RESUMEN EJECUTIVO');
  lines.push('Metric,Value');
  lines.push('Total Questions,' + results.summary.totalQuestions);
  lines.push('Total Responses,' + results.summary.totalResponses);
  lines.push('Unique Agents,' + results.summary.uniqueAgents);
  lines.push('Response Rate,100%');
  lines.push('');
  
  // Resultados detallados - formato tabular
  lines.push('# RESULTADOS DETALLADOS');
  
  results.results.forEach((result, index) => {
    lines.push('');
    lines.push('## Question ' + (index + 1) + ': ' + escapeCsv(result.questionText.substring(0, 50)));
    lines.push('Question ID,' + escapeCsv(result.questionId));
    lines.push('Type,' + escapeCsv(result.questionType));
    lines.push('Total Responses,' + result.totalResponses);
    
    if (result.questionType === 'single_choice') {
      const scResult = result as SingleChoiceResult;
      lines.push('');
      lines.push('Option,Count,Percentage');
      Object.entries(scResult.distribution)
        .sort(([, a], [, b]) => b.count - a.count)
        .forEach(([, data]) => {
          lines.push(escapeCsv(data.label) + ',' + data.count + ',' + data.percentage + '%');
        });
    } else if (result.questionType === 'likert_scale') {
      const likertResult = result as LikertResult;
      lines.push('Average,' + likertResult.average);
      lines.push('Median,' + likertResult.median);
      lines.push('');
      lines.push('Scale (' + likertResult.minLabel + ' - ' + likertResult.maxLabel + '),Count,Percentage');
      Object.entries(likertResult.distribution)
        .sort(([a], [b]) => parseInt(a) - parseInt(b))
        .forEach(([key, data]) => {
          lines.push(key + ',' + data.count + ',' + data.percentage + '%');
        });
    }
  });
  
  return lines.join('\n');
}

/**
 * Exporta múltiples runs de una encuesta para análisis comparativo
 */
export function exportRunsComparison(
  survey: SurveyDefinition,
  runs: SurveyRun[],
  results: SurveyResult[]
): string {
  const lines: string[] = [];
  
  lines.push('# Pulsos Sociales - Comparación de Ejecuciones');
  lines.push('# Survey: ' + escapeCsv(survey.name));
  lines.push('# Generated: ' + new Date().toISOString());
  lines.push('');
  
  // Tabla de runs
  lines.push('# HISTORIAL DE EJECUCIONES');
  lines.push('Run #,Run ID,Date,Agents,Responses,Status');
  runs.forEach((run, index) => {
    lines.push([
      runs.length - index,
      run.id.substring(0, 8),
      new Date(run.completedAt).toLocaleDateString('es-CL'),
      run.totalAgents,
      run.responses.length,
      'Completed'
    ].join(','));
  });
  lines.push('');
  
  // Comparación de métricas clave por run
  lines.push('# COMPARACIÓN DE MÉTRICAS');
  lines.push('Question,Metric,' + runs.map((_, i) => 'Run ' + (runs.length - i)).join(','));
  
  if (results.length > 0 && results[0]) {
    results[0].results.forEach((question, qIndex) => {
      if (question.questionType === 'likert_scale') {
        const metric = 'Average';
        const values = results.map(r => {
          const q = r.results[qIndex] as LikertResult;
          return q ? q.average.toFixed(2) : 'N/A';
        });
        lines.push(escapeCsv(question.questionText.substring(0, 40)) + ',' + metric + ',' + values.join(','));
      }
    });
  }
  
  return lines.join('\n');
}

/**
 * Escapa un valor para CSV
 */
function escapeCsv(value: string | number): string {
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}

/**
 * Descarga un archivo con el contenido proporcionado
 */
export function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// ===========================================
// CADEM v1.1 - Helper Functions
// ===========================================

/**
 * Convierte SyntheticAgent a CademAdapterAgent
 */
function convertToCademAgent(agent: SyntheticAgent): CademAdapterAgent {
  return {
    agentId: agent.agent_id,
    age: agent.age ?? undefined,
    sex: agent.sex ?? undefined,
    educationLevel: agent.education_level ?? undefined,
    incomeDecile: agent.income_decile ?? undefined,
    povertyStatus: agent.poverty_status ?? undefined,
    regionCode: agent.region_code ?? undefined,
    communeCode: agent.comuna_code ?? undefined,
    connectivityLevel: agent.connectivity_level ?? undefined,
    digitalExposure: undefined, // Not available in SyntheticAgent
    preferredChannel: undefined, // Not available in SyntheticAgent
    agentType: agent.agent_type ?? undefined,
  };
}

/**
 * Convierte SurveyQuestion a CademSurveyQuestion
 */
function convertToCademQuestion(question: SurveyQuestion): import('./cademAdapter').CademSurveyQuestion {
  const baseQuestion = {
    id: question.id,
    text: question.text,
    type: question.type,
  };

  if (question.type === 'single_choice' || question.type === 'multiple_choice') {
    const q = question as { options: { label: string; value: string | number }[] };
    return {
      ...baseQuestion,
      options: q.options.map(opt => String(opt.value)),
    };
  }

  if (question.type === 'likert_scale') {
    const q = question as { min: number; max: number };
    // Generate options for likert scale
    const options: string[] = [];
    for (let i = q.min; i <= q.max; i++) {
      options.push(String(i));
    }
    return {
      ...baseQuestion,
      options,
    };
  }

  return baseQuestion;
}

/**
 * Mapea valores internos del motor CADEM a valores de opciones de la pregunta
 * Basado en la familia de la pregunta y las opciones disponibles
 */
function mapCademValueToOption(
  cademValue: string,
  question: SurveyQuestion
): string | number {
  // Si la pregunta no tiene opciones, devolver el valor tal cual
  if (question.type !== 'single_choice' && question.type !== 'multiple_choice') {
    return cademValue;
  }

  const q = question as { options: { label: string; value: string | number }[] };
  const options = q.options;

  // Mapeo para preguntas de aprobación (approval)
  // Valores CADEM: 'approve', 'disapprove', 'no_response'
  // Opciones típicas: ['Aprueba', 'Desaprueba', 'No responde']
  if (cademValue === 'approve') {
    // Buscar opción que contenga "aprueba" (case insensitive)
    const opt = options.find(o => o.label.toLowerCase().includes('aprueba'));
    if (opt) return opt.value;
  }
  if (cademValue === 'disapprove') {
    const opt = options.find(o => o.label.toLowerCase().includes('desaprueba'));
    if (opt) return opt.value;
  }

  // Mapeo para preguntas de dirección (direction)
  // Valores CADEM: 'good_path', 'bad_path', 'no_response'
  // Opciones típicas: ['Buen camino', 'Mal camino', 'No responde']
  if (cademValue === 'good_path') {
    const opt = options.find(o => o.label.toLowerCase().includes('buen'));
    if (opt) return opt.value;
  }
  if (cademValue === 'bad_path') {
    const opt = options.find(o => o.label.toLowerCase().includes('mal'));
    if (opt) return opt.value;
  }

  // Mapeo para preguntas de optimismo (optimism)
  // Valores CADEM: 'very_optimistic', 'optimistic', 'pessimistic', 'very_pessimistic', 'no_response'
  // Opciones típicas: ['Muy optimista', 'Optimista', 'Pesimista', 'Muy pesimista', 'No responde']
  if (cademValue === 'very_optimistic') {
    const opt = options.find(o => o.label.toLowerCase().includes('muy optimista'));
    if (opt) return opt.value;
    // Fallback: buscar solo "optimista" y tomar la primera
    const opts = options.filter(o => o.label.toLowerCase().includes('optimista'));
    if (opts.length > 0) return opts[0].value;
  }
  if (cademValue === 'optimistic') {
    const opt = options.find(o => 
      o.label.toLowerCase() === 'optimista' || 
      (o.label.toLowerCase().includes('optimista') && !o.label.toLowerCase().includes('muy'))
    );
    if (opt) return opt.value;
  }
  if (cademValue === 'pessimistic') {
    const opt = options.find(o => 
      o.label.toLowerCase() === 'pesimista' || 
      (o.label.toLowerCase().includes('pesimista') && !o.label.toLowerCase().includes('muy'))
    );
    if (opt) return opt.value;
  }
  if (cademValue === 'very_pessimistic') {
    const opt = options.find(o => o.label.toLowerCase().includes('muy pesimista'));
    if (opt) return opt.value;
    const opts = options.filter(o => o.label.toLowerCase().includes('pesimista'));
    if (opts.length > 0) return opts[opts.length - 1].value;
  }

  // Mapeo para preguntas de percepción económica (economic_perception)
  // Valores CADEM: 'very_good', 'good', 'bad', 'very_bad', 'no_response'
  // Opciones típicas: ['Muy buena', 'Buena', 'Mala', 'Muy mala', 'No responde']
  if (cademValue === 'very_good') {
    const opt = options.find(o => o.label.toLowerCase().includes('muy buena') || o.label.toLowerCase().includes('muy bueno'));
    if (opt) return opt.value;
    const opts = options.filter(o => o.label.toLowerCase().includes('buena') || o.label.toLowerCase().includes('bueno'));
    if (opts.length > 0) return opts[0].value;
  }
  if (cademValue === 'good') {
    const opt = options.find(o => 
      o.label.toLowerCase() === 'buena' || o.label.toLowerCase() === 'bueno' ||
      ((o.label.toLowerCase().includes('buena') || o.label.toLowerCase().includes('bueno')) && 
       !(o.label.toLowerCase().includes('muy')))
    );
    if (opt) return opt.value;
  }
  if (cademValue === 'bad') {
    const opt = options.find(o => 
      o.label.toLowerCase() === 'mala' || o.label.toLowerCase() === 'malo' ||
      ((o.label.toLowerCase().includes('mala') || o.label.toLowerCase().includes('malo')) && 
       !(o.label.toLowerCase().includes('muy')))
    );
    if (opt) return opt.value;
  }
  if (cademValue === 'very_bad') {
    const opt = options.find(o => o.label.toLowerCase().includes('muy mala') || o.label.toLowerCase().includes('muy malo'));
    if (opt) return opt.value;
    const opts = options.filter(o => o.label.toLowerCase().includes('mala') || o.label.toLowerCase().includes('malo'));
    if (opts.length > 0) return opts[opts.length - 1].value;
  }

  // Mapeo para no_response
  if (cademValue === 'no_response') {
    const opt = options.find(o => 
      o.label.toLowerCase().includes('no responde') || 
      o.label.toLowerCase().includes('no sabe') ||
      o.label.toLowerCase().includes('no contesta')
    );
    if (opt) return opt.value;
  }

  // Si no se encontró mapeo, devolver el primer valor de opción como fallback
  console.warn(`[SurveyService] No mapping found for CADEM value "${cademValue}" in question "${question.text.substring(0, 50)}...". Using fallback.`);
  if (options.length > 0) {
    return options[0].value;
  }

  return cademValue;
}

/**
 * Ejecuta encuesta con motor CADEM v1.1
 * Convierte tipos y delega al surveyRunner unificado
 */
async function runCademSurveyWithAgents(
  survey: SurveyDefinition,
  agents: SyntheticAgent[]
): Promise<AgentResponse[]> {
  // Convertir agentes
  const cademAgents = agents.map(convertToCademAgent);

  // Convertir preguntas
  const cademQuestions = survey.questions.map(convertToCademQuestion);

  // Crear definición CADEM
  const cademSurveyDef: CademSurveyDefinition = {
    id: survey.id,
    title: survey.name,
    topic: survey.description,
    questions: cademQuestions,
  };

  // Ejecutar con surveyRunner unificado
  const result = await runUnifiedSurvey({
    surveyDefinition: cademSurveyDef,
    agents: cademAgents,
    engineMode: 'cadem',
    persistState: survey.persistState || false,
  });

  // Convertir respuestas al formato AgentResponse
  // Mapear los valores internos de CADEM a los valores de opciones de la pregunta
  return result.responses.map(r => {
    const question = survey.questions.find(q => q.id === r.questionId);
    const mappedValue = question 
      ? mapCademValueToOption(String(r.value), question)
      : r.value;
    
    return {
      agentId: r.agentId,
      questionId: r.questionId,
      value: mappedValue,
      confidence: r.confidence,
      reasoning: r.reasoning ?? '', // Ensure string, not undefined
    };
  });
}

// ===========================================
// Fixed Sample Comparison Functions
// ===========================================

export interface RunComparisonOptions {
  surveyId: string;
  baselineRunId: string;
  scenarioEventId?: string;
}

export interface RunComparisonResult {
  baselineRun: SurveyRun;
  scenarioRun: SurveyRun;
  comparison: SurveyComparison | null;
}

/**
 * Ejecuta una encuesta con los mismos agentes que un baseline run existente.
 * Esto permite comparaciones válidas baseline vs escenario donde la única
 * diferencia es el escenario, no la muestra de agentes.
 * 
 * @param options - Opciones de comparación
 * @returns Resultado de la comparación con ambos runs
 */
export async function runSurveyWithFixedAgents(
  options: RunComparisonOptions
): Promise<RunComparisonResult> {
  const { surveyId, baselineRunId, scenarioEventId } = options;
  
  // 1. Obtener el baseline run
  const baselineRun = await getSurveyRun(baselineRunId);
  if (!baselineRun) {
    throw new Error(`Baseline run not found: ${baselineRunId}`);
  }
  
  // 2. Extraer los agent IDs del baseline
  const fixedAgentIds = baselineRun.selectedAgentIds;
  if (!fixedAgentIds || fixedAgentIds.length === 0) {
    throw new Error(`Baseline run ${baselineRunId} does not have selectedAgentIds. Cannot perform fixed sample comparison.`);
  }
  
  console.log(`🔒 Running survey with fixed sample from baseline ${baselineRunId}`);
  console.log(`   Using ${fixedAgentIds.length} agents from baseline`);
  
  // 3. Ejecutar el survey con los agentes fijos y el escenario
  const scenarioRun = await runSurvey(surveyId, scenarioEventId, fixedAgentIds);
  
  // 4. Generar la comparación
  const comparison = await compareSurveyRuns(surveyId, baselineRunId, scenarioRun.id);
  
  return {
    baselineRun,
    scenarioRun,
    comparison
  };
}

/**
 * Ejecuta un baseline y luego un escenario con los mismos agentes.
 * Función de conveniencia para hacer comparaciones de una sola vez.
 * 
 * @param surveyId - ID de la encuesta
 * @param scenarioEventId - ID del escenario (opcional, si no se proporciona solo se ejecuta baseline)
 * @returns Resultado con baseline y escenario (si se proporcionó scenarioEventId)
 */
export async function runBaselineAndScenario(
  surveyId: string,
  scenarioEventId?: string
): Promise<{ baselineRun: SurveyRun; scenarioRun?: SurveyRun; comparison?: SurveyComparison | null }> {
  console.log(`🔄 Running baseline${scenarioEventId ? ' + scenario' : ''} for survey ${surveyId}`);
  
  // 1. Ejecutar baseline (sin escenario, sin agentes fijos)
  const baselineRun = await runSurvey(surveyId);
  console.log(`✅ Baseline completed: ${baselineRun.id} with ${baselineRun.totalAgents} agents`);
  
  // Si no hay escenario, retornar solo el baseline
  if (!scenarioEventId) {
    return { baselineRun };
  }
  
  // 2. Ejecutar escenario con los mismos agentes del baseline
  const scenarioRun = await runSurvey(surveyId, scenarioEventId, baselineRun.selectedAgentIds);
  console.log(`✅ Scenario completed: ${scenarioRun.id} with ${scenarioRun.totalAgents} agents`);
  
  // 3. Generar comparación
  const comparison = await compareSurveyRuns(surveyId, baselineRun.id, scenarioRun.id);
  
  return {
    baselineRun,
    scenarioRun,
    comparison
  };
}

// ===========================================
// Survey Analysis Integration - MVP
// ===========================================

/**
 * Obtiene el análisis enriquecido de la ejecución más reciente de una encuesta.
 * Busca explícitamente el run más reciente y sus resultados asociados.
 *
 * NOTA: Si una encuesta tiene múltiples runs, esta función analiza el más reciente.
 * Para analizar un run específico, usar `getSurveyAnalysisByRun(runId)`.
 *
 * @param surveyId - ID de la encuesta
 * @returns Análisis enriquecido o undefined si no hay datos suficientes
 */
export async function getSurveyAnalysis(surveyId: string): Promise<SurveyAnalysis | undefined> {
  // 1. Obtener todos los runs de la encuesta (ordenados por fecha, más reciente primero)
  const runs = await getSurveyRuns(surveyId);
  if (runs.length === 0) {
    console.warn(`[SurveyService] No runs found for survey ${surveyId}`);
    return undefined;
  }

  // 2. Tomar el run más reciente
  const latestRun = runs[0];

  // 3. Obtener resultados específicos de ese run
  const results = await getSurveyResultsByRun(latestRun.id);
  if (!results) {
    console.warn(`[SurveyService] No results found for run ${latestRun.id}`);
    return undefined;
  }

  // 4. Generar análisis enriquecido
  try {
    const analysis = analyzeSurveyResult(results, latestRun);
    console.debug(`[SurveyService] Analysis generated for survey ${surveyId} (run ${latestRun.id}): ${analysis.summary.supportedQuestions}/${analysis.summary.totalQuestions} questions analyzed`);
    return analysis;
  } catch (error) {
    console.error(`[SurveyService] Error generating analysis for survey ${surveyId}:`, error);
    return undefined;
  }
}

/**
 * Obtiene el análisis enriquecido de una ejecución específica por su ID.
 * Útil para analizar runs individuales de forma precisa.
 *
 * NOTA: Carga las respuestas individuales desde la DB para calcular métricas
 * como confidence que requieren datos a nivel de agente.
 *
 * @param runId - ID de la ejecución
 * @returns Análisis enriquecido o undefined si no hay datos suficientes
 */
export async function getSurveyAnalysisByRun(runId: string): Promise<SurveyAnalysis | undefined> {
  // 1. Obtener el run
  const run = await getSurveyRun(runId);
  if (!run) {
    console.warn(`[SurveyService] Run not found: ${runId}`);
    return undefined;
  }

  // 2. Obtener resultados del run
  const results = await getSurveyResultsByRun(runId);
  if (!results) {
    console.warn(`[SurveyService] No results found for run ${runId}`);
    return undefined;
  }

  // 3. Cargar respuestas individuales desde DB si no están en caché
  // Esto es necesario para calcular métricas como confidence
  if (!run.responses || run.responses.length === 0) {
    try {
      const isAvailable = await isSurveyResponsePersistenceAvailable();
      if (isAvailable) {
        const responses = await getSurveyResponsesByRunId(runId);
        if (responses && responses.length > 0) {
          run.responses = responses;
          console.log(`[SurveyService] Loaded ${responses.length} responses from DB for run ${runId}`);
        } else {
          console.warn(`[SurveyService] No responses found in DB for run ${runId}`);
        }
      }
    } catch (error) {
      console.warn(`[SurveyService] Error loading responses for run ${runId}:`, error);
      // Continuar sin respuestas - el análisis funcionará pero sin confidence
    }
  }

  // 4. Generar análisis enriquecido
  try {
    const analysis = analyzeSurveyResult(results, run);
    console.debug(`[SurveyService] Analysis generated for run ${runId}: ${analysis.summary.supportedQuestions}/${analysis.summary.totalQuestions} questions analyzed`);
    return analysis;
  } catch (error) {
    console.error(`[SurveyService] Error generating analysis for run ${runId}:`, error);
    return undefined;
  }
}

/**
 * Obtiene el análisis enriquecido de forma síncrona (solo si hay datos en caché local).
 * No realiza llamadas a la base de datos.
 *
 * NOTA IMPORTANTE: Esta función usa el último resultado cacheado bajo el surveyId,
 * que puede no ser el run más reciente si hay múltiples ejecuciones.
 * Para análisis preciso de un run específico, usar `getSurveyAnalysisByRun()`.
 *
 * @param surveyId - ID de la encuesta
 * @returns Análisis enriquecido o undefined si no hay datos en caché
 */
export function getSurveyAnalysisSync(surveyId: string): SurveyAnalysis | undefined {
  // 1. Buscar resultados en caché local (puede ser cualquier run asociado a la encuesta)
  const results = surveyResults.get(surveyId);
  if (!results) {
    return undefined;
  }

  // 2. Buscar run en caché local (opcional)
  const run = results.runId ? surveyRuns.get(results.runId) : undefined;

  // 3. Generar análisis enriquecido
  try {
    return analyzeSurveyResult(results, run);
  } catch (error) {
    console.error(`[SurveyService] Error generating sync analysis for survey ${surveyId}:`, error);
    return undefined;
  }
}

// ===========================================
// Sample Surveys
// ===========================================

/**
 * Crea encuestas de ejemplo para demostración
 */
export async function createSampleSurveys(): Promise<void> {
  const existingSurveys = await getAllSurveys();
  if (existingSurveys.length > 0) return; // Ya existen encuestas
  
  // Encuesta 1: Satisfacción con servicios digitales (legacy mode)
  await createSurvey({
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
    ],
    engineMode: 'legacy', // Default to legacy for sample surveys
    persistState: false,
  });
  
  // Encuesta 2: Preocupaciones económicas (CADEM mode)
  await createSurvey({
    name: 'Preocupaciones Económicas (CADEM)',
    description: 'Entender las preocupaciones económicas usando el motor CADEM v1.1',
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
    ],
    engineMode: 'cadem', // Use CADEM engine
    persistState: true,  // Persist agent state
  });
  
  console.log('📋 Sample surveys created (including CADEM v1.1 example)');
}
