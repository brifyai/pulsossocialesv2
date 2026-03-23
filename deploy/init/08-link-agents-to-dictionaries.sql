-- =============================================================================
-- VINCULACIÓN DE SYNTHETIC_AGENTS CON DICCIONARIOS
-- Agrega Foreign Keys y constraints de integridad referencial
-- =============================================================================
-- Ejecutar DESPUÉS de: 07-diccionarios-censo-casen.sql
-- =============================================================================

-- =============================================================================
-- 1. AGREGAR CAMPOS DE CÓDIGO CENSO A SYNTHETIC_AGENTS
-- Estos campos almacenan los códigos originales del Censo para trazabilidad
-- =============================================================================

-- Código de sexo del Censo (1, 2)
ALTER TABLE synthetic_agents 
ADD COLUMN IF NOT EXISTS sex_code INTEGER;

-- Código de grupo de edad quinquenal (0, 5, 10, 15, ...)
ALTER TABLE synthetic_agents 
ADD COLUMN IF NOT EXISTS age_group_code INTEGER;

-- Código de nivel educacional CINE-11 (01, 02, 03, 10, ...)
ALTER TABLE synthetic_agents 
ADD COLUMN IF NOT EXISTS education_level_code VARCHAR(10);

-- Código de situación laboral (1, 2, 3)
ALTER TABLE synthetic_agents 
ADD COLUMN IF NOT EXISTS occupation_status_code INTEGER;

-- Código de categoría de ocupación CISE (1, 2, 3)
ALTER TABLE synthetic_agents 
ADD COLUMN IF NOT EXISTS occupation_category_code INTEGER;

-- Código de ocupación CIUO (1 dígito)
ALTER TABLE synthetic_agents 
ADD COLUMN IF NOT EXISTS ciuo_code VARCHAR(10);

-- Código de actividad económica CAENES (A, B, C, ...)
ALTER TABLE synthetic_agents 
ADD COLUMN IF NOT EXISTS caenes_code VARCHAR(10);

-- Código de estado civil (1-8)
ALTER TABLE synthetic_agents 
ADD COLUMN IF NOT EXISTS marital_status_code INTEGER;

-- Código de pueblo indígena (1-12)
ALTER TABLE synthetic_agents 
ADD COLUMN IF NOT EXISTS indigenous_people_code INTEGER;

-- Código de discapacidad (1, 2)
ALTER TABLE synthetic_agents 
ADD COLUMN IF NOT EXISTS disability_status_code INTEGER;

-- =============================================================================
-- 2. CREAR ÍNDICES PARA LOS NUEVOS CAMPOS DE CÓDIGO
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_agents_sex_code ON synthetic_agents(sex_code);
CREATE INDEX IF NOT EXISTS idx_agents_age_group_code ON synthetic_agents(age_group_code);
CREATE INDEX IF NOT EXISTS idx_agents_education_code ON synthetic_agents(education_level_code);
CREATE INDEX IF NOT EXISTS idx_agents_occupation_status_code ON synthetic_agents(occupation_status_code);
CREATE INDEX IF NOT EXISTS idx_agents_occupation_category_code ON synthetic_agents(occupation_category_code);
CREATE INDEX IF NOT EXISTS idx_agents_ciuo_code ON synthetic_agents(ciuo_code);
CREATE INDEX IF NOT EXISTS idx_agents_caenes_code ON synthetic_agents(caenes_code);
CREATE INDEX IF NOT EXISTS idx_agents_marital_status_code ON synthetic_agents(marital_status_code);
CREATE INDEX IF NOT EXISTS idx_agents_indigenous_code ON synthetic_agents(indigenous_people_code);
CREATE INDEX IF NOT EXISTS idx_agents_disability_code ON synthetic_agents(disability_status_code);

-- =============================================================================
-- 3. AGREGAR FOREIGN KEYS (Opcional - descomentar si se desea integridad estricta)
-- NOTA: Las FK requieren que los datos existentes cumplan con los diccionarios
-- =============================================================================

-- Foreign Key: sex_code → dict_sex.code
-- ALTER TABLE synthetic_agents
-- ADD CONSTRAINT fk_agents_sex_code
-- FOREIGN KEY (sex_code) REFERENCES dict_sex(code)
-- ON UPDATE CASCADE ON DELETE SET NULL;

