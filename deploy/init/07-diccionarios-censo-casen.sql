-- =============================================================================
-- DICCIONARIOS OFICIALES CENSO 2024 Y CASEN
-- Tablas de referencia para validación de datos en synthetic_agents
-- =============================================================================
-- Fecha: 2026-03-23
-- Fuente: INE Chile - Diccionario de variables Censo 2024
--         INE Chile - Libro de códigos CASEN 2024
-- =============================================================================

-- =============================================================================
-- 1. DICCIONARIO: SEXO (Censo/CASEN)
-- Variable Censo: sexo
-- =============================================================================
CREATE TABLE IF NOT EXISTS dict_sex (
    code INTEGER PRIMARY KEY,
    label VARCHAR(20) NOT NULL,
    description VARCHAR(100),
    mapped_value VARCHAR(10) NOT NULL UNIQUE  -- Valor usado en synthetic_agents
);

-- Insertar valores oficiales
INSERT INTO dict_sex (code, label, description, mapped_value) VALUES
    (1, 'Hombre', 'Sexo masculino', 'male'),
    (2, 'Mujer', 'Sexo femenino', 'female')
ON CONFLICT (code) DO UPDATE SET
    label = EXCLUDED.label,
    description = EXCLUDED.description,
    mapped_value = EXCLUDED.mapped_value;

COMMENT ON TABLE dict_sex IS 'Diccionario de sexo según Censo 2024';
COMMENT ON COLUMN dict_sex.code IS 'Código oficial INE: 1=Hombre, 2=Mujer';
COMMENT ON COLUMN dict_sex.mapped_value IS 'Valor usado en synthetic_agents.sex';

-- =============================================================================
-- 2. DICCIONARIO: GRUPOS DE EDAD (Censo)
-- Variable Censo: edad_quinquenal
-- =============================================================================
CREATE TABLE IF NOT EXISTS dict_age_group (
    code INTEGER PRIMARY KEY,
    label VARCHAR(20) NOT NULL,
    min_age INTEGER NOT NULL,
    max_age INTEGER,
    description VARCHAR(50),
    mapped_value VARCHAR(20) NOT NULL  -- Valor usado en synthetic_agents
);

INSERT INTO dict_age_group (code, label, min_age, max_age, description, mapped_value) VALUES
    (0, '0-4', 0, 4, 'Primera infancia', 'child'),
    (5, '5-9', 5, 9, 'Niñez temprana', 'child'),
    (10, '10-14', 10, 14, 'Niñez tardía', 'youth'),
    (15, '15-19', 15, 19, 'Adolescencia', 'youth'),
    (20, '20-24', 20, 24, 'Juventud temprana', 'young_adult'),
    (25, '25-29', 25, 29, 'Juventud tardía', 'young_adult'),
    (30, '30-34', 30, 34, 'Adultez temprana', 'adult'),
    (35, '35-39', 35, 39, 'Adultez temprana', 'adult'),
    (40, '40-44', 40, 44, 'Adultez plena', 'adult'),
    (45, '45-49', 45, 49, 'Adultez media', 'middle_age'),
    (50, '50-54', 50, 54, 'Adultez media', 'middle_age'),
    (55, '55-59', 55, 59, 'Adultez tardía', 'middle_age'),
    (60, '60-64', 60, 64, 'Adultez tardía', 'senior'),
    (65, '65-69', 65, 69, 'Tercera edad temprana', 'senior'),
    (70, '70-74', 70, 74, 'Tercera edad media', 'elderly'),
    (75, '75-79', 75, 79, 'Tercera edad tardía', 'elderly'),
    (80, '80-84', 80, 84, 'Cuarta edad', 'elderly'),
    (85, '85 o más', 85, NULL, 'Longevos', 'elderly')
ON CONFLICT (code) DO UPDATE SET
    label = EXCLUDED.label,
    min_age = EXCLUDED.min_age,
    max_age = EXCLUDED.max_age,
    description = EXCLUDED.description,
    mapped_value = EXCLUDED.mapped_value;

