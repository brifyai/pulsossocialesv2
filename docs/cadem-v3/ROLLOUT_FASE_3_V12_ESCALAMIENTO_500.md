# ROLLOUT FASE 3 v1.2 - ESCALAMIENTO A 500 AGENTES
## CADEM Opinion Engine v1.2 con Eventos Habilitados

**Versión:** 1.2  
**Fecha:** 2026-03-29  
**Estado:** ✅ **APROBADO**  
**Sample Size:** 500 agentes  
**Motor:** CADEM v1.2 con eventos habilitados

---

## 📋 Resumen Ejecutivo

Este documento describe el escalamiento de Fase 3 v1.2 desde 100 agentes (completado exitosamente) hacia **500 agentes**, manteniendo el sistema de eventos habilitado y la persistencia de estados.

### Secuencia de Escalamiento v1.2
- ✅ **Fase 3 v1.2 - 100 agentes:** COMPLETADO (100% completion, 82.6% confidence, 73s)
- ✅ **Fase 3 v1.2 - 500 agentes:** COMPLETADO (100% completion, 82.4% confidence, 412s)

### Contexto de Aprobación Fase 2.5
La Fase 2.5 fue aprobada con observación debido a confidence de 55.6% (umbral: 75%). Sin embargo, Fase 3 v1.2 con 100 agentes mostró confidence de 82.6%, lo que valida que el sistema de eventos no degrada la calidad de respuestas.

---

## 🎯 Objetivos

### Primarios
1. Validar que el pipeline con eventos aguanta 500 agentes sin errores
2. Verificar que el tiempo de ejecución escala razonablemente (~8-10 min)
3. Confirmar que confidence se mantiene > 75% (criterio de vigilancia)
4. Mantener 0 errores críticos

### Secundarios
1. Medir impacto de eventos a escala mayor
2. Validar que no_response no excede 5%
3. Confirmar estabilidad de distribuciones vs baseline
4. Documentar performance para escenarios productivos

---

## ⚙️ Configuración

### Parámetros Fijos (Baseline Congelada)
```yaml
Motor: CADEM v1.2
Preguntas: 3 (mismas que Fases 1-3)
  - q_approval: Aprobación presidencial
  - q_economy_personal: Situación económica personal
  - q_optimism: Optimismo país

Engine Mode: cadem
Persist State: true
Use Events: true
Event Week Key: 2026-W13
Sample Method: cadem_quotas
Baseline Tag: fase-3-v12-escalamiento-500
```

### Variables
```yaml
Sample Size: 500 agentes
Expected Duration: ~8-10 minutos
Monitoring: intensive (cada 10%)
Rollback: inmediato disponible
```

---

## 📊 Criterios de Aprobación

### Criterios Estándar
| Criterio | Umbral | Estado Esperado |
|----------|--------|-----------------|
| **Completion Rate** | > 95% | ✅ Aprobar |
| **Error Rate** | < 2% | ✅ Aprobar |
| **Sin errores críticos** | 0 | ✅ Aprobar |
| **Tiempo de ejecución** | < 15 min | ✅ Aprobar |

### Criterios Específicos de Eventos
| Criterio | Umbral | Estado Esperado |
|----------|--------|-----------------|
| **no_response** | < 5% | ✅ Aprobar |
| **Events Applied** | > 0 | ✅ Aprobar |
| **Impact logs generados** | Sí | ✅ Aprobar |

### Criterios de Vigilancia (Observación Especial)
| Criterio | Umbral | Acción si falla |
|----------|--------|-----------------|
| **Confidence promedio** | > 75% | 🟡 Observación |
| **Confidence < 55%** | Cualquier pregunta | 🚨 Rollback inmediato |
| **Cambio de distribución** | > ±15 pp vs baseline | 🟡 Revisar |

### Criterios de Rollback (Abortar si ocurre)
| Criterio | Umbral | Acción |
|----------|--------|--------|
| **no_response > 10%** | Cualquier pregunta | 🚨 Rollback inmediato |
| **Error rate > 5%** | Global | 🚨 Rollback inmediato |
| **Completion < 90%** | Global | 🚨 Rollback inmediato |
| **Confidence < 55%** | Promedio | 🚨 Rollback inmediato |

