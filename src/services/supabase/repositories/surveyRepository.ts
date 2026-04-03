/**
 * Survey Repository - Sprint 11A
 * 
 * Persistencia mínima de definiciones de encuestas.
 * Solo guarda/lee survey_definitions, sin runs ni results.
 * 
 * Estrategia:
 * - Si Supabase está disponible: usa DB
 * - Si no: devuelve null/empty (fallback en surveyService)
 */

import { getSupabaseClient, safeQuery } from '../client';
import type { 
  SurveyDefinition, 
  SurveyRun, 
  SurveyResult,
  AgentResponse
} from '../../../types/survey';
import type { DbSurveyDefinition, DbSurveyQuestion, DbSurveyRun, DbSurveyResult } from '../../../types/database';

// ===========================================
// Type Mappers
// ===========================================

/**
 * Convierte SurveyDefinition (app) a DbSurveyDefinition (DB)
 */
function toDbSurveyDefinition(def: Omit<SurveyDefinition, 'id' | 'createdAt'> & { id?: string; createdAt?: string }): Omit<DbSurveyDefinition, 'id' | 'created_at' | 'updated_at'> {
  // Generar slug desde nombre
  const slug = def.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    + '-' + Date.now().toString(36).slice(-4);

  // Mapear segmento
  const segment: DbSurveyDefinition['segment'] = {};
  if (def.segment.regionCode) segment.region_codes = [def.segment.regionCode];
  if (def.segment.comunaCode) segment.comuna_codes = [def.segment.comunaCode];
  if (def.segment.sex) segment.sex = [def.segment.sex as 'male' | 'female'];
  if (def.segment.ageGroup) segment.age_groups = [def.segment.ageGroup as 'child' | 'youth' | 'adult' | 'middle_age' | 'senior'];
  if (def.segment.incomeDecile) segment.income_deciles = [def.segment.incomeDecile];
  if (def.segment.educationLevel) segment.education_levels = [def.segment.educationLevel as 'none' | 'primary' | 'secondary' | 'technical' | 'university' | 'postgraduate'];
  if (def.segment.connectivityLevel) segment.connectivity_levels = [def.segment.connectivityLevel as 'none' | 'low' | 'medium' | 'high' | 'very_high'];
  if (def.segment.agentType) segment.agent_types = [def.segment.agentType as 'resident' | 'retiree' | 'student' | 'entrepreneur' | 'worker'];

  // Mapear preguntas
  const questions: DbSurveyQuestion[] = def.questions.map((q, index) => {
    const base: DbSurveyQuestion = {
      id: q.id,
      type: q.type as 'single_choice' | 'likert_scale' | 'multiple_choice' | 'text',
      text: q.text,
      required: q.required,
      order: index,
    };

    if (q.type === 'single_choice' || q.type === 'multiple_choice') {
      const sq = q as { options: Array<{ id: string; label: string; value: string | number }> };
      base.options = sq.options.map(opt => ({
        id: opt.id,
        label: opt.label,
        value: opt.value,
      }));
    }

    if (q.type === 'likert_scale') {
      const lq = q as { min: number; max: number; minLabel: string; maxLabel: string };
      base.likertConfig = {
        min: lq.min,
        max: lq.max,
        minLabel: lq.minLabel,
        maxLabel: lq.maxLabel,
      };
    }

    return base;
  });

  return {
    name: def.name,
    description: def.description || null,
    slug,
    segment,
    questions,
    sample_size: def.sampleSize,
    status: 'active',
    // CADEM v1.1 - Engine configuration
    engine_mode: def.engineMode || 'legacy',
    persist_state: def.persistState || false,
    created_by: null,
    updated_by: null,
    published_at: null,
    deleted_at: null,
  };
}

/**
 * Convierte DbSurveyDefinition (DB) a SurveyDefinition (app)
 */
