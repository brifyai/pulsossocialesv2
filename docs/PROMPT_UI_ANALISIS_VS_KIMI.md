# PROMPT: UI Analítica para VS Code + Kimi 2.5

> ⚠️ **IMPORTANTE - Source of Truth**: La fuente de verdad son los archivos del código actual. Si este prompt nombra funciones distintas a las reales, usa siempre los nombres reales del código. No inventes imports. Revisa `src/app/survey/analysis/index.ts` para confirmar exportaciones reales.

## Contexto del Proyecto

**Pulsos Sociales** - Aplicación de encuestas sintéticas con:
- TypeScript + Arquitectura SPA
- Motor de opinión legacy y CADEM
- Sistema de escenarios y eventos
- **Nuevo módulo analítico** recién implementado en `src/app/survey/analysis/`

## Estado Actual del Módulo Analítico

### ✅ Implementado y Testeado (66/66 tests pasando)
- `src/app/survey/analysis/types.ts` - Tipos base
- `src/app/survey/analysis/distributionMetrics.ts` - Métricas de distribución (entropía, polarización, dispersión, tasa de no respuesta)
- `src/app/survey/analysis/questionAnalysis.ts` - Análisis por pregunta
- `src/app/survey/analysis/surveyAnalysisService.ts` - Servicio principal con análisis completos
- `src/app/survey/analysis/index.ts` - Exportaciones

### ⚠️ Parcialmente Implementado
- **Segmentación demográfica**: Tipos definidos (`SegmentBreakdown`, `SegmentAnalysis`) pero lógica de análisis profundo pendiente

### 📊 Funciones del Servicio Disponibles (VERIFICAR EN index.ts)
```typescript
// src/app/survey/analysis/index.ts - Exportaciones reales:
export { analyzeSurveyResult } from './surveyAnalysisService';
export { analyzeQuestionResult } from './questionAnalysis';
export { buildDistributionMetrics } from './distributionMetrics';
export { 
  getMostPolarizedQuestions,
  getMostConsensusQuestions,  // NOTA: no getHighestConsensusQuestions
  getLowestConfidenceQuestions 
} from './surveyAnalysisService';

// Funciones internas (no exportadas directamente):
// - generateInsights() - usada dentro de analyzeSurveyResult
// - compareWithBaseline() - disponible internamente en surveyAnalysisService
```

### 📝 Nota sobre Nombres
Los nombres correctos según el código real:
- ✅ `analyzeSurveyResult()` (no analyzeSurveyRun)
- ✅ `getMostConsensusQuestions()` (no getHighestConsensusQuestions)
- ✅ `analyzeQuestionResult()` (no analyzeQuestion)
- ✅ `buildDistributionMetrics()` (no calculateDistributionMetrics)

## Arquitectura de Páginas Existente

### Router (`src/router/index.ts`)
```typescript
export type ProtectedRoute = 
  'home' | 'map' | 'territory' | 'region' | 
  'agents' | 'surveys' | 'benchmarks' | 
  'profile' | 'settings' | 'scenarios' | 'operations';
```

### Patrón de Páginas Actual
- `src/pages/SurveysPage.ts` - Lista, creación, resultados, comparación
- `src/pages/ScenarioBuilderPage.ts` - Builder de escenarios
- `src/pages/OperationsPage.ts` - Panel de operaciones
- `src/pages/BenchmarksPage.ts` - Benchmarks

### Estructura Típica de Página
```typescript
// 1. Imports
import { navigateTo } from '../router';
import { authService } from '../services/auth';

// 2. Estado local
let currentView: ViewMode = 'list';
let currentData: Data | null = null;

// 3. Función principal createPage()
export async function createPage(): Promise<HTMLElement> {
  const page = document.createElement('div');
  page.className = 'page page-name';
  page.id = 'page-id';
  
  // Cargar datos
  // Render contenido según estado
  // Attach listeners
  
  return page;
}

// 4. Funciones de renderizado por vista
function renderList(container): void
function renderDetail(container): void

// 5. Funciones auxiliares
function formatDate(): string
function escapeHtml(): string

// 6. Cleanup
export function cleanup(): void
```

