-- Migration: Create scenario_events table for CADEM v1.2 Scenario Builder
-- Date: 2026-03-29
-- Description: Stores user-created hypothetical scenarios/events for simulation

-- ============================================================================
-- TABLE: scenario_events
-- ============================================================================

CREATE TABLE IF NOT EXISTS scenario_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Usuario que creó el escenario
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Identificación del escenario
    name TEXT NOT NULL,
    description TEXT,
    
    -- Categoría temática (mismas que weekly_events)
    category TEXT NOT NULL,
    
    -- Métricas del evento (mismos rangos que weekly_events)
    sentiment FLOAT NOT NULL,
    intensity FLOAT NOT NULL,
    salience FLOAT NOT NULL,
    severity TEXT,
    
    -- Entidades y segmentos afectados (formato JSONB compatible)
    target_entities JSONB DEFAULT '[]'::jsonb,
    affected_segments JSONB DEFAULT '[]'::jsonb,
    
    -- Estado del escenario
    status TEXT DEFAULT 'draft',
    
    -- Metadatos adicionales (flexible para extensión)
    metadata JSONB DEFAULT '{}'::jsonb,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- CONSTRAINTS
-- ============================================================================

-- Check constraints for valid ranges (mismos que weekly_events)
ALTER TABLE scenario_events
    DROP CONSTRAINT IF EXISTS check_scenario_sentiment_range,
    DROP CONSTRAINT IF EXISTS check_scenario_intensity_range,
    DROP CONSTRAINT IF EXISTS check_scenario_salience_range,
    DROP CONSTRAINT IF EXISTS check_scenario_severity_values,
    DROP CONSTRAINT IF EXISTS check_scenario_category_values,
    DROP CONSTRAINT IF EXISTS check_scenario_status_values;

ALTER TABLE scenario_events
    ADD CONSTRAINT check_scenario_sentiment_range 
        CHECK (sentiment >= -1 AND sentiment <= 1),
    ADD CONSTRAINT check_scenario_intensity_range 
        CHECK (intensity >= 0 AND intensity <= 1),
    ADD CONSTRAINT check_scenario_salience_range 
        CHECK (salience >= 0 AND salience <= 1),
    ADD CONSTRAINT check_scenario_severity_values 
        CHECK (severity IN ('minor', 'moderate', 'major', 'critical')),
    ADD CONSTRAINT check_scenario_category_values 
        CHECK (category IN ('government', 'economy', 'security', 'institutions', 'migration', 'international', 'social')),
    ADD CONSTRAINT check_scenario_status_values 
        CHECK (status IN ('draft', 'active', 'archived'));

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Index for user lookups (most common query)
CREATE INDEX IF NOT EXISTS idx_scenario_events_user_id 
    ON scenario_events(user_id);

-- Index for status filtering
CREATE INDEX IF NOT EXISTS idx_scenario_events_status 
    ON scenario_events(status);

-- Index for category filtering
CREATE INDEX IF NOT EXISTS idx_scenario_events_category 
    ON scenario_events(category);

-- Index for created_at (time-based queries)
CREATE INDEX IF NOT EXISTS idx_scenario_events_created_at 
    ON scenario_events(created_at DESC);

-- Composite index for common query patterns
CREATE INDEX IF NOT EXISTS idx_scenario_events_user_status 
    ON scenario_events(user_id, status);

-- ============================================================================
-- TRIGGER: Auto-update updated_at
-- ============================================================================

CREATE OR REPLACE FUNCTION update_scenario_events_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_scenario_events_updated_at ON scenario_events;

CREATE TRIGGER trigger_update_scenario_events_updated_at
    BEFORE UPDATE ON scenario_events
    FOR EACH ROW
    EXECUTE FUNCTION update_scenario_events_updated_at();

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE scenario_events IS 'User-created hypothetical scenarios/events for CADEM v1.2 simulation';
COMMENT ON COLUMN scenario_events.user_id IS 'User who created the scenario (references auth.users)';
COMMENT ON COLUMN scenario_events.name IS 'Human-readable name for the scenario';
COMMENT ON COLUMN scenario_events.description IS 'Detailed description of the hypothetical event';
COMMENT ON COLUMN scenario_events.category IS 'Event category: government, economy, security, institutions, migration, international, social';
COMMENT ON COLUMN scenario_events.sentiment IS 'Event sentiment from -1 (very negative) to 1 (very positive)';
COMMENT ON COLUMN scenario_events.intensity IS 'Event intensity from 0 to 1';
COMMENT ON COLUMN scenario_events.salience IS 'Event salience/relevance from 0 to 1';
COMMENT ON COLUMN scenario_events.severity IS 'Impact severity: minor, moderate, major, critical';
COMMENT ON COLUMN scenario_events.target_entities IS 'JSON array of entities affected by the event (same format as weekly_events)';
COMMENT ON COLUMN scenario_events.affected_segments IS 'JSON array of demographic segments affected (same format as weekly_events)';
COMMENT ON COLUMN scenario_events.status IS 'Scenario status: draft, active, archived';
COMMENT ON COLUMN scenario_events.metadata IS 'Additional metadata for extensibility';

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS
ALTER TABLE scenario_events ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Allow users to read own scenarios" ON scenario_events;
DROP POLICY IF EXISTS "Allow users to insert own scenarios" ON scenario_events;
DROP POLICY IF EXISTS "Allow users to update own scenarios" ON scenario_events;
DROP POLICY IF EXISTS "Allow users to delete own scenarios" ON scenario_events;

-- Policy: Users can only read their own scenarios
CREATE POLICY "Allow users to read own scenarios"
    ON scenario_events
    FOR SELECT
    USING (auth.uid() = user_id);

-- Policy: Users can only insert their own scenarios
CREATE POLICY "Allow users to insert own scenarios"
    ON scenario_events
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

-- Policy: Users can only update their own scenarios
CREATE POLICY "Allow users to update own scenarios"
    ON scenario_events
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Policy: Users can only delete their own scenarios
CREATE POLICY "Allow users to delete own scenarios"
    ON scenario_events
    FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id);

-- ============================================================================
-- IDEMPOTENCY CHECK
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE 'scenario_events table created successfully';
END $$;
