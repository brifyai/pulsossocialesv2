-- =============================================================================
-- VALIDACIÓN FINAL SPRINT 10A
-- Estado real de la base de datos después del seed
-- =============================================================================

-- 1. TOTAL REAL DE FILAS EN TERRITORIES
SELECT 'TOTAL_TERRITORIES' as metric, COUNT(*) as value FROM territories;

-- 2. TOTAL REAL DE FILAS EN SYNTHETIC_AGENTS
SELECT 'TOTAL_AGENTS' as metric, COUNT(*) as value FROM synthetic_agents;

-- 3. LISTA DE REGIONES PRESENTES EN TERRITORIES
SELECT 
    code,
    name,
    level,
    population_total,
    centroid::text as centroid_text
FROM territories 
WHERE level = 'region'
ORDER BY code;

-- 4. DISTRIBUCIÓN DE AGENTS POR REGIÓN
SELECT 
    t.code as region_code,
    t.name as region_name,
    COUNT(sa.id) as agent_count
FROM territories t
LEFT JOIN synthetic_agents sa ON sa.territory_id = t.id
WHERE t.level = 'region'
GROUP BY t.code, t.name
ORDER BY agent_count DESC;

-- 5. CONFIRMACIÓN DE ORPHAN AGENTS (agents sin territory válido)
SELECT 
    'ORPHAN_AGENTS' as metric,
    COUNT(*) as value
FROM synthetic_agents sa
WHERE sa.territory_id IS NULL
   OR NOT EXISTS (SELECT 1 FROM territories t WHERE t.id = sa.territory_id);

-- 6. RESUMEN EJECUTIVO
SELECT 
    'RESUMEN_SPRINT_10A' as section,
    (SELECT COUNT(*) FROM territories WHERE level = 'region') as total_regions,
    (SELECT COUNT(*) FROM synthetic_agents) as total_agents,
    (SELECT COUNT(*) FROM synthetic_agents sa 
     WHERE sa.territory_id IS NULL 
     OR NOT EXISTS (SELECT 1 FROM territories t WHERE t.id = sa.territory_id)) as orphan_agents,
    CASE 
        WHEN (SELECT COUNT(*) FROM synthetic_agents sa 
              WHERE sa.territory_id IS NULL 
              OR NOT EXISTS (SELECT 1 FROM territories t WHERE t.id = sa.territory_id)) = 0
        THEN '✅ SPRINT 10A COMPLETADO - Todos los agents tienen territory válido'
        ELSE '❌ SPRINT 10A INCOMPLETO - Existen agents sin territory válido'
    END as status;
