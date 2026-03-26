/**
 * Opinion State Repository
 * CADEM Opinion Engine v1.1 - Persistencia de estados
 *
 * Gestiona el almacenamiento y recuperación de estados de opinión
 * y estado del panel para agentes sintéticos.
 */

import { getSupabaseClient, type SupabaseClient } from '../client';
import type { TopicState } from '../../../app/opinionEngine/types';
import type { PanelState } from '../../../app/panel/types';

// Tipos para las filas de la base de datos
interface AgentTopicStateRow {
  agent_id: string;
  topic: string;
  score: number;
  confidence: number;
  salience: number;
  volatility: number;
  updated_at: string;
}

interface AgentPanelStateRow {
  agent_id: string;
  eligible_web: boolean;
  participation_propensity: number;
  panel_fatigue: number;
  quality_score: number;
  cooldown_until: string | null;
  invites_30d: number;
  completions_30d: number;
  last_invited_at: string | null;
  last_completed_at: string | null;
  updated_at: string;
}

export class OpinionStateRepository {
  private async getClient(): Promise<SupabaseClient | null> {
    return getSupabaseClient();
  }

  /**
   * Obtiene todos los estados de topic para un agente
   */
  async getTopicStates(agentId: string): Promise<TopicState[]> {
    const client = await this.getClient();
    if (!client) {
      throw new Error('Supabase client not available');
    }

    const { data, error } = await client
      .from('agent_topic_state')
      .select('*')
      .eq('agent_id', agentId);

    if (error) {
      throw new Error(`Error loading topic states: ${error.message}`);
    }

    return ((data as AgentTopicStateRow[] | null) || []).map((row): TopicState => ({
      topic: row.topic as TopicState['topic'],
      score: row.score,
      confidence: row.confidence,
      salience: row.salience,
      volatility: row.volatility,
      updatedAt: new Date(row.updated_at),
    }));
  }

  /**
   * Guarda estados de topic para un agente (upsert)
   */
  async saveTopicStates(agentId: string, states: TopicState[]): Promise<void> {
    if (states.length === 0) return;

    const client = await this.getClient();
    if (!client) {
      throw new Error('Supabase client not available');
    }

    const payload = states.map(state => ({
      agent_id: agentId,
      topic: state.topic,
      score: state.score,
      confidence: state.confidence,
      salience: state.salience,
      volatility: state.volatility,
      updated_at: state.updatedAt.toISOString(),
    }));

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (client as any)
      .from('agent_topic_state')
      .upsert(payload, { onConflict: 'agent_id,topic' });

    if (error) {
      throw new Error(`Error saving topic states: ${error.message}`);
    }
  }

  /**
   * Obtiene el estado del panel para un agente
   */
  async getPanelState(agentId: string): Promise<PanelState | null> {
    const client = await this.getClient();
    if (!client) {
      throw new Error('Supabase client not available');
    }

    const { data, error } = await client
      .from('agent_panel_state')
      .select('*')
      .eq('agent_id', agentId)
      .maybeSingle();

    if (error) {
      throw new Error(`Error loading panel state: ${error.message}`);
    }

    if (!data) return null;

    const row = data as AgentPanelStateRow;

    return {
      agentId: row.agent_id,
      eligibleWeb: row.eligible_web,
      participationPropensity: row.participation_propensity,
      panelFatigue: row.panel_fatigue,
      qualityScore: row.quality_score,
      cooldownUntil: row.cooldown_until ? new Date(row.cooldown_until) : null,
      invites30d: row.invites_30d,
      completions30d: row.completions_30d,
      lastInvitedAt: row.last_invited_at ? new Date(row.last_invited_at) : null,
      lastCompletedAt: row.last_completed_at ? new Date(row.last_completed_at) : null,
      updatedAt: row.updated_at ? new Date(row.updated_at) : undefined,
    };
  }

  /**
   * Guarda el estado del panel para un agente (upsert)
   */
  async savePanelState(state: PanelState): Promise<void> {
    const client = await this.getClient();
    if (!client) {
      throw new Error('Supabase client not available');
    }

    const payload = {
      agent_id: state.agentId,
      eligible_web: state.eligibleWeb,
      participation_propensity: state.participationPropensity,
      panel_fatigue: state.panelFatigue,
      quality_score: state.qualityScore,
      cooldown_until: state.cooldownUntil?.toISOString() ?? null,
      invites_30d: state.invites30d,
      completions_30d: state.completions30d,
      last_invited_at: state.lastInvitedAt?.toISOString() ?? null,
      last_completed_at: state.lastCompletedAt?.toISOString() ?? null,
      updated_at: state.updatedAt?.toISOString() ?? new Date().toISOString(),
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (client as any)
      .from('agent_panel_state')
      .upsert(payload, { onConflict: 'agent_id' });

    if (error) {
      throw new Error(`Error saving panel state: ${error.message}`);
    }
  }

  /**
   * Elimina todos los estados de un agente (útil para testing)
   */
  async deleteAgentStates(agentId: string): Promise<void> {
    const client = await this.getClient();
    if (!client) {
      throw new Error('Supabase client not available');
    }

    const { error: topicError } = await client
      .from('agent_topic_state')
      .delete()
      .eq('agent_id', agentId);

    if (topicError) {
      // Error al eliminar topic states - loguear pero no fallar
      console.warn('Error deleting topic states:', topicError.message);
    }

    const { error: panelError } = await client
      .from('agent_panel_state')
      .delete()
      .eq('agent_id', agentId);

    if (panelError) {
      // Error al eliminar panel state - loguear pero no fallar
      console.warn('Error deleting panel state:', panelError.message);
    }
  }

  /**
   * Obtiene estadísticas de estados persistidos
   */
  async getStats(): Promise<{
    totalTopicStates: number;
    totalPanelStates: number;
    uniqueAgents: number;
  }> {
    const client = await this.getClient();
    if (!client) {
      return { totalTopicStates: 0, totalPanelStates: 0, uniqueAgents: 0 };
    }

    const { count: topicCount } = await client
      .from('agent_topic_state')
      .select('*', { count: 'exact', head: true });

    const { count: panelCount } = await client
      .from('agent_panel_state')
      .select('*', { count: 'exact', head: true });

    // Get unique agents
    const { data: uniqueAgents } = await client
      .from('agent_topic_state')
      .select('agent_id');

    const uniqueAgentSet = new Set(((uniqueAgents as { agent_id: string }[] | null) || []).map(r => r.agent_id));

    return {
      totalTopicStates: topicCount || 0,
      totalPanelStates: panelCount || 0,
      uniqueAgents: uniqueAgentSet.size,
    };
  }
}

// Export singleton instance
export const opinionStateRepository = new OpinionStateRepository();
