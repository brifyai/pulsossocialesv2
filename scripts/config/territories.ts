/**
 * Territories Configuration
 * 
 * Define la jerarquía territorial de Chile para el pipeline de datos.
 * Esta configuración es compartida por todas las etapas del pipeline.
 */

export interface TerritoryLevel {
  id: string;
  name: string;
  code: string;
  parentId?: string;
  level: 'country' | 'region' | 'province' | 'commune' | 'district';
}

export interface ChileTerritory extends TerritoryLevel {
  population?: number;
  area?: number;
  centroid?: [number, number]; // [lng, lat]
}

/**
 * Jerarquía territorial de Chile (16 regiones)
 */
export const CHILE_TERRITORIES: ChileTerritory[] = [
  // Región Metropolitana
  { id: 'RM', name: 'Metropolitana de Santiago', code: 'RM', level: 'region', population: 7112808, centroid: [-70.65, -33.45] },
  // Valparaíso
  { id: 'VA', name: 'Valparaíso', code: 'VA', level: 'region', population: 1813202, centroid: [-71.3, -33.0] },
  // Biobío
  { id: 'BI', name: 'Biobío', code: 'BI', level: 'region', population: 1556821, centroid: [-72.35, -37.2] },
  // Maule
  { id: 'ML', name: 'Maule', code: 'ML', level: 'region', population: 1041890, centroid: [-72.4, -35.5] },
  // La Araucanía
  { id: 'AR', name: 'La Araucanía', code: 'AR', level: 'region', population: 957224, centroid: [-72.6, -38.8] },
  // O'Higgins
  { id: 'LI', name: "O'Higgins", code: 'LI', level: 'region', population: 914555, centroid: [-71.5, -34.5] },
  // Coquimbo
  { id: 'CO', name: 'Coquimbo', code: 'CO', level: 'region', population: 742178, centroid: [-71.0, -30.0] },
  // Antofagasta
  { id: 'AN', name: 'Antofagasta', code: 'AN', level: 'region', population: 670340, centroid: [-69.8, -23.5] },
  // Los Lagos
  { id: 'LL', name: 'Los Lagos', code: 'LL', level: 'region', population: 828708, centroid: [-73.0, -42.5] },
  // Tarapacá
  { id: 'TA', name: 'Tarapacá', code: 'TA', level: 'region', population: 330558, centroid: [-69.5, -20.0] },
  // Atacama
  { id: 'AT', name: 'Atacama', code: 'AT', level: 'region', population: 312486, centroid: [-70.0, -27.0] },
  // Valparaíso (ya incluido arriba)
  // Ñuble
  { id: 'NB', name: 'Ñuble', code: 'NB', level: 'region', population: 480609, centroid: [-72.4, -36.5] },
  // Los Ríos
  { id: 'LR', name: 'Los Ríos', code: 'LR', level: 'region', population: 384837, centroid: [-72.5, -40.0] },
  // Arica y Parinacota
  { id: 'AP', name: 'Arica y Parinacota', code: 'AP', level: 'region', population: 226068, centroid: [-69.0, -18.0] },
  // Aysén
  { id: 'AI', name: 'Aysén', code: 'AI', level: 'region', population: 103158, centroid: [-73.0, -46.0] },
  // Magallanes
  { id: 'MA', name: 'Magallanes', code: 'MA', level: 'region', population: 165593, centroid: [-72.5, -52.0] },
];

/**
 * Obtener territorio por código
 */
export function getTerritoryByCode(code: string): ChileTerritory | undefined {
  return CHILE_TERRITORIES.find(t => t.code === code);
}

/**
 * Obtener territorios por nivel
 */
export function getTerritoriesByLevel(level: ChileTerritory['level']): ChileTerritory[] {
  return CHILE_TERRITORIES.filter(t => t.level === level);
}

/**
 * Rutas de datos por territorio
 */
export const TERRITORY_DATA_PATHS = {
  raw: {
    censo: 'data/raw/censo_2024',
    casen: 'data/raw/casen',
    subtel: 'data/raw/subtel',
  },
  interim: {
    censusNormalized: 'data/interim/census_normalized.json',
    casenNormalized: 'data/interim/casen_normalized.json',
    subtelNormalized: 'data/interim/subtel_normalized.json',
  },
  processed: {
    territoriesMaster: 'data/processed/territories_master.json',
    populationBackbone: 'data/processed/population_backbone.json',
    casenProfiles: 'data/processed/casen_profiles.json',
    subtelProfile: 'data/processed/subtel_profile.json',
  },
  validation: {
    backboneValidation: 'data/validation/backbone_validation.json',
    casenEnrichmentValidation: 'data/validation/casen_enrichment_validation.json',
    subtelProfileValidation: 'data/validation/subtel_profile_validation.json',
    syntheticPopulationValidation: 'data/validation/synthetic_population_validation.json',
  },
} as const;