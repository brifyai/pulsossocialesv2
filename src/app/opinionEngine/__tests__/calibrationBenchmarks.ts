/**
 * BENCHMARKS DE CALIBRACIÓN - Plaza Pública CADEM #639
 * Fecha de terreno: 20 de Marzo de 2026
 * Muestra: 1,005 casos, 151 comunas
 * Método: Encuesta online (CAWI) a través de Panel Cadem Online
 * Ponderación: género, edad, zona, NSE, comportamiento electoral 2da vuelta 2025
 *
 * Fuente: Track-PP-639-Marzo-S3-M2-VF.pdf
 *
 * NOTA: La tolerancia de 7pp se basa en el MAE de 6.5pp reportado por CADEM
 * entre metodología telefónica y online, más un margen adicional por
 * diferencias entre simulación y encuesta real.
 */

export const CADEM_BENCHMARKS = {
  source: 'Plaza Pública CADEM #639',
  date: '2026-03-20',
  sampleSize: 1005,
  communes: 151,
  method: 'CAWI - Panel Cadem Online',

  // Tolerancia por defecto: 7pp (basado en MAE de 6.5pp entre modos CATI-CAWI)
  defaultTolerance: 0.07,

  /**
   * DISTRIBUCIÓN POBLACIONAL - Factores de ponderación CADEM
   * Fuente: Diseño Metodológico Plaza Pública 2026, Tabla 2
   * Basado en: SERVEL Padrón Electoral 2025, métricas Cadem, SERVEL 2da vuelta 2025
   */
  populationWeights: {
    gender: {
      male: 0.49,
      female: 0.51,
    },
    age: {
      '18-29': 0.19,
      '30-49': 0.37,
      '50-69': 0.31,
      '70+': 0.13,
    },
    zone: {
      north: 0.12,   // Arica y Parinacota - Coquimbo
      center: 0.22,  // Valparaíso - Maule
      south: 0.27,   // Ñuble - Magallanes
      metropolitan: 0.39, // Región Metropolitana
    },
    socioeconomic: {
      ABC1: 0.10,
      C2: 0.25,
      C3: 0.30,
      DE: 0.35,
    },
    electoralBehavior: {
      votedKast: 0.46,
      votedJara: 0.33,
      didNotVote: 0.21,
    },
  },

  /**
   * PREGUNTAS PERMANENTES - Resultados reales
   */
  questions: {
    /**
     * Pregunta exacta: "Independiente de su posición política, ¿Usted aprueba
     * o desaprueba la forma cómo José Antonio Kast está conduciendo su Gobierno?"
     */
    presidential_approval: {
      questionFamily: 'approval',
      questionText: '¿Usted aprueba o desaprueba la forma cómo José Antonio Kast está conduciendo su Gobierno?',
      results: {
        approve: 0.51,
        disapprove: 0.42,
        noResponse: 0.07,
      },
      tolerance: 0.07,
      // Desglose por segmento (% Aprueba)
      bySegment: {
        male: 0.61,
        female: 0.40,
        age18_34: 0.37,
        age35_54: 0.53,
        age55plus: 0.60,
        nseAlto: 0.56,
        nseMedio: 0.49,
        nseBajo: 0.48,
        metropolitana: 0.43,
        regiones: 0.55,
        derecha: 0.91,
        centro: 0.53,
        izquierda: 0.05,
      },
    },

    /**
     * Pregunta exacta: "Ahora, pensando en todos los aspectos políticos,
     * económicos y sociales, ¿Usted cree que el país va por un buen camino
     * o por un mal camino?"
     */
    country_direction: {
      questionFamily: 'direction',
      questionText: '¿Usted cree que el país va por un buen camino o por un mal camino?',
      results: {
        goodPath: 0.50,
        badPath: 0.35,
        noResponse: 0.15,
      },
      tolerance: 0.08, // Más tolerancia, lectura de gráfico
    },

    /**
     * Pregunta exacta: "En general, ¿Cómo se siente usted acerca del futuro del país?"
     */
    country_optimism: {
      questionFamily: 'optimism',
      questionText: '¿Cómo se siente usted acerca del futuro del país?',
      results: {
        optimistic: 0.53,   // Muy optimista + Optimista
        pessimistic: 0.36,  // Pesimista + Muy pesimista
        noResponse: 0.11,
      },
      tolerance: 0.08,
    },

    /**
     * Pregunta exacta: "Usted cree que en el momento actual la economía
     * chilena está: progresando, estancada o en retroceso"
     */
    economic_situation: {
      questionFamily: 'economic_perception',
      questionText: '¿Usted cree que en el momento actual la economía chilena está progresando, estancada o en retroceso?',
      results: {
        progressing: 0.34,
        stagnant_or_declining: 0.63,
        noResponse: 0.03,
      },
      tolerance: 0.08,
    },

    /**
     * Pregunta exacta: "¿Cómo calificaría usted la situación económica
     * actual de usted y su familia?"
     */
    personal_economic: {
      questionFamily: 'economic_perception',
      questionText: '¿Cómo calificaría usted la situación económica actual de usted y su familia?',
      results: {
        good: 0.52,    // Muy buena + Buena
        bad: 0.44,     // Mala + Muy mala
        noResponse: 0.04,
      },
      tolerance: 0.08,
    },
  },

  /**
   * TEXTOS EXACTOS DE LAS PREGUNTAS PERMANENTES
   * Fuente: Anexo 1 del Diseño Metodológico
   * Estos textos deben ser reconocidos por questionInterpreter
   */
  questionTexts: {
    approval: '¿Usted aprueba o desaprueba la forma cómo José Antonio Kast está conduciendo su Gobierno?',
    direction: '¿Usted cree que el país va por un buen camino o por un mal camino?',
    optimism: '¿Cómo se siente usted acerca del futuro del país?',
    economicSituation: '¿Usted cree que en el momento actual la economía chilena está progresando, estancada o en retroceso?',
    personalEconomic: '¿Cómo calificaría usted la situación económica actual de usted y su familia?',
    businessEconomic: '¿Cómo calificaría usted la situación económica actual de las empresas?',
    employment: '¿Cómo calificaría usted la situación actual del empleo en el país?',
    consumption: '¿Cómo calificaría usted la situación de los consumidores para poder comprar bienes y servicios?',
    politicalPosition: '¿Usted con cuál de las siguientes posiciones se siente más cercano?',
  },
};

