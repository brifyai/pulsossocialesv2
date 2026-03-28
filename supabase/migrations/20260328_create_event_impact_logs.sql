-- Migration: Create event_impact_logs table for CADEM v1.2 Event System
-- Date: 2026-03-28
-- Description: Stores logs of event impacts on agent opinion states

-- ============================================================================
-- TABLE: event_impact_logs
-- ============================================================================

CREATE TABLE IF NOT EXISTS event_impact_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL,
    agent_id TEXT NOT NULL,
    affected_topics JSONB NOT NULL DEFAULT '[]'::jsonb,
    previous_scores JSONB NOT NULL DEFAULT '{}'::jsonb,
    new_scores JSONB NOT NULL DEFAULT '{}'::jsonb,
    summary TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- FOREIGN KEY CONSTRAINTS
-- ============================================================================

-- Drop existing constraints if any (for idempotency)
ALTER TABLE event_impact_logs
    DROP CONSTRAINT IF EXISTS fk_event_impact_logs_event,
    DROP CONSTRAINT IF EXISTS fk_event_impact_logs_agent;

-- Add foreign key to weekly_events
ALTER TABLE event_impact_logs
    ADD CONSTRAINT fk_event_impact_logs_event
        FOREIGN KEY (event_id) 
        REFERENCES weekly_events(id) 
        ON DELETE CASCADE;

-- Add foreign key to synthetic_agents
ALTER TABLE event_impact_logs
    ADD CONSTRAINT fk_event_impact_logs_agent
        FOREIGN KEY (agent_id) 
        REFERENCES synthetic_agents(agent_id) 
        ON DELETE CASCADE;

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Index for event_id lookups (most common query)
CREATE INDEX IF NOT EXISTS idx_event_impact_logs_event_id 
    ON event_impact_logs(event_id);

-- Index for agent_id lookups
CREATE INDEX IF NOT EXISTS idx_event_impact_logs_agent_id 
    ON event_impact_logs(agent_id);

-- Index for created_at (time-based queries)
CREATE INDEX IF NOT EXISTS idx_event_impact_logs_created_at 
    ON event_impact_logs(created_at DESC);

-- Composite index for event + agent lookups
CREATE INDEX IF NOT EXISTS idx_event_impact_logs_event_agent 
    ON event_impact_logs(event_id, agent_id);

-- Index for querying by affected topics (using GIN for JSONB)
CREATE INDEX IF NOT EXISTS idx_event_impact_logs_affected_topics 
    ON event_impact_logs USING GIN(affected_topics);

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE event_impact_logs IS 'Logs of event impacts on agent opinion states in CADEM v1.2';
COMMENT ON COLUMN event_impact_logs.event_id IS 'Reference to the weekly_event that caused the impact';
COMMENT ON COLUMN event_impact_logs.agent_id IS 'Reference to the synthetic_agent affected';
COMMENT ON COLUMN event_impact_logs.affected_topics IS 'JSON array of topic keys that were affected';
COMMENT ON COLUMN event_impact_logs.previous_scores IS 'JSON object with topic scores before the event';
COMMENT ON COLUMN event_impact_logs.new_scores IS 'JSON object with topic scores after the event';
COMMENT ON COLUMN event_impact_logs.summary IS 'Human-readable summary of the impact';

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS
ALTER TABLE event_impact_logs ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Allow read access to all users" ON event_impact_logs;
DROP POLICY IF EXISTS "Allow insert to authenticated users" ON event_impact_logs;
DROP POLICY IF EXISTS "Allow update to authenticated users" ON event_impact_logs;
DROP POLICY IF EXISTS "Allow delete to authenticated users" ON event_impact_logs;

-- Policy: Allow read access to all users (impact logs are audit data)
CREATE POLICY "Allow read access to all users"
    ON event_impact_logs
    FOR SELECT
    USING (true);

-- Policy: Allow insert to authenticated users
CREATE POLICY "Allow insert to authenticated users"
    ON event_impact_logs
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- Policy: Allow update to authenticated users (rarely needed, but allowed)
CREATE POLICY "Allow update to authenticated users"
    ON event_impact_logs
    FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Policy: Allow delete to authenticated users
CREATE POLICY "Allow delete to authenticated users"
    ON event_impact_logs
    FOR DELETE
    TO authenticated
    USING (true);

-- ============================================================================
-- VIEWS (Optional but useful)
-- ============================================================================

-- View: Event impact summary by event
DROP VIEW IF EXISTS v_event_impact_summary;
CREATE VIEW v_event_impact_summary AS
SELECT 
    e.id AS event_id,
    e.week_key,
    e.title,
    e.topic AS category,
    e.sentiment,
    COUNT(l.id) AS total_agents_affected,
    COUNT(DISTINCT l.agent_id) AS unique_agents_affected,
    MIN(l.created_at) AS first_impact_at,
    MAX(l.created_at) AS last_impact_at
FROM weekly_events e
LEFT JOIN event_impact_logs l ON e.id = l.event_id
GROUP BY e.id, e.week_key, e.title, e.topic, e.sentiment;

COMMENT ON VIEW v_event_impact_summary IS 'Summary of event impacts aggregated by event';

-- View: Agent impact history
DROP VIEW IF EXISTS v_agent_impact_history;
CREATE VIEW v_agent_impact_history AS
SELECT 
    l.agent_id,
    l.event_id,
    e.week_key,
    e.title AS event_title,
    e.topic AS event_category,
    l.affected_topics,
    l.previous_scores,
    l.new_scores,
    l.summary,
    l.created_at
FROM event_impact_logs l
JOIN weekly_events e ON l.event_id = e.id
ORDER BY l.created_at DESC;

COMMENT ON VIEW v_agent_impact_history IS 'History of event impacts per agent';

-- ============================================================================
-- IDEMPOTENCY CHECK
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE 'event_impact_logs table created successfully';
END $$;
