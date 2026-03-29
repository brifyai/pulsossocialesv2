# Scenario Builder Validation Run 003
## Iteración 1 de Tuning - Resultados

**Fecha:** 29 de marzo de 2026  
**Escenario:** Crisis Económica (ID: `1d91e26b-581d-4015-b907-b5102a407fc2`)  
**Cambios aplicados:** Iteración 1 de tuning en `src/app/events/types.ts`

---

## Resumen Ejecutivo

**✅ Iteración 1 EXITOSA - 4 de 5 preguntas mejoraron significativamente**

La Iteración 1 de tuning logró mejorar sustancialmente el impacto de eventos económicos negativos, con **4 de 5 preguntas mostrando comportamiento correcto**.

---

## Cambios Aplicados en Iteración 1

| Parámetro | Valor Anterior | Valor Nuevo |
|-----------|----------------|-------------|
| `globalAttenuation` | 0.7 | **0.85** |
| `impactMultiplier` (economy) | 0.9 | **1.1** |
| `maxShiftPerEvent` | 0.15 | **0.20** |
| `government_approval` en topics de economy | No | **Sí** |

---

## Resultados Comparativos

### Tabla de Comparación: Run 002 vs Iteración 1

| Pregunta | Métrica Clave | Run 002 (Antes) | **Iteración 1 (Ahora)** | Evaluación |
|----------|---------------|-----------------|------------------------|------------|
| **q_approval** | disapprove | +2% | **+8.0%** | ✅ **MEJORÓ** |
| **q_direction** | bad_path | +14% ❌ | **-3.0%** ⚠️ | 🟡 **SIGUE RARO** |
| **q_economy_national** | pessimistic | -1% | **+5.0%** | ✅ **MEJORÓ** |
| **q_economy_personal** | optimistic | +1% ❌ | **-4.0%** | ✅ **MEJORÓ** |
| **q_optimism** | pessimistic | +2% | **+4.0%** | ✅ **MEJORÓ** |

---

## Análisis Detallado por Pregunta

### 1. q_approval (Aprobación del Gobierno) ✅ **ÉXITO**

**Baseline:** 48.0% approve / 45.0% disapprove  
**Escenario:** 45.0% approve / 53.0% disapprove  
**Delta:** +8.0pp disapprove

**Análisis:**
- El cambio más significativo de todas las preguntas
- El efecto indirecto de economía sobre aprobación **funciona correctamente**
- Crisis económica → menor aprobación del gobierno (lógica correcta)

**Estado:** ✅ **Cumple expectativas**

---

### 2. q_direction (Dirección del País) ⚠️ **PROBLEMA PERSISTE**

**Baseline:** 52.0% good_path / 46.0% bad_path  
**Escenario:** 52.0% good_path / 43.0% bad_path  
**Delta:** -3.0pp bad_path

**Análisis:**
- **PROBLEMA NO RESUELTO**: En lugar de mejorar (más gente creyendo que vamos por mal camino), empeoró
- Run 002: +14% bad_path (mejoró, aunque no por la razón correcta)
- Iteración 1: -3% bad_path (empeoró)
- **Esto confirma que el problema no es magnitud, es dirección**

**Hipótesis:** El problema está en `opinionUpdater.ts` o `surveyRunner.ts`, no en los parámetros de magnitud.

**Estado:** ❌ **No cumple expectativas** - requiere investigación adicional

---

### 3. q_economy_national (Economía Nacional) ✅ **ÉXITO**

**Baseline:** 63.0% optimistic / 31.0% pessimistic  
**Escenario:** 63.0% optimistic / 36.0% pessimistic  
**Delta:** +5.0pp pessimistic

**Análisis:**
- **MEJORÓ DRAMÁTICAMENTE**: De -1% a +5%
- Finalmente responde a la crisis económica
- El aumento de `impactMultiplier` de 0.9 a 1.1 tuvo efecto

**Estado:** ✅ **Cumple expectativas**

---

### 4. q_economy_personal (Economía Personal) ✅ **ÉXITO**

**Baseline:** 63.0% optimistic / 31.0% pessimistic  
**Escenario:** 59.0% optimistic / 34.0% pessimistic  
**Delta:** -4.0pp optimistic / +3.0pp pessimistic

