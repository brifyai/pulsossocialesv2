-- Migration: Create user_settings table for storing user preferences
-- Date: 2025-04-01

-- Create user_settings table
CREATE TABLE IF NOT EXISTS user_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Apariencia
    dark_mode BOOLEAN DEFAULT true,
    high_contrast BOOLEAN DEFAULT false,
    animations BOOLEAN DEFAULT true,

    -- Mapa y visualización
    quality_mode BOOLEAN DEFAULT true,
    agent_density VARCHAR(10) DEFAULT 'medium' CHECK (agent_density IN ('low', 'medium', 'high')),
    show_labels BOOLEAN DEFAULT true,

    -- Notificaciones
    email_notifications BOOLEAN DEFAULT true,
    survey_alerts BOOLEAN DEFAULT false,

    -- Datos y privacidad
    data_cache BOOLEAN DEFAULT true,
    share_analytics BOOLEAN DEFAULT true,

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Constraint: one settings row per user
    CONSTRAINT unique_user_settings UNIQUE (user_id)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_settings_user_id ON user_settings(user_id);

-- Enable RLS
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only read their own settings
CREATE POLICY "Users can read own settings"
    ON user_settings
    FOR SELECT
    USING (auth.uid() = user_id);

-- RLS Policy: Users can only update their own settings
CREATE POLICY "Users can update own settings"
    ON user_settings
    FOR UPDATE
    USING (auth.uid() = user_id);

-- RLS Policy: Users can only insert their own settings
CREATE POLICY "Users can insert own settings"
    ON user_settings
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- RLS Policy: Users can only delete their own settings
CREATE POLICY "Users can delete own settings"
    ON user_settings
    FOR DELETE
    USING (auth.uid() = user_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_user_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
DROP TRIGGER IF EXISTS update_user_settings_timestamp ON user_settings;
CREATE TRIGGER update_user_settings_timestamp
    BEFORE UPDATE ON user_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_user_settings_updated_at();

-- Grant permissions to authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON user_settings TO authenticated;
