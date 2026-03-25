/**
 * Agents Viewport Layer
 * 
 * Sistema de carga de agentes basado en el viewport del mapa.
 * - Escucha cambios de viewport con debounce
 * - Carga agentes solo del área visible
 * - Soporta clustering para zoom bajo
 * - Estrategia de renderizado según nivel de zoom
 * 
 * Sprint 12C: Visualización de 25,000 agentes
 */

import type { Map } from 'maplibre-gl';
import { getAgentsInBBox, getAgentClusters } from '../../services/supabase/repositories/agentRepository';
import type { SyntheticAgent } from '../../types/agent';
import { updateAgentsGeoJSON, ensureAgentsLayer } from './agents';

// Configuration
const CONFIG = {
  // Debounce time in ms
  debounceMs: 300,
  
  // Zoom thresholds
  zoom: {
    cluster: 10,      // Below this: show clusters
    simplified: 14,   // Below this: show simplified points
    detailed: 18,     // Above this: show detailed agents
  },
  
  // Limits
  limits: {
    cluster: 5000,    // Max agents for clustering
    simplified: 1000, // Max agents for simplified view
    detailed: 500,    // Max agents for detailed view
  },
  
  // Grid size for clustering (degrees)
  clusterGridSize: 0.1,
};

// State
interface ViewportState {
  isLoading: boolean;
  lastBounds: [[number, number], [number, number]] | null;
  lastZoom: number;
  debounceTimer: number | null;
  abortController: AbortController | null;
}

const state: ViewportState = {
  isLoading: false,
  lastBounds: null,
  lastZoom: 0,
  debounceTimer: null,
  abortController: null,
};

// Callbacks
interface ViewportCallbacks {
  onLoading?: () => void;
  onLoaded?: (count: number) => void;
  onError?: (error: Error) => void;
}

let callbacks: ViewportCallbacks = {};

/**
 * Initialize the viewport agent layer
 * Sets up event listeners on the map
 */
export function initAgentsViewport(map: Map, opts?: ViewportCallbacks): void {
  callbacks = opts || {};
  
  // Ensure the base agents layer exists
  ensureAgentsLayer(map);
  
  // Set up viewport change listener with debounce
  map.on('moveend', () => {
    handleViewportChange(map);
  });
  
  // Initial load
  handleViewportChange(map);
  
  console.log('[🟢 AgentsViewport] Inicializado');
}

/**
 * Handle viewport changes with debounce
 */
function handleViewportChange(map: Map): void {
  // Clear existing timer
  if (state.debounceTimer) {
    window.clearTimeout(state.debounceTimer);
  }
  
  // Cancel previous request
  if (state.abortController) {
    state.abortController.abort();
  }
  
  // Set new timer
  state.debounceTimer = window.setTimeout(() => {
    loadAgentsForViewport(map);
  }, CONFIG.debounceMs);
}

/**
 * Load agents based on current viewport
 */
async function loadAgentsForViewport(map: Map): Promise<void> {
  const bounds = map.getBounds();
  const zoom = map.getZoom();
  
  // Calculate bounding box
  const sw: [number, number] = [bounds.getWest(), bounds.getSouth()];
  const ne: [number, number] = [bounds.getEast(), bounds.getNorth()];
  
  // Skip if bounds haven't changed significantly
  if (state.lastBounds && 
      Math.abs(state.lastBounds[0][0] - sw[0]) < 0.001 &&
      Math.abs(state.lastBounds[0][1] - sw[1]) < 0.001 &&
      Math.abs(state.lastBounds[1][0] - ne[0]) < 0.001 &&
      Math.abs(state.lastBounds[1][1] - ne[1]) < 0.001 &&
      state.lastZoom === zoom) {
    return;
  }
  
  state.lastBounds = [sw, ne];
  state.lastZoom = zoom;
  
  // Create new abort controller
  state.abortController = new AbortController();
  
  try {
    state.isLoading = true;
    callbacks.onLoading?.();
    
    console.log(`[🟢 AgentsViewport] Cargando agentes - Zoom: ${zoom.toFixed(1)}, BBox: [${sw[0].toFixed(2)},${sw[1].toFixed(2)}] to [${ne[0].toFixed(2)},${ne[1].toFixed(2)}]`);
    
    // Strategy based on zoom level
    if (zoom < CONFIG.zoom.cluster) {
      // Low zoom: show clusters
      await loadClusters(map, sw, ne);
    } else if (zoom < CONFIG.zoom.simplified) {
      // Medium zoom: show simplified points
      await loadSimplifiedAgents(map, sw, ne);
    } else {
      // High zoom: show detailed agents
      await loadDetailedAgents(map, sw, ne);
    }
    
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      console.log('[🟡 AgentsViewport] Request cancelado');
      return;
    }
    console.error('[🔴 AgentsViewport] Error cargando agentes:', error);
    callbacks.onError?.(error as Error);
  } finally {
    state.isLoading = false;
  }
}

