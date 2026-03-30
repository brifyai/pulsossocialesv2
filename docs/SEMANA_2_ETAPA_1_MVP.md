# Semana 2 — Etapa 1: MVP Dashboard Operativo

**Objetivo:** Implementar el mínimo viable para ver runs sin depender de scripts.

**Estado:** ✅ IMPLEMENTADO Y CORREGIDO

**Tiempo estimado:** 2-3 días

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

## 🎯 Alcance de Esta Etapa (MVP)

### SÍ incluir:
- [x] `operationsService.ts` - Queries básicas
- [x] `RunTable.ts` - Tabla simple de runs
- [x] `OperationsPage.ts` - Página contenedora
- [x] Badges inline simples (estado, engine, escenario)
- [x] Navegación básica
- [x] Estilos mínimos funcionales

### NO incluir todavía:
- [ ] RunDetailModal complejo
- [ ] Exportación adicional
- [ ] Filtros complejos
- [ ] Comparación avanzada
- [ ] Gráficos
- [ ] Actualización en tiempo real

---

## 📋 Schema Real a Usar

Basado en auditorías previas, el schema real es:

### Tablas principales:
```sql
-- survey_definitions
- id: uuid
- name: string
- description: text
- status: string
- created_at: timestamp
- updated_at: timestamp
- metadata: jsonb

-- survey_runs
- id: uuid
- survey_id: uuid (FK) - referencia a survey_definitions
- status: string ('draft', 'in_progress', 'completed', 'error')
- created_at: timestamp
- updated_at: timestamp
- sample_size_requested: int - tamaño solicitado
- sample_size_actual: int - tamaño real procesado
- metadata: jsonb - configuración del run
- results_summary: jsonb - resultados del run
```

### Campos en metadata (configuración):
```json
{
  "phase": "phase3_v1.2",           // fase del rollout
  "use_events": true,               // si se usaron eventos
  "scenario_id": "uuid",            // ID del escenario
  "scenario_name": "Crisis Económica", // nombre del escenario
  "error_message": "..."            // solo si status = 'error'
}
```

### Campos en results_summary (resultados):
```json
{
  "total_responses": 500,
  "completion_rate": 1.0,
  "avg_confidence": 0.87,
  "distributions": { ... },
  "metrics": {
    "completionRate": 1.0,
    "errorRate": 0,
    "eventsApplied": 3,
    "eventImpactDetected": true,
    "executionTime": 12345,
    "timePerAgent": 24.69
  },
  "event_log": {
    "eventsLoaded": 5,
    "eventsApplied": 3,
    "impactSummary": { ... }
  }
}
```

### Mapeo de datos:
- `total_agents` ← `sample_size_actual` ?? `sample_size_requested` ?? 0
- `total_responses` ← `results_summary.total_responses` ?? 0
- `avg_confidence` ← `results_summary.avg_confidence` ?? 0
- `engine_mode` ← `"async"` si `metadata.phase` incluye "v1.2", sino `"sync"`
- `engine_version` ← `"v1.2"` si `metadata.phase` incluye "v1.2", sino `"v1.1"`

---

## 🏗️ Orden de Implementación

### Paso 1: Tipos (15 min)
**Archivo:** `src/types/operations.ts` (nuevo)

```typescript
export interface SurveyRunSummary {
  id: string;
  created_at: string;
  survey_name: string;
  status: 'draft' | 'in_progress' | 'completed' | 'error';
  total_agents: number;
  total_responses: number;
  avg_confidence: number;
  engine_mode: string;
  engine_version: string;
  use_events: boolean;
  scenario_name?: string;
  error_message?: string;
}

export interface OperationsFilters {
  status?: string;
  surveyId?: string;
  dateFrom?: string;
  dateTo?: string;
}
```

### Paso 2: Service (1 hora)
**Archivo:** `src/services/operations/operationsService.ts` (nuevo)

