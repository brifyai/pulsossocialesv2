# Implementación: Clasificación Socioeconómica CADEM

## Resumen

Se ha implementado la clasificación socioeconómica compatible con CADEM (ABC1, C2, C3, D, E) para los agentes sintéticos, permitiendo análisis demográficos y comparaciones con benchmarks reales de CADEM.

**Actualización 2026-04-01**: Se han añadido los campos `cadem_age_group` y `cadem_region_group` para alineación completa con estándares CADEM.

## Cambios Realizados

### 1. Migraciones SQL

#### Migración Socioeconómica
**Archivo:** `migrations/20250401_add_cadem_socioeconomic_classification.sql`

```sql
-- Añadir columna cadem_socioeconomic_level a synthetic_agents
ALTER TABLE synthetic_agents 
ADD COLUMN IF NOT EXISTS cadem_socioeconomic_level VARCHAR(10) 
CHECK (cadem_socioeconomic_level IN ('ABC1', 'C2', 'C3', 'D', 'E'));

-- Crear índice para consultas eficientes
CREATE INDEX IF NOT EXISTS idx_synthetic_agents_cadem_level 
ON synthetic_agents(cadem_socioeconomic_level);
```

#### Migración Edad y Región
**Archivo:** `migrations/20250401_add_cadem_age_region_columns.sql`

```sql
-- Añadir columnas CADEM para edad y región
ALTER TABLE synthetic_agents 
ADD COLUMN IF NOT EXISTS cadem_age_group VARCHAR(10) 
CHECK (cadem_age_group IN ('18-29', '30-49', '50-69', '70+'));

ALTER TABLE synthetic_agents 
ADD COLUMN IF NOT EXISTS cadem_region_group VARCHAR(20) 
CHECK (cadem_region_group IN ('Metropolitana', 'Norte', 'Centro', 'Sur'));

-- Crear índices para consultas eficientes
CREATE INDEX IF NOT EXISTS idx_synthetic_agents_cadem_age 
ON synthetic_agents(cadem_age_group);

CREATE INDEX IF NOT EXISTS idx_synthetic_agents_cadem_region 
ON synthetic_agents(cadem_region_group);
```

### 2. Tipos TypeScript

**Archivo:** `src/types/agent.ts`

```typescript
// CADEM-compatible socioeconomic classification
export type CademSocioeconomicLevel = 'ABC1' | 'C2' | 'C3' | 'D' | 'E';

// CADEM age groups for demographic analysis
export type CademAgeGroup = '18-29' | '30-49' | '50-69' | '70+';

// CADEM regional groupings
export type CademRegionGroup = 'Metropolitana' | 'Norte' | 'Centro' | 'Sur';
```

**Archivo:** `src/types/database.ts`

```typescript
// CADEM-compatible types
export type DbCademSocioeconomicLevel = 'ABC1' | 'C2' | 'C3' | 'D' | 'E';
export type DbCademAgeGroup = '18-29' | '30-49' | '50-69' | '70+';
export type DbCademRegionGroup = 'Metropolitana' | 'Norte' | 'Centro' | 'Sur';
```

### 3. Script de Población
**Archivo:** `scripts/enrich/populate_cadem_socioeconomic.ts`

El script implementa la lógica de clasificación para los tres campos CADEM:

#### Nivel Socioeconómico CADEM

| Decil | Educación | CADEM |
|-------|-----------|-------|
| 10 | Universitaria/Postgrado | ABC1 |
| 10 | Otra | C2 |
| 9 | Cualquiera | C2 |
| 7-8 | Universitaria/Postgrado | C2 |
| 7-8 | Otra | C3 |
| 5-6 | Cualquiera | C3 |
| 3-4 | Cualquiera | D |
| 1-2 | Cualquiera | E |

#### Grupos de Edad CADEM

| Grupo | Rango | Descripción |
|-------|-------|-------------|
| 18-29 | 18-29 años | Jóvenes adultos |
| 30-49 | 30-49 años | Adultos en edad laboral activa |
| 50-69 | 50-69 años | Adultos mayores activos |
| 70+ | 70+ años | Tercera edad |

#### Grupos Regionales CADEM

