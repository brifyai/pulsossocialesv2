# Propuesta de Estructura UI - Análisis de Encuestas

> Generado según Prompt 1 - Estrategia VS Code + Kimi 2.5

---

## 1. Estructura de Archivos Propuesta

```
src/
├── pages/
│   └── SurveyAnalysisPage.ts          # Página principal (container)
├── components/
│   └── survey-analysis/
│       ├── SurveyAnalysisSummary.ts   # KPIs cards (4 métricas principales)
│       ├── SurveyInsightsList.ts      # Lista de insights con severidad
│       ├── SurveyTopQuestions.ts      # Tabla de preguntas destacadas
│       └── QuestionDetailView.ts      # Vista detallada de pregunta
├── router/
│   └── index.ts                       # Agregar ruta 'survey-analysis'
└── styles/
    └── survey-analysis.css            # Estilos específicos (opcional MVP)
```

**Nota**: Para el MVP, los componentes pueden estar en el mismo archivo `SurveyAnalysisPage.ts` para simplificar. La separación es recomendación para post-MVP.

---

## 2. Responsabilidades por Componente

### SurveyAnalysisPage.ts (Container Principal)
**Responsabilidad**: Orquestar la carga de datos y el estado de la página.

**Estados internos**:
```typescript
type PageState = 
  | { status: 'loading' }
  | { status: 'empty' }
  | { status: 'error'; message: string }
  | { 
      status: 'success'; 
      analysis: SurveyAnalysis;
      selectedQuestionId?: string;
    };
```

**Flujo**:
1. Recibe `surveyId` o `runId` como parámetro
2. Llama a `getSurveyResultsByRun()` → obtiene `SurveyResult[]`
3. Llama a `analyzeSurveyResult(result, run)` → obtiene `SurveyAnalysis`
4. Renderiza sub-componentes pasando `analysis` como prop

**NO hace**:
- No recalcula métricas (usa el análisis ya procesado)
- No usa `buildDistributionMetrics()` directamente
- No implementa segmentación

---

### SurveyAnalysisSummary.ts (KPI Cards)
**Responsabilidad**: Mostrar 4 métricas globales en tarjetas.

**Props**:
```typescript
interface Props {
  executiveSummary: {
    totalQuestions: number;
    averageConfidence: number;
    globalConsensusLevel: string;
    averageEntropy: number;
  };
}
```

**Métricas a mostrar**:
1. **Total Preguntas**: `executiveSummary.totalQuestions`
2. **Confianza Promedio**: `executiveSummary.averageConfidence` (formato %)
3. **Nivel de Consenso**: `executiveSummary.globalConsensusLevel` (texto + badge)
4. **Entropía Promedio**: `executiveSummary.averageEntropy` (formato 0.00)

**UI**: Grid de 4 tarjetas con iconos Material Symbols.

---

### SurveyInsightsList.ts (Insights)
**Responsabilidad**: Mostrar top 5 insights con severidad e iconos.

**Props**:
```typescript
interface Props {
  insights: KeyInsight[];  // Ya viene filtrado y ordenado del análisis
}
```

**Render**:
- Máximo 5 insights (usar `insights.slice(0, 5)`)
- Cada insight muestra:
  - Icono según `type` (consenso, polarización, alerta)
  - Color según `severity` (alta=rojo, media=amarillo, baja=verde)
  - Texto descriptivo

**NO hace**:
- No genera insights (viene de `analysis.globalInsights`)
- No filtra por severidad (el análisis ya lo hizo)

---

### SurveyTopQuestions.ts (Tabla Destacados)
**Responsabilidad**: Mostrar 3 columnas con preguntas destacadas.

**Props**:
```typescript
interface Props {
  analysis: SurveyAnalysis;
  onSelectQuestion: (questionId: string) => void;
}
```

**Uso de API**:
```typescript
// Dentro del componente:
const polarized = getMostPolarizedQuestions(analysis, 5);
const consensus = getMostConsensusQuestions(analysis, 5);
const lowConfidence = getLowestConfidenceQuestions(analysis, 5);
```

**Columnas**:
1. **Más Polarizadas**: `polarized` → muestra `questionText` + `polarizationLevel`
2. **Mayor Consenso**: `consensus` → muestra `questionText` + `consensusLevel`
3. **Menor Confianza**: `lowConfidence` → muestra `questionText` + `averageConfidence`

**Interacción**: Click en pregunta → llama `onSelectQuestion(questionId)`

---

