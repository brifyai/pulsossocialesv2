# CADEM Opinion Engine v1.1 - Persistence Validation

## Fecha
2026-03-26

## Objetivo
Validar que topic states y panel states:
1. Se generan si no existen (seed)
2. Se cargan si existen (persisted)
3. Se actualizan correctamente
4. Persisten en Supabase

## Arquitectura de Persistencia

### Tablas Involucradas
- `agent_topic_state` - Estados de tópicos por agente
- `agent_panel_state` - Estado del panel por agente

### Flujo de Datos
```
┌─────────────────┐     ┌──────────────────────────┐     ┌─────────────────┐
│   runSurvey()   │────▶│ resolveTopicStates /     │────▶│  Supabase (DB)  │
│  (entrypoint)   │     │ resolvePanelState        │     │                 │
└─────────────────┘     │  (loader/seed)           │     └─────────────────┘
         │              └──────────────────────────┘              │
         │                       │                                 │
         │                       ▼                                 │
         │              ┌──────────────────┐                     │
         │              │  buildInitial*   │                     │
         │              │    (seed)        │                     │
         │              └──────────────────┘                     │
         │                       │                               │
         ▼                       ▼                               ▼
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│ generateResponse│◀────│  Topic/Panel     │◀────│  opinionState   │
│                 │     │     States       │     │  Repository     │
└─────────────────┘     └──────────────────┘     └─────────────────┘
         │
         ▼
┌─────────────────┐
│  Persist States │────▶ Guarda en Supabase
│  (post-survey)  │
└─────────────────┘
```

## Escenarios de Prueba

### Escenario A: Primera Corrida (Seed)
**Condición**: Agente sin estados previos en la base de datos

**Flujo esperado**:
1. `resolveTopicStates()` / `resolvePanelState()` no encuentran estados en DB
2. Genera estados desde seed (`buildInitialTopicStates`, `buildInitialPanelState`)
3. `topicStateSource = 'seeded'`, `panelStateSource = 'seeded'`
4. Encuesta se completa normalmente
5. Estados se guardan en DB (`saveStatus = 'saved'`)

**Verificaciones**:
- [ ] `agent_topic_state` tiene filas para el agente
- [ ] `agent_panel_state` tiene fila para el agente
- [ ] `persistenceMeta.topicStateSource === 'seeded'`
- [ ] `persistenceMeta.panelStateSource === 'seeded'`
- [ ] `persistenceMeta.saveStatus === 'saved'`

### Escenario B: Segunda Corrida (Persisted)
**Condición**: Agente con estados previos en la base de datos

**Flujo esperado**:
1. `resolveTopicStates()` / `resolvePanelState()` cargan estados desde DB
2. `topicStateSource = 'persisted'`, `panelStateSource = 'persisted'`
3. Encuesta usa estados cargados (no seed)
4. Panel fatigue aumenta respecto a corrida anterior
5. `completions_30d` aumenta
6. `cooldown_until` se actualiza
7. `updated_at` se actualiza
8. Estados se guardan nuevamente

**Verificaciones**:
- [ ] `persistenceMeta.topicStateSource === 'persisted'`
- [ ] `persistenceMeta.panelStateSource === 'persisted'`
- [ ] `panelFatigue` > `panelFatigue` anterior
- [ ] `completions_30d` > `completions_30d` anterior
- [ ] `cooldownUntil` está definido
- [ ] `updatedAt` > `updatedAt` anterior

### Escenario C: Fallo de Persistencia
**Condición**: Error de conexión a Supabase durante guardado

**Flujo esperado**:
1. Encuesta se completa normalmente
2. Intento de guardar falla
3. `saveStatus = 'failed'`
4. Encuesta sigue siendo válida (no se pierden respuestas)
5. Se loggea warning

**Verificaciones**:
- [ ] Encuesta completa sin errores
- [ ] `persistenceMeta.saveStatus === 'failed'`
- [ ] Warning loggeado en consola
- [ ] Respuestas disponibles en resultado

## Script de Validación

### Ejecución
```bash
# Desde la raíz del proyecto
npx ts-node --project scripts/tsconfig.json scripts/test/testOpinionStatePersistence.ts
```

### Casos de Prueba

#### Test 1: Creación Inicial
```typescript
const agent = createTestAgent('test-agent-001');
const result1 = await runCademSurveyAsync(agent, questions);

// Verificar
assert(result1.persistenceMeta.topicStateSource === 'seeded');
assert(result1.persistenceMeta.panelStateSource === 'seeded');
assert(result1.persistenceMeta.saveStatus === 'saved');
```

#### Test 2: Carga Persistida
```typescript
// Segunda corrida con mismo agente
const result2 = await runCademSurveyAsync(agent, questions);

// Verificar
assert(result2.persistenceMeta.topicStateSource === 'persisted');
assert(result2.persistenceMeta.panelStateSource === 'persisted');
assert(result2.finalPanelState.panelFatigue > result1.finalPanelState.panelFatigue);
assert(result2.finalPanelState.completions30d > result1.finalPanelState.completions30d);
```

#### Test 3: Metadata Completa
```typescript
const result = await runSurvey({
  surveyDefinition,
  agents: [agent],
  engineMode: 'cadem',
  persistState: true,
});

// Verificar
assert(result.engineVersion === 'cadem-v1.1');
assert(result.persistenceMeta !== undefined);
assert(result.persistenceMeta.length === 1);
assert(result.persistenceMeta[0].agentId === agent.agentId);
assert(result.persistenceMeta[0].timestamp instanceof Date);
```

## Política de Fallback

### Si falla lectura (DB no disponible)
- Usar seed automáticamente
- Loggear warning
- Continuar con encuesta

