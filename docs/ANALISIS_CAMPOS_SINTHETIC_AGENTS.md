# Análisis de Campos - Tabla synthetic_agents

## Fecha: 24 de marzo de 2026

---

## 1. CAMPOS ACTUALES EN ARCHIVOS SQL (25 campos)

Los archivos SQL enriquecidos contienen estos campos:

| # | Campo | Estado | Valor Ejemplo |
|---|-------|--------|---------------|
| 1 | `agent_id` | ✅ Completo | '2807908_1_1' |
| 2 | `batch_id` | ✅ Completo | 'BATCH-V4-1-20250318' |
| 3 | `version` | ✅ Completo | 'v4.1.0' |
| 4 | `country_code` | ✅ Completo | 'CL' |
| 5 | `region_code` | ✅ Completo | 1 |
| 6 | `comuna_code` | ✅ Completo | '1101' |
| 7 | `province_code` | ✅ Completo | '11' |
| 8 | `urbanicity` | ✅ Completo | 'urban' |
| 9 | `sex` | ✅ Completo | 'male' |
| 10 | `age` | ✅ Completo | 11 |
| 11 | `age_group` | ✅ Completo | 'child' |
| 12 | `household_type` | ✅ Completo | '1.0' |
| 13 | `poverty_status` | ✅ Completo | '1' |
| 14 | `education_level` | ✅ Completo | 'primary' |
| 15 | `occupation_status` | ⚠️ Parcial | NULL (niños) / 'employed' (adultos) |
| 16 | `connectivity_level` | ✅ Completo | 'medium' |
| 17 | `digital_exposure_level` | ✅ Completo | 'medium' |
| 18 | `preferred_survey_channel` | ✅ Completo | 'online' |
| 19 | `location_lat` | ✅ Completo | -20.221000 |
| 20 | `location_lng` | ✅ Completo | -70.144357 |
| 21 | `income_decile` | ✅ Completo | 4 |
| 22 | `employment_status` | ⚠️ Parcial | NULL (niños) / valor (adultos) |
| 23 | `metadata` | ✅ Completo | JSON con enriched, sources, etc. |
| 24 | `created_at` | ✅ Completo | '2026-03-18 14:14:08' |
| 25 | `updated_at` | ✅ Completo | '2026-03-18 14:14:08' |

**Total campos en SQL: 25**

---

## 2. CAMPOS EN TIPO TYPESCRIPT DbSyntheticAgent (32 campos)

Según `src/types/database.ts`, el tipo define estos campos:

| # | Campo | Tipo | En SQL? | Estado |
|---|-------|------|---------|--------|
| 1 | `id` | string (UUID) | ❌ NO | **FALTA - Primary Key** |
| 2 | `agent_id` | string | ✅ SÍ | Completo |
| 3 | `batch_id` | string | ✅ SÍ | Completo |
| 4 | `version` | string | ✅ SÍ | Completo |
| 5 | `territory_id` | string (FK) | ❌ NO | **FALTA - Foreign Key** |
| 6 | `country_code` | string | ✅ SÍ | Completo |
| 7 | `region_code` | string | ✅ SÍ | Completo |
| 8 | `comuna_code` | string | ✅ SÍ | Completo |
| 9 | `urbanicity` | DbUrbanicity | ✅ SÍ | Completo |
| 10 | `sex` | DbSex | ✅ SÍ | Completo |
| 11 | `age` | number | ✅ SÍ | Completo |
| 12 | `age_group` | DbAgeGroup | ✅ SÍ | Completo |
| 13 | `household_size` | number | ❌ NO | **FALTA** |
| 14 | `household_type` | DbHouseholdType | ✅ SÍ | Completo (como string) |
| 15 | `income_decile` | number | ✅ SÍ | Completo |
| 16 | `poverty_status` | DbPovertyStatus | ✅ SÍ | Completo (como string) |
| 17 | `education_level` | DbEducationLevel | ✅ SÍ | Completo (como string) |
| 18 | `occupation_status` | DbOccupationStatus | ✅ SÍ | Parcial (NULL para niños) |
| 19 | `occupation_group` | string | ❌ NO | **FALTA** |
| 20 | `socioeconomic_level` | DbSocioeconomicLevel | ❌ NO | **FALTA - En metadata JSONB** |
| 21 | `connectivity_level` | DbConnectivityLevel | ✅ SÍ | Completo |
| 22 | `digital_exposure_level` | DbDigitalExposureLevel | ✅ SÍ | Completo |
| 23 | `preferred_survey_channel` | DbSurveyChannel | ✅ SÍ | Completo |
| 24 | `agent_type` | DbAgentType | ❌ NO | **FALTA** |
| 25 | `backbone_key` | string | ❌ NO | **FALTA** |
| 26 | `subtel_profile_key` | string | ❌ NO | **FALTA** |
| 27 | `casen_profile_key` | string | ❌ NO | **FALTA** |
| 28 | `generation_notes` | string | ❌ NO | **FALTA** |
| 29 | `location_lat` | number | ✅ SÍ | Completo |
| 30 | `location_lng` | number | ✅ SÍ | Completo |
| 31 | `created_at` | string | ✅ SÍ | Completo |
| 32 | `updated_at` | string | ✅ SÍ | Completo |

