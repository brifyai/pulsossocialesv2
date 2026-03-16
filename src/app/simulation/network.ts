/**
 * Pedestrian network - uses fixed local network for El Golf / Tobalaba
 * Replaces viewport-based extraction with stable, deterministic network
 */

import type { Map } from 'maplibre-gl';
import type { PedestrianNetwork, NetworkSegment } from '../../types/network';
import { EL_GOLF_NETWORK, NETWORK_STATS } from '../../data/elGolfNetwork';

// Use the fixed network
let networkCache: PedestrianNetwork | null = null;

// Priority weights for different road types
const PRIORITY_WEIGHTS: Record<string, number> = {
  pedestrian: 1.5,
  footway: 1.4,
  living_street: 1.3,
  residential: 1.2,
  tertiary: 1.0,
  secondary: 0.9,
  unclassified: 0.8,
  service: 0.7,
  other: 0.5,
};

// Angular heuristic weights
const ANGLE_WEIGHTS = {
  straight: 1.0,      // 0° to 30° - prefer strongly
  soft: 0.7,          // 30° to 75° - acceptable
  hard: 0.3,          // 75° to 135° - avoid if possible
  uTurn: 0.05,        // 135° to 180° - almost prohibited
};

/**
 * Normalize angle to range [0, 2π)
 */
function normalizeAngle(angle: number): number {
  let normalized = angle % (2 * Math.PI);
  if (normalized < 0) normalized += 2 * Math.PI;
  return normalized;
}

/**
 * Calculate the smallest angle difference between two angles (in radians)
 * Returns value in range [0, π]
 */
function angleDifference(angle1: number, angle2: number): number {
  const diff = Math.abs(normalizeAngle(angle1) - normalizeAngle(angle2));
  return Math.min(diff, 2 * Math.PI - diff);
}

/**
 * Calculate heading of a segment at a specific end
 * @param segment - the segment
 * @param fromStart - if true, heading from start to end; if false, heading from end to start
 */
function getSegmentDirection(segment: NetworkSegment, fromStart: boolean): number {
  const coords = segment.coordinates;
  if (coords.length < 2) return 0;

  if (fromStart) {
    // Heading from start to end (first points)
    const p1 = coords[0];
    const p2 = coords[Math.min(1, coords.length - 1)];
    return Math.atan2(p2[1] - p1[1], p2[0] - p1[0]);
  } else {
    // Heading from end to start (last points)
    const p1 = coords[coords.length - 1];
    const p2 = coords[Math.max(0, coords.length - 2)];
    return Math.atan2(p2[1] - p1[1], p2[0] - p1[0]);
  }
}

/**
 * Get the heading at which an agent exits a segment
 * @param segment - current segment
 * @param direction - agent's direction (1 = toward end, -1 = toward start)
 */
function getExitHeading(segment: NetworkSegment, direction: 1 | -1): number {
  if (direction === 1) {
    // Moving toward end node - heading is from start to end
    return getSegmentDirection(segment, true);
  } else {
    // Moving toward start node - heading is from end to start
    return getSegmentDirection(segment, false);
  }
}

/**
 * Get the heading at which an agent enters a candidate segment
 * @param segment - candidate segment
 * @param fromNodeId - the node we're coming from
 */
function getEntryHeading(segment: NetworkSegment, fromNodeId: string): number {
  if (segment.startNodeId === fromNodeId) {
    // Entering from start node - heading is from start to end
    return getSegmentDirection(segment, true);
  } else {
    // Entering from end node - heading is from end to start
    return getSegmentDirection(segment, false);
  }
}

/**
 * Calculate angular weight based on turn angle
 * Uses weighted scoring to prefer straight paths
 */
