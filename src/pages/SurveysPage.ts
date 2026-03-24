/**
 * Surveys Page - Encuestas Sintéticas v2
 * 
 * Vista completa para crear, ejecutar y ver resultados de encuestas.
 * Sprint 13 - Layout corregido: estructura plana y continua
 */

import type { SurveyDefinition, SurveyResult, QuestionResult, SurveyViewMode, SurveyRun } from '../types/survey';
import { 
  createSurvey, 
  getAllSurveys, 
  deleteSurvey, 
  runSurvey, 
  getSurveyResultsByRun,
  getSurveyRuns,
  createSampleSurveys,
  exportResultsToJson,
  exportResultsToCsv,
  generateExportFilename,
  downloadFile,
  getSurveyRun
} from '../app/survey/surveyService';
import { getUniqueRegions, getUniqueCommunes } from '../data/syntheticAgents';

// Estado local
let currentView: SurveyViewMode = 'list';
let currentSurvey: SurveyDefinition | null = null;
let currentResults: SurveyResult | null = null;
let currentRunId: string | null = null;
let surveyRuns: SurveyRun[] = [];
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
  await createSampleSurveys();
  
  // Renderizar según vista actual
  renderContent(page);
  
  return page;
}

/**
 * Renderiza el contenido según la vista actual
 * Estructura plana: header + tabs + content (sin wrappers anidados)
 */
