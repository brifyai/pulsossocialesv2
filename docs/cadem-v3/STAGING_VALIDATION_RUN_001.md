# Staging Validation Run 001 - CADEM Engine

**Fecha:** [PENDIENTE - completar al ejecutar]  
**Versión Motor:** CADEM v1.1 (v4.10 calibrada)  
**Tag Git:** `cadem-calibrated-v4.10`  
**Commit:** `e78686b`  
**Estado:** 🟡 PLANTILLA - Pendiente de ejecución

---

## Objetivo

Validar el motor CADEM calibrado en un entorno de staging controlado, ejecutando una encuesta real desde la UI con agentes reales de Supabase.

---

## Definition of Done para Staging

### Pre-requisitos completados ✅

- [x] Benchmark real con agentes de Supabase completado
- [x] MAE promedio < 5% (logrado: 3.3%)
- [x] Variables económicas y optimismo cerradas
- [x] Baseline congelada en Git (`cadem-calibrated-v4.10`)

### Pre-requisitos de ejecución ⏳

- [ ] Entorno de staging accesible
- [ ] Base de datos Supabase conectada
- [ ] Usuario admin con permisos para crear encuestas
- [ ] Catálogo de preguntas cargado en Supabase

---

## Configuración de la Encuesta

### Parámetros Generales

| Campo | Valor | Estado |
|-------|-------|--------|
| **Nombre** | Staging Test 001 - CADEM Calibrated | ⏳ |
| **Descripción** | Primera validación operativa del motor CADEM v4.10 | ⏳ |
| **Engine Mode** | `cadem` | ⏳ |
| **Persistencia** | `false` (estados independientes) | ⏳ |
| **Estado** | `draft` → `published` | ⏳ |

### Configuración de Muestra

| Campo | Valor | Estado |
|-------|-------|--------|
| **Tamaño de muestra** | 200 agentes | ⏳ |
| **Método de sampleo** | Cuotas tipo Cadem | ⏳ |
| **Estratificación** | Región, edad, sexo, nivel educacional | ⏳ |
| **Filtros adicionales** | Ninguno (población general) | ⏳ |

> **Nota:** Se usa una muestra reducida de 200 agentes para minimizar riesgo operativo en la primera validación de UI y flujo end-to-end.

### Preguntas Incluidas

| # | Question ID | Tipo | Benchmark Target | Razón de inclusión |
|---|-------------|------|------------------|-------------------|
| 1 | `q_approval` | Política | 57% approve | Variable "aceptable" - verificar en UI |
| 2 | `q_economy_personal` | Económica | 52% positive | Variable "cerrada" - debería dar ~52% |
| 3 | `q_optimism` | Psicológica | 62% optimistic | Variable "cerrada" - debería dar ~61% |

**Nota:** Se omiten `q_direction` y `q_economy_nacional` para mantener la prueba enfocada y rápida.

---

## Checklist de Ejecución

### Paso 1: Creación de Encuesta en Supabase

- [ ] Crear registro en `survey_definitions` con `engine_mode: 'cadem'` (columna o `metadata->>'engine_mode'`)
- [ ] Configurar `sample_size: 200`
- [ ] Configurar `persist_state: false` (columna o `metadata->>'persist_state'`)
- [ ] Asociar preguntas del catálogo
- [ ] Verificar que `engine_version` = `cadem-v1.1` o `v4.10` en metadata

### Paso 2: Publicación

- [ ] Cambiar estado a `published`
- [ ] Verificar que aparezca en el panel de administración
- [ ] Confirmar que los agentes pueden ser sampleados

### Paso 3: Ejecución desde UI

- [ ] Iniciar survey run desde el panel de administración
- [ ] Monitorear tiempo de ejecución (target: < 30 segundos)
- [ ] Verificar que no hay errores en logs de Supabase
- [ ] Confirmar que el run se completa sin excepciones

### Paso 4: Validación de Resultados

#### 4.1 Renderizado en UI

- [ ] Resultados se muestran correctamente en el dashboard
- [ ] Gráficos de distribución visibles
- [ ] Tablas de resultados completas
- [ ] Sin errores de renderizado

#### 4.2 Metadatos de Respuestas

- [ ] Confidence scores visibles para cada respuesta
- [ ] Reasoning/explicaciones accesibles (si aplica)
- [ ] IDs de agentes correctamente asociados
- [ ] Timestamps de respuesta registrados

#### 4.3 Coherencia de Datos

- [ ] Número total de respuestas = 200
- [ ] Sin respuestas duplicadas
- [ ] Sin respuestas nulas/anómalas
- [ ] Distribuciones dentro de rangos esperados

---

## Criterios de Aceptación

### Métricas de Calidad

| Métrica | Target | Rango Aceptable | Estado |
|---------|--------|-----------------|--------|
| **q_approval approve** | 57% | 50-65% | ⏳ |
| **q_economy_personal positive** | 52% | 48-56% | ⏳ |
| **q_optimism optimistic** | 62% | 58-66% | ⏳ |
| **MAE vs benchmark** | < 5% | < 10% (relajado staging) | ⏳ |

### Métricas de Performance

