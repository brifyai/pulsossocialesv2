/**
 * Surveys Page - Encuestas Sintéticas v2
 * 
 * Vista completa para crear, ejecutar y ver resultados de encuestas.
 * Sprint 13 - Layout corregido: estructura plana y continua
 */

import type { SurveyDefinition, SurveyResult, QuestionResult, SurveyViewMode, SurveyRun, SingleChoiceResult, LikertResult } from '../types/survey';
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
  getSurveyRun,
  compareSurveyRuns,
  type SurveyComparison,
  type QuestionComparison
} from '../app/survey/surveyService';

import { getUniqueRegions, getUniqueCommunes } from '../data/syntheticAgents';
// R1 - Import scenario event store
import { listScenarios, type ScenarioEvent } from '../app/events/scenarioEventStore';

// Estado local
let currentView: SurveyViewMode = 'list';
let currentSurvey: SurveyDefinition | null = null;
let currentResults: SurveyResult | null = null;
let currentRunId: string | null = null;
let surveyRuns: SurveyRun[] = [];
let regions: Array<{ code: string; name: string }> = [];
let communes: Array<{ code: string; name: string }> = [];
// R1 - Estado para modal de escenarios
let pendingSurveyId: string | null = null;
let availableScenarios: ScenarioEvent[] = [];
// R2 - Estado para escenario pre-seleccionado desde query param
let preSelectedScenarioId: string | null = null;
// Comparison view state
let comparisonData: SurveyComparison | null = null;


// ===========================================
// Main Page Component
// ===========================================

export async function createSurveysPage(): Promise<HTMLElement> {
  const page = document.createElement('div');
  page.className = 'page surveys-page';
  page.id = 'surveys-page';
  
  // Cargar datos iniciales - usar todas las regiones de Chile desde Supabase
  regions = await getUniqueRegions();
  
  // Crear encuestas de ejemplo si no hay ninguna
  await createSampleSurveys();
  
  // R2 - Leer query param ?scenario= para pre-seleccionar escenario
  const urlParams = new URLSearchParams(window.location.search);
  preSelectedScenarioId = urlParams.get('scenario');
  
  // Limpiar el query param de la URL para no mantenerlo en history
  if (preSelectedScenarioId) {
    const newUrl = window.location.pathname;
    window.history.replaceState({}, '', newUrl);
  }
  
  // Renderizar según vista actual
  renderContent(page);
  
  // R2 - Si hay escenario pre-seleccionado, mostrar modal al hacer clic en ejecutar
  // o si viene de Scenario Builder, mostrar modal inmediatamente
  if (preSelectedScenarioId) {
    // Esperar a que se renderice el contenido
    setTimeout(() => {
      handlePreSelectedScenario();
    }, 100);
  }
  
  return page;
}

/**
 * R2 - Maneja el escenario pre-seleccionado desde query param
 * Muestra el modal de selección con el escenario ya seleccionado
 */