### Estilos CSS Existentes
```css
/* src/styles/surveys.css - Referencia principal */
.page { }
.page-title { }
.card { }
.card-header { }
.card-body { }
.btn { }
.btn-primary { }
.btn-secondary { }
.form-select { }
.stats-grid { }
.stat-card { }
.stat-value { }
.stat-label { }
.table { }
.badge { }
.badge-success { }
.badge-warning { }
.badge-danger { }
```

### Ejemplo de Uso del Módulo Analítico (Nombres Correctos)
```typescript
import { 
  analyzeSurveyResult, 
  getMostPolarizedQuestions,
  getMostConsensusQuestions 
} from '../app/survey/analysis';

const analysis = analyzeSurveyResult(run, results);
const polarized = getMostPolarizedQuestions(analysis, 5);
const consensus = getMostConsensusQuestions(analysis, 5);
```

## Requerimientos de la UI Analítica

### Nueva Ruta
Agregar al router: `'survey-analysis'` como `ProtectedRoute`

### Nueva Página
`src/pages/SurveyAnalysisPage.ts`

### Funcionalidades Requeridas

#### 1. **Resumen Ejecutivo** (KPIs principales)
- Total de preguntas analizadas
- Promedio de confianza
- Tasa de respuesta global
- Nivel de consenso general
- Entropía promedio

#### 2. **Métricas Globales** (tarjetas)
- Distribución de tipos de preguntas
- Tasa de no respuesta
- Polarización promedio
- Confianza promedio

#### 3. **Insights Automáticos** (lista)
- Top 5 insights generados
- Clasificación por severidad (alta/media/baja)
- Iconos según tipo (consenso, polarización, alerta)

#### 4. **Preguntas Destacadas** (tabla)
- Top 5 más polarizadas
- Top 5 con mayor consenso
- Top 5 con menor confianza
- Enlace a detalle por pregunta

#### 5. **Análisis por Pregunta** (vista detalle)
- Selector de pregunta
- Métricas específicas
- Distribución de respuestas
- Insights de la pregunta
- Comparación con baseline (si aplica)

#### 6. **Comparación Baseline vs Escenario**
- Selector de ejecución baseline
- Selector de ejecución con escenario
- Tabla de comparación por pregunta
- Indicadores de impacto

## Diseño UX/UI Sugerido

### Layout
```
┌─────────────────────────────────────────────────────────────┐
│  🔍 ANÁLISIS DE ENCUESTA                    [Volver]       │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐           │
│  │ 12      │ │ 85%     │ │ 3.2     │ │ 0.45    │           │
│  │Preguntas│ │Confianza│ │Entropía │ │Polariz. │           │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘           │
├─────────────────────────────────────────────────────────────┤
│  📊 INSIGHTS DETECTADOS                                    │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ 🔴 Alta polarización en "Pregunta 3"                 │  │
│  │ 🟡 Baja confianza en 2 preguntas                     │  │
│  │ 🟢 Alto consenso en "Pregunta 7"                     │  │
│  └──────────────────────────────────────────────────────┘  │
├─────────────────────────────────────────────────────────────┤
│  📈 PREGUNTAS DESTACADAS          [Ver todas]              │
│  ┌──────────────┬──────────────┬──────────────┐            │
│  │ Más Polariz. │ + Consenso   │ - Confianza  │            │
│  │ Pregunta 3   │ Pregunta 7   │ Pregunta 5   │            │
│  │ Pregunta 8   │ Pregunta 2   │ Pregunta 9   │            │
│  └──────────────┴──────────────┴──────────────┘            │
├─────────────────────────────────────────────────────────────┤
│  🔬 ANÁLISIS DETALLADO                                     │
│  [Selector: Pregunta 1 ▼]                                  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ Distribución: [████████░░░░░░░░░░] 45%               │  │
│  │ Entropía: 0.82 (alta)                                │  │
│  │ Polarización: 0.23 (baja)                            │  │
│  └──────────────────────────────────────────────────────┘  │
├─────────────────────────────────────────────────────────────┤
│  ⚖️ COMPARAR CON BASELINE                                  │
│  [Selector Baseline ▼] vs [Selector Escenario ▼]           │
│  [Botón: Comparar]                                         │
└─────────────────────────────────────────────────────────────┘
```

