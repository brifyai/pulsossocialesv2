# Análisis Comparativo: `synthetic_agents` vs `v_synthetic_agents_enriched`

## Resumen Ejecutivo

**Conclusión principal**: Las tablas **NO tienen la misma información**. La vista `v_synthetic_agents_enriched` es una **vista enriquecida** que extiende los datos de `synthetic_agents` con información de diccionarios del Censo 2024.

---

## 1. Diferencias Fundamentales

| Aspecto | `synthetic_agents` | `v_synthetic_agents_enriched` |
|---------|-------------------|------------------------------|
| **Tipo** | Tabla base | Vista (VIEW) |
| **Propósito** | Almacenar agentes sintéticos | Presentar datos enriquecidos para consultas |
| **Datos propios** | ✅ Sí - Almacena datos reales | ❌ No - Solo consulta datos de otras tablas |
| **Campos adicionales** | ❌ No tiene | ✅ 15+ campos de diccionarios |
| **Modificable** | ✅ INSERT/UPDATE/DELETE | ❌ Solo lectura |

---

## 2. Estructura de `synthetic_agents` (Tabla Base)

### Campos Principales (~30 campos)

```sql
-- Identificación
- id (UUID PK)
- agent_id (VARCHAR)
- batch_id (VARCHAR)
- version (VARCHAR)

-- Ubicación
- country_code (VARCHAR)
- region_code (VARCHAR)
- comuna_code (VARCHAR)
- province_code (VARCHAR)
- urbanicity (VARCHAR)
- location_lat (NUMERIC)
- location_lng (NUMERIC)

-- Demografía
- sex (VARCHAR)
- age (INTEGER)
- age_group (VARCHAR)

-- Socioeconómico
- household_type (VARCHAR)
- poverty_status (VARCHAR)
- education_level (VARCHAR)
- occupation_status (VARCHAR)
- occupation_group (VARCHAR)
- socioeconomic_level (VARCHAR)
- income_decile (INTEGER)

-- Digital
- connectivity_level (VARCHAR)
- digital_exposure_level (VARCHAR)
- preferred_survey_channel (VARCHAR)
- has_smartphone (BOOLEAN)
- has_computer (BOOLEAN)
- internet_quality (VARCHAR)

-- Traceabilidad
- backbone_key (VARCHAR)
- subtel_profile_key (VARCHAR)
- casen_profile_key (VARCHAR)
- synthesis_version (VARCHAR)
- generation_notes (TEXT)
- agent_type (VARCHAR)

-- Metadata
- metadata (JSONB)
- created_at (TIMESTAMPTZ)
- updated_at (TIMESTAMPTZ)
```

### Campos de Código Censo (Agregados posteriormente)

```sql
- sex_code (INTEGER)
- age_group_code (INTEGER)
- education_level_code (VARCHAR)
- occupation_status_code (INTEGER)
- occupation_category_code (INTEGER)
- ciuo_code (VARCHAR)
- caenes_code (VARCHAR)
- marital_status_code (INTEGER)
- indigenous_people_code (INTEGER)
- disability_status_code (INTEGER)
```

---

## 3. Estructura de `v_synthetic_agents_enriched` (Vista)

### Campos Heredados de `synthetic_agents`

**Todos los campos de la tabla base** (`a.*` en la definición de la vista)

### Campos Adicionales de Diccionarios (15 campos)

```sql
-- Información de sexo (dict_sex)
- sex_label (TEXT) - Etiqueta descriptiva
- sex_censo_code (INTEGER) - Código oficial INE

-- Información de grupo de edad (dict_age_group)
- age_group_label (TEXT) - Etiqueta descriptiva
- age_group_min (INTEGER) - Edad mínima del grupo
- age_group_max (INTEGER) - Edad máxima del grupo

-- Información de educación (dict_education_level)
- education_label (TEXT) - Etiqueta descriptiva
- education_years (TEXT) - Rango de años de estudio

-- Información de situación laboral (dict_employment_status)
- occupation_status_label (TEXT) - Etiqueta descriptiva

-- Información de ocupación CIUO (dict_ciuo_occupation)
- ciuo_label (TEXT) - Nombre de la ocupación
- ciuo_category (TEXT) - Categoría
- ciuo_skill_level (TEXT) - Nivel de calificación

-- Información de actividad CAENES (dict_caenes_activity)
- caenes_label (TEXT) - Nombre de la actividad
- caenes_sector (TEXT) - Sector económico

-- Información de estado civil (dict_marital_status)
- marital_status_label (TEXT) - Etiqueta descriptiva
- is_married (BOOLEAN) - ¿Está casado?
- is_partnered (BOOLEAN) - ¿Tiene pareja?

-- Información de pueblo indígena (dict_indigenous_people)
- indigenous_people_label (TEXT) - Nombre del pueblo
- indigenous_region (TEXT) - Región tradicional

-- Información de discapacidad (dict_disability_status)
- disability_status_label (TEXT) - Etiqueta descriptiva
```

