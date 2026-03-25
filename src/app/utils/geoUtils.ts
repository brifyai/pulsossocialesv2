/**
 * Geographic utilities for agent movement
 */

import type { BBox } from '../../types/agent';

// Earth's radius in meters
const EARTH_RADIUS = 6371000;

/**
 * Convert degrees to radians
 */
export function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/**
 * Convert radians to degrees
 */
export function toDegrees(radians: number): number {
  return (radians * 180) / Math.PI;
}

/**
 * Approximate meters to degrees longitude at a given latitude
 */
export function metersToLngDegrees(meters: number, lat: number): number {
  return meters / (EARTH_RADIUS * Math.cos(toRadians(lat)) * (Math.PI / 180));
}

/**
 * Approximate meters to degrees latitude
 */
export function metersToLatDegrees(meters: number): number {
  return meters / (EARTH_RADIUS * (Math.PI / 180));
}

/**
 * Move a point by distance and heading
 * @param lng - starting longitude
 * @param lat - starting latitude
 * @param distanceMeters - distance to move
 * @param headingRadians - heading in radians (0 = east, PI/2 = north)
 * @returns [newLng, newLat]
 */
export function movePoint(
  lng: number,
  lat: number,
  distanceMeters: number,
  headingRadians: number
): [number, number] {
  const deltaLng = metersToLngDegrees(
    distanceMeters * Math.cos(headingRadians),
    lat
  );
  const deltaLat = metersToLatDegrees(distanceMeters * Math.sin(headingRadians));

  return [lng + deltaLng, lat + deltaLat];
}

/**
 * Calculate distance between two points in meters (Haversine approximation)
 */
export function distanceBetween(
  lng1: number,
  lat1: number,
  lng2: number,
  lat2: number
): number {
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS * c;
}

/**
 * Create a bounding box around a center point with radius in meters
 */
export function createBBox(
  centerLng: number,
  centerLat: number,
  radiusMeters: number
): BBox {
  const deltaLng = metersToLngDegrees(radiusMeters, centerLat);
  const deltaLat = metersToLatDegrees(radiusMeters);

  return {
    minLng: centerLng - deltaLng,
    maxLng: centerLng + deltaLng,
    minLat: centerLat - deltaLat,
    maxLat: centerLat + deltaLat,
  };
}

/**
 * Check if a point is inside a bounding box
 */
export function isInsideBBox(lng: number, lat: number, bbox: BBox): boolean {
  return (
    lng >= bbox.minLng && lng <= bbox.maxLng && lat >= bbox.minLat && lat <= bbox.maxLat
  );
}

/**
 * Clamp a point to be inside a bounding box
 * Returns new position and whether it was clamped
 */
export function clampToBBox(
  lng: number,
  lat: number,
  bbox: BBox
): { lng: number; lat: number; wasClamped: boolean } {
  let wasClamped = false;
  let newLng = lng;
  let newLat = lat;

  if (lng < bbox.minLng) {
    newLng = bbox.minLng;
    wasClamped = true;
  } else if (lng > bbox.maxLng) {
    newLng = bbox.maxLng;
    wasClamped = true;
  }

  if (lat < bbox.minLat) {
    newLat = bbox.minLat;
    wasClamped = true;
  } else if (lat > bbox.maxLat) {
    newLat = bbox.maxLat;
    wasClamped = true;
  }

  return { lng: newLng, lat: newLat, wasClamped };
}

/**
 * Generate a random position within a bounding box
 */
export function randomPositionInBBox(bbox: BBox): [number, number] {
  const lng = bbox.minLng + Math.random() * (bbox.maxLng - bbox.minLng);
  const lat = bbox.minLat + Math.random() * (bbox.maxLat - bbox.minLat);
  return [lng, lat];
}

/**
 * Generate a random heading in radians (0 to 2*PI)
 */
export function randomHeading(): number {
  return Math.random() * Math.PI * 2;
}

/**
 * Add noise to a heading (small random variation)
 */
export function addHeadingNoise(heading: number, maxNoiseRadians: number): number {
  const noise = (Math.random() - 0.5) * 2 * maxNoiseRadians;
  return (heading + noise + Math.PI * 2) % (Math.PI * 2);
}

/**
 * Calculate heading from point A to point B
 */
export function headingBetween(
  lng1: number,
  lat1: number,
  lng2: number,
  lat2: number
): number {
  const dLng = toRadians(lng2 - lng1);
  const lat1Rad = toRadians(lat1);
  const lat2Rad = toRadians(lat2);

  const y = Math.sin(dLng) * Math.cos(lat2Rad);
  const x =
    Math.cos(lat1Rad) * Math.sin(lat2Rad) -
    Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLng);

  return Math.atan2(y, x);
}

// Region names for Chile
const REGION_NAMES: Record<string, string> = {
  '15': 'Arica y Parinacota',
  '01': 'Tarapacá',
  '02': 'Antofagasta',
  '03': 'Atacama',
  '04': 'Coquimbo',
  '05': 'Valparaíso',
  '13': 'Metropolitana',
  '06': "O'Higgins",
  '07': 'Maule',
  '16': 'Ñuble',
  '08': 'Biobío',
  '09': 'La Araucanía',
  '14': 'Los Ríos',
  '10': 'Los Lagos',
  '11': 'Aysén',
  '12': 'Magallanes',
};

// Approximate region centers (longitude, latitude)
const REGION_CENTERS: Record<string, [number, number]> = {
  '15': [-70.3, -18.5],   // Arica
  '01': [-70.1, -20.2],   // Iquique
  '02': [-70.4, -23.6],   // Antofagasta
  '03': [-70.3, -27.4],   // Copiapó
  '04': [-71.3, -29.9],   // La Serena
  '05': [-71.6, -33.0],   // Valparaíso
  '13': [-70.6, -33.5],   // Santiago
  '06': [-70.7, -34.2],   // Rancagua
  '07': [-71.7, -35.4],   // Talca
  '16': [-72.1, -36.6],   // Chillán
  '08': [-73.0, -37.5],   // Concepción
  '09': [-72.6, -38.7],   // Temuco
  '14': [-73.2, -39.8],   // Valdivia
  '10': [-73.1, -41.5],   // Puerto Montt
  '11': [-72.1, -46.4],   // Coyhaique
  '12': [-72.5, -51.7],   // Punta Arenas
};

/**
 * Get region name from viewport center coordinates
 * Returns the name of the region closest to the viewport center
 */
export function getRegionNameFromViewport(
  centerLng: number,
  centerLat: number,
  zoom: number
): string {
  // If zoomed out (showing all Chile), return "Chile"
  if (zoom < 6) {
    return 'Chile';
  }
  
  // Find closest region by distance to center
  let closestRegion = '13'; // Default to Metropolitana
  let minDistance = Infinity;
  
  for (const [regionCode, [lng, lat]] of Object.entries(REGION_CENTERS)) {
    const distance = distanceBetween(centerLng, centerLat, lng, lat);
    if (distance < minDistance) {
      minDistance = distance;
      closestRegion = regionCode;
    }
  }
  
  // If very far from any region center, might be showing multiple regions
  // Return "Chile" if distance is very large (> 500km)
  if (minDistance > 500000) {
    return 'Chile';
  }
  
  return REGION_NAMES[closestRegion] || 'Chile';
}
