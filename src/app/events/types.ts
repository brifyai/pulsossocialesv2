/**
 * Tipos del módulo events para CADEM Opinion Engine v1.
 * Modela eventos públicos semanales y su posible impacto en opinión.
 */

/** Categorías principales de eventos públicos */
export type EventCategory =
  | 'government'
  | 'economy'
  | 'security'
  | 'institutions'
  | 'international'
  | 'health'
  | 'education'
  | 'social';

/** Severidad cualitativa del impacto potencial del evento */
export type ImpactSeverity =
  | 'low'
  | 'medium'
  | 'high';

/** Entidad objetivo o afectada por el evento */
export interface EventTargetEntity {
  type:
    | 'person'
    | 'government'
    | 'institution'
    | 'party'
    | 'country'
    | 'industry'
    | 'other';
  id: string;
  label: string;
}

/** Regla opcional para segmentos particularmente afectados por un evento */
export interface EventSegmentRule {
  dimension: 'gender' | 'ageGroup' | 'macrozone' | 'gse' | 'region' | 'agentType';
  values: string[];
  weight?: number;
}

/** Evento semanal estructurado */
export interface WeeklyEvent {
  id: string;
  weekKey: string;
  title: string;
  summary?: string;
  topic: EventCategory;
  sentiment: number;
  intensity: number;
  salience: number;
  severity?: ImpactSeverity;
  targetEntities?: EventTargetEntity[];
  affectedSegments?: EventSegmentRule[];
  sourceCount?: number;
  createdAt: Date;
}
