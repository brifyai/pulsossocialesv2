# CADEM Opinion Engine v1.1 - Fase 1: Rollout Interno Controlado

**Fecha:** 27 de marzo, 2026  
**Estado:** 📋 **LISTO PARA EJECUCIÓN**  
**Fase:** 1 - Interno Controlado  
**Versión Motor:** v1.1 (Longitudinal Stable)

---

## Resumen Ejecutivo

Esta fase representa el primer paso de habilitación controlada de CADEM Opinion Engine v1.1 en un entorno de producción real, pero con restricciones de seguridad que permiten validar el comportamiento del motor sin riesgo para encuestas críticas.

**Objetivo:** Validar que el motor CADEM funciona correctamente en producción con:
- Muestra pequeña (100 agentes)
- Sin persistencia de estado (simplifica rollback)
- Usuarios internos/admin
- Monitoreo intensivo

---

## Parámetros de Fase 1

### Configuración Técnica

| Parámetro | Valor | Justificación |
|-----------|-------|---------------|
| **Sample Size** | 100 agentes | Suficiente para validar distribuciones, pequeño para rápida iteración |
| **Engine Mode** | `cadem` | Motor calibrado y validado |
| **Persist State** | `false` | Sin persistencia = rollback simple a legacy |
| **Engine Version** | `cadem-v1.1` | Versión congelada y aprobada |
| **Catalog Version** | `v1.0` | Catálogo canónico validado |

### Restricciones de Acceso

| Restricción | Valor |
|-------------|-------|
| **Rol requerido** | `admin` o `researcher` |
| **Habilitación** | Por encuesta, no global |
| **Ambiente** | Producción (con monitoreo) |
| **Rollback** | Inmediato cambiando `engine_mode` a `legacy` |

---

## Procedimiento de Ejecución

### Paso 1: Crear Encuesta de Fase 1

```sql
-- Insertar en survey_definitions
INSERT INTO survey_definitions (
  name,
  description,
  sample_size,
  engine_mode,
  metadata
) VALUES (
  'Fase 1 - Rollout Interno CADEM v1.1',
  'Primera validación controlada de CADEM en producción. 100 agentes, sin persistencia.',
  100,
  'cadem',
  {
    "engine_version": "cadem-v1.1",
    "persist_state": false,
    "catalog_version": "v1.0",
    "phase": "1",
    "phase_type": "internal_controlled",
    "created_by": "admin",
    "rollback_available": true,
    "monitoring_level": "intensive"
  }
);
```

### Paso 2: Ejecutar con Script Controlado

```bash
# Ejecutar Fase 1
npx tsx scripts/rollout/runPhase1Controlled.ts \
  --survey-id=<ID_DE_ENCUESTA> \
  --sample-size=100 \
  --monitoring=intensive
```

### Paso 3: Monitoreo en Tiempo Real

Durante la ejecución, monitorear:
- Completion rate (target: >90%)
- Errores por agente (target: <5%)
- Tiempo de respuesta (target: <2s por agente)
- Distribuciones vs benchmark (target: error <5pp)

---

## Métricas de Éxito

### Métricas Primarias (Obligatorias)

| Métrica | Umbral Mínimo | Umbral Óptimo | Estado |
|---------|---------------|---------------|--------|
| **Completion Rate** | >90% | >95% | ⬜ |
| **Error vs Benchmark** | <5pp | <3pp | ⬜ |
| **Coherencia Interna** | >80% | >85% | ⬜ |
| **Tiempo de Ejecución** | <300s | <180s | ⬜ |
| **Tasa de Error** | <5% | <2% | ⬜ |

### Métricas Secundarias (Deseables)

| Métrica | Umbral | Estado |
|---------|--------|--------|
| Confidence promedio | >75% | ⬜ |
| Distribución demográfica | Coincide con CASEN | ⬜ |
| Sin errores críticos | 0 | ⬜ |

---

## Criterios de Aprobación para Fase 2

### Para Aprobar Fase 1 y Pasar a Fase 2

**TODOS** estos criterios deben cumplirse:

- [ ] **Métricas primarias:** Todas dentro de umbrales mínimos
- [ ] **Sin errores críticos:** Ningún error que impida completar la encuesta
- [ ] **Consistencia:** Resultados coherentes con benchmarks esperados
- [ ] **Rollback exitoso:** Validar que cambiar a `engine_mode: 'legacy'` funciona
- [ ] **Documentación:** Issues menores documentados (si los hay)

### Si NO se Aprueba Fase 1

Si alguna métrica primaria falla:

1. **Documentar** el fallo con logs y métricas
2. **Analizar** si es problema de:
   - Configuración (ajustar y reintentar)
   - Motor (corregir bug, mantener en v1.1)
   - Infraestructura (resolver antes de continuar)
