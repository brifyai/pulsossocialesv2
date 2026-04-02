# Auditoría de Wording - Insights del Módulo Analítico

## Resumen Ejecutivo

Este documento audita los textos (wording) de los insights automáticos generados por el módulo analítico, identificando problemas de comprensión y proponiendo mejoras.

**Estado:** MVP implementado  
**Alcance:** Todos los insights generados en `questionAnalysis.ts` y `comparisonService.ts`  
**Objetivo:** Mejorar claridad y utilidad para usuarios no técnicos

---

## 1. Insights Actuales - Análisis Individual

### 1.1 Dominancia

**Template actual:**
```typescript
{
  type: 'dominance',
  severity: 'info',
  title: 'Respuesta dominante clara',
  description: `La opción "${metrics.dominantResponse}" concentra el ${metrics.dominantPercentage.toFixed(1)}% de las respuestas`
}
```

**Problemas identificados:**
- "Dominante" puede sonar técnico/estadístico
- No da contexto de qué tan dominante es (¿50% es dominante? ¿70%?)

**Propuesta mejorada:**
```typescript
{
  type: 'dominance',
  severity: metrics.dominantPercentage > 60 ? 'info' : 'warning',
  title: metrics.dominantPercentage > 60 
    ? 'Consenso claro en la respuesta'
    : 'Respuesta más popular',
  description: metrics.dominantPercentage > 60
    ? `La mayoría (${metrics.dominantPercentage.toFixed(0)}%) eligió "${metrics.dominantResponse}"`
    : `"${metrics.dominantResponse}" es la opción más elegida (${metrics.dominantPercentage.toFixed(0)}%), pero sin consenso mayoritario`
}
```

---

### 1.2 Polarización

**Template actual:**
```typescript
{
  type: 'polarization',
  severity: 'warning',
  title: 'Alta polarización',
  description: `Las respuestas están muy divididas (entropía: ${metrics.entropy.toFixed(2)})`
}
```

**Problemas identificados:**
- "Entropía" es un término técnico incomprensible para usuarios
- No explica qué significa "divididas" en términos prácticos
- No da pistas de qué opciones están en conflicto

**Propuesta mejorada:**
```typescript
{
  type: 'polarization',
  severity: 'warning',
  title: 'Opiniones muy divididas',
  description: `No hay consenso claro. Las respuestas se distribuyen entre varias opciones sin una preferencia mayoritaria.`
}
```

---

### 1.3 Low Confidence

**Template actual:**
```typescript
{
  type: 'low_confidence',
  severity: 'warning',
  title: 'Baja confianza en respuestas',
  description: `El confidence promedio es ${(metrics.averageConfidence * 100).toFixed(1)}%`
}
```

**Problemas identificados:**
- "Confidence" en inglés mezclado con español
- No explica qué implica baja confianza
- No da contexto de si es un problema o no

**Propuesta mejorada:**
```typescript
{
  type: 'low_confidence',
  severity: 'warning',
  title: 'Respuestas con baja certeza',
  description: `Los agentes respondieron con dudas (${(metrics.averageConfidence * 100).toFixed(0)}% de certeza promedio). Los resultados pueden ser menos estables.`
}
```

---

### 1.4 Segment Gap

**Template actual:**
```typescript
{
  type: 'segment_gap',
  severity: 'important',
  title: `Diferencia significativa en ${dimensionLabel}`,
  description: `El segmento "${topSegment.segmentLabel}" difiere ${Math.abs(topSegment.differenceFromTotal!).toFixed(1)} puntos del promedio`
}
```

**Problemas identificados:**
- "Difiere X puntos" es ambiguo (¿puntos porcentuales? ¿puntos de escala?)
- No explica en qué dirección es la diferencia
- No da contexto de por qué es importante

