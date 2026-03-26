import { buildInitialTopicStates } from './topicStateSeed';
import { interpretQuestion } from './questionInterpreter';
import { generateOpinionatedResponse } from './opinionEngine';
import type { OpinionEngineAgent } from './opinionEngine';

const testAgents: OpinionEngineAgent[] = [
  {
    agentId: 'TEST-001',
    age: 24,
    sex: 'female',
    educationLevel: 'university',
    incomeDecile: 7,
    povertyStatus: 'middle_class',
    regionCode: 'CL-RM',
    connectivityLevel: 'high',
    digitalExposure: 'high',
    preferredChannel: 'online',
    agentType: 'student',
  },
  {
    agentId: 'TEST-002',
    age: 63,
    sex: 'male',
    educationLevel: 'secondary',
    incomeDecile: 4,
    povertyStatus: 'vulnerable',
    regionCode: 'CL-VS',
    connectivityLevel: 'medium',
    digitalExposure: 'low',
    preferredChannel: 'phone',
    agentType: 'worker',
  },
  {
    agentId: 'TEST-003',
    age: 45,
    sex: 'female',
    educationLevel: 'technical',
    incomeDecile: 5,
    povertyStatus: 'middle_class',
    regionCode: 'CL-BI',
    connectivityLevel: 'medium',
    digitalExposure: 'medium',
    preferredChannel: 'mixed',
    agentType: 'worker',
  },
];

const rawQuestions = [
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
  {
    id: 'q3',
    text: 'En general, ¿Cómo se siente usted acerca del futuro del país?',
    options: ['Muy optimista', 'Optimista', 'Pesimista', 'Muy pesimista', 'No responde'],
    periodicity: 'permanent' as const,
  },
  {
    id: 'q4',
    text: 'Usted cree que en el momento actual la economía chilena está...',
    options: ['Progresando', 'Estancada', 'En retroceso', 'No responde'],
    periodicity: 'permanent' as const,
  },
  {
    id: 'q5',
    text: '¿Cómo calificaría usted la situación económica actual de usted y su familia?',
    options: ['Muy buena', 'Buena', 'Mala', 'Muy mala', 'No responde'],
    periodicity: 'permanent' as const,
  },
  {
    id: 'q6',
    text: 'En términos políticos, las personas se pueden sentir más cercanas o lejanas a la izquierda o a la derecha, ¿Usted con cuál de las siguientes posiciones se siente más cercano?',
    options: ['Derecha', 'Centro derecha', 'Centro', 'Centro izquierda', 'Izquierda', 'Ninguna-Independiente'],
    periodicity: 'permanent' as const,
  },
];

function runTest() {
  console.log('========================================');
  console.log('TEST CADEM OPINION ENGINE V1');
  console.log('========================================\n');

  for (const agent of testAgents) {
    console.log(`\n----------------------------------------`);
    console.log(`Agente: ${agent.agentId}`);
    console.log(`Perfil: edad ${agent.age}, educación ${agent.educationLevel}, ingreso ${agent.incomeDecile}`);
    console.log(`----------------------------------------`);

    const topicStates = buildInitialTopicStates(agent);

    console.log('\nTopic States iniciales:');
    for (const state of topicStates) {
      console.log(
        `- ${state.topic}: score=${state.score.toFixed(2)}, confidence=${state.confidence.toFixed(2)}`
      );
    }

    console.log('\nRespuestas:');
    for (let i = 0; i < rawQuestions.length; i++) {
      const question = rawQuestions[i];
      const interpreted = interpretQuestion(question);

      const response = generateOpinionatedResponse({
        agent,
        interpretedQuestion: interpreted,
        topicStates,
        context: {
          questionIndex: i + 1,
          totalQuestions: rawQuestions.length,
          surveyId: 'test-survey-cadem-v1',
          weekKey: '2026-W13',
          mode: 'cawi',
        },
      });

      console.log(`\n[${question.id}] ${question.text}`);
      console.log(`→ Family: ${interpreted.family}, Topic: ${interpreted.topic ?? 'N/A'}`);
      console.log(`→ Respuesta: ${String(response.value)}`);
      console.log(`→ Confianza: ${response.confidence.toFixed(2)}`);
      console.log(`→ Reasoning: ${response.reasoning}`);
      console.log(
        `→ Factores: ${response.factors.map((f) => `${f.type}(${f.weight.toFixed(2)})`).join(', ')}`
      );
    }
  }

  console.log('\n========================================');
  console.log('FIN TEST');
  console.log('========================================');
}

try {
  runTest();
} catch (error) {
  console.error('Error ejecutando test del opinion engine:', error);
  process.exit(1);
}
