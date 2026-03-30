# Semana 2 — Operación Mínima (P0)

**Objetivo:** Reducir la dependencia de scripts para operaciones críticas.

**Estado:** Planificación

---

## 1. Dashboard Operativo Mínimo

### 1.1 Vista de Últimas Ejecuciones

**Ubicación:** Nueva página `/operations` o sección en `/surveys`

**Datos a mostrar (tabla):**

| Columna | Descripción | Fuente |
|---------|-------------|--------|
| Fecha/Hora | `created_at` formateado | `survey_runs` |
| Encuesta | `survey_definitions.title` | JOIN con `survey_definitions` |
| Estado | Badge visual (completado, en progreso, error) | `survey_runs.status` |
| Agentes | `total_agents` | `survey_runs.metadata` |
| Respuestas | `total_responses` | `survey_runs.metadata` |
| Confidence | `avg_confidence` con color coding | `survey_runs.metadata` |
| Engine | `engine_mode` + `engine_version` | `survey_runs.metadata` |
| Escenario | `scenario_name` o "Baseline" | `survey_runs.metadata` |
| Eventos | `use_events` (sí/no) | `survey_runs.metadata` |
| Acciones | Ver detalle / Descargar | - |

**Mockup de la tabla:**
```
┌─────────────────────────────────────────────────────────────────────────────┐
│ ÚLTIMAS EJECUCIONES                                          [Refrescar]   │
├──────────────┬──────────────┬────────┬───────┬──────────┬─────────┬─────────┤
│ Fecha        │ Encuesta     │ Estado │ Agentes│ Respuestas│ Confidence│ Engine │
├──────────────┼──────────────┼────────┼───────┼──────────┼─────────┼─────────┤
│ 29/03 14:30  │ CADEM Marzo  │ ✅ OK  │ 500   │ 500      │ 0.87 🟢  │ v1.2   │
│ 29/03 12:15  │ CADEM Marzo  │ ✅ OK  │ 100   │ 100      │ 0.85 🟢  │ v1.1   │
│ 29/03 10:00  │ CADEM Marzo  │ ❌ Error│ -    │ -        │ -        │ v1.2   │
│ 28/03 18:45  │ CADEM Marzo  │ ⏳ Prog │ 500   │ 230      │ 0.82 🟡  │ v1.2   │
└──────────────┴──────────────┴────────┴───────┴──────────┴─────────┴─────────┘

Filtros: [Todas] [Completadas] [En Progreso] [Con Error] [Baseline] [Escenarios]
```

### 1.2 Estado del Run (Detalle)

**Modal o página de detalle** al hacer click en una fila:

```
┌─────────────────────────────────────────────────────────────┐
│ Run: CADEM Marzo - 29/03 14:30                    [× Cerrar]│
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  📊 RESUMEN                                                 │
│  ┌─────────────────┬─────────────────┬─────────────────┐   │
│  │ Agentes: 500    │ Respuestas: 500 │ Confidence: 0.87│   │
│  └─────────────────┴─────────────────┴─────────────────┘   │
│                                                             │
│  ⚙️ CONFIGURACIÓN                                           │
│  • Engine: v1.2 (async)                                     │
│  • Modo: Escenario "Crisis Económica"                       │
│  • Eventos: Activados                                       │
│  • Persistencia: Sí                                         │
│                                                             │
│  📈 DISTRIBUCIÓN POR TEMA (si hay resultados)               │
│  [Gráfico simple de barras]                                 │
│                                                             │
│  🔍 PREGUNTAS PROCESADAS                                    │
│  ✓ Evaluación Gobierno                                      │
│  ✓ Aprobación Presidente                                    │
│  ✓ Economía Personal                                        │
│  ⚠ Sin mapeo: "Otra pregunta"                               │
│                                                             │
│  [Descargar JSON]  [Ver Agentes]  [Comparar con Baseline]   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 1.3 API/Repository Necesario

**Nuevo método en `surveyRepository.ts`:**
```typescript
async getRecentRuns(limit: number = 20): Promise<SurveyRunSummary[]>
async getRunById(runId: string): Promise<SurveyRunDetail>
async getRunsBySurvey(surveyId: string): Promise<SurveyRunSummary[]>
```

**Tipos necesarios:**
```typescript
interface SurveyRunSummary {
  id: string;
  created_at: string;
  survey_title: string;
  status: 'completed' | 'in_progress' | 'error' | 'draft';
  total_agents: number;
  total_responses: number;
  avg_confidence: number;
  engine_mode: string;
  engine_version: string;
  use_events: boolean;
  scenario_name?: string;
  error_message?: string;
}
```

---

## 2. Indicadores Visibles en Resultados

### 2.1 Tarjeta de Resultados Mejorada

**Ubicación:** Componente `SurveyResultCard` o similar en `SurveysPage`

**Diseño:**
```
┌─────────────────────────────────────────────────────────────┐
│ 📊 CADEM Marzo 2026                    [v1.2] [Escenario]  │
│                                                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │  42%        │  │  38%        │  │  0.87       │         │
│  │ Aprobación  │  │ Evaluación  │  │ Confidence  │         │
│  │ Presidente  │  │ Gobierno    │  │             │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│  🏷️ Baseline: No    🎭 Escenario: Crisis Económica         │
│  ⚡ Eventos: Sí      💾 Persistencia: Sí                    │
│  🔧 Engine: v1.2-async                                      │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  [Ver Detalle]  [Descargar]  [Comparar]                     │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 Badges de Identificación