### Si falla escritura (DB no disponible)
- Completar encuesta igual
- Loggear warning
- `saveStatus = 'failed'`
- Respuestas siguen siendo válidas

## Versionado

### Engine Version
Todas las respuestas incluyen:
```typescript
engineVersion: 'cadem-v1.1'
```

Esto permite:
- Trazabilidad de resultados
- Comparación entre versiones
- Migraciones de datos

## Matriz Implementado vs Validado

| Componente | Implementado | Validado en Dev | Notas |
|-----------|--------------|-----------------|-------|
| Migración `agent_topic_state` | Sí | Sí | Tabla creada, upserts funcionan |
| Migración `agent_panel_state` | Sí | Sí | Tabla creada, upserts funcionan |
| Seed fallback (lectura) | Sí | Sí | Si no hay datos en DB, usa seed |
| Seed fallback (escritura) | Sí | Sí | Si falla guardado, continúa encuesta |
| Persistencia async | Sí | Sí | `runCademSurveyAsync` persiste estados |
| `engineVersion` en respuestas | Sí | Sí | Todas las respuestas incluyen versión |
| Metadata de persistencia | Sí | Sí | `persistenceMeta` disponible en resultados |
| Segunda corrida carga persisted | Sí | Sí | `topicStateSource` cambia a 'persisted' |
| Panel fatigue evoluciona | Sí | Sí | Aumenta entre corridas |
| `completions_30d` incrementa | Sí | Sí | Contador aumenta correctamente |
| Fallback ante fallo DB real | Sí | **No** | Implementado, pendiente prueba inducida |
| Persistencia bajo carga | Sí | **No** | No validado con batches grandes |
| Consistencia longitudinal | Parcial | **No** | Falta validar múltiples olas con eventos |
| Integración dual legacy | En progreso | **No** | Falta comparación lado a lado |

## Evidencia Observada

### Corrida 1 (Agente sin estados previos)
```
agentId: test-agent-001
topicStateSource: seeded
panelStateSource: seeded
saveStatus: saved
topic states persistidos: 10
panel completions_30d: 1
panel fatigue: 0.08
cooldown_until: 2026-04-02T...
```

### Corrida 2 (Mismo agente, estados existentes)
```
agentId: test-agent-001
topicStateSource: persisted
panelStateSource: persisted
saveStatus: saved
topic states cargados: 10 (desde DB)
panel completions_30d: 2 (incrementado)
panel fatigue previo: 0.08
panel fatigue actual: 0.16 (incremento respecto a 0.08 previo)
cooldown_until: 2026-04-09T... (extendido)
```

### Compilación y Tipos
- `testOpinionStatePersistence.ts`: ✅ Compila
- `runCademSurvey.ts`: ✅ Compila
- `surveyRunner.ts`: ✅ Compila
- Tipos consistentes entre archivos: ✅ Verificado

## Riesgos Abiertos

1. **Fallback ante fallo real de base de datos**
   - Estado: implementado
   - Validación: pendiente prueba explícita con error inducido
   - Mitigación: código de fallback presente, logs configurados

2. **Persistencia bajo carga**
   - Estado: no validado aún
   - Riesgo: batches grandes podrían requerir ajustes de concurrencia
   - Mitigación: diseño permite batching, no probado a escala

3. **Consistencia longitudinal de topic states**
   - Estado: validación inicial
   - Riesgo: falta medir evolución en múltiples olas con eventos
   - Mitigación: arquitectura soporta eventos, no implementados aún

4. **Integración dual con motor legacy**
   - Estado: en progreso
   - Riesgo: falta comparación lado a lado en runs reales
   - Mitigación: `engineMode` permite switching, no comparado

## Resultado

**Estado**: Validación técnica interna completada

**Conclusión**:
- La persistencia de `topic states` y `panel states` está implementada y validada en entorno de desarrollo.
- La segunda corrida reutiliza estados persistidos en lugar de regenerarlos desde seed.
- El sistema cuenta con fallback de lectura/escritura definido, aunque la validación de fallos inducidos de base de datos queda pendiente.
- El motor queda en condiciones de pasar a staging técnico y comparación controlada con el motor legacy.

> **Nota importante**: La validación actual corresponde a entorno de desarrollo y no reemplaza aún validación bajo carga ni validación operativa en staging.

**Decisión**:
- [x] Persistencia funcional validada en entorno técnico
- [ ] Persistencia validada bajo carga
- [ ] Persistencia validada ante fallos inducidos de base de datos
- [ ] Persistencia validada en integración dual con producción

## Próximos Pasos

### Inmediatos (v1.1.x)
1. Prueba explícita de fallo de DB (desconectar Supabase temporalmente)
2. Validación con batch de 100+ agentes
3. Documentar métricas de performance

### Corto plazo (v1.2)
1. Eventos externos que modifiquen topic states
2. Sincronización batch para grandes volúmenes
3. Métricas de calidad de persistencia

### Mediano plazo (v1.3)
1. Machine learning para calibración de seeds
2. Optimización de queries de persistencia
3. Monitoreo en producción

---

## Definition of Done para pasar a staging

- [x] Persistencia seed/persisted validada en entorno dev
- [x] Metadata de persistencia presente
- [x] `engineVersion` presente en respuestas
- [x] Fallback de lectura/escritura implementado
- [ ] Prueba de fallo inducido completada
- [ ] Prueba batch 100+ agentes completada
- [ ] Integración dual legacy/cadem habilitada en runner
- [ ] Comparación lado a lado con motor legacy documentada

---

*Documento generado como parte del cierre profesional de CADEM Opinion Engine v1.1*
*Última actualización: 2026-03-26*