-- Foreign Key: age_group_code → dict_age_group.code
-- ALTER TABLE synthetic_agents
-- ADD CONSTRAINT fk_agents_age_group_code
-- FOREIGN KEY (age_group_code) REFERENCES dict_age_group(code)
-- ON UPDATE CASCADE ON DELETE SET NULL;

-- Foreign Key: education_level_code → dict_education_level.code
-- ALTER TABLE synthetic_agents
-- ADD CONSTRAINT fk_agents_education_code
-- FOREIGN KEY (education_level_code) REFERENCES dict_education_level(code)
-- ON UPDATE CASCADE ON DELETE SET NULL;

-- Foreign Key: occupation_status_code → dict_employment_status.code
-- ALTER TABLE synthetic_agents
-- ADD CONSTRAINT fk_agents_occupation_status_code
-- FOREIGN KEY (occupation_status_code) REFERENCES dict_employment_status(code)
-- ON UPDATE CASCADE ON DELETE SET NULL;

-- Foreign Key: occupation_category_code → dict_occupation_category.code
-- ALTER TABLE synthetic_agents
-- ADD CONSTRAINT fk_agents_occupation_category_code
-- FOREIGN KEY (occupation_category_code) REFERENCES dict_occupation_category(code)
-- ON UPDATE CASCADE ON DELETE SET NULL;

-- Foreign Key: ciuo_code → dict_ciuo_occupation.code
-- ALTER TABLE synthetic_agents
-- ADD CONSTRAINT fk_agents_ciuo_code
-- FOREIGN KEY (ciuo_code) REFERENCES dict_ciuo_occupation(code)
-- ON UPDATE CASCADE ON DELETE SET NULL;

-- Foreign Key: caenes_code → dict_caenes_activity.code
-- ALTER TABLE synthetic_agents
-- ADD CONSTRAINT fk_agents_caenes_code
-- FOREIGN KEY (caenes_code) REFERENCES dict_caenes_activity(code)
-- ON UPDATE CASCADE ON DELETE SET NULL;

-- Foreign Key: marital_status_code → dict_marital_status.code
-- ALTER TABLE synthetic_agents
-- ADD CONSTRAINT fk_agents_marital_status_code
-- FOREIGN KEY (marital_status_code) REFERENCES dict_marital_status(code)
-- ON UPDATE CASCADE ON DELETE SET NULL;

-- Foreign Key: indigenous_people_code → dict_indigenous_people.code
-- ALTER TABLE synthetic_agents
-- ADD CONSTRAINT fk_agents_indigenous_code
-- FOREIGN KEY (indigenous_people_code) REFERENCES dict_indigenous_people(code)
-- ON UPDATE CASCADE ON DELETE SET NULL;

-- Foreign Key: disability_status_code → dict_disability_status.code
-- ALTER TABLE synthetic_agents
-- ADD CONSTRAINT fk_agents_disability_code
-- FOREIGN KEY (disability_status_code) REFERENCES dict_disability_status(code)
-- ON UPDATE CASCADE ON DELETE SET NULL;

-- =============================================================================
-- 4. FUNCIÓN PARA SINCRONIZAR CÓDIGOS CON VALORES MAPEADOS
-- Esta función actualiza los códigos del Censo basándose en los valores de synthetic_agents
-- =============================================================================

CREATE OR REPLACE FUNCTION sync_agent_codes_from_mapped_values()
RETURNS INTEGER AS $$
DECLARE
    v_updated INTEGER := 0;
