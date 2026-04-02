He creado una propuesta de arquitectura completa para el nuevo módulo de análisis de encuestas en `src/app/survey/analysis/ARCHITECTURE_PROPOSAL.md`.

## Resumen de la Propuesta

### Estructura de Archivos
- **types.ts** - Interfaces TypeScript completas (~40 tipos definidos)
- **surveyAnalysisService.ts** - Orquestador principal
- **metrics/** - Cálculo de métricas (entropía, polarización, dispersión, Gini)
- **segmentation/** - Análisis por 8 dimensiones demográficas
- **insights/** - Generador de insights automáticos con reglas + templates
- **comparison/** - Comparación baseline vs escenario mejorada con narrativa automática

### Capacidades Clave
1. **Métricas de distribución**: Entropía, polarización, dispersión, índice de Gini, tasa de no respuesta
2. **Segmentación**: sex, ageGroup, region, incomeDecile, educationLevel, socioeconomicLevel, connectivityLevel, agentType
3. **Insights automáticos**: 7 tipos de insights con severidad y recomendaciones
4. **Comparación mejorada**: Distancia Jensen-Shannon, Cohen's d, análisis por segmento, narrativa automática

### Orden de Implementación (10-12 días)
1. Fase 1: Fundamentos (tipos + métricas)
2. Fase 2: Segmentación
3. Fase 3: Insights
4. Fase 4: Servicio principal
5. Fase 5: Comparación mejorada
6. Fase 6: Integración

### Compatibilidad
- No rompe código existente
- Extiende tipos actuales sin modificar
- API clara: `analyzeSurvey()` y `compareRuns()`
- Sin dependencias externas nuevas

El documento incluye diagramas de flujo, tablas de decisiones, riesgos identificados con mitigaciones, y ejemplos de uso completos.# Propuesta de Arquitectura: Survey Analysis Service

## Resumen Ejecutivo

Nuevo módulo analítico para enriquecer el análisis de encuestas sintéticas con métricas avanzadas, segmentación demográfica, insights automáticos y comparaciones baseline vs escenario mejoradas.

---

## 1. Estructura de Archivos Propuesta

```
src/app/survey/analysis/
├── types.ts                    # Interfaces y tipos del módulo
├── index.ts                    # API pública del módulo (exports)
├── surveyAnalysisService.ts    # Servicio principal orquestador
├── metrics/
│   ├── distributionMetrics.ts  # Métricas de distribución (entropía, polarización, etc.)
│   ├── confidenceMetrics.ts    # Métricas de confianza de respuestas
│   └── statisticalUtils.ts     # Utilidades estadísticas (varianza, desviación, etc.)
├── segmentation/
│   ├── segmentAnalyzer.ts      # Análisis por segmentos demográficos
│   ├── segmentDefinitions.ts   # Definiciones de segmentos estándar
│   └── segmentUtils.ts         # Utilidades de segmentación
├── insights/
│   ├── insightGenerator.ts     # Generador de insights automáticos
│   ├── insightTemplates.ts     # Plantillas de lenguaje natural
│   └── insightRules.ts         # Reglas de negocio para insights
├── comparison/
│   ├── baselineComparator.ts   # Comparación baseline vs escenario mejorada
│   ├── impactAnalyzer.ts       # Análisis de impacto de escenarios
│   └── trendDetector.ts        # Detección de tendencias
└── __tests__/
    ├── metrics.test.ts
    ├── segmentation.test.ts
    ├── insights.test.ts
    └── comparison.test.ts
```

---

## 2. Interfaces TypeScript

### 2.1 Tipos Base (types.ts)

```typescript
// ===========================================
// Métricas de Distribución
// ===========================================

export interface DistributionMetrics {
  // Respuesta dominante
  dominantResponse: {
    value: string | number;
    count: number;
    percentage: number;
    dominanceRatio: number; // % dominante / % segundo
  };
  
  // Entropía de Shannon (0 = concentrado, 1 = uniforme)
  entropy: number;
  
  // Polarización (0 = consenso, 1 = polarizado)
  polarization: number;
  
  // Dispersión (desviación estándar normalizada)
  dispersion: number;
  
  // Tasa de no respuesta
  nonResponseRate: number;
  
  // Confidence promedio
  averageConfidence: number;
  confidenceStdDev: number;
  
  // Concentración (índice de Gini simplificado)
  concentrationIndex: number;
  
  // Nivel de consenso
  consensusLevel: 'high' | 'medium' | 'low' | 'none';
}

// ===========================================
// Análisis por Pregunta
// ===========================================

export interface QuestionAnalysis {
  questionId: string;
  questionText: string;
  questionType: string;
  
  // Métricas de distribución
  distribution: DistributionMetrics;
  
  // Estadísticas básicas
  totalResponses: number;
  validResponses: number;
  
  // Análisis por segmentos
  segmentBreakdown: SegmentAnalysis[];
  
  // Insights generados
  insights: QuestionInsight[];
  
  // Metadata
  analyzedAt: string;
}

// ===========================================
// Segmentación
// ===========================================

export type SegmentDimension = 
  | 'sex'
  | 'ageGroup'
  | 'region'
  | 'incomeDecile'
  | 'educationLevel'
  | 'socioeconomicLevel'
  | 'connectivityLevel'
  | 'agentType';

export interface SegmentDefinition {
  dimension: SegmentDimension;
  label: string;
  description: string;
}

export interface SegmentAnalysis {
  segmentKey: string;           // ej: "sex:male"
  segmentLabel: string;         // ej: "Hombres"
  dimension: SegmentDimension;
  
  // Filtros aplicados
  filters: Record<string, string | number | undefined>;
  
  // Tamaño del segmento
  sampleSize: number;
  percentageOfTotal: number;
  
  // Distribución de respuestas en este segmento
  distribution: Record<string, { count: number; percentage: number }>;
  
  // Métricas específicas del segmento
  metrics: {
    average?: number;
    median?: number;
    mode?: string | number;
    entropy: number;
    polarization: number;
  };
  
  // Comparación con el total
  vsTotal: {
    percentagePointDiff: number;  // Diferencia en puntos porcentuales vs total
    isSignificantlyDifferent: boolean;
    effectSize: 'large' | 'medium' | 'small' | 'negligible';
  };
}

// ===========================================
// Insights
// ===========================================

export type InsightType = 
  | 'dominant_response'
  | 'polarization_warning'
  | 'segment_difference'
  | 'low_confidence'
  | 'consensus_detected'
  | 'outlier_segment'
  | 'trend_suggestion';

export type InsightSeverity = 'info' | 'warning' | 'critical';

export interface QuestionInsight {
  id: string;
  type: InsightType;
  severity: InsightSeverity;
  title: string;
  description: string;
  
  // Datos que respaldan el insight
  supportingData: {
    metric: string;
    value: number;
    threshold?: number;
    comparison?: string;
  };
  
  // Segmentos relacionados (si aplica)
  relatedSegments?: string[];
  
  // Recomendación accionable
  recommendation?: string;
}

export interface SurveyInsights {
  summary: {
    totalInsights: number;
    bySeverity: Record<InsightSeverity, number>;
    byType: Record<InsightType, number>;
  };
  
  // Insights globales de la encuesta
  globalInsights: QuestionInsight[];
  
  // Insights por pregunta
  questionInsights: Record<string, QuestionInsight[]>;
  
  // Recomendaciones prioritarias
  topRecommendations: string[];
}

// ===========================================
// Análisis Completo de Encuesta
// ===========================================

export interface SurveyAnalysis {
  // Identificación
  surveyId: string;
  runId: string;
  analysisId: string;
  
  // Timestamp
  analyzedAt: string;
  
  // Resumen ejecutivo
  summary: {
    totalQuestions: number;
    totalResponses: number;
    uniqueAgents: number;
    overallConfidence: number;
    consensusLevel: 'high' | 'medium' | 'low' | 'mixed';
  };
  
  // Análisis por pregunta
  questionAnalyses: QuestionAnalysis[];
  
  // Insights generados
  insights: SurveyInsights;
  
  // Metadata del análisis
  metadata: {
    engineMode: 'legacy' | 'cadem';
    engineVersion: string;
    segmentsAnalyzed: SegmentDimension[];
    analysisDurationMs: number;
  };
}

// ===========================================
// Comparación Mejorada Baseline vs Escenario
// ===========================================

export interface EnhancedComparison {
  // Identificación
  comparisonId: string;
  surveyId: string;
  baselineRunId: string;
  scenarioRunId: string;
  
  // Metadata de escenarios
  baseline: {
    name: string;
    executedAt: string;
    totalAgents: number;
  };
  
  scenario: {
    name: string;
    executedAt: string;
    scenarioEventId?: string;
    scenarioName?: string;
    scenarioCategory?: string;
    totalAgents: number;
  };
  
  // Resumen de impacto
  impactSummary: {
    overallImpactScore: number;  // 0-1
    impactLevel: 'critical' | 'high' | 'medium' | 'low' | 'none';
    questionsWithSignificantChange: number;
    questionsWithModerateChange: number;
    questionsWithMinorChange: number;
    questionsUnchanged: number;
  };
  
  // Comparaciones por pregunta
  questionComparisons: EnhancedQuestionComparison[];
  
  // Análisis de impacto por segmento
  segmentImpactAnalysis: SegmentImpact[];
  
  // Insights de la comparación
  comparisonInsights: ComparisonInsight[];
  
  // Narrativa automática
  narrative: {
    executiveSummary: string;
    keyFindings: string[];
    recommendations: string[];
  };
}

export interface EnhancedQuestionComparison {
  questionId: string;
  questionText: string;
  questionType: string;
  
  // Distribuciones
  baseline: QuestionDistributionSnapshot;
  scenario: QuestionDistributionSnapshot;
  
  // Métricas de cambio
  change: {
    distributionShift: number;  // Distancia de Jensen-Shannon
    maxPercentagePointChange: number;
    averagePercentagePointChange: number;
    statisticalSignificance: number;  // p-value aproximado
    effectSize: 'large' | 'medium' | 'small' | 'negligible';
  };
  
  // Impacto
  impact: {
    level: 'critical' | 'high' | 'medium' | 'low' | 'none';
    score: number;  // 0-1
    direction: 'positive' | 'negative' | 'neutral' | 'mixed';
    description: string;
  };
  
  // Cambios por opción
  optionChanges: OptionChange[];
  
  // Cambios por segmento
  segmentChanges: SegmentChange[];
}

export interface QuestionDistributionSnapshot {
  totalResponses: number;
  distribution: Record<string, { count: number; percentage: number; label: string }>;
  average?: number;
  median?: number;
  entropy: number;
  polarization: number;
}

export interface OptionChange {
  optionValue: string;
  optionLabel: string;
  baseline: { count: number; percentage: number };
  scenario: { count: number; percentage: number };
  change: {
    countDelta: number;
    percentagePointDelta: number;
    relativeChange: number;  // % de cambio relativo
  };
  significance: 'high' | 'medium' | 'low';
}

export interface SegmentChange {
  segmentKey: string;
  segmentLabel: string;
  baselineMetrics: { average?: number; entropy: number };
  scenarioMetrics: { average?: number; entropy: number };
  impactScore: number;
}

export interface SegmentImpact {
  segmentKey: string;
  segmentLabel: string;
  dimension: SegmentDimension;
  
  // Impacto agregado
  averageImpactScore: number;
  impactLevel: 'critical' | 'high' | 'medium' | 'low' | 'none';
  
  // Preguntas más afectadas en este segmento
  mostAffectedQuestions: {
    questionId: string;
    questionText: string;
    impactScore: number;
  }[];
  
  // Narrativa específica del segmento
  narrative: string;
}

export interface ComparisonInsight {
  id: string;
  type: 'significant_shift' | 'segment_disparity' | 'consensus_change' | 'polarization_change' | 'unexpected_result';
  severity: 'info' | 'warning' | 'critical';
  title: string;
  description: string;
  affectedQuestions: string[];
  affectedSegments?: string[];
  recommendation?: string;
}

// ===========================================
// Opciones de Análisis
// ===========================================

export interface AnalysisOptions {
  // Segmentos a analizar (default: todos)
  segments?: SegmentDimension[];
  
  // Umbral para considerar diferencias significativas
  significanceThreshold?: number;  // default: 0.05
  
  // Umbral para efecto grande (puntos porcentuales)
  largeEffectThreshold?: number;  // default: 10
  
  // Generar insights automáticos
  generateInsights?: boolean;  // default: true
  
  // Incluir análisis de tendencias
  includeTrendAnalysis?: boolean;  // default: false
  
  // Comparar con benchmarks si están disponibles
  compareWithBenchmarks?: boolean;  // default: false
}

export interface ComparisonOptions extends AnalysisOptions {
  // Peso del escenario en el análisis (para análisis ponderado)
  scenarioWeight?: number;  // default: 1.0
  
  // Analizar solo preguntas específicas
  questionFilter?: string[];
  
  // Incluir análisis de sensibilidad
  includeSensitivityAnalysis?: boolean;  // default: false
}
```

---

## 3. Flujo de Datos Recomendado

```
┌─────────────────────────────────────────────────────────────────┐
│                        INPUTS                                   │
├─────────────────────────────────────────────────────────────────┤
│  SurveyRun + SurveyResult + AgentSnapshots (demográficos)      │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│              SurveyAnalysisService (orquestador)                │
│  - Coordina el pipeline de análisis                             │
│  - Maneja opciones y configuración                              │
│  - Ensambla resultados finales                                  │
└─────────────────────────────────────────────────────────────────┘
                              │
          ┌───────────────────┼───────────────────┐
          ▼                   ▼                   ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│  metrics/       │  │  segmentation/  │  │  insights/      │
│  distribution   │  │  segmentAnalyzer│  │  insightGenerator│
│  confidence     │  │  segmentDefs    │  │  templates      │
│  statistical    │  │  segmentUtils   │  │  rules          │
└─────────────────┘  └─────────────────┘  └─────────────────┘
          │                   │                   │
          └───────────────────┼───────────────────┘
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│              QuestionAnalysis (por cada pregunta)               │
│  - Métricas de distribución                                     │
│  - Breakdown por segmentos                                      │
│  - Insights específicos                                         │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│              SurveyAnalysis (resultado final)                   │
│  - Resumen ejecutivo                                            │
│  - Análisis de todas las preguntas                              │
│  - Insights globales                                            │
│  - Metadata del análisis                                        │
└─────────────────────────────────────────────────────────────────┘
```

### Flujo de Comparación Baseline vs Escenario

```
┌─────────────────────────────────────────────────────────────────┐
│  BaselineRun + BaselineResult                                   │
│  ScenarioRun + ScenarioResult                                   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│         BaselineComparator (orquestador de comparación)         │
└─────────────────────────────────────────────────────────────────┘
                              │
          ┌───────────────────┼───────────────────┐
          ▼                   ▼                   ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│  Análisis       │  │  ImpactAnalyzer │  │  TrendDetector  │
│  individual     │  │  (por segmento) │  │  (si hay hist)  │
│  por pregunta   │  │                 │  │                 │
└─────────────────┘  └─────────────────┘  └─────────────────┘
          │                   │                   │
          └───────────────────┼───────────────────┘
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│              EnhancedComparison (resultado final)               │
│  - Comparaciones detalladas por pregunta                        │
│  - Análisis de impacto por segmento                             │
│  - Narrativa automática                                         │
│  - Recomendaciones accionables                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 4. Orden Recomendado de Implementación

### Fase 1: Fundamentos (1-2 días)
1. **types.ts** - Definir todas las interfaces
2. **metrics/statisticalUtils.ts** - Funciones estadísticas base
3. **metrics/distributionMetrics.ts** - Cálculo de métricas de distribución
4. **__tests__/metrics.test.ts** - Tests de métricas

### Fase 2: Segmentación (1-2 días)
5. **segmentation/segmentDefinitions.ts** - Definiciones de segmentos
6. **segmentation/segmentUtils.ts** - Utilidades de segmentación
7. **segmentation/segmentAnalyzer.ts** - Análisis por segmentos
8. **__tests__/segmentation.test.ts** - Tests de segmentación

### Fase 3: Insights (1-2 días)
9. **insights/insightTemplates.ts** - Plantillas de lenguaje natural
10. **insights/insightRules.ts** - Reglas de negocio
11. **insights/insightGenerator.ts** - Generador de insights
12. **__tests__/insights.test.ts** - Tests de insights

### Fase 4: Servicio Principal (1 día)
13. **surveyAnalysisService.ts** - Orquestador principal
14. **index.ts** - API pública

### Fase 5: Comparación Mejorada (2-3 días)
15. **comparison/impactAnalyzer.ts** - Análisis de impacto
16. **comparison/baselineComparator.ts** - Comparador mejorado
17. **comparison/trendDetector.ts** - Detección de tendencias (opcional)
18. **__tests__/comparison.test.ts** - Tests de comparación

### Fase 6: Integración (1 día)
19. Integrar con `surveyService.ts` existente
20. Actualizar UI para mostrar nuevos análisis
21. Tests de integración

---

## 5. Riesgos y Decisiones de Diseño

### 5.1 Decisiones de Diseño Clave

| Decisión | Opción Elegida | Justificación |
|----------|----------------|---------------|
| **Arquitectura** | Modular por dominio | Facilita testing, mantenimiento y extensibilidad |
| **Cálculo de métricas** | Lazy evaluation | Solo calcular lo necesario según opciones |
| **Segmentación** | Pre-definida + extensible | Balance entre consistencia y flexibilidad |
| **Insights** | Reglas + templates | Controlable y testeable vs. ML |
| **Comparación** | Métricas estadísticas robustas | Evitar falsos positivos en cambios |

### 5.2 Riesgos Identificados

| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|--------------|---------|------------|
| **Performance con grandes muestras** | Media | Alto | Implementar caching y lazy evaluation |
| **Falsos positivos en insights** | Media | Medio | Umbral conservador + validación humana |
| **Complejidad de segmentación** | Baja | Medio | Segmentos pre-definidos, no custom |
| **Breaking changes en tipos** | Baja | Alto | Extender tipos existentes, no modificar |
| **Duplicación con surveyService** | Media | Medio | Clarificar responsabilidades en docs |

### 5.3 Compatibilidad con Código Existente

```typescript
// El nuevo servicio extiende, no reemplaza
// surveyService.ts mantiene su API actual

// Nuevo servicio se usa así:
import { analyzeSurvey, compareRuns } from './analysis';

// Análisis de una ejecución
const analysis = await analyzeSurvey(surveyRun, surveyResult, {
  segments: ['sex', 'ageGroup', 'region'],
  generateInsights: true
});

// Comparación mejorada
const comparison = await compareRuns(baselineRun, baselineResult, scenarioRun, scenarioResult, {
  significanceThreshold: 0.05,
  includeSensitivityAnalysis: true
});
```

### 5.4 Métricas Estadísticas Seleccionadas

| Métrica | Fórmula/Implementación | Uso |
|---------|------------------------|-----|
| **Entropía** | -Σ(pᵢ × log₂(pᵢ)) / log₂(n) | Uniformidad de distribución |
| **Polarización** | 1 - (entropía / entropía máxima) | Nivel de polarización |
| **Dispersión** | σ / rango | Variabilidad normalizada |
| **Índice de Gini** | ΣΣ\|xᵢ - xⱼ\| / (2n²μ) | Concentración de respuestas |
| **Distancia JS** | √[D(p\|m) + D(q\|m)]/2 | Diferencia entre distribuciones |
| **Cohen's d** | (μ₁ - μ₂) / σ_pooled | Tamaño de efecto |

---

## 6. API Pública Propuesta (index.ts)

```typescript
// ===========================================
// Exports principales
// ===========================================

export {
  // Servicios
  analyzeSurvey,
  analyzeQuestion,
  compareRuns,
  generateInsights,
  
  // Utilidades
  calculateDistributionMetrics,
  calculateSegmentAnalysis,
  
  // Tipos
  type SurveyAnalysis,
  type QuestionAnalysis,
  type DistributionMetrics,
  type SegmentAnalysis,
  type QuestionInsight,
  type SurveyInsights,
  type EnhancedComparison,
  type EnhancedQuestionComparison,
  type AnalysisOptions,
  type ComparisonOptions,
  type SegmentDimension,
  type InsightType,
  type InsightSeverity,
} from './types';

// ===========================================
// Constantes
// ===========================================

export const DEFAULT_ANALYSIS_OPTIONS: AnalysisOptions = {
  segments: ['sex', 'ageGroup', 'region', 'incomeDecile', 'educationLevel'],
  significanceThreshold: 0.05,
  largeEffectThreshold: 10,
  generateInsights: true,
  includeTrendAnalysis: false,
  compareWithBenchmarks: false,
};

export const DEFAULT_COMPARISON_OPTIONS: ComparisonOptions = {
  ...DEFAULT_ANALYSIS_OPTIONS,
  scenarioWeight: 1.0,
  includeSensitivityAnalysis: false,
};

// ===========================================
// Segmentos disponibles
// ===========================================

export const AVAILABLE_SEGMENTS: SegmentDefinition[] = [
  { dimension: 'sex', label: 'Sexo', description: 'Distribución por género' },
  { dimension: 'ageGroup', label: 'Grupo Etario', description: 'Distribución por edad' },
  { dimension: 'region', label: 'Región', description: 'Distribución geográfica' },
  { dimension: 'incomeDecile', label: 'Decil de Ingreso', description: 'Nivel socioeconómico' },
  { dimension: 'educationLevel', label: 'Nivel Educacional', description: 'Escolaridad' },
  { dimension: 'socioeconomicLevel', label: 'Nivel Socioeconómico', description: 'Clasificación ABC1-E' },
  { dimension: 'connectivityLevel', label: 'Conectividad', description: 'Nivel de acceso digital' },
  { dimension: 'agentType', label: 'Tipo de Agente', description: 'Perfil demográfico' },
];
```

---

## 7. Ejemplos de Uso

### Ejemplo 1: Análisis Básico

```typescript
import { analyzeSurvey } from './analysis';

const analysis = await analyzeSurvey(surveyRun, surveyResult, {
  segments: ['sex', 'ageGroup'],
  generateInsights: true
});

console.log(`Nivel de consenso: ${analysis.summary.consensusLevel}`);
console.log(`Total de insights: ${analysis.insights.summary.totalInsights}`);

// Análisis de primera pregunta
const q1 = analysis.questionAnalyses[0];
console.log(`Entropía: ${q1.distribution.entropy}`);
console.log(`Polarización: ${q1.distribution.polarization}`);
```

### Ejemplo 2: Comparación Baseline vs Escenario

```typescript
import { compareRuns } from './analysis';

const comparison = await compareRuns(
  baselineRun, baselineResult,
  scenarioRun, scenarioResult,
  { includeSensitivityAnalysis: true }
);

console.log(`Impacto general: ${comparison.impactSummary.impactLevel}`);
console.log(`Score de impacto: ${comparison.impactSummary.overallImpactScore}`);

// Narrativa automática
console.log(comparison.narrative.executiveSummary);
```

### Ejemplo 3: Análisis por Segmento

```typescript
import { calculateSegmentAnalysis } from './analysis';

const segmentAnalysis = await calculateSegmentAnalysis(
  surveyRun, surveyResult,
  'ageGroup'  // dimensión
);

// Ver diferencias significativas
const significant = segmentAnalysis.filter(
  s => s.vsTotal.isSignificantlyDifferent
);
```

---

## 8. Próximos Pasos

1. **Revisar y aprobar** esta propuesta de arquitectura
2. **Implementar Fase 1** (fundamentos)
3. **Validar** con datos reales de encuestas existentes
4. **Iterar** según feedback
5. **Continuar** con fases siguientes

---

*Documento generado para Pulsos Sociales - Módulo de Análisis de Encuestas v1.0*
