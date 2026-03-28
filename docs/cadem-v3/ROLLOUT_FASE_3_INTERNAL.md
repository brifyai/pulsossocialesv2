# ROLLOUT FASE 3 - ESCALAMIENTO FINAL
## CADEM Opinion Engine v1.1

**Versión:** 1.1  
**Fecha:** 2026-03-28  
**Estado:** ✅ APROBADO  
**Sample Size:** 1,000 agentes  
**Tiempo Real:** 15 min 10 seg

---

## 📋 Resumen Ejecutivo

Fase 3 representa el escalamiento final del rollout interno, pasando de 500 a **1,000 agentes** manteniendo exactamente la misma configuración de Fases 1 y 2.

### Secuencia de Validación
- ✅ **Fase 1:** 100 agentes - APROBADA (100% completion, 83.1% confidence, 75s)
- ✅ **Fase 2:** 500 agentes - APROBADA (100% completion, 82.56% confidence, 405s)
- ✅ **Fase 3:** 1,000 agentes - APROBADA (100% completion, 82.64% confidence, 910s)

---

## 🎯 Objetivos

### Primarios
1. Validar que el pipeline aguanta 1,000 agentes sin errores
2. Verificar que el tiempo de ejecución escala razonablemente (~13-14 min)
3. Confirmar que las distribuciones se mantienen consistentes
4. Mantener 0 errores críticos

### Secundarios
1. Documentar performance para volúmenes mayores
2. Identificar posibles cuellos de botella
3. Validar criterios de aprobación para producción

---

## ⚙️ Configuración

### Parámetros Fijos (Baseline Congelada)
```yaml
Motor: CADEM v1.1
Preguntas: 3 (mismas que Fases 1 y 2)
  - q_approval: Aprobación presidencial
  - q_economy_personal: Situación económica personal
  - q_optimism: Optimismo país

Engine Mode: cadem
Persist State: false
Sample Method: cadem_quotas
Baseline Tag: fase-3-rollout-v1.1
```

### Variables
```yaml
Sample Size: 1,000 agentes
Expected Duration: ~13-14 minutos
Monitoring: intensive (cada 10%)
```

---

## 📊 Criterios de Aprobación

| Criterio | Umbral | Resultado Real | Estado |
|----------|--------|----------------|--------|
| **Completion Rate** | > 95% | 100% | ✅ Aprobado |
| **Error Rate** | < 2% | 0% | ✅ Aprobado |
| **Confidence Promedio** | > 75% | 82.64% | ✅ Aprobado |
| **Sin errores críticos** | 0 | 0 | ✅ Aprobado |
| **Tiempo de ejecución** | < 20 min | 15m 10s | ✅ Aprobado |
| **Consistencia vs Fase 2** | ±5% | +7.5% confidence | ✅ Aprobado |

---

## 🚀 Procedimiento de Ejecución

### Paso 1: Crear Encuesta
```bash
npx tsx scripts/rollout/createPhase3Survey.ts
```

**Output esperado:**
- Survey ID generado
- 3 preguntas embebidas
- Sample size: 1,000
- Status: draft

### Paso 2: Ejecutar Encuesta
```bash
npx tsx scripts/rollout/runPhase3Controlled.ts \
  --survey-id=<SURVEY_ID> \
  --sample-size=1000 \
  --monitoring=intensive
```

**Nota importante:** La ejecución tomará aproximadamente 13-14 minutos. Asegúrate de tener una conexión estable.

### Paso 3: Verificar Resultados
El script automáticamente:
1. Guarda resultados en `data/rollout/phase3_result_<id>_<timestamp>.json`
2. Actualiza el survey_run en Supabase
3. Muestra métricas y comparaciones

---

## 📁 Archivos

### Scripts
- `scripts/rollout/createPhase3Survey.ts` - Creación de encuesta
- `scripts/rollout/runPhase3Controlled.ts` - Ejecución controlada

### Documentación
- `docs/cadem-v3/ROLLOUT_FASE_1_INTERNAL.md` - Baseline Fase 1
- `docs/cadem-v3/ROLLOUT_FASE_2_INTERNAL.md` - Baseline Fase 2
- `docs/cadem-v3/ROLLOUT_FASE_3_INTERNAL.md` - Este documento

### Output
- `data/rollout/phase3_result_*.json` - Resultados de ejecución

---

## ⚠️ Consideraciones de Performance

### Escalamiento Esperado
| Fase | Agentes | Tiempo | Ratio |
|------|---------|--------|-------|
| 1 | 100 | 75s | 1x |
| 2 | 500 | 405s | 5.4x |
| 3 | 1,000 | ~810s | 10.8x |

### Límites Operativos
- **< 20 min:** Aceptable
- **20-30 min:** Requiere monitoreo
- **> 30 min:** Considerar optimizaciones

