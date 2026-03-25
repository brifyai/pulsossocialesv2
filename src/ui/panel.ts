import type { Map } from 'maplibre-gl';
import { INITIAL_CAMERA } from '../app/mapConfig';
import { toggleBuildings } from '../app/layers/buildings';
import { toggleRoads } from '../app/layers/roads';
import { toggleLabels } from '../app/layers/labels';
import { toggleAgents } from '../app/layers/agents';
import {
  startSimulation,
  pauseSimulation,
  resetSimulation,
  setGlobalSpeed,
  setAgentCount,
  isRunning,
  getAgentCount,
} from '../app/simulation/agentEngine';
import { getViewportAgentCount } from '../app/layers/agentsViewport';
import {
  getQualityMode,
  setQualityMode,
  getPerformanceMetrics,
  type QualityMode,
} from '../app/performance/qualityMode';
import { getRegionNameFromViewport } from '../app/utils/geoUtils';

interface PanelState {
  buildings: boolean;
  roads: boolean;
  labels: boolean;
  agents: boolean;
  simulationRunning: boolean;
  agentCount: number;
  simulationSpeed: number;
}

const state: PanelState = {
  buildings: true,
  roads: true,
  labels: true,
  agents: true,
  simulationRunning: false,
  agentCount: 50,
  simulationSpeed: 1.0,
};

/**
 * Create the UI panel - Compact SceneControlPanel with Basic/Advanced modes
 */
export function createPanel(map: Map): HTMLElement {
  const panel = document.createElement('div');
  panel.className = 'cyberpunk-panel scene-control-panel';
  panel.innerHTML = `
    <!-- BASIC MODE - Default view -->
    <div class="panel-basic">
      <div class="panel-header-compact">
        <h1 class="panel-title-sm">Pulso Social</h1>
        <p class="panel-subtitle-sm" id="region-subtitle">Chile</p>
      </div>

      <!-- Status compact -->
      <div class="status-compact" id="sim-status">
        <span class="status-dot" id="status-dot"></span>
        <span class="status-text-sm" id="status-text">Sin actividad</span>
        <span class="status-count-sm" id="agent-count-display">0 agentes</span>
      </div>

      <!-- Visualization toggles - compact row -->
      <div class="toggles-compact">
        <label class="toggle-chip">
          <input type="checkbox" id="toggle-buildings" checked />
          <span class="toggle-chip-label">Edificios</span>
        </label>
        <label class="toggle-chip">
          <input type="checkbox" id="toggle-roads" checked />
          <span class="toggle-chip-label">Caminos</span>
        </label>
        <label class="toggle-chip">
          <input type="checkbox" id="toggle-labels" checked />
          <span class="toggle-chip-label">Etiquetas</span>
        </label>
        <label class="toggle-chip">
          <input type="checkbox" id="toggle-agents" checked />
          <span class="toggle-chip-label">Agentes</span>
        </label>
      </div>

      <!-- Controls compact -->
      <div class="controls-compact">
        <div class="slider-compact">
          <span class="slider-label-sm">Agentes</span>
          <span class="slider-value-sm" id="agent-count-value">50</span>
          <input type="range" id="slider-agent-count" min="0" max="200" value="50" class="slider-sm" />
        </div>
        <div class="slider-compact">
          <span class="slider-label-sm">Velocidad</span>
          <span class="slider-value-sm" id="speed-value">1.0x</span>
          <input type="range" id="slider-speed" min="0" max="5" step="0.1" value="1" class="slider-sm" />
        </div>
      </div>

      <!-- Action buttons - compact -->
      <div class="actions-compact">
        <button id="btn-play" class="btn-action primary">
          <span class="material-symbols-outlined btn-icon">play_arrow</span>
        </button>
        <button id="btn-pause" class="btn-action">
          <span class="material-symbols-outlined btn-icon">pause</span>
        </button>
        <button id="btn-reset" class="btn-action secondary">
          <span class="material-symbols-outlined btn-icon">restart_alt</span>
        </button>
        <button id="btn-recenter" class="btn-action">
          <span class="material-symbols-outlined btn-icon">my_location</span>
        </button>
      </div>
    </div>

    <!-- ADVANCED MODE - Minimal toggle -->
    <div class="advanced-mini">
      <button class="advanced-mini-toggle" id="advanced-toggle">
        <span class="advanced-mini-text">Detalles técnicos</span>
        <span class="material-symbols-outlined advanced-mini-icon">expand_more</span>
      </button>
      
      <div class="panel-advanced" id="panel-advanced" style="display: none;">
        <!-- Quality Mode Selector -->
        <div class="quality-mode-section">
          <div class="quality-mode-header">
            <span class="quality-mode-label">Modo de Calidad</span>
            <span class="quality-mode-value" id="quality-mode-value">Full</span>
          </div>
          <div class="quality-mode-toggle">
            <button class="quality-btn" id="quality-btn-full" data-mode="full">Full</button>
            <button class="quality-btn" id="quality-btn-lite" data-mode="lite">Lite</button>
          </div>
          <div class="quality-metrics" id="quality-metrics">
            <span class="metric-item" id="metric-fps">-- FPS</span>
            <span class="metric-item" id="metric-agents">-- agentes</span>
          </div>
        </div>
        
        <div class="tech-info-grid">
          <div class="tech-item">
            <span class="tech-label">Motor</span>
            <span class="tech-value">MapLibre</span>
          </div>
          <div class="tech-item">
            <span class="tech-label">Provider</span>
            <span class="tech-value">MapTiler</span>
          </div>
          <div class="tech-item">
            <span class="tech-label">Estilo</span>
            <span class="tech-value">Cyberpunk</span>
          </div>
          <div class="tech-item">
            <span class="tech-label">Fog</span>
            <span class="tech-value tech-on" id="fog-status">Activo</span>
          </div>
        </div>
      </div>
    </div>
  `;

  // Add event listeners
  setupEventListeners(panel, map);
  setupAdvancedToggle(panel);

  return panel;
}