COMMENT ON TABLE dict_age_group IS 'Diccionario de grupos de edad quinquenal según Censo 2024';

-- =============================================================================
-- 3. DICCIONARIO: NIVEL EDUCACIONAL (Censo/CASEN)
-- Variable Censo: cine11 (Clasificación Internacional Normalizada de la Educación)
-- =============================================================================
CREATE TABLE IF NOT EXISTS dict_education_level (
    code VARCHAR(10) PRIMARY KEY,
    label VARCHAR(100) NOT NULL,
    years_range VARCHAR(20),
    description TEXT,
    mapped_value VARCHAR(20) NOT NULL,  -- Valor usado en synthetic_agents
    sort_order INTEGER
);

INSERT INTO dict_education_level (code, label, years_range, description, mapped_value, sort_order) VALUES
    ('01', 'Nunca cursó', '0', 'Nunca cursó un programa educativo', 'none', 1),
    ('02', 'Educación primera infancia', '0-2', 'Educación de la primera infancia (incluye la forma parcial)', 'none', 2),
    ('03', 'Primaria parcial', '0-5', 'Primaria en forma parcial (sin conclusión del nivel)', 'primary', 3),
    ('10', 'Educación primaria nivel 1', '1-6', 'Educación primaria (nivel 1)', 'primary', 4),
    ('14', 'Educación primaria nivel 2', '7-8', 'Educación primaria (nivel 2), con orientación general', 'primary', 5),
    ('24', 'Educación secundaria general', '9-12', 'Educación secundaria, con orientación general', 'secondary', 6),
    ('25', 'Educación secundaria vocacional', '9-12', 'Educación secundaria, con orientación vocacional', 'secondary', 7),
    ('35', 'Educación terciaria ciclo corto', '13-14', 'Educación terciaria de ciclo corto, con orientación vocacional', 'technical', 8),
    ('46', 'Grado educación terciaria', '15-16', 'Grado de educación terciaria o nivel equivalente', 'university', 9),
    ('56', 'Maestría o especialización', '17-18', 'Nivel de maestría, especialización o equivalente', 'postgraduate', 10),
    ('64', 'Doctorado', '19+', 'Nivel de doctorado o equivalente', 'postgraduate', 11),
    ('98', 'Educación especial', NULL, 'Educación especial o diferencial', 'none', 12)
ON CONFLICT (code) DO UPDATE SET
    label = EXCLUDED.label,
    years_range = EXCLUDED.years_range,
    description = EXCLUDED.description,
    mapped_value = EXCLUDED.mapped_value,
    sort_order = EXCLUDED.sort_order;

COMMENT ON TABLE dict_education_level IS 'Diccionario de nivel educacional CINE-11 según Censo 2024';

-- =============================================================================
-- 4. DICCIONARIO: SITUACIÓN EN LA FUERZA DE TRABAJO (Censo)
-- Variable Censo: sit_fuerza_trabajo
-- =============================================================================
CREATE TABLE IF NOT EXISTS dict_employment_status (
    code INTEGER PRIMARY KEY,
    label VARCHAR(50) NOT NULL,
    description TEXT,
    mapped_value VARCHAR(20),  -- Valor usado en synthetic_agents (puede ser NULL)
    is_active BOOLEAN DEFAULT TRUE
);

INSERT INTO dict_employment_status (code, label, description, mapped_value, is_active) VALUES
    (1, 'Ocupado', 'Personas que trabajaron al menos una hora en la semana de referencia', 'employed', TRUE),
    (2, 'Desocupado', 'Personas sin trabajo que buscan empleo activamente', 'unemployed', TRUE),
    (3, 'Fuera de la fuerza de trabajo', 'Personas que no trabajan ni buscan trabajo (estudiantes, jubilados, etc.)', 'inactive', TRUE),
    (-99, 'No respuesta', 'No proporcionó información', NULL, FALSE)
ON CONFLICT (code) DO UPDATE SET
    label = EXCLUDED.label,
    description = EXCLUDED.description,
    mapped_value = EXCLUDED.mapped_value,
    is_active = EXCLUDED.is_active;