### QuestionDetailView.ts (Vista Detalle)
**Responsabilidad**: Mostrar métricas específicas de una pregunta seleccionada.

**Props**:
```typescript
interface Props {
  questionAnalysis: QuestionAnalysis;
}
```

**Secciones**:
1. **Header**: `questionText` + `questionType`
2. **Métricas**: 
   - Entropía: `distributionMetrics.entropy`
   - Polarización: `distributionMetrics.polarization`
   - Dispersión: `distributionMetrics.dispersion`
   - Tasa no respuesta: `distributionMetrics.nonResponseRate`
   - Confianza promedio: `averageConfidence`
3. **Respuesta Dominante**: `dominantResponse` (si aplica)
4. **Insights específicos**: `insights` (array de la pregunta)

**NO hace**:
- No recalcula métricas de distribución
- Usa directamente `questionAnalysis.distributionMetrics`

---

## 3. Flujo de Datos (Ajustado)

```
┌─────────────────────────────────────────────────────────────┐
│  URL: /survey-analysis?runId=abc123                         │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  SurveyAnalysisPage (Container)                             │
│  ─────────────────────────────                              │
│  1. Extrae runId de URL                                     │
│  2. getSurveyAnalysisByRun(runId) → SurveyAnalysis         │
│     (o: getSurveyResultsByRun() + analyzeSurveyResult())   │
│  3. Guarda analysis en estado local                         │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  Renderizado condicional:                                   │
│  ───────────────────────                                    │
│  if loading → Spinner                                       │
│  if error → Mensaje + botón reintentar                     │
│  if empty → "Selecciona una encuesta"                      │
│  if success → Renderiza sub-componentes                    │
└─────────────────────────────────────────────────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        ▼                   ▼                   ▼
┌───────────────┐  ┌───────────────┐  ┌───────────────┐
│   Summary     │  │   Insights    │  │   Top Qs      │
│   (KPIs)      │  │   (Lista)     │  │   (Tabla)     │
│               │  │               │  │               │
│ Props:        │  │ Props:        │  │ Props:        │
│ executiveSumm │  │ globalInsight │  │ analysis      │
└───────────────┘  └───────────────┘  └───────────────┘
                                              │
                                              ▼
                                    ┌───────────────┐
                                    │ QuestionDetail│
                                    │   (Vista)     │
                                    │               │
                                    │ Props:        │
                                    │ questionAnaly │
                                    └───────────────┘
```

---

## 4. Estrategia de Integración con Router

### Paso 1: Agregar ruta al router

**Archivo**: `src/router/index.ts`

```typescript
// Agregar a ProtectedRoute
type ProtectedRoute = 
  | 'home' | 'map' | 'territory' | 'region' 
  | 'agents' | 'surveys' | 'benchmarks' 
  | 'profile' | 'settings' | 'scenarios' | 'operations'
  | 'survey-analysis';  // ← NUEVO

// En el router switch
case 'survey-analysis':
  pageContainer.appendChild(await createSurveyAnalysisPage());
  break;
```

### Paso 2: Navegación desde SurveysPage

**Opción A**: Botón "Análisis" en la tabla de runs
```typescript
// En RunTable.ts o similar
const analyzeBtn = document.createElement('button');
analyzeBtn.onclick = () => navigateTo('survey-analysis', { runId });
```

**Opción B**: Página de análisis standalone con selector
- Usuario llega a `/survey-analysis`
- Muestra selector de encuestas/ejecuciones
- Al seleccionar, carga el análisis

### Paso 3: Pasar parámetros

**Opción recomendada**: Query params
```typescript
// Navegación
navigateTo(`survey-analysis?runId=${runId}`);

// En SurveyAnalysisPage
const params = new URLSearchParams(window.location.search);
const runId = params.get('runId');
```

---

## 5. API del Módulo Analítico a Usar

### Funciones permitidas (UI Layer):
```typescript
import { 
  analyzeSurveyResult,           // ✅ Principal: obtiene análisis completo
  getMostPolarizedQuestions,     // ✅ Helper: ranking preguntas
  getMostConsensusQuestions,     // ✅ Helper: ranking preguntas
  getLowestConfidenceQuestions,  // ✅ Helper: ranking preguntas
} from '../app/survey/analysis';

import {
  getSurveyResultsByRun,         // ✅ Obtener datos
  getSurveyRun,                  // ✅ Obtener metadata
} from '../app/survey/surveyService';
```

