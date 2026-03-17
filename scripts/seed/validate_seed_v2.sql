-- =============================================================================
-- VALIDACIÓN DEL SEED - Modelo Alineado v2.0
-- Fecha: 2026-03-16
-- =============================================================================

-- =============================================================================
-- 1. VERIFICAR ESTRUCTURA DE LA TABLA
-- =============================================================================
\echo '=== 1. ESTRUCTURA DE LA TABLA TERRITORIES ==='

SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'territories'
ORDER BY ordinal_position;

-- =============================================================================
-- 2. CONTAR REGISTROS POR NIVEL
-- =============================================================================
\echo '\n=== 2. CONTEO POR NIVEL ==='

SELECT 
    level,
    COUNT(*) as count
FROM territories
GROUP BY level
ORDER BY level;

-- =============================================================================
-- 3. VERIFICAR CÓDIGOS CORTOS (RM, VA, etc.)
-- =============================================================================
\echo '\n=== 3. REGIONES CON CÓDIGOS CORTOS ==='

SELECT 
    code,
    name,
    population_total,
    centroid
FROM territories
WHERE level = 'region'
ORDER BY code;

-- =============================================================================
-- 4. VERIFICAR CENTROIDES
-- =============================================================================
\echo '\n=== 4. REGIONES CON CENTROIDES ==='

SELECT 
    code,
    name,
    centroid,
    CASE 
        WHEN centroid IS NOT NULL THEN '✓'
        ELSE '✗'
    END as has_centroid
FROM territories
WHERE level = 'region'
ORDER BY code;

-- =============================================================================
-- 5. VERIFICAR INTEGRIDAD REFERENCIAL (AGENTS -> TERRITORIES)
-- =============================================================================
\echo '\n=== 5. INTEGRIDAD REFERENCIAL ==='

SELECT 
    'Total Agents' as metric,
    COUNT(*)::text as value
FROM synthetic_agents

UNION ALL

SELECT 
    'Agents with valid territory_id' as metric,
    COUNT(*)::text as value
FROM synthetic_agents sa
WHERE EXISTS (
    SELECT 1 FROM territories t WHERE t.id = sa.territory_id
)

UNION ALL

SELECT 
    'Agents without territory' as metric,
    COUNT(*)::text as value
FROM synthetic_agents sa
WHERE NOT EXISTS (
    SELECT 1 FROM territories t WHERE t.id = sa.territory_id
);

-- =============================================================================
-- 6. DISTRIBUCIÓN DE AGENTES POR REGIÓN
-- =============================================================================
\echo '\n=== 6. AGENTES POR REGIÓN ==='

SELECT 
    t.code as region_code,
    t.name as region_name,
    COUNT(sa.id) as agent_count
FROM territories t
LEFT JOIN synthetic_agents sa ON sa.territory_id = t.id
WHERE t.level = 'region'
GROUP BY t.code, t.name
ORDER BY t.code;

-- =============================================================================
-- 7. ESTADÍSTICAS GENERALES
-- =============================================================================
\echo '\n=== 7. ESTADÍSTICAS GENERALES ==='

SELECT 
    'Total Territories' as metric,
    COUNT(*)::text as value
FROM territories

UNION ALL

SELECT 
    'Total Regions' as metric,
    COUNT(*)::text as value
FROM territories WHERE level = 'region'

UNION ALL

SELECT 
    'Total Comunas' as metric,
    COUNT(*)::text as value
FROM territories WHERE level = 'comuna'

UNION ALL

SELECT 
    'Total Agents' as metric,
    COUNT(*)::text as value
FROM synthetic_agents

UNION ALL

SELECT 
    'Total Population (territories)' as metric,
    TO_CHAR(SUM(population_total), 'FM999,999,999') as value
FROM territories WHERE level = 'region';

-- =============================================================================
-- 8. VERIFICAR VISTA region_summary
-- =============================================================================
\echo '\n=== 8. VISTA region_summary ==='

SELECT * FROM region_summary;

-- =============================================================================
-- 9. VALIDACIÓN DE CÓDIGOS ÚNICOS
-- =============================================================================
\echo '\n=== 9. VALIDACIÓN DE UNICIDAD (code, level) ==='

SELECT 
    code,
    level,
    COUNT(*) as duplicate_count
FROM territories
GROUP BY code, level
HAVING COUNT(*) > 1;

-- Si no hay resultados, la constraint UNIQUE funciona correctamente
\echo '\n✓ Si no hay resultados arriba, la constraint UNIQUE funciona correctamente.'

-- =============================================================================
-- FIN DE VALIDACIÓN
-- =============================================================================