```typescript
import { supabase } from '../supabase/client';
import type { SurveyRunSummary } from '../../types/operations';

export class OperationsService {
  async getRecentRuns(limit: number = 20): Promise<SurveyRunSummary[]> {
    const { data, error } = await supabase
      .from('survey_runs')
      .select(`
        id,
        created_at,
        status,
        metadata,
        survey_definitions:survey_definition_id (name)
      `)
      .neq('status', 'draft')  // Excluir drafts
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;

    return this.mapToSummary(data);
  }

  private mapToSummary(data: any[]): SurveyRunSummary[] {
    return data.map(run => ({
      id: run.id,
      created_at: run.created_at,
      survey_name: run.survey_definitions?.name || 'Sin nombre',
      status: run.status,
      total_agents: run.metadata?.total_agents || 0,
      total_responses: run.metadata?.total_responses || 0,
      avg_confidence: run.metadata?.avg_confidence || 0,
      engine_mode: run.metadata?.engine_mode || 'unknown',
      engine_version: run.metadata?.engine_version || 'unknown',
      use_events: run.metadata?.use_events || false,
      scenario_name: run.metadata?.scenario_name,
      error_message: run.status === 'error' ? run.metadata?.error_message : undefined
    }));
  }
}

export const operationsService = new OperationsService();
```

### Paso 3: Componente RunTable (1.5 horas)
**Archivo:** `src/components/RunTable.ts` (nuevo)

```typescript
import type { SurveyRunSummary } from '../types/operations';

interface RunTableProps {
  runs: SurveyRunSummary[];
  onRowClick?: (runId: string) => void;
}

export function RunTable({ runs, onRowClick }: RunTableProps): HTMLElement {
  const container = document.createElement('div');
  container.className = 'run-table-container';

  if (runs.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <p>No hay ejecuciones para mostrar</p>
        <p class="hint">Las encuestas ejecutadas aparecerán aquí</p>
      </div>
    `;
    return container;
  }

  const table = document.createElement('table');
  table.className = 'run-table';

  table.innerHTML = `
    <thead>
      <tr>
        <th>Fecha</th>
        <th>Encuesta</th>
        <th>Estado</th>
        <th>Agentes</th>
        <th>Respuestas</th>
        <th>Confidence</th>
        <th>Engine</th>
        <th>Tipo</th>
      </tr>
    </thead>
    <tbody>
      ${runs.map(run => `
        <tr data-run-id="${run.id}" class="run-row ${run.status}">
          <td>${formatDate(run.created_at)}</td>
          <td>${escapeHtml(run.survey_name)}</td>
          <td>${renderStatusBadge(run.status, run.error_message)}</td>
          <td>${run.total_agents}</td>
          <td>${run.total_responses}</td>
          <td>${renderConfidence(run.avg_confidence)}</td>
          <td>${renderEngineBadge(run.engine_version, run.engine_mode)}</td>
          <td>${renderTypeBadge(run.scenario_name, run.use_events)}</td>
        </tr>
      `).join('')}
    </tbody>
  `;

  // Event delegation para clicks
  table.addEventListener('click', (e) => {
    const row = (e.target as HTMLElement).closest('.run-row');
    if (row && onRowClick) {
      onRowClick(row.getAttribute('data-run-id')!);
    }
  });

  container.appendChild(table);
  return container;
}

