/**
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
