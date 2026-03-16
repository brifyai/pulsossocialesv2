/**
 * MapView Page - Vista del mapa que envuelve la escena local existente
 * 
 * Esta página preserva:
 * - La escena MapLibre + MapTiler
 * - El panel de control de escena (SceneControlPanel)
 * - La simulación de agentes
 * 
 * Sprint 8A: Agregado Quality Mode (Full/Lite)
 */

import type { Map } from 'maplibre-gl';
import { initMap } from '../app/initMap';
import { initEngine, startSimulation, setAgentCount, setGlobalSpeed } from '../app/simulation/agentEngine';
import {
  initQualityMode,
  onQualityModeChange,
  startPerformanceMonitoring,
  saveQualityMode,
  cleanupQualityMode,
} from '../app/performance/qualityMode';
import { toggleLabels } from '../app/layers/labels';

let mapInstance: Map | null = null;
let qualityModeUnsubscribe: (() => void) | null = null;

/**
 * Create the Map View page
 * This wraps the existing scene without modifying its logic
 */
export function createMapViewPage(): HTMLElement {
  const page = document.createElement('div');
  page.className = 'page map-view-page';
  page.id = 'map-view';

  // Create map container (same as before)
  const mapContainer = document.createElement('div');
  mapContainer.id = 'map';
  page.appendChild(mapContainer);

  // Add page to DOM FIRST so #map exists
  const mainContent = document.getElementById('main-content');
  if (mainContent) {
    mainContent.appendChild(page);
  }

  // Initialize map after page is in DOM
  initializeMapScene(mapContainer, page);

  return page;
}

/**
 * Initialize the map scene (preserves original logic)
 * Sprint 8A: Agregado Quality Mode
 */
function initializeMapScene(_container: HTMLElement, _page: HTMLElement): void {
  console.log('🗺️ MapView: Initializing map scene...');

  try {
    // Initialize quality mode system
    initQualityMode(true);

    // Initialize map (same as original main.ts)
    const map = initMap();
    mapInstance = map;

    // Store map instance for quality mode access
    window._mapInstance = map;

    // Wait for map to load
    map.once('load', () => {
      console.log('🗺️ MapView: Map loaded, panel is created by initMap...');

      // Initialize agent engine
      initEngine(map);

      // Setup quality mode callback
      setupQualityModeCallback(map);

      // Start performance monitoring
      startPerformanceMonitoring((_metrics) => {
        // Metrics are displayed in panel UI
        // console.log(`📊 FPS: ${_metrics.fps}, Agents: ${_metrics.agentCount}`);
      });

      // Auto-start simulation
      setTimeout(() => {
        startSimulation();
        console.log('▶️ MapView: Simulation auto-started');
      }, 500);

      console.log('✅ MapView: Scene initialized successfully');
    });

    // Expose for debugging
    (window as unknown as Record<string, unknown>).map = map;

  } catch (error) {
    console.error('❌ MapView: Failed to initialize:', error);
  }
}

/**
 * Setup quality mode change callback
 * Applies settings when mode changes
 */
function setupQualityModeCallback(map: Map): void {
  qualityModeUnsubscribe = onQualityModeChange((mode, config) => {
    console.log(`🎛️ MapView: Applying ${mode} mode settings`);

    // Apply agent count limit
    const currentAgentCount = parseInt(
      (document.querySelector('#slider-agent-count') as HTMLInputElement)?.value || '50',
      10
    );
    if (currentAgentCount > config.maxAgents) {
      setAgentCount(config.maxAgents);
    }

    // Apply simulation speed
    setGlobalSpeed(config.simulationSpeed);

    // Toggle labels
    if (!config.enableLabels) {
      toggleLabels(map, false);
    }

    // Save preference
    saveQualityMode();
  });
}

/**
 * Get the current map instance
 */
export function getMapInstance(): Map | null {
  return mapInstance;
}

/**
 * Cleanup map view
 * Sprint 8A: Agregado cleanup de quality mode
 */
export function cleanupMapView(): void {
  // Unsubscribe from quality mode changes
  if (qualityModeUnsubscribe) {
    qualityModeUnsubscribe();
    qualityModeUnsubscribe = null;
  }

  // Cleanup quality mode system
  cleanupQualityMode();

  // Remove map instance reference
  if (window._mapInstance) {
    delete window._mapInstance;
  }

  if (mapInstance) {
    mapInstance.remove();
    mapInstance = null;
    console.log('🧹 MapView: Cleaned up');
  }
}
