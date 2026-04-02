# Prompt: Validación Funcional con Runs Reales

## Contexto

El módulo de análisis de encuestas ha sido **validado exitosamente a nivel unitario** (80 tests pasando). Ahora necesitamos validarlo con **runs reales de encuestas** para confirmar que funciona correctamente con datos reales del sistema.

**Reporte de validación unitaria:** `docs/VALIDATION_REPORT_FINAL.md`

---

## Objetivo

Crear un script de validación funcional que:
1. Ejecute análisis sobre 3-5 runs reales de encuestas desde Supabase
2. Verifique que los outputs sean coherentes con expectativas de negocio
3. Documente hallazgos, discrepancias y ajustes necesarios
4. Genere un reporte de validación funcional

---

## Requisitos del Script

### Entradas
- `surveyRunId`: ID del run de encuesta a analizar
- Conexión a Supabase para obtener:
  - `SurveyRun` (metadata de la ejecución)
  - `SurveyResult` (respuestas de agentes)
  - `SurveyDefinition` (estructura de la encuesta)

### Proceso
1. **Obtener datos reales**
   - Fetch SurveyRun desde Supabase
   - Fetch SurveyResult asociado
   - Fetch SurveyDefinition

2. **Ejecutar análisis**
   - Usar `surveyAnalysisService.analyzeSurveyRun()`
   - Capturar todas las métricas calculadas
   - Capturar insights generados

3. **Validaciones de coherencia**
   - Verificar que métricas estén en rangos esperados
   - Verificar que insights sean aplicables a la encuesta
   - Verificar que segmentación funcione con datos reales
   - Detectar anomalías o valores inesperados

4. **Comparación con expectativas**
   - Si hay benchmark esperado, comparar
   - Verificar coherencia entre preguntas relacionadas
   - Validar que distribuciones sumen 100%

### Salidas
- Reporte de validación por run
- Métricas calculadas vs esperadas
- Lista de hallazgos (positivos y negativos)
- Recomendaciones de ajuste si aplica

---

## Estructura de Archivos Propuesta

```
scripts/validation/
├── functional/
│   ├── validateWithRealRuns.ts      # Script principal
│   ├── runValidation.ts             # Entry point
│   ├── expectations/                # Expectativas por encuesta
│   │   ├── encuesta_a_expectations.json
│   │   └── encuesta_b_expectations.json
│   └── reports/                     # Reportes generados
│       └── validation_run_001.md
```

---

## Criterios de Éxito

### Métricas deben estar en rangos razonables:
- Entropía: 0 a ~2.5 (depende de número de opciones)
- Polarización: 0 a 1
- Dispersión: 0 a 1
- Tasa de no respuesta: 0% a 30% (alerta si >20%)
- Confidence promedio: 0.5 a 1.0

### Insights deben ser:
- Relevantes a la encuesta analizada
- Gramaticalmente correctos
- Útiles para interpretación

### Segmentación debe:
- Funcionar sin errores
- Producir distribuciones coherentes por segmento
- No generar segmentos vacíos inesperados

---

## Casos de Prueba Prioritarios

### Run 1: Encuesta simple (2-3 preguntas)
- Validar que análisis completo funcione
- Verificar que métricas básicas se calculen

### Run 2: Encuesta con segmentación
- Validar breakdown por demografía
- Verificar coherencia entre segmentos

### Run 3: Encuesta con comparación baseline
- Ejecutar comparación baseline vs escenario
- Validar que diferencias sean detectadas

### Run 4: Encuesta con alta polarización esperada
- Validar detección de polarización
- Verificar insights de polarización

### Run 5: Encuesta con distribución uniforme esperada
- Validar detección de baja polarización
- Verificar insights de consenso

---

## Entregables Esperados

1. **Script de validación funcional**
   - `scripts/validation/functional/validateWithRealRuns.ts`

2. **Configuración de expectativas**
   - Archivos JSON con expectativas por encuesta tipo

3. **Reporte de validación funcional**
   - `docs/FUNCTIONAL_VALIDATION_REPORT.md`

4. **Lista de ajustes necesarios**
   - Si se detectan issues, documentar con prioridad

---

## Notas Importantes

- Usar datos de staging o producción controlada
- No modificar datos durante la validación (solo lectura)
- Documentar cualquier anomalía encontrada
- Si un run falla, capturar error completo para diagnóstico
- Validar tanto casos exitosos como casos edge

---

## Ejemplo de Uso Esperado

```bash
# Validar un run específico
npm run validate:functional -- --runId=run_001

# Validar múltiples runs
npm run validate:functional -- --runIds=run_001,run_002,run_003

# Validar últimos 5 runs de una encuesta
npm run validate:functional -- --surveyId=encuesta_a --last=5
```

---

## Dependencias

- `src/app/survey/analysis/surveyAnalysisService.ts`
- `src/services/supabase/repositories/surveyRepository.ts`
- `scripts/utils/serviceClient.ts` (para conexión a Supabase)

---

## Criterio de Aprobación

El módulo se considerará **validado funcionalmente** cuando:
- ✅ 3-5 runs reales se analicen sin errores
- ✅ Métricas calculadas sean coherentes
- ✅ Insights sean útiles y aplicables
- ✅ Segmentación funcione con datos reales
- ✅ No se detecten bugs críticos
- ✅ Documentación de hallazgos esté completa

---

*Prompt generado el 2 de abril de 2026*
*Fase: Validación funcional post-unitaria*