function fromDbSurveyDefinition(db: DbSurveyDefinition): SurveyDefinition {
  // Mapear segmento de vuelta
  const segment: SurveyDefinition['segment'] = {};
  if (db.segment.region_codes?.length) segment.regionCode = db.segment.region_codes[0];
  if (db.segment.comuna_codes?.length) segment.comunaCode = db.segment.comuna_codes[0];
  if (db.segment.sex?.length) segment.sex = db.segment.sex[0];
  if (db.segment.age_groups?.length) segment.ageGroup = db.segment.age_groups[0];
  if (db.segment.income_deciles?.length) segment.incomeDecile = db.segment.income_deciles[0];
  if (db.segment.education_levels?.length) segment.educationLevel = db.segment.education_levels[0];
  if (db.segment.connectivity_levels?.length) segment.connectivityLevel = db.segment.connectivity_levels[0];
  if (db.segment.agent_types?.length) segment.agentType = db.segment.agent_types[0];

  // Mapear preguntas de vuelta
  const questions = db.questions.map(q => {
    const base = {
      id: q.id,
      type: q.type,
      text: q.text,
      required: q.required,
    };

    if (q.type === 'single_choice' || q.type === 'multiple_choice') {
      return {
        ...base,
        type: q.type as 'single_choice' | 'multiple_choice',
        options: q.options?.map(opt => ({
          id: opt.id,
          label: opt.label,
          value: opt.value,
        })) || [],
      };
    }

    if (q.type === 'likert_scale') {
      return {
        ...base,
        type: 'likert_scale' as const,
        min: q.likertConfig?.min || 1,
        max: q.likertConfig?.max || 5,
        minLabel: q.likertConfig?.minLabel || 'Muy en desacuerdo',
        maxLabel: q.likertConfig?.maxLabel || 'Muy de acuerdo',
      };
    }

    return { ...base, type: 'text' as const };
  });

  return {
    id: db.id,
    name: db.name,
    description: db.description || '',
    createdAt: db.created_at,
    sampleSize: db.sample_size,
    segment,
    questions,
    // CADEM v1.1 - Engine configuration
    engineMode: (db.engine_mode as 'legacy' | 'cadem') || 'legacy',
    persistState: db.persist_state || false,
  };
}

// ===========================================
// Survey Definitions - Persistencia Sprint 11A
// ===========================================

/**
 * Verifica si la persistencia de encuestas está disponible
 */
export async function isSurveyPersistenceAvailable(): Promise<boolean> {
  const client = await getSupabaseClient();
  if (!client) {
    console.log('[📊 SurveyRepository] FALLBACK: Supabase no disponible');
    return false;
  }
  
  try {
    // Test simple para verificar que la tabla existe
    const { error } = await client
      .from('survey_definitions')
      .select('id', { count: 'exact', head: true });
    
    if (error) {
      console.log('[📊 SurveyRepository] FALLBACK: Error verificando tabla survey_definitions:', error.message);
      return false;
    }
    
    console.log('[📊 SurveyRepository] ✅ DB: Tabla survey_definitions disponible');
    return true;
  } catch {
    return false;
  }
}

/**
 * Crea una nueva definición de encuesta en Supabase
 * 
 * @returns La encuesta creada con ID asignado, o null si falla
 */
export async function createSurveyDefinition(
  definition: Omit<SurveyDefinition, 'id' | 'createdAt'>
): Promise<SurveyDefinition | null> {
  return safeQuery(async (client) => {
    const dbData = toDbSurveyDefinition(definition);
    
    const { data, error } = await client
      .from('survey_definitions')
      .insert(dbData as any)
      .select()
      .single();
    
    if (error) {
      console.error('[SurveyRepository] Error creating survey:', error);
      return null;
    }
    
    if (!data) {
      console.error('[SurveyRepository] No data returned after insert');
      return null;
    }
    
    console.log('📋 [SurveyRepository] Survey saved to DB:', (data as DbSurveyDefinition).id);
    return fromDbSurveyDefinition(data as DbSurveyDefinition);
  }, null);
}

/**
 * Obtiene todas las definiciones de encuestas activas (no eliminadas)
 */
