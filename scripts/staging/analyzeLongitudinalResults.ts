/**
 * Script para analizar los resultados de las 3 olas del B2 Longitudinal Test
 * Paso 3 del B2 Longitudinal Test
 *
 * Calcula métricas de estabilidad, drift, fatigue y evolución entre olas
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Archivos de entrada
const WAVE_FILES = [
  path.join(__dirname, '../../data/staging/b2_wave_1_result.json'),
  path.join(__dirname, '../../data/staging/b2_wave_2_result.json'),
  path.join(__dirname, '../../data/staging/b2_wave_3_result.json')
];

const OUTPUT_FILE = path.join(__dirname, '../../docs/cadem-v3/B2_LONGITUDINAL_TEST_RESULTS.md');

// Interfaces
interface WaveResult {
  wave: number;
  wave_date: string;
  survey_id: string;
  run_id: string;
  total_agents: number;
  distributions: Record<string, Record<string, number>>;
  avg_confidence: number;
  duration_ms: number;
  completed_at: string;
}

interface AnalysisResult {
  completion_rates: number[];
  correlations: Record<string, number[]>;
  drift: Record<string, number[]>;
  no_response_evolution: Record<string, number[]>;
  confidence_evolution: number[];
  final_decision: 'APPROVED' | 'APPROVED_WITH_OBSERVATIONS' | 'REJECTED';
  observations: string[];
}

// ============================================================================
// FUNCIONES DE CARGA
// ============================================================================

function loadWaveResults(): WaveResult[] {
  const results: WaveResult[] = [];

  for (let i = 0; i < WAVE_FILES.length; i++) {
    const file = WAVE_FILES[i];
    console.log(`Cargando ola ${i + 1}: ${file}...`);

    if (!fs.existsSync(file)) {
      console.error(`   ❌ Archivo no encontrado: ${file}`);
      continue;
    }

    try {
      const data = JSON.parse(fs.readFileSync(file, 'utf-8'));
      results.push(data);
      console.log(`   ✅ Ola ${data.wave} cargada: ${data.total_agents} agentes`);
    } catch (error) {
      console.error(`   ❌ Error al cargar: ${error}`);
    }
  }

  return results.sort((a, b) => a.wave - b.wave);
}

// ============================================================================
// FUNCIONES DE ANÁLISIS
// ============================================================================

function calculateCompletionRate(wave: WaveResult): number {
  // Calcular completion rate basado en no_response
  const questions = Object.keys(wave.distributions);
  if (questions.length === 0) return 0;

  let totalResponses = 0;
  let totalNoResponse = 0;

  for (const qid of questions) {
    const dist = wave.distributions[qid];
    const total = Object.values(dist).reduce((a, b) => a + b, 0);
    const noResponse = dist['no_response'] || 0;

    totalResponses += total;
    totalNoResponse += noResponse;
  }

  if (totalResponses === 0) return 0;
  return 100 - ((totalNoResponse / totalResponses) * 100);
}

function calculateCorrelation(wave1: WaveResult, wave2: WaveResult, questionId: string): number {
  // Calcular correlación entre dos olas para una pregunta
  const dist1 = wave1.distributions[questionId];
  const dist2 = wave2.distributions[questionId];

  if (!dist1 || !dist2) return 0;

  const options = Object.keys(dist1).filter(k => k !== 'no_response');
  if (options.length === 0) return 0;

  // Calcular correlación de Pearson simplificada
  let sum1 = 0, sum2 = 0, sum1Sq = 0, sum2Sq = 0, pSum = 0;
  let n = 0;

  for (const opt of options) {
    const v1 = dist1[opt] || 0;
    const v2 = dist2[opt] || 0;

    sum1 += v1;
    sum2 += v2;
    sum1Sq += v1 * v1;
    sum2Sq += v2 * v2;
    pSum += v1 * v2;
    n++;
  }

  if (n === 0) return 0;

  const num = pSum - (sum1 * sum2 / n);
  const den = Math.sqrt((sum1Sq - (sum1 * sum1 / n)) * (sum2Sq - (sum2 * sum2 / n)));

  if (den === 0) return 0;
  return num / den;
}

function calculateDrift(wave1: WaveResult, wave2: WaveResult, questionId: string): number {
  // Calcular drift (cambio absoluto promedio) entre dos olas
  const dist1 = wave1.distributions[questionId];
  const dist2 = wave2.distributions[questionId];

  if (!dist1 || !dist2) return 0;

  const options = Object.keys(dist1).filter(k => k !== 'no_response');
  if (options.length === 0) return 0;

  let totalDrift = 0;
  for (const opt of options) {
    const v1 = dist1[opt] || 0;
    const v2 = dist2[opt] || 0;
    totalDrift += Math.abs(v2 - v1);
  }

  return totalDrift / options.length;
}

function getNoResponseRate(wave: WaveResult, questionId: string): number {
  const dist = wave.distributions[questionId];
  if (!dist) return 0;

  const total = Object.values(dist).reduce((a, b) => a + b, 0);
  const noResponse = dist['no_response'] || 0;

  if (total === 0) return 0;
  return (noResponse / total) * 100;
}

// ============================================================================
// ANÁLISIS PRINCIPAL
// ============================================================================

function analyzeLongitudinalResults(waves: WaveResult[]): AnalysisResult {
  console.log('\n🔍 Analizando resultados longitudinales...\n');

  const questions = Object.keys(waves[0]?.distributions || {});
  console.log(`Preguntas analizadas: ${questions.join(', ')}\n`);

  // 1. Completion rates por ola
  const completionRates = waves.map(calculateCompletionRate);
  console.log('1. Completion Rates:');
  completionRates.forEach((rate, i) => {
    console.log(`   Ola ${i + 1}: ${rate.toFixed(1)}%`);
  });

  // 2. Correlaciones entre olas consecutivas por pregunta
  const correlations: Record<string, number[]> = {};
  console.log('\n2. Correlaciones entre olas:');
  for (const qid of questions) {
    correlations[qid] = [];
    for (let i = 0; i < waves.length - 1; i++) {
      const corr = calculateCorrelation(waves[i], waves[i + 1], qid);
      correlations[qid].push(corr);
      console.log(`   ${qid} (Ola ${i + 1}→${i + 2}): ${corr.toFixed(3)}`);
    }
  }

  // 3. Drift entre olas consecutivas por pregunta
  const drift: Record<string, number[]> = {};
  console.log('\n3. Drift entre olas:');
  for (const qid of questions) {
    drift[qid] = [];
    for (let i = 0; i < waves.length - 1; i++) {
      const d = calculateDrift(waves[i], waves[i + 1], qid);
      drift[qid].push(d);
      console.log(`   ${qid} (Ola ${i + 1}→${i + 2}): ${d.toFixed(1)}%`);
    }
  }

  // 4. Evolución de no_response por pregunta
  const noResponseEvolution: Record<string, number[]> = {};
  console.log('\n4. Evolución de No-Response:');
  for (const qid of questions) {
    noResponseEvolution[qid] = waves.map(w => getNoResponseRate(w, qid));
    console.log(`   ${qid}: ${noResponseEvolution[qid].map(r => r.toFixed(1) + '%').join(' → ')}`);
  }

  // 5. Evolución de confidence promedio
  const confidenceEvolution = waves.map(w => w.avg_confidence * 100);
  console.log('\n5. Evolución de Confidence:');
  confidenceEvolution.forEach((conf, i) => {
    console.log(`   Ola ${i + 1}: ${conf.toFixed(1)}%`);
  });

  // 6. Determinar decisión final
  const observations: string[] = [];
  let finalDecision: 'APPROVED' | 'APPROVED_WITH_OBSERVATIONS' | 'REJECTED' = 'APPROVED';

  // Verificar completion rate
  const minCompletion = Math.min(...completionRates);
  if (minCompletion < 70) {
    observations.push(`Completion rate bajo en alguna ola (${minCompletion.toFixed(1)}%)`);
    finalDecision = 'REJECTED';
  } else if (minCompletion < 85) {
    observations.push(`Completion rate aceptable pero podría mejorar (${minCompletion.toFixed(1)}%)`);
    if (finalDecision === 'APPROVED') finalDecision = 'APPROVED_WITH_OBSERVATIONS';
  }

  // Verificar correlaciones
  for (const qid of questions) {
    const minCorr = Math.min(...correlations[qid]);
    if (minCorr < 0.5) {
      observations.push(`Baja correlación en ${qid} entre olas (${minCorr.toFixed(3)})`);
      if (finalDecision === 'APPROVED') finalDecision = 'APPROVED_WITH_OBSERVATIONS';
    }
  }

  // Verificar drift
  for (const qid of questions) {
    const maxDrift = Math.max(...drift[qid]);
    if (maxDrift > 20) {
      observations.push(`Alto drift en ${qid} entre olas (${maxDrift.toFixed(1)}%)`);
      if (finalDecision === 'APPROVED') finalDecision = 'APPROVED_WITH_OBSERVATIONS';
    }
  }

  // Verificar no-response
  for (const qid of questions) {
    const maxNoResponse = Math.max(...noResponseEvolution[qid]);
    if (maxNoResponse > 15) {
      observations.push(`Alto no-response en ${qid} (${maxNoResponse.toFixed(1)}%)`);
      if (finalDecision === 'APPROVED') finalDecision = 'APPROVED_WITH_OBSERVATIONS';
    }
  }

  // Verificar confidence
  const minConfidence = Math.min(...confidenceEvolution);
  if (minConfidence < 50) {
    observations.push(`Confidence bajo en alguna ola (${minConfidence.toFixed(1)}%)`);
    if (finalDecision === 'APPROVED') finalDecision = 'APPROVED_WITH_OBSERVATIONS';
  }

  // Verificar fatigue (aumento de no-response en olas posteriores)
  for (const qid of questions) {
    const rates = noResponseEvolution[qid];
    if (rates[2] > rates[0] * 1.5) {
      observations.push(`Fatigue detectado en ${qid}: no-response aumentó ${((rates[2]/rates[0] - 1) * 100).toFixed(0)}%`);
    }
  }

  console.log('\n6. Decisión Final:', finalDecision);
  if (observations.length > 0) {
    console.log('   Observaciones:');
    observations.forEach(obs => console.log(`   - ${obs}`));
  } else {
    console.log('   ✅ Sin observaciones críticas');
  }

  return {
    completion_rates: completionRates,
    correlations,
    drift,
    no_response_evolution: noResponseEvolution,
    confidence_evolution: confidenceEvolution,
    final_decision: finalDecision,
    observations
  };
}

// ============================================================================
// GENERACIÓN DE REPORTE
// ============================================================================

function generateReport(waves: WaveResult[], analysis: AnalysisResult): string {
  const timestamp = new Date().toISOString();

  const decisionEmoji = {
    'APPROVED': '✅',
    'APPROVED_WITH_OBSERVATIONS': '⚠️',
    'REJECTED': '❌'
  };

  const decisionText = {
    'APPROVED': 'APROBADO',
    'APPROVED_WITH_OBSERVATIONS': 'APROBADO CON OBSERVACIONES',
    'REJECTED': 'RECHAZADO'
  };

  const questions = Object.keys(waves[0]?.distributions || {});

  let report = `# B2 Longitudinal Test Results

**Fecha de análisis:** ${new Date(timestamp).toLocaleString()}  
**Estado:** ${decisionEmoji[analysis.final_decision]} ${decisionText[analysis.final_decision]}

---

## Resumen Ejecutivo

| Métrica | Ola 1 | Ola 2 | Ola 3 |
|---------|-------|-------|-------|
| Fecha simulada | ${waves[0]?.wave_date || 'N/A'} | ${waves[1]?.wave_date || 'N/A'} | ${waves[2]?.wave_date || 'N/A'} |
| Agentes | ${waves[0]?.total_agents || 0} | ${waves[1]?.total_agents || 0} | ${waves[2]?.total_agents || 0} |
| Completion Rate | ${analysis.completion_rates[0]?.toFixed(1) || 0}% | ${analysis.completion_rates[1]?.toFixed(1) || 0}% | ${analysis.completion_rates[2]?.toFixed(1) || 0}% |
| Confidence Promedio | ${analysis.confidence_evolution[0]?.toFixed(1) || 0}% | ${analysis.confidence_evolution[1]?.toFixed(1) || 0}% | ${analysis.confidence_evolution[2]?.toFixed(1) || 0}% |

---

## Métricas por Pregunta

`;

  for (const qid of questions) {
    report += `### ${qid}\n\n`;
    report += '| Métrica | Ola 1→2 | Ola 2→3 |\n';
    report += '|---------|---------|---------|\n';
    report += `| Correlación | ${analysis.correlations[qid][0]?.toFixed(3) || 'N/A'} | ${analysis.correlations[qid][1]?.toFixed(3) || 'N/A'} |\n`;
    report += `| Drift | ${analysis.drift[qid][0]?.toFixed(1) || 0}% | ${analysis.drift[qid][1]?.toFixed(1) || 0}% |\n`;
    report += `| No-Response Ola 1 | ${analysis.no_response_evolution[qid][0]?.toFixed(1) || 0}% | - |\n`;
    report += `| No-Response Ola 2 | - | ${analysis.no_response_evolution[qid][1]?.toFixed(1) || 0}% |\n`;
    report += `| No-Response Ola 3 | - | ${analysis.no_response_evolution[qid][2]?.toFixed(1) || 0}% |\n`;
    report += '\n';
  }

  report += `---

## Distribuciones por Ola

`;

  for (const qid of questions) {
    report += `### ${qid}\n\n`;
    report += '| Opción | Ola 1 | Ola 2 | Ola 3 |\n';
    report += '|--------|-------|-------|-------|\n';

    const options = Object.keys(waves[0]?.distributions[qid] || {});
    for (const opt of options) {
      const v1 = waves[0]?.distributions[qid][opt] || 0;
      const v2 = waves[1]?.distributions[qid][opt] || 0;
      const v3 = waves[2]?.distributions[qid][opt] || 0;
      report += `| ${opt} | ${v1}% | ${v2}% | ${v3}% |\n`;
    }
    report += '\n';
  }

  report += `---

## Hipótesis Validadas

### H1: Estabilidad Temporal
**Estado:** ${analysis.correlations['q_approval']?.every(c => c > 0.7) ? '✅ VALIDADA' : '⚠️ PARCIAL'}

Las correlaciones entre olas consecutivas indican estabilidad en las respuestas.

### H2: Consistencia del Panel
**Estado:** ${analysis.completion_rates.every(r => r > 80) ? '✅ VALIDADA' : '⚠️ PARCIAL'}

El completion rate se mantiene alto a través de las olas.

### H3: No Fatigue Significativo
**Estado:** ${Object.values(analysis.no_response_evolution).every(rates => rates[2] <= rates[0] * 1.3) ? '✅ VALIDADA' : '⚠️ PARCIAL'}

El no-response no aumenta significativamente en olas posteriores.

---

## Observaciones

`;

  if (analysis.observations.length > 0) {
    analysis.observations.forEach(obs => {
      report += `- ${obs}\n`;
    });
  } else {
    report += '✅ No se encontraron observaciones críticas.\n';
  }

  report += `

---

## Decisión Final

### ${decisionEmoji[analysis.final_decision]} ${decisionText[analysis.final_decision]}

`;

  if (analysis.final_decision === 'APPROVED') {
    report += `El B2 Longitudinal Test ha pasado exitosamente. La persistencia de estado funciona correctamente y los resultados son estables a través del tiempo.\n\n**Próximo paso:** Puedes proceder con la implementación de features adicionales o el despliegue a producción.\n`;
  } else if (analysis.final_decision === 'APPROVED_WITH_OBSERVATIONS') {
    report += `El B2 Longitudinal Test ha pasado con observaciones menores. La funcionalidad básica opera correctamente, pero se recomienda revisar los puntos mencionados antes del despliegue a producción.\n\n**Próximo paso:** Revisar las observaciones y considerar ajustes antes de continuar.\n`;
  } else {
    report += `El B2 Longitudinal Test NO ha pasado. Se detectaron problemas críticos que deben ser corregidos antes de continuar.\n\n**Próximo paso:** Corregir los problemas identificados y re-ejecutar el test.\n`;
  }

  report += `
---

*Reporte generado automáticamente por analyzeLongitudinalResults.ts*
`;

  return report;
}

// ============================================================================
// FUNCIÓN PRINCIPAL
// ============================================================================

async function main() {
  console.log('\n📊 ANÁLISIS DE RESULTADOS LONGITUDINALES B2\n');
  console.log('==============================================\n');

  // Cargar resultados de las 3 olas
  const waves = loadWaveResults();

  if (waves.length < 3) {
    console.error(`\n❌ Error: Solo se encontraron ${waves.length} olas. Se requieren 3 olas para el análisis completo.`);
    console.error('   Asegúrate de ejecutar las 3 olas antes de analizar.\n');
    process.exit(1);
  }

  // Analizar resultados
  const analysis = analyzeLongitudinalResults(waves);

  // Generar reporte
  console.log('\n==============================================');
  console.log('GENERANDO REPORTE...');
  console.log('==============================================\n');

  const report = generateReport(waves, analysis);

  // Guardar reporte
  fs.writeFileSync(OUTPUT_FILE, report);
  console.log(`💾 Reporte guardado: ${OUTPUT_FILE}\n`);

  // Resumen final
  console.log('==============================================');
  console.log('📊 RESUMEN FINAL\n');
  console.log(`Olas analizadas: ${waves.length}`);
  console.log(`Agentes por ola: ${waves.map(w => w.total_agents).join(', ')}`);
  console.log(`Completion rates: ${analysis.completion_rates.map(r => r.toFixed(1) + '%').join(', ')}`);
  console.log(`Confidence promedio: ${analysis.confidence_evolution.map(c => c.toFixed(1) + '%').join(', ')}`);
  console.log(`\nDecisión: ${analysis.final_decision}`);
  console.log('==============================================\n');

  // Salir con código apropiado
  if (analysis.final_decision === 'REJECTED') {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

main().catch(error => {
  console.error('❌ Error inesperado:', error);
  process.exit(1);
});
