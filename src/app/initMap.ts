/**
 * ⚠️ ARCHIVO SAGRADO - VER GUARDRAILS.md
 * Este archivo es CRÍTICO para el funcionamiento del mapa.
 * NO MODIFICAR sin revisar impacto en:
 * - Inicialización de MapLibre
 * - Orden de carga de capas
 * - Configuración de controles
 * - Integración con UI
 *
 * Cambios permitidos solo para:
 * - Bug fixes críticos
 * - Agregar controles nuevos (con cuidado)
 * - Optimización de inicialización
 */

import { Map, NavigationControl } from 'maplibre-gl';
import type { MapInstance } from '../types/map';
import { mapConfig, INITIAL_CAMERA } from './mapConfig';
import { applyFog } from './fog';
import { createBuildingLayer } from './layers/buildings';
import { recolorizeRoads } from './layers/roads';
import { recolorizeLabels } from './layers/labels';
import { applyStyleTweaks } from './styleTweaks';
import { ensureAgentsLayer } from './layers/agents';
import { createPanel } from '../ui/panel';

/**
 * Initialize the map
 * CHECKPOINT: v0.1.0 - Base estable
 */
export function initMap(): MapInstance {
  // Check for API key
  const apiKey = import.meta.env.VITE_MAPTILER_KEY;
  if (!apiKey || apiKey === 'your_key_here') {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'api-key-error';
    errorDiv.innerHTML = `
      <div class="error-content">
        <h2>⚠️ API Key Required</h2>
        <p>Please configure your MapTiler API key:</p>
        <ol>
          <li>Copy <code>.env.example</code> to <code>.env</code></li>
          <li>Replace <code>your_key_here</code> with your actual API key</li>
          <li>Restart the dev server</li>
        </ol>
        <p>Get your free API key at: <a href="https://cloud.maptiler.com/account/keys/" target="_blank">https://cloud.maptiler.com/account/keys/</a></p>
      </div>
    `;
    document.body.appendChild(errorDiv);
    throw new Error('VITE_MAPTILER_KEY not configured');
  }

  // Create map instance
  const mapOptions: Record<string, unknown> = {
    container: mapConfig.container,
    style: mapConfig.style,
    center: mapConfig.center,
    zoom: mapConfig.zoom,
    pitch: mapConfig.pitch,
    bearing: mapConfig.bearing,
    hash: mapConfig.hash,
    maxPitch: 85,
  };

  // Add antialias if supported
  if (mapConfig.antialias) {
    mapOptions.antialias = true;
  }

  const map = new Map(mapOptions as ConstructorParameters<typeof Map>[0]);

  // Add navigation control
  map.addControl(new NavigationControl(), 'top-right');

  // Setup map load handler
  map.on('load', () => {
    console.log('🗺️ Map loaded successfully');

    // Apply cyberpunk styling
    applyStyleTweaks(map);
    recolorizeRoads(map);
    recolorizeLabels(map);
    createBuildingLayer(map);
    applyFog(map);
    ensureAgentsLayer(map);

    // Create UI panel
    const panel = createPanel(map);
    document.body.appendChild(panel);

    console.log('✅ Map initialization complete');
  });

  // Error handling
  map.on('error', (e) => {
    console.error('Map error:', e);
  });

  return map;
}

/**
 * Recenter map to initial position
 */
export function recenterMap(map: MapInstance): void {
  map.flyTo({
    center: INITIAL_CAMERA.center,
    zoom: INITIAL_CAMERA.zoom,
    pitch: INITIAL_CAMERA.pitch,
    bearing: INITIAL_CAMERA.bearing,
    duration: 2000,
  });
}

/**
 * Get map debug info
 */
export function getMapDebugInfo(map: MapInstance): Record<string, unknown> {
  const style = map.getStyle();
  return {
    center: map.getCenter(),
    zoom: map.getZoom(),
    pitch: map.getPitch(),
    bearing: map.getBearing(),
    layerCount: style.layers?.length || 0,
    sourceCount: Object.keys(style.sources || {}).length,
  };
}
