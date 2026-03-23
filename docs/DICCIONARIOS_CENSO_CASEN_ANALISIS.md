# Análisis de Diccionarios Censo 2024 y CASEN para Synthetic Agents

## 📋 Resumen Ejecutivo

Este documento analiza los diccionarios oficiales del Censo 2024 y CASEN para identificar qué tablas de diccionario son necesarias para la tabla `synthetic_agents`.

**Fecha de análisis:** 23 de marzo, 2026
**Fuentes:**
- Diccionario de variables Censo 2024 (PDF)
- Libro de códigos CASEN 2024 (Excel)

---

## 🔍 Diccionarios Encontrados

### 1. DICCIONARIO: Códigos Territoriales (CUT)

**Ubicación:** Ambos archivos (Censo y CASEN)
**Tabla propuesta:** `territory_codes_dict`

```sql
CREATE TABLE territory_codes_dict (
    region_code INTEGER PRIMARY KEY,  -- 1-16
    region_name VARCHAR(100) NOT NULL,
    province_code INTEGER,            -- 11-163
    province_name VARCHAR(100),
    comuna_code INTEGER UNIQUE,       -- 1101-16305
    comuna_name VARCHAR(100) NOT NULL
);
```

**Valores (16 regiones, 346 comunas):**
- Región 1: Tarapacá (Iquique, Alto Hospicio, Pozo Almonte...)
- Región 2: Antofagasta
- ...
- Región 16: Ñuble

**Uso en synthetic_agents:**
- `region_code` → FK a `territory_codes_dict.region_code`
- `comuna_code` → FK a `territory_codes_dict.comuna_code`

---

### 2. DICCIONARIO: Tipo de Vivienda (Censo)

**Variable Censo:** `p2_tipo_vivienda`
**Tabla propuesta:** `dwelling_type_dict`

```sql
CREATE TABLE dwelling_type_dict (
    code INTEGER PRIMARY KEY,
    label VARCHAR(100) NOT NULL,
    description TEXT
);
```

**Valores:**
| Código | Descripción |
|--------|-------------|
| 1 | Casa |
| 2 | Departamento |
| 3 | Vivienda tradicional indígena (ruka u otras) |
| 5 | Pieza en casa antigua o en conventillo |
| 6 | Mediagua, mejora, vivienda de emergencia, rancho o choza |
| 7 | Móvil (carpa, casa rodante o similar) |
| 8 | Otro tipo de vivienda particular |
| 9 | No aplica |

**Mapeo a synthetic_agents:**
- No aplica directamente (es de vivienda, no de persona)
- Podría usarse para inferir `socioeconomic_level`

---

### 3. DICCIONARIO: Material de Paredes (Censo)

**Variable Censo:** `p4a_mat_paredes`
**Tabla propuesta:** `wall_material_dict`

```sql
CREATE TABLE wall_material_dict (
    code INTEGER PRIMARY KEY,
    label VARCHAR(100) NOT NULL
);
```

**Valores:**
| Código | Descripción |
|--------|-------------|
| 1 | Hormigón armado |
| 2 | Albañilería: bloque de cemento, ladrillo o piedra |
| 3 | Tabique forrado por ambas caras (madera o acero) |
| 4 | Tabique sin forro interior (madera u otro) |
| 5 | Adobe, barro, pirca, quincha u otro material artesanal |
| 6 | Materiales precarios o de desecho |
| -99 | No respuesta |

**Mapeo a synthetic_agents:**
- No aplica directamente
- Podría usarse como proxy de `socioeconomic_level`

---

### 4. DICCIONARIO: Sexo (Censo/CASEN)

**Variable Censo:** `sexo`
**Tabla propuesta:** `sex_dict`

```sql
CREATE TABLE sex_dict (
    code INTEGER PRIMARY KEY,
    label VARCHAR(20) NOT NULL
);
```

**Valores:**
| Código | Descripción |
|--------|-------------|
| 1 | Hombre |
| 2 | Mujer |