---

## 4. JOINs Realizados en la Vista

La vista `v_synthetic_agents_enriched` realiza **8 LEFT JOINs** con tablas de diccionarios:

```sql
FROM synthetic_agents a
LEFT JOIN dict_sex ds ON a.sex = ds.mapped_value
LEFT JOIN dict_age_group dag ON a.age_group = dag.mapped_value
LEFT JOIN dict_education_level del ON a.education_level = del.mapped_value
LEFT JOIN dict_employment_status des ON a.occupation_status = des.mapped_value
LEFT JOIN dict_ciuo_occupation dciuo ON a.ciuo_code = dciuo.code
LEFT JOIN dict_caenes_activity dcaenes ON a.caenes_code = dcaenes.code
LEFT JOIN dict_marital_status dms ON a.marital_status_code = dms.code
LEFT JOIN dict_indigenous_people dip ON a.indigenous_people_code = dip.code
LEFT JOIN dict_disability_status dds ON a.disability_status_code = dds.code
```

---

## 5. Casos de Uso Recomendados

### Usar `synthetic_agents` cuando:

#### 1. **Operaciones CRUD** (Crear, Leer, Actualizar, Eliminar)
```typescript
// Guardar nuevos agentes
async createAgent(agent: DbSyntheticAgent) {
  const { data, error } = await this.client
    .from('synthetic_agents')  // ← Tabla base
    .insert(agent)
    .single();
}

// Actualizar agente
async updateAgent(id: string, updates: Partial<DbSyntheticAgent>) {
  const { data, error } = await this.client
    .from('synthetic_agents')  // ← Tabla base
    .update(updates)
    .eq('id', id);
}
```

#### 2. **Consultas de performance** (sin JOINs)
```typescript
// Filtrar agentes rápidamente
async getAgentsByRegion(regionCode: string) {
  const { data } = await this.client
    .from('synthetic_agents')  // ← Más rápido, sin JOINs
    .select('*')
    .eq('region_code', regionCode);
}
```

#### 3. **Simulaciones y cálculos internos**
```typescript
// Procesamiento masivo de agentes
async selectAgentsForSurvey(criteria: SurveyCriteria) {
  // Usa synthetic_agents para seleccionar agentes
  // basado en campos crudos (age, sex, income_decile)
  return await this.client
    .from('synthetic_agents')
    .select('*')
    .eq('sex', criteria.sex)
    .gte('age', criteria.minAge)
    .lte('age', criteria.maxAge);
}
```

### Usar `v_synthetic_agents_enriched` cuando:

#### 1. **Reportes y Dashboards** (etiquetas descriptivas)
```typescript
// Mostrar información al usuario final
async getAgentDetailsForReport(agentId: string) {
  const { data } = await this.client
    .from('v_synthetic_agents_enriched')  // ← Vista enriquecida
    .select(`
      agent_id,
      sex_label,           // "Mujer" en vez de "female"
      age_group_label,     // "Adulto (30-44 años)"
      education_label,     // "Universitaria completa"
      occupation_status_label
    `)
    .eq('agent_id', agentId);
}
```

#### 2. **Validación contra Censo 2024**
```typescript
// Verificar que los datos coincidan con diccionarios oficiales
async validateAgentCensusCodes() {
  const { data } = await this.client
    .from('v_synthetic_agents_enriched')
    .select('sex_censo_code, ciuo_label, caenes_sector')
    .not('sex_censo_code', 'is', null);
}
```

#### 3. **Análisis estadístico con metadatos**
```typescript
// Análisis por categorías del Censo
async getDemographicsByCensusCategories() {
  const { data } = await this.client
    .from('v_synthetic_agents_enriched')
    .select(`
      sex_label,
      age_group_label,
      education_years,
      ciuo_skill_level,
      count(*)
    `)
    .group('sex_label, age_group_label, education_years, ciuo_skill_level');
}
```

#### 4. **Exportación de datos para investigación**
```sql
-- Exportar con etiquetas oficiales del INE
SELECT 
  agent_id,
  sex_label,
  sex_censo_code,
  age_group_label,
  age_group_min,
  age_group_max,
  education_label,
  ciuo_label,
  caenes_sector
FROM v_synthetic_agents_enriched
WHERE region_code = '13';
```

