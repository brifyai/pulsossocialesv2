-- Fix schema to make comuna fields nullable for regions
-- Run this in Supabase SQL Editor before seeding

-- Make comuna fields nullable
ALTER TABLE territories ALTER COLUMN comuna_code DROP NOT NULL;
ALTER TABLE territories ALTER COLUMN comuna_name DROP NOT NULL;

-- Verify the changes
SELECT 
    column_name,
    is_nullable,
    data_type
FROM information_schema.columns 
WHERE table_name = 'territories' 
AND column_name IN ('comuna_code', 'comuna_name', 'region_code', 'region_name')
ORDER BY column_name;
