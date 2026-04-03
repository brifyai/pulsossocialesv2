/**
 * Survey Top Questions Component - Dashboard Grid
 *
 * Componente presentacional para mostrar las preguntas destacadas
 * del análisis de encuesta en formato Dashboard Grid de 3 columnas.
 */

import type { SurveyAnalysis, QuestionAnalysis } from '../app/survey/analysis/types';
import { getPolarizationLevelLabel } from '../app/survey/analysis/surveyAnalysisService';

// Tipos específicos para cada categoría
interface ConsensusQuestion {
  questionId: string;
  text: string;
  dominantPercentage: number;
  confidence: number;
}

interface PolarizedQuestion {
  questionId: string;
  text: string;
  polarizationLevel: 'low' | 'medium' | 'high';
  entropy: number;
  confidence: number;
}

interface LowConfidenceQuestion {
  questionId: string;
  text: string;
  confidence: number;
  agreement: number;
}

interface TopQuestionsData {
  consensus: ConsensusQuestion[];
  polarized: PolarizedQuestion[];
  lowConfidence: LowConfidenceQuestion[];
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
  const consensusCard = createQuestionCategoryCard<ConsensusQuestion>({
    title: 'Mayor Consenso',
    icon: 'check_circle',
    variant: 'consensus',
    questions: topQuestions.consensus,
    emptyMessage: 'Sin preguntas de consenso',
    getMetric: (q) => `Acuerdo: ${Math.round(q.dominantPercentage)}%`,
  });
  questionsGrid.appendChild(consensusCard);

  // Category 2: Polarized (Low Agreement)
  const polarizedCard = createQuestionCategoryCard<PolarizedQuestion>({
    title: 'Más Polarizadas',
    icon: 'bolt',
    variant: 'polarized',
    questions: topQuestions.polarized,
    emptyMessage: 'Sin preguntas polarizadas',
    getMetric: (q) => `Polarización: ${getPolarizationLevelLabel(q.polarizationLevel)}`,
  });
  questionsGrid.appendChild(polarizedCard);

  // Category 3: Low Confidence - muestra el valor % real, no una etiqueta
  const lowConfidenceCard = createQuestionCategoryCard<LowConfidenceQuestion>({
    title: 'Menor Confianza',
    icon: 'warning',
    variant: 'low-confidence',
    questions: topQuestions.lowConfidence,
    emptyMessage: 'Sin preguntas de baja confianza',
    getMetric: (q) => `Confianza: ${Math.round(q.confidence * 100)}%`,
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
      dominantPercentage: q.metrics!.dominantPercentage,
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
      polarizationLevel: q.metrics!.polarizationLevel,
      entropy: q.metrics!.entropy,
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
function createQuestionCategoryCard<T extends { questionId: string; text: string; confidence: number }>({
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
  questions: T[];
  emptyMessage: string;
  getMetric: (q: T) => string;
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
function createQuestionItem<T extends { questionId: string; text: string; confidence: number }>(
  question: T,
  rank: number,
  getMetric: (q: T) => string
): HTMLElement {
  const item = document.createElement('div');
  item.className = 'question-item';

  // Truncar texto para mostrar, pero mantener completo en title
  const displayText = question.text.length > 90
    ? question.text.substring(0, 90) + '...'
    : question.text;
  const fullText = question.text;

  item.innerHTML = `
    <div class="question-rank">${rank}</div>
    <div class="question-content">
      <div class="question-text" title="${escapeHtml(fullText)}">${escapeHtml(displayText)}</div>
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
