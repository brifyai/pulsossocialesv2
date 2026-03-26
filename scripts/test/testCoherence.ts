/**
 * Script de coherencia interna: Analiza correlaciones entre respuestas
 * para verificar consistencia lógica del sistema.
 */

import { runCademSurvey } from '../../src/app/survey/surveyRunner';
import type { IndividualResponse } from '../../src/app/survey/surveyAggregator';

interface CoherenceRule {
  name: string;
  description: string;
  check: (responses: IndividualResponse[]) => CoherenceResult;
}

interface CoherenceResult {
  rule: string;
  total: number;
  consistent: number;
  inconsistent: number;
  consistencyRate: number;
  observations: string[];
}

interface CoherenceReport {
  agentCount: number;
  rules: CoherenceResult[];
  summary: {
    overallConsistency: number;
    strongestRule: string;
    weakestRule: string;
    recommendations: string[];
  };
}

/**
 * Extrae respuesta de un agente para una pregunta específica
 */
function getResponse(
  responses: IndividualResponse[],
  agentId: string,
  questionCode: string,
): string | null {
  const response = responses.find(
    (r) => r.agentId === agentId && r.questionCode === questionCode,
  );
  return response?.responseValue ?? null;
}

/**
 * Regla 1: Aprobación debe correlacionar con Dirección del país
 */
const approvalDirectionRule: CoherenceRule = {
  name: 'Aprobación vs Dirección',
  description: 'approve debería correlacionar con good_path',
  check: (responses) => {
    const agentIds = [...new Set(responses.map((r) => r.agentId))];
    let consistent = 0;
    let inconsistent = 0;
    const observations: string[] = [];

    for (const agentId of agentIds) {
      const approval = getResponse(responses, agentId, 'P1');
      const direction = getResponse(responses, agentId, 'P2');

      if (!approval || !direction || approval === 'no_response' || direction === 'no_response') {
        continue;
      }

      // approve + good_path = consistente
      // disapprove + bad_path = consistente
      const isConsistent =
        (approval === 'approve' && direction === 'good_path') ||
        (approval === 'disapprove' && direction === 'bad_path') ||
        (approval === 'approve' && direction === 'bad_path') || // posible pero menos común
        (approval === 'disapprove' && direction === 'good_path'); // posible pero menos común

      // Solo marcar como inconsistente si es claramente opuesto
      const isClearlyInconsistent =
        (approval === 'approve' && direction === 'bad_path') ||
        (approval === 'disapprove' && direction === 'good_path');

      if (isClearlyInconsistent) {
        inconsistent++;
      } else {
        consistent++;
      }
    }

    const total = consistent + inconsistent;
    const rate = total > 0 ? (consistent / total) * 100 : 0;

    if (rate < 60) {
      observations.push('Baja coherencia: aprobación y dirección están muy desacoplados');
    } else if (rate > 90) {
      observations.push('Alta coherencia: aprobación y dirección están fuertemente ligados');
    }

    return {
      rule: 'Aprobación vs Dirección',
      total,
      consistent,
      inconsistent,
      consistencyRate: Math.round(rate * 10) / 10,
      observations,
    };
  },
};

/**
 * Regla 2: Economía nacional debe correlacionar con Optimismo
 */
const economyOptimismRule: CoherenceRule = {
  name: 'Economía Nacional vs Optimismo',
  description: 'bad economy_national debería correlacionar con pessimistic',
  check: (responses) => {
    const agentIds = [...new Set(responses.map((r) => r.agentId))];
    let consistent = 0;
    let inconsistent = 0;
    const observations: string[] = [];

    for (const agentId of agentIds) {
      const economy = getResponse(responses, agentId, 'P4');
      const optimism = getResponse(responses, agentId, 'P3');

      if (!economy || !optimism || economy === 'no_response' || optimism === 'no_response') {
        continue;
      }

      // bad/very_bad + pessimistic/very_pessimistic = consistente
      // good/very_good + optimistic/very_optimistic = consistente
      const economyNegative = ['bad', 'very_bad'].includes(economy);
      const economyPositive = ['good', 'very_good'].includes(economy);
      const optimismNegative = ['pessimistic', 'very_pessimistic'].includes(optimism);
      const optimismPositive = ['optimistic', 'very_optimistic'].includes(optimism);

      const isConsistent =
        (economyNegative && optimismNegative) ||
        (economyPositive && optimismPositive) ||
        (!economyNegative && !economyPositive && !optimismNegative && !optimismPositive);

      const isClearlyInconsistent =
        (economyNegative && optimismPositive) ||
        (economyPositive && optimismNegative);

      if (isClearlyInconsistent) {
        inconsistent++;
      } else {
        consistent++;
      }
    }

    const total = consistent + inconsistent;
    const rate = total > 0 ? (consistent / total) * 100 : 0;

    if (rate < 60) {
      observations.push('Baja coherencia: economía y optimismo están muy desacoplados');
    }

    return {
      rule: 'Economía Nacional vs Optimismo',
      total,
      consistent,
      inconsistent,
      consistencyRate: Math.round(rate * 10) / 10,
      observations,
    };
  },
};

