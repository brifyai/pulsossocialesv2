/**
 * Scenario Builder Page - Panel moderno de gestión de escenarios
 *
 * Permite a usuarios crear escenarios de eventos, ejecutar simulaciones
 * y ver resultados comparativos en una interfaz profesional tipo dashboard.
 */

import type { CreateScenarioInput, ScenarioEvent } from '../app/events/scenarioEventStore';
import { createScenario, listScenarios, deleteScenario } from '../app/events/scenarioEventStore';
import { runSurvey } from '../app/survey/surveyRunner';
import { getAllAgents } from '../data/syntheticAgents';

// Estado local
let currentView: 'list' | 'form' | 'success' | 'simulation' | 'results' = 'list';
let isSubmitting = false;
let isSimulating = false;
let isLoading = false;
let createdScenarioId: string | null = null;
let scenariosList: ScenarioEvent[] = [];
let listError: string | null = null;

  // Filtros y búsqueda
  let searchQuery = '';
  let selectedCategory: string | undefined = undefined;
  let selectedSeverity: string | undefined = undefined;

// Contador de renders para debugging
let renderCount = 0;

// Resultados de simulación
let simulationResults: {
  baseline: { [questionId: string]: { distribution: { [option: string]: number }; confidence: number } };
  scenario: { [questionId: string]: { distribution: { [option: string]: number }; confidence: number } };
  delta: { [questionId: string]: { [option: string]: number } };
} | null = null;

// Opciones para los selects
const CATEGORY_OPTIONS = [
  { value: 'economy', label: 'Economía' },
  { value: 'government', label: 'Gobierno' },
  { value: 'social', label: 'Social' },
  { value: 'security', label: 'Seguridad' },
  { value: 'international', label: 'Internacional' },
  { value: 'environment', label: 'Medio Ambiente' },
  { value: 'other', label: 'Otro' },
];

// Mapeo de claves canónicas a labels humanos
const CANONICAL_LABELS: Record<string, string> = {
  // Aprobación
  approve: 'Aprueba',
  disapprove: 'Desaprueba',
  no_response: 'No responde',
  no_opinion: 'Sin opinión',
  // Dirección del país
  good_path: 'Buen camino',
  bad_path: 'Mal camino',
  // Optimismo/Pesimismo
  very_optimistic: 'Muy optimista',
  optimistic: 'Optimista',
  pessimistic: 'Pesimista',
  very_pessimistic: 'Muy pesimista',
  // Economía
  very_good: 'Muy buena',
  good: 'Buena',
  bad: 'Mala',
  very_bad: 'Muy mala',
  regular: 'Regular',
  // Genéricos (fallback)
  option_a: 'Opción A',
  option_b: 'Opción B',
  option_c: 'Opción C',
  option_d: 'Opción D',
};

const SEVERITY_OPTIONS = [
  { value: 'minor', label: 'Menor' },
  { value: 'moderate', label: 'Moderado' },
  { value: 'major', label: 'Mayor' },
];

const SIMULATION_MODE_OPTIONS = [
  { value: 'baseline', label: 'Solo baseline' },
  { value: 'scenario', label: 'Solo escenario' },
  { value: 'baseline_vs_scenario', label: 'Comparar baseline vs escenario' },
];

// Valores iniciales del formulario
const INITIAL_FORM_DATA: CreateScenarioInput = {
  name: '',
  description: '',
  category: 'economy',
  sentiment: 0,
  intensity: 0.5,
  salience: 0.7,
  severity: 'moderate',
  targetEntities: [],
};

// Configuración de simulación
let simulationConfig = {
  sampleSize: 100,
  mode: 'baseline_vs_scenario' as 'baseline' | 'scenario' | 'baseline_vs_scenario',
};

// Estado del formulario
let formData: CreateScenarioInput = { ...INITIAL_FORM_DATA };
let formErrors: { [key: string]: string } = {};

// ===========================================
// Main Page Component
// ===========================================

export async function createScenarioBuilderPage(): Promise<HTMLElement> {
  console.log('[SB] createScenarioBuilderPage START');

  // Reset render counter for new page instance
  renderCount = 0;

  const page = document.createElement('div');
  page.className = 'page scenario-builder-page';
  page.id = 'scenario-builder-page';

  // Always reset to list view when creating page to avoid stale state
  currentView = 'list';

  // Load scenarios before first render
  await loadScenarios();

  // Renderizar contenido
  renderContent(page);

  console.log('[SB] createScenarioBuilderPage END - page children:', page.children.length, 'total renders:', renderCount);
  return page;
}

/**
 * Renderiza el contenido según la vista actual
 */
function renderContent(container: HTMLElement): void {
  renderCount++;
  console.log(`[SB] renderContent START #${renderCount} - view=${currentView}, container children before clear:`, container.children.length);

  // Verificar si ya renderizamos recientemente (posible doble render)
  if (renderCount > 1) {
    console.warn(`[SB] renderContent #${renderCount} - WARNING: Multiple renders detected!`);
  }

  container.innerHTML = '';

  // Render según vista
  switch (currentView) {
    case 'list':
      renderScenariosList(container);
      break;
    case 'form':
      renderForm(container);
      break;
    case 'success':
      renderSuccess(container);
      break;
    case 'simulation':
      renderSimulationConfig(container);
      break;
    case 'results':
      renderResults(container);
      break;
  }

  console.log(`[SB] renderContent END #${renderCount} - container has:`, container.children.length, 'children');
}

// ===========================================
// Scenarios List View - Dashboard Moderno
// ===========================================

async function loadScenarios(): Promise<void> {
  isLoading = true;
  listError = null;

  const result = await listScenarios({ limit: 50 });

  if (result.success && result.data) {
    scenariosList = result.data.scenarios;
  } else {
    listError = result.error || 'Error al cargar escenarios';
    scenariosList = [];
  }

  isLoading = false;
}

