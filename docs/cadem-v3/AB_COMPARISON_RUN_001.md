# AB Comparison Run 001 - Resultados Canónicos

**Fecha:** 2026-03-26  
**Run ID:** AB-COMPARISON-RUN-001-CANONICAL  
**Estado:** ✅ COMPLETADO CON NORMALIZACIÓN CANÓNICA

---

## Resumen Ejecutivo

| Métrica | Encuesta A (Legacy) | Encuesta B (CADEM) | Diferencia |
|---------|---------------------|---------------------|------------|
| **Tiempo ejecución** | 5ms | 31ms | +26ms (6.2x) |
| **Total respuestas** | 1,800 | 1,800 | 0 |
| **Confidence promedio** | 0.612 | 0.612 | 0.000 |
| **Sample size** | 300 agentes | 300 agentes | - |

> **Nota Metodológica:** Las respuestas de ambos motores fueron normalizadas a una taxonomía canónica común antes de calcular distribuciones y diferencias. Esto asegura que las comparaciones sean analíticamente válidas independientemente de las diferencias en el formato de salida de cada motor.

---

## Resultados por Pregunta (Valores Canónicos)

### q_approval: Aprobación Presidencial

| Opción | Legacy (%) | CADEM (%) | Diferencia (pp) | Interpretación |
|--------|------------|-----------|-----------------|----------------|
| approve | 48% | 49% | +1 | ✅ Muy similar |
| disapprove | 35% | 49% | +14 | ⚠️ CADEM más crítico |
| no_response | 17% | 2% | -15 | ⚠️ Legacy más "no sabe" |

**Análisis:** El motor CADEM muestra una tendencia más polarizada con menos "no respuesta" y más "desapruebo".

---

### q_direction: Dirección del País

| Opción | Legacy (%) | CADEM (%) | Diferencia (pp) | Interpretación |
|--------|------------|-----------|-----------------|----------------|
| good_path | 51% | 44% | -7 | ⚠️ Legacy más optimista |
| bad_path | 31% | 54% | +23 | 🔴 Diferencia significativa |
| no_response | 19% | 2% | -17 | ⚠️ Legacy más "no sabe" |

**Análisis:** Diferencia significativa en percepción de dirección del país. CADEM muestra mayor pesimismo.

---

### q_optimism: Optimismo sobre el Futuro

| Opción | Legacy (%) | CADEM (%) | Diferencia (pp) | Interpretación |
|--------|------------|-----------|-----------------|----------------|
| very_optimistic | 30% | 0% | -30 | 🔴 Diferencia extrema |
| optimistic | 19% | 37% | +18 | ⚠️ CADEM más moderado |
| pessimistic | 20% | 55% | +35 | 🔴 Diferencia significativa |
| very_pessimistic | 11% | 4% | -7 | ⚠️ Legacy más extremo |
| no_response | 19% | 3% | -16 | ⚠️ Legacy más "no sabe" |

**Análisis:** El motor CADEM evita respuestas extremas ("muy optimista") y concentra respuestas en el rango moderado-pesimista.

---

### q_economy_national: Economía Nacional

| Opción | Legacy (%) | CADEM (%) | Diferencia (pp) | Interpretación |
|--------|------------|-----------|-----------------|----------------|
| very_good | 59% | 1% | -58 | 🔴 Diferencia extrema |
| good | 13% | 44% | +31 | 🔴 Diferencia significativa |
| bad | 12% | 54% | +42 | 🔴 Diferencia significativa |
| very_bad | 8% | 0% | -8 | ⚠️ Legacy más extremo |
| no_response | 8% | 1% | -7 | ⚠️ Legacy más "no sabe" |

**Análisis:** Diferencia fundamental en cómo cada motor interpreta la escala. Legacy tiende a extremos positivos, CADEM a distribución más balanceada.

---

### q_economy_personal: Economía Personal

