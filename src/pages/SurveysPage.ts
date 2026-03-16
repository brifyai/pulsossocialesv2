/**
 * Surveys Page - Encuestas Sintéticas v1
 * 
 * Vista completa para crear, ejecutar y ver resultados de encuestas.
 */

import type { SurveyDefinition, SurveyResult, QuestionResult, SurveyViewMode } from '../types/survey';
import { 
  createSurvey, 
  getAllSurveys, 
  deleteSurvey, 
  runSurvey, 
  getSurveyResults,
  createSampleSurveys 
} from '../app/survey/surveyService';
import { getUniqueRegions, getUniqueCommunes } from '../data/syntheticAgents';

// Estado local
let currentView: SurveyViewMode = 'list';
let currentSurvey: SurveyDefinition | null = null;
let currentResults: SurveyResult | null = null;
let regions: Array<{ code: string; name: string }> = [];
let communes: Array<{ code: string; name: string }> = [];

// ===========================================
// Main Page Component
// ===========================================

export async function createSurveysPage(): Promise<HTMLElement> {
  const page = document.createElement('div');
  page.className = 'page surveys-page';
  page.id = 'surveys-page';
  
  // Cargar datos iniciales
  regions = await getUniqueRegions();
  
  // Crear encuestas de ejemplo si no hay ninguna
  createSampleSurveys();
  
  // Renderizar según vista actual
  renderContent(page);
  
  return page;
}

/**
 * Renderiza el contenido según la vista actual
 */
function renderContent(container: HTMLElement): void {
  container.innerHTML = '';
  
  // Header
  const header = document.createElement('div');
  header.className = 'surveys-header';
  header.innerHTML = `
    <h1 class="page-title">📊 Encuestas Sintéticas</h1>
    <p class="page-subtitle">Diseña y ejecuta encuestas sobre agentes sintéticos</p>
  `;
  container.appendChild(header);
  
  // Navigation tabs
  const tabs = document.createElement('div');
  tabs.className = 'surveys-tabs';
  tabs.innerHTML = `
    <button class="tab-btn ${currentView === 'list' ? 'active' : ''}" data-view="list">Mis Encuestas</button>
    <button class="tab-btn ${currentView === 'create' ? 'active' : ''}" data-view="create">Crear Nueva</button>
    ${currentResults ? `<button class="tab-btn ${currentView === 'results' ? 'active' : ''}" data-view="results">Resultados</button>` : ''}
  `;
  container.appendChild(tabs);
  
  // Content area
  const content = document.createElement('div');
  content.className = 'surveys-content';
  content.id = 'surveys-content';
  container.appendChild(content);
  
  // Render content based on view
  switch (currentView) {
    case 'list':
      renderSurveyList(content);
      break;
    case 'create':
      renderCreateForm(content);
      break;
    case 'results':
      renderResults(content);
      break;
  }
  
  // Attach event listeners
  attachTabListeners(tabs);
}

/**
 * Renderiza la lista de encuestas
 */