**Propuesta mejorada:**
```typescript
{
  type: 'segment_gap',
  severity: 'important',
  title: `${topSegment.segmentLabel} tiene preferencias distintas`,
  description: `En ${topSegment.segmentLabel}, ${Math.abs(topSegment.differenceFromTotal!).toFixed(0)} puntos porcentuales más eligieron "${topSegment.metrics.dominantResponse}" comparado con el promedio general`
}
```

---

## 2. Insights Actuales - Comparación Baseline vs Escenario

### 2.1 Cambio en Respuesta Dominante

**Template actual:**
```typescript
{
  type: 'scenario_impact',
  severity: 'important',
  title: 'Cambio en respuesta dominante',
  description: `La respuesta más frecuente cambió de "${baseline.metrics?.dominantResponse}" a "${scenario.metrics?.dominantResponse}"`
}
```

**Problemas identificados:**
- No cuantifica el cambio
- No da contexto de magnitud

**Propuesta mejorada:**
```typescript
{
  type: 'scenario_impact',
  severity: 'important',
  title: 'El escenario cambió la preferencia mayoritaria',
  description: `Antes predominaba "${baseline.metrics?.dominantResponse}" (${baseline.metrics?.dominantPercentage?.toFixed(0)}%), ahora "${scenario.metrics?.dominantResponse}" (${scenario.metrics?.dominantPercentage?.toFixed(0)}%)`
}
```

---

### 2.2 Mayor Cambio en Opción Específica

**Template actual:**
```typescript
{
  type: 'scenario_impact',
  severity: maxChange.magnitude === 'large' ? 'important' : 'warning',
  title: `Cambio significativo: ${maxChange.optionLabel}`,
  description: `La opción "${maxChange.optionLabel}" ${direction} ${Math.abs(maxChange.percentagePointChange).toFixed(1)} puntos porcentuales`
}
```

**Problemas identificados:**
- "Puntos porcentuales" es técnico
- No da contexto de dirección clara

**Propuesta mejorada:**
```typescript
{
  type: 'scenario_impact',
  severity: maxChange.magnitude === 'large' ? 'important' : 'warning',
  title: `${maxChange.optionLabel}: ${maxChange.direction === 'increased' ? 'más apoyo' : 'menos apoyo'}`,
  description: maxChange.direction === 'increased'
    ? `"${maxChange.optionLabel}" ganó ${Math.abs(maxChange.percentagePointChange).toFixed(0)} puntos porcentuales de apoyo`
    : `"${maxChange.optionLabel}" perdió ${Math.abs(maxChange.percentagePointChange).toFixed(0)} puntos porcentuales de apoyo`
}
```

---

### 2.3 Cambio en Polarización

**Template actual:**
```typescript
{
  type: 'scenario_impact',
  severity: 'info',
  title: `Polarización ${direction}`,
  description: `El nivel de polarización ${direction} de ${(polarizationChange.baselineValue * 100).toFixed(1)}% a ${(polarizationChange.scenarioValue * 100).toFixed(1)}%`
}
```

**Problemas identificados:**
- "Polarización" es técnico
- Porcentajes de polarización no son intuitivos

**Propuesta mejorada:**
```typescript
{
  type: 'scenario_impact',
  severity: 'info',
  title: direction === 'increased' ? 'Mayor división de opiniones' : 'Mayor consenso',
  description: direction === 'increased'
    ? `Las opiniones se dividieron más con el escenario`
    : `Hay más acuerdo entre los agentes con el escenario`
}
```

---

### 2.4 Impacto Significativo Detectado (Global)

**Template actual:**
```typescript
{
  type: 'scenario_impact',
  severity: 'important',
  title: 'Impacto significativo detectado',
  description: `${highImpactQuestions.length} preguntas muestran cambios significativos por el escenario`
}
```

**Problemas identificados:**
- Genérico, no especifica qué tipo de impacto
- No da contexto de magnitud

**Propuesta mejorada:**
```typescript
{
  type: 'scenario_impact',
  severity: 'important',
  title: 'El escenario generó cambios importantes',
  description: `${highImpactQuestions.length} de ${comparisons.length} preguntas cambiaron significativamente con el escenario aplicado`
}
```

