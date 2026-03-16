# 🌱 Database Seed Scripts - Pulsos Sociales

Scripts para cargar datos iniciales (seed) en la base de datos Supabase.

## 📁 Archivos

| Archivo | Descripción |
|---------|-------------|
| `run_seed.ts` | Script principal - ejecuta todo el seed en orden |
| `seed_territories.ts` | Carga las 16 regiones de Chile en `territories` |
| `seed_agents.ts` | Carga 1,400 agentes sintéticos en `synthetic_agents` |

## 🗂️ Fuentes de Datos

- **Territories**: `data/processed/territories_master.json` (16 regiones)
- **Agents**: `data/processed/synthetic_agents_v1.json` (1,400 agentes)

## 🚀 Uso

### Opción 1: Script Completo (Recomendado)

```bash
# Configurar variables de entorno
export SUPABASE_URL="https://supabase.pulsossociales.com"
export SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIs..."

# Ejecutar seed completo
npx ts-node scripts/seed/run_seed.ts
```

### Opción 2: Scripts Individuales

```bash
# Solo territories
npx ts-node scripts/seed/seed_territories.ts

# Solo agents (requiere que territories ya esté poblado)
npx ts-node scripts/seed/seed_agents.ts
```

## 📊 Mapeo de Datos

### Territories

| JSON Field | DB Column | Transformación |
|------------|-----------|----------------|
| `code` | `comuna_code` | Usado como identificador único |
| `code` | `region_code` | Mapeado a CL-XX (ej: RM → CL-13) |
| `name` | `region_name` | Nombre completo de la región |
| `population` | `population_total` | Directo |
| - | `country_code` | Siempre "CL" |
| - | `source_year` | 2017 |

### Synthetic Agents

| JSON Field | DB Column | Transformación |
|------------|-----------|----------------|
| `agent_id` | `agent_id` | Directo (ej: AGT-RM-000001) |
| `synthetic_batch_id` | `batch_id` | Directo |
| `region_code` | `territory_id` | Lookup en tabla territories |
| `sex` | `sex` | Directo (male/female) |
| `age` | `age` | Directo |
| `age_group` | `age_group` | Mapeado a enum válido |
| `income_decile` | `income_decile` | Directo (1-10) |
| `education_level` | `education_level` | Mapeado a enum |
| `occupation_status` | `employment_status` | Directo |
| `connectivity_level` | `connectivity_level` | Mapeado (very_high → high) |
| - | `has_smartphone` | true si connectivity ≥ high |
| - | `has_computer` | true si connectivity ≥ high |
| `backbone_key` | `backbone_key` | Directo |
| - | `metadata` | JSON con campos adicionales |

## 🔗 Relaciones Foreign Key

```
synthetic_agents.territory_id → territories.id
```

- Cada agente está vinculado a una región
- Los agentes sin territorio válido se insertan con `territory_id = NULL`
- El script verifica que todas las FK sean válidas

## ✅ Validación

El script automáticamente verifica:

1. **Territories**: 16 filas insertadas (una por región)
2. **Agents**: 1,400 filas insertadas
3. **FK Integrity**: Todos los agentes tienen territorio válido
4. **Datos**: Muestra muestra de registros insertados

## 🔄 Reproducibilidad

Para re-ejecutar el seed:

```bash
# Truncar tablas primero (opcional)
psql $DATABASE_URL -c "TRUNCATE synthetic_agents, territories CASCADE;"

# Re-ejecutar seed
npx ts-node scripts/seed/run_seed.ts
```

## 📝 Notas

- Los scripts usan `upsert` para evitar duplicados
- Los datos se insertan en batches (10 territories, 100 agents)
- Se requieren credenciales de Supabase con permisos de escritura
- El SERVICE_ROLE_KEY es necesario para ignorar RLS policies

## 🐛 Troubleshooting

### Error: "Failed to load territories"
- Verifica que el archivo `data/processed/territories_master.json` existe
- Verifica que la tabla `territories` existe en la base de datos

### Error: "Missing Supabase credentials"
- Configura las variables de entorno SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY
- O usa VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY

### Agents sin territory
- Esto es normal si el código de región en agents no existe en territories
- El script reporta cuántos agentes quedaron sin vinculación

## 📈 Resultados Esperados

```
╔════════════════════════════════════════════════════════════════╗
║                      SEED SUMMARY                              ║
╠════════════════════════════════════════════════════════════════╣
║  Territories inserted:      16                                 ║
║  Agents inserted:         1400                                 ║
║  Agents w/o territory:       0                                 ║
║  Total errors:               0                                 ║
╚════════════════════════════════════════════════════════════════╝
```
