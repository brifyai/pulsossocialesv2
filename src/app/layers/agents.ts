/**
 * Agents layer - oriented symbol visualization
 * Uses icon-image with rotation based on heading
 */

import type { Map, GeoJSONSource } from 'maplibre-gl';
import { layerExists, sourceExists } from '../utils/styleHelpers';
import { addAgentIcons, AGENT_ICON_NAMES } from '../utils/icons';

// Agent layer configuration
const AGENTS_CONFIG = {
  sourceId: 'agents-source',
  symbolLayerId: 'agents-symbol',
  circleLayerId: 'agents-circle', // Fallback layer
  extrusionLayerId: 'agents-extrusion', // 3D vertical bars
  // Icon settings
  iconName: AGENT_ICON_NAMES.ARROW,
  iconSize: 0.4, // Small icon
  iconSizeMobile: 0.5,
  // Colors for fallback circle
  color: '#8efcff',
  colorMoving: '#8efcff',
  colorPaused: '#4dd0e1',
  radius: 2.5,
  opacity: 0.9,
  // Extrusion settings
  extrusionHeight: 150, // Height of vertical bars in meters
  extrusionColor: '#8efcff',
  extrusionOpacity: 0.8,
};

// Type for agent GeoJSON data
type AgentGeoJSON = GeoJSON.FeatureCollection<GeoJSON.Point>;

// Track if icons have been added
let iconsAdded = false;

/**
 * Ensure the agents layer exists on the map
 * Creates source, adds icons, and creates symbol layer
 */
export async function ensureAgentsLayer(map: Map): Promise<boolean> {
  try {
    // Add icons first (only once)
    if (!iconsAdded) {
      await addAgentIcons(map);
      iconsAdded = true;
    }

    // Check if source already exists
    if (!sourceExists(map, AGENTS_CONFIG.sourceId)) {
      // Create empty GeoJSON source
      map.addSource(AGENTS_CONFIG.sourceId, {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: [],
        },
      });
      console.log(`✅ Created agents source: ${AGENTS_CONFIG.sourceId}`);
    }

    // Create symbol layer for oriented agents (primary)
    if (!layerExists(map, AGENTS_CONFIG.symbolLayerId)) {
      map.addLayer({
        id: AGENTS_CONFIG.symbolLayerId,
        type: 'symbol',
        source: AGENTS_CONFIG.sourceId,
        layout: {
          // Use the arrow icon
          'icon-image': AGENTS_CONFIG.iconName,
          // Size scales slightly with zoom
          'icon-size': [
            'interpolate',
            ['linear'],
            ['zoom'],
            14, AGENTS_CONFIG.iconSize,
            18, AGENTS_CONFIG.iconSize + 0.1,
            22, AGENTS_CONFIG.iconSize + 0.2,
          ],
          // Rotation based on heading property (in degrees)
          // MapLibre: 0 = up (north), clockwise
          'icon-rotate': ['get', 'heading'],
          // Allow icons to overlap for dense areas
          'icon-allow-overlap': true,
          'icon-ignore-placement': true,
          // Keep icon upright (don't flip when rotated)
          'icon-rotation-alignment': 'map',
          // Anchor at center
          'icon-anchor': 'center',
        },
        paint: {
          // Subtle opacity
          'icon-opacity': AGENTS_CONFIG.opacity,
          // Optional: slight color adjustment via hsl
          // 'icon-color': '#8efcff', // Only works with SDF icons
        },
      });
      console.log(`✅ Created agents symbol layer: ${AGENTS_CONFIG.symbolLayerId}`);
    }

    // Create fallback circle layer (hidden by default)
    if (!layerExists(map, AGENTS_CONFIG.circleLayerId)) {
      map.addLayer({
        id: AGENTS_CONFIG.circleLayerId,
        type: 'circle',
        source: AGENTS_CONFIG.sourceId,
        paint: {
          'circle-radius': [
            'interpolate',
            ['linear'],
            ['zoom'],
            14, AGENTS_CONFIG.radius,
            18, AGENTS_CONFIG.radius + 1,
          ],
          'circle-color': [
            'case',
            ['==', ['get', 'state'], 'paused'],
            AGENTS_CONFIG.colorPaused,
            AGENTS_CONFIG.colorMoving,
          ],
          'circle-opacity': 0,
        },
      });
      console.log(`✅ Created agents fallback layer: ${AGENTS_CONFIG.circleLayerId}`);
    }

    // Create 3D extrusion layer for vertical bars
    if (!layerExists(map, AGENTS_CONFIG.extrusionLayerId)) {
      map.addLayer({
        id: AGENTS_CONFIG.extrusionLayerId,
        type: 'fill-extrusion',
        source: AGENTS_CONFIG.sourceId,
        paint: {
          // Height of the extrusion in meters - use 'height' property from GeoJSON
          // Ensure minimum height of 50m so bars are always visible
          'fill-extrusion-height': [
            'max',
            50, // Minimum height to ensure visibility
            [
              'interpolate',
              ['linear'],
              ['zoom'],
              6, ['*', ['get', 'height'], 0.2],   // Very short when zoomed out
              10, ['*', ['get', 'height'], 0.4],  // Short at medium zoom
              14, ['*', ['get', 'height'], 0.7],  // Medium height
              18, ['get', 'height'],              // Full height when zoomed in
            ]
          ],
          // Base height (start from ground)
          'fill-extrusion-base': 0,
          // Color of the extrusion - bright cyan for visibility
          'fill-extrusion-color': AGENTS_CONFIG.extrusionColor,
          // Opacity - higher for better visibility
          'fill-extrusion-opacity': [
            'interpolate',
            ['linear'],
            ['zoom'],
            6, 0.6,   // Visible even when zoomed out
            10, 0.7,
            14, 0.85,
            18, AGENTS_CONFIG.extrusionOpacity,
          ],
          // Vertical gradient (darker at bottom, lighter at top)
          'fill-extrusion-vertical-gradient': true,
        },
      });
      console.log(`✅ Created agents extrusion layer: ${AGENTS_CONFIG.extrusionLayerId}`);
    }

    return true;
  } catch (error) {
    console.error('Failed to ensure agents layer:', error);
    return false;
  }
}