/**
 * Setup event listeners for panel controls
 */
function setupEventListeners(panel: HTMLElement, map: Map): void {
  // Buildings toggle
  const buildingsToggle = panel.querySelector('#toggle-buildings') as HTMLInputElement;
  buildingsToggle?.addEventListener('change', (e) => {
    const target = e.target as HTMLInputElement;
    state.buildings = target.checked;
    toggleBuildings(map, state.buildings);
  });

  // Roads toggle
  const roadsToggle = panel.querySelector('#toggle-roads') as HTMLInputElement;
  roadsToggle?.addEventListener('change', (e) => {
    const target = e.target as HTMLInputElement;
    state.roads = target.checked;
    toggleRoads(map, state.roads);
  });

  // Labels toggle
  const labelsToggle = panel.querySelector('#toggle-labels') as HTMLInputElement;
  labelsToggle?.addEventListener('change', (e) => {
    const target = e.target as HTMLInputElement;
    state.labels = target.checked;
    toggleLabels(map, state.labels);
  });

  // Agents toggle
  const agentsToggle = panel.querySelector('#toggle-agents') as HTMLInputElement;
  agentsToggle?.addEventListener('change', (e) => {
    const target = e.target as HTMLInputElement;
    state.agents = target.checked;
    toggleAgents(map, state.agents);
  });

  // Agent count slider
  const agentCountSlider = panel.querySelector('#slider-agent-count') as HTMLInputElement;
  const agentCountValue = panel.querySelector('#agent-count-value') as HTMLElement;
  agentCountSlider?.addEventListener('input', (e) => {
    const target = e.target as HTMLInputElement;
    const count = parseInt(target.value, 10);
    state.agentCount = count;
    agentCountValue.textContent = count.toString();
    setAgentCount(count);
  });

  // Speed slider
  const speedSlider = panel.querySelector('#slider-speed') as HTMLInputElement;
  const speedValue = panel.querySelector('#speed-value') as HTMLElement;
  speedSlider?.addEventListener('input', (e) => {
    const target = e.target as HTMLInputElement;
    const speed = parseFloat(target.value);
    state.simulationSpeed = speed;
    speedValue.textContent = speed.toFixed(1) + 'x';
    setGlobalSpeed(speed);
  });

  // Play button
  const playBtn = panel.querySelector('#btn-play') as HTMLButtonElement;
  playBtn?.addEventListener('click', () => {
    startSimulation();
    updateSimulationStatus();
  });

  // Pause button
  const pauseBtn = panel.querySelector('#btn-pause') as HTMLButtonElement;
  pauseBtn?.addEventListener('click', () => {
    pauseSimulation();
    updateSimulationStatus();
  });

  // Reset button
  const resetBtn = panel.querySelector('#btn-reset') as HTMLButtonElement;
  resetBtn?.addEventListener('click', () => {
    resetSimulation();
    updateSimulationStatus();
  });

  // Recenter button
  const recenterBtn = panel.querySelector('#btn-recenter') as HTMLButtonElement;
  recenterBtn?.addEventListener('click', () => {
    map.flyTo({
      center: INITIAL_CAMERA.center,
      zoom: INITIAL_CAMERA.zoom,
      pitch: INITIAL_CAMERA.pitch,
      bearing: INITIAL_CAMERA.bearing,
      duration: 2000,
    });
  });

  // Update status periodically (use viewport count for Supabase agents)
  setInterval(() => {
    updateSimulationStatus();
    updateViewportAgentCount();
    updateRegionSubtitle(map);
  }, 500);
}

/**
 * Setup advanced panel toggle
 */
