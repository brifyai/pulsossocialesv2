/**
 * Opinion Updater para CADEM v1.2
 * 
 * Orquesta la actualización de topic states de agentes
 * según eventos semanales, calculando exposición y aplicando
 * el impacto correspondiente.
 */

import type { SyntheticAgent } from '../../types/agent';
import type { TopicState } from './types';
import {
  type WeeklyEvent,
  type EventImpactResult,
  type TopicShift,
  type EventSystemConfig,
  DEFAULT_EVENT_CONFIG
} from '../events/types';
import {
  calculateInformationProfile,
  calculateExposure,
  calculateAllShifts,
  applyEventImpact,
  processEventForAgent,
  processMultipleEvents,
  summarizeEventImpact
} from '../events/eventImpact';

// ============================================================================
// TIPOS DE RESULTADO
// ============================================================================

/**
 * Log de cambio para trazabilidad
 */
export interface OpinionChangeLog {
  /** Timestamp del cambio */
  timestamp: string;
  
  /** Evento que causó el cambio */
  eventId: string;
  
  /** Título del evento */
  eventTitle: string;
  
  /** Topic afectado */
  topic: string;
  
  /** Valor anterior */
  previousValue: number;
  
  /** Valor nuevo */
  newValue: number;
  
  /** Delta aplicado */
  delta: number;
  
  /** Nivel de exposición al evento */
  exposure: number;
  
  /** Confianza en el cambio */
  confidence: number;
}

/**
 * Resultado de actualizar un agente
 */
export interface AgentUpdateResult {
  /** ID del agente */
  agentId: string;
  
  /** Topic states actualizados */
  topicStates: Record<string, number>;
  
  /** Log de todos los cambios */
  changeLog: OpinionChangeLog[];
  
  /** Eventos que afectaron al agente */
  affectedByEvents: string[];
  
  /** Número total de cambios */
  totalChanges: number;
  
  /** Timestamp de actualización */
  updatedAt: string;
}

/**
 * Resultado de actualización batch
 */
export interface BatchUpdateResult {
  /** Resultados individuales por agente */
  agentResults: AgentUpdateResult[];
  
  /** Resumen de impacto por evento */
  eventSummaries: EventSummary[];
  
  /** Estadísticas agregadas */
  statistics: UpdateStatistics;
  
  /** Timestamp de inicio */
  startedAt: string;
  
  /** Timestamp de fin */
  completedAt: string;
  
  /** Duración en ms */
  durationMs: number;
}

/**
 * Resumen de impacto de un evento
 */
export interface EventSummary {
  eventId: string;
  title: string;
  category: string;
  totalAgents: number;
  affectedAgents: number;
  averageExposure: number;
  mostAffectedTopics: string[];
}

/**
 * Estadísticas de actualización
 */
export interface UpdateStatistics {
  totalAgents: number;
  agentsAffected: number;
  totalChanges: number;
  averageChangesPerAgent: number;
  topicsMostChanged: string[];
}

// ============================================================================
// FUNCIÓN PRINCIPAL
// ============================================================================

/**
 * Actualiza los topic states de un agente según una lista de eventos
 * 
 * @param agent - Agente a actualizar
 * @param currentTopicStates - Topic states actuales del agente
 * @param events - Lista de eventos semanales a aplicar
 * @param config - Configuración del sistema de eventos
 * @returns Resultado de la actualización
 */
export function updateAgentOpinion(
  agent: SyntheticAgent,
  currentTopicStates: Record<string, number>,
  events: WeeklyEvent[],
  config: EventSystemConfig = DEFAULT_EVENT_CONFIG
): AgentUpdateResult {
  const startTime = Date.now();
  
  // Procesar todos los eventos
  const { finalTopicStates, eventResults, totalShifts } = processMultipleEvents(
    agent,
    events,
    currentTopicStates,
    config
  );
  
  // Construir el log de cambios
  const changeLog: OpinionChangeLog[] = [];
  const affectedByEvents: string[] = [];
  
  for (const result of eventResults) {
    if (result.shifts.length === 0) continue;
    
    affectedByEvents.push(result.eventId);
    
    for (const shift of result.shifts) {
      // Encontrar el valor anterior (antes de este evento)
      const previousValue = currentTopicStates[shift.topic] ?? 0.5;
      
      changeLog.push({
        timestamp: result.appliedAt,
        eventId: result.eventId,
        eventTitle: events.find(e => e.id === result.eventId)?.title ?? 'Unknown',
        topic: shift.topic,
        previousValue,
        newValue: finalTopicStates[shift.topic],
        delta: shift.delta,
        exposure: result.exposure,
        confidence: shift.confidence
      });
    }
  }
  
  return {
    agentId: agent.agent_id,
    topicStates: finalTopicStates,
    changeLog,
    affectedByEvents,
    totalChanges: changeLog.length,
    updatedAt: new Date().toISOString()
  };
}

