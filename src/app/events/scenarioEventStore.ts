/**
 * Scenario Event Store para CADEM v1.2
 * 
 * Gestiona la creación, lectura, actualización y eliminación de
 * escenarios hipotéticos creados por usuarios. Los escenarios son
 * eventos simulados que pueden aplicarse a encuestas para ver
 * el impacto de situaciones hipotéticas.
 */

import { getSupabaseClient } from '../../services/supabase/client.ts';
import type {
  EventCategory,
  ImpactSeverity,
  EventSentiment,
  EventTargetEntity,
  EventSegmentRule
} from './types.ts';

// ============================================================================
// TIPOS
// ============================================================================

/**
 * Estado de un escenario
 */
export type ScenarioStatus = 'draft' | 'active' | 'archived';

/**
 * Escenario de evento hipotético
 */
export interface ScenarioEvent {
  /** Identificador único */
  id: string;

  /** Usuario que creó el escenario */
  userId: string;

  /** Nombre del escenario */
  name: string;

  /** Descripción detallada */
  description: string;

  /** Categoría temática */
  category: EventCategory;

  /** Sentimiento del evento (-1 a 1) */
  sentiment: EventSentiment;

  /** Intensidad del evento (0-1) */
  intensity: number;

  /** Relevancia/salience del evento (0-1) */
  salience: number;

  /** Severidad del impacto */
  severity: ImpactSeverity;

  /** Entidades específicas afectadas */
  targetEntities: EventTargetEntity[];

  /** Reglas de segmentación */
  affectedSegments?: EventSegmentRule[];

  /** Estado del escenario */
  status: ScenarioStatus;

  /** Metadatos adicionales */
  metadata?: Record<string, unknown>;

  /** Fecha de creación */
  createdAt: string;

  /** Fecha de última actualización */
  updatedAt: string;
}

/**
 * Datos para crear un escenario (sin ID ni timestamps)
 */
export interface CreateScenarioInput {
  name: string;
  description: string;
  category: EventCategory;
  sentiment: EventSentiment;
  intensity: number;
  salience: number;
  severity: ImpactSeverity;
  targetEntities: EventTargetEntity[];
  affectedSegments?: EventSegmentRule[];
  status?: ScenarioStatus;
  metadata?: Record<string, unknown>;
}

/**
 * Filtros para consultar escenarios
 */
export interface ScenarioFilter {
  status?: ScenarioStatus;
  categories?: EventCategory[];
  minSeverity?: ImpactSeverity;
  maxSeverity?: ImpactSeverity;
  sentiment?: 'positive' | 'negative' | 'neutral';
  limit?: number;
  offset?: number;
}

/**
 * Resultado de operaciones CRUD
 */
export interface ScenarioStoreResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Convierte un número a EventSentiment válido
 * Busca el valor más cercano en los valores permitidos
 */
function toEventSentiment(n: number): EventSentiment {
  const valid: EventSentiment[] = [-1, -0.75, -0.5, -0.25, 0, 0.25, 0.5, 0.75, 1];
  const closest = valid.reduce((prev, curr) =>
    Math.abs(curr - n) < Math.abs(prev - n) ? curr : prev
  );
  return closest;
}

/**
 * Transforma una fila de DB a ScenarioEvent
 */
function rowToScenarioEvent(row: any): ScenarioEvent {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    name: row.name as string,
    description: row.description as string,
    category: row.category as EventCategory,
    sentiment: toEventSentiment(row.sentiment as number),
    intensity: row.intensity as number,
    salience: row.salience as number,
    severity: row.severity as ImpactSeverity,
    targetEntities: (row.target_entities as EventTargetEntity[]) || [],
    affectedSegments: (row.affected_segments as EventSegmentRule[]) || undefined,
    status: row.status as ScenarioStatus,
    metadata: (row.metadata as Record<string, unknown>) || {},
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string
  };
}

// ============================================================================
// FUNCIONES CRUD
// ============================================================================

/**
 * Crea un nuevo escenario
 *
 * @param input - Datos del escenario a crear
 * @returns Resultado con el escenario creado
 */