COMMENT ON TABLE dict_employment_status IS 'Diccionario de situación en la fuerza de trabajo según Censo 2024';

-- =============================================================================
-- 5. DICCIONARIO: CATEGORÍA DE OCUPACIÓN (Censo)
-- Variable Censo: p40_cise_rec (Categoría de Inserción en el Sector Económico)
-- =============================================================================
CREATE TABLE IF NOT EXISTS dict_occupation_category (
    code INTEGER PRIMARY KEY,
    label VARCHAR(100) NOT NULL,
    description TEXT,
    mapped_value VARCHAR(50)
);

INSERT INTO dict_occupation_category (code, label, description, mapped_value) VALUES
    (1, 'Independiente', 'Trabajadores por cuenta propia', 'self_employed'),
    (2, 'Dependiente', 'Trabajadores con contrato de trabajo', 'employed'),
    (3, 'Trabajador familiar no remunerado', 'Trabajador/a familiar o personal no remunerado en un negocio de un integrante de su familia', 'employed'),
    (-99, 'No respuesta', 'No proporcionó información', NULL)
ON CONFLICT (code) DO UPDATE SET
    label = EXCLUDED.label,
    description = EXCLUDED.description,
    mapped_value = EXCLUDED.mapped_value;

COMMENT ON TABLE dict_occupation_category IS 'Diccionario de categoría de ocupación CISE según Censo 2024';

-- =============================================================================
-- 6. DICCIONARIO: CIUO-08.CL (Clasificación Internacional Uniforme de Ocupaciones)
-- Variable Censo: cod_ciuo
-- =============================================================================
CREATE TABLE IF NOT EXISTS dict_ciuo_occupation (
    code VARCHAR(10) PRIMARY KEY,
    label VARCHAR(100) NOT NULL,
    category VARCHAR(50),
    description TEXT,
    skill_level VARCHAR(20)
);

INSERT INTO dict_ciuo_occupation (code, label, category, description, skill_level) VALUES
    ('1', 'Directores, gerentes y administradores', 'Gerencia', 'Ocupaciones directivas y gerenciales', 'Alto'),
    ('2', 'Profesionales, científicos e intelectuales', 'Profesional', 'Ocupaciones que requieren educación superior', 'Alto'),
    ('3', 'Técnicos y profesionales de nivel medio', 'Técnico', 'Ocupaciones técnicas y profesionales de nivel medio', 'Medio-Alto'),
    ('4', 'Personal de apoyo administrativo', 'Administrativo', 'Ocupaciones de apoyo administrativo', 'Medio'),
    ('5', 'Trabajadores de los servicios y vendedores', 'Servicios', 'Ocupaciones de servicios y ventas', 'Medio'),
    ('6', 'Agricultores y trabajadores agropecuarios', 'Agrícola', 'Ocupaciones en agricultura, ganadería, silvicultura y pesca', 'Medio'),
    ('7', 'Artesanos y operarios de oficios', 'Operario', 'Ocupaciones de oficios y operaciones de artesania', 'Medio-Bajo'),
    ('8', 'Operadores de instalaciones y máquinas', 'Operador', 'Ocupaciones de operación de maquinaria y transporte', 'Medio-Bajo'),
    ('9', 'Ocupaciones elementales', 'Elemental', 'Ocupaciones que requieren competencias elementales', 'Bajo'),
    ('0', 'Ocupaciones de las fuerzas armadas', 'Militar', 'Ocupaciones militares', 'Medio'),
    ('999', 'Respuesta no codificable', 'No codificable', 'No se pudo clasificar', NULL)
ON CONFLICT (code) DO UPDATE SET
    label = EXCLUDED.label,
    category = EXCLUDED.category,
    description = EXCLUDED.description,
    skill_level = EXCLUDED.skill_level;

COMMENT ON TABLE dict_ciuo_occupation IS 'Diccionario de ocupaciones CIUO-08.CL según Censo 2024';