function getFilteredScenarios(): ScenarioEvent[] {
  return scenariosList.filter(scenario => {
    // Filtro de búsqueda
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesSearch =
        scenario.name.toLowerCase().includes(query) ||
        (scenario.description && scenario.description.toLowerCase().includes(query));
      if (!matchesSearch) return false;
    }

    // Filtro de categoría
    if (selectedCategory && scenario.category !== selectedCategory) {
      return false;
    }

    // Filtro de severidad
    if (selectedSeverity && scenario.severity !== selectedSeverity) {
      return false;
    }

    return true;
  });
}

function getCategoryStats(): { [key: string]: number } {
  const stats: { [key: string]: number } = {};
  CATEGORY_OPTIONS.forEach(cat => {
    stats[cat.value] = scenariosList.filter(s => s.category === cat.value).length;
  });
  return stats;
}

function getSeverityStats(): { [key: string]: number } {
  const stats: { [key: string]: number } = {};
  SEVERITY_OPTIONS.forEach(sev => {
    stats[sev.value] = scenariosList.filter(s => s.severity === sev.value).length;
  });
  return stats;
}

function renderScenariosList(container: HTMLElement): void {
  console.log('[SB] renderScenariosList START - scenariosList.length:', scenariosList.length);

  const listContainer = document.createElement('div');
  listContainer.className = 'scenarios-list-container';

  // Dashboard Header Moderno
  const dashboardHeader = document.createElement('div');
  dashboardHeader.className = 'scenarios-dashboard-header';
  dashboardHeader.innerHTML = `
    <div class="header-content">
      <h1 class="header-title">
        <div class="icon-wrapper">
          <span class="material-symbols-outlined">psychology</span>
        </div>
        Escenarios Hipotéticos
      </h1>
      <p class="header-subtitle">Gestiona tus escenarios y simula impactos en las opiniones públicas</p>
    </div>
    <div class="header-actions">
      <button type="button" class="btn btn-primary btn-lg" id="btn-create-scenario">
        <span class="material-symbols-outlined">add</span>
        Crear Escenario
      </button>
    </div>
  `;
  listContainer.appendChild(dashboardHeader);

  // Barra de herramientas con filtros
  const filteredScenarios = getFilteredScenarios();
  const categoryStats = getCategoryStats();
  const severityStats = getSeverityStats();

  const toolbar = document.createElement('div');
  toolbar.className = 'scenarios-toolbar';
  toolbar.innerHTML = `
    <div class="toolbar-row top-row">
      <div class="scenarios-stats">
        <div class="stat-item">
          <span class="stat-value">${filteredScenarios.length}</span>
          <span class="stat-label">escenarios</span>
        </div>
        ${selectedCategory || selectedSeverity || searchQuery ? `
          <div class="stat-item">
            <span class="stat-value" style="color: var(--sb-primary);">${scenariosList.length}</span>
            <span class="stat-label">total</span>
          </div>
        ` : ''}
      </div>
      <div class="search-box">
        <span class="material-symbols-outlined search-icon">search</span>
        <input
          type="text"
          id="scenario-search"
          placeholder="Buscar escenarios..."
          value="${escapeHtml(searchQuery)}"
        />
      </div>
    </div>
    <div class="toolbar-row">
      <div class="filter-chips">
        <span class="filter-label">Categorías:</span>
        ${CATEGORY_OPTIONS.map(cat => `
          <button type="button" class="chip ${selectedCategory === cat.value ? 'active' : ''}" data-filter="category" data-value="${cat.value}">
            ${cat.label}
            <span class="count">${categoryStats[cat.value] || 0}</span>
          </button>
        `).join('')}
      </div>
    </div>
    <div class="toolbar-row">
      <div class="filter-chips">
        <span class="filter-label">Severidad:</span>
        ${SEVERITY_OPTIONS.map(sev => `
          <button type="button" class="chip ${selectedSeverity === sev.value ? 'active' : ''}" data-filter="severity" data-value="${sev.value}">
            ${sev.label}
            <span class="count">${severityStats[sev.value] || 0}</span>
          </button>
        `).join('')}
        ${selectedCategory || selectedSeverity ? `
          <button type="button" class="chip" id="btn-clear-filters" style="margin-left: auto;">
            <span class="material-symbols-outlined" style="font-size: 14px;">close</span>
            Limpiar filtros
          </button>
        ` : ''}
      </div>
    </div>
  `;
  listContainer.appendChild(toolbar);

  // Error message
  if (listError) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'scenarios-error';
    errorDiv.innerHTML = `
      <span class="material-symbols-outlined">error</span>
      <span>${escapeHtml(listError)}</span>
      <button type="button" class="btn btn-secondary btn-sm" id="btn-retry-load" style="margin-left: 12px;">
        Reintentar
      </button>
    `;
    listContainer.appendChild(errorDiv);
  }

  // Loading state
  if (isLoading) {
    const loadingDiv = document.createElement('div');
    loadingDiv.className = 'scenarios-loading';
    loadingDiv.innerHTML = `
      <div class="loading-spinner"></div>
      <p>Cargando escenarios...</p>
    `;
    listContainer.appendChild(loadingDiv);
  }

  // Empty state
  else if (filteredScenarios.length === 0 && !listError) {
    const emptyDiv = document.createElement('div');
    emptyDiv.className = 'scenarios-empty';
    emptyDiv.innerHTML = `
      <div class="empty-icon">
        <span class="material-symbols-outlined">psychology</span>
      </div>
      <h3>${searchQuery || selectedCategory || selectedSeverity ? 'No se encontraron escenarios' : 'No hay escenarios creados'}</h3>
      <p>${searchQuery || selectedCategory || selectedSeverity
        ? 'Intenta ajustar los filtros o la búsqueda para ver más resultados.'
        : 'Crea tu primer escenario para comenzar a simular impactos en las opiniones públicas.'}</p>
      ${!(searchQuery || selectedCategory || selectedSeverity) ? `
        <button type="button" class="btn btn-primary btn-lg" id="btn-create-first-scenario">
          <span class="material-symbols-outlined">add</span>
          Crear Primer Escenario
        </button>
      ` : ''}
    `;
    listContainer.appendChild(emptyDiv);
  }

  // Scenarios grid
  else if (filteredScenarios.length > 0) {
    const gridDiv = document.createElement('div');
    gridDiv.className = 'scenarios-grid';

    filteredScenarios.forEach(scenario => {
      const card = document.createElement('div');
      card.className = 'scenario-card';
      card.innerHTML = `
        <div class="scenario-card-header">
          <div class="scenario-card-badges">
            <span class="badge-category ${scenario.category}">${getCategoryLabel(scenario.category)}</span>
            <span class="badge-severity ${scenario.severity}">${getSeverityLabel(scenario.severity)}</span>
          </div>
        </div>
        <div class="scenario-card-content">
          <h4 class="scenario-name">${escapeHtml(scenario.name)}</h4>
          <p class="scenario-description">${escapeHtml(scenario.description || 'Sin descripción')}</p>
        </div>
        <div class="scenario-metrics">
          <div class="metric-box">
            <span class="metric-icon material-symbols-outlined">sentiment_satisfied</span>
            <span class="metric-value ${getSentimentClass(scenario.sentiment)}">${getSentimentShortLabel(scenario.sentiment)}</span>
            <span class="metric-label">Sentimiento</span>
          </div>
          <div class="metric-box">
            <span class="metric-icon material-symbols-outlined">speed</span>
            <span class="metric-value">${(scenario.intensity * 100).toFixed(0)}%</span>
            <span class="metric-label">Intensidad</span>
          </div>
          <div class="metric-box">
            <span class="metric-icon material-symbols-outlined">visibility</span>
            <span class="metric-value">${(scenario.salience * 100).toFixed(0)}%</span>
            <span class="metric-label">Visibilidad</span>
          </div>
        </div>
        <div class="scenario-card-actions">
          <button type="button" class="btn btn-primary btn-sm" data-action="simulate" data-id="${scenario.id}">
            <span class="material-symbols-outlined">play_arrow</span>
            Simular
          </button>
          <button type="button" class="btn btn-secondary btn-sm" data-action="duplicate" data-id="${scenario.id}">
            <span class="material-symbols-outlined">content_copy</span>
            Duplicar
          </button>
          <button type="button" class="btn btn-ghost btn-icon" data-action="delete" data-id="${scenario.id}" title="Eliminar">
            <span class="material-symbols-outlined">delete</span>
          </button>
        </div>
        <div class="scenario-card-footer">
          <div class="scenario-date">
            <span class="material-symbols-outlined" style="font-size: 14px;">schedule</span>
            ${formatDate(scenario.createdAt)}
          </div>
        </div>
      `;
      gridDiv.appendChild(card);
    });

    listContainer.appendChild(gridDiv);
  }

  container.appendChild(listContainer);
  console.log('[SB] renderScenariosList END - container now has:', container.children.length, 'children');

  // Attach event listeners
  dashboardHeader.querySelector('#btn-create-scenario')?.addEventListener('click', () => {
    currentView = 'form';
    const page = document.getElementById('scenario-builder-page');
    if (page) renderContent(page);
  });

  listContainer.querySelector('#btn-create-first-scenario')?.addEventListener('click', () => {
    currentView = 'form';
    const page = document.getElementById('scenario-builder-page');
    if (page) renderContent(page);
  });

  listContainer.querySelector('#btn-retry-load')?.addEventListener('click', () => {
    loadScenarios();
    const page = document.getElementById('scenario-builder-page');
    if (page) renderContent(page);
  });

  // Search input
  const searchInput = listContainer.querySelector('#scenario-search') as HTMLInputElement;
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      searchQuery = (e.target as HTMLInputElement).value;
      const page = document.getElementById('scenario-builder-page');
      if (page) renderContent(page);
    });
  }

  // Filter chips
  listContainer.querySelectorAll('[data-filter="category"]').forEach(chip => {
    chip.addEventListener('click', (e) => {
      const value = (e.currentTarget as HTMLElement).dataset.value;
      selectedCategory = selectedCategory === value ? undefined : value;
      const page = document.getElementById('scenario-builder-page');
      if (page) renderContent(page);
    });
  });

  listContainer.querySelectorAll('[data-filter="severity"]').forEach(chip => {
    chip.addEventListener('click', (e) => {
      const value = (e.currentTarget as HTMLElement).dataset.value;
      selectedSeverity = selectedSeverity === value ? undefined : value;
      const page = document.getElementById('scenario-builder-page');
      if (page) renderContent(page);
    });
  });

  // Clear filters
  listContainer.querySelector('#btn-clear-filters')?.addEventListener('click', () => {
    searchQuery = '';
    selectedCategory = undefined;
    selectedSeverity = undefined;
    const page = document.getElementById('scenario-builder-page');
    if (page) renderContent(page);
  });

  // Card action buttons
  listContainer.querySelectorAll('[data-action="simulate"]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = (e.currentTarget as HTMLElement).dataset.id;
      if (id) {
        createdScenarioId = id;
        currentView = 'simulation';
        const page = document.getElementById('scenario-builder-page');
        if (page) renderContent(page);
      }
    });
  });

  listContainer.querySelectorAll('[data-action="duplicate"]').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const id = (e.currentTarget as HTMLElement).dataset.id;
      if (id) {
        const scenario = scenariosList.find(s => s.id === id);
        if (scenario) {
          formData = {
            name: `${scenario.name} (copia)`,
            description: scenario.description || '',
            category: scenario.category,
            sentiment: scenario.sentiment,
            intensity: scenario.intensity,
            salience: scenario.salience,
            severity: scenario.severity,
            targetEntities: scenario.targetEntities || [],
          };
          currentView = 'form';
          const page = document.getElementById('scenario-builder-page');
          if (page) renderContent(page);
        }
      }
    });
  });

  listContainer.querySelectorAll('[data-action="delete"]').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const id = (e.currentTarget as HTMLElement).dataset.id;
      if (id && confirm('¿Estás seguro de que deseas eliminar este escenario?')) {
        const result = await deleteScenario(id);
        if (result.success) {
          await loadScenarios();
          const page = document.getElementById('scenario-builder-page');
          if (page) renderContent(page);
        } else {
          alert('Error al eliminar el escenario: ' + result.error);
        }
      }
    });
  });
}