/**
 * Regla 3: Ideología debe influir en Aprobación
 */
const ideologyApprovalRule: CoherenceRule = {
  name: 'Ideología vs Aprobación',
  description: 'right debería tender a approve, left a disapprove',
  check: (responses) => {
    const agentIds = [...new Set(responses.map((r) => r.agentId))];
    let consistent = 0;
    let inconsistent = 0;
    const observations: string[] = [];

    // Contar por ideología
    const byIdeology: Record<string, { approve: number; disapprove: number }> = {};

    for (const agentId of agentIds) {
      const ideology = getResponse(responses, agentId, 'P6');
      const approval = getResponse(responses, agentId, 'P1');

      if (!ideology || !approval || ideology === 'no_response' || approval === 'no_response') {
        continue;
      }

      if (!byIdeology[ideology]) {
        byIdeology[ideology] = { approve: 0, disapprove: 0 };
      }
      byIdeology[ideology][approval as 'approve' | 'disapprove']++;

      // right/center_right + approve = consistente
      // left/center_left + disapprove = consistente
      // center/independent = neutral
      const rightWing = ['right', 'center_right'].includes(ideology);
      const leftWing = ['left', 'center_left'].includes(ideology);

      const isConsistent =
        (rightWing && approval === 'approve') ||
        (leftWing && approval === 'disapprove') ||
        (!rightWing && !leftWing);

      const isClearlyInconsistent =
        (rightWing && approval === 'disapprove') ||
        (leftWing && approval === 'approve');

      if (isClearlyInconsistent) {
        inconsistent++;
      } else {
        consistent++;
      }
    }

    const total = consistent + inconsistent;
    const rate = total > 0 ? (consistent / total) * 100 : 0;

    // Analizar distribución por ideología
    for (const [ideo, counts] of Object.entries(byIdeology)) {
      const total = counts.approve + counts.disapprove;
      if (total > 0) {
        const approvePct = (counts.approve / total) * 100;
        observations.push(`${ideo}: ${approvePct.toFixed(0)}% approve`);
      }
    }

    return {
      rule: 'Ideología vs Aprobación',
      total,
      consistent,
      inconsistent,
      consistencyRate: Math.round(rate * 10) / 10,
      observations,
    };
  },
};

/**
 * Regla 4: Economía Personal vs Nacional
 */
const personalVsNationalRule: CoherenceRule = {
  name: 'Economía Personal vs Nacional',
  description: 'personal suele ser mejor que nacional',
  check: (responses) => {
    const agentIds = [...new Set(responses.map((r) => r.agentId))];
    let personalBetter = 0;
    let nationalBetter = 0;
    let equal = 0;
    const observations: string[] = [];

    for (const agentId of agentIds) {
      const personal = getResponse(responses, agentId, 'P5');
      const national = getResponse(responses, agentId, 'P4');

      if (!personal || !national || personal === 'no_response' || national === 'no_response') {
        continue;
      }

      const scoreMap: Record<string, number> = {
        very_good: 2,
        good: 1,
        bad: -1,
        very_bad: -2,
      };

      const personalScore = scoreMap[personal] ?? 0;
      const nationalScore = scoreMap[national] ?? 0;

      if (personalScore > nationalScore) {
        personalBetter++;
      } else if (nationalScore > personalScore) {
        nationalBetter++;
      } else {
        equal++;
      }
    }

    const total = personalBetter + nationalBetter + equal;
    const personalBetterPct = total > 0 ? (personalBetter / total) * 100 : 0;
    const nationalBetterPct = total > 0 ? (nationalBetter / total) * 100 : 0;

    observations.push(`${personalBetterPct.toFixed(0)}% ven economía personal mejor que nacional`);
    observations.push(`${nationalBetterPct.toFixed(0)}% ven economía nacional mejor que personal`);

    // En general, personal debería ser igual o mejor
    const rate = personalBetterPct + (equal / total) * 50;

    return {
      rule: 'Economía Personal vs Nacional',
      total,
      consistent: personalBetter,
      inconsistent: nationalBetter,
      consistencyRate: Math.round(rate * 10) / 10,
      observations,
    };
  },
};

/**
 * Regla 5: Dirección vs Optimismo
 */
