# Checklist Profesional de Validación Funcional

## Guía de Uso

Esta checklist te ayuda a interpretar los resultados de los scripts de validación. Úsala mientras ejecutas:

```bash
# Validación individual
npx tsx scripts/validation/validateSurveyAnalysis.ts <runId>

# Validación de comparación
npx tsx scripts/validation/validateComparison.ts <baselineRunId> <scenarioRunId>
```

---

## PARTE 1: Validación Individual (`validateSurveyAnalysis.ts`)

### Sección 1: Carga de Datos

| Checkpoint | Estado | Qué buscar |
|------------|--------|------------|
| Run existe | ☐ | No debe dar "No se encontró el run" |
| Resultados existen | ☐ | Debe mostrar número de preguntas > 0 |
| Engine identificado | ☐ | Debe mostrar 'legacy' o 'cadem' |
| Metadata visible | ☐ | Si tiene escenario, debe mostrar el nombre |

**🚩 Señal de alarma:** Si el run no existe o no tiene resultados, no continuar.

---

### Sección 2: Ejecución del Análisis

| Checkpoint | Estado | Qué buscar |
|------------|--------|------------|
| Sin errores | ☐ | Debe decir "Análisis completado en Xms" |
| Tiempo razonable | ☐ | < 1000ms para encuestas normales |

**🚩 Señal de alarma:** Si lanza error, revisar logs. Probablemente falta algún campo esperado.

---

### Sección 3: Métricas Globales

| Métrica | Rango OK | Rango Advertencia | Rango Error | Tu Valor | Estado |
|---------|----------|-------------------|-------------|----------|--------|
| averageConfidence | 0.3 - 0.9 | 0.2-0.3 o 0.9-0.95 | <0.2 o >0.95 | | ☐ |
| averageEntropy | 0.2 - 0.9 | 0.1-0.2 o 0.9-1.0 | <0.1 o >1.0 | | ☐ |
| nonResponseRate | 0% - 15% | 15%-30% | >30% | | ☐ |
| Cobertura | >70% | 50%-70% | <50% | | ☐ |

**Qué significa cada métrica:**

- **averageConfidence**: Qué tan "seguros" están los agentes de sus respuestas
  - Bajo (<0.3): Los agentes respondieron con dudas
  - Alto (>0.9): Puede ser sospechoso (¿demasiado perfecto?)

- **averageEntropy**: Qué tan "dispersas" están las respuestas
  - Bajo (<0.2): Mucho consenso
  - Alto (>0.9): Mucha división de opiniones

- **nonResponseRate**: Porcentaje de "no responde"
  - Alto (>15%): Puede indicar problemas en el mapeo de respuestas

- **Cobertura**: % de preguntas que el análisis puede procesar
  - Baja (<50%): Muchas preguntas de tipos no soportados

**🚩 Señales de alarma:**
- Confidence = 0 o 1 exacto
- Entropía > 1.0 (imposible matemáticamente)
- Cobertura < 50% cuando hay preguntas soportables

---

### Sección 4: Resumen Ejecutivo

| Checkpoint | Estado | Qué buscar |
|------------|--------|------------|
| Tono general presente | ☐ | Debe mostrar 'positive', 'neutral', 'negative' o 'mixed' |
| Nivel de confianza | ☐ | Debe ser 'high', 'medium' o 'low' |
| Hallazgos clave | ☐ | Debe tener al menos 1-2 hallazgos |

**🚩 Señal de alarma:** Si no hay hallazgos clave, el análisis puede estar siendo demasiado conservador.

---

### Sección 5: Insights Globales

| Checkpoint | Estado | Qué buscar |
|------------|--------|------------|
| Al menos 1 insight | ☐ | No debe estar vacío |
| Severidades variadas | ☐ | Mezcla de info/warning/important es saludable |
| Textos comprensibles | ☐ | Sin términos técnicos como "entropía" |

**Evalúa cada insight:**

```
Insight: [Título]
Descripción: [Descripción]

Preguntas a hacerte:
1. ¿El título describe claramente el hallazgo?
2. ¿La descripción da contexto suficiente?
3. ¿Un usuario no técnico lo entendería?
4. ¿La severidad corresponde a la importancia?
```

**🚩 Señales de alarma:**
- Todos los insights son "info" (puede estar siendo demasiado conservador)
- Todos son "important" (puede estar siendo demasiado alarmista)
- Textos con "entropía", "confidence", "ratio" sin explicar