function getCategoryLabel(category: string): string {
  const labels: Record<string, string> = {
    economy: 'Economía',
    government: 'Gobierno',
    social: 'Social',
    security: 'Seguridad',
    international: 'Internacional',
    environment: 'Medio Ambiente',
    other: 'Otro',
  };
  return labels[category] || category;
}

function getSeverityLabel(severity: string): string {
  const labels: Record<string, string> = {
    minor: 'Menor',
    moderate: 'Moderado',
    major: 'Mayor',
    critical: 'Crítico',
  };
  return labels[severity] || severity;
}

function getSentimentClass(sentiment: number): string {
  if (sentiment > 0) return 'positive';
  if (sentiment < 0) return 'negative';
  return 'neutral';
}

function getSentimentShortLabel(sentiment: number): string {
  if (sentiment > 0.5) return 'Positivo';
  if (sentiment > 0) return 'Leve +';
  if (sentiment < -0.5) return 'Negativo';
  if (sentiment < 0) return 'Leve -';
  return 'Neutral';
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('es-CL', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

// ===========================================
// Form View
// ===========================================

function renderForm(container: HTMLElement): void {
  // Header del formulario
  const header = document.createElement('div');
  header.className = 'scenario-header';
  header.innerHTML = `
    <h1 class="page-title">
      <span class="material-symbols-outlined">add_circle</span>
      Crear Escenario
    </h1>
    <p class="page-subtitle">Define un evento hipotético para simular su impacto en las opiniones públicas</p>
  `;
  container.appendChild(header);

  const form = document.createElement('form');
  form.className = 'scenario-form';
  form.id = 'scenario-create-form';

  form.innerHTML = `
    <!-- Sección 1: Información Básica -->
    <div class="form-section">
      <h3 class="section-title">
        <span class="material-symbols-outlined">info</span>
        Información Básica
      </h3>

      <div class="form-group">
        <label for="scenario-name">Nombre del escenario *</label>
        <input
          type="text"
          id="scenario-name"
          name="name"
          value="${escapeHtml(formData.name)}"
          placeholder="Ej: Crisis económica por alza de impuestos"
          maxlength="100"
          class="${formErrors.name ? 'input-error' : ''}"
        />
        ${formErrors.name ? `<span class="error-text">${escapeHtml(formErrors.name)}</span>` : ''}
      </div>

      <div class="form-group">
        <label for="scenario-description">Descripción</label>
        <textarea
          id="scenario-description"
          name="description"
          rows="3"
          placeholder="Describe el escenario hipotético..."
          maxlength="500"
        >${escapeHtml(formData.description)}</textarea>
        <span class="form-hint">Esta descripción te ayudará a identificar el escenario más tarde</span>
      </div>

      <div class="form-group">
        <label for="scenario-category">Categoría del evento *</label>
        <select
          id="scenario-category"
          name="category"
          class="${formErrors.category ? 'input-error' : ''}"
        >
          ${CATEGORY_OPTIONS.map((option) => `
            <option value="${option.value}" ${formData.category === option.value ? 'selected' : ''}>
              ${option.label}
            </option>
          `).join('')}
        </select>
        ${formErrors.category ? `<span class="error-text">${escapeHtml(formErrors.category)}</span>` : ''}
      </div>
    </div>

    <!-- Sección 2: Métricas del Evento -->
    <div class="form-section">
      <h3 class="section-title">
        <span class="material-symbols-outlined">analytics</span>
        Métricas del Evento
      </h3>

      <!-- Sentiment Slider -->
      <div class="form-group">
        <label for="scenario-sentiment">Sentimiento del evento</label>
        <div class="slider-container">
          <input
            type="range"
            id="scenario-sentiment"
            name="sentiment"
            min="-1"
            max="1"
            step="0.1"
            value="${formData.sentiment}"
            class="slider"
          />
          <div class="slider-labels">
            <span>Muy negativo</span>
            <span class="slider-value" id="sentiment-value">
              ${formData.sentiment.toFixed(1)} - ${getSentimentLabel(formData.sentiment)}
            </span>
            <span>Muy positivo</span>
          </div>
        </div>
        ${formErrors.sentiment ? `<span class="error-text">${escapeHtml(formErrors.sentiment)}</span>` : ''}
      </div>

      <!-- Intensity Slider -->
      <div class="form-group">
        <label for="scenario-intensity">Intensidad del impacto</label>
        <div class="slider-container">
          <input
            type="range"
            id="scenario-intensity"
            name="intensity"
            min="0"
            max="1"
            step="0.1"
            value="${formData.intensity}"
            class="slider"
          />
          <div class="slider-labels">
            <span>Débil</span>
            <span class="slider-value" id="intensity-value">
              ${formData.intensity.toFixed(1)} - ${getIntensityLabel(formData.intensity)}
            </span>
            <span>Fuerte</span>
          </div>
        </div>
        <span class="form-hint">Qué tan fuerte es el impacto emocional del evento</span>
        ${formErrors.intensity ? `<span class="error-text">${escapeHtml(formErrors.intensity)}</span>` : ''}
      </div>

      <!-- Salience Slider -->
      <div class="form-group">
        <label for="scenario-salience">Visibilidad del evento</label>
        <div class="slider-container">
          <input
            type="range"
            id="scenario-salience"
            name="salience"
            min="0"
            max="1"
            step="0.1"
            value="${formData.salience}"
            class="slider"
          />
          <div class="slider-labels">
            <span>Poco visible</span>
            <span class="slider-value" id="salience-value">
              ${formData.salience.toFixed(1)} - ${getSalienceLabel(formData.salience)}
            </span>
            <span>Muy visible</span>
          </div>
        </div>
        <span class="form-hint">Qué tan presente está el evento en la opinión pública</span>
        ${formErrors.salience ? `<span class="error-text">${escapeHtml(formErrors.salience)}</span>` : ''}
      </div>

      <!-- Severity Radio -->
      <div class="form-group">
        <label>Severidad del evento</label>
        <div class="radio-group">
          ${SEVERITY_OPTIONS.map((option) => `
            <label class="radio-option">
              <input
                type="radio"
                name="severity"
                value="${option.value}"
                ${formData.severity === option.value ? 'checked' : ''}
              />
              <span class="radio-label">${option.label}</span>
            </label>
          `).join('')}
        </div>
      </div>
    </div>

    <!-- Botones de acción -->
    <div class="form-actions">
      <button type="button" class="btn btn-secondary" id="btn-cancel">
        <span class="material-symbols-outlined">arrow_back</span>
        Volver
      </button>
      <button type="submit" class="btn btn-primary" id="btn-submit" ${isSubmitting ? 'disabled' : ''}>
        <span class="material-symbols-outlined">save</span>
        ${isSubmitting ? 'Guardando...' : 'Guardar y Simular'}
      </button>
    </div>
  `;

  container.appendChild(form);

  // Attach listeners
  attachFormListeners(form);
}

function attachFormListeners(form: HTMLFormElement): void {
  // Input changes
  form.querySelectorAll('input[type="text"], textarea').forEach((input) => {
    input.addEventListener('input', (e) => {
      const target = e.target as HTMLInputElement | HTMLTextAreaElement;
      const { name, value } = target;
      (formData as any)[name] = value;

      if (formErrors[name]) {
        delete formErrors[name];
        target.classList.remove('input-error');
        const errorEl = target.parentElement?.querySelector('.error-text');
        if (errorEl) errorEl.remove();
      }
    });
  });

  // Select changes
  form.querySelectorAll('select').forEach((select) => {
    select.addEventListener('change', (e) => {
      const target = e.target as HTMLSelectElement;
      const { name, value } = target;
      (formData as any)[name] = value;

      if (formErrors[name]) {
        delete formErrors[name];
        target.classList.remove('input-error');
        const errorEl = target.parentElement?.querySelector('.error-text');
        if (errorEl) errorEl.remove();
      }
    });
  });

  // Slider changes
  form.querySelectorAll('input[type="range"]').forEach((slider) => {
    slider.addEventListener('input', (e) => {
      const target = e.target as HTMLInputElement;
      const { name, value } = target;
      const numValue = parseFloat(value);
      (formData as any)[name] = numValue;

      const valueEl = document.getElementById(`${name}-value`);
      if (valueEl) {
        let label = '';
        if (name === 'sentiment') label = getSentimentLabel(numValue);
        else if (name === 'intensity') label = getIntensityLabel(numValue);
        else if (name === 'salience') label = getSalienceLabel(numValue);
        valueEl.textContent = `${numValue.toFixed(1)} - ${label}`;
      }

      if (formErrors[name]) {
        delete formErrors[name];
        const errorEl = target.parentElement?.parentElement?.querySelector('.error-text');
        if (errorEl) errorEl.remove();
      }
    });
  });

  // Radio changes
  form.querySelectorAll('input[type="radio"]').forEach((radio) => {
    radio.addEventListener('change', (e) => {
      const target = e.target as HTMLInputElement;
      formData.severity = target.value as 'minor' | 'moderate' | 'major';
    });
  });

  // Cancel button
  form.querySelector('#btn-cancel')?.addEventListener('click', () => {
    currentView = 'list';
    const page = document.getElementById('scenario-builder-page');
    if (page) renderContent(page);
  });

  // Form submit
  form.addEventListener('submit', handleFormSubmit);
}

async function handleFormSubmit(e: Event): Promise<void> {
  e.preventDefault();

  if (!validateForm()) {
    const page = document.getElementById('scenario-builder-page');
    if (page) renderContent(page);
    return;
  }

  isSubmitting = true;

  const submitBtn = document.getElementById('btn-submit') as HTMLButtonElement;
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="material-symbols-outlined">hourglass_empty</span> Guardando...';
  }

  try {
    const result = await createScenario(formData);

    if (!result.success || !result.data) {
      throw new Error(result.error || 'Failed to create scenario');
    }

    const scenario = result.data;
    createdScenarioId = scenario.id;
    console.log('Escenario creado:', scenario);

    // Ir directamente a configuración de simulación
    currentView = 'simulation';
    const page = document.getElementById('scenario-builder-page');
    if (page) renderContent(page);
  } catch (error) {
    console.error('Error al crear escenario:', error);
    alert('Error al guardar el escenario. Intenta nuevamente.');

    isSubmitting = false;
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = '<span class="material-symbols-outlined">save</span> Guardar y Simular';
    }
  }
}

