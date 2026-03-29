/**
 * Lógica de Impacto de Eventos para CADEM v1.2
 * 
 * Calcula cómo los eventos semanales afectan los topic states
 * de los agentes sintéticos según su exposición.
 */

import type { SyntheticAgent } from '../../types/agent';
import {
  type WeeklyEvent,
  type ExposureResult,
  type TopicShift,
  type EventImpactResult,
  type InformationProfile,
  type EventSystemConfig,
  CATEGORY_TOPIC_MAP,
  CATEGORY_PARAMS,
  severityToFactor,
  DEFAULT_EVENT_CONFIG
} from './types';

// ============================================================================
// CÁLCULO DE EXPOSICIÓN
// ============================================================================

/**
 * Calcula el perfil de información de un agente
 * basado en sus características demográficas
 */
export function calculateInformationProfile(agent: SyntheticAgent): InformationProfile {
  // Extraer características relevantes
  const age = agent.age ?? 35;
  const education = agent.education_level ?? 'secondary';
  const ses = agent.socioeconomic_level ?? 'medium';
  const regionCode = agent.region_code ?? '13';
  
  // Calcular consumo de noticias (mayor en adultos, educación alta, SES alto)
  let newsConsumption = 0.5;
  if (age >= 35 && age <= 65) newsConsumption += 0.15;
  if (education === 'university' || education === 'postgraduate') newsConsumption += 0.2;
  if (ses === 'high') newsConsumption += 0.15;
  if (ses === 'low') newsConsumption -= 0.1;
  newsConsumption = Math.max(0, Math.min(1, newsConsumption));
  
  // Uso de redes sociales (mayor en jóvenes)
  let socialMediaUsage = 0.5;
  if (age < 35) socialMediaUsage += 0.3;
  if (age > 65) socialMediaUsage -= 0.2;
  if (education === 'university' || education === 'postgraduate') socialMediaUsage += 0.1;
  socialMediaUsage = Math.max(0, Math.min(1, socialMediaUsage));
  
  // Interés en política (mayor en educación alta, adultos)
  let politicalInterest = 0.4;
  if (education === 'university' || education === 'postgraduate') politicalInterest += 0.25;
  if (age >= 35 && age <= 65) politicalInterest += 0.15;
  if (ses === 'high') politicalInterest += 0.1;
  politicalInterest = Math.max(0, Math.min(1, politicalInterest));
  
  // Interés en economía (mayor en SES alto, adultos trabajadores)
  let economicInterest = 0.45;
  if (ses === 'high') economicInterest += 0.2;
  if (age >= 25 && age <= 60) economicInterest += 0.15;
  if (education === 'university' || education === 'postgraduate') economicInterest += 0.1;
  economicInterest = Math.max(0, Math.min(1, economicInterest));
  
  // Sensibilidad local (mayor en regiones no capital)
  const localSensitivity = regionCode === '13' ? 0.4 : 0.7;
  
  // Sensibilidad nacional (mayor en capital, educación alta)
  let nationalSensitivity = 0.6;
  if (regionCode === '13') nationalSensitivity += 0.15;
  if (education === 'university' || education === 'postgraduate') nationalSensitivity += 0.1;
  nationalSensitivity = Math.max(0, Math.min(1, nationalSensitivity));
  
  return {
    newsConsumption,
    socialMediaUsage,
    politicalInterest,
    economicInterest,
    localSensitivity,
    nationalSensitivity
  };
}

/**
 * Calcula la exposición de un agente a un evento específico
 */
