import type { Map } from 'maplibre-gl';
import { roadColors } from '../mapConfig';
import { safeSetPaint, findLayersByPattern } from '../utils/styleHelpers';

// Road layer patterns to match
const ROAD_PATTERNS = [
  'road',
  'street',
  'highway',
  'motorway',
  'trunk',
  'primary',
  'secondary',
  'tertiary',
  'residential',
  'path',
  'track',
];

// Specific road type patterns
const ROAD_TYPE_PATTERNS: Record<keyof typeof roadColors, string[]> = {
  motorway: ['motorway', 'highway_motorway'],
  trunk: ['trunk', 'highway_trunk'],
  primary: ['primary', 'highway_primary'],
  secondary: ['secondary', 'highway_secondary'],
  tertiary: ['tertiary', 'highway_tertiary'],
  street: ['street', 'road', 'unclassified'],
  residential: ['residential', 'living_street', 'service'],
};

/**
 * Recolorize road layers with cyberpunk colors
 * Reduced noise: secondary/tertiary/residential roads are dimmed
 */
export function recolorizeRoads(map: Map): void {
  try {
    const roadLayers = findLayersByPattern(map, ROAD_PATTERNS);

    if (roadLayers.length === 0) {
      console.warn('⚠️ No road layers found to recolorize');
      return;
    }

    console.log(`🛣️ Found ${roadLayers.length} road layers to recolorize`);

    for (const layerId of roadLayers) {
      const layer = map.getLayer(layerId);
      if (!layer || layer.type !== 'line') continue;

      // Determine road type from layer ID
      const layerIdLower = layerId.toLowerCase();
      let color = roadColors.street; // Default
      let opacity = 0.9;
      let minZoom = 10;
      let widthMultiplier = 1;

      // Match specific road types with aggressive noise reduction
      if (ROAD_TYPE_PATTERNS.motorway.some(p => layerIdLower.includes(p))) {
        color = roadColors.motorway;
        opacity = 0.9;
        minZoom = 5;
        widthMultiplier = 1.4;
      } else if (ROAD_TYPE_PATTERNS.trunk.some(p => layerIdLower.includes(p))) {
        color = roadColors.trunk;
        opacity = 0.85;
        minZoom = 6;
        widthMultiplier = 1.2;
      } else if (ROAD_TYPE_PATTERNS.primary.some(p => layerIdLower.includes(p))) {
        color = roadColors.primary;
        opacity = 0.75;
        minZoom = 8;
        widthMultiplier = 1.0;
      } else if (ROAD_TYPE_PATTERNS.secondary.some(p => layerIdLower.includes(p))) {
        color = roadColors.secondary;
        opacity = 0.4; // Much reduced
        minZoom = 13; // Show much later
        widthMultiplier = 0.6;
      } else if (ROAD_TYPE_PATTERNS.tertiary.some(p => layerIdLower.includes(p))) {
        color = roadColors.tertiary;
        opacity = 0.25; // Very subtle
        minZoom = 15; // Only at high zoom
        widthMultiplier = 0.4;
      } else if (ROAD_TYPE_PATTERNS.residential.some(p => layerIdLower.includes(p))) {
        color = roadColors.residential;
        opacity = 0.15; // Almost invisible
        minZoom = 16; // Only at very high zoom
        widthMultiplier = 0.3;
      }

      // Apply color
      safeSetPaint(map, layerId, 'line-color', color);

      // Enhanced line width with type-based multiplier
      safeSetPaint(map, layerId, 'line-width', [
        'interpolate',
        ['linear'],
        ['zoom'],
        10, 0.5 * widthMultiplier,
        12, 1 * widthMultiplier,
        14, 2 * widthMultiplier,
        16, 3 * widthMultiplier,
        18, 4 * widthMultiplier,
      ]);

      // Add glow effect with line-blur (more for main roads)
      safeSetPaint(map, layerId, 'line-blur', [
        'interpolate',
        ['linear'],
        ['zoom'],
        10, 0,
        14, 0.5 * widthMultiplier,
        18, 1.5 * widthMultiplier,
      ]);

      // Set opacity with zoom-based fade for minor roads
      if (minZoom > 10) {
        safeSetPaint(map, layerId, 'line-opacity', [
          'interpolate',
          ['linear'],
          ['zoom'],
          minZoom - 1, 0,
          minZoom, opacity * 0.5,
          minZoom + 2, opacity,
        ]);
      } else {
        safeSetPaint(map, layerId, 'line-opacity', opacity);
      }
    }

    console.log('✅ Roads recolorized successfully (noise reduced)');
  } catch (error) {
    console.error('Failed to recolorize roads:', error);
  }
}

/**
 * Toggle road layer visibility
 */
export function toggleRoads(map: Map, visible: boolean): void {
  const roadLayers = findLayersByPattern(map, ROAD_PATTERNS);
  const visibility = visible ? 'visible' : 'none';

  for (const layerId of roadLayers) {
    try {
      map.setLayoutProperty(layerId, 'visibility', visibility);
    } catch (error) {
      console.warn(`Failed to toggle road layer "${layerId}":`, error);
    }
  }
}

/**
 * Get all road layer IDs
 */
export function getRoadLayerIds(map: Map): string[] {
  return findLayersByPattern(map, ROAD_PATTERNS);
}

/**
 * Update specific road type color
 */
export function updateRoadColor(
  map: Map,
  roadType: keyof typeof roadColors,
  color: string
): void {
  const patterns = ROAD_TYPE_PATTERNS[roadType];
  if (!patterns) return;

  const matchingLayers = findLayersByPattern(map, patterns);

  for (const layerId of matchingLayers) {
    safeSetPaint(map, layerId, 'line-color', color);
  }
}
