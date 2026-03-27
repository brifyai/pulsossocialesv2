# Calibración de Preguntas Económicas - Versión 1.5

## Resumen Ejecutivo

Se realizó una calibración exitosa de las preguntas económicas del motor CADEM, logrando una reducción significativa en la divergencia respecto al benchmark de Plaza Pública CADEM Marzo 2026.

## Cambios Realizados

### Archivo Modificado
- `scripts/calibration/runBenchmarkComparisonStandalone.ts`

### Ajustes en Probabilidades de Respuesta

#### Economía Nacional (`q_economy_national`)
```typescript
// CALIBRACIÓN v1.5
const econNatProb = 0.12 + (agent.incomeDecile / 22); // 0.12-0.57 range
if (rand < econNatProb) return 'positive';
return 'negative'; // Sin no_response
```

**Lógica:**
- Base aumentada de 0.05 a 0.12
- Pendiente ajustada de /25 a /22 para mayor correlación con ingreso
- Eliminado `no_response` para mejorar calibración

#### Economía Personal (`q_economy_personal`)
```typescript
// CALIBRACIÓN v1.5
const econPerProb = 0.22 + (agent.incomeDecile / 16); // 0.22-0.62 range
if (rand < econPerProb) return 'positive';
return 'negative'; // Sin no_response
```

**Lógica:**
- Base aumentada de 0.15 a 0.22
- Pendiente ajustada de /18 a /16 para mayor correlación con ingreso
- Eliminado `no_response` para mejorar calibración

## Resultados de Calibración

### Comparación Antes vs Después

| Pregunta | Benchmark | Antes (v1.0) | Después (v1.5) | Mejora |
|----------|-----------|--------------|----------------|--------|
| Economía Nacional | 34.8% | 56.3% | **35.3%** | -21.0pp |
| Economía Personal | 52.0% | 76.0% | **54.7%** | -21.3pp |

### Métricas de Calidad

| Métrica | Valor |
|---------|-------|
| MAE General | 3.37 pp |
| Preguntas Calibradas | 3/5 (60%) |
| Divergencia Baja (≤5pp) | 3 preguntas |
| Divergencia Media (5-10pp) | 2 preguntas |
| Divergencia Alta (>10pp) | 0 preguntas |

### Detalle por Pregunta

| Pregunta | Target | MAE | Max Dev | Estado |
|----------|--------|-----|---------|--------|
| q_approval | strict | 3.40pp | 5.10pp | ⚠️ |
| q_direction | soft | 4.40pp | 4.50pp | ✅ |
| q_optimism | soft | 5.87pp | 7.30pp | ⚠️ |
| q_economy_national | soft | **1.20pp** | **1.90pp** | ✅✅ |
| q_economy_personal | soft | **2.00pp** | **2.70pp** | ✅✅ |

## Análisis de Resultados

### Economía Nacional
- **Benchmark**: 34.8% positivo / 62.8% negativo
- **Sintético**: 35.3% positivo / 64.7% negativo
- **Diferencia**: +0.5pp en positivo, +1.9pp en negativo
- **Evaluación**: ✅ Excelente calibración, dentro del margen de error estadístico

### Economía Personal
- **Benchmark**: 52.0% positivo / 44.0% negativo
- **Sintético**: 54.7% positivo / 45.3% negativo
- **Diferencia**: +2.7pp en positivo, +1.3pp en negativo
- **Evaluación**: ✅ Excelente calibración, dentro del margen de error estadístico

## Conclusiones

1. **Calibración Exitosa**: Las preguntas económicas ahora reflejan fielmente el sentimiento del benchmark CADEM
2. **Eliminación de Optimismo Excesivo**: Se corrigió el sesgo hacia respuestas positivas que existía en versiones anteriores
3. **Correlación con Ingreso**: Se mantuvo la correlación lógica entre nivel de ingreso y percepción económica
4. **Sin Respuestas Neutras**: La eliminación de `no_response` mejoró significativamente la calibración

## Próximos Pasos

Las preguntas restantes que requieren ajuste menor son:
- `q_approval`: Ajustar para reducir aprobación de 58% a ~53%
- `q_optimism`: Ajustar para aumentar optimismo de 53.7% a ~60.5%

Estas preguntas tienen divergencia media (5-10pp) y pueden abordarse en futuras iteraciones de calibración.

## Notas Técnicas

- **Muestra**: 300 agentes sintéticos
- **Benchmark**: Plaza Pública CADEM Marzo 2026 (n=4047)
- **Motor**: CADEM Opinion Engine v1.5
- **Fecha de Calibración**: 2026-03-27
