-- =============================================================================
-- Migration: Add centroid column to territories table
-- Fecha: 2025-03-25
-- =============================================================================

-- Add centroid column (JSONB to store [lat, lng])
ALTER TABLE territories ADD COLUMN IF NOT EXISTS centroid JSONB;

-- Add comment
COMMENT ON COLUMN territories.centroid IS 'Centroide del territorio como [lat, lng]';

-- Verify
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'territories'
ORDER BY ordinal_position;
