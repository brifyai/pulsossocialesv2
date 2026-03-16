import type { Map } from 'maplibre-gl';

/**
 * Safely set a paint property on a layer
 */
export function safeSetPaint(
  map: Map,
  layerId: string,
  property: string,
  value: unknown
): boolean {
  try {
    const layer = map.getLayer(layerId);
    if (!layer) {
      console.warn(`Layer "${layerId}" not found`);
      return false;
    }
    map.setPaintProperty(layerId, property, value);
    return true;
  } catch (error) {
    console.warn(`Failed to set paint property "${property}" on layer "${layerId}":`, error);
    return false;
  }
}

/**
 * Safely set a layout property on a layer
 */
export function safeSetLayout(
  map: Map,
  layerId: string,
  property: string,
  value: unknown
): boolean {
  try {
    const layer = map.getLayer(layerId);
    if (!layer) {
      console.warn(`Layer "${layerId}" not found`);
      return false;
    }
    map.setLayoutProperty(layerId, property, value);
    return true;
  } catch (error) {
    console.warn(`Failed to set layout property "${property}" on layer "${layerId}":`, error);
    return false;
  }
}

/**
 * Find the first symbol layer ID in the style
 */
export function findFirstSymbolLayerId(map: Map): string | null {
  try {
    const layers = map.getStyle().layers;
    if (!layers) return null;

    for (const layer of layers) {
      if (layer.type === 'symbol') {
        return layer.id;
      }
    }
    return null;
  } catch (error) {
    console.warn('Failed to find first symbol layer:', error);
    return null;
  }
}

/**
 * Find layers by type
 */
export function findCandidateLayersByType(
  map: Map,
  type: string
): string[] {
  try {
    const layers = map.getStyle().layers;
    if (!layers) return [];

    return layers
      .filter((layer) => layer.type === type)
      .map((layer) => layer.id);
  } catch (error) {
    console.warn(`Failed to find layers of type "${type}":`, error);
    return [];
  }
}

/**
 * Find layers by name pattern
 */
export function findLayersByPattern(
  map: Map,
  patterns: string[]
): string[] {
  try {
    const layers = map.getStyle().layers;
    if (!layers) return [];

    return layers
      .filter((layer) => {
        const layerId = layer.id.toLowerCase();
        return patterns.some((pattern) => layerId.includes(pattern.toLowerCase()));
      })
      .map((layer) => layer.id);
  } catch (error) {
    console.warn('Failed to find layers by pattern:', error);
    return [];
  }
}

/**
 * Find building source in the style
 */
export function findBuildingSource(map: Map): { source: string; sourceLayer: string } | null {
  try {
    const style = map.getStyle();
    const layers = style.layers;
    if (!layers) return null;

    // Look for existing building layers
    for (const layer of layers) {
      // Only check layers that have source-layer property (vector layers)
      const layerAny = layer as Record<string, unknown>;
      const sourceLayer = layerAny['source-layer'] as string | undefined;
      const source = layerAny['source'] as string | undefined;
      
      if (sourceLayer && (
        sourceLayer.toLowerCase().includes('building') ||
        layer.id.toLowerCase().includes('building')
      )) {
        console.log(`Found building source: ${source}, source-layer: ${sourceLayer}`);
        return { source: source || 'openmaptiles', sourceLayer };
      }
    }

    // Check sources for building data
    const sources = style.sources;
    if (sources) {
      for (const [sourceName, sourceData] of Object.entries(sources)) {
        const sourceObj = sourceData as Record<string, unknown>;
        if (sourceObj?.url && (
          sourceName.toLowerCase().includes('building') ||
          (sourceObj.url as string)?.toLowerCase().includes('building')
        )) {
          console.log(`Found building source from URL: ${sourceName}`);
          return { source: sourceName, sourceLayer: 'building' };
        }
      }
    }

    console.warn('No building source found in style');
    return null;
  } catch (error) {
    console.warn('Failed to find building source:', error);
    return null;
  }
}

/**
 * Check if a layer exists
 */
export function layerExists(map: Map, layerId: string): boolean {
  try {
    return !!map.getLayer(layerId);
  } catch {
    return false;
  }
}

/**
 * Check if a source exists
 */
export function sourceExists(map: Map, sourceId: string): boolean {
  try {
    return !!map.getSource(sourceId);
  } catch {
    return false;
  }
}

/**
 * Safely remove a layer
 */
export function safeRemoveLayer(map: Map, layerId: string): boolean {
  try {
    if (layerExists(map, layerId)) {
      map.removeLayer(layerId);
      return true;
    }
    return false;
  } catch (error) {
    console.warn(`Failed to remove layer "${layerId}":`, error);
    return false;
  }
}

/**
 * Safely remove a source
 */
export function safeRemoveSource(map: Map, sourceId: string): boolean {
  try {
    if (sourceExists(map, sourceId)) {
      map.removeSource(sourceId);
      return true;
    }
    return false;
  } catch (error) {
    console.warn(`Failed to remove source "${sourceId}":`, error);
    return false;
  }
}
