-- ============================================================================
-- MIGRACIÓN: Corregir códigos de comuna en agentes sintéticos
-- ============================================================================
-- Los agentes tienen códigos incorrectos (01001-01009) que no existen
-- Se actualizan a los códigos oficiales según el diccionario de comunas

-- 1. Crear tabla temporal de mapeo
CREATE TEMP TABLE comuna_code_mapping (
    old_code TEXT PRIMARY KEY,
    new_code TEXT NOT NULL,
    comuna_name TEXT
);

-- 2. Insertar mapeos según el diccionario oficial
-- Región de Tarapacá (01)
INSERT INTO comuna_code_mapping (old_code, new_code, comuna_name) VALUES
    ('01001', '01101', 'Iquique'),
    ('01002', '01102', 'Alto Hospicio'),
    ('01003', '01107', 'Pica'),
    ('01004', '01201', 'Pozo Almonte'),
    ('01005', '01202', 'María Elena'),
    ('01006', '01203', 'Sierra Gorda'),
    ('01007', '01204', 'Calama'),
    ('01008', '01401', 'Ollagüe'),
    ('01009', '01402', 'San Pedro de Atacama');

-- 3. Actualizar los códigos de comuna en la tabla synthetic_agents
UPDATE synthetic_agents sa
SET 
    comuna_code = m.new_code
FROM comuna_code_mapping m
WHERE sa.comuna_code = m.old_code;

-- 4. Verificar cuántos registros se actualizaron
SELECT 
    'Registros actualizados' as descripcion,
    COUNT(*) as cantidad
FROM synthetic_agents sa
JOIN comuna_code_mapping m ON sa.comuna_code = m.new_code;

-- 5. Limpiar tabla temporal
DROP TABLE comuna_code_mapping;

-- 6. Verificar distribución de códigos después de la actualización
SELECT 
    comuna_code,
    COUNT(*) as cantidad_agentes
FROM synthetic_agents
GROUP BY comuna_code
ORDER BY comuna_code;