**Colores por tipo:**
- 🟢 **Baseline**: Verde suave - "Encuesta base sin modificaciones"
- 🟡 **Escenario**: Amarillo/naranja - "Con escenario aplicado"
- 🔵 **Eventos**: Azul - "Con eventos semanales activos"
- 🟣 **Full**: Púrpura - "Escenario + Eventos"

**Badges de Engine:**
- `v1.1` - Versión legacy
- `v1.2` - Versión actual
- `async` - Indicador de modo async

**Badges de Estado:**
- `✅ Completado` - Verde
- `⏳ En Progreso` - Amarillo (con % si está disponible)
- `❌ Error` - Rojo (con mensaje de error visible)
- `📝 Borrador` - Gris

---

## 3. Errores Visibles

### 3.1 Estados de Error Claros

**Cuando un run falla:**
```
┌─────────────────────────────────────────────────────────────┐
│ ❌ ERROR EN EJECUCIÓN                                       │
│                                                             │
│  La encuesta "CADEM Marzo" falló el 29/03 a las 14:30      │
│                                                             │
│  🔴 Error: Timeout al procesar agentes                      │
│                                                             │
│  Detalles técnicos:                                         │
│  • Agentes procesados: 230/500                              │
│  • Última pregunta: "Evaluación Gobierno"                   │
│  • Tiempo transcurrido: 5m 30s                              │
│                                                             │
│  [Reintentar]  [Ver Logs]  [Reportar Issue]                 │
└─────────────────────────────────────────────────────────────┘
```

**Cuando no hay resultados:**
```
┌─────────────────────────────────────────────────────────────┐
│ 📭 SIN RESULTADOS                                           │
│                                                             │
│  No se encontraron ejecuciones para esta encuesta.          │
│                                                             │
│  Posibles causas:                                           │
│  • La encuesta aún no ha sido ejecutada                     │
│  • El run está en progreso (puede tardar varios minutos)    │
│  • Hubo un error en la última ejecución                     │
│                                                             │
│  [Ejecutar Ahora]  [Ver Estado]                             │
└─────────────────────────────────────────────────────────────┘
```

### 3.2 Toast Notifications

**Para operaciones en tiempo real:**
```typescript
// Éxito
showToast('✅ Run completado: 500 respuestas procesadas', 'success');

// Error
showToast('❌ Error: No se pudo conectar con el engine', 'error');

// Progreso
showToast('⏳ Procesando: 230/500 agentes...', 'info');
```

---

## 4. Implementación Técnica

### 4.1 Estructura de Archivos

```
src/
├── pages/
│   └── OperationsPage.ts          # Nueva página de operaciones
├── components/
│   ├── RunTable.ts                # Tabla de runs
│   ├── RunDetailModal.ts          # Modal de detalle
│   ├── RunStatusBadge.ts          # Badge de estado
│   ├── EngineBadge.ts             # Badge de engine
│   └── SurveyResultCard.ts        # Mejorado con indicadores
├── services/
│   └── operations/
│       └── operationsService.ts   # Lógica de operaciones
└── styles/
    └── operations.css             # Estilos específicos
```

### 4.2 Queries SQL Necesarias

