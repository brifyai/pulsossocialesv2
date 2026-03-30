# Scripts que Necesitan Migrar a serviceClient

**Fecha:** 30 de marzo de 2026  
**Objetivo:** Estandarizar todos los scripts para usar el cliente privilegiado centralizado

---

## Resumen

Se encontraron **40+ scripts** que crean sus propios clientes Supabase en lugar de usar `serviceClient.ts`.

**Prioridad de Migración:**
- 🔴 **CRÍTICA:** Scripts de rollout, migraciones, seed (escritura)
- 🟡 **MEDIA:** Scripts de staging, calibración (lectura/escritura)
- 🟢 **BAJA:** Scripts de auditoría, test (solo lectura)

---

## Scripts CRÍTICOS (requieren migración inmediata)

### Rollout (8 scripts)
| Script | Estado | Acción |
|--------|--------|--------|
| `scripts/rollout/createPhase1Survey.ts` | ❌ Cliente propio | Migrar a `serviceClient` |
| `scripts/rollout/createPhase2Survey.ts` | ❌ Cliente propio | Migrar a `serviceClient` |
| `scripts/rollout/createPhase2_5Survey.ts` | ❌ Cliente propio | Migrar a `serviceClient` |
| `scripts/rollout/createPhase3Survey.ts` | ❌ Cliente propio | Migrar a `serviceClient` |
| `scripts/rollout/createPhase3V12Survey.ts` | ❌ Cliente propio | Migrar a `serviceClient` |
| `scripts/rollout/runCademProduction.ts` | ❌ Cliente propio | Migrar a `serviceClient` |
| `scripts/rollout/runPhase2_5Controlled.ts` | ❌ Cliente propio | Migrar a `serviceClient` |
| `scripts/rollout/runPhase3V12Controlled.ts` | ❌ Cliente propio | Migrar a `serviceClient` |

**Nota:** Los scripts `runPhase1Controlled.ts`, `runPhase2Controlled.ts`, `runPhase3Controlled.ts` ya fueron corregidos.

### Migraciones (5 scripts) — ✅ COMPLETADOS

| Script | Estado | Acción |
|--------|--------|--------|
| `scripts/apply_migrations.ts` | ✅ `serviceClient` | Completado en OLA 3 |
| `scripts/apply_rls_fix.ts` | ✅ `serviceClient` | Completado en OLA 3 |
| `scripts/apply_rls_v4_secure.ts` | ✅ `serviceClient` | Completado en OLA 3 |
| `scripts/apply_single_migration.ts` | ✅ `serviceClient` | Completado en OLA 3 |
| `scripts/migrations/fixCademResponseValues.ts` | ✅ `serviceClient` | Completado en OLA 3 |

### Seed (3 scripts) — ✅ COMPLETADOS

| Script | Estado | Acción |
|--------|--------|--------|
| `scripts/seed/run_seed.ts` | ✅ `serviceClient` | Completado en OLA 3 |
| `scripts/seed/seed_agents.ts` | ✅ `serviceClient` | Completado en OLA 3 |
| `scripts/seed/seed_territories.ts` | ✅ `serviceClient` | Completado en OLA 3 |

**Nota:** Todos los scripts de migraciones y seed ahora usan `serviceClient`. Ver reporte completo en `docs/OLA_3_MIGRACION_SERVICE_CLIENT_REPORT.md`.

---

## Scripts MEDIA prioridad

### Staging (5 scripts) — ✅ COMPLETADOS

| Script | Estado | Acción |
|--------|--------|--------|
| `scripts/staging/check_survey_responses.ts` | ✅ `serviceClient` | Completado en OLA 2 |
| `scripts/staging/runStagingValidationSurvey.ts` | ✅ `serviceClient` | Completado en OLA 2 |
| `scripts/staging/fetchStagingValidationResults.ts` | ✅ `serviceClient` | Ya usaba serviceClient |
| `scripts/staging/analyzeLongitudinalResults.ts` | ✅ `serviceClient` | Ya usaba serviceClient |
| `scripts/staging/getAgentsFromSupabase.ts` | ✅ `serviceClient` | Migrado de .cjs a .ts en OLA 2 |

**Nota:** Todos los scripts de staging ahora usan `serviceClient`. Ver reporte completo en `docs/OLA_2_MIGRACION_STAGING_REPORT.md`.