function validateForm(): boolean {
  formErrors = {};

  if (!formData.name.trim()) {
    formErrors.name = 'El nombre es obligatorio';
  } else if (formData.name.length > 100) {
    formErrors.name = 'El nombre no puede exceder 100 caracteres';
  }

  if (!formData.category) {
    formErrors.category = 'La categoría es obligatoria';
  }

  if (formData.sentiment < -1 || formData.sentiment > 1) {
    formErrors.sentiment = 'El sentimiento debe estar entre -1 y 1';
  }

  if (formData.intensity < 0 || formData.intensity > 1) {
    formErrors.intensity = 'La intensidad debe estar entre 0 y 1';
  }

  if (formData.salience < 0 || formData.salience > 1) {
    formErrors.salience = 'La visibilidad debe estar entre 0 y 1';
  }

  return Object.keys(formErrors).length === 0;
}

// ===========================================
// Simulation Config View
// ===========================================

function renderSimulationConfig(container: HTMLElement): void {
  // Header
  const header = document.createElement('div');
  header.className = 'scenario-header';
  header.innerHTML = `
    <h1 class="page-title">
      <span class="material-symbols-outlined">settings</span>
      Configurar Simulación
    </h1>
    <p class="page-subtitle">Ajusta los parámetros para ejecutar la simulación del escenario</p>
  `;
  container.appendChild(header);

  const section = document.createElement('div');
  section.className = 'form-section';
  section.style.maxWidth = '800px';
  section.style.margin = '0 auto';
  section.innerHTML = `
    <h3 class="section-title">
      <span class="material-symbols-outlined">tune</span>
      Parámetros de Simulación
    </h3>

    <div class="form-group">
      <label for="sim-sample-size">Tamaño de la muestra</label>
      <input
        type="number"
        id="sim-sample-size"
        name="sampleSize"
        value="${simulationConfig.sampleSize}"
        min="10"
        max="1000"
        step="10"
      />
      <span class="form-hint">Número de agentes sintéticos a simular (10-1000)</span>
    </div>

    <div class="form-group">
      <label>Modo de comparación</label>
      <div class="radio-group">
        ${SIMULATION_MODE_OPTIONS.map((option) => `
          <label class="radio-option">
            <input
              type="radio"
              name="simMode"
              value="${option.value}"
              ${simulationConfig.mode === option.value ? 'checked' : ''}
            />
            <span class="radio-label">${option.label}</span>
          </label>
        `).join('')}
      </div>
    </div>

    <div class="form-actions">
      <button type="button" class="btn btn-secondary" id="btn-back-to-form">
        <span class="material-symbols-outlined">arrow_back</span>
        Volver
      </button>
      <button type="button" class="btn btn-primary" id="btn-run-simulation" ${isSimulating ? 'disabled' : ''}>
        <span class="material-symbols-outlined">play_arrow</span>
        ${isSimulating ? 'Ejecutando...' : 'Ejecutar Simulación'}
      </button>
    </div>
  `;

  container.appendChild(section);

  // Attach listeners
  section.querySelector('#sim-sample-size')?.addEventListener('change', (e) => {
    const target = e.target as HTMLInputElement;
    simulationConfig.sampleSize = parseInt(target.value, 10);
  });

  section.querySelectorAll('input[name="simMode"]').forEach((radio) => {
    radio.addEventListener('change', (e) => {
      const target = e.target as HTMLInputElement;
      simulationConfig.mode = target.value as any;
    });
  });

  section.querySelector('#btn-back-to-form')?.addEventListener('click', () => {
    currentView = 'form';
    const page = document.getElementById('scenario-builder-page');
    if (page) renderContent(page);
  });

  section.querySelector('#btn-run-simulation')?.addEventListener('click', handleRunSimulation);
}