// ============================================================================
// ACTUALIZACIÓN BATCH
// ============================================================================

/**
 * Actualiza los topic states de múltiples agentes según eventos
 * 
 * @param agents - Lista de agentes a actualizar
 * @param getAgentTopicStates - Función para obtener topic states de cada agente
 * @param events - Lista de eventos a aplicar
 * @param config - Configuración del sistema
 * @returns Resultado batch con estadísticas
 */
export function updateBatchOpinions(
  agents: SyntheticAgent[],
  getAgentTopicStates: (agentId: string) => Record<string, number>,
  events: WeeklyEvent[],
  config: EventSystemConfig = DEFAULT_EVENT_CONFIG
): BatchUpdateResult {
  const startedAt = new Date().toISOString();
  const startTime = Date.now();
  
  const agentResults: AgentUpdateResult[] = [];
  const allEventResults: Map<string, EventImpactResult[]> = new Map();
  
  // Procesar cada agente
  for (const agent of agents) {
    const currentStates = getAgentTopicStates(agent.agent_id);
    const result = updateAgentOpinion(agent, currentStates, events, config);
    agentResults.push(result);
    
    // Acumular resultados por evento para resumen
    for (const eventId of result.affectedByEvents) {
      if (!allEventResults.has(eventId)) {
        allEventResults.set(eventId, []);
      }
      // Reconstruir el EventImpactResult simplificado
      const eventResult: EventImpactResult = {
        agentId: agent.agent_id,
        eventId,
        exposure: result.changeLog.find(c => c.eventId === eventId)?.exposure ?? 0,
        shifts: result.changeLog
          .filter(c => c.eventId === eventId)
          .map(c => ({
            topic: c.topic,
            delta: c.delta,
            confidence: c.confidence,
            reason: c.eventTitle
          })),
        updatedTopicStates: result.topicStates,
        appliedAt: result.updatedAt
      };
      allEventResults.get(eventId)!.push(eventResult);
    }
  }
  
  // Generar resúmenes por evento
  const eventSummaries: EventSummary[] = [];
  for (const event of events) {
    const results = allEventResults.get(event.id) ?? [];
    if (results.length > 0) {
      const summary = summarizeEventImpact(event, results);
      eventSummaries.push({
        eventId: summary.eventId,
        title: summary.title,
        category: event.category,
        totalAgents: summary.totalAgents,
        affectedAgents: summary.affectedAgents,
        averageExposure: summary.averageExposure,
        mostAffectedTopics: summary.mostAffectedTopics
      });
    }
  }
  
  // Calcular estadísticas
  const totalChanges = agentResults.reduce((sum, r) => sum + r.totalChanges, 0);
  const agentsAffected = agentResults.filter(r => r.totalChanges > 0).length;
  
  // Contar cambios por topic
  const topicChangeCounts: Record<string, number> = {};
  for (const result of agentResults) {
    for (const log of result.changeLog) {
      topicChangeCounts[log.topic] = (topicChangeCounts[log.topic] ?? 0) + 1;
    }
  }
  
  const topicsMostChanged = Object.entries(topicChangeCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([topic]) => topic);
  
  const completedAt = new Date().toISOString();
  
  return {
    agentResults,
    eventSummaries,
    statistics: {
      totalAgents: agents.length,
      agentsAffected,
      totalChanges,
      averageChangesPerAgent: totalChanges / (agents.length || 1),
      topicsMostChanged
    },
    startedAt,
    completedAt,
    durationMs: Date.now() - startTime
  };
}

