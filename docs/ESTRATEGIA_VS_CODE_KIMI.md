# Estrategia de Trabajo con VS Code + Kimi 2.5

## Resumen Ejecutivo

Se ha creado un **prompt completo y estructurado** para implementar la UI analítica del módulo de encuestas usando VS Code + Kimi 2.5.

## Archivo Principal

📄 **`docs/PROMPT_UI_ANALISIS_VS_KIMI.md`**

Este archivo contiene toda la información necesaria para que Kimi 2.5 implemente la UI analítica paso a paso.

## Estado del Proyecto

### ✅ Módulo Analítico Implementado
- **66/66 tests pasando**
- Servicios completos en `src/app/survey/analysis/`
- Funciones disponibles (VERIFICAR EN index.ts):
  - `analyzeSurveyResult()` - Análisis completo de encuesta
  - `getMostPolarizedQuestions()` - Preguntas más polarizadas
  - `getMostConsensusQuestions()` - Mayor consenso (no getHighestConsensusQuestions)
  - `getLowestConfidenceQuestions()` - Menor confianza
  - `buildDistributionMetrics()` - Métricas de distribución
  - `analyzeQuestionResult()` - Análisis por pregunta
  - `compareWithBaseline()` - Comparación baseline vs escenario (interna)

> ⚠️ **IMPORTANTE**: Siempre verificar los nombres reales en `src/app/survey/analysis/index.ts` antes de usarlos.

### ⚠️ Segmentación Demográfica
- Tipos definidos pero lógica profunda pendiente
- No bloquea el MVP de UI

## Estrategia de Prompts (Orden Recomendado)

### Prompt 0: Validar API Real (OBLIGATORIO PRIMERO)

```
Antes de implementar la UI, necesito que verifiques la API real del módulo de análisis.

Revisa exactamente estos archivos:
1. `src/app/survey/analysis/index.ts`
2. `src/app/survey/analysis/surveyAnalysisService.ts`
3. `src/app/survey/analysis/questionAnalysis.ts`
4. `src/app/survey/analysis/types.ts`

Quiero que listes por separado:

A. Funciones exportadas (con sus firmas completas)
B. Tipos exportados (interfaces, types, enums)
C. Helpers exportados públicamente
D. Nombres que aparecen en la documentación pero NO existen realmente en el código

Importante:
- No asumas nombres
- Usa exactamente el código como fuente de verdad
- Si detectas discrepancias entre documentación y código, prioriza el código
- No implementes nada todavía; solo valida la API real
```

### Prompt 1: Diseño de Estructura
```
"Revisa docs/PROMPT_UI_ANALISIS_VS_KIMI.md y propón 
la estructura de archivos para la UI analítica.

Usa los nombres de funciones reales que identificamos en el Prompt 0.
No implementes código todavía, solo la propuesta."
```

### Prompt 2: Fase 1 - Estructura Base
```
"Implementa la Fase 1:
- Crear src/pages/SurveyAnalysisPage.ts
- Agregar ruta 'survey-analysis' al router
- Estados loading, empty, error

Usa los nombres correctos de funciones del módulo analysis."
```

### Prompt 3: Fase 2 - Componentes Principales
```
"Implementa la Fase 2:
- KPI Cards con métricas globales
- Insights List con severidad
- Top Questions table

Usa analyzeSurveyResult, getMostPolarizedQuestions, getMostConsensusQuestions, etc."
```

### Prompt 4: Fase 3 - Vista Detallada
```
"Implementa la Fase 3:
- Question Detail view
- Distribution bars
- Question insights"
```

### Prompt 5: Fase 4 - Comparación
```
"Implementa la Fase 4:
- Baseline vs Scenario comparison
- Impact indicators
- Comparison table"
```

## Contenido del Prompt

El prompt incluye:

1. **Contexto del proyecto** - Tecnologías y arquitectura
2. **Estado actual** - Módulo analítico implementado
3. **Arquitectura de páginas** - Patrones existentes
4. **Requerimientos de UI** - 6 funcionalidades principales
5. **Diseño UX/UI** - Layout visual con ASCII
6. **Especificaciones técnicas** - Estilos, iconos, estados
7. **Flujo de implementación** - 4 fases ordenadas
8. **Integración con servicios** - Imports necesarios
9. **Checklist de validación** - 12 items
10. **Notas importantes** - Restricciones y guías

## Próximos Pasos

1. Abrir VS Code
2. Cargar el archivo `docs/PROMPT_UI_ANALISIS_VS_KIMI.md`
3. Copiar el contenido relevante en el chat de Kimi 2.5
4. Seguir el orden de prompts recomendado
5. Validar cada fase antes de continuar

## Beneficios de esta Estrategia

- ✅ **Contexto completo** - Kimi tiene toda la información
- ✅ **Orden claro** - Fases bien definidas
- ✅ **Sin dependencias nuevas** - Usa código existente
- ✅ **Compatible** - No rompe código actual
- ✅ **Escalable** - Diseñado para crecimiento

## Notas

- El módulo analítico está **estable y testeado**
- La UI debe **reutilizar estilos existentes**
- **No modificar** el motor de opinión
- **No agregar** dependencias externas
