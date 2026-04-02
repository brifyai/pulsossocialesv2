/**
 * Survey Top Questions Component - Dashboard Grid
 *
 * Componente presentacional para mostrar las preguntas destacadas
 * del análisis de encuesta en formato Dashboard Grid de 3 columnas.
 */

import type { SurveyAnalysis, QuestionAnalysis } from '../app/survey/analysis/types';

interface TopQuestionsData {
  consensus: Array<{
    questionId: string;
    text: string;
    agreement: number;
    confidence: number;
  }>;
  polarized: Array<{
    questionId: string;
    text: string;
    agreement: number;
    confidence: number;
  }>;
  lowConfidence: Array<{
    questionId: string;
    text: string;
    agreement: number;
    confidence: number;
  }>;
}

/**
 * Renderiza las preguntas destacadas del análisis en formato Dashboard Grid
 */
export function renderSurveyTopQuestions(analysis: SurveyAnalysis): HTMLElement {
  const container = document.createElement('section');
  container.className = 'dashboard-section';

  // Header de la sección
  const header = document.createElement('div');
  header.className = 'dashboard-section-header';
  header.innerHTML = `
    <h2 class="dashboard-section-title">
      <span class="material-symbols-outlined">star</span>
      Preguntas Destacadas
    </h2>
  `;
  container.appendChild(header);

  // Body con grid de preguntas
  const body = document.createElement('div');
  body.className = 'dashboard-section-body';

  const questionsGrid = document.createElement('div');
  questionsGrid.className = 'questions-grid';

  // Calcular preguntas destacadas desde questionAnalyses
  const topQuestions = calculateTopQuestions(analysis.questionAnalyses);

  // Category 1: Consensus (High Agreement)
  const consensusCard = createQuestionCategoryCard({
    title: 'Consenso',
    icon: 'check_circle',
    variant: 'consensus',
    questions: topQuestions.consensus,
    emptyMessage: 'Sin preguntas de consenso',
    getMetric: (q) => `${Math.round(q.agreement * 100)}% acuerdo`,
  });
  questionsGrid.appendChild(consensusCard);

  // Category 2: Polarized (Low Agreement)
  const polarizedCard = createQuestionCategoryCard({
    title: 'Polarizadas',
    icon: 'bolt',
    variant: 'polarized',
    questions: topQuestions.polarized,
    emptyMessage: 'Sin preguntas polarizadas',
    getMetric: (q) => `${Math.round((1 - q.agreement) * 100)}% divergencia`,
  });
  questionsGrid.appendChild(polarizedCard);

  // Category 3: Low Confidence
  const lowConfidenceCard = createQuestionCategoryCard({
    title: 'Baja Confianza',
    icon: 'warning',
    variant: 'low-confidence',
    questions: topQuestions.lowConfidence,
    emptyMessage: 'Sin preguntas de baja confianza',
    getMetric: (q) => `${Math.round(q.confidence * 100)}% confianza`,
  });
  questionsGrid.appendChild(lowConfidenceCard);

  body.appendChild(questionsGrid);
  container.appendChild(body);

  return container;
}

/**
 * Calcula las preguntas destacadas desde el análisis de preguntas
 */
function calculateTopQuestions(questionAnalyses: QuestionAnalysis[]): TopQuestionsData {
  const supportedQuestions = questionAnalyses.filter((q) => q.supported && q.metrics);

  // Consensus: high dominance ratio (> 2.0) and high confidence
  const consensus = supportedQuestions
    .filter((q) => q.metrics!.dominanceRatio > 2.0 && q.metrics!.averageConfidence >= 0.7)
    .sort((a, b) => b.metrics!.dominanceRatio - a.metrics!.dominanceRatio)
    .slice(0, 3)
    .map((q) => ({
      questionId: q.questionId,
      text: q.questionText,
      agreement: q.metrics!.dominantPercentage / 100,
      confidence: q.metrics!.averageConfidence,
    }));

  // Polarized: high entropy (> 0.7) indicating divided opinions
  const polarized = supportedQuestions
    .filter((q) => q.metrics!.entropy > 0.7)
    .sort((a, b) => b.metrics!.entropy - a.metrics!.entropy)
    .slice(0, 3)
    .map((q) => ({
      questionId: q.questionId,
      text: q.questionText,
      agreement: 1 - q.metrics!.entropy, // Lower agreement = higher polarization
      confidence: q.metrics!.averageConfidence,
    }));

  // Low Confidence: confidence below threshold
  const lowConfidence = supportedQuestions
    .filter((q) => q.metrics!.averageConfidence < 0.6)
    .sort((a, b) => a.metrics!.averageConfidence - b.metrics!.averageConfidence)
    .slice(0, 3)
    .map((q) => ({
      questionId: q.questionId,
      text: q.questionText,
      agreement: q.metrics!.dominantPercentage / 100,
      confidence: q.metrics!.averageConfidence,
    }));

  return { consensus, polarized, lowConfidence };
}

/**
 * Crea una tarjeta de categoría de preguntas
 */
function createQuestionCategoryCard({
  title,
  icon,
  variant,
  questions,
  emptyMessage,
  getMetric,
}: {
  title: string;
  icon: string;
  variant: 'consensus' | 'polarized' | 'low-confidence';
  questions: Array<{
    questionId: string;
    text: string;
    agreement: number;
    confidence: number;
  }>;
  emptyMessage: string;
  getMetric: (q: { agreement: number; confidence: number }) => string;
}): HTMLElement {
  const card = document.createElement('div');
  card.className = `question-category-card question-category-card--${variant}`;

  // Header
  const header = document.createElement('div');
  header.className = 'question-category-header';
  header.innerHTML = `
    <span class="material-symbols-outlined">${icon}</span>
    <h3 class="question-category-title">${escapeHtml(title)}</h3>
    <span class="question-category-count">${questions.length}</span>
  `;
  card.appendChild(header);

  // Body
  const body = document.createElement('div');
  body.className = 'question-category-body';

  if (questions.length === 0) {
    const emptyState = document.createElement('div');
    emptyState.className = 'question-empty-state';
    emptyState.innerHTML = `
      <span class="material-symbols-outlined">inbox</span>
      <p>${escapeHtml(emptyMessage)}</p>
    `;
    body.appendChild(emptyState);
  } else {
    const list = document.createElement('div');
    list.className = 'question-list';

    questions.forEach((question, index) => {
      const item = createQuestionItem(question, index + 1, getMetric);
      list.appendChild(item);
    });

    body.appendChild(list);
  }

  card.appendChild(body);
  return card;
}

/**
 * Crea un item de pregunta individual
 */
function createQuestionItem(
  question: {
    questionId: string;
    text: string;
    agreement: number;
    confidence: number;
  },
  rank: number,
  getMetric: (q: { agreement: number; confidence: number }) => string
): HTMLElement {
  const item = document.createElement('div');
  item.className = 'question-item';

  item.innerHTML = `
    <div class="question-rank">${rank}</div>
    <div class="question-content">
      <div class="question-text">${escapeHtml(question.text)}</div>
      <div class="question-meta">
        <span class="question-metric">
          <strong>${getMetric(question)}</strong>
        </span>
      </div>
    </div>
  `;

  return item;
}

/**
 * Escapa HTML para prevenir XSS
 */
function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
