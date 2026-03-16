/**
 * Benchmark Service - Sprint 7A
 * 
 * Servicio para gestionar benchmarks de referencia y comparaciones
 * con resultados sintéticos.
 */

import type { 
  Benchmark, 
  SurveyBenchmarkComparison,
  IndicatorComparison,
  ComparisonGap 
} from '../../types/benchmark';
import type { SurveyResult, QuestionResult, SingleChoiceResult, LikertResult } from '../../types/survey';

// ===========================================
// Mock Data - Benchmarks de Referencia
// ===========================================

const mockBenchmarks: Benchmark[] = [
  {
    id: 'benchmark_casen_2022',
    source: {
      id: 'casen_2022',
      name: 'CASEN 2022',
      organization: 'Ministerio de Desarrollo Social',
      year: 2022,
      url: 'https://observatorio.ministeriodesarrollosocial.gob.cl/encuesta-casen',
      description: 'Encuesta de Caracterización Socioeconómica Nacional'
    },
    indicators: [
      {
        id: 'internet_usage_daily',
        name: 'Uso diario de Internet',
        description: 'Porcentaje de personas que usan Internet diariamente',
        category: 'Conectividad Digital',
        unit: 'percentage',
        value: {
          value: 78.5,
          percentage: 78.5,
          sampleSize: 87000,
          marginOfError: 1.2
        },
        compatibleQuestionTypes: ['single_choice'],
        compatibleSegments: ['national', '13']
      },
      {
        id: 'digital_satisfaction',
        name: 'Satisfacción con servicios digitales',
        description: 'Promedio de satisfacción (escala 1-5)',
        category: 'Servicios Digitales',
        unit: 'average',
        value: {
          value: 3.4,
          sampleSize: 45000
        },
        compatibleQuestionTypes: ['likert_scale'],
        compatibleSegments: ['national']
      },
      {
        id: 'economic_concern_high',
        name: 'Alta preocupación económica',
        description: 'Porcentaje muy preocupados por situación económica',
        category: 'Economía',
        unit: 'percentage',
        value: {
          value: 42.3,
          percentage: 42.3,
          sampleSize: 87000
        },
        compatibleQuestionTypes: ['likert_scale'],
        compatibleSegments: ['national', '13']
      }
    ],
    coverage: {
      geographic: ['national'],
      temporal: {
        start: '2022-01-01',
        end: '2022-12-31'
      }
    },
    createdAt: '2023-06-15T00:00:00Z'
  },
  {
    id: 'benchmark_subtel_2023',
    source: {
      id: 'subtel_2023',
      name: 'Encuesta Banda Ancha SUBTEL 2023',
      organization: 'SUBTEL',
      year: 2023,
      description: 'Encuesta de acceso y uso de banda ancha en Chile'
    },
    indicators: [
      {
        id: 'broadband_access',
        name: 'Acceso a banda ancha fija',
        description: 'Hogares con acceso a banda ancha fija',
        category: 'Infraestructura',
        unit: 'percentage',
        value: {
          value: 67.8,
          percentage: 67.8,
          sampleSize: 12000
        },
        compatibleQuestionTypes: ['single_choice'],
        compatibleSegments: ['national', '13']
      },
      {
        id: 'mobile_internet_daily',
        name: 'Uso diario de Internet móvil',
        description: 'Personas que usan Internet móvil todos los días',
        category: 'Conectividad Digital',
        unit: 'percentage',
        value: {
          value: 85.2,
          percentage: 85.2,
          sampleSize: 15000
        },
        compatibleQuestionTypes: ['single_choice'],
        compatibleSegments: ['national']
      }
    ],
    coverage: {
      geographic: ['national'],
      temporal: {
        start: '2023-01-01',
        end: '2023-12-31'
      }
    },
    createdAt: '2024-01-20T00:00:00Z'
  },
  {
    id: 'benchmark_cep_2024',
    source: {
      id: 'cep_2024',
      name: 'Encuesta CEP Abril 2024',
      organization: 'Centro de Estudios Públicos',
      year: 2024,
      url: 'https://www.cepchile.cl/encuesta-cep/',
      description: 'Estudio longitudinal de opinión pública'
    },
    indicators: [
      {
        id: 'economic_expectation_positive',
        name: 'Expectativa económica positiva',
        description: 'Personas que creen que la economía mejorará',
        category: 'Economía',
        unit: 'percentage',
        value: {
          value: 28.5,
          percentage: 28.5,
          sampleSize: 1468,
          marginOfError: 3.0
        },
        compatibleQuestionTypes: ['likert_scale'],
        compatibleSegments: ['national']
      },
      {
        id: 'public_services_satisfaction',
        name: 'Satisfacción con servicios públicos',
        description: 'Promedio de satisfacción general',
        category: 'Servicios Públicos',
        unit: 'average',
        value: {
          value: 2.8,
          sampleSize: 1468
        },
        compatibleQuestionTypes: ['likert_scale'],
        compatibleSegments: ['national']
      }
    ],
    coverage: {
      geographic: ['national'],
      temporal: {
        start: '2024-04-01',
        end: '2024-04-30'
      }
    },
    createdAt: '2024-05-10T00:00:00Z'
  }
];

