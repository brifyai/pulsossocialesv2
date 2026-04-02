# Protocolo de Validación Funcional - Módulo Analítico

## Resumen Ejecutivo

Este documento define un protocolo práctico y ejecutable para validar el módulo analítico de encuestas con datos reales del sistema.

**Estado del módulo:** MVP implementado y testeado (80 tests pasando)  
**Objetivo:** Validar utilidad real con encuestas ejecutadas en producción/staging  
**Alcance:** Fase 1 - Validación manual con inspección humana

---

## 1. Tipos de Encuestas para Validar

### 1.1 Encuestas Recomendadas (por prioridad)

| Prioridad | Tipo | Motivación | Qué validar |
|-----------|------|------------|-------------|
| **P1** | CADEM con ≥5 preguntas | Motor más complejo, más edge cases | Que el análisis no se rompe con respuestas mapeadas |
| **P2** | Legacy con single_choice | Caso base, más simple | Que las métricas de distribución son coherentes |
| **P3** | Con escenario aplicado | Validar comparaciones | Que `compareSurveys()` produce resultados razonables |
| **P4** | Likert scale pura | Tipo diferente de distribución | Que las métricas de escala funcionan correctamente |

### 1.2 Criterios de Selección de Runs

**Ideal para validación:**
- ✅ Run completado (status = 'completed')
- ✅ ≥100 respuestas (muestra representativa)
- ✅ ≥3 preguntas soportadas (single_choice o likert)
- ✅ Con `selectedAgentIds` disponible (para trazabilidad)
- ✅ Ejecutado en últimos 30 días (datos frescos)

**Evitar para validación inicial:**
- ❌ Runs con <20 respuestas (muestra muy pequeña)
- ❌ Runs con errores o incompletos
- ❌ Encuestas con solo texto libre (no soportadas en MVP)
- ❌ Runs muy antiguos (>90 días, posible inconsistencia de schema)

---

## 2. Escenarios Funcionales a Probar

### 2.1 Escenario A: Análisis Individual de Run

**Objetivo:** Validar que `analyzeSurveyResult()` produce resultados coherentes.

**Pasos:**
1. Seleccionar un runId de encuesta CADEM
2. Cargar el run y sus resultados
3. Ejecutar `analyzeSurveyResult(result, run)`
4. Inspeccionar manualmente el output

**Señales de éxito:**
- `summary.supportedQuestions` > 0
- `summary.averageConfidence` entre 0.3 y 0.9 (valores extremos son sospechosos)
- `globalInsights` no está vacío
- `questionAnalyses` tiene entradas para cada pregunta soportada
- Métricas de distribución (dominantPercentage, entropy) están en rangos razonables

**Señales de alarma:**
- `averageConfidence` = 0 o 1 exacto (demasiado perfecto)
- `entropy` > 1 o < 0 (error de cálculo)
- `dominantPercentage` > 100% (bug obvio)
- `supportedQuestions` = 0 cuando hay preguntas single_choice/likert

### 2.2 Escenario B: Comparación Baseline vs Escenario

**Objetivo:** Validar que `compareSurveys()` detecta cambios reales.

**Prerrequisito:** Tener un par de runs del mismo survey (baseline + escenario).

**Pasos:**
1. Identificar surveyId con al menos 2 runs
2. Seleccionar baselineRunId (sin escenario) y scenarioRunId (con escenario)
3. Ejecutar `compareSurveys(baselineAnalysis, scenarioAnalysis)`
4. Inspeccionar el `ComparisonSummary`

**Señales de éxito:**
- `totalQuestionsCompared` = número esperado de preguntas
- `questionsWithSignificantChange` > 0 (si el escenario tiene impacto)
- `averageImpactScore` entre 0.1 y 0.8
- `mostAffectedQuestions` tiene sentido temáticamente
- `globalInsights` mencionan el escenario

**Señales de alarma:**
- `averageImpactScore` = 0 para escenarios que deberían tener impacto
- `questionsWithDominantChange` = 0 cuando sí hubo cambios visibles
- `impactScore` muy alto (>0.9) para cambios mínimos
- `impactScore` muy bajo (<0.1) para cambios obvios

### 2.3 Escenario C: Análisis de Preguntas Específicas

**Objetivo:** Validar que el análisis por pregunta es útil.

**Pasos:**
1. Seleccionar una pregunta específica del análisis
2. Revisar `QuestionAnalysis` completo
3. Comparar con la distribución real de respuestas