### Calibración (3 scripts)
| Script | Estado | Acción |
|--------|--------|--------|
| `scripts/calibration/debugRunSurveyFromSupabase.ts` | ❌ Cliente propio | Evaluar: si solo lee, puede usar ANON_KEY |
| `scripts/calibration/runBenchmarkComparisonFromSupabase.ts` | ❌ Cliente propio | Evaluar: si solo lee, puede usar ANON_KEY |
| `scripts/calibration/debugEconomicTopicDistributions.ts` | ❌ Cliente propio | Evaluar: si solo lee, puede usar ANON_KEY |

---

## Scripts BAJA prioridad (solo lectura)

### Auditoría (3 scripts)
| Script | Estado | Acción |
|--------|--------|--------|
| `scripts/audit/auditSupabaseSchema.ts` | ❌ Cliente propio | Puede mantener ANON_KEY (solo lectura) |
| `scripts/audit/auditAgentStateCoverage.ts` | ❌ Cliente propio | Puede mantener ANON_KEY (solo lectura) |
| `scripts/audit/auditSyntheticAgentsProfile.ts` | ❌ Cliente propio | Puede mantener ANON_KEY (solo lectura) |

### Test (8 scripts)
| Script | Estado | Acción |
|--------|--------|--------|
| `scripts/test/run_ab_comparison.ts` | ❌ Cliente propio | Evaluar necesidad de SERVICE_KEY |
| `scripts/test/run_ab_comparison_from_supabase.ts` | ❌ Cliente propio | Evaluar necesidad de SERVICE_KEY |
| `scripts/test/run_ab_comparison_standalone.ts` | ❌ Cliente propio | Evaluar necesidad de SERVICE_KEY |
| `scripts/test/runScenarioSurvey.ts` | ❌ Cliente propio | Evaluar necesidad de SERVICE_KEY |
| `scripts/test/runV12EventEnabledSurvey.ts` | ❌ Cliente propio | Evaluar necesidad de SERVICE_KEY |
| `scripts/test/testEventImpactEndToEnd.ts` | ❌ Cliente propio | Ya corregido parcialmente |
| `scripts/test/validateAgentMapping.ts` | ❌ Cliente propio | Evaluar necesidad de SERVICE_KEY |
| `scripts/test/validateR1Implementation.ts` | ❌ Cliente propio | Evaluar necesidad de SERVICE_KEY |
| `scripts/test/prepareUserTestingScenarios.ts` | ❌ Cliente propio | Evaluar necesidad de SERVICE_KEY |

### Otros (6 scripts)
| Script | Estado | Acción |
|--------|--------|--------|
| `scripts/load_test_events.ts` | ❌ Cliente propio | Migrar a `serviceClient` |
| `scripts/load_ab_surveys.ts` | ❌ Cliente propio | Migrar a `serviceClient` |
| `scripts/verify_agent_id_uniqueness.ts` | ❌ Cliente propio | Evaluar necesidad de SERVICE_KEY |
| `scripts/verify/verifyRlsV4.ts` | ❌ Cliente propio | Ya usa SERVICE_KEY, migrar a serviceClient |
| `scripts/fix_scenario_rls_final.ts` | ❌ Cliente propio | Migrar a `serviceClient` |
| `scripts/synthesize/generate_synthetic_agents_chile_completo.ts` | ❌ Cliente propio | Migrar a `serviceClient` |

---

## Patrón de Migración

### Antes (patrón inconsistente)
```typescript
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.scripts' });

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_SERVICE_KEY || '';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
```

### Después (patrón estandarizado)
```typescript
import { serviceClient } from '../utils/serviceClient';

// Usar directamente
const { data, error } = await serviceClient.from('tabla').select('*');
```

O si necesitas la config:
```typescript
import { getServiceClientConfig } from '../utils/serviceClient';

const { url, key } = getServiceClientConfig();
// Usar url/key para otras operaciones
```

---

## Beneficios de la Migración

1. **Consistencia:** Todos los scripts usan el mismo patrón
2. **Seguridad:** Validación centralizada de credenciales
3. **Mantenibilidad:** Cambios en la configuración en un solo lugar
4. **Errores claros:** Mensajes de error estandarizados cuando faltan credenciales
5. **Sin fallbacks peligrosos:** No más `|| ANON_KEY` en scripts de escritura

---

## Estado Actual

**Scripts ya migrados (27):**