// ===========================================
// Storage
// ===========================================

const benchmarks: Map<string, Benchmark> = new Map();
const comparisons: Map<string, SurveyBenchmarkComparison> = new Map();

// Inicializar con mocks
mockBenchmarks.forEach(b => benchmarks.set(b.id, b));

// ===========================================
// Benchmark CRUD
// ===========================================

export function getAllBenchmarks(): Benchmark[] {
  return Array.from(benchmarks.values()).sort((a, b) => 
    b.source.year - a.source.year
  );
}

export function getBenchmark(id: string): Benchmark | undefined {
  return benchmarks.get(id);
}

export function getBenchmarksByCategory(category: string): Benchmark[] {
  return getAllBenchmarks().filter(b => 
    b.indicators.some(i => i.category === category)
  );
}

export function getCategories(): string[] {
  const categories = new Set<string>();
  benchmarks.forEach(b => {
    b.indicators.forEach(i => categories.add(i.category));
  });
  return Array.from(categories).sort();
}

// ===========================================
// Comparison Logic
// ===========================================

/**
 * Calcula el gap entre valor sintético y benchmark
 */
function calculateGap(synthetic: number, benchmark: number, _unit: string): ComparisonGap {
  const absolute = synthetic - benchmark;
  const relative = benchmark !== 0 ? (absolute / benchmark) * 100 : 0;
  
  let direction: 'above' | 'below' | 'match';
  if (Math.abs(absolute) < 0.01) direction = 'match';
  else if (absolute > 0) direction = 'above';
  else direction = 'below';
  
  // Significancia basada en diferencia relativa
  let significance: 'high' | 'medium' | 'low';
  const absRelative = Math.abs(relative);
  if (absRelative > 20) significance = 'high';
  else if (absRelative > 10) significance = 'medium';
  else significance = 'low';
  
  return {
    absolute: Math.round(absolute * 100) / 100,
    relative: Math.round(relative * 10) / 10,
    direction,
    significance
  };
}

/**
 * Extrae valor numérico de un resultado de pregunta
 */
function extractValueFromResult(result: QuestionResult): number | null {
  switch (result.questionType) {
    case 'single_choice':
      // Para single_choice, tomamos el porcentaje de la opción más seleccionada
      // o podríamos buscar una opción específica
      const scResult = result as SingleChoiceResult;
      const values = Object.values(scResult.distribution);
      if (values.length === 0) return null;
      // Retornar el porcentaje más alto como referencia
      return Math.max(...values.map(v => v.percentage));
      
    case 'likert_scale':
      const likertResult = result as LikertResult;
      return likertResult.average;
      
    default:
      return null;
  }
}

/**
 * Compara una encuesta sintética con un benchmark
 */
