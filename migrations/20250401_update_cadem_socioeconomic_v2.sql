-- Migración para actualizar cadem_socioeconomic_level con algoritmo ajustado
-- ABC1 ahora solo para decil 10 + educación universitaria/postgrado
-- Esto reduce ABC1 de ~15% a ~8-10%, más cercano a la realidad chilena

-- Primero, resetear todos los valores
UPDATE synthetic_agents 
SET cadem_socioeconomic_level = NULL;

-- Actualizar ABC1: Decil 10 + educación universitaria/postgrado
UPDATE synthetic_agents 
SET cadem_socioeconomic_level = 'ABC1'
WHERE income_decile = 10 
  AND education_level IN ('university', 'postgraduate');

-- Actualizar C2: Decil 10 sin educación universitaria + Decil 9
UPDATE synthetic_agents 
SET cadem_socioeconomic_level = 'C2'
WHERE cadem_socioeconomic_level IS NULL
  AND (
    (income_decile = 10 AND education_level NOT IN ('university', 'postgraduate'))
    OR income_decile = 9
    OR (income_decile IN (7, 8) AND education_level IN ('university', 'postgraduate'))
  );

-- Actualizar C3: Deciles 7-8 sin educación universitaria + Deciles 5-6
UPDATE synthetic_agents 
SET cadem_socioeconomic_level = 'C3'
WHERE cadem_socioeconomic_level IS NULL
  AND (
    (income_decile IN (7, 8) AND education_level NOT IN ('university', 'postgraduate'))
    OR income_decile IN (5, 6)
  );

-- Actualizar D: Deciles 3-4
UPDATE synthetic_agents 
SET cadem_socioeconomic_level = 'D'
WHERE cadem_socioeconomic_level IS NULL
  AND income_decile IN (3, 4);

-- Actualizar E: Deciles 1-2
UPDATE synthetic_agents 
SET cadem_socioeconomic_level = 'E'
WHERE cadem_socioeconomic_level IS NULL
  AND income_decile IN (1, 2);

-- Para agentes sin income_decile, usar educación como proxy
UPDATE synthetic_agents 
SET cadem_socioeconomic_level = 'C2'
WHERE cadem_socioeconomic_level IS NULL
  AND income_decile IS NULL
  AND education_level IN ('university', 'postgraduate');

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
  'CADEM Socioeconomic Distribution (V2 - Ajustado)' as metric,
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
