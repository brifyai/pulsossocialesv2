# Análisis de Calidad de Datos - Agentes Sintéticos

**Fecha:** 24 de marzo de 2026  
**Proyecto:** Pulso Social - Versión con Esteroides  
**Analista:** Arquitecto de Datos

---

## 1. RESUMEN EJECUTIVO

### Estado Actual de los Datos

| Aspecto | Estado | Detalle |
|---------|--------|---------|
| **Agentes Generados** | ✅ 1,400 | En `synthetic_agents_v1.json` |
| **CASEN Disponible** | ⚠️ Mínimo | Solo 1 registro en `casen_normalized.json` |
| **SUBTEL Disponible** | ⚠️ Mínimo | Solo 2 registros en `subtel_normalized.json` |
| **Censo 2024** | ❌ No integrado | 18.4M registros disponibles pero no procesados |
| **Calidad General** | 🟡 Regular | Datos sintéticos con distribuciones realistas pero sin enriquecimiento real |

### Problema Principal Identificado

**Los campos vacíos en los agentes NO se deben a errores en la base de datos, sino a que el pipeline actual está usando datos CASEN/SUBTEL mínimos/mock en lugar de las bases completas disponibles en `/Users/camiloalegria/Desktop/AIntelligence/Simulador 1MM usuarios/BBDD/`.**

---

## 2. BASES DE DATOS DISPONIBLES vs USADAS

### 2.1 Bases Disponibles (No Utilizadas)

| Base | Ubicación | Tamaño | Registros | Estado |
|------|-----------|--------|-----------|--------|
| **CASEN 2024** | `Simulador 1MM usuarios/BBDD/casen_2024.dta` | ~1.5 GB | 218,367 personas | ✅ Disponible |
| **CASEN Territorial** | `Simulador 1MM usuarios/BBDD/casen_2024_provincia_comuna.dta` | ~2.8 MB | 218,367 | ✅ Disponible |
| **SUBTEL 2025** | `Simulador 1MM usuarios/BBDD/BBDDSubtel2025_031225.sav` | 4.91 MB | 5,000 hogares | ✅ Disponible |
| **Censo Personas** | `Simulador 1MM usuarios/BBDD/personas_censo2024.csv` | 2.3 GB | 18,480,432 | ✅ Disponible |
| **Censo Hogares** | `Simulador 1MM usuarios/BBDD/hogares_censo2024.csv` | - | - | ✅ Disponible |
| **Censo Viviendas** | `Simulador 1MM usuarios/BBDD/viviendas_censo2024.csv` | - | - | ✅ Disponible |

### 2.2 Bases Actualmente Usadas (Mínimas)

| Base | Ubicación | Tamaño | Registros | Problema |
|------|-----------|--------|-----------|----------|
| `casen_normalized.json` | `data/interim/` | 647 bytes | **1 registro** | ⚠️ Mock/minimal |
| `casen_raw.json` | `data/interim/` | 1,003 bytes | **1 registro** | ⚠️ Mock/minimal |
| `subtel_normalized.json` | `data/interim/` | 1,143 bytes | **2 registros** | ⚠️ Mock/minimal |
| `subtel_raw.json` | `data/interim/` | 875 bytes | **1 registro** | ⚠️ Mock/minimal |
| `census_normalized.json` | `data/interim/` | 1,987 bytes | **1 registro** | ⚠️ Mock/minimal |

---

## 3. ANÁLISIS DE CAMPOS VACÍOS

### 3.1 Campos con Valores Nulos en Agentes Sintéticos

