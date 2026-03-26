-- Migration: Create agent_topic_state table for CADEM Opinion Engine v1.1
-- Purpose: Persist topic states per agent for longitudinal tracking

CREATE TABLE IF NOT EXISTS agent_topic_state (
  agent_id TEXT NOT NULL REFERENCES synthetic_agents(agent_id) ON DELETE CASCADE,
  topic TEXT NOT NULL,
  score FLOAT NOT NULL,
  confidence FLOAT NOT NULL DEFAULT 0.5,
  salience FLOAT NOT NULL DEFAULT 0.5,
  volatility FLOAT NOT NULL DEFAULT 0.3,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (agent_id, topic),
  CONSTRAINT chk_agent_topic_state_score CHECK (score >= -1 AND score <= 1),
  CONSTRAINT chk_agent_topic_state_confidence CHECK (confidence >= 0 AND confidence <= 1),
  CONSTRAINT chk_agent_topic_state_salience CHECK (salience >= 0 AND salience <= 1),
  CONSTRAINT chk_agent_topic_state_volatility CHECK (volatility >= 0 AND volatility <= 1)
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_agent_topic_state_agent_id
  ON agent_topic_state(agent_id);

CREATE INDEX IF NOT EXISTS idx_agent_topic_state_topic
  ON agent_topic_state(topic);

CREATE INDEX IF NOT EXISTS idx_agent_topic_state_updated_at
  ON agent_topic_state(updated_at);

-- Add comment for documentation
COMMENT ON TABLE agent_topic_state IS 'Stores persistent topic states for each synthetic agent in the CADEM Opinion Engine';
COMMENT ON COLUMN agent_topic_state.score IS 'Opinion score from -1 (negative) to 1 (positive)';
COMMENT ON COLUMN agent_topic_state.confidence IS 'Confidence in the opinion (0-1)';
COMMENT ON COLUMN agent_topic_state.salience IS 'How salient/important this topic is to the agent (0-1)';
COMMENT ON COLUMN agent_topic_state.volatility IS 'How volatile/prone to change the opinion is (0-1)';
