# Alineación del Modelo de Territorios - v2.0

**Fecha:** 2026-03-16  
**Estado:** ✅ COMPLETADO  
**Versión:** Modelo Alineado v2.0

---

## Resumen Ejecutivo

Se completó la alineación del modelo de territorios entre:
- **Pipeline de datos** (`territories_master.json`)
- **Schema SQL de Supabase** (`deploy/init/01-schema.sql`)
- **Tipos TypeScript** (`src/types/database.ts`)
- **Repository** (`src/services/supabase/repositories/territoryRepository.ts`)

---

## Cambios Realizados

### 1. Schema SQL (`deploy/init/01-schema.sql`)

**Antes:**
```sql
-- Campos antiguos
region_code VARCHAR(10) NOT NULL,      -- 'CL-13'
region_name VARCHAR(100) NOT NULL,     -- 'Metropolitana'
comuna_code VARCHAR(10) NOT NULL,      -- '13101'
comuna_name VARCHAR(100) NOT NULL,     -- 'Santiago'
```

**Después:**
```sql
-- Campos nuevos (Modelo Alineado)
level VARCHAR(20) NOT NULL,            -- 'region' | 'comuna' | 'provincia'
code VARCHAR(20) NOT NULL,             -- 'RM', 'VA', '13101'
region_code VARCHAR(20),               -- Código de región padre (para comunas)
name VARCHAR(200) NOT NULL,            -- Nombre del territorio
region_name VARCHAR(200),              -- Nombre de la región (para comunas)
centroid POINT,                        -- Centroide [lng, lat]
```

### 2. Tipos TypeScript (`src/types/database.ts`)

```typescript
export interface DbTerritory {
  id: string;
  level: 'region' | 'comuna' | 'provincia';
  code: string;                  // 'RM', 'VA', '13101'
  region_code: string | null;    // Código de región padre
  name: string;
  region_name: string | null;
  centroid: [number, number] | null;
  geometry: GeoJSON.Geometry | null;
  bbox: [number, number, number, number] | null;
  population_total: number | null;
  population_urban: number | null;
  population_rural: number | null;
  source: string | null;
  source_year: number | null;
  created_at: string;
  updated_at: string;
}
```

### 3. TerritoryRepository (`src/services/supabase/repositories/territoryRepository.ts`)

**Nuevas funciones:**
- `getTerritoryByCode(code: string)` - Buscar por código corto (RM, VA, etc.)
- `getRegions()` - Retorna `code`, `name`, `centroid`
- `getComunasByRegion(regionCode: string)` - Filtra por `region_code`

**Funciones deprecadas:**
- `getTerritoryByComunaCode()` - Usar `getTerritoryByCode()`

---

## Estructura del Pipeline

### `territories_master.json`

```json
{
  "metadata": {
    "version": "1.0.0",
    "generated_at": "2026-03-16T18:00:00Z",
    "total_territories": 16,
    "total_regions": 16,
    "total_comunas": 0
  },
  "territories": [
    {
      "id": "uuid",
      "level": "region",
      "code": "RM",
      "region_code": null,
      "name": "Región Metropolitana de Santiago",
      "region_name": null,
      "centroid": [-70.6483, -33.4569],
      "population_total": 7112808,
      ...
    }
  ]
}
```

---

## Scripts de Seed

### `scripts/seed/seed_direct.cjs`
- Lee `territories_master.json`
- Inserta en Supabase con el nuevo modelo
- Usa `level`, `code`, `name`, `centroid`

### `scripts/seed/validate_seed_v2.sql`
- Valida la estructura de la tabla
- Verifica códigos cortos
- Verifica centroides
- Valida integridad referencial con agents

---

## Uso en el Frontend

### Ejemplos de uso del Repository