-- =============================================================================
-- 7. DICCIONARIO: CAENES (Clasificación de Actividades Económicas)
-- Variable Censo: cod_caenes
-- =============================================================================
CREATE TABLE IF NOT EXISTS dict_caenes_activity (
    code VARCHAR(10) PRIMARY KEY,
    label VARCHAR(100) NOT NULL,
    sector VARCHAR(50),
    description TEXT
);

INSERT INTO dict_caenes_activity (code, label, sector, description) VALUES
    ('A', 'Agricultura, ganadería, silvicultura y pesca', 'Primario', 'Actividades agropecuarias y extractivas'),
    ('B', 'Explotación de minas y canteras', 'Primario', 'Minería y extracción'),
    ('C', 'Industrias manufactureras', 'Secundario', 'Industria manufacturera'),
    ('D', 'Suministro de electricidad, gas, vapor', 'Secundario', 'Servicios de energía'),
    ('E', 'Suministro de agua; evacuación de aguas residuales', 'Secundario', 'Servicios de agua y saneamiento'),
    ('F', 'Construcción', 'Secundario', 'Actividades de construcción'),
    ('G', 'Comercio al por mayor y al por menor', 'Terciario', 'Comercio y reparación de vehículos'),
    ('H', 'Transporte y almacenamiento', 'Terciario', 'Servicios de transporte'),
    ('I', 'Actividades de alojamiento y de servicio de comidas', 'Terciario', 'Hotelería y restaurantes'),
    ('J', 'Información y comunicaciones', 'Terciario', 'Tecnología y telecomunicaciones'),
    ('K', 'Actividades financieras y de seguros', 'Terciario', 'Servicios financieros'),
    ('L', 'Actividades inmobiliarias', 'Terciario', 'Bienes raíces'),
    ('M', 'Actividades profesionales, científicas y técnicas', 'Terciario', 'Servicios profesionales'),
    ('N', 'Actividades de servicios administrativos y de apoyo', 'Terciario', 'Servicios administrativos'),
    ('O', 'Administración pública y defensa', 'Terciario', 'Sector público'),
    ('P', 'Enseñanza', 'Terciario', 'Educación'),
    ('Q', 'Actividades de atención de la salud humana', 'Terciario', 'Salud'),
    ('R', 'Actividades artísticas, de entretenimiento', 'Terciario', 'Cultura y entretenimiento'),
    ('S', 'Otras actividades de servicios', 'Terciario', 'Servicios diversos'),
    ('T', 'Actividades de los hogares como empleadores', 'Terciario', 'Empleo doméstico'),
    ('U', 'Actividades de organizaciones extraterritoriales', 'Terciario', 'Organizaciones internacionales'),
    ('999', 'Respuesta no codificable', 'No codificable', 'No se pudo clasificar')
ON CONFLICT (code) DO UPDATE SET
    label = EXCLUDED.label,
    sector = EXCLUDED.sector,
    description = EXCLUDED.description;

COMMENT ON TABLE dict_caenes_activity IS 'Diccionario de actividades económicas CAENES según Censo 2024';

-- =============================================================================
-- 8. DICCIONARIO: ESTADO CIVIL (Censo)
-- Variable Censo: p23_est_civil
-- =============================================================================
CREATE TABLE IF NOT EXISTS dict_marital_status (
    code INTEGER PRIMARY KEY,
    label VARCHAR(100) NOT NULL,
    description TEXT,
    is_married BOOLEAN DEFAULT FALSE,
    is_partnered BOOLEAN DEFAULT FALSE
);

INSERT INTO dict_marital_status (code, label, description, is_married, is_partnered) VALUES
    (1, 'Casado/a', 'Unido/a matrimonialmente', TRUE, TRUE),
    (2, 'Conviviente o pareja sin acuerdo de unión civil', 'Conviviente de hecho', FALSE, TRUE),
    (3, 'Conviviente civil (con acuerdo de unión civil)', 'Unión civil formalizada', FALSE, TRUE),
    (4, 'Anulado/a', 'Matrimonio anulado', FALSE, FALSE),
    (5, 'Separado/a', 'Separado/a de hecho o de derecho', FALSE, FALSE),
    (6, 'Divorciado/a', 'Divorcio formalizado', FALSE, FALSE),
    (7, 'Viudo/a', 'Cónyuge fallecido', FALSE, FALSE),
    (8, 'Soltero/a', 'Nunca casado/a ni conviviente', FALSE, FALSE),
    (-99, 'No respuesta', 'No proporcionó información', NULL, NULL)