BEGIN
    -- Sincronizar sex_code desde sex
    UPDATE synthetic_agents a
    SET sex_code = d.code
    FROM dict_sex d
    WHERE a.sex = d.mapped_value
      AND a.sex_code IS NULL;
    GET DIAGNOSTICS v_updated = ROW_COUNT;
    RAISE NOTICE 'Actualizados % registros de sex_code', v_updated;
    
    -- Sincronizar age_group_code desde age_group
    UPDATE synthetic_agents a
    SET age_group_code = d.code
    FROM dict_age_group d
    WHERE a.age_group = d.mapped_value
      AND a.age_group_code IS NULL;
    GET DIAGNOSTICS v_updated = ROW_COUNT;
    RAISE NOTICE 'Actualizados % registros de age_group_code', v_updated;
    
    -- Sincronizar education_level_code desde education_level
    UPDATE synthetic_agents a
    SET education_level_code = d.code
    FROM dict_education_level d
    WHERE a.education_level = d.mapped_value
      AND a.education_level_code IS NULL;
    GET DIAGNOSTICS v_updated = ROW_COUNT;
    RAISE NOTICE 'Actualizados % registros de education_level_code', v_updated;
    
    -- Sincronizar occupation_status_code desde occupation_status
    UPDATE synthetic_agents a
    SET occupation_status_code = d.code
    FROM dict_employment_status d
    WHERE a.occupation_status = d.mapped_value
      AND d.is_active = TRUE
      AND a.occupation_status_code IS NULL;
    GET DIAGNOSTICS v_updated = ROW_COUNT;
    RAISE NOTICE 'Actualizados % registros de occupation_status_code', v_updated;
    
    RETURN v_updated;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION sync_agent_codes_from_mapped_values() IS 
'Sincroniza los códigos del Censo en synthetic_agents basándose en los valores mapeados actuales';

-- =============================================================================
-- 5. FUNCIÓN PARA VALIDAR INTEGRIDAD DE DATOS
-- =============================================================================

CREATE OR REPLACE FUNCTION validate_agent_dictionary_integrity()
RETURNS TABLE (
    field_name TEXT,
    invalid_count BIGINT,
    sample_invalid_values TEXT[]
) AS $$
BEGIN
    -- Validar sex
    RETURN QUERY
    SELECT 
        'sex'::TEXT,
        COUNT(*)::BIGINT,
        ARRAY_AGG(DISTINCT sex) FILTER (WHERE sex IS NOT NULL)::TEXT[]
    FROM synthetic_agents
    WHERE sex IS NOT NULL 
      AND sex NOT IN (SELECT mapped_value FROM dict_sex);
    
    -- Validar age_group
    RETURN QUERY
    SELECT 
        'age_group'::TEXT,
        COUNT(*)::BIGINT,
        ARRAY_AGG(DISTINCT age_group) FILTER (WHERE age_group IS NOT NULL)::TEXT[]
    FROM synthetic_agents
    WHERE age_group IS NOT NULL 
      AND age_group NOT IN (SELECT mapped_value FROM dict_age_group);
    
    -- Validar education_level
    RETURN QUERY
    SELECT 
        'education_level'::TEXT,
        COUNT(*)::BIGINT,
        ARRAY_AGG(DISTINCT education_level) FILTER (WHERE education_level IS NOT NULL)::TEXT[]
    FROM synthetic_agents
    WHERE education_level IS NOT NULL 
      AND education_level NOT IN (SELECT mapped_value FROM dict_education_level);
    
    -- Validar occupation_status
    RETURN QUERY
    SELECT 
        'occupation_status'::TEXT,
        COUNT(*)::BIGINT,
        ARRAY_AGG(DISTINCT occupation_status) FILTER (WHERE occupation_status IS NOT NULL)::TEXT[]
    FROM synthetic_agents
    WHERE occupation_status IS NOT NULL 
      AND occupation_status NOT IN (SELECT mapped_value FROM dict_employment_status WHERE is_active = TRUE);
    
    RETURN;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION validate_agent_dictionary_integrity() IS 
'Valida que los valores en synthetic_agents correspondan a los diccionarios oficiales';

-- =============================================================================
-- 6. VISTA ENRIQUECIDA CON INFORMACIÓN DE DICCIONARIOS
-- =============================================================================

CREATE OR REPLACE VIEW v_synthetic_agents_enriched AS
SELECT 
    a.*,
    -- Información de sexo
    ds.label AS sex_label,
    ds.code AS sex_censo_code,
    -- Información de grupo de edad
    dag.label AS age_group_label,
    dag.min_age AS age_group_min,
    dag.max_age AS age_group_max,
    -- Información de educación
    del.label AS education_label,
    del.years_range AS education_years,
    -- Información de situación laboral
    des.label AS occupation_status_label,
    -- Información de ocupación CIUO
    dciuo.label AS ciuo_label,
    dciuo.category AS ciuo_category,
    dciuo.skill_level AS ciuo_skill_level,
    -- Información de actividad CAENES
    dcaenes.label AS caenes_label,
    dcaenes.sector AS caenes_sector,
    -- Información de estado civil
    dms.label AS marital_status_label,
    dms.is_married,
    dms.is_partnered,
    -- Información de pueblo indígena
    dip.label AS indigenous_people_label,
    dip.region_traditional AS indigenous_region,
    -- Información de discapacidad
    dds.label AS disability_status_label
