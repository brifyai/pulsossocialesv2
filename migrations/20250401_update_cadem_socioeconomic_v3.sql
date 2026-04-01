-- Migración V3: Ajustar ABC1 a rango 8-12%
-- El V2 fue demasiado restrictivo (0.88%), esta versión expande ABC1

-- Primero, resetear todos los valores
UPDATE synthetic_agents 
SET cadem_socioeconomic_level = NULL;

-- ABC1: Decil 10 (todos) + Decil 9 con educación universitaria/postgrado
-- Esto debería dar ~8-12% de ABC1
UPDATE synthetic_agents 
SET cadem_socioeconomic_level = 'ABC1'
WHERE income_decile = 10 
   OR (income_decile = 9 AND education_level IN ('university', 'postgraduate'));

-- C2: Decil 9 (sin educación univ) + Deciles 7-8 con educación universitaria
UPDATE synthetic_agents 
SET cadem_socioeconomic_level = 'C2'
WHERE cadem_socioeconomic_level IS NULL
  AND (
    income_decile = 9
    OR (income_decile IN (7, 8) AND education_level IN ('university', 'postgraduate'))
  );

-- C3: Deciles 7-8 (sin educación univ) + Deciles 5-6
UPDATE synthetic_agents 
SET cadem_socioeconomic_level = 'C3'
WHERE cadem_socioeconomic_level IS NULL
  AND (
    income_decile IN (7, 8)
    OR income_decile IN (5, 6)
  );

-- D: Deciles 3-4
UPDATE synthetic_agents 
SET cadem_socioeconomic_level = 'D'
WHERE cadem_socioeconomic_level IS NULL
  AND income_decile IN (3, 4);

-- E: Deciles 1-2
UPDATE synthetic_agents 
SET cadem_socioeconomic_level = 'E'
WHERE cadem_socioeconomic_level IS NULL
  AND income_decile IN (1, 2);

-- Para agentes sin income_decile, usar educación como proxy
UPDATE synthetic_agents 
SET cadem_socioeconomic_level = 'ABC1'
WHERE cadem_socioeconomic_level IS NULL
  AND income_decile IS NULL
  AND education_level = 'postgraduate';

UPDATE synthetic_agents 
SET cadem_socioeconomic_level = 'C2'
WHERE cadem_socioeconomic_level IS NULL
  AND income_decile IS NULL
  AND education_level = 'university';

UPDATE synthetic_agents 
SET cadem_socioeconomic_level = 'C3'
WHERE cadem_socioeconomic_level IS NULL
  AND income_decile IS NULL
  AND education_level = 'technical';

UPDATE synthetic_agents 
SET cadem_socioeconomic_level = 'D'
WHERE cadem_socioeconomic_level IS NULL
  AND income_decile IS NULL
  AND education_level = 'secondary';

UPDATE synthetic_agents 
SET cadem_socioeconomic_level = 'E'
WHERE cadem_socioeconomic_level IS NULL
  AND income_decile IS NULL
  AND education_level IN ('primary', 'none');

-- Default para cualquier caso restante
UPDATE synthetic_agents 
SET cadem_socioeconomic_level = 'D'
WHERE cadem_socioeconomic_level IS NULL;

-- Verificar distribución
SELECT 
  'CADEM Socioeconomic Distribution (V3 - Ajustado)' as metric,
  cadem_socioeconomic_level as level,
  COUNT(*) as count,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER(), 2) as percentage
FROM synthetic_agents
GROUP BY cadem_socioeconomic_level
ORDER BY 
  CASE cadem_socioeconomic_level
    WHEN 'ABC1' THEN 1
    WHEN 'C2' THEN 2
    WHEN 'C3' THEN 3
    WHEN 'D' THEN 4
    WHEN 'E' THEN 5
  END;
