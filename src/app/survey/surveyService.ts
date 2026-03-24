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
 * Elimina una encuesta
 * Elimina de DB si está disponible, y siempre de cache local
 */
export async function deleteSurvey(id: string): Promise<boolean> {
  await syncFromDatabase();
  
  // Intentar eliminar de DB primero
  const isAvailable = await isSurveyPersistenceAvailable();
  if (isAvailable) {
    try {
      await deleteSurveyDefinition(id);
    } catch (error) {
      console.warn('[SurveyService] Error deleting from DB:', error);
    }
  }
  
  // Siempre eliminar de cache local
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
 * Sprint 11B - Persiste la corrida en Supabase (sin respuestas)
 */
export async function runSurvey(surveyId: string): Promise<SurveyRun> {
  const survey = await getSurvey(surveyId);
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
      sampleSizeActual: selectedAgents.length
    }
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
        responseRate: Math.round((results.summary.totalResponses / results.summary.uniqueAgents) * 1000) / 10
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
  lines.push('Response Rate,' + Math.round((results.summary.totalResponses / results.summary.uniqueAgents) * 1000) / 10 + '%');
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
// Sample Surveys
// ===========================================

/**
 * Crea encuestas de ejemplo para demostración
 */
export async function createSampleSurveys(): Promise<void> {
  const existingSurveys = await getAllSurveys();
  if (existingSurveys.length > 0) return; // Ya existen encuestas
  
  // Encuesta 1: Satisfacción con servicios digitales
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
    ]
  });
  
  // Encuesta 2: Preocupaciones económicas
  await createSurvey({
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
