-- Migration: Create agent_panel_state table
-- CADEM Opinion Engine v1.1 - Persistencia de estado del panel
-- CORREGIDO: Agregada FK a synthetic_agents(agent_id)

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

  -- Constraints
  CONSTRAINT chk_propensity CHECK (participation_propensity >= 0 AND participation_propensity <= 1),
  CONSTRAINT chk_fatigue CHECK (panel_fatigue >= 0 AND panel_fatigue <= 1),
  CONSTRAINT chk_quality CHECK (quality_score >= 0 AND quality_score <= 1)
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_panel_eligible ON agent_panel_state(eligible_web);
CREATE INDEX IF NOT EXISTS idx_panel_fatigue ON agent_panel_state(panel_fatigue);
CREATE INDEX IF NOT EXISTS idx_panel_updated ON agent_panel_state(updated_at);

-- Enable RLS
ALTER TABLE agent_panel_state ENABLE ROW LEVEL SECURITY;

-- Policy: Allow all operations for authenticated users
CREATE POLICY "Allow all operations for authenticated users"
  ON agent_panel_state
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Policy: Allow read for anonymous users
CREATE POLICY "Allow read for anonymous users"
  ON agent_panel_state
  FOR SELECT
  TO anon
  USING (true);
