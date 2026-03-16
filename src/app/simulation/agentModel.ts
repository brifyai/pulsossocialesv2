/**
 * Agent model - creation and management of individual agents
 */

import type { Agent, AgentType, AgentState, BBox } from '../../types/agent';
import { AGENT_COLORS, DEFAULT_SIMULATION_CONFIG } from '../../types/agent';
import {
  randomPositionInBBox,
  randomHeading,
  createBBox,
} from '../utils/geoUtils';

// Speed ranges by agent type (meters per second)
const SPEED_RANGES: Record<AgentType, { min: number; max: number }> = {
  pedestrian: { min: 0.8, max: 1.5 }, // ~3-5 km/h
  vehicle: { min: 8, max: 20 }, // ~30-70 km/h
  drone: { min: 15, max: 35 }, // ~50-120 km/h
};

// Distribution of agent types
const TYPE_DISTRIBUTION: AgentType[] = [
  'pedestrian',
  'pedestrian',
  'pedestrian',
  'vehicle',
  'vehicle',
  'drone',
];

let idCounter = 0;

/**
 * Generate a unique agent ID
 */
export function generateAgentId(): string {
  return `agent-${Date.now()}-${++idCounter}`;
}

/**
 * Get random agent type based on distribution
 */
export function getRandomAgentType(): AgentType {
  return TYPE_DISTRIBUTION[Math.floor(Math.random() * TYPE_DISTRIBUTION.length)];
}

/**
 * Get random speed for agent type
 */
export function getRandomSpeed(type: AgentType): number {
  const range = SPEED_RANGES[type];
  return range.min + Math.random() * (range.max - range.min);
}

/**
 * Create a new agent
 */
export function createAgent(
  lng: number,
  lat: number,
  type?: AgentType,
  heading?: number
): Agent {
  const agentType = type || getRandomAgentType();
  const agentHeading = heading !== undefined ? heading : randomHeading();

  return {
    id: generateAgentId(),
    lng,
    lat,
    speed: getRandomSpeed(agentType),
    heading: agentHeading,
    state: 'moving',
    type: agentType,
    color: AGENT_COLORS[agentType],
    age: 0,
    lastUpdate: Date.now(),
  };
}

/**
 * Create agents randomly distributed in an area
 */
export function createRandomAgents(
  count: number,
  centerLng: number = DEFAULT_SIMULATION_CONFIG.centerLng,
  centerLat: number = DEFAULT_SIMULATION_CONFIG.centerLat,
  radiusMeters: number = DEFAULT_SIMULATION_CONFIG.radiusMeters
): Agent[] {
  const bbox = createBBox(centerLng, centerLat, radiusMeters);
  const agents: Agent[] = [];

  for (let i = 0; i < count; i++) {
    const [lng, lat] = randomPositionInBBox(bbox);
    agents.push(createAgent(lng, lat));
  }

  return agents;
}

/**
 * Update agent position based on speed and heading
 * Returns true if agent was clamped to bounds
 */
export function updateAgentPosition(
  agent: Agent,
  deltaTimeSeconds: number,
  speedMultiplier: number,
  bbox: BBox
): boolean {
  if (agent.state !== 'moving') return false;

  const distance = agent.speed * deltaTimeSeconds * speedMultiplier;

  // Calculate new position
  const deltaLng =
    (distance * Math.cos(agent.heading)) /
    (111320 * Math.cos((agent.lat * Math.PI) / 180));
  const deltaLat = (distance * Math.sin(agent.heading)) / 110540;

  let newLng = agent.lng + deltaLng;
  let newLat = agent.lat + deltaLat;

  // Check bounds and bounce
  let wasClamped = false;

  if (newLng < bbox.minLng || newLng > bbox.maxLng) {
    agent.heading = Math.PI - agent.heading;
    newLng = Math.max(bbox.minLng, Math.min(bbox.maxLng, newLng));
    wasClamped = true;
  }

  if (newLat < bbox.minLat || newLat > bbox.maxLat) {
    agent.heading = -agent.heading;
    newLat = Math.max(bbox.minLat, Math.min(bbox.maxLat, newLat));
    wasClamped = true;
  }

  agent.lng = newLng;
  agent.lat = newLat;
  agent.age++;
  agent.lastUpdate = Date.now();

  return wasClamped;
}

/**
 * Add slight random variation to agent heading (wandering behavior)
 */
export function wanderAgent(agent: Agent, maxWanderAngle: number = 0.3): void {
  const wander = (Math.random() - 0.5) * 2 * maxWanderAngle;
  agent.heading = (agent.heading + wander + Math.PI * 2) % (Math.PI * 2);
}

/**
 * Convert agent to GeoJSON feature
 */
export function agentToFeature(agent: Agent): GeoJSON.Feature {
  return {
    type: 'Feature',
    properties: {
      id: agent.id,
      type: agent.type,
      speed: agent.speed,
      heading: agent.heading,
      state: agent.state,
      color: agent.color,
      age: agent.age,
    },
    geometry: {
      type: 'Point',
      coordinates: [agent.lng, agent.lat],
    },
  };
}

/**
 * Convert agents array to GeoJSON FeatureCollection
 */
export function agentsToGeoJSON(agents: Agent[]): GeoJSON.FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: agents.map(agentToFeature),
  };
}

/**
 * Set agent state
 */
export function setAgentState(agent: Agent, state: AgentState): void {
  agent.state = state;
}

/**
 * Toggle agent state between moving and paused
 */
export function toggleAgentState(agent: Agent): void {
  agent.state = agent.state === 'moving' ? 'paused' : 'moving';
}
