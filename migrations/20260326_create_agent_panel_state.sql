-- Migration: Create agent_panel_state table for CADEM Opinion Engine v1.1
-- Purpose: Persist panel state per agent for longitudinal tracking

CREATE TABLE IF NOT EXISTS agent_panel_state (
  agent_id TEXT PRIMARY KEY REFERENCES synthetic_agents(agent_id) ON DELETE CASCADE,
  eligible_web BOOLEAN DEFAULT true,
  participation_propensity FLOAT DEFAULT 0.5,
  panel_fatigue FLOAT DEFAULT 0.0,
  quality_score FLOAT DEFAULT 0.8,
  cooldown_until TIMESTAMP WITH TIME ZONE,
  invites_30d INTEGER DEFAULT 0,
  completions_30d INTEGER DEFAULT 0,
  last_invited_at TIMESTAMP WITH TIME ZONE,
  last_completed_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT chk_agent_panel_state_participation CHECK (participation_propensity >= 0 AND participation_propensity <= 1),
  CONSTRAINT chk_agent_panel_state_fatigue CHECK (panel_fatigue >= 0 AND panel_fatigue <= 1),
  CONSTRAINT chk_agent_panel_state_quality CHECK (quality_score >= 0 AND quality_score <= 1),
  CONSTRAINT chk_agent_panel_state_invites CHECK (invites_30d >= 0),
  CONSTRAINT chk_agent_panel_state_completions CHECK (completions_30d >= 0)
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_agent_panel_state_updated_at
  ON agent_panel_state(updated_at);

CREATE INDEX IF NOT EXISTS idx_agent_panel_state_eligible_web
  ON agent_panel_state(eligible_web) WHERE eligible_web = true;

CREATE INDEX IF NOT EXISTS idx_agent_panel_state_cooldown
  ON agent_panel_state(cooldown_until) WHERE cooldown_until IS NOT NULL;

-- Add comments for documentation
COMMENT ON TABLE agent_panel_state IS 'Stores persistent panel state for each synthetic agent in the CADEM Opinion Engine';
COMMENT ON COLUMN agent_panel_state.eligible_web IS 'Whether the agent is eligible for web surveys';
COMMENT ON COLUMN agent_panel_state.participation_propensity IS 'Likelihood to participate in surveys (0-1)';
COMMENT ON COLUMN agent_panel_state.panel_fatigue IS 'Fatigue level from repeated surveying (0-1)';
COMMENT ON COLUMN agent_panel_state.quality_score IS 'Quality score based on response consistency (0-1)';
COMMENT ON COLUMN agent_panel_state.cooldown_until IS 'Timestamp until which agent is in cooldown';
COMMENT ON COLUMN agent_panel_state.invites_30d IS 'Number of invites in last 30 days';
COMMENT ON COLUMN agent_panel_state.completions_30d IS 'Number of completions in last 30 days';
