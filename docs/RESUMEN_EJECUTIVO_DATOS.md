# Resumen Ejecutivo - Estado de Datos de Agentes

**Fecha:** 24 de marzo de 2026  
**Proyecto:** Pulso Social

---

## 🎯 CONCLUSIÓN PRINCIPAL

**Los campos vacíos NO son un problema de la base de datos, sino del pipeline de datos que está usando mocks en lugar de las bases reales disponibles.**

---

## 📊 ESTADO ACTUAL

### Agentes Generados: 1,400
- ✅ Datos demográficos completos (sintéticos)
- ✅ Distribuciones realistas
- ❌ Sin enriquecimiento con datos CASEN reales
- ❌ Sin coordenadas GPS
- ❌ Basados en SUBTEL mínimo (16 registros vs 5,000 disponibles)

---

## 🔴 PROBLEMAS IDENTIFICADOS

### 1. CASEN No Integrado
```
Disponible:  218,367 registros (1.5 GB)
Usado:       1 registro mock
Impacto:     Perfiles socioeconómicos sintéticos
```

### 2. SUBTEL Subutilizado
```
Disponible:  5,000 hogares, 90 comunas, 587 variables
Usado:       16 registros agregados por región
Impacto:     Conectividad aproximada, no por comuna
```

### 3. Censo 2024 No Usado
```
Disponible:  18,480,432 personas (2.3 GB)
Usado:       0 registros
Impacto:     Sin validación contra población real
```

### 4. Sin Georreferenciación
```
Coordenadas: No generadas
Impacto:     Agentes no ubicables en mapa con precisión
```

---

## 📁 UBICACIÓN DE BASES REALES

```
/Users/camiloalegria/Desktop/AIntelligence/Simulador 1MM usuarios/BBDD/
├── casen_2024.dta                    (218K personas, 877 vars)
├── casen_2024_provincia_comuna.dta   (Datos territoriales)
├── BBDDSubtel2025_031225.sav         (5K hogares, 587 vars)
├── personas_censo2024.csv            (18.4M personas)
├── hogares_censo2024.csv             (Datos hogar)
└── viviendas_censo2024.csv           (Datos vivienda)
```

---

## ✅ SOLUCIONES REQUERIDAS

### Prioridad 1: Integrar CASEN (1-2 días)
- Crear script para leer archivos `.dta` (Stata)
- Extraer ingresos, pobreza, educación, ocupación
- Generar perfiles por estratos demográficos

### Prioridad 2: Integrar SUBTEL (1 día)
- Crear script para leer archivo `.sav` (SPSS)
- Extraer conectividad, dispositivos, acceso
- Calcular perfiles por comuna

### Prioridad 3: Agregar Coordenadas (1 día)
- Obtener polígonos de comunas
- Generar coordenadas aleatorias por comuna
- Asignar a cada agente

### Prioridad 4: Regenerar Agentes (1 día)
- Usar datos reales CASEN + SUBTEL
- Generar synthetic_agents_v2.json
- Validar calidad

### Prioridad 5: Recargar Supabase (1 día)
- Actualizar seed_agents.ts
- Cargar nuevos agentes
- Verificar integridad

---

## 📈 IMPACTO ESPERADO

| Aspecto | Antes | Después |
|---------|-------|---------|
| Fuente ingresos | Sintético | CASEN 2024 real |
| Fuente pobreza | Sintético | CASEN 2024 real |
| Conectividad | Regional | Por comuna (90) |
| Coordenadas | Ninguna | GPS preciso |
| Tamaño muestra | 1,400 | 25,000-100,000 |
| Calidad general | 🟡 Regular | 🟢 Alta |

---

## 🚀 PRÓXIMO PASO INMEDIATO

**Crear scripts de ingestión para CASEN y SUBTEL reales**

Ver documento completo: `docs/ANALISIS_CALIDAD_DATOS_AGENTES.md`

---

*Generado el 24 de marzo de 2026*
