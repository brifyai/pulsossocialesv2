# Diagnóstico Comparado: eventImpact.ts vs Expectativas

**Fecha:** 29 de marzo de 2026  
**Objetivo:** Identificar desalineaciones entre implementación y expectativas

---

## Resumen Ejecutivo

Revisión de `src/app/events/eventImpact.ts` comparada contra `EVENT_IMPACT_EXPECTATIONS_BY_TOPIC.md`.

**Hallazgo principal:** La implementación tiene la lógica de dirección correcta, pero hay **problemas de magnitud y priorización** que explican por qué los escenarios negativos no producen el impacto esperado.

---

## Tabla de Mismatches Identificados

### 🔴 Mismatch 1: `economy_national` no recibe mayor impacto que `economy_personal`

| Aspecto | Expectativa | Implementación Actual | Estado |
|---------|-------------|----------------------|--------|
| Prioridad | `economy_national` > `economy_personal` | Ambos iguales en `CATEGORY_TOPIC_MAP` | ❌ **Desalineado** |
| Magnitud | Nacional -10% a -15%, Personal -5% a -8% | Misma fórmula para ambos | ❌ **Desalineado** |

**Código problemático:**
```typescript
// CATEGORY_TOPIC_MAP en types.ts
economy: [
  'economy_national',
  'economy_personal',  // ← Misma prioridad, no diferenciado
  'country_optimism',
  'country_direction'
]
```

**Problema:** No hay diferenciación de peso entre economía nacional y personal.

---

### 🔴 Mismatch 2: `country_direction` mejora en escenarios económicos negativos

| Aspecto | Expectativa | Implementación Actual | Estado |
|---------|-------------|----------------------|--------|
| Dirección | Debería **caer** en crisis económica | Mejoró +14% en validación | ❌ **Desalineado** |
| Magnitud esperada | -5% a -10% | +14% (signo invertido) | ❌ **Crítico** |

**Análisis del código:**

En `calculateTopicShift` (líneas 168-180 de eventImpact.ts):
```typescript
// Calcular dirección del cambio
const direction = event.sentiment >= 0 ? 1 : -1;

// Calcular delta
const delta = direction * Math.min(adjustedMagnitude, config.maxShiftPerEvent);
```

**La lógica de dirección es correcta:**
- Evento negativo (sentiment < 0) → direction = -1 → delta negativo → valor disminuye

**Hipótesis del problema:**
El issue no está en `eventImpact.ts`. El problema probablemente está en:
1. **Cómo se aplican los shifts** en `opinionUpdater.ts` o `surveyRunner.ts`
2. **Interacción con otros factores** que anulan o invierten el impacto
3. **El topic state inicial** de `country_direction` puede estar siendo sobreescrito

---

### 🟡 Mismatch 3: Intensidad 0.9 no produce impacto proporcional

| Aspecto | Expectativa | Implementación Actual | Estado |
|---------|-------------|----------------------|--------|
| Intensity 0.3 | Weak (-2% a -4%) | 0.3 × 0.6 × 0.85 × 0.9 × 0.7 = ~0.096 | 🟡 **Bajo** |
| Intensity 0.9 | Strong (-10% a -15%) | 0.9 × 0.6 × 0.85 × 0.9 × 0.7 = ~0.29 | 🟡 **Muy bajo** |

**Cálculo de magnitud real:**
```typescript
// Fórmula actual en calculateTopicShift:
const baseMagnitude = 
  event.intensity *           // 0.9
  event.salience *            // ~0.6 (estimado)
  severityFactor *            // 0.85 (major)
  categoryParams.impactMultiplier;  // 0.9 (economy)
// = 0.9 × 0.6 × 0.85 × 0.9 = 0.413

const adjustedMagnitude = baseMagnitude * exposure * config.globalAttenuation;
// = 0.413 × 0.5 × 0.7 = 0.145 (14.5% máximo teórico)

const delta = direction * Math.min(adjustedMagnitude, config.maxShiftPerEvent);
// = -1 × min(0.145, 0.15) = -0.145 (-14.5%)
```

**Problema identificado:**
- La atenuación global de 0.7 mata demasiado el efecto
- El `impactMultiplier` de economy (0.9) reduce cuando debería amplificar
- El `maxShiftPerEvent` de 0.15 limita demasiado

---

### 🟡 Mismatch 4: `government_approval` no en lista de topics para `economy`

| Aspecto | Expectativa | Implementación Actual | Estado |
|---------|-------------|----------------------|--------|
| Topics economy | Debería incluir `government_approval` (efecto indirecto) | Solo 4 topics | 🟡 **Parcial** |

**Expectativa documentada:**
> "Efecto indirecto vía economía" - `government_approval` debería verse afectado moderadamente

**Implementación actual:**
```typescript
economy: [
  'economy_national',
  'economy_personal',
  'country_optimism',
  'country_direction'
  // Falta: 'government_approval'
]
```

---

## Lista Priorizada de Cambios Recomendados

### Prioridad 1: Aumentar magnitud del impacto (Crítico)

**Problema:** Intensidad 0.9 produce ~14% cuando debería producir >20%

**Cambios propuestos:**

