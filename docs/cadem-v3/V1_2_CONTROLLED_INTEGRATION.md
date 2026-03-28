# CADEM v1.2 - Integración Técnica de Eventos

**Fecha:** 28 de Marzo, 2026  
**Versión:** v1.2.0-events  
**Estado:** ✅ Integración técnica completada

---

## Resumen Ejecutivo

Este documento describe la **integración técnica** del sistema de eventos en CADEM v1.2. El código está listo y probado, pero la **activación operativa** de eventos está reservada para **Fase 3** del rollout.

### Distinción Importante

| Aspecto | Estado | Fase |
|---------|--------|------|
| **Integración técnica** | ✅ Completa | - |
| **Activación operativa** | ⏳ Pendiente | Fase 3 |

> **Nota:** Fase 2 (500 agentes) se ejecuta **sin eventos** (`useEvents: false`) para establecer baseline estable.

---

## Propósito del Sistema de Eventos

El sistema de eventos permite que las opiniones de los agentes sintéticos se vean afectadas por eventos semanales del mundo real, creando un panel más dinámico y realista.

### Componentes Integrados

| Componente | Archivo | Estado |
|------------|---------|--------|
| Tipos de Eventos | `src/app/events/types.ts` | ✅ Completo |
| EventStore | `src/app/events/eventStore.ts` | ✅ Completo |
| EventImpact | `src/app/events/eventImpact.ts` | ✅ Completo |
| SurveyRunner | `src/app/survey/surveyRunner.ts` | ✅ Extendido |
| CademAdapterAsync | `src/app/survey/cademAdapterAsync.ts` | ✅ Extendido |
| Script de Prueba | `scripts/test/runV12EventEnabledSurvey.ts` | ✅ Listo |

---

## Arquitectura del Sistema de Eventos

### Flujo de Datos

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  Weekly Events  │────▶│   EventStore    │────▶│  SurveyRunner   │
│   (Supabase)    │     │  (getEvents*)   │     │ (useEvents=true)│
└─────────────────┘     └─────────────────┘     └────────┬────────┘
                                                         │
                              ┌──────────────────────────┘
                              ▼
                    ┌─────────────────┐
                    │  EventImpact    │
                    │ (applyEvents*)  │
                    └────────┬────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │  OpinionUpdater │
                    │ (updateTopic*)  │
                    └────────┬────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │  Agent Response │
                    │  (con impacto)  │
                    └─────────────────┘
```

### Modelo de Evento

```typescript
interface WeeklyEvent {
  id: string;
  weekKey: string;           // "2026-W13"
  title: string;
  summary: string;
  category: EventCategory;   // 'government' | 'economy' | 'security' | ...
  severity: ImpactSeverity;  // 'minor' | 'moderate' | 'major' | 'critical'
  sentiment: EventSentiment; // -1 a 1 (valores discretos)
  intensity: number;         // 0-1
  salience: number;          // 0-1
  targetEntities: EventTargetEntity[];
  affectedSegments?: EventSegmentRule[];
}
```

---

## Cambios en SurveyRunner

### Nueva Interfaz

```typescript
export interface SurveyRunnerInput {
  surveyDefinition: CademSurveyDefinition;
  agents: CademAdapterAgent[];
  engineMode: EngineMode;
  persistState?: boolean;
  weekKey?: string;
  debug?: boolean;
  useEvents?: boolean;        // ← NUEVO
  eventWindowSize?: number;   // ← NUEVO (default: 2)
}
```

### Uso

```typescript
// Encuesta CON eventos
const result = await runSurvey({
  surveyDefinition: survey,
  agents,
  engineMode: 'cadem',
  persistState: true,
  weekKey: '2026-W13',
  useEvents: true,        // Habilitar sistema de eventos
  eventWindowSize: 2,     // Cargar eventos de 2 semanas
});

