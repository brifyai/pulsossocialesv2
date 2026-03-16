/**
 * Agent spawn system - creates agents on the pedestrian network
 */

import type { PedestrianNetwork, NetworkAgent, NetworkSegment } from '../../types/network';
import { AGENT_COLORS, DEFAULT_SIMULATION_CONFIG } from '../../types/network';
import {
  getRandomSegment,
  getPositionOnSegment,
  getSegmentHeading,
} from './network';

let idCounter = 0;

/**
 * Generate a unique agent ID
 */
function generateAgentId(): string {
  return `agent-${Date.now()}-${++idCounter}`;
}

/**
 * Get random pedestrian speed (meters per second)
 */
function getRandomPedestrianSpeed(): number {
  const base = DEFAULT_SIMULATION_CONFIG.defaultSpeed;
  const variation = DEFAULT_SIMULATION_CONFIG.speedVariation;
  return base * (1 + (Math.random() - 0.5) * variation);
}

/**
 * Get random agent color (subtle variations)
 */
function getRandomAgentColor(): string {
  const colors = Object.values(AGENT_COLORS);
  return colors[Math.floor(Math.random() * colors.length)];
}

/**
 * Create a new agent on a specific segment
 */
export function createAgentOnSegment(
  segment: NetworkSegment,
  progress?: number,
  direction?: 1 | -1
): NetworkAgent {
  const actualProgress = progress !== undefined ? progress : Math.random();
  const actualDirection = direction !== undefined ? direction : (Math.random() > 0.5 ? 1 : -1);

  const position = getPositionOnSegment(segment, actualProgress);
  const heading = getSegmentHeading(segment, actualProgress, actualDirection);

  return {
    id: generateAgentId(),
    currentSegmentId: segment.id,
    progress: actualProgress,
    speed: getRandomPedestrianSpeed(),
    direction: actualDirection,
    lng: position.lng,
    lat: position.lat,
    heading,
    state: 'moving',
    color: getRandomAgentColor(),
    age: 0,
    lastUpdate: Date.now(),
  };
}

/**
 * Create a new agent at a random position on the network
 */
export function createRandomAgent(network: PedestrianNetwork): NetworkAgent | null {
  const segment = getRandomSegment(network);
  if (!segment) return null;

  return createAgentOnSegment(segment);
}

/**
 * Create multiple agents on the network
 */
export function createAgents(
  network: PedestrianNetwork,
  count: number
): NetworkAgent[] {
  const agents: NetworkAgent[] = [];

  for (let i = 0; i < count; i++) {
    const agent = createRandomAgent(network);
    if (agent) {
      agents.push(agent);
    }
  }

  return agents;
}

/**
 * Spawn agents distributed across the network
 * Tries to spread them out rather than clustering
 */
export function spawnAgentsDistributed(
  network: PedestrianNetwork,
  count: number
): NetworkAgent[] {
  const segments = Object.values(network.segments);
  if (segments.length === 0) return [];

  const agents: NetworkAgent[] = [];

  // Distribute agents across segments
  for (let i = 0; i < count; i++) {
    // Pick segment round-robin style for distribution
    const segmentIndex = i % segments.length;
    const segment = segments[segmentIndex];

    // Random progress along segment
    const progress = Math.random();

    // Random direction
    const direction = Math.random() > 0.5 ? 1 : -1;

    const agent = createAgentOnSegment(segment, progress, direction);
    agents.push(agent);
  }

  return agents;
}

/**
 * Add agents to existing array
 */
export function addAgents(
  network: PedestrianNetwork,
  existingAgents: NetworkAgent[],
  count: number
): NetworkAgent[] {
  const newAgents = createAgents(network, count);
  return [...existingAgents, ...newAgents];
}

/**
 * Remove agents from array
 */
export function removeAgents(
  agents: NetworkAgent[],
  count: number
): NetworkAgent[] {
  if (count >= agents.length) return [];
  return agents.slice(0, agents.length - count);
}

/**
 * Adjust agent count
 */
export function adjustAgentCount(
  network: PedestrianNetwork,
  agents: NetworkAgent[],
  targetCount: number
): NetworkAgent[] {
  const currentCount = agents.length;

  if (currentCount === targetCount) {
    return agents;
  }

  if (currentCount < targetCount) {
    // Add more agents
    const additional = createAgents(network, targetCount - currentCount);
    return [...agents, ...additional];
  } else {
    // Remove excess agents
    return agents.slice(0, targetCount);
  }
}
