-- ============================================================================
-- Migration: Add CADEM Age and Region Group Columns
-- Date: 2026-04-01
-- Purpose: Add cadem_age_group and cadem_region_group columns to synthetic_agents
--          and populate them according to CADEM demographic standards
-- ============================================================================

-- ============================================
-- 1. Add CADEM Age Group Column
-- ============================================

ALTER TABLE synthetic_agents
ADD COLUMN IF NOT EXISTS cadem_age_group VARCHAR(10)
CHECK (cadem_age_group IN ('18-29', '30-49', '50-69', '70+', NULL));

COMMENT ON COLUMN synthetic_agents.cadem_age_group IS 
'CADEM-compatible age groups: 18-29, 30-49, 50-69, 70+';

-- ============================================
-- 2. Add CADEM Region Group Column
-- ============================================

ALTER TABLE synthetic_agents
ADD COLUMN IF NOT EXISTS cadem_region_group VARCHAR(20)
CHECK (cadem_region_group IN ('Metropolitana', 'Norte', 'Centro', 'Sur', NULL));

COMMENT ON COLUMN synthetic_agents.cadem_region_group IS 
'CADEM-compatible regional groupings: Metropolitana, Norte, Centro, Sur';

-- ============================================
-- 3. Create Function to Map Age to CADEM Age Group
-- ============================================

CREATE OR REPLACE FUNCTION map_age_to_cadem_age_group(age INTEGER)
RETURNS VARCHAR(10) AS $$
BEGIN
    CASE
        WHEN age BETWEEN 18 AND 29 THEN RETURN '18-29';
        WHEN age BETWEEN 30 AND 49 THEN RETURN '30-49';
        WHEN age BETWEEN 50 AND 69 THEN RETURN '50-69';
        WHEN age >= 70 THEN RETURN '70+';
        ELSE RETURN NULL;
    END CASE;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION map_age_to_cadem_age_group IS 
'Maps age to CADEM age group (18-29, 30-49, 50-69, 70+)';

-- ============================================
-- 4. Create Function to Map Region Code to CADEM Region Group
-- ============================================

CREATE OR REPLACE FUNCTION map_region_to_cadem_region_group(region_code VARCHAR)
RETURNS VARCHAR(20) AS $$
BEGIN
    CASE
        WHEN region_code = 'RM' THEN RETURN 'Metropolitana';
        WHEN region_code IN ('AP', 'TA', 'AN', 'AT') THEN RETURN 'Norte';
        WHEN region_code IN ('CO', 'VA', 'LI', 'ML', 'NB') THEN RETURN 'Centro';
        WHEN region_code IN ('BI', 'AR', 'LR', 'LL', 'AI', 'MA') THEN RETURN 'Sur';
        ELSE RETURN NULL;
    END CASE;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION map_region_to_cadem_region_group IS 
'Maps region code to CADEM region group (Metropolitana, Norte, Centro, Sur)';

-- ============================================
-- 5. Populate CADEM Age Group from Existing Age Data
-- ============================================

UPDATE synthetic_agents
SET cadem_age_group = map_age_to_cadem_age_group(age)
WHERE age IS NOT NULL
  AND (cadem_age_group IS NULL OR cadem_age_group = '');

-- ============================================
-- 6. Populate CADEM Region Group from Existing Region Data
-- ============================================

UPDATE synthetic_agents
SET cadem_region_group = map_region_to_cadem_region_group(region_code)
WHERE region_code IS NOT NULL
  AND (cadem_region_group IS NULL OR cadem_region_group = '');

-- ============================================
-- 7. Create Triggers for Auto-Population
-- ============================================

-- Trigger for age group
CREATE OR REPLACE FUNCTION update_cadem_age_group()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.age IS NOT NULL THEN
        NEW.cadem_age_group := map_age_to_cadem_age_group(NEW.age);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_cadem_age_group ON synthetic_agents;

CREATE TRIGGER trg_update_cadem_age_group
    BEFORE INSERT OR UPDATE OF age ON synthetic_agents
    FOR EACH ROW
    EXECUTE FUNCTION update_cadem_age_group();

-- Trigger for region group
CREATE OR REPLACE FUNCTION update_cadem_region_group()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.region_code IS NOT NULL THEN
        NEW.cadem_region_group := map_region_to_cadem_region_group(NEW.region_code);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_cadem_region_group ON synthetic_agents;

CREATE TRIGGER trg_update_cadem_region_group
    BEFORE INSERT OR UPDATE OF region_code ON synthetic_agents
    FOR EACH ROW
    EXECUTE FUNCTION update_cadem_region_group();

-- ============================================
-- 8. Create Indexes for Efficient Filtering
-- ============================================