---

### 2.5 Cambios en Preferencias (Global)

**Template actual:**
```typescript
{
  type: 'scenario_impact',
  severity: 'important',
  title: 'Cambios en preferencias',
  description: `En ${dominantChanges.length} preguntas, la respuesta más popular cambió con el escenario`
}
```

**Problemas identificados:**
- Bien, pero podría ser más específico

**Propuesta mejorada:**
```typescript
{
  type: 'scenario_impact',
  severity: 'important',
  title: 'Cambio de liderazgo en respuestas',
  description: `En ${dominantChanges.length} preguntas, la opción más elegida cambió de posición con el escenario`
}
```

---

### 2.6 Impacto Mínimo / Considerable (Global)

**Template actual:**
```typescript
// Impacto mínimo
{
  type: 'scenario_impact',
  severity: 'info',
  title: 'Impacto mínimo',
  description: 'El escenario tiene un efecto mínimo en las respuestas de la encuesta'
}

// Impacto considerable
{
  type: 'scenario_impact',
  severity: 'warning',
  title: 'Impacto considerable',
  description: 'El escenario está generando cambios significativos en las respuestas'
}
```

**Problemas identificados:**
- "Mínimo" y "considerable" son subjetivos sin números
- No dan contexto de qué esperar

**Propuesta mejorada:**
```typescript
// Impacto mínimo
{
  type: 'scenario_impact',
  severity: 'info',
  title: 'El escenario tuvo poco efecto',
  description: 'La mayoría de las respuestas se mantuvieron similares con el escenario aplicado'
}

// Impacto considerable
{
  type: 'scenario_impact',
  severity: 'warning',
  title: 'El escenario generó cambios notables',
  description: 'Varias preguntas mostraron cambios importantes en las respuestas con el escenario'
}
```

---

## 3. Glosario de Términos Técnicos

### Términos a Evitar o Explicar

| Término | Problema | Alternativa |
|---------|----------|-------------|
| Entropía | Muy técnico | "Dispersión", "división de opiniones" |
| Confidence | Inglés mezclado | "Certeza", "seguridad en la respuesta" |
| Dominante | Estadístico | "Más elegida", "preferida por la mayoría" |
| Polarización | Político/cargado | "Opiniones divididas", "sin consenso" |
| Puntos porcentuales | Técnico | "puntos de diferencia", "cambio de X a Y" |
| Ratio de dominancia | Muy técnico | "Ventaja sobre la segunda opción" |
| Concentración | Estadístico | "Agrupación de respuestas" |

---

## 4. Principios de Wording

### 4.1 Reglas Generales

1. **Evitar jerga estadística**: "Entropía" → "dispersión"
2. **Usar español puro**: "Confidence" → "certeza"
3. **Cuantificar cuando sea posible**: "alta" → "70%"
4. **Dar contexto**: No solo "cambió", sino "cambió de X a Y"
5. **Usar lenguaje de impacto**: "El escenario aumentó..." en lugar de "Hubo un cambio..."

### 4.2 Estructura Recomendada

**Título (máx 40 caracteres):**
- Acción + objeto
- Ej: "Consenso claro en la respuesta"
- Ej: "Opiniones muy divididas"

**Descripción (máx 120 caracteres):**
- Contexto + número + implicancia
- Ej: "La mayoría (65%) eligió 'Aprueba', mostrando acuerdo general"
- Ej: "No hay consenso claro, las respuestas se distribuyen entre varias opciones"

---

## 5. Prioridad de Cambios

### Alta Prioridad (Implementar ASAP)

1. **Reemplazar "entropía"** en todos los insights
2. **Reemplazar "confidence"** por "certeza"
3. **Agregar cuantificación** a insights de dominancia
4. **Mejorar descripciones** de cambios en comparaciones

### Media Prioridad (Próximo sprint)

1. **Revisar todos los títulos** para acción + objeto
2. **Agregar contexto** a insights de segmentos
3. **Mejorar wording** de insights globales

