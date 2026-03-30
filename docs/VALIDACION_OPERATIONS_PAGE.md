# Validación Manual - OperationsPage

**Fecha:** 29/03/2026
**Versión:** MVP Etapa 1
**Estado:** ✅ IMPLEMENTADO Y CORREGIDO - Listo para validación manual

---

## 🐛 Issues Corregidos

### Issue 1: Columna survey_definition_id no existe
**Error:** `column survey_runs.survey_definition_id does not exist`

**Causa:** El schema real de la tabla `survey_runs` usa `survey_id` (no `survey_definition_id`)

**Solución:** Actualizado en:
- `src/types/operations.ts` - Cambiado `survey_definition_id` → `survey_id`
- `src/services/operations/operationsService.ts` - Actualizadas todas las queries y mapeos

**Estado:** ✅ Corregido

### Issue 2: Mapeo incorrecto de datos (metadata vacío)
**Error:** Los runs mostraban 0 agentes, 0 respuestas, 0% confidence aunque los datos existían en la BD

**Causa:** El código intentaba leer datos de `metadata` JSONB, pero los valores reales están en:
- `sample_size_requested` / `sample_size_actual` (columnas de la tabla)
- `results_summary` (JSONB con métricas de resultados)

**Solución:** Actualizado en:
- `src/types/operations.ts` - Agregado `SurveyRunResultsSummary` y campos faltantes a `SurveyRunRaw`
- `src/services/operations/operationsService.ts` - Query actualizada para incluir `results_summary`, mapeo corregido:
  - `sample_size_requested`/`sample_size_actual` → `total_agents`
  - `results_summary.total_responses` → `total_responses`
  - `results_summary.avg_confidence` → `avg_confidence`
  - `metadata.phase` → engine mode/version (v1.2 = async, otros = sync)

**Estado:** ✅ Corregido

---

## 📦 Resumen de Implementación

### Archivos Creados
| Archivo | Descripción |
|---------|-------------|
| `src/types/operations.ts` | Tipos TypeScript para operaciones |
| `src/services/operations/operationsService.ts` | Service para queries a Supabase |
| `src/components/RunTable.ts` | Componente de tabla de runs |
| `src/pages/OperationsPage.ts` | Página principal del dashboard |
| `src/styles/operations.css` | Estilos CSS del dashboard |

### Integración
- ✅ Ruta `/operations` agregada al router
- ✅ Link "Operaciones" agregado a navegación
- ✅ OperationsPage registrada en main.ts

### Seguridad
- ✅ Usa `anon key` (respeta RLS)
- ✅ Fallback graceful si Supabase no disponible
- ✅ No expone service keys

### Queries a Supabase
1. **Query 1**: Obtener runs de `survey_runs` (sin joins)
2. **Query 2**: Obtener nombres de `survey_definitions` por IDs

### Estructura de Datos

#### Tabla `survey_runs` - Columnas principales:
- `id`: UUID del run
- `created_at`: timestamp de creación
- `status`: estado (`draft`, `in_progress`, `completed`, `error`)
- `survey_id`: ID de la encuesta relacionada
- `sample_size_requested`: tamaño de muestra solicitado
- `sample_size_actual`: tamaño de muestra real procesado

#### Campo `metadata` JSONB (configuración del run):
- `phase`: fase del rollout (ej: "phase3_v1.2")
- `use_events`: boolean - si se usaron eventos
- `scenario_id`: ID del escenario aplicado
- `scenario_name`: nombre del escenario
- `error_message`: mensaje de error (si aplica)

#### Campo `results_summary` JSONB (resultados del run):
- `total_responses`: número de respuestas generadas
- `completion_rate`: tasa de completitud (0-1)
- `avg_confidence`: confidence promedio (0-1)
- `distributions`: distribuciones por pregunta
- `metrics`: métricas adicionales
  - `completionRate`: tasa de completitud
  - `errorRate`: tasa de error
  - `eventsApplied`: eventos aplicados
  - `eventImpactDetected`: si se detectó impacto de eventos
  - `executionTime`: tiempo de ejecución
  - `timePerAgent`: tiempo por agente
- `event_log`: log de eventos
  - `eventsLoaded`: eventos cargados
  - `eventsApplied`: eventos aplicados
  - `impactSummary`: resumen de impacto por tema

