-- ===========================================
-- Seed Benchmarks - CASEN 2022
-- Inserta benchmarks de referencia desde datos CASEN
-- ===========================================

-- Limpiar datos existentes (opcional - descomentar si se necesita)
-- DELETE FROM benchmark_indicators WHERE benchmark_id IN (SELECT id FROM benchmarks WHERE source_id = 'casen_2022');
-- DELETE FROM benchmarks WHERE source_id = 'casen_2022';

-- ===========================================
-- Insertar Benchmark Principal: CASEN 2022
-- ===========================================
INSERT INTO benchmarks (
    id,
    source_id,
    name,
    organization,
    year,
    description,
    url,
    coverage_geographic,
    coverage_temporal_start,
    coverage_temporal_end,
    status
) VALUES (
    gen_random_uuid(),
    'casen_2022',
    'CASEN 2022',
    'Ministerio de Desarrollo Social y Familia',
    2022,
    'Encuesta de Caracterización Socioeconómica Nacional 2022. Principales indicadores de ingresos, educación, salud y vivienda para Chile.',
    'https://www.midesocial.gob.cl/encuesta-casen-2022/',
    ARRAY['Chile', 'Región Metropolitana', 'Valparaíso', 'Biobío', 'Araucanía'],
    '2022-01-01',
    '2022-12-31',
    'active'
)
ON CONFLICT (source_id) DO UPDATE SET
    name = EXCLUDED.name,
    organization = EXCLUDED.organization,
    year = EXCLUDED.year,
    description = EXCLUDED.description,
    url = EXCLUDED.url,
    coverage_geographic = EXCLUDED.coverage_geographic,
    status = 'active',
    updated_at = NOW();

-- Obtener el ID del benchmark
DO $$
DECLARE
    v_benchmark_id UUID;
