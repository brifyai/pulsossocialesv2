# Protocolo de Validación Funcional - Módulo Analítico MVP

## Resumen Ejecutivo

Este documento define el protocolo completo para validar el módulo analítico de encuestas del MVP, basado en el análisis de los archivos fuente:

- `src/app/survey/analysis/surveyAnalysisService.ts` - Análisis de encuestas individuales
- `src/app/survey/analysis/comparisonService.ts` - Comparación baseline vs escenario
- `src/app/survey/surveyService.ts` - Orquestación de encuestas
- `src/app/survey/analysis/types.ts` - Tipos y contratos del sistema

**Fecha de creación:** 2026-02-04
**Versión del módulo:** 1.0.0-mvp

---

## 1. Tipos de Encuestas/Runs para Validar

### A. Encuestas de Referencia (Benchmarks Reales)
- **Fuente:** `data/benchmarks/cadem/normalized/cadem_marzo_2026_master.json`
- **Objetivo:** Comparar distribuciones generadas vs benchmarks reales
- **Validación:** El análisis detecta cuando las respuestas se desvían de lo esperado

### B. Encuestas con Diferentes Motores
| Motor | Características | Ejemplo de Preguntas |
|-------|-----------------|---------------------|
| **Legacy** | Respuestas sintéticas simples | Satisfacción con servicios digitales |
| **CADEM** | Temas políticos/económicos con opinion engine | Aprobación, dirección, optimismo |

### C. Encuestas con Escenarios
- Ejecutar baseline + escenario con **mismos agentes** (fixed sample)
- Validar que `compareSurveys()` detecta cambios reales
- Usar escenarios de diferente severidad: `low` | `medium` | `high`

### D. Encuestas de Diferentes Tamaños
| Tamaño | Agentes | Propósito |
|--------|---------|-----------|
| Pequeña | 50-100 | Validar variabilidad estadística |
| Mediana | 500 | Balance precisión/velocidad |
| Grande | 1000+ | Estabilidad estadística |

---

## 2. Escenarios Funcionales a Probar

| ID | Escenario | Señales Esperadas | Criterio de Éxito |
|----|-----------|-------------------|-------------------|
| **E1** | Consenso claro | `dominantPercentage > 70`, `polarizationLevel = low` | Detección de mayoría clara |
| **E2** | Empate técnico | `dominantPercentage ~50`, `entropy > 0.8` | Detección de polarización alta |
| **E3** | Distribución uniforme | `entropy ~1`, `concentration ~0` | Identificación de dispersión máxima |
| **E4** | Cambio de dominante | `dominantChanged = true`, `impactLevel = high` | Detección de cambio de preferencia |
| **E5** | Sin cambio | `impactLevel = none`, `impactScore ≈ 0` | Estabilidad en comparación |
| **E6** | Cambio sutil | `impactLevel = low/medium`, `dominantChanged = false` | Detección de cambios menores |

---

## 3. Métricas y Señales a Validar

### 3.1 Métricas del Análisis Individual (`SurveyAnalysis`)

#### ✅ Señales de "Buen Funcionamiento"
```typescript
// El análisis está funcionando correctamente cuando:
- averageConfidence > 0.5          // Agentes respondieron con confianza
- questionsWithDominance / total > 0.3  // Hay patrones claros
- nonResponseRate < 0.1            // Pocos "no responde"
- overallConsensusLevel !== 'low'  // Hay algún patrón identificable
```

#### ⚠️ Señales de Alerta
```typescript
// Requieren investigación:
- averageConfidence < 0.4          // Posible problema con el motor
- questionsWithPolarization > 0.5  // Mucha dispersión en respuestas
- unsupportedQuestions > 0         // Preguntas no analizadas
```

### 3.2 Métricas de Comparación (`ComparisonSummary`)

#### Señales de Impacto Real
```typescript
// El escenario está generando efecto cuando:
- questionsWithDominantChange > 0  // Cambió la preferencia mayoritaria
- averageImpactScore > 0.1         // Hay efecto medible
- mostAffectedQuestions.length > 0 // Preguntas específicas afectadas
```

#### Validación de Thresholds
| Impact Score | Impact Level Esperado |
|--------------|----------------------|
| > 0.5 | `high` |
| 0.2 - 0.5 | `medium` |
| < 0.2 | `low` |
| ≈ 0 | `none` |

### 3.3 Validación de Insights (`KeyInsight`)

#### Cada insight debe tener:
- ✅ `type` válido: `'dominance' | 'polarization' | 'scenario_impact' | 'low_confidence' | 'segment_gap'`
- ✅ `severity` apropiada: `'info' | 'warning' | 'important'`
- ✅ `description` que explica el hallazgo
- ✅ `supportingData` o `comparisonData` cuando aplica

