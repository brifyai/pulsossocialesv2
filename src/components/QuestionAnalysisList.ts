/**
 * Question Analysis List Component - Detalle por Pregunta
 *
 * Componente presentacional para mostrar el análisis detallado
 * de cada pregunta de la encuesta en tarjetas colapsables.
 */

import type { SurveyAnalysis, QuestionAnalysis } from '../app/survey/analysis/types';
import { getPolarizationLevelLabel } from '../app/survey/analysis/surveyAnalysisService';

/**
 * Renderiza la lista de análisis detallado por pregunta
 */
export function renderQuestionAnalysisList(analysis: SurveyAnalysis): HTMLElement {
  const container = document.createElement('section');
  container.className = 'dashboard-section';

  // Validación defensiva
  if (!analysis) {
    console.error('[QuestionAnalysisList] No analysis provided');
    container.innerHTML = '<div class="error-state">Error: No hay datos de análisis</div>';
    return container;
  }

  if (!analysis.questionAnalyses || !Array.isArray(analysis.questionAnalyses)) {
    console.error('[QuestionAnalysisList] Invalid questionAnalyses:', analysis.questionAnalyses);
    container.innerHTML = '<div class="error-state">Error: Datos de preguntas inválidos</div>';
    return container;
  }

  // Header de la sección
  const header = document.createElement('div');
  header.className = 'dashboard-section-header';
  header.innerHTML = `
    <h2 class="dashboard-section-title">
      <span class="material-symbols-outlined">list</span>
      Detalle por Pregunta
    </h2>
    <span class="dashboard-badge dashboard-badge--info">
      ${analysis.questionAnalyses.length} preguntas
    </span>
  `;
  container.appendChild(header);

  // Body con lista de preguntas
  const body = document.createElement('div');
  body.className = 'dashboard-section-body';

  if (analysis.questionAnalyses.length === 0) {
    const emptyState = document.createElement('div');
    emptyState.className = 'question-empty-state';
    emptyState.innerHTML = `
      <span class="material-symbols-outlined">inbox</span>
      <p>No hay preguntas para analizar</p>
    `;
    body.appendChild(emptyState);
    container.appendChild(body);
    return container;
  }

  const questionsList = document.createElement('div');
  questionsList.className = 'questions-detail-list';

  // Renderizar cada pregunta
  analysis.questionAnalyses.forEach((question, index) => {
    const questionCard = createQuestionDetailCard(question, index + 1);
    questionsList.appendChild(questionCard);
  });

  body.appendChild(questionsList);
  container.appendChild(body);

  return container;
}

/**
 * Crea una tarjeta colapsable con el detalle de una pregunta
 */
