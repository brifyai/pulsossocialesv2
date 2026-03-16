/**
 * ⚠️ ARCHIVO SAGRADO - VER GUARDRAILS.md
 * Este archivo es CRÍTICO para la simulación de agentes.
 * NO MODIFICAR sin revisar impacto en:
 * - Loop de animación (requestAnimationFrame)
 * - Estado de agentes
 * - Performance de simulación
 * - Integración con MapLibre
 *
 * Cambios permitidos solo para:
 * - Bug fixes críticos
 * - Optimización de performance
 * - Agregar features de simulación
 *
 * CHECKPOINT: v0.1.0 - Base estable
 */

/**
 * Agent Engine - Main simulation controller with network-based movement
 */

import type { Map } from 'maplibre-gl';
import type { NetworkAgent, PedestrianNetwork, SimulationState } from '../../types/network';
import { DEFAULT_SIMULATION_CONFIG } from '../../types/network';
import {
  getPedestrianNetwork,
  hasNetwork,
  getPositionOnSegment,
  getSegmentHeading,
  chooseNextSegment,
} from './network';
import { spawnAgentsDistributed, adjustAgentCount } from './spawn';
import { updateAgentsGeoJSON, ensureAgentsLayer } from '../layers/agents';
import { updatePerformanceMetrics } from '../performance/qualityMode';

// Type for agent GeoJSON data
type AgentGeoJSON = GeoJSON.FeatureCollection<GeoJSON.Point>;

// Engine state
let agents: NetworkAgent[] = [];
let network: PedestrianNetwork | null = null;
let simulationState: SimulationState = {
  isRunning: false,
  globalSpeedMultiplier: 1.0,
  agentCount: 50,
  lastFrameTime: 0,
  frameCount: 0,
};

let mapInstance: Map | null = null;
let animationFrameId: number | null = null;

/**
 * Convert radians to degrees for icon rotation
 * MapLibre icon-rotation expects degrees where 0 = north (up)
 * Math.atan2 returns radians where 0 = east (right)
 */
function radiansToDegrees(radians: number): number {
  // Convert radians to degrees and adjust so 0 = north
  // atan2: 0 = east, π/2 = north, π = west, -π/2 = south
  // icon-rotation: 0 = north, 90 = east, 180 = south, 270 = west
  return (radians * 180 / Math.PI) - 90;
}

/**
 * Initialize the simulation engine
 */
export function initEngine(
  map: Map,
  _centerLng: number = DEFAULT_SIMULATION_CONFIG.centerLng,
  _centerLat: number = DEFAULT_SIMULATION_CONFIG.centerLat
): void {
  mapInstance = map;

  // Ensure agents layer exists
  ensureAgentsLayer(map);

  // Get fixed pedestrian network for El Golf
  network = getPedestrianNetwork(map);

  if (network) {
    console.log('🚀 Agent engine initialized with pedestrian network');
    console.log(`   Network: ${Object.keys(network.nodes).length} nodes, ${Object.keys(network.segments).length} segments`);
  } else {
    console.warn('⚠️ Agent engine initialized without network - agents will not spawn');
  }
}

/**
 * Generate initial agents
 */
export function generateAgents(count: number = simulationState.agentCount): void {
  if (!network) {
    console.warn('⚠️ Cannot generate agents: no network available');
    return;
  }

  simulationState.agentCount = count;
  agents = spawnAgentsDistributed(network, count);

  console.log(`✅ Generated ${agents.length} agents on network`);
  updateMapData();
}

/**
 * Update agent position along its current segment
 */
function updateAgentOnSegment(agent: NetworkAgent, deltaTimeSeconds: number): void {
  if (!network) return;

  const segment = network.segments[agent.currentSegmentId];
  if (!segment) {
    // Agent is on invalid segment, try to reassign
    const newSegment = Object.values(network.segments)[0];
    if (newSegment) {
      agent.currentSegmentId = newSegment.id;
      agent.progress = Math.random();
    }
    return;
  }

  // Calculate distance to move
  const distance = agent.speed * deltaTimeSeconds * simulationState.globalSpeedMultiplier;
  const progressDelta = distance / segment.lengthMeters;

  // Update progress
  agent.progress += progressDelta * agent.direction;

  // Check if reached end of segment
  if (agent.progress >= 1) {
    // Reached end node
    const endNodeId = segment.endNodeId;
    const nextSegment = chooseNextSegment(network, endNodeId, segment.id, agent.direction);

    if (nextSegment) {
      // Continue on next segment
      agent.currentSegmentId = nextSegment.id;
      agent.direction = nextSegment.startNodeId === endNodeId ? 1 : -1;
      agent.progress = 0;
    } else {
      // Dead end, turn around
      agent.direction = -1;
      agent.progress = 1 - (agent.progress - 1);
    }
  } else if (agent.progress <= 0) {
    // Reached start node
    const startNodeId = segment.startNodeId;
    const nextSegment = chooseNextSegment(network, startNodeId, segment.id, agent.direction);

    if (nextSegment) {
      // Continue on next segment
      agent.currentSegmentId = nextSegment.id;
      agent.direction = nextSegment.endNodeId === startNodeId ? 1 : -1;
      agent.progress = 0;
    } else {
      // Dead end, turn around
      agent.direction = 1;
      agent.progress = -agent.progress;
    }
  }

  // Update position and heading
  const newSegment = network.segments[agent.currentSegmentId];
  if (newSegment) {
    const position = getPositionOnSegment(newSegment, agent.progress);
    agent.lng = position.lng;
    agent.lat = position.lat;
    agent.heading = getSegmentHeading(newSegment, agent.progress, agent.direction);
  }

  agent.age++;
  agent.lastUpdate = Date.now();
}

