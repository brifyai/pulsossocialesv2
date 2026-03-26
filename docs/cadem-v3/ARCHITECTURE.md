# Arquitectura CADEM Opinion Engine v1

## 1. Árbol de Carpetas

```
src/
├── app/
│   ├── opinionEngine/
│   │   ├── types.ts              # Tipos del motor de opinión
│   │   ├── latentState.ts        # Estados latentes de opinión (económica, política, social)
│   │   ├── opinionEngine.ts      # Motor principal - orquesta respuestas
│   │   └── heuristics.ts         # Heurísticas CADEM (aprobación, intención voto)
│   ├── panel/
│   │   ├── types.ts              # Tipos del panel
│   │   ├── panelState.ts         # Estado del panel (semanal, rotación, fatiga)
│   │   └── panelBehavior.ts      # Comportamiento del panelista (coherencia, deserción)
│   ├── events/
│   │   ├── types.ts              # Tipos de eventos
│   │   ├── eventStore.ts         # Almacén de eventos semanales
│   │   └── eventImpact.ts        # Calculadora de impacto de eventos en opinión
│   ├── memory/
│   │   ├── types.ts              # Tipos de memoria
│   │   ├── agentMemory.ts        # Memoria por agente (historial de respuestas)
│   │   └── temporalMemory.ts     # Memoria temporal (decay, recencia)
│   ├── calibration/
│   │   ├── types.ts              # Tipos de calibración
│   │   ├── benchmarkCalibration.ts # Calibración vs benchmarks reales
│   │   └── driftCorrection.ts    # Corrección de deriva en respuestas
│   └── survey/
│       └── cademAdapter.ts       # Adaptador para encuestas tipo CADEM
├── types/
│   └── opinion.ts                # Tipos globales de opinión
└── services/
    └── supabase/
        └── repositories/
            └── opinionRepository.ts # Persistencia de estados de opinión

supabase/
└── migrations/
    ├── 20250326_create_opinion_states.sql
    ├── 20250326_create_panel_states.sql
    ├── 20250326_create_events.sql
    └── 20250326_create_agent_memories.sql

docs/
└── cadem-v3/
    ├── ARCHITECTURE.md
    └── API.md
```

## 2. Responsabilidad de Cada Archivo

| Archivo | Responsabilidad |
|---------|-----------------|
| `opinionEngine/types.ts` | Tipos: `LatentState`, `OpinionVector`, `QuestionContext` |
| `opinionEngine/latentState.ts` | Estados latentes: económico, político, social. Funciones: `calculateEconomicMood()`, `calculatePoliticalLeaning()` |
| `opinionEngine/opinionEngine.ts` | Motor principal. Expone: `generateOpinionatedResponse(agent, question, context)` |
| `opinionEngine/heuristics.ts` | Heurísticas específicas CADEM: aprobación presidencial, intención de voto, preocupaciones |
| `panel/types.ts` | Tipos: `PanelState`, `PanelistStatus`, `FatigueLevel` |
| `panel/panelState.ts` | Gestión del panel: rotación semanal, cuotas, disponibilidad |
| `panel/panelBehavior.ts` | Comportamiento: coherencia temporal, deserción, fatiga de respuesta |
| `events/types.ts` | Tipos: `WeeklyEvent`, `EventCategory`, `ImpactSeverity` |
| `events/eventStore.ts` | CRUD de eventos semanales. Funciones: `addEvent()`, `getEventsForWeek()` |
| `events/eventImpact.ts` | Calcula impacto: `calculateOpinionShift(event, latentState, timeDecay)` |
| `memory/types.ts` | Tipos: `AgentMemory`, `ResponseHistory`, `TemporalWeight` |
| `memory/agentMemory.ts` | Memoria por agente: historial de respuestas, consistencia |
| `memory/temporalMemory.ts` | Decay temporal: `applyRecencyDecay()`, `calculateMemoryStrength()` |
| `calibration/types.ts` | Tipos: `CalibrationTarget`, `DriftMetrics` |
| `calibration/benchmarkCalibration.ts` | Calibra vs datos reales: `calibrateToBenchmark(synthetic, real)` |
| `calibration/driftCorrection.ts` | Detecta y corrige deriva: `detectDrift()`, `applyCorrection()` |
| `survey/cademAdapter.ts` | Adaptador que conecta el motor con el sistema de encuestas existente |
| `types/opinion.ts` | Tipos globales exportables |
| `repositories/opinionRepository.ts` | Persistencia en Supabase: estados, memorias, eventos |

## 3. Orden Recomendado de Implementación

| Fase | Archivos | Descripción |
|------|----------|-------------|
| **1. Fundamentos** | `types/opinion.ts`, `opinionEngine/types.ts`, `panel/types.ts` | Tipos base |
| **2. Core Engine** | `opinionEngine/latentState.ts`, `opinionEngine/heuristics.ts` | Estados latentes + heurísticas |
| **3. Motor Principal** | `opinionEngine/opinionEngine.ts` | Orquestación |
| **4. Memoria** | `memory/types.ts`, `memory/agentMemory.ts` | Historial por agente |
| **5. Panel** | `panel/panelState.ts`, `panel/panelBehavior.ts` | Gestión de panel |
| **6. Eventos** | `events/types.ts`, `events/eventStore.ts`, `events/eventImpact.ts` | Eventos semanales |
| **7. Calibración** | `calibration/types.ts`, `calibration/benchmarkCalibration.ts` | Calibración |
| **8. Persistencia** | `repositories/opinionRepository.ts` + migraciones | Supabase |
| **9. Integración** | `survey/cademAdapter.ts` | Conectar con sistema existente |
| **10. Documentación** | `docs/cadem-v3/` | Documentar |

## Principios de Diseño

1. **Sin sobreingeniería**: Cada archivo tiene una sola responsabilidad clara
2. **Composición sobre herencia**: Estados latentes se combinan, no heredan
3. **Inmutabilidad**: Estados se recalculan, no mutan
4. **Testeable**: Funciones puras con inputs/outputs explícitos
5. **Incremental**: Se puede implementar por fases sin romper lo existente
