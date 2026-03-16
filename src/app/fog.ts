import type { Map } from 'maplibre-gl';
import { cyberpunkFog } from './mapConfig';

// Extend Map type to include setFog which exists in newer MapLibre versions
type MapWithFog = Map & {
  setFog?: (options: Record<string, unknown> | null) => void;
};

/**
 * Apply fog/atmosphere to the map
 * Safe wrapper that checks if setFog is available
 */
export function applyFog(map: Map): boolean {
  try {
    const mapWithFog = map as MapWithFog;
    
    // Check if setFog method exists (MapLibre GL JS 2.x+)
    if (typeof mapWithFog.setFog !== 'function') {
      console.warn('Map setFog not available in this version of MapLibre GL JS');
      return false;
    }

    // Apply fog configuration
    mapWithFog.setFog({
      color: cyberpunkFog.color,
      'high-color': cyberpunkFog['high-color'],
      'horizon-blend': cyberpunkFog['horizon-blend'],
      'space-color': cyberpunkFog['space-color'],
      'star-intensity': cyberpunkFog['star-intensity'],
    });

    console.log('✅ Fog applied successfully');
    return true;
  } catch (error) {
    console.warn('Failed to apply fog:', error);
    return false;
  }
}

/**
 * Remove fog from the map
 */
export function removeFog(map: Map): boolean {
  try {
    const mapWithFog = map as MapWithFog;
    
    if (typeof mapWithFog.setFog !== 'function') {
      return false;
    }

    mapWithFog.setFog(null);
    return true;
  } catch (error) {
    console.warn('Failed to remove fog:', error);
    return false;
  }
}

/**
 * Update fog with custom options
 */
export function updateFog(
  map: Map,
  options: Partial<typeof cyberpunkFog>
): boolean {
  try {
    const mapWithFog = map as MapWithFog;
    
    if (typeof mapWithFog.setFog !== 'function') {
      return false;
    }

    mapWithFog.setFog({
      ...cyberpunkFog,
      ...options,
    });
    return true;
  } catch (error) {
    console.warn('Failed to update fog:', error);
    return false;
  }
}