export async function getSurveyDefinitions(): Promise<SurveyDefinition[]> {
  return safeQuery(async (client) => {
    const { data, error } = await client
      .from('survey_definitions')
      .select('*')
      .is('deleted_at', null)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('[SurveyRepository] Error fetching surveys:', error);
      return [];
    }
    
    return (data || []).map(fromDbSurveyDefinition);
  }, []);
}

/**
 * Obtiene una definición de encuesta por ID (solo si no está eliminada)
 */
export async function getSurveyDefinitionById(id: string): Promise<SurveyDefinition | null> {
  return safeQuery(async (client) => {
    const { data, error } = await client
      .from('survey_definitions')
      .select('*')
      .eq('id', id)
      .is('deleted_at', null)
      .single();
    
    if (error) {
      console.error('[SurveyRepository] Error fetching survey:', error);
      return null;
    }
    
    return data ? fromDbSurveyDefinition(data) : null;
  }, null);
}

/**
 * Obtiene todas las encuestas eliminadas (para administración)
 */
export async function getDeletedSurveyDefinitions(): Promise<SurveyDefinition[]> {
  return safeQuery(async (client) => {
    const { data, error } = await client
      .from('survey_definitions')
      .select('*')
      .not('deleted_at', 'is', null)
      .order('deleted_at', { ascending: false });
    
    if (error) {
      console.error('[SurveyRepository] Error fetching deleted surveys:', error);
      return [];
    }
    
    return (data || []).map(fromDbSurveyDefinition);
  }, []);
}

/**
 * Obtiene una encuesta por ID incluyendo las eliminadas (para administración)
 */
export async function getSurveyDefinitionByIdIncludingDeleted(id: string): Promise<SurveyDefinition | null> {
  return safeQuery(async (client) => {
    const { data, error } = await client
      .from('survey_definitions')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) {
      console.error('[SurveyRepository] Error fetching survey (including deleted):', error);
      return null;
    }
    
    return data ? fromDbSurveyDefinition(data) : null;
  }, null);
}

/**
 * Soft delete de una definición de encuesta
 * En lugar de eliminar físicamente, marca la encuesta como eliminada
 */
export async function deleteSurveyDefinition(id: string): Promise<boolean> {
  return safeQuery(async (client) => {
    const updateData: { deleted_at: string } = { deleted_at: new Date().toISOString() };
    const { error } = await client
      .from('survey_definitions')
      .update(updateData as never)
      .eq('id', id);
    
    if (error) {
      console.error('[SurveyRepository] Error soft-deleting survey:', error);
      return false;
    }
    
    console.log('🗑️ [SurveyRepository] Survey soft-deleted from DB:', id);
    return true;
  }, false);
}

/**
 * Hard delete de una definición de encuesta (solo para administración)
 * Elimina físicamente la encuesta de la base de datos
 * @deprecated Usar deleteSurveyDefinition (soft delete) en su lugar
 */
export async function hardDeleteSurveyDefinition(id: string): Promise<boolean> {
  return safeQuery(async (client) => {
    const { error } = await client
      .from('survey_definitions')
      .delete()
      .eq('id', id);
    
    if (error) {
      console.error('[SurveyRepository] Error hard-deleting survey:', error);
      return false;
    }
    
    console.log('🗑️ [SurveyRepository] Survey hard-deleted from DB:', id);
    return true;
  }, false);
}

/**
 * Restaura una encuesta eliminada (soft delete revert)
 */
export async function restoreSurveyDefinition(id: string): Promise<boolean> {
  return safeQuery(async (client) => {
    const updateData: { deleted_at: null } = { deleted_at: null };
    const { error } = await client
      .from('survey_definitions')
      .update(updateData as never)
      .eq('id', id);
    
    if (error) {
      console.error('[SurveyRepository] Error restoring survey:', error);
      return false;
    }
    
    console.log('♻️ [SurveyRepository] Survey restored:', id);
    return true;
  }, false);
}

// ===========================================
// Legacy API - Mantener compatibilidad
// ===========================================

/**
 * @deprecated Usar createSurveyDefinition
 */