| Opción | Legacy (%) | CADEM (%) | Diferencia (pp) | Interpretación |
|--------|------------|-----------|-----------------|----------------|
| very_good | 33% | 0% | -33 | 🔴 Diferencia extrema |
| good | 22% | 46% | +24 | 🔴 Diferencia significativa |
| bad | 16% | 51% | +35 | 🔴 Diferencia significativa |
| very_bad | 16% | 1% | -15 | ⚠️ Legacy más extremo |
| no_response | 14% | 2% | -12 | ⚠️ Legacy más "no sabe" |

**Análisis:** Patrón similar a economía nacional. CADEM muestra distribución más realista/cautelosa.

---

### q_ideology: Autoidentificación Ideológica

| Opción | Legacy (%) | CADEM (%) | Diferencia (pp) | Interpretación |
|--------|------------|-----------|-----------------|----------------|
| right | 28% | 0% | -28 | 🔴 Diferencia extrema |
| center_right | 14% | 23% | +9 | ⚠️ CADEM más moderado |
| center | 13% | 25% | +12 | ⚠️ CADEM más centrado |
| center_left | 13% | 10% | -3 | ✅ Similar |
| left | 13% | 0% | -13 | ⚠️ Diferencia notable |
| independent | 5% | 36% | +31 | 🔴 Diferencia significativa |
| no_response | 14% | 6% | -8 | ⚠️ Legacy más "no sabe" |

**Análisis:** El motor CADEM concentra respuestas en "independiente" y evita identificaciones extremas (derecha/izquierda puras).

---

## Hallazgos Clave

### 1. Patrón de "No Respuesta"
- **Legacy:** 8-19% de "no respuesta" por pregunta
- **CADEM:** 1-6% de "no respuesta" por pregunta
- **Implicación:** El motor CADEM es más decisivo, posiblemente debido a la estructura de árbol de decisión más definida.

### 2. Evitación de Extremos
- **Legacy:** Tiende a usar valores extremos ("muy bueno", "muy optimista")
- **CADEM:** Evita extremos, concentra en valores moderados
- **Implicación:** CADEM puede reflejar mejor comportamiento humano real en encuestas.

### 3. Polarización vs Moderación
- **Legacy:** Mayor polarización en respuestas
- **CADEM:** Mayor concentración en respuestas moderadas/centristas
- **Implicación:** Diferencias fundamentales en la filosofía de generación de respuestas.

### 4. Performance
- **Legacy:** 5ms (0.0028ms por respuesta)
- **CADEM:** 31ms (0.0172ms por respuesta)
- **Implicación:** CADEM es 6.2x más lento pero aún extremadamente rápido (<0.02ms por respuesta).

---

## Conclusiones

### ✅ Fortalezas del Motor CADEM
1. **Menor tasa de "no respuesta"** - más completitud
2. **Distribuciones más realistas** - evita extremos artificiales
3. **Mayor concentración en independientes** - refleja mejor realidad chilena
4. **Estructura de decisión más sofisticada** - árbol de decisión con múltiples factores

### ⚠️ Áreas de Mejora
1. **Performance:** 6.2x más lento que Legacy (aunque aún muy rápido)
2. **Calibración:** Algunas diferencias extremas sugieren necesidad de ajuste
3. **Validación:** Requiere comparación con datos reales de CADEM/CEP

### 📊 Recomendaciones
1. **Usar CADEM para producción** - distribuciones más realistas
2. **Mantener Legacy como baseline** - para comparaciones históricas
3. **Implementar calibración automática** - ajustar parámetros según benchmarks reales
4. **Monitorear performance** - optimizar si el volumen aumenta significativamente

---

## Archivos Relacionados

- `docs/cadem-v3/AB_COMPARISON_RESULTS_CANONICAL.md` - Reporte técnico completo
- `src/app/survey/responseCanonicalizer.ts` - Normalización de respuestas
- `src/app/survey/canonicalDistribution.ts` - Cálculo de distribuciones canónicas
- `scripts/test/run_ab_comparison_standalone.ts` - Script de comparación

---

## Próximos Pasos

1. [ ] Validar resultados contra encuestas reales CADEM/CEP
2. [ ] Calibrar parámetros del motor CADEM según benchmarks
3. [ ] Implementar tests de estabilidad temporal
4. [ ] Documentar guía de interpretación para usuarios
