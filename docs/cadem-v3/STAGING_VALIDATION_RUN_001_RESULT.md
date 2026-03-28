# Resultados Staging Validation Run 001

**Fecha de ejecución:** 27 de marzo de 2026, 02:28 p. m.  
**Survey ID:** 8a220499-a6a2-422c-aba8-936e0dcbb941  
**Run ID:** d87bcac0-047c-4414-9b46-12d324b875c8  
**Estado:** 🟡 PENDIENTE DE VALIDACIÓN MANUAL

---

## Resumen Ejecutivo

| Métrica | Valor |
|---------|-------|
| **Duración total** | 5.72s |
| **Total agentes** | 200 |
| **Total respuestas** | 600 |
| **Confidence promedio** | 81.9% |
| **Errores** | 0 |

### Configuración del Motor

| Parámetro | Valor |
|-----------|-------|
| **Engine Mode** | cadem |
| **Engine Version** | cadem-v1.1 |
| **Persist State** | false |
| **Sample Size** | 200 |

---

## Resultados por Pregunta

### q_approval

**Texto:** Ahora. Independiente de su posición política, ¿Usted aprueba o desaprueba la forma cómo José Antonio Kast está conduciendo su Gobierno?

| Respuesta | Benchmark | Real | Diferencia | Estado |
|-----------|-----------|------|------------|--------|
| disapprove | 34% | 43.5% | +9.5% | ⚠️ |
| approve | 57% | 54% | -3% | ✅ |
| no_response | 9% | 2.5% | -6.5% | ⚠️ |

**Confidence:** 82.0% (min: 70.0%, max: 95.0%)

---

### q_optimism

**Texto:** En general, ¿Cómo se siente usted acerca del futuro del país?

| Respuesta | Benchmark | Real | Diferencia | Estado |
|-----------|-----------|------|------------|--------|
| optimistic | 62% | 60.5% | -1.5% | ✅ |
| pessimistic | 34% | 35.5% | +1.5% | ✅ |
| very_optimistic | — | 1% | — | — |
| no_response | — | 3% | — | — |

**Confidence:** 82.0% (min: 70.0%, max: 95.0%)

---

### q_economy_personal

**Texto:** ¿Cómo calificaría usted la situación económica actual de usted y su familia?

| Respuesta | Benchmark | Real | Diferencia | Estado |
|-----------|-----------|------|------------|--------|
| bad | — | 42% | — | — |
| good | — | 55.5% | — | — |
| no_response | — | 2.5% | — | — |

**Confidence:** 82.0% (min: 70.0%, max: 95.0%)

---

## Métricas Globales vs Benchmarks

| Métrica | Valor | Target | Estado |
|---------|-------|--------|--------|
| **MAE (Error Absoluto Medio)** | 4.4% | < 5% | ✅ |
| **Máxima Diferencia** | 9.5% | < 10% | ✅ |
| **Tasa de Respuesta** | 100% | 100% | ✅ |

## Observaciones Automáticas

- ✅ Tiempo de ejecución dentro del rango esperado (5.7s).
- ✅ Confidence promedio aceptable (81.9%).
- ✅ MAE dentro del rango objetivo (< 5%).

## Datos Crudos

```json
{
  "surveyId": "8a220499-a6a2-422c-aba8-936e0dcbb941",
  "runId": "d87bcac0-047c-4414-9b46-12d324b875c8",
  "surveyName": "Staging Test 001 - CADEM Calibrated",
  "startedAt": "2026-03-27T17:28:05.346Z",
  "completedAt": "2026-03-27T17:28:11.065Z",
  "durationMs": 5719,
  "totalAgents": 200,
  "totalResponses": 600,
  "avgConfidence": 0.8193666666666675,
  "questions": {
    "q_approval": {
      "text": "Ahora. Independiente de su posición política, ¿Usted aprueba o desaprueba la forma cómo José Antonio Kast está conduciendo su Gobierno?",
      "responses": {
        "disapprove": 87,
        "approve": 108,
        "no_response": 5
      },
      "distribution": {
        "disapprove": 43.5,
        "approve": 54,
        "no_response": 2.5
      },
      "confidence": {
        "avg": 0.82,
        "min": 0.7,
        "max": 0.95
      }
    },
    "q_optimism": {
      "text": "En general, ¿Cómo se siente usted acerca del futuro del país?",
      "responses": {
        "optimistic": 121,
        "pessimistic": 71,
        "very_optimistic": 2,
        "no_response": 6
      },
      "distribution": {
        "optimistic": 60.5,
        "pessimistic": 35.5,
        "very_optimistic": 1,
        "no_response": 3
      },
      "confidence": {
        "avg": 0.82,
        "min": 0.7,
        "max": 0.95
      }
    },
    "q_economy_personal": {
      "text": "¿Cómo calificaría usted la situación económica actual de usted y su familia?",
      "responses": {
        "bad": 84,
        "good": 111,
        "no_response": 5
      },
      "distribution": {
        "bad": 42,
        "good": 55.5,
        "no_response": 2.5
      },
      "confidence": {
        "avg": 0.82,
        "min": 0.7,
        "max": 0.95
      }
    }
  },
  "metadata": {
    "engineMode": "cadem",
    "engineVersion": "cadem-v1.1",
    "persistState": false,
    "sampleSize": 200,
    "catalogVersion": "1.0.0"
  },
  "errors": []
}
```

---

## Checklist de Validación Manual

- [ ] Revisar distribuciones por pregunta
- [ ] Verificar que los valores están dentro de rangos esperados
- [ ] Confirmar que no hay valores anómalos
- [ ] Validar que el tiempo de ejecución es aceptable
- [ ] Revisar logs de Supabase por errores
- [ ] Verificar que las respuestas se guardaron correctamente
- [ ] Completar observaciones en STAGING_VALIDATION_RUN_001.md
- [ ] Tomar decisión: APROBADO / APROBADO CON OBSERVACIONES / RECHAZADO

---

## Referencias

- Documento de validación: [STAGING_VALIDATION_RUN_001.md](./STAGING_VALIDATION_RUN_001.md)
- Resultados JSON: [staging_validation_run_001_result.json](../../data/staging/staging_validation_run_001_result.json)
- Benchmark CADEM: [cadem_marzo_2026_master.json](../../data/benchmarks/cadem/normalized/cadem_marzo_2026_master.json)

---

*Reporte generado automáticamente el 2026-03-27T17:29:02.097Z*
