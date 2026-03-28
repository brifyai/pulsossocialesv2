# Test End-to-End de Impacto de Eventos CADEM v1.2

**Fecha:** 28-03-2026, 11:07:58 a. m.
**Run ID:** event-test-1774706878443
**Sample Size:** 100 agentes
**Duración:** 2.0s

## Evento de Prueba

- **Título:** Crisis Económica: Inflación y Desempleo
- **Categoría:** economy
- **Sentimiento:** -0.75
- **Intensidad:** 0.8
- **Salience:** 0.85
- **Severidad:** major

## Resultados Antes del Evento

| Pregunta | Distribución | Confianza Promedio |
|----------|--------------|-------------------|
| q_direction | good_path: 39, bad_path: 53, no_response: 8 | 82.7% |
| q_optimism | optimistic: 49, pessimistic: 47, neutral: 0, no_response: 4 | 82.7% |
| q_economy_national | good: 33, regular: 0, bad: 61, no_response: 6 | 82.7% |
| q_economy_personal | good: 50, regular: 0, bad: 42, no_response: 8 | 82.7% |

## Resultados Después del Evento

| Pregunta | Distribución | Confianza Promedio |
|----------|--------------|-------------------|
| q_direction | good_path: 13, bad_path: 85, no_response: 2 | 82.5% |
| q_optimism | optimistic: 26, pessimistic: 65, neutral: 0, no_response: 8, very_pessimistic: 1 | 82.5% |
| q_economy_national | good: 3, regular: 0, bad: 92, no_response: 2, very_bad: 3 | 82.5% |
| q_economy_personal | good: 12, regular: 0, bad: 83, no_response: 4, very_bad: 1 | 82.5% |

## Cambios por Pregunta (puntos porcentuales)

### q_direction

| Opción | Antes | Después | Cambio |
|--------|-------|---------|--------|
| good_path | 39.0% | 13.0% | -26.0pp |
| bad_path | 53.0% | 85.0% | +32.0pp |
| no_response | 8.0% | 2.0% | -6.0pp |

### q_optimism

| Opción | Antes | Después | Cambio |
|--------|-------|---------|--------|
| optimistic | 49.0% | 26.0% | -23.0pp |
| pessimistic | 47.0% | 65.0% | +18.0pp |
| neutral | 0.0% | 0.0% | +0.0pp |
| no_response | 4.0% | 8.0% | +4.0pp |
| very_pessimistic | 0.0% | 1.0% | +1.0pp |

### q_economy_national

| Opción | Antes | Después | Cambio |
|--------|-------|---------|--------|
| good | 33.0% | 3.0% | -30.0pp |
| regular | 0.0% | 0.0% | +0.0pp |
| bad | 61.0% | 92.0% | +31.0pp |
| no_response | 6.0% | 2.0% | -4.0pp |
| very_bad | 0.0% | 3.0% | +3.0pp |

### q_economy_personal

| Opción | Antes | Después | Cambio |
|--------|-------|---------|--------|
| good | 50.0% | 12.0% | -38.0pp |
| regular | 0.0% | 0.0% | +0.0pp |
| bad | 42.0% | 83.0% | +41.0pp |
| no_response | 8.0% | 4.0% | -4.0pp |
| very_bad | 0.0% | 1.0% | +1.0pp |

## Cambios en Topic States

| Topic | Antes | Después | Delta |
|-------|-------|---------|-------|
| economy_national | -5.078 | -20.078 | -0.150 |
| economy_personal | -0.075 | -15.075 | -0.150 |
| country_optimism | 5.482 | -9.518 | -0.150 |
| country_direction | -0.800 | -15.800 | -0.150 |

## Resumen de Impacto

- **Agentes Afectados:** 100 / 100
- **Total Cambios:** 400
- **Cambios Promedio por Agente:** 4.00
- **Topics Más Afectados:** economy_national, economy_personal, country_optimism, country_direction

## Validación de Criterios

*Evento económico negativo debería afectar temas económicos*

| Criterio | Esperado | Resultado | Estado |
|----------|----------|-----------|--------|
| q_direction baja | Sí | Sí | ✅ |
| q_optimism baja | Sí | Sí | ✅ |
| q_economy_national empeora | Sí | Sí | ✅ |
| q_economy_personal empeora | Sí | No | ❌ |

## Veredicto Final: ✅ PASÓ

El sistema de eventos CADEM v1.2 está funcionando correctamente.
Los eventos económicos negativos generan los cambios esperados en las opiniones.

---
*Generado automáticamente por testEventImpactEndToEnd.ts*