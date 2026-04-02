# Plan Operativo de Ejecución de Validación

## Objetivo
Ejecutar 5 corridas de validación funcional con datos reales para verificar que el módulo analítico funciona correctamente en producción.

**Duración estimada:** 30-45 minutos  
**Prerrequisitos:** Tener acceso a runs reales en la base de datos

---

## Preparación (5 minutos)

### Paso 0: Identificar runs disponibles

```bash
# Listar runs recientes con resultados
npx tsx scripts/staging/check_survey_responses.ts --list-recent

# O ver en la UI de Supabase:
# SELECT id, survey_id, engine_mode, scenario_id, created_at 
# FROM survey_runs 
# ORDER BY created_at DESC 
# LIMIT 20;
```

**Anota en este espacio los runIds que vas a usar:**

```
Run Legacy Simple: ________________
Run CADEM: ________________
Baseline (para comparación): ________________
Scenario (mismo survey que baseline): ________________
Run Edge Case (opcional): ________________
```

---

## Corrida 1: Run Legacy Simple (5 min)

### Comando
```bash
npx tsx scripts/validation/validateSurveyAnalysis.ts <RUN_LEGACY_ID>
```

### Qué validar

| Checkpoint | Estado | Tu Valor |
|------------|--------|----------|
| Run carga correctamente | ☐ | |
| Engine = 'legacy' | ☐ | |
| Coverage > 70% | ☐ | __% |
| averageConfidence entre 0.3-0.9 | ☐ | __ |
| averageEntropy entre 0.2-0.9 | ☐ | __ |
| nonResponseRate < 15% | ☐ | __% |
| Al menos 2 insights globales | ☐ | __ |
| Preguntas destacadas coherentes | ☐ | |

### Preguntas clave

1. **¿Los insights tienen sentido para este tipo de encuesta?**
   - [ ] Sí
   - [ ] No → ¿Cuál no tiene sentido? ________________

2. **¿Alguna métrica está fuera de rango?**
   - [ ] No, todo OK
   - [ ] Sí → ¿Cuál? ________________

3. **¿Los textos de los insights son comprensibles?**
   - [ ] Sí
   - [ ] Hay términos técnicos → ¿Cuáles? ________________

### Veredicto
- [ ] ✅ **APROBADO** - Listo para usar como referencia
- [ ] ⚠️ **REVISAR** - Tiene advertencias pero usable
- [ ] ❌ **RECHAZADO** - Problemas críticos detectados

**Notas:** ________________

---

## Corrida 2: Run CADEM (5 min)

### Comando
```bash
npx tsx scripts/validation/validateSurveyAnalysis.ts <RUN_CADEM_ID>
```

### Qué validar

| Checkpoint | Estado | Tu Valor |
|------------|--------|----------|
| Run carga correctamente | ☐ | |
| Engine = 'cadem' | ☐ | |
| Coverage > 70% | ☐ | __% |
| averageConfidence entre 0.3-0.9 | ☐ | __ |
| averageEntropy entre 0.2-0.9 | ☐ | __ |
| nonResponseRate < 15% | ☐ | __% |
| Al menos 2 insights globales | ☐ | __ |
| Preguntas destacadas coherentes | ☐ | |

### Comparación con Legacy

| Métrica | Legacy | CADEM | ¿Diferencia esperada? |
|---------|--------|-------|----------------------|
| averageConfidence | __ | __ | [ ] Sí [ ] No |
| averageEntropy | __ | __ | [ ] Sí [ ] No |
| nonResponseRate | __ | __ | [ ] Sí [ ] No |

### Preguntas clave

1. **¿El mapeo de respuestas CADEM funciona correctamente?**
   - [ ] Sí, las distribuciones tienen sentido
   - [ ] No → ¿Problema? ________________

2. **¿Hay diferencias significativas vs Legacy?**
   - [ ] No, comportamiento similar
   - [ ] Sí → ¿Cuáles? ________________

### Veredicto
- [ ] ✅ **APROBADO** - Listo para usar como referencia
- [ ] ⚠️ **REVISAR** - Tiene advertencias pero usable
- [ ] ❌ **RECHAZADO** - Problemas críticos detectados

**Notas:** ________________

---

## Corrida 3: Comparación Baseline vs Escenario (10 min)

### Comando
```bash
npx tsx scripts/validation/validateComparison.ts <BASELINE_ID> <SCENARIO_ID>
```

**Importante:** Ambos runs deben ser del mismo survey (mismo survey_id)

