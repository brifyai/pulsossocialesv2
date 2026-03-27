# Benchmark Comparison desde Supabase

**Fecha:** 2026-03-27T04:09:23.978Z

**Muestra:** 1000 agentes reales de Supabase

**Motor:** CADEM v1.1 (con catálogo canónico)

**Catálogo:** 1.0.0

---

## Resumen

- **MAE promedio:** 14.1%
- **Máxima diferencia:** 45.2%
- **Preguntas analizadas:** 5

## Comparación por Pregunta

| Pregunta | MAE | Max Diff |
|----------|-----|----------|
| q_approval | 7.1% | 10.700000000000003% |
| q_direction | 7.5% | 14.299999999999997% |
| q_optimism | 4.9% | 5.399999999999999% |
| q_economy_national | 6.2% | 7.200000000000003% |
| q_economy_personal | 44.6% | 45.2% |

## Detalle por Pregunta

### q_approval

**Ahora. Independiente de su posición política, ¿Usted aprueba o desaprueba la forma cómo José Antonio Kast está conduciendo su Gobierno?**

- MAE: 7.1%
- Máxima diferencia: 10.700000000000003%

| Respuesta | Benchmark | Simulación | Diferencia |
|-----------|-----------|------------|------------|
| approve | 57% | 52.7% | 4.3% |
| disapprove | 34% | 44.7% | 10.7% |
| no_response | 9% | 2.6% | 6.4% |

### q_direction

**Ahora, pensando en todos los aspectos políticos, económicos y sociales, ¿Usted cree que el país va por un buen camino o por un mal camino?**

- MAE: 7.5%
- Máxima diferencia: 14.299999999999997%

| Respuesta | Benchmark | Simulación | Diferencia |
|-----------|-----------|------------|------------|
| good_path | 49% | 48.2% | 0.8% |
| bad_path | 35% | 49.3% | 14.3% |

### q_optimism

**En general, ¿Cómo se siente usted acerca del futuro del país?**

- MAE: 4.9%
- Máxima diferencia: 5.399999999999999%

| Respuesta | Benchmark | Simulación | Diferencia |
|-----------|-----------|------------|------------|
| optimistic_total | 62% | 57.6% | 4.4% |
| pessimistic_total | 34% | 39.4% | 5.4% |

### q_economy_national

**Usted cree que en el momento actual la economía chilena está...**

- MAE: 6.2%
- Máxima diferencia: 7.200000000000003%

| Respuesta | Benchmark | Simulación | Diferencia |
|-----------|-----------|------------|------------|
| positive_total | 36% | 41.1% | 5.1% |
| negative_total | 62% | 54.8% | 7.2% |

### q_economy_personal

**¿Cómo calificaría usted la situación económica actual de usted y su familia?**

- MAE: 44.6%
- Máxima diferencia: 45.2%

| Respuesta | Benchmark | Simulación | Diferencia |
|-----------|-----------|------------|------------|
| positive_total | 52% | 97.2% | 45.2% |
| negative_total | 44% | 0.1% | 43.9% |

