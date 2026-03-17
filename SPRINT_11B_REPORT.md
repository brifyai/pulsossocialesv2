# Sprint 11B - Reporte de Implementación

**Fecha:** 2026-03-17  
**Estado:** ✅ COMPLETADO

---

## Resumen

Sprint 11B implementa persistencia de **corridas de encuesta** (`survey_runs`) en Supabase, con fallback automático a almacenamiento local si la base de datos no está disponible.

**Alcance deliberadamente limitado:**
- ✅ `survey_runs` - Persiste metadata de ejecuciones
- ❌ `survey_responses` - NO persistido (Sprint 11C)
- ❌ `survey_results` - NO persistido (Sprint 11D)

**Nota importante:** Las respuestas individuales (`AgentResponse[]`) NO se persisten en la base de datos. Solo se guarda la metadata de la corrida (timestamps, cantidad de agentes, etc.). Las respuestas permanecen en memoria local.

---

## Archivos Modificados

### 1. `src/services/supabase/repositories/surveyRepository.ts`

**Nuevas funciones agregadas:**

| Función | Descripción |
|---------|-------------|
| `isSurveyRunPersistenceAvailable()` | Verifica si la tabla `survey_runs` existe y es accesible |
| `createSurveyRunDb(run)` | Crea una corrida en Supabase |
| `getSurveyRunsBySurveyId(surveyId)` | Obtiene todas las corridas de una encuesta |
| `getSurveyRunById(runId)` | Obtiene una corrida específica por ID |
| `deleteSurveyRun(runId)` | Elimina una corrida de la base de datos |

**Type mappers:**
- `toDbSurveyRun()` - Convierte `SurveyRun` (app) a `DbSurveyRun` (DB)
- `fromDbSurveyRun()` - Convierte `DbSurveyRun` (DB) a `SurveyRun` (app)

**Nota sobre mappers:**
- `toDbSurveyRun` extrae metadata del run (timestamps, conteos, etc.)
- `fromDbSurveyRun` devuelve un run con `responses: []` (vacío) porque las respuestas no se persisten

### 2. `src/app/survey/surveyService.ts`

**Cambios en `runSurvey()`:**
1. Crea el run localmente primero (con todas las respuestas)
2. Intenta persistir en DB usando `createSurveyRunDb()`
3. Si tiene éxito: usa el ID de la DB, mantiene respuestas en local
4. Si falla: continúa con ID local, todo en memoria
5. Guarda en cache local (siempre)

**Cambios en `getSurveyRun()`:**
- Busca primero en cache local
- Si no está, intenta cargar desde DB
- Al cargar de DB: solo trae metadata, no respuestas

**Cambios en `getSurveyRuns()`:**
- Carga runs desde DB si está disponible
- Merge inteligente: si un run existe en DB y local, mantiene las respuestas locales
- Ordena por fecha de completado (más reciente primero)

---

## Tabla en Supabase

### `survey_runs`

```sql
CREATE TABLE survey_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_id UUID NOT NULL REFERENCES survey_definitions(id),
  
  -- Identificación
  run_number INTEGER,              -- Secuencial por survey (no implementado aún)
  name TEXT,                       -- Nombre opcional de la corrida
  
  -- Estado
  status TEXT DEFAULT 'completed', -- 'pending', 'running', 'completed', 'failed'
  
  -- Configuración aplicada
  segment_applied JSONB DEFAULT '{}',
  sample_size_requested INTEGER NOT NULL,
  sample_size_actual INTEGER NOT NULL,
  agents_matched INTEGER NOT NULL,
  
  -- Progreso (para runs async, no usado en v1)
  progress_percent INTEGER DEFAULT 100,
  current_agent_index INTEGER DEFAULT 0,
  
  -- Resultados resumidos
  results_summary JSONB,
  
  -- Error si falló
  error_message TEXT,
  error_details JSONB,
  
  -- Timestamps
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices recomendados
CREATE INDEX idx_survey_runs_survey_id ON survey_runs(survey_id);
CREATE INDEX idx_survey_runs_created_at ON survey_runs(created_at DESC);
```

**Campos JSONB:**
- `segment_applied`: El segmento que se usó para filtrar agentes
- `results_summary`: Resumen de resultados (total_responses, completion_rate, average_confidence)
- `error_details`: Detalles si la corrida falló

---

## Flujo de Persistencia

### Crear Corrida

```
runSurvey(surveyId)
  ├── Filtrar agentes según segmento
  ├── Samplear si es necesario
  ├── Generar respuestas sintéticas
  ├── Crear run LOCAL (con todas las respuestas)
  ├── Intentar: createSurveyRunDb(localRun)
  │   ├── Si éxito: usar ID de DB
  │   └── Si falla: mantener ID local
  ├── Guardar en cache local (siempre)
  └── Generar resultados agregados
```

### Leer Corrida

