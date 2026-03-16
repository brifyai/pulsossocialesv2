import type { Map } from 'maplibre-gl';
import { buildingColors } from '../mapConfig';
import { findBuildingSource, safeSetPaint, safeSetLayout, layerExists } from '../utils/styleHelpers';

const BUILDING_LAYER_ID = 'cyberpunk-buildings';

// Height thresholds for visual groups
const HEIGHT_LOW = 15;
const HEIGHT_MID = 50;

/**
 * Get exaggerated height expression with dramatic scaling
 */
function getHeightExpression(): unknown[] {
  const multiplier = buildingColors.heightMultiplier;
  return [
    'interpolate',
    ['linear'],
    ['zoom'],
    14, 0,
    14.5,
    ['*', multiplier, ['coalesce', ['to-number', ['get', 'render_height']], 8]]
  ];
}

/**
 * Create 3D building layer with height-based visual hierarchy
 * 
 * VISUAL HIERARCHY (via color interpolation):
 * - LOW (< 15m): Almost black
 * - MID (15-50m): Dark petroleum blue
 * - HIGH (> 50m): Teal/cyan with emissive
 */
export function createBuildingLayer(map: Map): boolean {
  try {
    const buildingSource = findBuildingSource(map);

    if (!buildingSource) {
      console.warn('⚠️ No building source found. Skipping building layer creation.');
      return false;
    }

    const { source, sourceLayer } = buildingSource;

    // Remove existing layer
    if (layerExists(map, BUILDING_LAYER_ID)) {
      map.removeLayer(BUILDING_LAYER_ID);
    }

    // Find first symbol layer for proper z-ordering
    const layers = map.getStyle().layers;
    let firstSymbolId: string | undefined;
    if (layers) {
      for (const layer of layers) {
        if (layer.type === 'symbol') {
          firstSymbolId = layer.id;
          break;
        }
      }
    }

    // Color based on height - creates visual hierarchy
    const heightBasedColor = [
      'interpolate',
      ['linear'],
      ['coalesce', ['to-number', ['get', 'render_height']], 0],
      0, buildingColors.low,           // Very dark for low
      HEIGHT_LOW, buildingColors.low,  // Still dark
      HEIGHT_LOW + 5, buildingColors.medium, // Transition to medium
      HEIGHT_MID, buildingColors.medium,     // Petroleum blue
      HEIGHT_MID + 10, buildingColors.high,  // Transition to high
      100, buildingColors.skyscraper,        // Bright cyan for tall
      200, '#3a7a8a'                         // Even brighter for skyscrapers
    ];

    const paint: Record<string, unknown> = {
      'fill-extrusion-color': heightBasedColor,
      'fill-extrusion-height': getHeightExpression(),
      'fill-extrusion-base': ['get', 'render_min_height'],
      'fill-extrusion-opacity': 0.95,
      'fill-extrusion-vertical-gradient': true,
    };

    map.addLayer(
      {
        id: BUILDING_LAYER_ID,
        type: 'fill-extrusion',
        source: source,
        'source-layer': sourceLayer,
        minzoom: 12,
        paint: paint as maplibregl.FillExtrusionLayerSpecification['paint'],
      },
      firstSymbolId
    );

    // Try emissive for taller buildings
    try {
      map.setPaintProperty(BUILDING_LAYER_ID, 'fill-extrusion-emissive-strength', [
        'interpolate',
        ['linear'],
        ['coalesce', ['to-number', ['get', 'render_height']], 0],
        0, 0,
        HEIGHT_LOW, 0,
        HEIGHT_MID, 0.1,
        100, 0.4,
        200, 0.7
      ]);
      map.setPaintProperty(BUILDING_LAYER_ID, 'fill-extrusion-emissive-color', '#44ffee');
    } catch {
      // Emissive not supported
    }

    console.log('✅ Building layer created with height-based color hierarchy');
    return true;
  } catch (error) {
    console.error('Failed to create building layer:', error);
    return false;
  }
}

/**
 * Update building colors
 */
export function updateBuildingColors(
  map: Map,
  colors: Partial<typeof buildingColors>
): void {
  const mergedColors = { ...buildingColors, ...colors };

  // Update with new color interpolation
  const heightBasedColor = [
    'interpolate',
    ['linear'],
    ['coalesce', ['to-number', ['get', 'render_height']], 0],
    0, mergedColors.low,
    HEIGHT_LOW, mergedColors.low,
    HEIGHT_LOW + 5, mergedColors.medium,
    HEIGHT_MID, mergedColors.medium,
    HEIGHT_MID + 10, mergedColors.high,
    100, mergedColors.skyscraper,
    200, '#3a7a8a'
  ];

  safeSetPaint(map, BUILDING_LAYER_ID, 'fill-extrusion-color', heightBasedColor);
}

/**
 * Update emissive strength
 */
export function updateEmissiveStrength(map: Map, baseStrength: number): void {
  try {
    safeSetPaint(map, BUILDING_LAYER_ID, 'fill-extrusion-emissive-strength', [
      'interpolate',
      ['linear'],
      ['coalesce', ['to-number', ['get', 'render_height']], 0],
      0, 0,
      HEIGHT_LOW, 0,
      HEIGHT_MID, baseStrength * 0.1,
      100, baseStrength * 0.4,
      200, baseStrength * 0.7
    ]);
  } catch (error) {
    console.warn('Failed to update emissive strength:', error);
  }
}

/**
 * Toggle building layer visibility
 */
export function toggleBuildings(map: Map, visible: boolean): void {
  const visibility = visible ? 'visible' : 'none';
  safeSetLayout(map, BUILDING_LAYER_ID, 'visibility', visibility);
}

/**
 * Check if building layer exists
 */
export function hasBuildingLayers(map: Map): boolean {
  return layerExists(map, BUILDING_LAYER_ID);
}

/**
 * Remove building layer
 */
export function removeBuildingLayers(map: Map): void {
  if (layerExists(map, BUILDING_LAYER_ID)) {
    map.removeLayer(BUILDING_LAYER_ID);
  }
}
