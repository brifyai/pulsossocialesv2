# CADEM Opinion Engine v1.2 - Roadmap: Eventos Semanales

**Fecha:** 27 de marzo, 2026  
**Estado:** 🚧 **PLANIFICACIÓN**  
**Versión objetivo:** v1.2 (Event-Aware)

---

## Resumen Ejecutivo

La versión 1.2 del motor CADEM introduce **eventos semanales** y **sensibilidad a coyuntura** como capacidades principales. Esta evolución permite que las opiniones de los agentes evolucionen de manera más realista entre olas, respondiendo a eventos del mundo real.

**Base:** v1.1 ha demostrado estabilidad longitudinal excepcional (correlaciones >0.99). Ahora es seguro agregar variabilidad controlada.

---

## Por Qué Eventos Ahora

### Contexto

v1.1 logró:
- ✅ Estabilidad longitudinal validada
- ✅ Persistencia de estado operativa
- ✅ Coherencia temporal demostrada

**El problema:** Las correlaciones de 0.991-1.000 son *demasiado* estables. En el mundo real, las opiniones cambian en respuesta a eventos.

### Objetivo de v1.2

Agregar **variabilidad controlada** que:
1. Responda a eventos reales del contexto chileno
2. Mantenga coherencia con el perfil demográfico de cada agente
3. No rompa la estabilidad longitudinal base
4. Permita drift razonable entre olas (5-15% en lugar de 0-2%)

---

## Arquitectura Propuesta

### Diagrama de Componentes

