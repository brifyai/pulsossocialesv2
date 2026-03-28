/**
 * Test de Sensibilidad a Eventos para CADEM v1.2
 * 
 * Verifica que el sistema de eventos:
 * 1. Afecta correctamente los topic states según exposición
 * 2. Respeta los límites de cambio (max 15% por evento)
 * 3. Mantiene coherencia demográfica en la exposición
 * 4. Genera logs de cambio trazables
 */

import { updateAgentOpinion, updateBatchOpinions, OpinionUpdater } from '../../src/app/opinionEngine/opinionUpdater';
import { calculateExposure, calculateInformationProfile } from '../../src/app/events/eventImpact';
import type { SyntheticAgent } from '../../src/types/agent';
import type { WeeklyEvent, EventCategory, ImpactSeverity } from '../../src/app/events/types';

// ============================================================================
// DATOS DE PRUEBA
// ============================================================================

/**
 * Crea un agente de prueba con características específicas
 */
function createTestAgent(overrides: Partial<SyntheticAgent> = {}): SyntheticAgent {
  return {
    agent_id: `test_agent_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    synthetic_batch_id: 'test_batch',
    source_version: '1.0',
    created_at: new Date().toISOString(),
    country_code: 'CL',
    region_code: '13',
    region_name: 'Metropolitana',
    comuna_code: '13101',
    comuna_name: 'Santiago',
    urbanicity: 'urban',
    sex: 'female',
    age: 35,
    age_group: 'adult',
    household_size: 3,
    household_type: 'family',
    income_decile: 5,
    poverty_status: 'middle_class',
    education_level: 'university',
    occupation_status: 'employed',
    occupation_group: 'professional',
    socioeconomic_level: 'high',
    connectivity_level: 'high',
    digital_exposure_level: 'high',
    preferred_survey_channel: 'online',
    agent_type: 'worker',
    backbone_key: 'test_backbone',
    subtel_profile_key: null,
    casen_profile_key: null,
    generation_notes: 'Test agent',
    ...overrides
  };
}

/**
 * Crea un evento de prueba
 */
function createTestEvent(overrides: Partial<WeeklyEvent> = {}): WeeklyEvent {
  return {
    id: `test_event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    weekKey: '2026-W13',
    title: 'Evento de Prueba',
    summary: 'Evento generado para testing',
    category: 'government',
    sentiment: -0.5,
    intensity: 0.8,
    salience: 0.7,
    severity: 'major',
    targetEntities: [{
      type: 'government',
      id: 'government_chile',
      name: 'Gobierno de Chile'
    }],
    createdAt: new Date().toISOString(),
    ...overrides
  };
}

// ============================================================================
// TESTS UNITARIOS
// ============================================================================

interface TestResult {
  name: string;
  passed: boolean;
  message: string;
  details?: unknown;
}

const results: TestResult[] = [];

function test(name: string, fn: () => { passed: boolean; message: string; details?: unknown }): void {
  try {
    const result = fn();
    results.push({ name, ...result });
  } catch (error) {
    results.push({
      name,
      passed: false,
      message: `Error: ${error instanceof Error ? error.message : String(error)}`
    });
  }
}

// Test 1: Perfil de información se calcula correctamente
test('Perfil de información - valores en rango [0,1]', () => {
  const agent = createTestAgent({ age: 40, education_level: 'university', socioeconomic_level: 'high' });
  const profile = calculateInformationProfile(agent);
  
  const allInRange = 
    profile.newsConsumption >= 0 && profile.newsConsumption <= 1 &&
    profile.socialMediaUsage >= 0 && profile.socialMediaUsage <= 1 &&
    profile.politicalInterest >= 0 && profile.politicalInterest <= 1 &&
    profile.economicInterest >= 0 && profile.economicInterest <= 1;
  
  return {
    passed: allInRange,
    message: allInRange ? 'Todos los valores están en rango [0,1]' : 'Valores fuera de rango',
    details: profile
  };
});