/**
 * Update agent positions for one frame
 */
function updateFrame(deltaTimeMs: number): void {
  if (!simulationState.isRunning || !network) return;

  const deltaTimeSeconds = deltaTimeMs / 1000;

  for (const agent of agents) {
    if (agent.state === 'moving') {
      updateAgentOnSegment(agent, deltaTimeSeconds);
    }
  }

  simulationState.frameCount++;
}

/**
 * Update map data with current agent positions
 */
function updateMapData(): void {
  if (!mapInstance) return;

  const geojson = agentsToGeoJSON(agents);
  updateAgentsGeoJSON(mapInstance, geojson);
}

/**
 * Convert agents to GeoJSON
 */
function agentsToGeoJSON(agents: NetworkAgent[]): AgentGeoJSON {
  return {
    type: 'FeatureCollection',
    features: agents.map(agent => ({
      type: 'Feature',
      properties: {
        id: agent.id,
        speed: agent.speed,
        heading: radiansToDegrees(agent.heading),
        state: agent.state,
        color: agent.color,
        age: agent.age,
        segmentId: agent.currentSegmentId,
        progress: agent.progress,
      },
      geometry: {
        type: 'Point',
        coordinates: [agent.lng, agent.lat],
      },
    })),
  };
}

/**
 * Animation loop using requestAnimationFrame
 */
function animationLoop(timestamp: number): void {
  if (!simulationState.isRunning) return;

  if (simulationState.lastFrameTime === 0) {
    simulationState.lastFrameTime = timestamp;
  }

  const deltaTime = timestamp - simulationState.lastFrameTime;
  simulationState.lastFrameTime = timestamp;

  // Update simulation
  updateFrame(deltaTime);

  // Update map (throttle to every frame for smooth movement)
  updateMapData();

  // Update performance metrics for quality mode
  updatePerformanceMetrics(agents.length);

  // Continue loop
  animationFrameId = requestAnimationFrame(animationLoop);
}

/**
 * Start the simulation
 */
export function startSimulation(): void {
  if (simulationState.isRunning) return;

  if (!network) {
    console.warn('⚠️ Cannot start simulation: no network available');
    return;
  }

  if (agents.length === 0) {
    generateAgents();
  }

  simulationState.isRunning = true;
  simulationState.lastFrameTime = 0;
  animationFrameId = requestAnimationFrame(animationLoop);

  console.log('▶️ Simulation started');
}

/**
 * Pause the simulation
 */
export function pauseSimulation(): void {
  if (!simulationState.isRunning) return;

  simulationState.isRunning = false;

  if (animationFrameId !== null) {
    cancelAnimationFrame(animationFrameId);
    animationFrameId = null;
  }

  console.log('⏸️ Simulation paused');
}

/**
 * Resume the simulation
 */
export function resumeSimulation(): void {
  if (simulationState.isRunning) return;
  startSimulation();
}

/**
 * Toggle simulation state
 */
export function toggleSimulation(): void {
  if (simulationState.isRunning) {
    pauseSimulation();
  } else {
    resumeSimulation();
  }
}

/**
 * Reset the simulation
 */
export function resetSimulation(): void {
  pauseSimulation();
  simulationState.frameCount = 0;
  simulationState.lastFrameTime = 0;

  if (network) {
    agents = spawnAgentsDistributed(network, simulationState.agentCount);
    updateMapData();
    console.log('🔄 Simulation reset');
  } else {
    console.warn('⚠️ Cannot reset: no network available');
  }
}

/**
 * Set global speed multiplier
 */
export function setGlobalSpeed(value: number): void {
  simulationState.globalSpeedMultiplier = Math.max(0.1, Math.min(5, value));
  console.log(`⚡ Speed set to ${simulationState.globalSpeedMultiplier.toFixed(1)}x`);
}

/**
 * Set agent count (regenerates agents if count changes significantly)
 */
export function setAgentCount(count: number): void {
  const newCount = Math.max(0, Math.min(200, count));

  if (newCount === agents.length) return;

  simulationState.agentCount = newCount;

  if (!network) {
    console.warn('⚠️ Cannot adjust agent count: no network available');
    return;
  }

  agents = adjustAgentCount(network, agents, newCount);
  updateMapData();
  console.log(`👥 Agent count set to ${newCount}`);
}

/**
 * Get current simulation state
 */
export function getSimulationState(): SimulationState {
  return { ...simulationState };
}

/**
 * Get current agents
 */
export function getAgents(): NetworkAgent[] {
  return agents;
}

/**
 * Get agent count
 */
export function getAgentCount(): number {
  return agents.length;
}

/**
 * Check if simulation is running
 */
export function isRunning(): boolean {
  return simulationState.isRunning;
}

/**
 * Check if network is available
 */
export function isNetworkAvailable(): boolean {
  return hasNetwork();
}

/**
 * Get network stats
 */
export function getNetworkStats(): { nodes: number; segments: number } | null {
  if (!network) return null;
  return {
    nodes: Object.keys(network.nodes).length,
    segments: Object.keys(network.segments).length,
  };
}

/**
 * Cleanup engine
 */
export function cleanupEngine(): void {
  pauseSimulation();
  agents = [];
  network = null;
  mapInstance = null;
  console.log('🧹 Engine cleaned up');
}
