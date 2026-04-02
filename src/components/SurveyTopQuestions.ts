/**
 * Survey Top Questions Component
 *
 * Componente presentacional para mostrar las preguntas destacadas
 * del análisis de encuesta.
 */

import type { SurveyAnalysis, QuestionAnalysis } from '../app/survey/analysis/types';

/**
 * Renderiza las preguntas destacadas del análisis
 */
export function renderSurveyTopQuestions(analysis: SurveyAnalysis): HTMLElement {
  const container = document.createElement('div');
  container.className = 'survey-questions-section';

  const header = document.createElement('h2');
  header.innerHTML = '<span class="material-symbols-outlined">star</span> Preguntas Destacadas';
  container.appendChild(header);

  const grid = document.createElement('div');
  grid.className = 'top-questions-grid';

  // Most polarized questions
  const polarized = getMostPolarized(analysis.questionAnalyses, 3);
  if (polarized.length > 0) {
    grid.appendChild(renderQuestionGroup(
      'Más Polarizadas',
      'bolt',
      'warning',
      polarized,
      (q) => `Polarización: ${capitalizeFirst(q.metrics?.polarizationLevel ?? 'N/A')}`
    ));
  }

  // Most consensus questions
  const consensus = getMostConsensus(analysis.questionAnalyses, 3);
  if (consensus.length > 0) {
    grid.appendChild(renderQuestionGroup(
      'Mayor Consenso',
      'check_circle',
      'success',
      consensus,
      (q) => `Concentración: ${Math.round((q.metrics?.concentration ?? 0) * 100)}%`
    ));
  }

  // Lowest confidence questions
  const lowConfidence = getLowestConfidence(analysis.questionAnalyses, 3);
  if (lowConfidence.length > 0) {
    grid.appendChild(renderQuestionGroup(
      'Menor Confianza',
      'warning',
      'danger',
      lowConfidence,
      (q) => `Confianza: ${Math.round((q.metrics?.averageConfidence ?? 0) * 100)}%`
    ));
  }

  container.appendChild(grid);
  return container;
}

/**
 * Renderiza un grupo de preguntas
 */
function renderQuestionGroup(
  title: string,
  icon: string,
  colorClass: string,
  questions: QuestionAnalysis[],
  getMetric: (q: QuestionAnalysis) => string
): HTMLElement {
  const group = document.createElement('div');
  group.className = 'question-group';

  const header = document.createElement('div');
  header.className = `question-group-header ${colorClass}`;
  header.innerHTML = `
    <span class="material-symbols-outlined">${icon}</span>
    <span>${title}</span>
  `;
  group.appendChild(header);

  const list = document.createElement('div');
  list.className = 'question-group-list';

  questions.forEach((q) => {
    const item = document.createElement('div');
    item.className = 'question-item';
    item.innerHTML = `
      <div class="question-text">${escapeHtml(q.questionText)}</div>
      <div class="question-metric">${getMetric(q)}</div>
    `;
    list.appendChild(item);
  });

  group.appendChild(list);
  return group;
}

/**
 * Obtiene las preguntas más polarizadas
 * Usa el valor numérico de polarization para ordenamiento preciso
 */
function getMostPolarized(questions: QuestionAnalysis[], limit: number): QuestionAnalysis[] {
  return [...questions]
    .sort((a, b) => (b.metrics?.polarization ?? 0) - (a.metrics?.polarization ?? 0))
    .slice(0, limit);
}

/**
 * Obtiene las preguntas con mayor consenso
 */
function getMostConsensus(questions: QuestionAnalysis[], limit: number): QuestionAnalysis[] {
  return [...questions]
    .sort((a, b) => (b.metrics?.concentration ?? 0) - (a.metrics?.concentration ?? 0))
    .slice(0, limit);
}

/**
 * Obtiene las preguntas con menor confianza
 */
function getLowestConfidence(questions: QuestionAnalysis[], limit: number): QuestionAnalysis[] {
  return [...questions]
    .sort((a, b) => (a.metrics?.averageConfidence ?? 1) - (b.metrics?.averageConfidence ?? 1))
    .slice(0, limit);
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
 * Capitaliza la primera letra de un texto
 */
function capitalizeFirst(text: string): string {
  if (!text) return '';
  return text.charAt(0).toUpperCase() + text.slice(1);
}