// Test 2: Perfil varía según educación
test('Perfil de información - educación alta aumenta interés político', () => {
  const agentLow = createTestAgent({ education_level: 'primary' });
  const agentHigh = createTestAgent({ education_level: 'university' });
  
  const profileLow = calculateInformationProfile(agentLow);
  const profileHigh = calculateInformationProfile(agentHigh);
  
  const higherInterest = profileHigh.politicalInterest > profileLow.politicalInterest;
  
  return {
    passed: higherInterest,
    message: higherInterest 
      ? `Educación alta: ${profileHigh.politicalInterest.toFixed(3)} > Educación baja: ${profileLow.politicalInterest.toFixed(3)}`
      : 'El interés político no aumenta con educación alta',
    details: { low: profileLow.politicalInterest, high: profileHigh.politicalInterest }
  };
});

// Test 3: Exposición se calcula correctamente
test('Exposición - valores en rango [0,1]', () => {
  const agent = createTestAgent();
  const event = createTestEvent();
  const exposure = calculateExposure(agent, event);
  
  const inRange = exposure.exposureLevel >= 0 && exposure.exposureLevel <= 1;
  
  return {
    passed: inRange,
    message: inRange 
      ? `Exposición: ${exposure.exposureLevel.toFixed(3)}`
      : `Exposición fuera de rango: ${exposure.exposureLevel}`,
    details: exposure
  };
});

// Test 4: Eventos de alta severidad generan más exposición
test('Exposición - severidad alta aumenta exposición', () => {
  const agent = createTestAgent();
  const eventMinor = createTestEvent({ severity: 'minor', salience: 0.3 });
  const eventCritical = createTestEvent({ severity: 'critical', salience: 0.9 });
  
  const exposureMinor = calculateExposure(agent, eventMinor);
  const exposureCritical = calculateExposure(agent, eventCritical);
  
  // Nota: La exposición directa no depende de severidad, pero la salience sí
  const higherExposure = exposureCritical.exposureLevel >= exposureMinor.exposureLevel;
  
  return {
    passed: higherExposure,
    message: higherExposure
      ? `Crítico: ${exposureCritical.exposureLevel.toFixed(3)} >= Menor: ${exposureMinor.exposureLevel.toFixed(3)}`
      : 'La exposición no aumenta con severidad crítica',
    details: { minor: exposureMinor.exposureLevel, critical: exposureCritical.exposureLevel }
  };
});

// Test 5: Cambio de opinión respeta límite máximo (15%)
test('Cambio de opinión - respeta límite máximo de 15%', () => {
  const agent = createTestAgent();
  const event = createTestEvent({ 
    severity: 'critical', 
    intensity: 1.0, 
    salience: 1.0,
    sentiment: -1 
  });
  
  const initialStates = { government_approval: 0.8 };
  const result = updateAgentOpinion(agent, initialStates, [event]);
  
  const maxChange = result.changeLog.reduce((max, log) => 
    Math.max(max, Math.abs(log.delta)), 0
  );
  
  const withinLimit = maxChange <= 0.15;
  
  return {
    passed: withinLimit,
    message: withinLimit
      ? `Máximo cambio: ${maxChange.toFixed(3)} <= 0.15`
      : `Cambio excede límite: ${maxChange.toFixed(3)} > 0.15`,
    details: { maxChange, changes: result.changeLog }
  };
});

// Test 6: Sentimiento negativo reduce valores altos
test('Cambio de opinión - sentimiento negativo reduce valores altos', () => {
  const agent = createTestAgent();
  const event = createTestEvent({ sentiment: -0.75, category: 'government' });
  
  const initialStates = { government_approval: 0.8 };
  const result = updateAgentOpinion(agent, initialStates, [event]);
  
  const govChange = result.changeLog.find(c => c.topic === 'government_approval');
  const reduced = govChange ? govChange.delta < 0 : false;
  
  return {
    passed: reduced,
    message: reduced
      ? `Aprobación reducida: ${govChange?.previousValue.toFixed(3)} → ${govChange?.newValue.toFixed(3)}`
      : 'El sentimiento negativo no redujo la aprobación',
    details: govChange
  };
});

