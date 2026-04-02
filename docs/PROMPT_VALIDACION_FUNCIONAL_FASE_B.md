# Prompt Fase B: Validación Funcional con Comparación

**USAR SOLO DESPUÉS DE COMPLETAR FASE A**

Quiero extender la validación funcional para soportar comparación baseline vs escenario con runs reales.

## Pre-requisitos
Lee primero:
- `scripts/validation/functional/validateWithRealRuns.ts` (resultado de Fase A)
- `src/app/survey/analysis/comparisonService.ts`
- `src/app/survey/analysis/index.ts`
- `src/app/survey/analysis/types.ts`

## Objetivo
Agregar una segunda utilidad para validar comparaciones reales entre dos runs.

## Alcance
1. aceptar `--baselineRunId=<id>` y `--scenarioRunId=<id>`
2. obtener ambos análisis reales
3. ejecutar `compareSurveys(...)`
4. imprimir:
   - resumen de comparación
   - preguntas más afectadas
   - cambios en dominancia
   - insights globales de comparación
   - alertas de consistencia

## Validaciones previas obligatorias
La utilidad debe validar antes de comparar:
- que ambos runs existan
- que ambos análisis se puedan generar
- que ambos pertenezcan a la misma encuesta
- que haya al menos una pregunta comparable

Si no se cumple, debe reportarlo claramente y terminar sin crash.

## Fuera de alcance
NO implementar todavía:
- persistencia de reportes
- configuración JSON de expectativas
- automatización masiva

## Restricciones
- Reutilizar lógica de Fase A donde sea posible
- No duplicar código de fetching
- Mantener mismo estilo y calidad
- Script simple y ejecutable
- Salida en consola organizada por secciones:
  - HEADER
  - BASELINE INFO
  - SCENARIO INFO
  - COMPARISON SUMMARY
  - MOST AFFECTED QUESTIONS
  - WARNINGS
  - FINAL STATUS

## En esta primera respuesta NO escribas todavía el archivo completo.
Primero entrega únicamente:
1. verificación de API real disponible
2. propuesta breve
3. qué reutilizarás de Fase A
4. validaciones previas que implementarás
5. posibles riesgos

Espera validación antes de generar el código final.