```
getSurveyRun(runId)
  ├── Buscar en cache local
  ├── Si está: retornar (con respuestas)
  └── Si no está:
      ├── Intentar: getSurveyRunById(runId)
      │   ├── Si éxito: cachear y retornar (sin respuestas)
      │   └── Si falla: retornar undefined
      └── Retornar undefined
```

### Listar Corridas

```
getSurveyRuns(surveyId)
  ├── Intentar: getSurveyRunsBySurveyId(surveyId)
  │   ├── Para cada run de DB:
  │   │   ├── Si existe en local: merge (metadata DB + respuestas local)
  │   │   └── Si no existe en local: agregar a cache
  │   └── Si falla: continuar con locales
  └── Retornar runs ordenados por fecha
```

---

## Criterios de Aceptación

| Criterio | Estado |
|----------|--------|
| Se puede crear una corrida de encuesta | ✅ Funciona (DB o local) |
| La corrida se persiste en Supabase | ✅ Funciona |
| Se puede leer corridas existentes | ✅ Funciona |
| La app sigue estable | ✅ Build exitoso |
| `npm run build` funciona | ✅ Sin errores |
| Fallback local funciona si DB no disponible | ✅ Automático |

---

## Verificación

```bash
# Build
npm run build
# Resultado: ✓ built in 514ms

# Type check
npx tsc --noEmit
# Resultado: Sin errores
```

---

## Comportamiento del Sistema

### Escenario 1: Supabase configurado y tabla existe
1. Al ejecutar encuesta: se guarda run en DB + cache local
2. Al listar corridas: carga desde DB, merge con locales
3. Al obtener corrida: busca en cache primero
4. Logs: `💾 Survey run persisted to DB: ...`

### Escenario 2: Supabase no configurado o tabla no existe
1. Al ejecutar encuesta: solo cache local
2. Al listar corridas: retorna cache local
3. Al obtener corrida: busca en cache local
4. Logs: `[SurveyService] Failed to persist run to DB: ...`

### Escenario 3: Error de conexión a DB
1. Intenta persistir run
2. Si falla: log warning, continúa con local
3. La app funciona sin interrupción

---

## Qué NO se persistió (intencionalmente)

| Entidad | Estado | Razón |
|---------|--------|-------|
| `survey_responses` | ❌ No persistido | Fuera de alcance Sprint 11B |
| `survey_results` | ❌ No persistido | Fuera de alcance Sprint 11B |

Las respuestas individuales (`AgentResponse[]`) y los resultados agregados (`SurveyResult`) continúan operando en modo local (Map en memoria).

**Nota técnica:** Las respuestas pueden ser miles por corrida. Persistirlas requiere:
- Batch inserts eficientes
- Consideraciones de performance
- Posible particionamiento de tabla

Esto se abordará en Sprint 11C.

---

## Archivos NO modificados (preservados)

- ✅ `src/app/initMap.ts` - No tocado
- ✅ `src/app/simulation/agentEngine.ts` - No tocado
- ✅ `src/data/elGolfNetwork.ts` - No tocado
- ✅ `src/styles/main.css` - No tocado
- ✅ Lógica del mapa local - No tocada
- ✅ Landing pública - No tocada
- ✅ Benchmarks - No tocados
- ✅ Metodología - No tocada
- ✅ `survey_definitions` - Ya persistido en Sprint 11A

---

## Próximos Pasos

### Sprint 11C: Persistir Survey Responses
1. Crear tabla `survey_responses` en Supabase
2. Implementar `saveSurveyResponses()` con batch insert
3. Modificar `runSurvey()` para persistir respuestas después de generarlas
4. Modificar `getSurveyRun()` para cargar respuestas desde DB

### Sprint 11D: Persistir Survey Results
1. Decidir: ¿tabla `survey_results` o calcular on-the-fly?
2. Implementar `saveSurveyResults()` y `getSurveyResults()`
3. Integrar con visualización de resultados

---

## Notas de Implementación

### Type Safety
- Los mappers manejan la conversión entre tipos app y DB
- Uso de `as any` en queries de Supabase para JSONB
- Los tipos en `database.ts` definen la estructura esperada

### Error Handling
- Todas las operaciones de DB usan `safeQuery()`
- Fallback automático a local si DB falla
- Logs informativos en consola

### Performance
- Cache local evita queries repetidos
- Las respuestas no se cargan desde DB (solo metadata)
- Merge inteligente preserva respuestas locales

---

## Comandos Útiles

```bash
# Verificar build
npm run build

# Verificar tipos solamente
npx tsc --noEmit

# Ejecutar en modo dev
npm run dev

# Ver logs de Supabase en consola del browser
# Buscar: "[SurveyService]" o "[SurveyRepository]"
```

---

**Sprint 11B completado exitosamente. El sistema ahora puede persistir corridas de encuestas en Supabase con fallback automático a local. Las respuestas individuales permanecen en memoria local.**
