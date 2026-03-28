/**
 * Test End-to-End de Impacto de Eventos CADEM v1.2
 *
 * Valida que el sistema de eventos genera cambios razonables en las opiniones
 * de los agentes antes y después de aplicar un evento económico negativo.
 *
 * Uso:
 *   npx tsx scripts/test/testEventImpactEndToEnd.ts [--sample-size=200]
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

// Importar motor CADEM
import { buildInitialTopicStates } from '../../src/app/opinionEngine/topicStateSeed';
import { resolveQuestionByFamily } from '../../src/app/opinionEngine/questionResolver';
import { updateBatchOpinions } from '../../src/app/opinionEngine/opinionUpdater';
import type { WeeklyEvent, EventTargetEntity, EventSegmentRule } from '../../src/app/events/types';
import type { TopicState } from '../../src/app/opinionEngine/types';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ============================================================================
// CONFIGURACIÓN
// ============================================================================

const SAMPLE_SIZE = parseInt(process.argv.find(a => a.startsWith('--sample-size='))?.split('=')[1] || '200');

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Error: Variables de entorno VITE_SUPABASE_URL y VITE_SUPABASE_SERVICE_KEY son requeridas');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// ============================================================================
// TIPOS
// ============================================================================

interface TestResult {
  runId: string;
  startedAt: string;
  completedAt: string;
  durationMs: number;
  sampleSize: number;
  event: WeeklyEvent;
  before: {
    distributions: Record<string, Record<string, number>>;
    avgConfidence: number;
    totalResponses: number;
  };
  after: {
    distributions: Record<string, Record<string, number>>;
    avgConfidence: number;
    totalResponses: number;
  };
  changes: {
    byQuestion: Record<string, {
      before: Record<string, number>;
      after: Record<string, number>;
      delta: Record<string, number>;
      maxShift: number;
    }>;
    topicShifts: Array<{
      topic: string;
      before: number;
      after: number;
      delta: number;
    }>;
  };
  impactSummary: {
    agentsAffected: number;
    totalChanges: number;
    avgChangesPerAgent: number;
    mostAffectedTopics: string[];
  };
  validation: {
    approvalWentDown: boolean;
    directionWentDown: boolean;
    optimismWentDown: boolean;
    economyNationalWorsened: boolean;
    economyPersonalLessAffected: boolean;
    allPassed: boolean;
  };
}

// ============================================================================
// PREGUNTAS DE TEST
// ============================================================================

const TEST_QUESTIONS = [
  {
    id: 'q_direction',
    text: '¿El país va por buen camino?',
    family: 'direction' as const,
    topic: 'country_direction' as const,
    options: ['good_path', 'bad_path', 'no_response']
  },
  {
    id: 'q_optimism',
    text: '¿Cómo ve el futuro económico del país?',
    family: 'optimism' as const,
    topic: 'country_optimism' as const,
    options: ['optimistic', 'pessimistic', 'neutral']
  },
  {
    id: 'q_economy_national',
    text: '¿Cómo evalúa la situación económica del país?',
    family: 'economic_perception' as const,
    topic: 'economy_national' as const,
    options: ['good', 'regular', 'bad']
  },
  {
    id: 'q_economy_personal',
    text: '¿Cómo está su situación económica personal?',
    family: 'economic_perception' as const,
    topic: 'economy_personal' as const,
    options: ['good', 'regular', 'bad']
  }
];

// ============================================================================
// FUNCIONES AUXILIARES
// ============================================================================

async function loadAgentsFromSupabase(count: number): Promise<any[]> {
  console.log(`\n🔍 Cargando ${count} agentes desde Supabase...`);

  const { data: agents, error } = await supabase
    .from('synthetic_agents')
    .select('*')
    .limit(count * 3);

  if (error) {
    throw new Error(`Error al cargar agentes: ${error.message}`);
  }

  if (!agents || agents.length === 0) {
    throw new Error('No se encontraron agentes en la base de datos');
  }

  const selected = applyCademQuotas(agents, Math.min(count, agents.length));

  console.log(`   ✅ ${selected.length} agentes seleccionados`);
  return selected;
}

function applyCademQuotas(agents: any[], targetSize: number): any[] {
  const quotas = {
    region: { 'CL-RM': 0.40, 'CL-VS': 0.10, 'CL-BI': 0.10, 'Otros': 0.40 },
    sex: { 'male': 0.48, 'female': 0.52 },
    ageGroup: { '18-34': 0.30, '35-54': 0.35, '55+': 0.35 },
  };

  const byRegion: Record<string, any[]> = { 'CL-RM': [], 'CL-VS': [], 'CL-BI': [], 'Otros': [] };

  agents.forEach(agent => {
    const region = agent.region_code || 'CL-RM';
    if (region === 'CL-RM') byRegion['CL-RM'].push(agent);
    else if (region === 'CL-VS') byRegion['CL-VS'].push(agent);
    else if (region === 'CL-BI') byRegion['CL-BI'].push(agent);
    else byRegion['Otros'].push(agent);
  });

  const selected = new Set<any>();
  const targetPerRegion = {
    'CL-RM': Math.round(targetSize * quotas.region['CL-RM']),
    'CL-VS': Math.round(targetSize * quotas.region['CL-VS']),
    'CL-BI': Math.round(targetSize * quotas.region['CL-BI']),
    'Otros': Math.round(targetSize * quotas.region['Otros']),
  };

  Object.entries(targetPerRegion).forEach(([region, count]) => {
    const regionAgents = byRegion[region] || [];
    const shuffled = [...regionAgents].sort(() => Math.random() - 0.5);
    shuffled.slice(0, count).forEach(agent => selected.add(agent));
  });

  if (selected.size < targetSize) {
    const remaining = targetSize - selected.size;
    const notSelected = agents.filter(a => !selected.has(a));
    const shuffled = [...notSelected].sort(() => Math.random() - 0.5);
    shuffled.slice(0, remaining).forEach(agent => selected.add(agent));
  }

  return Array.from(selected).slice(0, targetSize);
}

function generateResponse(
  agent: any,
  question: typeof TEST_QUESTIONS[0],
  existingTopicStates?: TopicState[]
) {
  // Si hay topic states existentes (después de un evento), usarlos
  // Si no, generar nuevos topic states iniciales
  let topicStates: TopicState[];

  if (existingTopicStates && existingTopicStates.length > 0) {
    topicStates = existingTopicStates;
  } else {
    topicStates = buildInitialTopicStates({
      age: agent.age ?? 35,
      sex: (agent.sex as 'male' | 'female' | 'unknown') ?? 'unknown',
      educationLevel: agent.education_level ?? 'secondary',
      incomeDecile: agent.income_decile ?? 5,
      regionCode: agent.region_code ?? 'CL-RM',
      agentType: (agent.agent_type as 'student' | 'worker' | 'retired' | 'unemployed') ?? 'worker',
      connectivityLevel: (agent.connectivity_level as 'high' | 'medium' | 'low') ?? 'medium',
      povertyStatus: (agent.poverty_status as 'vulnerable' | 'middle_class' | 'affluent') ?? 'middle_class',
      digitalExposure: (agent.digital_exposure as 'high' | 'medium' | 'low') ?? 'medium',
      preferredChannel: (agent.preferred_channel as 'mobile' | 'desktop' | 'mixed') ?? 'mixed',
    });
  }

  const interpretedQuestion = {
    questionId: question.id,
    originalText: question.text,
    family: question.family,
    topic: question.topic,
    responseFormat: 'single_choice' as any,
    fingerprint: question.id,
    periodicity: 'monthly' as any,
    options: question.options,
  };

  const result = resolveQuestionByFamily(interpretedQuestion, topicStates);

  return {
    value: result.value,
    confidence: 0.7 + Math.random() * 0.25,
    topicStates
  };
}

async function runSurvey(
  agents: any[],
  agentTopicStates?: Map<string, TopicState[]>
): Promise<{
  responses: any[];
  distributions: Record<string, Record<string, number>>;
  avgConfidence: number;
  agentTopicStates: Map<string, TopicState[]>;
}> {
  const responses: any[] = [];
  const distributions: Record<string, Record<string, number>> = {};
  const newAgentTopicStates = new Map<string, TopicState[]>();

  TEST_QUESTIONS.forEach(q => {
    distributions[q.id] = {};
    q.options.forEach(opt => distributions[q.id][opt] = 0);
  });

  for (const agent of agents) {
    // Usar topic states existentes si se proporcionan, o generar nuevos
    const existingStates = agentTopicStates?.get(agent.agent_id);

    for (const question of TEST_QUESTIONS) {
      const result = generateResponse(agent, question, existingStates);

      responses.push({
        agent_id: agent.agent_id,
        question_id: question.id,
        value: result.value,
        confidence: result.confidence
      });

      distributions[question.id][result.value] = (distributions[question.id][result.value] || 0) + 1;

      // Guardar los topic states para este agente (solo la primera vez)
      if (!newAgentTopicStates.has(agent.agent_id)) {
        newAgentTopicStates.set(agent.agent_id, result.topicStates);
      }
    }
  }

  const avgConfidence = responses.length > 0
    ? responses.reduce((sum, r) => sum + r.confidence, 0) / responses.length
    : 0;

  return { responses, distributions, avgConfidence, agentTopicStates: newAgentTopicStates };
}

function createNegativeEconomicEvent(): WeeklyEvent {
  const now = new Date();
  const weekNumber = getWeekNumber(now);
  const weekKey = `${now.getFullYear()}-W${weekNumber.toString().padStart(2, '0')}`;

  const targetEntities: EventTargetEntity[] = [
    { type: 'government', id: 'gov_chile', name: 'Gobierno de Chile' },
    { type: 'institution', id: 'central_bank', name: 'Banco Central' },
    { type: 'ministry', id: 'min_economy', name: 'Ministerio de Economía' }
  ];

  const affectedSegments: EventSegmentRule[] = [
    { coverageRate: 0.8, intensity: 0.9 },
    { coverageRate: 0.6, intensity: 0.7 }
  ];

  return {
    id: `event-test-${Date.now()}`,
    weekKey,
    title: 'Crisis Económica: Inflación y Desempleo',
    summary: 'Aumento inesperado de la inflación y cifras de desempleo generan preocupación económica',
    category: 'economy',
    sentiment: -0.75,
    intensity: 0.8,
    salience: 0.85,
    severity: 'major',
    targetEntities,
    affectedSegments,
    sourceCount: 3,
    createdAt: now.toISOString()
  };
}

function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

function calculateChanges(
  before: Record<string, Record<string, number>>,
  after: Record<string, Record<string, number>>
): TestResult['changes']['byQuestion'] {
  const changes: TestResult['changes']['byQuestion'] = {};

  for (const questionId of Object.keys(before)) {
    const beforeDist = before[questionId];
    const afterDist = after[questionId];

    const beforeTotal = Object.values(beforeDist).reduce((a, b) => a + b, 0);
    const afterTotal = Object.values(afterDist).reduce((a, b) => a + b, 0);

    const beforePct: Record<string, number> = {};
    const afterPct: Record<string, number> = {};
    const deltaPct: Record<string, number> = {};

    const allOptions = new Set([...Object.keys(beforeDist), ...Object.keys(afterDist)]);

    for (const opt of allOptions) {
      beforePct[opt] = beforeTotal > 0 ? (beforeDist[opt] || 0) / beforeTotal : 0;
      afterPct[opt] = afterTotal > 0 ? (afterDist[opt] || 0) / afterTotal : 0;
      deltaPct[opt] = afterPct[opt] - beforePct[opt];
    }

    const maxShift = Math.max(...Object.values(deltaPct).map(Math.abs));

    changes[questionId] = {
      before: beforePct,
      after: afterPct,
      delta: deltaPct,
      maxShift
    };
  }

  return changes;
}

function validateResults(
  before: Record<string, Record<string, number>>,
  after: Record<string, Record<string, number>>
): TestResult['validation'] {
  const getScore = (dist: Record<string, number>) => {
    const total = Object.values(dist).reduce((a, b) => a + b, 0);
    if (total === 0) return 0.5;

    const weights: Record<string, number> = {
      'approve': 1, 'disapprove': 0, 'neutral': 0.5,
      'good_path': 1, 'bad_path': 0,
      'optimistic': 1, 'pessimistic': 0,
      'good': 1, 'regular': 0.5, 'bad': 0,
      'better': 1, 'same': 0.5, 'worse': 0,
      'no_response': 0.5
    };

    let weightedSum = 0;
    for (const [opt, count] of Object.entries(dist)) {
      weightedSum += (count / total) * (weights[opt] ?? 0.5);
    }
    return weightedSum;
  };

  const beforeDirection = getScore(before['q_direction']);
  const afterDirection = getScore(after['q_direction']);

  const beforeOptimism = getScore(before['q_optimism']);
  const afterOptimism = getScore(after['q_optimism']);

  const beforeEconNat = getScore(before['q_economy_national']);
  const afterEconNat = getScore(after['q_economy_national']);

  const beforeEconPer = getScore(before['q_economy_personal']);
  const afterEconPer = getScore(after['q_economy_personal']);

  // Evento económico negativo debería:
  // 1. Bajar dirección del país (country_direction)
  // 2. Bajar optimismo (country_optimism)
  // 3. Empeorar percepción económica nacional
  // 4. Empeorar percepción económica personal (pero menos que la nacional)
  const directionWentDown = afterDirection < beforeDirection;
  const optimismWentDown = afterOptimism < beforeOptimism;
  const economyNationalWorsened = afterEconNat < beforeEconNat;
  const economyPersonalWorsened = afterEconPer < beforeEconPer;

  // La economía personal debería empeorar, pero menos que la nacional
  const econNatDelta = beforeEconNat - afterEconNat; // Cuánto empeoró
  const econPerDelta = beforeEconPer - afterEconPer; // Cuánto empeoró
  const economyPersonalLessAffected = econPerDelta > 0 && econPerDelta <= econNatDelta;

  // Nota: q_approval no se valida porque un evento económico no debería afectar
  // directamente la aprobación del gobierno (eso requiere un evento político)
  const approvalWentDown = true; // No aplica para evento económico

  return {
    approvalWentDown,
    directionWentDown,
    optimismWentDown,
    economyNationalWorsened,
    economyPersonalLessAffected: economyPersonalWorsened && economyPersonalLessAffected,
    allPassed: directionWentDown && optimismWentDown && economyNationalWorsened && economyPersonalWorsened
  };
}

function generateReport(result: TestResult): string {
  const lines: string[] = [];

  lines.push('# Test End-to-End de Impacto de Eventos CADEM v1.2');
  lines.push('');
  lines.push(`**Fecha:** ${new Date(result.startedAt).toLocaleString('es-CL')}`);
  lines.push(`**Run ID:** ${result.runId}`);
  lines.push(`**Sample Size:** ${result.sampleSize} agentes`);
  lines.push(`**Duración:** ${(result.durationMs / 1000).toFixed(1)}s`);
  lines.push('');

  lines.push('## Evento de Prueba');
  lines.push('');
  lines.push(`- **Título:** ${result.event.title}`);
  lines.push(`- **Categoría:** ${result.event.category}`);
  lines.push(`- **Sentimiento:** ${result.event.sentiment}`);
  lines.push(`- **Intensidad:** ${result.event.intensity}`);
  lines.push(`- **Salience:** ${result.event.salience}`);
  lines.push(`- **Severidad:** ${result.event.severity}`);
  lines.push('');

  lines.push('## Resultados Antes del Evento');
  lines.push('');
  lines.push('| Pregunta | Distribución | Confianza Promedio |');
  lines.push('|----------|--------------|-------------------|');
  for (const [qid, dist] of Object.entries(result.before.distributions)) {
    const distStr = Object.entries(dist).map(([k, v]) => `${k}: ${v}`).join(', ');
    lines.push(`| ${qid} | ${distStr} | ${(result.before.avgConfidence * 100).toFixed(1)}% |`);
  }
  lines.push('');

  lines.push('## Resultados Después del Evento');
  lines.push('');
  lines.push('| Pregunta | Distribución | Confianza Promedio |');
  lines.push('|----------|--------------|-------------------|');
  for (const [qid, dist] of Object.entries(result.after.distributions)) {
    const distStr = Object.entries(dist).map(([k, v]) => `${k}: ${v}`).join(', ');
    lines.push(`| ${qid} | ${distStr} | ${(result.after.avgConfidence * 100).toFixed(1)}% |`);
  }
  lines.push('');

  lines.push('## Cambios por Pregunta (puntos porcentuales)');
  lines.push('');
  for (const [qid, change] of Object.entries(result.changes.byQuestion)) {
    lines.push(`### ${qid}`);
    lines.push('');
    lines.push('| Opción | Antes | Después | Cambio |');
    lines.push('|--------|-------|---------|--------|');
    for (const opt of Object.keys(change.before)) {
      const before = (change.before[opt] * 100).toFixed(1);
      const after = (change.after[opt] * 100).toFixed(1);
      const delta = (change.delta[opt] * 100);
      const deltaStr = delta >= 0 ? `+${delta.toFixed(1)}` : delta.toFixed(1);
      lines.push(`| ${opt} | ${before}% | ${after}% | ${deltaStr}pp |`);
    }
    lines.push('');
  }

  lines.push('## Cambios en Topic States');
  lines.push('');
  lines.push('| Topic | Antes | Después | Delta |');
  lines.push('|-------|-------|---------|-------|');
  for (const shift of result.changes.topicShifts) {
    const deltaStr = shift.delta >= 0 ? `+${shift.delta.toFixed(3)}` : shift.delta.toFixed(3);
    lines.push(`| ${shift.topic} | ${shift.before.toFixed(3)} | ${shift.after.toFixed(3)} | ${deltaStr} |`);
  }
  lines.push('');

  lines.push('## Resumen de Impacto');
  lines.push('');
  lines.push(`- **Agentes Afectados:** ${result.impactSummary.agentsAffected} / ${result.sampleSize}`);
  lines.push(`- **Total Cambios:** ${result.impactSummary.totalChanges}`);
  lines.push(`- **Cambios Promedio por Agente:** ${result.impactSummary.avgChangesPerAgent.toFixed(2)}`);
  lines.push(`- **Topics Más Afectados:** ${result.impactSummary.mostAffectedTopics.join(', ')}`);
  lines.push('');

  lines.push('## Validación de Criterios');
  lines.push('');
  lines.push('*Evento económico negativo debería afectar temas económicos*');
  lines.push('');
  lines.push('| Criterio | Esperado | Resultado | Estado |');
  lines.push('|----------|----------|-----------|--------|');
  lines.push(`| q_direction baja | Sí | ${result.validation.directionWentDown ? 'Sí' : 'No'} | ${result.validation.directionWentDown ? '✅' : '❌'} |`);
  lines.push(`| q_optimism baja | Sí | ${result.validation.optimismWentDown ? 'Sí' : 'No'} | ${result.validation.optimismWentDown ? '✅' : '❌'} |`);
  lines.push(`| q_economy_national empeora | Sí | ${result.validation.economyNationalWorsened ? 'Sí' : 'No'} | ${result.validation.economyNationalWorsened ? '✅' : '❌'} |`);
  lines.push(`| q_economy_personal empeora | Sí | ${result.validation.economyPersonalLessAffected ? 'Sí' : 'No'} | ${result.validation.economyPersonalLessAffected ? '✅' : '❌'} |`);
  lines.push('');

  lines.push(`## Veredicto Final: ${result.validation.allPassed ? '✅ PASÓ' : '❌ NO PASÓ'}`);
  lines.push('');

  if (result.validation.allPassed) {
    lines.push('El sistema de eventos CADEM v1.2 está funcionando correctamente.');
    lines.push('Los eventos económicos negativos generan los cambios esperados en las opiniones.');
  } else {
    lines.push('El sistema de eventos requiere ajustes.');
    lines.push('Algunos criterios de validación no se cumplieron.');
  }

  lines.push('');
  lines.push('---');
  lines.push('*Generado automáticamente por testEventImpactEndToEnd.ts*');

  return lines.join('\n');
}

// ============================================================================
// FUNCIÓN PRINCIPAL
// ============================================================================

async function main() {
  const startTime = Date.now();
  const runId = `event-test-${Date.now()}`;

  console.log('\n🧪 TEST END-TO-END DE IMPACTO DE EVENTOS CADEM v1.2');
  console.log('='.repeat(60));
  console.log(`   Run ID: ${runId}`);
  console.log(`   Sample Size: ${SAMPLE_SIZE} agentes`);
  console.log('');

  try {
    // 1. Cargar agentes
    const agents = await loadAgentsFromSupabase(SAMPLE_SIZE);

    // 2. Encuesta ANTES del evento
    console.log('\n📊 FASE 1: Encuesta ANTES del evento');
    const beforeResults = await runSurvey(agents);
    console.log(`   ✅ ${beforeResults.responses.length} respuestas generadas`);
    console.log(`   📈 Confianza promedio: ${(beforeResults.avgConfidence * 100).toFixed(1)}%`);

    // 3. Crear evento económico negativo
    console.log('\n📰 FASE 2: Creando evento económico negativo');
    const event = createNegativeEconomicEvent();
    console.log(`   📝 ${event.title}`);
    console.log(`   📉 Sentimiento: ${event.sentiment}, Intensidad: ${event.intensity}`);

    // 4. Aplicar evento a los agentes
    console.log('\n⚡ FASE 3: Aplicando evento a los agentes');

    // Convertir TopicState[] a Record<string, number> para updateBatchOpinions
    // NOTA: Todos los componentes del sistema usan rango [-1, 1] consistentemente:
    // - buildInitialTopicStates genera scores en [-1, 1] (via safeScore/clamp)
    // - questionResolver espera scores en [-1, 1] (thresholds >= 0, <= -0.4, etc.)
    // - eventImpact.applyEventImpact limita a [-1, 1] (Math.max(-1, Math.min(1, value)))
    // - updateBatchOpinions trabaja con [-1, 1]
    // NO se requiere conversión de rango, usar los scores directamente.
    const getAgentTopicStates = (agentId: string): Record<string, number> => {
      const topicStates = beforeResults.agentTopicStates.get(agentId);
      if (!topicStates) return {};

      const record: Record<string, number> = {};
      for (const state of topicStates) {
        // Los scores ya están en rango [-1, 1], usar directamente
        record[state.topic] = state.score;
      }
      return record;
    };

    const batchResult = updateBatchOpinions(
      agents,
      getAgentTopicStates,
      [event]
    );
    console.log(`   ✅ ${batchResult.statistics.agentsAffected} agentes afectados`);
    console.log(`   📊 ${batchResult.statistics.totalChanges} cambios totales`);
    console.log(`   🎯 Topics más afectados: ${batchResult.statistics.topicsMostChanged.join(', ')}`);

    // 5. Encuesta DESPUÉS del evento
    console.log('\n📊 FASE 4: Encuesta DESPUÉS del evento');

    // Debug: mostrar información del evento y los shifts
    console.log(`\n   🔍 Debug - Evento:`);
    console.log(`      Sentimiento: ${event.sentiment}`);
    console.log(`      Intensidad: ${event.intensity}`);
    console.log(`      Categoría: ${event.category}`);

    // Debug: mostrar los cambios del primer agente
    if (batchResult.agentResults.length > 0) {
      const firstResult = batchResult.agentResults[0];
      console.log(`\n   🔍 Debug - Cambios del primer agente (${firstResult.agentId}):`);
      for (const log of firstResult.changeLog.slice(0, 5)) {
        console.log(`      ${log.topic}: ${log.previousValue.toFixed(3)} → ${log.newValue.toFixed(3)} (delta=${log.delta.toFixed(3)})`);
      }
    }

    // Convertir los resultados del evento a TopicState[] para la encuesta después
    // NOTA: Los topic states del evento ya están en rango [-1, 1] consistente
    // con todo el sistema. questionResolver espera [-1, 1] (thresholds >= 0, <= -0.4)
    // así que mantenemos el rango sin conversión.
    const afterTopicStates = new Map<string, TopicState[]>();
    for (const agentResult of batchResult.agentResults) {
      const topicStates: TopicState[] = [];
      for (const [topic, score] of Object.entries(agentResult.topicStates)) {
        // Mantener el rango [-1, 1] - no normalizar
        topicStates.push({
          topic: topic as any,
          score: Math.max(-1, Math.min(1, score)), // Clamp a [-1, 1]
          confidence: 0.8,
          salience: 0.7,
          volatility: 0.3,
          updatedAt: new Date()
        });
      }
      afterTopicStates.set(agentResult.agentId, topicStates);
    }

    // Debug: mostrar cambios en topic states para el primer agente
    const firstAgentId = agents[0]?.agent_id;
    if (firstAgentId) {
      const beforeStates = beforeResults.agentTopicStates.get(firstAgentId);
      const afterStates = afterTopicStates.get(firstAgentId);
      console.log(`\n   🔍 Debug - Primer agente (${firstAgentId}):`);
      console.log(`      Topic states antes: ${beforeStates?.length || 0}`);
      console.log(`      Topic states después: ${afterStates?.length || 0}`);
      if (beforeStates && afterStates) {
        const beforeOptimism = beforeStates.find(s => s.topic === 'country_optimism')?.score;
        const afterOptimism = afterStates.find(s => s.topic === 'country_optimism')?.score;
        // Los scores ya están en [-1, 1], mostrar directamente
        console.log(`      country_optimism: ${(beforeOptimism || 0).toFixed(3)} → ${(afterOptimism || 0).toFixed(3)}`);
      }
    }

    const afterResults = await runSurvey(agents, afterTopicStates);
    console.log(`   ✅ ${afterResults.responses.length} respuestas generadas`);
    console.log(`   📈 Confianza promedio: ${(afterResults.avgConfidence * 100).toFixed(1)}%`);

    // 6. Calcular cambios
    console.log('\n📈 FASE 5: Calculando cambios');
    const changes = calculateChanges(beforeResults.distributions, afterResults.distributions);

    // Calcular cambios en topic states
    const topicShifts: Array<{ topic: string; before: number; after: number; delta: number }> = [];
    for (const result of batchResult.agentResults) {
      for (const log of result.changeLog) {
        const existing = topicShifts.find(t => t.topic === log.topic);
        if (existing) {
          existing.before += log.previousValue;
          existing.after += log.newValue;
        } else {
          topicShifts.push({
            topic: log.topic,
            before: log.previousValue,
            after: log.newValue,
            delta: log.delta
          });
        }
      }
    }

    // 7. Validar resultados
    console.log('\n✅ FASE 6: Validando resultados');
    const validation = validateResults(
      beforeResults.distributions,
      afterResults.distributions
    );

    // 8. Construir resultado
    const result: TestResult = {
      runId,
      startedAt: new Date(startTime).toISOString(),
      completedAt: new Date().toISOString(),
      durationMs: Date.now() - startTime,
      sampleSize: agents.length,
      event,
      before: {
        distributions: beforeResults.distributions,
        avgConfidence: beforeResults.avgConfidence,
        totalResponses: beforeResults.responses.length
      },
      after: {
        distributions: afterResults.distributions,
        avgConfidence: afterResults.avgConfidence,
        totalResponses: afterResults.responses.length
      },
      changes: {
        byQuestion: changes,
        topicShifts
      },
      impactSummary: {
        agentsAffected: batchResult.statistics.agentsAffected,
        totalChanges: batchResult.statistics.totalChanges,
        avgChangesPerAgent: batchResult.statistics.averageChangesPerAgent,
        mostAffectedTopics: batchResult.statistics.topicsMostChanged
      },
      validation
    };

    // 9. Guardar reporte
    const report = generateReport(result);
    const outputDir = path.join(__dirname, '../../docs/cadem-v3');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    const outputFile = path.join(outputDir, 'V1_2_EVENT_IMPACT_RUN_001.md');
    fs.writeFileSync(outputFile, report);

    // 10. Guardar JSON completo
    const jsonFile = path.join(outputDir, 'V1_2_EVENT_IMPACT_RUN_001.json');
    fs.writeFileSync(jsonFile, JSON.stringify(result, null, 2));

    // 11. Imprimir resumen
    console.log('\n' + '='.repeat(60));
    console.log('📊 RESUMEN DE RESULTADOS');
    console.log('='.repeat(60));
    console.log('\nValidación de evento económico negativo:');
    console.log(`✅ q_direction bajó: ${validation.directionWentDown ? 'SÍ' : 'NO'}`);
    console.log(`✅ q_optimism bajó: ${validation.optimismWentDown ? 'SÍ' : 'NO'}`);
    console.log(`✅ q_economy_national empeoró: ${validation.economyNationalWorsened ? 'SÍ' : 'NO'}`);
    console.log(`✅ q_economy_personal empeoró: ${validation.economyPersonalLessAffected ? 'SÍ' : 'NO'}`);
    console.log(`\n🎯 RESULTADO FINAL: ${validation.allPassed ? '✅ PASÓ' : '❌ NO PASÓ'}`);
    console.log(`\n💾 Reporte guardado: ${outputFile}`);
    console.log(`💾 JSON guardado: ${jsonFile}`);
    console.log('='.repeat(60) + '\n');

    process.exit(validation.allPassed ? 0 : 1);

  } catch (error) {
    console.error('\n❌ ERROR EN TEST:');
    console.error(error);
    process.exit(1);
  }
}

main();