### Qué validar

| Checkpoint | Estado | Tu Valor |
|------------|--------|----------|
| Ambos runs cargan | ☐ | |
| SurveyId coincide | ☐ | |
| Engine coincide | ☐ | |
| Diferencia en # agentes < 20% | ☐ | __% |
| averageImpactScore > 0.1 | ☐ | __ |
| Preguntas comparadas = total | ☐ | __/__ |
| Al menos 1 insight global | ☐ | __ |

### Análisis de coherencia

**El escenario aplicado es sobre:** ________________

**Las preguntas más afectadas son:**
1. ________________ (impact: __)
2. ________________ (impact: __)
3. ________________ (impact: __)

**¿Tienen sentido estas preguntas como las más afectadas?**
- [ ] Sí, relacionadas con el tema del escenario
- [ ] Parcialmente
- [ ] No, parecen aleatorias → ¿Por qué? ________________

### Preguntas clave

1. **¿El impact score refleja cambios reales?**
   - [ ] Sí, los cambios son visibles en las distribuciones
   - [ ] No, parece muy bajo para el escenario aplicado
   - [ ] No, parece muy alto (¿ruido?)

2. **¿Los insights de comparación describen bien lo que pasó?**
   - [ ] Sí, son claros y útiles
   - [ ] Parcialmente
   - [ ] No → ¿Qué falta? ________________

3. **¿El análisis de coherencia dice "Coherente" o "Inesperado"?**
   - [ ] Coherente
   - [ ] Inesperado → ¿Por qué? ________________

### Veredicto
- [ ] ✅ **APROBADO** - La comparación funciona bien
- [ ] ⚠️ **REVISAR** - Funciona pero con reservas
- [ ] ❌ **RECHAZADO** - No detecta cambios o detecta cambios falsos

**Notas:** ________________

---

## Corrida 4: Comparación Baseline vs Baseline (5 min)

### Comando
```bash
npx tsx scripts/validation/validateComparison.ts <BASELINE_1_ID> <BASELINE_2_ID>
```

**Importante:** Dos runs del mismo survey, ambos SIN escenario (o con escenarios idénticos)

### Qué validar

| Checkpoint | Estado | Tu Valor |
|------------|--------|----------|
| Ambos runs cargan | ☐ | |
| SurveyId coincide | ☐ | |
| averageImpactScore < 0.1 | ☐ | __ |
| Tasa cambio significativo < 10% | ☐ | __% |
| Tasa cambio dominante < 10% | ☐ | __% |

### Análisis de coherencia

**¿El análisis de coherencia dice "Coherente" o "Inesperado"?**
- [ ] Coherente (esperado: sin escenario = impacto bajo)
- [ ] Inesperado → ¿Por qué? ________________

### Preguntas clave

1. **¿El sistema detecta correctamente que no hay cambios significativos?**
   - [ ] Sí, impact score bajo y pocos cambios
   - [ ] No, detecta cambios donde no los hay → ¿Falso positivo? ________________

2. **¿Las diferencias observadas son ruido o variación real?**
   - [ ] Ruido aceptable (<5% en la mayoría)
   - [ ] Variación mayor de lo esperado → ¿Por qué? ________________

### Veredicto
- [ ] ✅ **APROBADO** - No genera falsos positivos
- [ ] ⚠️ **REVISAR** - Algo de ruido pero aceptable
- [ ] ❌ **RECHAZADO** - Genera demasiados falsos positivos

**Notas:** ________________

---

## Corrida 5: Run Edge Case (opcional, 5 min)

### Opciones de edge cases

**Opción A: Run muy pequeño (< 50 agentes)**
```bash
npx tsx scripts/validation/validateSurveyAnalysis.ts <RUN_PEQUENO_ID>
```

**Opción B: Run con muchas preguntas de texto libre**
```bash
npx tsx scripts/validation/validateSurveyAnalysis.ts <RUN_TEXTO_ID>
```

**Opción C: Run con baja varianza (todos responden igual)**
```bash
npx tsx scripts/validation/validateSurveyAnalysis.ts <RUN_BAJA_VARIANZA_ID>
```

### Qué validar

| Checkpoint | Estado | Tu Valor |
|------------|--------|----------|
| Run carga sin errores | ☐ | |
| No hay excepciones | ☐ | |
| Métricas son coherentes | ☐ | |
| Coverage ajustado al caso | ☐ | __% |

### Preguntas clave

