# Persistencia de Estado - CADEM Opinion Engine v1.1

## Resumen

La v1.1 introduce persistencia de estado para los agentes sintéticos, permitiendo:
- **Seguimiento longitudinal**: Los agentes mantienen sus opiniones a través del tiempo
- **Evolución realista**: Las opiniones cambian gradualmente basadas en eventos
- **Benchmarking**: Comparación con datos reales de CADEM
- **Modo dual**: Transición gradual entre motores legacy y nuevo

## Arquitectura de Persistencia

### Tablas de Base de Datos

#### `agent_topic_state`
Almacena el estado de opinión de cada agente por topic.

```sql
CREATE TABLE agent_topic_state (
  agent_id UUID REFERENCES agents(id),
  topic_id VARCHAR(50),
  stance FLOAT,           -- -1.0 a 1.0 (negativo a positivo)
  intensity FLOAT,        -- 0.0 a 1.0 (qué tan fuerte es la opinión)
  confidence FLOAT,       -- 0.0 a 1.0 (qué tan seguro está)
  last_updated TIMESTAMP,
  PRIMARY KEY (agent_id, topic_id)
);
```

#### `agent_panel_state`
Almacena el estado del panel (fatiga, consistencia, etc.).

```sql
CREATE TABLE agent_panel_state (
  agent_id UUID PRIMARY KEY REFERENCES agents(id),
  fatigue_level FLOAT,    -- 0.0 a 1.0
  consistency_score FLOAT, -- 0.0 a 1.0
  response_quality FLOAT,  -- 0.0 a 1.0
  last_survey_date TIMESTAMP,
  surveys_completed INT,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

### Flujo de Datos

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   Survey Run    │────▶│  resolveAgentState │────▶│  Generate       │
│   Request       │     │  (DB or Seed)    │     │  Response       │
└─────────────────┘     └──────────────────┘     └─────────────────┘
                               │                           │
                               ▼                           ▼
                        ┌──────────────┐           ┌──────────────┐
                        │  agent_topic │           │  Persist     │
                        │  _state      │◀──────────│  States      │
                        │  (DB)        │           │  (Async)     │
                        └──────────────┘           └──────────────┘
                               │
                        ┌──────────────┐
                        │ agent_panel  │
                        │ _state       │
                        │ (DB)         │
                        └──────────────┘
```

## Uso del Adapter Async

### Ejemplo Básico

```typescript
import { runCademSurveyAsync } from '../app/survey/cademAdapterAsync';

const agent = {
  agentId: 'agent-123',
  age: 35,
  gender: 'female',
  region: 'Metropolitana',
  education: 'university',
  incomeLevel: 'medium',
};

const questions = [
  {
    id: 'gov_approval',
    text: '¿Aprueba la gestión del gobierno?',
    type: 'approval',
    options: ['approve', 'disapprove', 'no_response'],
  },
];

const result = await runCademSurveyAsync(agent, questions, {
  surveyId: 'cadem-2024-w12',
  surveyTopic: 'politica',
  weekKey: '2024-W12',
});

console.log(result.responses[0].response.value); // 'approve' | 'disapprove' | 'no_response'
```

### Batch Processing

```typescript
import { runCademSurveyBatchAsync } from '../app/survey/cademAdapterAsync';

const agents = [agent1, agent2, agent3]; // 1000+ agents
const results = await runCademSurveyBatchAsync(agents, questions, {
  surveyId: 'cadem-2024-w12',
});

// Results include final persisted states
for (const result of results) {
  console.log(`Agent ${result.agentId}: ${result.responses.length} responses`);
}
```

## Modo Dual (Legacy vs Opinion Engine)

### Configuración

```typescript
import { runDualModeSurvey, ExecutionMode } from '../app/survey/dualModeAdapter';

const config = {
  mode: 'hybrid' as ExecutionMode,  // 'legacy' | 'opinion_engine' | 'hybrid'
  hybridSplit: 50,                   // 50% opinion_engine, 50% legacy
  persistStates: true,
  enableComparison: true,
};

const result = await runDualModeSurvey(agents, questions, config);

// Estadísticas de comparación
const stats = getDualModeStats(result);
console.log(`Match rate: ${stats.matchRate}%`);
console.log(`Avg confidence diff: ${stats.avgConfidenceDiff}`);
```

### Recomendación de Modo

