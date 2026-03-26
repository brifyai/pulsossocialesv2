-- Migration: Create agent_topic_state table
-- CADEM Opinion Engine v1.1 - Persistencia de estados de topic

CREATE TABLE IF NOT EXISTS agent_topic_state (
  agent_id TEXT NOT NULL,
  topic TEXT NOT NULL,
  score FLOAT NOT NULL,
  confidence FLOAT NOT NULL DEFAULT 0.5,
  salience FLOAT NOT NULL DEFAULT 0.5,
  volatility FLOAT NOT NULL DEFAULT 0.3,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  PRIMARY KEY (agent_id, topic),

  -- Constraints
  CONSTRAINT chk_score CHECK (score >= -1 AND score <= 1),
  CONSTRAINT chk_confidence CHECK (confidence >= 0 AND confidence <= 1),
  CONSTRAINT chk_salience CHECK (salience >= 0 AND salience <= 1),
  CONSTRAINT chk_volatility CHECK (volatility >= 0 AND volatility <= 1)
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_agent_topic_agent ON agent_topic_state(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_topic_topic ON agent_topic_state(topic);
CREATE INDEX IF NOT EXISTS idx_agent_topic_updated ON agent_topic_state(updated_at);

-- Enable RLS
ALTER TABLE agent_topic_state ENABLE ROW LEVEL SECURITY;

-- Policy: Allow all operations for authenticated users
CREATE POLICY "Allow all operations for authenticated users"
  ON agent_topic_state
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Policy: Allow read for anonymous users
CREATE POLICY "Allow read for anonymous users"
  ON agent_topic_state
  FOR SELECT
  TO anon
  USING (true);