```
┌─────────────────────────────────────────────────────────┐
│              CADEM Opinion Engine v1.2                  │
├─────────────────────────────────────────────────────────┤
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐ │
│  │   Weekly    │───►│   Event     │───►│   Opinion   │ │
│  │   Events    │    │   Impact    │    │   Updater   │ │
│  │   Service   │    │   Engine    │    │             │ │
│  └─────────────┘    └──────┬──────┘    └──────┬──────┘ │
│                            │                    │       │
│  ┌─────────────────────────┴────────────────────┘       │
│  │              Opinion Engine Core (v1.1)              │
│  │  ┌─────────────┐  ┌─────────────────────────────┐   │
│  │  │   Topic     │  │      Panel State Manager    │   │
│  │  │   Resolver  │  │      + Event Context        │   │
│  │  └─────────────┘  └─────────────────────────────┘   │
│  └─────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

### Componentes Nuevos

#### 1. Weekly Events Service

**Responsabilidad:** Gestión de eventos semanales

**Funciones:**
- CRUD de eventos semanales
- Categorización automática
- Priorización por impacto
- Ventana temporal (eventos vigentes)

**Tabla propuesta:**
```sql
CREATE TABLE weekly_events (
  id UUID PRIMARY KEY,
  week_start DATE NOT NULL,
  week_end DATE NOT NULL,
  category event_category NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  impact_score DECIMAL(3,2), -- 0.00 to 1.00
  source_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### 2. Event Impact Engine

**Responsabilidad:** Calcular impacto de eventos en opiniones

**Algoritmo:**
```typescript
interface EventImpact {
  eventId: string;
  topicFamily: TopicFamily;
  direction: 'positive' | 'negative' | 'neutral';
  magnitude: number; // 0.0 to 1.0
  demographicModifiers: {
    ageGroup?: number;
    incomeLevel?: number;
    region?: number;
    politicalLeaning?: number;
  };
}

function calculateEventImpact(
  event: WeeklyEvent,
  agent: SyntheticAgent,
  currentOpinion: OpinionState
): EventImpact {
  // Base impact from event category
  const baseImpact = getBaseImpact(event.category, currentOpinion.topicFamily);
  
  // Demographic modifiers
  const demographicFactor = calculateDemographicFactor(event, agent);
  
  // Historical context (how agent has responded to similar events)
  const historicalFactor = getHistoricalResponsePattern(agent, event.category);
  
  return {
    ...baseImpact,
    magnitude: baseImpact.magnitude * demographicFactor * historicalFactor
  };
}
```

#### 3. Opinion Updater

**Responsabilidad:** Aplicar impactos de eventos a opiniones existentes

**Flujo:**
1. Cargar opiniones actuales del agente
2. Identificar eventos vigentes relevantes
3. Calcular impacto acumulado
4. Aplicar cambio controlado
5. Persistir nuevo estado

**Reglas de cambio:**
- Máximo cambio por evento: ±15%
- Cambio acumulado máximo entre olas: ±25%
- Respetar límites de confianza (no forzar cambios irreales)
- Mantener coherencia interna del agente

---

## Tipos de Eventos

### Categorías Principales

| Categoría | Ejemplos | Impacto Típico | Tópicos Afectados |
|-----------|----------|----------------|-------------------|
| **Gobierno** | Anuncios presidenciales, cambios de gabinete, reformas | Alto | approval, trust_institutions |
| **Economía** | IPC, desempleo, crecimiento PIB, dólar | Alto | economy_personal, economy_country, optimism |
| **Seguridad** | Delincuencia, violencia, emergencias | Medio-Alto | security, trust_institutions |
| **Migración** | Políticas migratorias, crisis fronterizas | Medio | migration, security, economy |
| **Internacional** | Relaciones exteriores, conflictos globales | Medio-Bajo | international, economy |
| **Social** | Protestas, movilizaciones, debates públicos | Variable | approval, trust_institutions |
| **Salud** | Pandemias, crisis sanitarias, reformas | Alto | health, approval, economy |

### Ejemplos de Eventos Reales (Chile 2024-2026)

```typescript
const exampleEvents: WeeklyEvent[] = [
  {
    id: 'evt-001',
    week_start: '2026-03-17',
    week_end: '2026-03-23',
    category: 'economy',
    title: 'IPC marzo: inflación se acelera a 4.8%',
    description: 'El IPC de marzo mostró una aceleración...',
    impact_score: 0.75,
    affectedTopics: ['economy_personal', 'economy_country', 'optimism']
  },
  {
    id: 'evt-002',
    week_start: '2026-03-20',
    week_end: '2026-03-27',
    category: 'government',
    title: 'Presidenta anuncia reforma previsional',
    description: 'En cadena nacional, la Presidenta...',
    impact_score: 0.85,
    affectedTopics: ['approval', 'trust_institutions']
  },
  {
    id: 'evt-003',
    week_start: '2026-03-25',
    week_end: '2026-04-01',
    category: 'security',
    title: 'Aumento de homicidios en RM preocupa',
    description: 'Estadísticas policiales muestran...',
    impact_score: 0.60,
    affectedTopics: ['security', 'approval']
  }
];
```

---

## Cómo Medir Éxito

### Métricas de Validación

#### 1. Cambios Razonables entre Olas

| Métrica | v1.1 (Base) | v1.2 (Objetivo) | Umbral |
|---------|-------------|-----------------|--------|
| Drift promedio | 0.5-2.0% | 5-15% | >3% ✅ |
| Drift máximo | 2.0% | <25% | <30% ✅ |
| Correlación Ola n→n+1 | 0.991-1.000 | 0.85-0.95 | >0.80 ✅ |

#### 2. Sensibilidad a Coyuntura

| Prueba | Descripción | Éxito |
|--------|-------------|-------|
| Evento positivo | Evento favorable al gobierno → approval sube | +5-15% |
| Evento negativo | Crisis económica → economy_personal baja | -5-15% |
| Evento neutral | Noticia internacional → cambio mínimo | <±3% |
| Sin eventos | Semana sin eventos → estabilidad | <±3% |

#### 3. No Romper Estabilidad

| Métrica | Umbral |
|---------|--------|
| Completion rate | >90% (igual que v1.1) |
| Coherencia interna | >80% (igual que v1.1) |
| Confidence promedio | >75% (igual que v1.1) |
| Error vs benchmark | <5pp (igual que v1.1) |

### Tests de Validación

#### Test 1: Evento Aislado
```typescript
// Simular una ola con evento específico
// Verificar que opiniones cambian en dirección esperada
// Verificar que magnitud es razonable
```

#### Test 2: Secuencia de Eventos
```typescript
// Ola 1: Sin eventos (baseline)
// Ola 2: Evento positivo
// Ola 3: Evento negativo
// Verificar trayectoria coherente
```

#### Test 3: Evento vs No-Evento
```typescript
// Panel A: Expuesto a eventos
// Panel B: Sin eventos (control)
// Verificar diferencia significativa
```

---

## Plan de Implementación

### Fase 1: Fundamentos (Semana 1-2)

**Objetivo:** Arquitectura base de eventos

**Tareas:**
- [ ] Crear tabla `weekly_events`
- [ ] Implementar `WeeklyEventsService`
- [ ] CRUD básico de eventos
- [ ] Tests unitarios

**Entregable:** Servicio de eventos operativo

### Fase 2: Motor de Impacto (Semana 3-4)

**Objetivo:** Calcular impacto de eventos

**Tareas:**
- [ ] Implementar `EventImpactEngine`
- [ ] Definir matrices de impacto por categoría
- [ ] Implementar modificadores demográficos
- [ ] Tests de impacto

**Entregable:** Motor de impacto funcional

### Fase 3: Integración (Semana 5-6)

**Objetivo:** Integrar con motor existente

**Tareas:**
- [ ] Implementar `OpinionUpdater`
- [ ] Modificar `OpinionEngine` para considerar eventos
- [ ] Integrar en flujo de survey runner
- [ ] Tests de integración

**Entregable:** Motor v1.2 integrado

### Fase 4: Validación (Semana 7-8)

**Objetivo:** Validar comportamiento

**Tareas:**
- [ ] Ejecutar tests de evento aislado
- [ ] Ejecutar tests de secuencia
- [ ] Ejecutar tests A/B evento vs no-evento
- [ ] Documentar resultados

**Entregable:** Reporte de validación v1.2

### Fase 5: Producción (Semana 9-10)

**Objetivo:** Habilitar en producción

**Tareas:**
- [ ] Crear UI para gestión de eventos
- [ ] Documentar uso operativo
- [ ] Monitoreo de impactos
- [ ] Rollout gradual

**Entregable:** v1.2 en producción

---

## Consideraciones Técnicas

### Base de Datos

**Nueva tabla:**
```sql
-- weekly_events
-- event_impacts (log de impactos calculados)
-- agent_event_responses (historial de respuestas por agente)
```

**Migraciones necesarias:**
1. Crear tabla weekly_events
2. Crear índices por fecha y categoría
3. Agregar columna event_context a survey_runs

### API

**Nuevos endpoints:**
```typescript
// GET /api/events/week?date=2026-03-27
// POST /api/events
// PUT /api/events/:id
// GET /api/events/:id/impact-preview
```

### Performance

**Consideraciones:**
- Cálculo de impacto: <50ms por agente
- Cache de eventos vigentes
- Batch processing para grandes volúmenes

---

## Riesgos y Mitigaciones

| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|--------------|---------|------------|
| Overfitting a eventos | Media | Alto | Límites máximos de cambio, validación cruzada |
| Inestabilidad longitudinal | Media | Alto | Tests rigurosos, rollback a v1.1 |
| Complejidad excesiva | Media | Medio | Arquitectura modular, documentación |
| Eventos mal categorizados | Alta | Medio | UI de revisión, validación humana |
| Impactos irreales | Media | Alto | Límites de magnitud, sanity checks |

---

## Dependencias

### Bloqueantes
- [x] v1.1 aprobado y estable
- [x] Persistencia operativa
- [ ] Recursos de desarrollo (2-3 semanas)

### No Bloqueantes
- [ ] UI de gestión de eventos (puede ser manual inicialmente)
- [ ] Automatización de ingesta de eventos (puede ser manual)
- [ ] Integración con fuentes de noticias (futuro)

---

## Definición de Listo (Definition of Done)

- [ ] Arquitectura implementada y documentada
- [ ] Tests de validación pasan (evento aislado, secuencia, A/B)
- [ ] Métricas dentro de umbrales:
  - [ ] Drift: 5-15%
  - [ ] Correlación: 0.85-0.95
  - [ ] Completion: >90%
  - [ ] Coherencia: >80%
- [ ] Documentación de uso operativo
- [ ] Rollout plan definido
- [ ] Aprobación de stakeholders

---

## Conclusión

**v1.2 representa la evolución natural del motor CADEM:** de un sistema estable pero rígido, a uno que puede responder dinámicamente a la coyuntura manteniendo su base sólida.

**Principios guía:**
1. **Variabilidad controlada:** Cambios significativos pero razonables
2. **Coherencia demográfica:** Respetar perfil de cada agente
3. **Estabilidad base:** No romper lo que v1.1 logró
4. **Transparencia:** Eventos visibles y auditables

**Próximo paso:** Iniciar Fase 1 (Fundamentos) una vez aprobado este roadmap.

---

*Documento generado: 27 de marzo, 2026*  
*Versión: v1.2.0-draft*  
*Estado: PLANIFICACIÓN*