---

## ✅ RESULTADOS DE EJECUCIÓN

### Ejecución Real - 29 de Marzo 2026

**Survey ID:** `46d9d0c3-bda8-487c-8924-7b83284d8ff7`  
**Run ID:** `a10ce970-c39a-4772-b169-8e35883cd696`  
**Fecha:** 2026-03-29  
**Estado:** ✅ **APROBADO CON OBSERVACIÓN MENOR**

### Métricas Principales

| Métrica | Valor | Umbral | Estado |
|---------|-------|--------|--------|
| **Completion Rate** | 100% | > 95% | ✅ Aprobado |
| **Error Rate** | 0% | < 2% | ✅ Aprobado |
| **Avg Confidence** | 82.4% | > 75% | ✅ Aprobado |
| **Sin errores críticos** | 0 | 0 | ✅ Aprobado |
| **Tiempo de ejecución** | 6.9 min | < 15 min | ✅ Aprobado |
| **no_response** | 1.8-3% | < 5% | ✅ Aprobado |
| **Events Applied** | 1500 | > 0 | ✅ Aprobado |

### Distribuciones por Pregunta

**q_approval (Aprobación):**
- approve: 257 (51.4%)
- disapprove: 234 (46.8%)
- no_response: 9 (1.8%)

**q_optimism (Optimismo):**
- optimistic: 303 (60.6%)
- pessimistic: 182 (36.4%)
- no_response: 15 (3%)

**q_economy_personal (Economía Personal):**
- good: 258 (51.6%)
- bad: 227 (45.4%)
- no_response: 15 (3%)

### Eventos Aplicados
- **Eventos cargados:** 3
  1. Anuncio de medidas económicas (economy, major)
  2. Protestas en la capital (social, moderate)
  3. Cambio de ministro (government, critical)
- **Eventos aplicados:** 1500 (3 × 500 agentes)
- **Impacto por topic:** 500 cada uno

### Distribución de Agentes
- Región 1 (RM): 160 (32%)
- Región 2: 85 (17%)
- Región 5: 135 (27%)
- Región 8: 7 (1%)
- Región 13: 113 (23%)

### Archivo de Resultados
`data/rollout/phase3_v12_result_46d9d0c3-bda8-487c-8924-7b83284d8ff7_1774757600612.json`

---

## 🚀 Procedimiento de Ejecución (Referencia)

### Comandos Ejecutados

**Paso 1: Crear Encuesta**
```bash
npx tsx scripts/rollout/createPhase3V12Survey.ts \
  --use-events=true \
  --event-week-key=2026-W13 \
  --persist-state=true \
  --sample-size=500
```

**Paso 2: Ejecutar Encuesta**
```bash
npx tsx scripts/rollout/runPhase3V12Controlled.ts \
  --survey-id=46d9d0c3-bda8-487c-8924-7b83284d8ff7 \
  --sample-size=500 \
  --use-events=true \
  --event-week-key=2026-W13 \
  --persist-state=true \
  --monitoring=intensive
```

---

## 📁 Archivos

### Scripts
- `scripts/rollout/createPhase3V12Survey.ts` - Creación de encuesta (actualizado para 500)
- `scripts/rollout/runPhase3V12Controlled.ts` - Ejecución controlada (soporta hasta 500)

### Documentación
- `docs/cadem-v3/ROLLOUT_FASE_3_EVENTS_V1_2.md` - Fase 3 v1.2 con 100 agentes (baseline)
- `docs/cadem-v3/ROLLOUT_FASE_3_V12_ESCALAMIENTO_500.md` - **Este documento**
- `docs/cadem-v3/ROLLOUT_FASE_2_5_INTERNAL.md` - Fase 2.5 (referencia de observación)

### Output
- `data/rollout/phase3_v12_500_result_*.json` - Resultados de ejecución

---

## ⚠️ Plan de Rollback

### Condiciones de Rollback Inmediato

Si ocurre cualquiera de estas condiciones durante la ejecución:

