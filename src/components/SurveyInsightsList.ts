/**
 * Survey Insights List Component - Dashboard Cards
 *
 * Componente presentacional para mostrar la lista de insights
 * detectados en el análisis de encuesta en formato Dashboard Cards.
 */

import type { SurveyAnalysis } from '../app/survey/analysis/types';

/**
 * Renderiza la lista de insights del análisis en formato Dashboard Cards
 */
export function renderSurveyInsightsList(analysis: SurveyAnalysis): HTMLElement {
  const container = document.createElement('section');
  container.className = 'dashboard-section';

  // Header de la sección
  const header = document.createElement('div');
  header.className = 'dashboard-section-header';
  header.innerHTML = `
    <h2 class="dashboard-section-title">
      <span class="material-symbols-outlined">insights</span>
      Insights Detectados
    </h2>
    <span class="dashboard-badge dashboard-badge--info">
      ${analysis.globalInsights.length} total
    </span>
  `;
  container.appendChild(header);

  // Body con lista de insights
  const body = document.createElement('div');
  body.className = 'dashboard-section-body';

  if (analysis.globalInsights.length === 0) {
    const emptyState = document.createElement('div');
    emptyState.className = 'question-empty-state';
    emptyState.innerHTML = `
      <span class="material-symbols-outlined">check_circle</span>
      <p>No se detectaron insights significativos</p>
    `;
    body.appendChild(emptyState);
    container.appendChild(body);
    return container;
  }

  const insightsContainer = document.createElement('div');
  insightsContainer.className = 'insights-container';

  // Show top 5 insights
  const topInsights = analysis.globalInsights.slice(0, 5);

  topInsights.forEach((insight) => {
    const card = createInsightCard(insight);
    insightsContainer.appendChild(card);
  });

  body.appendChild(insightsContainer);
  container.appendChild(body);

  return container;
}

/**
 * Crea una tarjeta de insight individual
 */
function createInsightCard(insight: {
  type: string;
  severity: 'info' | 'warning' | 'important';
  title: string;
  description: string;
}): HTMLElement {
  const card = document.createElement('div');
  card.className = `insight-card insight-card--${insight.severity}`;

  const icon = getInsightIcon(insight.type);
  const severityLabel = getSeverityLabel(insight.severity);
  const badgeClass = getBadgeClass(insight.severity);

  card.innerHTML = `
    <div class="insight-card-icon">
      <span class="material-symbols-outlined">${icon}</span>
    </div>
    <div class="insight-card-content">
      <div class="insight-card-title">${escapeHtml(insight.title)}</div>
      <div class="insight-card-description">${escapeHtml(insight.description)}</div>
      <div class="insight-card-meta">
        <span class="dashboard-badge ${badgeClass}">${severityLabel}</span>
      </div>
    </div>
  `;

  return card;
}

/**
 * Obtiene el icono correspondiente al tipo de insight
 * Valores reales del contrato: 'dominance' | 'polarization' | 'segment_gap' | 'low_confidence'
 */
function getInsightIcon(type: string): string {
  switch (type) {
    case 'dominance':
      return 'check_circle';
    case 'polarization':
      return 'bolt';
    case 'segment_gap':
      return 'groups';
    case 'low_confidence':
      return 'warning';
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
 * Obtiene la clase del badge según la severidad
 */
function getBadgeClass(severity: string): string {
  switch (severity) {
    case 'important':
      return 'dashboard-badge--danger';
    case 'warning':
      return 'dashboard-badge--warning';
    case 'info':
      return 'dashboard-badge--info';
    default:
      return 'dashboard-badge--info';
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
