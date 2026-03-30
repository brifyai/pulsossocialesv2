/**
 * Tipos para el dashboard operativo
 * Semana 2 - Etapa 1: MVP Dashboard Operativo
 */

/**
 * Estados posibles de un run de encuesta
 */
export type RunStatus = 'draft' | 'in_progress' | 'completed' | 'error';

/**
 * Modos del engine
 */
export type EngineMode = 'sync' | 'async' | 'unknown';

/**
 * Versiones del engine
 */
export type EngineVersion = 'v1.1' | 'v1.2' | 'unknown';

/**
 * Resumen de un run de encuesta para la tabla de operaciones
 * Basado en el schema real de survey_runs auditado
 */
export interface SurveyRunSummary {
  /** ID único del run */
  id: string;

  /** Fecha de creación */
  created_at: string;

  /** ID de la encuesta (para debug) */
  survey_id?: string;

  /** Nombre de la encuesta (de survey_definitions.name) */
  survey_name: string;

  /** Estado actual del run */
  status: RunStatus;

  /** Total de agentes procesados */
  total_agents: number;

  /** Total de respuestas generadas */
  total_responses: number;

  /** Confidence promedio (0-1) */
  avg_confidence: number;

  /** Modo del engine (sync/async) */
  engine_mode: EngineMode;

  /** Versión del engine */
  engine_version: EngineVersion;

  /** Si se usaron eventos semanales */
  use_events: boolean;

  /** Nombre del escenario aplicado (si existe) */
  scenario_name?: string;

  /** Mensaje de error (solo si status === 'error') */
  error_message?: string;
}

/**
 * Filtros para la tabla de operaciones
 */
export interface OperationsFilters {
  /** Filtrar por estado */
  status?: RunStatus;

  /** Filtrar por ID de encuesta */
  surveyId?: string;

  /** Fecha desde (ISO string) */
  dateFrom?: string;

  /** Fecha hasta (ISO string) */
  dateTo?: string;
}

/**
 * Estadísticas agregadas para el dashboard
 */
export interface OperationsStats {
  /** Total de runs */
  total: number;

  /** Runs completados */
  completed: number;

  /** Runs con error */
  errors: number;

  /** Runs en progreso */
  in_progress: number;

  /** Confidence promedio de runs completados */
  avg_confidence: number;
}

/**
 * Metadata de un run (estructura esperada en survey_runs.metadata)
 */
export interface SurveyRunMetadata {
  /** Total de agentes */
  total_agents?: number;

  /** Total de respuestas */
  total_responses?: number;

  /** Confidence promedio */
  avg_confidence?: number;

  /** Modo del engine */
  engine_mode?: string;

  /** Versión del engine */
  engine_version?: string;

  /** Si se usaron eventos */
  use_events?: boolean;

  /** ID del escenario */
  scenario_id?: string;

  /** Nombre del escenario */
  scenario_name?: string;

  /** Mensaje de error */
  error_message?: string;
}

/**
 * Resultados guardados en results_summary (JSONB)
 */
export interface SurveyRunResultsSummary {
  total_responses?: number;
  completion_rate?: number;
  avg_confidence?: number;
  distributions?: Record<string, Record<string, number>>;
  metrics?: {
    completionRate?: number;
    errorRate?: number;
    eventsApplied?: number;
    eventImpactDetected?: boolean;
    executionTime?: number;
    timePerAgent?: number;
  };
  event_log?: {
    eventsLoaded?: number;
    eventsApplied?: number;
    impactSummary?: Record<string, number>;
  };
  errors?: string[];
}

/**
 * Datos crudos de un run desde Supabase
 * Incluye campos de la tabla survey_runs
 */
export interface SurveyRunRaw {
  id: string;
  created_at: string;
  status: string;
  metadata: SurveyRunMetadata;
  survey_id?: string;
  sample_size_requested?: number;
  sample_size_actual?: number;
  results_summary?: SurveyRunResultsSummary;
  survey_definitions?: {
    name: string;
  };
}
