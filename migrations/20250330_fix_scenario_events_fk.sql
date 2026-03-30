-- Migration: Fix scenario_events foreign key to reference public.users instead of auth.users
-- Date: 2026-03-30
-- Description: The scenario_events table was created with FK to auth.users, but the application
--              uses the public.users table. This migration fixes that.

-- ============================================================================
-- FIX FOREIGN KEY CONSTRAINT
-- ============================================================================

-- Drop the existing foreign key constraint
ALTER TABLE scenario_events
    DROP CONSTRAINT IF EXISTS scenario_events_user_id_fkey;

-- Add new foreign key constraint referencing public.users
ALTER TABLE scenario_events
    ADD CONSTRAINT scenario_events_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- ============================================================================
-- IDEMPOTENCY CHECK
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE 'scenario_events FK fixed to reference public.users';
END $$;