async function handleRunSimulation(): Promise<void> {
  if (!createdScenarioId) {
    alert('No hay un escenario creado para simular');
    return;
  }

  isSimulating = true;
  const btn = document.getElementById('btn-run-simulation') as HTMLButtonElement;
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<span class="material-symbols-outlined">hourglass_empty</span> Ejecutando...';
  }

  try {
    // Obtener agentes
    const agents = await getAllAgents();
    const sampleAgents = agents.slice(0, simulationConfig.sampleSize);

    // Definir preguntas para la simulación
    const questionIds = ['q_approval', 'q_direction', 'q_optimism', 'q_economy_national', 'q_economy_personal'];

    // Ejecutar baseline si es necesario
    let baselineResults: any = null;
    if (simulationConfig.mode === 'baseline' || simulationConfig.mode === 'baseline_vs_scenario') {
      console.log('Ejecutando baseline...');
      baselineResults = await runSurvey({
        surveyDefinition: {
          id: 'baseline-survey',
          title: 'Baseline Survey',
          questions: questionIds.map(id => ({ id, text: id })),
        },
        agents: sampleAgents.map(agent => ({
          agentId: agent.agent_id,
          age: agent.age,
          sex: agent.sex,
          educationLevel: agent.education_level ?? undefined,
          incomeDecile: agent.income_decile ?? undefined,
          povertyStatus: agent.poverty_status ?? undefined,
          regionCode: agent.region_code,
          communeCode: agent.comuna_code,
          connectivityLevel: agent.connectivity_level ?? undefined,
        })),
        engineMode: 'cadem',
        persistState: false,
      });
    }

    // Ejecutar con escenario si es necesario
    let scenarioResults: any = null;
    if (simulationConfig.mode === 'scenario' || simulationConfig.mode === 'baseline_vs_scenario') {
      console.log('Ejecutando con escenario...');
      scenarioResults = await runSurvey({
        surveyDefinition: {
          id: 'scenario-survey',
          title: 'Scenario Survey',
          questions: questionIds.map(id => ({ id, text: id })),
        },
        agents: sampleAgents.map(agent => ({
          agentId: agent.agent_id,
          age: agent.age,
          sex: agent.sex,
          educationLevel: agent.education_level ?? undefined,
          incomeDecile: agent.income_decile ?? undefined,
          povertyStatus: agent.poverty_status ?? undefined,
          regionCode: agent.region_code,
          communeCode: agent.comuna_code,
          connectivityLevel: agent.connectivity_level ?? undefined,
        })),
        engineMode: 'cadem',
        persistState: false,
        scenarioEventId: createdScenarioId,
      });
    }

    // Procesar resultados
    simulationResults = processSimulationResults(baselineResults, scenarioResults);

    // Mostrar resultados
    currentView = 'results';
    const page = document.getElementById('scenario-builder-page');
    if (page) renderContent(page);
  } catch (error) {
    console.error('Error en simulación:', error);
    alert('Error al ejecutar la simulación. Intenta nuevamente.');

    isSimulating = false;
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = '<span class="material-symbols-outlined">play_arrow</span> Ejecutar Simulación';
    }
  }
}