```typescript
import { 
  getTerritories, 
  getTerritoryByCode, 
  getRegions,
  getComunasByRegion 
} from '../services/supabase';

// Obtener todas las regiones
const regions = await getRegions();
// [{ code: 'RM', name: 'Región Metropolitana...', centroid: [-70.6, -33.4] }, ...]

// Buscar territorio por código
const rm = await getTerritoryByCode('RM');
// { id: '...', level: 'region', code: 'RM', name: '...', centroid: [...] }

// Obtener comunas de una región
const comunas = await getComunasByRegion('RM');
// [{ id: '...', level: 'comuna', code: '13101', name: 'Santiago', ... }, ...]
```

---

## Migración desde Modelo Antiguo

### Cambios en Queries

| Antes | Después |
|-------|---------|
| `region_code = 'CL-13'` | `code = 'RM'` |
| `comuna_code = '13101'` | `code = '13101'` |
| `region_name` | `name` (para regiones) |
| `comuna_name` | `name` (para comunas) |
| `centroid` (no existía) | `centroid` (POINT) |

### Fallback Local

El TerritoryRepository mantiene fallback a datos locales (`chileRegions.ts`) cuando Supabase no está disponible. Los datos locales se mapean al nuevo modelo:

```typescript
{
  id: `local-${region.code}`,
  level: 'region',
  code: region.code,           // 'RM', 'VA', etc.
  name: region.name,
  centroid: region.centroid,
  ...
}
```

---

## Validación

### Comandos para validar

```bash
# Ejecutar seed
node scripts/seed/seed_direct.cjs

# Validar en PostgreSQL
psql $SUPABASE_DB_URL -f scripts/seed/validate_seed_v2.sql
```

### Checks de validación

1. ✅ Estructura de tabla correcta
2. ✅ 16 regiones con códigos cortos
3. ✅ Todos los centroides presentes
4. ✅ Integridad referencial agents -> territories
5. ✅ Constraint UNIQUE en (code, level)

---

## Archivos Modificados

1. `deploy/init/01-schema.sql` - Schema actualizado
2. `src/types/database.ts` - Tipos actualizados
3. `src/services/supabase/repositories/territoryRepository.ts` - Repository actualizado
4. `src/services/supabase/index.ts` - Exports actualizados
5. `scripts/seed/seed_direct.cjs` - Script de seed
6. `scripts/seed/validate_seed_v2.sql` - Script de validación
7. `docs/TERRITORIES_MODEL_ALIGNMENT.md` - Este documento

---

## Notas Técnicas

### Constraint UNIQUE

```sql
UNIQUE(code, level)
```

Permite:
- `code = 'RM', level = 'region'` ✅
- `code = '13101', level = 'comuna'` ✅
- `code = '13101', level = 'region'` ✅ (diferente level)

### Índices

```sql
CREATE INDEX idx_territories_level ON territories(level);
CREATE INDEX idx_territories_code ON territories(code);
CREATE INDEX idx_territories_region_code ON territories(region_code);
```

### Vista region_summary

```sql
CREATE VIEW region_summary AS
SELECT 
    code,
    name,
    population_total,
    centroid
FROM territories
WHERE level = 'region'
ORDER BY code;
```

---

## Migración desde Instalación Existente

Si ya tienes la tabla `territories` creada con el schema antiguo:

```bash
# Aplicar migración al Modelo Alineado v2.0
psql $SUPABASE_DB_URL -f deploy/init/03-migrate-territories-to-v2.sql
```

Esta migración:
1. Agrega las columnas nuevas (`level`, `code`, `centroid`)
2. Migra los datos de `region_code` (CL-XX) a `code` (RM, VA, etc.)
3. Actualiza constraints e índices
4. Recrea la vista `region_summary`

## Próximos Pasos

1. ✅ Seed de territories completado
2. ⏳ Ejecutar migración si es necesario
3. ⏳ Ejecutar seed de territories
4. ⏳ Seed de agents (siguiente paso)
5. ⏳ Validación de integridad referencial
6. ⏳ Testing del frontend con datos reales

---

## Contacto

Para dudas sobre el modelo, consultar:
- Documento: `docs/TERRITORIES_MODEL_ALIGNMENT.md`
- Schema: `deploy/init/01-schema.sql`
- Types: `src/types/database.ts`
