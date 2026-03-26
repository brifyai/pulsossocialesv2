/**
 * Opinion State Loader
 *
 * Resolves topic states and panel states for agents.
 * Returns persisted state if available, otherwise generates from seeds.
 * This enables longitudinal tracking of agent opinions across multiple survey runs.
 */

import { buildInitialTopicStates } from './topicStateSeed';
import { buildInitialPanelState } from '../panel/panelStateManager';
import { getTopicStates, getPanelState } from '../../services/supabase/repositories/opinionStateRepository';

import type { TopicState } from './types';
import type { PanelState } from '../panel/types';
import type { TopicStateSeedAgent } from './topicStateSeed';

/**
 * Resolve topic states for an agent.
 * Returns persisted states if they exist, otherwise generates initial states from seed.
 *
 * @param agent - Agent with demographic data for seed generation
 * @returns Array of topic states
 */
export async function resolveTopicStates(agent: TopicStateSeedAgent & { agentId: string }): Promise<TopicState[]> {
  try {
    const persisted = await getTopicStates(agent.agentId);
    if (persisted.length > 0) {
      return persisted;
    }
  } catch (error) {
    // If database is not available, fall back to seed
    console.warn(`[OpinionStateLoader] Could not load persisted topic states for ${agent.agentId}, using seed:`, error);
  }

  // Generate from seed if no persisted state or error
  return buildInitialTopicStates(agent);
}

/**
 * Resolve panel state for an agent.
 * Returns persisted state if it exists, otherwise generates initial state from seed.
 *
 * @param agent - Agent with at least an agentId
 * @returns Panel state
 */
export async function resolvePanelState(agent: { agentId: string }): Promise<PanelState> {
  try {
    const persisted = await getPanelState(agent.agentId);
    if (persisted) {
      return persisted;
    }
  } catch (error) {
    // If database is not available, fall back to seed
    console.warn(`[OpinionStateLoader] Could not load persisted panel state for ${agent.agentId}, using seed:`, error);
  }

  // Generate from seed if no persisted state or error
  return buildInitialPanelState(agent);
}

/**
 * Resolve both topic states and panel state for an agent in parallel.
 * More efficient when both are needed.
 *
 * @param agent - Agent with demographic data for seed generation
 * @returns Object containing both topic states and panel state
 */
export async function resolveAgentState(agent: TopicStateSeedAgent & { agentId: string }): Promise<{
  topicStates: TopicState[];
  panelState: PanelState;
}> {
  const [topicStates, panelState] = await Promise.all([
    resolveTopicStates(agent),
    resolvePanelState(agent),
  ]);

  return { topicStates, panelState };
}
