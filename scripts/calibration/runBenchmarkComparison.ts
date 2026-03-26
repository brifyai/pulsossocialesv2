/**
 * Script de comparación de benchmarks CADEM
 * Genera agentes sintéticos, corre encuesta y compara contra benchmark real
 */

import { runSurvey } from '../../src/app/survey/surveyRunner';
import { aggregateSurveyResponses } from '../../src/app/survey/surveyAggregator';
import {
  loadBenchmark,
  compareSyntheticVsBenchmark,
  printBenchmarkComparison,
  exportComparisonToJson,
  type SyntheticResult,
} from '../../src/app/calibration/benchmarkComparator';
import type { CademAdapterAgent, CademSurveyDefinition } from '../../src/app/survey/cademAdapter';
import * as path from 'path';

// ============================================================================
// CONFIGURACIÓN
// ============================================================================

const CONFIG = {
  AGENT_COUNT: 300,
  BENCHMARK_PATH: 'data/benchmarks/cadem/normalized/cadem_marzo_2026_master.json',
  OUTPUT_PATH: 'data/benchmarks/cadem/comparison_results.json',
  ENGINE_MODE: 'cadem' as const,
};

// ============================================================================
// GENERADOR DE AGENTES SINTÉTICOS
// ============================================================================

/**
 * Genera agentes sintéticos para pruebas de calibración
 * Distribución simplificada basada en datos demográficos chilenos
 */
function generateSyntheticAgents(count: number): CademAdapterAgent[] {
  const agents: CademAdapterAgent[] = [];

  // Distribuciones simplificadas
  const regions = [
    { code: 'CL-RM', weight: 0.40 },
    { code: 'CL-VS', weight: 0.12 },
    { code: 'CL-BI', weight: 0.12 },
    { code: 'CL-MA', weight: 0.10 },
    { code: 'CL-AR', weight: 0.08 },
    { code: 'CL-LR', weight: 0.06 },
    { code: 'CL-LL', weight: 0.05 },
    { code: 'CL-CO', weight: 0.04 },
    { code: 'CL-TA', weight: 0.03 },
  ];

  const sexes = ['male', 'female'];
  const educationLevels = ['primary', 'secondary', 'technical', 'university'];
  const agentTypes = ['employed', 'student', 'retired', 'unemployed'];
  const connectivityLevels = ['low', 'medium', 'high'];

  for (let i = 0; i < count; i++) {
    // Seleccionar región basada en pesos
    const random = Math.random();
    let cumulativeWeight = 0;
    let selectedRegion = regions[0].code;
    for (const region of regions) {
      cumulativeWeight += region.weight;
      if (random <= cumulativeWeight) {
        selectedRegion = region.code;
        break;
      }
    }

    // Edad: distribución normal aproximada 18-80
    const age = Math.floor(18 + Math.random() * 62);

    // Sexo: 50/50
    const sex = sexes[Math.floor(Math.random() * sexes.length)];

    // Nivel educacional: más secundaria/universidad
    const educationLevel = educationLevels[Math.floor(Math.random() * educationLevels.length)];

    // Decil de ingreso: 1-10
    const incomeDecile = Math.floor(1 + Math.random() * 10);

    // Tipo de agente
    const agentType = agentTypes[Math.floor(Math.random() * agentTypes.length)];

    // Nivel de conectividad
    const connectivityLevel = connectivityLevels[Math.floor(Math.random() * connectivityLevels.length)];

    agents.push({
      agentId: `agent_${i.toString().padStart(4, '0')}`,
      age,
      sex,
      educationLevel,
      incomeDecile,
      regionCode: selectedRegion,
      agentType,
      connectivityLevel,
      povertyStatus: incomeDecile <= 3 ? 'poor' : incomeDecile <= 6 ? 'vulnerable' : 'middle_class',
      digitalExposure: connectivityLevel === 'high' ? 'high' : connectivityLevel === 'medium' ? 'medium' : 'low',
      preferredChannel: connectivityLevel === 'high' ? 'mobile_app' : connectivityLevel === 'medium' ? 'web' : 'phone',
    });
  }

  return agents;
}

// ============================================================================
// DEFINICIÓN DE ENCUESTA
// ============================================================================

const SURVEY_DEFINITION: CademSurveyDefinition = {
  id: 'cadem_calibration_survey_001',
  title: 'Encuesta de Calibración CADEM - Marzo 2026',
  topic: 'opinion_publica',
  questions: [
    {
      id: 'q_approval',
      text: '¿Aprueba o desaprueba la forma como el gobierno está conduciendo el país?',
      type: 'single_choice',
      options: ['approve', 'disapprove', 'no_response'],
      periodicity: 'permanent',
    },
    {
      id: 'q_direction',
      text: '¿Cree usted que el país va por buen camino o mal camino?',
      type: 'single_choice',
      options: ['good_path', 'bad_path', 'no_response'],
      periodicity: 'permanent',
    },
    {
      id: 'q_optimism',
      text: '¿Cómo cree que estará el país dentro de un año?',
      type: 'single_choice',
      options: ['optimistic', 'pessimistic', 'no_response'],
      periodicity: 'permanent',
    },
    {
      id: 'q_economy_national',
      text: '¿Cómo evalúa la situación económica actual del país?',
      type: 'single_choice',
      options: ['positive', 'negative', 'no_response'],
      periodicity: 'permanent',
    },
    {
      id: 'q_economy_personal',
      text: '¿Cómo evalúa su situación económica personal actual?',
      type: 'single_choice',
      options: ['positive', 'negative', 'no_response'],
      periodicity: 'permanent',
    },
  ],
};