### Funciones NO usar en UI:
```typescript
// ❌ NO importar en componentes:
import { buildDistributionMetrics } from '../app/survey/analysis';
// Es infraestructura, no presentación
```

### Tipos a usar:
```typescript
import type { 
  SurveyAnalysis, 
  QuestionAnalysis,
  KeyInsight,
  ExecutiveSummary,
  GlobalMetrics 
} from '../app/survey/analysis/types';
```

---

## 6. Estados de UI

### Loading
```
┌─────────────────────────────┐
│     ⟳ Analizando...         │
│                             │
│  Cargando resultados de     │
│  la encuesta...             │
└─────────────────────────────┘
```

### Empty
```
┌─────────────────────────────┐
│      📊 Sin datos           │
│                             │
│  Selecciona una encuesta    │
│  para ver el análisis       │
│                             │
│  [Seleccionar encuesta]     │
└─────────────────────────────┘
```

### Error
```
┌─────────────────────────────┐
│      ⚠️ Error               │
│                             │
│  No se pudo cargar el       │
│  análisis                   │
│                             │
│  [Reintentar]               │
└─────────────────────────────┘
```

### Success (estructura)
```
┌─────────────────────────────────────────────────────────────┐
│  🔍 ANÁLISIS DE ENCUESTA                    [Volver]       │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐           │
│  │ 12      │ │ 85%     │ │ Alto    │ │ 0.45    │           │
│  │Preguntas│ │Confianza│ │Consenso │ │Entropía │           │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘           │
├─────────────────────────────────────────────────────────────┤
│  📊 INSIGHTS DETECTADOS                                    │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ 🔴 Alta polarización en "Pregunta 3"                 │  │
│  │ 🟡 Baja confianza en 2 preguntas                     │  │
│  │ 🟢 Alto consenso en "Pregunta 7"                     │  │
│  └──────────────────────────────────────────────────────┘  │
├─────────────────────────────────────────────────────────────┤
│  📈 PREGUNTAS DESTACADAS                                   │
│  ┌──────────────┬──────────────┬──────────────┐            │
│  │ Más Polariz. │ + Consenso   │ - Confianza  │            │
│  │ Pregunta 3   │ Pregunta 7   │ Pregunta 5   │            │
│  │ Pregunta 8   │ Pregunta 2   │ Pregunta 9   │            │
│  └──────────────┴──────────────┴──────────────┘            │
├─────────────────────────────────────────────────────────────┤
│  🔬 ANÁLISIS DETALLADO                                     │
│  [Pregunta 3 ▼]                                            │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ Entropía: 0.82 (alta)                                │  │
│  │ Polarización: 0.67 (alta)                            │  │
│  │ Confianza: 78%                                       │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

---

## 7. Checklist de Implementación

### Fase 1: Estructura Base
- [ ] Crear `SurveyAnalysisPage.ts` con estados básicos
- [ ] Agregar ruta `'survey-analysis'` al router
- [ ] Implementar loading, empty, error states
- [ ] Integrar carga de datos con `analyzeSurveyResult()`

### Fase 2: Componentes Principales
- [ ] `SurveyAnalysisSummary` - KPI cards
- [ ] `SurveyInsightsList` - Lista de insights
- [ ] `SurveyTopQuestions` - Tabla de destacadas

### Fase 3: Vista Detallada
- [ ] `QuestionDetailView` - Métricas específicas
- [ ] Selector de pregunta
- [ ] Mostrar distribución de respuestas

### Fase 4: Comparación (Post-MVP)
- [ ] Selector baseline vs escenario
- [ ] Tabla de comparación
- [ ] Indicadores de impacto

---

## 8. Notas de Implementación

### Anti-Sobreingeniería
- ✅ Usar funciones simples, no clases
- ✅ Estado local con variables, no estado global
- ✅ Reutilizar estilos CSS existentes
- ✅ Un archivo por fase, no separar prematuramente

### Performance
- El análisis se calcula una vez al cargar la página
- Los helpers (`getMostPolarizedQuestions`) son O(n log n) por ordenamiento
- No hay cálculos pesados en renderizado

### TypeScript
- Todas las funciones deben tener tipos de retorno explícitos
- Usar `type` imports para mejor tree-shaking
- Validar con `tsc --noEmit` antes de commit

---

## 9. Próximos Pasos

1. **Validar esta propuesta** con el equipo
2. **Implementar Fase 1** (estructura base)
3. **Testear** con datos reales de encuestas
4. **Iterar** según feedback

---

*Documento generado para validación antes de implementación de código.*
