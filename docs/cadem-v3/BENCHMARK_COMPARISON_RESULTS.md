# Resultados de Comparación Benchmark CADEM - Marzo 2026

**Fecha de ejecución:** 2026-03-26  
**Branch:** feature/cadem-opinion-engine-v1  
**Benchmark:** Plaza Pública Cadem - Marzo 2026  
**Muestra sintética:** 300 agentes

---

## Resumen Ejecutivo

| Métrica | Valor |
|---------|-------|
| **MAE General** | 25.34 pp |
| **Preguntas Calibradas** | 0/5 |
| **Divergencia Baja (≤5pp)** | 0 |
| **Divergencia Media (5-10pp)** | 2 |
| **Divergencia Alta (>10pp)** | 3 |

**Estado:** ❌ Calibración requerida

---

## Resultados por Pregunta

### 1. Aprobación Presidencial (q_approval)
**Target:** strict | **MAE:** 3.53pp | **Max Dev:** 5.30pp

| Opción | Benchmark | Sintético | Diferencia | Estado |
|--------|-----------|-----------|------------|--------|
| Aprueba | 52.9% | 57.3% | +4.4pp | ✓ |
| Desaprueba | 40.3% | 35.0% | -5.3pp | ~ |
| No responde | 6.8% | 7.7% | +0.9pp | ✓ |

**Análisis:** Buena calibración general. La aprobación está dentro de 5pp del benchmark. El motor tiende a subestimar la desaprobación ligeramente.

---

### 2. Dirección del País (q_direction)
**Target:** soft | **MAE:** 5.27pp | **Max Dev:** 7.50pp

| Opción | Benchmark | Sintético | Diferencia | Estado |
|--------|-----------|-----------|------------|--------|
| Buen camino | 49.2% | 56.7% | +7.5pp | ~ |
| Mal camino | 35.0% | 38.0% | +3.0pp | ✓ |
| No responde | 0.0% | 5.3% | +5.3pp | ~ |\n**Análisis:** El motor sobreestima la percepción de "buen camino". El benchmark no reporta "no responde" (distribución parcial), lo que explica la diferencia.

---

### 3. Optimismo sobre el Futuro (q_optimism)
**Target:** soft | **MAE:** 39.20pp | **Max Dev:** 60.50pp

| Opción | Benchmark | Sintético | Diferencia | Estado |
|--------|-----------|-----------|------------|--------|
| Optimista total | 60.5% | 0.0% | -60.5pp | ✗ |
| Pesimista total | 35.5% | 0.0% | -35.5pp | ✗ |
| Optimista | 0.0% | 51.0% | +51.0pp | ✗ |
| Pesimista | 0.0% | 36.7% | +36.7pp | ✗ |

**Análisis:** ⚠️ **Problema de mapeo de opciones.** El benchmark usa categorías agrupadas (`optimistic_total`/`pessimistic_total`) mientras el motor genera opciones individuales (`optimistic`/`pessimistic`).

**Recomendación:** Implementar normalización canónica para mapear `optimistic` → `optimistic_total`.

---

### 4. Percepción Economía Nacional (q_economy_national)
**Target:** soft | **MAE:** 39.52pp | **Max Dev:** 62.80pp

| Opción | Benchmark | Sintético | Diferencia | Estado |
|--------|-----------|-----------|------------|--------|
| Positivo total | 34.8% | 0.0% | -34.8pp | ✗ |
| Negativo total | 62.8% | 0.0% | -62.8pp | ✗ |
| Positivo | 0.0% | 60.0% | +60.0pp | ✗ |
| Negativo | 0.0% | 38.3% | +38.3pp | ✗ |

**Análisis:** ⚠️ Mismo problema de mapeo de opciones agrupadas vs individuales.

---

### 5. Percepción Economía Personal (q_economy_personal)
**Target:** soft | **MAE:** 39.20pp | **Max Dev:** 75.70pp

| Opción | Benchmark | Sintético | Diferencia | Estado |
|--------|-----------|-----------|------------|--------|
| Positivo total | 52.0% | 0.0% | -52.0pp | ✗ |
| Negativo total | 44.0% | 0.0% | -44.0pp | ✗ |
| Positivo | 0.0% | 75.7% | +75.7pp | ✗ |
| Negativo | 0.0% | 24.0% | +24.0pp | ✗ |

**Análisis:** ⚠️ Mismo problema de mapeo. Además, el motor muestra sesgo hacia percepción positiva personal (75.7% vs 52.0% benchmark).

---

## Hallazgos Clave

### 1. Problema de Mapeo de Opciones
El benchmark CADEM usa categorías agrupadas (`*_total`) mientras el motor genera opciones individuales. Esto causa divergencias artificiales altas.

**Solución propuesta:**
```typescript
// Normalización canónica
const optionMapping: Record<string, string> = {
  'optimistic': 'optimistic_total',
  'pessimistic': 'pessimistic_total',
  'positive': 'positive_total',
  'negative': 'negative_total',
};
```

### 2. Calibración Aprobación Presidencial
La pregunta de aprobación presidencial muestra buena calibración (MAE 3.53pp), lo que indica que el motor de respuesta demográfico funciona razonablemente bien.

### 3. Sesgo en Economía Personal
El motor sobreestima significativamente la percepción positiva de la economía personal (75.7% vs 52.0%). Esto sugiere que el modelo de respuesta necesita ajuste en la correlación ingreso-percepción.

---

## Recomendaciones

### Inmediatas
1. **Implementar mapeo canónico** de opciones para preguntas agrupadas
2. **Ajustar probabilidad** de respuesta positiva en economía personal
3. **Revisar distribución** de "no responde" en dirección del país

### Mediano Plazo
1. **Calibrar pesos demográficos** por región (RM está en 36.7%, podría ajustarse)
2. **Implementar ajuste por tendencia** (trend) del benchmark
3. **Agregar más variabilidad** en respuestas para reflejar mejor el error muestral

---

## Archivos Generados

- `data/benchmarks/cadem/comparison_results.json` - Resultados detallados en JSON
- `data/benchmarks/cadem/normalized/cadem_marzo_2026_master.json` - Benchmark CADEM

---

## Próximos Pasos

1. Implementar normalización canónica de opciones
2. Re-ejecutar comparación
3. Ajustar parámetros del motor de respuesta basado en resultados
4. Documentar calibración final