// Helper functions
function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleString('es-CL', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function renderStatusBadge(status: string, errorMessage?: string): string {
  const badges: Record<string, string> = {
    'completed': '<span class="badge badge-success">✓ Completado</span>',
    'in_progress': '<span class="badge badge-warning">⏳ En progreso</span>',
    'error': `<span class="badge badge-error" title="${escapeHtml(errorMessage || '')}">❌ Error</span>`,
    'draft': '<span class="badge badge-muted">📝 Borrador</span>'
  };
  return badges[status] || `<span class="badge">${status}</span>`;
}

function renderConfidence(confidence: number): string {
  if (confidence >= 0.85) return `<span class="confidence high">${(confidence * 100).toFixed(0)}% 🟢</span>`;
  if (confidence >= 0.70) return `<span class="confidence medium">${(confidence * 100).toFixed(0)}% 🟡</span>`;
  return `<span class="confidence low">${(confidence * 100).toFixed(0)}% 🔴</span>`;
}

function renderEngineBadge(version: string, mode: string): string {
  const modeLabel = mode === 'async' ? 'async' : 'sync';
  return `<span class="badge badge-engine">${version} ${modeLabel}</span>`;
}

function renderTypeBadge(scenarioName?: string, useEvents?: boolean): string {
  if (scenarioName && useEvents) {
    return `<span class="badge badge-full" title="${escapeHtml(scenarioName)}">🎭⚡ Full</span>`;
  }
  if (scenarioName) {
    return `<span class="badge badge-scenario" title="${escapeHtml(scenarioName)}">🎭 Esc</span>`;
  }
  if (useEvents) {
    return `<span class="badge badge-events">⚡ Ev</span>`;
  }
  return `<span class="badge badge-baseline">📊 Base</span>`;
}

function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
```

### Paso 4: Página OperationsPage (1 hora)
**Archivo:** `src/pages/OperationsPage.ts` (nuevo)

```typescript
import { operationsService } from '../services/operations/operationsService';
import { RunTable } from '../components/RunTable';
import type { SurveyRunSummary } from '../types/operations';

export class OperationsPage {
  private container: HTMLElement;
  private runs: SurveyRunSummary[] = [];
  private isLoading = false;
  private error: string | null = null;

  constructor(container: HTMLElement) {
    this.container = container;
  }

  async render(): Promise<void> {
    this.container.innerHTML = `
      <div class="operations-page">
        <header class="page-header">
          <h1>📊 Operaciones</h1>
          <p class="subtitle">Últimas ejecuciones de encuestas</p>
          <button id="refresh-btn" class="btn btn-secondary">
            🔄 Refrescar
          </button>
        </header>

        <div id="content-area">
          <div class="loading">Cargando...</div>
        </div>
      </div>
    `;

    // Bind events
    this.container.querySelector('#refresh-btn')?.addEventListener('click', () => {
      this.loadData();
    });

    // Load data
    await this.loadData();
  }

  private async loadData(): Promise<void> {
    const contentArea = this.container.querySelector('#content-area');
    if (!contentArea) return;

    this.isLoading = true;
    this.renderContent();

    try {
      this.runs = await operationsService.getRecentRuns(20);
      this.error = null;
    } catch (err) {
      this.error = err instanceof Error ? err.message : 'Error desconocido';
      console.error('Error loading runs:', err);
    } finally {
      this.isLoading = false;
      this.renderContent();
    }
  }

  private renderContent(): void {
    const contentArea = this.container.querySelector('#content-area');
    if (!contentArea) return;

    if (this.isLoading) {
      contentArea.innerHTML = '<div class="loading">⏳ Cargando ejecuciones...</div>';
      return;
    }

    if (this.error) {
      contentArea.innerHTML = `
        <div class="error-state">
          <h3>❌ Error al cargar</h3>
          <p>${escapeHtml(this.error)}</p>
          <button id="retry-btn" class="btn btn-primary">Reintentar</button>
        </div>
      `;
      contentArea.querySelector('#retry-btn')?.addEventListener('click', () => {
        this.loadData();
      });
      return;
    }

    // Render table
    const table = RunTable({
      runs: this.runs,
      onRowClick: (runId) => {
        // MVP: solo log, en etapa 2 abrir modal
        console.log('Clicked run:', runId);
        // Por ahora, navegar a la página de resultados si existe
        window.location.hash = `#/surveys?run=${runId}`;
      }
    });

    contentArea.innerHTML = '';
    contentArea.appendChild(table);

    // Agregar resumen
    const summary = this.renderSummary();
    contentArea.insertBefore(summary, table);
  }

  private renderSummary(): HTMLElement {
    const completed = this.runs.filter(r => r.status === 'completed').length;
    const errors = this.runs.filter(r => r.status === 'error').length;
    const inProgress = this.runs.filter(r => r.status === 'in_progress').length;

    const div = document.createElement('div');
    div.className = 'operations-summary';
    div.innerHTML = `
      <div class="summary-stats">
        <div class="stat">
          <span class="stat-value">${this.runs.length}</span>
          <span class="stat-label">Total</span>
        </div>
        <div class="stat stat-success">
          <span class="stat-value">${completed}</span>
          <span class="stat-label">✓ OK</span>
        </div>
        <div class="stat stat-error">
          <span class="stat-value">${errors}</span>
          <span class="stat-label">❌ Error</span>
        </div>
        <div class="stat stat-warning">
          <span class="stat-value">${inProgress}</span>
          <span class="stat-label">⏳ Progreso</span>
        </div>
      </div>
    `;
    return div;
  }
}

function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
```

### Paso 5: Estilos (30 min)
**Archivo:** `src/styles/operations.css` (nuevo)

```css
/* Operations Page */
.operations-page {
  padding: 1.5rem;
  max-width: 1400px;
  margin: 0 auto;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid var(--border-color, #e5e7eb);
}

.page-header h1 {
  margin: 0;
  font-size: 1.75rem;
}

.subtitle {
  color: var(--text-muted, #6b7280);
  margin: 0.25rem 0 0 0;
}

/* Summary Stats */
.operations-summary {
  margin-bottom: 1.5rem;
}

.summary-stats {
  display: flex;
  gap: 1rem;
}

.stat {
  background: var(--bg-secondary, #f9fafb);
  padding: 1rem 1.5rem;
  border-radius: 0.5rem;
  text-align: center;
  min-width: 80px;
}

.stat-value {
  display: block;
  font-size: 1.5rem;
  font-weight: 600;
  color: var(--text-primary, #111827);
}

.stat-label {
  display: block;
  font-size: 0.75rem;
  color: var(--text-muted, #6b7280);
  margin-top: 0.25rem;
}

.stat-success .stat-value { color: #10b981; }
.stat-error .stat-value { color: #ef4444; }
.stat-warning .stat-value { color: #f59e0b; }

/* Run Table */
.run-table-container {
  background: white;
  border-radius: 0.5rem;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
  overflow: hidden;
}

.run-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.875rem;
}

.run-table th {
  background: var(--bg-secondary, #f9fafb);
  padding: 0.75rem 1rem;
  text-align: left;
  font-weight: 600;
  color: var(--text-secondary, #4b5563);
  border-bottom: 1px solid var(--border-color, #e5e7eb);
}

.run-table td {
  padding: 0.75rem 1rem;
  border-bottom: 1px solid var(--border-color, #e5e7eb);
}

.run-row {
  cursor: pointer;
  transition: background-color 0.15s;
}

.run-row:hover {
  background: var(--bg-hover, #f3f4f6);
}

.run-row.error {
  background: #fef2f2;
}

.run-row.error:hover {
  background: #fee2e2;
}

/* Badges */
.badge {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.25rem 0.5rem;
  border-radius: 0.25rem;
  font-size: 0.75rem;
  font-weight: 500;
}

.badge-success {
  background: #d1fae5;
  color: #065f46;
}

.badge-warning {
  background: #fef3c7;
  color: #92400e;
}

.badge-error {
  background: #fee2e2;
  color: #991b1b;
}

.badge-muted {
  background: #f3f4f6;
  color: #4b5563;
}

.badge-engine {
  background: #e0e7ff;
  color: #3730a3;
}

.badge-baseline {
  background: #d1fae5;
  color: #065f46;
}

.badge-scenario {
  background: #fef3c7;
  color: #92400e;
}

.badge-events {
  background: #dbeafe;
  color: #1e40af;
}

.badge-full {
  background: #f3e8ff;
  color: #6b21a8;
}

/* Confidence */
.confidence {
  font-weight: 500;
}

.confidence.high { color: #10b981; }
.confidence.medium { color: #f59e0b; }
.confidence.low { color: #ef4444; }

/* Empty State */
.empty-state {
  text-align: center;
  padding: 3rem;
  color: var(--text-muted, #6b7280);
}

.empty-state .hint {
  font-size: 0.875rem;
  margin-top: 0.5rem;
}

/* Error State */
.error-state {
  text-align: center;
  padding: 3rem;
}

.error-state h3 {
  color: #ef4444;
  margin-bottom: 0.5rem;
}

/* Loading */
.loading {
  text-align: center;
  padding: 3rem;
  color: var(--text-muted, #6b7280);
}

/* Responsive */
@media (max-width: 1024px) {
  .run-table {
    font-size: 0.75rem;
  }

  .run-table th,
  .run-table td {
    padding: 0.5rem;
  }

  .summary-stats {
    flex-wrap: wrap;
  }
}
```

### Paso 6: Wiring en Router (15 min)
**Archivo:** `src/router/index.ts` (modificar)

```typescript
// Agregar import
import { OperationsPage } from '../pages/OperationsPage';

// En la función de routing, agregar case:
case '#/operations':
  const operationsPage = new OperationsPage(contentArea);
  operationsPage.render();
  break;
```

### Paso 7: Agregar a Navegación (10 min)
**Archivo:** `src/components/Navigation.ts` (modificar)

```typescript
// Agregar en el menú:
{
  label: 'Operaciones',
  href: '#/operations',
  icon: 'activity'
}
```

---

## ✅ Checklist de Validación

Después de implementar, verificar:

### Funcionalidad básica:
- [ ] La página `/operations` carga sin errores
- [ ] Se ven runs reales de la base de datos
- [ ] Los datos coinciden con lo que hay en Supabase
- [ ] El botón "Refrescar" funciona

### Visual:
- [ ] Se entiende qué es cada columna
- [ ] Los badges de estado se ven bien
- [ ] Los badges de engine se ven bien
- [ ] Se distingue baseline de escenario
- [ ] Los errores se ven en rojo

### Interacción:
- [ ] Click en una fila hace algo (navega o loguea)
- [ ] El estado de carga se muestra
- [ ] Los errores de carga se muestran con opción de reintentar

### Edge cases:
- [ ] Cuando no hay runs, muestra mensaje amigable
- [ ] Cuando falla la carga, muestra error
- [ ] Datos faltantes no rompen la tabla

---

## 🚀 Criterio de Éxito

**Esta etapa está lista cuando:**
1. Un usuario puede abrir `/operations` y ver runs recientes
2. Puede identificar si un run fue baseline, escenario o con eventos
3. Puede ver el estado (completado, error, en progreso)
4. No necesita abrir la consola para saber qué se ejecutó

**No es necesario para esta etapa:**
- Ver detalle completo del run
- Exportar resultados
- Filtros avanzados
- Comparaciones

---

## 📁 Archivos a Crear/Modificar

### Nuevos:
1. `src/types/operations.ts`
2. `src/services/operations/operationsService.ts`
3. `src/components/RunTable.ts`
4. `src/pages/OperationsPage.ts`
5. `src/styles/operations.css`

### Modificados:
1. `src/router/index.ts` - Agregar ruta
2. `src/components/Navigation.ts` - Agregar link
3. `src/main.ts` - Importar CSS

---

## 📝 Notas de Implementación

1. **Schema first:** Verificar que los nombres de columnas coincidan con el schema real
2. **Defensive coding:** Manejar datos faltantes en metadata
3. **No romper:** No modificar componentes existentes, solo agregar
4. **TypeScript estricto:** Usar tipos en todo
5. **CSS aislado:** Usar clases específicas para no conflictuar

---

**Documento creado:** 29/03/2026  
**Versión:** MVP Etapa 1  
**Estado:** Listo para implementar
