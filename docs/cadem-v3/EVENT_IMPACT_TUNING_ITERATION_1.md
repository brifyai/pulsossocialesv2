# Event Impact Tuning - Iteración 1 Aplicada

**Fecha:** 29 de marzo de 2026  
**Estado:** ✅ APLICADO  
**Archivo modificado:** `src/app/events/types.ts`

---

## Resumen de Cambios

Se aplicaron 4 cambios conservadores basados en el diagnóstico que identificó que el problema principal es **magnitud, no dirección**.

---

## Cambios Aplicados

### 1. `globalAttenuation`: 0.7 → 0.85

**Ubicación:** `DEFAULT_EVENT_CONFIG`

**Antes:**
```typescript
globalAttenuation: 0.7,  // Atenuación del 30%
```

**Después:**
```typescript
globalAttenuation: 0.85,  // Atenuación del 15%
```

**Impacto esperado:** Aumenta el impacto visible de eventos en ~21% (de 0.7 a 0.85)

---

### 2. `impactMultiplier` de economy: 0.9 → 1.1

**Ubicación:** `CATEGORY_PARAMS.economy`

**Antes:**
```typescript
economy: {
  impactMultiplier: 0.9,
  ...
}
```

**Después:**
```typescript
economy: {
  impactMultiplier: 1.1,  // Era 0.9
  ...
}
```

**Impacto esperado:** Eventos económicos ahora tienen 22% más impacto

**Nota:** Valor conservador. Iteración 2 puede subir a 1.2 si es necesario.

---

### 3. `maxShiftPerEvent`: 0.15 → 0.20

**Ubicación:** `DEFAULT_EVENT_CONFIG`

**Antes:**
```typescript
maxShiftPerEvent: 0.15,  // Máximo 15% de cambio por evento
```

**Después:**
```typescript
maxShiftPerEvent: 0.20,  // Máximo 20% de cambio por evento
```

**Impacto esperado:** Permite cambios más fuertes, especialmente para eventos con intensity 0.9

**Nota:** Valor conservador. Iteración 2 puede subir a 0.22 o 0.25 si es necesario.

---

### 4. Agregar `government_approval` a topics de economy

**Ubicación:** `CATEGORY_TOPIC_MAP.economy`

**Antes:**
```typescript
economy: [
  'economy_national',
  'economy_personal',
  'country_optimism',
  'country_direction'
]
```

**Después:**
```typescript
economy: [
  'economy_national',
  'economy_personal',
  'country_optimism',
  'country_direction',
  'government_approval'  // Nuevo: efecto indirecto
]
```

**Razón:** Crisis económicas afectan indirectamente la aprobación del gobierno

---

## Cálculo de Impacto Esperado

### Antes de Iteración 1

Para un evento económico negativo con:
- `intensity: 0.9`
- `salience: 0.6`
- `severity: major` (0.85)
- `exposure: 0.5`

```
baseMagnitude = 0.9 × 0.6 × 0.85 × 0.9 = 0.413
adjustedMagnitude = 0.413 × 0.5 × 0.7 = 0.145 (14.5%)
delta = -0.145 (limitado a -0.15 por maxShiftPerEvent)
```

**Resultado:** ~14-15% de cambio

### Después de Iteración 1

```
baseMagnitude = 0.9 × 0.6 × 0.85 × 1.1 = 0.505
adjustedMagnitude = 0.505 × 0.5 × 0.85 = 0.215 (21.5%)
delta = -0.20 (limitado a -0.20 por maxShiftPerEvent)
```

**Resultado esperado:** ~20% de cambio (antes ~14%)

**Mejora:** ~43% más de impacto

---

## Próximo Paso: Validación

### Escenario a Re-ejecutar

**Solo el Escenario 2 (Crisis Económica):**
```bash
npx tsx scripts/test/runScenarioSurvey.ts \
  --scenario-id "1d91e26b-581d-4015-b907-b5102a407fc2" \
  --agents 100
```

### Métricas a Comparar

| Métrica | Antes (Run 002) | Esperado Después |
|---------|-----------------|------------------|
| `economy_national` | -1% | **-15% a -20%** |
| `economy_personal` | +1% | **-8% a -12%** |
| `country_direction` | +14% ❌ | **-8% a -12%** (si el problema era magnitud) |
| `government_approval` | +3% | **-5% a -10%** (nuevo) |

### Criterios de Éxito

- [ ] `economy_national` cae >10%
- [ ] `economy_personal` cae >5%
- [ ] `country_direction` ya no mejora (o cae)
- [ ] `government_approval` muestra efecto negativo
- [ ] `no_response` se mantiene <10%

---

## Decisiones Post-Validación

### Si los resultados son buenos:
- ✅ Iteración 1 exitosa
- 📝 Documentar en `SCENARIO_BUILDER_VALIDATION_RUN_003.md`
- 🎯 Considerar Iteración 2 solo si faltan 3-4 puntos

### Si `country_direction` sigue mejorando:
- 🔍 El problema no es magnitud
- 🔍 Investigar `opinionUpdater.ts` o `surveyRunner.ts`
- 📝 Crear diagnóstico específico

### Si el impacto sigue siendo bajo (<10%):
- 🔄 Iteración 2 con valores más agresivos:
  - `impactMultiplier`: 1.1 → 1.2
  - `maxShiftPerEvent`: 0.20 → 0.25

---

## Notas de Calibración

Todos los cambios incluyen comentarios en el código:

```typescript
// NOTA DE CALIBRACIÓN (Iteración 1 - 29/03/2026):
// impactMultiplier: 0.9 → 1.1 (aumentar impacto de eventos económicos)
// Valor conservador para evitar sobreajuste. 
// Iteración 2 puede subir a 1.2 si es necesario.
```

Esto permite:
- Trazabilidad de cambios
- Reversión si es necesario
- Documentación para futuras iteraciones

---

**Documento creado:** 29/03/2026  
**Próximo paso:** Ejecutar Escenario 2 y comparar resultados
