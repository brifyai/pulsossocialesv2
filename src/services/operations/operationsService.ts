/**
 * Service para operaciones del dashboard
 * Semana 2 - Etapa 1: MVP Dashboard Operativo
 */

import { getSupabaseClient } from '../supabase/client';
import type {
  SurveyRunSummary,
  SurveyRunRaw,
  RunStatus,
  EngineMode,
  EngineVersion,
  OperationsStats
} from '../../types/operations';

/**
 * Service para gestionar operaciones de runs de encuestas
 * Usa anon key (no service key) para respetar RLS
 */
export class OperationsService {
  /**
   * Obtiene los runs recientes de encuestas
   * @param limit - Cantidad máxima de runs a retornar (default: 20)
   * @returns Lista de runs resumidos
   */
  async getRecentRuns(limit: number = 20): Promise<SurveyRunSummary[]> {
    console.log('[DEBUG] getRecentRuns called with limit:', limit);
    
    const client = await getSupabaseClient();
    if (!client) {
      throw new Error('Supabase no está disponible');
    }

    // Query 1: Obtener runs
    const { data: runs, error: runsError } = await client
      .from('survey_runs')
      .select(`
        id, 
        created_at, 
        status, 
        metadata, 
        survey_id, 
        sample_size_requested, 
        sample_size_actual, 
        results_summary
      `)
      .neq('status', 'draft')  // Excluir drafts
      .order('created_at', { ascending: false })
      .limit(limit);

    if (runsError) {
      console.error('Error fetching recent runs:', runsError);
      throw new Error(`Error al cargar runs: ${runsError.message}`);
    }

    if (!runs || runs.length === 0) {
      return [];
    }

    // Cast explícito porque Supabase retorna tipo genérico
    const typedRuns = runs as unknown as SurveyRunRaw[];

    // Query 2: Obtener nombres de encuestas
    // Extraer IDs únicos de encuestas
    const surveyIds = [...new Set(typedRuns
      .map(r => (r as any).survey_id)
      .filter(Boolean))];
    
    console.log('[DEBUG] Survey IDs from runs:', surveyIds);
    
    const surveyNames: Record<string, string> = {};
    
    if (surveyIds.length > 0) {
      const { data: surveys, error: surveysError } = await client
        .from('survey_definitions')
        .select('id, name')
        .in('id', surveyIds);
      
      console.log('[DEBUG] Survey definitions query result:', { surveys, surveysError });
      
      if (!surveysError && surveys) {
        surveys.forEach((s: any) => {
          surveyNames[s.id] = s.name;
        });
      }
    }
    
    console.log('[DEBUG] Final surveyNames map:', surveyNames);

    return this.mapToSummary(typedRuns, surveyNames);
  }

  /**
   * Obtiene un run específico por ID
   * @param runId - ID del run
   * @returns Run resumido o null si no existe
   */
  async getRunById(runId: string): Promise<SurveyRunSummary | null> {
    const client = await getSupabaseClient();
    if (!client) {
      throw new Error('Supabase no está disponible');
    }

    // Query 1: Obtener run
    const { data: run, error } = await client
      .from('survey_runs')
      .select('id, created_at, status, metadata, survey_id')
      .eq('id', runId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No encontrado
        return null;
      }
      console.error('Error fetching run by ID:', error);
      throw new Error(`Error al cargar run: ${error.message}`);
    }

    if (!run) return null;

    // Query 2: Obtener nombre de la encuesta si existe
    const surveyNames: Record<string, string> = {};
    const runData = run as any;
    if (runData.survey_id) {
      const { data: survey } = await client
        .from('survey_definitions')
        .select('id, name')
        .eq('id', runData.survey_id)
        .single();
      
      if (survey) {
        const surveyData = survey as any;
        surveyNames[surveyData.id] = surveyData.name;
      }
    }