**Mapeo a synthetic_agents:**
```sql
-- Ya existe constraint CHECK:
sex VARCHAR(10) CHECK (sex IN ('male', 'female'))

-- Mapeo: 1 → 'male', 2 → 'female'
```

---

### 5. DICCIONARIO: Estado Civil (Censo)

**Variable Censo:** `p23_est_civil`
**Tabla propuesta:** `marital_status_dict`

```sql
CREATE TABLE marital_status_dict (
    code INTEGER PRIMARY KEY,
    label VARCHAR(50) NOT NULL
);
```

**Valores:**
| Código | Descripción |
|--------|-------------|
| 1 | Casado/a |
| 2 | Conviviente o pareja sin acuerdo de unión civil |
| 3 | Conviviente civil (con acuerdo de unión civil) |
| 4 | Anulado/a |
| 5 | Separado/a |
| 6 | Divorciado/a |
| 7 | Viudo/a |
| 8 | Soltero/a |
| -99 | No respuesta |

**Mapeo a synthetic_agents:**
- No existe campo directo en `synthetic_agents`
- Podría agregarse o usarse para inferir `household_type`

---

### 6. DICCIONARIO: Parentesco (Censo)

**Variable Censo:** `parentesco`
**Tabla propuesta:** `relationship_dict`

```sql
CREATE TABLE relationship_dict (
    code INTEGER PRIMARY KEY,
    label VARCHAR(50) NOT NULL
);
```

**Valores:**
| Código | Descripción |
|--------|-------------|
| 1 | Jefe/a de hogar |
| 2 | Esposo/a o cónyuge |
| 3 | Conviviente por unión civil |
| 4 | Conviviente de hecho o pareja |
| 5 | Hijo/a |
| 6 | Hijo/a del cónyuge, conviviente o pareja |
| 7 | Hermano/a |
| 8 | Padre/Madre |
| 9 | Cuñado/a |
| 10 | Suegro/a |
| 11 | Yerno/Nuera |
| 12 | Nieto/a |
| 13 | Abuelo/a |
| 14 | Otro Pariente |
| 15 | No Pariente |
| 16 | Servicio doméstico puertas adentro |
| 17 | Persona en vivienda colectiva |
| 19 | Persona en operativo calle |

**Mapeo a synthetic_agents:**
- No existe campo directo
- Útil para inferir `household_type`

---

### 7. DICCIONARIO: Nivel Educacional (Censo/CASEN)

**Variable Censo:** `cine11` (Clasificación Internacional Normalizada de la Educación)
**Tabla propuesta:** `education_level_dict`

```sql
CREATE TABLE education_level_dict (
    code VARCHAR(10) PRIMARY KEY,
    label VARCHAR(100) NOT NULL,
    years_range VARCHAR(20)
);
```

**Valores:**
| Código | Descripción |
|--------|-------------|
| 01 | Nunca cursó un programa educativo |
| 02 | Educación de la primera infancia |
| 03 | Primaria en forma parcial |
| 10 | Educación primaria (nivel 1) |
| 14 | Educación primaria (nivel 2), con orientación general |
| 24 | Educación secundaria, con orientación general |
| 25 | Educación secundaria, con orientación vocacional |
| 35 | Educación terciaria de ciclo corto, con orientación vocacional |
| 46 | Grado de educación terciaria o nivel equivalente |
| 56 | Nivel de maestría, especialización o equivalente |
| 64 | Nivel de doctorado o equivalente |
| 98 | Educación especial o diferencial |

**Mapeo a synthetic_agents:**
```sql
-- Mapeo propuesto:
-- 01 → 'none'
-- 02, 03, 10, 14 → 'primary'
-- 24, 25 → 'secondary'
-- 35 → 'technical'
-- 46 → 'university'
-- 56, 64 → 'postgraduate'
-- 98 → 'none' (o valor especial)
```

---