1. **Reducir `globalAttenuation`** de 0.7 a 0.85
   ```typescript
   // DEFAULT_EVENT_CONFIG
   globalAttenuation: 0.85,  // Era: 0.7
   ```

2. **Aumentar `impactMultiplier` de economy** de 0.9 a 1.2
   ```typescript
   // CATEGORY_PARAMS.economy
   impactMultiplier: 1.2,  // Era: 0.9
   ```

3. **Aumentar `maxShiftPerEvent`** de 0.15 a 0.25
   ```typescript
   // DEFAULT_EVENT_CONFIG
   maxShiftPerEvent: 0.25,  // Era: 0.15
   ```

**Impacto esperado:**
- Intensity 0.9 → ~25% de cambio (antes ~14%)
- Intensity 0.3 → ~8% de cambio (antes ~5%)

---

### Prioridad 2: Diferenciar pesos entre topics de economía (Alto)

**Problema:** `economy_national` y `economy_personal` tienen mismo peso

**Cambio propuesto:**

Modificar `calculateTopicShift` para aplicar multiplicadores por topic:

```typescript
// Agregar mapeo de pesos por topic
const TOPIC_WEIGHTS: Record<string, number> = {
  'economy_national': 1.3,    // 30% más impacto
  'economy_personal': 0.7,    // 30% menos impacto
  'country_optimism': 1.0,
  'country_direction': 0.8,
  'government_approval': 0.6
};

// En calculateTopicShift:
const topicWeight = TOPIC_WEIGHTS[topic] ?? 1.0;
const adjustedMagnitude = baseMagnitude * exposure * config.globalAttenuation * topicWeight;
```

---

### Prioridad 3: Agregar `government_approval` a topics de economy (Medio)

**Cambio simple:**
```typescript
// CATEGORY_TOPIC_MAP
economy: [
  'economy_national',
  'economy_personal',
  'country_optimism',
  'country_direction',
  'government_approval'  // Nuevo
]
```

Con el peso de 0.6 (efecto indirecto) del punto anterior.

---

### Prioridad 4: Investigar inversión de signo en `country_direction` (Crítico)

**No es un fix en `eventImpact.ts`**

El código de dirección es correcto. El problema está en:
- `opinionUpdater.ts` - cómo se agregan los shifts
- `surveyRunner.ts` - cómo se aplican los estados
- Posible interacción con factores de compensación

**Recomendación:** Revisar el flujo completo de aplicación de eventos.

---

## Resumen de Problemas y Soluciones

| Problema Observado | Causa Raíz | Solución | Archivo a Modificar |
|-------------------|------------|----------|---------------------|
| Impacto muy bajo (<15% para intensity 0.9) | Atenuación excesiva (0.7) + multiplicador bajo (0.9) | Aumentar atenuación a 0.85, multiplier a 1.2 | `types.ts` |
| `economy_national` = `economy_personal` | Sin diferenciación de pesos | Agregar `TOPIC_WEIGHTS` | `eventImpact.ts` |
| Falta efecto en `government_approval` | No está en lista de topics | Agregar a `CATEGORY_TOPIC_MAP` | `types.ts` |
| `country_direction` mejora en crisis | Problema en otro archivo | Investigar `opinionUpdater.ts` | Otro archivo |

---

## Recomendación de Implementación

### Iteración 1 (Segura)
Solo cambiar en `types.ts`:
1. `globalAttenuation: 0.85`
2. `impactMultiplier` de economy: `1.2`
3. Agregar `government_approval` a topics de economy

**Riesgo:** Bajo - solo constantes  
**Beneficio:** Impacto más visible en escenarios

### Iteración 2 (Moderada)
Agregar `TOPIC_WEIGHTS` en `eventImpact.ts`  
**Riesgo:** Medio - cambio de lógica  
**Beneficio:** Diferenciación realista entre topics

### Iteración 3 (Investigación)
Revisar `opinionUpdater.ts` para entender inversión de signo  
**Riesgo:** Desconocido  
**Beneficio:** Corregir comportamiento de `country_direction`

---

## Métricas de Éxito para Validación

Después de aplicar cambios, validar:

| Escenario | Métrica | Antes | Después (Esperado) |
|-----------|---------|-------|-------------------|
| Crisis Económica (intensity 0.9) | `economy_national` | -1% | **-12% a -18%** |
| Crisis Económica (intensity 0.9) | `economy_personal` | +1% | **-5% a -10%** |
| Crisis Económica (intensity 0.9) | `country_direction` | +14% ❌ | **-5% a -10%** |
| Subsidio Transporte (intensity 0.6) | `government_approval` | +13% | **+10% a +15%** (mantener) |

---

## Conclusión

**El problema principal es la magnitud, no la dirección.**

La lógica de `eventImpact.ts` es conceptualmente correcta, pero los parámetros son demasiado conservadores:
- Atenuación de 30% (`globalAttenuation: 0.7`) es excesiva
- Multiplicador de economy (0.9) debería ser >1.0 para eventos económicos
- Límite de 15% (`maxShiftPerEvent: 0.15`) impide impactos fuertes

**Próximo paso recomendado:** Aplicar Iteración 1 (cambios de constantes en `types.ts`) y revalidar.

---

**Documento creado:** 29/03/2026  
**Próximo paso:** Implementar cambios de Iteración 1
