/**
 * Download and process Chile regions GeoJSON from GADM
 * 
 * This script downloads the official GADM boundaries for Chile regions
 * and saves them in a format suitable for the application.
 */

import * as fs from 'fs';
import * as path from 'path';

const GADM_URL = 'https://geodata.ucdavis.edu/gadm/gadm4.1/json/gadm41_CHL_1.json';
const OUTPUT_PATH = path.join(process.cwd(), 'src/data/chileRegionsGeoJSON.ts');

// Mapping from GADM names to our region codes
const GADM_TO_CODE: Record<string, string> = {
  'Arica y Parinacota': 'AP',
  'Tarapacá': 'TA',
  'Antofagasta': 'AN',
  'Atacama': 'AT',
  'Coquimbo': 'CO',
  'Valparaíso': 'VA',
  'Metropolitana de Santiago': 'RM',
  "O'Higgins": 'LI',
  'Maule': 'ML',
  'Ñuble': 'NB',
  'Biobío': 'BI',
  'La Araucanía': 'AR',
  'Los Ríos': 'LR',
  'Los Lagos': 'LL',
  'Aysén': 'AI',
  'Magallanes': 'MA',
};

// Region metadata
const REGION_DATA: Record<string, { name: string; capital: string; population?: number; area?: number }> = {
  'AP': { name: 'Arica y Parinacota', capital: 'Arica', population: 226068, area: 16387 },
  'TA': { name: 'Tarapacá', capital: 'Iquique', population: 330558, area: 42258 },
  'AN': { name: 'Antofagasta', capital: 'Antofagasta', population: 670340, area: 118305 },
  'AT': { name: 'Atacama', capital: 'Copiapó', population: 312486, area: 75176 },
  'CO': { name: 'Coquimbo', capital: 'La Serena', population: 742178, area: 40590 },
  'VA': { name: 'Valparaíso', capital: 'Valparaíso', population: 1813202, area: 16396 },
  'RM': { name: 'Metropolitana', capital: 'Santiago', population: 7112808, area: 15403 },
  'LI': { name: "O'Higgins", capital: 'Rancagua', population: 914555, area: 16387 },
  'ML': { name: 'Maule', capital: 'Talca', population: 1041890, area: 30296 },
  'NB': { name: 'Ñuble', capital: 'Chillán', population: 480609, area: 13178 },
  'BI': { name: 'Biobío', capital: 'Concepción', population: 1556821, area: 23897 },
  'AR': { name: 'La Araucanía', capital: 'Temuco', population: 957224, area: 31842 },
  'LR': { name: 'Los Ríos', capital: 'Valdivia', population: 384837, area: 18429 },
  'LL': { name: 'Los Lagos', capital: 'Puerto Montt', population: 828708, area: 48583 },
  'AI': { name: 'Aysén', capital: 'Coyhaique', population: 103158, area: 108494 },
  'MA': { name: 'Magallanes', capital: 'Punta Arenas', population: 165593, area: 132297 },
};

/**
 * Calculate centroid of a polygon
 */
function calculateCentroid(coordinates: number[][][]): [number, number] {
  let sumLng = 0;
  let sumLat = 0;
  let count = 0;
  
  for (const ring of coordinates) {
    for (const coord of ring) {
      sumLng += coord[0];
      sumLat += coord[1];
      count++;
    }
  }
  
  return [sumLng / count, sumLat / count];
}

/**
 * Simplify a polygon using simple distance-based reduction
 */
function simplifyPolygon(coordinates: number[][][], tolerance: number = 0.01): number[][][] {
  if (coordinates.length === 0) return coordinates;
  
  return coordinates.map(ring => {
    if (ring.length < 4) return ring;
    
    const simplified: number[][] = [ring[0]];
    
    for (let i = 1; i < ring.length - 1; i++) {
      const prev = simplified[simplified.length - 1];
      const curr = ring[i];
      const dist = Math.sqrt(Math.pow(curr[0] - prev[0], 2) + Math.pow(curr[1] - prev[1], 2));
      
      if (dist >= tolerance) {
        simplified.push(curr);
      }
    }
    
    // Always add the last point
    simplified.push(ring[ring.length - 1]);
    
    return simplified;
  });
}

/**
 * Process GADM GeoJSON into our format
 */
