/**
 * Scenario Builder Page - MVP del formulario para crear escenarios hipotéticos
 *
 * Permite a usuarios crear escenarios de eventos, ejecutar simulaciones
 * y ver resultados comparativos en una sola página.
 */

import type { CreateScenarioInput } from '../app/events/scenarioEventStore';
import { createScenario } from '../app/events/scenarioEventStore';
import { runSurvey } from '../app/survey/surveyRunner';
import { getAllAgents } from '../data/syntheticAgents';

// Estado local
let currentView: 'form' | 'success' | 'simulation' | 'results' = 'form';
let isSubmitting = false;
let isSimulating = false;
let createdScenarioId: string | null = null;

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
  const page = document.createElement('div');
  page.className = 'page scenario-builder-page';
  page.id = 'scenario-builder-page';

  // Renderizar contenido
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
  header.className = 'scenario-header';
  header.innerHTML = `
    <h1 class="page-title">
      <span class="material-symbols-outlined" style="vertical-align: middle; margin-right: 8px;">psychology</span>
      ${getPageTitle()}
    </h1>
    <p class="page-subtitle">${getPageSubtitle()}</p>
  `;
  container.appendChild(header);

  // Render según vista
  switch (currentView) {
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
}

function getPageTitle(): string {
  switch (currentView) {
    case 'form':
      return 'Crear Escenario Hipotético';
    case 'success':
      return 'Escenario Guardado';
    case 'simulation':
      return 'Configurar Simulación';
    case 'results':
      return 'Resultados de Simulación';
    default:
      return 'Scenario Builder';
  }
}

function getPageSubtitle(): string {
  switch (currentView) {
    case 'form':
      return 'Define un evento hipotético para simular su impacto en las opiniones públicas';
    case 'success':
      return 'Tu escenario está listo para usar en simulaciones';
    case 'simulation':
      return 'Configura los parámetros de la simulación';
    case 'results':
      return 'Comparación entre baseline y escenario';
    default:
      return '';
  }
}

// ===========================================
// Form View
// ===========================================

function renderForm(container: HTMLElement): void {
  const form = document.createElement('form');
  form.className = 'scenario-form';
  form.id = 'scenario-create-form';

  form.innerHTML = `
    <!-- Sección 1: Información Básica -->
    <div class="form-section">
      <h3 class="section-title">Información Básica</h3>

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
      <h3 class="section-title">Métricas del Evento</h3>

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
        Cancelar
      </button>
      <button type="submit" class="btn btn-primary" id="btn-submit" ${isSubmitting ? 'disabled' : ''}>
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
    resetForm();
    console.log('Cancelado - navegar a lista de escenarios');
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
    submitBtn.textContent = 'Guardando...';
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
      submitBtn.textContent = 'Guardar y Simular';
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
  const section = document.createElement('div');
  section.className = 'form-section';
  section.innerHTML = `
    <h3 class="section-title">Configuración de Simulación</h3>

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
        Volver al formulario
      </button>
      <button type="button" class="btn btn-primary" id="btn-run-simulation" ${isSimulating ? 'disabled' : ''}>
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
    btn.textContent = 'Ejecutando...';
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
      btn.textContent = 'Ejecutar Simulación';
    }
  }
}

function processSimulationResults(_baseline: any, _scenario: any): any {
  // Mock results for MVP - en producción esto procesaría los resultados reales
  const questions = ['q_approval', 'q_direction', 'q_optimism', 'q_economy_national', 'q_economy_personal'];
  
  const result: any = {
    baseline: {},
    scenario: {},
    delta: {},
  };

  questions.forEach((qId) => {
    // Generar distribuciones mock
    const baselineDist = generateMockDistribution();
    const scenarioDist = generateMockDistribution();
    
    result.baseline[qId] = {
      distribution: baselineDist,
      confidence: 0.75 + Math.random() * 0.2,
    };
    
    result.scenario[qId] = {
      distribution: scenarioDist,
      confidence: 0.75 + Math.random() * 0.2,
    };

    // Calcular delta
    result.delta[qId] = {};
    Object.keys(baselineDist).forEach((key) => {
      result.delta[qId][key] = scenarioDist[key] - baselineDist[key];
    });
  });

  return result;
}