CREATE INDEX IF NOT EXISTS idx_agents_cadem_age_group 
ON synthetic_agents(cadem_age_group);

CREATE INDEX IF NOT EXISTS idx_agents_cadem_region_group 
ON synthetic_agents(cadem_region_group);

-- ============================================
-- 9. Update Demographics View to Use New Columns
-- ============================================

-- Drop existing view first to allow column changes
DROP VIEW IF EXISTS v_agent_demographics_cadem;

CREATE VIEW v_agent_demographics_cadem AS
SELECT 
    sa.id,
    sa.agent_id,
    sa.sex,
    sa.age,
    sa.age_group,
    sa.cadem_age_group,
    sa.region_code,
    sa.comuna_code,
    sa.cadem_region_group,
    sa.income_decile,
    sa.cadem_socioeconomic_level,
    sa.education_level,
    sa.occupation_status,
    sa.urbanicity,
    sa.agent_type
FROM synthetic_agents sa;

COMMENT ON VIEW v_agent_demographics_cadem IS 
'View of agent demographics with CADEM-compatible classifications';

-- ============================================
-- 10. Create Statistics View for CADEM Demographics
-- ============================================

-- Drop existing view first
DROP VIEW IF EXISTS v_cadem_demographics_stats;

CREATE VIEW v_cadem_demographics_stats AS
WITH age_stats AS (
    SELECT 
        'Age Group' AS demographic_type,
        cadem_age_group AS demographic_value,
        COUNT(*) AS agent_count,
        ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) AS percentage,
        CASE cadem_age_group
            WHEN '18-29' THEN 1
            WHEN '30-49' THEN 2
            WHEN '50-69' THEN 3
            WHEN '70+' THEN 4
        END AS sort_order
    FROM synthetic_agents
    WHERE cadem_age_group IS NOT NULL
    GROUP BY cadem_age_group
),
region_stats AS (
    SELECT 
        'Region Group' AS demographic_type,
        cadem_region_group AS demographic_value,
        COUNT(*) AS agent_count,
        ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) AS percentage,
        CASE cadem_region_group
            WHEN 'Metropolitana' THEN 1
            WHEN 'Norte' THEN 2
            WHEN 'Centro' THEN 3
            WHEN 'Sur' THEN 4
        END AS sort_order
    FROM synthetic_agents
    WHERE cadem_region_group IS NOT NULL
    GROUP BY cadem_region_group
),
se_stats AS (
    SELECT 
        'Socioeconomic' AS demographic_type,
        cadem_socioeconomic_level AS demographic_value,
        COUNT(*) AS agent_count,
        ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) AS percentage,
        CASE cadem_socioeconomic_level
            WHEN 'ABC1' THEN 1
            WHEN 'C2' THEN 2
            WHEN 'C3' THEN 3
            WHEN 'D' THEN 4
            WHEN 'E' THEN 5
        END AS sort_order
    FROM synthetic_agents
    WHERE cadem_socioeconomic_level IS NOT NULL
    GROUP BY cadem_socioeconomic_level
)
SELECT demographic_type, demographic_value, agent_count, percentage, sort_order
FROM age_stats
UNION ALL
SELECT demographic_type, demographic_value, agent_count, percentage, sort_order
FROM region_stats
UNION ALL
SELECT demographic_type, demographic_value, agent_count, percentage, sort_order
FROM se_stats
ORDER BY demographic_type, sort_order;

COMMENT ON VIEW v_cadem_demographics_stats IS 
'Complete CADEM demographics statistics (age, region, socioeconomic)';

-- ============================================
-- 11. Verification Queries
-- ============================================

-- Show age group distribution
SELECT 
    'CADEM Age Distribution' AS metric,
    cadem_age_group AS age_group,
    COUNT(*) AS count,
    ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) AS percentage
FROM synthetic_agents
WHERE cadem_age_group IS NOT NULL
GROUP BY cadem_age_group
ORDER BY 
    CASE cadem_age_group
        WHEN '18-29' THEN 1
        WHEN '30-49' THEN 2
        WHEN '50-69' THEN 3
        WHEN '70+' THEN 4
    END;

-- Show region group distribution
SELECT 
    'CADEM Region Distribution' AS metric,
    cadem_region_group AS region_group,
    COUNT(*) AS count,
    ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) AS percentage
FROM synthetic_agents
WHERE cadem_region_group IS NOT NULL
GROUP BY cadem_region_group
ORDER BY 
    CASE cadem_region_group
        WHEN 'Metropolitana' THEN 1
        WHEN 'Norte' THEN 2
        WHEN 'Centro' THEN 3
        WHEN 'Sur' THEN 4
    END;

-- ============================================================================
-- FIN DE LA MIGRACIÓN
-- ============================================================================
