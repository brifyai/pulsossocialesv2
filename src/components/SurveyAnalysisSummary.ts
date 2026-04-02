/**
 * Survey Analysis Summary Component
 *
 * Componente presentacional para mostrar los KPIs principales
 * del análisis de encuesta.
 */

import type { SurveyAnalysis } from '../app/survey/analysis/types';

/**
 * Renderiza el resumen de KPIs del análisis
 */
export function renderSurveyAnalysisSummary(analysis: SurveyAnalysis): HTMLElement {
  const { summary, globalMetrics } = analysis;

  const container = document.createElement('div');
  container.className = 'survey-summary-grid';

  const cards = [
    {
      icon: 'help',
      value: String(summary.totalQuestions),
      label: 'Preguntas',
      color: 'primary',
    },
    {
      icon: 'confidence',
      value: `${Math.round(globalMetrics.averageConfidence * 100)}%`,
      label: 'Confianza promedio',
      color: 'success',
    },
    {
      icon: 'check_circle',
      value: formatConsensusLabel(summary.overallConsensusLevel),
      label: 'Nivel de consenso',
      color: getConsensusColor(summary.overallConsensusLevel),
    },
    {
      icon: 'bar_chart',
      value: globalMetrics.averageEntropy.toFixed(2),
      label: 'Entropía promedio',
      color: 'info',
    },
  ];

  cards.forEach((card) => {
    const cardEl = document.createElement('div');
    cardEl.className = `stat-card stat-card-${card.color}`;
    cardEl.innerHTML = `
      <div class="stat-icon">
        <span class="material-symbols-outlined">${card.icon}</span>
      </div>
      <div class="stat-content">
        <div class="stat-value">${card.value}</div>
        <div class="stat-label">${card.label}</div>
      </div>
    `;
    container.appendChild(cardEl);
  });

  return container;
}

/**
 * Formatea el nivel de consenso para mostrar en español
 */
function formatConsensusLabel(level: string): string {
  switch (level.toLowerCase()) {
    case 'high':
      return 'Alto';
    case 'medium':
      return 'Medio';
    case 'low':
      return 'Bajo';
    case 'mixed':
      return 'Mixto';
    default:
      return level;
  }
}

/**
 * Obtiene el color correspondiente al nivel de consenso
 * Valores reales del contrato: 'high' | 'medium' | 'low' | 'mixed'
 */
function getConsensusColor(level: string): string {
  switch (level.toLowerCase()) {
    case 'high':
      return 'success';
    case 'medium':
      return 'warning';
    case 'low':
      return 'danger';
    case 'mixed':
      return 'info';
    default:
      return 'info';
  }
}
