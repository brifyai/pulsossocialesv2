# 📊 Auditoría de Persistencia - Pulso Social

**Fecha:** 17 de marzo de 2026  
**Versión:** Sprint 13  
**Auditor:** Claude Code

---

## 🎯 Resumen Ejecutivo

Esta auditoría analiza el estado actual de la persistencia de datos en la aplicación Pulso Social, identificando qué datos se guardan en Supabase vs. qué datos funcionan solo en memoria local.

### Estado General
- ✅ **Supabase configurado** con lazy loading y fallback automático
- ❌ **Variables de entorno NO configuradas** (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY)
- ⚠️ **La aplicación funciona completamente en modo offline** (datos locales)

---

## 📋 Tabla de Estado de Persistencia

### 1. Territorios (Regiones/Comunas)

| Aspecto | Estado | Detalle |
|---------|--------|---------|
| **Repositorio** | `territoryRepository.ts` | ✅ Implementado |
| **Tabla DB** | `territories` | ✅ Existe en schema |
| **Persistencia** | ❌ **NO FUNCIONA** | Sin credenciales Supabase |
| **Fallback** | ✅ `chileRegions.ts` | Datos locales de 16 regiones |
| **Cobertura** | Solo regiones | ❌ Sin comunas en fallback |

**Funciones disponibles:**
- `getTerritories()` - Con paginación y filtros
- `getTerritoryByCode()` - Busca por código corto (RM, VA, etc.)
- `getRegions()` - Lista regiones con centroides
- `getComunasByRegion()` - ⚠️ Retorna vacío en fallback
- `searchTerritories()` - Búsqueda por nombre

**Problemas identificados:**
- Los datos locales solo incluyen regiones, no comunas
- Sin comunas, los filtros por comuna no funcionan correctamente

---

### 2. Agentes Sintéticos

| Aspecto | Estado | Detalle |
|---------|--------|---------|
| **Repositorio** | `agentRepository.ts` | ✅ Implementado |
| **Tabla DB** | `synthetic_agents` | ✅ Existe en schema |
| **Persistencia** | ❌ **NO FUNCIONA** | Sin credenciales Supabase |
| **Fallback** | ✅ `syntheticAgents.ts` | Carga desde JSON local |
| **Archivo fuente** | `synthetic_agents_v1.json` | ~2,000 agentes |

**Funciones disponibles:**
- `getAgents()` - Con filtros y paginación
- `getAgentById()` - Busca agente específico
- `getUniqueRegions()` - Regiones únicas de agentes
- `getUniqueCommunes()` - Comunas únicas de agentes
- `getAgentStats()` - Estadísticas agregadas

**Problemas identificados:**
- Los agentes locales tienen comunas, pero no hay tabla territories para validar
- Posible inconsistencia entre códigos de comuna en agentes vs. territories

---

### 3. Encuestas - Definiciones (Sprint 11A)

| Aspecto | Estado | Detalle |
|---------|--------|---------|
| **Repositorio** | `surveyRepository.ts` | ✅ Implementado |
| **Servicio** | `surveyService.ts` | ✅ Implementado |
| **Tabla DB** | `survey_definitions` | ✅ Existe en schema |
| **Persistencia** | ❌ **NO FUNCIONA** | Sin credenciales Supabase |
| **Fallback** | ✅ Map en memoria | `const surveys: Map<string, SurveyDefinition>` |
| **Sincronización** | ✅ Implementada | `syncFromDatabase()` carga desde DB al inicio |

**Funciones disponibles:**
- `createSurvey()` - Crea encuesta (DB → local)
- `getAllSurveys()` - Lista todas (con sync desde DB)
- `getSurvey()` - Obtiene una encuesta
- `deleteSurvey()` - Elimina encuesta

**Problemas identificados:**
- Las encuestas se pierden al recargar la página (solo en memoria)
- No hay localStorage como backup secundario

---

### 4. Encuestas - Ejecuciones/Runs (Sprint 11B)

| Aspecto | Estado | Detalle |
|---------|--------|---------|
| **Repositorio** | `surveyRepository.ts` | ✅ Implementado |
| **Servicio** | `surveyService.ts` | ✅ Implementado |
| **Tabla DB** | `survey_runs` | ✅ Existe en schema |
| **Persistencia** | ❌ **NO FUNCIONA** | Sin credenciales Supabase |
| **Fallback** | ✅ Map en memoria | `const surveyRuns: Map<string, SurveyRun>` |
| **Respuestas** | ❌ **NO SE PERSISTEN** | Ni en DB ni local |

