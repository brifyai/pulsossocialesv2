# Análisis: Vinculación Escenarios-Encuestas y Gaps UX

**Fecha:** 29/03/2026  
**Versión:** CADEM v1.2  
**Estado:** MVP Funcional con Gaps Identificados

---

## 1. Resumen Ejecutivo

El sistema de escenarios hipotéticos (CADEM v1.2) está **funcionalmente implementado** y ahora incluye **R1: Modal de Pre-ejecución** que permite seleccionar escenarios al ejecutar encuestas. Los usuarios pueden crear escenarios, ejecutar encuestas, y aplicar escenarios desde la UI.

### Estado Actual
- ✅ Backend: Completo (scenarioEventStore, surveyRunner con soporte de escenarios)
- ✅ Scenario Builder: Funcional (crear/editar/eliminar escenarios)
- ✅ Surveys Page: **R1 Implementado** - Modal de selección de escenario al ejecutar
- ⚠️ Vinculación UX: Parcial (R1 completo, R2-R6 pendientes)

### Implementación R1 Completada (29/03/2026)
- ✅ Modal de pre-ejecución con selección de escenario
- ✅ Opción "Ejecutar sin escenario" (baseline)
- ✅ Lista de escenarios activos con metadata
- ✅ Estilos CSS para el modal
- ✅ Integración con surveyService.runSurveyWithScenario()

---

## 2. Arquitectura Técnica Actual

### 2.1 Flujo de Datos

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│ ScenarioBuilder │────▶│ scenarioEventStore│────▶│ Supabase        │
│   Page          │     │   (CRUD)          │     │ scenario_events │
└─────────────────┘     └──────────────────┘     └─────────────────┘
                                                        │
┌─────────────────┐     ┌──────────────────┐           │
│ SurveysPage     │────▶│ surveyService    │           │
│   (UI básica)   │     │   (runSurvey)    │◀──────────┘
└─────────────────┘     └──────────────────┘
                               │
                               ▼
                        ┌──────────────────┐
                        │ surveyRunner     │
                        │ (scenarioEventId)│
                        └──────────────────┘
                               │
                               ▼
                        ┌──────────────────┐
                        │ opinionEngine    │
                        │ (aplica impacto) │
                        └──────────────────┘
