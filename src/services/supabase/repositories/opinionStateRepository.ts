/**
 * Opinion State Repository
 *
 * Handles persistence of topic states and panel states for the CADEM Opinion Engine.
 * Provides CRUD operations for agent opinion data with proper TypeScript typing.
 */

import { getSupabaseClient } from '../client';
import type { TopicState } from '../../../app/opinionEngine/types';
import type { PanelState } from '../../../app/panel/types';
import type { TopicKey } from '../../../types/opinion';

// ============================================================================
// Mappers: Database row <-> Domain model
// ============================================================================

function mapTopicStateRow(row: Record<string, unknown>): TopicState {
  return {
    topic: row.topic as TopicKey,
    score: row.score as number,
    confidence: row.confidence as number,
    salience: row.salience as number,
    volatility: row.volatility as number,
    updatedAt: new Date(row.updated_at as string),
  };
}

function mapPanelStateRow(row: Record<string, unknown>): PanelState {
  return {
    agentId: row.agent_id as string,
    eligibleWeb: row.eligible_web as boolean,
    participationPropensity: row.participation_propensity as number,
    panelFatigue: row.panel_fatigue as number,
    qualityScore: row.quality_score as number,
    cooldownUntil: row.cooldown_until ? new Date(row.cooldown_until as string) : null,
    invites30d: row.invites_30d as number,
    completions30d: row.completions_30d as number,
    lastInvitedAt: row.last_invited_at ? new Date(row.last_invited_at as string) : null,
    lastCompletedAt: row.last_completed_at ? new Date(row.last_completed_at as string) : null,
    updatedAt: row.updated_at ? new Date(row.updated_at as string) : undefined,
  };
}

// ============================================================================
// Topic State Operations
// ============================================================================

/**
 * Retrieve all topic states for a given agent
 */
export async function getTopicStates(agentId: string): Promise<TopicState[]> {
  const supabase = await getSupabaseClient();
  if (!supabase) {
    throw new Error('Supabase client not available');
  }

  const { data, error } = await supabase
    .from('agent_topic_state')
    .select('*')
    .eq('agent_id', agentId);

  if (error) {
    throw new Error(`Failed to get topic states for agent ${agentId}: ${error.message}`);
  }

  return (data ?? []).map(mapTopicStateRow);
}

/**
 * Save or update topic states for a given agent
 * Uses upsert to handle both insert and update cases
 */
export async function saveTopicStates(agentId: string, topicStates: TopicState[]): Promise<void> {
  if (topicStates.length === 0) return;

  const supabase = await getSupabaseClient();
  if (!supabase) {
    throw new Error('Supabase client not available');
  }

  const payload = topicStates.map((state) => ({
    agent_id: agentId,
    topic: state.topic,
    score: state.score,
    confidence: state.confidence,
    salience: state.salience,
    volatility: state.volatility,
    updated_at: state.updatedAt.toISOString(),
  }));

  const { error } = await supabase
    .from('agent_topic_state')
    .upsert(payload, { onConflict: 'agent_id,topic' });

  if (error) {
    throw new Error(`Failed to save topic states for agent ${agentId}: ${error.message}`);
  }
}

/**
 * Delete all topic states for a given agent
 */
export async function deleteTopicStates(agentId: string): Promise<void> {
  const supabase = await getSupabaseClient();
  if (!supabase) {
    throw new Error('Supabase client not available');
  }

  const { error } = await supabase
    .from('agent_topic_state')
    .delete()
    .eq('agent_id', agentId);

  if (error) {
    throw new Error(`Failed to delete topic states for agent ${agentId}: ${error.message}`);
  }
}

// ============================================================================
// Panel State Operations
// ============================================================================

/**
 * Retrieve panel state for a given agent
 * Returns null if no panel state exists
 */
export async function getPanelState(agentId: string): Promise<PanelState | null> {
  const supabase = await getSupabaseClient();
  if (!supabase) {
    throw new Error('Supabase client not available');
  }

  const { data, error } = await supabase
    .from('agent_panel_state')
    .select('*')
    .eq('agent_id', agentId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to get panel state for agent ${agentId}: ${error.message}`);
  }

  return data ? mapPanelStateRow(data) : null;
}

/**
 * Save or update panel state for a given agent
 * Uses upsert to handle both insert and update cases
 */
export async function savePanelState(panelState: PanelState): Promise<void> {
  const supabase = await getSupabaseClient();
  if (!supabase) {
    throw new Error('Supabase client not available');
  }

  const payload = {
    agent_id: panelState.agentId,
    eligible_web: panelState.eligibleWeb,
    participation_propensity: panelState.participationPropensity,
    panel_fatigue: panelState.panelFatigue,
    quality_score: panelState.qualityScore,
    cooldown_until: panelState.cooldownUntil?.toISOString() ?? null,
    invites_30d: panelState.invites30d,
    completions_30d: panelState.completions30d,
    last_invited_at: panelState.lastInvitedAt?.toISOString() ?? null,
    last_completed_at: panelState.lastCompletedAt?.toISOString() ?? null,
    updated_at: panelState.updatedAt?.toISOString() ?? new Date().toISOString(),
  };

  const { error } = await supabase
    .from('agent_panel_state')
    .upsert(payload, { onConflict: 'agent_id' });

  if (error) {
    throw new Error(`Failed to save panel state for agent ${panelState.agentId}: ${error.message}`);
  }
}

/**
 * Delete panel state for a given agent
 */
export async function deletePanelState(agentId: string): Promise<void> {
  const supabase = await getSupabaseClient();
  if (!supabase) {
    throw new Error('Supabase client not available');
  }

  const { error } = await supabase
    .from('agent_panel_state')
    .delete()
    .eq('agent_id', agentId);

  if (error) {
    throw new Error(`Failed to delete panel state for agent ${agentId}: ${error.message}`);
  }
}

// ============================================================================
// Batch Operations
// ============================================================================

/**
 * Retrieve topic states for multiple agents in a single query
 */
export async function getTopicStatesBatch(agentIds: string[]): Promise<Map<string, TopicState[]>> {
  if (agentIds.length === 0) return new Map();

  const supabase = await getSupabaseClient();
  if (!supabase) {
    throw new Error('Supabase client not available');
  }

  const { data, error } = await supabase
    .from('agent_topic_state')
    .select('*')
    .in('agent_id', agentIds);

  if (error) {
    throw new Error(`Failed to get topic states batch: ${error.message}`);
  }

  const result = new Map<string, TopicState[]>();

  for (const row of data ?? []) {
    const agentId = row.agent_id as string;
    const state = mapTopicStateRow(row as Record<string, unknown>);

    if (!result.has(agentId)) {
      result.set(agentId, []);
    }
    result.get(agentId)!.push(state);
  }

  return result;
}

/**
 * Retrieve panel states for multiple agents in a single query
 */
export async function getPanelStatesBatch(agentIds: string[]): Promise<Map<string, PanelState>> {
  if (agentIds.length === 0) return new Map();

  const supabase = await getSupabaseClient();
  if (!supabase) {
    throw new Error('Supabase client not available');
  }

  const { data, error } = await supabase
    .from('agent_panel_state')
    .select('*')
    .in('agent_id', agentIds);

  if (error) {
    throw new Error(`Failed to get panel states batch: ${error.message}`);
  }

  const result = new Map<string, PanelState>();

  for (const row of data ?? []) {
    const agentId = row.agent_id as string;
    result.set(agentId, mapPanelStateRow(row as Record<string, unknown>));
  }

  return result;
}
