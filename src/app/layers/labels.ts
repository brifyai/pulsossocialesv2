import type { Map } from 'maplibre-gl';
import { labelColors } from '../mapConfig';
import { safeSetPaint, findLayersByPattern } from '../utils/styleHelpers';

// Label layer patterns to match
const LABEL_PATTERNS = [
  'label',
  'place',
  'poi',
  'road-label',
  'street-label',
  'transit',
  'station',
  'airport',
];

// Specific label type patterns with priority
const LABEL_TYPE_PATTERNS = {
  major: ['place', 'city', 'town', 'country', 'state'], // Major places - always visible
  poi: ['poi', 'place_of_worship', 'shop', 'restaurant', 'cafe', 'bar'],
  transit: ['transit', 'station', 'bus', 'rail', 'subway', 'metro'],
  road: ['road', 'street', 'highway'],
  minor: ['village', 'hamlet', 'suburb', 'neighbourhood'], // Minor places - reduced
};

/**
 * Recolorize label layers with cyberpunk colors
 * Reduced noise: minor labels are dimmed or hidden
 */
export function recolorizeLabels(map: Map): void {
  try {
    const labelLayers = findLayersByPattern(map, LABEL_PATTERNS);

    if (labelLayers.length === 0) {
      console.warn('⚠️ No label layers found to recolorize');
      return;
    }

    console.log(`🏷️ Found ${labelLayers.length} label layers to recolorize`);

    for (const layerId of labelLayers) {
      const layer = map.getLayer(layerId);
      if (!layer || layer.type !== 'symbol') continue;

      // Determine label type from layer ID
      const layerIdLower = layerId.toLowerCase();
      let textColor = labelColors.text;
      let iconColor = labelColors.icon;
      let opacity = 0.95;
      let minZoom = 10;

      // Match specific label types with aggressive noise reduction
      if (LABEL_TYPE_PATTERNS.major.some(p => layerIdLower.includes(p))) {
        // Major places - prominent
        textColor = labelColors.text;
        iconColor = labelColors.text;
        opacity = 0.9;
        minZoom = 5;
      } else if (LABEL_TYPE_PATTERNS.transit.some(p => layerIdLower.includes(p))) {
        // Transit - visible but not overwhelming
        textColor = '#00ffff';
        iconColor = '#00ffff';
        opacity = 0.75;
        minZoom = 13;
      } else if (LABEL_TYPE_PATTERNS.poi.some(p => layerIdLower.includes(p))) {
        // POIs - very reduced
        textColor = labelColors.textSecondary;
        iconColor = labelColors.icon;
        opacity = 0.4;
        minZoom = 16;
      } else if (LABEL_TYPE_PATTERNS.road.some(p => layerIdLower.includes(p))) {
        // Road labels - very subtle
        textColor = labelColors.textSecondary;
        iconColor = labelColors.textSecondary;
        opacity = 0.3;
        minZoom = 15;
      } else if (LABEL_TYPE_PATTERNS.minor.some(p => layerIdLower.includes(p))) {
        // Minor places - almost invisible
        textColor = labelColors.textSecondary;
        iconColor = labelColors.textSecondary;
        opacity = 0.2;
        minZoom = 17;
      }

      // Apply text color
      safeSetPaint(map, layerId, 'text-color', textColor);

      // Apply text halo for readability
      safeSetPaint(map, layerId, 'text-halo-color', labelColors.halo);
      safeSetPaint(map, layerId, 'text-halo-width', 2);
      safeSetPaint(map, layerId, 'text-halo-blur', 1);

      // Apply icon color if available
      safeSetPaint(map, layerId, 'icon-color', iconColor);
      safeSetPaint(map, layerId, 'icon-halo-color', labelColors.halo);
      safeSetPaint(map, layerId, 'icon-halo-width', 2);

      // Apply opacity with zoom-based fade for minor labels
      if (minZoom > 10) {
        safeSetPaint(map, layerId, 'text-opacity', [
          'interpolate',
          ['linear'],
          ['zoom'],
          minZoom - 1, 0,
          minZoom, opacity * 0.5,
          minZoom + 2, opacity,
        ]);
        safeSetPaint(map, layerId, 'icon-opacity', [
          'interpolate',
          ['linear'],
          ['zoom'],
          minZoom - 1, 0,
          minZoom, opacity * 0.5,
          minZoom + 2, opacity,
        ]);
      } else {
        safeSetPaint(map, layerId, 'text-opacity', opacity);
        safeSetPaint(map, layerId, 'icon-opacity', opacity);
      }
    }

    console.log('✅ Labels recolorized successfully (noise reduced)');
  } catch (error) {
    console.error('Failed to recolorize labels:', error);
  }
}

/**
 * Toggle label layer visibility
 */
export function toggleLabels(map: Map, visible: boolean): void {
  const labelLayers = findLayersByPattern(map, LABEL_PATTERNS);
  const visibility = visible ? 'visible' : 'none';

  for (const layerId of labelLayers) {
    try {
      map.setLayoutProperty(layerId, 'visibility', visibility);
    } catch (error) {
      console.warn(`Failed to toggle label layer "${layerId}":`, error);
    }
  }
}

/**
 * Get all label layer IDs
 */
export function getLabelLayerIds(map: Map): string[] {
  return findLayersByPattern(map, LABEL_PATTERNS);
}

/**
 * Update label colors
 */
export function updateLabelColors(
  map: Map,
  colors: Partial<typeof labelColors>
): void {
  const mergedColors = { ...labelColors, ...colors };
  const labelLayers = findLayersByPattern(map, LABEL_PATTERNS);

  for (const layerId of labelLayers) {
    safeSetPaint(map, layerId, 'text-color', mergedColors.text);
    safeSetPaint(map, layerId, 'text-halo-color', mergedColors.halo);
    safeSetPaint(map, layerId, 'icon-color', mergedColors.icon);
  }
}
