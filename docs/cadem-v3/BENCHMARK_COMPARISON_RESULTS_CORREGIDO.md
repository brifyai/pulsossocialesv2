# Resultados de Comparación Benchmark CADEM - Marzo 2026 (CORREGIDO)

**Fecha de ejecución:** 2026-03-26  
**Branch:** feature/cadem-opinion-engine-v1  
**Benchmark:** Plaza Pública Cadem - Marzo 2026  
**Muestra sintética:** 300 agentes

---

## Resumen Ejecutivo

| Métrica | Valor |
|---------|-------|
| **MAE General** | 8.73 pp |
| **Preguntas Calibradas** | 1/5 |
| **Divergencia Baja (≤5pp)** | 1 |
| **Divergencia Media (5-10pp)** | 2 |
| **Divergencia Alta (>10pp)** | 2 |

**Estado:** ⚠️ Ajustes requeridos en economía

---

## Resultados por Pregunta

### 1. Aprobación Presidencial (q_approval) ✅
**Target:** strict | **MAE:** 2.07pp | **Max Dev:** 3.10pp | **Estado:** ✅ CALIBRADO

| Opción | Benchmark | Sintético | Diferencia | Estado |
|--------|-----------|-----------|------------|--------|
| Aprueba | 52.9% | 54.0% | +1.1pp | ✓ |
| Desaprueba | 40.3% | 42.3% | +2.0pp | ✓ |
| No responde | 6.8% | 3.7% | -3.1pp | ✓ |

**Análisis:** Excelente calibración. Todas las opciones dentro de 5pp del benchmark. El motor demográfico funciona correctamente para aprobación presidencial.

---

### 2. Dirección del País (q_direction) ~
**Target:** soft | **MAE:** 5.90pp | **Max Dev:** 6.00pp | **Estado:** ~ ACEPTABLE

| Opción | Benchmark | Sintético | Diferencia | Estado |
|--------|-----------|-----------|------------|--------|
| Buen camino | 49.2% | 55.0% | +5.8pp | ~ |
| Mal camino | 35.0% | 41.0% | +6.0pp | ~ |
| No responde | 0.0%* | 4.0% | +4.0pp | ✓ |

*El benchmark no reporta "no responde" (distribución parcial)

**Análisis:** Aceptable para primera iteración. El motor muestra sesgo positivo moderado (+6pp en "buen camino"). El benchmark es partial, por lo que no responde no se penaliza fuertemente.

---

### 3. Optimismo sobre el Futuro (q_optimism) ~
**Target:** soft | **MAE:** 7.47pp | **Max Dev:** 9.20pp | **Estado:** ~ ACEPTABLE

| Opción | Benchmark | Sintético | Diferencia | Estado |
|--------|-----------|-----------|------------|--------|
| Optimista total | 60.5% | 51.3% | -9.2pp | ~ |
| Pesimista total | 35.5% | 39.7% | +4.2pp | ✓ |
| No responde | 0.0%* | 9.0% | +9.0pp | ~ |

*El benchmark no reporta "no responde" (distribución parcial)

**Análisis:** El motor subestima el optimismo (-9.2pp). Esto sugiere que el factor de edad en el motor de respuesta podría estar ponderado demasiado fuerte (los jóvenes son más optimistas en el modelo, pero quizás no lo suficiente).

---

### 4. Percepción Economía Nacional (q_economy_national) ✗
**Target:** soft | **MAE:** 15.10pp | **Max Dev:** 21.50pp | **Estado:** ✗ REQUIERE AJUSTE

| Opción | Benchmark | Sintético | Diferencia | Estado |
|--------|-----------|-----------|------------|--------|
| Positivo total | 34.8% | 56.3% | +21.5pp | ✗ |
| Negativo total | 62.8% | 41.3% | -21.5pp | ✗ |
| No responde | 0.0%* | 2.3% | +2.3pp | ✓ |

*El benchmark no reporta "no responde" (distribución parcial)

**Análisis:** ⚠️ **Sesgo positivo significativo.** El motor sobreestima la percepción positiva de la economía nacional en 21.5 puntos porcentuales. Esto es el problema principal a corregir.

**Hipótesis:** La correlación ingreso-percepción en el motor es demasiado fuerte. El benchmark muestra que la economía nacional es vista negativamente (62.8%) a pesar de la muestra.

---

### 5. Percepción Economía Personal (q_economy_personal) ✗
**Target:** soft | **MAE:** 13.13pp | **Max Dev:** 20.70pp | **Estado:** ✗ REQUIERE AJUSTE

| Opción | Benchmark | Sintético | Diferencia | Estado |
|--------|-----------|-----------|------------|--------|
| Positivo total | 52.0% | 72.7% | +20.7pp | ✗ |
| Negativo total | 44.0% | 26.3% | -17.7pp | ✗ |
| No responde | 0.0%* | 1.0% | +1.0pp | ✓ |

*El benchmark no reporta "no responde" (distribución parcial)

**Análisis:** ⚠️ **Sesgo positivo significativo.** Similar a economía nacional, el motor sobreestima la percepción positiva personal en 20.7pp.