**Listar runs recientes:**
```sql
SELECT 
  sr.id,
  sr.created_at,
  sr.status,
  sr.metadata,
  sd.title as survey_title
FROM survey_runs sr
JOIN survey_definitions sd ON sr.survey_definition_id = sd.id
WHERE sr.status != 'draft'
ORDER BY sr.created_at DESC
LIMIT 20;
```

**Estadísticas agregadas:**
```sql
SELECT 
  COUNT(*) as total_runs,
  COUNT(*) FILTER (WHERE status = 'completed') as completed,
  COUNT(*) FILTER (WHERE status = 'error') as errors,
  AVG((metadata->>'avg_confidence')::float) as avg_confidence
FROM survey_runs
WHERE created_at > NOW() - INTERVAL '7 days';
```

### 4.3 RLS Considerations

Dado que estamos en Phase 1 de seguridad (RLS activado):

```sql
-- Permitir lectura de runs completados a usuarios anónimos
CREATE POLICY "Allow anonymous read completed runs" ON survey_runs
  FOR SELECT
  TO anon
  USING (status = 'completed');

-- Permitir lectura de runs en progreso solo a usuarios autenticados
CREATE POLICY "Allow authenticated read all runs" ON survey_runs
  FOR SELECT
  TO authenticated
  USING (true);
```

---

## 5. Criterios de Éxito

### 5.1 Checklist de Validación

- [ ] Usuario interno puede ver runs recientes sin abrir consola
- [ ] Puede identificar si una encuesta fue baseline, escenario o eventos
- [ ] Puede ver el estado de un run en progreso
- [ ] Puede identificar rápidamente runs con error
- [ ] Puede acceder a detalles de un run específico
- [ ] Puede descargar resultados desde la UI
- [ ] Los indicadores de engine version son visibles
- [ ] Los errores muestran información útil (no solo "Error")

### 5.2 Métricas

| Métrica | Objetivo |
|---------|----------|
| Tiempo para identificar estado de run | < 5 segundos |
| Tiempo para descargar resultados | < 3 clicks |
| Claridad de error (escala 1-5) | > 4 |
| Reducción de consultas a scripts | 50% |

---

## 6. Tareas de Implementación

### Fase 1: Backend (Día 1-2)
- [ ] Crear `operationsService.ts` con queries optimizadas
- [ ] Agregar endpoints/mock data para desarrollo
- [ ] Actualizar RLS policies si es necesario

### Fase 2: Componentes UI (Día 2-4)
- [ ] Crear `RunTable` component
- [ ] Crear `RunStatusBadge` component
- [ ] Crear `EngineBadge` component
- [ ] Crear `RunDetailModal` component

### Fase 3: Página de Operaciones (Día 4-5)
- [ ] Crear `OperationsPage`
- [ ] Integrar componentes
- [ ] Agregar filtros y búsqueda
- [ ] Agregar exportación

### Fase 4: Mejoras a SurveysPage (Día 5-7)
- [ ] Actualizar `SurveyResultCard` con badges
- [ ] Mejorar mensajes de error
- [ ] Agregar indicadores de engine
- [ ] Testing y refinamiento

---

## 7. Notas de Diseño

### Paleta de Colores para Estados
```css
--status-completed: #10b981;  /* Verde */
--status-progress: #f59e0b;   /* Amarillo */
--status-error: #ef4444;      /* Rojo */
--status-draft: #6b7280;      /* Gris */

--engine-v1-1: #8b5cf6;       /* Púrpura */
--engine-v1-2: #3b82f6;       /* Azul */

--badge-baseline: #10b981;    /* Verde */
--badge-scenario: #f59e0b;    /* Naranja */
--badge-events: #3b82f6;      /* Azul */
```

### Iconografía
- ✅ Completado: `check-circle`
- ⏳ En progreso: `clock` o `spinner`
- ❌ Error: `x-circle`
- 📝 Borrador: `file-text`
- 🎭 Escenario: `zap` o `activity`
- ⚡ Eventos: `bolt`
- 💾 Persistencia: `save`

---

## 8. Dependencias

- **Bloqueado por:** Ninguno (puede desarrollarse en paralelo)
- **Bloquea:** Phase 3 (automatización de runs)
- **Relacionado con:** Security Phase 1 (RLS policies)

---

**Documento creado:** 29/03/2026  
**Última actualización:** 29/03/2026  
**Estado:** Listo para implementación
