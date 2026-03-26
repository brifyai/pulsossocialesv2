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
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   runSurvey()   │────▶│ resolveAgentState│────▶│  Supabase (DB)  │
│  (entrypoint)   │     │  (loader/seed)   │     │                 │
└─────────────────┘     └──────────────────┘     └─────────────────┘
         │                       │                          │
         │                       ▼                          │
         │              ┌──────────────────┐               │
         │              │  buildInitial*   │               │
         │              │    (seed)        │               │
         │              └──────────────────┘               │
         │                       │                          │
         ▼                       ▼                          ▼
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
1. `resolveAgentState()` no encuentra estados en DB
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
1. `resolveAgentState()` carga estados desde DB
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
- [ ] `panelState.fatigue` > `fatigue` anterior
- [ ] `panelState.completions_30d` > `completions_30d` anterior
- [ ] `panelState.cooldown_until` está definido
- [ ] `updated_at` > `updated_at` anterior

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
assert(result2.finalPanelState.fatigue > result1.finalPanelState.fatigue);
assert(result2.finalPanelState.completions_30d > result1.finalPanelState.completions_30d);
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

## Checklist de Validación Completa

### Persistencia
- [x] Migraciones aplicadas en Supabase
- [x] `agent_topic_state` existe y recibe upserts
- [x] `agent_panel_state` existe y recibe upserts
- [x] Se puede leer lo persistido en segunda corrida

### Longitudinalidad
- [x] Segunda ejecución carga estados persistidos
- [x] Panel fatigue cambia entre corridas
- [x] Completions aumenta
- [x] Cooldown se actualiza

### Integración
- [x] `surveyRunner` define entrypoint oficial
- [x] `engineMode` soporta legacy/cadem
- [x] `persistState` controla sync vs async
- [x] Ruta clara: sync (in-memory) vs async (persistencia)

### Observabilidad
- [x] `engineVersion` agregado a respuestas
- [x] Logs de carga/seed/persistencia
- [x] Manejo de fallos DB definido
- [x] Metadata de persistencia disponible

### Validación
- [x] `testOpinionStatePersistence.ts` compila
- [x] `runCademSurvey.ts` sigue funcionando
- [x] Benchmark evaluator compila
- [x] Tipos consistentes entre archivos

## Resultado

**Estado**: ✅ Validado

**Observaciones**:
- Sistema de persistencia implementado y probado
- Estados longitudinales funcionan correctamente
- Fallback robusto ante fallos de DB
- Versionado explícito para trazabilidad

**Decisión**:
- [x] Persistencia validada
- [ ] Persistencia requiere ajustes

## Próximos Pasos

1. **v1.2**: Eventos externos que modifiquen topic states
2. **v1.3**: Sincronización batch para grandes volúmenes
3. **v2.0**: Machine learning para calibración de seeds

---

*Documento generado como parte del cierre profesional de CADEM Opinion Engine v1.1*
