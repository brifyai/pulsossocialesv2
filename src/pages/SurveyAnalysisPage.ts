/**
 * Survey Analysis Page
 *
 * Página de análisis de encuestas - Fase 1 MVP
 * Muestra KPIs, insights y preguntas destacadas
 */

import type { SurveyAnalysis } from '../app/survey/analysis/types';
import { getSurveyAnalysisByRun } from '../app/survey/surveyService';
import { navigateTo, getParams } from '../router';
import { renderSurveyAnalysisSummary } from '../components/SurveyAnalysisSummary';
import { renderSurveyInsightsList } from '../components/SurveyInsightsList';
import { renderSurveyTopQuestions } from '../components/SurveyTopQuestions';
import { renderQuestionAnalysisList } from '../components/QuestionAnalysisList';

// ===========================================
// Types
// ===========================================

type PageState =
  | { status: 'loading' }
  | { status: 'empty' }
  | { status: 'error'; message: string }
  | {
      status: 'success';
      analysis: SurveyAnalysis;
    };

// ===========================================
// State
// ===========================================

let currentState: PageState = { status: 'loading' };
let pageContainer: HTMLElement | null = null;

// ===========================================
// Main Page Function
// ===========================================

export async function createSurveyAnalysisPage(): Promise<HTMLElement> {
  pageContainer = document.createElement('div');
  pageContainer.className = 'page survey-analysis-page';
  pageContainer.id = 'survey-analysis-page';

  // Extract runId from URL using router's getParams
  const params = getParams();
  const runId = params.runId;

  if (!runId) {
    currentState = { status: 'empty' };
    render();
    return pageContainer;
  }

  // Load analysis
  await loadAnalysis(runId);

  return pageContainer;
}

// ===========================================
// Data Loading
// ===========================================

async function loadAnalysis(runId: string): Promise<void> {
  currentState = { status: 'loading' };
  render();

  try {
    const analysis = await getSurveyAnalysisByRun(runId);

    if (!analysis) {
      currentState = {
        status: 'error',
        message: 'No se encontró el análisis para esta ejecución',
      };
    } else {
      currentState = {
        status: 'success',
        analysis,
      };
    }
  } catch (error) {
    currentState = {
      status: 'error',
      message: error instanceof Error ? error.message : 'Error desconocido',
    };
  }

  render();
}

// ===========================================
// Rendering
// ===========================================

function render(): void {
  if (!pageContainer) return;

  // Clear container
  pageContainer.innerHTML = '';

  // Render based on state
  switch (currentState.status) {
    case 'loading':
      renderLoading();
      break;
    case 'empty':
      renderEmpty();
      break;
    case 'error':
      renderError(currentState.message);
      break;
    case 'success':
      renderSuccess(currentState.analysis);
      break;
  }
}

function renderLoading(): void {
  const loadingEl = document.createElement('div');
  loadingEl.className = 'survey-analysis-loading';
  loadingEl.innerHTML = `
    <div class="loading-spinner"></div>
    <p>Analizando encuesta...</p>
  `;
  pageContainer!.appendChild(loadingEl);
}

function renderEmpty(): void {
  const emptyEl = document.createElement('div');
  emptyEl.className = 'survey-analysis-empty';
  emptyEl.innerHTML = `
    <span class="material-symbols-outlined">analytics</span>
    <h2>Sin datos</h2>
    <p>Selecciona una encuesta para ver el análisis</p>
    <button class="btn btn-primary" id="go-to-surveys">
      <span class="material-symbols-outlined">arrow_back</span>
      Ver encuestas
    </button>
  `;

  const btn = emptyEl.querySelector('#go-to-surveys');
  btn?.addEventListener('click', () => navigateTo('surveys'));

  pageContainer!.appendChild(emptyEl);
}

function renderError(message: string): void {
  const errorEl = document.createElement('div');
  errorEl.className = 'survey-analysis-error';
  errorEl.innerHTML = `
    <span class="material-symbols-outlined">error</span>
    <h2>Error</h2>
    <p>${escapeHtml(message)}</p>
    <button class="btn btn-primary" id="retry-btn">
      <span class="material-symbols-outlined">refresh</span>
      Reintentar
    </button>
  `;

  const retryBtn = errorEl.querySelector('#retry-btn');
  retryBtn?.addEventListener('click', () => {
    const params = getParams();
    const runId = params.runId;
    if (runId) loadAnalysis(runId);
  });

  pageContainer!.appendChild(errorEl);
}

function renderSuccess(analysis: SurveyAnalysis): void {
  // Header
  const header = document.createElement('div');
  header.className = 'survey-analysis-header';
  header.innerHTML = `
    <div class="header-left">
      <button class="btn btn-secondary btn-icon" id="back-btn">
        <span class="material-symbols-outlined">arrow_back</span>
      </button>
      <h1>🔍 Análisis de Encuesta</h1>
    </div>
    <div class="header-meta">
      <span class="badge badge-info">${analysis.summary.supportedQuestions} preguntas analizadas</span>
      <span class="text-muted">v${analysis.metadata?.version ?? '1.0.0'}</span>
    </div>
  `;

  const backBtn = header.querySelector('#back-btn');
  backBtn?.addEventListener('click', () => navigateTo('surveys'));

  pageContainer!.appendChild(header);

  // Content container
  const content = document.createElement('div');
  content.className = 'survey-analysis-content';

  // 1. KPI Summary (using extracted component)
  content.appendChild(renderSurveyAnalysisSummary(analysis));

  // 2. Insights List (using extracted component)
  content.appendChild(renderSurveyInsightsList(analysis));

  // 3. Top Questions (using extracted component)
  content.appendChild(renderSurveyTopQuestions(analysis));

  // 4. Question Detail List (detalle por pregunta)
  content.appendChild(renderQuestionAnalysisList(analysis));

  pageContainer!.appendChild(content);
}

// ===========================================
// Helpers
// ===========================================

function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// ===========================================
// Cleanup
// ===========================================

export function cleanupSurveyAnalysisPage(): void {
  pageContainer = null;
  currentState = { status: 'loading' };
}