---

### Sección 6: Preguntas Destacadas

#### Más Polarizadas

| Checkpoint | Estado | Qué buscar |
|------------|--------|------------|
| Lista no vacía | ☐ | Debe haber al menos 1 pregunta |
| Entropías coherentes | ☐ | Valores entre 0.5 y 1.0 |
| Textos de preguntas | ☐ | Deben ser comprensibles |

**Pregunta de validación:** ¿Tiene sentido que estas preguntas estén polarizadas?

Ejemplo: Una pregunta sobre "aprueba/rechaza" al gobierno SÍ debería estar polarizada.

#### Mayor Consenso

| Checkpoint | Estado | Qué buscar |
|------------|--------|------------|
| Lista no vacía | ☐ | Debe haber al menos 1 pregunta |
| Porcentajes >50% | ☐ | Deben mostrar mayorías claras |

**Pregunta de validación:** ¿Tiene sentido que estas preguntas tengan consenso?

Ejemplo: "¿Está de acuerdo con que el cielo es azul?" SÍ debería tener consenso.

#### Menor Confianza

| Checkpoint | Estado | Qué buscar |
|------------|--------|------------|
| Solo si aplica | ☐ | Si no hay confianza baja, esta sección puede no aparecer |
| Valores <60% | ☐ | Deben ser realmente bajos |

**🚩 Señal de alarma:** Si TODAS las preguntas tienen baja confianza, revisar el motor de respuestas.

---

### Sección 7: Muestra de Preguntas Analizadas

| Checkpoint | Estado | Qué buscar |
|------------|--------|------------|
| 3 preguntas mostradas | ☐ | Debe mostrar detalle de 3 preguntas |
| Métricas presentes | ☐ | Dominante, entropía, confianza |
| Insights por pregunta | ☐ | Algunas preguntas deben tener insights |

**Validación manual sugerida:**

```
Para cada pregunta mostrada:

1. ¿El texto de la pregunta es comprensible?
2. ¿La respuesta dominante tiene sentido con el contexto?
3. ¿El porcentaje dominante cuadra con la distribución?
4. ¿La entropía refleja la dispersión real?
5. ¿Los insights son relevantes para esa pregunta?
```

---

### Sección 8: Resumen de Validación

| Checkpoint | Estado | Qué buscar |
|------------|--------|------------|
| Validaciones OK | ☐ | Debe ser >0 |
| Advertencias | ☐ | Idealmente 0-2 |
| Errores | ☐ | Debe ser 0 |

**Veredicto final:**
- ✅ **VALIDACIÓN EXITOSA**: Todo en verde, métricas coherentes
- ⚠️ **CON ADVERTENCIAS**: Algunas métricas fuera de rango, pero no crítico
- ❌ **FALLIDA**: Errores críticos detectados

---

### Sección 9: Recomendaciones

| Checkpoint | Estado | Qué buscar |
|------------|--------|------------|
| Recomendaciones pertinentes | ☐ | Deben hacer sentido con los datos |
| No demasiadas | ☐ | 1-3 recomendaciones es ideal |

---

## PARTE 2: Validación de Comparación (`validateComparison.ts`)

### Sección 1-2: Carga de Datos

| Checkpoint | Estado | Qué buscar |
|------------|--------|------------|
| Ambos runs existen | ☐ | Baseline y escenario cargados |
| Misma encuesta | ☐ | Mismo surveyId |
| Mismo engine | ☐ | Ambos legacy o ambos CADEM |

**🚩 Señal de alarma:** Si son encuestas diferentes, la comparación no tiene sentido.

---

### Sección 3: Validación de Compatibilidad

| Checkpoint | Estado | Qué buscar |
|------------|--------|------------|
| SurveyId coincide | ☐ | ✅ Debe pasar |
| Número de agentes | ☐ | Idealmente iguales, puede variar ligeramente |

**🚩 Señal de alarma:** Diferencia >20% en número de agentes puede invalidar la comparación.

---

### Sección 4-5: Análisis y Comparación

| Checkpoint | Estado | Qué buscar |
|------------|--------|------------|
| Análisis individuales OK | ☐ | Ambos completados sin errores |
| Comparación completada | ☐ | Sin errores |

---

### Sección 6: Métricas de Comparación

