/**
 * Event Store para CADEM v1.2
 * 
 * Gestiona la carga y consulta de eventos semanales desde Supabase.
 * Proporciona una interfaz simple para obtener eventos por weekKey
 * y filtrar por categoría, severidad, etc.
 */

import { getSupabaseClient } from '../../services/supabase/client';
import type { WeeklyEvent, EventCategory, ImpactSeverity, EventSentiment } from './types';

// ============================================================================
// TIPOS DE RESULTADO
// ============================================================================

export interface EventStoreResult {
  events: WeeklyEvent[];
  count: number;
  weekKey: string;
  error?: string;
}

export interface EventFilter {
  categories?: EventCategory[];
  minSeverity?: ImpactSeverity;
  maxSeverity?: ImpactSeverity;
  sentiment?: 'positive' | 'negative' | 'neutral';
  limit?: number;
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

// ============================================================================
// FUNCIONES PRINCIPALES
// ============================================================================

/**
 * Obtiene todos los eventos para una semana específica
 * 
 * @param weekKey - Clave de semana (formato: YYYY-WNN)
 * @param filter - Filtros opcionales
 * @returns Resultado con eventos encontrados
 */
export async function getEventsByWeekKey(
  weekKey: string,
  filter?: EventFilter
): Promise<EventStoreResult> {
  try {
    const supabase = await getSupabaseClient();
    if (!supabase) {
      return {
        events: [],
        count: 0,
        weekKey,
        error: 'Supabase not available'
      };
    }

    let query = supabase
      .from('weekly_events')
      .select('*')
      .eq('week_key', weekKey);

    // Aplicar filtros
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

    if (filter?.limit) {
      query = query.limit(filter.limit);
    }

    const { data, error } = await query.order('intensity', { ascending: false });

    if (error) {
      console.error('[EventStore] Error fetching events:', error);
      return {
        events: [],
        count: 0,
        weekKey,
        error: error.message
      };
    }

    // Transformar datos de DB a tipo WeeklyEvent
    const events: WeeklyEvent[] = (data || []).map((row: any) => ({
      id: row.id as string,
      weekKey: row.week_key as string,
      title: row.title as string,
      summary: row.summary as string,
      category: row.category as EventCategory,
      sentiment: toEventSentiment(row.sentiment as number),
      intensity: row.intensity as number,
      salience: row.salience as number,
      severity: row.severity as ImpactSeverity,
      targetEntities: (row.target_entities as any[]) || [],
      affectedSegments: (row.affected_segments as any[]) || [],
      sourceCount: row.source_count as number | undefined,
      sourceUrls: (row.source_urls as string[]) || [],
      tags: (row.tags as string[]) || [],
      createdAt: row.created_at as string,
      createdBy: row.created_by as string | undefined,
      metadata: (row.metadata as Record<string, unknown>) || {}
    }));

    return {
      events,
      count: events.length,
      weekKey
    };

  } catch (error) {
    console.error('[EventStore] Unexpected error:', error);
    return {
      events: [],
      count: 0,
      weekKey,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Obtiene un evento específico por su ID
 * 
 * @param eventId - ID del evento
 * @returns El evento encontrado o null
 */
export async function getEventById(eventId: string): Promise<WeeklyEvent | null> {
  try {
    const supabase = await getSupabaseClient();
    if (!supabase) return null;

    const { data, error } = await supabase
      .from('weekly_events')
      .select('*')
      .eq('id', eventId)
      .single();

    if (error || !data) {
      console.error('[EventStore] Error fetching event:', error);
      return null;
    }

    const row = data as any;
    return {
      id: row.id as string,
      weekKey: row.week_key as string,
      title: row.title as string,
      summary: row.summary as string,
      category: row.category as EventCategory,
      sentiment: toEventSentiment(row.sentiment as number),
      intensity: row.intensity as number,
      salience: row.salience as number,
      severity: row.severity as ImpactSeverity,
      targetEntities: (row.target_entities as any[]) || [],
      affectedSegments: (row.affected_segments as any[]) || [],
      sourceCount: row.source_count as number | undefined,
      sourceUrls: (row.source_urls as string[]) || [],
      tags: (row.tags as string[]) || [],
      createdAt: row.created_at as string,
      createdBy: row.created_by as string | undefined,
      metadata: (row.metadata as Record<string, unknown>) || {}
    };

  } catch (error) {
    console.error('[EventStore] Unexpected error:', error);
    return null;
  }
}

/**
 * Obtiene eventos de múltiples semanas (útil para ventanas de tiempo)
 * 
 * @param weekKeys - Array de claves de semana
 * @param filter - Filtros opcionales
 * @returns Mapa de weekKey a eventos
 */
export async function getEventsForMultipleWeeks(
  weekKeys: string[],
  filter?: EventFilter
): Promise<Map<string, WeeklyEvent[]>> {
  const result = new Map<string, WeeklyEvent[]>();

  // Inicializar mapa con arrays vacíos
  for (const weekKey of weekKeys) {
    result.set(weekKey, []);
  }

  try {
    const supabase = await getSupabaseClient();
    if (!supabase) return result;

    let query = supabase
      .from('weekly_events')
      .select('*')
      .in('week_key', weekKeys);

    // Aplicar filtros
    if (filter?.categories && filter.categories.length > 0) {
      query = query.in('category', filter.categories);
    }

    if (filter?.minSeverity) {
      const severityOrder = ['minor', 'moderate', 'major', 'critical'];
      const minIndex = severityOrder.indexOf(filter.minSeverity);
      const allowedSeverities = severityOrder.slice(minIndex);
      query = query.in('severity', allowedSeverities);
    }

    const { data, error } = await query;

    if (error) {
      console.error('[EventStore] Error fetching events:', error);
      return result;
    }

    // Agrupar por weekKey
    for (const row of (data || [])) {
      const r = row as any;
      const weekKey = r.week_key as string;
      const event: WeeklyEvent = {
        id: r.id as string,
        weekKey: r.week_key as string,
        title: r.title as string,
        summary: r.summary as string,
        category: r.category as EventCategory,
        sentiment: toEventSentiment(r.sentiment as number),
        intensity: r.intensity as number,
        salience: r.salience as number,
        severity: r.severity as ImpactSeverity,
        targetEntities: (r.target_entities as any[]) || [],
        affectedSegments: (r.affected_segments as any[]) || [],
        sourceCount: r.source_count as number | undefined,
        sourceUrls: (r.source_urls as string[]) || [],
        tags: (r.tags as string[]) || [],
        createdAt: r.created_at as string,
        createdBy: r.created_by as string | undefined,
        metadata: (r.metadata as Record<string, unknown>) || {}
      };

      const existing = result.get(weekKey) || [];
      existing.push(event);
      result.set(weekKey, existing);
    }

    return result;

  } catch (error) {
    console.error('[EventStore] Unexpected error:', error);
    return result;
  }
}

/**
 * Crea un nuevo evento semanal (para testing o carga manual)
 * 
 * @param event - Datos del evento (sin ID ni createdAt)
 * @returns El evento creado o null si falló
 */
export async function createEvent(
  event: Omit<WeeklyEvent, 'id' | 'createdAt'>
): Promise<WeeklyEvent | null> {
  try {
    const supabase = await getSupabaseClient();
    if (!supabase) return null;

    const insertData = {
      week_key: event.weekKey,
      title: event.title,
      summary: event.summary,
      category: event.category,
      sentiment: event.sentiment,
      intensity: event.intensity,
      salience: event.salience,
      severity: event.severity,
      target_entities: event.targetEntities,
      affected_segments: event.affectedSegments,
      source_count: event.sourceCount,
      source_urls: event.sourceUrls,
      tags: event.tags,
      metadata: event.metadata
    };

    const { data, error } = await supabase
      .from('weekly_events')
      .insert(insertData as any)
      .select()
      .single();

    if (error || !data) {
      console.error('[EventStore] Error creating event:', error);
      return null;
    }

    const row = data as any;
    return {
      id: row.id as string,
      weekKey: row.week_key as string,
      title: row.title as string,
      summary: row.summary as string,
      category: row.category as EventCategory,
      sentiment: toEventSentiment(row.sentiment as number),
      intensity: row.intensity as number,
      salience: row.salience as number,
      severity: row.severity as ImpactSeverity,
      targetEntities: (row.target_entities as any[]) || [],
      affectedSegments: (row.affected_segments as any[]) || [],
      sourceCount: row.source_count as number | undefined,
      sourceUrls: (row.source_urls as string[]) || [],
      tags: (row.tags as string[]) || [],
      createdAt: row.created_at as string,
      createdBy: row.created_by as string | undefined,
      metadata: (row.metadata as Record<string, unknown>) || {}
    };

  } catch (error) {
    console.error('[EventStore] Unexpected error:', error);
    return null;
  }
}

/**
 * Verifica si existen eventos para una semana específica
 * 
 * @param weekKey - Clave de semana
 * @returns true si hay eventos, false si no
 */
export async function hasEventsForWeek(weekKey: string): Promise<boolean> {
  try {
    const supabase = await getSupabaseClient();
    if (!supabase) return false;

    const { count, error } = await supabase
      .from('weekly_events')
      .select('*', { count: 'exact', head: true })
      .eq('week_key', weekKey);

    if (error) {
      console.error('[EventStore] Error checking events:', error);
      return false;
    }

    return (count || 0) > 0;

  } catch (error) {
    console.error('[EventStore] Unexpected error:', error);
    return false;
  }
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Genera la clave de semana actual (YYYY-WNN)
 */
export function getCurrentWeekKey(): string {
  const now = new Date();
  const year = now.getFullYear();
  
  // Calcular número de semana (ISO 8601)
  const startOfYear = new Date(year, 0, 1);
  const days = Math.floor((now.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000));
  const weekNumber = Math.ceil((days + startOfYear.getDay() + 1) / 7);
  
  return `${year}-W${weekNumber.toString().padStart(2, '0')}`;
}

/**
 * Genera claves de semana para una ventana de tiempo
 * 
 * @param centerWeekKey - Semana central
 * @param windowSize - Tamaño de la ventana (semanas antes y después)
 * @returns Array de claves de semana
 */
export function getWeekKeyWindow(
  centerWeekKey: string,
  windowSize: number = 2
): string[] {
  const weekKeys: string[] = [];
  
  // Parsear weekKey (formato: YYYY-WNN)
  const match = centerWeekKey.match(/(\d{4})-W(\d{2})/);
  if (!match) return [centerWeekKey];
  
  const year = parseInt(match[1], 10);
  const week = parseInt(match[2], 10);
  
  // Generar semanas en la ventana
  for (let i = -windowSize; i <= windowSize; i++) {
    const targetWeek = week + i;
    
    // Manejar cambio de año (simplificado, asume 52 semanas por año)
    if (targetWeek < 1) {
      weekKeys.push(`${year - 1}-W${(52 + targetWeek).toString().padStart(2, '0')}`);
    } else if (targetWeek > 52) {
      weekKeys.push(`${year + 1}-W${(targetWeek - 52).toString().padStart(2, '0')}`);
    } else {
      weekKeys.push(`${year}-W${targetWeek.toString().padStart(2, '0')}`);
    }
  }
  
  return weekKeys;
}

// ============================================================================
// EXPORTACIÓN DE MÓDULO
// ============================================================================

export const EventStore = {
  getEventsByWeekKey,
  getEventById,
  getEventsForMultipleWeeks,
  createEvent,
  hasEventsForWeek,
  getCurrentWeekKey,
  getWeekKeyWindow
};

export default EventStore;