3. **Decisión:**
   - Si es configurable: Ajustar y reejecutar Fase 1
   - Si es bug: Corregir, revalidar en staging, reejecutar Fase 1
   - Si es infraestructura: Postergar rollout hasta resolver

---

## Plan de Rollback

### Escenarios de Rollback

| Escenario | Acción | Tiempo |
|-----------|--------|--------|
| Error crítico durante ejecución | Abortar y cambiar `engine_mode` a `legacy` | <5 min |
| Métricas fuera de umbral post-ejecución | Deshabilitar encuesta, crear nueva con `legacy` | <15 min |
| Problema descubierto días después | Actualizar `engine_mode` en BD, reejecutar | <30 min |

### Procedimiento de Rollback

```sql
-- Rollback inmediato
UPDATE survey_definitions
SET 
  engine_mode = 'legacy',
  metadata = jsonb_set(
    metadata,
    '{rollback_reason}',
    '"Métricas fuera de umbral"'
  )
WHERE id = '<SURVEY_ID>';
```

---

## Checklist Pre-Ejecución

Antes de ejecutar Fase 1, verificar:

- [ ] Supabase está operativo y accesible
- [ ] Tabla `synthetic_agents` tiene ≥100 agentes
- [ ] Catálogo de preguntas está disponible
- [ ] Benchmarks de referencia están actualizados
- [ ] Script `runPhase1Controlled.ts` está probado
- [ ] Dashboard de monitoreo está accesible
- [ ] Equipo de rollback está disponible

---

## Checklist Post-Ejecución

Después de ejecutar Fase 1:

- [ ] Recolectar todas las métricas
- [ ] Comparar con benchmarks
- [ ] Documentar desviaciones (si las hay)
- [ ] Validar procedimiento de rollback
- [ ] Decisión: ¿Aprobar para Fase 2?
- [ ] Actualizar este documento con resultados

---

## Escalamiento de Issues

| Severidad | Respuesta | Acción |
|-----------|-----------|--------|
| **Crítica** | Inmediata | Rollback + investigación |
| **Alta** | <2 horas | Evaluar si bloquea Fase 2 |
| **Media** | <24 horas | Documentar, planificar fix |
| **Baja** | <1 semana | Backlog v1.2 |

---

## Documentación Relacionada

- [STATUS_SUMMARY_V1_1.md](./STATUS_SUMMARY_V1_1.md) - Estado del motor
- [CADEM_PRODUCTION_ROLLOUT_PLAN.md](./CADEM_PRODUCTION_ROLLOUT_PLAN.md) - Plan completo
- [ROADMAP_V1_2_EVENTS.md](./ROADMAP_V1_2_EVENTS.md) - Próximas capacidades

---

## Resultados de Fase 1 (Completar post-ejecución)

### Fecha de Ejecución
<!-- Completar: YYYY-MM-DD -->

### Métricas Obtenidas

| Métrica | Valor Obtenido | Umbral | Estado |
|---------|----------------|--------|--------|
| Completion Rate | <!-- % --> | >90% | ⬜ |
| Error vs Benchmark | <!-- pp --> | <5pp | ⬜ |
| Coherencia Interna | <!-- % --> | >80% | ⬜ |
| Tiempo de Ejecución | <!-- s --> | <300s | ⬜ |
| Tasa de Error | <!-- % --> | <5% | ⬜ |

### Decisión

- [ ] **APROBADO** - Proceder a Fase 2
- [ ] **RECHAZADO** - Requiere ajustes

### Notas y Observaciones

<!-- Completar con cualquier observación relevante -->

---

## Mejoras Implementadas

### Sampleo por Cuotas Tipo Cadem

**Cambio realizado:** El script `runPhase1Controlled.ts` ahora implementa sampleo por cuotas en lugar de muestreo aleatorio simple.

**Cuotas aplicadas:**
- **Región:** RM 40%, Valparaíso 10%, Biobío 10%, Otros 40%
- **Sexo:** Masculino 48%, Femenino 52%
- **Edad:** 18-34 30%, 35-54 35%, 55+ 35%

**Implementación:**
```typescript
function applyCademQuotas(agents: any[], targetSize: number): any[] {
  // Estratificación por región, sexo y grupo etario
  // Prioriza región, luego completa con aleatorios si es necesario
}
```

**Nota:** Esta es una implementación básica. Para futuras fases se recomienda:
- Cuotas más sofisticadas (educación, ingreso)
- Validación post-sampleo contra distribuciones CASEN
- Ajuste dinámico de cuotas según disponibilidad de agentes

---

*Documento creado: 27 de marzo, 2026*  
*Versión: 1.1*  
*Estado: Listo para ejecución*