export async function createSurvey(
  definition: Omit<SurveyDefinition, 'id' | 'createdAt'>
): Promise<SurveyDefinition> {
  const result = await createSurveyDefinition(definition);
  if (!result) {
    throw new Error('Failed to create survey in database');
  }
  return result;
}

/**
 * @deprecated Usar getSurveyDefinitions
 */
export async function getAllSurveys(): Promise<SurveyDefinition[]> {
  return getSurveyDefinitions();
}

/**
 * @deprecated Usar getSurveyDefinitionById
 */
export async function getSurvey(id: string): Promise<SurveyDefinition | undefined> {
  const result = await getSurveyDefinitionById(id);
  return result || undefined;
}

/**
 * @deprecated Usar deleteSurveyDefinition
 */
export async function deleteSurvey(id: string): Promise<boolean> {
  return deleteSurveyDefinition(id);
}

// ===========================================
// Survey Runs - Persistencia Sprint 11B
// ===========================================

/**
 * Verifica si la persistencia de runs está disponible
 */
export async function isSurveyRunPersistenceAvailable(): Promise<boolean> {
  const client = await getSupabaseClient();
  if (!client) return false;
  
  try {
    const { error } = await client
      .from('survey_runs')
      .select('id', { count: 'exact', head: true });
    
    return !error;
  } catch {
    return false;
  }
}

/**
 * Convierte SurveyRun (app) a DbSurveyRun (DB)
 */
function toDbSurveyRun(run: Omit<SurveyRun, 'id'> & { id?: string }): Omit<DbSurveyRun, 'id' | 'created_at' | 'updated_at' | 'run_number'> {
  return {
    survey_id: run.surveyId,
    name: null, // Se puede agregar nombre opcional en el futuro
    status: 'completed',
    segment_applied: run.metadata || {},
    sample_size_requested: run.metadata?.sampleSizeRequested || 0,
    sample_size_actual: run.metadata?.sampleSizeActual || run.totalAgents,
    agents_matched: run.metadata?.segmentMatched || run.totalAgents,
    progress_percent: 100,
    current_agent_index: run.totalAgents,
    results_summary: {
      total_responses: run.responses?.length || 0,
      completion_rate: run.responses?.length > 0 ? 100 : 0,
      average_confidence: 0.85, // Valor por defecto, se calcularía de las respuestas
    },
    error_message: null,
    error_details: null,
    started_at: run.startedAt,
    completed_at: run.completedAt,
  };
}

/**
 * Convierte DbSurveyRun (DB) a SurveyRun (app)
 * NOTA: Las respuestas no se cargan desde DB en Sprint 11B (solo metadata)
 */
function fromDbSurveyRun(db: DbSurveyRun): SurveyRun {
  return {
    id: db.id,
    surveyId: db.survey_id,
    startedAt: db.started_at || db.created_at,
    completedAt: db.completed_at || db.created_at,
    totalAgents: db.sample_size_actual,
    // NOTA: Las respuestas no se persisten en Sprint 11B
    responses: [],
    metadata: {
      segmentMatched: db.agents_matched,
      sampleSizeRequested: db.sample_size_requested,
      sampleSizeActual: db.sample_size_actual,
      // Incluir results_summary si existe
      resultsSummary: db.results_summary,
    },
  };
}

/**
 * Crea una nueva corrida de encuesta en Supabase
 * 
 * @returns La corrida creada con ID asignado, o null si falla
 */
export async function createSurveyRunDb(
  run: Omit<SurveyRun, 'id'>
): Promise<SurveyRun | null> {
  return safeQuery(async (client) => {
    const dbData = toDbSurveyRun(run);
    
    const { data, error } = await client
      .from('survey_runs')
      .insert(dbData as any)
      .select()
      .single();
    
    if (error) {
      console.error('[SurveyRepository] Error creating survey run:', error);
      return null;
    }
    
    if (!data) {
      console.error('[SurveyRepository] No data returned after insert run');
      return null;
    }
    
    console.log('🚀 [SurveyRepository] Survey run saved to DB:', (data as DbSurveyRun).id);
    return fromDbSurveyRun(data as DbSurveyRun);
  }, null);
}