// ============================================================================
// FUNCIÓN PRINCIPAL
// ============================================================================

async function main(): Promise<void> {
  console.log('\n' + '='.repeat(80));
  console.log('CADEM BENCHMARK COMPARISON');
  console.log('='.repeat(80));
  console.log(`Agentes: ${CONFIG.AGENT_COUNT}`);
  console.log(`Engine Mode: ${CONFIG.ENGINE_MODE}`);
  console.log(`Benchmark: ${CONFIG.BENCHMARK_PATH}`);
  console.log('-'.repeat(80));

  try {
    // 1. Cargar benchmark
    console.log('\n📥 Cargando benchmark...');
    const benchmark = loadBenchmark(CONFIG.BENCHMARK_PATH);
    console.log(`   ✓ Benchmark cargado: ${benchmark.metadata.source}`);
    console.log(`   ✓ Período: ${benchmark.metadata.period}`);
    console.log(`   ✓ Muestra total: ${benchmark.metadata.total_sample}`);

    // 2. Generar agentes sintéticos
    console.log('\n👥 Generando agentes sintéticos...');
    const agents = generateSyntheticAgents(CONFIG.AGENT_COUNT);
    console.log(`   ✓ ${agents.length} agentes generados`);

    // Mostrar distribución demográfica
    const regionCounts: Record<string, number> = {};
    for (const agent of agents) {
      const region = agent.regionCode ?? 'unknown';
      regionCounts[region] = (regionCounts[region] ?? 0) + 1;
    }
    console.log('   Distribución por región:');
    for (const [region, count] of Object.entries(regionCounts).sort((a, b) => b[1] - a[1])) {
      const pct = ((count / agents.length) * 100).toFixed(1);
      console.log(`      ${region}: ${count} (${pct}%)`);
    }

    // 3. Ejecutar encuesta
    console.log('\n📝 Ejecutando encuesta...');
    const startTime = Date.now();

    const surveyResult = await runSurvey({
      surveyDefinition: SURVEY_DEFINITION,
      agents,
      engineMode: CONFIG.ENGINE_MODE,
      persistState: false,
      debug: false,
    });

    const duration = Date.now() - startTime;
    console.log(`   ✓ Encuesta completada en ${duration}ms`);
    console.log(`   ✓ Respuestas generadas: ${surveyResult.totalResponses}`);

    // 4. Agregar resultados
    console.log('\n📊 Agregando resultados...');
    const aggregated = aggregateSurveyResponses(surveyResult.responses);
    console.log(`   ✓ ${aggregated.questionResults.length} preguntas agregadas`);

    // Mostrar distribuciones sintéticas
    console.log('\n   Distribuciones sintéticas:');
    for (const q of aggregated.questionResults) {
      console.log(`   [${q.questionId}]`);
      for (const [option, pct] of Object.entries(q.distributionPct)) {
        const bar = '█'.repeat(Math.round(pct / 5));
        console.log(`      ${option.padEnd(20)} ${bar} ${pct}%`);
      }
    }

    // 5. Preparar resultados sintéticos para comparación
    const syntheticResults: SyntheticResult[] = aggregated.questionResults.map(q => ({
      questionId: q.questionId,
      distribution: q.distributionPct,
    }));

    // 6. Comparar contra benchmark
    console.log('\n🔍 Comparando contra benchmark...');
    const comparison = compareSyntheticVsBenchmark(syntheticResults, benchmark);

    // 7. Imprimir reporte
    printBenchmarkComparison(comparison);

    // 8. Exportar resultados
    const outputPath = path.resolve(CONFIG.OUTPUT_PATH);
    exportComparisonToJson(comparison, outputPath);

    console.log('\n✅ Comparación completada exitosamente');
    console.log(`   Resultados exportados a: ${outputPath}`);

    // Resumen final
    console.log('\n📈 RESUMEN DE CALIBRACIÓN');
    console.log('-'.repeat(80));
    console.log(`MAE General: ${comparison.overallMAE.toFixed(2)} pp`);
    console.log(`Divergencia Baja (≤5pp): ${comparison.summary.lowDivergence} preguntas`);
    console.log(`Divergencia Media (5-10pp): ${comparison.summary.mediumDivergence} preguntas`);
    console.log(`Divergencia Alta (>10pp): ${comparison.summary.highDivergence} preguntas`);

    if (comparison.summary.highDivergence === 0 && comparison.summary.mediumDivergence === 0) {
      console.log('\n✅ Motor calibrado correctamente - todas las preguntas dentro de umbral aceptable');
    } else if (comparison.summary.highDivergence === 0) {
      console.log('\n⚠️  Calibración aceptable - algunas preguntas requieren ajuste menor');
    } else {
      console.log('\n❌ Calibración requerida - preguntas con alta divergencia detectadas');
    }

    console.log('\n' + '='.repeat(80));

  } catch (error) {
    console.error('\n❌ Error en la comparación:');
    console.error(error);
    process.exit(1);
  }
}

// ============================================================================
// EJECUCIÓN
// ============================================================================

main();