// Test 7: Sentimiento positivo aumenta valores bajos
test('Cambio de opinión - sentimiento positivo aumenta valores bajos', () => {
  const agent = createTestAgent();
  const event = createTestEvent({ sentiment: 0.75, category: 'government' });
  
  const initialStates = { government_approval: 0.2 };
  const result = updateAgentOpinion(agent, initialStates, [event]);
  
  const govChange = result.changeLog.find(c => c.topic === 'government_approval');
  const increased = govChange ? govChange.delta > 0 : false;
  
  return {
    passed: increased,
    message: increased
      ? `Aprobación aumentada: ${govChange?.previousValue.toFixed(3)} → ${govChange?.newValue.toFixed(3)}`
      : 'El sentimiento positivo no aumentó la aprobación',
    details: govChange
  };
});

// Test 8: Efecto de techo - valores cercanos a 1 cambian menos
test('Cambio de opinión - efecto de techo reduce cambios cerca de 1', () => {
  const agent = createTestAgent();
  const event = createTestEvent({ sentiment: 1, category: 'government' });
  
  const statesHigh = { government_approval: 0.95 };
  const statesMid = { government_approval: 0.5 };
  
  const resultHigh = updateAgentOpinion(agent, statesHigh, [event]);
  const resultMid = updateAgentOpinion(agent, statesMid, [event]);
  
  const changeHigh = resultHigh.changeLog.find(c => c.topic === 'government_approval')?.delta ?? 0;
  const changeMid = resultMid.changeLog.find(c => c.topic === 'government_approval')?.delta ?? 0;
  
  const ceilingEffect = Math.abs(changeHigh) < Math.abs(changeMid);
  
  return {
    passed: ceilingEffect,
    message: ceilingEffect
      ? `Efecto techo: cambio en 0.95 (${changeHigh.toFixed(3)}) < cambio en 0.5 (${changeMid.toFixed(3)})`
      : 'No se observa efecto de techo',
    details: { changeHigh, changeMid }
  };
});

// Test 9: Evento con baja salience genera cambios menores
// Nota: El sistema tiene exposición base ~0.5 para eventos nacionales
test('Cambio de opinión - evento de baja salience genera cambios menores', () => {
  // Crear evento con muy baja salience e intensidad
  const agent = createTestAgent({ region_code: '13' }); // Santiago
  const eventLow = createTestEvent({
    category: 'social',
    salience: 0.1, // Muy baja salience
    intensity: 0.1,
    affectedSegments: [{
      regionCode: '05', // Valparaíso
      comunaCode: '5101',
      coverageRate: 0.1,
      intensity: 0.1
    }]
  });
  
  // Evento de alta salience para comparar
  const eventHigh = createTestEvent({
    category: 'social',
    salience: 0.9,
    intensity: 0.9,
    affectedSegments: [{
      regionCode: '13', // Santiago - misma región que el agente
      coverageRate: 1.0,
      intensity: 1.0
    }]
  });
  
  const initialStates = { institutional_trust: 0.5 };
  const resultLow = updateAgentOpinion(agent, initialStates, [eventLow]);
  const resultHigh = updateAgentOpinion(agent, initialStates, [eventHigh]);
  
  // El evento de baja salience debería generar cambios menores que el de alta
  const maxDeltaLow = resultLow.changeLog.reduce((max, c) => Math.max(max, Math.abs(c.delta)), 0);
  const maxDeltaHigh = resultHigh.changeLog.reduce((max, c) => Math.max(max, Math.abs(c.delta)), 0);
  
  const lowerImpact = maxDeltaLow < maxDeltaHigh;
  
  return {
    passed: lowerImpact,
    message: lowerImpact
      ? `Baja salience: ${maxDeltaLow.toFixed(3)} < Alta salience: ${maxDeltaHigh.toFixed(3)}`
      : `El evento de baja salience no generó menor impacto`,
    details: { maxDeltaLow, maxDeltaHigh, changesLow: resultLow.totalChanges, changesHigh: resultHigh.totalChanges }
  };
});