### 8. DICCIONARIO: Situación en la Fuerza de Trabajo (Censo)

**Variable Censo:** `sit_fuerza_trabajo`
**Tabla propuesta:** `employment_status_dict`

```sql
CREATE TABLE employment_status_dict (
    code INTEGER PRIMARY KEY,
    label VARCHAR(50) NOT NULL
);
```

**Valores:**
| Código | Descripción |
|--------|-------------|
| 1 | Ocupado |
| 2 | Desocupado |
| 3 | Fuera de la fuerza de trabajo |
| -99 | No respuesta |

**Mapeo a synthetic_agents.occupation_status:**
```sql
-- Mapeo propuesto:
-- 1 → 'employed'
-- 2 → 'unemployed'
-- 3 → 'inactive'
-- -99 → NULL
```

---

### 9. DICCIONARIO: Categoría de Ocupación (Censo)

**Variable Censo:** `p40_cise_rec`
**Tabla propuesta:** `occupation_category_dict`

```sql
CREATE TABLE occupation_category_dict (
    code INTEGER PRIMARY KEY,
    label VARCHAR(100) NOT NULL
);
```

**Valores:**
| Código | Descripción |
|--------|-------------|
| 1 | Independiente |
| 2 | Dependiente |
| 3 | Trabajador/a familiar o personal no remunerado |
| -99 | No respuesta |

**Mapeo a synthetic_agents:**
- Podría mapearse a `occupation_status` o crear campo separado

---

### 10. DICCIONARIO: CIUO-08.CL (Ocupaciones)

**Variable Censo:** `cod_ciuo`
**Tabla propuesta:** `ciuo_occupation_dict`

```sql
CREATE TABLE ciuo_occupation_dict (
    code VARCHAR(10) PRIMARY KEY,
    label VARCHAR(100) NOT NULL,
    category VARCHAR(50)
);
```

**Valores (1 dígito):**
| Código | Descripción |
|--------|-------------|
| 1 | Directores, gerentes y administradores |
| 2 | Profesionales, científicos e intelectuales |
| 3 | Técnicos y profesionales de nivel medio |
| 4 | Personal de apoyo administrativo |
| 5 | Trabajadores de los servicios y vendedores |
| 6 | Agricultores y trabajadores calificados agropecuarios |
| 7 | Artesanos y operarios de oficios |
| 8 | Operadores de instalaciones, máquinas y ensambladores |
| 9 | Ocupaciones elementales |
| 0 | Ocupaciones de las fuerza armadas |
| 999 | Respuesta no codificable |

**Mapeo a synthetic_agents.occupation_group:**
- Usar directamente como FK

---

### 11. DICCIONARIO: CAENES (Actividades Económicas)

**Variable Censo:** `cod_caenes`
**Tabla propuesta:** `caenes_activity_dict`

```sql
CREATE TABLE caenes_activity_dict (
    code VARCHAR(10) PRIMARY KEY,
    label VARCHAR(100) NOT NULL,
    sector VARCHAR(50)
);
```

**Valores (1 dígito):**
| Código | Descripción |
|--------|-------------|
| A | Agricultura, ganadería, silvicultura y pesca |
| B | Explotación de minas y canteras |
| C | Industrias manufactureras |
| D | Suministro de electricidad, gas, vapor |
| E | Suministro de agua; evacuación de aguas residuales |
| F | Construcción |
| G | Comercio al por mayor y al por menor |
| H | Transporte y almacenamiento |
| I | Actividades de alojamiento y de servicio de comidas |
| J | Información y comunicaciones |
| K | Actividades financieras y de seguros |
| L | Actividades inmobiliarias |
| M | Actividades profesionales, científicas y técnicas |
| N | Actividades de servicios administrativos y de apoyo |
| O | Administración pública y defensa |
| P | Enseñanza |
| Q | Actividades de atención de la salud humana |
| R | Actividades artísticas, de entretenimiento |
| S | Otras actividades de servicios |
| T | Actividades de los hogares como empleadores |
| U | Actividades de organizaciones y órganos extraterritoriales |
| 999 | Respuesta no codificable |