function generateMockDistribution(): { [key: string]: number } {
  const options = ['option_a', 'option_b', 'option_c', 'option_d'];
  const dist: { [key: string]: number } = {};
  let remaining = 100;
  
  options.forEach((opt, idx) => {
    if (idx === options.length - 1) {
      dist[opt] = remaining;
    } else {
      const value = Math.floor(Math.random() * remaining * 0.6);
      dist[opt] = value;
      remaining -= value;
    }
  });

  // Normalizar a porcentajes
  const total = Object.values(dist).reduce((a, b) => a + b, 0);
  Object.keys(dist).forEach((key) => {
    dist[key] = Math.round((dist[key] / total) * 100);
  });

  return dist;
}

// ===========================================
// Results View
// ===========================================

function renderResults(container: HTMLElement): void {
  if (!simulationResults) {
    container.innerHTML = '<p>No hay resultados disponibles</p>';
    return;
  }

  const resultsDiv = document.createElement('div');
  resultsDiv.className = 'results-container';

  // Resumen
  const summarySection = document.createElement('div');
  summarySection.className = 'form-section';
  summarySection.innerHTML = `
    <h3 class="section-title">Resumen de Resultados</h3>
    <div class="results-summary">
      <div class="summary-item">
        <span class="summary-label">Modo:</span>
        <span class="summary-value">${getModeLabel(simulationConfig.mode)}</span>
      </div>
      <div class="summary-item">
        <span class="summary-label">Muestra:</span>
        <span class="summary-value">${simulationConfig.sampleSize} agentes</span>
      </div>
      <div class="summary-item">
        <span class="summary-label">Escenario:</span>
        <span class="summary-value">${escapeHtml(formData.name)}</span>
      </div>
    </div>
  `;
  resultsDiv.appendChild(summarySection);

  // Tabla comparativa
  const tableSection = document.createElement('div');
  tableSection.className = 'form-section';
  tableSection.innerHTML = `
    <h3 class="section-title">Comparación por Pregunta</h3>
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
  actionsSection.innerHTML = `
    <button type="button" class="btn btn-secondary" id="btn-new-scenario">
      Crear Nuevo Escenario
    </button>
    <button type="button" class="btn btn-primary" id="btn-reconfigure">
      Reconfigurar Simulación
    </button>
  `;
  resultsDiv.appendChild(actionsSection);

  container.appendChild(resultsDiv);

  // Attach listeners
  actionsSection.querySelector('#btn-new-scenario')?.addEventListener('click', () => {
    resetForm();
    currentView = 'form';
    const page = document.getElementById('scenario-builder-page');
    if (page) renderContent(page);
  });

  actionsSection.querySelector('#btn-reconfigure')?.addEventListener('click', () => {
    currentView = 'simulation';
    const page = document.getElementById('scenario-builder-page');
    if (page) renderContent(page);
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
    .map(([key, value]) => `${key}: ${value}%`)
    .join('<br>');
}

function formatDelta(delta: { [key: string]: number }): string {
  return Object.entries(delta)
    .map(([key, value]) => {
      const sign = value > 0 ? '+' : '';
      const className = value > 0 ? 'delta-positive' : value < 0 ? 'delta-negative' : 'delta-neutral';
      return `<span class="${className}">${key}: ${sign}${value.toFixed(1)}%</span>`;
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
      <span class="material-symbols-outlined" style="font-size: 64px; color: #10b981;">check_circle</span>
    </div>
    <h3 class="state-title">Escenario guardado exitosamente</h3>
    <p class="state-message">
      El escenario "${escapeHtml(formData.name)}" ha sido creado y está listo para usar en simulaciones.
    </p>
    <div class="state-actions">
      <button class="btn btn-primary" id="btn-simulate-now">
        Simular Ahora
      </button>
      <button class="btn btn-secondary" id="btn-create-another">
        Crear otro escenario
      </button>
    </div>
  `;

  container.appendChild(successDiv);

  successDiv.querySelector('#btn-simulate-now')?.addEventListener('click', () => {
    currentView = 'simulation';
    const page = document.getElementById('scenario-builder-page');
    if (page) renderContent(page);
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
  currentView = 'form';
  createdScenarioId = null;
  simulationResults = null;
  simulationConfig = {
    sampleSize: 100,
    mode: 'baseline_vs_scenario',
  };
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
  console.log('Scenario builder page cleaned up');
}