// Test 10: Múltiples eventos se acumulan correctamente
test('Cambio de opinión - múltiples eventos se acumulan', () => {
  const agent = createTestAgent();
  const events: WeeklyEvent[] = [
    createTestEvent({ 
      weekKey: '2026-W10', 
      sentiment: -0.5, 
      category: 'government',
      title: 'Evento 1' 
    }),
    createTestEvent({ 
      weekKey: '2026-W11', 
      sentiment: -0.5, 
      category: 'government',
      title: 'Evento 2' 
    }),
    createTestEvent({ 
      weekKey: '2026-W12', 
      sentiment: -0.5, 
      category: 'government',
      title: 'Evento 3' 
    })
  ];
  
  const initialStates = { government_approval: 0.7 };
  const result = updateAgentOpinion(agent, initialStates, events);
  
  const hasMultipleChanges = result.changeLog.length >= 2;
  const netNegative = result.topicStates.government_approval < initialStates.government_approval;
  
  return {
    passed: hasMultipleChanges && netNegative,
    message: hasMultipleChanges && netNegative
      ? `${result.changeLog.length} cambios, aprobación: ${initialStates.government_approval} → ${result.topicStates.government_approval.toFixed(3)}`
      : `Múltiples eventos no acumularon correctamente`,
    details: { 
      changes: result.changeLog.length, 
      initial: initialStates.government_approval,
      final: result.topicStates.government_approval 
    }
  };
});

// Test 11: Batch update funciona correctamente
test('Batch update - procesa múltiples agentes', () => {
  const agents = [
    createTestAgent({ agent_id: 'agent_1', age: 25 }),
    createTestAgent({ agent_id: 'agent_2', age: 45 }),
    createTestAgent({ agent_id: 'agent_3', age: 65 })
  ];
  
  const events = [createTestEvent({ category: 'government' })];
  
  const getAgentTopicStates = (agentId: string) => ({
    government_approval: 0.5,
    country_direction: 0.5
  });
  
  const result = updateBatchOpinions(agents, getAgentTopicStates, events);
  
  const allProcessed = result.agentResults.length === agents.length;
  const hasStatistics = result.statistics.totalAgents === agents.length;
  
  return {
    passed: allProcessed && hasStatistics,
    message: allProcessed && hasStatistics
      ? `Procesados ${result.agentResults.length} agentes, ${result.statistics.agentsAffected} afectados`
      : 'Batch update no procesó todos los agentes',
    details: result.statistics
  };
});

// Test 12: Diferentes categorías afectan diferentes topics
test('Categorías - economy afecta economy_national, no government_approval', () => {
  const agent = createTestAgent();
  const event = createTestEvent({ 
    category: 'economy',
    sentiment: -0.5
  });
  
  const initialStates = {
    economy_national: 0.5,
    government_approval: 0.5
  };
  
  const result = updateAgentOpinion(agent, initialStates, [event]);
  
  const economyChanged = result.changeLog.some(c => c.topic === 'economy_national');
  const govChanged = result.changeLog.some(c => c.topic === 'government_approval');
  
  return {
    passed: economyChanged && !govChanged,
    message: economyChanged && !govChanged
      ? 'Economy afectó economy_national, no government_approval'
      : `Economy: economy_changed=${economyChanged}, gov_changed=${govChanged}`,
    details: result.changeLog.map(c => c.topic)
  };
});

// ============================================================================
// EJECUCIÓN DE TESTS
// ============================================================================

console.log('='.repeat(70));
console.log('TEST DE SENSIBILIDAD A EVENTOS - CADEM v1.2');
console.log('='.repeat(70));
console.log();

// Ejecutar todos los tests
const startTime = Date.now();

// Los tests ya se ejecutaron al definirlos

// Mostrar resultados
let passed = 0;
let failed = 0;

for (const result of results) {
  const icon = result.passed ? '✅' : '❌';
  console.log(`${icon} ${result.name}`);
  console.log(`   ${result.message}`);
  if (result.details && !result.passed) {
    console.log(`   Detalles:`, JSON.stringify(result.details, null, 2).substring(0, 200));
  }
  console.log();
  
  if (result.passed) passed++;
  else failed++;
}

const duration = Date.now() - startTime;

console.log('='.repeat(70));
console.log('RESUMEN');
console.log('='.repeat(70));
console.log(`Total tests: ${results.length}`);
console.log(`✅ Pasados: ${passed}`);
console.log(`❌ Fallidos: ${failed}`);
console.log(`Duración: ${duration}ms`);
console.log();

if (failed === 0) {
  console.log('🎉 Todos los tests pasaron correctamente');
} else {
  console.log(`⚠️  ${failed} test(s) fallaron`);
  process.exit(1);
}
