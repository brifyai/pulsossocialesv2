/**
 * Test del SurveyRunner - Entrypoint unificado para encuestas
 *
 * Este test verifica que el surveyRunner funciona correctamente con:
 * - engineMode: 'cadem' + persistState: false (sync/in-memory)
 * - engineMode: 'legacy' (placeholder)
 *
 * NOTA: El modo async con persistencia requiere variables de entorno de Vite
 * (import.meta.env) que no están disponibles en Node.js directamente.
 * Para probar el modo async, usar el entorno de desarrollo con Vite.
 */

import { runCademSurvey } from '../../src/app/survey/cademAdapter';
import type { CademAdapterAgent, CademSurveyDefinition } from '../../src/app/survey/cademAdapter';

// Agente de prueba
const testAgent: CademAdapterAgent = {
  agentId: 'RUNNER-001',
  age: 29,
  sex: 'female',
  educationLevel: 'university',
  incomeDecile: 7,
  povertyStatus: 'middle_class',
  regionCode: 'CL-RM',
  connectivityLevel: 'high',
  digitalExposure: 'high',
  preferredChannel: 'online',
  agentType: 'worker',
};

// Definición de encuesta de prueba
const testSurvey: CademSurveyDefinition = {
  id: 'runner-test-001',
  title: 'Runner Test',
  topic: 'politics',
  questions: [
    {
      id: 'q1',
      text: 'Ahora. Independiente de su posición política, ¿Usted aprueba o desaprueba la forma cómo José Antonio Kast está conduciendo su Gobierno?',
      options: ['Aprueba', 'Desaprueba', 'No responde'],
      periodicity: 'permanent' as const,
    },
    {
      id: 'q2',
      text: 'Ahora, pensando en todos los aspectos políticos, económicos y sociales, ¿Usted cree que el país va por un buen camino o por un mal camino?',
      options: ['Buen camino', 'Mal camino', 'No responde'],
      periodicity: 'permanent' as const,
    },
  ],
};

function testCademSync() {
  console.log('\n=== Test 1: CADEM Sync (sin persistencia) ===\n');
  const startTime = Date.now();

  const responses = runCademSurvey({
    surveyDefinition: testSurvey,
    agents: [testAgent],
    weekKey: '2026-W13',
    mode: 'cawi',
  });

  const durationMs = Date.now() - startTime;

  console.log('\n--- Resultado ---');
  console.log(`Total Responses: ${responses.length}`);
  console.log(`Duration: ${durationMs}ms`);

  console.log('\n--- Respuestas ---');
  for (const response of responses) {
    console.log(`\nAgent: ${response.agentId}`);
    console.log(`Question: ${response.questionId}`);
    console.log(`Value: ${response.value}`);
    console.log(`Confidence: ${response.confidence}`);
    console.log(`Reasoning: ${response.reasoning?.substring(0, 100)}...`);
    console.log(`Factors: ${response.factors?.length || 0} factores`);
    console.log(`Engine Mode: ${response.engineMode}`);
    console.log(`Engine Version: ${response.engineVersion}`);
  }

  // Validaciones
  if (responses.length !== 2) {
    throw new Error(`Expected 2 responses, got ${responses.length}`);
  }

  const firstResponse = responses[0];
  if (firstResponse.engineMode !== 'cadem') {
    throw new Error(`Expected engineMode='cadem', got '${firstResponse.engineMode}'`);
  }
  if (firstResponse.engineVersion !== 'cadem-v1.1') {
    throw new Error(`Expected engineVersion='cadem-v1.1', got '${firstResponse.engineVersion}'`);
  }
  if (firstResponse.agentId !== testAgent.agentId) {
    throw new Error(`Expected agentId='${testAgent.agentId}', got '${firstResponse.agentId}'`);
  }

  console.log('\n✅ Test CADEM Sync PASSED');
  return responses;
}