export function compareSurveyWithBenchmark(
  surveyResult: SurveyResult,
  benchmarkId: string
): SurveyBenchmarkComparison | null {
  const benchmark = benchmarks.get(benchmarkId);
  if (!benchmark) {
    console.error(`Benchmark not found: ${benchmarkId}`);
    return null;
  }
  
  console.log(`🔍 Comparing survey ${surveyResult.surveyId} with benchmark ${benchmarkId}`);
  
  const indicatorComparisons: IndicatorComparison[] = [];
  
  // Intentar mapear cada indicador del benchmark con una pregunta de la encuesta
  for (const indicator of benchmark.indicators) {
    // Buscar pregunta compatible
    const compatibleResult = surveyResult.results.find(r => 
      indicator.compatibleQuestionTypes.includes(r.questionType as any)
    );
    
    if (compatibleResult) {
      const syntheticValue = extractValueFromResult(compatibleResult);
      
      if (syntheticValue !== null) {
        const comparison: IndicatorComparison = {
          benchmarkId: benchmark.id,
          indicatorId: indicator.id,
          indicatorName: indicator.name,
          category: indicator.category,
          unit: indicator.unit,
          syntheticValue: Math.round(syntheticValue * 100) / 100,
          benchmarkValue: indicator.value.value,
          gap: calculateGap(syntheticValue, indicator.value.value, indicator.unit),
          syntheticSampleSize: surveyResult.summary.uniqueAgents,
          benchmarkSampleSize: indicator.value.sampleSize,
          benchmarkConfidenceInterval: indicator.value.confidenceInterval
        };
        
        indicatorComparisons.push(comparison);
      }
    }
  }
  
  // Calcular resumen
  const above = indicatorComparisons.filter(c => c.gap.direction === 'above').length;
  const below = indicatorComparisons.filter(c => c.gap.direction === 'below').length;
  const match = indicatorComparisons.filter(c => c.gap.direction === 'match').length;
  const averageGap = indicatorComparisons.length > 0 
    ? indicatorComparisons.reduce((sum, c) => sum + Math.abs(c.gap.absolute), 0) / indicatorComparisons.length
    : 0;
  
  const comparison: SurveyBenchmarkComparison = {
    id: `comp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    surveyId: surveyResult.surveyId,
    surveyName: `Encuesta ${surveyResult.surveyId.slice(-6)}`,
    benchmarkId: benchmark.id,
    benchmarkName: `${benchmark.source.name} (${benchmark.source.year})`,
    comparedAt: new Date().toISOString(),
    comparisons: indicatorComparisons,
    summary: {
      totalIndicators: benchmark.indicators.length,
      matchedIndicators: indicatorComparisons.length,
      aboveBenchmark: above,
      belowBenchmark: below,
      matchBenchmark: match,
      averageGap: Math.round(averageGap * 100) / 100
    }
  };
  
  comparisons.set(comparison.id, comparison);
  console.log(`✅ Comparison created: ${comparison.id}`, comparison.summary);
  
  return comparison;
}

/**
 * Obtiene una comparación por ID
 */
export function getComparison(id: string): SurveyBenchmarkComparison | undefined {
  return comparisons.get(id);
}

/**
 * Obtiene todas las comparaciones de una encuesta
 */
export function getComparisonsForSurvey(surveyId: string): SurveyBenchmarkComparison[] {
  return Array.from(comparisons.values())
    .filter(c => c.surveyId === surveyId)
    .sort((a, b) => new Date(b.comparedAt).getTime() - new Date(a.comparedAt).getTime());
}

// ===========================================
// Helpers
// ===========================================

export function formatGap(gap: ComparisonGap): string {
  const sign = gap.direction === 'above' ? '+' : gap.direction === 'below' ? '-' : '';
  return `${sign}${Math.abs(gap.relative)}%`;
}

export function getGapColor(gap: ComparisonGap): string {
  if (gap.direction === 'match') return 'var(--success-color, #4caf50)';
  if (gap.significance === 'high') return 'var(--error-color, #f44336)';
  if (gap.significance === 'medium') return 'var(--warning-color, #ff9800)';
  return 'var(--text-secondary, #888)';
}