```

### 2.2 Puntos de Integración Técnicos

#### A. ScenarioEventStore → SurveyRunner
**Archivo:** `src/app/events/scenarioEventStore.ts:285-306`

La función `scenarioToWeeklyEvent()` convierte un escenario al formato `WeeklyEvent` compatible con el motor de opiniones:

```typescript
export function scenarioToWeeklyEvent(
  scenario: ScenarioEvent,
  weekKey?: string
): WeeklyEvent {
  return {
    id: scenario.id,
    weekKey: weekKey || 'SCENARIO-001',
    title: scenario.name,
    summary: scenario.description,
    category: scenario.category,
    sentiment: scenario.sentiment,
    intensity: scenario.intensity,
    salience: scenario.salience,
    severity: scenario.severity,
    targetEntities: scenario.targetEntities,
    affectedSegments: scenario.affectedSegments,
    createdAt: scenario.createdAt,
    createdBy: scenario.userId
  };
}
```

#### B. SurveyRunner → Aplicación de Escenario
**Archivo:** `src/app/survey/surveyRunner.ts:65-85`

El `SurveyRunnerInput` acepta un `scenarioEventId` opcional:

```typescript
export interface SurveyRunnerInput {
  surveyDefinition: CademSurveyDefinition;
  agents: CademAdapterAgent[];
  engineMode: EngineMode;
  persistState?: boolean;
  weekKey?: string;
  debug?: boolean;
  useEvents?: boolean;
  eventWindowSize?: number;
  scenarioEventId?: string;  // ← Aquí se pasa el escenario
}
```

**Archivo:** `src/app/survey/surveyRunner.ts:115-135`

El runner carga el escenario y lo convierte a evento:

```typescript
// Cargar escenario hipotético si se proporciona
if (scenarioEventId) {
  const scenarioResult = await getScenarioById(scenarioEventId);
  
  if (scenarioResult.success && scenarioResult.data) {
    const scenarioEvent = scenarioToWeeklyEvent(scenarioResult.data, weekKey || 'SCENARIO');
    weeklyEvents.push(scenarioEvent);
    
    if (debug) {
      console.log(`[SurveyRunner] Escenario aplicado: ${scenarioEvent.title}`);
      // ...
    }
  }
}
```

#### C. SurveyService → Ejecución con Escenario
**Archivo:** `src/app/survey/surveyService.ts:85-120`

La función `runSurvey()` en surveyService NO expone el parámetro `scenarioEventId`. Solo ejecuta encuestas sin escenarios:

```typescript
export async function runSurvey(surveyId: string): Promise<SurveyRun> {
  // ...
  
  // 3. Generar respuestas sintéticas
  const useCademEngine = survey.engineMode === 'cadem';
  let responses: AgentResponse[];
  
  if (useCademEngine) {
    responses = await runCademSurveyWithAgents(survey, selectedAgents);
    // ← No hay paso de scenarioEventId
  }
  // ...
}
```

---

## 3. Gaps Identificados

### 3.1 Gap CRÍTICO: No hay forma de seleccionar escenario al ejecutar encuesta

**Ubicación:** `src/pages/SurveysPage.ts`

**Problema:** El botón "Ejecutar" en la lista de encuestas (`executeSurvey`) no permite seleccionar un escenario:

```typescript
// Línea ~850 en SurveysPage.ts
async function executeSurvey(surveyId: string): Promise<void> {
  // ...
  try {
    const run = await runSurvey(surveyId);  // ← Sin parámetro de escenario
    // ...
  }
}
```

**Impacto:** Usuario no puede aplicar escenarios desde la UI.

**Solución Propuesta:**
1. Agregar modal de pre-ejecución que permita:
   - Ejecutar sin escenario (baseline)
   - Seleccionar escenario existente
   - Crear escenario rápido

### 3.2 Gap: No hay visualización de escenario aplicado en resultados

**Ubicación:** `src/pages/SurveysPage.ts:renderResults`

**Problema:** La vista de resultados no muestra si se aplicó un escenario:

```typescript
// En renderResults, no hay referencia a scenarioEventId
const exportData: any = {
  exportInfo: { ... },
  survey: { ... },
  execution: { ... },
  // Falta: scenarioApplied
  results: [ ... ]
};
```

**Impacto:** Usuario no puede distinguir entre resultados baseline vs. con escenario.

**Solución Propuesta:**
1. Agregar metadata de escenario en `SurveyRun`
2. Mostrar badge "Escenario Aplicado" en resultados
3. Incluir nombre del escenario en exportaciones

### 3.3 Gap: No hay comparación baseline vs. escenario

**Problema:** No existe funcionalidad para comparar resultados de la misma encuesta:
- Ejecución baseline (sin escenario)
- Ejecución con escenario X
- Ejecución con escenario Y

**Impacto:** Usuario no puede medir el impacto del escenario.

**Solución Propuesta:**
1. Agregar vista "Comparar Ejecuciones"
2. Permitir seleccionar 2+ runs de la misma encuesta
3. Mostrar delta de respuestas

### 3.4 Gap: Scenario Builder no tiene CTA hacia encuestas

**Ubicación:** `src/pages/ScenarioBuilderPage.ts`

**Problema:** Después de crear un escenario, no hay botón "Probar en Encuesta":

```typescript
// En renderScenarioDetail, solo hay:
// - Editar
// - Duplicar
// - Activar/Desactivar
// - Eliminar
// Falta: "Ejecutar Encuesta con este Escenario"
```

**Impacto:** Flujo de trabajo interrumpido. Usuario debe navegar manualmente a Encuestas.

**Solución Propuesta:**
1. Agregar botón "Probar en Encuesta" en detalle de escenario
2. Redirigir a SurveysPage con pre-filtro de escenario seleccionado

### 3.5 Gap: No hay lista de escenarios disponibles en SurveysPage

**Problema:** La página de encuestas no muestra escenarios existentes:

```typescript
// En renderCreateForm y renderSurveyList, no hay:
// - Lista de escenarios
// - Selector de escenario
// - Indicador de escenarios activos
```

**Solución Propuesta:**
1. Agregar sidebar o sección "Escenarios Disponibles"
2. Mostrar escenarios activos con badge de estado
3. Permitir aplicar escenario desde la lista

---

## 4. Matriz de Funcionalidad vs. UX

| Funcionalidad | Backend | ScenarioBuilder | SurveysPage | UX Completa |
|--------------|---------|-----------------|-------------|-------------|
| Crear escenario | ✅ | ✅ | N/A | ✅ |
| Editar escenario | ✅ | ✅ | N/A | ✅ |
| Eliminar escenario | ✅ | ✅ | N/A | ✅ |
| Listar escenarios | ✅ | ✅ | ❌ | ⚠️ |
| Aplicar escenario a encuesta | ✅ | ❌ | ✅ (R1) | ✅ |
| Ver escenario en resultados | ✅ | N/A | ❌ | ❌ |
| Comparar con/escenario | ✅ | ❌ | ❌ | ❌ |
| Exportar con metadata de escenario | ✅ | N/A | ❌ | ❌ |

**Leyenda:**
- ✅ = Implementado
- ⚠️ = Parcial
- ❌ = No implementado
- N/A = No aplica

**Nota:** R1 (Modal de Pre-ejecución) implementado el 29/03/2026. Permite seleccionar escenario al ejecutar encuesta.

---

## 5. Recomendaciones de Implementación

### 5.1 Prioridad Alta (MVP UX)

#### R1: Modal de Pre-ejecución
**Archivos a modificar:**
- `src/pages/SurveysPage.ts`

**Implementación:**
```typescript
// Agregar estado
let selectedScenarioId: string | null = null;