/**
 * Update agents GeoJSON data
 * Heading should be in degrees (0-360), where 0 = north/up
 */
export function updateAgentsGeoJSON(map: Map, data: AgentGeoJSON): boolean {
  try {
    // Ensure layer exists first
    ensureAgentsLayer(map);

    // Get source and update data
    const source = map.getSource(AGENTS_CONFIG.sourceId) as GeoJSONSource;
    if (!source) {
      console.warn('Agents source not found');
      return false;
    }

    source.setData(data);
    return true;
  } catch (error) {
    console.error('Failed to update agents GeoJSON:', error);
    return false;
  }
}

/**
 * Toggle agents layer visibility
 */
export function toggleAgents(map: Map, visible: boolean): void {
  const visibility = visible ? 'visible' : 'none';
  try {
    // Toggle symbol layer (primary)
    if (layerExists(map, AGENTS_CONFIG.symbolLayerId)) {
      map.setLayoutProperty(AGENTS_CONFIG.symbolLayerId, 'visibility', visibility);
    }
    // Toggle fallback circle layer
    if (layerExists(map, AGENTS_CONFIG.circleLayerId)) {
      map.setLayoutProperty(AGENTS_CONFIG.circleLayerId, 'visibility', visibility);
    }
    // Toggle extrusion layer
    if (layerExists(map, AGENTS_CONFIG.extrusionLayerId)) {
      map.setLayoutProperty(AGENTS_CONFIG.extrusionLayerId, 'visibility', visibility);
    }
  } catch (error) {
    console.warn('Failed to toggle agents layer:', error);
  }
}

/**
 * Check if agents layer exists
 */