export function calculateExposure(
  agent: SyntheticAgent,
  event: WeeklyEvent,
  profile?: InformationProfile
): ExposureResult {
  const infoProfile = profile ?? calculateInformationProfile(agent);
  
  // Factor base de acceso a información
  const informationAccess = (
    infoProfile.newsConsumption * 0.4 +
    infoProfile.socialMediaUsage * 0.3 +
    (event.salience > 0.7 ? 0.2 : 0.1) // Eventos muy relevantes llegan a más gente
  );
  
  // Coincidencia demográfica con segmentos afectados
  let demographicMatch = 0.5;
  
  // Asegurar que affectedSegments sea un array válido
  const affectedSegments = Array.isArray(event.affectedSegments) ? event.affectedSegments : [];
  
  if (affectedSegments.length > 0) {
    const matches = affectedSegments.filter(segment => {
      if (segment.regionCode && agent.region_code !== segment.regionCode) return false;
      if (segment.comunaCode && agent.comuna_code !== segment.comunaCode) return false;
      if (segment.sesGroup && agent.socioeconomic_level !== segment.sesGroup) return false;
      return true;
    });
    
    if (matches.length > 0) {
      // Promedio de intensidad de los matches
      demographicMatch = matches.reduce((sum, m) => sum + m.intensity, 0) / matches.length;
    } else {
      demographicMatch = 0.2; // Baja exposición si no está en segmentos afectados
    }
  }
  
  // Proximidad geográfica
  let geographicProximity = 0.5;
  const safeAffectedSegments = Array.isArray(event.affectedSegments) ? event.affectedSegments : [];
  const isLocalEvent = safeAffectedSegments.some(s => s.regionCode && s.regionCode !== '13');
  const isNationalEvent = !isLocalEvent || event.severity === 'critical';
  
  if (isLocalEvent && agent.region_code !== '13') {
    // Evento local en regiones: mayor impacto en regiones afectadas
    const isInAffectedRegion = safeAffectedSegments.some(s => s.regionCode === agent.region_code);
    geographicProximity = isInAffectedRegion ? 0.9 : 0.3;
  } else if (isNationalEvent) {
    // Evento nacional: todos tienen cierta exposición
    geographicProximity = agent.region_code === '13' ? 0.8 : 0.6;
  }
  
  // Alineación de intereses según categoría
  let interestAlignment = 0.5;
  switch (event.category) {
    case 'government':
    case 'institutions':
      interestAlignment = infoProfile.politicalInterest;
      break;
    case 'economy':
      interestAlignment = infoProfile.economicInterest;
      break;
    case 'security':
    case 'social':
      interestAlignment = 0.5 + (infoProfile.localSensitivity * 0.3);
      break;
    default:
      interestAlignment = 0.5;
  }
  
  // Calcular exposición final
  const exposureLevel = Math.min(1, 
    informationAccess * 0.3 +
    demographicMatch * 0.3 +
    geographicProximity * 0.2 +
    interestAlignment * 0.2
  );
  
  // Umbral de relevancia
  const isRelevant = exposureLevel >= DEFAULT_EVENT_CONFIG.minExposureThreshold;
  
  return {
    agentId: agent.agent_id,
    eventId: event.id,
    exposureLevel,
    factors: {
      demographicMatch,
      geographicProximity,
      informationAccess,
      interestAlignment
    },
    isRelevant
  };
}

// ============================================================================
// CÁLCULO DE CAMBIO DE OPINIÓN
// ============================================================================

/**
 * Calcula el cambio de opinión (shift) para un topic específico
 */
export function calculateTopicShift(
  event: WeeklyEvent,
  topic: string,
  currentValue: number,
  exposure: number,
  config: EventSystemConfig = DEFAULT_EVENT_CONFIG
): TopicShift | null {
  // Verificar que el evento afecte este topic
  const affectedTopics = CATEGORY_TOPIC_MAP[event.category] ?? [];
  if (!affectedTopics.includes(topic)) {
    return null;
  }
  
  // Obtener parámetros de la categoría
  const categoryParams = CATEGORY_PARAMS[event.category];
  
  // Calcular magnitud base del cambio
  const severityFactor = severityToFactor(event.severity);
  const baseMagnitude = 
    event.intensity * 
    event.salience * 
    severityFactor * 
    categoryParams.impactMultiplier;
  
  // Aplicar exposición y atenuación global
  const adjustedMagnitude = baseMagnitude * exposure * config.globalAttenuation;
  
  // Calcular dirección del cambio
  // NOTA: Un evento negativo (sentiment < 0) debería DISMINUIR el valor del topic
  // (hacerlo más negativo), por lo que el delta debería ser negativo.
  // Un evento positivo debería AUMENTAR el valor (hacerlo más positivo).
  const direction = event.sentiment >= 0 ? 1 : -1;
  
  // Calcular delta (cambio propuesto)
  // El delta tiene el mismo signo que el sentimiento del evento:
  // - Evento negativo → delta negativo → valor disminuye
  // - Evento positivo → delta positivo → valor aumenta
  const delta = direction * Math.min(adjustedMagnitude, config.maxShiftPerEvent);
  
  // Ajustar según valor actual (efecto de techo/piso)
  // Si el valor ya está en el extremo, el cambio es menor
  let adjustedDelta = delta;
  if (direction > 0 && currentValue > 0.8) {
    adjustedDelta *= (1 - currentValue) * 2; // Reduce cambio cerca del máximo
  } else if (direction < 0 && currentValue < -0.8) {
    adjustedDelta *= (1 - Math.abs(currentValue)) * 2; // Reduce cambio cerca del mínimo
  }
  
  // Calcular confianza en el cambio
  const confidence = exposure * event.salience * (1 - Math.abs(adjustedDelta));
  
  return {
    topic,
    delta: adjustedDelta,
    confidence: Math.max(0, Math.min(1, confidence)),
    reason: `${event.title} (${event.category}, ${event.severity})`
  };
}

/**
 * Calcula todos los shifts para un evento dado
 */
export function calculateAllShifts(
  event: WeeklyEvent,
  topicStates: Record<string, number>,
  exposure: number,
  config: EventSystemConfig = DEFAULT_EVENT_CONFIG
): TopicShift[] {
  const affectedTopics = CATEGORY_TOPIC_MAP[event.category] ?? [];
  const shifts: TopicShift[] = [];
  
  for (const topic of affectedTopics) {
    const currentValue = topicStates[topic] ?? 0.5;
    const shift = calculateTopicShift(event, topic, currentValue, exposure, config);
    if (shift && Math.abs(shift.delta) > 0.001) {
      shifts.push(shift);
    }
  }
  
  return shifts;
}

