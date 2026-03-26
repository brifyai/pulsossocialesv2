-- Migration: Add engine mode and persistence configuration to surveys
-- CADEM v1.1 Integration
-- Date: 2026-03-26

-- ===========================================
-- 1. Extend survey_definitions table
-- ===========================================

-- Add engine_mode column (legacy | cadem)
ALTER TABLE survey_definitions
ADD COLUMN IF NOT EXISTS engine_mode TEXT DEFAULT 'legacy';

-- Add persist_state column (boolean)
ALTER TABLE survey_definitions
ADD COLUMN IF NOT EXISTS persist_state BOOLEAN DEFAULT false;

-- Add comment for documentation
COMMENT ON COLUMN survey_definitions.engine_mode IS 'Survey engine mode: legacy (heuristic) or cadem (opinion engine v1.1)';
COMMENT ON COLUMN survey_definitions.persist_state IS 'Whether to persist agent state to database (only applicable for cadem mode)';

-- ===========================================
-- 2. Extend survey_runs table
-- ===========================================

-- Add engine metadata columns for traceability
ALTER TABLE survey_runs
ADD COLUMN IF NOT EXISTS engine_mode TEXT,
ADD COLUMN IF NOT EXISTS engine_version TEXT,
ADD COLUMN IF NOT EXISTS persist_state BOOLEAN DEFAULT false;

-- Add comments
COMMENT ON COLUMN survey_runs.engine_mode IS 'Engine mode used for this run: legacy or cadem';
COMMENT ON COLUMN survey_runs.engine_version IS 'Version of the engine used (e.g., legacy-v1, cadem-v1.1)';
COMMENT ON COLUMN survey_runs.persist_state IS 'Whether agent state was persisted during this run';

-- ===========================================
-- 3. Create index for filtering by engine mode
-- ===========================================

CREATE INDEX IF NOT EXISTS idx_survey_definitions_engine_mode
ON survey_definitions(engine_mode);

CREATE INDEX IF NOT EXISTS idx_survey_runs_engine_mode
ON survey_runs(engine_mode);

-- ===========================================
-- 4. Validation
-- ===========================================

DO $$
BEGIN
    -- Verify columns were added
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'survey_definitions'
        AND column_name = 'engine_mode'
    ) THEN
        RAISE NOTICE '✅ survey_definitions.engine_mode column added successfully';
    ELSE
        RAISE EXCEPTION '❌ Failed to add survey_definitions.engine_mode column';
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'survey_definitions'
        AND column_name = 'persist_state'
    ) THEN
        RAISE NOTICE '✅ survey_definitions.persist_state column added successfully';
    ELSE
        RAISE EXCEPTION '❌ Failed to add survey_definitions.persist_state column';
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'survey_runs'
        AND column_name = 'engine_mode'
    ) THEN
        RAISE NOTICE '✅ survey_runs.engine_mode column added successfully';
    ELSE
        RAISE EXCEPTION '❌ Failed to add survey_runs.engine_mode column';
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'survey_runs'
        AND column_name = 'engine_version'
    ) THEN
        RAISE NOTICE '✅ survey_runs.engine_version column added successfully';
    ELSE
        RAISE EXCEPTION '❌ Failed to add survey_runs.engine_version column';
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'survey_runs'
        AND column_name = 'persist_state'
    ) THEN
        RAISE NOTICE '✅ survey_runs.persist_state column added successfully';
    ELSE
        RAISE EXCEPTION '❌ Failed to add survey_runs.persist_state column';
    END IF;

    RAISE NOTICE '✅ Migration completed successfully - CADEM v1.1 engine configuration ready';
END $$;