const directionOptimismRule: CoherenceRule = {
  name: 'Dirección vs Optimismo',
  description: 'good_path debería correlacionar con optimistic',
  check: (responses) => {
    const agentIds = [...new Set(responses.map((r) => r.agentId))];
    let consistent = 0;
    let inconsistent = 0;
    const observations: string[] = [];

    for (const agentId of agentIds) {
      const direction = getResponse(responses, agentId, 'P2');
      const optimism = getResponse(responses, agentId, 'P3');

      if (!direction || !optimism || direction === 'no_response' || optimism === 'no_response') {
        continue;
      }

      const goodDirection = direction === 'good_path';
      const badDirection = direction === 'bad_path';
      const optimistic = ['optimistic', 'very_optimistic'].includes(optimism);
      const pessimistic = ['pessimistic', 'very_pessimistic'].includes(optimism);

      const isConsistent =
        (goodDirection && optimistic) ||
        (badDirection && pessimistic) ||
        (!goodDirection && !badDirection);

      const isClearlyInconsistent =
        (goodDirection && pessimistic) ||
        (badDirection && optimistic);

      if (isClearlyInconsistent) {
        inconsistent++;
      } else {
        consistent++;
      }
    }

    const total = consistent + inconsistent;
    const rate = total > 0 ? (consistent / total) * 100 : 0;

    return {
      rule: 'Dirección vs Optimismo',
      total,
      consistent,
      inconsistent,
      consistencyRate: Math.round(rate * 10) / 10,
      observations,
    };
  },
};

const ALL_RULES: CoherenceRule[] = [
  approvalDirectionRule,
  economyOptimismRule,
  ideologyApprovalRule,
  personalVsNationalRule,
  directionOptimismRule,
];

/**
 * Genera reporte de coherencia
 */
function generateCoherenceReport(
  responses: IndividualResponse[],
  agentCount: number,
): CoherenceReport {
  const rules = ALL_RULES.map((rule) => rule.check(responses));

  const overallConsistency =
    rules.reduce((sum, r) => sum + r.consistencyRate, 0) / rules.length;

  const sortedByConsistency = [...rules].sort((a, b) => a.consistencyRate - b.consistencyRate);

  const recommendations: string[] = [];

  if (overallConsistency < 60) {
    recommendations.push('Sistema con baja coherencia interna. Revisar pesos de cascada.');
  }

  if (sortedByConsistency[0].consistencyRate < 50) {
    recommendations.push(`Regla más débil: ${sortedByConsistency[0].rule}. Considerar ajustar.`);
  }

  if (sortedByConsistency[sortedByConsistency.length - 1].consistencyRate > 90) {
    recommendations.push(
      `Regla más fuerte: ${sortedByConsistency[sortedByConsistency.length - 1].rule}. ` +
      'Posible exceso de determinismo.'
    );
  }

  return {
    agentCount,
    rules,
    summary: {
      overallConsistency: Math.round(overallConsistency * 10) / 10,
      strongestRule: sortedByConsistency[sortedByConsistency.length - 1].rule,
      weakestRule: sortedByConsistency[0].rule,
      recommendations,
    },
  };
}

/**
 * Imprime reporte formateado
 */
function printCoherenceReport(report: CoherenceReport): void {
  console.log('\n' + '='.repeat(70));
  console.log('REPORTE DE COHERENCIA INTERNA - CADEM Opinion Engine');
  console.log('='.repeat(70));
  console.log(`Agentes analizados: ${report.agentCount}`);
  console.log(`Coherencia general: ${report.summary.overallConsistency.toFixed(1)}%`);
  console.log('');

  console.log('RESULTADOS POR REGLA');
  console.log('-'.repeat(70));

  for (const rule of report.rules) {
    const icon = rule.consistencyRate >= 70 ? '✓' : rule.consistencyRate >= 50 ? '~' : '✗';
    const bar = '█'.repeat(Math.round(rule.consistencyRate / 4));

    console.log(`\n${icon} ${rule.rule}`);
    console.log(`  Coherencia: ${bar} ${rule.consistencyRate.toFixed(1)}%`);
    console.log(`  Muestra: ${rule.total} agentes`);

    for (const obs of rule.observations) {
      console.log(`  → ${obs}`);
    }
  }

  console.log('\n' + '='.repeat(70));
  console.log('RESUMEN');
  console.log('-'.repeat(70));
  console.log(`Regla más fuerte: ${report.summary.strongestRule}`);
  console.log(`Regla más débil:  ${report.summary.weakestRule}`);

  if (report.summary.recommendations.length > 0) {
    console.log('\nRecomendaciones:');
    for (const rec of report.summary.recommendations) {
      console.log(`  • ${rec}`);
    }
  }

  console.log('='.repeat(70) + '\n');
}

/**
 * Ejecuta el test de coherencia
 */
async function main(): Promise<void> {
  const AGENT_COUNT = 200;

  console.log(`\nIniciando test de coherencia interna...`);
  console.log(`Configuración: ${AGENT_COUNT} agentes`);
  console.log('Analizando correlaciones entre respuestas...\n');

  const result = runCademSurvey(AGENT_COUNT);
  const report = generateCoherenceReport(result.individualResponses, AGENT_COUNT);
  printCoherenceReport(report);
}

// Ejecutar si se llama directamente
if (require.main === module) {
  main().catch(console.error);
}

export { generateCoherenceReport, ALL_RULES };
export type { CoherenceReport, CoherenceResult, CoherenceRule };
