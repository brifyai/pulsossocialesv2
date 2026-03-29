# ROLLOUT FASE 3 v1.2 - ESCALAMIENTO A 500 AGENTES
## CADEM Opinion Engine v1.2 con Eventos Habilitados

**Versión:** 1.2  
**Fecha:** 2026-03-29  
**Estado:** 🔄 **EN PREPARACIÓN**  
**Sample Size:** 500 agentes  
**Motor:** CADEM v1.2 con eventos habilitados

---

## 📋 Resumen Ejecutivo

Este documento describe el escalamiento de Fase 3 v1.2 desde 100 agentes (completado exitosamente) hacia **500 agentes**, manteniendo el sistema de eventos habilitado y la persistencia de estados.

### Secuencia de Escalamiento v1.2
- ✅ **Fase 3 v1.2 - 100 agentes:** COMPLETADO (100% completion, 82.6% confidence, 73s)
- 🔄 **Fase 3 v1.2 - 200 agentes:** PENDIENTE (prueba intermedia)
- 🔄 **Fase 3 v1.2 - 500 agentes:** EN PREPARACIÓN (este documento)

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

## 🚀 Procedimiento de Ejecución

### Pre-requisitos
1. ✅ Fase 3 v1.2 con 100 agentes completada exitosamente
2. ✅ Eventos de prueba disponibles en `weekly_events` para semana 2026-W13
3. ✅ Scripts actualizados para soportar 500 agentes
4. ✅ Conexión estable a Supabase

### Paso 1: Crear Encuesta para 500 Agentes
```bash
npx tsx scripts/rollout/createPhase3V12Survey.ts \
  --use-events=true \
  --event-week-key=2026-W13 \
  --persist-state=true \
  --sample-size=500
```

**Output esperado:**
- Survey ID generado
- 3 preguntas embebidas
- Sample size: 500
- `useEvents: true` en configuración
- `persistState: true` en configuración
- Status: draft

### Paso 2: Ejecutar Encuesta con Monitoreo Intensivo
```bash
npx tsx scripts/rollout/runPhase3V12Controlled.ts \
  --survey-id=<SURVEY_ID> \
  --sample-size=500 \
  --use-events=true \
  --event-week-key=2026-W13 \
  --persist-state=true \
  --monitoring=intensive
```

**Nota importante:** 
- La ejecución tomará aproximadamente 8-10 minutos
- Monitoreo intensivo verifica cada 10% de progreso
- Si confidence baja de 75%, se reportará como observación
- Si confidence baja de 55%, abortar inmediatamente

### Paso 3: Verificar Resultados
El script automáticamente:
1. Guarda resultados en `data/rollout/phase3_v12_500_result_<id>_<timestamp>.json`
2. Actualiza el survey_run en Supabase
3. Muestra métricas incluyendo:
   - Distribución de respuestas por pregunta
   - Porcentaje de no_response
   - Confidence promedio
   - Eventos aplicados
   - Cambios vs baseline

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

## 📝 Post-Ejecución

### Si Escalamiento a 500 es APROBADO

1. ✅ Documentar resultados en este archivo
2. ✅ Actualizar estado a APROBADO
3. ✅ Comparar métricas vs Fase 3 v1.2 - 100 agentes
4. ✅ Evaluar si se mantiene confidence > 75%
5. Planificar siguiente fase: 1,000 agentes con eventos

### Si Escalamiento REQUIERE REVISIÓN

1. Analizar métricas y logs
2. Identificar si el issue es:
   - De eventos (rollback a v1.1)
   - De volumen (optimizar pipeline)
   - De configuración (ajustar parámetros)
3. Decidir: ajustar y reintentar o rollback

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

> **🔄 ESTADO:** En preparación - listo para ejecución cuando se apruebe
