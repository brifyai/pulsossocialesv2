# B2 Longitudinal Test Plan

**Estado:** 📝 Planificado  
**Dependencia:** STAGING_VALIDATION_RUN_001 ✅ Aprobado  
**Objetivo:** Validar persistencia longitudinal y comportamiento del panel en múltiples olas

---

## Resumen Ejecutivo

El B2 Longitudinal Test es el siguiente paso lógico después del exitoso Staging Validation Run 001. Mientras que Run 001 validó el **flujo transversal** (una sola ola), B2 validará el **comportamiento longitudinal** (múltiples olas con persistencia).

### Diferencia Clave

| Aspecto | Run 001 (Transversal) | B2 (Longitudinal) |
|---------|----------------------|-------------------|
| `persistState` | `false` | `true` |
| Olas | 1 | 3 |
| Agentes | 200 aleatorios | 200 **mismos** agentes |
| Objetivo | Validar motor calibrado | Validar memoria y drift |

---

## Configuración del Test

```yaml
Test: B2 Longitudinal
Fecha Planificada: Por definir
Estado: Planificado

Configuración:
  engineMode: cadem
  engineVersion: cadem-v1.1
  persistState: true  # ← Diferencia clave
  
Agentes:
  count: 200
  source: Supabase synthetic_agents
  selection: Mismos IDs que Run 001 (para comparabilidad)
  
Olas:
  count: 3
  intervalo_simulado: 7 días entre olas
  
Preguntas:
  - q_approval
  - q_optimism
  - q_economy_personal
  
Metadata:
  staging_run: B2
  test_type: longitudinal
  previous_run: Run_001
```

---

## Hipótesis a Validar

### H1: Estabilidad de Respuestas
**Hipótesis:** Las respuestas de un agente son estables entre olas, con variaciones razonables.

**Métrica:** Correlación de respuestas entre ola 1 y ola 3 > 0.7

### H2: Drift Gradual
**Hipótesis:** Los cambios de opinión ocurren gradualmente, no abruptamente.

**Métrica:** < 15% de agentes cambian de categoría (approve→disapprove) entre olas consecutivas

### H3: Panel Fatigue
**Hipótesis:** El panel fatigue aumenta ligeramente con cada ola.

**Métrica:** no_response aumenta máximo 2-3% entre olas

### H4: Topic State Persistence
**Hipótesis:** El estado del tópico persiste correctamente en Supabase.

**Métrica:** 100% de agentes tienen topic_state después de ola 1

### H5: Completions
**Hipótesis:** Los agentes completan todas las olas.

**Métrica:** > 95% completion rate

---

## Métricas de Éxito

### Métricas Primarias (Must Have)

| Métrica | Target | Criterio de Éxito |
|---------|--------|-------------------|
| Estabilidad (correlación ola 1→3) | > 0.7 | ✅ ≥ 0.7 |
| Drift máximo entre olas | < 15% | ✅ < 15% |
| Completion rate | > 95% | ✅ ≥ 95% |
| Topic state persistence | 100% | ✅ = 100% |

### Métricas Secundarias (Should Have)

| Métrica | Target | Observación |
|---------|--------|-------------|
| no_response ola 1 | ~2-3% | Baseline de Run 001 |
| no_response ola 3 | < 6% | Aumento aceptable por fatigue |
| Confidence promedio | ~80% | Consistente con Run 001 |
| Duración por ola | < 10s | Performance aceptable |

### Métricas Exploratorias (Nice to Have)

- Distribución de cambios por categoría (approve→disapprove, etc.)
- Correlación entre topic states y respuestas
- Patrones de cambio por segmento (edad, región, etc.)

---

## Plan de Ejecución

### Fase 1: Preparación

1. **Seleccionar agentes**
   - Usar los mismos 200 agentes del Run 001
   - Guardar IDs en archivo de configuración

2. **Crear encuesta longitudinal**
   - Reutilizar encuesta de Run 001
   - Modificar metadata: `persistState: true`

3. **Verificar tablas de persistencia**
   - Confirmar `agent_topic_state` existe
   - Confirmar `agent_panel_state` existe

### Fase 2: Ejecución de Olas

#### Ola 1 (Baseline)
```bash
npx tsx scripts/staging/runLongitudinalWave.ts \
  --wave 1 \
  --survey-id <id> \
  --agent-ids agentes_run_001.json \
  --persist-state true
```

**Verificaciones post-ola 1:**
- [ ] Respuestas guardadas en `survey_responses`
- [ ] Topic states guardados en `agent_topic_state`
- [ ] Panel states guardados en `agent_panel_state`
- [ ] Distribuciones similares a Run 001

#### Ola 2 (7 días simulados después)
```bash
npx tsx scripts/staging/runLongitudinalWave.ts \
  --wave 2 \
  --survey-id <id> \
  --agent-ids agentes_run_001.json \
  --persist-state true
```

