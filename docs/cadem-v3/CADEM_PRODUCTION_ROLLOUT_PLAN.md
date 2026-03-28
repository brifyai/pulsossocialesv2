# Plan de Habilitación Controlada - CADEM en Producción

**Fecha:** 27 de marzo, 2026  
**Versión:** v1.1.0 (Frozen)  
**Estado:** Listo para rollout controlado

---

## Resumen Ejecutivo

Este documento define el plan para habilitar el motor CADEM v1.1 en producción de manera controlada, con feature flags, monitoreo y límites de seguridad.

**Objetivo:** Permitir uso de CADEM en encuestas seleccionadas sin afectar el sistema legacy.

---

## Arquitectura de Feature Flags

### Flag Principal: `engine_mode`

Ubicación: `survey_definitions.engine_mode`

Valores posibles:
- `'legacy'` (default) - Motor sintético tradicional
- `'cadem'` - Motor CADEM v1.1
- `'auto'` - Selección automática (futuro)

### Implementación en Base de Datos

```sql
-- La columna ya existe (migración 20260326_add_engine_mode_to_surveys.sql)
-- Verificar:
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'survey_definitions'
  AND column_name = 'engine_mode';
```

### Lógica de Selección en Código

```typescript
// src/app/survey/surveyService.ts
async function runSurvey(surveyId: string, options: RunOptions): Promise<RunResult> {
  const survey = await surveyRepository.getById(surveyId);
  
  // Determinar motor
  const engineMode = survey.engine_mode || 'legacy';
  
  switch (engineMode) {
    case 'cadem':
      return await runCademSurvey(survey, options);
    case 'legacy':
    default:
      return await runLegacySurvey(survey, options);
  }
}
```

---

## Fases de Rollout

### Fase 0: Preparación (Día 0)

**Tareas:**
- [ ] Verificar que `engine_mode` existe en survey_definitions
- [ ] Confirmar que dualModeAdapter funciona correctamente
- [ ] Revisar logs de staging (sin errores)
- [ ] Preparar dashboard de monitoreo

**Validación:**
```bash
# Verificar columna
psql $DATABASE_URL -c "\d survey_definitions" | grep engine_mode

# Verificar índices
psql $DATABASE_URL -c "SELECT * FROM pg_indexes WHERE tablename = 'survey_definitions'"
```

---

### Fase 1: Pilotos Internos (Día 1-3)

**Criterios de selección de encuestas piloto:**
- Encuestas internas (no públicas)
- Máximo 100 agentes
- Temas no sensibles
- Con benchmark conocido para validación

**Encuestas candidatas:**
1. **Encuesta de prueba semanal** - Aprobación presidencial
2. **Encuesta económica interna** - Percepción económica
3. **Encuesta de satisfacción** - Uso interno

**Configuración:**
```sql
-- Habilitar CADEM para encuesta piloto
UPDATE survey_definitions
SET engine_mode = 'cadem',
    updated_at = NOW(),
    updated_by = 'admin'
WHERE id = 'PILOT_SURVEY_ID'
  AND status = 'draft'; -- Solo encuestas en draft
```

**Monitoreo:**
- Completion rate cada 30 minutos
- Error logs en tiempo real
- Comparación con benchmark esperado

---

### Fase 2: Pilotos con Usuarios Limitados (Día 4-7)

**Expansión:**
- Usuarios específicos (whitelist)
- Encuestas de tracking político
- Máximo 500 agentes

**Whitelist de usuarios:**
```typescript
// src/services/auth/cademAccess.ts
const CADEM_ALLOWED_USERS = [
  'user1@company.com',
  'user2@company.com',
  // ... usuarios autorizados
];

export function canUseCadem(user: User): boolean {
  return CADEM_ALLOWED_USERS.includes(user.email) &&
         user.role === 'researcher';
}
```

**Configuración de encuestas:**
```sql
-- Encuestas de tracking político
UPDATE survey_definitions
SET engine_mode = 'cadem',
    metadata = jsonb_set(
      COALESCE(metadata, '{}'),
      '{cadem_enabled_at}',
      to_jsonb(NOW())
    )
WHERE type = 'political_tracking'
  AND status = 'active'
  AND created_by IN (SELECT id FROM users WHERE email = ANY(ARRAY['user1@company.com']));
```

---

### Fase 3: Staging/Producción Controlada (Día 8-14)

**Criterios de entrada:**
- ✅ Fase 1 y 2 sin errores críticos
- ✅ Completion rate >90% en pilotos
- ✅ Error vs benchmark <5pp
- ✅ Sin alertas de seguridad

**Habilitación:**
```sql
-- Habilitar para encuestas seleccionadas
UPDATE survey_definitions
SET engine_mode = 'cadem'
WHERE id IN (
  SELECT id FROM survey_definitions
  WHERE status = 'active'
    AND sample_size <= 1000
    AND type IN ('political', 'economic', 'social')
    AND created_at > '2026-03-01'
)
RETURNING id, title, engine_mode;
```