1. **no_response > 10%** en cualquier pregunta
2. **Error rate > 5%** global
3. **Completion rate < 90%**
4. **Confidence < 55%** promedio
5. **Comportamiento errático** observado (timeouts, errores de conexión masivos)

### Procedimiento de Rollback

```bash
# 1. Abortar ejecución actual (Ctrl+C si está corriendo)

# 2. Deshabilitar eventos en la encuesta
UPDATE survey_definitions 
SET config = jsonb_set(config, '{useEvents}', 'false')
WHERE id = '<SURVEY_ID>';

# 3. Re-ejecutar SIN eventos para validar baseline
npx tsx scripts/rollout/runPhase3Controlled.ts \
  --survey-id=<SURVEY_ID> \
  --sample-size=500 \
  --use-events=false \
  --persist-state=false

# 4. Documentar incidente
# Crear archivo: docs/cadem-v3/ROLLOUT_FASE_3_V12_500_ROLLBACK.md
```

---

## 🔍 Qué Observar

### Durante la Ejecución
- [ ] Progreso avanza consistentemente (cada 10%)
- [ ] No hay pausas largas (>30s sin actividad)
- [ ] ETA se actualiza razonablemente
- [ ] No hay errores de conexión masivos
- [ ] Tiempo por agente similar a Fase 3 v1.2 100 agentes (~0.7s)

### Post-Ejecución (Inmediato)
- [ ] Completion rate > 95%
- [ ] Error rate < 2%
- [ ] no_response < 5% en todas las preguntas
- [ ] Confidence promedio > 75% (🟡 si 55-75%, 🚨 si < 55%)
- [ ] Eventos aplicados > 0
- [ ] Impact logs generados en `event_impact_logs`

### Post-Ejecución (Análisis)
- [ ] Distribuciones de respuestas razonables
- [ ] Cambios en dirección esperada por eventos
- [ ] Sin errores críticos
- [ ] Tiempo de ejecución < 15 minutos

---

## 📈 Métricas de Comparación

### Baseline Fase 3 v1.2 - 100 Agentes (Referencia)
```yaml
Sample Size: 100
Completion Rate: 100%
Error Rate: 0%
Avg Confidence: 82.6%
no_response: ~4-5%
Execution Time: 73s (1.2 min)
Events Applied: 300 (100%)
```

### Resultados Esperados Fase 3 v1.2 - 500 Agentes
```yaml
Sample Size: 500
Completion Rate: > 95%
Error Rate: < 2%
Avg Confidence: > 75% (🟡 observación si 55-75%)
no_response: < 5%
Events Applied: > 0
Execution Time: ~8-10 min
```

### Escalamiento Esperado
| Fase | Agentes | Tiempo Esperado | Ratio |
|------|---------|-----------------|-------|
| v1.2 - 100 | 100 | 73s | 1x |
| v1.2 - 500 | 500 | ~400-500s | 5.5-6.8x |

---

## ✅ Checklist Pre-Ejecución

### Configuración de Entorno
- [ ] Variables de entorno configuradas (`VITE_SUPABASE_URL`, `VITE_SUPABASE_SERVICE_KEY`)
- [ ] Conexión a Supabase estable
- [ ] Conexión estable (no ejecutar con WiFi inestable)
- [ ] Tiempo disponible (~15 minutos para 500 agentes)

### Infraestructura de Eventos
- [ ] Eventos de prueba creados en `weekly_events` para semana 2026-W13
- [ ] Verificar que `event_week_key` corresponde a eventos reales cargados

### Validación Previa
- [ ] Fase 3 v1.2 con 100 agentes completada exitosamente
- [ ] Scripts actualizados y probados
- [ ] Plan de rollback documentado

---

## 📝 Análisis Post-Ejecución

### ✅ Resultado: APROBADO CON OBSERVACIÓN MENOR

**Veredicto:** CADEM v1.2 con eventos está **validada operativamente a 500 agentes**.

### Comparación vs Fase 3 v1.2 - 100 Agentes

