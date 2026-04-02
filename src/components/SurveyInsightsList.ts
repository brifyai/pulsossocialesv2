/**
 * Survey Insights List Component
 *
 * Componente presentacional para mostrar la lista de insights
 * detectados en el análisis de encuesta.
 */

import type { SurveyAnalysis } from '../app/survey/analysis/types';

/**
 * Renderiza la lista de insights del análisis
 */
export function renderSurveyInsightsList(analysis: SurveyAnalysis): HTMLElement {
  const container = document.createElement('div');
  container.className = 'survey-insights-section';

  const header = document.createElement('h2');
  header.innerHTML = '<span class="material-symbols-outlined">insights</span> Insights Detectados';
  container.appendChild(header);

  if (analysis.globalInsights.length === 0) {
    const emptyMsg = document.createElement('p');
    emptyMsg.className = 'text-muted';
    emptyMsg.textContent = 'No se detectaron insights significativos';
    container.appendChild(emptyMsg);
    return container;
  }

  const list = document.createElement('div');
  list.className = 'insights-list';

  // Show top 5 insights
  const topInsights = analysis.globalInsights.slice(0, 5);

  topInsights.forEach((insight) => {
    const item = document.createElement('div');
    item.className = `insight-item insight-${insight.severity}`;

    const icon = getInsightIcon(insight.type);
    const severityLabel = getSeverityLabel(insight.severity);

    item.innerHTML = `
      <div class="insight-icon">
        <span class="material-symbols-outlined">${icon}</span>
      </div>
      <div class="insight-content">
        <div class="insight-title">${escapeHtml(insight.title)}</div>
        <div class="insight-description">${escapeHtml(insight.description)}</div>
        <div class="insight-meta">
          <span class="badge badge-${insight.severity}">${severityLabel}</span>
        </div>
      </div>
    `;

    list.appendChild(item);
  });

  container.appendChild(list);
  return container;
}

/**
 * Obtiene el icono correspondiente al tipo de insight
 * Valores reales del contrato: 'dominance' | 'polarization' | 'segment_gap' | 'low_confidence'
 */
function getInsightIcon(type: string): string {
  switch (type) {
    case 'dominance':
      return 'check_circle'; // Respuesta dominante
    case 'polarization':
      return 'bolt'; // Polarización
    case 'segment_gap':
      return 'groups'; // Diferencia entre segmentos
    case 'low_confidence':
      return 'warning'; // Baja confianza
    default:
      return 'info';
  }
}

/**
 * Formatea la etiqueta de severidad
 * Valores reales del contrato: 'info' | 'warning' | 'important'
 */
function getSeverityLabel(severity: string): string {
  switch (severity) {
    case 'important':
      return 'Importante';
    case 'warning':
      return 'Advertencia';
    case 'info':
      return 'Info';
    default:
      return severity;
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