**Qué revisar por pregunta:**
- `metrics.dominantResponse` coincide con la opción más votada
- `metrics.dominantPercentage` es correcto (count/total * 100)
- `metrics.entropy` tiene sentido para la dispersión observada
- `insights` son relevantes para esa pregunta
- `likertStats` (si aplica) calculan average/median correctamente

---

## 3. Métricas y Señales a Observar

### 3.1 Métricas Globales (SurveyAnalysis.summary)

| Métrica | Rango Esperado | Rango Sospechoso | Acción si sospechoso |
|---------|---------------|------------------|---------------------|
| `averageConfidence` | 0.4 - 0.8 | <0.2 o >0.95 | Revisar cálculo de confidence |
| `overallConsensusLevel` | 'medium'/'high' | 'low' en encuestas con respuestas claras | Revisar thresholds |
| `supportedQuestions` / `totalQuestions` | >70% | <50% | Verificar tipos de pregunta |
| `totalResponses` | Coincide con sampleSize | Diferencia >20% | Revisar agregación |

### 3.2 Métricas por Pregunta (QuestionAnalysis.metrics)

| Métrica | Rango Esperado | Rango Sospechoso | Acción si sospechoso |
|---------|---------------|------------------|---------------------|
| `dominantPercentage` | 20% - 80% | >95% o <15% | Verificar distribución real |
| `entropy` | 0.3 - 0.9 | >1.0 o <0 | Revisar fórmula de entropía |
| `polarization` | 0.1 - 0.7 | >0.9 o <0 | Revisar cálculo de polarización |
| `dominanceRatio` | 1.0 - 5.0 | >10 o <1 | Verificar segunda opción |
| `nonResponseRate` | 0% - 15% | >30% | Revisar mapeo de "no responde" |

### 3.3 Métricas de Comparación (ComparisonSummary)

| Métrica | Rango Esperado | Rango Sospechoso | Acción si sospechoso |
|---------|---------------|------------------|---------------------|
| `averageImpactScore` | 0.1 - 0.6 | >0.8 o <0.05 | Revisar pesos del impact score |
| `questionsWithSignificantChange` | 10%-50% del total | 0% o >80% | Verificar thresholds de significancia |
| `questionsWithDominantChange` | 0%-30% del total | >50% | Revisar si cambios son reales |

---

## 4. Salidas Potencialmente Engañosas

### 4.1 Falsos Positivos (El sistema dice "problema" pero no lo hay)

| Síntoma | Causa Probable | Mitigación |
|---------|---------------|------------|
| "Alta polarización" en preguntas con 2 opciones | Entropía máxima en binario es normal | Ignorar alerta si solo hay 2 opciones |
| "Baja confianza" en respuestas CADEM | Confidence del motor CADEM es diferente | Comparar con confidence real de respuestas |
| "Cambio significativo" de 2-3 puntos % | Threshold de significancia muy bajo | Ajustar `significanceThreshold` a 5-10% |
| "Impacto alto" en preguntas de control | Peso de dominantChange muy alto | Revisar pesos en `calculateQuestionImpact` |

### 4.2 Falsos Negativos (El sistema no detecta problemas reales)

| Síntoma | Causa Probable | Mitigación |
|---------|---------------|------------|
| No detecta cambio de 15 puntos % | Threshold de significancia muy alto | Bajar `significanceThreshold` |
| "Sin impacto" en escenarios obvios | Peso de métricas vs distribución | Revisar fórmula de impact score |
| No detecta polarización real | Threshold de entropía mal calibrado | Ajustar `highPolarizationThreshold` |
| Ignora cambios en Likert | Comparación solo mira distribución | Agregar comparación de average/median |

### 4.3 Problemas de Wording

| Problema | Ejemplo Actual | Mejor Wording |
|----------|---------------|---------------|
| Demasiado técnico | "Entropía de Shannon" | "Dispersión de respuestas" |
| Ambiguo | "Alta dispersión" | "Respuestas muy divididas" |
| Sin contexto | "Confidence 0.65" | "Confianza media (65%)" |
| Genérico | "Impacto detectado" | "El escenario aumentó la aprobación en 12 puntos" |

---

## 5. Documentación de Resultados

### 5.1 Template de Reporte de Validación