| Campo | % Nulos | Razón | Solución |
|-------|---------|-------|----------|
| `income_decile` | 0% | ✅ Generado sintéticamente | N/A |
| `poverty_status` | 0% | ✅ Generado sintéticamente | N/A |
| `education_level` | 0% | ✅ Generado sintéticamente | N/A |
| `occupation_status` | 0% | ✅ Generado sintéticamente | N/A |
| `occupation_group` | ~30% | ⚠️ Null cuando no aplica | Normal |
| `socioeconomic_level` | 0% | ✅ Derivado de income_decile | N/A |
| `connectivity_level` | 0% | ✅ Generado de SUBTEL (pero datos mínimos) | **Ver 3.2** |
| `digital_exposure_level` | 0% | ✅ Derivado de connectivity | N/A |
| `preferred_survey_channel` | 0% | ✅ Generado sintéticamente | N/A |
| `subtel_profile_key` | 0% | ✅ Asignado de SUBTEL | N/A |
| `casen_profile_key` | 100% | ❌ **CASEN no está integrado** | **Ver 4.1** |
| `location_lat` | 100% | ❌ No se generan coordenadas | **Ver 4.2** |
| `location_lng` | 100% | ❌ No se generan coordenadas | **Ver 4.2** |

### 3.2 Problema Crítico: Datos SUBTEL Incompletos

**Situación:**
- El generador `generate_synthetic_agents_v1.ts` intenta cargar `subtel_profile.json`
- Este archivo solo tiene datos agregados por región (16 registros)
- **NO tiene datos desagregados por comuna** como los que existen en la base SUBTEL real

**Evidencia:**
```json
// data/processed/subtel_profile.json - Solo 16 registros (uno por región)
[
  {"territory_code": "RM", "territory_level": "region", ...},
  {"territory_code": "VA", "territory_level": "region", ...},
  ...
]
```

**Base SUBTEL Real Disponible:**
- 5,000 hogares encuestados
- 90 comunas con datos
- 587 variables incluyendo dispositivos, conectividad, acceso

---

## 4. CAUSAS RAÍZ DE LOS PROBLEMAS

### 4.1 Falta de Integración CASEN

**Problema:**
- CASEN 2024 tiene 218,367 registros de personas con 877 variables
- Incluye ingresos, pobreza, educación, trabajo detallado
- **NO está siendo utilizada en el pipeline actual**

**Impacto:**
- Los agentes usan distribuciones sintéticas en lugar de datos reales
- No hay matching con perfiles socioeconómicos reales
- El campo `casen_profile_key` está siempre null

**Solución Requerida:**
1. Crear script de ingestión de CASEN desde `.dta`
2. Normalizar variables relevantes
3. Crear perfiles por estratos (región × edad × sexo)
4. Enriquecer agentes con probabilidades CASEN

### 4.2 Falta de Georreferenciación

**Problema:**
- Los agentes tienen `comuna_code` pero no coordenadas GPS
- No se generan `location_lat` ni `location_lng`

**Impacto:**
- Los agentes no pueden mostrarse en el mapa con precisión
- No se puede hacer análisis espacial

**Solución Requerida:**
1. Crear/Cargar tabla de comunas con centroides
2. Asignar coordenadas aleatorias dentro de polígonos de comunas
3. O usar centroides de comunas como aproximación

### 4.3 Pipeline de Datos Desactualizado

**Problema:**
- Los scripts en `scripts/ingest/` y `scripts/normalize/` generan datos mock
- No leen las bases reales de `/Simulador 1MM usuarios/BBDD/`

**Evidencia:**
```typescript
// scripts/ingest/ingest_casen.ts - Genera datos mock
export function ingestCasen(): void {
  const mockData = [{
    territory_code: 'RM',
    territory_name: 'Metropolitana de Santiago',
    // ... solo 1 registro
  }];
  // ...
}
```

---

## 5. RECOMENDACIONES PRIORITARIAS

### 5.1 Prioridad Alta (Crítico)

#### 1. Integrar CASEN 2024 Real
```bash
# Crear nuevo script de ingestión
scripts/ingest/ingest_casen_real.ts

# Debe:
# - Leer casen_2024.dta (Stata)
# - Leer casen_2024_provincia_comuna.dta
# - Unir vía 'folio'
# - Extraer variables prioritarias
# - Generar perfiles por estratos
```

**Variables CASEN Prioritarias:**
- `ytrabajocor_pc` - Ingreso del trabajo per cápita
- `pobreza_multi` - Pobreza multidimensional
- `esc` - Años de escolaridad
- `e18` - Nivel educacional
- `o4` - Condición de actividad
- `o5` - Ocupación CIUO-08
- `o6` - Rama de actividad CIIU