#### Señales de Calidad:
- ✅ `insights.length > 0` (siempre hay algo relevante)
- ✅ No hay insights duplicados
- ✅ Los insights de `'scenario_impact'` solo aparecen en comparaciones

---

## 4. Protocolo de Ejecución

### Fase A: Validación de Un Solo Run (30 min)

#### Paso 1: Crear Encuesta de Prueba
Crear encuesta con 3-4 preguntas mixtas:
- 1 `single_choice` con opciones claras (ej: aprobación)
- 1 `likert_scale` (ej: satisfacción 1-5)
- 1 `single_choice` con muchas opciones (ej: prioridades)
- 1 pregunta no soportada (ej: `text`) → validar graceful degradation

#### Paso 2: Ejecutar con 100 Agentes (Legacy Engine)
```typescript
const run = await runSurvey(surveyId);
const analysis = await getSurveyAnalysis(surveyId);
```

#### Paso 3: Verificar en UI
- [ ] El análisis se muestra sin errores
- [ ] Las métricas tienen sentido (dominantPercentage entre 0-100)
- [ ] Los insights son coherentes con las distribuciones
- [ ] Las preguntas no soportadas se marcan correctamente

#### Paso 4: Exportar JSON y Validar Estructura
```bash
# Verificar campos obligatorios
jq '.analysis.summary, .analysis.globalMetrics, .analysis.questionAnalyses[0].metrics' export.json
```

**Campos obligatorios a verificar:**
```typescript
analysis.summary: {
  totalQuestions: number,
  supportedQuestions: number,
  totalResponses: number,
  overallConsensusLevel: string,
  averageConfidence: number
}

analysis.globalMetrics: {
  averageConfidence: number,
  averageEntropy: number,
  questionsWithDominance: number,
  questionsWithPolarization: number,
  nonResponseRate: number
}

analysis.questionAnalyses[0]: {
  questionId: string,
  questionText: string,
  supported: boolean,
  metrics?: DistributionMetrics,  // Solo si supported=true
  insights: KeyInsight[]
}
```

---

### Fase B: Validación de Comparación Baseline vs Escenario (45 min)

#### Paso 1: Crear Escenario
En el Scenario Builder, crear escenario:
- Nombre: "Crisis Económica"
- Categoría: `economy`
- Severidad: `high`
- Impacto: -15% en aprobación económica

#### Paso 2: Ejecutar Baseline
```typescript
const baselineRun = await runSurvey(surveyId);
// Guardar: baselineRun.id
```

#### Paso 3: Ejecutar Escenario con Mismos Agentes
```typescript
const scenarioRun = await runSurvey(surveyId, scenarioEventId, baselineRun.selectedAgentIds);
// Guardar: scenarioRun.id
```

#### Paso 4: Generar Comparación
```typescript
const comparison = await compareSurveyRuns(
  surveyId,
  baselineRun.id,
  scenarioRun.id
);
```

#### Paso 5: Verificar Comparación
- [ ] El `impactScore` es > 0 para preguntas relevantes
- [ ] Se detectan cambios en respuestas dominantes (`questionsWithDominantChange > 0`)
- [ ] Los insights de comparación describen cambios reales
- [ ] `mostAffectedQuestions` contiene las preguntas económicas

#### Paso 6: Validar Coherencia
- [ ] Si el escenario es económico, las preguntas económicas muestran más impacto
- [ ] Las preguntas sobre conectividad muestran menos impacto

---

### Fase C: Validación con Datos Reales (30 min)

#### Paso 1: Cargar Encuesta CADEM Real
```bash
npx tsx scripts/load_ab_surveys.ts
```

#### Paso 2: Ejecutar con CADEM Engine
```typescript
const run = await runSurvey(cademSurveyId);
```

#### Paso 3: Comparar con Benchmark
- [ ] Las distribuciones son similares a los datos reales (±10%)
- [ ] El análisis detecta las mismas tendencias que el benchmark

#### Paso 4: Documentar Desviaciones
Si hay diferencias >10 puntos porcentuales, documentar:
- Pregunta afectada
- Valor esperado vs observado
- Posible explicación (calibración, sample size, etc.)

---

## 5. Checklist de Validación Rápida (5 min)

Antes de declarar "listo para producción":

- [ ] Análisis de encuesta simple carga sin errores
- [ ] Métricas están en rangos razonables (0-100%, 0-1)
- [ ] Insights son legibles y coherentes
- [ ] Comparación baseline vs escenario detecta cambios
- [ ] Preguntas no soportadas se manejan graceful
- [ ] Export JSON tiene todos los campos esperados
- [ ] UI muestra datos correctamente (no `undefined`, no `NaN`)

---

## 6. Plantilla de Reporte de Validación