### OLA 1 — Rollout (4 scripts) ✅
- ✅ `scripts/rollout/runPhase1Controlled.ts`
- ✅ `scripts/rollout/runPhase2Controlled.ts`
- ✅ `scripts/rollout/runPhase3Controlled.ts`
- ✅ `scripts/rollout/runPhase3V12Controlled.ts`

### OLA 2 — Staging (8 scripts) ✅
- ✅ `scripts/staging/createStagingValidationSurvey.ts`
- ✅ `scripts/staging/runStagingValidationSurvey.ts`
- ✅ `scripts/staging/check_survey_responses.ts`
- ✅ `scripts/staging/verifyPersistence.ts`
- ✅ `scripts/staging/exportRun001AgentIds.ts`
- ✅ `scripts/staging/debugStagingQuestionFlow.ts`
- ✅ `scripts/staging/createB2LongitudinalSurvey.ts`
- ✅ `scripts/staging/runLongitudinalWave.ts`

**Nota:** Ver reporte completo en `docs/OLA_2_MIGRACION_STAGING_REPORT.md`

### OLA 3 — Migraciones y Seed (8 scripts) ✅
- ✅ `scripts/apply_migrations.ts`
- ✅ `scripts/apply_rls_fix.ts`
- ✅ `scripts/apply_rls_v4_secure.ts`
- ✅ `scripts/apply_single_migration.ts`
- ✅ `scripts/migrations/fixCademResponseValues.ts`
- ✅ `scripts/seed/run_seed.ts`
- ✅ `scripts/seed/seed_agents.ts`
- ✅ `scripts/seed/seed_territories.ts`

**Nota:** Ver reporte completo en `docs/OLA_3_MIGRACION_SERVICE_CLIENT_REPORT.md`

### Otros (1 script)
- ✅ `scripts/test/testEventImpactEndToEnd.ts` (parcial)

**Scripts pendientes (~19):** Ver lista arriba

**Infraestructura lista:**
- ✅ `scripts/utils/validateScriptEnv.ts`
- ✅ `scripts/utils/serviceClient.ts`
- ✅ `scripts/utils/fixScriptCredentials.ts` (automatización)

---

## Estrategia de Migración Recomendada (3 Olas)

> **Nota:** Se han completado 3 olas de migración. La OLA 4 es opcional y de baja prioridad.

### ✅ OLA 1 — Scripts de Rollout y Producción (4 scripts)
**Prioridad:** 🔴 CRÍTICA | **Status:** ✅ COMPLETADO

Scripts de rollout que ya usan `serviceClient`:
- ✅ `scripts/rollout/runPhase1Controlled.ts`
- ✅ `scripts/rollout/runPhase2Controlled.ts`
- ✅ `scripts/rollout/runPhase3Controlled.ts`
- ✅ `scripts/rollout/runPhase3V12Controlled.ts`

**Nota:** Los scripts `createPhaseXSurvey.ts` y `runCademProduction.ts` aún usan cliente propio pero están en la lista de pendientes.

---

### ✅ OLA 2 — Staging (8 scripts)
**Prioridad:** 🟡 MEDIA | **Status:** ✅ COMPLETADO

Todos los scripts de staging ahora usan `serviceClient`:
- ✅ `scripts/staging/createStagingValidationSurvey.ts`
- ✅ `scripts/staging/runStagingValidationSurvey.ts`
- ✅ `scripts/staging/check_survey_responses.ts`
- ✅ `scripts/staging/verifyPersistence.ts`
- ✅ `scripts/staging/exportRun001AgentIds.ts`
- ✅ `scripts/staging/debugStagingQuestionFlow.ts`
- ✅ `scripts/staging/createB2LongitudinalSurvey.ts`
- ✅ `scripts/staging/runLongitudinalWave.ts`

Ver reporte: `docs/OLA_2_MIGRACION_STAGING_REPORT.md`

---

### ✅ OLA 3 — Migraciones y Seed (8 scripts)
**Prioridad:** 🟡 MEDIA | **Status:** ✅ COMPLETADO

Todos los scripts de migraciones y seed ahora usan `serviceClient`:
- ✅ `scripts/apply_migrations.ts`
- ✅ `scripts/apply_rls_fix.ts`
- ✅ `scripts/apply_rls_v4_secure.ts`
- ✅ `scripts/apply_single_migration.ts`
- ✅ `scripts/migrations/fixCademResponseValues.ts`
- ✅ `scripts/seed/run_seed.ts`
- ✅ `scripts/seed/seed_agents.ts`
- ✅ `scripts/seed/seed_territories.ts`