function processSimulationResults(baseline: any, scenario: any): any {
  // Procesar resultados reales del motor CADEM
  const result: any = {
    baseline: {},
    scenario: {},
    delta: {},
  };

  // Procesar baseline si existe
  if (baseline?.results) {
    baseline.results.forEach((questionResult: any) => {
      const qId = questionResult.questionId;
      if (questionResult.questionType === 'single_choice') {
        result.baseline[qId] = {
          distribution: normalizeDistribution(questionResult.distribution),
          confidence: questionResult.confidence || 0.85,
        };
      }
    });
  }

  // Procesar scenario si existe
  if (scenario?.results) {
    scenario.results.forEach((questionResult: any) => {
      const qId = questionResult.questionId;
      if (questionResult.questionType === 'single_choice') {
        result.scenario[qId] = {
          distribution: normalizeDistribution(questionResult.distribution),
          confidence: questionResult.confidence || 0.85,
        };
      }
    });
  }

  // Calcular delta para preguntas que existen en ambos
  Object.keys(result.baseline).forEach((qId) => {
    if (result.scenario[qId]) {
      result.delta[qId] = {};
      const baselineDist = result.baseline[qId].distribution;
      const scenarioDist = result.scenario[qId].distribution;

      Object.keys(baselineDist).forEach((key) => {
        const baselineValue = baselineDist[key] || 0;
        const scenarioValue = scenarioDist[key] || 0;
        result.delta[qId][key] = scenarioValue - baselineValue;
      });
    }
  });

  return result;
}

