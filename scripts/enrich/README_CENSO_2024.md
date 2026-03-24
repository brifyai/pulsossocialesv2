# Enriquecimiento de Agentes con Datos Reales del Censo 2024

## 📋 Resumen

Este script enriquece los agentes sintéticos con datos **100% reales** provenientes del Censo 2024 del INE Chile.

## 🎯 Campos Completados

| Campo | Fuente Censo 2024 | Descripción |
|-------|-------------------|-------------|
| `internet_quality` | `hogares_censo2024.csv` | Calculado desde servicios de internet del hogar |
| `poverty_status` | `viviendas_censo2024.csv` | Calculado desde condiciones de vivienda |
| `occupation_category_code` | `personas_censo2024.csv` | `p40_cise_rec` - Categoría ocupacional CISE |
| `ciuo_code` | `personas_censo2024.csv` | `cod_ciuo` - Código de ocupación CIUO |
| `caenes_code` | `personas_censo2024.csv` | `cod_caenes` - Código de actividad CAENES |
| `marital_status_code` | `personas_censo2024.csv` | `p23_est_civil` - Estado civil |
| `indigenous_people_code` | `personas_censo2024.csv` | `p28_autoid_pueblo` - Pueblos indígenas |
| `disability_status_code` | `personas_censo2024.csv` | `discapacidad` - Indicador de discapacidad |
| `territory_id` | `personas_censo2024.csv` | Mapeo desde `region` + `comuna` |

## 📁 Archivos de Datos Requeridos

Los siguientes archivos deben estar en `/Users/camiloalegria/Desktop/AIntelligence/Simulador 1MM usuarios/BBDD/`:

1. **personas_censo2024.csv** (18.4M registros)
   - Datos demográficos, laborales, educación
   - Discapacidad, pueblos indígenas

2. **hogares_censo2024.csv**
   - Servicios de conectividad (internet, telefonía)
   - Servicios del hogar

3. **viviendas_censo2024.csv**
   - Condiciones de vivienda
   - Materiales de construcción
   - Índice de hacinamiento

## 🚀 Uso

### 1. Compilar el script

```bash
cd scripts
npx tsc -p tsconfig.json
```

### 2. Ejecutar el enriquecimiento

```bash
node ../dist/scripts/enrich/enrich_agents_from_censo2024.js
```

### 3. O ejecutar directamente con ts-node

```bash
npx ts-node --project tsconfig.json enrich/enrich_agents_from_censo2024.ts
```

## ⚙️ Configuración

Editar las rutas en el script si es necesario:

```typescript
const CONFIG = {
  // Directorio con archivos del Censo 2024
  censoDir: '/Users/camiloalegria/Desktop/AIntelligence/Simulador 1MM usuarios/BBDD',

  // Directorio con batches SQL de agentes
  agentsInputDir: '/Users/camiloalegria/Desktop/AIntelligence/Simulador 1MM usuarios/output/sql_batches',

  // Directorio de salida
  outputDir: '/Users/camiloalegria/Desktop/AIntelligence/Simulador 1MM usuarios/output/sql_batches_censo_enriched',

  // Número de batches a procesar
  totalBatches: 50
};
```

## 📊 Algoritmos de Enriquecimiento

### Calidad de Internet
Calculado desde servicios del hogar:
- Internet fija: +3 puntos
- Internet móvil: +2 puntos
- Internet satelital: +1 punto
- Computador: +2 puntos
- Tablet: +1 punto

Clasificación:
- `excellent` (≥6 puntos)
- `good` (4-5 puntos)
- `fair` (2-3 puntos)
- `poor` (1 punto)
- `none` (0 puntos)

### Estado de Pobreza
Calculado desde condiciones de vivienda:
- Hacinamiento (>2.5): +3 puntos
- Materiales precarios: +2 puntos cada uno

Clasificación:
- `extreme_poverty` (≥6 puntos)
- `poverty` (4-5 puntos)
- `vulnerable` (2-3 puntos)
- `non_poor` (<2 puntos)

### Matching de Personas
El script busca personas del Censo que coincidan con:
- Misma región
- Mismo sexo
- Rango de edad similar (±5 años)

## 📈 Salida

Los archivos enriquecidos se guardan en:
```
/Users/camiloalegria/Desktop/AIntelligence/Simulador 1MM usuarios/output/sql_batches_censo_enriched/
```

Formato: `insert_agents_batch_XXX_censo_enriched.sql`

Cada INSERT incluye:
- Todos los campos originales
- Campos enriquecidos del Censo 2024
- Metadata JSONB con referencias al Censo

## 🔍 Verificación

Para verificar que los campos se completaron correctamente:

```sql
-- Verificar campos enriquecidos
SELECT
  COUNT(*) as total,
  COUNT(internet_quality) as with_internet,
  COUNT(poverty_status) as with_poverty,
  COUNT(occupation_category_code) as with_occupation,
  COUNT(ciuo_code) as with_ciuo,
  COUNT(caenes_code) as with_caenes,
  COUNT(marital_status_code) as with_marital,
  COUNT(indigenous_people_code) as with_indigenous,
  COUNT(disability_status_code) as with_disability
FROM synthetic_agents;
```

## 📝 Notas

- El script procesa ~18.4 millones de registros del Censo
- Requiere ~4-8 GB de RAM para cargar todos los datos
- El procesamiento puede tomar 10-30 minutos dependiendo del hardware
- Los datos se mantienen en memoria para búsquedas rápidas

## 🐛 Troubleshooting

### Error: "No se encuentra el nombre 'fs'"
Asegúrate de usar el tsconfig.json de scripts:
```bash
npx tsc -p scripts/tsconfig.json
```

### Error: "Archivo no encontrado"
Verifica que las rutas en `CONFIG` apunten a los archivos correctos.

### Memoria insuficiente
Si hay problemas de memoria, considera:
1. Aumentar el heap de Node: `node --max-old-space-size=8192 ...`
2. Procesar por regiones en lugar de cargar todo

## 📚 Referencias

- [DIAGNOSTICO_CENSO2024.md](../../BBDD/DIAGNOSTICO_CENSO2024.md) - Documentación del Censo 2024
- [ANALISIS_CAMPOS_SINTHETIC_AGENTS.md](../../docs/ANALISIS_CAMPOS_SINTHETIC_AGENTS.md) - Análisis de campos
