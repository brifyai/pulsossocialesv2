/**
 * ⚠️ ARCHIVO SAGRADO - VER GUARDRAILS.md
 * Este archivo contiene DATOS CRÍTICOS de la red peatonal.
 * NO MODIFICAR sin revisar impacto en:
 * - Spawning de agentes
 * - Rutas de navegación
 * - Referencias cruzadas en código
 *
 * Cambios permitidos solo para:
 * - Corrección de coordenadas erróneas
 * - Agregar calles faltantes (con validación)
 * - Ajustes de precisión
 *
 * CHECKPOINT: v0.1.0 - Base estable
 */

/**
 * Red fija de simulación para zona El Golf / Tobalaba, Santiago
 * Coordenadas aproximadas basadas en el layout urbano real
 */

import type { PedestrianNetwork, NetworkSegment } from '../types/network';

// Coordenadas de referencia para El Golf
// Centro aproximado: -70.5975, -33.4125
// Extensión: ~500m en cada dirección

interface RawSegment {
  id: string;
  coords: [number, number][];
  kind: NetworkSegment['kind'];
  name?: string;
}

// Segmentos de calles representativos de El Golf
// Coordenadas aproximadas del layout urbano
const RAW_SEGMENTS: RawSegment[] = [
  // Avenida Apoquindo (este-oeste, principal)
  {
    id: 'apoquindo-1',
    kind: 'tertiary',
    name: 'Av. Apoquindo',
    coords: [
      [-70.6020, -33.4120],
      [-70.6000, -33.4122],
      [-70.5980, -33.4124],
      [-70.5960, -33.4126],
      [-70.5940, -33.4128],
      [-70.5920, -33.4130],
    ],
  },

  // Avenida El Bosque (norte-sur)
  {
    id: 'el-bosque-1',
    kind: 'tertiary',
    name: 'Av. El Bosque',
    coords: [
      [-70.5980, -33.4150],
      [-70.5982, -33.4140],
      [-70.5984, -33.4130],
      [-70.5986, -33.4120],
      [-70.5988, -33.4110],
      [-70.5990, -33.4100],
    ],
  },

  // Avenida Tobalaba (norte-sur, principal)
  {
    id: 'tobalaba-1',
    kind: 'tertiary',
    name: 'Av. Tobalaba',
    coords: [
      [-70.5960, -33.4150],
      [-70.5962, -33.4140],
      [-70.5964, -33.4130],
      [-70.5966, -33.4120],
      [-70.5968, -33.4110],
      [-70.5970, -33.4100],
    ],
  },

  // Avenida Kennedy (este-oeste)
  {
    id: 'kennedy-1',
    kind: 'tertiary',
    name: 'Av. Kennedy',
    coords: [
      [-70.6020, -33.4140],
      [-70.6000, -33.4142],
      [-70.5980, -33.4144],
      [-70.5960, -33.4146],
      [-70.5940, -33.4148],
      [-70.5920, -33.4150],
    ],
  },

  // Calle El Golf (este-oeste, residential)
  {
    id: 'el-golf-st-1',
    kind: 'residential',
    name: 'Calle El Golf',
    coords: [
      [-70.6000, -33.4110],
      [-70.5980, -33.4112],
      [-70.5960, -33.4114],
      [-70.5940, -33.4116],
    ],
  },

  // Calle San Crescente (norte-sur, residential)
  {
    id: 'san-crescente-1',
    kind: 'residential',
    name: 'Calle San Crescente',
    coords: [
      [-70.5990, -33.4135],
      [-70.5992, -33.4125],
      [-70.5994, -33.4115],
      [-70.5996, -33.4105],
    ],
  },

  // Calle San Pascual (norte-sur, residential)
  {
    id: 'san-pascual-1',
    kind: 'residential',
    name: 'Calle San Pascual',
    coords: [
      [-70.5970, -33.4135],
      [-70.5972, -33.4125],
      [-70.5974, -33.4115],
      [-70.5976, -33.4105],
    ],
  },

  // Calle San Benito (norte-sur, residential)
  {
    id: 'san-benito-1',
    kind: 'residential',
    name: 'Calle San Benito',
    coords: [
      [-70.5950, -33.4135],
      [-70.5952, -33.4125],
      [-70.5954, -33.4115],
      [-70.5956, -33.4105],
    ],
  },

  // Calle San Sebastián (este-oeste, residential)
  {
    id: 'san-sebastian-1',
    kind: 'residential',
    name: 'Calle San Sebastián',
    coords: [
      [-70.6000, -33.4100],
      [-70.5980, -33.4102],
      [-70.5960, -33.4104],
      [-70.5940, -33.4106],
    ],
  },

  // Calle San Damián (este-oeste, residential)
  {
    id: 'san-damian-1',
    kind: 'residential',
    name: 'Calle San Damián',
    coords: [
      [-70.6000, -33.4090],
      [-70.5980, -33.4092],
      [-70.5960, -33.4094],
      [-70.5940, -33.4096],
    ],
  },

  // Pasajes peatonales (footway) - conectores
  {
    id: 'pasaje-1',
    kind: 'footway',
    name: 'Pasaje Peatonal',
    coords: [
      [-70.5980, -33.4120],
      [-70.5980, -33.4115],
    ],
  },
  {
    id: 'pasaje-2',
    kind: 'footway',
    name: 'Pasaje Peatonal',
    coords: [
      [-70.5960, -33.4120],
      [-70.5960, -33.4115],
    ],
  },
  {
    id: 'pasaje-3',
    kind: 'footway',
    name: 'Pasaje Peatonal',
    coords: [
      [-70.5980, -33.4110],
      [-70.5975, -33.4110],
      [-70.5970, -33.4110],
    ],
  },
  {
    id: 'pasaje-4',
    kind: 'footway',
    name: 'Pasaje Peatonal',
    coords: [
      [-70.5960, -33.4110],
      [-70.5955, -33.4110],
      [-70.5950, -33.4110],
    ],
  },

  // Plazas y áreas peatonales (pedestrian)
  {
    id: 'plaza-1',
    kind: 'pedestrian',
    name: 'Plaza El Golf',
    coords: [
      [-70.5975, -33.4125],
      [-70.5970, -33.4125],
      [-70.5970, -33.4120],
      [-70.5975, -33.4120],
      [-70.5975, -33.4125],
    ],
  },

  // Calles adicionales para densidad
  {
    id: 'san-lucas-1',
    kind: 'residential',
    name: 'Calle San Lucas',
    coords: [
      [-70.6010, -33.4125],
      [-70.6005, -33.4125],
      [-70.6000, -33.4125],
    ],
  },
  {
    id: 'san-mateo-1',
    kind: 'residential',
    name: 'Calle San Mateo',
    coords: [
      [-70.5950, -33.4120],
      [-70.5945, -33.4120],
      [-70.5940, -33.4120],
    ],
  },
  {
    id: 'san-javier-1',
    kind: 'residential',
    name: 'Calle San Javier',
    coords: [
      [-70.5930, -33.4125],
      [-70.5925, -33.4125],
      [-70.5920, -33.4125],
    ],
  },
];

