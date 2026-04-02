# 🔍 AUDITORÍA TÉCNICA INTEGRAL CONSOLIDADA

**Proyecto:** Pulsos Sociales  
**Fecha:** 2026-04-01  
**Auditor:** Claude (AI Auditor)  
**Repositorio:** https://github.com/brifyai/pulsossocialesv2.git  
**Commit:** d729f0381d24003bf1add608f2e384c9909220b4  

---

## 📋 ÍNDICE

1. [Resumen Ejecutivo](#a-resumen-ejecutivo)
2. [Score Global](#b-score-global)
3. [Hallazgos por Categoría](#c-hallazgos-por-categoría)
4. [Matriz de Prioridades](#d-matriz-de-prioridades)
5. [Plan de Remediación](#e-plan-de-remediación)
6. [Riesgos Críticos](#f-riesgos-críticos)
7. [Conclusión](#g-conclusión)

---

## A. RESUMEN EJECUTIVO

### Estado General
El proyecto **Pulsos Sociales** es una aplicación de **encuestas sintéticas** con un motor de opinión CADEM calibrado contra benchmarks reales. La arquitectura es sólida pero tiene áreas de mejora en seguridad, sincronización de tipos, y organización de código.

### Nivel de Riesgo Global
**MEDIO** - El proyecto está APTO para producción con las mejoras recomendadas implementadas.

### Top 10 Hallazgos Críticos/Altos

| ID | Hallazgo | Severidad | Categoría |
|----|----------|-----------|-----------|
| 004 | Políticas RLS permisivas en survey_results | **CRÍTICO** | Seguridad |
| 005 | Políticas RLS permisivas en survey_responses | **CRÍTICO** | Seguridad |
| 009 | Service Key expuesta en scripts | **ALTO** | Seguridad |
| 010 | Permisos de admin en serviceClient.ts | **ALTO** | Seguridad |
| 018 | RLS permisivo en benchmarks | **ALTO** | Seguridad |
| 019 | RLS permisivo en agent_topic_state | **ALTO** | Seguridad |
| 020 | RLS permisivo en agent_panel_state | **ALTO** | Seguridad |
| 021 | RLS permisivo en weekly_events | **ALTO** | Seguridad |
| 022 | RLS permisivo en event_impact_logs | **ALTO** | Seguridad |
| 023 | RLS permisivo en scenario_events | **ALTO** | Seguridad |

### Fortalezas Principales

1. ✅ **Motor CADEM** con calibración científica contra benchmarks reales (Plaza Pública #639)
2. ✅ **Arquitectura SPA** bien estructurada con routing y guards de autenticación
3. ✅ **Tests de calibración** contra datos reales de CADEM
4. ✅ **Documentación extensiva** en código y archivos markdown
5. ✅ **Sistema de autenticación** con rate limiting, audit logging y password hashing robusto
6. ✅ **Separación de responsabilidades** entre frontend, backend y base de datos

---

## B. SCORE GLOBAL

| Área | Score | Estado | Tendencia |
|------|-------|--------|-----------|
| Arquitectura | 6.5/10 | 🟡 Mejorable | ↗️ |
| Seguridad | 5.5/10 | 🟡 RLS permisivos | ↗️ |
| Rendimiento | 7.0/10 | 🟢 Estable | → |
| Calidad de Código | 6.5/10 | 🟡 Duplicación | ↗️ |
| Base de Datos | 6.0/10 | 🟡 Inconsistencias | ↗️ |
| Escalabilidad | 7.0/10 | 🟢 OK | → |
| Testing | 7.5/10 | 🟢 Bueno | → |
| Operación/Observabilidad | 5.0/10 | 🟡 Falta monitoreo | ↗️ |
| Documentación | 8.0/10 | 🟢 Excelente | → |

### **SCORE GLOBAL: 6.4/10** - ✅ **APTO CON MEJORAS**

---

## C. HALLAZGOS POR CATEGORÍA

### PARTE 1: ESTRUCTURA Y CONFIGURACIÓN

#### HALLAZGO-001: Variables de entorno mezcladas entre entornos
**Severidad:** MEDIO  
**Archivo(s):** `.env.scripts`, `.env`

**Descripción:** Las variables de entorno están dispersas entre múltiples archivos (.env, .env.scripts, .env.example) sin un sistema claro de prioridad. Esto puede causar confusiones sobre qué variables se usan en cada contexto.

**Impacto:**
- Riesgo de usar credenciales incorrectas en producción
- Dificultad para reproducir entornos
- Posible exposición accidental de secrets

**Recomendación:**
```bash
# Crear estructura clara:
.env                    # Solo para desarrollo local (no commitear)
.env.example            # Template con variables requeridas
.env.production         # Variables de producción (encriptadas)
.env.staging            # Variables de staging
scripts/.env.scripts    # Variables específicas de scripts
```

**Prioridad:** P2  
**Esfuerzo:** 2 horas

---

#### HALLAZGO-002: Docker Compose con configuraciones duplicadas
**Severidad:** BAJO  
**Archivo(s):** `docker-compose.yml`, `docker-compose.override.yml`, `deploy/docker-compose.supabase.yml`

**Descripción:** Hay múltiples archivos docker-compose con configuraciones que se solapan. La estructura no sigue el patrón estándar de Docker Compose.

**Impacto:**
- Confusión sobre qué archivo usar
- Riesgo de inconsistencias entre entornos

**Recomendación:** Consolidar en estructura estándar:
```yaml
# docker-compose.yml - Configuración base
# docker-compose.override.yml - Overrides para desarrollo
# docker-compose.prod.yml - Configuración de producción
```

**Prioridad:** P3  
**Esfuerzo:** 3 horas

---

#### HALLAZGO-003: Scripts de fix sin documentación clara
**Severidad:** MEDIO  
**Archivo(s):** `scripts/fix*.ts`, `scripts/apply*.ts`

**Descripción:** Hay múltiples scripts de "fix" y "apply" sin documentación clara sobre cuándo usar cada uno. Esto indica deuda técnica acumulada.

**Lista de scripts de fix:**
- `fixCriticalIssues.ts`
- `fixScenarioRlsFinal.ts`
- `fixSqlUpsert.ts`
- `fix_geojson_*.ts`
- `fix_rm_region.ts`
- `apply_rls_fix.ts`
- `apply_rls_v4_secure.ts`
- `apply_scenario_rls_fix.ts`

**Recomendación:** Crear un índice de scripts con propósito y estado:
```markdown
## Scripts de Mantenimiento

| Script | Propósito | Estado | Último Uso |
|--------|-----------|--------|------------|
| fixCriticalIssues.ts | Corrige issues críticos de DB | DEPRECATED | 2026-03-20 |
| apply_rls_v4_secure.ts | Aplica RLS v4 seguro | ACTIVE | 2026-04-01 |
```

**Prioridad:** P2  
**Esfuerzo:** 4 horas

---

### PARTE 2: SISTEMA DE AUTENTICACIÓN

#### HALLAZGO-004: Políticas RLS permisivas en survey_results
**Severidad:** CRÍTICO 🔴  
**Archivo(s):** `migrations/20250318_create_survey_results.sql`

**Descripción:** La tabla `survey_results` tiene políticas RLS que permiten lectura a usuarios autenticados sin restricciones de propiedad.

**Evidencia:**
```sql
-- Política permisiva - permite ver TODOS los resultados
CREATE POLICY "Users can view survey results"
  ON survey_results FOR SELECT
  TO authenticated
  USING (true);  -- ⚠️ Cualquier usuario autenticado ve todo
```

**Impacto:**
- Fuga de datos entre usuarios
- Usuarios pueden ver encuestas de otros
- Violación de privacidad

**Recomendación:**
```sql
-- Política restrictiva basada en propiedad
CREATE POLICY "Users can view own survey results"
  ON survey_results FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM survey_runs sr
      JOIN survey_definitions sd ON sr.survey_id = sd.id
      WHERE sr.id = survey_results.run_id
      AND sd.created_by = auth.uid()
    )
  );
```

**Prioridad:** P0  
**Esfuerzo:** 4 horas  
**Riesgo de no corregir:** Pérdida de confianza de usuarios, violación de privacidad

---

#### HALLAZGO-005: Políticas RLS permisivas en survey_responses
**Severidad:** CRÍTICO 🔴  
**Archivo(s):** `migrations/20250318_create_survey_results_idempotent.sql`

**Descripción:** Similar al hallazgo anterior, la tabla `survey_responses` permite lectura sin restricciones de propiedad.

**Evidencia:**
```sql
CREATE POLICY "Users can view survey responses"
  ON survey_responses FOR SELECT
  TO authenticated
  USING (true);  -- ⚠️ Permisivo
```

**Recomendación:** Implementar política basada en propiedad de la encuesta.

**Prioridad:** P0  
**Esfuerzo:** 4 horas

---

#### HALLAZGO-006: Rate limiting básico sin persistencia
**Severidad:** MEDIO  
**Archivo(s):** `src/services/auth/rateLimiter.ts`

**Descripción:** El rate limiter usa almacenamiento en memoria (Map) que se pierde al reiniciar el servidor.

**Evidencia:**
```typescript
// Almacenamiento en memoria - se pierde en reinicio
const attempts = new Map<string, AttemptRecord>();
```

**Impacto:**
- Vulnerable a ataques distribuidos
- No funciona en entornos serverless
- Reset de límites en cada despliegue

**Recomendación:**
```typescript
// Usar Redis o Supabase para persistencia
interface RateLimiterConfig {
  storage: 'redis' | 'supabase' | 'memory';
  keyPrefix: string;
}
```

**Prioridad:** P2  
**Esfuerzo:** 6 horas

---

#### HALLAZGO-007: Token de servicio con expiración fija
**Severidad:** MEDIO  
**Archivo(s):** `scripts/generate_service_key.ts`

**Descripción:** Los tokens de servicio generados tienen expiración fija de 1 año sin rotación automática.

**Recomendación:**
```typescript
// Implementar rotación de tokens
interface ServiceKeyConfig {
  rotationPeriod: '30d' | '90d' | '1y';
  autoRotate: boolean;
  notifyBeforeExpiry: number; // días
}
```

**Prioridad:** P2  
**Esfuerzo:** 4 horas

---

#### HALLAZGO-008: Falta de validación de fortaleza de contraseña en backend
**Severidad:** MEDIO  
**Archivo(s):** `src/services/auth/customAuth.ts`

**Descripción:** La validación de contraseña solo existe en el frontend. El backend acepta contraseñas débiles.

**Recomendación:**
```typescript
// Validación en backend
function validatePasswordStrength(password: string): ValidationResult {
  const minLength = 12;
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasNumbers = /\d/.test(password);
  const hasSpecial = /[!@#$%^&*]/.test(password);
  
  return { valid: /* ... */, errors: /* ... */ };
}
```

**Prioridad:** P1  
**Esfuerzo:** 2 horas

---

#### HALLAZGO-009: Service Key expuesta en scripts
**Severidad:** ALTO 🟠  
**Archivo(s):** `scripts/utils/serviceClient.ts`

**Descripción:** El serviceClient.ts usa `SUPABASE_SERVICE_KEY` que tiene privilegios de admin y puede bypass RLS.

**Evidencia:**
```typescript
// Acceso con privilegios de admin
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!  // ⚠️ Privilegios totales
);
```

**Impacto:**
- Bypass completo de RLS
- Acceso a datos de todos los usuarios
- Riesgo de ejecución accidental de operaciones destructivas

**Recomendación:**
```typescript
// Implementar RBAC
interface ServiceClientConfig {
  role: 'readonly' | 'readwrite' | 'admin';
  scope: string[]; // Tablas permitidas
}
```

**Prioridad:** P0  
**Esfuerzo:** 8 horas

---

#### HALLAZGO-010: Permisos de admin en serviceClient.ts
**Severidad:** ALTO 🟠  
**Archivo(s):** `scripts/utils/serviceClient.ts`

**Descripción:** El serviceClient no tiene restricciones de scope y puede operar sobre cualquier tabla.

**Recomendación:** Implementar wrapper con validación de operaciones permitidas.

**Prioridad:** P1  
**Esfuerzo:** 6 horas

---

### PARTE 3: SUPABASE Y REPOSITORIOS

#### HALLAZGO-011: Repositorios sin manejo consistente de errores
**Severidad:** MEDIO  
**Archivo(s):** `src/services/supabase/repositories/*.ts`

**Descripción:** Los repositorios no tienen un patrón consistente para manejar errores de Supabase.

**Evidencia:**
```typescript
// Algunos retornan null, otros throw, otros loguean
const { data, error } = await supabase.from('table').select();
if (error) {
  console.error(error);  // Solo loguea
  return null;           // Retorna null
}
```

**Recomendación:**
```typescript
// Patrón Result consistente
type Result<T> = 
  | { success: true; data: T }
  | { success: false; error: DatabaseError };

async function getById(id: string): Promise<Result<Entity>> {
  const { data, error } = await supabase.from('table').select().eq('id', id).single();
  
  if (error) {
    return { 
      success: false, 
      error: new DatabaseError(error.message, error.code) 
    };
  }
  
  return { success: true, data };
}
```

**Prioridad:** P2  
**Esfuerzo:** 8 horas

---

#### HALLAZGO-012: N+1 queries en agentRepository.ts
**Severidad:** MEDIO  
**Archivo(s):** `src/services/supabase/repositories/agentRepository.ts`

**Descripción:** El método `getAgentsByFilters` puede causar N+1 queries cuando se cargan relaciones.

**Recomendación:** Usar joins o data loaders para evitar N+1.

**Prioridad:** P2  
**Esfuerzo:** 4 horas

---

#### HALLAZGO-013: Falta de paginación en métodos de listado
**Severidad:** MEDIO  
**Archivo(s):** `src/services/supabase/repositories/surveyRepository.ts`

**Descripción:** Los métodos `getSurveyDefinitions()` y similares no tienen paginación, lo que puede causar problemas de rendimiento con muchos registros.

**Recomendación:**
```typescript
interface PaginationParams {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  totalPages: number;
}
```

**Prioridad:** P2  
**Esfuerzo:** 6 horas

---

#### HALLAZGO-014: Tipos de Supabase desactualizados
**Severidad:** MEDIO  
**Archivo(s):** `src/types/database.ts`

**Descripción:** Los tipos TypeScript no reflejan completamente el schema actual de la base de datos.

**Recomendación:** Usar `supabase gen types` para generar tipos automáticamente desde el schema.

**Prioridad:** P2  
**Esfuerzo:** 3 horas

---

### PARTE 4: MIGRACIONES SQL - SEGURIDAD

#### HALLAZGO-015: Múltiples versiones de migraciones de benchmarks
**Severidad:** MEDIO  
**Archivo(s):** `migrations/20250324_create_benchmarks_tables*.sql`

**Descripción:** Existen 4 versiones de migraciones para benchmarks:
- `20250324_create_benchmarks_tables.sql`
- `20250324_create_benchmarks_tables_fixed.sql`
- `20250324_fix_benchmarks_schema.sql`
- `20250324_fix_benchmarks_simple.sql`

**Impacto:**
- Confusión sobre cuál es la versión correcta
- Riesgo de aplicar migraciones inconsistentes
- Deuda técnica

**Recomendación:** Consolidar en una sola migración idempotente.

**Prioridad:** P2  
**Esfuerzo:** 4 horas

---

#### HALLAZGO-016: Múltiples versiones de fixes RLS para scenario_events
**Severidad:** MEDIO  
**Archivo(s):** `migrations/20250330_fix_scenario_events_rls*.sql`

**Descripción:** Existen 6 versiones de fixes RLS para scenario_events (v1, v2, v3, v4_SECURE, manual, emergency).

**Recomendación:** Consolidar en migración única y documentar el proceso.

**Prioridad:** P2  
**Esfuerzo:** 3 horas

---

#### HALLAZGO-017: Migraciones sin rollback
**Severidad:** BAJO  
**Archivo(s):** Todas las migraciones

**Descripción:** Ninguna migración tiene script de rollback (down migration).

**Recomendación:**
```sql
-- Up
CREATE TABLE new_table (...);

-- Down
DROP TABLE IF EXISTS new_table;
```

**Prioridad:** P3  
**Esfuerzo:** 8 horas

---

#### HALLAZGO-018: RLS permisivo en benchmarks
**Severidad:** ALTO 🟠  
**Archivo(s):** `migrations/20250324_create_benchmarks_tables_fixed.sql`

**Descripción:** La tabla `benchmarks` tiene políticas RLS permisivas.

**Recomendación:** Implementar políticas restrictivas basadas en roles.

**Prioridad:** P1  
**Esfuerzo:** 2 horas

---

#### HALLAZGO-019: RLS permisivo en agent_topic_state
**Severidad:** ALTO 🟠  
**Archivo(s):** `migrations/20260326_create_agent_topic_state.sql`

**Descripción:** La tabla `agent_topic_state` permite acceso sin restricciones.

**Prioridad:** P1  
**Esfuerzo:** 2 horas

---

#### HALLAZGO-020: RLS permisivo en agent_panel_state
**Severidad:** ALTO 🟠  
**Archivo(s):** `migrations/20260326_create_agent_panel_state.sql`

**Descripción:** La tabla `agent_panel_state` permite acceso sin restricciones.

**Prioridad:** P1  
**Esfuerzo:** 2 horas

---

#### HALLAZGO-021: RLS permisivo en weekly_events
**Severidad:** ALTO 🟠  
**Archivo(s):** `migrations/20260328_create_weekly_events.sql`

**Descripción:** La tabla `weekly_events` permite acceso sin restricciones.

**Prioridad:** P1  
**Esfuerzo:** 2 horas

---

#### HALLAZGO-022: RLS permisivo en event_impact_logs
**Severidad:** ALTO 🟠  
**Archivo(s):** `migrations/20260328_create_event_impact_logs.sql`

**Descripción:** La tabla `event_impact_logs` permite acceso sin restricciones.

**Prioridad:** P1  
**Esfuerzo:** 2 horas

---

#### HALLAZGO-023: RLS permisivo en scenario_events
**Severidad:** ALTO 🟠  
**Archivo(s):** `migrations/20260329_create_scenario_events.sql`

**Descripción:** La tabla `scenario_events` permite acceso sin restricciones.

**Prioridad:** P1  
**Esfuerzo:** 2 horas

---

### PARTE 5: MIGRACIONES SQL - DATOS Y TIPOS

#### HALLAZGO-024: Desfasaje entre tipos TypeScript y SQL
**Severidad:** MEDIO  
**Archivo(s):** `src/types/agent.ts`, `migrations/20250324_add_all_missing_agent_columns.sql`

**Descripción:** Los tipos TypeScript no coinciden completamente con el schema SQL.

**Evidencia:**
```typescript
// TypeScript - opcional
income_decile?: number;

-- SQL - NOT NULL
income_decile INTEGER NOT NULL DEFAULT 5
```

**Recomendación:** Sincronizar tipos usando `supabase gen types`.

**Prioridad:** P2  
**Esfuerzo:** 4 horas

---

#### HALLAZGO-025: Columnas sin índices en tablas grandes
**Severidad:** MEDIO  
**Archivo(s):** `migrations/20250318_create_survey_results.sql`

**Descripción:** Tablas como `survey_results` y `survey_responses` no tienen índices en columnas de búsqueda frecuente.

**Recomendación:**
```sql
CREATE INDEX idx_survey_results_run_id ON survey_results(run_id);
CREATE INDEX idx_survey_responses_agent_id ON survey_responses(agent_id);
CREATE INDEX idx_survey_responses_question_id ON survey_responses(question_id);
```

**Prioridad:** P2  
**Esfuerzo:** 3 horas

---

#### HALLAZGO-026: Uso de TEXT para campos que deberían ser ENUM
**Severidad:** BAJO  
**Archivo(s):** Múltiples migraciones

**Descripción:** Campos como `engine_mode`, `severity`, `category` usan TEXT en lugar de ENUM o CHECK constraints.

**Recomendación:**
```sql
-- Opción 1: ENUM
CREATE TYPE engine_mode AS ENUM ('legacy', 'cadem');

-- Opción 2: CHECK constraint
engine_mode TEXT CHECK (engine_mode IN ('legacy', 'cadem'))
```

**Prioridad:** P3  
**Esfuerzo:** 4 horas

---

#### HALLAZGO-027: Falta de constraints de foreign key
**Severidad:** MEDIO  
**Archivo(s):** `migrations/20250318_create_survey_results.sql`

**Descripción:** Algunas tablas no tienen foreign keys explícitas.

**Recomendación:** Agregar FK constraints para mantener integridad referencial.

**Prioridad:** P2  
**Esfuerzo:** 4 horas

---

### PARTE 6: CÓDIGO FUENTE PRINCIPAL

#### HALLAZGO-028: Función `renderRoute` en main.ts excesivamente larga
**Severidad:** MEDIO  
**Archivo(s):** `src/main.ts` (líneas 60-140)

**Descripción:** La función tiene ~80 líneas y múltiples responsabilidades.

**Recomendación:** Refactorizar en funciones especializadas:
```typescript
async function renderRoute(route: Route): Promise<void> {
  if (shouldSkipRender(route)) return;
  
  isRendering = true;
  try {
    await cleanupCurrentPage();
    const page = await createPageForRoute(route);
    await mountPage(page);
  } finally {
    isRendering = false;
  }
}
```

**Prioridad:** P2  
**Esfuerzo:** 3 horas

---

#### HALLAZGO-029: Duplicación de lógica en surveyService.ts
**Severidad:** MEDIO  
**Archivo(s):** `src/app/survey/surveyService.ts`

**Descripción:** Duplicación entre `runSurvey` y `runCademSurveyWithAgents`.

**Recomendación:** Crear mapper centralizado en `src/app/survey/mappers/`.

**Prioridad:** P2  
**Esfuerzo:** 2 horas

---

#### HALLAZGO-030: Acoplamiento entre motor CADEM y legacy
**Severidad:** MEDIO  
**Archivo(s):** `src/app/survey/surveyRunner.ts`

**Descripción:** Lógica condicional compleja para 3 modos (legacy, cadem sync, cadem async).

**Recomendación:** Implementar Strategy Pattern:
```typescript
interface SurveyEngine {
  run(input: SurveyInput): Promise<SurveyResponse[]>;
}

class LegacyEngine implements SurveyEngine { }
class CademSyncEngine implements SurveyEngine { }
class CademAsyncEngine implements SurveyEngine { }
```

**Prioridad:** P2  
**Esfuerzo:** 6 horas

---

#### HALLAZGO-031: Falta de manejo de errores robusto en async/await
**Severidad:** MEDIO  
**Archivo(s):** `src/app/survey/surveyService.ts`, `src/main.ts`

**Descripción:** Errores silenciados que pueden causar estados inconsistentes.

**Recomendación:** Implementar patrón Result/Option:
```typescript
type Result<T, E = Error> = 
  | { success: true; data: T }
  | { success: false; error: E };
```

**Prioridad:** P1  
**Esfuerzo:** 8 horas

---

#### HALLAZGO-032: Tests de calibración con tolerancias muy amplias
**Severidad:** BAJO  
**Archivo(s):** `src/app/opinionEngine/__tests__/calibration.test.ts`

**Descripción:** Tolerancias de 7pp (hasta 14pp en algunos casos).

**Recomendación:** Reducir gradualmente: 7pp → 5pp → 3pp.

**Prioridad:** P3  
**Esfuerzo:** 5 horas

---

#### HALLAZGO-033: Uso de `any` en tipos del motor de opinión
**Severidad:** BAJO  
**Archivo(s):** `src/app/opinionEngine/questionResolver.ts`

**Descripción:** Casting a `any` para acceder a propiedades.

**Recomendación:** Usar type guards:
```typescript
function isSingleChoice(question: SurveyQuestion): question is SingleChoiceQuestion {
  return question.type === 'single_choice';
}
```

**Prioridad:** P3  
**Esfuerzo:** 3 horas

---

#### HALLAZGO-034: Magic numbers en el motor CADEM
**Severidad:** BAJO  
**Archivo(s):** `src/app/opinionEngine/opinionEngine.ts`

**Descripción:** Números mágicos sin contexto.

**Recomendación:**
```typescript
export const ENGINE_CONSTANTS = {
  FATIGUE: {
    GROWTH_EXPONENT: 1.5,  // Documentar por qué este valor
    MAX_IMPACT: 0.3,
  }
} as const;
```

**Prioridad:** P3  
**Esfuerzo:** 2 horas

---

#### HALLAZGO-035: Router con lógica de negocio mezclada
**Severidad:** MEDIO  
**Archivo(s):** `src/router/index.ts`

**Descripción:** El router contiene lógica de negocio como detección de coordenadas de mapa.

**Recomendación:** Separar en servicios especializados.

**Prioridad:** P2  
**Esfuerzo:** 3 horas

---

## D. MATRIZ DE PRIORIDADES

| ID | Título | Severidad | Impacto | Esfuerzo | Prioridad |
|----|--------|-----------|---------|----------|-----------|
| 004 | RLS permisivo survey_results | CRÍTICO | Alto | 4h | **P0** |
| 005 | RLS permisivo survey_responses | CRÍTICO | Alto | 4h | **P0** |
| 009 | Service Key expuesta | ALTO | Alto | 8h | **P0** |
| 008 | Validación password backend | MEDIO | Alto | 2h | **P1** |
| 010 | Permisos admin serviceClient | ALTO | Alto | 6h | **P1** |
| 018-023 | RLS permisivos tablas | ALTO | Medio | 12h | **P1** |
| 031 | Manejo errores async | MEDIO | Alto | 8h | **P1** |
| 001 | Variables entorno mezcladas | MEDIO | Medio | 2h | **P2** |
| 003 | Scripts fix sin docs | MEDIO | Medio | 4h | **P2** |
| 006 | Rate limiting sin persistencia | MEDIO | Medio | 6h | **P2** |
| 007 | Token expiración fija | MEDIO | Medio | 4h | **P2** |
| 011 | Errores inconsistentes | MEDIO | Medio | 8h | **P2** |
| 012 | N+1 queries | MEDIO | Medio | 4h | **P2** |
| 013 | Falta paginación | MEDIO | Medio | 6h | **P2** |
| 014 | Tipos desactualizados | MEDIO | Medio | 3h | **P2** |
| 015-016 | Migraciones duplicadas | MEDIO | Medio | 7h | **P2** |
| 024 | Desfasaje tipos SQL/TS | MEDIO | Medio | 4h | **P2** |
| 025 | Falta índices | MEDIO | Medio | 3h | **P2** |
| 027 | Falta FK constraints | MEDIO | Medio | 4h | **P2** |
| 028 | Función renderRoute larga | MEDIO | Medio | 3h | **P2** |
| 029 | Duplicación surveyService | MEDIO | Medio | 2h | **P2** |
| 030 | Acoplamiento motores | MEDIO | Medio | 6h | **P2** |
| 035 | Router lógica negocio | MEDIO | Medio | 3h | **P2** |
| 002 | Docker Compose duplicado | BAJO | Bajo | 3h | **P3** |
| 017 | Migraciones sin rollback | BAJO | Bajo | 8h | **P3** |
| 026 | TEXT vs ENUM | BAJO | Bajo | 4h | **P3** |
| 032 | Tolerancias tests amplias | BAJO | Bajo | 5h | **P3** |
| 033 | Uso de `any` | BAJO | Bajo | 3h | **P3** |
| 034 | Magic numbers | BAJO | Bajo | 2h | **P3** |

---

## E. PLAN DE REMEDIACIÓN

### FASE 1: Quick Wins (1-2 semanas)

**Objetivo:** Corregir riesgos críticos de seguridad

| Tarea | Esfuerzo | Responsable |
|-------|----------|-------------|
| Restringir RLS survey_results | 4h | Backend |
| Restringir RLS survey_responses | 4h | Backend |
| Validación password backend | 2h | Backend |
| Documentar scripts de fix | 4h | DevOps |

**Total:** 14 horas

---

### FASE 2: Corto Plazo (1 mes)

**Objetivo:** Mejorar seguridad y robustez

| Tarea | Esfuerzo | Responsable |
|-------|----------|-------------|
| Implementar RBAC serviceClient | 8h | Backend |
| RLS tablas restantes (6 tablas) | 12h | Backend |
| Manejo de errores consistente | 8h | Backend |
| Rate limiting con Redis | 6h | Backend |
| Consolidar migraciones | 7h | DevOps |
| Sincronizar tipos SQL/TS | 4h | Backend |

**Total:** 45 horas

---

### FASE 3: Mediano Plazo (2-3 meses)

**Objetivo:** Refactorización y deuda técnica

| Tarea | Esfuerzo | Responsable |
|-------|----------|-------------|
| Strategy Pattern motores | 6h | Backend |
| Refactorizar main.ts | 3h | Frontend |
| Implementar paginación | 6h | Backend |
| Agregar índices | 3h | DBA |
| Agregar FK constraints | 4h | DBA |
| Reducir tolerancias tests | 5h | QA |
| Eliminar `any` | 3h | Frontend |
| Documentar constantes | 2h | Backend |

**Total:** 32 horas

---

## F. RIESGOS CRÍTICOS

### 🔴 CRÍTICO - Acción Inmediata Requerida

1. **Fuga de datos entre usuarios** (Hallazgos 004, 005)
   - Las políticas RLS permisivas permiten que cualquier usuario autenticado vea todos los resultados de encuestas.
   - **Impacto:** Violación de privacidad, pérdida de confianza de usuarios.
   - **Mitigación:** Implementar políticas RLS basadas en propiedad inmediatamente.

2. **Bypass de RLS con Service Key** (Hallazgo 009)
   - Los scripts usan Service Key con privilegios de admin que bypass RLS completamente.
   - **Impacto:** Acceso no autorizado a datos de todos los usuarios.
   - **Mitigación:** Implementar RBAC y restringir permisos de Service Key.

---

## G. CONCLUSIÓN

### Veredicto Final

**APTO CON MEJORAS** - El proyecto Pulsos Sociales es una aplicación sólida con un motor de opinión CADEM científicamente calibrado. La arquitectura es adecuada y el código es de buena calidad, pero requiere atención urgente en seguridad (RLS) antes de escalar a producción con múltiples usuarios.

### Fortalezas

1. ✅ Motor CADEM calibrado contra benchmarks reales
2. ✅ Arquitectura SPA bien estructurada
3. ✅ Sistema de autenticación robusto (rate limiting, audit logging)
4. ✅ Buena cobertura de tests
5. ✅ Documentación extensiva

### Debilidades

1. ⚠️ Políticas RLS permisivas en múltiples tablas
2. ⚠️ Service Key con privilegios excesivos
3. ⚠️ Deuda técnica en migraciones
4. ⚠️ Falta de manejo de errores consistente

### Recomendación

**Proceder a producción** después de implementar:
1. Corrección de políticas RLS (Fase 1)
2. Implementación de RBAC para Service Key (Fase 2)
3. Consolidación de migraciones (Fase 2)

---

## 📎 ANEXOS

### Archivos de Auditoría Detallados

Los siguientes archivos contienen el análisis detallado de cada parte:

- `audit_parts/audit_part_1_structure_config.txt` (35K)
- `audit_parts/audit_part_2_auth.txt` (81K)
- `audit_parts/audit_part_3_supabase.txt` (93K)
- `audit_parts/audit_part_4_migrations_1.txt` (83K)
- `audit_parts/audit_part_5_migrations_2_types.txt` (112K)
- `audit_parts/audit_part_6_source_code.txt` (121K)

**Total:** ~525K de análisis detallado

---

*Auditoría generada el 2026-04-01 por Claude (AI Auditor)*