function setupAdvancedToggle(panel: HTMLElement): void {
  const toggleBtn = panel.querySelector('#advanced-toggle') as HTMLButtonElement;
  const advancedPanel = panel.querySelector('#panel-advanced') as HTMLElement;
  const toggleIcon = panel.querySelector('.advanced-mini-icon') as HTMLElement;

  let isExpanded = false;

  toggleBtn?.addEventListener('click', () => {
    isExpanded = !isExpanded;
    
    if (isExpanded) {
      advancedPanel.style.display = 'block';
      toggleIcon.style.transform = 'rotate(180deg)';
      // Initialize quality mode UI when expanded
      initQualityModeUI(panel);
    } else {
      advancedPanel.style.display = 'none';
      toggleIcon.style.transform = 'rotate(0deg)';
    }
  });
}

/**
 * Initialize Quality Mode UI
 */
function initQualityModeUI(panel: HTMLElement): void {
  const fullBtn = panel.querySelector('#quality-btn-full') as HTMLButtonElement;
  const liteBtn = panel.querySelector('#quality-btn-lite') as HTMLButtonElement;
  const modeValue = panel.querySelector('#quality-mode-value') as HTMLElement;
  const fogStatus = panel.querySelector('#fog-status') as HTMLElement;

  // Set initial state
  const currentMode = getQualityMode();
  updateQualityModeButtons(currentMode);
  if (modeValue) modeValue.textContent = currentMode === 'full' ? 'Full' : 'Lite';
  if (fogStatus) fogStatus.textContent = currentMode === 'full' ? 'Activo' : 'Off';

  // Full mode button
  fullBtn?.addEventListener('click', () => {
    setQualityMode('full');
    updateQualityModeButtons('full');
    if (modeValue) modeValue.textContent = 'Full';
    if (fogStatus) fogStatus.textContent = 'Activo';
    applyQualityModeToMap('full');
  });

  // Lite mode button
  liteBtn?.addEventListener('click', () => {
    setQualityMode('lite');
    updateQualityModeButtons('lite');
    if (modeValue) modeValue.textContent = 'Lite';
    if (fogStatus) fogStatus.textContent = 'Off';
    applyQualityModeToMap('lite');
  });

  // Start metrics update
  startMetricsUpdate();
}

/**
 * Update quality mode button states
 */
function updateQualityModeButtons(mode: QualityMode): void {
  const fullBtn = document.querySelector('#quality-btn-full') as HTMLButtonElement;
  const liteBtn = document.querySelector('#quality-btn-lite') as HTMLButtonElement;

  if (fullBtn && liteBtn) {
    if (mode === 'full') {
      fullBtn.classList.add('active');
      liteBtn.classList.remove('active');
    } else {
      fullBtn.classList.remove('active');
      liteBtn.classList.add('active');
    }
  }
}

/**
 * Apply quality mode settings to map
 */
function applyQualityModeToMap(mode: QualityMode): void {
  // Update agent count slider max
  const agentSlider = document.querySelector('#slider-agent-count') as HTMLInputElement;
  if (agentSlider) {
    agentSlider.max = mode === 'full' ? '200' : '50';
    // Reduce current count if exceeds new max
    const currentCount = parseInt(agentSlider.value, 10);
    const newMax = mode === 'full' ? 200 : 50;
    if (currentCount > newMax) {
      agentSlider.value = newMax.toString();
      setAgentCount(newMax);
      const countValue = document.querySelector('#agent-count-value') as HTMLElement;
      if (countValue) countValue.textContent = newMax.toString();
    }
  }

  // Toggle labels based on mode
  if (mode === 'lite') {
    toggleLabels(window._mapInstance as Map, false);
    const labelsToggle = document.querySelector('#toggle-labels') as HTMLInputElement;
    if (labelsToggle) labelsToggle.checked = false;
    state.labels = false;
  }
}

// Store map instance for quality mode access
declare global {
  interface Window {
    _mapInstance?: Map;
  }
}

/**
 * Start updating metrics display
 */
function startMetricsUpdate(): void {
  const fpsEl = document.querySelector('#metric-fps') as HTMLElement;
  const agentsEl = document.querySelector('#metric-agents') as HTMLElement;

  if (!fpsEl || !agentsEl) return;

  // Update every 500ms
  setInterval(() => {
    const metrics = getPerformanceMetrics();
    fpsEl.textContent = metrics.fps > 0 ? `${metrics.fps} FPS` : '-- FPS';
    agentsEl.textContent = `${getAgentCount()} agentes`;
  }, 500);
}

/**
 * Update simulation status display - Humanized text
 */