function renderContent(container: HTMLElement): void {
  container.innerHTML = '';
  
  // Header compacto
  const header = document.createElement('div');
  header.className = 'surveys-header';
  header.innerHTML = `
    <h1 class="page-title">📊 Encuestas Sintéticas</h1>
    <p class="page-subtitle">Diseña, ejecuta y analiza encuestas sobre agentes sintéticos</p>
  `;
  container.appendChild(header);
  
  // Navigation tabs
  const tabs = document.createElement('div');
  tabs.className = 'surveys-tabs';
  tabs.innerHTML = `
    <button class="tab-btn ${currentView === 'list' ? 'active' : ''}" data-view="list">
      <span class="tab-icon material-symbols-outlined">assignment</span> Mis Encuestas
    </button>
    <button class="tab-btn ${currentView === 'create' ? 'active' : ''}" data-view="create">
      <span class="tab-icon">➕</span> Crear Nueva
    </button>
    ${currentResults ? `<button class="tab-btn ${currentView === 'results' ? 'active' : ''}" data-view="results">
      <span class="tab-icon">📈</span> Resultados
    </button>` : ''}
  `;
  container.appendChild(tabs);
  
  // Content area - sin estructura anidada innecesaria
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

// ===========================================
// Survey List View - Layout corregido
// ===========================================

async function renderSurveyList(container: HTMLElement): Promise<void> {
  // Loading inline, no reemplaza todo el content
  const loadingEl = createLoadingElement('Cargando encuestas...');
  container.appendChild(loadingEl);
  
  try {
    const surveys = await getAllSurveys();
    
    // Remover loading
    container.innerHTML = '';
    
    if (surveys.length === 0) {
      container.appendChild(createEmptyStateElement(
        '<span class="material-symbols-outlined">assignment</span>',
        'No hay encuestas',
        'Crea tu primera encuesta para comenzar a analizar datos sintéticos',
        'Crear Encuesta',
        () => {
          currentView = 'create';
          refreshPage();
        }
      ));
      return;
    }
    
    // Stats summary - directo en container
    const statsSection = document.createElement('div');
    statsSection.className = 'survey-stats-section';
    statsSection.innerHTML = `
      <div class="stats-grid">
        <div class="stat-card">
          <span class="stat-value">${surveys.length}</span>
          <span class="stat-label">Encuestas</span>
        </div>
        <div class="stat-card">
          <span class="stat-value">${surveys.reduce((acc, s) => acc + s.questions.length, 0)}</span>
          <span class="stat-label">Preguntas totales</span>
        </div>
      </div>
    `;
    container.appendChild(statsSection);
    
    // Survey list - directo en container, sin wrapper extra
    const list = document.createElement('div');
    list.className = 'survey-list';
    
    for (const survey of surveys) {
      // Get runs for this survey
      const runs = await getSurveyRuns(survey.id);
      const hasRuns = runs.length > 0;
      const lastRun = hasRuns ? runs[0] : null;
      
      const card = document.createElement('div');
      card.className = 'survey-card';
      card.innerHTML = `
        <div class="survey-card-header">
          <div class="survey-title-section">
            <h3 class="survey-name">${escapeHtml(survey.name)}</h3>
            <span class="survey-date">${formatDate(survey.createdAt)}</span>
          </div>
          <div class="survey-badges">
            ${hasRuns ? `<span class="badge badge-success">✓ Ejecutada</span>` : '<span class="badge badge-pending">⏳ Pendiente</span>'}
          </div>
        </div>
        <p class="survey-description">${escapeHtml(survey.description || 'Sin descripción')}</p>
        
        <div class="survey-meta">
          <span class="meta-item" title="Preguntas"><span class="material-symbols-outlined" style="font-size: 14px; vertical-align: middle;">assignment</span> ${survey.questions.length} preguntas</span>
          <span class="meta-item" title="Tamaño de muestra">👥 Muestra: ${survey.sampleSize}</span>
          <span class="meta-item" title="Segmento">🎯 ${formatSegment(survey.segment)}</span>
          ${hasRuns ? `<span class="meta-item" title="Ejecuciones">🔄 ${runs.length} ejecución${runs.length > 1 ? 'es' : ''}</span>` : ''}
        </div>
        
        ${hasRuns && lastRun ? `
          <div class="survey-last-run">
            <span class="last-run-label">Última ejecución:</span>
            <span class="last-run-date">${formatDate(lastRun.completedAt)}</span>
            <span class="last-run-stats">${lastRun.totalAgents} agentes, ${lastRun.responses.length} respuestas</span>
          </div>
        ` : ''}
        
        <div class="survey-actions">
          <button class="btn btn-primary btn-run" data-id="${survey.id}">
            <span class="btn-icon">▶</span> Ejecutar
          </button>
          ${hasRuns ? `
            <button class="btn btn-secondary btn-view-results" data-id="${survey.id}">
              <span class="btn-icon">📈</span> Ver Resultados
            </button>
            <button class="btn btn-secondary btn-view-runs" data-id="${survey.id}">
              <span class="btn-icon">🔄</span> Historial
            </button>
          ` : `
            <button class="btn btn-secondary btn-view" data-id="${survey.id}">
              <span class="btn-icon">👁</span> Ver
            </button>
          `}
          <button class="btn btn-danger btn-delete" data-id="${survey.id}">
            <span class="btn-icon">🗑</span> Eliminar
          </button>
        </div>
      `;
      list.appendChild(card);
    }
    
    container.appendChild(list);
    
    // Attach listeners
    attachSurveyListListeners(list);
    
  } catch (error) {
    container.innerHTML = '';
    container.appendChild(createErrorStateElement(
      '❌',
      'Error al cargar encuestas',
      'No se pudieron cargar las encuestas. Intenta recargar la página.',
      () => refreshPage()
    ));
  }
}

function attachSurveyListListeners(list: HTMLElement): void {
  // Run survey
  list.querySelectorAll('.btn-run').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const id = (e.currentTarget as HTMLElement).dataset.id;
      if (id) await executeSurvey(id);
    });
  });
  
  // View results (latest)
  list.querySelectorAll('.btn-view-results').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const id = (e.currentTarget as HTMLElement).dataset.id;
      if (id) await viewSurveyResults(id);
    });
  });
  
  // View runs history
  list.querySelectorAll('.btn-view-runs').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const id = (e.currentTarget as HTMLElement).dataset.id;
      if (id) await viewSurveyRunsHistory(id);
    });
  });
  
  // View survey details
  list.querySelectorAll('.btn-view').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = (e.currentTarget as HTMLElement).dataset.id;
      if (id) viewSurveyDetails(id);
    });
  });
  
  // Delete survey
  list.querySelectorAll('.btn-delete').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const id = (e.currentTarget as HTMLElement).dataset.id;
      if (id && confirm('¿Eliminar esta encuesta? Esta acción no se puede deshacer.')) {
        try {
          await deleteSurvey(id);
          refreshPage();
        } catch (error) {
          alert('❌ Error al eliminar la encuesta');
        }
      }
    });
  });
}