/**
 * Obtiene todas las corridas de una encuesta
 */
export async function getSurveyRunsBySurveyId(surveyId: string): Promise<SurveyRun[]> {
  return safeQuery(async (client) => {
    const { data, error } = await client
      .from('survey_runs')
      .select('*')
      .eq('survey_id', surveyId)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('[SurveyRepository] Error fetching survey runs:', error);
      return [];
    }
    
    return (data || []).map(fromDbSurveyRun);
  }, []);
}

/**
 * Obtiene una corrida por ID
 */
export async function getSurveyRunById(runId: string): Promise<SurveyRun | null> {
  return safeQuery(async (client) => {
    const { data, error } = await client
      .from('survey_runs')
      .select('*')
      .eq('id', runId)
      .single();
    
    if (error) {
      console.error('[SurveyRepository] Error fetching survey run:', error);
      return null;
    }
    
    return data ? fromDbSurveyRun(data as DbSurveyRun) : null;
  }, null);
}

/**
 * Elimina una corrida de encuesta
 */
export async function deleteSurveyRun(runId: string): Promise<boolean> {
  return safeQuery(async (client) => {
    const { error } = await client
      .from('survey_runs')
      .delete()
      .eq('id', runId);
    
    if (error) {
      console.error('[SurveyRepository] Error deleting survey run:', error);
      return false;
    }
    
    console.log('🗑️ [SurveyRepository] Survey run deleted from DB:', runId);
    return true;
  }, false);
}

// ===========================================
// Legacy STUB functions (mantener compatibilidad)
// ===========================================

export async function createSurveyRun(
  _surveyId: string,
  _sampleSizeRequested: number,
  _agentsMatched: number
): Promise<SurveyRun | null> {
  console.log('📋 [SurveyRepository] Use createSurveyRunDb instead');
  return null;
}

export async function updateSurveyRunProgress(
  _runId: string,
  _progress: number,
  _currentIndex: number
): Promise<void> {
  // No-op - no implementado en Sprint 11B
}

export async function completeSurveyRun(
  _runId: string,
  _sampleSizeActual: number,
  _resultsSummary: { total_responses: number; completion_rate: number; average_confidence: number }
): Promise<void> {
  // No-op - no implementado en Sprint 11B
}

export async function getSurveyRuns(_surveyId: string): Promise<SurveyRun[]> {
  return getSurveyRunsBySurveyId(_surveyId);
}

// ===========================================
// Survey Responses - Persistencia Sprint 11D
// ===========================================

import type { DbSurveyResponse } from '../../../types/database';

/**
 * Verifica si la persistencia de respuestas está disponible
 */
export async function isSurveyResponsePersistenceAvailable(): Promise<boolean> {
  const client = await getSupabaseClient();
  if (!client) return false;
  
  try {
    const { error } = await client
      .from('survey_responses')
      .select('id', { count: 'exact', head: true });
    
    return !error;
  } catch {
    return false;
  }
}

/**
 * Convierte AgentResponse (app) a DbSurveyResponse (DB)
 */
function toDbSurveyResponse(
  response: AgentResponse,
  runId: string,
  surveyId: string,
  agentSnapshot: Record<string, unknown>
): Omit<DbSurveyResponse, 'id' | 'created_at'> {
  return {
    survey_id: surveyId,
    run_id: runId,
    agent_id: response.agentId,
    question_id: response.questionId,
    question_type: 'single_choice', // Se determina dinámicamente
    value: response.value,
    confidence: response.confidence,
    reasoning: response.reasoning,
    heuristics_applied: [], // Se puede extender en el futuro
    agent_snapshot: agentSnapshot,
  };
}

/**
 * Guarda respuestas individuales de una encuesta en Supabase
 * Usa batch insert para mejor performance
 * 
 * @returns true si se guardaron exitosamente, false si falló
 */