/**
 * Calculate distance between two coordinates in meters
 */
function haversineDistance(
  lng1: number,
  lat1: number,
  lng2: number,
  lat2: number
): number {
  const R = 6371000; // Earth radius in meters
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) *
    Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) *
    Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Calculate length of a line segment in meters
 */
function calculateSegmentLength(coordinates: [number, number][]): number {
  let length = 0;
  for (let i = 1; i < coordinates.length; i++) {
    length += haversineDistance(
      coordinates[i - 1][0],
      coordinates[i - 1][1],
      coordinates[i][0],
      coordinates[i][1]
    );
  }
  return length;
}

/**
 * Generate a unique node ID from coordinates
 */
function generateNodeId(lng: number, lat: number): string {
  // Round to 6 decimal places for deduplication (~10cm precision)
  const roundedLng = Math.round(lng * 1e6) / 1e6;
  const roundedLat = Math.round(lat * 1e6) / 1e6;
  return `node-${roundedLng}-${roundedLat}`;
}

/**
 * Build the pedestrian network from raw segments
 */
function buildNetwork(): PedestrianNetwork {
  const network: PedestrianNetwork = {
    nodes: {},
    segments: {},
  };

  for (const raw of RAW_SEGMENTS) {
    const coords = raw.coords;
    if (coords.length < 2) continue;

    // Create nodes for start and end
    const startNodeId = generateNodeId(coords[0][0], coords[0][1]);
    const endNodeId = generateNodeId(coords[coords.length - 1][0], coords[coords.length - 1][1]);

    // Add nodes if not exist
    if (!network.nodes[startNodeId]) {
      network.nodes[startNodeId] = {
        id: startNodeId,
        lng: coords[0][0],
        lat: coords[0][1],
        connectedSegmentIds: [],
      };
    }
    if (!network.nodes[endNodeId]) {
      network.nodes[endNodeId] = {
        id: endNodeId,
        lng: coords[coords.length - 1][0],
        lat: coords[coords.length - 1][1],
        connectedSegmentIds: [],
      };
    }

    // Create segment
    const length = calculateSegmentLength(coords);

    const segment: NetworkSegment = {
      id: raw.id,
      coordinates: coords,
      startNodeId,
      endNodeId,
      lengthMeters: length,
      kind: raw.kind,
    };

    network.segments[raw.id] = segment;

    // Connect nodes to segment
    network.nodes[startNodeId].connectedSegmentIds.push(raw.id);
    network.nodes[endNodeId].connectedSegmentIds.push(raw.id);
  }

  // Find intersections and connect segments that share endpoints
  // This creates a proper graph where agents can turn at intersections
  const nodeCoords = new Map<string, { lng: number; lat: number }>();

  for (const [, node] of Object.entries(network.nodes)) {
    // Round to 5 decimal places for intersection detection (~1m precision)
    const key = `${Math.round(node.lng * 1e5) / 1e5},${Math.round(node.lat * 1e5) / 1e5}`;

    if (nodeCoords.has(key)) {
      // Found an intersection - merge nodes
      // This is a simplified approach - in practice we'd merge the nodes
    } else {
      nodeCoords.set(key, { lng: node.lng, lat: node.lat });
    }
  }

  return network;
}

// Export the pre-built network
export const EL_GOLF_NETWORK: PedestrianNetwork = buildNetwork();

// Export network stats
export const NETWORK_STATS = {
  nodeCount: Object.keys(EL_GOLF_NETWORK.nodes).length,
  segmentCount: Object.keys(EL_GOLF_NETWORK.segments).length,
  totalLengthMeters: Object.values(EL_GOLF_NETWORK.segments).reduce(
    (sum, seg) => sum + seg.lengthMeters,
    0
  ),
};

console.log('📊 El Golf Network loaded:', NETWORK_STATS);