## Especificaciones Técnicas

### Estilos
Usar clases existentes del proyecto:
- `.page`, `.page-title`, `.page-subtitle`
- `.card`, `.card-header`, `.card-body`
- `.btn`, `.btn-primary`, `.btn-secondary`
- `.form-select`, `.form-input`
- `.stats-grid`, `.stat-card`, `.stat-value`, `.stat-label`
- `.table`, `.table-header`, `.table-row`
- `.badge`, `.badge-success`, `.badge-warning`, `.badge-danger`

### Iconos
Usar Material Symbols:
- `analytics` - Página de análisis
- `insights` - Insights
- `bar_chart` - Métricas
- `warning` - Alertas
- `check_circle` - Éxito/consenso
- `trending_up` / `trending_down` - Tendencias
- `compare_arrows` - Comparación
- `psychology` - Análisis profundo
- `arrow_back` - Volver

### Estados de UI
- **Loading**: Spinner + mensaje "Analizando encuesta..."
- **Empty**: Icono + mensaje "Selecciona una encuesta para analizar"
- **Error**: Icono + mensaje + botón reintentar
- **Success**: Contenido completo con todas las secciones

## Flujo de Implementación Sugerido

### Fase 1: Estructura Base
1. Crear `src/pages/SurveyAnalysisPage.ts` con estructura mínima
2. Agregar ruta `'survey-analysis'` al router
3. Crear función `createSurveyAnalysisPage()` que retorne HTMLElement
4. Implementar estados básicos (loading, empty, error)

### Fase 2: Componentes Principales
1. **KPI Cards**: Tarjetas con métricas globales
2. **Insights List**: Lista de insights con severidad
3. **Top Questions**: Tabla con preguntas destacadas
4. **Question Selector**: Dropdown para seleccionar pregunta

### Fase 3: Vista Detallada
1. **Question Detail**: Métricas específicas de pregunta
2. **Distribution Bars**: Barras de distribución visual
3. **Question Insights**: Insights específicos

### Fase 4: Comparación
1. **Baseline Selector**: Selector de ejecución baseline
2. **Scenario Selector**: Selector de ejecución con escenario
3. **Comparison Table**: Tabla de comparación
4. **Impact Indicators**: Indicadores visuales de impacto

## Integración con Servicios Existentes

### Desde surveyService.ts
```typescript
import { 
  getSurveyRuns, 
  getSurveyResultsByRun,
  getAllSurveys 
} from '../app/survey/surveyService';
```

### Desde analysis module (NOMBRES CORRECTOS)
```typescript
import { 
  analyzeSurveyResult,           // ✅ Correcto
  getMostPolarizedQuestions,     // ✅ Correcto
  getMostConsensusQuestions,     // ✅ Correcto (no getHighestConsensusQuestions)
  getLowestConfidenceQuestions   // ✅ Correcto
} from '../app/survey/analysis';
```

### Tipos necesarios
```typescript
import type { 
  SurveyRun, 
  SurveyResult, 
  SurveyDefinition 
} from '../types/survey';

import type { 
  SurveyAnalysis, 
  QuestionAnalysis,
  KeyInsight 
} from '../app/survey/analysis/types';
```

## Ejemplo de Uso del Prompt con VS Code + Kimi 2.5