**Mapeo a synthetic_agents:**
- Podría agregarse como campo `economic_activity`

---

### 12. DICCIONARIO: Pueblo Indígena (Censo)

**Variable Censo:** `p28_pueblo_pert`
**Tabla propuesta:** `indigenous_people_dict`

```sql
CREATE TABLE indigenous_people_dict (
    code INTEGER PRIMARY KEY,
    label VARCHAR(50) NOT NULL
);
```

**Valores:**
| Código | Descripción |
|--------|-------------|
| 1 | Mapuche |
| 2 | Aymara |
| 3 | Rapa Nui |
| 4 | Atacameño o Lickanantay |
| 5 | Quechua |
| 6 | Colla |
| 7 | Diaguita |
| 8 | Kawésqar |
| 9 | Yagán |
| 10 | Chango |
| 11 | Selk'nam |
| 12 | Otro |

**Mapeo a synthetic_agents:**
- No existe campo actualmente
- Podría agregarse como `indigenous_affiliation`

---

### 13. DICCIONARIO: Discapacidad (Censo)

**Variable Censo:** `discapacidad`
**Tabla propuesta:** `disability_status_dict`

```sql
CREATE TABLE disability_status_dict (
    code INTEGER PRIMARY KEY,
    label VARCHAR(50) NOT NULL
);
```

**Valores:**
| Código | Descripción |
|--------|-------------|
| 1 | Con discapacidad |
| 2 | Sin discapacidad |
| -99 | No respuesta |

**Mapeo a synthetic_agents:**
- No existe campo actualmente
- Podría agregarse como `has_disability`

---

### 14. DICCIONARIO: Dificultades (Censo)

**Variables:** `p32a_dificultad_ver` hasta `p32f_dificultad_comunic`
**Tabla propuesta:** `difficulty_level_dict`

```sql
CREATE TABLE difficulty_level_dict (
    code INTEGER PRIMARY KEY,
    label VARCHAR(50) NOT NULL
);
```

**Valores:**
| Código | Descripción |
|--------|-------------|
| 1 | No, sin dificultad |
| 2 | Sí, algo de dificultad |
| 3 | Sí, mucha dificultad |
| 4 | No puede hacerlo |
| -99 | No respuesta |

---

### 15. DICCIONARIO: Medio de Transporte (Censo)

**Variable Censo:** `p45_medio_transporte`
**Tabla propuesta:** `transport_mode_dict`

```sql
CREATE TABLE transport_mode_dict (
    code INTEGER PRIMARY KEY,
    label VARCHAR(100) NOT NULL
);
```

**Valores:**
| Código | Descripción |
|--------|-------------|
| 1 | Auto particular |
| 2 | Transporte público (bus, micro, metro, tren, taxi, colectivo) |
| 3 | Caminando |
| 4 | Bicicleta (incluye scooter) |
| 5 | Motocicleta |
| 6 | Caballo, lancha o bote |
| 7 | Otro |
| -99 | No respuesta |

---

### 16. DICCIONARIO: Edad Quinquenal (Censo)

**Variable Censo:** `edad_quinquenal`
**Tabla propuesta:** `age_group_dict`

```sql
CREATE TABLE age_group_dict (
    code INTEGER PRIMARY KEY,
    label VARCHAR(20) NOT NULL,
    min_age INTEGER,
    max_age INTEGER
);
```

**Valores:**
| Código | Rango |
|--------|-------|
| 0 | 0-4 |
| 5 | 5-9 |
| 10 | 10-14 |
| 15 | 15-19 |
| 20 | 20-24 |
| 25 | 25-29 |
| 30 | 30-34 |
| 35 | 35-39 |
| 40 | 40-44 |
| 45 | 45-49 |
| 50 | 50-54 |
| 55 | 55-59 |
| 60 | 60-64 |
| 65 | 65-69 |
| 70 | 70-74 |
| 75 | 75-79 |
| 80 | 80-84 |
| 85 | 85 o más |