#### 2. Integrar SUBTEL 2025 Real
```bash
# Crear nuevo script de ingestión
scripts/ingest/ingest_subtel_real.ts

# Debe:
# - Leer BBDDSubtel2025_031225.sav (SPSS)
# - Extraer variables de conectividad
# - Calcular perfiles por comuna
# - Generar probabilidades de acceso
```

**Variables SUBTEL Prioritarias:**
- `P1` - Acceso a Internet
- `P4_1` - Banda ancha fija
- `P4_3` - Internet móvil con plan
- `P3_6` - Smartphone
- `COD_REGION` / `COMUNA_DEF` - Territorio

#### 3. Agregar Coordenadas Geográficas
```bash
# Crear script
scripts/integrate/add_coordinates.ts

# Debe:
# - Cargar polígonos de comunas
# - Generar coordenadas aleatorias dentro de cada comuna
# - O usar centroides + dispersión aleatoria
```

### 5.2 Prioridad Media

#### 4. Mejorar Pipeline de Normalización
- Actualizar `normalize_casen.ts` para procesar datos reales
- Actualizar `normalize_subtel.ts` para procesar datos reales
- Crear validaciones de calidad

#### 5. Enriquecer Agente con Censo 2024
- Usar Censo 2024 (18.4M registros) para validar distribuciones
- Ajustar parámetros de generación a datos reales

### 5.3 Prioridad Baja

#### 6. Optimizar Almacenamiento
- Considerar usar formatos binarios (Parquet) para bases grandes
- Implementar procesamiento por chunks

---

## 6. ANÁLISIS DE DATOS REALES DISPONIBLES

### 6.1 CASEN 2024 - Variables Clave

| Variable | Descripción | Cobertura | Uso en Agentes |
|----------|-------------|-----------|----------------|
| `ytrabajocor` | Ingreso trabajo corregido | 100% | `income_decile` |
| `pobreza_multi` | Pobreza multidimensional | 100% | `poverty_status` |
| `esc` | Años escolaridad | 100% | `education_level` |
| `e18` | Nivel educacional | 100% | `education_level` |
| `o4` | Condición actividad | 100% | `occupation_status` |
| `o5` | Ocupación CIUO | ~60% | `occupation_group` |
| `o6` | Rama actividad | ~60% | `occupation_group` |

### 6.2 SUBTEL 2025 - Variables Clave

| Variable | Descripción | Cobertura | Uso en Agentes |
|----------|-------------|-----------|----------------|
| `P1` | Acceso Internet | 96.8% | `connectivity_level` |
| `P4_1` | Banda ancha fija | 65.9% | `connectivity_level` |
| `P4_3` | Internet móvil | 85.8% | `mobile_access_prob` |
| `P3_6` | Smartphone | 71.9% | `has_smartphone` |
| `P3_2` | Laptop | 55.6% | `has_computer` |

### 6.3 Censo 2024 - Variables Clave

| Variable | Descripción | Cobertura | Uso en Agentes |
|----------|-------------|-----------|----------------|
| `region` | Región | 100% | `region_code` |
| `comuna` | Comuna | 100% | `comuna_code` |
| `sexo` | Sexo | 100% | `sex` |
| `edad` | Edad | 100% | `age` |
| `escolaridad` | Escolaridad | 100% | `education_level` |
| `sit_fuerza_trabajo` | Situación laboral | 100% | `occupation_status` |

---

## 7. PLAN DE ACCIÓN RECOMENDADO

### Fase 1: Integración CASEN (1-2 días)
1. [ ] Crear `scripts/ingest/ingest_casen_real.ts`
2. [ ] Procesar `casen_2024.dta` + `casen_2024_provincia_comuna.dta`
3. [ ] Generar `data/interim/casen_normalized_real.json`
4. [ ] Crear perfiles por estratos
5. [ ] Validar contra totales conocidos

