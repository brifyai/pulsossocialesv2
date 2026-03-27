// Simulación del questionResolver para economy_personal

function randomNoise(scale = 0.08): number {
  return (Math.random() * 2 - 1) * scale;
}

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

function scoreWithNoise(score: number, scale = 0.08): number {
  return clamp(score + randomNoise(scale), -1, 1);
}

function resolveEconomicPerception(score: number): string {
  const scoreWithNoise_val = scoreWithNoise(score, 0.08);

  if (scoreWithNoise_val >= 0.4) {
    return 'very_good';
  } else if (scoreWithNoise_val >= 0) {
    return 'good';
  } else if (scoreWithNoise_val <= -0.4) {
    return 'very_bad';
  } else {
    return 'bad';
  }
}

// Simular 1000 agentes con score promedio 0.295
const baseScore = 0.295;
const results: Record<string, number> = { very_good: 0, good: 0, bad: 0, very_bad: 0 };

for (let i = 0; i < 1000; i++) {
  const response = resolveEconomicPerception(baseScore);
  results[response]++;
}

const positive_total = ((results.very_good + results.good) / 1000) * 100;
const negative_total = ((results.bad + results.very_bad) / 1000) * 100;

console.log('Simulation Results (base score = 0.295):');
console.log(`  very_good: ${results.very_good} (${(results.very_good/10).toFixed(1)}%)`);
console.log(`  good: ${results.good} (${(results.good/10).toFixed(1)}%)`);
console.log(`  bad: ${results.bad} (${(results.bad/10).toFixed(1)}%)`);
console.log(`  very_bad: ${results.very_bad} (${(results.very_bad/10).toFixed(1)}%)`);
console.log();
console.log(`  positive_total: ${positive_total.toFixed(1)}%`);
console.log(`  negative_total: ${negative_total.toFixed(1)}%`);
console.log();

// Ahora simular con diferentes sesgos para ver qué se necesita para llegar a 52%
console.log('--- Testing different bias values ---');
for (const bias of [0.20, 0.25, 0.30, 0.35, 0.40, 0.50]) {
  const biasResults: Record<string, number> = { very_good: 0, good: 0, bad: 0, very_bad: 0 };

  for (let i = 0; i < 1000; i++) {
    const response = resolveEconomicPerception(bias);
    biasResults[response]++;
  }

  const pos = ((biasResults.very_good + biasResults.good) / 1000) * 100;
  console.log(`bias ${bias.toFixed(2)}: positive_total = ${pos.toFixed(1)}%`);
}