function normalizeDistribution(distribution: any): { [key: string]: number } {
  if (!distribution) return {};

  const normalized: { [key: string]: number } = {};

  // Calcular total
  let total = 0;
  Object.entries(distribution).forEach(([_, value]: [string, any]) => {
    if (typeof value === 'number') {
      total += value;
    } else if (typeof value === 'object' && value !== null && typeof value.count === 'number') {
      total += value.count;
    }
  });

  // Normalizar a porcentajes
  Object.entries(distribution).forEach(([key, value]: [string, any]) => {
    let count = 0;
    if (typeof value === 'number') {
      count = value;
    } else if (typeof value === 'object' && value !== null && typeof value.count === 'number') {
      count = value.count;
    }

    if (total > 0) {
      normalized[key] = Math.round((count / total) * 100);
    } else {
      normalized[key] = 0;
    }
  });

  return normalized;
}

// ===========================================
// Results View
// ===========================================

function renderResults(container: HTMLElement): void {
  // Header
  const header = document.createElement('div');
  header.className = 'scenario-header';
  header.innerHTML = `
    <h1 class="page-title">
      <span class="material-symbols-outlined">analytics</span>
      Resultados de Simulación
    </h1>
    <p class="page-subtitle">Comparación entre baseline y escenario</p>
  `;
  container.appendChild(header);

  if (!simulationResults) {
    const emptyDiv = document.createElement('div');
    emptyDiv.className = 'scenarios-empty';
    emptyDiv.innerHTML = `
      <div class="empty-icon">
        <span class="material-symbols-outlined">analytics</span>
      </div>
      <h3>No hay resultados disponibles</h3>
      <p>La simulación no generó resultados. Intenta nuevamente.</p>
      <button type="button" class="btn btn-primary" id="btn-back-to-sim">
        <span class="material-symbols-outlined">arrow_back</span>
        Volver a Configuración
      </button>
    `;
    container.appendChild(emptyDiv);

    emptyDiv.querySelector('#btn-back-to-sim')?.addEventListener('click', () => {
      currentView = 'simulation';
      const page = document.getElementById('scenario-builder-page');
      if (page) renderContent(page);
    });
    return;
  }

  const resultsDiv = document.createElement('div');
  resultsDiv.className = 'results-container';

  // Resumen
  const summarySection = document.createElement('div');
  summarySection.className = 'form-section';
  summarySection.innerHTML = `
    <h3 class="section-title">
      <span class="material-symbols-outlined">summarize</span>
      Resumen
    </h3>
    <div class="results-summary">
      <div class="summary-item">
        <span class="summary-label">Modo</span>
        <span class="summary-value">${getModeLabel(simulationConfig.mode)}</span>
      </div>
      <div class="summary-item">
        <span class="summary-label">Muestra</span>
        <span class="summary-value">${simulationConfig.sampleSize} agentes</span>
      </div>
      <div class="summary-item">
        <span class="summary-label">Escenario</span>
        <span class="summary-value">${escapeHtml(formData.name)}</span>
      </div>
    </div>
  `;
  resultsDiv.appendChild(summarySection);

  // Tabla comparativa
  const tableSection = document.createElement('div');
  tableSection.className = 'form-section';
  tableSection.innerHTML = `
    <h3 class="section-title">
      <span class="material-symbols-outlined">table_chart</span>
      Comparación por Pregunta
    </h3>
    <div class="results-table-container">
      <table class="results-table">
        <thead>
          <tr>
            <th>Pregunta</th>
            <th>Baseline</th>
            <th>Escenario</th>
            <th>Delta</th>
          </tr>
        </thead>
        <tbody>
          ${renderResultsTableRows()}
        </tbody>
      </table>
    </div>
  `;
  resultsDiv.appendChild(tableSection);

  // Acciones
  const actionsSection = document.createElement('div');
  actionsSection.className = 'form-actions';
  actionsSection.style.maxWidth = '800px';
  actionsSection.style.margin = '0 auto';
  actionsSection.innerHTML = `
    <button type="button" class="btn btn-secondary" id="btn-back-to-list">
      <span class="material-symbols-outlined">list</span>
      Ver Escenarios
    </button>
    <button type="button" class="btn btn-secondary" id="btn-reconfigure">
      <span class="material-symbols-outlined">settings</span>
      Reconfigurar
    </button>
    <button type="button" class="btn btn-primary" id="btn-test-in-survey-results">
      <span class="material-symbols-outlined">assignment</span>
      Probar en Encuesta
    </button>
  `;
  resultsDiv.appendChild(actionsSection);

  container.appendChild(resultsDiv);

  // Attach listeners
  actionsSection.querySelector('#btn-back-to-list')?.addEventListener('click', () => {
    resetForm();
    currentView = 'list';
    const page = document.getElementById('scenario-builder-page');
    if (page) renderContent(page);
  });

  actionsSection.querySelector('#btn-reconfigure')?.addEventListener('click', () => {
    currentView = 'simulation';
    const page = document.getElementById('scenario-builder-page');
    if (page) renderContent(page);
  });

  actionsSection.querySelector('#btn-test-in-survey-results')?.addEventListener('click', () => {
    // Redirigir a la página de encuestas con el escenario seleccionado
    if (createdScenarioId) {
      window.location.href = `/surveys?scenario=${createdScenarioId}`;
    } else {
      window.location.href = '/surveys';
    }
  });
}

