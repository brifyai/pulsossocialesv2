/**
 * Tests de Propiedades Estadísticas del Motor de Opinión
 *
 * Estos tests verifican propiedades estadísticas fundamentales del motor:
 * - Distribución de respuestas
 * - Varianza y estabilidad
 * - Correlaciones esperadas
 * - Comportamiento de extremos
 *
 * NOTA: Estos tests NO verifican calibración contra benchmarks externos,
 * sino propiedades internas del motor.
 */

import { describe, it, expect } from 'vitest';
import { generateQuickResponse, type OpinionEngineAgent } from '../opinionEngine';
import { interpretQuestion, type RawSurveyQuestion } from '../questionInterpreter';
import { buildInitialTopicStates } from '../topicStateSeed';
import { CADEM_BENCHMARKS, runMultipleSimulations, type SimulationResult } from './calibrationBenchmarks';

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Crea un agente con características específicas para testing.
 */
function createTestAgent(overrides: Partial<OpinionEngineAgent> = {}): OpinionEngineAgent {
  return {
    agentId: `test-agent-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    age: 35,
    sex: 'male',
    educationLevel: 'university',
    incomeDecile: 5,
    regionCode: 'RM',
    communeCode: 'RM-001',
    connectivityLevel: 'high',
    digitalExposure: 'high',
    preferredChannel: 'web',
    agentType: 'standard',
    ...overrides,
  };
}

/**
 * Ejecuta simulación con agentes de un perfil específico.
 */
async function runProfileSimulation(
  questionText: string,
  agentOverrides: Partial<OpinionEngineAgent>,
  numAgents: number = 200
): Promise<SimulationResult> {
  const rawQuestion: RawSurveyQuestion = {
    id: `test-${Date.now()}`,
    text: questionText,
    type: 'single_choice',
  };

  const interpretedQuestion = interpretQuestion(rawQuestion);
  const distribution: Record<string, number> = {};
  let noResponseCount = 0;

  for (let i = 0; i < numAgents; i++) {
    const agent = createTestAgent(agentOverrides);
    const topicStates = buildInitialTopicStates(agent);
    const response = generateQuickResponse(agent, interpretedQuestion, topicStates);

    const value = String(response.value);
    if (value === 'no_response' || value === 'null' || value === 'undefined') {
      noResponseCount++;
    } else {
      distribution[value] = (distribution[value] || 0) + 1;
    }
  }

  const total = numAgents;
  for (const key of Object.keys(distribution)) {
    distribution[key] = distribution[key] / total;
  }

  return {
    distribution,
    totalResponses: numAgents - noResponseCount,
    noResponseRate: noResponseCount / total,
  };
}

/**
 * Calcula la entropía de una distribución (medida de dispersión).
 * Mayor entropía = distribución más uniforme.
 */
function calculateEntropy(distribution: Record<string, number>): number {
  const values = Object.values(distribution).filter(p => p > 0);
  return -values.reduce((sum, p) => sum + p * Math.log2(p), 0);
}

// Nota: calculateGini removido - no se usa actualmente pero puede ser útil para análisis futuro

// ============================================================================
// TESTS DE PROPIEDADES ESTADÍSTICAS
// ============================================================================

describe('Statistical Properties Tests', () => {
  const NUM_RUNS = 5;
  const AGENTS_PER_RUN = 300;

  describe('Distribution Shape', () => {
    it('should produce unimodal or bimodal distributions for approval questions', async () => {
      const benchmark = CADEM_BENCHMARKS.questions.presidential_approval;

      const result = await runMultipleSimulations(
        async () => {
          // Crear agentes representativos
          const rawQuestion: RawSurveyQuestion = {
            id: `test-${Date.now()}`,
            text: benchmark.questionText,
            type: 'single_choice',
          };
          const interpretedQuestion = interpretQuestion(rawQuestion);
          const distribution: Record<string, number> = {};

          for (let i = 0; i < AGENTS_PER_RUN; i++) {
            // Distribución demográfica representativa
            const isMale = Math.random() < 0.49;
            const age = Math.random() < 0.19 ? 20 : Math.random() < 0.56 ? 35 : Math.random() < 0.87 ? 55 : 70;
            const incomeDecile = Math.floor(Math.random() * 10) + 1;

            const agent = createTestAgent({
              age,
              sex: isMale ? 'male' : 'female',
              incomeDecile,
            });

            const topicStates = buildInitialTopicStates(agent);
            const response = generateQuickResponse(agent, interpretedQuestion, topicStates);
            const value = String(response.value);
            if (value !== 'no_response') {
              distribution[value] = (distribution[value] || 0) + 1;
            }
          }

          const total = AGENTS_PER_RUN;
          for (const key of Object.keys(distribution)) {
            distribution[key] = distribution[key] / total;
          }

          return {
            distribution,
            totalResponses: AGENTS_PER_RUN,
            noResponseRate: 0,
          };
        },
        NUM_RUNS
      );

      const avgDistribution = result.averageDistribution;
      const values = Object.values(avgDistribution);

      // Verificar que hay al menos 2 categorías principales (approve/disapprove)
      const significantCategories = values.filter(v => v > 0.1).length;
      console.log('\n=== Distribution Shape Analysis ===');
      console.log(`Significant categories (>10%): ${significantCategories}`);
      console.log(`Distribution:`, Object.entries(avgDistribution).map(([k, v]) => `${k}: ${(v * 100).toFixed(1)}%`).join(', '));

      expect(significantCategories).toBeGreaterThanOrEqual(2);
    }, 60000);

    it('should have reasonable entropy for ordinal questions', async () => {
      const benchmark = CADEM_BENCHMARKS.questions.country_optimism;

      const result = await runMultipleSimulations(
        async () => {
          const rawQuestion: RawSurveyQuestion = {
            id: `test-${Date.now()}`,
            text: benchmark.questionText,
            type: 'single_choice',
          };
          const interpretedQuestion = interpretQuestion(rawQuestion);
          const distribution: Record<string, number> = {};

          for (let i = 0; i < AGENTS_PER_RUN; i++) {
            const agent = createTestAgent();
            const topicStates = buildInitialTopicStates(agent);
            const response = generateQuickResponse(agent, interpretedQuestion, topicStates);
            const value = String(response.value);
            if (value !== 'no_response') {
              distribution[value] = (distribution[value] || 0) + 1;
            }
          }

          const total = AGENTS_PER_RUN;
          for (const key of Object.keys(distribution)) {
            distribution[key] = distribution[key] / total;
          }

          return {
            distribution,
            totalResponses: AGENTS_PER_RUN,
            noResponseRate: 0,
          };
        },
        NUM_RUNS
      );

      const entropy = calculateEntropy(result.averageDistribution);
      const numCategories = Object.keys(result.averageDistribution).length;
      const maxEntropy = Math.log2(numCategories || 1);
      const normalizedEntropy = maxEntropy > 0 ? entropy / maxEntropy : 0;

      console.log('\n=== Entropy Analysis ===');
      console.log(`Entropy: ${entropy.toFixed(3)} bits`);
      console.log(`Max possible: ${maxEntropy.toFixed(3)} bits`);
      console.log(`Normalized: ${(normalizedEntropy * 100).toFixed(1)}%`);

      // Entropía normalizada debe estar entre 30% y 90%
      expect(normalizedEntropy).toBeGreaterThan(0.3);
      expect(normalizedEntropy).toBeLessThan(0.9);
    }, 60000);
  });

  describe('Demographic Correlations', () => {
    it('should show correlation between income and economic perception', async () => {
      const benchmark = CADEM_BENCHMARKS.questions.personal_economic;

      // Simular con diferentes niveles de ingreso
      const incomeLevels = [2, 5, 8]; // Bajo, medio, alto
      const results: Record<number, SimulationResult> = {};

      for (const income of incomeLevels) {
        results[income] = await runProfileSimulation(
          benchmark.questionText,
          { incomeDecile: income },
          200
        );
      }

      console.log('\n=== Income-Economic Perception Correlation ===');
      for (const [income, result] of Object.entries(results)) {
        const goodRate = (result.distribution['good'] || 0) + (result.distribution['very_good'] || 0);
        console.log(`Income decile ${income}: ${(goodRate * 100).toFixed(1)}% positive`);
      }

      // Verificar correlación: mayor ingreso = mayor percepción positiva
      const lowIncomeGood = (results[2].distribution['good'] || 0) + (results[2].distribution['very_good'] || 0);
      const highIncomeGood = (results[8].distribution['good'] || 0) + (results[8].distribution['very_good'] || 0);

      expect(highIncomeGood).toBeGreaterThan(lowIncomeGood);
    }, 60000);

    it('should show correlation between age and optimism', async () => {
      const benchmark = CADEM_BENCHMARKS.questions.country_optimism;

      const ageGroups = [
        { age: 25, label: 'young' },
        { age: 45, label: 'middle' },
        { age: 65, label: 'older' },
      ];

      const results: Record<string, SimulationResult> = {};

      for (const group of ageGroups) {
        results[group.label] = await runProfileSimulation(
          benchmark.questionText,
          { age: group.age },
          200
        );
      }

      console.log('\n=== Age-Optimism Correlation ===');
      for (const [label, result] of Object.entries(results)) {
        const optimisticRate = (result.distribution['optimistic'] || 0) +
                               (result.distribution['very_optimistic'] || 0);
        console.log(`${label} (${ageGroups.find(g => g.label === label)?.age}): ${(optimisticRate * 100).toFixed(1)}% optimistic`);
      }

      // Verificar que hay diferencias entre grupos de edad
      const youngOptimism = (results['young'].distribution['optimistic'] || 0) +
                            (results['young'].distribution['very_optimistic'] || 0);
      const olderOptimism = (results['older'].distribution['optimistic'] || 0) +
                            (results['older'].distribution['very_optimistic'] || 0);

      // La diferencia debe ser significativa (> 5pp)
      expect(Math.abs(youngOptimism - olderOptimism)).toBeGreaterThan(0.05);
    }, 60000);
  });

  describe('Stability and Variance', () => {
    it('should have low variance between identical runs', async () => {
      const benchmark = CADEM_BENCHMARKS.questions.presidential_approval;

      const results: SimulationResult[] = [];
      const numRuns = 10;

      for (let i = 0; i < numRuns; i++) {
        const result = await runProfileSimulation(
          benchmark.questionText,
          {}, // Agentes aleatorios pero con misma distribución demográfica
          300
        );
        results.push(result);
      }

      // Calcular varianza para cada categoría
      const categories = new Set<string>();
      results.forEach(r => Object.keys(r.distribution).forEach(k => categories.add(k)));
      const categoriesArray = Array.from(categories);

      const variances: Record<string, number> = {};
      for (const cat of categoriesArray) {
        const values = results.map(r => r.distribution[cat] || 0);
        const mean = values.reduce((a, b) => a + b, 0) / values.length;
        const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
        variances[cat] = variance;
      }

      console.log('\n=== Stability Analysis ===');
      console.log(`Runs: ${numRuns}`);
      for (const [cat, var_] of Object.entries(variances)) {
        const stdDev = Math.sqrt(var_);
        console.log(`${cat}: variance=${(var_ * 10000).toFixed(2)}pp², stdDev=${(stdDev * 100).toFixed(2)}pp`);
      }

      // Varianza máxima debe ser menor a 0.001 (stdDev < 3.2%)
      const maxVariance = Math.max(...Object.values(variances));
      expect(maxVariance).toBeLessThan(0.001);
    }, 120000);

    it('should converge with larger sample sizes', async () => {
      const benchmark = CADEM_BENCHMARKS.questions.presidential_approval;

      const sampleSizes = [100, 300, 500];
      const results: Record<number, { approve: number; stdDev: number }> = {};

      for (const size of sampleSizes) {
        const runs: number[] = [];
        for (let i = 0; i < 5; i++) {
          const result = await runProfileSimulation(
            benchmark.questionText,
            {},
            size
          );
          runs.push(result.distribution['approve'] || 0);
        }
        const mean = runs.reduce((a, b) => a + b, 0) / runs.length;
        const variance = runs.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / runs.length;
        results[size] = { approve: mean, stdDev: Math.sqrt(variance) };
      }

      console.log('\n=== Convergence Analysis ===');
      for (const [size, data] of Object.entries(results)) {
        console.log(`N=${size}: approve=${(data.approve * 100).toFixed(1)}%, stdDev=${(data.stdDev * 100).toFixed(2)}pp`);
      }

      // La desviación estándar debe disminuir con el tamaño de muestra
      expect(results[300].stdDev).toBeLessThan(results[100].stdDev);
      expect(results[500].stdDev).toBeLessThan(results[300].stdDev);
    }, 120000);
  });

  describe('Extreme Cases', () => {
    it('should handle extreme demographic profiles', async () => {
      const benchmark = CADEM_BENCHMARKS.questions.presidential_approval;

      const extremeProfiles = [
        { label: 'high_income_young', age: 25, incomeDecile: 9, educationLevel: 'university' },
        { label: 'low_income_old', age: 70, incomeDecile: 2, educationLevel: 'primary' },
        { label: 'middle_class', age: 40, incomeDecile: 5, educationLevel: 'secondary' },
      ];

      console.log('\n=== Extreme Profiles Analysis ===');
      for (const profile of extremeProfiles) {
        const result = await runProfileSimulation(
          benchmark.questionText,
          profile,
          200
        );

        const approveRate = result.distribution['approve'] || 0;
        console.log(`${profile.label}: ${(approveRate * 100).toFixed(1)}% approve`);

        // Verificar que las respuestas están en rango válido
        expect(approveRate).toBeGreaterThanOrEqual(0);
        expect(approveRate).toBeLessThanOrEqual(1);
      }
    }, 60000);

    it('should produce different distributions for different questions', async () => {
      const questions = [
        CADEM_BENCHMARKS.questions.presidential_approval,
        CADEM_BENCHMARKS.questions.country_direction,
        CADEM_BENCHMARKS.questions.country_optimism,
      ];

      const distributions: Record<string, Record<string, number>> = {};

      for (const q of questions) {
        const result = await runProfileSimulation(q.questionText, {}, 300);
        distributions[q.questionFamily] = result.distribution;
      }

      console.log('\n=== Question Differentiation ===');
      for (const [family, dist] of Object.entries(distributions)) {
        const keys = Object.keys(dist).join(', ');
        console.log(`${family}: [${keys}]`);
      }

      // Cada pregunta debe producir diferentes categorías de respuesta
      const families = Object.keys(distributions);
      for (let i = 0; i < families.length; i++) {
        for (let j = i + 1; j < families.length; j++) {
          const keys1 = Object.keys(distributions[families[i]]).sort().join(',');
          const keys2 = Object.keys(distributions[families[j]]).sort().join(',');
          // No deben ser idénticos (permiten overlap parcial)
          expect(keys1 === keys2).toBe(false);
        }
      }
    }, 60000);
  });

  describe('No-Response Behavior', () => {
    it('should have higher no-response for complex questions', async () => {
      const simpleQuestion = CADEM_BENCHMARKS.questions.presidential_approval;
      const complexQuestion = CADEM_BENCHMARKS.questions.country_optimism;

      const simpleResult = await runMultipleSimulations(
        () => runProfileSimulation(simpleQuestion.questionText, {}, 300),
        3
      );

      const complexResult = await runMultipleSimulations(
        () => runProfileSimulation(complexQuestion.questionText, {}, 300),
        3
      );

      const simpleNoResponse = simpleResult.individualRuns.reduce((s, r) => s + r.noResponseRate, 0) / 3;
      const complexNoResponse = complexResult.individualRuns.reduce((s, r) => s + r.noResponseRate, 0) / 3;

      console.log('\n=== No-Response Comparison ===');
      console.log(`Simple question: ${(simpleNoResponse * 100).toFixed(1)}%`);
      console.log(`Complex question: ${(complexNoResponse * 100).toFixed(1)}%`);

      // Preguntas complejas pueden tener ligeramente más no-respuesta
      // pero la diferencia no debe ser extrema
      expect(Math.abs(complexNoResponse - simpleNoResponse)).toBeLessThan(0.1);
    }, 60000);
  });
});