export function hasAgentsLayer(map: Map): boolean {
  return layerExists(map, AGENTS_CONFIG.symbolLayerId);
}

/**
 * Get agent count
 */
export function getAgentCount(map: Map): number {
  try {
    const source = map.getSource(AGENTS_CONFIG.sourceId) as GeoJSONSource;
    if (!source) return 0;

    const data = source._data as unknown as AgentGeoJSON;
    return data?.features?.length || 0;
  } catch {
    return 0;
  }
}

/**
 * Clear all agents
 */
export function clearAgents(map: Map): boolean {
  try {
    const source = map.getSource(AGENTS_CONFIG.sourceId) as GeoJSONSource;
    if (!source) return false;

    source.setData({
      type: 'FeatureCollection',
      features: [],
    });
    return true;
  } catch (error) {
    console.error('Failed to clear agents:', error);
    return false;
  }
}

/**
 * Switch between icon types
 * @param iconName - One of the AGENT_ICON_NAMES values
 */
export function setAgentIcon(map: Map, iconName: string): void {
  try {
    if (layerExists(map, AGENTS_CONFIG.symbolLayerId)) {
      map.setLayoutProperty(AGENTS_CONFIG.symbolLayerId, 'icon-image', iconName);
    }
  } catch (error) {
    console.error('Failed to set agent icon:', error);
  }
}

/**
 * Set icon size
 */
export function setAgentIconSize(map: Map, size: number): void {
  try {
    if (layerExists(map, AGENTS_CONFIG.symbolLayerId)) {
      map.setLayoutProperty(AGENTS_CONFIG.symbolLayerId, 'icon-size', size);
    }
  } catch (error) {
    console.error('Failed to set agent icon size:', error);
  }
}

// Track if click handler is already set up
let clickHandlerSetup = false;

/**
 * Setup click handler for agents to show profile popup
 * Call this once after the map is initialized
 */
export function setupAgentClickHandler(map: Map): void {
  if (clickHandlerSetup) return;
  
  // Click on agent layer
  map.on('click', AGENTS_CONFIG.symbolLayerId, (e) => {
    if (e.features && e.features.length > 0) {
      const feature = e.features[0];
      const properties = feature.properties;
      
      if (properties) {
        showAgentProfilePopup(map, e.lngLat, properties);
      }
    }
  });

  // Change cursor on hover
  map.on('mouseenter', AGENTS_CONFIG.symbolLayerId, () => {
    map.getCanvas().style.cursor = 'pointer';
  });

  map.on('mouseleave', AGENTS_CONFIG.symbolLayerId, () => {
    map.getCanvas().style.cursor = '';
  });

  // Also handle clicks on extrusion layer
  map.on('click', AGENTS_CONFIG.extrusionLayerId, (e) => {
    if (e.features && e.features.length > 0) {
      const feature = e.features[0];
      const properties = feature.properties;
      
      if (properties) {
        showAgentProfilePopup(map, e.lngLat, properties);
      }
    }
  });

  map.on('mouseenter', AGENTS_CONFIG.extrusionLayerId, () => {
    map.getCanvas().style.cursor = 'pointer';
  });

  map.on('mouseleave', AGENTS_CONFIG.extrusionLayerId, () => {
    map.getCanvas().style.cursor = '';
  });

  clickHandlerSetup = true;
  console.log('✅ Agent click handler setup complete');
}

/**
 * Show agent profile popup
 */