export async function saveSurveyResponses(
  runId: string,
  surveyId: string,
  responses: AgentResponse[],
  agentSnapshots?: Map<string, Record<string, unknown>>
): Promise<boolean> {
  if (responses.length === 0) {
    console.log('📋 [SurveyRepository] No responses to save');
    return true;
  }
  
  return safeQuery(async (client) => {
    // Preparar datos para insert batch
    const dbResponses = responses.map(response => {
      const snapshot = agentSnapshots?.get(response.agentId) || {};
      return toDbSurveyResponse(response, runId, surveyId, snapshot);
    });
    
    // Insert en batch (máximo 1000 por batch)
    const batchSize = 1000;
    let totalInserted = 0;
    
    for (let i = 0; i < dbResponses.length; i += batchSize) {
      const batch = dbResponses.slice(i, i + batchSize);
      
      const { data, error } = await client
        .from('survey_responses')
        .insert(batch as any)
        .select();
      
      if (error) {
        console.error(`[SurveyRepository] Error saving responses batch ${i}:`, error);
        return false;
      }
      
      totalInserted += data?.length || 0;
    }
    
    console.log(`💾 [SurveyRepository] Saved ${totalInserted} responses to DB for run: ${runId}`);
    return true;
  }, false);
}

/**
 * Obtiene respuestas individuales de una corrida
 * Útil para análisis detallado o debugging
 */
export async function getSurveyResponsesByRunId(
  runId: string,
  options?: { limit?: number; offset?: number }
): Promise<AgentResponse[]> {
  return safeQuery(async (client) => {
    let query = client
      .from('survey_responses')
      .select('*')
      .eq('run_id', runId)
      .order('created_at', { ascending: true });
    
    if (options?.limit) {
      query = query.limit(options.limit);
    }
    if (options?.offset) {
      query = query.range(options.offset, options.offset + (options.limit || 1000) - 1);
    }
    
    const { data, error } = await query;
    
    if (error) {
      console.error('[SurveyRepository] Error fetching responses:', error);
      return [];
    }
    
    return (data || []).map((db: DbSurveyResponse) => ({
      agentId: db.agent_id,
      questionId: db.question_id,
      value: db.value as string | number | string[] | null,
      confidence: db.confidence,
      reasoning: db.reasoning,
    }));
  }, []);
}

/**
 * Obtiene el conteo de respuestas por corrida
 * Útil para paginación
 */
export async function getSurveyResponsesCount(runId: string): Promise<number> {
  return safeQuery(async (client) => {
    const { count, error } = await client
      .from('survey_responses')
      .select('*', { count: 'exact', head: true })
      .eq('run_id', runId);
    
    if (error) {
      console.error('[SurveyRepository] Error counting responses:', error);
      return 0;
    }
    
    return count || 0;
  }, 0);
}

/**
 * Elimina respuestas de una corrida
 * Útil para re-ejecución o limpieza
 */
export async function deleteSurveyResponsesByRunId(runId: string): Promise<boolean> {
  return safeQuery(async (client) => {
    const { error } = await client
      .from('survey_responses')
      .delete()
      .eq('run_id', runId);
    
    if (error) {
      console.error('[SurveyRepository] Error deleting responses:', error);
      return false;
    }
    
    console.log('🗑️ [SurveyRepository] Deleted responses for run:', runId);
    return true;
  }, false);
}

// ===========================================
// Survey Results - Persistencia Sprint 11C
// ===========================================

/**
 * Verifica si la persistencia de resultados está disponible
 */
export async function isSurveyResultPersistenceAvailable(): Promise<boolean> {
  const client = await getSupabaseClient();
  if (!client) return false;
  
  try {
    const { error } = await client
      .from('survey_results')
      .select('id', { count: 'exact', head: true });
    
    return !error;
  } catch {
    return false;
  }
}

/**
 * Convierte SurveyResult (app) a DbSurveyResult (DB)
 */