function renderResultsTableRows(): string {
  if (!simulationResults) return '';

  const questionLabels: { [key: string]: string } = {
    q_approval: 'Aprobación',
    q_direction: 'Dirección del país',
    q_optimism: 'Optimismo',
    q_economy_national: 'Economía nacional',
    q_economy_personal: 'Economía personal',
  };

  return Object.keys(simulationResults.baseline).map((qId) => {
    const baseline = simulationResults!.baseline[qId];
    const scenario = simulationResults!.scenario[qId];
    const delta = simulationResults!.delta[qId];

    const baselineStr = formatDistribution(baseline.distribution);
    const scenarioStr = formatDistribution(scenario.distribution);
    const deltaStr = formatDelta(delta);

    return `
      <tr>
        <td>${questionLabels[qId] || qId}</td>
        <td>${baselineStr}</td>
        <td>${scenarioStr}</td>
        <td class="delta-cell">${deltaStr}</td>
      </tr>
    `;
  }).join('');
}

function formatDistribution(dist: { [key: string]: number }): string {
  return Object.entries(dist)
    .map(([key, value]) => {
      const label = CANONICAL_LABELS[key] || key;
      return `${label}: ${value}%`;
    })
    .join('<br>');
}

function formatDelta(delta: { [key: string]: number }): string {
  return Object.entries(delta)
    .map(([key, value]) => {
      const sign = value > 0 ? '+' : '';
      const className = value > 0 ? 'delta-positive' : value < 0 ? 'delta-negative' : 'delta-neutral';
      const label = CANONICAL_LABELS[key] || key;
      return `<span class="${className}">${label}: ${sign}${value.toFixed(1)}%</span>`;
    })
    .join('<br>');
}

function getModeLabel(mode: string): string {
  const labels: { [key: string]: string } = {
    baseline: 'Solo baseline',
    scenario: 'Solo escenario',
    baseline_vs_scenario: 'Comparación completa',
  };
  return labels[mode] || mode;
}

// ===========================================
// Success View
// ===========================================

function renderSuccess(container: HTMLElement): void {
  const successDiv = document.createElement('div');
  successDiv.className = 'state-container state-success';
  successDiv.innerHTML = `
    <div class="state-icon">
      <span class="material-symbols-outlined">check_circle</span>
    </div>
    <h3 class="state-title">Escenario guardado exitosamente</h3>
    <p class="state-message">
      El escenario "${escapeHtml(formData.name)}" ha sido creado y está listo para usar en simulaciones.
    </p>
    <div class="state-actions">
      <button class="btn btn-primary" id="btn-simulate-now">
        <span class="material-symbols-outlined">play_arrow</span>
        Simular Ahora
      </button>
      <button class="btn btn-secondary" id="btn-test-in-survey">
        <span class="material-symbols-outlined">assignment</span>
        Probar en Encuesta
      </button>
      <button class="btn btn-secondary" id="btn-create-another">
        <span class="material-symbols-outlined">add</span>
        Crear otro
      </button>
    </div>
  `;

  container.appendChild(successDiv);

  successDiv.querySelector('#btn-simulate-now')?.addEventListener('click', () => {
    currentView = 'simulation';
    const page = document.getElementById('scenario-builder-page');
    if (page) renderContent(page);
  });

  successDiv.querySelector('#btn-test-in-survey')?.addEventListener('click', () => {
    // Redirigir a la página de encuestas con el escenario seleccionado
    if (createdScenarioId) {
      window.location.href = `/surveys?scenario=${createdScenarioId}`;
    } else {
      window.location.href = '/surveys';
    }
  });

  successDiv.querySelector('#btn-create-another')?.addEventListener('click', () => {
    resetForm();
    currentView = 'form';
    const page = document.getElementById('scenario-builder-page');
    if (page) renderContent(page);
  });
}

// ===========================================
// Helpers
// ===========================================

function resetForm(): void {
  formData = { ...INITIAL_FORM_DATA };
  formErrors = {};
  isSubmitting = false;
  isSimulating = false;
  createdScenarioId = null;
  simulationResults = null;
  simulationConfig = {
    sampleSize: 100,
    mode: 'baseline_vs_scenario',
  };
  // No resetear filtros de búsqueda al volver a la lista
}

function getSentimentLabel(value: number): string {
  if (value <= -0.75) return 'Muy negativo';
  if (value <= -0.25) return 'Negativo';
  if (value <= 0.25) return 'Neutral';
  if (value <= 0.75) return 'Positivo';
  return 'Muy positivo';
}

function getIntensityLabel(value: number): string {
  if (value <= 0.33) return 'Débil';
  if (value <= 0.66) return 'Moderada';
  return 'Fuerte';
}

function getSalienceLabel(value: number): string {
  if (value <= 0.33) return 'Poco visible';
  if (value <= 0.66) return 'Moderada';
  return 'Muy visible';
}

function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Cleanup function (required by main.ts)
 */
export function cleanupScenarioBuilderPage(): void {
  resetForm();
  scenariosList = [];
  listError = null;
  searchQuery = '';
  selectedCategory = undefined;
  selectedSeverity = undefined;
  console.log('Scenario builder page cleaned up');
}