**Verificaciones post-ola 2:**
- [ ] Topic states actualizados (no reemplazados)
- [ ] Panel fatigue incrementado
- [ ] Drift observable pero razonable

#### Ola 3 (14 días simulados después)
```bash
npx tsx scripts/staging/runLongitudinalWave.ts \
  --wave 3 \
  --survey-id <id> \
  --agent-ids agentes_run_001.json \
  --persist-state true
```

**Verificaciones post-ola 3:**
- [ ] Estabilidad de respuestas medible
- [ ] Fatigue acumulado observable
- [ ] Completions > 95%

### Fase 3: Análisis

1. **Generar reporte comparativo**
   - Comparar distribuciones entre olas
   - Calcular correlaciones
   - Identificar drift

2. **Validar hipótesis**
   - H1: Estabilidad > 0.7?
   - H2: Drift < 15%?
   - H3: Fatigue razonable?
   - H4: Persistence 100%?
   - H5: Completions > 95%?

3. **Documentar hallazgos**
   - Crear `B2_LONGITUDINAL_TEST_RESULTS.md`
   - Incluir gráficos de evolución
   - Recomendaciones

---

## Scripts Necesarios

### 1. `scripts/staging/runLongitudinalWave.ts`
**Propósito:** Ejecutar una ola individual del test longitudinal

**Parámetros:**
- `--wave`: Número de ola (1, 2, 3)
- `--survey-id`: ID de la encuesta
- `--agent-ids`: Archivo JSON con IDs de agentes
- `--persist-state`: true/false

**Funcionalidad:**
- Cargar agentes por ID
- Cargar topic states existentes (si wave > 1)
- Ejecutar encuesta con motor CADEM
- Guardar respuestas
- Guardar/actualizar topic states
- Actualizar panel states

### 2. `scripts/staging/analyzeLongitudinalResults.ts`
**Propósito:** Analizar resultados de las 3 olas

**Funcionalidad:**
- Cargar respuestas de las 3 olas
- Calcular correlaciones
- Identificar drift
- Generar visualizaciones
- Crear reporte

### 3. `scripts/staging/verifyPersistence.ts`
**Propósito:** Verificar que la persistencia funciona correctamente

**Funcionalidad:**
- Verificar que `agent_topic_state` tiene registros
- Verificar que `agent_panel_state` tiene registros
- Validar integridad de datos

---

## Criterios de Aprobación/Rechazo

### ✅ APROBADO si:
- Estabilidad ≥ 0.7
- Drift < 15%
- Completions ≥ 95%
- Persistence = 100%
- no_response < 6% en ola 3

### ⚠️ APROBADO CON OBSERVACIONES si:
- Estabilidad 0.6-0.7
- Drift 15-20%
- Completions 90-95%
- Fatigue alto pero explicable

### ❌ RECHAZADO si:
- Estabilidad < 0.6
- Drift > 20%
- Completions < 90%
- Persistence < 100%
- Errores técnicos críticos

---

## Riesgos y Mitigaciones

| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|-------------|---------|------------|
| Topic state no persiste | Media | Alto | Verificar tablas antes de ejecutar |
| Fatigue excesivo | Media | Medio | Monitorear no_response entre olas |
| Drift muy alto | Baja | Medio | Comparar con benchmarks reales de CADEM |
| Performance lenta | Baja | Bajo | Optimizar queries de persistencia |
| Agentes no encontrados | Baja | Alto | Validar IDs antes de cada ola |

---

## Dependencias

### Completadas ✅
- [x] STAGING_VALIDATION_RUN_001 aprobado
- [x] Motor CADEM calibrado y funcionando
- [x] Tablas de persistencia creadas
- [x] Pipeline de staging funcional

### Pendientes 📝
- [ ] Crear `runLongitudinalWave.ts`
- [ ] Crear `analyzeLongitudinalResults.ts`
- [ ] Crear `verifyPersistence.ts`
- [ ] Seleccionar y guardar IDs de agentes del Run 001
- [ ] Preparar encuesta con `persistState: true`

---

## Timeline Sugerido

| Día | Actividad |
|-----|-----------|
| 1 | Crear scripts de longitudinal |
| 2 | Preparar configuración y agentes |
| 3 | Ejecutar Ola 1 |
| 4 | Verificar persistencia Ola 1 |
| 5 | Ejecutar Ola 2 |
| 6 | Ejecutar Ola 3 |
| 7 | Análisis y reporte |

---

## Conclusión

El B2 Longitudinal Test es el paso lógico siguiente para validar que el sistema no solo genera respuestas correctas (Run 001), sino que también **recuerda y evoluciona** adecuadamente a lo largo del tiempo.

**Estado:** 📝 Planificado  
**Próximo paso:** Crear scripts de ejecución longitudinal  
**Bloqueado por:** Nada (Run 001 aprobado)  

---

*Documento creado: 27 de marzo de 2026*  
*Depende de: STAGING_VALIDATION_RUN_001 ✅*