// ===========================================
// Survey Runs History View
// ===========================================

async function viewSurveyRunsHistory(surveyId: string): Promise<void> {
  const surveys = await getAllSurveys();
  const survey = surveys.find(s => s.id === surveyId);
  
  if (!survey) {
    alert('Encuesta no encontrada');
    return;
  }
  
  currentSurvey = survey;
  currentView = 'results';
  currentRunId = null; // Show run selector
  
  // Load runs
  surveyRuns = await getSurveyRuns(surveyId);
  
  refreshPage();
}

// ===========================================
// Create Form View
// ===========================================

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
        <span class="form-hint">Número de agentes sintéticos a encuestar</span>
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

// ===========================================
// Results View with Run Selector - Layout corregido
// ===========================================

async function renderResults(container: HTMLElement): Promise<void> {
  if (!currentSurvey) {
    container.appendChild(createErrorStateElement(
      '⚠️',
      'No hay encuesta seleccionada',
      'Selecciona una encuesta para ver sus resultados',
      () => {
        currentView = 'list';
        refreshPage();
      }
    ));
    return;
  }
  
  // Loading inline
  const loadingEl = createLoadingElement('Cargando resultados...');
  container.appendChild(loadingEl);
  
  try {
    // Load runs if not already loaded
    if (surveyRuns.length === 0 || surveyRuns[0]?.surveyId !== currentSurvey.id) {
      surveyRuns = await getSurveyRuns(currentSurvey.id);
    }
    
    // Clear loading
    container.innerHTML = '';
    
    if (surveyRuns.length === 0) {
      container.appendChild(createEmptyStateElement(
        '📊',
        'Sin ejecuciones',
        `La encuesta "${escapeHtml(currentSurvey.name)}" no tiene ejecuciones registradas. Ejecuta la encuesta para ver resultados.`,
        'Ejecutar Encuesta',
        async () => {
          await executeSurvey(currentSurvey!.id);
        }
      ));
      return;
    }
    
    // Determine which run to show
    let selectedRun: SurveyRun | undefined;
    let selectedResults: SurveyResult | undefined;
    
    if (currentRunId) {
      selectedRun = surveyRuns.find(r => r.id === currentRunId);
    } else {
      selectedRun = surveyRuns[0]; // Latest run
    }
    
    if (selectedRun) {
      currentRunId = selectedRun.id;
      selectedResults = await getSurveyResultsByRun(selectedRun.id);
      if (selectedResults) {
        currentResults = selectedResults;
      }
    }
    
    if (!selectedResults) {
      container.appendChild(createErrorStateElement(
        '⚠️',
        'Resultados no disponibles',
        'No se encontraron resultados para esta ejecución',
        () => refreshPage()
      ));
      return;
    }
    
    // Results header - directo en container
    const header = document.createElement('div');
    header.className = 'results-header';
    header.innerHTML = `
      <div class="results-header-top">
        <div class="results-title-section">
          <h2 class="results-title">📈 Resultados: ${escapeHtml(currentSurvey.name)}</h2>
          <p class="results-subtitle">${escapeHtml(currentSurvey.description || '')}</p>
        </div>
        <div class="results-actions">
          <button class="btn btn-secondary btn-export-json" title="Exportar JSON">
            <span class="btn-icon">📄</span> JSON
          </button>
          <button class="btn btn-secondary btn-export-csv" title="Exportar CSV">
            <span class="btn-icon">📊</span> CSV
          </button>
        </div>
      </div>
      
      ${surveyRuns.length > 1 ? `
        <div class="run-selector">
          <label for="run-select">Ejecución:</label>
          <select id="run-select" class="run-select">
            ${surveyRuns.map((run, index) => `
              <option value="${run.id}" ${run.id === currentRunId ? 'selected' : ''}>
                Ejecución #${surveyRuns.length - index} - ${formatDate(run.completedAt)} 
                (${run.totalAgents} agentes)
              </option>
            `).join('')}
          </select>
          <span class="run-count">${surveyRuns.length} ejecuciones totales</span>
        </div>
      ` : selectedRun ? `
        <div class="run-info">
          <span class="run-badge">Ejecución única</span>
          <span class="run-date">${formatDate(selectedRun.completedAt)}</span>
        </div>
      ` : ''}
      
      <div class="results-summary">
        <div class="summary-card">
          <span class="summary-value">${selectedResults.summary.totalQuestions}</span>
          <span class="summary-label">Preguntas</span>
        </div>
        <div class="summary-card">
          <span class="summary-value">${selectedResults.summary.uniqueAgents}</span>
          <span class="summary-label">Agentes encuestados</span>
        </div>
        <div class="summary-card">
          <span class="summary-value">${selectedResults.summary.totalResponses}</span>
          <span class="summary-label">Respuestas totales</span>
        </div>
        <div class="summary-card">
          <span class="summary-value">${Math.round((selectedResults.summary.totalResponses / selectedResults.summary.uniqueAgents) * 100)}%</span>
          <span class="summary-label">Tasa de respuesta</span>
        </div>
      </div>
    `;
    container.appendChild(header);
    
    // Results list - directo en container
    const resultsList = document.createElement('div');
    resultsList.className = 'results-list';
    
    selectedResults.results.forEach((result, index) => {
      const resultCard = document.createElement('div');
      resultCard.className = 'result-card';
      resultCard.innerHTML = renderQuestionResult(result, index + 1);
      resultsList.appendChild(resultCard);
    });
    
    container.appendChild(resultsList);
    
    // Attach listeners
    attachResultsListeners(header);
    
  } catch (error) {
    container.innerHTML = '';
    container.appendChild(createErrorStateElement(
      '❌',
      'Error al cargar resultados',
      'No se pudieron cargar los resultados. Intenta nuevamente.',
      () => refreshPage()
    ));
  }
}

