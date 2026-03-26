import { runSurvey } from '../../src/app/survey/surveyRunner.js';
import { aggregateSurveyResponses, printAggregatedResults } from '../../src/app/survey/surveyAggregator.js';

const agents = Array.from({ length: 50 }, (_, i) => ({
  agentId: `AG-${String(i + 1).padStart(4, '0')}`,
  age: 18 + Math.floor(Math.random() * 62),
  sex: Math.random() > 0.49 ? 'male' : 'female',
  educationLevel: ['primary', 'secondary', 'technical', 'university'][
    Math.floor(Math.random() * 4)
  ],
  incomeDecile: Math.ceil(Math.random() * 10),
  povertyStatus: ['extreme_poverty', 'poverty', 'vulnerable', 'middle_class', 'upper_middle'][
    Math.floor(Math.random() * 5)
  ],
  regionCode: ['CL-RM', 'CL-VS', 'CL-BI', 'CL-AR', 'CL-MA'][
    Math.floor(Math.random() * 5)
  ],
  connectivityLevel: ['low', 'medium', 'high'][Math.floor(Math.random() * 3)],
  digitalExposure: ['low', 'medium', 'high'][Math.floor(Math.random() * 3)],
  preferredChannel: ['online', 'mixed', 'phone'][Math.floor(Math.random() * 3)],
  agentType: ['student', 'worker', 'retiree'][Math.floor(Math.random() * 3)],
}));

const surveyDefinition = {
  id: 'cadem-w13-2026',
  title: 'Plaza Pública CADEM - Semana 13',
  topic: 'politics',
  questions: [
    {
      id: 'q_approval',
      text: 'Ahora. Independiente de su posición política, ¿Usted aprueba o desaprueba la forma cómo José Antonio Kast está conduciendo su Gobierno?',
      options: ['Aprueba', 'Desaprueba', 'No responde'],
      periodicity: 'permanent' as const,
    },
    {
      id: 'q_direction',
      text: 'Ahora, pensando en todos los aspectos políticos, económicos y sociales, ¿Usted cree que el país va por un buen camino o por un mal camino?',
      options: ['Buen camino', 'Mal camino', 'No responde'],
      periodicity: 'permanent' as const,
    },
    {
      id: 'q_optimism',
      text: 'En general, ¿Cómo se siente usted acerca del futuro del país?',
      options: ['Muy optimista', 'Optimista', 'Pesimista', 'Muy pesimista', 'No responde'],
      periodicity: 'permanent' as const,
    },
    {
      id: 'q_economy_national',
      text: 'Usted cree que en el momento actual la economía chilena está...',
      options: ['Progresando', 'Estancada', 'En retroceso', 'No responde'],
      periodicity: 'permanent' as const,
    },
    {
      id: 'q_economy_personal',
      text: '¿Cómo calificaría usted la situación económica actual de usted y su familia?',
      options: ['Muy buena', 'Buena', 'Mala', 'Muy mala', 'No responde'],
      periodicity: 'permanent' as const,
    },
    {
      id: 'q_ideology',
      text: 'En términos políticos, las personas se pueden sentir más cercanas o lejanas a la izquierda o a la derecha, ¿Usted con cuál de las siguientes posiciones se siente más cercano?',
      options: ['Derecha', 'Centro derecha', 'Centro', 'Centro izquierda', 'Izquierda', 'Ninguna-Independiente'],
      periodicity: 'permanent' as const,
    },
  ],
};

console.log('Corriendo encuesta con 50 agentes...\n');

const result = runSurvey({
  surveyDefinition,
  agents,
  engineMode: 'cadem',
  weekKey: '2026-W13',
  debug: true,
});

const aggregated = aggregateSurveyResponses(result.responses);
printAggregatedResults(aggregated);

console.log(`Tiempo total: ${result.durationMs}ms`);
