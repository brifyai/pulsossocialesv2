-- ============================================================================
-- Migración: Agregar TODOS los campos faltantes a synthetic_agents
-- Fecha: 24 de marzo de 2026
-- Descripción: Completa la tabla synthetic_agents con todos los campos
--              definidos en el tipo TypeScript DbSyntheticAgent
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. CAMPOS CRÍTICOS (Primary Key y Foreign Keys)
-- ----------------------------------------------------------------------------

-- Nota: El campo 'id' como UUID primary key ya debería existir
-- Si no existe, descomentar la siguiente línea:
-- ALTER TABLE synthetic_agents ADD COLUMN IF NOT EXISTS id UUID PRIMARY KEY DEFAULT gen_random_uuid();

-- Foreign Key a territories
ALTER TABLE synthetic_agents 
ADD COLUMN IF NOT EXISTS territory_id UUID REFERENCES territories(id) ON DELETE SET NULL;

-- Crear índice para mejorar performance de joins
CREATE INDEX IF NOT EXISTS idx_synthetic_agents_territory_id 
ON synthetic_agents(territory_id);

-- ----------------------------------------------------------------------------
-- 2. CAMPOS DEMOGRÁFICOS
-- ----------------------------------------------------------------------------

-- Tamaño del hogar (número de personas)
ALTER TABLE synthetic_agents 
ADD COLUMN IF NOT EXISTS household_size INTEGER CHECK (household_size > 0 AND household_size <= 20);

-- ----------------------------------------------------------------------------
-- 3. CAMPOS SOCIOECONÓMICOS
-- ----------------------------------------------------------------------------

-- Nivel socioeconómico (low, medium, high)
ALTER TABLE synthetic_agents 
ADD COLUMN IF NOT EXISTS socioeconomic_level VARCHAR(20) CHECK (socioeconomic_level IN ('low', 'medium', 'high'));

-- Grupo ocupacional (más específico que occupation_status)
ALTER TABLE synthetic_agents 
ADD COLUMN IF NOT EXISTS occupation_group VARCHAR(50);

-- ----------------------------------------------------------------------------
-- 4. CAMPOS DE CLASIFICACIÓN
-- ----------------------------------------------------------------------------

-- Tipo de agente para comportamiento específico
ALTER TABLE synthetic_agents 
ADD COLUMN IF NOT EXISTS agent_type VARCHAR(20) CHECK (agent_type IN ('resident', 'retiree', 'student', 'entrepreneur', 'worker'));

-- Crear índice para filtros por tipo de agente
CREATE INDEX IF NOT EXISTS idx_synthetic_agents_agent_type 
ON synthetic_agents(agent_type);

-- ----------------------------------------------------------------------------
-- 5. CAMPOS DE TRACEABILIDAD (Data Pipeline)
-- ----------------------------------------------------------------------------

-- Referencia a la población backbone usada para generar el agente
ALTER TABLE synthetic_agents 
ADD COLUMN IF NOT EXISTS backbone_key VARCHAR(100);

-- Referencia al perfil SUBTEL usado
ALTER TABLE synthetic_agents 
ADD COLUMN IF NOT EXISTS subtel_profile_key VARCHAR(100);

-- Referencia al perfil CASEN usado
ALTER TABLE synthetic_agents 
ADD COLUMN IF NOT EXISTS casen_profile_key VARCHAR(100);

-- Notas sobre la generación del agente
ALTER TABLE synthetic_agents 
ADD COLUMN IF NOT EXISTS generation_notes TEXT;

-- ----------------------------------------------------------------------------
-- 6. ACTUALIZAR DATOS EXISTENTES (si hay registros previos)
-- ----------------------------------------------------------------------------

-- Actualizar territory_id basado en comuna_code
UPDATE synthetic_agents sa
SET territory_id = t.id
FROM territories t
WHERE sa.territory_id IS NULL 
  AND t.code = sa.comuna_code
  AND t.level = 'comuna';

-- Extraer socioeconomic_level desde metadata JSONB si existe
UPDATE synthetic_agents
SET socioeconomic_level = metadata->>'socioeconomic_level'
WHERE socioeconomic_level IS NULL 
  AND metadata ? 'socioeconomic_level';

-- Asignar agent_type basado en edad y ocupación
UPDATE synthetic_agents
SET agent_type = CASE
    WHEN age < 18 THEN 'student'
    WHEN age >= 65 THEN 'retiree'
    WHEN occupation_status = 'self_employed' OR occupation_status = 'employed' THEN 'worker'
    ELSE 'resident'
END
WHERE agent_type IS NULL;

-- ----------------------------------------------------------------------------
-- 7. VERIFICACIÓN
-- ----------------------------------------------------------------------------

-- Verificar que todos los campos fueron agregados
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'synthetic_agents'
ORDER BY ordinal_position;

-- ----------------------------------------------------------------------------
-- 8. ÍNDICES ADICIONALES RECOMENDADOS
-- ----------------------------------------------------------------------------

-- Índice compuesto para consultas frecuentes por región y comuna
CREATE INDEX IF NOT EXISTS idx_synthetic_agents_region_comuna 
ON synthetic_agents(region_code, comuna_code);

-- Índice para filtros por nivel socioeconómico
CREATE INDEX IF NOT EXISTS idx_synthetic_agents_ses 
ON synthetic_agents(socioeconomic_level);

-- Índice para búsquedas por backbone_key (debugging)
CREATE INDEX IF NOT EXISTS idx_synthetic_agents_backbone 
ON synthetic_agents(backbone_key);

-- ============================================================================
-- FIN DE LA MIGRACIÓN
-- ============================================================================