FROM synthetic_agents a
LEFT JOIN dict_sex ds ON a.sex = ds.mapped_value
LEFT JOIN dict_age_group dag ON a.age_group = dag.mapped_value
LEFT JOIN dict_education_level del ON a.education_level = del.mapped_value
LEFT JOIN dict_employment_status des ON a.occupation_status = des.mapped_value AND des.is_active = TRUE
LEFT JOIN dict_ciuo_occupation dciuo ON a.ciuo_code = dciuo.code
LEFT JOIN dict_caenes_activity dcaenes ON a.caenes_code = dcaenes.code
LEFT JOIN dict_marital_status dms ON a.marital_status_code = dms.code
LEFT JOIN dict_indigenous_people dip ON a.indigenous_people_code = dip.code
LEFT JOIN dict_disability_status dds ON a.disability_status_code = dds.code;

COMMENT ON VIEW v_synthetic_agents_enriched IS 
'Vista de agentes sintéticos enriquecida con información de diccionarios del Censo 2024';

-- =============================================================================
-- 7. TRIGGER PARA MANTENER SINCRONIZADOS CÓDIGOS Y VALORES MAPEADOS
-- =============================================================================

CREATE OR REPLACE FUNCTION trg_sync_agent_codes()
RETURNS TRIGGER AS $$
BEGIN
    -- Sincronizar sex_code cuando cambia sex
    IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND NEW.sex IS DISTINCT FROM OLD.sex) THEN
        SELECT code INTO NEW.sex_code
        FROM dict_sex WHERE mapped_value = NEW.sex;
    END IF;
    
    -- Sincronizar age_group_code cuando cambia age_group
    IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND NEW.age_group IS DISTINCT FROM OLD.age_group) THEN
        SELECT code INTO NEW.age_group_code
        FROM dict_age_group WHERE mapped_value = NEW.age_group;
    END IF;
    
    -- Sincronizar education_level_code cuando cambia education_level
    IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND NEW.education_level IS DISTINCT FROM OLD.education_level) THEN
        SELECT code INTO NEW.education_level_code
        FROM dict_education_level WHERE mapped_value = NEW.education_level;
    END IF;
    
    -- Sincronizar occupation_status_code cuando cambia occupation_status
    IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND NEW.occupation_status IS DISTINCT FROM OLD.occupation_status) THEN
        SELECT code INTO NEW.occupation_status_code
        FROM dict_employment_status 
        WHERE mapped_value = NEW.occupation_status AND is_active = TRUE;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crear el trigger
DROP TRIGGER IF EXISTS trg_sync_agent_codes ON synthetic_agents;
CREATE TRIGGER trg_sync_agent_codes
    BEFORE INSERT OR UPDATE ON synthetic_agents
    FOR EACH ROW EXECUTE FUNCTION trg_sync_agent_codes();

COMMENT ON FUNCTION trg_sync_agent_codes() IS 
'Trigger que mantiene sincronizados los códigos del Censo con los valores mapeados';

-- =============================================================================
-- 8. EJECUTAR SINCRONIZACIÓN INICIAL (si hay datos existentes)
-- =============================================================================

-- Verificar si hay datos en synthetic_agents
DO $$
DECLARE
    v_count INTEGER;
    v_updated INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_count FROM synthetic_agents;
    
    IF v_count > 0 THEN
        RAISE NOTICE 'Sincronizando % agentes existentes con diccionarios...', v_count;
        
        -- Ejecutar sincronización
        SELECT sync_agent_codes_from_mapped_values() INTO v_updated;
        
        RAISE NOTICE 'Sincronización completada';
    ELSE
        RAISE NOTICE 'No hay agentes para sincronizar';
    END IF;
END $$;

-- =============================================================================
-- 9. VERIFICACIÓN FINAL
-- =============================================================================

SELECT 'Vinculación de diccionarios completada' AS status;

-- Mostrar resumen de campos de código agregados
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'synthetic_agents'
  AND column_name LIKE '%_code'
ORDER BY ordinal_position;