    return this.mapToSummary([runData as SurveyRunRaw], surveyNames)[0];
  }

  /**
   * Obtiene estadísticas agregadas de runs
   * @returns Estadísticas de operaciones
   */
  async getStats(): Promise<OperationsStats> {
    const client = await getSupabaseClient();
    if (!client) {
      throw new Error('Supabase no está disponible');
    }

    const { data, error } = await client
      .from('survey_runs')
      .select('status, metadata')
      .neq('status', 'draft');

    if (error) {
      console.error('Error fetching stats:', error);
      throw new Error(`Error al cargar estadísticas: ${error.message}`);
    }

    const runs = data || [];
    const completed = runs.filter((r: { status: string }) => r.status === 'completed');

    const totalConfidence = completed.reduce((sum: number, r: { metadata?: { avg_confidence?: number } }) => {
      return sum + (r.metadata?.avg_confidence || 0);
    }, 0);

    return {
      total: runs.length,
      completed: completed.length,
      errors: runs.filter((r: { status: string }) => r.status === 'error').length,
      in_progress: runs.filter((r: { status: string }) => r.status === 'in_progress').length,
      avg_confidence: completed.length > 0 ? totalConfidence / completed.length : 0
    };
  }

  /**
   * Mapea datos crudos de Supabase a SurveyRunSummary
   * @param data - Datos crudos de la query
   * @param surveyNames - Mapa de IDs a nombres de encuestas
   * @returns Lista de runs formateados
   */
  private mapToSummary(data: SurveyRunRaw[], surveyNames?: Record<string, string>): SurveyRunSummary[] {
    return data.map((run) => {
      // Los datos pueden venir en metadata (configuración) o results_summary (resultados)
      const metadata = (run.metadata as any) || {};
      const resultsSummary = (run as any).results_summary || {};
      
      // El JOIN de Supabase devuelve survey_definitions como array o objeto
      // Depende de si es relación 1:1 o 1:N
      const surveyDef = (run as any).survey_definitions;
      let surveyNameFromJoin: string | null = null;
      if (surveyDef) {
        if (Array.isArray(surveyDef) && surveyDef.length > 0) {
          surveyNameFromJoin = surveyDef[0].name;
        } else if (typeof surveyDef === 'object' && surveyDef.name) {
          surveyNameFromJoin = surveyDef.name;
        }
      }
      
      // Si no hay nombre, mostrar "Sin nombre (ID: xxx)" para debug
      const surveyId = run.survey_id;
      const surveyNameFromMap = surveyId ? surveyNames?.[surveyId] : undefined;
      const surveyName = surveyNameFromJoin 
        || surveyNameFromMap 
        || (surveyId ? `Encuesta ${surveyId.slice(0, 8)}...` : 'Sin nombre');

      // Extraer valores de metadata (configuración del run) o results_summary (resultados)
      const totalAgents = (run as any).sample_size_actual 
        ?? (run as any).sample_size_requested 
        ?? metadata.sample_size 
        ?? 0;
      
      const totalResponses = resultsSummary.total_responses 
        ?? metadata.total_responses 
        ?? 0;
      
      // El campo puede ser avg_confidence o average_confidence
      const avgConfidence = resultsSummary.avg_confidence 
        ?? resultsSummary.average_confidence
        ?? metadata.avg_confidence 
        ?? 0;
      
      // Engine mode y version vienen del metadata de la encuesta, no del run
      // Por ahora usamos valores por defecto basados en el phase
      const engineMode = metadata.phase?.includes('v1.2') ? 'async' : 'sync';
      const engineVersion = metadata.phase?.includes('v1.2') ? 'v1.2' : 'v1.1';
      
      const useEvents = metadata.use_events ?? false;
      const scenarioName = metadata.scenario_name ?? undefined;

      return {
        id: run.id,
        created_at: run.created_at,
        survey_id: surveyId,
        survey_name: surveyName,
        status: this.parseStatus(run.status),
        total_agents: totalAgents,
        total_responses: totalResponses,
        avg_confidence: avgConfidence,
        engine_mode: this.parseEngineMode(engineMode),
        engine_version: this.parseEngineVersion(engineVersion),
        use_events: useEvents,
        scenario_name: scenarioName,
        error_message: run.status === 'error' ? (metadata.error_message ?? metadata.error) : undefined
      };
    });
  }

  /**
   * Parsea el estado del run
   * @param status - Estado crudo de la BD
   * @returns RunStatus validado
   */
  private parseStatus(status: string): RunStatus {
    const validStatuses: RunStatus[] = ['draft', 'in_progress', 'completed', 'error'];
    return validStatuses.includes(status as RunStatus)
      ? (status as RunStatus)
      : 'draft';
  }

  /**
   * Parsea el modo del engine
   * @param mode - Modo crudo de la BD
   * @returns EngineMode validado
   */
  private parseEngineMode(mode?: string): EngineMode {
    if (mode === 'async') return 'async';
    if (mode === 'sync') return 'sync';
    return 'unknown';
  }

  /**
   * Parsea la versión del engine
   * @param version - Versión cruda de la BD
   * @returns EngineVersion validada
   */
  private parseEngineVersion(version?: string): EngineVersion {
    if (version === 'v1.1') return 'v1.1';
    if (version === 'v1.2') return 'v1.2';
    return 'unknown';
  }
}

// Exportar instancia singleton
export const operationsService = new OperationsService();
