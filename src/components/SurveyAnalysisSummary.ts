/**
 * Survey Analysis Summary Component - Dashboard KPI Cards
 *
 * Componente presentacional para mostrar los KPIs principales
 * del análisis de encuesta en formato Dashboard Cards.
 */

import type { SurveyAnalysis } from '../app/survey/analysis/types';

/**
 * Renderiza el resumen de KPIs del análisis en formato Dashboard Cards
 */
export function renderSurveyAnalysisSummary(analysis: SurveyAnalysis): HTMLElement {
  const container = document.createElement('section');
  container.className = 'dashboard-section';

  // Header de la sección
  const header = document.createElement('div');
  header.className = 'dashboard-section-header';
  header.innerHTML = `
    <h2 class="dashboard-section-title">
      <span class="material-symbols-outlined">assessment</span>
      Métricas Principales
    </h2>
  `;
  container.appendChild(header);

  // Body con grid de KPIs
  const body = document.createElement('div');
  body.className = 'dashboard-section-body';

  const kpiGrid = document.createElement('div');
  kpiGrid.className = 'kpi-grid';

  // Calcular tasa de respuesta desde globalMetrics si está disponible
  const responseRate = analysis.globalMetrics?.nonResponseRate
    ? 1 - analysis.globalMetrics.nonResponseRate
    : 0.95;

  // KPI Cards
  const kpis = [
    createKPICard({
      label: 'Preguntas Analizadas',
      value: analysis.summary.supportedQuestions.toString(),
      subtitle: `${analysis.summary.totalQuestions} total`,
      icon: 'quiz',
      variant: 'primary',
    }),
    createKPICard({
      label: 'Tasa de Respuesta',
      value: `${Math.round(responseRate * 100)}%`,
      subtitle: responseRate > 0.8 ? 'Excelente' : 'Buena',
      icon: 'trending_up',
      variant: responseRate > 0.8 ? 'success' : 'warning',
    }),
    createKPICard({
      label: 'Confianza Promedio',
      value: `${Math.round(analysis.summary.averageConfidence * 100)}%`,
      subtitle: getConfidenceLabel(analysis.summary.averageConfidence),
      icon: 'verified',
      variant: getConfidenceVariant(analysis.summary.averageConfidence),
    }),
    createKPICard({
      label: 'Insights Detectados',
      value: analysis.globalInsights.length.toString(),
      subtitle: analysis.globalInsights.length > 0 ? 'Revisar' : 'Sin alertas',
      icon: 'insights',
      variant: analysis.globalInsights.length > 0 ? 'warning' : 'success',
    }),
  ];

  kpis.forEach((card) => kpiGrid.appendChild(card));
  body.appendChild(kpiGrid);
  container.appendChild(body);

  return container;
}

/**
 * Crea una tarjeta KPI individual
 */
function createKPICard({
  label,
  value,
  subtitle,
  icon,
  variant,
}: {
  label: string;
  value: string;
  subtitle: string;
  icon: string;
  variant: 'primary' | 'success' | 'warning' | 'danger';
}): HTMLElement {
  const card = document.createElement('div');
  card.className = `kpi-card kpi-card--${variant}`;

  card.innerHTML = `
    <div class="kpi-card-header">
      <span class="kpi-card-label">${escapeHtml(label)}</span>
      <div class="kpi-card-icon">
        <span class="material-symbols-outlined">${icon}</span>
      </div>
    </div>
    <div class="kpi-card-value">${escapeHtml(value)}</div>
    <div class="kpi-card-subtitle">${escapeHtml(subtitle)}</div>
  `;

  return card;
}

/**
 * Obtiene la etiqueta de confianza basada en el valor
 */
function getConfidenceLabel(confidence: number): string {
  if (confidence >= 0.8) return 'Alta confianza';
  if (confidence >= 0.6) return 'Confianza media';
  return 'Revisar datos';
}

/**
 * Obtiene la variante de confianza basada en el valor
 */
function getConfidenceVariant(confidence: number): 'primary' | 'success' | 'warning' | 'danger' {
  if (confidence >= 0.8) return 'success';
  if (confidence >= 0.6) return 'primary';
  return 'warning';
}

/**
 * Escapa HTML para prevenir XSS
 */
function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
