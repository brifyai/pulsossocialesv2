/**
 * RunDetailModal component - Modal de detalle de un run
 * Semana 2 - Etapa 2: Dashboard Operativo con detalle de runs
 *
 * Muestra información detallada de un run de encuesta al hacer click
 * en una fila de la tabla de runs.
 */

import type { SurveyRunSummary, RunStatus } from '../types/operations';

/**
 * Props para el componente RunDetailModal
 */
export interface RunDetailModalProps {
  /** Run a mostrar */
  run: SurveyRunSummary;
  /** Callback al cerrar el modal */
  onClose: () => void;
}

/**
 * Crea y muestra el modal de detalle de un run
 */
export function createRunDetailModal(props: RunDetailModalProps): HTMLElement {
  const { run, onClose } = props;

  // Crear overlay del modal
  const overlay = document.createElement('div');
  overlay.className = 'run-detail-modal-overlay';
  overlay.id = 'run-detail-modal';

  // Crear el contenido del modal
  const modal = document.createElement('div');
  modal.className = 'run-detail-modal';

  modal.innerHTML = `
    <!-- Header del modal -->
    <div class="run-detail-header">
      <div class="run-detail-header-left">
        <h2 class="run-detail-title">
          <span class="material-symbols-outlined">analytics</span>
          Detalle del Run
        </h2>
        <span class="run-detail-id">${escapeHtml(run.id)}</span>
      </div>
      <button class="run-detail-close-btn" id="run-detail-close" title="Cerrar">
        <span class="material-symbols-outlined">close</span>
      </button>
    </div>

    <!-- Contenido del modal -->
    <div class="run-detail-content">
      <!-- Sección A: Resumen -->
      <section class="run-detail-section">
        <h3 class="run-detail-section-title">
          <span class="material-symbols-outlined">summarize</span>
          Resumen
        </h3>
        <div class="run-detail-grid">
          <div class="run-detail-item">
            <span class="run-detail-label">Fecha</span>
            <span class="run-detail-value">${formatDate(run.created_at)}</span>
          </div>
          <div class="run-detail-item">
            <span class="run-detail-label">Estado</span>
            <span class="run-detail-value">${createStatusBadge(run.status)}</span>
          </div>
          <div class="run-detail-item">
            <span class="run-detail-label">Agentes</span>
            <span class="run-detail-value">${run.total_agents.toLocaleString()}</span>
          </div>
          <div class="run-detail-item">
            <span class="run-detail-label">Respuestas</span>
            <span class="run-detail-value">${run.total_responses.toLocaleString()}</span>
          </div>
          <div class="run-detail-item">
            <span class="run-detail-label">Confidence</span>
            <span class="run-detail-value">${formatConfidence(run.avg_confidence)}</span>
          </div>
          <div class="run-detail-item">
            <span class="run-detail-label">Encuesta</span>
            <span class="run-detail-value run-detail-survey">${escapeHtml(run.survey_name)}</span>
          </div>
        </div>
      </section>

      <!-- Sección B: Configuración -->
      <section class="run-detail-section">
        <h3 class="run-detail-section-title">
          <span class="material-symbols-outlined">settings</span>
          Configuración
        </h3>
        <div class="run-detail-grid">
          <div class="run-detail-item">
            <span class="run-detail-label">Engine Mode</span>
            <span class="run-detail-value">
              <span class="engine-mode-badge engine-mode-${run.engine_mode}">${run.engine_mode}</span>
            </span>
          </div>
          <div class="run-detail-item">
            <span class="run-detail-label">Engine Version</span>
            <span class="run-detail-value">
              <span class="engine-version-badge engine-${run.engine_version}">${run.engine_version}</span>
            </span>
          </div>
          <div class="run-detail-item">
            <span class="run-detail-label">Persist State</span>
            <span class="run-detail-value">${run.engine_mode === 'async' ? 'Sí' : 'No'}</span>
          </div>
          <div class="run-detail-item">
            <span class="run-detail-label">Tipo</span>
            <span class="run-detail-value">${getRunType(run)}</span>
          </div>
          ${run.scenario_name ? `
            <div class="run-detail-item run-detail-item-full">
              <span class="run-detail-label">Escenario</span>
              <span class="run-detail-value run-detail-scenario">${escapeHtml(run.scenario_name)}</span>
            </div>
          ` : ''}
          <div class="run-detail-item">
            <span class="run-detail-label">Eventos</span>
            <span class="run-detail-value">${run.use_events ? '✓ Activados' : '— No usados'}</span>
          </div>
        </div>
      </section>

      <!-- Sección C: Resultados -->
      <section class="run-detail-section">
        <h3 class="run-detail-section-title">
          <span class="material-symbols-outlined">bar_chart</span>
          Resultados
        </h3>
        <div class="run-detail-results">
          <div class="result-metric">
            <span class="result-metric-value">${run.total_responses.toLocaleString()}</span>
            <span class="result-metric-label">Respuestas totales</span>
          </div>
          <div class="result-metric">
            <span class="result-metric-value">${formatConfidence(run.avg_confidence)}</span>
            <span class="result-metric-label">Confidence promedio</span>
          </div>
          <div class="result-metric">
            <span class="result-metric-value">${calculateCompletionRate(run)}%</span>
            <span class="result-metric-label">Tasa de completitud</span>
          </div>
        </div>
      </section>

      <!-- Sección D: Error (solo si hay error) -->
      ${run.error_message ? `
        <section class="run-detail-section run-detail-section-error">
          <h3 class="run-detail-section-title">
            <span class="material-symbols-outlined">error</span>
            Error
          </h3>
          <div class="run-detail-error-box">
            <p class="run-detail-error-message">${escapeHtml(run.error_message)}</p>
          </div>
        </section>
      ` : ''}
    </div>

    <!-- Footer del modal -->
    <div class="run-detail-footer">
      <button class="btn btn-secondary" id="run-detail-close-btn">
        <span class="material-symbols-outlined">close</span>
        Cerrar
      </button>
    </div>
  `;

  overlay.appendChild(modal);

  // Agregar event listeners
  const closeBtn = modal.querySelector('#run-detail-close');
  const closeBtnFooter = modal.querySelector('#run-detail-close-btn');

  closeBtn?.addEventListener('click', onClose);
  closeBtnFooter?.addEventListener('click', onClose);

  // Cerrar al hacer click fuera del modal
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      onClose();
    }
  });

  // Cerrar con tecla Escape
  const handleEscape = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
      document.removeEventListener('keydown', handleEscape);
    }
  };
  document.addEventListener('keydown', handleEscape);

  return overlay;
}