---

## 5.1 Tabla de Decisión Rápida

| Situación | ¿Qué usar? | ¿Por qué? |
|-----------|-----------|-----------|
| Crear/Editar/Eliminar agentes | `synthetic_agents` | La vista es solo lectura |
| Simulaciones en tiempo real | `synthetic_agents` | Más rápida (sin JOINs) |
| Mostrar datos en UI | `v_synthetic_agents_enriched` | Etiquetas descriptivas |
| Reportes ejecutivos | `v_synthetic_agents_enriched` | Información del Censo |
| Validar calidad de datos | `v_synthetic_agents_enriched` | Compara con diccionarios |
| Exportar a investigadores | `v_synthetic_agents_enriched` | Códigos oficiales INE |
| Procesamiento batch masivo | `synthetic_agents` | Mejor performance |

---

## 5.2 Regla de Oro

> **¿Necesitas modificar datos?** → `synthetic_agents`
> 
> **¿Necesitas mostrar/validar datos?** → `v_synthetic_agents_enriched`
> 
> La vista es como un "reporte automático" que siempre está actualizado con las etiquetas oficiales del Censo 2024, mientras que la tabla es el "almacén" donde guardas y modificas los datos reales.

---

## 6. Ejemplo Práctico de Diferencias

### Consulta a `synthetic_agents`:
```sql
SELECT agent_id, sex, age_group, education_level
FROM synthetic_agents
LIMIT 1;

-- Resultado:
-- agent_id: "13101_1_1"
-- sex: "female"
-- age_group: "adult"
-- education_level: "university"
```

### Consulta a `v_synthetic_agents_enriched`:
```sql
SELECT agent_id, sex, sex_label, sex_censo_code,
       age_group, age_group_label, age_group_min, age_group_max,
       education_level, education_label, education_years
FROM v_synthetic_agents_enriched
LIMIT 1;

-- Resultado:
-- agent_id: "13101_1_1"
-- sex: "female"
-- sex_label: "Mujer"
-- sex_censo_code: 2
-- age_group: "adult"
-- age_group_label: "Adulto (30-44 años)"
-- age_group_min: 30
-- age_group_max: 44
-- education_level: "university"
-- education_label: "Universitaria completa"
-- education_years: "17+ años"
```

---

## 7. Recomendaciones

### 1. **Mantener ambas estructuras**
- La tabla base es necesaria para el funcionamiento del sistema
- La vista proporciona valor agregado para análisis

### 2. **Índices importantes**
Asegurar que existan índices en `synthetic_agents` para los JOINs:
```sql
CREATE INDEX idx_agents_sex ON synthetic_agents(sex);
CREATE INDEX idx_agents_age_group ON synthetic_agents(age_group);
CREATE INDEX idx_agents_education ON synthetic_agents(education_level);
-- etc.
```

### 3. **Sincronización de códigos**
Usar la función `sync_agent_codes_from_mapped_values()` para mantener actualizados los códigos del Censo.

### 4. **Validación de integridad**
Ejecutar periódicamente `validate_agent_dictionary_integrity()` para verificar que los valores correspondan a los diccionarios.

---

## 8. Diagrama de Relaciones

```
┌─────────────────────────┐
│   synthetic_agents      │
│   (Tabla Base)          │
│                         │
│ • Datos crudos          │
│ • Modificable           │
│ • ~40 campos            │
└───────────┬─────────────┘
            │
            │ LEFT JOINs
            ▼
┌─────────────────────────┐
│ dict_sex                │
│ dict_age_group          │
│ dict_education_level    │
│ dict_employment_status  │
│ dict_ciuo_occupation    │
│ dict_caenes_activity    │
│ dict_marital_status     │
│ dict_indigenous_people  │
│ dict_disability_status  │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│ v_synthetic_agents_     │
│ _enriched               │
│ (Vista)                 │
│                         │
│ • Datos + Etiquetas     │
│ • Solo lectura          │
│ • ~55 campos            │
└─────────────────────────┘
```

---

## Conclusión

Las tablas son **complementarias**, no duplicadas:

- **`synthetic_agents`** = Fuente de verdad (datos operacionales)
- **`v_synthetic_agents_enriched`** = Capa de presentación (datos para análisis)

La vista agrega **valor semántico** al mapear códigos internos a etiquetas descriptivas del Censo 2024, facilitando la interpretación y validación de los datos.