function showAgentProfilePopup(
  map: Map,
  lngLat: { lng: number; lat: number },
  properties: Record<string, unknown>
): void {
  // Remove existing popup if any
  const existingPopup = document.querySelector('.agent-profile-popup');
  if (existingPopup) {
    existingPopup.remove();
  }

  // Create popup element
  const popup = document.createElement('div');
  popup.className = 'agent-profile-popup';
  
  // Extract agent data
  const agentId = properties.id || properties.agent_id || 'Unknown';
  const age = properties.age || properties.edad || 'N/A';
  const gender = properties.gender || properties.sexo || 'N/A';
  const education = properties.education || properties.educacion || 'N/A';
  const income = properties.income || properties.ingreso || 'N/A';
  const region = properties.region || 'N/A';
  const comuna = properties.comuna || 'N/A';
  
  // Format gender
  const genderDisplay = typeof gender === 'string' ? 
    (gender.toLowerCase() === 'm' ? 'Masculino' : 
     gender.toLowerCase() === 'f' ? 'Femenino' : gender) : 
    gender;

  popup.innerHTML = `
    <div class="agent-profile-header">
      <span class="agent-profile-icon">👤</span>
      <span class="agent-profile-title">Agente #${agentId}</span>
      <button class="agent-profile-close">×</button>
    </div>
    <div class="agent-profile-content">
      <div class="agent-profile-row">
        <span class="agent-profile-label">Edad:</span>
        <span class="agent-profile-value">${age} años</span>
      </div>
      <div class="agent-profile-row">
        <span class="agent-profile-label">Género:</span>
        <span class="agent-profile-value">${genderDisplay}</span>
      </div>
      <div class="agent-profile-row">
        <span class="agent-profile-label">Educación:</span>
        <span class="agent-profile-value">${education}</span>
      </div>
      <div class="agent-profile-row">
        <span class="agent-profile-label">Ingreso:</span>
        <span class="agent-profile-value">${income}</span>
      </div>
      <div class="agent-profile-row">
        <span class="agent-profile-label">Ubicación:</span>
        <span class="agent-profile-value">${comuna}, ${region}</span>
      </div>
    </div>
  `;

  // Style the popup
  popup.style.cssText = `
    position: absolute;
    background: rgba(10, 15, 30, 0.95);
    border: 1px solid rgba(142, 252, 255, 0.5);
    border-radius: 8px;
    padding: 12px;
    min-width: 220px;
    color: #fff;
    font-family: 'Rajdhani', sans-serif;
    font-size: 13px;
    z-index: 1000;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5), 0 0 20px rgba(142, 252, 255, 0.2);
    pointer-events: auto;
  `;

  // Add styles for inner elements
  const style = document.createElement('style');
  style.textContent = `
    .agent-profile-header {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 10px;
      padding-bottom: 8px;
      border-bottom: 1px solid rgba(142, 252, 255, 0.3);
    }
    .agent-profile-icon {
      font-size: 18px;
    }
    .agent-profile-title {
      font-weight: 600;
      color: #8efcff;
      flex: 1;
    }
    .agent-profile-close {
      background: none;
      border: none;
      color: #8efcff;
      font-size: 20px;
      cursor: pointer;
      padding: 0;
      width: 24px;
      height: 24px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 4px;
      transition: background 0.2s;
    }
    .agent-profile-close:hover {
      background: rgba(142, 252, 255, 0.2);
    }
    .agent-profile-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 6px;
    }
    .agent-profile-label {
      color: rgba(255, 255, 255, 0.6);
    }
    .agent-profile-value {
      color: #fff;
      font-weight: 500;
    }
  `;
  document.head.appendChild(style);

  // Position popup near the click
  const canvas = map.getCanvas();
  const rect = canvas.getBoundingClientRect();
  const point = map.project([lngLat.lng, lngLat.lat]);
  
  popup.style.left = `${rect.left + point.x + 10}px`;
  popup.style.top = `${rect.top + point.y - 50}px`;

  // Close button handler
  const closeBtn = popup.querySelector('.agent-profile-close');
  closeBtn?.addEventListener('click', () => {
    popup.remove();
  });

  // Close on click outside
  const closeOnClickOutside = (e: MouseEvent) => {
    if (!popup.contains(e.target as Node)) {
      popup.remove();
      document.removeEventListener('click', closeOnClickOutside);
    }
  };
  
  // Add to document
  document.body.appendChild(popup);
  
  // Delay adding the click listener to avoid immediate close
  setTimeout(() => {
    document.addEventListener('click', closeOnClickOutside);
  }, 100);
}