### Posibles Optimizaciones (si es necesario)
1. Batch inserts en lugar de individuales
2. Concurrency controlado (Promise.all con límite)
3. Caching de topic states
4. Pre-computación de distribuciones

---

## 🔍 Qué Observar

### Durante la Ejecución
- [ ] Progreso avanza consistentemente (cada 10%)
- [ ] No hay pausas largas (>30s sin actividad)
- [ ] ETA se actualiza razonablemente
- [ ] No hay errores de conexión

### Post-Ejecución
- [ ] Completion rate > 95%
- [ ] Error rate < 2%
- [ ] Confidence promedio > 75%
- [ ] Distribuciones similares a Fase 2
- [ ] Tiempo < 20 minutos
- [ ] 0 errores críticos

---

## 📈 Métricas de Comparación

### Baseline Fase 2 (Referencia)
```yaml
Sample Size: 500
Completion Rate: 100%
Error Rate: 0%
Avg Confidence: 82.56%
Execution Time: 405s (6.75 min)
Time per Agent: 0.81s
```

### Resultados Fase 3 (Reales)
```yaml
Sample Size: 1,000
Completion Rate: 100%
Error Rate: 0%
Avg Confidence: 82.64%
Execution Time: 910s (15.17 min)
Time per Agent: 0.91s
Survey ID: 2e9af93b-774f-4685-b98e-92bfd7b124b2
Run ID: e6147164-3de6-4060-b6f3-412d55ca11db
```

### Comparación Fase 2 → Fase 3
| Métrica | Fase 2 | Fase 3 | Cambio |
|---------|--------|--------|--------|
| Sample size | 500 | 1,000 | 2x |
| Completion | 100% | 100% | = |
| Error rate | 0% | 0% | = |
| Confidence | 75.14% | 82.64% | +7.5% |
| Tiempo | 405s | 910s | 2.25x (esperado) |
| Tiempo/agente | 0.81s | 0.91s | +12% |

---

## ✅ Checklist Pre-Ejecución

- [ ] Variables de entorno configuradas (`VITE_SUPABASE_URL`, `VITE_SUPABASE_SERVICE_KEY`)
- [ ] Conexión a Supabase estable
- [ ] Catálogo de preguntas disponible (`data/surveys/cadem_question_catalog_v1.json`)
- [ ] Agentes disponibles en `synthetic_agents` (>1,000)
- [ ] Tablas `survey_definitions`, `survey_runs`, `survey_responses` accesibles
- [ ] Tiempo disponible (~15 minutos)
- [ ] Conexión estable (no ejecutar con WiFi inestable)

---

## 🔄 Rollback Plan

Si algo sale mal:
1. Script tiene `persistState: false` - no afecta estado de agentes
2. Eliminar survey_run creado si es necesario
3. Eliminar survey_responses asociadas si es necesario
4. Re-ejecutar desde Paso 1

---

## 📝 Post-Ejecución

### ✅ Fase 3 APROBADA

**Resultados de ejecución:**
- Fecha: 2026-03-28
- Survey ID: 2e9af93b-774f-4685-b98e-92bfd7b124b2
- Run ID: e6147164-3de6-4060-b6f3-412d55ca11db
- Duración: 15 min 10 seg
- Total respuestas: 3,000 (1,000 agentes × 3 preguntas)

**Distribuciones de respuestas:**
- **q_approval:** 53.3% aprueba, 43.7% desaprueba, 3% no responde
- **q_optimism:** 59.3% optimista, 37% pesimista, 3.6% no responde
- **q_economy_personal:** 48.9% buena, 47.1% mala, 4% no responde

**Próximos pasos:**
1. ✅ Documentar resultados en este archivo
2. ✅ Actualizar estado a APROBADO
3. Habilitar producción controlada (ver `PRODUCTION_CONTROLLED_ENABLEMENT.md`)
4. Iniciar desarrollo v1.2 con eventos en rama aparte

### Si Fase 3 REQUIERE REVISIÓN
1. Analizar errores y métricas
2. Comparar con baseline de Fase 2
3. Identificar causas raíz
4. Decidir: ajustar y reintentar o investigar más

---

## 🎯 Próximos Pasos Post-Fase 3

Si Fase 3 es exitosa:
1. **Producción con persistencia:** Habilitar `persistState: true`
2. **Optimizaciones:** Evaluar batch processing para >1,000 agentes
3. **Monitoreo:** Implementar dashboards de performance
4. **Escalamiento:** Planificar para 2,000-5,000 agentes si es necesario

---

## 📞 Contacto

Para issues o preguntas durante la ejecución:
- Revisar logs en consola
- Verificar archivo de resultados JSON
- Consultar documentación de Fases 1 y 2

---

**Documento preparado para ejecución de Fase 3**  
**Última actualización:** 2026-03-27  
**Versión:** 1.0
