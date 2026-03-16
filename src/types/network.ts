/**
 * Network types for pedestrian movement simulation
 */

/** A node in the pedestrian network (intersection or endpoint) */
export interface NetworkNode {
  id: string;
  lng: number;
  lat: number;
  connectedSegmentIds: string[];
}

/** A segment in the pedestrian network (street/path segment) */
export interface NetworkSegment {
  id: string;
  coordinates: [number, number][]; // LineString coordinates
  startNodeId: string;
  endNodeId: string;
  lengthMeters: number;
  kind: 'pedestrian' | 'footway' | 'living_street' | 'residential' | 'tertiary' | 'secondary' | 'other';
}

/** The complete pedestrian network */
export interface PedestrianNetwork {
  nodes: Record<string, NetworkNode>;
  segments: Record<string, NetworkSegment>;
}

/** Agent state */
export type AgentState = 'moving' | 'paused';

/** Agent moving on the network */
export interface NetworkAgent {
  id: string;
  currentSegmentId: string;
  progress: number; // 0..1 along the segment
  speed: number; // meters per second
  direction: 1 | -1; // 1 = toward end node, -1 = toward start node
  lng: number;
  lat: number;
  heading: number; // radians, for visualization
  state: AgentState;
  color: string;
  age: number; // frames alive
  lastUpdate: number; // timestamp
}

/** Simulation configuration */
export interface SimulationConfig {
  centerLng: number;
  centerLat: number;
  radiusMeters: number;
  minAgents: number;
  maxAgents: number;
  defaultSpeed: number;
  speedVariation: number;
}

/** Simulation state */
export interface SimulationState {
  isRunning: boolean;
  globalSpeedMultiplier: number;
  agentCount: number;
  lastFrameTime: number;
  frameCount: number;
}

/** Bounding box */
export interface BBox {
  minLng: number;
  maxLng: number;
  minLat: number;
  maxLat: number;
}

// Default simulation config for El Golf / Tobalaba area
export const DEFAULT_SIMULATION_CONFIG: SimulationConfig = {
  centerLng: -70.5975,
  centerLat: -33.4125,
  radiusMeters: 1500,
  minAgents: 20,
  maxAgents: 200,
  defaultSpeed: 1.2, // ~4 km/h for pedestrians
  speedVariation: 0.3,
};

// Agent colors - subtle for pedestrians
export const AGENT_COLORS = {
  pedestrian: '#66ccff', // Soft cyan
  pedestrianAlt: '#88ddff', // Lighter cyan
  pedestrianDim: '#44aadd', // Darker cyan
};