function renderSurveyList(container: HTMLElement): void {
  const surveys = getAllSurveys();
  
  if (surveys.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">📋</div>
        <h3>No hay encuestas</h3>
        <p>Crea tu primera encuesta para comenzar</p>
        <button class="btn btn-primary" id="btn-create-first">Crear Encuesta</button>
      </div>
    `;
    document.getElementById('btn-create-first')?.addEventListener('click', () => {
      currentView = 'create';
      refreshPage();
    });
    return;
  }
  
  const list = document.createElement('div');
  list.className = 'survey-list';
  
  surveys.forEach(survey => {
    const card = document.createElement('div');
    card.className = 'survey-card';
    card.innerHTML = `
      <div class="survey-card-header">
        <h3 class="survey-name">${escapeHtml(survey.name)}</h3>
        <span class="survey-date">${formatDate(survey.createdAt)}</span>
      </div>
      <p class="survey-description">${escapeHtml(survey.description || 'Sin descripción')}</p>
      <div class="survey-meta">
        <span class="meta-item">📋 ${survey.questions.length} preguntas</span>
        <span class="meta-item">👥 Muestra: ${survey.sampleSize}</span>
        <span class="meta-item">🎯 ${formatSegment(survey.segment)}</span>
      </div>
      <div class="survey-actions">
        <button class="btn btn-primary btn-run" data-id="${survey.id}">▶ Ejecutar</button>
        <button class="btn btn-secondary btn-view" data-id="${survey.id}">👁 Ver</button>
        <button class="btn btn-danger btn-delete" data-id="${survey.id}">🗑 Eliminar</button>
      </div>
    `;
    list.appendChild(card);
  });
  
  container.appendChild(list);
  
  // Attach listeners
  list.querySelectorAll('.btn-run').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const id = (e.currentTarget as HTMLElement).dataset.id;
      if (id) await executeSurvey(id);
    });
  });
  
  list.querySelectorAll('.btn-view').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = (e.currentTarget as HTMLElement).dataset.id;
      if (id) viewSurveyResults(id);
    });
  });
  
  list.querySelectorAll('.btn-delete').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = (e.currentTarget as HTMLElement).dataset.id;
      if (id && confirm('¿Eliminar esta encuesta?')) {
        deleteSurvey(id);
        refreshPage();
      }
    });
  });
}

/**
 * Renderiza el formulario de creación
 */
function renderCreateForm(container: HTMLElement): void {
  const form = document.createElement('form');
  form.className = 'survey-form';
  form.id = 'survey-create-form';
  
  form.innerHTML = `
    <div class="form-section">
      <h3>Información General</h3>
      <div class="form-group">
        <label for="survey-name">Nombre de la encuesta *</label>
        <input type="text" id="survey-name" required placeholder="Ej: Satisfacción Ciudadana 2024">
      </div>
      <div class="form-group">
        <label for="survey-description">Descripción</label>
        <textarea id="survey-description" rows="2" placeholder="Describe el objetivo de la encuesta..."></textarea>
      </div>
      <div class="form-group">
        <label for="sample-size">Tamaño de muestra *</label>
        <input type="number" id="sample-size" required min="10" max="1000" value="100">
      </div>
    </div>
    
    <div class="form-section">
      <h3>Segmento Objetivo</h3>
      <div class="form-row">
        <div class="form-group">
          <label for="segment-region">Región</label>
          <select id="segment-region">
            <option value="">Todas las regiones</option>
            ${regions.map(r => `<option value="${r.code}">${r.name}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label for="segment-comuna">Comuna</label>
          <select id="segment-comuna" disabled>
            <option value="">Todas las comunas</option>
          </select>
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label for="segment-sex">Sexo</label>
          <select id="segment-sex">
            <option value="">Todos</option>
            <option value="male">Masculino</option>
            <option value="female">Femenino</option>
          </select>
        </div>
        <div class="form-group">
          <label for="segment-age">Grupo etario</label>
          <select id="segment-age">
            <option value="">Todos</option>
            <option value="child">Niño</option>
            <option value="youth">Joven</option>
            <option value="adult">Adulto</option>
            <option value="middle_age">Adulto mayor</option>
            <option value="senior">Senior</option>
          </select>
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label for="segment-education">Educación</label>
          <select id="segment-education">
            <option value="">Todos los niveles</option>
            <option value="none">Sin educación</option>
            <option value="primary">Primaria</option>
            <option value="secondary">Secundaria</option>
            <option value="technical">Técnica</option>
            <option value="university">Universitaria</option>
            <option value="postgraduate">Postgrado</option>
          </select>
        </div>
        <div class="form-group">
          <label for="segment-connectivity">Conectividad</label>
          <select id="segment-connectivity">
            <option value="">Todos los niveles</option>
            <option value="none">Sin conectividad</option>
            <option value="low">Baja</option>
            <option value="medium">Media</option>
            <option value="high">Alta</option>
            <option value="very_high">Muy alta</option>
          </select>
        </div>
      </div>
    </div>
    
    <div class="form-section">
      <h3>Preguntas</h3>
      <div id="questions-container"></div>
      <button type="button" class="btn btn-secondary" id="btn-add-question">+ Agregar Pregunta</button>
    </div>
    
    <div class="form-actions">
      <button type="button" class="btn btn-secondary" id="btn-cancel">Cancelar</button>
      <button type="submit" class="btn btn-primary">Crear Encuesta</button>
    </div>
  `;
  
  container.appendChild(form);
  
  // Attach listeners
  attachFormListeners(form);
  
  // Add first question by default
  addQuestionField();
}

/**
 * Renderiza los resultados de una encuesta
 */
function renderResults(container: HTMLElement): void {
  if (!currentResults) {
    container.innerHTML = '<p>No hay resultados para mostrar</p>';
    return;
  }
  
  const results = currentResults;
  
  const header = document.createElement('div');
  header.className = 'results-header';
  header.innerHTML = `
    <h2>Resultados: ${escapeHtml(currentSurvey?.name || 'Encuesta')}</h2>
    <div class="results-summary">
      <div class="summary-card">
        <span class="summary-value">${results.summary.totalQuestions}</span>
        <span class="summary-label">Preguntas</span>
      </div>
      <div class="summary-card">
        <span class="summary-value">${results.summary.uniqueAgents}</span>
        <span class="summary-label">Agentes encuestados</span>
      </div>
      <div class="summary-card">
        <span class="summary-value">${results.summary.totalResponses}</span>
        <span class="summary-label">Respuestas totales</span>
      </div>
    </div>
  `;
  container.appendChild(header);
  
  const resultsList = document.createElement('div');
  resultsList.className = 'results-list';
  
  results.results.forEach((result, index) => {
    const resultCard = document.createElement('div');
    resultCard.className = 'result-card';
    resultCard.innerHTML = renderQuestionResult(result, index + 1);
    resultsList.appendChild(resultCard);
  });
  
  container.appendChild(resultsList);
}

/**
 * Renderiza el resultado de una pregunta individual
 */
function renderQuestionResult(result: QuestionResult, number: number): string {
  let content = '';
  
  if (result.questionType === 'single_choice') {
    const scResult = result as any;
    const entries = Object.entries(scResult.distribution);
    const maxCount = Math.max(...entries.map(([, v]: [string, any]) => v.count));
    
    content = `
      <div class="distribution-bars">
        ${entries.map(([, data]: [string, any]) => `
          <div class="dist-bar-row">
            <span class="dist-label">${escapeHtml(data.label)}</span>
            <div class="dist-bar-container">
              <div class="dist-bar" style="width: ${maxCount > 0 ? (data.count / maxCount * 100) : 0}%"></div>
            </div>
            <span class="dist-value">${data.count} (${data.percentage}%)</span>
          </div>
        `).join('')}
      </div>
    `;
  } else if (result.questionType === 'likert_scale') {
    const likertResult = result as any;
    const entries = Object.entries(likertResult.distribution);
    const maxCount = Math.max(...entries.map(([, v]: [string, any]) => v.count));
    
    content = `
      <div class="likert-stats">
        <div class="likert-average">
          <span class="stat-value">${likertResult.average}</span>
          <span class="stat-label">Promedio</span>
        </div>
        <div class="likert-median">
          <span class="stat-value">${likertResult.median}</span>
          <span class="stat-label">Mediana</span>
        </div>
      </div>
      <div class="distribution-bars">
        ${entries.map(([key, data]: [string, any]) => `
          <div class="dist-bar-row">
            <span class="dist-label">${key} ${key == likertResult.min ? `(${likertResult.minLabel})` : key == likertResult.max ? `(${likertResult.maxLabel})` : ''}</span>
            <div class="dist-bar-container">
              <div class="dist-bar" style="width: ${maxCount > 0 ? (data.count / maxCount * 100) : 0}%"></div>
            </div>
            <span class="dist-value">${data.count} (${data.percentage}%)</span>
          </div>
        `).join('')}
      </div>
    `;
  }
  
  return `
    <div class="result-question-header">
      <span class="question-number">${number}</span>
      <span class="question-type-badge">${result.questionType === 'single_choice' ? 'Opción única' : 'Escala Likert'}</span>
    </div>
    <h4 class="question-text">${escapeHtml(result.questionText)}</h4>
    <div class="result-content">
      ${content}
    </div>
  `;
}

// ===========================================
// Event Handlers
// ===========================================

function attachTabListeners(container: HTMLElement): void {
  container.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const view = (e.currentTarget as HTMLElement).dataset.view as SurveyViewMode;
      if (view) {
        currentView = view;
        refreshPage();
      }
    });
  });
}

