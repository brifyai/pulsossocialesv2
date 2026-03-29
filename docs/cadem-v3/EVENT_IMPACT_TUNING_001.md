# Event Impact Tuning 001

**Fecha:** 29 de marzo de 2026  
**Estado:** 🟡 EN ANÁLISIS  
**Objetivo:** Refinar el comportamiento de escenarios negativos en `eventImpact.ts`

---

## Contexto

Tras la validación del Scenario Builder MVP (Run 002), se identificó que el sistema funciona correctamente para escenarios positivos pero presenta comportamientos inesperados con escenarios negativos.

---

## Hallazgos de Validación

### Escenarios que funcionaron bien ✅

| Escenario | Sentimiento | Intensidad | Resultado |
|-----------|-------------|------------|-----------|
| Subsidio al Transporte | +0.25 | 0.6 | ✅ Impacto positivo coherente |
| Endurecimiento Migratorio | -0.50 | 0.7 | ✅ Impacto negativo en aprobación (-5%) |

### Escenarios con problemas ⚠️

| Escenario | Sentimiento | Intensidad | Problema |
|-----------|-------------|------------|----------|
| Crisis Económica | -0.75 | 0.9 | ❌ No generó pesimismo esperado |

**Comportamientos inesperados detectados:**

1. **q_direction mejora en escenarios negativos**
   - Crisis Económica: q_direction mejoró +14% (debería empeorar)
   - Endurecimiento Migratorio: q_direction mejoró +14% (inesperado)

2. **Temas económicos no responden a eventos económicos negativos**
   - Crisis Económica (intensity 0.9): q_economy_national solo -1%, q_economy_personal +1%
   - Debería haber mostrado deterioro significativo

3. **Intensidad alta no genera impacto proporcional**
   - Intensity 0.9 debería producir cambios >10% en métricas relevantes
   - Cambios observados: <3% en promedio

---

## Hipótesis Priorizadas

### H1: Inversión de signo en el cálculo de impacto (ALTA PRIORIDAD)

**Descripción:** El algoritmo podría estar invirtiendo el signo del sentimiento al aplicar el impacto, o el sentimiento negativo podría estar siendo tratado como positivo en ciertos casos.

**Evidencia:**
- Todos los escenarios muestran mejora en q_direction
- Crisis Económica no produce pesimismo

**Verificación propuesta:**
```typescript
// Revisar en eventImpact.ts
// ¿El sentimiento negativo se está aplicando correctamente?
// ¿Hay alguna normalización o abs() que invierta el signo?
```

---

### H2: Atenuación excesiva de la intensidad (ALTA PRIORIDAD)

**Descripción:** La intensidad 0.9 podría estar siendo atenuada por factores de moderación o normalización que reducen drásticamente el impacto efectivo.

**Evidencia:**
- Intensity 0.9 produce cambios <3%
- Debería producir cambios 10-20%

**Verificación propuesta:**
```typescript
// Revisar fórmula de cálculo de impacto
// ¿Hay multiplicadores o divisores que atenúen?
// ¿El impacto final = intensity * sentiment * factor?
```

---

### H3: Mapeo incorrecto de categorías a topics (MEDIA PRIORIDAD)

**Descripción:** Los eventos de categoría "economy" podrían no estar mapeando correctamente a las preguntas económicas (q_economy_national, q_economy_personal).

**Evidencia:**
- Crisis Económica no afecta significativamente preguntas económicas
- Subsidio al Transporte (también economy) sí afecta economía

**Verificación propuesta:**
```typescript
// Revisar mapeo de categorías a topics
// ¿"economy" mapea a "economic_situation"?
// ¿Las preguntas escuchan el topic correcto?
```

---

### H4: q_direction no está conectada al sistema de eventos (MEDIA PRIORIDAD)

**Descripción:** La pregunta de dirección del país (q_direction) podría no estar siendo afectada por los eventos, o podría tener una lógica independiente que ignora el impacto del escenario.

**Evidencia:**
- q_direction mejora consistentemente en todos los escenarios
- Parece no responder al sentimiento del evento

**Verificación propuesta:**
```typescript
// Revisar si q_direction está en la lista de preguntas afectadas por eventos
// ¿Tiene su propia lógica de baseline?
```

---

### H5: Combinación de shifts produce resultados inesperados (BAJA PRIORIDAD)

**Descripción:** Cuando hay múltiples factores de impacto (evento + baseline + estado del agente), la combinación podría estar anulando o invirtiendo el efecto esperado.

**Evidencia:**
- Resultados inconsistentes entre escenarios similares

**Verificación propuesta:**
```typescript
// Revisar cómo se combinan múltiples shifts
// ¿Suma ponderada? ¿Multiplicación? ¿Máximo?
```

---

## Archivos a Revisar

### Primarios
1. `src/app/events/eventImpact.ts` - Lógica principal de cálculo de impacto
2. `src/app/opinionEngine/opinionUpdater.ts` - Aplicación de cambios a opiniones

### Secundarios
3. `scripts/test/runScenarioSurvey.ts` - Cómo se aplica el escenario en testing
4. `src/app/survey/surveyRunner.ts` - Integración con el runner de encuestas

---

## Plan de Acción

### Fase 1: Diagnóstico (Inmediato)

1. **Revisar `eventImpact.ts`**
   - [ ] Identificar fórmula de cálculo de impacto
   - [ ] Verificar tratamiento de sentimiento negativo
   - [ ] Revisar atenuación de intensidad
   - [ ] Confirmar mapeo de categorías

2. **Revisar `opinionUpdater.ts`**
   - [ ] Verificar cómo se aplican los shifts a las opiniones
   - [ ] Confirmar que el signo se preserva
   - [ ] Revisar límites y clamping

3. **Revisar integración**
   - [ ] Confirmar que el escenario se pasa correctamente al runner
   - [ ] Verificar que el impacto se calcula antes de las respuestas

### Fase 2: Pruebas de Hipótesis

1. **Test H1 (Signo):**
   - Crear escenario de prueba con sentimiento -1.0
   - Verificar dirección del cambio en cada métrica

2. **Test H2 (Intensidad):**
   - Probar intensidades 0.3, 0.6, 0.9, 1.0
   - Mediar correlación entre intensidad y delta observado

3. **Test H3 (Mapeo):**
   - Verificar qué topics afecta cada categoría
   - Confirmar que economy → economic_situation

### Fase 3: Implementación de Fixes

Basado en los hallazgos, implementar cambios mínimos y seguros:
- Priorizar corrección de signo si H1 se confirma
- Ajustar atenuación si H2 se confirma
- Corregir mapeos si H3 se confirma

---

## Criterios de Éxito

El tuning se considerará exitoso cuando:

1. ✅ Un evento con `sentiment = -0.75` e `intensity = 0.9` produzca:
   - Deterioro en q_direction (>5% negativo)
   - Deterioro en q_economy_national (>10% negativo)
   - Deterioro en q_economy_personal (>5% negativo)

2. ✅ Un evento con `sentiment = +0.25` e `intensity = 0.6` produzca:
   - Mejora en q_direction (>2% positivo)
   - Mejora en q_approval (>10% positivo)

3. ✅ La intensidad se correlacione positivamente con la magnitud del cambio

---

## Notas

- **No tocar:** Scenario Builder UI, scenario store, runner, baseline v1.1, persistencia
- **Sí tocar:** `eventImpact.ts` y posiblemente `opinionUpdater.ts`
- **Enfoque:** Comportamiento de escenarios negativos únicamente

---

**Documento creado:** 29/03/2026  
**Próxima revisión:** Tras diagnóstico de código