1. **¿El análisis se comporta graceful con datos extremos?**
   - [ ] Sí, adapta las métricas
   - [ ] No, da resultados extraños → ¿Cuáles? ________________

2. **¿Los insights son útiles aun con poca varianza?**
   - [ ] Sí
   - [ ] No → ¿Qué debería decir? ________________

### Veredicto
- [ ] ✅ **APROBADO** - Maneja edge cases bien
- [ ] ⚠️ **REVISAR** - Funciona pero con limitaciones
- [ ] ❌ **RECHAZADO** - Se rompe con edge cases

**Notas:** ________________

---

## Resumen Ejecutivo de Validación

### Tabla Consolidada

| Corrida | Run(s) | Estado | Métrica Sospechosa | Insight Útil | Acción |
|---------|--------|--------|-------------------|--------------|--------|
| 1 - Legacy | | ☐✅ ☐⚠️ ☐❌ | | ☐Sí ☐No | |
| 2 - CADEM | | ☐✅ ☐⚠️ ☐❌ | | ☐Sí ☐No | |
| 3 - Baseline vs Escenario | | ☐✅ ☐⚠️ ☐❌ | | ☐Sí ☐No | |
| 4 - Baseline vs Baseline | | ☐✅ ☐⚠️ ☐❌ | | ☐Sí ☐No | |
| 5 - Edge Case | | ☐✅ ☐⚠️ ☐❌ | | ☐Sí ☐No | |

### Métricas Clave Encontradas

| Métrica | Rango Esperado | Rango Encontrado | ¿Ajustar? |
|---------|----------------|------------------|-----------|
| averageConfidence | 0.3 - 0.9 | __ a __ | ☐ Sí ☐ No |
| averageEntropy | 0.2 - 0.9 | __ a __ | ☐ Sí ☐ No |
| nonResponseRate | 0% - 15% | __% a __% | ☐ Sí ☐ No |
| averageImpactScore (con escenario) | 0.1 - 0.6 | __ a __ | ☐ Sí ☐ No |
| averageImpactScore (sin escenario) | < 0.1 | __ a __ | ☐ Sí ☐ No |

### Problemas Detectados

1. **Críticos (bloqueantes):**
   - ________________
   - ________________

2. **Importantes (deben arreglarse):**
   - ________________
   - ________________

3. **Menores (nice to have):**
   - ________________
   - ________________

### Insights de Wording a Corregir

| Insight Actual | Problema | Propuesta |
|----------------|----------|-----------|
| | | |
| | | |

---

## Decisión de Continuación

### Opciones

- [ ] **A. Proceder a UI definitiva**
  - Todas las corridas aprobadas o con advertencias menores
  - Métricas coherentes
  - Insights útiles

- [ ] **B. Ajustar thresholds y revalidar**
  - Algunas métricas fuera de rango
  - Necesita calibración

- [ ] **C. Corregir bugs críticos primero**
  - Errores en el análisis
  - Falsos positivos/negativos graves

- [ ] **D. Mejorar wording antes de UI**
  - El análisis funciona pero se comunica mal

### Mi decisión: ________

**Justificación:** ________________

---

## Próximos Pasos

### Si elegiste A (Proceder a UI)
- [ ] Guardar runIds de referencia válidos
- [ ] Documentar métricas típicas encontradas
- [ ] Proceder a diseño de UI analítica

### Si elegiste B (Ajustar thresholds)
- [ ] Identificar qué thresholds ajustar
- [ ] Modificar en código
- [ ] Re-ejecutar corridas 1-4
- [ ] Validar nuevos rangos

### Si elegiste C (Corregir bugs)
- [ ] Priorizar bugs críticos
- [ ] Crear tickets/issues
- [ ] Corregir y re-ejecutar validación

### Si elegiste D (Mejorar wording)
- [ ] Revisar WORDING_AUDIT.md
- [ ] Implementar mejoras prioritarias
- [ ] Re-ejecutar corridas 1-2 para validar

---

## Apéndice: Comandos Rápidos

```bash
# Validación individual
npx tsx scripts/validation/validateSurveyAnalysis.ts <runId>

# Validación de comparación
npx tsx scripts/validation/validateComparison.ts <baseline> <scenario>

# Ver runs disponibles
npx tsx scripts/staging/check_survey_responses.ts --list-recent

# Ver detalle de un run
npx tsx scripts/staging/check_survey_responses.ts <runId>
```

---

**Fecha de ejecución:** ________________  
**Validador:** ________________  
**Tiempo total:** ________________