export async function createScenario(
  input: CreateScenarioInput
): Promise<ScenarioStoreResult<ScenarioEvent>> {
  try {
    const supabase = await getSupabaseClient();
    if (!supabase) {
      return { success: false, error: 'Supabase not available' };
    }

    const insertData = {
      name: input.name,
      description: input.description,
      category: input.category,
      sentiment: input.sentiment,
      intensity: input.intensity,
      salience: input.salience,
      severity: input.severity,
      target_entities: input.targetEntities,
      affected_segments: input.affectedSegments,
      status: input.status || 'draft',
      metadata: input.metadata || {}
    };

    const { data, error } = await supabase
      .from('scenario_events')
      .insert(insertData as any)
      .select()
      .single();

    if (error || !data) {
      console.error('[ScenarioEventStore] Error creating scenario:', error);
      return { success: false, error: error?.message || 'Failed to create scenario' };
    }

    return {
      success: true,
      data: rowToScenarioEvent(data)
    };

  } catch (error) {
    console.error('[ScenarioEventStore] Unexpected error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Obtiene un escenario por su ID
 *
 * @param scenarioId - ID del escenario
 * @returns Resultado con el escenario encontrado
 */
export async function getScenarioById(
  scenarioId: string
): Promise<ScenarioStoreResult<ScenarioEvent>> {
  try {
    const supabase = await getSupabaseClient();
    if (!supabase) {
      return { success: false, error: 'Supabase not available' };
    }

    const { data, error } = await supabase
      .from('scenario_events')
      .select('*')
      .eq('id', scenarioId)
      .single();

    if (error || !data) {
      console.error('[ScenarioEventStore] Error fetching scenario:', error);
      return { success: false, error: error?.message || 'Scenario not found' };
    }

    return {
      success: true,
      data: rowToScenarioEvent(data)
    };

  } catch (error) {
    console.error('[ScenarioEventStore] Unexpected error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Lista escenarios del usuario actual con filtros opcionales
 *
 * @param filter - Filtros opcionales
 * @returns Resultado con array de escenarios
 */
export async function listScenarios(
  filter?: ScenarioFilter
): Promise<ScenarioStoreResult<{ scenarios: ScenarioEvent[]; total: number }>> {
  try {
    const supabase = await getSupabaseClient();
    if (!supabase) {
      return { success: false, error: 'Supabase not available' };
    }

    // Construir query base
    let query = supabase.from('scenario_events').select('*', { count: 'exact' });

    // Aplicar filtros
    if (filter?.status) {
      query = query.eq('status', filter.status);
    }

    if (filter?.categories && filter.categories.length > 0) {
      query = query.in('category', filter.categories);
    }

    if (filter?.minSeverity) {
      const severityOrder = ['minor', 'moderate', 'major', 'critical'];
      const minIndex = severityOrder.indexOf(filter.minSeverity);
      const allowedSeverities = severityOrder.slice(minIndex);
      query = query.in('severity', allowedSeverities);
    }

    if (filter?.sentiment) {
      switch (filter.sentiment) {
        case 'positive':
          query = query.gt('sentiment', 0);
          break;
        case 'negative':
          query = query.lt('sentiment', 0);
          break;
        case 'neutral':
          query = query.eq('sentiment', 0);
          break;
      }
    }

    // Ordenar por fecha de creación (más recientes primero)
    query = query.order('created_at', { ascending: false });

    // Aplicar paginación
    if (filter?.limit) {
      query = query.limit(filter.limit);
    }
    if (filter?.offset) {
      query = query.range(filter.offset, filter.offset + (filter.limit || 10) - 1);
    }

    const { data, error, count } = await query;

    if (error) {
      console.error('[ScenarioEventStore] Error listing scenarios:', error);
      return { success: false, error: error.message };
    }

    const scenarios = (data || []).map(rowToScenarioEvent);

    return {
      success: true,
      data: {
        scenarios,
        total: count || scenarios.length
      }
    };

  } catch (error) {
    console.error('[ScenarioEventStore] Unexpected error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Actualiza un escenario existente
 *
 * @param scenarioId - ID del escenario a actualizar
 * @param updates - Campos a actualizar
 * @returns Resultado con el escenario actualizado
 */
export async function updateScenario(
  scenarioId: string,
  updates: Partial<Omit<CreateScenarioInput, 'userId'>>
): Promise<ScenarioStoreResult<ScenarioEvent>> {
  try {
    const supabase = await getSupabaseClient();
    if (!supabase) {
      return { success: false, error: 'Supabase not available' };
    }

    // Construir objeto de actualización
    const updateData: Record<string, unknown> = {};

    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.description !== undefined) updateData.description = updates.description;
    if (updates.category !== undefined) updateData.category = updates.category;
    if (updates.sentiment !== undefined) updateData.sentiment = updates.sentiment;
    if (updates.intensity !== undefined) updateData.intensity = updates.intensity;
    if (updates.salience !== undefined) updateData.salience = updates.salience;
    if (updates.severity !== undefined) updateData.severity = updates.severity;
    if (updates.targetEntities !== undefined) updateData.target_entities = updates.targetEntities;
    if (updates.affectedSegments !== undefined) updateData.affected_segments = updates.affectedSegments;
    if (updates.status !== undefined) updateData.status = updates.status;
    if (updates.metadata !== undefined) updateData.metadata = updates.metadata;

    const { data, error } = await (supabase
      .from('scenario_events') as any)
      .update(updateData)
      .eq('id', scenarioId)
      .select()
      .single();

    if (error || !data) {
      console.error('[ScenarioEventStore] Error updating scenario:', error);
      return { success: false, error: error?.message || 'Failed to update scenario' };
    }

    return {
      success: true,
      data: rowToScenarioEvent(data)
    };

  } catch (error) {
    console.error('[ScenarioEventStore] Unexpected error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Elimina un escenario
 *
 * @param scenarioId - ID del escenario a eliminar
 * @returns Resultado de la operación
 */
export async function deleteScenario(
  scenarioId: string
): Promise<ScenarioStoreResult<void>> {
  try {
    const supabase = await getSupabaseClient();
    if (!supabase) {
      return { success: false, error: 'Supabase not available' };
    }

    const { error } = await supabase
      .from('scenario_events')
      .delete()
      .eq('id', scenarioId);

    if (error) {
      console.error('[ScenarioEventStore] Error deleting scenario:', error);
      return { success: false, error: error.message };
    }

    return { success: true };

  } catch (error) {
    console.error('[ScenarioEventStore] Unexpected error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

// ============================================================================
// FUNCIONES DE UTILIDAD
// ============================================================================

/**
 * Activa un escenario (cambia status a 'active')
 *
 * @param scenarioId - ID del escenario
 * @returns Resultado con el escenario activado
 */
export async function activateScenario(
  scenarioId: string
): Promise<ScenarioStoreResult<ScenarioEvent>> {
  return updateScenario(scenarioId, { status: 'active' });
}

/**
 * Archiva un escenario (cambia status a 'archived')
 *
 * @param scenarioId - ID del escenario
 * @returns Resultado con el escenario archivado
 */
export async function archiveScenario(
  scenarioId: string
): Promise<ScenarioStoreResult<ScenarioEvent>> {
  return updateScenario(scenarioId, { status: 'archived' });
}

/**
 * Duplica un escenario existente
 *
 * @param scenarioId - ID del escenario a duplicar
 * @param newName - Nombre para el nuevo escenario (opcional)
 * @returns Resultado con el escenario duplicado
 */
export async function duplicateScenario(
  scenarioId: string,
  newName?: string
): Promise<ScenarioStoreResult<ScenarioEvent>> {
  const result = await getScenarioById(scenarioId);

  if (!result.success || !result.data) {
    return { success: false, error: result.error || 'Scenario not found' };
  }

  const original = result.data;

  return createScenario({
    name: newName || `${original.name} (copia)`,
    description: original.description,
    category: original.category,
    sentiment: original.sentiment,
    intensity: original.intensity,
    salience: original.salience,
    severity: original.severity,
    targetEntities: original.targetEntities,
    affectedSegments: original.affectedSegments,
    status: 'draft',
    metadata: {
      ...original.metadata,
      duplicatedFrom: original.id,
      duplicatedAt: new Date().toISOString()
    }
  });
}

/**
 * Convierte un ScenarioEvent a formato compatible con WeeklyEvent
 * para usar con el motor de opiniones existente
 *
 * @param scenario - Escenario a convertir
 * @param weekKey - Clave de semana para el escenario (opcional)
 * @returns Objeto compatible con WeeklyEvent
 */
export function scenarioToWeeklyEvent(
  scenario: ScenarioEvent,
  weekKey?: string
): {
  id: string;
  weekKey: string;
  title: string;
  summary: string;
  category: EventCategory;
  sentiment: EventSentiment;
  intensity: number;
  salience: number;
  severity: ImpactSeverity;
  targetEntities: EventTargetEntity[];
  affectedSegments?: EventSegmentRule[];
  createdAt: string;
  createdBy?: string;
} {
  return {
    id: scenario.id,
    weekKey: weekKey || 'SCENARIO-001',
    title: scenario.name,
    summary: scenario.description,
    category: scenario.category,
    sentiment: scenario.sentiment,
    intensity: scenario.intensity,
    salience: scenario.salience,
    severity: scenario.severity,
    targetEntities: scenario.targetEntities,
    affectedSegments: scenario.affectedSegments,
    createdAt: scenario.createdAt,
    createdBy: scenario.userId
  };
}

// ============================================================================
// EXPORTACIÓN DE MÓDULO
// ============================================================================

export const ScenarioEventStore = {
  createScenario,
  getScenarioById,
  listScenarios,
  updateScenario,
  deleteScenario,
  activateScenario,
  archiveScenario,
  duplicateScenario,
  scenarioToWeeklyEvent
};

export default ScenarioEventStore;