ON CONFLICT (code) DO UPDATE SET
    label = EXCLUDED.label,
    description = EXCLUDED.description,
    is_married = EXCLUDED.is_married,
    is_partnered = EXCLUDED.is_partnered;

COMMENT ON TABLE dict_marital_status IS 'Diccionario de estado civil según Censo 2024';

-- =============================================================================
-- 9. DICCIONARIO: PUEBLOS INDÍGENAS (Censo)
-- Variable Censo: p28_pueblo_pert
-- =============================================================================
CREATE TABLE IF NOT EXISTS dict_indigenous_people (
    code INTEGER PRIMARY KEY,
    label VARCHAR(50) NOT NULL,
    region_traditional VARCHAR(100),
    description TEXT
);

INSERT INTO dict_indigenous_people (code, label, region_traditional, description) VALUES
    (1, 'Mapuche', 'Araucanía, Biobío, Los Ríos', 'Mayor pueblo indígena de Chile'),
    (2, 'Aymara', 'Arica y Parinacota, Tarapacá', 'Pueblo del altiplano norte'),
    (3, 'Rapa Nui', 'Isla de Pascua', 'Pueblo polinésico'),
    (4, 'Atacameño o Lickanantay', 'Atacama', 'Pueblo del desierto de Atacama'),
    (5, 'Quechua', 'Norte de Chile', 'Pueblo originario del norte'),
    (6, 'Colla', 'Norte de Chile', 'Pueblo originario del altiplano'),
    (7, 'Diaguita', 'Norte de Chile', 'Pueblo originario preincaico'),
    (8, 'Kawésqar', 'Región de Magallanes', 'Pueblo canoero del sur'),
    (9, 'Yagán', 'Región de Magallanes', 'Pueblo canoero del extremo sur'),
    (10, 'Chango', 'Norte de Chile', 'Pueblo costero del norte'),
    (11, 'Selk''nam', 'Tierra del Fuego', 'Pueblo originario de Tierra del Fuego'),
    (12, 'Otro', 'Varios', 'Otro pueblo indígena u originario')
ON CONFLICT (code) DO UPDATE SET
    label = EXCLUDED.label,
    region_traditional = EXCLUDED.region_traditional,
    description = EXCLUDED.description;

COMMENT ON TABLE dict_indigenous_people IS 'Diccionario de pueblos indígenas según Censo 2024';

-- =============================================================================
-- 10. DICCIONARIO: DISCAPACIDAD (Censo)
-- Variable Censo: discapacidad
-- =============================================================================
CREATE TABLE IF NOT EXISTS dict_disability_status (
    code INTEGER PRIMARY KEY,
    label VARCHAR(50) NOT NULL,
    description TEXT
);

INSERT INTO dict_disability_status (code, label, description) VALUES
    (1, 'Con discapacidad', 'Persona que presenta al menos una dificultad funcional'),
    (2, 'Sin discapacidad', 'Persona sin dificultades funcionales'),
    (-99, 'No respuesta', 'No proporcionó información')
ON CONFLICT (code) DO UPDATE SET
    label = EXCLUDED.label,
    description = EXCLUDED.description;

COMMENT ON TABLE dict_disability_status IS 'Diccionario de discapacidad según Censo 2024';

-- =============================================================================
-- 11. ÍNDICES PARA DICCIONARIOS
-- =============================================================================
CREATE INDEX IF NOT EXISTS idx_dict_sex_mapped ON dict_sex(mapped_value);
CREATE INDEX IF NOT EXISTS idx_dict_age_group_mapped ON dict_age_group(mapped_value);
CREATE INDEX IF NOT EXISTS idx_dict_education_mapped ON dict_education_level(mapped_value);
CREATE INDEX IF NOT EXISTS idx_dict_employment_mapped ON dict_employment_status(mapped_value);
CREATE INDEX IF NOT EXISTS idx_dict_ciuo_category ON dict_ciuo_occupation(category);
CREATE INDEX IF NOT EXISTS idx_dict_caenes_sector ON dict_caenes_activity(sector);