function updateSimulationStatus(): void {
  const statusDot = document.querySelector('#status-dot') as HTMLElement;
  const statusText = document.querySelector('#status-text') as HTMLElement;
  const playBtn = document.querySelector('#btn-play') as HTMLButtonElement;

  if (statusDot && statusText) {
    if (isRunning()) {
      statusText.textContent = 'Simulación activa';
      statusDot.classList.add('active');
      if (playBtn) {
        playBtn.classList.add('playing');
      }
    } else {
      statusText.textContent = 'Sin actividad';
      statusDot.classList.remove('active');
      if (playBtn) {
        playBtn.classList.remove('playing');
      }
    }
  }
}

/**
 * Update agent count display from viewport (Supabase agents)
 */
function updateViewportAgentCount(): void {
  const countEl = document.querySelector('#agent-count-display') as HTMLElement;
  if (countEl) {
    const count = getViewportAgentCount();
    countEl.textContent = `${count} agente${count !== 1 ? 's' : ''}`;
  }
}

/**
 * Update panel state
 */
export function updatePanelState(newState: Partial<PanelState>): void {
  Object.assign(state, newState);

  // Update UI
  const buildingsToggle = document.querySelector('#toggle-buildings') as HTMLInputElement;
  const roadsToggle = document.querySelector('#toggle-roads') as HTMLInputElement;
  const labelsToggle = document.querySelector('#toggle-labels') as HTMLInputElement;
  const agentsToggle = document.querySelector('#toggle-agents') as HTMLInputElement;
  const agentCountSlider = document.querySelector('#slider-agent-count') as HTMLInputElement;
  const speedSlider = document.querySelector('#slider-speed') as HTMLInputElement;

  if (buildingsToggle) buildingsToggle.checked = state.buildings;
  if (roadsToggle) roadsToggle.checked = state.roads;
  if (labelsToggle) labelsToggle.checked = state.labels;
  if (agentsToggle) agentsToggle.checked = state.agents;
  if (agentCountSlider) agentCountSlider.value = state.agentCount.toString();
  if (speedSlider) speedSlider.value = state.simulationSpeed.toString();
}

/**
 * Get current panel state
 */
export function getPanelState(): PanelState {
  return { ...state };
}

// Store callbacks for viewport updates
let viewportCallbacks: {
  onLoading?: () => void;
  onLoaded?: (count: number) => void;
  onError?: (error: string) => void;
} = {};

/**
 * Set viewport callbacks to update panel status
 */
export function setViewportCallbacks(callbacks: {
  onLoading?: () => void;
  onLoaded?: (count: number) => void;
  onError?: (error: string) => void;
}): void {
  viewportCallbacks = callbacks;
}

/**
 * Update panel status from viewport loading state
 */
export function setViewportLoading(): void {
  const statusText = document.querySelector('#status-text') as HTMLElement;
  const statusDot = document.querySelector('#status-dot') as HTMLElement;
  const agentCountDisplay = document.querySelector('#agent-count-display') as HTMLElement;
  
  if (statusText) statusText.textContent = 'Cargando agentes...';
  if (statusDot) statusDot.classList.add('loading');
  if (agentCountDisplay) agentCountDisplay.textContent = '...';
  
  viewportCallbacks.onLoading?.();
}

/**
 * Update panel status when viewport agents are loaded
 */
export function setViewportLoaded(count: number): void {
  const statusText = document.querySelector('#status-text') as HTMLElement;
  const statusDot = document.querySelector('#status-dot') as HTMLElement;
  const agentCountDisplay = document.querySelector('#agent-count-display') as HTMLElement;
  
  if (statusText) statusText.textContent = 'Agentes cargados';
  if (statusDot) {
    statusDot.classList.remove('loading');
    statusDot.classList.add('active');
  }
  if (agentCountDisplay) agentCountDisplay.textContent = `${count} agente${count !== 1 ? 's' : ''}`;
  
  viewportCallbacks.onLoaded?.(count);
}

/**
 * Update panel status when viewport has error
 */
export function setViewportError(error: string): void {
  const statusText = document.querySelector('#status-text') as HTMLElement;
  const statusDot = document.querySelector('#status-dot') as HTMLElement;
  const agentCountDisplay = document.querySelector('#agent-count-display') as HTMLElement;
  
  if (statusText) statusText.textContent = 'Error al cargar';
  if (statusDot) {
    statusDot.classList.remove('loading', 'active');
    statusDot.classList.add('error');
  }
  if (agentCountDisplay) agentCountDisplay.textContent = '0 agentes';
  
  viewportCallbacks.onError?.(error);
}

/**
 * Update region subtitle based on viewport center
 */
function updateRegionSubtitle(map: Map): void {
  const subtitleEl = document.querySelector('#region-subtitle') as HTMLElement;
  if (!subtitleEl) return;

  const center = map.getCenter();
  const zoom = map.getZoom();
  const regionName = getRegionNameFromViewport(center.lng, center.lat, zoom);
  
  // Only update if changed
  if (subtitleEl.textContent !== regionName) {
    subtitleEl.textContent = regionName;
  }
}
