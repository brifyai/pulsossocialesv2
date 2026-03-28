# Instrucciones para Ejecutar Migraciones Manualmente

## Estado Actual

Las migraciones SQL han sido corregidas para incluir Foreign Keys a `synthetic_agents(agent_id)`.

✅ **Verificación previa completada:**
- `agent_id` en `synthetic_agents` es ÚNICO (25,000 registros, 0 duplicados)
- Las tablas `agent_topic_state` y `agent_panel_state` están listas para crearse con FKs

## Archivos de Migración

### 1. `migrations/20260326_create_agent_topic_state.sql`
Crea la tabla para persistir estados de topics por agente.

**Características:**
- FK: `agent_id` → `synthetic_agents(agent_id)` con `ON DELETE CASCADE`
- PK compuesta: `(agent_id, topic)`
- Constraints de rango para scores, confidence, salience, volatility
- Índices optimizados para queries frecuentes
- RLS habilitado con políticas para authenticated y anon

### 2. `migrations/20260326_create_agent_panel_state.sql`
Crea la tabla para persistir estado del panel por agente.

**Características:**
- FK: `agent_id` → `synthetic_agents(agent_id)` con `ON DELETE CASCADE`
- PK: `agent_id` (1:1 con agentes)
- Constraints de rango para propensity, fatigue, quality_score
- Índices optimizados
- RLS habilitado con políticas para authenticated y anon

## Instrucciones de Ejecución

### Paso 1: Acceder al SQL Editor de Supabase

1. Ve a: https://supabase.pulsossociales.com
2. Inicia sesión con tus credenciales
3. Navega a: **SQL Editor** → **New query**

### Paso 2: Ejecutar Migración 1 (agent_topic_state)

Copia y pega el siguiente SQL:

```sql
-- Migration: Create agent_topic_state table
-- CADEM Opinion Engine v1.1 - Persistencia de estados de topic
-- CORREGIDO: Agregada FK a synthetic_agents(agent_id)

CREATE TABLE IF NOT EXISTS agent_topic_state (
  agent_id TEXT NOT NULL REFERENCES synthetic_agents(agent_id) ON DELETE CASCADE,
  topic TEXT NOT NULL,
  score FLOAT NOT NULL,
  confidence FLOAT NOT NULL DEFAULT 0.5,
  salience FLOAT NOT NULL DEFAULT 0.5,
  volatility FLOAT NOT NULL DEFAULT 0.3,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  PRIMARY KEY (agent_id, topic),

  -- Constraints
  CONSTRAINT chk_score CHECK (score >= -1 AND score <= 1),
  CONSTRAINT chk_confidence CHECK (confidence >= 0 AND confidence <= 1),
  CONSTRAINT chk_salience CHECK (salience >= 0 AND salience <= 1),
  CONSTRAINT chk_volatility CHECK (volatility >= 0 AND volatility <= 1)
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_agent_topic_agent ON agent_topic_state(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_topic_topic ON agent_topic_state(topic);
CREATE INDEX IF NOT EXISTS idx_agent_topic_updated ON agent_topic_state(updated_at);

-- Enable RLS
ALTER TABLE agent_topic_state ENABLE ROW LEVEL SECURITY;

-- Policy: Allow all operations for authenticated users
CREATE POLICY "Allow all operations for authenticated users"
  ON agent_topic_state
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Policy: Allow read for anonymous users
CREATE POLICY "Allow read for anonymous users"
  ON agent_topic_state
  FOR SELECT
  TO anon
  USING (true);
```

Haz clic en **Run**.

### Paso 3: Ejecutar Migración 2 (agent_panel_state)

Copia y pega el siguiente SQL:

