# Instrucciones para Cargar los 25,000 Agentes en Supabase

## 📋 Resumen

- **Total de agentes:** 25,000
- **Archivos SQL:** 50 batches (500 agentes cada uno)
- **Ubicación original:** `/Users/camiloalegria/Desktop/AIntelligence/Simulador 1MM usuarios/output/sql_batches/`
- **Batch ID:** `BATCH-V4-1-20250318`
- **Versión:** `v4.1.0`

---

## 🚀 Método 1: Carga Manual en Supabase Studio (Recomendado)

### Paso 1: Actualizar el Schema

1. Ve a tu proyecto Supabase: `https://supabase.com/dashboard/project/_/sql`
2. Copia y pega el contenido de `05-update-agents-schema.sql`
3. Ejecuta (botón "Run")

Esto añade las columnas faltantes:
- `country_code`, `region_code`, `comuna_code`
- `urbanicity`, `household_type`, `poverty_status`
- `digital_exposure_level`, `preferred_survey_channel`
- Y más campos necesarios

### Paso 2: Cargar los Agentes

Los archivos SQL originales están en:
```
/Users/camiloalegria/Desktop/AIntelligence/Simulador 1MM usuarios/output/sql_batches/
```

**Para cada archivo (001 al 050):**

1. Abre el archivo (ej: `insert_agents_batch_001.sql`)
2. Copia TODO el contenido
3. Ve a Supabase Studio → SQL Editor
4. Pega el contenido
5. Ejecuta (botón "Run")
6. Espera confirmación de "Success"
7. Repite con el siguiente archivo

**⚠️ Importante:**
- Carga los archivos en orden (001, 002, 003...)
- No carges múltiples archivos a la vez
- Si hay error, anota el archivo y continúa con el siguiente

---

## 🖥️ Método 2: Carga con psql (Si tienes acceso local)

```bash
# Configura la URL de tu base de datos
export SUPABASE_DB_URL="postgresql://postgres:[PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres"

# Ve al directorio con los archivos SQL
cd "/Users/camiloalegria/Desktop/AIntelligence/Simulador 1MM usuarios/output/sql_batches/"

# Carga todos los batches automáticamente
for file in insert_agents_batch_*.sql; do
    echo "Cargando: $file"
    psql "$SUPABASE_DB_URL" -f "$file"
done
```

---

## 🔧 Método 3: Script Automatizado

Usa el script bash incluido:

```bash
cd "/Users/camiloalegria/Desktop/AIntelligence/Simulador 1MM usuarios/output/sql_batches/"
chmod +x ejecutar_todos.sh
./ejecutar_todos.sh
```

---

## ✅ Verificación Post-Carga

Ejecuta estas consultas en Supabase SQL Editor:

```sql
-- 1. Contar registros totales
SELECT COUNT(*) as total_agentes FROM synthetic_agents;
-- Resultado esperado: 25000

-- 2. Verificar batch_id
SELECT batch_id, COUNT(*) as cantidad
FROM synthetic_agents
GROUP BY batch_id;
-- Resultado esperado: BATCH-V4-1-20250318 | 25000

-- 3. Verificar distribución por región
SELECT region_code, COUNT(*) as agentes
FROM synthetic_agents
GROUP BY region_code
ORDER BY region_code;

-- 4. Verificar primeros registros
SELECT agent_id, region_code, comuna_code, sex, age, education_level
FROM synthetic_agents
ORDER BY created_at DESC
LIMIT 10;

-- 5. Verificar rangos de edad
SELECT age_group, COUNT(*) as cantidad
FROM synthetic_agents
GROUP BY age_group
ORDER BY cantidad DESC;

-- 6. Verificar niveles de educación
SELECT education_level, COUNT(*) as cantidad
FROM synthetic_agents
GROUP BY education_level
ORDER BY cantidad DESC;
```

---

## 📁 Archivos Disponibles

```
/Users/camiloalegria/Desktop/AIntelligence/Simulador 1MM usuarios/output/sql_batches/
├── insert_agents_batch_001.sql  (500 registros)
├── insert_agents_batch_002.sql  (500 registros)
├── insert_agents_batch_003.sql  (500 registros)
├── ...
├── insert_agents_batch_050.sql  (500 registros)
├── ejecutar_todos.sh            (script bash)
└── GUIA_CARGA_SUPABASE.md       (guía detallada)
```

---

## 🆘 Solución de Problemas

### Error: "column does not exist"
**Solución:** Asegúrate de ejecutar primero `05-update-agents-schema.sql`

### Error: "value too long for type"
**Solución:** Los archivos ya fueron corregidos. Si persiste, verifica que ejecutaste el schema update.

### Error: "duplicate key value violates unique constraint"
**Solución:** Los agentes ya fueron cargados. Verifica con: `SELECT COUNT(*) FROM synthetic_agents;`

### Error: "check constraint violated"
**Solución:** Verifica que ejecutaste `05-update-agents-schema.sql` para actualizar los constraints.

---

## 📊 Estructura de los Datos

Cada agente incluye:
- **Identificación:** `agent_id`, `batch_id`, `version`
- **Ubicación:** `country_code`, `region_code`, `comuna_code`, `urbanicity`
- **Demografía:** `sex`, `age`, `age_group`
- **Socioeconómico:** `education_level`, `poverty_status`, `household_type`
- **Digital:** `connectivity_level`, `digital_exposure_level`, `preferred_survey_channel`
- **Timestamps:** `created_at`, `updated_at`

---

## 📝 Notas

- Los archivos SQL ya tienen los valores corregidos (`no_especificado` → `none`)
- Los NULL están correctamente formateados
- Los timestamps fueron generados el 18 de Marzo, 2026
- Todos los agentes son de Chile (`country_code = 'CL'`)

---

**¿Necesitas ayuda?** Revisa la guía completa en:
`/Users/camiloalegria/Desktop/AIntelligence/Simulador 1MM usuarios/output/sql_batches/GUIA_CARGA_SUPABASE.md`