### Paso 1: Solicitar Propuesta de Estructura (PROMPT 1)
```
Quiero implementar una UI analítica para encuestas. 
Primero, revisa el archivo docs/PROMPT_UI_ANALISIS_VS_KIMI.md 
y propón la estructura de archivos y componentes necesarios.

**IMPORTANTE - Restricciones para esta primera iteración de UI:**

1. **NO uses `buildDistributionMetrics()` directamente en componentes de UI** - es infraestructura analítica, no capa de presentación
2. **NO recalculues métricas en la capa de presentación** - la UI debe consumir el análisis ya procesado
3. **NO implementes segmentación todavía** - aunque existan tipos relacionados (`SegmentBreakdown`, `SegmentAnalysis`), el MVP tiene `segmentationAvailable: false`
4. **Usa solo estas funciones de la API analítica:**
   - `analyzeSurveyResult(result, run)` - para obtener el análisis completo
   - `getMostPolarizedQuestions(analysis, limit)` - para ranking
   - `getMostConsensusQuestions(analysis, limit)` - para ranking (NOTA: no getHighestConsensusQuestions)
   - `getLowestConfidenceQuestions(analysis, limit)` - para ranking

5. **La UI debe consumir el análisis ya procesado desde:**
   - `SurveyAnalysis` objeto con `questionAnalyses`, `globalInsights`, `globalMetrics`, `executiveSummary`
   - No reconstruir análisis matemático en la UI

**No implementes todavía el código completo.**

Primero entrega solo:
1. Estructura de archivos propuesta
2. Responsabilidades por componente
3. Flujo de datos
4. Estrategia de integración con el router o página existente

Espera validación antes de generar código.
```

### Paso 2: Implementar por Fases
```
"Implementa la Fase 1: Estructura Base
- Crear SurveyAnalysisPage.ts con estados básicos
- Agregar ruta al router
- Implementar loading, empty, error states"
```

### Paso 3: Componentes Principales
```
"Implementa la Fase 2: Componentes Principales
- KPI Cards con métricas globales
- Insights List
- Top Questions table"
```

### Paso 4: Vista Detallada y Comparación
```
"Implementa las Fases 3 y 4:
- Question Detail view
- Distribution visualization
- Baseline vs Scenario comparison"
```

## Checklist de Validación

- [ ] Página carga sin errores
- [ ] Estados loading/empty/error funcionan
- [ ] KPIs muestran datos correctos
- [ ] Insights se clasifican por severidad
- [ ] Top questions se ordenan correctamente
- [ ] Selector de preguntas funciona
- [ ] Vista detallada muestra métricas
- [ ] Comparación baseline vs escenario funciona
- [ ] Navegación de vuelta funciona
- [ ] Estilos consistentes con el proyecto
- [ ] TypeScript sin errores
- [ ] No hay dependencias nuevas

## Restricciones Anti-Sobreingeniería

Para mantener el MVP simple y funcional:

**✅ Prefiere:**
- Componentes pequeños y enfocados
- Integración incremental (una fase a la vez)
- Reutilización de funciones existentes
- Una sola página funcional antes de agregar subcomponentes avanzados
- Soluciones directas sobre patrones abstractos

**❌ Evita:**
- Estado global nuevo (usa estado local de la página)
- Librerías nuevas (charts, gráficos complejos)
- Patrones abstractos innecesarios (factories, providers, etc.)
- Arquitectura más compleja de la necesaria
- Optimizaciones prematuras

## Criterio de Parada por Fase

**IMPORTANTE**: Detente al final de cada fase. No implementes la siguiente automáticamente. Espera validación antes de continuar.

Cada fase debe:
1. Estar completa y funcional
2. Pasar validación manual
3. Ser aprobada antes de continuar

## Notas Importantes

1. **No modificar** el motor de opinión existente
2. **No agregar** dependencias externas nuevas
3. **Mantener** compatibilidad con tipos actuales
4. **Reutilizar** estilos y componentes existentes
5. **Diseñar** para crecimiento futuro (segmentación, más visualizaciones)
6. **Testear** con datos reales de encuestas ejecutadas

## Próximos Pasos Post-MVP

1. **Segmentación demográfica**: Análisis por regiones, edad, sexo
2. **Visualizaciones avanzadas**: Charts de distribución
3. **Exportación**: PDF/Excel del análisis
4. **Análisis temporal**: Tendencias entre ejecuciones
5. **Alertas automáticas**: Notificaciones de cambios significativos
