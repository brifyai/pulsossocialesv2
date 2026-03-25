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
  extrusionSourceId: 'agents-extrusion-source', // Separate source for polygons
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

    // Create separate source for extrusion (polygons)
    if (!sourceExists(map, AGENTS_CONFIG.extrusionSourceId)) {
      map.addSource(AGENTS_CONFIG.extrusionSourceId, {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: [],
        },
      });
      console.log(`✅ Created agents extrusion source: ${AGENTS_CONFIG.extrusionSourceId}`);
    }

    // Create 3D extrusion layer for vertical bars
    if (!layerExists(map, AGENTS_CONFIG.extrusionLayerId)) {
      map.addLayer({
        id: AGENTS_CONFIG.extrusionLayerId,
        type: 'fill-extrusion',
        source: AGENTS_CONFIG.extrusionSourceId,
        paint: {
          // Height of the extrusion in meters - use 'height' property from GeoJSON
          // Height scales with zoom level for better visibility
          'fill-extrusion-height': [
            'interpolate',
            ['linear'],
            ['zoom'],
            6, 50,    // Fixed 50m minimum when zoomed out
            10, 80,   // Short at medium zoom
            14, 120,  // Medium height
            18, ['get', 'height'],  // Full height from data when zoomed in
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
 * Convert Point features to Polygon features for extrusion
 * Creates very thin vertical lines (3x3 meters) to avoid confusion with buildings
 */
function convertPointsToPolygons(
  data: AgentGeoJSON,
  squareSizeMeters: number = 3
): GeoJSON.FeatureCollection<GeoJSON.Polygon> {
  const features: GeoJSON.Feature<GeoJSON.Polygon>[] = [];

  for (const feature of data.features) {
    if (feature.geometry.type !== 'Point') continue;

    const [lng, lat] = feature.geometry.coordinates;
    
    // Calculate offset in degrees (approximate)
    // 1 degree latitude ≈ 111km, 1 degree longitude varies by latitude
    const latOffset = squareSizeMeters / 111000 / 2;
    const lngOffset = squareSizeMeters / (111000 * Math.cos(lat * Math.PI / 180)) / 2;

    // Create square polygon around the point
    const polygon: GeoJSON.Feature<GeoJSON.Polygon> = {
      type: 'Feature',
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [lng - lngOffset, lat - latOffset],
          [lng + lngOffset, lat - latOffset],
          [lng + lngOffset, lat + latOffset],
          [lng - lngOffset, lat + latOffset],
          [lng - lngOffset, lat - latOffset], // Close the polygon
        ]],
      },
      properties: feature.properties,
    };

    features.push(polygon);
  }

  return {
    type: 'FeatureCollection',
    features,
  };
}

// Store polygon data for extrusion layer
let polygonData: GeoJSON.FeatureCollection<GeoJSON.Polygon> | null = null;

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

    // Update symbol layer with Point data
    source.setData(data);

    // Convert to polygons for extrusion layer
    polygonData = convertPointsToPolygons(data);
    
    // Update extrusion source if it exists
    const extrusionSource = map.getSource(AGENTS_CONFIG.extrusionSourceId) as GeoJSONSource;
    if (extrusionSource) {
      extrusionSource.setData(polygonData);
    }

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
  const age = properties.age ?? 'N/A';
  const sex = properties.sex ?? 'N/A';
  const educationLevel = properties.education_level ?? 'N/A';
  const incomeDecile = properties.income_decile ?? 'N/A';
  const regionName = properties.region_name ?? properties.region_code ?? 'N/A';
  const comunaName = properties.comuna_name ?? properties.comuna_code ?? 'N/A';
  
  // Format sex to display
  const sexDisplay = typeof sex === 'string' ? 
    (sex.toLowerCase() === 'male' ? 'Masculino' : 
     sex.toLowerCase() === 'female' ? 'Femenino' : 
     sex.toLowerCase() === 'm' ? 'Masculino' : 
     sex.toLowerCase() === 'f' ? 'Femenino' : sex) : 
    sex;
  
  // Format education level - translate to Spanish
  const educationTranslations: Record<string, string> = {
    'none': 'Sin educación',
    'primary': 'Educación básica',
    'primary_incomplete': 'Educación básica incompleta',
    'primary_complete': 'Educación básica completa',
    'secondary': 'Educación media',
    'secondary_incomplete': 'Educación media incompleta',
    'secondary_complete': 'Educación media completa',
    'high_school': 'Educación media',
    'high_school_incomplete': 'Educación media incompleta',
    'high_school_complete': 'Educación media completa',
    'technical': 'Educación técnica',
    'technical_incomplete': 'Educación técnica incompleta',
    'technical_complete': 'Educación técnica completa',
    'university': 'Educación universitaria',
    'university_incomplete': 'Educación universitaria incompleta',
    'university_complete': 'Educación universitaria completa',
    'professional': 'Educación universitaria',
    'professional_incomplete': 'Educación universitaria incompleta',
    'professional_complete': 'Educación universitaria completa',
    'postgraduate': 'Postgrado',
    'master': 'Magíster',
    'doctorate': 'Doctorado',
    'other': 'Otra',
    'unknown': 'Desconocido',
  };
  
  const educationDisplay = typeof educationLevel === 'string' ? 
    (educationTranslations[educationLevel.toLowerCase()] || 
     educationLevel.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())) : 
    educationLevel;
  
  // Format income decile
  const incomeDisplay = incomeDecile !== 'N/A' && incomeDecile !== null ? 
    `Decil ${incomeDecile}` : 'N/A';

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
        <span class="agent-profile-value">${sexDisplay}</span>
      </div>
      <div class="agent-profile-row">
        <span class="agent-profile-label">Educación:</span>
        <span class="agent-profile-value">${educationDisplay}</span>
      </div>
      <div class="agent-profile-row">
        <span class="agent-profile-label">Ingreso:</span>
        <span class="agent-profile-value">${incomeDisplay}</span>
      </div>
      <div class="agent-profile-row">
        <span class="agent-profile-label">Ubicación:</span>
        <span class="agent-profile-value">${comunaName}, ${regionName}</span>
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