/**
 * Crea un badge de estado
 */
function createStatusBadge(status: RunStatus): string {
  const statusConfig: Record<RunStatus, { label: string; class: string }> = {
    draft: { label: 'Draft', class: 'status-draft' },
    in_progress: { label: 'En progreso', class: 'status-in-progress' },
    completed: { label: 'Completado', class: 'status-completed' },
    error: { label: 'Error', class: 'status-error' }
  };

  const config = statusConfig[status];
  return `<span class="status-badge ${config.class}">${config.label}</span>`;
}

/**
 * Formatea una fecha ISO a formato legible
 */
function formatDate(isoDate: string): string {
  try {
    const date = new Date(isoDate);
    return date.toLocaleString('es-CL', {
      year: 'numeric',
      month: 'long',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
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
 * Calcula la tasa de completitud
 */
function calculateCompletionRate(run: SurveyRunSummary): string {
  if (run.total_agents === 0) return '0.0';
  const rate = (run.total_responses / run.total_agents) * 100;
  return rate.toFixed(1);
}

/**
 * Determina el tipo de run
 */
function getRunType(run: SurveyRunSummary): string {
  if (run.scenario_name && run.use_events) {
    return 'Escenario + Eventos';
  } else if (run.scenario_name) {
    return 'Escenario';
  } else if (run.use_events) {
    return 'Eventos';
  } else {
    return 'Baseline';
  }
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
 * Agrega los estilos CSS para el modal
 */
export function addRunDetailModalStyles(): void {
  if (document.getElementById('run-detail-modal-styles')) return;

  const styles = document.createElement('style');
  styles.id = 'run-detail-modal-styles';
  styles.textContent = `
    /* Modal Overlay */
    .run-detail-modal-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      padding: 1rem;
      animation: fadeIn 0.2s ease;
    }

    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    /* Modal Container */
    .run-detail-modal {
      background: white;
      border-radius: 12px;
      width: 100%;
      max-width: 700px;
      max-height: 90vh;
      overflow-y: auto;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
      animation: slideUp 0.3s ease;
    }

    @keyframes slideUp {
      from {
        opacity: 0;
        transform: translateY(20px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    /* Modal Header */
    .run-detail-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 1.25rem 1.5rem;
      border-bottom: 1px solid #e5e7eb;
      background: #f9fafb;
      border-radius: 12px 12px 0 0;
    }

    .run-detail-header-left {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }

    .run-detail-title {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 1.25rem;
      font-weight: 600;
      color: #111827;
      margin: 0;
    }

    .run-detail-title .material-symbols-outlined {
      color: #3b82f6;
    }

    .run-detail-id {
      font-size: 0.75rem;
      color: #6b7280;
      font-family: monospace;
    }

    .run-detail-close-btn {
      background: none;
      border: none;
      cursor: pointer;
      padding: 0.5rem;
      border-radius: 6px;
      color: #6b7280;
      transition: all 0.15s ease;
    }

    .run-detail-close-btn:hover {
      background: #e5e7eb;
      color: #374151;
    }

    /* Modal Content */
    .run-detail-content {
      padding: 1.5rem;
    }

    /* Sections */
    .run-detail-section {
      margin-bottom: 1.5rem;
    }

    .run-detail-section:last-child {
      margin-bottom: 0;
    }

    .run-detail-section-title {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 1rem;
      font-weight: 600;
      color: #374151;
      margin: 0 0 1rem 0;
      padding-bottom: 0.5rem;
      border-bottom: 1px solid #e5e7eb;
    }

    .run-detail-section-title .material-symbols-outlined {
      color: #6b7280;
      font-size: 1.25rem;
    }

    /* Error Section */
    .run-detail-section-error .run-detail-section-title {
      color: #dc2626;
    }

    .run-detail-section-error .run-detail-section-title .material-symbols-outlined {
      color: #dc2626;
    }

    .run-detail-error-box {
      background: #fef2f2;
      border: 1px solid #fecaca;
      border-radius: 8px;
      padding: 1rem;
    }

    .run-detail-error-message {
      color: #dc2626;
      font-size: 0.875rem;
      margin: 0;
      font-family: monospace;
      white-space: pre-wrap;
      word-break: break-word;
    }

    /* Grid */
    .run-detail-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 1rem;
    }

    .run-detail-item {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }

    .run-detail-item-full {
      grid-column: 1 / -1;
    }

    .run-detail-label {
      font-size: 0.75rem;
      color: #6b7280;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      font-weight: 500;
    }

    .run-detail-value {
      font-size: 0.9375rem;
      color: #111827;
      font-weight: 500;
    }

    .run-detail-survey {
      color: #3b82f6;
    }

    .run-detail-scenario {
      color: #7c3aed;
      font-weight: 600;
    }

    /* Status Badge */
    .status-badge {
      display: inline-flex;
      align-items: center;
      padding: 0.25rem 0.75rem;
      border-radius: 9999px;
      font-size: 0.75rem;
      font-weight: 600;
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

    /* Engine Badges */
    .engine-mode-badge,
    .engine-version-badge {
      display: inline-block;
      padding: 0.125rem 0.5rem;
      border-radius: 4px;
      font-size: 0.75rem;
      font-weight: 600;
    }

    .engine-mode-sync {
      background: #e0e7ff;
      color: #3730a3;
    }

    .engine-mode-async {
      background: #fce7f3;
      color: #be185d;
    }

    .engine-mode-unknown {
      background: #f3f4f6;
      color: #6b7280;
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

    /* Results Section */
    .run-detail-results {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 1rem;
    }

    .result-metric {
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      padding: 1rem;
      background: #f9fafb;
      border-radius: 8px;
    }

    .result-metric-value {
      font-size: 1.5rem;
      font-weight: 700;
      color: #111827;
    }

    .result-metric-label {
      font-size: 0.75rem;
      color: #6b7280;
      margin-top: 0.25rem;
    }

    /* Modal Footer */
    .run-detail-footer {
      display: flex;
      justify-content: flex-end;
      padding: 1rem 1.5rem;
      border-top: 1px solid #e5e7eb;
      background: #f9fafb;
      border-radius: 0 0 12px 12px;
    }

    .run-detail-footer .btn {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.5rem 1rem;
      border-radius: 6px;
      font-size: 0.875rem;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.15s ease;
    }

    .run-detail-footer .btn-secondary {
      background: white;
      border: 1px solid #d1d5db;
      color: #374151;
    }

    .run-detail-footer .btn-secondary:hover {
      background: #f3f4f6;
      border-color: #9ca3af;
    }

    /* Responsive */
    @media (max-width: 640px) {
      .run-detail-modal-overlay {
        padding: 0.5rem;
      }

      .run-detail-modal {
        max-height: 95vh;
      }

      .run-detail-grid {
        grid-template-columns: 1fr;
      }

      .run-detail-results {
        grid-template-columns: 1fr;
      }

      .run-detail-content {
        padding: 1rem;
      }

      .run-detail-header {
        padding: 1rem;
      }

      .run-detail-footer {
        padding: 1rem;
      }
    }
  `;

  document.head.appendChild(styles);
}

/**
 * Muestra el modal de detalle de un run
 * @returns función para cerrar el modal
 */
export function showRunDetailModal(run: SurveyRunSummary): () => void {
  // Agregar estilos si no existen
  addRunDetailModalStyles();

  // Crear el modal
  const modal = createRunDetailModal({
    run,
    onClose: () => {
      modal.remove();
    }
  });

  // Agregar al DOM
  document.body.appendChild(modal);

  // Retornar función para cerrar
  return () => {
    modal.remove();
  };
}