function toDbSurveyResult(result: SurveyResult): Omit<DbSurveyResult, 'id' | 'created_at' | 'updated_at'> {
  return {
    survey_id: result.surveyId,
    run_id: result.runId,
    summary: result.summary,
    results: result.results as any, // Los tipos son compatibles
    generated_at: result.generatedAt,
  };
}

/**
 * Convierte DbSurveyResult (DB) a SurveyResult (app)
 */
function fromDbSurveyResult(db: DbSurveyResult): SurveyResult {
  return {
    surveyId: db.survey_id,
    runId: db.run_id,
    generatedAt: db.generated_at,
    summary: db.summary,
    results: db.results as any, // Los tipos son compatibles
  };
}

/**
 * Guarda los resultados agregados de una encuesta en Supabase
 * 
 * @returns true si se guardó exitosamente, false si falló
 */
export async function saveSurveyResultsDb(result: SurveyResult): Promise<boolean> {
  return safeQuery(async (client) => {
    const dbData = toDbSurveyResult(result);
    
    const { data, error } = await client
      .from('survey_results')
      .insert(dbData as any)
      .select()
      .single();
    
    if (error) {
      console.error('[SurveyRepository] Error saving survey results:', error);
      return false;
    }
    
    if (!data) {
      console.error('[SurveyRepository] No data returned after insert results');
      return false;
    }
    
    console.log('📊 [SurveyRepository] Survey results saved to DB:', (data as DbSurveyResult).id);
    return true;
  }, false);
}

/**
 * Obtiene los resultados de una encuesta por surveyId
 * NOTA: Si hay múltiples runs, retorna el más reciente
 */
export async function getSurveyResultsBySurveyId(surveyId: string): Promise<SurveyResult | null> {
  return safeQuery(async (client) => {
    const { data, error } = await client
      .from('survey_results')
      .select('*')
      .eq('survey_id', surveyId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
    
    if (error) {
      // No error si no hay resultados
      if (error.code === 'PGRST116') return null;
      console.error('[SurveyRepository] Error fetching survey results:', error);
      return null;
    }
    
    return data ? fromDbSurveyResult(data as DbSurveyResult) : null;
  }, null);
}

/**
 * Obtiene los resultados de una corrida específica
 */
export async function getSurveyResultsByRunId(runId: string): Promise<SurveyResult | null> {
  return safeQuery(async (client) => {
    const { data, error } = await client
      .from('survey_results')
      .select('*')
      .eq('run_id', runId)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') return null;
      console.error('[SurveyRepository] Error fetching survey results by run:', error);
      return null;
    }
    
    return data ? fromDbSurveyResult(data as DbSurveyResult) : null;
  }, null);
}

/**
 * Elimina los resultados de una corrida
 */
export async function deleteSurveyResultsByRunId(runId: string): Promise<boolean> {
  return safeQuery(async (client) => {
    const { error } = await client
      .from('survey_results')
      .delete()
      .eq('run_id', runId);
    
    if (error) {
      console.error('[SurveyRepository] Error deleting survey results:', error);
      return false;
    }
    
    console.log('🗑️ [SurveyRepository] Survey results deleted from DB for run:', runId);
    return true;
  }, false);
}

// ===========================================
// Legacy STUB functions (mantener compatibilidad)
// ===========================================

/**
 * @deprecated Usar saveSurveyResultsDb
 */
export async function saveSurveyResults(): Promise<boolean> {
  console.log('📋 [SurveyRepository] Use saveSurveyResultsDb instead');
  return false;
}

/**
 * @deprecated Usar getSurveyResultsBySurveyId
 */
export async function getSurveyResults(_surveyId: string): Promise<SurveyResult | undefined> {
  const result = await getSurveyResultsBySurveyId(_surveyId);
  return result || undefined;
}

// ===========================================
// Utility Functions
// ===========================================

export async function getSurveyStats(): Promise<{
  totalSurveys: number;
  totalRuns: number;
  totalResponses: number;
}> {
  const surveys = await getSurveyDefinitions();
  return {
    totalSurveys: surveys.length,
    totalRuns: 0,
    totalResponses: 0,
  };
}
