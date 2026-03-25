/**
 * Agent types and interfaces
 */

// Simulation agent types (for map visualization)
export type AgentState = 'moving' | 'paused';

export type AgentType = 'pedestrian' | 'vehicle' | 'drone';

export interface Agent {
  id: string;
  lng: number;
  lat: number;
  speed: number; // meters per second
  heading: number; // radians, 0 = east, PI/2 = north
  state: AgentState;
  type: AgentType;
  color: string;
  targetLng?: number;
  targetLat?: number;
  age: number; // frames alive
  lastUpdate: number; // timestamp
}

export interface SimulationConfig {
  centerLng: number;
  centerLat: number;
  radiusMeters: number;
  minAgents: number;
  maxAgents: number;
  defaultSpeed: number;
  speedVariation: number;
}

export interface SimulationState {
  isRunning: boolean;
  globalSpeedMultiplier: number;
  agentCount: number;
  lastFrameTime: number;
  frameCount: number;
}

export interface BBox {
  minLng: number;
  maxLng: number;
  minLat: number;
  maxLat: number;
}

// Agent colors by type
export const AGENT_COLORS: Record<AgentType, string> = {
  pedestrian: '#00ffff', // cyan
  vehicle: '#ff00ff', // magenta
  drone: '#ffff00', // yellow
};

// Default simulation config for El Golf / Tobalaba area
export const DEFAULT_SIMULATION_CONFIG: SimulationConfig = {
  centerLng: -70.5975,
  centerLat: -33.4125,
  radiusMeters: 2000, // 2km radius
  minAgents: 20,
  maxAgents: 200,
  defaultSpeed: 15, // ~54 km/h for vehicles, will vary by type
  speedVariation: 0.3,
};

// ===========================================
// Synthetic Agents V1 (from data pipeline)
// ===========================================

export type Sex = 'male' | 'female';
export type AgeGroup = 'child' | 'youth' | 'adult' | 'middle_age' | 'senior';
export type HouseholdType = 'single' | 'couple' | 'family' | 'extended';
export type Urbanicity = 'urban' | 'rural';
export type PovertyStatus = 'extreme_poverty' | 'poverty' | 'vulnerable' | 'middle_class' | 'upper_middle' | 'upper_class';
export type EducationLevel = 'none' | 'primary' | 'secondary' | 'technical' | 'university' | 'postgraduate';
export type OccupationStatus = 'employed' | 'unemployed' | 'self_employed' | 'retired' | 'student' | 'homemaker';
export type SocioeconomicLevel = 'low' | 'medium' | 'high';
export type ConnectivityLevel = 'none' | 'low' | 'medium' | 'high' | 'very_high';
export type DigitalExposureLevel = 'none' | 'low' | 'medium' | 'high' | 'very_high';
export type SurveyChannel = 'phone' | 'online' | 'in_person' | 'mixed';
export type SyntheticAgentType = 'resident' | 'retiree' | 'student' | 'entrepreneur' | 'worker';

export interface SyntheticAgentMetadata {
  version: string;
  batch_id: string;
  total_agents: number;
  generated_at: string;
  schema_version: string;
  fields_with_null: string[];
  data_sources: {
    population_backbone: string;
    territories_master: string;
    subtel_profile: string;
    casen_normalized: string;
  };
}

export interface SyntheticAgent {
  // Identity
  agent_id: string;
  synthetic_batch_id: string;
  source_version: string;
  created_at: string;
  
  // Territory
  country_code: string;
  region_code: string;
  region_name: string;
  comuna_code: string;
  comuna_name: string;
  urbanicity: Urbanicity;
  
  // Demographics
  sex: Sex;
  age: number;
  age_group: AgeGroup;
  
  // Household
  household_size: number;
  household_type: HouseholdType;
  
  // Socioeconomic
  income_decile: number | null;
  poverty_status: PovertyStatus | null;
  education_level: EducationLevel | null;
  occupation_status: OccupationStatus | null;
  occupation_group: string | null;
  socioeconomic_level: SocioeconomicLevel | null;
  
  // Digital
  connectivity_level: ConnectivityLevel | null;
  digital_exposure_level: DigitalExposureLevel | null;
  preferred_survey_channel: SurveyChannel | null;
  
  // Functional
  agent_type: SyntheticAgentType;
  
  // Traceability
  backbone_key: string;
  subtel_profile_key: string | null;
  casen_profile_key: string | null;
  generation_notes: string;
  
  // Geolocation (from enriched data)
  location_lat?: number | null;
  location_lng?: number | null;
}

export interface SyntheticAgentsData {
  metadata: SyntheticAgentMetadata;
  agents: SyntheticAgent[];
}