**Funciones disponibles:**
- `runSurvey()` - Ejecuta encuesta y genera respuestas
- `createSurveyRunDb()` - Guarda metadata del run
- `getSurveyRuns()` - Lista runs de una encuesta
- `getSurveyRun()` - Obtiene run específico

**Problemas identificados:**
- ⚠️ **CRÍTICO:** Las respuestas individuales (`AgentResponse[]`) NO se guardan
- En DB solo se guarda metadata del run (sample_size, timestamps, etc.)
- Al recargar, los runs existen pero sin respuestas (array vacío)
- El servicio mantiene respuestas en memoria (`surveyRuns` Map) pero se pierden al refrescar

---

### 5. Encuestas - Resultados Agregados (Sprint 11C)

| Aspecto | Estado | Detalle |
|---------|--------|---------|
| **Repositorio** | `surveyRepository.ts` | ✅ Implementado |
| **Servicio** | `surveyService.ts` | ✅ Implementado |
| **Tabla DB** | `survey_results` | ✅ Existe en schema |
| **Persistencia** | ❌ **NO FUNCIONA** | Sin credenciales Supabase |
| **Fallback** | ✅ Map en memoria | `const surveyResults: Map<string, SurveyResult>` |

**Funciones disponibles:**
- `saveSurveyResultsDb()` - Guarda resultados agregados
- `getSurveyResultsBySurveyId()` - Obtiene resultados por encuesta
- `getSurveyResultsByRunId()` - Obtiene resultados por run

**Datos persistidos:**
- ✅ Resumen (total preguntas, respuestas, agentes)
- ✅ Resultados agregados por pregunta (distribuciones, promedios)
- ❌ Respuestas individuales (no se guardan)

---

### 6. Benchmarks (Sprint 7A)

| Aspecto | Estado | Detalle |
|---------|--------|---------|
| **Servicio** | `benchmarkService.ts` | ✅ Implementado |
| **Tabla DB** | ❌ **NO EXISTE** | No hay persistencia para benchmarks |
| **Persistencia** | ❌ **NO APLICA** | Solo datos mock en código |
| **Fallback** | ✅ Mock data | 3 benchmarks hardcodeados |

**Datos disponibles:**
- CASEN 2022 (2 indicadores)
- SUBTEL 2023 (2 indicadores)
- CEP Abril 2024 (2 indicadores)

**Problemas identificados:**
- Los benchmarks son estáticos, no se pueden agregar nuevos
- No hay integración con fuentes de datos externas
- Las comparaciones se pierden al recargar (guardadas en `comparisons: Map`)

---

## 🔧 Configuración Actual

### Variables de Entorno (`.env`)
```bash
# ✅ Configurado
VITE_MAPTILER_KEY=orWgcmF4NtAAER2Tgjp2

# ❌ NO CONFIGURADO
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

### Estado de Conexión
```typescript
// Cliente de Supabase
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Resultado: Supabase no está configurado
// La app funciona en modo offline con datos locales
```

---

## 📊 Flujo de Datos Actual

```
┌─────────────────────────────────────────────────────────────┐
│                     PULSO SOCIAL APP                        │
│                    (Modo Offline - Actual)                  │
└─────────────────────────────────────────────────────────────┘

┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│  Territories │    │    Agents    │    │   Surveys    │
│  (Fallback)  │    │  (Fallback)  │    │  (Fallback)  │
├──────────────┤    ├──────────────┤    ├──────────────┤
│ chileRegions │    │ synthetic_   │    │ Map<string,  │
│    .ts       │    │ agents_v1.   │    │ SurveyDef>   │
│              │    │    json      │    │              │
│ 16 regiones  │    │ ~2,000 agts  │    │ En memoria   │
│ Sin comunas  │    │ Con comunas  │    │ Se pierden   │
└──────────────┘    └──────────────┘    └──────────────┘
                                              │
                                              ▼
                                       ┌──────────────┐
                                       │ Survey Runs  │
                                       │ Map<string,  │
                                       │  SurveyRun>  │
                                       ├──────────────┤
                                       │ Metadata: ✅ │
                                       │ Respuestas:❌│
                                       │ Se pierden   │
                                       └──────────────┘
                                              │
                                              ▼
                                       ┌──────────────┐
                                       │   Results    │
                                       │ Map<string,  │
                                       │ SurveyResult>│
                                       ├──────────────┤
                                       │ Agregados: ✅│
                                       │ En memoria   │
                                       │ Se pierden   │
                                       └──────────────┘