async function downloadAndProcessChileRegions(): Promise<void> {
  console.log('📥 Downloading Chile regions from GADM...');
  
  // Check if we already have the file
  const tempPath = '/tmp/gadm_chile.json';
  let gadmData: any;
  
  if (fs.existsSync(tempPath)) {
    console.log('📁 Using cached GADM file');
    gadmData = JSON.parse(fs.readFileSync(tempPath, 'utf-8'));
  } else {
    // Download the file
    console.log('🌐 Downloading from GADM (this may take a moment)...');
    const response = await fetch(GADM_URL);
    
    if (!response.ok) {
      throw new Error(`Failed to download: ${response.statusText}`);
    }
    
    gadmData = await response.json();
    
    // Cache it
    fs.writeFileSync(tempPath, JSON.stringify(gadmData));
    console.log('✅ Cached GADM file');
  }
  
  console.log(`📊 Processing ${gadmData.features.length} regions...`);
  
  // Transform to our format
  const features = gadmData.features.map((feature: any) => {
    const gadmName = feature.properties.NAME_1;
    const code = GADM_TO_CODE[gadmName] || gadmName.substring(0, 2).toUpperCase();
    const regionInfo = REGION_DATA[code] || { name: gadmName, capital: 'N/A' };
    
    // Simplify the geometry
    let geometry = feature.geometry;
    if (geometry.type === 'MultiPolygon') {
      geometry.coordinates = geometry.coordinates.map((polygon: number[][][]) => 
        simplifyPolygon(polygon, 0.005)
      );
    } else if (geometry.type === 'Polygon') {
      geometry.coordinates = simplifyPolygon(geometry.coordinates, 0.005);
    }
    
    // Calculate centroid for label placement
    let centroid: [number, number] = [-70.65, -33.9]; // Default
    if (geometry.type === 'Polygon' && geometry.coordinates.length > 0) {
      centroid = calculateCentroid(geometry.coordinates);
    } else if (geometry.type === 'MultiPolygon' && geometry.coordinates.length > 0) {
      // Use the largest polygon for centroid
      let largest = geometry.coordinates[0];
      for (const polygon of geometry.coordinates) {
        if (polygon[0].length > largest[0].length) {
          largest = polygon;
        }
      }
      centroid = calculateCentroid(largest);
    }
    
    return {
      type: 'Feature' as const,
      id: code,
      properties: {
        code,
        name: regionInfo.name,
        capital: regionInfo.capital,
        population: regionInfo.population,
        area: regionInfo.area,
        centroid,
      },
      geometry: geometry,
    };
  });
  
  const geoJSON = {
    type: 'FeatureCollection' as const,
    features,
  };
  
  // Generate TypeScript file
  const tsContent = `/**
 * Chile Regions - Real GeoJSON boundaries
 * Source: GADM (gadm.org) - License: CC-BY-SA 4.0
 * Processed and simplified for visualization
 * 
 * This file contains the actual polygon geometries of Chile's 16 regions,
 * not the simplified bounding boxes used in earlier versions.
 */

export interface ChileRegion {
  id: string;
  code: string;
  name: string;
  capital: string;
  population?: number;
  area?: number;
  centroid?: [number, number];
}

/**
 * Chile regions metadata
 */
export const chileRegions: ChileRegion[] = ${JSON.stringify(
  Object.entries(REGION_DATA).map(([code, data]) => ({
    id: code,
    code,
    ...data,
  })),
  null,
  2
)};

/**
 * Get region by code
 */
export function getRegionByCode(code: string): ChileRegion | undefined {
  return chileRegions.find(r => r.code === code);
}

/**
 * Get region by name
 */
export function getRegionByName(name: string): ChileRegion | undefined {
  return chileRegions.find(r => r.name.toLowerCase().includes(name.toLowerCase()));
}

/**
 * Calculate centroid of a region feature
 */
export function getRegionCentroid(feature: any): [number, number] {
  if (feature.properties.centroid) {
    return feature.properties.centroid;
  }
  
  const coords = feature.geometry.coordinates;
  if (feature.geometry.type === 'Polygon' && coords.length > 0) {
    let sumLng = 0, sumLat = 0, count = 0;
    for (const ring of coords) {
      for (const c of ring) {
        sumLng += c[0];
        sumLat += c[1];
        count++;
      }
    }
    return count > 0 ? [sumLng / count, sumLat / count] : [-70.65, -33.9];
  }
  
  return [-70.65, -33.9];
}

/**
 * Chile regions GeoJSON with real boundaries
 * Each feature is a real polygon/multipolygon representing the actual shape of each region
 */
export const chileRegionsGeoJSON = ${JSON.stringify(geoJSON, null, 2)};

export default chileRegionsGeoJSON;
`;
  
  // Write the file
  fs.writeFileSync(OUTPUT_PATH, tsContent);
  console.log(`✅ Chile regions GeoJSON saved to: ${OUTPUT_PATH}`);
  console.log(`📊 Total features: ${features.length}`);
  
  // Also update the main chileRegions.ts to import from the new file
  const mainRegionsPath = path.join(process.cwd(), 'src/data/chileRegions.ts');
  const mainContent = `/**
 * Chile Regions - Main export file
 * Re-exports from chileRegionsGeoJSON.ts which contains real boundaries
 */

export { 
  chileRegions, 
  chileRegionsGeoJSON, 
  getRegionByCode, 
  getRegionByName,
  getRegionCentroid,
  type ChileRegion 
} from './chileRegionsGeoJSON';
`;
  
  fs.writeFileSync(mainRegionsPath, mainContent);
  console.log(`✅ Updated main export file: ${mainRegionsPath}`);
}

// Run if called directly
if (process.argv[1]?.includes('download_chile_regions')) {
  downloadAndProcessChileRegions()
    .then(() => {
      console.log('✅ Download complete');
      process.exit(0);
    })
    .catch((err) => {
      console.error('❌ Error:', err);
      process.exit(1);
    });
}

export default downloadAndProcessChileRegions;