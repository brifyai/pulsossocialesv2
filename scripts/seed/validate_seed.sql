-- ============================================================
-- VALIDACIÓN DEL SEED - Pulsos Sociales
-- Ejecutar después de correr los scripts de seed
-- ============================================================

-- 1. Conteo total de territories
SELECT 'TOTAL_TERRITORIES' as metric, COUNT(*) as count
FROM territories;

-- 2. Conteo total de synthetic_agents
SELECT 'TOTAL_AGENTS' as metric, COUNT(*) as count
FROM synthetic_agents;

-- 3. Agentes con territory válido (FK integrity)
SELECT 'AGENTS_WITH_VALID_TERRITORY' as metric, COUNT(*) as count
FROM synthetic_agents
WHERE territory_id IS NOT NULL;

-- 4. Agentes sin territory (huérfanos)
SELECT 'ORPHAN_AGENTS' as metric, COUNT(*) as count
FROM synthetic_agents
WHERE territory_id IS NULL;

-- 5. Verificación de integridad referencial completa
SELECT 'FK_INTEGRITY_CHECK' as metric,
       CASE
         WHEN COUNT(*) = 0 THEN 'PASSED - All agents have valid territory'
         ELSE 'FAILED - ' || COUNT(*) || ' orphan agents found'
       END as result
FROM synthetic_agents sa
LEFT JOIN territories t ON sa.territory_id = t.id
WHERE sa.territory_id IS NOT NULL AND t.id IS NULL;

-- 6. Muestra de territories cargados
SELECT 'SAMPLE_TERRITORIES' as section,
       region_code,
       region_name,
       comuna_code,
       population_total
FROM territories
ORDER BY region_code
LIMIT 5;

-- 7. Muestra de agents cargados con info de territory
SELECT 'SAMPLE_AGENTS' as section,
       sa.agent_id,
       sa.sex,
       sa.age,
       sa.age_group,
       sa.income_decile,
       sa.connectivity_level,
       t.region_name
FROM synthetic_agents sa
LEFT JOIN territories t ON sa.territory_id = t.id
LIMIT 5;

-- 8. Distribución de agents por región
SELECT 'AGENTS_BY_REGION' as section,
       t.region_code,
       t.region_name,
       COUNT(*) as agent_count
FROM synthetic_agents sa
JOIN territories t ON sa.territory_id = t.id
GROUP BY t.region_code, t.region_name
ORDER BY agent_count DESC;

-- 9. Resumen de calidad de datos
SELECT 'DATA_QUALITY_SUMMARY' as section,
       'Age range: ' || MIN(age) || ' - ' || MAX(age) as age_range,
       'Income deciles: ' || COUNT(DISTINCT income_decile) || '/10' as income_coverage,
       'Connectivity levels: ' || COUNT(DISTINCT connectivity_level) as connectivity_variety
FROM synthetic_agents;