/**
 * Tipo para resultados de simulación
 */
export interface SimulationResult {
  distribution: Record<string, number>;
  totalResponses: number;
  noResponseRate: number;
}

/**
 * Ejecuta múltiples simulaciones y promedia resultados
 */
export async function runMultipleSimulations(
  simulationFn: () => Promise<SimulationResult>,
  runs: number = 5
): Promise<{
  averageDistribution: Record<string, number>;
  standardDeviations: Record<string, number>;
  individualRuns: SimulationResult[];
}> {
  const results: SimulationResult[] = [];

  for (let i = 0; i < runs; i++) {
    const result = await simulationFn();
    results.push(result);
  }

  const allKeys = new Set<string>();
  results.forEach(r => Object.keys(r.distribution).forEach(k => allKeys.add(k)));
  const allKeysArray = Array.from(allKeys);

  const averageDistribution: Record<string, number> = {};
  const standardDeviations: Record<string, number> = {};

  for (const key of allKeysArray) {
    const values = results.map(r => r.distribution[key] || 0);
    const avg = values.reduce((sum, v) => sum + v, 0) / values.length;
    const variance = values.reduce((sum, v) => sum + Math.pow(v - avg, 2), 0) / values.length;

    averageDistribution[key] = avg;
    standardDeviations[key] = Math.sqrt(variance);
  }

  return { averageDistribution, standardDeviations, individualRuns: results };
}

/**
 * Verifica tolerancia
 */
export function isWithinTolerance(
  actual: number,
  expected: number,
  tolerance: number
): { pass: boolean; difference: number; message: string } {
  const difference = Math.abs(actual - expected);
  return {
    pass: difference <= tolerance,
    difference,
    message: `Expected ${(expected * 100).toFixed(1)}% ±${(tolerance * 100).toFixed(1)}pp, got ${(actual * 100).toFixed(1)}% (diff: ${(difference * 100).toFixed(1)}pp)`,
  };
}