### Mapeo de Datos
Los datos se mapean así:
- `total_agents` ← `sample_size_actual` ?? `sample_size_requested` ?? 0
- `total_responses` ← `results_summary.total_responses` ?? 0
- `avg_confidence` ← `results_summary.avg_confidence` ?? 0
- `engine_mode` ← `"async"` si `metadata.phase` incluye "v1.2", sino `"sync"`
- `engine_version` ← `"v1.2"` si `metadata.phase` incluye "v1.2", sino `"v1.1"`
- `use_events` ← `metadata.use_events` ?? false
- `scenario_name` ← `metadata.scenario_name` ?? undefined

---

## Checklist de Validación

### 1. Navegación y Carga
- [ ] La página `/operations` carga sin errores
- [ ] El enlace "Operaciones" aparece en el menú de navegación
- [ ] El icono `settings_suggest` se muestra correctamente
- [ ] Al hacer click en el menú, navega a `/operations`

### 2. Datos Reales
- [ ] Se ven runs reales de la base de datos
- [ ] Los datos coinciden con lo que hay en Supabase
- [ ] El botón "Refrescar" funciona y recarga los datos

### 3. Badges de Estado
- [ ] ✓ Completado - verde
- [ ] ⏳ En progreso - amarillo
- [ ] ❌ Error - rojo
- [ ] Los estados se muestran correctamente

### 4. Badges de Engine
- [ ] Muestra versión (v1.2, etc.)
- [ ] Muestra modo (async/sync)
- [ ] Formato: "v1.2 async" o "v1.2 sync"

### 5. Badges de Tipo
- [ ] 📊 Base - baseline sin escenario ni eventos
- [ ] 🎭 Esc - solo escenario
- [ ] ⚡ Ev - solo eventos
- [ ] 🎭⚡ Full - escenario + eventos
- [ ] El tooltip muestra el nombre del escenario

### 6. Columnas de la Tabla
- [ ] Fecha - formato DD/MM HH:MM
- [ ] Encuesta - nombre correcto
- [ ] Estado - badge correcto
- [ ] Agentes - número correcto
- [ ] Respuestas - número correcto
- [ ] Confidence - porcentaje con indicador de color
- [ ] Engine - versión y modo
- [ ] Tipo - badge correcto

### 7. Resumen Estadístico
- [ ] Total - número de runs mostrados
- [ ] ✓ OK - runs completados
- [ ] ❌ Error - runs con error
- [ ] ⏳ Progreso - runs en progreso
- [ ] Los números son coherentes

### 8. Interacción
- [ ] Click en fila navega a detalle (o loguea en consola)
- [ ] Hover en fila cambia el color de fondo
- [ ] Botón "Refrescar" recarga los datos

### 9. Edge Cases
- [ ] Estado vacío: mensaje amigable cuando no hay runs
- [ ] Error de carga: mensaje con botón "Reintentar"
- [ ] Datos faltantes: no rompe la tabla (muestra defaults)

### 10. Estilos Visuales
- [ ] La página tiene padding adecuado
- [ ] La tabla tiene sombra y bordes redondeados
- [ ] Los badges tienen colores distintivos
- [ ] El header está bien posicionado
- [ ] Responsive: se ve bien en pantallas medianas

---

## Resultados de Validación

### ✅ Aprobado
| Item | Estado | Notas |
|------|--------|-------|
| Navegación | ⬜ | |
| Carga de datos | ⬜ | |
| Badges estado | ⬜ | |
| Badges engine | ⬜ | |
| Badges tipo | ⬜ | |
| Tabla completa | ⬜ | |
| Resumen stats | ⬜ | |
| Interacción | ⬜ | |
| Edge cases | ⬜ | |
| Estilos | ⬜ | |

### ❌ Issues Encontrados
| Issue | Severidad | Descripción | Solución |
|-------|-----------|-------------|----------|
| | | | |

### 📝 Notas Adicionales

---

## Criterio de Aprobación

**La Etapa 1 está oficialmente aprobada cuando:**
1. ✅ Todos los items críticos pasan (1-7)
2. ✅ No hay errores visuales graves
3. ✅ Los datos mostrados son coherentes con Supabase

**Si hay issues:**
- Documentar en la tabla de issues
- Priorizar por severidad
- Corregir antes de pasar a Etapa 2

---

**Validador:** _______________
**Fecha validación:** _______________
**Resultado final:** ⬜ APROBADO / ⬜ RECHAZADO / ⬜ APROBADO CON OBSERVACIONES