| Métrica | Target | Estado |
|---------|--------|--------|
| **Tiempo de ejecución** | < 30 segundos | ⏳ |
| **Tiempo de respuesta promedio** | < 500ms por agente | ⏳ |
| **Sin timeouts** | 0 | ⏳ |
| **Sin errores 5xx** | 0 | ⏳ |

### Métricas de UX

| Métrica | Target | Estado |
|---------|--------|--------|
| **UI no se rompe** | Sí | ⏳ |
| **Navegación fluida** | Sí | ⏳ |
| **Carga de resultados** | < 3 segundos | ⏳ |

---

## Resultados Esperados vs Reales

### Comparación por Pregunta

| Pregunta | Benchmark | Esperado | Real | Diferencia | Estado |
|----------|-----------|----------|------|------------|--------|
| q_approval approve | 57% | 53-61% | ⏳ | ⏳ | ⏳ |
| q_approval disapprove | 34% | 30-38% | ⏳ | ⏳ | ⏳ |
| q_approval no_response | 9% | 5-13% | ⏳ | ⏳ | ⏳ |
| q_economy_personal positive | 52% | 50-54% | ⏳ | ⏳ | ⏳ |
| q_economy_personal negative | 44% | 42-46% | ⏳ | ⏳ | ⏳ |
| q_optimism optimistic | 62% | 60-64% | ⏳ | ⏳ | ⏳ |
| q_optimism pessimistic | 34% | 32-36% | ⏳ | ⏳ | ⏳ |

### Métricas Globales

| Métrica | Esperado | Real | Estado |
|---------|----------|------|--------|
| **MAE promedio** | < 5% | ⏳ | ⏳ |
| **Máxima diferencia** | < 10% | ⏳ | ⏳ |
| **Tasa de respuesta** | 100% | ⏳ | ⏳ |

---

## Incidentes y Observaciones

### Issues Encontrados

| # | Descripción | Severidad | Estado | Notas |
|---|-------------|-----------|--------|-------|
| 1 | | | | |
| 2 | | | | |
| 3 | | | | |

### Observaciones

- 
- 
- 

---

## Decisión

### Opciones

- [ ] **APROBADO** - Pasar a Staging Validation Run 002
- [ ] **APROBADO CON OBSERVACIONES** - Corregir issues menores y continuar
- [ ] **RECHAZADO** - Requiere fixes antes de continuar

### Rationale

[Completar después de la ejecución]

### Próximos Pasos

- [ ] Staging Validation Run 002 (ampliar a 500 agentes)
- [ ] Incluir persistencia de estados (B2)
- [ ] Validación longitudinal
- [ ] Comparación operativa con legacy

---

## Referencias

- Documento de calibración: `docs/cadem-v3/CALIBRATION_RUN_002_FINAL.md`
- Benchmark: `data/benchmarks/cadem/normalized/cadem_marzo_2026_master.json`
- Catálogo: `data/surveys/cadem_question_catalog_v1.json`
- Motor: `src/app/opinionEngine/topicStateSeed.ts`

---

## Anexos

### Comandos Útiles (alineados con schema auditado)

```bash
# Verificar estado de encuestas CADEM en Supabase
psql $DATABASE_URL -c "SELECT id, name, status, sample_size, metadata FROM survey_definitions WHERE metadata->>'engine_mode' = 'cadem';"

# Verificar último survey run
psql $DATABASE_URL -c "SELECT id, survey_id, status, sample_size_requested, sample_size_actual, results_summary, metadata, created_at, started_at, completed_at FROM survey_runs WHERE survey_id = '[ID]' ORDER BY created_at DESC LIMIT 1;"

# Verificar respuestas de agentes
psql $DATABASE_URL -c "SELECT question_id, value, confidence, reasoning, created_at FROM survey_responses WHERE run_id = '[RUN_ID]' LIMIT 20;"
```

### Queries de Validación

```sql
-- Query 1: Encuestas CADEM
SELECT 
  id,
  name,
  status,
  sample_size,
  metadata
FROM survey_definitions
WHERE metadata->>'engine_mode' = 'cadem';

-- Query 2: Último survey run
SELECT
  id,
  survey_id,
  status,
  sample_size_requested,
  sample_size_actual,
  results_summary,
  metadata,
  created_at,
  started_at,
  completed_at
FROM survey_runs
WHERE survey_id = '[ID]'
ORDER BY created_at DESC
LIMIT 1;

-- Query 3: Respuestas de un run
SELECT
  question_id,
  value,
  confidence,
  reasoning,
  created_at
FROM survey_responses
WHERE run_id = '[RUN_ID]'
LIMIT 20;

-- Query 4: Distribución por pregunta
SELECT 
  question_id,
  value,
  COUNT(*) as count,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (PARTITION BY question_id), 1) as percentage
FROM survey_responses
WHERE run_id = '[RUN_ID]'
GROUP BY question_id, value
ORDER BY question_id, count DESC;
```

---

*Documento generado el 27 de marzo de 2026*  
*Versión del motor: CADEM v1.1 (v4.10 calibrada)*  
*Estado: Plantilla lista para ejecución*