### Baja Prioridad (Futuro)

1. **Personalizar wording** por tipo de pregunta
2. **Agregar emojis** para severidad visual
3. **Crear templates** configurables por usuario

---

## 6. Ejemplos de Before/After

### Ejemplo 1: Dominancia

**Before:**
```
Título: Respuesta dominante clara
Descripción: La opción "Aprueba" concentra el 65.3% de las respuestas
```

**After:**
```
Título: Consenso claro: "Aprueba" lidera
Descripción: La mayoría (65%) eligió "Aprueba", mostrando acuerdo general
```

---

### Ejemplo 2: Comparación

**Before:**
```
Título: Cambio significativo: Aprueba
Descripción: La opción "Aprueba" aumentó 12.5 puntos porcentuales
```

**After:**
```
Título: "Aprueba" ganó apoyo con el escenario
Descripción: La opción "Aprueba" subió de 45% a 58% (+13 puntos)
```

---

### Ejemplo 3: Polarización

**Before:**
```
Título: Alta polarización
Descripción: Las respuestas están muy divididas (entropía: 0.85)
```

**After:**
```
Título: Opiniones muy divididas
Descripción: No hay consenso claro, las respuestas se distribuyen entre varias opciones
```

---

## 7. Implementación

### Archivos a Modificar

1. `src/app/survey/analysis/questionAnalysis.ts`
   - Funciones `generateDominanceInsight`, `generatePolarizationInsight`, etc.

2. `src/app/survey/analysis/comparisonService.ts`
   - Funciones `generateQuestionInsights`, `generateGlobalInsights`

### Testing

- Verificar que los nuevos textos no excedan límites de UI
- Validar que las variables se interpolen correctamente
- Asegurar que no haya undefined en las descripciones

---

## 8. Métricas de Éxito

Después de implementar los cambios:

- [ ] Usuarios entienden los insights sin explicación adicional
- [ ] Reducción de preguntas de soporte sobre "qué significa..."
- [ ] Feedback positivo en usabilidad
- [ ] No hay términos técnicos sin explicación

---

## Apéndice: Templates Consolidados

### Template Final Recomendado - Dominancia

```typescript
function generateDominanceInsight(metrics: DistributionMetrics): KeyInsight {
  const percentage = metrics.dominantPercentage;
  const isStrongConsensus = percentage > 60;
  
  return {
    type: 'dominance',
    severity: isStrongConsensus ? 'info' : 'warning',
    title: isStrongConsensus 
      ? `Consenso claro: "${metrics.dominantResponse}" lidera`
      : `"${metrics.dominantResponse}" es la más elegida`,
    description: isStrongConsensus
      ? `La mayoría (${percentage.toFixed(0)}%) eligió "${metrics.dominantResponse}", mostrando acuerdo general`
      : `"${metrics.dominantResponse}" lidera con ${percentage.toFixed(0)}%, pero sin consenso mayoritario`
  };
}
```

### Template Final Recomendado - Comparación

```typescript
function generateChangeInsight(
  baseline: QuestionAnalysis,
  scenario: QuestionAnalysis,
  change: DistributionChange
): KeyInsight {
  const direction = change.direction === 'increased' ? 'ganó' : 'perdió';
  const absChange = Math.abs(change.percentagePointChange);
  
  return {
    type: 'scenario_impact',
    severity: absChange > 10 ? 'important' : 'warning',
    title: `"${change.optionLabel}" ${direction} apoyo`,
    description: change.direction === 'increased'
      ? `"${change.optionLabel}" subió de ${change.baselinePercentage.toFixed(0)}% a ${change.scenarioPercentage.toFixed(0)}% (+${absChange.toFixed(0)} puntos)`
      : `"${change.optionLabel}" bajó de ${change.baselinePercentage.toFixed(0)}% a ${change.scenarioPercentage.toFixed(0)}% (-${absChange.toFixed(0)} puntos)`
  };
}
```