function testMultipleAgents() {
  console.log('\n=== Test 2: Múltiples Agentes ===\n');
  const startTime = Date.now();

  const agents: CademAdapterAgent[] = [
    {
      agentId: 'RUNNER-002',
      age: 45,
      sex: 'male',
      educationLevel: 'secondary',
      incomeDecile: 4,
      povertyStatus: 'vulnerable',
      regionCode: 'CL-VS',
      connectivityLevel: 'medium',
      digitalExposure: 'medium',
      preferredChannel: 'phone',
      agentType: 'worker',
    },
    {
      agentId: 'RUNNER-003',
      age: 62,
      sex: 'female',
      educationLevel: 'primary',
      incomeDecile: 2,
      povertyStatus: 'poor',
      regionCode: 'CL-BI',
      connectivityLevel: 'low',
      digitalExposure: 'low',
      preferredChannel: 'phone',
      agentType: 'retired',
    },
  ];

  const responses = runCademSurvey({
    surveyDefinition: testSurvey,
    agents,
    weekKey: '2026-W13',
    mode: 'cawi',
  });

  const durationMs = Date.now() - startTime;

  console.log('\n--- Resultado ---');
  console.log(`Agent Count: ${agents.length}`);
  console.log(`Total Responses: ${responses.length}`);
  console.log(`Expected: ${agents.length * testSurvey.questions.length} responses`);
  console.log(`Duration: ${durationMs}ms`);

  // Validaciones
  if (responses.length !== 4) {
    throw new Error(`Expected 4 responses (2 agents × 2 questions), got ${responses.length}`);
  }

  // Verificar que hay respuestas de ambos agentes
  const agentIds = new Set(responses.map(r => r.agentId));
  if (agentIds.size !== 2) {
    throw new Error(`Expected responses from 2 unique agents, got ${agentIds.size}`);
  }

  // Verificar que cada agente tiene 2 respuestas
  for (const agentId of agentIds) {
    const agentResponses = responses.filter(r => r.agentId === agentId);
    if (agentResponses.length !== 2) {
      throw new Error(`Expected 2 responses for agent ${agentId}, got ${agentResponses.length}`);
    }
  }

  console.log('\n✅ Test Múltiples Agentes PASSED');
  return responses;
}

function testAgentDemographics() {
  console.log('\n=== Test 3: Diversidad Demográfica ===\n');

  const agents: CademAdapterAgent[] = [
    // Joven de alta conectividad
    {
      agentId: 'DEMO-001',
      age: 22,
      sex: 'male',
      educationLevel: 'university',
      incomeDecile: 8,
      povertyStatus: 'middle_class',
      regionCode: 'CL-RM',
      connectivityLevel: 'high',
      digitalExposure: 'high',
      preferredChannel: 'online',
      agentType: 'student',
    },
    // Adulto mayor rural
    {
      agentId: 'DEMO-002',
      age: 68,
      sex: 'female',
      educationLevel: 'primary',
      incomeDecile: 2,
      povertyStatus: 'poor',
      regionCode: 'CL-AR',
      connectivityLevel: 'low',
      digitalExposure: 'low',
      preferredChannel: 'phone',
      agentType: 'retired',
    },
    // Trabajador clase media
    {
      agentId: 'DEMO-003',
      age: 35,
      sex: 'female',
      educationLevel: 'secondary',
      incomeDecile: 5,
      povertyStatus: 'middle_class',
      regionCode: 'CL-VS',
      connectivityLevel: 'medium',
      digitalExposure: 'medium',
      preferredChannel: 'mixed',
      agentType: 'worker',
    },
  ];

  const responses = runCademSurvey({
    surveyDefinition: testSurvey,
    agents,
    weekKey: '2026-W13',
    mode: 'mixed',
  });

  console.log('\n--- Resultado ---');
  console.log(`Total Responses: ${responses.length}`);

  // Análisis de respuestas por agente
  for (const agentId of ['DEMO-001', 'DEMO-002', 'DEMO-003']) {
    const agentResponses = responses.filter(r => r.agentId === agentId);
    console.log(`\nAgent ${agentId}:`);
    for (const r of agentResponses) {
      console.log(`  ${r.questionId}: ${r.value} (confidence: ${r.confidence})`);
    }
  }

  // Validaciones
  if (responses.length !== 6) {
    throw new Error(`Expected 6 responses (3 agents × 2 questions), got ${responses.length}`);
  }

  console.log('\n✅ Test Diversidad Demográfica PASSED');
  return responses;
}

function main() {
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║           SurveyRunner Test Suite                            ║');
  console.log('║   Entrypoint unificado para encuestas CADEM v1.1             ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');

  try {
    // Test 1: CADEM Sync
    testCademSync();

    // Test 2: Múltiples Agentes
    testMultipleAgents();

    // Test 3: Diversidad Demográfica
    testAgentDemographics();

    console.log('\n╔══════════════════════════════════════════════════════════════╗');
    console.log('║           ✅ TODOS LOS TESTS PASSED                          ║');
    console.log('╚══════════════════════════════════════════════════════════════╝\n');

    process.exit(0);
  } catch (error) {
    console.error('\n╔══════════════════════════════════════════════════════════════╗');
    console.error('║           ❌ TEST FAILED                                     ║');
    console.error('╚══════════════════════════════════════════════════════════════╝\n');
    console.error(error);
    process.exit(1);
  }
}

main();
