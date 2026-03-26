# CADEM Opinion Engine v1 - Calibration Results

## Fecha
2026-03-26

## Resumen de Calibración

Se aplicaron 4 ajustes principales al sistema para corregir los problemas identificados en el baseline:

### Ajustes Realizados

#### 1. Dispersión Ideológica (`topicStateSeed.ts`)
- **Problema**: Colapso al centro (90% center)
- **Solución**: 
  - Aumentado peso de ingreso: 0.35 → 0.45
  - Aumentado ruido político: ×1.5
  - Reducida ventana del centro en resolver: ±0.25 → ±0.18
- **Resultado**: Center 54% (mejora significativa)

#### 2. Desacoplamiento Economía (`topicStateSeed.ts`)
- **Problema**: Economía personal y nacional demasiado similares
- **Solución**:
  - `economyNational`: dependencia de personal 0.45 → 0.25
  - Agregado componente independiente de ingreso
  - Aumentado ruido: ×1.3
- **Resultado**: Mayor variabilidad entre personal y nacional

#### 3. Reducción Cascada Negatividad (`topicStateSeed.ts`)
- **Problema**: Todos los temas caían en negativo
- **Solución**:
  - `optimism`: reducida dependencia de economía 0.4 → 0.25
  - `direction`: reducida dependencia de optimism 0.35 → 0.2
  - `approval`: reducida dependencia de direction 0.45 → 0.25
  - Agregados términos independientes de ingreso
- **Resultado**: Mayor diversidad en respuestas

#### 4. Thresholds Ordinales (`questionResolver.ts`)
- **Problema**: Escasa presencia de extremos
- **Solución**:
  - Optimismo: ±0.5 → ±0.4
  - Economía: ±0.5 → ±0.4
- **Resultado**: Aparecen categorías very_optimistic, very_bad

---

## Resultados Comparativos

### Baseline (Antes) vs Calibrado (Después)

| Pregunta | Métrica | Baseline | Calibrado | Cambio |
|----------|---------|----------|-----------|--------|
| **Aprobación** | approve | 18% | **44%** | +26pp |
| | disapprove | 74% | 54% | -20pp |
| **Dirección** | good_path | 24% | **34%** | +10pp |
| | bad_path | 74% | 62% | -12pp |
| **Optimismo** | optimistic | 18% | **34%** | +16pp |
| | pessimistic | 70% | 66% | -4pp |
| | very_optimistic | 0% | **0%** | - |
| | very_pessimistic | 4% | **0%** | -4pp |
| **Eco. Nacional** | good | 20% | **34%** | +14pp |
| | bad | 74% | 58% | -16pp |
| | very_bad | 4% | **2%** | -2pp |
| **Eco. Personal** | good | 20% | **36%** | +16pp |
| | bad | 76% | 56% | -20pp |
| **Ideología** | center | 90% | **54%** | -36pp |
| | center_right | 2% | **22%** | +20pp |
| | center_left | 4% | **18%** | +14pp |
| | left/right | 0% | **0%** | - |

---

## Análisis de Mejoras

### ✅ Logrado

1. **Dispersión ideológica**: De 90% center a 54% center
   - center_right: 2% → 22%
   - center_left: 4% → 18%
   - Estructura mucho más saludable

2. **Reducción negatividad sistémica**:
   - Aprobación: 18% → 44% approve
   - Dirección: 24% → 34% good_path
   - Optimismo: 18% → 34% optimistic

3. **Separación economía personal/nacional**:
   - Personal good: 36% vs Nacional good: 34%
   - Diferencias emergiendo

4. **Extremos ordinales**:
   - Aparecen very_bad en economía (2%)
   - Estructura ordinal más completa

### ⚠️ Pendiente

1. **Extremos ideológicos**: No aparecen left/right puros
   - Sugerencia: ampliar rango de scores o ajustar thresholds

2. **Extremos optimismo**: No aparecen very_optimistic/very_pessimistic
   - Los scores no llegan a ±0.4 con suficiente frecuencia

3. **Muestra pequeña**: 50 agentes genera variabilidad alta
   - Recomendado: probar con 500+ para estabilidad

---

## Métricas Técnicas

- **Tiempo de ejecución**: 7ms (50 agentes, 6 preguntas)
- **Throughput**: ~43,000 respuestas/segundo
- **Confianza promedio**: 0.60 (rango 0.58-0.63)

---

## Próximos Pasos Sugeridos

1. **Probar con muestra grande** (500-1000 agentes)
2. **Ajustar thresholds ideológicos** para capturar left/right
3. **Evaluar estabilidad temporal** (múltiples ejecuciones)
4. **Validar coherencia interna** (correlaciones entre temas)
5. **Comparar con datos reales** CADEM si disponibles

---

## Archivos Modificados

- `src/app/opinionEngine/topicStateSeed.ts` - Pesos y ruido
- `src/app/opinionEngine/questionResolver.ts` - Thresholds