| Métrica | 100 Agentes | 500 Agentes | Diferencia |
|---------|-------------|-------------|------------|
| Completion Rate | 100% | 100% | = |
| Error Rate | 0% | 0% | = |
| Avg Confidence | 82.6% | 82.4% | -0.2% |
| no_response | ~4-5% | 1.8-3% | Mejoró |
| Execution Time | 73s | 412s | 5.6x |
| Events Applied | 300 | 1500 | 5x |

### Observaciones

1. **Confidence se mantuvo estable** (82.4% vs 82.6%): El sistema de eventos no degrada la calidad de respuestas a escala.

2. **no_response mejoró** (1.8-3% vs 4-5%): Las respuestas son más completas con 500 agentes.

3. **Tiempo de ejecución** (6.9 min): Dentro del rango aceptable (< 15 min). El ratio de escalamiento es 5.6x para 5x agentes, lo cual es razonable.

4. **Distribuciones sanas**: Las distribuciones de respuestas son razonables y no muestran signos de colapso o sobreimpacto.

### 🟡 Observación Menor

El tiempo de ejecución (6.9 min) excedió ligeramente la expectativa original de 5 min, pero esto es **aceptable** dado:
- El volumen aumentó a 500 agentes
- Hay procesamiento de eventos activo
- Hay persistencia de estados habilitada
- El sistema se mantuvo estable

**Recomendación:** Monitorear el tiempo si se escala a 1,000 agentes en el futuro.

### Próximos Pasos

1. ✅ **Fase 3 v1.2 - 500 agentes:** COMPLETADO Y APROBADO
2. 🔄 **Decisión:** Evaluar si escalar a 1,000 agentes o consolidar operación con 500
3. 📝 **Documentación:** Actualizar FINAL_DECISION_V1_2.md con el veredicto final

---

## 🎯 Próximos Pasos Post-Escalamiento

### Si 500 agentes aprueba:
1. Ejecutar con 1,000 agentes
2. Documentar comportamiento a escala completa
3. Evaluar habilitación de eventos por defecto en producción

### Si todas las escalas aprueban:
1. **Evaluación:** Analizar si conviene hacer `useEvents: true` por defecto
2. **Decisión:** Documentar pros/contras de habilitar eventos globalmente
3. **UI de gestión de eventos:** Crear interfaz para administrar eventos
4. **Monitoreo:** Implementar dashboards de impacto de eventos

---

## 📞 Contacto

Para issues o preguntas durante la ejecución:
- Revisar logs en consola
- Verificar archivo de resultados JSON
- Consultar documentación de Fase 3 v1.2 con 100 agentes
- Revisar criterios de vigilancia de confidence

---

## 🎓 Notas Importantes

### Sobre Confidence (Criterio de Vigilancia)

Basado en la experiencia de Fase 2.5 (confidence 55.6%), se establece:

- **Confidence > 75%:** ✅ Aprobado sin observaciones
- **Confidence 55-75%:** 🟡 Aprobado con observación - monitorear en siguientes fases
- **Confidence < 55%:** 🚨 Rechazado - rollback inmediato

### Sobre Escalamiento

El escalamiento de 100 a 500 agentes (5x) debería mantener:
- Mismo completion rate (> 95%)
- Mismo error rate (< 2%)
- Confidence similar (±10%)
- Tiempo proporcional (~5-7x)

Si alguna métrica se degrada significativamente, investigar cuellos de botella.

---

**Documento preparado para escalamiento a 500 agentes con eventos v1.2**  
**Última actualización:** 2026-03-29  
**Versión:** 1.0

> **✅ ESTADO:** APROBADO - CADEM v1.2 con eventos validada operativamente a 500 agentes

---

## 🎯 Conclusión

**CADEM Opinion Engine v1.2 con eventos ha sido validada operativamente para 500 agentes.**

- ✅ El pipeline aguanta 500 agentes sin errores
- ✅ Confidence se mantiene > 75% (82.4%)
- ✅ Eventos aplicados correctamente (1500)
- ✅ Distribuciones sanas y razonables
- ✅ Persistencia operando correctamente
- 🟡 Tiempo de ejecución aceptable (6.9 min)

**Estado:** Aprobada para producción controlada con eventos, con observación menor de performance a 500 agentes, sin impacto crítico en calidad ni estabilidad.
