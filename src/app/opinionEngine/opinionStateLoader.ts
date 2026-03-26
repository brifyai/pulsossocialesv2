/**
 * Opinion State Loader
 * CADEM Opinion Engine v1.1
 *
 * Resolves topic states and panel states for agents.
 * Returns persisted state if available, otherwise generates from seeds.
 * This enables longitudinal tracking of agent opinions across multiple survey runs.
 */

import { buildInitialTopicStates } from './topicStateSeed';
import { buildInitialPanelState } from '../panel/panelStateManager';
import { opinionStateRepository } from '../../services/supabase/repositories/opinionStateRepository';

import type { TopicState } from './types';
import type { PanelState } from '../panel/types';
import type { TopicStateSeedAgent } from './topicStateSeed';

/**
 * Result of resolving topic states with source information.
 */
export interface ResolvedTopicStates {
  states: TopicState[];
  source: 'db' | 'seed';
}

/**
 * Result of resolving panel state with source information.
 */
export interface ResolvedPanelState {
  state: PanelState;
  source: 'db' | 'seed';
}

/**
 * Result of resolving agent state with source information.
 */
export interface ResolvedAgentState {
  topicStates: TopicState[];
  panelState: PanelState;
  source: {
    topic: 'db' | 'seed';
    panel: 'db' | 'seed';
  };
}

/**
 * Resolve topic states for an agent.
 * Returns persisted states if they exist, otherwise generates initial states from seed.
 *
 * @param agent - Agent with demographic data for seed generation
 * @returns Object containing topic states and source
 */
export async function resolveTopicStates(agent: TopicStateSeedAgent & { agentId: string }): Promise<ResolvedTopicStates> {
  try {
    const persisted = await opinionStateRepository.getTopicStates(agent.agentId);
    if (persisted.length > 0) {
      console.log(`[OpinionStateLoader] Loaded persisted topic states for ${agent.agentId}`);
      return { states: persisted, source: 'db' };
    }
  } catch (error) {
    // If database is not available, fall back to seed
    console.warn(`[OpinionStateLoader] Could not load persisted topic states for ${agent.agentId}, using seed:`, error);
  }

  // Generate from seed if no persisted state or error
  console.log(`[OpinionStateLoader] Generating topic states from seed for ${agent.agentId}`);
  return { states: buildInitialTopicStates(agent), source: 'seed' };
}

/**
 * Resolve panel state for an agent.
 * Returns persisted state if it exists, otherwise generates initial state from seed.
 *
 * @param agent - Agent with at least an agentId
 * @returns Object containing panel state and source
 */
export async function resolvePanelState(agent: { agentId: string }): Promise<ResolvedPanelState> {
  try {
    const persisted = await opinionStateRepository.getPanelState(agent.agentId);
    if (persisted) {
      console.log(`[OpinionStateLoader] Loaded persisted panel state for ${agent.agentId}`);
      return { state: persisted, source: 'db' };
    }
  } catch (error) {
    // If database is not available, fall back to seed
    console.warn(`[OpinionStateLoader] Could not load persisted panel state for ${agent.agentId}, using seed:`, error);
  }

  // Generate from seed if no persisted state or error
  console.log(`[OpinionStateLoader] Generating panel state from seed for ${agent.agentId}`);
  return { state: buildInitialPanelState(agent), source: 'seed' };
}

/**
 * Resolve both topic states and panel state for an agent in parallel.
 * More efficient when both are needed.
 *
 * @param agent - Agent with demographic data for seed generation
 * @returns Object containing both topic states, panel state, and sources
 */
export async function resolveAgentState(agent: TopicStateSeedAgent & { agentId: string }): Promise<ResolvedAgentState> {
  const [topicResult, panelResult] = await Promise.all([
    resolveTopicStates(agent),
    resolvePanelState(agent),
  ]);

  return {
    topicStates: topicResult.states,
    panelState: panelResult.state,
    source: {
      topic: topicResult.source,
      panel: panelResult.source,
    },
  };
}
