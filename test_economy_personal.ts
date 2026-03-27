import { buildInitialTopicStates } from './src/app/opinionEngine/topicStateSeed';
import { getTopicState } from './src/app/opinionEngine/topicStateSeed';

// Test simple para verificar los scores de economy_personal
const testAgents = [
  { age: 35, sex: 'male', educationLevel: 'secondary', incomeDecile: 5, regionCode: 'CL-RM', agentType: 'employed', connectivityLevel: 'medium', povertyStatus: 'middle_class', digitalExposure: 'medium', preferredChannel: 'web' },
  { age: 45, sex: 'female', educationLevel: 'university', incomeDecile: 8, regionCode: 'CL-VS', agentType: 'employed', connectivityLevel: 'high', povertyStatus: 'middle_class', digitalExposure: 'high', preferredChannel: 'mobile_app' },
  { age: 25, sex: 'male', educationLevel: 'primary', incomeDecile: 2, regionCode: 'CL-BI', agentType: 'unemployed', connectivityLevel: 'low', povertyStatus: 'poor', digitalExposure: 'low', preferredChannel: 'phone' },
  { age: 60, sex: 'female', educationLevel: 'technical', incomeDecile: 6, regionCode: 'CL-MA', agentType: 'retired', connectivityLevel: 'medium', povertyStatus: 'middle_class', digitalExposure: 'medium', preferredChannel: 'web' },
  { age: 30, sex: 'male', educationLevel: 'university', incomeDecile: 9, regionCode: 'CL-RM', agentType: 'employed', connectivityLevel: 'high', povertyStatus: 'middle_class', digitalExposure: 'high', preferredChannel: 'mobile_app' },
];

console.log('Testing economy_personal scores:\n');

for (const agent of testAgents) {
  const topicStates = buildInitialTopicStates(agent);
  const economyPersonal = getTopicState(topicStates, 'economy_personal');
  const economyNational = getTopicState(topicStates, 'economy_national');

  console.log(`Agent: ${agent.sex}, ${agent.age}y, incomeDecile=${agent.incomeDecile}`);
  console.log(`  economy_personal score: ${economyPersonal?.score.toFixed(3)}`);
  console.log(`  economy_national score: ${economyNational?.score.toFixed(3)}`);
  console.log();
}

// Calcular estadísticas para 100 agentes aleatorios
console.log('\n--- Statistics for 100 random agents ---');
let positiveCount = 0;
let totalScore = 0;

for (let i = 0; i < 100; i++) {
  const agent = {
    age: Math.floor(18 + Math.random() * 62),
    sex: Math.random() > 0.5 ? 'male' : 'female',
    educationLevel: ['primary', 'secondary', 'technical', 'university'][Math.floor(Math.random() * 4)],
    incomeDecile: Math.floor(1 + Math.random() * 10),
    regionCode: 'CL-RM',
    agentType: 'employed',
    connectivityLevel: 'medium',
    povertyStatus: 'middle_class',
    digitalExposure: 'medium',
    preferredChannel: 'web'
  };

  const topicStates = buildInitialTopicStates(agent);
  const economyPersonal = getTopicState(topicStates, 'economy_personal');

  if (economyPersonal) {
    totalScore += economyPersonal.score;
    if (economyPersonal.score >= 0) positiveCount++;
  }
}

console.log(`Average score: ${(totalScore / 100).toFixed(3)}`);
console.log(`Positive rate: ${positiveCount}%`);