| Métrica | Rango OK | Rango Advertencia | Rango Error | Tu Valor | Estado |
|---------|----------|-------------------|-------------|----------|--------|
| averageImpactScore | 0.05 - 0.6 | 0.01-0.05 o 0.6-0.8 | <0.01 o >0.8 | | ☐ |
| Preguntas comparadas | = total | - | < total | | ☐ |
| Tasa cambio significativo | 10%-50% | 5%-10% o 50%-70% | <5% o >70% | | ☐ |
| Tasa cambio dominante | 0%-30% | 30%-40% | >40% | | ☐ |

**Interpretación del impact score:**

- **< 0.1**: Impacto mínimo (esperado si no hay escenario)
- **0.1 - 0.3**: Impacto moderado (cambios detectables)
- **0.3 - 0.6**: Impacto considerable (cambios importantes)
- **> 0.6**: Impacto muy alto (verificar si es realista)

**🚩 Señales de alarma:**
- Impact score > 0.8 sin escenario (¿ruido?)
- Impact score < 0.05 con escenario activo (¿el escenario no funciona?)
- >70% de preguntas con cambio significativo (¿demasiado sensible?)

---

### Sección 7: Preguntas Más Afectadas

| Checkpoint | Estado | Qué buscar |
|------------|--------|------------|
| Lista ordenada | ☐ | De mayor a menor impacto |
| Impact scores coherentes | ☐ | Entre 0 y 1 |
| Preguntas relevantes | ☐ | Deben ser las que esperarías que cambien |

**Pregunta clave de validación:**

```
Si el escenario es sobre "economía", ¿las preguntas más afectadas
son las relacionadas con economía?

Si NO: ¿Por qué otras preguntas cambiaron más?
```

---

### Sección 8: Detalle de Comparaciones

| Checkpoint | Estado | Qué buscar |
|------------|--------|------------|
| Top 3 comparaciones | ☐ | Muestra las más impactadas |
| Cambios cuantificados | ☐ | Debe mostrar "de X% a Y%" |
| Dirección clara | ☐ | "subió" o "bajó", no solo "cambió" |

**Validación manual:**

```
Para cada comparación mostrada:

1. ¿El cambio en la respuesta dominante tiene sentido?
2. ¿Los cambios en distribución son coherentes?
3. ¿Las métricas cambiaron en la dirección esperada?
4. ¿Los insights describen bien lo que pasó?
```

---

### Sección 9: Insights Globales de Comparación

| Checkpoint | Estado | Qué buscar |
|------------|--------|------------|
| Al menos 1 insight | ☐ | No vacío |
| Menciona el escenario | ☐ | Debe referenciar el escenario aplicado |
| Cuantifica cuando aplica | ☐ | "X preguntas cambiaron" |

**🚩 Señal de alarma:** Si hay escenario pero los insights no lo mencionan.

---

### Sección 10: Resumen de Validación + Coherencia

| Checkpoint | Estado | Qué buscar |
|------------|--------|------------|
| Validaciones OK | ☐ | >0 |
| Errores | ☐ | 0 |
| Análisis de coherencia | ☐ | Debe decir si es "Coherente" o "Inesperado" |

**Evaluación de coherencia:**

```
Si hay escenario:
  - Esperado: Impacto ALTO (>0.1)
  - Inesperado: Impacto BAJO (<0.1)

Si NO hay escenario:
  - Esperado: Impacto BAJO (<0.1)
  - Inesperado: Impacto ALTO (>0.1)
```

**🚩 Señal de alarma:** Resultado "Inesperado" requiere investigación.

---

### Sección 11: Recomendaciones

| Checkpoint | Estado | Qué buscar |
|------------|--------|------------|
| Recomendaciones pertinentes | ☐ | Deben hacer sentido |
| Accionables | ☐ | Deben sugerir qué hacer |

---

## PARTE 3: Registro de Hallazgos

### Template de Reporte

```markdown
# Reporte de Validación Funcional

## Metadata
- **Fecha:** [YYYY-MM-DD]
- **Validador:** [Nombre]
- **Run(s):** [runId(s)]
- **Tipo:** [Individual / Comparación]

## Resumen Ejecutivo
- **Estado:** [✅ Válido / ⚠️ Revisar / ❌ Problema]
- **Hallazgos Clave:** [1-2 líneas]

## Métricas Relevantes
| Métrica | Valor | Esperado | Estado |
|---------|-------|----------|--------|
| | | | |

## Problemas Encontrados
1. **[Severidad]** [Descripción] → [Acción]

## Insights Evaluados
| Insight | ¿Útil? | ¿Claro? | Observaciones |
|---------|--------|---------|---------------|
| | | | |

## Recomendaciones
- [Acción 1]
- [Acción 2]
```

