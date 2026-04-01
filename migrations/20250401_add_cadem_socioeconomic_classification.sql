-- Migration: Add CADEM Socioeconomic Classification (ABC1/C2/C3/D/E)
-- Date: 2026-04-01
-- Purpose: Add socioeconomic classification compatible with CADEM standards

-- ============================================
-- 1. Add new column for CADEM socioeconomic classification
-- ============================================

ALTER TABLE synthetic_agents
ADD COLUMN IF NOT EXISTS cadem_socioeconomic_level VARCHAR(10)
CHECK (cadem_socioeconomic_level IN ('ABC1', 'C2', 'C3', 'D', 'E', NULL));

-- Add comment for documentation
COMMENT ON COLUMN synthetic_agents.cadem_socioeconomic_level IS 
'CADEM-compatible socioeconomic classification: ABC1 (high), C2 (upper-middle), C3 (middle), D (lower-middle), E (low). Mapped from income_decile.';

-- ============================================
-- 2. Create function to map income_decile to CADEM classification
-- ============================================

CREATE OR REPLACE FUNCTION map_income_decile_to_cadem(income_decile INTEGER)
RETURNS VARCHAR(10) AS $$
BEGIN
    -- CADEM standard mapping based on Chilean socioeconomic classification
    -- Source: CADEM methodology and Chilean market research standards
    CASE
        WHEN income_decile >= 9 THEN RETURN 'ABC1';  -- Deciles 9-10: High income
        WHEN income_decile >= 7 THEN RETURN 'C2';    -- Deciles 7-8: Upper-middle
        WHEN income_decile >= 5 THEN RETURN 'C3';    -- Deciles 5-6: Middle
        WHEN income_decile >= 3 THEN RETURN 'D';     -- Deciles 3-4: Lower-middle
        WHEN income_decile >= 1 THEN RETURN 'E';     -- Deciles 1-2: Low
        ELSE RETURN NULL;
    END CASE;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION map_income_decile_to_cadem IS 
'Maps income decile (1-10) to CADEM socioeconomic classification (ABC1, C2, C3, D, E)';

-- ============================================
-- 3. Update existing records with CADEM classification
-- ============================================

UPDATE synthetic_agents
SET cadem_socioeconomic_level = map_income_decile_to_cadem(income_decile)
WHERE income_decile IS NOT NULL
  AND (cadem_socioeconomic_level IS NULL OR cadem_socioeconomic_level = '');

-- ============================================
-- 4. Create trigger to auto-populate cadem_socioeconomic_level on insert/update
-- ============================================

CREATE OR REPLACE FUNCTION update_cadem_socioeconomic_level()
RETURNS TRIGGER AS $$
BEGIN
    -- Auto-populate cadem_socioeconomic_level based on income_decile
    IF NEW.income_decile IS NOT NULL THEN
        NEW.cadem_socioeconomic_level := map_income_decile_to_cadem(NEW.income_decile);
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS trg_update_cadem_socioeconomic ON synthetic_agents;

-- Create trigger
CREATE TRIGGER trg_update_cadem_socioeconomic
    BEFORE INSERT OR UPDATE OF income_decile ON synthetic_agents
    FOR EACH ROW
    EXECUTE FUNCTION update_cadem_socioeconomic_level();

-- ============================================
-- 5. Create index for efficient filtering
-- ============================================

CREATE INDEX IF NOT EXISTS idx_agents_cadem_socioeconomic 
ON synthetic_agents(cadem_socioeconomic_level);

-- ============================================
-- 6. Create view for demographic analysis with CADEM classification
-- ============================================

CREATE OR REPLACE VIEW v_agent_demographics_cadem AS
SELECT 
    sa.id,
    sa.agent_id,
    sa.sex,
    sa.age,
    sa.age_group,
    sa.region_code,
    sa.comuna_code,
    sa.income_decile,
    sa.cadem_socioeconomic_level,
    sa.education_level,
    sa.employment_status,
    sa.urbanicity,
    -- Additional calculated fields for analysis
    CASE 
        WHEN sa.age BETWEEN 18 AND 29 THEN '18-29'
        WHEN sa.age BETWEEN 30 AND 49 THEN '30-49'
        WHEN sa.age BETWEEN 50 AND 69 THEN '50-69'
        WHEN sa.age >= 70 THEN '70+'
        ELSE 'Under 18'
    END AS cadem_age_group,
    -- Regional grouping for CADEM analysis
    CASE 
        WHEN sa.region_code = 'RM' THEN 'Metropolitana'
        WHEN sa.region_code IN ('AP', 'TA', 'AN', 'AT') THEN 'Norte'
        WHEN sa.region_code IN ('CO', 'VA', 'LI', 'ML', 'NB') THEN 'Centro'
        WHEN sa.region_code IN ('BI', 'AR', 'LR', 'LL', 'AI', 'MA') THEN 'Sur'
        ELSE 'Other'
    END AS cadem_region_group
FROM synthetic_agents sa;

COMMENT ON VIEW v_agent_demographics_cadem IS 
'View of agent demographics with CADEM-compatible classifications for socioeconomic level, age groups, and regional groupings';

-- ============================================
-- 7. Create statistics view for CADEM distribution
-- ============================================

CREATE OR REPLACE VIEW v_cadem_distribution_stats AS
SELECT 
    cadem_socioeconomic_level,
    COUNT(*) AS agent_count,
    ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) AS percentage,
    AVG(income_decile) AS avg_income_decile,
    MIN(income_decile) AS min_income_decile,
    MAX(income_decile) AS max_income_decile
FROM synthetic_agents
WHERE cadem_socioeconomic_level IS NOT NULL
GROUP BY cadem_socioeconomic_level
ORDER BY 
    CASE cadem_socioeconomic_level
        WHEN 'ABC1' THEN 1
        WHEN 'C2' THEN 2
        WHEN 'C3' THEN 3
        WHEN 'D' THEN 4
        WHEN 'E' THEN 5
    END;

COMMENT ON VIEW v_cadem_distribution_stats IS 
'Statistics of CADEM socioeconomic distribution across all agents';

-- ============================================
-- 8. Verification query
-- ============================================

-- Show distribution after migration
SELECT 
    'CADEM Socioeconomic Distribution' AS metric,
    cadem_socioeconomic_level AS level,
    COUNT(*) AS count,
    ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) AS percentage
FROM synthetic_agents
WHERE cadem_socioeconomic_level IS NOT NULL
GROUP BY cadem_socioeconomic_level
ORDER BY 
    CASE cadem_socioeconomic_level
        WHEN 'ABC1' THEN 1
        WHEN 'C2' THEN 2
        WHEN 'C3' THEN 3
        WHEN 'D' THEN 4
        WHEN 'E' THEN 5
    END;