-- =============================================================================
-- 12. VISTAS DE MAPEO PARA SYNTHETIC_AGENTS
-- =============================================================================

-- Vista de mapeo completo de variables Censo → synthetic_agents
CREATE OR REPLACE VIEW v_censo_to_synthetic_agents_mapping AS
SELECT
    'sex' AS synthetic_agents_field,
    'sexo' AS censo_variable,
    d.code::text AS censo_code,
    d.label AS censo_label,
    d.mapped_value AS synthetic_agents_value
FROM dict_sex d
UNION ALL
SELECT
    'age_group',
    'edad_quinquenal',
    d.code::text,
    d.label,
    d.mapped_value
FROM dict_age_group d
UNION ALL
SELECT
    'education_level',
    'cine11',
    d.code,
    d.label,
    d.mapped_value
FROM dict_education_level d
UNION ALL
SELECT
    'occupation_status',
    'sit_fuerza_trabajo',
    d.code::text,
    d.label,
    d.mapped_value
FROM dict_employment_status d
WHERE d.is_active = TRUE;

COMMENT ON VIEW v_censo_to_synthetic_agents_mapping IS 'Vista de mapeo de variables Censo 2024 a campos de synthetic_agents';

-- =============================================================================
-- 13. FUNCIÓN DE VALIDACIÓN
-- =============================================================================

-- Función para validar que un valor existe en el diccionario correspondiente
CREATE OR REPLACE FUNCTION validate_against_dictionary(
    p_table_name TEXT,
    p_field_name TEXT,
    p_value TEXT
) RETURNS BOOLEAN AS $$
DECLARE
    v_dict_table TEXT;
    v_count INTEGER;
BEGIN
    -- Mapeo de campos a tablas de diccionario
    v_dict_table := CASE p_field_name
        WHEN 'sex' THEN 'dict_sex'
        WHEN 'age_group' THEN 'dict_age_group'
        WHEN 'education_level' THEN 'dict_education_level'
        WHEN 'occupation_status' THEN 'dict_employment_status'
        ELSE NULL
    END;
    
    IF v_dict_table IS NULL THEN
        RETURN TRUE; -- No hay diccionario para este campo
    END IF;
    
    EXECUTE format(
        'SELECT COUNT(*) FROM %I WHERE mapped_value = $1',
        v_dict_table
    ) INTO v_count USING p_value;
    
    RETURN v_count > 0;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION validate_against_dictionary IS 'Valida que un valor exista en el diccionario correspondiente';

-- =============================================================================
-- 14. VERIFICACIÓN DE CARGA
-- =============================================================================

SELECT 'Diccionarios creados exitosamente' AS status;

SELECT 
    'dict_sex' AS table_name, COUNT(*) AS record_count FROM dict_sex
UNION ALL
SELECT 'dict_age_group', COUNT(*) FROM dict_age_group
UNION ALL
SELECT 'dict_education_level', COUNT(*) FROM dict_education_level
UNION ALL
SELECT 'dict_employment_status', COUNT(*) FROM dict_employment_status
UNION ALL
SELECT 'dict_occupation_category', COUNT(*) FROM dict_occupation_category
UNION ALL
SELECT 'dict_ciuo_occupation', COUNT(*) FROM dict_ciuo_occupation
UNION ALL
SELECT 'dict_caenes_activity', COUNT(*) FROM dict_caenes_activity
UNION ALL
SELECT 'dict_marital_status', COUNT(*) FROM dict_marital_status
UNION ALL
SELECT 'dict_indigenous_people', COUNT(*) FROM dict_indigenous_people
UNION ALL
SELECT 'dict_disability_status', COUNT(*) FROM dict_disability_status;