// ============================================================================
// APLICACIÓN DE IMPACTO
// ============================================================================

/**
 * Aplica el impacto de un evento a los topic states de un agente
 */
export function applyEventImpact(
  topicStates: Record<string, number>,
  _event: WeeklyEvent,
  shifts: TopicShift[],
  _config: EventSystemConfig = DEFAULT_EVENT_CONFIG
): Record<string, number> {
  const updatedStates = { ...topicStates };

  for (const shift of shifts) {
    const currentValue = updatedStates[shift.topic] ?? 0;

    // Aplicar cambio con límites [-1, 1] (consistente con buildInitialTopicStates)
    let newValue = currentValue + shift.delta;
    newValue = Math.max(-1, Math.min(1, newValue));

    updatedStates[shift.topic] = newValue;
  }

  return updatedStates;
}

/**
 * Procesa un evento completo para un agente
 * Calcula exposición, shifts y aplica el impacto
 */
export function processEventForAgent(
  agent: SyntheticAgent,
  event: WeeklyEvent,
  topicStates: Record<string, number>,
  config: EventSystemConfig = DEFAULT_EVENT_CONFIG
): EventImpactResult {
  // Calcular exposición
  const exposureResult = calculateExposure(agent, event);
  
  // Si no es relevante, retornar sin cambios
  if (!exposureResult.isRelevant) {
  return {
    agentId: agent.agent_id,
    eventId: event.id,
    exposure: exposureResult.exposureLevel,
    shifts: [],
    updatedTopicStates: { ...topicStates },
    appliedAt: new Date().toISOString()
  };
  }
  
  // Calcular shifts
  const shifts = calculateAllShifts(
    event,
    topicStates,
    exposureResult.exposureLevel,
    config
  );
  
  // Aplicar impacto
  const updatedTopicStates = applyEventImpact(topicStates, event, shifts, config);
  
  return {
    agentId: agent.agent_id,
    eventId: event.id,
    exposure: exposureResult.exposureLevel,
    shifts,
    updatedTopicStates,
    appliedAt: new Date().toISOString()
  };
}

// ============================================================================
// PROCESAMIENTO BATCH
// ============================================================================

/**
 * Procesa múltiples eventos para un agente
 * Aplica los eventos en orden y acumula los cambios
 */
export function processMultipleEvents(
  agent: SyntheticAgent,
  events: WeeklyEvent[],
  initialTopicStates: Record<string, number>,
  config: EventSystemConfig = DEFAULT_EVENT_CONFIG
): {
  finalTopicStates: Record<string, number>;
  eventResults: EventImpactResult[];
  totalShifts: TopicShift[];
} {
  let currentStates = { ...initialTopicStates };
  const eventResults: EventImpactResult[] = [];
  const allShifts: TopicShift[] = [];
  
  // Ordenar eventos por semana (más antiguos primero)
  const sortedEvents = [...events].sort((a, b) => 
    a.weekKey.localeCompare(b.weekKey)
  );
  
  for (const event of sortedEvents) {
    const result = processEventForAgent(agent, event, currentStates, config);
    eventResults.push(result);
    
    // Acumular shifts
    allShifts.push(...result.shifts);
    
    // Actualizar estados para el siguiente evento
    currentStates = result.updatedTopicStates;
  }
  
  return {
    finalTopicStates: currentStates,
    eventResults,
    totalShifts: allShifts
  };
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Genera un resumen del impacto de un evento
 */
export function summarizeEventImpact(
  _event: WeeklyEvent,
  results: EventImpactResult[]
): {
  eventId: string;
  title: string;
  totalAgents: number;
  affectedAgents: number;
  averageExposure: number;
  totalShifts: number;
  mostAffectedTopics: string[];
} {
  const affectedResults = results.filter(r => r.shifts.length > 0);
  
  // Contar shifts por topic
  const topicShiftCounts: Record<string, number> = {};
  for (const result of affectedResults) {
    for (const shift of result.shifts) {
      topicShiftCounts[shift.topic] = (topicShiftCounts[shift.topic] ?? 0) + 1;
    }
  }
  
  // Ordenar topics por cantidad de shifts
  const mostAffectedTopics = Object.entries(topicShiftCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([topic]) => topic);
  
  return {
    eventId: _event.id,
    title: _event.title,
    totalAgents: results.length,
    affectedAgents: affectedResults.length,
    averageExposure: affectedResults.reduce((sum, r) => sum + r.exposure, 0) / 
      (affectedResults.length || 1),
    totalShifts: affectedResults.reduce((sum, r) => sum + r.shifts.length, 0),
    mostAffectedTopics
  };
}