**Mapeo a synthetic_agents.age_group:**
```sql
-- Mapeo propuesto:
-- 0-4 → 'child'
-- 5-9 → 'child'
-- 10-14 → 'youth'
-- 15-19 → 'youth'
-- 20-24 → 'young_adult'
-- 25-29 → 'young_adult'
-- 30-34 → 'adult'
-- 35-39 → 'adult'
-- 40-44 → 'adult'
-- 45-49 → 'middle_age'
-- 50-54 → 'middle_age'
-- 55-59 → 'middle_age'
-- 60-64 → 'senior'
-- 65+ → 'elderly'
```

---

## 📊 Resumen de Diccionarios Requeridos

### Diccionarios OBLIGATORIOS (ya mapeados en synthetic_agents):

| Diccionario | Campo en synthetic_agents | Prioridad |
|-------------|---------------------------|-----------|
| `sex_dict` | `sex` | ✅ Alta |
| `education_level_dict` | `education_level` | ✅ Alta |
| `employment_status_dict` | `occupation_status` | ✅ Alta |
| `age_group_dict` | `age_group` | ✅ Alta |

### Diccionarios RECOMENDADOS (enriquecen el modelo):

| Diccionario | Uso | Prioridad |
|-------------|-----|-----------|
| `territory_codes_dict` | Validar region/comuna | ✅ Alta |
| `ciuo_occupation_dict` | `occupation_group` | ✅ Media |
| `caenes_activity_dict` | Nuevo campo `economic_activity` | ✅ Media |
| `marital_status_dict` | Inferir `household_type` | 🟡 Baja |
| `indigenous_people_dict` | Nuevo campo | 🟡 Baja |
| `disability_status_dict` | Nuevo campo | 🟡 Baja |

### Diccionarios OPCIONALES (análisis avanzado):

| Diccionario | Uso | Prioridad |
|-------------|-----|-----------|
| `dwelling_type_dict` | Proxy socioeconómico | 🟡 Baja |
| `wall_material_dict` | Proxy socioeconómico | 🟡 Baja |
| `transport_mode_dict` | Análisis de movilidad | 🟡 Baja |
| `difficulty_level_dict` | Accesibilidad | 🟡 Baja |

---

## 🎯 Recomendación Final

### Para `synthetic_agents` actual:

**1. Crear estos diccionarios como tablas de referencia:**

```sql
-- 1. Territory codes (ya existe en territories, pero verificar)
-- 2. Sex
-- 3. Education level
-- 4. Employment status
-- 5. Age group
-- 6. CIUO occupations
```

**2. Agregar constraints CHECK basados en diccionarios:**

```sql
-- Ejemplo:
ALTER TABLE synthetic_agents
ADD CONSTRAINT check_education_level
CHECK (education_level IN (
    SELECT code FROM education_level_dict
));
```

**3. Crear tabla de mapeo Censo/CASEN → synthetic_agents:**

```sql
CREATE TABLE variable_mapping (
    source VARCHAR(20),  -- 'censo', 'casen'
    source_variable VARCHAR(50),
    source_code VARCHAR(20),
    target_table VARCHAR(50),
    target_field VARCHAR(50),
    target_value VARCHAR(50)
);
```

---

## ✅ Verificación de Integridad

Los 25,000 agentes cargados deben tener:
- ✅ `sex` → mapeado de Censo/CASEN
- ✅ `age_group` → calculado de edad
- ✅ `education_level` → mapeado de Censo/CASEN
- ✅ `occupation_status` → mapeado de Censo/CASEN
- ✅ `region_code` → mapeado de Censo/CASEN
- ✅ `comuna_code` → mapeado de Censo/CASEN

**Los diccionarios garantizan que estos valores sean consistentes con los oficiales del INE.**