```markdown
# Reporte de Validación Funcional - Run [runId]

## Metadata
- **Fecha:** [YYYY-MM-DD]
- **Validador:** [Nombre]
- **Run ID:** [runId]
- **Survey ID:** [surveyId]
- **Tipo:** [CADEM/Legacy]
- **Sample Size:** [N]

## Resumen Ejecutivo
- **Estado:** [✅ Válido / ⚠️ Revisar / ❌ Problema]
- **Preguntas Analizadas:** [X/Y]
- **Confidence Promedio:** [X%]
- **Hallazgos Clave:** [1-2 líneas]

## Métricas Globales
| Métrica | Valor | Esperado | Estado |
|---------|-------|----------|--------|
| averageConfidence | 0.65 | 0.4-0.8 | ✅ |
| overallConsensusLevel | 'medium' | 'medium'/'high' | ✅ |
| ... | ... | ... | ... |

## Análisis por Pregunta
### Pregunta 1: [Texto corto]
- **Tipo:** [single_choice/likert]
- **Dominant:** [Opción] ([X]%)
- **Entropy:** [X.X]
- **Verificación Manual:** [Coincide/No coincide con lo esperado]
- **Observaciones:** [Opcional]

## Insights Generados
| Tipo | Severidad | Título | ¿Útil? | Observaciones |
|------|-----------|--------|--------|---------------|
| dominance | info | ... | ✅/❌ | ... |

## Problemas Encontrados
1. **[Severidad]** [Descripción] → [Acción recomendada]

## Recomendaciones
- [Acción 1]
- [Acción 2]
```

### 5.2 Checklist de Validación Rápida

**Pre-validación:**
- [ ] Run existe y está completo
- [ ] Resultados están disponibles
- [ ] Hay al menos 1 pregunta soportada

**Validación básica:**
- [ ] `analyzeSurveyResult()` no lanza error
- [ ] `summary.totalQuestions` > 0
- [ ] `summary.supportedQuestions` > 0
- [ ] `globalInsights` tiene al menos 1 insight
- [ ] `questionAnalyses` tiene entradas

**Validación de coherencia:**
- [ ] `averageConfidence` está en rango razonable (0.2-0.9)
- [ ] `entropy` está en rango válido (0-1)
- [ ] `dominantPercentage` suma con otras opciones ≈ 100%
- [ ] `totalResponses` coincide con sampleSize

**Validación de utilidad:**
- [ ] Insights son comprensibles sin conocimiento técnico
- [ ] Preguntas más polarizadas tienen sentido
- [ ] Preguntas con más consenso tienen sentido
- [ ] El resumen ejecutivo describe bien la encuesta

---

## 6. Herramientas Sugeridas

### 6.1 Script de Validación Rápida (VAL-1)

Crear un script en `scripts/validation/validateSurveyAnalysis.ts` que:
1. Reciba un runId como parámetro
2. Cargue el run y sus resultados
3. Ejecute el análisis
4. Imprima un resumen formateado
5. Marque métricas sospechosas

### 6.2 Utilidad de Comparación (VAL-2)

Crear un script en `scripts/validation/validateComparison.ts` que:
1. Reciba baselineRunId y scenarioRunId
2. Ejecute la comparación
3. Muestre las preguntas más afectadas
4. Permita inspeccionar cambios específicos

### 6.3 Auditoría de Wording (VAL-3)

Crear un documento que:
1. Liste todos los templates de insight
2. Muestre ejemplos reales de cada uno
3. Proponga mejoras de wording
4. Priorice cambios por impacto/beneficio

---

## 7. Próximos Pasos

1. **Ejecutar validación manual** con 3-5 runs reales
2. **Documentar hallazgos** usando el template
3. **Ajustar thresholds** si es necesario
4. **Implementar scripts** de validación automatizada
5. **Revisar wording** de insights

---

## Apéndice: Referencias Rápidas

### Funciones Clave
- `analyzeSurveyResult(result, run)` → `SurveyAnalysis`
- `compareSurveys(baseline, scenario)` → `ComparisonSummary`
- `getSurveyAnalysisByRun(runId)` → `SurveyAnalysis | undefined`

### Tipos Principales
- `SurveyAnalysis` - Análisis completo de un run
- `QuestionAnalysis` - Análisis de una pregunta
- `ComparisonSummary` - Comparación baseline vs escenario
- `KeyInsight` - Insight automático

### Thresholds Configurables
- `significanceThreshold`: 5 (puntos porcentuales)
- `highImpactThreshold`: 0.5 (score 0-1)
- `highPolarizationThreshold`: 0.8 (entropía normalizada)
- `lowConfidenceThreshold`: 0.6 (confidence 0-1)