---

## PARTE 4: Decisiones de Continuación

### Si la validación es ✅ EXITOSA

- [ ] Documentar en reporte
- [ ] Guardar runId como "referencia válida"
- [ ] Proceder con confianza a UI/integración

### Si la validación es ⚠️ CON ADVERTENCIAS

- [ ] Documentar advertencias específicas
- [ ] Evaluar si son aceptables o requieren ajuste
- [ ] Ajustar thresholds si es necesario
- [ ] Re-ejecutar validación

### Si la validación es ❌ FALLIDA

- [ ] Documentar errores críticos
- [ ] No usar estos runs para referencia
- [ ] Investigar causa raíz:
  - ¿Problema en los datos?
  - ¿Bug en el análisis?
  - ¿Configuración incorrecta?
- [ ] Corregir y re-ejecutar

---

## PARTE 5: Casos de Prueba Recomendados

### Caso 1: Run Legacy Simple
```bash
npx tsx scripts/validation/validateSurveyAnalysis.ts <run_legacy_simple>
```
**Qué validar:** Métricas básicas funcionan, coverage >70%

### Caso 2: Run CADEM Complejo
```bash
npx tsx scripts/validation/validateSurveyAnalysis.ts <run_cadem>
```
**Qué validar:** Mapeo de respuestas funciona, confidence en rango

### Caso 3: Comparación Baseline vs Escenario
```bash
npx tsx scripts/validation/validateComparison.ts <baseline> <scenario>
```
**Qué validar:** El escenario genera cambios detectables

### Caso 4: Comparación Baseline vs Baseline
```bash
npx tsx scripts/validation/validateComparison.ts <baseline1> <baseline2>
```
**Qué validar:** Sin escenario, el impacto es mínimo (<0.1)

### Caso 5: Run Edge Case (si existe)
```bash
npx tsx scripts/validation/validateSurveyAnalysis.ts <run_raro>
```
**Qué validar:** El análisis no se rompe con datos inusuales

---

## PARTE 6: Troubleshooting Rápido

### Problema: "No se encontró el run"

**Causas probables:**
1. RunId incorrecto
2. Run no existe en la base de datos
3. Problema de conexión a Supabase

**Solución:**
```bash
# Verificar que el run existe
npx tsx scripts/staging/check_survey_responses.ts <runId>
```

---

### Problema: "No se encontraron resultados"

**Causas probables:**
1. El run no se completó
2. Error en la agregación
3. Los resultados están en otra tabla

**Solución:**
- Verificar estado del run en la UI
- Revisar logs de ejecución

---

### Problema: "averageConfidence = 0"

**Causas probables:**
1. Las respuestas no tienen campo confidence
2. Todas las respuestas tienen confidence = 0
3. Bug en el cálculo

**Solución:**
- Revisar una respuesta individual en la base de datos
- Verificar que el campo confidence existe

---

### Problema: "entropy > 1.0"

**Causa:** Bug en el cálculo de entropía

**Solución:**
- Revisar fórmula en `distributionMetrics.ts`
- La entropía normalizada debe estar entre 0 y 1

---

### Problema: "Cobertura < 50%"

**Causas probables:**
1. Muchas preguntas de tipos no soportados
2. Error en el filtrado de preguntas
3. La encuesta tiene solo texto libre

**Solución:**
- Revisar tipos de preguntas en la encuesta
- Considerar extender soporte a más tipos

---

## PARTE 7: Checklist Final Pre-Integración

Antes de integrar el módulo analítico a la UI principal:

- [ ] Ejecutado al menos 3 validaciones individuales exitosas
- [ ] Ejecutado al menos 1 comparación exitosa
- [ ] Documentados hallazgos en reportes
- [ ] Ajustados thresholds si fue necesario
- [ ] Corregido wording crítico (entropía → dispersión, etc.)
- [ ] Validado que insights son comprensibles
- [ ] Confirmado que métricas tienen sentido en contexto real

---

**Última actualización:** 2026-04-02  
**Versión:** 1.0  
**Módulo:** Survey Analysis Service