**Límites de seguridad:**
- Máximo 1000 agentes por encuesta
- Solo encuestas creadas después de fecha X
- Excluir encuestas legacy críticas

---

### Fase 4: Monitoreo Continuo (Día 15+)

**Dashboard de monitoreo:**

```typescript
// src/services/monitoring/cademMetrics.ts
interface CademMetrics {
  // Métricas por encuesta
  surveyId: string;
  engineMode: string;
  completionRate: number;
  avgConfidence: number;
  errorVsBenchmark: number;
  
  // Métricas agregadas
  totalSurveys: number;
  totalAgents: number;
  successRate: number;
}

// Alertas
const ALERT_THRESHOLDS = {
  completionRate: { min: 0.90, warning: 0.95 },
  errorVsBenchmark: { max: 0.05, warning: 0.03 },
  avgConfidence: { min: 0.75, warning: 0.80 },
};
```

**Alertas automáticas:**
- Completion rate <90%
- Error vs benchmark >5pp
- Tiempo de respuesta >5s por agente
- Errores en logs >10 por hora

---

## Configuración de Permisos

### Roles y Accesos

| Rol | Crear encuesta CADEM | Ver resultados | Modificar flag |
|-----|---------------------|----------------|----------------|
| Admin | ✅ | ✅ | ✅ |
| Researcher | ✅ (whitelist) | ✅ | ❌ |
| Analyst | ❌ | ✅ | ❌ |
| Viewer | ❌ | ✅ (solo lectura) | ❌ |

### Implementación en Backend

```typescript
// src/services/auth/permissions.ts
export const PERMISSIONS = {
  CADEM: {
    CREATE_SURVEY: 'cadem:create_survey',
    VIEW_RESULTS: 'cadem:view_results',
    MODIFY_FLAG: 'cadem:modify_flag',
  }
};

export function checkPermission(user: User, permission: string): boolean {
  // Implementar lógica de permisos
}
```

---

## Monitoreo y Observabilidad

### Métricas Clave

#### 1. Métricas por Encuesta

```sql
-- Vista de monitoreo
CREATE OR REPLACE VIEW cadem_survey_metrics AS
SELECT 
  sd.id as survey_id,
  sd.title,
  sd.engine_mode,
  COUNT(DISTINCT sr.agent_id) as total_agents,
  COUNT(DISTINCT CASE WHEN sr.value IS NOT NULL THEN sr.agent_id END) as completed_agents,
  ROUND(
    COUNT(DISTINCT CASE WHEN sr.value IS NOT NULL THEN sr.agent_id END)::numeric / 
    NULLIF(COUNT(DISTINCT sr.agent_id), 0) * 100, 
    2
  ) as completion_rate,
  AVG(sr.confidence) as avg_confidence
FROM survey_definitions sd
LEFT JOIN survey_responses sr ON sr.survey_id = sd.id
WHERE sd.engine_mode = 'cadem'
GROUP BY sd.id, sd.title, sd.engine_mode;
```

#### 2. Métricas Agregadas

```sql
-- Dashboard diario
SELECT 
  DATE(sr.created_at) as date,
  COUNT(DISTINCT sd.id) as surveys_count,
  COUNT(DISTINCT sr.agent_id) as total_agents,
  AVG(sr.confidence) as avg_confidence,
  -- Calcular completion rate
  ROUND(
    COUNT(CASE WHEN sr.value IS NOT NULL THEN 1 END)::numeric / 
    COUNT(*) * 100, 
    2
  ) as completion_rate
FROM survey_definitions sd
JOIN survey_responses sr ON sr.survey_id = sd.id
WHERE sd.engine_mode = 'cadem'
  AND sr.created_at >= NOW() - INTERVAL '7 days'
GROUP BY DATE(sr.created_at)
ORDER BY date DESC;
```

### Alertas

```typescript
// src/services/alerts/cademAlerts.ts
export async function checkCademAlerts(): Promise<Alert[]> {
  const alerts: Alert[] = [];
  
  // Check completion rate
  const lowCompletion = await db.query(`
    SELECT survey_id, completion_rate
    FROM cadem_survey_metrics
    WHERE completion_rate < 90
  `);
  
  if (lowCompletion.length > 0) {
    alerts.push({
      type: 'warning',
      message: `Low completion rate in ${lowCompletion.length} surveys`,
      details: lowCompletion,
    });
  }
  
  return alerts;
}
```

---

## Rollback Plan

### Escenarios de Rollback

#### Escenario 1: Error en una encuesta específica

```sql
-- Rollback individual
UPDATE survey_definitions
SET engine_mode = 'legacy',
    metadata = jsonb_set(
      metadata,
      '{cadem_rollback_reason}',
      '"completion_rate_below_threshold"'
    )
WHERE id = 'PROBLEMATIC_SURVEY_ID';
```

#### Escenario 2: Error sistémico

```sql
-- Rollback masivo (emergencia)
UPDATE survey_definitions
SET engine_mode = 'legacy',
    metadata = jsonb_set(
      metadata,
      '{cadem_rollback_at}',
      to_jsonb(NOW())
    )
WHERE engine_mode = 'cadem'
  AND status = 'active';
```