Ver reporte: `docs/OLA_3_MIGRACION_SERVICE_CLIENT_REPORT.md`

---

### 🔄 OLA 4 — Scripts Restantes (Opcional)
**Prioridad:** 🟢 BAJA | **Tiempo:** 3-5 días | **Riesgo:** Bajo

Scripts pendientes de migración (~19 scripts):

**Rollout (5 scripts):**
- `scripts/rollout/createPhase1Survey.ts`
- `scripts/rollout/createPhase2Survey.ts`
- `scripts/rollout/createPhase2_5Survey.ts`
- `scripts/rollout/createPhase3Survey.ts`
- `scripts/rollout/createPhase3V12Survey.ts`
- `scripts/rollout/runCademProduction.ts`
- `scripts/rollout/runPhase2_5Controlled.ts`
- `scripts/rollout/runPhase3V12Controlled.ts`

**Calibración (3 scripts):**
- `scripts/calibration/debugRunSurveyFromSupabase.ts`
- `scripts/calibration/runBenchmarkComparisonFromSupabase.ts`
- `scripts/calibration/debugEconomicTopicDistributions.ts`

**Test (9 scripts):**
- `scripts/test/run_ab_comparison.ts`
- `scripts/test/run_ab_comparison_from_supabase.ts`
- `scripts/test/run_ab_comparison_standalone.ts`
- `scripts/test/runScenarioSurvey.ts`
- `scripts/test/runV12EventEnabledSurvey.ts`
- `scripts/test/testEventImpactEndToEnd.ts`
- `scripts/test/validateAgentMapping.ts`
- `scripts/test/validateR1Implementation.ts`
- `scripts/test/prepareUserTestingScenarios.ts`

**Otros (6 scripts):**
- `scripts/load_test_events.ts`
- `scripts/load_ab_surveys.ts`
- `scripts/verify_agent_id_uniqueness.ts`
- `scripts/verify/verifyRlsV4.ts`
- `scripts/fix_scenario_rls_final.ts`
- `scripts/synthesize/generate_synthetic_agents_chile_completo.ts`

**Recomendación:** Migrar solo si se van a usar activamente o si hay problemas de seguridad/operación.

---

### ❌ Qué NO migrar todavía

No tocar aún (pueden esperar):
- Scripts de auditoría (usan ANON_KEY para solo lectura, están claros)
- Scripts de test experimentales
- Scripts de calibración que solo leen
- Scripts de staging no críticos

**Razón:** Reducir superficie de cambio y riesgo. Estos scripts no están en el camino crítico de producción.

---

## Prompt para Implementación

```text
Necesito migrar la OLA 1 de scripts críticos al `serviceClient` centralizado.

Objetivo:
Los scripts de rollout/producción deben usar exclusivamente:
- `serviceClient` desde `scripts/utils/serviceClient.ts`
- sin crear clientes Supabase ad-hoc
- sin fallback a ANON_KEY

Scripts a migrar en esta ola:
- scripts/rollout/createPhase1Survey.ts
- scripts/rollout/createPhase2Survey.ts
- scripts/rollout/createPhase2_5Survey.ts
- scripts/rollout/createPhase3Survey.ts
- scripts/rollout/createPhase3V12Survey.ts
- scripts/rollout/runCademProduction.ts
- scripts/rollout/runPhase2_5Controlled.ts
- scripts/rollout/runPhase3V12Controlled.ts

Reglas:
1. usar solo `serviceClient`
2. no crear `createClient()` dentro de cada script
3. no usar fallback a ANON_KEY
4. si falta SERVICE_KEY, fallar explícitamente
5. no cambiar la lógica del script salvo lo necesario para el cliente
6. mantener output y comportamiento funcional

Quiero:
- primero un listado de qué scripts realmente necesitan cambios
- luego los archivos corregidos
- luego una nota breve de validación sugerida
```

---

## Herramientas Disponibles

- `scripts/utils/fixScriptCredentials.ts` - Automatización de migraciones
- `scripts/utils/serviceClient.ts` - Cliente centralizado
- `scripts/utils/validateScriptEnv.ts` - Validación de entorno