async function handlePreSelectedScenario(): Promise<void> {
  if (!preSelectedScenarioId) return;
  
  // Verificar que el escenario existe
  const result = await listScenarios({ status: 'active', limit: 100 });
  if (result.success && result.data) {
    const scenario = result.data.scenarios.find(s => s.id === preSelectedScenarioId);
    if (scenario) {
      // Si hay una encuesta disponible, mostrar modal para ejecutar
      const surveys = await getAllSurveys();
      if (surveys.length > 0) {
        // Usar la primera encuesta o la más reciente
        const surveyToRun = surveys[0];
        pendingSurveyId = surveyToRun.id;
        availableScenarios = result.data.scenarios;
        
        // Mostrar modal con el escenario pre-seleccionado
        showScenarioSelectionModalWithPreselection(surveyToRun.id, preSelectedScenarioId);
      } else {
        // No hay encuestas, mostrar mensaje
        alert(`Escenario "${scenario.name}" seleccionado. Crea una encuesta para ejecutarlo.`);
      }
    } else {
      console.warn('Escenario pre-seleccionado no encontrado:', preSelectedScenarioId);
    }
  }
  
  // Limpiar el estado
  preSelectedScenarioId = null;
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
    <h1 class="page-title"><span class="material-symbols-outlined" style="vertical-align: middle; margin-right: 8px;">assignment</span>Encuestas Sintéticas</h1>
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
      <span class="tab-icon material-symbols-outlined">add</span> Crear Nueva
    </button>
    ${currentResults ? `<button class="tab-btn ${currentView === 'results' ? 'active' : ''}" data-view="results">
      <span class="tab-icon material-symbols-outlined">bar_chart</span> Resultados
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
    case 'comparison':
      renderComparison(content);
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
            ${hasRuns ? `<span class="badge badge-success"><span class="material-symbols-outlined" style="font-size: 12px; vertical-align: middle;">check_circle</span> Ejecutada</span>` : '<span class="badge badge-pending"><span class="material-symbols-outlined" style="font-size: 12px; vertical-align: middle;">schedule</span> Pendiente</span>'}
          </div>
        </div>
        <p class="survey-description">${escapeHtml(survey.description || 'Sin descripción')}</p>
        
        <div class="survey-meta">
          <span class="meta-item" title="Preguntas"><span class="material-symbols-outlined" style="font-size: 14px; vertical-align: middle;">assignment</span> ${survey.questions.length} preguntas</span>
          <span class="meta-item" title="Tamaño de muestra"><span class="material-symbols-outlined" style="font-size: 14px; vertical-align: middle;">groups</span> Muestra: ${survey.sampleSize}</span>
          <span class="meta-item" title="Segmento"><span class="material-symbols-outlined" style="font-size: 14px; vertical-align: middle;">filter_alt</span> ${formatSegment(survey.segment)}</span>
          ${hasRuns ? `<span class="meta-item" title="Ejecuciones"><span class="material-symbols-outlined" style="font-size: 14px; vertical-align: middle;">replay</span> ${runs.length} ejecución${runs.length > 1 ? 'es' : ''}</span>` : ''}
        </div>
        
        ${hasRuns && lastRun ? `
          <div class="survey-last-run">
            <span class="last-run-label">Última ejecución:</span>
            <span class="last-run-date">${formatDate(lastRun.completedAt)}</span>
            <span class="last-run-stats">${lastRun.totalAgents} agentes, ${lastRun.metadata.resultsSummary?.total_responses || lastRun.responses.length || 0} respuestas</span>
          </div>
        ` : ''}
        
        <div class="survey-actions">
          <button class="btn btn-primary btn-run" data-id="${survey.id}">
            <span class="btn-icon material-symbols-outlined">play_arrow</span> Ejecutar
          </button>
          ${hasRuns ? `
            <button class="btn btn-secondary btn-view-results" data-id="${survey.id}">
              <span class="btn-icon material-symbols-outlined">bar_chart</span> Ver Resultados
            </button>
            <button class="btn btn-secondary btn-view-runs" data-id="${survey.id}">
              <span class="btn-icon material-symbols-outlined">history</span> Historial
            </button>
          ` : `
            <button class="btn btn-secondary btn-view" data-id="${survey.id}">
              <span class="btn-icon material-symbols-outlined">visibility</span> Ver
            </button>
          `}
          <button class="btn btn-danger btn-delete" data-id="${survey.id}">
            <span class="btn-icon material-symbols-outlined">delete</span> Eliminar
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
      '<span class="material-symbols-outlined" style="font-size: 48px; color: #ef4444;">error</span>',
      'Error al cargar encuestas',
      'No se pudieron cargar las encuestas. Intenta recargar la página.',
      () => refreshPage()
    ));
  }
}

function attachSurveyListListeners(list: HTMLElement): void {
  // Run survey - R1: Ahora abre el modal de selección de escenario
  list.querySelectorAll('.btn-run').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const id = (e.currentTarget as HTMLElement).dataset.id;
      if (id) await showScenarioSelectionModal(id);
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
          alert('Error al eliminar la encuesta');
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
      '<span class="material-symbols-outlined" style="font-size: 48px; color: #f59e0b;">warning</span>',
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
        '<span class="material-symbols-outlined" style="font-size: 48px; color: #6b7280;">bar_chart</span>',
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
        '<span class="material-symbols-outlined" style="font-size: 48px; color: #f59e0b;">warning</span>',
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
          <h2 class="results-title"><span class="material-symbols-outlined" style="vertical-align: middle; margin-right: 8px;">bar_chart</span>Resultados: ${escapeHtml(currentSurvey.name)}</h2>
          <p class="results-subtitle">${escapeHtml(currentSurvey.description || '')}</p>
        </div>
        <div class="results-actions">
          <button class="btn btn-secondary btn-compare" title="Comparar ejecuciones">
            <span class="btn-icon material-symbols-outlined">compare_arrows</span> Comparar
          </button>
          <button class="btn btn-secondary btn-export-json" title="Exportar JSON">
            <span class="btn-icon material-symbols-outlined">description</span> JSON
          </button>
          <button class="btn btn-secondary btn-export-csv" title="Exportar CSV">
            <span class="btn-icon material-symbols-outlined">table</span> CSV
          </button>
        </div>

      </div>
      
      ${surveyRuns.length > 1 ? `
        <div class="run-selector">
          <label for="run-select">Ejecución:</label>
          <select id="run-select" class="run-select">
            ${surveyRuns.map((run, index) => {
              const isScenario = run.metadata.scenarioEventId;
              const scenarioLabel = isScenario ? ` [${run.metadata.scenarioName || 'Escenario'}]` : ' [Baseline]';
              return `
                <option value="${run.id}" ${run.id === currentRunId ? 'selected' : ''}>
                  Ejecución #${surveyRuns.length - index} - ${formatDate(run.completedAt)} 
                  (${run.totalAgents} agentes)${scenarioLabel}
                </option>
              `;
            }).join('')}
          </select>
          <span class="run-count">${surveyRuns.length} ejecuciones totales</span>
        </div>
      ` : selectedRun ? `
        <div class="run-info">
          <span class="run-badge">Ejecución única</span>
          <span class="run-date">${formatDate(selectedRun.completedAt)}</span>
          ${selectedRun.metadata.scenarioEventId ? `
            <span class="scenario-badge scenario-badge-${selectedRun.metadata.scenarioSeverity || 'moderate'}">
              <span class="material-symbols-outlined" style="font-size: 12px; vertical-align: middle;">event</span>
              ${escapeHtml(selectedRun.metadata.scenarioName || 'Escenario')}
            </span>
          ` : '<span class="baseline-badge"><span class="material-symbols-outlined" style="font-size: 12px; vertical-align: middle;">check_circle</span> Baseline</span>'}
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
          <span class="summary-value">100%</span>
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
      '<span class="material-symbols-outlined" style="font-size: 48px; color: #ef4444;">error</span>',
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
  
  // Compare button
  header.querySelector('.btn-compare')?.addEventListener('click', () => {
    showComparisonSelector();
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

// Mapa de claves canónicas a labels en español
const CANONICAL_LABELS: Record<string, string> = {
  approve: 'Aprueba',
  disapprove: 'Desaprueba',
  no_response: 'No responde',
  no_opinion: 'Sin opinión',
  optimistic: 'Optimista',
  pessimistic: 'Pesimista',
  good: 'Buena',
  bad: 'Mala',
  regular: 'Regular',
  excellent: 'Excelente',
  poor: 'Mala',
  yes: 'Sí',
  no: 'No',
  maybe: 'Tal vez',
  agree: 'De acuerdo',
  disagree: 'En desacuerdo',
  neutral: 'Neutral'
};

function renderQuestionResult(result: QuestionResult, number: number): string {
  let content = '';
  
  // Debug: log the complete result structure
  console.log('🔍🔍🔍 renderQuestionResult - COMPLETE OBJECT:', JSON.stringify(result, null, 2));
  console.log('🔍 result keys:', Object.keys(result));
  console.log('🔍 questionType:', result.questionType);
  console.log('🔍 questionId:', result.questionId);
  console.log('🔍 questionText:', result.questionText);
  
  if (result.questionType === 'single_choice') {
    const scResult = result as SingleChoiceResult;
    console.log('🔍 single_choice - distribution:', scResult.distribution);
    console.log('🔍 single_choice - distribution type:', typeof scResult.distribution);
    console.log('🔍 single_choice - distribution keys:', scResult.distribution ? Object.keys(scResult.distribution) : 'N/A');
  } else if (result.questionType === 'likert_scale') {
    const likertResult = result as LikertResult;
    console.log('🔍 likert_scale - distribution:', likertResult.distribution);
    console.log('🔍 likert_scale - distribution type:', typeof likertResult.distribution);
    console.log('🔍 likert_scale - distribution keys:', likertResult.distribution ? Object.keys(likertResult.distribution) : 'N/A');
  }
  
  if (result.questionType === 'single_choice') {
    const scResult = result as SingleChoiceResult;
    
    // Normalize distribution data - handle various formats
    const distribution = scResult.distribution || {};
    console.log('📊 Single choice distribution:', distribution);
    
    // Calculate total for percentage calculation
    const rawEntries = Object.entries(distribution);
    const total = rawEntries.reduce((sum, [, value]) => {
      if (typeof value === 'number') return sum + value;
      if (typeof value === 'object' && value !== null && typeof value.count === 'number') return sum + value.count;
      return sum;
    }, 0);
    
    const entries = rawEntries.map(([key, value]: [string, any]) => {
      // Handle format: { "approve": 267 } (simple number)
      if (typeof value === 'number') {
        const percentage = total > 0 ? Math.round((value / total) * 100) : 0;
        return {
          key,
          label: CANONICAL_LABELS[key] || key,
          count: value,
          percentage
        };
      }
      // Handle format: { "approve": { count: 267, percentage: 53.4 } } (object)
      if (typeof value === 'object' && value !== null) {
        return {
          key,
          label: value.label || CANONICAL_LABELS[key] || key,
          count: typeof value.count === 'number' ? value.count : 0,
          percentage: typeof value.percentage === 'number' ? value.percentage : (total > 0 ? Math.round((value.count / total) * 100) : 0)
        };
      }
      // Fallback
      return { key, label: CANONICAL_LABELS[key] || key, count: 0, percentage: 0 };
    });
    
    // Filter out entries with no count
    const validEntries = entries.filter(e => e.count > 0);
    const maxCount = validEntries.length > 0 ? Math.max(...validEntries.map(e => e.count)) : 0;
    
    console.log('📊 Processed entries:', validEntries);
    
    if (validEntries.length === 0) {
      content = `<div class="result-empty">No hay datos de distribución disponibles</div>`;
    } else {
      content = `
        <div class="distribution-bars">
          ${validEntries.map(entry => `
            <div class="dist-bar-row">
              <span class="dist-label">${escapeHtml(entry.label)}</span>
              <div class="dist-bar-container">
                <div class="dist-bar" style="width: ${maxCount > 0 ? (entry.count / maxCount * 100) : 0}%"></div>
              </div>
              <span class="dist-value">${entry.count} (${entry.percentage}%)</span>
            </div>
          `).join('')}
        </div>
        <div class="result-total">Total respuestas: ${total}</div>
      `;
    }
  } else if (result.questionType === 'likert_scale') {
    const likertResult = result as LikertResult;
    
    // Normalize distribution data
    const distribution = likertResult.distribution || {};
    console.log('📊 Likert distribution:', distribution);
    
    // Calculate total for percentage calculation
    const rawEntries = Object.entries(distribution);
    const total = rawEntries.reduce((sum, [, value]) => {
      if (typeof value === 'number') return sum + value;
      if (typeof value === 'object' && value !== null && typeof value.count === 'number') return sum + value.count;
      return sum;
    }, 0);
    
    const entries = rawEntries.map(([key, value]: [string, any]) => {
      const numKey = parseInt(key) || key;
      // Handle format: { "1": 100 } (simple number)
      if (typeof value === 'number') {
        const percentage = total > 0 ? Math.round((value / total) * 100) : 0;
        return {
          key: numKey,
          count: value,
          percentage
        };
      }
      // Handle format: { "1": { count: 100, percentage: 20 } } (object)
      if (typeof value === 'object' && value !== null) {
        return {
          key: numKey,
          count: typeof value.count === 'number' ? value.count : 0,
          percentage: typeof value.percentage === 'number' ? value.percentage : (total > 0 ? Math.round((value.count / total) * 100) : 0)
        };
      }
      return { key: numKey, count: 0, percentage: 0 };
    }).filter(e => e.count > 0).sort((a, b) => (typeof a.key === 'number' && typeof b.key === 'number') ? a.key - b.key : 0);
    
    const maxCount = entries.length > 0 ? Math.max(...entries.map(e => e.count)) : 0;
    
    console.log('📊 Processed likert entries:', entries);
    
    content = `
      <div class="likert-stats">
        <div class="likert-stat">
          <span class="stat-value">${likertResult.average?.toFixed(1) || 'N/A'}</span>
          <span class="stat-label">Promedio</span>
        </div>
        <div class="likert-stat">
          <span class="stat-value">${likertResult.median || 'N/A'}</span>
          <span class="stat-label">Mediana</span>
        </div>
      </div>
      <div class="distribution-bars">
        ${entries.map(entry => {
          const keyStr = String(entry.key);
          const minLabel = likertResult.minLabel || '';
          const maxLabel = likertResult.maxLabel || '';
          const min = 1;
          const max = 5;
          const labelSuffix = entry.key === min && minLabel ? ` (${minLabel})` : 
                             entry.key === max && maxLabel ? ` (${maxLabel})` : '';
          return `
            <div class="dist-bar-row">
              <span class="dist-label">${keyStr}${labelSuffix}</span>
              <div class="dist-bar-container">
                <div class="dist-bar" style="width: ${maxCount > 0 ? (entry.count / maxCount * 100) : 0}%"></div>
              </div>
              <span class="dist-value">${entry.count} (${entry.percentage}%)</span>
            </div>
          `;
        }).join('')}
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
    alert('Error al crear la encuesta');
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Crear Encuesta';
    }
  }
}

// ===========================================
// R1 - Modal de selección de escenario MEJORADO
// ===========================================

/**
 * Muestra el modal de selección de escenario antes de ejecutar una encuesta
 * MEJORADO: Con búsqueda, filtros por categoría y preview de impacto
 */
async function showScenarioSelectionModal(surveyId: string): Promise<void> {
  pendingSurveyId = surveyId;
  
  // Cargar escenarios disponibles
  const result = await listScenarios({ status: 'active', limit: 100 });
  if (result.success && result.data) {
    availableScenarios = result.data.scenarios;
  } else {
    availableScenarios = [];
  }
  
  // Crear modal
  const modal = document.createElement('div');
  modal.className = 'scenario-modal-overlay';
  modal.id = 'scenario-selection-modal';
  
  const hasScenarios = availableScenarios.length > 0;
  
  // Obtener categorías únicas para filtros
  const categories = [...new Set(availableScenarios.map(s => s.category))].sort();
  
  modal.innerHTML = `
    <div class="scenario-modal scenario-modal-enhanced">
      <div class="scenario-modal-header">
        <h3><span class="material-symbols-outlined" style="vertical-align: middle; margin-right: 8px;">psychology</span>Ejecutar Encuesta</h3>
        <button class="btn-icon btn-close-modal" title="Cerrar">×</button>
      </div>
      <div class="scenario-modal-body">
        <p class="scenario-modal-description">
          Selecciona un escenario para simular el impacto de eventos hipotéticos, 
          o ejecuta sin escenario para obtener resultados baseline.
        </p>
        
        ${hasScenarios ? `
          <!-- Barra de búsqueda y filtros -->
          <div class="scenario-filters">
            <div class="scenario-search">
              <span class="material-symbols-outlined">search</span>
              <input type="text" id="scenario-search-input" placeholder="Buscar escenarios..." />
            </div>
            <div class="scenario-filter-tags">
              <button class="filter-tag active" data-filter="all">Todos</button>
              ${categories.map(cat => `
                <button class="filter-tag" data-filter="${cat}">${formatCategoryLabel(cat)}</button>
              `).join('')}
            </div>
          </div>
          
          <div class="scenario-list-container">
            <!-- Baseline siempre primero -->
            <div class="scenario-option scenario-option-baseline" data-scenario-id="">
              <div class="scenario-option-header">
                <span class="material-symbols-outlined scenario-icon">check_circle</span>
                <span class="scenario-name">Baseline (sin escenario)</span>
                <span class="scenario-badge baseline">Baseline</span>
              </div>
              <p class="scenario-description">Ejecutar encuesta con estado actual de los agentes</p>
              <div class="scenario-impact-preview">
                <span class="impact-label">Impacto esperado:</span>
                <span class="impact-value neutral">Sin cambios</span>
              </div>
            </div>
            
            <!-- Lista de escenarios -->
            <div class="scenarios-list">
              ${availableScenarios.map(scenario => `
                <div class="scenario-option" data-scenario-id="${scenario.id}" data-category="${scenario.category}" data-name="${escapeHtml(scenario.name.toLowerCase())}">
                  <div class="scenario-option-header">
                    <span class="material-symbols-outlined scenario-icon">event</span>
                    <span class="scenario-name">${escapeHtml(scenario.name)}</span>
                    <span class="scenario-badge scenario-badge-${scenario.severity}">${scenario.severity}</span>
                  </div>
                  <p class="scenario-description">${escapeHtml(scenario.description || 'Sin descripción')}</p>
                  <div class="scenario-meta">
                    <span class="scenario-category">${formatCategoryLabel(scenario.category)}</span>
                    <span class="scenario-sentiment ${scenario.sentiment > 0 ? 'positive' : scenario.sentiment < 0 ? 'negative' : 'neutral'}">
                      ${getSentimentIcon(scenario.sentiment)} ${getSentimentLabel(scenario.sentiment)}
                    </span>
                    <span class="scenario-intensity" title="Intensidad: ${(scenario.intensity * 100).toFixed(0)}%">
                      <span class="intensity-bar">
                        <span class="intensity-fill" style="width: ${scenario.intensity * 100}%"></span>
                      </span>
                    </span>
                  </div>
                  <div class="scenario-impact-preview">
                    <span class="impact-label">Impacto esperado:</span>
                    <span class="impact-value ${getImpactClass(scenario)}">${getImpactLabel(scenario)}</span>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
          
          <div class="scenario-count">${availableScenarios.length} escenario${availableScenarios.length !== 1 ? 's' : ''} disponible${availableScenarios.length !== 1 ? 's' : ''}</div>
        ` : `
          <div class="scenario-empty">
            <span class="material-symbols-outlined" style="font-size: 48px; color: #6b7280;">event_busy</span>
            <p>No hay escenarios activos disponibles</p>
            <p class="scenario-empty-hint">Puedes crear escenarios en el Scenario Builder</p>
            <button class="btn btn-secondary btn-create-scenario" style="margin-top: 16px;">
              <span class="material-symbols-outlined">add</span> Crear Escenario
            </button>
          </div>
          
          <div class="scenario-option scenario-option-baseline scenario-option-selected" data-scenario-id="">
            <div class="scenario-option-header">
              <span class="material-symbols-outlined scenario-icon">check_circle</span>
              <span class="scenario-name">Baseline (sin escenario)</span>
            </div>
            <p class="scenario-description">Ejecutar encuesta con estado actual de los agentes</p>
          </div>
        `}
      </div>
      <div class="scenario-modal-footer">
        <button class="btn btn-secondary btn-cancel-modal">Cancelar</button>
        <button class="btn btn-primary btn-confirm-execution" disabled>
          <span class="btn-icon material-symbols-outlined">play_arrow</span>
          <span class="btn-text">Selecciona una opción</span>
        </button>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  // Estado de selección
  let selectedScenarioId: string | null = null;
  
  // Event listeners
  const closeModal = () => {
    modal.remove();
    pendingSurveyId = null;
  };
  
  modal.querySelector('.btn-close-modal')?.addEventListener('click', closeModal);
  modal.querySelector('.btn-cancel-modal')?.addEventListener('click', closeModal);
  
  // Cerrar al hacer click fuera
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });
  
  // Botón crear escenario (cuando no hay escenarios)
  modal.querySelector('.btn-create-scenario')?.addEventListener('click', () => {
    closeModal();
    window.location.href = '/scenarios';
  });
  
  // Búsqueda y filtros
  const searchInput = modal.querySelector('#scenario-search-input') as HTMLInputElement;
  const filterTags = modal.querySelectorAll('.filter-tag');
  const scenarioOptions = modal.querySelectorAll('.scenario-option');
  const confirmBtn = modal.querySelector('.btn-confirm-execution') as HTMLButtonElement;
  const confirmBtnText = confirmBtn?.querySelector('.btn-text');
  
  // Función de filtrado
  const filterScenarios = () => {
    const searchTerm = searchInput?.value.toLowerCase() || '';
    const activeFilter = modal.querySelector('.filter-tag.active')?.getAttribute('data-filter') || 'all';
    
    let visibleCount = 0;
    
    scenarioOptions.forEach(option => {
      const htmlOption = option as HTMLElement;
      if (option.classList.contains('scenario-option-baseline')) {
        htmlOption.style.display = '';
        return;
      }
      
      const name = option.getAttribute('data-name') || '';
      const category = option.getAttribute('data-category') || '';
      
      const matchesSearch = name.includes(searchTerm);
      const matchesFilter = activeFilter === 'all' || category === activeFilter;
      
      if (matchesSearch && matchesFilter) {
        htmlOption.style.display = '';
        visibleCount++;
      } else {
        htmlOption.style.display = 'none';
      }
    });
    
    // Actualizar contador
    const countEl = modal.querySelector('.scenario-count');
    if (countEl) {
      countEl.textContent = `${visibleCount} escenario${visibleCount !== 1 ? 's' : ''} disponible${visibleCount !== 1 ? 's' : ''}`;
    }
  };
  
  // Event listeners para búsqueda
  searchInput?.addEventListener('input', filterScenarios);
  
  // Event listeners para filtros
  filterTags.forEach(tag => {
    tag.addEventListener('click', () => {
      filterTags.forEach(t => t.classList.remove('active'));
      tag.classList.add('active');
      filterScenarios();
    });
  });
  
  // Selección de escenario
  scenarioOptions.forEach(option => {
    option.addEventListener('click', () => {
      // Quitar selección previa
      scenarioOptions.forEach(opt => opt.classList.remove('scenario-option-selected'));
      // Agregar selección actual
      option.classList.add('scenario-option-selected');
      
      selectedScenarioId = option.getAttribute('data-scenario-id') || null;
      
      // Habilitar botón de confirmar
      if (confirmBtn) {
        confirmBtn.disabled = false;
        if (confirmBtnText) {
          confirmBtnText.textContent = selectedScenarioId 
            ? 'Ejecutar con escenario' 
            : 'Ejecutar baseline';
        }
      }
    });
  });
  
  // Confirmar ejecución
  confirmBtn?.addEventListener('click', async () => {
    if (!pendingSurveyId) return;
    
    // Guardar el ID antes de cerrar el modal (que limpia pendingSurveyId)
    const surveyIdToExecute = pendingSurveyId;
    const scenarioIdToUse = selectedScenarioId || undefined;
    
    closeModal();
    await executeSurveyWithScenario(surveyIdToExecute, scenarioIdToUse);
  });
  
  // Seleccionar baseline por defecto si no hay escenarios
  if (!hasScenarios) {
    const baselineOption = modal.querySelector('.scenario-option-baseline');
    baselineOption?.classList.add('scenario-option-selected');
    if (confirmBtn) {
      confirmBtn.disabled = false;
      if (confirmBtnText) {
        confirmBtnText.textContent = 'Ejecutar baseline';
      }
    }
  }
}

// Helper functions para el modal mejorado
function formatCategoryLabel(category: string): string {
  const labels: Record<string, string> = {
    economy: 'Economía',
    government: 'Gobierno',
    social: 'Social',
    security: 'Seguridad',
    international: 'Internacional',
    environment: 'Medio Ambiente',
    other: 'Otro'
  };
  return labels[category] || category;
}

function getSentimentIcon(sentiment: number): string {
  if (sentiment > 0.3) return '↗️';
  if (sentiment > 0) return '↗';
  if (sentiment < -0.3) return '↘️';
  if (sentiment < 0) return '↘';
  return '➡️';
}

function getSentimentLabel(sentiment: number): string {
  if (sentiment > 0.5) return 'Muy positivo';
  if (sentiment > 0.2) return 'Positivo';
  if (sentiment < -0.5) return 'Muy negativo';
  if (sentiment < -0.2) return 'Negativo';
  return 'Neutral';
}

function getImpactClass(scenario: ScenarioEvent): string {
  const impact = Math.abs(scenario.sentiment) * scenario.intensity * scenario.salience;
  if (impact > 0.5) return 'high';
  if (impact > 0.25) return 'medium';
  return 'low';
}

function getImpactLabel(scenario: ScenarioEvent): string {
  const impact = Math.abs(scenario.sentiment) * scenario.intensity * scenario.salience;
  if (impact > 0.5) return 'Alto impacto';
  if (impact > 0.25) return 'Impacto moderado';
  return 'Bajo impacto';
}

/**
 * R2 - Muestra el modal de selección de escenario con un escenario pre-seleccionado
 * Usado cuando el usuario viene desde Scenario Builder con ?scenario=<id>
 */
async function showScenarioSelectionModalWithPreselection(surveyId: string, preSelectedScenarioId: string): Promise<void> {
  pendingSurveyId = surveyId;
  
  // Crear modal
  const modal = document.createElement('div');
  modal.className = 'scenario-modal-overlay';
  modal.id = 'scenario-selection-modal';
  
  const hasScenarios = availableScenarios.length > 0;
  const preSelectedScenario = availableScenarios.find(s => s.id === preSelectedScenarioId);
  
  // Obtener categorías únicas para filtros
  const categories = [...new Set(availableScenarios.map(s => s.category))].sort();
  
  modal.innerHTML = `
    <div class="scenario-modal scenario-modal-enhanced">
      <div class="scenario-modal-header">
        <h3><span class="material-symbols-outlined" style="vertical-align: middle; margin-right: 8px;">psychology</span>Ejecutar Encuesta</h3>
        <button class="btn-icon btn-close-modal" title="Cerrar">×</button>
      </div>
      <div class="scenario-modal-body">
        <p class="scenario-modal-description">
          Escenario pre-seleccionado desde Scenario Builder. 
          Puedes ejecutar con este escenario o seleccionar otro.
        </p>
        
        ${hasScenarios && preSelectedScenario ? `
          <!-- Escenario pre-seleccionado destacado -->
          <div class="scenario-preselected-notice">
            <span class="material-symbols-outlined">event</span>
            <span>Escenario pre-seleccionado: <strong>${escapeHtml(preSelectedScenario.name)}</strong></span>
          </div>
          
          <!-- Barra de búsqueda y filtros -->
          <div class="scenario-filters">
            <div class="scenario-search">
              <span class="material-symbols-outlined">search</span>
              <input type="text" id="scenario-search-input" placeholder="Buscar escenarios..." />
            </div>
            <div class="scenario-filter-tags">
              <button class="filter-tag active" data-filter="all">Todos</button>
              ${categories.map(cat => `
                <button class="filter-tag" data-filter="${cat}">${formatCategoryLabel(cat)}</button>
              `).join('')}
            </div>
          </div>
          
          <div class="scenario-list-container">
            <!-- Baseline siempre primero -->
            <div class="scenario-option scenario-option-baseline" data-scenario-id="">
              <div class="scenario-option-header">
                <span class="material-symbols-outlined scenario-icon">check_circle</span>
                <span class="scenario-name">Baseline (sin escenario)</span>
                <span class="scenario-badge baseline">Baseline</span>
              </div>
              <p class="scenario-description">Ejecutar encuesta con estado actual de los agentes</p>
              <div class="scenario-impact-preview">
                <span class="impact-label">Impacto esperado:</span>
                <span class="impact-value neutral">Sin cambios</span>
              </div>
            </div>
            
            <!-- Lista de escenarios -->
            <div class="scenarios-list">
              ${availableScenarios.map(scenario => `
                <div class="scenario-option ${scenario.id === preSelectedScenarioId ? 'scenario-option-selected' : ''}" data-scenario-id="${scenario.id}" data-category="${scenario.category}" data-name="${escapeHtml(scenario.name.toLowerCase())}">
                  <div class="scenario-option-header">
                    <span class="material-symbols-outlined scenario-icon">event</span>
                    <span class="scenario-name">${escapeHtml(scenario.name)}</span>
                    <span class="scenario-badge scenario-badge-${scenario.severity}">${scenario.severity}</span>
                    ${scenario.id === preSelectedScenarioId ? '<span class="preselected-indicator">✓ Pre-seleccionado</span>' : ''}
                  </div>
                  <p class="scenario-description">${escapeHtml(scenario.description || 'Sin descripción')}</p>
                  <div class="scenario-meta">
                    <span class="scenario-category">${formatCategoryLabel(scenario.category)}</span>
                    <span class="scenario-sentiment ${scenario.sentiment > 0 ? 'positive' : scenario.sentiment < 0 ? 'negative' : 'neutral'}">
                      ${getSentimentIcon(scenario.sentiment)} ${getSentimentLabel(scenario.sentiment)}
                    </span>
                    <span class="scenario-intensity" title="Intensidad: ${(scenario.intensity * 100).toFixed(0)}%">
                      <span class="intensity-bar">
                        <span class="intensity-fill" style="width: ${scenario.intensity * 100}%"></span>
                      </span>
                    </span>
                  </div>
                  <div class="scenario-impact-preview">
                    <span class="impact-label">Impacto esperado:</span>
                    <span class="impact-value ${getImpactClass(scenario)}">${getImpactLabel(scenario)}</span>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
          
          <div class="scenario-count">${availableScenarios.length} escenario${availableScenarios.length !== 1 ? 's' : ''} disponible${availableScenarios.length !== 1 ? 's' : ''}</div>
        ` : `
          <div class="scenario-empty">
            <span class="material-symbols-outlined" style="font-size: 48px; color: #6b7280;">event_busy</span>
            <p>El escenario pre-seleccionado no está disponible</p>
            <p class="scenario-empty-hint">Se ejecutará en modo baseline</p>
          </div>
          
          <div class="scenario-option scenario-option-baseline scenario-option-selected" data-scenario-id="">
            <div class="scenario-option-header">
              <span class="material-symbols-outlined scenario-icon">check_circle</span>
              <span class="scenario-name">Baseline (sin escenario)</span>
            </div>
            <p class="scenario-description">Ejecutar encuesta con estado actual de los agentes</p>
          </div>
        `}
      </div>
      <div class="scenario-modal-footer">
        <button class="btn btn-secondary btn-cancel-modal">Cancelar</button>
        <button class="btn btn-primary btn-confirm-execution" ${!preSelectedScenario ? 'disabled' : ''}>
          <span class="btn-icon material-symbols-outlined">play_arrow</span>
          <span class="btn-text">${preSelectedScenario ? 'Ejecutar con escenario' : 'Selecciona una opción'}</span>
        </button>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  // Estado de selección - por defecto el pre-seleccionado
  let selectedScenarioId: string | null = preSelectedScenarioId || null;
  
  // Event listeners
  const closeModal = () => {
    modal.remove();
    pendingSurveyId = null;
  };
  
  modal.querySelector('.btn-close-modal')?.addEventListener('click', closeModal);
  modal.querySelector('.btn-cancel-modal')?.addEventListener('click', closeModal);
  
  // Cerrar al hacer click fuera
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });
  
  // Búsqueda y filtros
  const searchInput = modal.querySelector('#scenario-search-input') as HTMLInputElement;
  const filterTags = modal.querySelectorAll('.filter-tag');
  const scenarioOptions = modal.querySelectorAll('.scenario-option');
  const confirmBtn = modal.querySelector('.btn-confirm-execution') as HTMLButtonElement;
  const confirmBtnText = confirmBtn?.querySelector('.btn-text');
  
  // Función de filtrado
  const filterScenarios = () => {
    const searchTerm = searchInput?.value.toLowerCase() || '';
    const activeFilter = modal.querySelector('.filter-tag.active')?.getAttribute('data-filter') || 'all';
    
    let visibleCount = 0;
    
    scenarioOptions.forEach(option => {
      const htmlOption = option as HTMLElement;
      if (option.classList.contains('scenario-option-baseline')) {
        htmlOption.style.display = '';
        return;
      }
      
      const name = option.getAttribute('data-name') || '';
      const category = option.getAttribute('data-category') || '';
      
      const matchesSearch = name.includes(searchTerm);
      const matchesFilter = activeFilter === 'all' || category === activeFilter;
      
      if (matchesSearch && matchesFilter) {
        htmlOption.style.display = '';
        visibleCount++;
      } else {
        htmlOption.style.display = 'none';
      }
    });
    
    // Actualizar contador
    const countEl = modal.querySelector('.scenario-count');
    if (countEl) {
      countEl.textContent = `${visibleCount} escenario${visibleCount !== 1 ? 's' : ''} disponible${visibleCount !== 1 ? 's' : ''}`;
    }
  };
  
  // Event listeners para búsqueda
  searchInput?.addEventListener('input', filterScenarios);
  
  // Event listeners para filtros
  filterTags.forEach(tag => {
    tag.addEventListener('click', () => {
      filterTags.forEach(t => t.classList.remove('active'));
      tag.classList.add('active');
      filterScenarios();
    });
  });
  
  // Selección de escenario
  scenarioOptions.forEach(option => {
    option.addEventListener('click', () => {
      // Quitar selección previa
      scenarioOptions.forEach(opt => opt.classList.remove('scenario-option-selected'));
      // Agregar selección actual
      option.classList.add('scenario-option-selected');
      
      selectedScenarioId = option.getAttribute('data-scenario-id') || null;
      
      // Habilitar botón de confirmar
      if (confirmBtn) {
        confirmBtn.disabled = false;
        if (confirmBtnText) {
          confirmBtnText.textContent = selectedScenarioId 
            ? 'Ejecutar con escenario' 
            : 'Ejecutar baseline';
        }
      }
    });
  });
  
  // Confirmar ejecución
  confirmBtn?.addEventListener('click', async () => {
    if (!pendingSurveyId) return;
    
    // Guardar el ID antes de cerrar el modal (que limpia pendingSurveyId)
    const surveyIdToExecute = pendingSurveyId;
    const scenarioIdToUse = selectedScenarioId || undefined;
    
    closeModal();
    await executeSurveyWithScenario(surveyIdToExecute, scenarioIdToUse);
  });
}

/**
 * Ejecuta una encuesta con un escenario opcional
 */
async function executeSurveyWithScenario(surveyId: string, scenarioEventId?: string): Promise<void> {
  const btn = document.querySelector(`[data-id="${surveyId}"].btn-run`);
  if (btn) {
    btn.innerHTML = '<span class="btn-icon material-symbols-outlined">hourglass_empty</span> Ejecutando...';
    (btn as HTMLButtonElement).disabled = true;
  }
  
  try {
    console.log(`🚀 Executing survey ${surveyId}${scenarioEventId ? ` with scenario ${scenarioEventId}` : ' (baseline)'}`);
    const run = await runSurvey(surveyId, scenarioEventId);
    
    // Show success and navigate to results
    currentRunId = run.id;
    await viewSurveyResults(surveyId);
    
  } catch (error) {
    console.error('Error ejecutando encuesta:', error);
    alert('Error al ejecutar la encuesta');
    if (btn) {
      btn.innerHTML = '<span class="btn-icon material-symbols-outlined">play_arrow</span> Ejecutar';
      (btn as HTMLButtonElement).disabled = false;
    }
  }
}

/**
 * @deprecated Usar executeSurveyWithScenario
 */
async function executeSurvey(surveyId: string): Promise<void> {
  return executeSurveyWithScenario(surveyId);
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

// ===========================================
// Comparison View
// ===========================================

function showComparisonSelector(): void {
  // Crear modal para seleccionar baseline y scenario
  const modal = document.createElement('div');
  modal.className = 'scenario-modal-overlay';
  modal.id = 'comparison-selector-modal';
  
  // Separar runs en baseline y scenario
  const baselineRuns = surveyRuns.filter(r => !r.metadata.scenarioEventId);
  const scenarioRuns = surveyRuns.filter(r => r.metadata.scenarioEventId);
  
  modal.innerHTML = `
    <div class="scenario-modal scenario-modal-enhanced">
      <div class="scenario-modal-header">
        <h3><span class="material-symbols-outlined" style="vertical-align: middle; margin-right: 8px;">compare_arrows</span>Comparar Ejecuciones</h3>
        <button class="btn-icon btn-close-modal" title="Cerrar">×</button>
      </div>
      <div class="scenario-modal-body">
        <p class="scenario-modal-description">
          Selecciona una ejecución baseline y una con escenario para comparar el impacto.
        </p>
        
        <div class="form-section">
          <h4>Baseline (sin escenario)</h4>
          <select id="baseline-run-select" class="run-select">
            ${baselineRuns.length === 0 ? '<option value="">No hay ejecuciones baseline</option>' : ''}
            ${baselineRuns.map(run => `
              <option value="${run.id}" ${run.id === currentRunId ? 'selected' : ''}>
                ${formatDate(run.completedAt)} - ${run.totalAgents} agentes
              </option>
            `).join('')}
          </select>
        </div>
        
        <div class="form-section">
          <h4>Con Escenario</h4>
          <select id="scenario-run-select" class="run-select">
            ${scenarioRuns.length === 0 ? '<option value="">No hay ejecuciones con escenario</option>' : ''}
            ${scenarioRuns.map(run => `
              <option value="${run.id}">
                ${run.metadata.scenarioName || 'Escenario'} - ${formatDate(run.completedAt)} - ${run.totalAgents} agentes
              </option>
            `).join('')}
          </select>
        </div>
        
        ${baselineRuns.length === 0 || scenarioRuns.length === 0 ? `
          <div class="comparison-hint" style="margin-top: 16px; padding: 12px; background: #fef3c7; border-radius: 8px; color: #92400e;">
            <span class="material-symbols-outlined" style="vertical-align: middle; margin-right: 8px;">info</span>
            Necesitas al menos una ejecución baseline y una con escenario para comparar.
          </div>
        ` : ''}
      </div>
      <div class="scenario-modal-footer">
        <button class="btn btn-secondary btn-cancel-modal">Cancelar</button>
        <button class="btn btn-primary btn-confirm-comparison" ${baselineRuns.length === 0 || scenarioRuns.length === 0 ? 'disabled' : ''}>
          <span class="btn-icon material-symbols-outlined">compare_arrows</span>
          Comparar
        </button>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  // Event listeners
  const closeModal = () => {
    modal.remove();
  };
  
  modal.querySelector('.btn-close-modal')?.addEventListener('click', closeModal);
  modal.querySelector('.btn-cancel-modal')?.addEventListener('click', closeModal);
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });
  
  // Confirm comparison
  modal.querySelector('.btn-confirm-comparison')?.addEventListener('click', async () => {
    const baselineSelect = modal.querySelector('#baseline-run-select') as HTMLSelectElement;
    const scenarioSelect = modal.querySelector('#scenario-run-select') as HTMLSelectElement;
    
    const baselineId = baselineSelect?.value;
    const scenarioId = scenarioSelect?.value;
    
    if (!baselineId || !scenarioId) {
      alert('Selecciona ambas ejecuciones para comparar');
      return;
    }
    
    closeModal();
    await loadComparison(baselineId, scenarioId);
  });
}

async function loadComparison(baselineId: string, scenarioId: string): Promise<void> {
  if (!currentSurvey) return;
  
  const loadingEl = document.createElement('div');
  loadingEl.className = 'state-container state-loading';
  loadingEl.innerHTML = `
    <div class="state-spinner"></div>
    <p class="state-message">Generando comparación...</p>
  `;
  
  const content = document.getElementById('surveys-content');
  if (content) {
    content.innerHTML = '';
    content.appendChild(loadingEl);
  }
  
  try {
    const comparison = await compareSurveyRuns(currentSurvey.id, baselineId, scenarioId);
    if (comparison) {
      comparisonData = comparison;
      currentView = 'comparison';
      refreshPage();
    } else {
      alert('No se pudo generar la comparación');
      currentView = 'results';
      refreshPage();
    }
  } catch (error) {
    console.error('Error loading comparison:', error);
    alert('Error al generar la comparación');
    currentView = 'results';
    refreshPage();
  }
}

async function renderComparison(container: HTMLElement): Promise<void> {
  if (!comparisonData || !currentSurvey) {
    container.appendChild(createErrorStateElement(
      '<span class="material-symbols-outlined" style="font-size: 48px; color: #f59e0b;">warning</span>',
      'No hay datos de comparación',
      'Selecciona dos ejecuciones para comparar',
      () => {
        currentView = 'results';
        refreshPage();
      }
    ));
    return;
  }
  
  const comparison = comparisonData;
  
  // Header de comparación
  const header = document.createElement('div');
  header.className = 'results-header comparison-header';
  header.innerHTML = `
    <div class="results-header-top">
      <div class="results-title-section">
        <h2 class="results-title">
          <span class="material-symbols-outlined" style="vertical-align: middle; margin-right: 8px;">compare_arrows</span>
          Comparación: ${escapeHtml(comparison.surveyName)}
        </h2>
        <p class="results-subtitle">Baseline vs ${escapeHtml(comparison.scenarioName || 'Escenario')}</p>
      </div>
      <div class="results-actions">
        <button class="btn btn-secondary btn-back-to-results">
          <span class="btn-icon material-symbols-outlined">arrow_back</span> Volver a Resultados
        </button>
      </div>
    </div>
    
    <!-- Summary Cards -->
    <div class="comparison-summary">
      <div class="summary-card impact-${comparison.summary.averageImpactScore >= 0.5 ? 'high' : comparison.summary.averageImpactScore >= 0.25 ? 'medium' : 'low'}">
        <span class="summary-value">${(comparison.summary.averageImpactScore * 100).toFixed(0)}%</span>
        <span class="summary-label">Impacto Promedio</span>
      </div>
      <div class="summary-card">
        <span class="summary-value">${comparison.summary.questionsWithHighImpact}</span>
        <span class="summary-label">Alto Impacto</span>
      </div>
      <div class="summary-card">
        <span class="summary-value">${comparison.summary.questionsWithMediumImpact}</span>
        <span class="summary-label">Impacto Medio</span>
      </div>
      <div class="summary-card">
        <span class="summary-value">${comparison.summary.questionsWithLowImpact}</span>
        <span class="summary-label">Impacto Bajo</span>
      </div>
    </div>
    
    <!-- Legend -->
    <div class="comparison-legend">
      <div class="legend-item">
        <span class="legend-color baseline"></span>
        <span class="legend-label">Baseline: ${escapeHtml(comparison.baselineRunName)}</span>
      </div>
      <div class="legend-item">
        <span class="legend-color scenario"></span>
        <span class="legend-label">Escenario: ${escapeHtml(comparison.scenarioRunName)}</span>
      </div>
    </div>
  `;
  container.appendChild(header);
  
  // Comparaciones por pregunta
  const comparisonsList = document.createElement('div');
  comparisonsList.className = 'comparisons-list';
  
  comparison.comparisons.forEach((comp, index) => {
    const compCard = document.createElement('div');
    compCard.className = `comparison-card impact-${comp.impact.level}`;
    compCard.innerHTML = renderQuestionComparison(comp, index + 1);
    comparisonsList.appendChild(compCard);
  });
  
  container.appendChild(comparisonsList);
  
  // Event listeners
  header.querySelector('.btn-back-to-results')?.addEventListener('click', () => {
    currentView = 'results';
    refreshPage();
  });
}

function renderQuestionComparison(comp: QuestionComparison, number: number): string {
  const isLikert = comp.questionType === 'likert_scale';
  
  // Calcular el máximo para las barras
  const allKeys = new Set([...Object.keys(comp.baseline.distribution), ...Object.keys(comp.scenario.distribution)]);
  let maxCount = 0;
  allKeys.forEach(key => {
    const baselineCount = comp.baseline.distribution[key]?.count || 0;
    const scenarioCount = comp.scenario.distribution[key]?.count || 0;
    maxCount = Math.max(maxCount, baselineCount, scenarioCount);
  });
  
  // Generar filas de comparación
  const sortedKeys = Array.from(allKeys).sort((a, b) => {
    // Para Likert, ordenar numéricamente
    if (isLikert) {
      return parseInt(a) - parseInt(b);
    }
    // Para single_choice, ordenar por count total
    const countA = (comp.baseline.distribution[a]?.count || 0) + (comp.scenario.distribution[a]?.count || 0);
    const countB = (comp.baseline.distribution[b]?.count || 0) + (comp.scenario.distribution[b]?.count || 0);
    return countB - countA;
  });
  
  const comparisonRows = sortedKeys.map(key => {
    const baselineData = comp.baseline.distribution[key] || { count: 0, percentage: 0, label: key };
    const scenarioData = comp.scenario.distribution[key] || { count: 0, percentage: 0, label: key };
    const deltaData = comp.delta.distribution[key] || { countDelta: 0, percentageDelta: 0, percentagePoints: 0 };
    
    const deltaClass = deltaData.percentagePoints > 0 ? 'positive' : deltaData.percentagePoints < 0 ? 'negative' : 'neutral';
    const deltaIcon = deltaData.percentagePoints > 0 ? '↗' : deltaData.percentagePoints < 0 ? '↘' : '→';
    
    return `
      <div class="comparison-row">
        <div class="comparison-label">${escapeHtml(baselineData.label)}</div>
        <div class="comparison-bars">
          <div class="comparison-bar-group">
            <div class="bar-baseline" style="width: ${maxCount > 0 ? (baselineData.count / maxCount * 100) : 0}%"></div>
            <span class="bar-value">${baselineData.count} (${baselineData.percentage}%)</span>
          </div>
          <div class="comparison-bar-group">
            <div class="bar-scenario" style="width: ${maxCount > 0 ? (scenarioData.count / maxCount * 100) : 0}%"></div>
            <span class="bar-value">${scenarioData.count} (${scenarioData.percentage}%)</span>
          </div>
        </div>
        <div class="comparison-delta ${deltaClass}">
          <span class="delta-icon">${deltaIcon}</span>
          <span class="delta-value">${deltaData.percentagePoints > 0 ? '+' : ''}${deltaData.percentagePoints}pp</span>
        </div>
      </div>
    `;
  }).join('');
  
  // Estadísticas para Likert
  let statsHtml = '';
  if (isLikert && comp.baseline.average !== undefined && comp.scenario.average !== undefined) {
    const avgDelta = comp.delta.averageDelta || 0;
    const avgDeltaClass = avgDelta > 0 ? 'positive' : avgDelta < 0 ? 'negative' : 'neutral';
    
    statsHtml = `
      <div class="comparison-stats">
        <div class="stat-item">
          <span class="stat-label">Promedio Baseline</span>
          <span class="stat-value">${comp.baseline.average.toFixed(2)}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">Promedio Escenario</span>
          <span class="stat-value">${comp.scenario.average.toFixed(2)}</span>
        </div>
        <div class="stat-item ${avgDeltaClass}">
          <span class="stat-label">Δ Promedio</span>
          <span class="stat-value">${avgDelta > 0 ? '+' : ''}${avgDelta.toFixed(2)}</span>
        </div>
      </div>
    `;
  }
  
  // Badge de impacto
  const impactBadgeClass = `impact-badge-${comp.impact.level}`;
  const impactIcon = comp.impact.level === 'high' ? '🔴' : comp.impact.level === 'medium' ? '🟡' : comp.impact.level === 'low' ? '🟢' : '⚪';
  
  return `
    <div class="comparison-card-header">
      <div class="question-info">
        <span class="question-number">${number}</span>
        <span class="question-type-badge">${isLikert ? 'Escala Likert' : 'Opción única'}</span>
      </div>
      <div class="impact-badge ${impactBadgeClass}">
        <span class="impact-icon">${impactIcon}</span>
        <span class="impact-text">${comp.impact.description}</span>
        <span class="impact-score">${(comp.impact.score * 100).toFixed(0)}%</span>
      </div>
    </div>
    <h4 class="question-text">${escapeHtml(comp.questionText)}</h4>
    ${statsHtml}
    <div class="comparison-rows">
      ${comparisonRows}
    </div>
  `;
}

/**
 * Cleanup function (required by main.ts)
 */
export function cleanupSurveysPage(): void {
  currentSurvey = null;
  currentResults = null;
  currentRunId = null;
  surveyRuns = [];
  comparisonData = null;
  console.log('Surveys page cleaned up');
}