#### Escenario 3: Degradación gradual

```typescript
// Reducir gradualmente el uso
async function gradualRollback(): Promise<void> {
  // 1. Detener nuevas encuestas CADEM
  await db.query(`
    UPDATE survey_definitions
    SET engine_mode = 'legacy'
    WHERE engine_mode = 'cadem'
      AND status = 'draft'
  `);
  
  // 2. Esperar encuestas activas
  await waitForActiveSurveys();
  
  // 3. Rollback completo
  await db.query(`
    UPDATE survey_definitions
    SET engine_mode = 'legacy'
    WHERE engine_mode = 'cadem'
  `);
}
```

---

## Política de Fuente de Agentes

A partir de la congelación de CADEM Opinion Engine v1.1, toda ejecución de:
- benchmark,
- staging,
- rollout,
- producción controlada,
- validación longitudinal

debe usar **exclusivamente agentes reales** provenientes de la tabla `synthetic_agents` en Supabase.

### Queda explícitamente prohibido:
- ❌ Generación aleatoria en memoria (`generateSyntheticAgents()`)
- ❌ Mocks de población
- ❌ Funciones auxiliares tipo `generateSyntheticAgents()`
- ❌ Fallback silencioso a agentes en memoria

### Uso permitido únicamente para:
- ✅ Tests unitarios
- ✅ Smoke tests locales de desarrollo

### Regla operativa:
Si un script de benchmark/staging/rollout no puede cargar agentes desde Supabase, **debe fallar explícitamente** y no hacer fallback automático.

---

## Checklist de Implementación

### Pre-Deploy

- [ ] Verificar migraciones aplicadas
- [ ] Confirmar dualModeAdapter funciona
- [ ] Revisar logs de staging
- [ ] Preparar dashboard de monitoreo
- [ ] Configurar alertas
- [ ] Documentar procedimientos de rollback
- [ ] **Verificar que scripts usen agentes reales de Supabase (no fallback)**

### Deploy

- [ ] Fase 0: Preparación
- [ ] Fase 1: Pilotos internos (100 agentes reales)
- [ ] Fase 2: Pilotos con usuarios limitados (500 agentes reales)
- [ ] Fase 3: Staging/Producción controlada (1000 agentes reales)
- [ ] Fase 4: Monitoreo continuo

### Post-Deploy

- [ ] Validar métricas diarias
- [ ] Revisar feedback de usuarios
- [ ] Ajustar umbrales de alertas
- [ ] Documentar lecciones aprendidas

---

## Comunicación

### Stakeholders

| Grupo | Información | Frecuencia |
|-------|-------------|------------|
| Equipo técnico | Métricas detalladas | Diaria |
| Investigadores | Guía de uso | Una vez |
| Management | Resumen ejecutivo | Semanal |
| Usuarios | Anuncio de feature | Una vez |

### Anuncio a Usuarios

```markdown
# Nuevo Motor de Opiniones CADEM

Hemos habilitado un nuevo motor de generación de opiniones 
basado en el modelo CADEM para encuestas seleccionadas.

## Características:
- Mayor coherencia demográfica
- Persistencia de opiniones entre olas
- Mejor calibración con benchmarks reales

## Disponibilidad:
Inicialmente para encuestas de tracking político y económico.

## Contacto:
Para dudas o problemas, contactar a: support@company.com
```

---

## Métricas de Éxito

### KPIs

| Métrica | Objetivo | Mínimo |
|---------|----------|--------|
| Completion rate | >95% | >90% |
| Error vs benchmark | <3pp | <5pp |
| Tiempo de respuesta | <2s | <5s |
| Satisfacción usuarios | >4/5 | >3/5 |
| Uptime | >99.5% | >99% |

### Timeline de Evaluación

- **Semana 1:** Validación de pilotos
- **Semana 2:** Expansión controlada
- **Semana 4:** Evaluación de estabilidad
- **Mes 2:** Decisión de expansión

---

## Próximos Pasos

### Inmediato (Esta semana)

1. **Día 1:** Verificar preparación técnica
2. **Día 2:** Iniciar Fase 1 (pilotos internos)
3. **Día 3-4:** Monitorear y ajustar
4. **Día 5:** Decisión de Fase 2

### Corto Plazo (Próximas 2 semanas)

1. Completar Fase 2 y 3
2. Estabilizar monitoreo
3. Documentar lecciones aprendidas
4. Preparar decisión de expansión

### Mediano Plazo (Mes 2)

1. Evaluar expansión a más usuarios
2. Considerar default para nuevas encuestas
3. Planificar v1.2 (eventos)

---

## Conclusión

**CADEM v1.1 está listo para rollout controlado.**

Este plan minimiza riesgos mediante:
- Feature flags claros
- Rollout gradual
- Monitoreo continuo
- Rollback planificado

**Decisión:** Proceder con Fase 1 inmediatamente después de verificación técnica.

---

*Documento generado: 27 de marzo, 2026*  
*Versión: v1.1.0*  
*Estado: APROBADO PARA IMPLEMENTACIÓN*