**Total campos en TypeScript: 32**

---

## 3. CAMPOS FALTANTES (7 campos)

### 🔴 CRÍTICOS - Necesarios para el funcionamiento:

| Campo | Descripción | Prioridad |
|-------|-------------|-----------|
| `id` | UUID primary key (autogenerado por DB) | 🔴 Alta |
| `territory_id` | FK a territories.id | 🔴 Alta |
| `household_size` | Tamaño del hogar (número) | 🟡 Media |

### 🟡 IMPORTANTES - Mejoran funcionalidad:

| Campo | Descripción | Prioridad |
|-------|-------------|-----------|
| `socioeconomic_level` | Nivel socioeconómico (low/medium/high) | 🟡 Media |
| `agent_type` | Tipo de agente (resident/retiree/student/etc) | 🟡 Media |
| `occupation_group` | Grupo ocupacional | 🟢 Baja |

### 🟢 OPCIONALES - Traceabilidad:

| Campo | Descripción | Prioridad |
|-------|-------------|-----------|
| `backbone_key` | Referencia a población backbone | 🟢 Baja |
| `subtel_profile_key` | Referencia a perfil SUBTEL | 🟢 Baja |
| `casen_profile_key` | Referencia a perfil CASEN | 🟢 Baja |
| `generation_notes` | Notas de generación | 🟢 Baja |

---

## 4. CAMPOS EXTRA EN SQL (no están en TypeScript)

| Campo | Descripción | Notas |
|-------|-------------|-------|
| `province_code` | Código de provincia | ✅ Útil, mantener |
| `employment_status` | Estado de empleo | ⚠️ Duplicado con `occupation_status`? |
| `metadata` | JSONB con datos extra | ✅ Útil para campos flexibles |

---

## 5. RECOMENDACIONES

### Inmediatas:
1. **Agregar `id`** (UUID) - La base de datos puede autogenerarlo
2. **Agregar `territory_id`** - Necesario para relaciones con tabla territories
3. **Agregar `household_size`** - Dato demográfico importante

### Corto plazo:
4. **Agregar `socioeconomic_level`** como columna (actualmente solo en metadata)
5. **Agregar `agent_type`** para clasificación de agentes
6. **Revisar duplicado**: `employment_status` vs `occupation_status`

### Opcional:
7. **Campos de traceabilidad** (`backbone_key`, etc.) para debugging

---

## 6. RESUMEN EJECUTIVO

```
Campos en SQL:        25
Campos en TypeScript: 32
Campos faltantes:      7
Campos extra:          3

Cobertura actual:     78% (25/32 campos principales)
```

**Los archivos SQL están completos para los campos que incluyen.** Los 7 campos faltantes son principalmente de traceabilidad y relaciones que pueden manejarse de otras formas o agregarse en futuras iteraciones.
