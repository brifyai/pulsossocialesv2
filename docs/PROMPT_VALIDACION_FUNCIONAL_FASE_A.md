# Prompt Fase A: Validación Funcional Simple con Runs Reales

Quiero implementar la primera fase de validación funcional del módulo analítico usando runs reales de encuestas.

Actúa como un senior TypeScript engineer. No agregues sobreingeniería.

## Contexto
El módulo analítico ya fue validado a nivel unitario y su API real está en:
- `src/app/survey/analysis/index.ts`
- `src/app/survey/analysis/surveyAnalysisService.ts`
- `src/app/survey/analysis/comparisonService.ts`
- `src/app/survey/analysis/types.ts`

La fuente de verdad son esos archivos, no la documentación.

## Objetivo de esta fase
Construir una utilidad simple para validar el análisis con runs reales del sistema.

## Alcance de Fase A
Implementar solo un script base que:
1. reciba uno o más `runId`
2. obtenga los datos necesarios desde el sistema actual
3. ejecute el análisis usando la API pública real
4. imprima un reporte legible en consola
5. detecte anomalías simples
6. no modifique datos
7. degrade elegantemente si faltan datos

## Fuera de alcance por ahora
NO implementar todavía:
- expectations JSON por encuesta
- generación de archivos markdown persistidos
- comparación avanzada baseline vs escenario
- validación masiva de múltiples encuestas por surveyId
- validación profunda de segmentación
- dashboards
- persistencia de reportes

## Input esperado
El script debe aceptar:
- `--runId=<id>`
- o `--runIds=<id1,id2,id3>`

## Output esperado
Por cada run:
1. metadata básica del run
2. resumen del análisis
3. métricas globales
4. top preguntas más polarizadas
5. top preguntas con mayor consenso
6. top preguntas con menor confidence
7. alertas/anomalías detectadas
8. estado final:
   - OK
   - WARNING
   - ERROR

## Alertas/anomalías mínimas
Detectar y reportar al menos:
- averageConfidence muy baja
- nonResponseRate alta
- preguntas soportadas = 0
- entropía extrema en todas las preguntas
- inconsistencias obvias en métricas
- análisis no disponible

## Restricciones
- No inventes APIs: usa solo funciones y repositorios reales del código
- No asumas que segmentación estará disponible
- Si existe `getSurveyAnalysisByRun(runId)`, úsala preferentemente
- Si no existe, compón la lógica usando servicios reales
- No agregar dependencias nuevas
- Mantener TypeScript estricto
- Script simple, mantenible y ejecutable
- La salida en consola debe estar organizada por secciones claras:
  - HEADER
  - RUN INFO
  - GLOBAL METRICS
  - TOP QUESTIONS
  - WARNINGS
  - FINAL STATUS

## Importante
Primero verifica la API real disponible antes de escribir el código.
Si detectas que algún nombre del prompt no existe, usa el nombre real del código.

Quiero que indiques explícitamente qué función concreta usarás para obtener el análisis:
- `getSurveyAnalysisByRun(runId)`
- o composición manual con `getSurveyRun()` + `getSurveyResultsByRun()` + `analyzeSurveyResult()`

No decidas implícitamente. Indícalo primero en la propuesta.

## Quiero que en esta primera respuesta NO escribas todavía el código completo del script.
Primero entrega únicamente:
1. verificación de API real disponible
2. propuesta breve de implementación
3. qué función concreta usarás para obtener el análisis
4. manejo de argumentos CLI propuesto
5. riesgos o vacíos detectados

Espera validación antes de generar el archivo final.
