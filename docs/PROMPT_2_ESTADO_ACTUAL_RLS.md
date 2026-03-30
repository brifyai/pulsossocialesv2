# PROMPT 2: ESTADO ACTUAL DE RLS EN BASE DE DATOS

## Fecha de análisis: 30/03/2026
## Estado: ✅ Completado (análisis basado en código)

---

## 🔴 NOTA IMPORTANTE

**No se pudo conectar a la base de datos remota** (requiere credenciales de service_role).
Este análisis se basa en:
1. Las migraciones SQL revisadas en Prompt 1
2. El código de los scripts de aplicación
3. La documentación existente

---

## 📊 ESTADO PRESUNTO DE LAS POLICIES (basado en migraciones)

### Tabla: `scenario_events`

| Policy (esperada) | Estado | Origen | Riesgo |
|-------------------|--------|--------|--------|
| "Allow public read" | ✅ Probablemente activa | v1/v2/v3 | 🟡 SELECT público |
| "Allow anon insert" | 🔴 **PROBABLEMENTE ACTIVA** | v3 | 🔴 **CRÍTICO** |
| "Allow anon update" | 🔴 **PROBABLEMENTE ACTIVA** | v3 | 🔴 **CRÍTICO** |
| "Allow anon delete" | 🔴 **PROBABLEMENTE ACTIVA** | v3 | 🔴 **CRÍTICO** |

### Tablas sin RLS (probablemente)

| Tabla | Estado RLS | Riesgo |
|-------|------------|--------|
| `weekly_events` | ❌ Sin policies | 🟡 Sin protección |
| `event_impact_logs` | ❌ Sin policies | 🟡 Sin protección |

---

## 🔴 HALLAZGOS CRÍTICOS

### 1. **v3 PROBABLEMENTE ESTÁ APLICADA** (Peor escenario)

Basado en:
- El archivo v3 existe y tiene fecha más reciente
- Los scripts `apply_scenario_rls_fix.ts` y `fix_scenario_rls_final.ts` existen
- La documentación menciona problemas con RLS

**Si v3 está aplicada:**
```sql
-- CUALQUIERA puede hacer esto:
INSERT INTO scenario_events (name, description) VALUES ('Hacked', 'By anon');
DELETE FROM scenario_events WHERE id = 'any-id';
```

### 2. **No hay aislamiento entre usuarios**

Ninguna migración incluye `created_by = auth.uid()`:
- Usuario A ve escenarios de Usuario B
- Usuario A edita escenarios de Usuario B
- No hay privacidad

### 3. **Scripts pueden fallar**

Ninguna migración excluye `service_role`:
- Los scripts de rollout pueden ser bloqueados por RLS
- Las operaciones batch pueden fallar

---

## 🟡 HALLAZGOS IMPORTANTES

### 4. **Inconsistencia en migraciones aplicadas**

| Archivo | Fecha | ¿Aplicado? |
|---------|-------|------------|
| `20250330_fix_scenario_events_rls.sql` | 30/03/2025 | ❓ Desconocido |
| `20250330_fix_scenario_events_rls_v2.sql` | 30/03/2025 | ❓ Desconocido |
| `20250330_fix_scenario_events_rls_v3.sql` | 30/03/2025 | ❓ **Probable** |

### 5. **Scripts de aplicación inconsistentes**

```typescript
// scripts/apply_scenario_rls_fix.ts - ¿Qué versión aplica?
// scripts/fix_scenario_rls_final.ts - ¿Es realmente "final"?
// scripts/apply_rls_fix.ts - ¿Qué hace este?
```

### 6. **Falta de cobertura**

- `weekly_events`: Sin policies RLS
- `event_impact_logs`: Sin policies RLS
- `scenario_events`: Solo tiene policies de scenario_events

---

## ✅ LO QUE SÍ ESTÁ BIEN (presunto)

1. **RLS está habilitado** en scenario_events (todas las migraciones lo hacen)
2. **Las tablas existen** (las migraciones de creación están presentes)
3. **Hay índices** (las migraciones de creación incluyen índices)

---

## 📋 GAP ANALYSIS: ESTADO vs DESEADO

| Requisito | Estado Presunto | Deseado | Gap |
|-----------|-----------------|---------|-----|
| Aislamiento usuario | ❌ No existe | ✅ `created_by = auth.uid()` | 🔴 CRÍTICO |
| Service role excepción | ❌ No existe | ✅ `role() = 'service_role'` | 🟡 Importante |
| Anon bloqueado | 🔴 **Permitido** | ❌ `false` | 🔴 CRÍTICO |
| weekly_events RLS | ❌ Sin policies | ✅ Con policies | 🟡 Importante |
| event_impact_logs RLS | ❌ Sin policies | ✅ Con policies | 🟡 Importante |
| SELECT restringido | ❌ Público | ✅ Solo propios | 🟡 Importante |

---

## 🎯 RECOMENDACIONES INMEDIATAS

### 1. **Verificar estado real en BD** (requiere acceso)
```bash
# Ejecutar en Supabase SQL Editor:
SELECT * FROM pg_policies WHERE tablename = 'scenario_events';
SELECT * FROM pg_policies WHERE tablename = 'weekly_events';
SELECT * FROM pg_policies WHERE tablename = 'event_impact_logs';
```

### 2. **Si v3 está aplicada: REVERTIR INMEDIATAMENTE**
```sql
-- Emergencia: deshabilitar RLS temporalmente
ALTER TABLE scenario_events DISABLE ROW LEVEL SECURITY;

-- O eliminar policies de anon
DROP POLICY IF EXISTS "Allow anon insert" ON scenario_events;
DROP POLICY IF EXISTS "Allow anon update" ON scenario_events;
DROP POLICY IF EXISTS "Allow anon delete" ON scenario_events;
```

### 3. **Crear migración v4 segura**
Ver `docs/PROMPT_1_ANALISIS_RLS_MIGRATIONS.md` para requisitos.

---

## 🚀 PRÓXIMO PASO: PROMPT 3

**Crear migración RLS segura (v4)** que incluya:
1. Aislamiento entre usuarios
2. Excepción para service_role
3. Bloqueo completo de anon
4. Cobertura de weekly_events y event_impact_logs
5. Tests de seguridad

---

## NOTAS

- **Acceso a BD:** Requiere `SUPABASE_SERVICE_KEY` o acceso al panel de Supabase
- **Estado:** Este análisis es presunto basado en código
- **Verificación:** Necesaria antes de cualquier acción en producción

**Análisis completado por:** Cline
**Fecha:** 30/03/2026
**Estado:** ✅ Listo para Prompt 3