/**
 * Load clusters for low zoom levels
 */
async function loadClusters(
  map: Map,
  sw: [number, number],
  ne: [number, number]
): Promise<void> {
  console.log('[🟢 AgentsViewport] Modo: Clusters');
  
  const clusters = await getAgentClusters(sw, ne, CONFIG.clusterGridSize);
  
  // Convert clusters to GeoJSON
  const geojson: GeoJSON.FeatureCollection<GeoJSON.Point> = {
    type: 'FeatureCollection',
    features: clusters.map(cluster => ({
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [cluster.lng, cluster.lat],
      },
      properties: {
        type: 'cluster',
        count: cluster.count,
        bounds: cluster.bounds,
      },
    })),
  };
  
  updateAgentsGeoJSON(map, geojson);
  callbacks.onLoaded?.(clusters.length);
  
  console.log(`[🟢 AgentsViewport] ✅ ${clusters.length} clusters renderizados`);
}

/**
 * Load simplified agents for medium zoom
 */
async function loadSimplifiedAgents(
  map: Map,
  sw: [number, number],
  ne: [number, number]
): Promise<void> {
  console.log('[🟢 AgentsViewport] Modo: Simplified');
  
  const agents = await getAgentsInBBox(sw, ne, {
    limit: CONFIG.limits.simplified,
  });
  
  const geojson = agentsToGeoJSON(agents, 'simplified');
  updateAgentsGeoJSON(map, geojson);
  callbacks.onLoaded?.(agents.length);
  
  console.log(`[🟢 AgentsViewport] ✅ ${agents.length} agentes simplificados renderizados`);
}

/**
 * Load detailed agents for high zoom
 */
async function loadDetailedAgents(
  map: Map,
  sw: [number, number],
  ne: [number, number]
): Promise<void> {
  console.log('[🟢 AgentsViewport] Modo: Detailed');
  
  const agents = await getAgentsInBBox(sw, ne, {
    limit: CONFIG.limits.detailed,
  });
  
  const geojson = agentsToGeoJSON(agents, 'detailed');
  updateAgentsGeoJSON(map, geojson);
  callbacks.onLoaded?.(agents.length);
  
  console.log(`[🟢 AgentsViewport] ✅ ${agents.length} agentes detallados renderizados`);
}

/**
 * Convert agents to GeoJSON format
 */
function agentsToGeoJSON(
  agents: SyntheticAgent[],
  mode: 'simplified' | 'detailed'
): GeoJSON.FeatureCollection<GeoJSON.Point> {
  return {
    type: 'FeatureCollection',
    features: agents
      .filter(agent => agent.location_lng && agent.location_lat) // Only agents with coordinates
      .map(agent => ({
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [
            agent.location_lng!,
            agent.location_lat!,
          ],
        },
        properties: {
          id: agent.agent_id,
          type: 'agent',
          mode,
          // Simplified properties
          ...(mode === 'simplified' && {
            age_group: agent.age_group,
            sex: agent.sex,
          }),
          // Detailed properties
          ...(mode === 'detailed' && {
            age: agent.age,
            sex: agent.sex,
            age_group: agent.age_group,
            income_decile: agent.income_decile,
            education_level: agent.education_level,
            connectivity_level: agent.connectivity_level,
            region_code: agent.region_code,
            comuna_code: agent.comuna_code,
          }),
        },
      })),
  };
}

/**
 * Force refresh of agents
 */
export function refreshAgentsViewport(map: Map): void {
  state.lastBounds = null; // Force refresh
  handleViewportChange(map);
}

/**
 * Cleanup
 */
export function cleanupAgentsViewport(): void {
  if (state.debounceTimer) {
    window.clearTimeout(state.debounceTimer);
  }
  if (state.abortController) {
    state.abortController.abort();
  }
}

/**
 * Get current loading state
 */
export function isViewportLoading(): boolean {
  return state.isLoading;
}

/**
 * Update configuration
 */
export function updateViewportConfig(newConfig: Partial<typeof CONFIG>): void {
  Object.assign(CONFIG, newConfig);
}
