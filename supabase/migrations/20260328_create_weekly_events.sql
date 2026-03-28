-- Migration: Create weekly_events table for CADEM v1.2 Event System
-- Date: 2026-03-28
-- Description: Stores weekly events that affect agent opinion states

-- ============================================================================
-- TABLE: weekly_events
-- ============================================================================

CREATE TABLE IF NOT EXISTS weekly_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    week_key TEXT NOT NULL,
    title TEXT NOT NULL,
    summary TEXT,
    topic TEXT NOT NULL,
    sentiment FLOAT NOT NULL,
    intensity FLOAT NOT NULL,
    salience FLOAT NOT NULL,
    severity TEXT,
    target_entities JSONB DEFAULT '[]'::jsonb,
    affected_segments JSONB DEFAULT '[]'::jsonb,
    source_count INTEGER DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by TEXT
);

-- ============================================================================
-- CONSTRAINTS
-- ============================================================================

-- Check constraints for valid ranges
ALTER TABLE weekly_events
    DROP CONSTRAINT IF EXISTS check_sentiment_range,
    DROP CONSTRAINT IF EXISTS check_intensity_range,
    DROP CONSTRAINT IF EXISTS check_salience_range,
    DROP CONSTRAINT IF EXISTS check_severity_values;

ALTER TABLE weekly_events
    ADD CONSTRAINT check_sentiment_range 
        CHECK (sentiment >= -1 AND sentiment <= 1),
    ADD CONSTRAINT check_intensity_range 
        CHECK (intensity >= 0 AND intensity <= 1),
    ADD CONSTRAINT check_salience_range 
        CHECK (salience >= 0 AND salience <= 1),
    ADD CONSTRAINT check_severity_values 
        CHECK (severity IN ('minor', 'moderate', 'major', 'critical'));

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Index for week_key lookups (most common query)
CREATE INDEX IF NOT EXISTS idx_weekly_events_week_key 
    ON weekly_events(week_key);

-- Index for topic filtering
CREATE INDEX IF NOT EXISTS idx_weekly_events_topic 
    ON weekly_events(topic);

-- Index for created_at (time-based queries)
CREATE INDEX IF NOT EXISTS idx_weekly_events_created_at 
    ON weekly_events(created_at DESC);

-- Index for severity filtering
CREATE INDEX IF NOT EXISTS idx_weekly_events_severity 
    ON weekly_events(severity);

-- Composite index for common query patterns
CREATE INDEX IF NOT EXISTS idx_weekly_events_week_topic 
    ON weekly_events(week_key, topic);

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE weekly_events IS 'Weekly events that affect agent opinion states in CADEM v1.2';
COMMENT ON COLUMN weekly_events.week_key IS 'Week identifier in format YYYY-WNN (e.g., 2026-W13)';
COMMENT ON COLUMN weekly_events.sentiment IS 'Event sentiment from -1 (very negative) to 1 (very positive)';
COMMENT ON COLUMN weekly_events.intensity IS 'Event intensity from 0 to 1';
COMMENT ON COLUMN weekly_events.salience IS 'Event salience/relevance from 0 to 1';
COMMENT ON COLUMN weekly_events.severity IS 'Impact severity: minor, moderate, major, critical';
COMMENT ON COLUMN weekly_events.target_entities IS 'JSON array of entities affected by the event';
COMMENT ON COLUMN weekly_events.affected_segments IS 'JSON array of demographic segments affected';

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS
ALTER TABLE weekly_events ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Allow read access to all users" ON weekly_events;
DROP POLICY IF EXISTS "Allow insert to authenticated users" ON weekly_events;
DROP POLICY IF EXISTS "Allow update to authenticated users" ON weekly_events;
DROP POLICY IF EXISTS "Allow delete to authenticated users" ON weekly_events;

-- Policy: Allow read access to all users (events are public data)
CREATE POLICY "Allow read access to all users"
    ON weekly_events
    FOR SELECT
    USING (true);

-- Policy: Allow insert to authenticated users
CREATE POLICY "Allow insert to authenticated users"
    ON weekly_events
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- Policy: Allow update to authenticated users
CREATE POLICY "Allow update to authenticated users"
    ON weekly_events
    FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Policy: Allow delete to authenticated users
CREATE POLICY "Allow delete to authenticated users"
    ON weekly_events
    FOR DELETE
    TO authenticated
    USING (true);

-- ============================================================================
-- IDEMPOTENCY CHECK
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE 'weekly_events table created successfully';
END $$;
