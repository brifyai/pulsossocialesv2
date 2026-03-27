# Benchmark Comparison desde Supabase

**Fecha:** 2026-03-27T13:08:33.073Z

**Muestra:** 1000 agentes reales de Supabase

**Motor:** CADEM v1.1 (con catálogo canónico)

**Catálogo:** 1.0.0

---

## Resumen

- **MAE promedio:** 3.4%
- **Máxima diferencia:** 10.6%
- **Preguntas analizadas:** 5

## Comparación por Pregunta

| Pregunta | MAE | Max Diff |
|----------|-----|----------|
| q_approval | 7.1% | 10.600000000000001% |
| q_direction | 6.4% | 9.200000000000003% |
| q_optimism | 1.6% | 1.7000000000000028% |
| q_economy_national | 1.6% | 2.299999999999997% |
| q_economy_personal | 0.2% | 0.29999999999999716% |

## Detalle por Pregunta

### q_approval

**Ahora. Independiente de su posición política, ¿Usted aprueba o desaprueba la forma cómo José Antonio Kast está conduciendo su Gobierno?**

- MAE: 7.1%
- Máxima diferencia: 10.600000000000001%

| Respuesta | Benchmark | Simulación | Diferencia |
|-----------|-----------|------------|------------|
| approve | 57% | 53.2% | 3.8% |
| disapprove | 34% | 44.6% | 10.6% |
| no_response | 9% | 2.2% | 6.8% |

### q_direction

**Ahora, pensando en todos los aspectos políticos, económicos y sociales, ¿Usted cree que el país va por un buen camino o por un mal camino?**

- MAE: 6.4%
- Máxima diferencia: 9.200000000000003%

| Respuesta | Benchmark | Simulación | Diferencia |
|-----------|-----------|------------|------------|
| good_path | 49% | 52.6% | 3.6% |
| bad_path | 35% | 44.2% | 9.2% |

### q_optimism

**En general, ¿Cómo se siente usted acerca del futuro del país?**

- MAE: 1.6%
- Máxima diferencia: 1.7000000000000028%

| Respuesta | Benchmark | Simulación | Diferencia |
|-----------|-----------|------------|------------|
| optimistic_total | 62% | 60.5% | 1.5% |
| pessimistic_total | 34% | 35.7% | 1.7% |

### q_economy_national

**Usted cree que en el momento actual la economía chilena está...**

- MAE: 1.6%
- Máxima diferencia: 2.299999999999997%

| Respuesta | Benchmark | Simulación | Diferencia |
|-----------|-----------|------------|------------|
| positive_total | 36% | 36.9% | 0.9% |
| negative_total | 62% | 59.7% | 2.3% |

### q_economy_personal

**¿Cómo calificaría usted la situación económica actual de usted y su familia?**

- MAE: 0.2%
- Máxima diferencia: 0.29999999999999716%

| Respuesta | Benchmark | Simulación | Diferencia |
|-----------|-----------|------------|------------|
| positive_total | 52% | 52.1% | 0.1% |
| negative_total | 44% | 44.3% | 0.3% |