function attachFormListeners(form: HTMLFormElement): void {
  // Region change -> load communes
  const regionSelect = form.querySelector('#segment-region') as HTMLSelectElement;
  const comunaSelect = form.querySelector('#segment-comuna') as HTMLSelectElement;
  
  regionSelect?.addEventListener('change', async () => {
    const regionCode = regionSelect.value;
    if (regionCode) {
      communes = await getUniqueCommunes(regionCode);
      comunaSelect.innerHTML = `
        <option value="">Todas las comunas</option>
        ${communes.map(c => `<option value="${c.code}">${c.name}</option>`).join('')}
      `;
      comunaSelect.disabled = false;
    } else {
      comunaSelect.innerHTML = '<option value="">Todas las comunas</option>';
      comunaSelect.disabled = true;
    }
  });
  
  // Add question button
  document.getElementById('btn-add-question')?.addEventListener('click', addQuestionField);
  
  // Cancel button
  document.getElementById('btn-cancel')?.addEventListener('click', () => {
    currentView = 'list';
    refreshPage();
  });
  
  // Form submit
  form.addEventListener('submit', handleFormSubmit);
}

function addQuestionField(): void {
  const container = document.getElementById('questions-container');
  if (!container) return;
  
  const questionId = `q_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
  const questionDiv = document.createElement('div');
  questionDiv.className = 'question-field';
  questionDiv.dataset.questionId = questionId;
  
  questionDiv.innerHTML = `
    <div class="question-header">
      <span class="question-number">Pregunta ${container.children.length + 1}</span>
      <button type="button" class="btn-icon btn-remove-question" title="Eliminar">×</button>
    </div>
    <div class="form-group">
      <input type="text" class="question-text-input" placeholder="Texto de la pregunta" required>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label>Tipo</label>
        <select class="question-type">
          <option value="single_choice">Opción única</option>
          <option value="likert_scale">Escala Likert (1-5)</option>
        </select>
      </div>
      <div class="form-group question-required">
        <label>
          <input type="checkbox" class="question-required-check" checked> Obligatoria
        </label>
      </div>
    </div>
    <div class="question-options-container">
      <label>Opciones</label>
      <div class="options-list">
        <div class="option-row">
          <input type="text" class="option-label" placeholder="Opción 1" required>
          <input type="hidden" class="option-value" value="opt1">
        </div>
        <div class="option-row">
          <input type="text" class="option-label" placeholder="Opción 2" required>
          <input type="hidden" class="option-value" value="opt2">
        </div>
      </div>
      <button type="button" class="btn btn-small btn-add-option">+ Agregar opción</button>
    </div>
    <div class="likert-config" style="display: none;">
      <div class="form-row">
        <div class="form-group">
          <label>Mínimo (etiqueta)</label>
          <input type="text" class="likert-min-label" value="Muy en desacuerdo">
        </div>
        <div class="form-group">
          <label>Máximo (etiqueta)</label>
          <input type="text" class="likert-max-label" value="Muy de acuerdo">
        </div>
      </div>
    </div>
  `;
  
  container.appendChild(questionDiv);
  
  // Attach listeners
  const typeSelect = questionDiv.querySelector('.question-type') as HTMLSelectElement;
  const optionsContainer = questionDiv.querySelector('.question-options-container') as HTMLElement;
  const likertConfig = questionDiv.querySelector('.likert-config') as HTMLElement;
  
  typeSelect?.addEventListener('change', () => {
    if (typeSelect.value === 'likert_scale') {
      optionsContainer.style.display = 'none';
      likertConfig.style.display = 'block';
    } else {
      optionsContainer.style.display = 'block';
      likertConfig.style.display = 'none';
    }
  });
  
  questionDiv.querySelector('.btn-remove-question')?.addEventListener('click', () => {
    questionDiv.remove();
    updateQuestionNumbers();
  });
  
  questionDiv.querySelector('.btn-add-option')?.addEventListener('click', () => {
    const optionsList = questionDiv.querySelector('.options-list');
    const optionCount = optionsList?.children.length || 0;
    const optionRow = document.createElement('div');
    optionRow.className = 'option-row';
    optionRow.innerHTML = `
      <input type="text" class="option-label" placeholder="Opción ${optionCount + 1}" required>
      <input type="hidden" class="option-value" value="opt${optionCount + 1}">
      <button type="button" class="btn-icon btn-remove-option">×</button>
    `;
    optionsList?.appendChild(optionRow);
    
    optionRow.querySelector('.btn-remove-option')?.addEventListener('click', () => {
      optionRow.remove();
    });
  });
}

function updateQuestionNumbers(): void {
  document.querySelectorAll('.question-field').forEach((el, i) => {
    const numEl = el.querySelector('.question-number');
    if (numEl) numEl.textContent = `Pregunta ${i + 1}`;
  });
}

function handleFormSubmit(e: Event): void {
  e.preventDefault();
  
  // Collect form data
  const name = (document.getElementById('survey-name') as HTMLInputElement).value;
  const description = (document.getElementById('survey-description') as HTMLTextAreaElement).value;
  const sampleSize = parseInt((document.getElementById('sample-size') as HTMLInputElement).value);
  
  // Segment
  const segment = {
    regionCode: (document.getElementById('segment-region') as HTMLSelectElement).value || undefined,
    comunaCode: (document.getElementById('segment-comuna') as HTMLSelectElement).value || undefined,
    sex: (document.getElementById('segment-sex') as HTMLSelectElement).value || undefined,
    ageGroup: (document.getElementById('segment-age') as HTMLSelectElement).value || undefined,
    educationLevel: (document.getElementById('segment-education') as HTMLSelectElement).value || undefined,
    connectivityLevel: (document.getElementById('segment-connectivity') as HTMLSelectElement).value || undefined
  };
  
  // Questions
  const questions: any[] = [];
  document.querySelectorAll('.question-field').forEach((el, index) => {
    const type = (el.querySelector('.question-type') as HTMLSelectElement).value;
    const text = (el.querySelector('.question-text-input') as HTMLInputElement).value;
    const required = (el.querySelector('.question-required-check') as HTMLInputElement).checked;
    
    if (type === 'single_choice') {
      const options: any[] = [];
      el.querySelectorAll('.option-row').forEach((optRow, optIndex) => {
        const label = (optRow.querySelector('.option-label') as HTMLInputElement).value;
        const value = (optRow.querySelector('.option-value') as HTMLInputElement).value;
        options.push({ id: `opt_${index}_${optIndex}`, label, value });
      });
      
      questions.push({
        id: `q_${index}`,
        type: 'single_choice',
        text,
        required,
        options
      });
    } else if (type === 'likert_scale') {
      const minLabel = (el.querySelector('.likert-min-label') as HTMLInputElement).value;
      const maxLabel = (el.querySelector('.likert-max-label') as HTMLInputElement).value;
      
      questions.push({
        id: `q_${index}`,
        type: 'likert_scale',
        text,
        required,
        min: 1,
        max: 5,
        minLabel,
        maxLabel
      });
    }
  });
  
  if (questions.length === 0) {
    alert('Agrega al menos una pregunta');
    return;
  }
  
  // Create survey
  createSurvey({
    name,
    description,
    sampleSize,
    segment,
    questions
  });
  
  // Go back to list
  currentView = 'list';
  refreshPage();
}

async function executeSurvey(surveyId: string): Promise<void> {
  const btn = document.querySelector(`[data-id="${surveyId}"].btn-run`);
  if (btn) {
    btn.textContent = '⏳ Ejecutando...';
    (btn as HTMLButtonElement).disabled = true;
  }
  
  try {
    const run = await runSurvey(surveyId);
    alert(`✅ Encuesta ejecutada exitosamente\n\nAgentes encuestados: ${run.totalAgents}\nRespuestas generadas: ${run.responses.length}`);
    viewSurveyResults(surveyId);
  } catch (error) {
    console.error('Error ejecutando encuesta:', error);
    alert('❌ Error al ejecutar la encuesta');
    if (btn) {
      btn.textContent = '▶ Ejecutar';
      (btn as HTMLButtonElement).disabled = false;
    }
  }
}

function viewSurveyResults(surveyId: string): void {
  const survey = getAllSurveys().find(s => s.id === surveyId);
  const results = getSurveyResults(surveyId);
  
  if (!survey || !results) {
    alert('No hay resultados disponibles. Ejecuta la encuesta primero.');
    return;
  }
  
  currentSurvey = survey;
  currentResults = results;
  currentView = 'results';
  refreshPage();
}

function refreshPage(): void {
  const page = document.getElementById('surveys-page');
  if (page) {
    renderContent(page);
  }
}

// ===========================================
// Utilities
// ===========================================

function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function formatDate(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleDateString('es-CL', { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function formatSegment(segment: any): string {
  const parts: string[] = [];
  if (segment.regionCode) parts.push(`Región ${segment.regionCode}`);
  if (segment.connectivityLevel) parts.push(segment.connectivityLevel);
  if (segment.educationLevel) parts.push(segment.educationLevel);
  if (parts.length === 0) return 'Todos';
  return parts.join(', ');
}

/**
 * Cleanup function (required by main.ts)
 */
export function cleanupSurveysPage(): void {
  // No cleanup needed for this page
}