### Fase 2: Integración SUBTEL (1 día)
1. [ ] Crear `scripts/ingest/ingest_subtel_real.ts`
2. [ ] Procesar `BBDDSubtel2025_031225.sav`
3. [ ] Generar `data/interim/subtel_normalized_real.json`
4. [ ] Calcular perfiles de conectividad por comuna

### Fase 3: Georreferenciación (1 día)
1. [ ] Obtener/cargar polígonos de comunas
2. [ ] Crear `scripts/integrate/add_coordinates.ts`
3. [ ] Generar coordenadas para cada agente

### Fase 4: Regeneración de Agentes (1 día)
1. [ ] Actualizar `generate_synthetic_agents_v1.ts`
2. [ ] Usar datos reales CASEN/SUBTEL
3. [ ] Generar `synthetic_agents_v2.json`
4. [ ] Validar calidad de datos

### Fase 5: Carga a Supabase (1 día)
1. [ ] Actualizar `scripts/seed/seed_agents.ts`
2. [ ] Cargar agentes v2 a Supabase
3. [ ] Verificar integridad de datos

---

## 8. CONCLUSIONES

### 8.1 Hallazgos Principales

1. **No hay problema con la base de datos Supabase** - La estructura es correcta
2. **El problema está en el pipeline de datos** - Se usan datos mock en lugar de reales
3. **Las bases reales están disponibles** - CASEN, SUBTEL, Censo 2024 completos
4. **Los campos vacíos son esperables** - Falta integración de fuentes reales

### 8.2 Calidad Actual vs Esperada

| Métrica | Actual | Esperada (con datos reales) |
|---------|--------|----------------------------|
| Fuente de ingresos | Sintético | CASEN 2024 real |
| Fuente de pobreza | Sintético | CASEN 2024 real |
| Fuente de educación | Sintético | CASEN 2024 real |
| Fuente de conectividad | SUBTEL mínimo | SUBTEL 2025 real |
| Coordenadas GPS | No tiene | Centroides de comuna |
| Tamaño de muestra | 1,400 | 25,000-100,000 |

### 8.3 Próximos Pasos Inmediatos

**Para resolver los campos vacíos:**

1. **Ejecutar integración CASEN** - Prioridad máxima
2. **Ejecutar integración SUBTEL** - Prioridad alta
3. **Agregar coordenadas** - Prioridad alta
4. **Regenerar agentes** - Prioridad media
5. **Recargar Supabase** - Prioridad media

---

## ANEXOS

### A. Estructura de Archivos Recomendada

```
data/
├── interim/
│   ├── casen_normalized_real.json      # ← NUEVO: CASEN real
│   ├── subtel_normalized_real.json     # ← NUEVO: SUBTEL real
│   └── census_normalized_real.json     # ← NUEVO: Censo real
├── processed/
│   ├── casen_profiles_by_strata.json   # ← NUEVO: Perfiles CASEN
│   ├── subtel_profiles_by_comuna.json  # ← NUEVO: Perfiles SUBTEL
│   └── synthetic_agents_v2.json        # ← NUEVO: Agentes enriquecidos
└── raw/                                 # ← NUEVO: Enlaces a BBDD reales
    ├── casen_2024.dta → /Simulador 1MM usuarios/BBDD/
    ├── subtel_2025.sav → /Simulador 1MM usuarios/BBDD/
    └── censo_2024.csv → /Simulador 1MM usuarios/BBDD/
```

### B. Scripts Necesarios

1. `scripts/ingest/ingest_casen_real.ts`
2. `scripts/ingest/ingest_subtel_real.ts`
3. `scripts/ingest/ingest_census_real.ts`
4. `scripts/normalize/normalize_casen_real.ts`
5. `scripts/normalize/normalize_subtel_real.ts`
6. `scripts/integrate/build_casen_profiles.ts`
7. `scripts/integrate/build_subtel_profiles.ts`
8. `scripts/integrate/add_coordinates.ts`
9. `scripts/synthesize/generate_synthetic_agents_v2.ts`

---

*Documento generado el 24 de marzo de 2026*
*Para consultas sobre este análisis, revisar los diagnósticos detallados en `/Simulador 1MM usuarios/`*