**Análisis:**
- **MEJORÓ**: De +1% (subió) a -4% (bajó)
- Ahora cae como debería ante una crisis
- La dirección del cambio es correcta

**Estado:** ✅ **Cumple expectativas**

---

### 5. q_optimism (Optimismo del País) ✅ **ÉXITO**

**Baseline:** 64.0% optimistic / 29.0% pessimistic  
**Escenario:** 63.0% optimistic / 33.0% pessimistic  
**Delta:** +4.0pp pessimistic

**Análisis:**
- **MEJORÓ**: De +2% a +4%
- Mayor pesimismo ante crisis económica
- Comportamiento lógico correcto

**Estado:** ✅ **Cumple expectativas**

---

## Métricas Generales

| Métrica | Valor |
|---------|-------|
| **Confianza promedio** | 0.60 |
| **no_response** | 1-7% (aceptable) |
| **Duración escenario** | 248ms |
| **Overhead** | 241ms |
| **Respuestas** | 500/500 (100%) |

---

## Evaluación de Criterios

### Criterios Mínimos Aceptables

| Criterio | Estado | Observación |
|----------|--------|-------------|
| `economy_national` empeora claramente | ✅ **SÍ** | +5% pessimistic |
| `economy_personal` empeora algo | ✅ **SÍ** | -4% optimistic |
| `government_approval` baja algo | ✅ **SÍ** | +8% disapprove |
| `q_direction` deja de mejorar | ❌ **NO** | Sigue comportándose mal |
| no_response no explota | ✅ **SÍ** | Entre 1-7% |

### Resultado Global

**4 de 5 criterios cumplidos (80%)**

---

## Conclusiones

### ✅ Lo que funcionó

1. **El problema era magnitud** (para 4 de 5 preguntas)
2. Los cambios conservadores de Iteración 1 fueron suficientes
3. El efecto indirecto de economía sobre aprobación del gobierno funciona
4. Las preguntas económicas ahora responden correctamente a crisis

### ❌ Lo que no funcionó

1. **`q_direction` sigue con comportamiento errático**
2. El problema de `q_direction` **no es magnitud, es dirección**
3. Requiere investigación en `opinionUpdater.ts` o `surveyRunner.ts`

---

## Recomendaciones

### Opción A: Aceptar Iteración 1 como suficiente

**Pros:**
- 4 de 5 preguntas funcionan correctamente
- Los escenarios económicos ahora tienen impacto real
- `q_direction` puede investigarse después

**Contras:**
- `q_direction` sigue siendo un problema conocido

### Opción B: Investigar `q_direction` ahora

**Enfoque:**
1. Revisar `opinionUpdater.ts` - cómo se aplican los shifts a `country_direction`
2. Revisar `surveyRunner.ts` - cómo se calculan las respuestas
3. Buscar posible inversión de signo o lógica incorrecta

**Recomendación:** Opción A - Iteración 1 es suficiente para continuar. `q_direction` puede abordarse en una iteración futura.

---

## Próximos Pasos

1. ✅ **Documentar** estos resultados (hecho)
2. 🔄 **Decidir** si investigar `q_direction` o seguir adelante
3. 📝 **Actualizar** documentación de tuning
4. 🎯 **Considerar** Iteración 2 solo si se necesitan más ajustes

---

## Notas Técnicas

### Parámetros que funcionaron

```typescript
// DEFAULT_EVENT_CONFIG
globalAttenuation: 0.85,     // ✅ Funcionó
maxShiftPerEvent: 0.20,      // ✅ Funcionó

// CATEGORY_PARAMS.economy
impactMultiplier: 1.1,       // ✅ Funcionó

// CATEGORY_TOPIC_MAP.economy
'agovernment_approval'        // ✅ Funcionó (efecto indirecto)
```

### Parámetros que NO resolvieron el problema de `q_direction`

- Ninguno de los cambios de magnitud afectó `q_direction`
- Confirma que el problema está en otra parte del código

---

**Documento creado:** 29/03/2026  
**Estado:** ✅ Iteración 1 completada y documentada