```sql
-- Migration: Create agent_panel_state table
-- CADEM Opinion Engine v1.1 - Persistencia de estado del panel
-- CORREGIDO: Agregada FK a synthetic_agents(agent_id)

CREATE TABLE IF NOT EXISTS agent_panel_state (
  agent_id TEXT PRIMARY KEY REFERENCES synthetic_agents(agent_id) ON DELETE CASCADE,
  eligible_web BOOLEAN DEFAULT true,
  participation_propensity FLOAT DEFAULT 0.5,
  panel_fatigue FLOAT DEFAULT 0.0,
  quality_score FLOAT DEFAULT 0.8,
  cooldown_until TIMESTAMP WITH TIME ZONE,
  invites_30d INTEGER DEFAULT 0,
  completions_30d INTEGER DEFAULT 0,
  last_invited_at TIMESTAMP WITH TIME ZONE,
  last_completed_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Constraints
  CONSTRAINT chk_propensity CHECK (participation_propensity >= 0 AND participation_propensity <= 1),
  CONSTRAINT chk_fatigue CHECK (panel_fatigue >= 0 AND panel_fatigue <= 1),
  CONSTRAINT chk_quality CHECK (quality_score >= 0 AND quality_score <= 1)
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_panel_eligible ON agent_panel_state(eligible_web);
CREATE INDEX IF NOT EXISTS idx_panel_fatigue ON agent_panel_state(panel_fatigue);
CREATE INDEX IF NOT EXISTS idx_panel_updated ON agent_panel_state(updated_at);

-- Enable RLS
ALTER TABLE agent_panel_state ENABLE ROW LEVEL SECURITY;

-- Policy: Allow all operations for authenticated users
CREATE POLICY "Allow all operations for authenticated users"
  ON agent_panel_state
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Policy: Allow read for anonymous users
CREATE POLICY "Allow read for anonymous users"
  ON agent_panel_state
  FOR SELECT
  TO anon
  USING (true);
```

Haz clic en **Run**.

### Paso 4: Verificar la Creación

Ejecuta este SQL para verificar que las tablas se crearon correctamente:

```sql
-- Verificar tablas creadas
SELECT 
  table_name,
  EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE table_name = 'agent_topic_state' 
    AND constraint_type = 'FOREIGN KEY'
  ) as has_fk_topic,
  EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE table_name = 'agent_panel_state' 
    AND constraint_type = 'FOREIGN KEY'
  ) as has_fk_panel
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('agent_topic_state', 'agent_panel_state');
```

Deberías ver:
```
table_name          | has_fk_topic | has_fk_panel
--------------------+--------------+--------------
agent_topic_state   | true         | 
agent_panel_state   |              | true
```

## Solución de Problemas

### Error: "relation synthetic_agents does not exist"
**Solución:** Asegúrate de que la tabla `synthetic_agents` exista antes de ejecutar estas migraciones.

### Error: "duplicate key value violates unique constraint"
**Solución:** Si hay duplicados en `agent_id`, ejecuta primero el script de verificación:
```bash
npx tsx scripts/verify_agent_id_uniqueness.ts
```

### Error: "cannot create foreign key - referenced column is not unique"
**Solución:** Asegúrate de que `agent_id` en `synthetic_agents` sea único. El script de verificación confirmó que lo es.

## Notas Importantes

1. **ON DELETE CASCADE**: Si un agente se elimina de `synthetic_agents`, sus estados se eliminarán automáticamente.

2. **RLS Habilitado**: Las tablas tienen Row Level Security activado con políticas:
   - `authenticated`: Puede hacer todas las operaciones (CRUD)
   - `anon`: Solo puede leer (SELECT)

3. **Constraints**: Los valores de score, confidence, etc. están validados en el rango correcto.

4. **Índices**: Se crearon índices para optimizar las queries más frecuentes.

## Próximos Pasos

Una vez ejecutadas las migraciones:

1. ✅ Verificar que las tablas existen con FKs
2. 🔄 Ejecutar `scripts/staging/verifyPersistence.ts` para validar persistencia
3. 🔄 Ejecutar `scripts/staging/runStagingValidationSurvey.ts` para probar el flujo completo
4. 🔄 Revisar `docs/cadem-v3/B2_LONGITUDINAL_TEST_PLAN.md` para el plan de pruebas longitudinales

---

**Fecha de creación:** 2026-03-27
**Versión:** CADEM Opinion Engine v1.1