| Grupo | Regiones | Códigos | Porcentaje Esperado |
|-------|----------|---------|---------------------|
| Metropolitana | Región Metropolitana | CL-13 | ~39% |
| Norte | Tarapacá, Antofagasta, Atacama, Coquimbo, Arica y Parinacota | CL-01, CL-02, CL-03, CL-04, CL-15 | ~12% |
| Centro | Valparaíso, O'Higgins, Maule, Ñuble, Biobío | CL-05, CL-06, CL-07, CL-16, CL-08 | ~22% |
| Sur | Araucanía, Los Ríos, Los Lagos, Aysén, Magallanes | CL-09, CL-14, CL-10, CL-11, CL-12 | ~27% |

## Uso

### Aplicar Migraciones
```bash
npx ts-node scripts/apply_migrations.ts
```

### Poblar Datos
```bash
npx ts-node scripts/enrich/populate_cadem_socioeconomic.ts
```

### Consultar Distribución Nivel Socioeconómico
```sql
SELECT 
  cadem_socioeconomic_level,
  COUNT(*) as count,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER(), 2) as percentage
FROM synthetic_agents
WHERE cadem_socioeconomic_level IS NOT NULL
GROUP BY cadem_socioeconomic_level
ORDER BY 
  CASE cadem_socioeconomic_level
    WHEN 'ABC1' THEN 1
    WHEN 'C2' THEN 2
    WHEN 'C3' THEN 3
    WHEN 'D' THEN 4
    WHEN 'E' THEN 5
  END;
```

### Consultar Distribución Grupos de Edad
```sql
SELECT 
  cadem_age_group,
  COUNT(*) as count,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER(), 2) as percentage
FROM synthetic_agents
WHERE cadem_age_group IS NOT NULL
GROUP BY cadem_age_group
ORDER BY 
  CASE cadem_age_group
    WHEN '18-29' THEN 1
    WHEN '30-49' THEN 2
    WHEN '50-69' THEN 3
    WHEN '70+' THEN 4
  END;
```

### Consultar Distribución Grupos Regionales
```sql
SELECT 
  cadem_region_group,
  COUNT(*) as count,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER(), 2) as percentage
FROM synthetic_agents
WHERE cadem_region_group IS NOT NULL
GROUP BY cadem_region_group
ORDER BY 
  CASE cadem_region_group
    WHEN 'Metropolitana' THEN 1
    WHEN 'Norte' THEN 2
    WHEN 'Centro' THEN 3
    WHEN 'Sur' THEN 4
  END;
```

### Consultar Agentes con Filtros CADEM
```typescript
// Ejemplo: Obtener agentes ABC1 de 30-49 años en Región Metropolitana
const { data: agents } = await supabase
  .from('synthetic_agents')
  .select('*')
  .eq('cadem_socioeconomic_level', 'ABC1')
  .eq('cadem_age_group', '30-49')
  .eq('cadem_region_group', 'Metropolitana')
  .limit(100);
```

## Distribución Esperada (Chile)

### Nivel Socioeconómico
Según datos CADEM típicos:
- **ABC1**: ~8-12%
- **C2**: ~15-20%
- **C3**: ~25-30%
- **D**: ~25-30%
- **E**: ~15-20%

### Grupos de Edad
Distribución típica población adulta:
- **18-29**: ~25-30%
- **30-49**: ~35-40%
- **50-69**: ~25-30%
- **70+**: ~10-15%

### Grupos Regionales
Distribución típica nacional:
- **Metropolitana**: ~39%
- **Norte**: ~12%
- **Centro**: ~22%
- **Sur**: ~27%

## Integración con Benchmarks

La clasificación CADEM permite:
1. Comparar resultados de encuestas con benchmarks reales
2. Analizar sesgos demográficos en las respuestas
3. Calibrar el motor de opinión por segmento socioeconómico
4. Generar reportes compatibles con estándares de la industria
5. Implementar cuotas por segmentos demográficos

## Próximos Pasos

1. ✅ Implementar campos CADEM en base de datos
2. ✅ Crear script de población
3. ✅ Actualizar tipos TypeScript
4. ⏳ Ejecutar el script de población en producción
5. ⏳ Verificar distribución contra benchmarks CADEM
6. ⏳ Implementar filtros en la UI de Operations
7. ⏳ Agregar visualización de distribución CADEM
8. ⏳ Integrar en el motor de calibración

## Notas Técnicas

- Las columnas permiten NULL para agentes no clasificados
- Los índices mejoran rendimiento de consultas por nivel, edad y región
- El script es idempotente (puede ejecutarse múltiples veces)
- Los cambios son retrocompatibles con código existente
- El mapeo regional incluye la Región de Arica y Parinacota (CL-15) en el grupo Norte
- El mapeo de edad asigna menores de 18 al grupo 18-29 (grupo más cercano)
