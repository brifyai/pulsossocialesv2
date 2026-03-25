-- =============================================================================
-- VERIFICACIÓN DE COORDENADAS DE AGENTES
-- Script para verificar si los 25,000 agentes tienen coordenadas GPS asignadas
-- =============================================================================

-- 1. Contar agentes totales y con/sin coordenadas
SELECT 
    COUNT(*) as total_agents,
    COUNT(location_lat) as with_coordinates,
    COUNT(*) - COUNT(location_lat) as without_coordinates,
    ROUND(COUNT(location_lat) * 100.0 / COUNT(*), 2) as percentage_with_coords
FROM synthetic_agents;

-- 2. Verificar distribución por región (solo agentes con coordenadas)
SELECT 
    region_code,
    COUNT(*) as total,
    COUNT(location_lat) as with_coords,
    COUNT(*) - COUNT(location_lat) as without_coords
FROM synthetic_agents
GROUP BY region_code
ORDER BY region_code;

-- 3. Verificar rango de coordenadas (deberían estar en Chile)
SELECT 
    MIN(location_lat) as min_lat,
    MAX(location_lat) as max_lat,
    MIN(location_lng) as min_lng,
    MAX(location_lng) as max_lng
FROM synthetic_agents
WHERE location_lat IS NOT NULL;

-- 4. Muestra de 5 agentes con coordenadas
SELECT 
    agent_id,
    region_code,
    comuna_code,
    location_lat,
    location_lng,
    age,
    sex
FROM synthetic_agents
WHERE location_lat IS NOT NULL
LIMIT 5;

-- 5. Si no hay coordenadas, verificar si tenemos comuna_codes para asignarlas
SELECT 
    COUNT(*) as total,
    COUNT(comuna_code) as with_comuna_code,
    COUNT(DISTINCT comuna_code) as unique_comunas
FROM synthetic_agents
WHERE location_lat IS NULL;
