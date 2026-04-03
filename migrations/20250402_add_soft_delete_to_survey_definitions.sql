-- Migration: Add soft delete support to survey_definitions
-- Created: 2025-04-02
-- Description: Adds deleted_at column to enable soft delete for surveys

-- Add deleted_at column to survey_definitions
ALTER TABLE survey_definitions
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Create index for efficient filtering of non-deleted surveys
CREATE INDEX IF NOT EXISTS idx_survey_definitions_deleted_at
ON survey_definitions(deleted_at)
WHERE deleted_at IS NULL;

-- Update RLS policies to exclude deleted surveys from default queries
-- Note: This assumes the table has RLS enabled. The policies will be updated
-- in the application layer to filter by deleted_at IS NULL

COMMENT ON COLUMN survey_definitions.deleted_at IS 'Timestamp when the survey was soft deleted. NULL means active.';
