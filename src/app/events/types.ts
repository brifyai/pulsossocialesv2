/**
 * Tipos de Eventos para CADEM v1.2
 * 
 * Sistema de eventos semanales que afectan los topic states
 * de los agentes sintéticos según su exposición.
 */

// ============================================================================
// CATEGORÍAS Y SEVERIDAD
// ============================================================================

/**
 * Categorías de eventos según su naturaleza temática
 */
export type EventCategory =
  | 'government'      // Decisiones, anuncios, crisis de gobierno
  | 'economy'         // Indicadores económicos, política fiscal/monetary
  | 'security'        // Delincuencia, violencia, orden público
  | 'institutions'    // Congreso, justicia, instituciones públicas
  | 'migration'       // Flujos migratorios, política migratoria
  | 'international'   // Relaciones exteriores, comercio internacional
  | 'social';         // Movimientos sociales, demandas ciudadanas

/**
 * Severidad del impacto del evento
 */
export type ImpactSeverity =
  | 'minor'      // Impacto leve, noticia menor
  | 'moderate'   // Impacto moderado, atención media
  | 'major'      // Impacto significativo, atención nacional
  | 'critical';  // Impacto crítico, crisis nacional

/**
 * Sentimiento del evento
 * -1: Muy negativo
 *  0: Neutral
 * +1: Muy positivo
 */
export type EventSentiment = -1 | -0.75 | -0.5 | -0.25 | 0 | 0.25 | 0.5 | 0.75 | 1;

// ============================================================================
// ENTIDADES Y SEGMENTOS
// ============================================================================

/**
 * Tipo de entidad afectada por el evento
 */
export type EntityType =
  | 'president'           // Presidente/a
  | 'government'          // Gobierno en general
  | 'ministry'            // Ministerio específico
  | 'congress'            // Congreso
  | 'judiciary'           // Poder judicial
  | 'party'               // Partido político
  | 'institution'         // Institución pública
  | 'economic_sector'     // Sector económico
  | 'region'              // Región geográfica
  | 'social_group';       // Grupo social

/**
 * Entidad específica afectada por el evento
 */
export interface EventTargetEntity {
  type: EntityType;
  id: string;           // Identificador (ej: "ministry_economy", "region_rm")
  name: string;         // Nombre legible
  sentimentModifier?: number;  // Modificador de sentimiento para esta entidad (-0.5 a 0.5)
}

/**
 * Reglas de segmentación para determinar qué agentes
 * están expuestos al evento
 */
export interface EventSegmentRule {
  /** Región afectada (opcional) */
  regionCode?: string;
  
  /** Comuna afectada (opcional) */
  comunaCode?: string;
  
  /** Nivel socioeconómico afectado (opcional) */
  sesGroup?: 'low' | 'medium' | 'high';
  
  /** Grupo de edad afectado (opcional) */
  ageGroup?: 'young' | 'adult' | 'senior';
  
  /** Sector económico afectado (opcional) */
  economicSector?: string;
  
  /** Porcentaje de la población afectada (0-1) */
  coverageRate: number;
  
  /** Intensidad del impacto para este segmento (0-1) */
  intensity: number;
}

// ============================================================================
// EVENTO SEMANAL
// ============================================================================

/**
 * Evento semanal que afecta las opiniones de los agentes
 */
export interface WeeklyEvent {
  /** Identificador único */
  id: string;
  
  /** Clave de semana (formato: YYYY-WNN, ej: 2026-W13) */
  weekKey: string;
  
  /** Título del evento */
  title: string;
  
  /** Resumen descriptivo */
  summary: string;
  
  /** Categoría temática */
  category: EventCategory;
  
  /** Sentimiento general del evento (-1 a 1) */
  sentiment: EventSentiment;
  
  /** Intensidad del evento (0-1) */
  intensity: number;
  
  /** Relevancia/salience del evento (0-1) */
  salience: number;
  
