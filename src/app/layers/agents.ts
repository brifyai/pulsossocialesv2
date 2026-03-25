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
          // Height of the extrusion in meters
          'fill-extrusion-height': [
            'interpolate',
            ['linear'],
            ['zoom'],
            10, AGENTS_CONFIG.extrusionHeight * 0.3,  // Shorter when zoomed out
            14, AGENTS_CONFIG.extrusionHeight * 0.6,
            18, AGENTS_CONFIG.extrusionHeight,         // Full height when zoomed in
          ],
          // Base height (start from ground)
          'fill-extrusion-base': 0,
          // Color of the extrusion
          'fill-extrusion-color': AGENTS_CONFIG.extrusionColor,
          // Opacity
          'fill-extrusion-opacity': [
            'interpolate',
            ['linear'],
            ['zoom'],
            10, AGENTS_CONFIG.extrusionOpacity * 0.5,
            14, AGENTS_CONFIG.extrusionOpacity,
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
