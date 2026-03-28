# Benchmark Comparison desde Supabase

**Fecha:** 2026-03-27T16:42:05.245Z

**Muestra:** 1000 agentes reales de Supabase

**Motor:** CADEM v1.1 (con catálogo canónico)

**Catálogo:** 1.0.0

---

## Resumen

- **MAE promedio:** 3.2%
- **Máxima diferencia:** 12.2%
- **Preguntas analizadas:** 5

## Comparación por Pregunta

| Pregunta | MAE | Max Diff |
|----------|-----|----------|
| q_approval | 7.2% | 10.799999999999997% |
| q_direction | 6.6% | 12.200000000000003% |
| q_optimism | 0.1% | 0.20000000000000284% |
| q_economy_national | 1.5% | 2.5% |
| q_economy_personal | 0.6% | 1% |

## Detalle por Pregunta

### q_approval

**Ahora. Independiente de su posición política, ¿Usted aprueba o desaprueba la forma cómo José Antonio Kast está conduciendo su Gobierno?**

- MAE: 7.2%
- Máxima diferencia: 10.799999999999997%

| Respuesta | Benchmark | Simulación | Diferencia |
|-----------|-----------|------------|------------|
| approve | 57% | 52.9% | 4.1% |
| disapprove | 34% | 44.8% | 10.8% |
| no_response | 9% | 2.3% | 6.7% |

### q_direction

**Ahora, pensando en todos los aspectos políticos, económicos y sociales, ¿Usted cree que el país va por un buen camino o por un mal camino?**

- MAE: 6.6%
- Máxima diferencia: 12.200000000000003%

| Respuesta | Benchmark | Simulación | Diferencia |
|-----------|-----------|------------|------------|
| good_path | 49% | 49.9% | 0.9% |
| bad_path | 35% | 47.2% | 12.2% |

### q_optimism

**En general, ¿Cómo se siente usted acerca del futuro del país?**

- MAE: 0.1%
- Máxima diferencia: 0.20000000000000284%

| Respuesta | Benchmark | Simulación | Diferencia |
|-----------|-----------|------------|------------|
| optimistic_total | 62% | 61.8% | 0.2% |
| pessimistic_total | 34% | 34% | 0% |

### q_economy_national

**Usted cree que en el momento actual la economía chilena está...**

- MAE: 1.5%
- Máxima diferencia: 2.5%

| Respuesta | Benchmark | Simulación | Diferencia |
|-----------|-----------|------------|------------|
| positive_total | 36% | 36.5% | 0.5% |
| negative_total | 62% | 59.5% | 2.5% |

### q_economy_personal

**¿Cómo calificaría usted la situación económica actual de usted y su familia?**

- MAE: 0.6%
- Máxima diferencia: 1%

| Respuesta | Benchmark | Simulación | Diferencia |
|-----------|-----------|------------|------------|
| positive_total | 52% | 51.9% | 0.1% |
| negative_total | 44% | 45% | 1% |