**Hipótesis:** Mismo problema - la correlación ingreso-percepción es excesiva. El motor asume que deciles altos = percepción positiva, pero el benchmark muestra una relación más moderada.

---

## Hallazgos Clave

### 1. El motor demográfico funciona bien para política
**q_approval** está excelentemente calibrada (MAE 2.07pp). Esto valida que el enfoque de respuesta basado en demografía (edad, ingreso, educación) es correcto para temas políticos.

### 2. Problema sistemático en economía
Tanto **q_economy_national** como **q_economy_personal** muestran el mismo patrón:
- Sesgo positivo de ~20pp
- El motor asume correlación ingreso-percepción demasiado fuerte

### 3. Optimismo subestimado
**q_optimism** muestra que el motor es menos optimista que el benchmark (-9.2pp). Esto contradice parcialmente el sesgo positivo en economía, sugiriendo que son mecanismos diferentes.

---

## Diagnóstico Técnico

### Motor actual (simplificado)
```typescript
// Economía nacional
const econNatProb = 0.20 + (agent.incomeDecile / 15);
// Rango: 0.20 + (1/15) = 0.27  a  0.20 + (10/15) = 0.87

// Economía personal  
const econPerProb = 0.30 + (agent.incomeDecile / 12);
// Rango: 0.30 + (1/12) = 0.38  a  0.30 + (10/12) = 1.13 (capped)
```

### Problema identificado
El rango de probabilidad es demasiado amplio:
- Decil 1: 27-38% de probabilidad positiva
- Decil 10: 87-100% de probabilidad positiva

El benchmark sugiere que la percepción positiva debería estar más concentrada alrededor de 35-52% independientemente del decil.

---

## Recomendaciones de Ajuste

### Prioridad 1: Corregir economía (q_economy_*)
**Acción:** Reducir la pendiente de correlación ingreso-percepción.

```typescript
// Propuesta de ajuste
const econNatProb = 0.25 + (agent.incomeDecile / 25); // Rango: 0.29 - 0.65
const econPerProb = 0.35 + (agent.incomeDecile / 20); // Rango: 0.40 - 0.85
```

**Efecto esperado:**
- Reducir positivo total de ~56% a ~35-40%
- Aumentar negativo total de ~41% a ~60-65%
- MAE objetivo: <10pp

### Prioridad 2: Ajustar optimismo (q_optimism)
**Acción:** Reducir el peso de la edad o ajustar la fórmula.

```typescript
// Actual
const optimismProb = 0.35 + ((80 - agent.age) / 200);
// Propuesta
const optimismProb = 0.45 + ((70 - agent.age) / 250);
```

**Efecto esperado:**
- Aumentar optimismo total de ~51% a ~58-62%
- Acercarse al benchmark de 60.5%

### Prioridad 3: Dirección del país (q_direction)
**Acción:** Reducir sesgo positivo moderado.

```typescript
// Actual
const directionProb = 0.30 + (agent.incomeDecile / 20);
// Propuesta
const directionProb = 0.25 + (agent.incomeDecile / 25);
```

---

## Orden Recomendado de Tuning

1. **Primero:** Ajustar economía nacional y personal (mismo problema)
2. **Segundo:** Verificar si el ajuste de economía afecta dirección del país
3. **Tercero:** Ajustar optimismo si persiste la diferencia
4. **Validar:** Re-ejecutar comparación y verificar MAE general <5pp

---

## Conclusión

El motor **no está tan mal como parecía inicialmente**. El problema principal era el comparador, no el motor.

**Después de corregir el comparador:**
- ✅ q_approval: Excelente (2.07pp MAE)
- ~ q_direction: Aceptable (5.90pp MAE)
- ~ q_optimism: Aceptable (7.47pp MAE)
- ✗ q_economy_national: Requiere ajuste (15.10pp MAE)
- ✗ q_economy_personal: Requiere ajuste (13.13pp MAE)

**Próximo paso:** Ajustar las fórmulas de economía para reducir la correlación ingreso-percepción.

---

## Archivos Generados

- `data/benchmarks/cadem/comparison_results.json` - Resultados detallados en JSON
- `docs/cadem-v3/BENCHMARK_COMPARISON_RESULTS_CORREGIDO.md` - Este reporte

---

## Comparación: Antes vs Después

| Pregunta | MAE Antes | MAE Después | Cambio |
|----------|-----------|-------------|--------|
| q_approval | 3.53pp | 2.07pp | ✅ Mejoró |
| q_direction | 5.27pp | 5.90pp | ~ Similar |
| q_optimism | 39.20pp | 7.47pp | ✅ Mucho mejor |
| q_economy_national | 39.52pp | 15.10pp | ✅ Mucho mejor |
| q_economy_personal | 39.20pp | 13.13pp | ✅ Mucho mejor |
| **MAE General** | **25.34pp** | **8.73pp** | ✅ **Mejoró 65%** |

La corrección del comparador redujo el MAE general de 25.34pp a 8.73pp (mejora del 65%).