  /** Severidad del impacto */
  severity: ImpactSeverity;
  
  /** Entidades específicas afectadas */
  targetEntities: EventTargetEntity[];
  
  /** Reglas de segmentación (opcional) */
  affectedSegments?: EventSegmentRule[];
  
  /** Cantidad de fuentes que reportan el evento (opcional) */
  sourceCount?: number;
  
  /** URLs de fuentes (opcional) */
  sourceUrls?: string[];
  
  /** Tags adicionales */
  tags?: string[];
  
  /** Fecha de creación */
  createdAt: string;
  
  /** Usuario que creó el evento */
  createdBy?: string;
  
  /** Metadatos adicionales */
  metadata?: Record<string, unknown>;
}

// ============================================================================
// EXPOSICIÓN E IMPACTO
// ============================================================================

/**
 * Perfil de información de un agente
 * Determina qué tan expuesto está a diferentes tipos de información
 */
export interface InformationProfile {
  /** Consumo de noticias (0-1) */
  newsConsumption: number;
  
  /** Uso de redes sociales (0-1) */
  socialMediaUsage: number;
  
  /** Interés en política (0-1) */
  politicalInterest: number;
  
  /** Interés en economía (0-1) */
  economicInterest: number;
  
  /** Sensibilidad a eventos locales (0-1) */
  localSensitivity: number;
  
  /** Sensibilidad a eventos nacionales (0-1) */
  nationalSensitivity: number;
}

/**
 * Resultado del cálculo de exposición de un agente a un evento
 */
export interface ExposureResult {
  /** Agente evaluado */
  agentId: string;
  
  /** Evento evaluado */
  eventId: string;
  
  /** Nivel de exposición (0-1) */
  exposureLevel: number;
  
  /** Factores que contribuyeron a la exposición */
  factors: {
    demographicMatch: number;      // Coincidencia demográfica
    geographicProximity: number;   // Proximidad geográfica
    informationAccess: number;     // Acceso a información
    interestAlignment: number;     // Alineación de intereses
  };
  
  /** Evento es relevante para este agente */
  isRelevant: boolean;
}

/**
 * Cambio calculado en un topic state
 */
export interface TopicShift {
  /** Topic afectado */
  topic: string;
  
  /** Cambio propuesto (-1 a 1) */
  delta: number;
  
  /** Confianza en el cambio (0-1) */
  confidence: number;
  
  /** Razón del cambio */
  reason: string;
}

/**
 * Resultado de aplicar un evento a un agente
 */
export interface EventImpactResult {
  /** Agente afectado */
  agentId: string;
  
  /** Evento aplicado */
  eventId: string;
  
  /** Exposición calculada */
  exposure: number;
  
  /** Cambios en topics */
  shifts: TopicShift[];
  
  /** Topics states resultantes (después de aplicar) */
  updatedTopicStates: Record<string, number>;
  
  /** Timestamp de aplicación */
  appliedAt: string;
}

// ============================================================================
// CONFIGURACIÓN Y PARÁMETROS
// ============================================================================

/**
 * Configuración del sistema de eventos
 */
export interface EventSystemConfig {
  /** Factor de atenuación global (0-1) */
  globalAttenuation: number;
  
  /** Máximo cambio por evento en un topic */
  maxShiftPerEvent: number;
  
  /** Umbral mínimo de exposición para aplicar impacto */
  minExposureThreshold: number;
  
  /** Ventana de tiempo para eventos activos (semanas) */
  eventWindowWeeks: number;
  
  /** Decay de impacto por semana */
  weeklyDecayRate: number;
}

/**
 * Parámetros por categoría de evento
 */
export interface CategoryParams {
  /** Multiplicador de impacto para esta categoría */
  impactMultiplier: number;
  
  /** Topics afectados por defecto */
  defaultTopics: string[];
  
  /** Severidad mínima para considerar */
  minSeverity: ImpactSeverity;
}