function createQuestionDetailCard(question: QuestionAnalysis, rank: number): HTMLElement {
  const card = document.createElement('div');
  card.className = 'question-detail-card';

  // Validación defensiva de la pregunta
  if (!question) {
    console.error('[QuestionAnalysisList] Question is null/undefined');
    card.innerHTML = '<div class="question-detail-unsupported">Error: Datos de pregunta inválidos</div>';
    return card;
  }

  // Determinar estado de la pregunta con valores por defecto seguros
  const isSupported = question.supported ?? false;
  const hasMetrics = question.metrics != null;

  // Header colapsable
  const header = document.createElement('div');
  header.className = 'question-detail-header';
  header.innerHTML = `
    <div class="question-detail-rank">${rank}</div>
    <div class="question-detail-title">
      <div class="question-detail-text" title="${escapeHtml(question.questionText)}">
        ${escapeHtml(truncateText(question.questionText, 80))}
      </div>
      <div class="question-detail-meta">
        <span class="question-detail-type">${getQuestionTypeLabel(question.questionType)}</span>
        ${isSupported ? `<span class="question-detail-badge question-detail-badge--${getStatusVariant(question)}">${getStatusLabel(question)}</span>` : ''}
      </div>
    </div>
    <button class="question-detail-toggle" aria-label="Expandir/Colapsar">
      <span class="material-symbols-outlined">expand_more</span>
    </button>
  `;

  // Body expandible
  const body = document.createElement('div');
  body.className = 'question-detail-body';
  body.style.display = 'none'; // Colapsado por defecto

  if (!isSupported) {
    body.innerHTML = `
      <div class="question-detail-unsupported">
        <span class="material-symbols-outlined">block</span>
        <p>${escapeHtml(question.unsupportedReason || 'Tipo de pregunta no soportado')}</p>
      </div>
    `;
  } else if (!hasMetrics) {
    body.innerHTML = `
      <div class="question-detail-unsupported">
        <span class="material-symbols-outlined">analytics</span>
        <p>No hay métricas disponibles para esta pregunta</p>
      </div>
    `;
  } else {
    // Métricas principales
    const metrics = question.metrics!;
    const distribution = question.distribution || {};

    body.innerHTML = `
      <div class="question-detail-metrics">
        <div class="question-detail-metric">
          <span class="question-detail-metric-label">Respuesta Dominante</span>
          <span class="question-detail-metric-value">${escapeHtml(String(metrics.dominantResponse ?? 'N/A'))}</span>
          <span class="question-detail-metric-sub">${Math.round(metrics.dominantPercentage)}% de acuerdo</span>
        </div>
        <div class="question-detail-metric">
          <span class="question-detail-metric-label">Nivel de Consenso</span>
          <span class="question-detail-metric-value">${getConsensusLevelFromRatio(metrics.dominanceRatio)}</span>
          <span class="question-detail-metric-sub">Ratio: ${metrics.dominanceRatio.toFixed(2)}</span>
        </div>
        <div class="question-detail-metric">
          <span class="question-detail-metric-label">Polarización</span>
          <span class="question-detail-metric-value">${getPolarizationLevelLabel(metrics.polarizationLevel)}</span>
          <span class="question-detail-metric-sub">Entropía: ${(metrics.entropy * 100).toFixed(1)}%</span>
        </div>
        <div class="question-detail-metric">
          <span class="question-detail-metric-label">Confianza</span>
          <span class="question-detail-metric-value">${Math.round(metrics.averageConfidence * 100)}%</span>
          <span class="question-detail-metric-sub">Promedio de confianza</span>
        </div>
      </div>

      ${question.likertStats ? `
        <div class="question-detail-likert">
          <h4 class="question-detail-subtitle">
            <span class="material-symbols-outlined">bar_chart</span>
            Estadísticas Likert
          </h4>
          <div class="question-detail-likert-grid">
            <div class="question-detail-likert-item">
              <span class="question-detail-likert-label">Promedio</span>
              <span class="question-detail-likert-value">${question.likertStats.average.toFixed(2)}</span>
            </div>
            <div class="question-detail-likert-item">
              <span class="question-detail-likert-label">Mediana</span>
              <span class="question-detail-likert-value">${question.likertStats.median.toFixed(1)}</span>
            </div>
            <div class="question-detail-likert-item">
              <span class="question-detail-likert-label">Mínimo</span>
              <span class="question-detail-likert-value">${question.likertStats.min}</span>
            </div>
            <div class="question-detail-likert-item">
              <span class="question-detail-likert-label">Máximo</span>
              <span class="question-detail-likert-value">${question.likertStats.max}</span>
            </div>
          </div>
        </div>
      ` : ''}

      <div class="question-detail-distribution">
        <h4 class="question-detail-subtitle">
          <span class="material-symbols-outlined">pie_chart</span>
          Distribución de Respuestas
        </h4>
        <div class="question-detail-distribution-list">
          ${Object.entries(distribution)
            .sort(([, a], [, b]) => (b?.percentage ?? 0) - (a?.percentage ?? 0))
            .map(([key, data]) => `
              <div class="question-detail-distribution-item">
                <div class="question-detail-distribution-bar-container">
                  <div class="question-detail-distribution-bar" style="width: ${data?.percentage ?? 0}%"></div>
                  <span class="question-detail-distribution-label">${escapeHtml(data?.label || String(key))}</span>
                </div>
                <span class="question-detail-distribution-value">${Math.round(data?.percentage ?? 0)}%</span>
              </div>
            `).join('')}
        </div>
      </div>

      ${question.insights.length > 0 ? `
        <div class="question-detail-insights">
          <h4 class="question-detail-subtitle">
            <span class="material-symbols-outlined">lightbulb</span>
            Insights
          </h4>
          <div class="question-detail-insights-list">
            ${question.insights.map(insight => `
              <div class="question-detail-insight-item question-detail-insight-item--${insight.severity}">
                <span class="material-symbols-outlined">${getInsightIcon(insight.type)}</span>
                <div class="question-detail-insight-content">
                  <div class="question-detail-insight-title">${escapeHtml(insight.title)}</div>
                  <div class="question-detail-insight-desc">${escapeHtml(insight.description)}</div>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      ` : ''}
    `;
  }

  // Toggle functionality
  const toggleBtn = header.querySelector('.question-detail-toggle');
  toggleBtn?.addEventListener('click', () => {
    const isExpanded = body.style.display !== 'none';
    body.style.display = isExpanded ? 'none' : 'block';
    const icon = toggleBtn.querySelector('.material-symbols-outlined');
    if (icon) {
      icon.textContent = isExpanded ? 'expand_more' : 'expand_less';
    }
    card.classList.toggle('question-detail-card--expanded', !isExpanded);
  });

  card.appendChild(header);
  card.appendChild(body);

  return card;
}

/**
 * Obtiene la etiqueta legible del tipo de pregunta
 */
function getQuestionTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    'single_choice': 'Opción única',
    'likert_scale': 'Escala Likert',
    'multiple_choice': 'Opción múltiple',
    'text': 'Texto libre',
    'rating': 'Calificación',
  };
  return labels[type] || type;
}

/**
 * Obtiene la variante de estado para la pregunta
 */
function getStatusVariant(question: QuestionAnalysis): string {
  if (!question.metrics) return 'neutral';
  const metrics = question.metrics;

  if (metrics.averageConfidence < 0.6) return 'warning';
  if (metrics.polarizationLevel === 'high') return 'danger';
  if (metrics.dominanceRatio > 2) return 'success';
  return 'neutral';
}

/**
 * Obtiene la etiqueta de estado para la pregunta
 */
function getStatusLabel(question: QuestionAnalysis): string {
  if (!question.metrics) return 'Sin datos';
  const metrics = question.metrics;

  if (metrics.averageConfidence < 0.6) return 'Baja confianza';
  if (metrics.polarizationLevel === 'high') return 'Alta polarización';
  if (metrics.dominanceRatio > 2) return 'Alto consenso';
  return 'Normal';
}

/**
 * Obtiene el icono para el tipo de insight
 */
function getInsightIcon(type: string): string {
  const icons: Record<string, string> = {
    'dominance': 'check_circle',
    'polarization': 'bolt',
    'segment_gap': 'groups',
    'low_confidence': 'warning',
    'scenario_impact': 'trending_up',
  };
  return icons[type] || 'info';
}

/**
 * Trunca texto a una longitud máxima
 */
function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
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
 * Obtiene la etiqueta legible del nivel de consenso basado en el ratio de dominancia
 */
function getConsensusLevelFromRatio(ratio: number): string {
  if (ratio >= 3) return 'Muy alto';
  if (ratio >= 2) return 'Alto';
  if (ratio >= 1.5) return 'Medio';
  return 'Bajo';
}