```typescript
import { recommendMode } from '../app/survey/dualModeAdapter';

const stats = getDualModeStats(result);
const recommendedMode = recommendMode(stats);

if (recommendedMode === 'opinion_engine') {
  console.log('✅ Listo para migrar completamente al nuevo motor');
} else if (recommendedMode === 'hybrid') {
  console.log('⚠️ Seguir monitoreando - hay diferencias significativas');
}
```

## Benchmark Evaluator

### Comparación con Datos Reales

```typescript
import {
  generateBenchmarkReport,
  aggregateSurveyResponses,
} from '../app/opinionEngine/benchmarkEvaluator';

// Agregar respuestas sintéticas
const syntheticResults = aggregateSurveyResponses(
  allResponses,
  questionMapping, // Mapeo questionId -> indicatorId
);

// Datos reales de CADEM
const benchmarkData = [
  {
    indicatorId: 'gov_approval',
    indicatorName: 'Aprobación Gobierno',
    category: 'politica',
    value: 35.2, // % de aprobación real
    marginOfError: 3.0,
    date: '2024-03-15',
    source: 'CADEM',
  },
];

// Generar reporte
const report = generateBenchmarkReport(
  'cadem-2024-w12',
  'CADEM',
  syntheticResults,
  benchmarkData,
);

console.log(report.summary);
// "Calibración aceptable. MAE: 2.45%, correlación: 0.892"

console.log(report.recommendations);
// ["El modelo está bien calibrado. No se requieren ajustes mayores."]
```

### Métricas de Calidad

| Métrica | Descripción | Buen Valor |
|---------|-------------|------------|
| MAE | Error Absoluto Medio | < 3% |
| RMSE | Raíz del Error Cuadrático Medio | < 4% |
| MAPE | Error Porcentual Absoluto Medio | < 5% |
| Bias | Sesgo (sobre/sub estimación) | ±2% |
| Correlación | Correlación Pearson | > 0.85 |
| Within Margin | % dentro del margen de error | > 70% |

## Migración de Datos

### Inicialización de Estados

Para agentes existentes sin estados previos:

```typescript
import { resolveAgentState } from '../app/opinionEngine/opinionStateLoader';

// Esto automáticamente genera estados desde seed si no existen en DB
const { topicStates, panelState } = await resolveAgentState(agent);
```

### Backfill de Estados

```typescript
// Para poblar estados iniciales de todos los agentes
const agents = await getAllAgents();

for (const agent of agents) {
  const { topicStates, panelState } = await resolveAgentState(agent);
  await saveTopicStates(agent.id, topicStates);
  await savePanelState(panelState);
}
```

## Consideraciones de Performance

### Optimizaciones Implementadas

1. **Batch Inserts**: Los estados se guardan en batch para reducir queries
2. **Lazy Loading**: Los estados solo se cargan cuando se necesitan
3. **Caching**: Los estados se mantienen en memoria durante la sesión
4. **Async/Await**: Todo el pipeline es asíncrono para no bloquear

### Límites Recomendados

- **Batch size**: 100-500 agentes por batch
- **Concurrent surveys**: 10-20 simultáneas
- **State updates**: Persistir cada 10-50 respuestas, no cada una

## Troubleshooting

### Estados No Se Persisten

```typescript
// Verificar que el agentId esté correctamente seteado
console.log(agent.agentId); // Debe ser UUID válido

// Verificar que las tablas existen
const { data: tables } = await supabase
  .from('agent_topic_state')
  .select('count(*)');
```

### Resultados Inconsistentes

```typescript
// En modo hybrid, verificar match rate
const stats = getDualModeStats(result);
if (stats.matchRate < 80) {
  console.warn('⚠️ Alta divergencia entre motores');
  // Revisar calibración de seeds
}
```

### Errores de Base de Datos

```typescript
// El adapter captura errores de persistencia y continúa
try {
  await runCademSurveyAsync(agent, questions);
} catch (error) {
  // El survey se completó pero los estados pueden no haberse guardado
  console.error('Survey completed but state persistence failed:', error);
}
```

## Próximos Pasos

### v1.2 - Eventos y Memoria
- [ ] Sistema de eventos que modifica topic states
- [ ] Memoria de largo plazo para agentes
- [ ] Aprendizaje de preferencias

### v1.3 - Calibración Automática
- [ ] Ajuste automático de seeds basado en benchmarks
- [ ] Machine learning para calibración
- [ ] Feedback loop con resultados reales

## Referencias

- [Arquitectura v3](./ARCHITECTURE.md)
- [Resultados de Calibración](./CALIBRATION_RESULTS.md)
- [API Documentation](../../src/app/opinionEngine/)