// ============================================================================
// MAPEO DE CATEGORÍAS A TOPICS
// ============================================================================

/**
 * Mapeo de categorías de eventos a topics que afectan
 */
export const CATEGORY_TOPIC_MAP: Record<EventCategory, string[]> = {
  government: [
    'government_approval',
    'country_direction'
  ],
  economy: [
    'economy_national',
    'economy_personal',
    'country_optimism',
    'country_direction'
  ],
  security: [
    'security_perception',
    'country_direction'
  ],
  institutions: [
    'institutional_trust'
  ],
  migration: [
    'country_direction',
    'security_perception'
  ],
  international: [
    'country_optimism',
    'economy_national'
  ],
  social: [
    'country_direction',
    'institutional_trust'
  ]
};

/**
 * Configuración por defecto del sistema de eventos
 */
export const DEFAULT_EVENT_CONFIG: EventSystemConfig = {
  globalAttenuation: 0.7,      // Atenuación del 30%
  maxShiftPerEvent: 0.15,      // Máximo 15% de cambio por evento
  minExposureThreshold: 0.3,   // Mínimo 30% de exposición
  eventWindowWeeks: 4,         // Eventos de últimas 4 semanas
  weeklyDecayRate: 0.15        // Decay del 15% por semana
};

/**
 * Parámetros por categoría
 */
export const CATEGORY_PARAMS: Record<EventCategory, CategoryParams> = {
  government: {
    impactMultiplier: 1.0,
    defaultTopics: ['government_approval', 'country_direction'],
    minSeverity: 'moderate'
  },
  economy: {
    impactMultiplier: 0.9,
    defaultTopics: ['economy_national', 'economy_personal', 'country_optimism'],
    minSeverity: 'moderate'
  },
  security: {
    impactMultiplier: 1.1,
    defaultTopics: ['security_perception', 'country_direction'],
    minSeverity: 'minor'
  },
  institutions: {
    impactMultiplier: 0.8,
    defaultTopics: ['institutional_trust'],
    minSeverity: 'moderate'
  },
  migration: {
    impactMultiplier: 0.9,
    defaultTopics: ['country_direction', 'security_perception'],
    minSeverity: 'moderate'
  },
  international: {
    impactMultiplier: 0.7,
    defaultTopics: ['country_optimism', 'economy_national'],
    minSeverity: 'major'
  },
  social: {
    impactMultiplier: 0.85,
    defaultTopics: ['country_direction', 'institutional_trust'],
    minSeverity: 'moderate'
  }
};

// ============================================================================
// HELPERS DE TIPO
// ============================================================================

/**
 * Verifica si una categoría afecta un topic específico
 */
export function categoryAffectsTopic(category: EventCategory, topic: string): boolean {
  return CATEGORY_TOPIC_MAP[category]?.includes(topic) ?? false;
}

/**
 * Obtiene los topics afectados por una categoría
 */
export function getTopicsForCategory(category: EventCategory): string[] {
  return CATEGORY_TOPIC_MAP[category] ?? [];
}

/**
 * Calcula el factor de severidad numérico
 */
export function severityToFactor(severity: ImpactSeverity): number {
  const factors: Record<ImpactSeverity, number> = {
    minor: 0.3,
    moderate: 0.6,
    major: 0.85,
    critical: 1.0
  };
  return factors[severity];
}

/**
 * Valida que un evento tenga todos los campos requeridos
 */
export function validateWeeklyEvent(event: Partial<WeeklyEvent>): event is WeeklyEvent {
  return !!(
    event.id &&
    event.weekKey &&
    event.title &&
    event.summary &&
    event.category &&
    typeof event.sentiment === 'number' &&
    typeof event.intensity === 'number' &&
    typeof event.salience === 'number' &&
    event.severity &&
    Array.isArray(event.targetEntities) &&
    event.createdAt
  );
}
