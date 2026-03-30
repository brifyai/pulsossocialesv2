/**
 * RunTable component - Tabla de runs de encuestas
 * Semana 2 - Etapa 1: MVP Dashboard Operativo
 */

import type { SurveyRunSummary, RunStatus } from '../types/operations';

/**
 * Props para el componente RunTable
 */
export interface RunTableProps {
  /** Lista de runs a mostrar */
  runs: SurveyRunSummary[];
  /** Si está cargando */
  loading?: boolean;
  /** Mensaje de error */
  error?: string | null;
  /** Callback al hacer click en un run */
  onRunClick?: (run: SurveyRunSummary) => void;
}

/**
 * Crea la tabla de runs
 */
export function createRunTable(props: RunTableProps): HTMLElement {
  const { runs, loading = false, error = null, onRunClick } = props;

  const container = document.createElement('div');
  container.className = 'run-table-container';

  // Estado de carga
  if (loading) {
    container.innerHTML = `
      <div class="run-table-loading">
        <span class="material-symbols-outlined spin">sync</span>
        <span>Cargando runs...</span>
      </div>
    `;
    return container;
  }

  // Estado de error
  if (error) {
    container.innerHTML = `
      <div class="run-table-error">
        <span class="material-symbols-outlined">error</span>
        <span>${escapeHtml(error)}</span>
      </div>
    `;
    return container;
  }

  // Sin datos
  if (runs.length === 0) {
    container.innerHTML = `
      <div class="run-table-empty">
        <span class="material-symbols-outlined">inbox</span>
        <span>No hay runs para mostrar</span>
      </div>
    `;
    return container;
  }

  // Tabla de runs
  const table = document.createElement('table');
  table.className = 'run-table';

  // Header
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
        <th>Eventos</th>
        <th>Escenario</th>
      </tr>
    </thead>
    <tbody>
      ${runs.map(run => `
        <tr class="run-row" data-run-id="${escapeHtml(run.id)}">
          <td class="run-date">${formatDate(run.created_at)}</td>
          <td class="run-survey">${escapeHtml(run.survey_name)}</td>
          <td class="run-status">${createStatusBadge(run.status)}</td>
          <td class="run-agents">${run.total_agents.toLocaleString()}</td>
          <td class="run-responses">${run.total_responses.toLocaleString()}</td>
          <td class="run-confidence">${formatConfidence(run.avg_confidence)}</td>
          <td class="run-engine">
            <span class="engine-badge engine-${run.engine_version}">${run.engine_version}</span>
            <span class="engine-mode">${run.engine_mode}</span>
          </td>
          <td class="run-events">${run.use_events ? '✓' : '—'}</td>
          <td class="run-scenario">${run.scenario_name ? escapeHtml(run.scenario_name) : '—'}</td>
        </tr>
        ${run.error_message ? `
          <tr class="run-error-row">
            <td colspan="9" class="run-error-message">
              <span class="material-symbols-outlined">error</span>
              ${escapeHtml(run.error_message)}
            </td>
          </tr>
        ` : ''}
      `).join('')}
    </tbody>
  `;

  // Agregar event listeners para clicks en filas
  const rows = table.querySelectorAll('.run-row');
  rows.forEach(row => {
    row.addEventListener('click', () => {
      const runId = row.getAttribute('data-run-id');
      const run = runs.find(r => r.id === runId);
      if (run && onRunClick) {
        onRunClick(run);
      }
    });
  });

  container.appendChild(table);
  return container;
}

/**
 * Crea un badge de estado
 */
function createStatusBadge(status: RunStatus): string {
  const statusConfig: Record<RunStatus, { label: string; class: string; icon: string }> = {
    draft: { label: 'Draft', class: 'status-draft', icon: 'edit' },
    in_progress: { label: 'En progreso', class: 'status-in-progress', icon: 'sync' },
    completed: { label: 'Completado', class: 'status-completed', icon: 'check_circle' },
    error: { label: 'Error', class: 'status-error', icon: 'error' }
  };

  const config = statusConfig[status];
  return `
    <span class="status-badge ${config.class}">
      <span class="material-symbols-outlined">${config.icon}</span>
      ${config.label}
    </span>
  `;
}

/**
 * Formatea una fecha ISO a formato legible
 */
function formatDate(isoDate: string): string {
  try {
    const date = new Date(isoDate);
    return date.toLocaleString('es-CL', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return isoDate;
  }
}

/**
 * Formatea el confidence como porcentaje
 */
function formatConfidence(confidence: number): string {
  if (confidence === 0) return '—';
  return `${(confidence * 100).toFixed(1)}%`;
}

/**
 * Escapa HTML para prevenir XSS
 */
function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Agrega los estilos CSS para la tabla
 */
export function addRunTableStyles(): void {
  if (document.getElementById('run-table-styles')) return;

  const styles = document.createElement('style');
  styles.id = 'run-table-styles';
  styles.textContent = `
    /* Run Table Container */
    .run-table-container {
      width: 100%;
      overflow-x: auto;
    }

    /* Loading State */
    .run-table-loading,
    .run-table-error,
    .run-table-empty {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.75rem;
      padding: 3rem;
      color: var(--text-secondary, #6b7280);
      font-size: 0.875rem;
    }

    .run-table-loading .spin {
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }

    .run-table-error {
      color: var(--error, #dc2626);
    }

    /* Table */
    .run-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.875rem;
    }

    .run-table th,
    .run-table td {
      padding: 0.75rem 1rem;
      text-align: left;
      border-bottom: 1px solid var(--border, #e5e7eb);
    }

    .run-table th {
      font-weight: 600;
      color: var(--text-secondary, #6b7280);
      background: var(--bg-secondary, #f9fafb);
      white-space: nowrap;
    }

    .run-table tbody tr:hover {
      background: var(--bg-hover, #f3f4f6);
    }

    .run-row {
      cursor: pointer;
      transition: background 0.15s ease;
    }

    /* Status Badge */
    .status-badge {
      display: inline-flex;
      align-items: center;
      gap: 0.375rem;
      padding: 0.25rem 0.5rem;
      border-radius: 9999px;
      font-size: 0.75rem;
      font-weight: 500;
      white-space: nowrap;
    }

    .status-badge .material-symbols-outlined {
      font-size: 0.875rem;
    }

    .status-draft {
      background: #f3f4f6;
      color: #6b7280;
    }

    .status-in-progress {
      background: #dbeafe;
      color: #1d4ed8;
    }

    .status-completed {
      background: #d1fae5;
      color: #047857;
    }

    .status-error {
      background: #fee2e2;
      color: #dc2626;
    }

    /* Engine Badge */
    .engine-badge {
      display: inline-block;
      padding: 0.125rem 0.375rem;
      border-radius: 0.25rem;
      font-size: 0.75rem;
      font-weight: 600;
      margin-right: 0.25rem;
    }

    .engine-v1_1 {
      background: #e0e7ff;
      color: #3730a3;
    }

    .engine-v1_2 {
      background: #fce7f3;
      color: #be185d;
    }

    .engine-unknown {
      background: #f3f4f6;
      color: #6b7280;
    }

    .engine-mode {
      color: var(--text-secondary, #6b7280);
      font-size: 0.75rem;
    }

    /* Error Row */
    .run-error-row {
      background: #fef2f2 !important;
    }

    .run-error-message {
      color: #dc2626;
      font-size: 0.75rem;
      padding: 0.5rem 1rem !important;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .run-error-message .material-symbols-outlined {
      font-size: 1rem;
    }

    /* Column specific styles */
    .run-date {
      white-space: nowrap;
      color: var(--text-secondary, #6b7280);
      font-size: 0.8125rem;
    }

    .run-survey {
      font-weight: 500;
      max-width: 200px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .run-agents,
    .run-responses {
      text-align: right;
      font-variant-numeric: tabular-nums;
    }

    .run-confidence {
      text-align: right;
      font-variant-numeric: tabular-nums;
    }

    .run-events {
      text-align: center;
      color: var(--success, #10b981);
    }

    .run-scenario {
      color: var(--text-secondary, #6b7280);
      font-size: 0.8125rem;
      max-width: 150px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
  `;

  document.head.appendChild(styles);
}