function calculateAngularWeight(turnAngle: number): number {
  const degrees = (turnAngle * 180) / Math.PI;

  if (degrees <= 30) {
    // Straight ahead - highest preference
    return ANGLE_WEIGHTS.straight;
  } else if (degrees <= 75) {
    // Soft turn - moderate preference
    // Linear interpolation between straight and soft
    const t = (degrees - 30) / (75 - 30);
    return ANGLE_WEIGHTS.straight - t * (ANGLE_WEIGHTS.straight - ANGLE_WEIGHTS.soft);
  } else if (degrees <= 135) {
    // Hard turn - low preference
    // Linear interpolation between soft and hard
    const t = (degrees - 75) / (135 - 75);
    return ANGLE_WEIGHTS.soft - t * (ANGLE_WEIGHTS.soft - ANGLE_WEIGHTS.hard);
  } else {
    // U-turn - very low preference
    // Linear interpolation between hard and u-turn
    const t = Math.min((degrees - 135) / (180 - 135), 1);
    return ANGLE_WEIGHTS.hard - t * (ANGLE_WEIGHTS.hard - ANGLE_WEIGHTS.uTurn);
  }
}

/**
 * Get the fixed pedestrian network for El Golf
 * This is loaded once at startup and never changes
 */
export function getPedestrianNetwork(_map?: Map): PedestrianNetwork | null {
  // Return cached network if available
  if (networkCache) return networkCache;

  // Use the pre-built El Golf network
  networkCache = EL_GOLF_NETWORK;

  console.log('🛣️ Using fixed El Golf pedestrian network');
  console.log(`   Network: ${NETWORK_STATS.nodeCount} nodes, ${NETWORK_STATS.segmentCount} segments`);
  console.log(`   Total length: ${NETWORK_STATS.totalLengthMeters.toFixed(0)}m`);

  return networkCache;
}

/**
 * Get a random segment from the network
 */
export function getRandomSegment(network: PedestrianNetwork): NetworkSegment | null {
  const segments = Object.values(network.segments);
  if (segments.length === 0) return null;
  return segments[Math.floor(Math.random() * segments.length)];
}

/**
 * Get position at a specific progress along a segment
 */
export function getPositionOnSegment(
  segment: NetworkSegment,
  progress: number
): { lng: number; lat: number } {
  const clampedProgress = Math.max(0, Math.min(1, progress));
  const coords = segment.coordinates;

  const totalPoints = coords.length - 1;
  const pointIndex = Math.floor(clampedProgress * totalPoints);
  const localProgress = (clampedProgress * totalPoints) - pointIndex;

  const idx = Math.min(pointIndex, totalPoints - 1);
  const p1 = coords[idx];
  const p2 = coords[idx + 1];

  return {
    lng: p1[0] + (p2[0] - p1[0]) * localProgress,
    lat: p1[1] + (p2[1] - p1[1]) * localProgress,
  };
}

/**
 * Calculate heading (angle) along a segment at given progress
 */
export function getSegmentHeading(
  segment: NetworkSegment,
  progress: number,
  direction: 1 | -1
): number {
  const coords = segment.coordinates;
  const totalPoints = coords.length - 1;
  const pointIndex = Math.floor(progress * totalPoints);

  const idx = Math.min(pointIndex, totalPoints - 1);
  const p1 = coords[idx];
  const p2 = coords[idx + 1];

  // Calculate angle
  const dx = p2[0] - p1[0];
  const dy = p2[1] - p1[1];
  let angle = Math.atan2(dy, dx);

  // Adjust for direction
  if (direction === -1) {
    angle += Math.PI;
  }

  return angle;
}

/**
 * Choose next segment at a node using angular heuristic
 * Prefers:
 * 1. Continuing straight (0-30° turn)
 * 2. Soft turns (30-75°)
 * 3. Hard turns (75-135°) - only if no better option
 * 4. U-turns (135-180°) - only as last resort or dead end
 */