function attachResultsListeners(header: HTMLElement): void {
  // Run selector change
  const runSelect = header.querySelector('#run-select') as HTMLSelectElement;
  runSelect?.addEventListener('change', async (e) => {
    const runId = (e.target as HTMLSelectElement).value;
    if (runId && runId !== currentRunId) {
      currentRunId = runId;
      refreshPage();
    }
  });
  
  // Export JSON con nombre consistente
  header.querySelector('.btn-export-json')?.addEventListener('click', async () => {
    if (currentSurvey && currentResults && currentRunId) {
      const run = await getSurveyRun(currentRunId);
      const json = exportResultsToJson(currentSurvey, currentResults, run, { 
        includeMetadata: true,
        dateFormat: 'locale'
      });
      const filename = generateExportFilename(currentSurvey, currentRunId, 'json');
      downloadFile(json, filename, 'application/json');
    }
  });
  
  // Export CSV con nombre consistente
  header.querySelector('.btn-export-csv')?.addEventListener('click', async () => {
    if (currentSurvey && currentResults && currentRunId) {
      const run = await getSurveyRun(currentRunId);
      const csv = exportResultsToCsv(currentSurvey, currentResults, run, {
        includeMetadata: true
      });
      const filename = generateExportFilename(currentSurvey, currentRunId, 'csv');
      downloadFile(csv, filename, 'text/csv');
    }
  });
}