```markdown
# Reporte de Validación - Módulo Analítico MVP

## Información General
- **Fecha:** YYYY-MM-DD
- **Validador:** [Nombre]
- **Versión del sistema:** [Commit/Tag]

## Resumen
- Encuestas validadas: N
- Runs ejecutados: N
- Comparaciones realizadas: N
- Bugs encontrados: N
- Estado: ✅ Listo / ⚠️ Con observaciones / ❌ No listo

## Hallazgos

### ✅ Funciona Correctamente
1. [Descripción del comportamiento validado]
2. ...

### ⚠️ Requiere Atención
1. [Comportamiento inesperado pero aceptable]
2. ...

### ❌ Bloqueantes
1. [Bug crítico que impide el uso]
2. ...

## Métricas Validadas

| Métrica | Esperado | Observado | Estado |
|---------|----------|-----------|--------|
| averageConfidence | > 0.5 | X.XX | ✅/⚠️/❌ |
| questionsWithDominance | > 30% | XX% | ✅/⚠️/❌ |
| nonResponseRate | < 10% | XX% | ✅/⚠️/❌ |
| impactScore (escenario) | > 0.1 | X.XX | ✅/⚠️/❌ |

## Recomendaciones
- [Acciones sugeridas para mejorar o corregir]
```

---

## 7. Referencias

### Archivos Fuente Analizados
- `src/app/survey/analysis/surveyAnalysisService.ts` - Análisis principal
- `src/app/survey/analysis/comparisonService.ts` - Comparaciones
- `src/app/survey/surveyService.ts` - Orquestación
- `src/app/survey/analysis/types.ts` - Tipos y contratos

### Scripts de Validación Existentes
- `scripts/validation/validateSurveyAnalysis.ts`
- `scripts/validation/validateComparison.ts`
- `scripts/validation/functional/validateWithRealRuns.ts`

### Documentación Relacionada
- `docs/VALIDATION_PROTOCOL.md`
- `docs/VALIDATION_CHECKLIST.md`
- `docs/VALIDATION_EXECUTION_PLAN.md`
- `src/app/survey/analysis/MVP_DEFINITION.md`

---

## 8. Notas de Implementación

### Tipos de Pregunta Soportados (MVP)
```typescript
export const SUPPORTED_QUESTION_TYPES: SupportedQuestionType[] = [
  'single_choice',
  'likert_scale'
];
```

### Dimensiones de Segmentación
```typescript
export type SegmentDimension =
  | 'sex'
  | 'age_group'
  | 'region_code'
  | 'income_decile'
  | 'education_level';
```

### Opciones por Defecto
```typescript
export const DEFAULT_ANALYSIS_OPTIONS: AnalysisOptions = {
  segments: ['sex', 'age_group', 'region_code', 'income_decile', 'education_level'],
  significanceThreshold: 10,
  dominanceThreshold: 2,
  highPolarizationThreshold: 0.8,
  lowPolarizationThreshold: 0.3,
  lowConfidenceThreshold: 0.6,
};

export const DEFAULT_COMPARISON_OPTIONS: ComparisonOptions = {
  significanceThreshold: 5,
  smallChangeThreshold: 2,
  moderateChangeThreshold: 5,
  largeChangeThreshold: 10,
  highImpactThreshold: 0.5,
  includeUnchanged: false,
};
```

---

## Estado de Validación

- [x] VAL-1: Estructura de datos - ✅ Verificado
- [x] VAL-2: Ciclo básico - ✅ Verificado (prueba manual exitosa)
- [x] VAL-2.5: Fix de insights no visibles - ✅ Aplicado
- [ ] VAL-3: Wording de insights - Pendiente
- [ ] VAL-4: Métricas de distribución - Pendiente
- [ ] VAL-5: Comparación baseline vs escenario - Pendiente

## Cambios Aplicados (2026-02-04)

### Problema Identificado
Los insights no se mostraban en la UI porque:
1. Los umbrales eran muy restrictivos (>60% para dominancia)
2. Los insights individuales por pregunta no se agregaban a la lista global

### Solución Implementada (Opción C)
**Archivo:** `src/app/survey/analysis/surveyAnalysisService.ts`

1. **Umbrales ajustados:**
   - Dominancia: >50% (antes >60%)
   - Polarización: >20% de preguntas (antes >30%)

2. **Insights individuales agregados:**
   - Ahora los insights de cada pregunta se incluyen en `globalInsights`
   - Cada insight incluye referencia a la pregunta correspondiente

3. **Mejoras en wording:**
   - Títulos más descriptivos según cantidad de preguntas
   - Descripciones más claras con contexto de la pregunta

### Resultado Esperado
Ahora al cargar el análisis de una encuesta, deberías ver:
- Insights globales (ej: "2 preguntas con respuesta predominante clara")
- Insights individuales (ej: "Respuesta dominante clara: La opción 'De acuerdo' concentra el 58.5%... (Pregunta: ¿Qué tan preocupado está...)")

---

*Documento generado automáticamente basado en el análisis del código fuente.*