BEGIN
    SELECT id INTO v_benchmark_id FROM benchmarks WHERE source_id = 'casen_2022';
    
    -- ===========================================
    -- Insertar Indicadores: Ingresos
    -- ===========================================
    
    -- Ingreso promedio mensual
    INSERT INTO benchmark_indicators (
        benchmark_id,
        indicator_id,
        name,
        description,
        category,
        unit,
        value,
        sample_size,
        compatible_question_types,
        compatible_segments
    ) VALUES (
        v_benchmark_id,
        'ingreso_promedio_mensual',
        'Ingreso Promedio Mensual',
        'Ingreso total promedio per cápita mensual de los hogares',
        'Ingresos',
        'average',
        650000,
        85000,
        ARRAY['single_choice', 'likert_scale'],
        ARRAY['nacional', 'regional', 'comunal']
    )
    ON CONFLICT (benchmark_id, indicator_id) DO UPDATE SET
        value = EXCLUDED.value,
        sample_size = EXCLUDED.sample_size,
        updated_at = NOW();
    
    -- Mediana de ingresos
    INSERT INTO benchmark_indicators (
        benchmark_id,
        indicator_id,
        name,
        description,
        category,
        unit,
        value,
        sample_size,
        compatible_question_types,
        compatible_segments
    ) VALUES (
        v_benchmark_id,
        'mediana_ingresos',
        'Mediana de Ingresos',
        'Mediana del ingreso total per cápita mensual',
        'Ingresos',
        'average',
        480000,
        85000,
        ARRAY['single_choice', 'likert_scale'],
        ARRAY['nacional', 'regional']
    )
    ON CONFLICT (benchmark_id, indicator_id) DO UPDATE SET
        value = EXCLUDED.value,
        sample_size = EXCLUDED.sample_size,
        updated_at = NOW();
    
    -- ===========================================
    -- Insertar Indicadores: Educación
    -- ===========================================
    
    -- Escolaridad promedio
    INSERT INTO benchmark_indicators (
        benchmark_id,
        indicator_id,
        name,
        description,
        category,
        unit,
        value,
        percentage,
        sample_size,
        compatible_question_types,
        compatible_segments
    ) VALUES (
        v_benchmark_id,
        'escolaridad_promedio',
        'Escolaridad Promedio',
        'Años de escolaridad promedio de la población de 15 años y más',
        'Educación',
        'average',
        11.2,
        NULL,
        82000,
        ARRAY['single_choice', 'likert_scale'],
        ARRAY['nacional', 'regional', 'comunal']
    )
    ON CONFLICT (benchmark_id, indicator_id) DO UPDATE SET
        value = EXCLUDED.value,
        sample_size = EXCLUDED.sample_size,
        updated_at = NOW();
    
    -- Población con educación universitaria
    INSERT INTO benchmark_indicators (
        benchmark_id,
        indicator_id,
        name,
        description,
        category,
        unit,
        value,
        percentage,
        sample_size,
        compatible_question_types,
        compatible_segments
    ) VALUES (
        v_benchmark_id,
        'educacion_universitaria',
        'Población con Educación Universitaria',
        'Porcentaje de población con educación universitaria completa o incompleta',
        'Educación',
        'percentage',
        28.5,
        28.5,
        82000,
        ARRAY['single_choice'],
        ARRAY['nacional', 'regional']
    )
    ON CONFLICT (benchmark_id, indicator_id) DO UPDATE SET
        value = EXCLUDED.value,
        percentage = EXCLUDED.percentage,
        sample_size = EXCLUDED.sample_size,
        updated_at = NOW();
    
    -- ===========================================
    -- Insertar Indicadores: Empleo
    -- ===========================================
    
    -- Tasa de ocupación
    INSERT INTO benchmark_indicators (
        benchmark_id,
        indicator_id,
        name,
        description,
        category,
        unit,
        value,
        percentage,
        sample_size,
        compatible_question_types,
        compatible_segments
    ) VALUES (
        v_benchmark_id,
        'tasa_ocupacion',
        'Tasa de Ocupación',
        'Porcentaje de la población en edad de trabajar que está ocupada',
        'Empleo',
        'percentage',
        56.8,
        56.8,
        78000,
        ARRAY['single_choice'],
        ARRAY['nacional', 'regional']
    )
    ON CONFLICT (benchmark_id, indicator_id) DO UPDATE SET
        value = EXCLUDED.value,
        percentage = EXCLUDED.percentage,
        sample_size = EXCLUDED.sample_size,
        updated_at = NOW();
    
    -- Tasa de desempleo
    INSERT INTO benchmark_indicators (
        benchmark_id,
        indicator_id,
        name,
        description,
        category,
        unit,
        value,
        percentage,
        sample_size,
        compatible_question_types,
        compatible_segments
    ) VALUES (
        v_benchmark_id,
        'tasa_desempleo',
        'Tasa de Desempleo',
        'Porcentaje de la fuerza de trabajo que está desempleada',
        'Empleo',
        'percentage',
        7.9,
        7.9,
        78000,
        ARRAY['single_choice'],
        ARRAY['nacional', 'regional']
    )
    ON CONFLICT (benchmark_id, indicator_id) DO UPDATE SET
        value = EXCLUDED.value,
        percentage = EXCLUDED.percentage,
        sample_size = EXCLUDED.sample_size,
        updated_at = NOW();
    
    -- ===========================================
    -- Insertar Indicadores: Salud
    -- ===========================================
    
    -- Afiliación a sistema de salud (FONASA)
    INSERT INTO benchmark_indicators (
        benchmark_id,
        indicator_id,
        name,
        description,
        category,
        unit,
        value,
        percentage,
        sample_size,
        compatible_question_types,
        compatible_segments
    ) VALUES (
        v_benchmark_id,
        'afiliacion_fonasa',
        'Afiliación FONASA',
        'Porcentaje de población afiliada a FONASA',
        'Salud',
        'percentage',
        78.2,
        78.2,
        85000,
        ARRAY['single_choice'],
        ARRAY['nacional', 'regional']
    )
    ON CONFLICT (benchmark_id, indicator_id) DO UPDATE SET
        value = EXCLUDED.value,
        percentage = EXCLUDED.percentage,
        sample_size = EXCLUDED.sample_size,
        updated_at = NOW();
    
    -- Afiliación a sistema de salud (ISAPRE)
    INSERT INTO benchmark_indicators (
        benchmark_id,
        indicator_id,
        name,
        description,
        category,
        unit,
        value,
        percentage,
        sample_size,
        compatible_question_types,
        compatible_segments
    ) VALUES (
        v_benchmark_id,
        'afiliacion_isapre',
        'Afiliación ISAPRE',
        'Porcentaje de población afiliada a ISAPRE',
        'Salud',
        'percentage',
        12.8,
        12.8,
        85000,
        ARRAY['single_choice'],
        ARRAY['nacional', 'regional']
    )
    ON CONFLICT (benchmark_id, indicator_id) DO UPDATE SET
        value = EXCLUDED.value,
        percentage = EXCLUDED.percentage,
        sample_size = EXCLUDED.sample_size,
        updated_at = NOW();
    
    -- ===========================================
    -- Insertar Indicadores: Vivienda
    -- ===========================================
    
    -- Hacinamiento
    INSERT INTO benchmark_indicators (
        benchmark_id,
        indicator_id,
        name,
        description,
        category,
        unit,
        value,
        percentage,
        sample_size,
        compatible_question_types,
        compatible_segments
    ) VALUES (
        v_benchmark_id,
        'hacinamiento',
        'Hacinamiento',
        'Porcentaje de hogares con hacinamiento (más de 2 personas por dormitorio)',
        'Vivienda',
        'percentage',
        18.5,
        18.5,
        85000,
        ARRAY['single_choice'],
        ARRAY['nacional', 'regional', 'comunal']
    )
    ON CONFLICT (benchmark_id, indicator_id) DO UPDATE SET
        value = EXCLUDED.value,
        percentage = EXCLUDED.percentage,
        sample_size = EXCLUDED.sample_size,
        updated_at = NOW();
    
    -- Materialidad de la vivienda (deficit)
    INSERT INTO benchmark_indicators (
        benchmark_id,
        indicator_id,
        name,
        description,
        category,
        unit,
        value,
        percentage,
        sample_size,
        compatible_question_types,
        compatible_segments
    ) VALUES (
        v_benchmark_id,
        'deficit_material',
        'Déficit Material de Vivienda',
        'Porcentaje de hogares con déficit material de vivienda',
        'Vivienda',
        'percentage',
        12.3,
        12.3,
        85000,
        ARRAY['single_choice'],
        ARRAY['nacional', 'regional']
    )
    ON CONFLICT (benchmark_id, indicator_id) DO UPDATE SET
        value = EXCLUDED.value,
        percentage = EXCLUDED.percentage,
        sample_size = EXCLUDED.sample_size,
        updated_at = NOW();
    
    -- ===========================================
    -- Insertar Indicadores: Tecnología
    -- ===========================================
    
    -- Acceso a internet
    INSERT INTO benchmark_indicators (
        benchmark_id,
        indicator_id,
        name,
        description,
        category,
        unit,
        value,
        percentage,
        sample_size,
        compatible_question_types,
        compatible_segments
    ) VALUES (
        v_benchmark_id,
        'acceso_internet',
        'Acceso a Internet',
        'Porcentaje de hogares con acceso a internet',
        'Tecnología',
        'percentage',
        92.4,
        92.4,
        85000,
        ARRAY['single_choice'],
        ARRAY['nacional', 'regional', 'comunal']
    )
    ON CONFLICT (benchmark_id, indicator_id) DO UPDATE SET
        value = EXCLUDED.value,
        percentage = EXCLUDED.percentage,
        sample_size = EXCLUDED.sample_size,
        updated_at = NOW();
    
    -- Acceso a smartphone
    INSERT INTO benchmark_indicators (
        benchmark_id,
        indicator_id,
        name,
        description,
        category,
        unit,
        value,
        percentage,
        sample_size,
        compatible_question_types,
        compatible_segments
    ) VALUES (
        v_benchmark_id,
        'acceso_smartphone',
        'Acceso a Smartphone',
        'Porcentaje de personas con acceso a smartphone',
        'Tecnología',
        'percentage',
        88.7,
        88.7,
        85000,
        ARRAY['single_choice'],
        ARRAY['nacional', 'regional']
    )
    ON CONFLICT (benchmark_id, indicator_id) DO UPDATE SET
        value = EXCLUDED.value,
        percentage = EXCLUDED.percentage,
        sample_size = EXCLUDED.sample_size,
        updated_at = NOW();
    
END $$;

-- ===========================================
-- Verificación
-- ===========================================
SELECT 
    b.name as benchmark_name,
    b.organization,
    b.year,
    b.status,
    COUNT(i.id) as total_indicators
FROM benchmarks b
LEFT JOIN benchmark_indicators i ON i.benchmark_id = b.id
WHERE b.source_id = 'casen_2022'
GROUP BY b.id, b.name, b.organization, b.year, b.status;
