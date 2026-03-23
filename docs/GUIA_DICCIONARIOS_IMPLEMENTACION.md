# Guía de Implementación de Diccionarios Censo/CASEN

## 📋 Resumen

Esta guía documenta la implementación completa de **diccionarios oficiales del Censo 2024 y CASEN** para la tabla `synthetic_agents`, garantizando que los 25,000 agentes sintéticos utilicen códigos validados por el INE Chile.

---

## 🗂️ Archivos Creados

### 1. **Diccionarios** (`deploy/init/07-diccionarios-censo-casen.sql`)
Crea 10 tablas de diccionario con datos oficiales:

| Tabla | Descripción | Registros |
|-------|-------------|-----------|
| `dict_sex` | Sexo (Hombre/Mujer) | 2 |
| `dict_age_group` | Grupos de edad quinquenal | 18 |
| `dict_education_level` | Nivel educacional CINE-11 | 12 |
| `dict_employment_status` | Situación laboral | 4 |
| `dict_occupation_category` | Categoría CISE | 4 |
| `dict_ciuo_occupation` | Ocupaciones CIUO-08.CL | 11 |
| `dict_caenes_activity` | Actividades económicas CAENES | 22 |
| `dict_marital_status` | Estado civil | 9 |
| `dict_indigenous_people` | Pueblos indígenas | 12 |
| `dict_disability_status` | Discapacidad | 3 |

### 2. **Vinculación** (`deploy/init/08-link-agents-to-dictionaries.sql`)
Vincula `synthetic_agents` con los diccionarios:
- Agrega 10 campos de código (`*_code`)
- Crea índices para búsquedas rápidas
- Implementa trigger de sincronización automática
- Crea vista enriquecida `v_synthetic_agents_enriched`
- Incluye funciones de validación

---

## 🚀 Orden de Ejecución

```sql
-- 1. Crear schema base (si no existe)
\i deploy/init/00-complete-schema-for-agents.sql

-- 2. Crear diccionarios
\i deploy/init/07-diccionarios-censo-casen.sql

-- 3. Vincular con synthetic_agents
\i deploy/init/08-link-agents-to-dictionaries.sql

-- 4. Cargar agentes (si aún no están cargados)
\i data/processed/synthetic_agents_v1.sql
```

---

## 🔗 Estructura de Vinculación

### Campos en `synthetic_agents`

```
┌─────────────────────────────┐
│     synthetic_agents        │
├─────────────────────────────┤
│ sex (mapped)                │◄──┐
│ sex_code (censo)            │───┼──► dict_sex
│                             │   │
│ age_group (mapped)          │◄──┤
│ age_group_code (censo)      │───┼──► dict_age_group
│                             │   │
│ education_level (mapped)    │◄──┤
│ education_level_code (censo)│───┼──► dict_education_level
│                             │   │
│ occupation_status (mapped)  │◄──┤
│ occupation_status_code      │───┼──► dict_employment_status
│                             │   │
│ ciuo_code                   │───┼──► dict_ciuo_occupation
│ caenes_code                 │───┼──► dict_caenes_activity
│ marital_status_code         │───┼──► dict_marital_status
│ indigenous_people_code      │───┼──► dict_indigenous_people
│ disability_status_code      │───┘──► dict_disability_status
└─────────────────────────────┘
```

### Mapeo de Valores

| Campo en Agentes | Valor Mapeado | Código Censo | Label Oficial |
|------------------|---------------|--------------|---------------|
| `sex` | 'male' | 1 | 'Hombre' |
| `sex` | 'female' | 2 | 'Mujer' |
| `age_group` | 'child' | 0, 5 | '0-4', '5-9' |
| `age_group` | 'young_adult' | 20, 25 | '20-24', '25-29' |
| `education_level` | 'primary' | 03, 10, 14 | 'Primaria' |
| `education_level` | 'university' | 46 | 'Grado educación terciaria' |
| `occupation_status` | 'employed' | 1 | 'Ocupado' |
| `occupation_status` | 'unemployed' | 2 | 'Desocupado' |

---

## 📊 Uso de las Vistas y Funciones

### 1. Vista Enriquecida

```sql
-- Ver agentes con información de diccionarios
SELECT 
    agent_id,
    sex,
    sex_label,
    age_group,
    age_group_label,
    education_level,
    education_label,
    education_years
FROM v_synthetic_agents_enriched
LIMIT 10;
```

### 2. Validar Integridad

```sql
-- Verificar que todos los valores cumplen con los diccionarios
SELECT * FROM validate_agent_dictionary_integrity();
```

Resultado esperado: 0 registros inválidos en todos los campos.

### 3. Sincronizar Códigos

```sql
-- Si se cargan nuevos agentes, sincronizar códigos:
SELECT sync_agent_codes_from_mapped_values();
```

---

## 🔒 Integridad Referencial

### Foreign Keys (Opcional)

Las Foreign Keys están **comentadas** en el archivo `08-link-agents-to-dictionaries.sql` porque:

1. **Flexibilidad**: Permite cargar agentes con códigos nuevos sin modificar diccionarios
2. **Migración**: Facilita la migración de datos históricos
3. **Desarrollo**: Permite pruebas con valores temporales

### Para Activar FKs (Producción)

```sql
-- Descomentar en 08-link-agents-to-dictionaries.sql o ejecutar:
ALTER TABLE synthetic_agents
ADD CONSTRAINT fk_agents_sex_code
FOREIGN KEY (sex_code) REFERENCES dict_sex(code)
ON UPDATE CASCADE ON DELETE SET NULL;

-- Repetir para cada campo *_code
```

---

## 📝 Ejemplos de Consultas

### 1. Distribución por Sexo (con labels oficiales)

```sql
SELECT 
    ds.label AS sexo,
    COUNT(*) AS cantidad,
    ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER(), 2) AS porcentaje
FROM synthetic_agents a
JOIN dict_sex ds ON a.sex = ds.mapped_value
GROUP BY ds.label
ORDER BY cantidad DESC;
```

### 2. Distribución por Nivel Educacional

```sql
SELECT 
    del.label AS nivel_educacional,
    del.years_range AS años_estudio,
    COUNT(*) AS cantidad
FROM synthetic_agents a
JOIN dict_education_level del ON a.education_level = del.mapped_value
GROUP BY del.label, del.years_range, del.sort_order
ORDER BY del.sort_order;
```

### 3. Agentes por Sector Económico (CAENES)

```sql
SELECT 
    dcaenes.sector,
    dcaenes.label AS actividad,
    COUNT(*) AS cantidad
FROM synthetic_agents a
JOIN dict_caenes_activity dcaenes ON a.caenes_code = dcaenes.code
WHERE a.caenes_code IS NOT NULL
GROUP BY dcaenes.sector, dcaenes.label
ORDER BY dcaenes.sector, cantidad DESC;
```

### 4. Validación de Códigos Indígenas

```sql
SELECT 
    dip.label AS pueblo_indigena,
    dip.region_traditional AS region_tradicional,
    COUNT(*) AS cantidad
FROM synthetic_agents a
JOIN dict_indigenous_people dip ON a.indigenous_people_code = dip.code
GROUP BY dip.label, dip.region_traditional
ORDER BY cantidad DESC;
```

---

## 🔄 Mantenimiento

### Actualizar Diccionarios

Si el INE publica nuevos códigos:

```sql
-- Ejemplo: Agregar nuevo código de educación
INSERT INTO dict_education_level (code, label, mapped_value, sort_order)
VALUES ('99', 'Nuevo nivel', 'new_level', 13)
ON CONFLICT (code) DO UPDATE SET
    label = EXCLUDED.label,
    mapped_value = EXCLUDED.mapped_value;
```

### Recalcular Sincronización

```sql
-- Si se modifican mapeos, recalcular:
UPDATE synthetic_agents SET sex = sex;  -- Trigger actualizará sex_code
```

---

## ✅ Verificación Post-Implementación

Ejecutar estas consultas para verificar:

```sql
-- 1. Verificar que existen todos los diccionarios
SELECT table_name 
FROM information_schema.tables 
WHERE table_name LIKE 'dict_%'
ORDER BY table_name;

-- 2. Verificar campos de código en synthetic_agents
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'synthetic_agents' 
  AND column_name LIKE '%_code';

-- 3. Verificar integridad de datos
SELECT * FROM validate_agent_dictionary_integrity();

-- 4. Contar agentes sincronizados
SELECT 
    COUNT(*) FILTER (WHERE sex_code IS NOT NULL) AS con_sex_code,
    COUNT(*) FILTER (WHERE age_group_code IS NOT NULL) AS con_age_code,
    COUNT(*) FILTER (WHERE education_level_code IS NOT NULL) AS con_edu_code,
    COUNT(*) AS total
FROM synthetic_agents;
```

---

## 📚 Referencias

- **Documento de análisis**: `docs/DICCIONARIOS_CENSO_CASEN_ANALISIS.md`
- **Schema completo**: `deploy/init/00-complete-schema-for-agents.sql`
- **Diccionarios**: `deploy/init/07-diccionarios-censo-casen.sql`
- **Vinculación**: `deploy/init/08-link-agents-to-dictionaries.sql`

---

## 🎯 Beneficios de esta Implementación

1. **Trazabilidad**: Cada agente tiene códigos oficiales del Censo
2. **Validación**: Los valores están validados contra diccionarios INE
3. **Flexibilidad**: Se pueden agregar nuevos códigos sin modificar la estructura
4. **Consultas enriquecidas**: La vista `v_synthetic_agents_enriched` incluye labels oficiales
5. **Integridad**: Trigger automático mantiene sincronizados códigos y valores
6. **Auditoría**: Funciones de validación permiten verificar calidad de datos

---

**Fecha de implementación**: 23 de marzo, 2026  
**Versión**: 1.0  
**Responsable**: Sistema de Diccionarios Pulsos Sociales