function renderQuestionResult(result: QuestionResult, number: number): string {
  let content = '';
  
  if (result.questionType === 'single_choice') {
    const scResult = result as any;
    const entries = Object.entries(scResult.distribution);
    const maxCount = Math.max(...entries.map(([, v]: [string, any]) => v.count));
    const total = entries.reduce((sum, [, v]: [string, any]) => sum + v.count, 0);
    
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
      <div class="result-total">Total respuestas: ${total}</div>
    `;
  } else if (result.questionType === 'likert_scale') {
    const likertResult = result as any;
    const entries = Object.entries(likertResult.distribution);
    const maxCount = Math.max(...entries.map(([, v]: [string, any]) => v.count));
    
    content = `
      <div class="likert-stats">
        <div class="likert-stat">
          <span class="stat-value">${likertResult.average}</span>
          <span class="stat-label">Promedio</span>
        </div>
        <div class="likert-stat">
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
// State Components - Elementos DOM reales (no strings)
// ===========================================

function createLoadingElement(message: string): HTMLElement {
  const div = document.createElement('div');
  div.className = 'state-container state-loading';
  div.innerHTML = `
    <div class="state-spinner"></div>
    <p class="state-message">${escapeHtml(message)}</p>
  `;
  return div;
}

function createEmptyStateElement(
  icon: string, 
  title: string, 
  message: string, 
  buttonText: string,
  onAction: () => void
): HTMLElement {
  const div = document.createElement('div');
  div.className = 'state-container state-empty';
  div.innerHTML = `
    <div class="state-icon">${icon}</div>
    <h3 class="state-title">${escapeHtml(title)}</h3>
    <p class="state-message">${escapeHtml(message)}</p>
    <button class="btn btn-primary state-action">${escapeHtml(buttonText)}</button>
  `;
  
  const btn = div.querySelector('.state-action');
  btn?.addEventListener('click', onAction);
  
  return div;
}

function createErrorStateElement(
  icon: string, 
  title: string, 
  message: string,
  onRetry: () => void
): HTMLElement {
  const div = document.createElement('div');
  div.className = 'state-container state-error';
  div.innerHTML = `
    <div class="state-icon">${icon}</div>
    <h3 class="state-title">${escapeHtml(title)}</h3>
    <p class="state-message">${escapeHtml(message)}</p>
    <button class="btn btn-primary state-action">Reintentar</button>
  `;
  
  const btn = div.querySelector('.state-action');
  btn?.addEventListener('click', onRetry);
  
  return div;
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

async function handleFormSubmit(e: Event): Promise<void> {
  e.preventDefault();
  
  const submitBtn = (e.target as HTMLFormElement).querySelector('button[type="submit"]') as HTMLButtonElement;
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.textContent = 'Creando...';
  }
  
  try {
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
    await createSurvey({
      name,
      description,
      sampleSize,
      segment,
      questions
    });
    
    // Go back to list
    currentView = 'list';
    refreshPage();
    
  } catch (err) {
    console.error('Error creating survey:', err);
    alert('❌ Error al crear la encuesta');
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Crear Encuesta';
    }
  }
}

async function executeSurvey(surveyId: string): Promise<void> {
  const btn = document.querySelector(`[data-id="${surveyId}"].btn-run`);
  if (btn) {
    btn.innerHTML = '<span class="btn-icon">⏳</span> Ejecutando...';
    (btn as HTMLButtonElement).disabled = true;
  }
  
  try {
    const run = await runSurvey(surveyId);
    
    // Show success and navigate to results
    currentRunId = run.id;
    await viewSurveyResults(surveyId);
    
  } catch (error) {
    console.error('Error ejecutando encuesta:', error);
    alert('❌ Error al ejecutar la encuesta');
    if (btn) {
      btn.innerHTML = '<span class="btn-icon">▶</span> Ejecutar';
      (btn as HTMLButtonElement).disabled = false;
    }
  }
}

async function viewSurveyResults(surveyId: string): Promise<void> {
  const surveys = await getAllSurveys();
  const survey = surveys.find(s => s.id === surveyId);
  
  if (!survey) {
    alert('Encuesta no encontrada');
    return;
  }
  
  currentSurvey = survey;
  currentView = 'results';
  
  // Load runs to determine which to show
  surveyRuns = await getSurveyRuns(surveyId);
  
  if (surveyRuns.length === 0) {
    alert('No hay ejecuciones para esta encuesta');
    currentView = 'list';
    return;
  }
  
  // Show latest run by default
  currentRunId = surveyRuns[0].id;
  
  refreshPage();
}

async function viewSurveyDetails(surveyId: string): Promise<void> {
  // For now, just show results if available, or alert
  const runs = await getSurveyRuns(surveyId);
  if (runs.length > 0) {
    await viewSurveyResults(surveyId);
  } else {
    alert('Esta encuesta no tiene ejecuciones. Ejecútala para ver detalles.');
  }
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
  currentSurvey = null;
  currentResults = null;
  currentRunId = null;
  surveyRuns = [];
  console.log('🧹 Surveys page cleaned up');
}