// ============================================================================
// HELPERS Y UTILIDADES
// ============================================================================

/**
 * Obtiene los eventos relevantes para un agente específico
 * (filtra por exposición mínima)
 * 
 * @param agent - Agente a evaluar
 * @param events - Lista de eventos disponibles
 * @param minExposure - Exposición mínima requerida
 * @returns Eventos relevantes para el agente
 */
export function getRelevantEventsForAgent(
  agent: SyntheticAgent,
  events: WeeklyEvent[],
  minExposure: number = DEFAULT_EVENT_CONFIG.minExposureThreshold
): WeeklyEvent[] {
  return events.filter(event => {
    const exposure = calculateExposure(agent, event);
    return exposure.exposureLevel >= minExposure;
  });
}

/**
 * Calcula el cambio neto en un topic específico para un conjunto de agentes
 * 
 * @param results - Resultados de actualización
 * @param topic - Topic a analizar
 * @returns Estadísticas del cambio
 */
export function calculateTopicChangeStats(
  results: AgentUpdateResult[],
  topic: string
): {
  totalChange: number;
  averageChange: number;
  agentsAffected: number;
  maxIncrease: number;
  maxDecrease: number;
} {
  let totalChange = 0;
  let agentsAffected = 0;
  let maxIncrease = 0;
  let maxDecrease = 0;
  
  for (const result of results) {
    const topicChanges = result.changeLog.filter(c => c.topic === topic);
    if (topicChanges.length > 0) {
      const netChange = topicChanges.reduce((sum, c) => sum + c.delta, 0);
      totalChange += netChange;
      agentsAffected++;
      
      if (netChange > maxIncrease) maxIncrease = netChange;
      if (netChange < maxDecrease) maxDecrease = netChange;
    }
  }
  
  return {
    totalChange,
    averageChange: totalChange / (agentsAffected || 1),
    agentsAffected,
    maxIncrease,
    maxDecrease
  };
}

/**
 * Genera un reporte legible de los cambios
 * 
 * @param result - Resultado de actualización
 * @returns Reporte formateado
 */
export function generateChangeReport(result: AgentUpdateResult): string {
  const lines: string[] = [];
  
  lines.push(`Agente: ${result.agentId}`);
  lines.push(`Total cambios: ${result.totalChanges}`);
  lines.push(`Eventos afectados: ${result.affectedByEvents.length}`);
  lines.push('');
  
  if (result.changeLog.length > 0) {
    lines.push('Cambios detallados:');
    for (const log of result.changeLog) {
      const direction = log.delta > 0 ? '↑' : '↓';
      lines.push(
        `  ${direction} ${log.topic}: ${log.previousValue.toFixed(3)} → ${log.newValue.toFixed(3)} ` +
        `(${log.delta > 0 ? '+' : ''}${log.delta.toFixed(3)}) [${log.eventTitle}]`
      );
    }
  } else {
    lines.push('Sin cambios (agente no expuesto a eventos relevantes)');
  }
  
  return lines.join('\n');
}

/**
 * Compara topic states antes y después de aplicar eventos
 * 
 * @param before - Estados iniciales
 * @param after - Estados finales
 * @returns Diferencias encontradas
 */
export function compareTopicStates(
  before: Record<string, number>,
  after: Record<string, number>
): Array<{
  topic: string;
  before: number;
  after: number;
  delta: number;
}> {
  const allTopics = new Set([...Object.keys(before), ...Object.keys(after)]);
  const differences: Array<{
    topic: string;
    before: number;
    after: number;
    delta: number;
  }> = [];
  
  for (const topic of allTopics) {
    const beforeVal = before[topic] ?? 0.5;
    const afterVal = after[topic] ?? 0.5;
    const delta = afterVal - beforeVal;
    
    if (Math.abs(delta) > 0.001) {
      differences.push({ topic, before: beforeVal, after: afterVal, delta });
    }
  }
  
  return differences.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
}

// ============================================================================
// EXPORTACIÓN DE MÓDULO
// ============================================================================

export const OpinionUpdater = {
  updateAgentOpinion,
  updateBatchOpinions,
  getRelevantEventsForAgent,
  calculateTopicChangeStats,
  generateChangeReport,
  compareTopicStates
};

export default OpinionUpdater;