export function chooseNextSegment(
  network: PedestrianNetwork,
  currentNodeId: string,
  currentSegmentId: string,
  currentDirection: 1 | -1 = 1
): NetworkSegment | null {
  const node = network.nodes[currentNodeId];
  if (!node) return null;

  const currentSegment = network.segments[currentSegmentId];
  if (!currentSegment) return null;

  // Get connected segments excluding current
  const connectedSegments = node.connectedSegmentIds
    .filter(id => id !== currentSegmentId)
    .map(id => network.segments[id])
    .filter((seg): seg is NetworkSegment => seg !== undefined);

  // Dead end - must turn around
  if (connectedSegments.length === 0) {
    return currentSegment;
  }

  // Calculate current heading (direction we're moving)
  const currentHeading = getExitHeading(currentSegment, currentDirection);

  // Score each candidate segment
  const scoredSegments = connectedSegments.map(segment => {
    // Get the heading when entering this segment from current node
    const entryHeading = getEntryHeading(segment, currentNodeId);

    // Calculate turn angle (how much we need to turn to enter this segment)
    const turnAngle = angleDifference(currentHeading, entryHeading);

    // Calculate angular weight (higher = better)
    const angularWeight = calculateAngularWeight(turnAngle);

    // Get road type weight
    const roadWeight = PRIORITY_WEIGHTS[segment.kind] || 0.5;

    // Combined score (angular preference weighted more heavily)
    const score = angularWeight * 0.7 + roadWeight * 0.3;

    return {
      segment,
      turnAngle,
      angularWeight,
      roadWeight,
      score,
    };
  });

  // Sort by score descending (best first)
  scoredSegments.sort((a, b) => b.score - a.score);

  // Log decision for debugging (only occasionally)
  if (Math.random() < 0.01 && scoredSegments.length > 1) {
    const best = scoredSegments[0];
    const worst = scoredSegments[scoredSegments.length - 1];
    console.log(
      `🔄 Turn decision: ${(best.turnAngle * 180 / Math.PI).toFixed(0)}° ` +
      `(score: ${best.score.toFixed(2)}) vs ` +
      `${(worst.turnAngle * 180 / Math.PI).toFixed(0)}° ` +
      `(score: ${worst.score.toFixed(2)})`
    );
  }

  // Weighted random choice among top candidates
  // If there's a clear winner (much better score), prefer it
  // Otherwise add some randomness for natural variation

  const topCandidates = scoredSegments.slice(0, Math.min(3, scoredSegments.length));

  if (topCandidates.length === 1) {
    return topCandidates[0].segment;
  }

  // Check if first candidate is significantly better
  const best = topCandidates[0];
  const second = topCandidates[1];

  if (best.score > second.score * 1.3) {
    // Clear winner - take it 90% of the time
    if (Math.random() < 0.9) {
      return best.segment;
    }
    // 10% chance to try second best for variety
    return second.segment;
  }

  // Scores are close - use weighted random among top candidates
  const totalWeight = topCandidates.reduce((sum, c) => sum + c.score, 0);
  let random = Math.random() * totalWeight;

  for (const candidate of topCandidates) {
    random -= candidate.score;
    if (random <= 0) {
      return candidate.segment;
    }
  }

  return topCandidates[topCandidates.length - 1].segment;
}

/**
 * Clear network cache (for testing purposes)
 */
export function clearNetworkCache(): void {
  networkCache = null;
}

/**
 * Check if network is available
 */
export function hasNetwork(): boolean {
  return networkCache !== null && Object.keys(networkCache.segments).length > 0;
}

/**
 * Get cached network
 */
export function getCachedNetwork(): PedestrianNetwork | null {
  return networkCache;
}

/**
 * Get network stats
 */
export function getNetworkStats(): { nodes: number; segments: number; length: number } | null {
  if (!networkCache) return null;
  return {
    nodes: Object.keys(networkCache.nodes).length,
    segments: Object.keys(networkCache.segments).length,
    length: Object.values(networkCache.segments).reduce((sum, seg) => sum + seg.lengthMeters, 0),
  };
}

// Legacy function name for backward compatibility
export const extractPedestrianNetwork = getPedestrianNetwork;
