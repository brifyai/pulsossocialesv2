import type { Map } from 'maplibre-gl';
import { backgroundColors } from './mapConfig';
import { safeSetPaint, findLayersByPattern } from './utils/styleHelpers';

// Layer patterns for different features
const BACKGROUND_PATTERNS = ['background'];
const WATER_PATTERNS = ['water', 'ocean', 'sea', 'lake', 'river'];
const PARK_PATTERNS = ['park', 'forest', 'wood', 'garden', 'grass', 'vegetation'];
const LANDUSE_PATTERNS = ['landuse', 'industrial', 'commercial', 'residential-area'];

// Patterns for layers to hide/reduce (noise reduction)
const NOISE_PATTERNS = [
  'building-3d', // Hide default 3D buildings if they exist
  'building-extrusion', // Hide default extrusions
  'aeroway', // Hide airport runways
  'barrier', // Hide barriers
  'fence', // Hide fences
  'hedge', // Hide hedges
  'cliff', // Hide cliffs
  'ridge', // Hide ridges
];

/**
 * Hide noisy layers to reduce visual clutter
 */
function reduceNoise(map: Map): void {
  const noiseLayers = findLayersByPattern(map, NOISE_PATTERNS);

  for (const layerId of noiseLayers) {
    try {
      map.setLayoutProperty(layerId, 'visibility', 'none');
      console.log(`🔇 Hidden noisy layer: ${layerId}`);
    } catch {
      // Layer might not support visibility
    }
  }
}

/**
 * Apply general style tweaks for cyberpunk theme
 */
export function applyStyleTweaks(map: Map): void {
  try {
    console.log('🎨 Applying style tweaks...');

    // Reduce noise first
    reduceNoise(map);

    // Darken background
    darkenBackground(map);

    // Darken water
    darkenWater(map);

    // Darken parks/vegetation
    darkenParks(map);

    // Darken landuse areas
    darkenLanduse(map);

    console.log('✅ Style tweaks applied successfully');
  } catch (error) {
    console.error('Failed to apply style tweaks:', error);
  }
}

/**
 * Darken background layer
 */
function darkenBackground(map: Map): void {
  const layers = findLayersByPattern(map, BACKGROUND_PATTERNS);

  for (const layerId of layers) {
    safeSetPaint(map, layerId, 'background-color', backgroundColors.background);
  }
}

/**
 * Darken water layers
 */
function darkenWater(map: Map): void {
  const layers = findLayersByPattern(map, WATER_PATTERNS);

  for (const layerId of layers) {
    const layer = map.getLayer(layerId);
    if (!layer) continue;

    if (layer.type === 'fill') {
      safeSetPaint(map, layerId, 'fill-color', backgroundColors.water);
      safeSetPaint(map, layerId, 'fill-opacity', 0.9);
    } else if (layer.type === 'line') {
      safeSetPaint(map, layerId, 'line-color', backgroundColors.water);
      safeSetPaint(map, layerId, 'line-opacity', 0.8);
    }
  }
}

/**
 * Darken park/vegetation layers
 */
function darkenParks(map: Map): void {
  const layers = findLayersByPattern(map, PARK_PATTERNS);

  for (const layerId of layers) {
    const layer = map.getLayer(layerId);
    if (!layer || layer.type !== 'fill') continue;

    safeSetPaint(map, layerId, 'fill-color', backgroundColors.park);
    safeSetPaint(map, layerId, 'fill-opacity', 0.7);
  }
}

/**
 * Darken landuse layers
 */
function darkenLanduse(map: Map): void {
  const layers = findLayersByPattern(map, LANDUSE_PATTERNS);

  for (const layerId of layers) {
    const layer = map.getLayer(layerId);
    if (!layer || layer.type !== 'fill') continue;

    safeSetPaint(map, layerId, 'fill-color', backgroundColors.landuse);
    safeSetPaint(map, layerId, 'fill-opacity', 0.6);
  }
}

/**
 * Update background colors
 */
export function updateBackgroundColors(
  map: Map,
  colors: Partial<typeof backgroundColors>
): void {
  const mergedColors = { ...backgroundColors, ...colors };

  // Update background
  const bgLayers = findLayersByPattern(map, BACKGROUND_PATTERNS);
  for (const layerId of bgLayers) {
    safeSetPaint(map, layerId, 'background-color', mergedColors.background);
  }

  // Update water
  const waterLayers = findLayersByPattern(map, WATER_PATTERNS);
  for (const layerId of waterLayers) {
    const layer = map.getLayer(layerId);
    if (!layer) continue;
    if (layer.type === 'fill') {
      safeSetPaint(map, layerId, 'fill-color', mergedColors.water);
    } else if (layer.type === 'line') {
      safeSetPaint(map, layerId, 'line-color', mergedColors.water);
    }
  }

  // Update parks
  const parkLayers = findLayersByPattern(map, PARK_PATTERNS);
  for (const layerId of parkLayers) {
    safeSetPaint(map, layerId, 'fill-color', mergedColors.park);
  }

  // Update landuse
  const landuseLayers = findLayersByPattern(map, LANDUSE_PATTERNS);
  for (const layerId of landuseLayers) {
    safeSetPaint(map, layerId, 'fill-color', mergedColors.landuse);
  }
}
