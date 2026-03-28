# Habilitación Controlada CADEM v1.1 en Producción

**Estado:** APROBADO  
**Fecha:** 2026-03-28  
**Versión motor:** CADEM v1.1  
**Rollout interno:** Fases 1-3 completadas ✅

---

## Resumen Ejecutivo

El motor CADEM v1.1 ha sido validado operativamente hasta 1,000 agentes con:
- ✅ Completion rate: 100%
- ✅ Error rate: 0%
- ✅ Confidence promedio: 82.64%
- ✅ Tiempo de ejecución: ~15 minutos para 1,000 agentes
- ✅ Distribuciones coherentes y estables

Este documento define los criterios y procedimientos para habilitar CADEM en producción controlada.

---

## Alcance de Habilitación

### ✅ Qué SÍ está habilitado

| Característica | Estado | Notas |
|----------------|--------|-------|
| Motor CADEM v1.1 | ✅ Activo | `engineMode: cadem` |
| Encuestas políticas/económicas | ✅ Permitidas | Temas calibrados |
| Sample size hasta 1,000 | ✅ Aprobado | Límite validado |
| `persistState: false` | ✅ Default | Sin persistencia por ahora |
| Usuarios admin/researcher | ✅ Autorizados | Rol requerido |

### ❌ Qué NO está habilitado todavía

| Característica | Estado | Razón |
|----------------|--------|-------|
| Switch global a CADEM | ❌ No | Mantener dual mode |
| Retiro de legacy | ❌ No | Fallback necesario |
| `persistState: true` | ❌ No | Requiere más validación |
| v1.2 con eventos | ❌ No | En desarrollo aparte |
| Samples > 1,000 | ❌ No | No validado |

---

## Criterios de Elegibilidad

### Encuestas aptas para CADEM

Una encuesta puede usar CADEM si cumple:

1. **Tema calibrado:**
   - Aprobación presidencial
   - Optimismo económico
   - Situación económica personal
   - (Ver catálogo completo en `cadem_question_catalog_v1.json`)

2. **Sample size:**
   - Mínimo: 100 agentes
   - Máximo: 1,000 agentes

3. **Modo:**
   - `engineMode: cadem`
   - `persistState: false` (obligatorio)

4. **Usuario:**
   - Rol: `admin` o `researcher`
   - Aprobación explícita del equipo

### Encuestas que deben usar legacy

- Temas no calibrados
- Samples > 1,000 agentes
- Encuestas experimentales
- Casos donde se requiera `persistState: true`

---

## Procedimiento de Activación

### Paso 1: Evaluación de elegibilidad

```
Checklist:
□ Tema está en catálogo calibrado
□ Sample size ≤ 1,000
□ Usuario tiene rol adecuado
□ No requiere persistencia de estado
```

### Paso 2: Configuración

```sql
-- En survey_definitions
UPDATE survey_definitions
SET 
  engine_mode = 'cadem',
  persist_state = false,
  sample_size = <n>,
  updated_at = NOW(),
  updated_by = <user_id>
WHERE id = <survey_id>;
```

### Paso 3: Ejecución controlada

```bash
# Usar script de rollout controlado
npx tsx scripts/rollout/runCademProduction.ts \
  --survey-id=<uuid> \
  --sample-size=<n> \
  --monitoring=intensive
```

### Paso 4: Validación post-ejecución

```
Checklist:
□ Completion rate > 95%
□ Error rate < 2%
□ Confidence promedio > 75%
□ Distribuciones coherentes
□ Sin errores críticos
```

---

## Monitoreo y Alertas

### Métricas a monitorear

| Métrica | Umbral de alerta | Acción |
|---------|------------------|--------|
| Completion rate | < 95% | Revisar logs |
| Error rate | > 2% | Pausar y diagnosticar |
| Confidence | < 70% | Revisar calibración |
| Tiempo por agente | > 2s | Revisar performance |

### Logs y trazabilidad

- Toda ejecución CADEM se registra en `survey_runs`
- Resultados en `survey_responses`
- Archivos de resultado en `data/rollout/`

---

## Rollback

### Cuándo hacer rollback

- Error rate > 5%
- Completion rate < 90%
- Errores críticos no recuperables
- Distribuciones anómalas

### Procedimiento de rollback

```sql
-- Cambiar a legacy
UPDATE survey_definitions
SET 
  engine_mode = 'legacy',
  updated_at = NOW(),
  updated_by = <user_id>
WHERE id = <survey_id>;
```

```bash
# Re-ejecutar con legacy
npx tsx scripts/survey/runLegacySurvey.ts --survey-id=<uuid>
```

---

## Escalamiento

### Frecuencia de uso permitida

| Fase | Frecuencia | Condición |
|------|------------|-----------|
| Inicial | 1-2 encuestas/semana | Monitoreo intensivo |
| Estable | 5-10 encuestas/semana | Métricas saludables |
| Expandido | Sin límite | 4 semanas sin incidentes |

### Próxima expansión

- **v1.2 con eventos:** Desarrollo en rama aparte
- **Persistencia:** Validación en staging primero
- **Samples > 1,000:** Requiere Fase 4 de rollout

---

## Responsabilidades

| Rol | Responsabilidad |
|-----|-----------------|
| Admin | Aprobar uso, monitorear métricas, rollback |
| Researcher | Solicitar uso, validar resultados |
| Dev | Mantener scripts, diagnosticar issues |

---

## Historial de Decisiones

| Fecha | Decisión | Razón |
|-------|----------|-------|
| 2026-03-28 | Habilitar producción controlada | Fases 1-3 aprobadas |
| 2026-03-28 | Mantener dual mode | Fallback necesario |
| 2026-03-28 | No persistencia todavía | Requiere más validación |

---

## Referencias

- `ROLLOUT_FASE_1_INTERNAL.md`
- `ROLLOUT_FASE_2_INTERNAL.md`
- `ROLLOUT_FASE_3_INTERNAL.md`
- `CADEM_PRODUCTION_ROLLOUT_PLAN.md`
- `cadem_question_catalog_v1.json`

---

**Aprobado por:** Sistema de Rollout CADEM v1.1  
**Próxima revisión:** 2026-04-28 (1 mes)