// Modificar executeSurvey para mostrar modal
async function executeSurvey(surveyId: string): Promise<void> {
  // Mostrar modal con opciones:
  // 1. Ejecutar baseline (sin escenario)
  // 2. Seleccionar escenario existente (dropdown)
  // 3. Crear escenario rápido (redirigir)
  
  const scenarioId = await showExecutionModal(surveyId);
  
  // Luego ejecutar con scenarioId opcional
  const run = await runSurveyWithScenario(surveyId, scenarioId);
}
```

#### R2: Badge de Escenario en Resultados
**Archivos a modificar:**
- `src/types/survey.ts` (agregar scenarioEventId a SurveyRun)
- `src/pages/SurveysPage.ts:renderResults`

**Implementación:**
```typescript
// En renderResults, agregar:
if (selectedRun.scenarioEventId) {
  header.innerHTML += `
    <div class="scenario-badge">
      <span class="material-symbols-outlined">psychology</span>
      Escenario: ${selectedRun.scenarioName}
    </div>
  `;
}
```

### 5.2 Prioridad Media (Mejora UX)

#### R3: Botón "Probar en Encuesta" en ScenarioBuilder
**Archivos a modificar:**
- `src/pages/ScenarioBuilderPage.ts:renderScenarioDetail`

**Implementación:**
```typescript
// Agregar botón en acciones del escenario
<button class="btn btn-primary" id="btn-test-survey">
  <span class="material-symbols-outlined">assignment</span>
  Probar en Encuesta
</button>

// Event listener:
// Redirigir a /surveys?scenarioId=xxx
```

#### R4: Lista de Escenarios en SurveysPage
**Archivos a modificar:**
- `src/pages/SurveysPage.ts:renderSurveyList`

**Implementación:**
```typescript
// Agregar sidebar con escenarios disponibles
const scenariosSection = document.createElement('div');
scenariosSection.className = 'scenarios-sidebar';
scenariosSection.innerHTML = `
  <h4>Escenarios Disponibles</h4>
  <div class="scenario-list">
    ${scenarios.map(s => `
      <div class="scenario-item" data-id="${s.id}">
        <span class="scenario-name">${s.name}</span>
        <span class="scenario-category">${s.category}</span>
      </div>
    `).join('')}
  </div>
`;
```

### 5.3 Prioridad Baja (Nice to Have)

#### R5: Comparación de Ejecuciones
Nueva vista para comparar múltiples runs de la misma encuesta.

#### R6: Exportar con Metadata de Escenario
Incluir información del escenario en exportaciones JSON/CSV.

---

## 6. Cambios en Tipos Necesarios

### 6.1 SurveyRun (src/types/survey.ts)

```typescript
export interface SurveyRun {
  id: string;
  surveyId: string;
  startedAt: string;
  completedAt: string;
  totalAgents: number;
  responses: AgentResponse[];
  metadata: {
    segmentMatched: number;
    sampleSizeRequested: number;
    sampleSizeActual: number;
    // NUEVO:
    scenarioEventId?: string;
    scenarioName?: string;
    scenarioCategory?: string;
  };
  engineMode: string;
  engineVersion: string;
  persistState: boolean;
}
```

### 6.2 SurveyService.runSurvey (src/app/survey/surveyService.ts)

```typescript
// Agregar parámetro opcional
export async function runSurvey(
  surveyId: string,
  options?: {
    scenarioEventId?: string;
    debug?: boolean;
  }
): Promise<SurveyRun> {
  // ...
  // Pasar scenarioEventId a runCademSurveyWithAgents
}
```

---

## 7. Conclusión

El sistema tiene **toda la infraestructura técnica** necesaria para vincular escenarios con encuestas, pero falta la **capa de presentación** que exponga esta funcionalidad a los usuarios.

### Próximos Pasos Recomendados:

1. **Inmediato:** Implementar R1 (Modal de Pre-ejecución) - ~4 horas
2. **Corto plazo:** Implementar R2 (Badge en Resultados) - ~2 horas
3. **Mediano plazo:** Implementar R3 y R4 (Integración bidireccional) - ~6 horas
4. **Largo plazo:** R5 y R6 (Features avanzadas) - ~8 horas

**Total estimado:** 20 horas de desarrollo para UX completa de vinculación escenarios-encuestas.

---

## 8. Referencias

- `src/pages/ScenarioBuilderPage.ts` - UI de escenarios
- `src/pages/SurveysPage.ts` - UI de encuestas
- `src/app/events/scenarioEventStore.ts` - Store de escenarios
- `src/app/survey/surveyRunner.ts` - Runner con soporte de escenarios
- `src/app/survey/surveyService.ts` - Service de encuestas
- `docs/cadem-v3/SCENARIO_BUILDER_UX.md` - Documentación UX original