// Encuesta SIN eventos (baseline)
const result = await runSurvey({
  surveyDefinition: survey,
  agents,
  engineMode: 'cadem',
  persistState: true,
  weekKey: '2026-W13',
  useEvents: false,       // Deshabilitar (comportamiento v1.1)
});
```

---

## Categorías de Eventos y Topics Afectados

| Categoría | Topics Afectados | Multiplicador |
|-----------|------------------|---------------|
| `government` | government_approval, country_direction | 1.0 |
| `economy` | economy_national, economy_personal, country_optimism | 0.9 |
| `security` | security_perception, country_direction | 1.1 |
| `institutions` | institutional_trust | 0.8 |
| `migration` | country_direction, security_perception | 0.9 |
| `international` | country_optimism, economy_national | 0.7 |
| `social` | country_direction, institutional_trust | 0.85 |

---

## Script de Prueba

### Ejecución

```bash
npx tsx scripts/test/runV12EventEnabledSurvey.ts
```

### Qué hace

1. **Crea eventos de prueba** en Supabase (3 eventos de ejemplo)
2. **Verifica carga** de eventos desde EventStore
3. **Obtiene agentes** aleatorios de la base de datos
4. **Ejecuta encuesta CON eventos** (10 agentes, 3 preguntas)
5. **Ejecuta encuesta SIN eventos** (mismos agentes, baseline)
6. **Compara resultados** y muestra diferencias

### Eventos de Prueba

| Evento | Semana | Categoría | Severidad | Sentimiento |
|--------|--------|-----------|-----------|-------------|
| Anuncio de medidas económicas | W13 | economy | major | +0.25 |
| Protestas en la capital | W13 | social | moderate | -0.5 |
| Cambio de ministro | W12 | government | critical | -0.5 |

---

## Preparación para Fase 2

### ✅ Checklist Pre-Fase 2

- [x] Sistema de eventos implementado
- [x] SurveyRunner extendido con `useEvents`
- [x] CademAdapterAsync soporta eventos
- [x] Script de prueba funcional
- [x] Tipos TypeScript definidos
- [x] Migraciones de base de datos aplicadas

### Configuración Fase 2

```typescript
// scripts/rollout/createPhase2Survey.ts
const PHASE2_CONFIG = {
  sampleSize: 500,           // ← Escalar de 50 a 500
  engineMode: 'cadem',
  persistState: false,       // ← Mismo que Fase 1
  useEvents: false,          // ← DESACTIVADO para Fase 2
  // ...
};
```

**Nota:** Fase 2 mantiene `useEvents: false` para establecer baseline estable antes de activar eventos en Fase 3.

### Cuándo Activar Eventos

| Fase | useEvents | Propósito |
|------|-----------|-----------|
| Fase 1 | false | Validación inicial (50 agentes) ✅ |
| Fase 2 | false | Escalado volumétrico (500 agentes) |
| Fase 3 | **true** | **Activar sistema de eventos** |

---

## Métricas de Validación

### Para Fase 2 (sin eventos)

- [ ] Completion rate > 95%
- [ ] Error rate < 2%
- [ ] Confidence promedio > 75%
- [ ] Sin errores críticos
- [ ] Duración razonable para 500 agentes

### Para Fase 3 (con eventos)

- [ ] Diferencias observables vs baseline
- [ ] Impactos dentro de rangos esperados (±15%)
- [ ] No hay distorsiones extremas
- [ ] Eventos se cargan correctamente
- [ ] Persistencia de impactos funciona

---

## Comandos Útiles

### Verificar eventos en Supabase

```sql
-- Listar eventos por semana
SELECT week_key, title, category, severity, sentiment
FROM weekly_events
ORDER BY week_key DESC;

-- Contar eventos
SELECT week_key, COUNT(*) as event_count
FROM weekly_events
GROUP BY week_key
ORDER BY week_key DESC;
```

### Ejecutar prueba de eventos

```bash
# Prueba completa
npx tsx scripts/test/runV12EventEnabledSurvey.ts

# Prueba de impacto end-to-end
npx tsx scripts/test/testEventImpactEndToEnd.ts

# Prueba de sensibilidad
npx tsx scripts/test/testEventSensitivity.ts
```

---

## Notas de Implementación

### Diseño Decisions

1. **Eventos desactivados por defecto:** `useEvents` es `false` por defecto para mantener compatibilidad con v1.1
2. **Ventana de 2 semanas:** Balance entre relevancia y no sobrecargar
3. **Atenuación del 30%:** Evita cambios bruscos en opiniones
4. **Máximo 15% de shift:** Límite de seguridad por evento

### Limitaciones Conocidas

- Eventos solo afectan topics, no respuestas directamente
- No hay retroalimentación entre agentes (cada uno procesa eventos independientemente)
- Los eventos son estáticos una vez creados (no hay edición)

---

## Próximos Pasos

1. **Ejecutar Fase 2** con 500 agentes, `useEvents: false`
2. **Analizar resultados** de Fase 2
3. **Preparar Fase 3** con `useEvents: true`
4. **Crear eventos reales** para semanas de producción
5. **Monitorear impactos** y ajustar parámetros si es necesario

---

## Referencias

- [V1_2_IMPLEMENTATION_SUMMARY.md](./V1_2_IMPLEMENTATION_SUMMARY.md) - Resumen de implementación
- [V1_2_KICKOFF_EVENTS.md](./V1_2_KICKOFF_EVENTS.md) - Plan de eventos
- [ROLLOUT_FASE_1_INTERNAL.md](./ROLLOUT_FASE_1_INTERNAL.md) - Resultados Fase 1
- [ROLLOUT_FASE_2_INTERNAL.md](./ROLLOUT_FASE_2_INTERNAL.md) - Plan Fase 2
- [CADEM_PRODUCTION_ROLLOUT_PLAN.md](./CADEM_PRODUCTION_ROLLOUT_PLAN.md) - Plan general

---

## Resumen de Estado

### ✅ Integración Técnica Completada

El código del sistema de eventos está:
- Implementado
- Probado
- Documentado
- Listo para activación

### ⏳ Activación Operativa

| Fase | useEvents | Estado |
|------|-----------|--------|
| Fase 1 | false | ✅ Completada (50 agentes) |
| Fase 2 | false | ⏳ Lista para ejecutar (500 agentes) |
| Fase 3 | **true** | 📋 Planificada (100-200 agentes con eventos) |

### Próximo Paso Inmediato

1. **Ejecutar Fase 2** con 500 agentes, `useEvents: false`
2. **Validar escalado volumétrico**
3. **Luego** ejecutar test técnico con `runV12EventEnabledSurvey.ts`
4. **Finalmente** planificar Fase 3 con `useEvents: true`

---

**Documento preparado para:** Fase 2 del Rollout CADEM v1.2  
**Estado:** ✅ Integración técnica lista | ⏳ Activación operativa en Fase 3
