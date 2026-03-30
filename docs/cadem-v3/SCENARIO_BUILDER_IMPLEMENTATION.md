# Scenario Builder - Implementation Status

## Overview
Implementation of the Scenario Builder feature for creating and managing hypothetical event scenarios that can be applied to synthetic agent populations.

## Implementation Timeline

### Sprint 13 - Core Implementation
- ✅ Scenario Builder page with form
- ✅ Scenario creation with validation
- ✅ Scenario listing and management
- ✅ Event impact calculation
- ✅ Scenario execution integration

### R1 - Scenario-Encuesta Connection (COMPLETED)
- ✅ Modal de selección de escenario al ejecutar encuesta
- ✅ Búsqueda de escenarios
- ✅ Filtros por categoría
- ✅ Preview de impacto esperado
- ✅ Barra de intensidad visual
- ✅ Badge de escenario en resultados (ya existía en run-info)

### R2 - Query Param Integration (COMPLETED)
- ✅ Consumo de query param `?scenario=<id>` en SurveysPage
- ✅ Modal automático con escenario pre-seleccionado
- ✅ Notificación visual de escenario pre-seleccionado
- ✅ Opción de cambiar a otro escenario o baseline

### Tarea 3 - Botón "Probar en Encuesta" (ADELANTO - Implementado antes de R2)
**Nota**: Esta tarea fue implementada antes de completar R2 por conveniencia de flujo UX.

- ✅ Botón en vista de éxito después de crear escenario
- ✅ Botón en vista de resultados del escenario
- ✅ Navegación a `/surveys?scenario=<id>`
- ✅ Query param processing en SurveysPage

## Architecture

### Components
1. **ScenarioBuilderPage** - Main UI for scenario management
2. **scenarioEventStore** - Data layer for scenario CRUD operations
3. **eventImpact** - Impact calculation engine
4. **SurveysPage** - Integration point for scenario execution

### Data Flow
```
ScenarioBuilderPage
    ↓
scenarioEventStore (create/list scenarios)
    ↓
SurveysPage (execute survey with scenario)
    ↓
surveyService (runSurvey with scenarioEventId)
    ↓
surveyRunner (apply event impact to agents)
    ↓
Results with scenario metadata
```

## UX Flow

### Creating a Scenario
1. User navigates to `/scenarios`
2. Fills scenario form (name, description, category, severity, etc.)
3. Clicks "Crear Escenario"
4. Sees success view with scenario details
5. Can click "Probar en Encuesta" to test immediately

### Testing a Scenario
1. From Scenario Builder success view, click "Probar en Encuesta"
2. Redirects to `/surveys?scenario=<id>`
3. SurveysPage detects query param and opens modal
4. Modal shows pre-selected scenario highlighted
5. User can confirm or select different scenario/baseline
6. Survey executes with selected scenario
7. Results show scenario badge

### Executing from Survey List
1. User clicks "Ejecutar" on a survey card
2. Modal opens with all available scenarios
3. User can search, filter, and preview impact
4. Selects scenario or baseline
5. Survey executes

## Files Modified

### Core Implementation
- `src/pages/ScenarioBuilderPage.ts` - Main scenario builder UI
- `src/app/events/scenarioEventStore.ts` - Scenario data layer
- `src/app/events/eventImpact.ts` - Impact calculation
- `src/styles/scenarios.css` - Styling

### R1 Integration
- `src/pages/SurveysPage.ts` - Modal de selección de escenario
- `src/styles/surveys.css` - Estilos del modal

### R2 Query Param
- `src/pages/SurveysPage.ts` - Query param handling y modal pre-seleccionado

## API Integration

### Create Scenario
```typescript
const result = await createScenario({
  name: "Crisis Económica",
  description: "Devaluación del peso",
  category: "economy",
  severity: "high",
  sentiment: -0.7,
  intensity: 0.8,
  salience: 0.9,
  affectedTopics: ["economy", "employment"]
});
```

### List Scenarios
```typescript
const result = await listScenarios({ status: 'active', limit: 100 });
```

### Execute Survey with Scenario
```typescript
const run = await runSurvey(surveyId, scenarioEventId);
```

## Status

| Feature | Status | Notes |
|---------|--------|-------|
| Create scenarios | ✅ Complete | Full validation |
| List scenarios | ✅ Complete | With filtering |
| Edit scenarios | ✅ Complete | Full form |
| Delete scenarios | ✅ Complete | With confirmation |
| Event impact calc | ✅ Complete | Topic-based |
| Scenario-Encuesta modal | ✅ Complete | R1 done |
| Query param integration | ✅ Complete | R2 done |
| "Probar en Encuesta" button | ✅ Complete | Tarea 3 (adelanto) |
| Results badge | ✅ Complete | Already existed |

## Next Steps

1. **Testing**: Run end-to-end test of complete flow
2. **Documentation**: Update user guide
3. **Analytics**: Track scenario usage

## Notes

- Tarea 3 (botón "Probar en Encuesta") fue implementada antes de R2 por conveniencia de flujo UX
- El query param `?scenario=<id>` es una solución MVP simple y explícita
- El fallback a `/surveys` (sin query param) funciona correctamente si no hay escenario
- La trazabilidad UX está completa: Scenario Builder → Encuestas → Resultados con badge