```

---

## ⚠️ Problemas Críticos Identificados

### 1. **Pérdida de datos al recargar** 🔴 CRÍTICO
- Las encuestas creadas se pierden al refrescar la página
- Los runs de encuestas se pierden (solo metadata, sin respuestas)
- Los resultados agregados se pierden

### 2. **Respuestas de encuestas no persistidas** 🔴 CRÍTICO
- Las respuestas individuales de agentes (`AgentResponse[]`) nunca se guardan
- No se puede hacer análisis posterior de respuestas individuales
- No se puede regenerar resultados desde respuestas crudas

### 3. **Sin comunas en fallback de territorios** 🟡 MEDIO
- El fallback local solo tiene regiones
- Los filtros por comuna no funcionan sin Supabase
- Inconsistencia: agentes tienen comunas pero territories no

### 4. **Benchmarks estáticos** 🟡 MEDIO
- No se pueden agregar nuevos benchmarks
- Datos hardcodeados de 2022-2024
- Sin integración con APIs externas

---

## ✅ Recomendaciones

### Corto Plazo (Sprint 14)

1. **Configurar Supabase**
   ```bash
   # Agregar a .env
   VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
   VITE_SUPABASE_ANON_KEY=tu-anon-key
   ```

2. **Agregar localStorage como backup**
   - Guardar encuestas en localStorage cuando Supabase no esté disponible
   - Persistir runs y resultados agregados
   - Sincronizar con Supabase cuando vuelva la conexión

3. **Completar datos de comunas en fallback**
   - Agregar comunas a `chileRegions.ts` o crear `chileComunas.ts`
   - Asegurar consistencia con códigos de comuna en agentes

### Mediano Plazo (Sprint 15)

4. **Persistir respuestas individuales**
   - Crear tabla `survey_responses` en Supabase
   - Implementar guardado batch de respuestas
   - Permitir análisis de respuestas crudas

5. **Mejorar sistema de benchmarks**
   - Crear tabla `benchmarks` en Supabase
   - Permitir CRUD de benchmarks desde UI
   - Integrar con fuentes de datos externas (CASEN API, etc.)

### Largo Plazo (Sprint 16+)

6. **Sistema de sincronización offline-first**
   - Implementar patrón offline-first con IndexedDB
   - Sincronización automática cuando hay conexión
   - Manejo de conflictos

7. **Exportación/Importación de datos**
   - Exportar encuestas completas (definición + runs + respuestas)
   - Importar encuestas desde archivos
   - Backup manual como alternativa

---

## 📈 Métricas de Persistencia

| Entidad | DB Schema | Repo | Service | Fallback | Persiste Actualmente |
|---------|-----------|------|---------|----------|---------------------|
| Territories | ✅ | ✅ | N/A | ✅ (parcial) | ❌ |
| Agents | ✅ | ✅ | N/A | ✅ | ❌ |
| Survey Definitions | ✅ | ✅ | ✅ | ✅ (memoria) | ❌ |
| Survey Runs | ✅ | ✅ | ✅ | ✅ (memoria) | ❌ |
| Survey Responses | ❌ | ❌ | ❌ | ❌ | ❌ |
| Survey Results | ✅ | ✅ | ✅ | ✅ (memoria) | ❌ |
| Benchmarks | ❌ | N/A | ✅ (mock) | ✅ (código) | ❌ |

**Resumen:**
- 7/7 entidades tienen implementación de código
- 5/7 entidades tienen tablas en DB
- 0/7 entidades persisten actualmente (faltan credenciales)
- 4/7 entidades tienen fallback funcional

---

## 🎓 Conclusión

La aplicación tiene una **arquitectura de persistencia bien diseñada** con:
- ✅ Lazy loading de Supabase
- ✅ Fallback automático a datos locales
- ✅ Mappers entre tipos DB y App
- ✅ Manejo de errores graceful

**Sin embargo, actualmente opera en modo 100% offline** porque:
1. No están configuradas las credenciales de Supabase
2. Los datos se mantienen solo en memoria (se pierden al refrescar)
3. Las respuestas individuales de encuestas nunca se persisten

**Para producción, se requiere:**
1. Configurar credenciales de Supabase
2. Implementar localStorage como backup
3. Agregar persistencia de respuestas individuales

---

## 📚 Referencias

- `src/services/supabase/client.ts` - Cliente Supabase con lazy loading
- `src/services/supabase/repositories/territoryRepository.ts` - Repositorio de territorios
- `src/services/supabase/repositories/agentRepository.ts` - Repositorio de agentes
- `src/services/supabase/repositories/surveyRepository.ts` - Repositorio de encuestas
- `src/app/survey/surveyService.ts` - Servicio de encuestas
- `src/app/benchmark/benchmarkService.ts` - Servicio de benchmarks
- `src/data/syntheticAgents.ts` - Carga de agentes desde JSON
- `src/data/chileRegions.ts` - Datos locales de regiones

---

*Documento generado automáticamente por auditoría de código*
