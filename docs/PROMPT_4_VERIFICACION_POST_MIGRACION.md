# PROMPT 4: VERIFICACIÓN POST-MIGRACIÓN RLS v4

**Fecha:** 30/03/2026  
**Estado:** ✅ COMPLETADO  
**Objetivo:** Verificar que la migración RLS v4 se aplicó correctamente

---

## ✅ Entregables Completados

1. **Documentación:** `docs/PROMPT_4_VERIFICACION_POST_MIGRACION.md`
2. **Script SQL:** `scripts/verify/verify_rls_v4.sql`
3. **Script TypeScript:** `scripts/verify/verifyRlsV4.ts`

---

---

## 📋 Checklist de Verificación

### 1. Verificar Policies en Supabase Dashboard

Ir a: Supabase Dashboard → Database → Policies

**Tabla: scenario_events**
- [ ] RLS está habilitado (toggle ON)
- [ ] Existen 5 policies:
  - [ ] "Users can view own scenarios" (SELECT)
  - [ ] "Users can insert own scenarios" (INSERT)
  - [ ] "Users can update own scenarios" (UPDATE)
  - [ ] "Users can delete own scenarios" (DELETE)
  - [ ] "Service role full access" (ALL)
- [ ] NO hay policies con "anon" en el nombre
- [ ] NO hay policies "Allow public read"

**Tabla: weekly_events**
- [ ] RLS está habilitado
- [ ] Existen 2 policies:
  - [ ] "Users can view weekly events" (SELECT)
  - [ ] "Service role can manage weekly events" (ALL)

**Tabla: event_impact_logs**
- [ ] RLS está habilitado
- [ ] Existen 2 policies:
  - [ ] "Users can view event impact logs" (SELECT)
  - [ ] "Service role can manage event impact logs" (ALL)

---

### 2. Verificar Índices

Ir a: Supabase Dashboard → Database → Indexes

- [ ] `idx_scenario_events_user_id` existe en scenario_events
- [ ] `idx_scenario_events_status` existe
- [ ] `idx_scenario_events_category` existe

---

### 3. Tests de Seguridad

#### Test A: Usuario Autenticado Puede Crear Escenario

```sql
-- Como usuario autenticado (usando anon_key con JWT válido)
INSERT INTO scenario_events (
    user_id, 
    name, 
    description, 
    category, 
    sentiment, 
    intensity, 
    salience
) VALUES (
    auth.uid(),
    'Test Scenario',
    'Testing RLS v4',
    'economy',
    0.5,
    0.7,
    0.8
);
-- ✅ Esperado: INSERT exitoso
```

#### Test B: Usuario Solo Ve Sus Propios Escenarios

```sql
-- Como usuario A
SELECT * FROM scenario_events;
-- ✅ Esperado: Solo ve escenarios donde user_id = su_uid

-- Como usuario B
SELECT * FROM scenario_events;
-- ✅ Esperado: Solo ve escenarios donde user_id = su_uid (diferentes a A)
```

#### Test C: Usuario No Puede Ver Escenarios de Otros

```sql
-- Intentar ver escenario de otro usuario
SELECT * FROM scenario_events WHERE user_id != auth.uid();
-- ✅ Esperado: 0 filas (RLS filtra automáticamente)
```

#### Test D: Usuario No Puede Modificar Escenarios de Otros

```sql
-- Intentar update de escenario ajeno
UPDATE scenario_events 
SET name = 'Hacked' 
WHERE user_id != auth.uid();
-- ✅ Esperado: 0 filas afectadas

-- Intentar delete de escenario ajeno
DELETE FROM scenario_events 
WHERE user_id != auth.uid();
-- ✅ Esperado: 0 filas afectadas
```

#### Test E: Anon Está Bloqueado

```sql
-- Como anon (sin autenticación)
SELECT * FROM scenario_events;
-- ❌ Esperado: Error "permission denied for table scenario_events"

INSERT INTO scenario_events (...) VALUES (...);
-- ❌ Esperado: Error "permission denied"
```

#### Test F: Service Role Funciona

```bash
# Ejecutar script con service_key
SUPABASE_SERVICE_KEY=xxx npx ts-node scripts/test/createValidationScenarios.ts
# ✅ Esperado: Script funciona correctamente (service_role bypass RLS)
```

---

### 4. Verificar Datos Existentes

```sql
-- Verificar escenarios sin user_id
SELECT COUNT(*) FROM scenario_events WHERE user_id IS NULL;
-- Si > 0, necesitan ser asignados a un usuario

-- Opcional: Asignar a admin
UPDATE scenario_events 
SET user_id = 'uid-del-admin' 
WHERE user_id IS NULL;
```

---

### 5. Verificar Frontend

- [ ] Usuario puede crear escenario desde UI
- [ ] Usuario solo ve sus escenarios en la lista
- [ ] Usuario puede editar sus escenarios
- [ ] Usuario puede eliminar sus escenarios
- [ ] Usuario NO ve escenarios de otros

---

## 🔧 Scripts de Verificación

### Script SQL de Verificación

```sql
-- ============================================================================
-- VERIFICACIÓN POST-MIGRACIÓN RLS v4
-- ============================================================================

-- 1. Verificar RLS habilitado
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables
WHERE tablename IN ('scenario_events', 'weekly_events', 'event_impact_logs');

-- 2. Verificar policies existentes
SELECT 
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename IN ('scenario_events', 'weekly_events', 'event_impact_logs')
ORDER BY tablename, policyname;

-- 3. Verificar índices
SELECT 
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'scenario_events'
AND indexname LIKE 'idx_scenario_events%';

-- 4. Contar escenarios por usuario
SELECT 
    user_id,
    COUNT(*) as scenario_count
FROM scenario_events
GROUP BY user_id
ORDER BY scenario_count DESC;

-- 5. Verificar escenarios sin user_id
SELECT COUNT(*) as null_user_count
FROM scenario_events
WHERE user_id IS NULL;
```

---

## 📊 Resultados Esperados

| Verificación | Estado Esperado |
|--------------|-----------------|
| RLS habilitado en scenario_events | ✅ ON |
| RLS habilitado en weekly_events | ✅ ON |
| RLS habilitado en event_impact_logs | ✅ ON |
| Policies de scenario_events | ✅ 5 policies |
| Policies de weekly_events | ✅ 2 policies |
| Policies de event_impact_logs | ✅ 2 policies |
| Índice user_id | ✅ Existe |
| Usuario autenticado INSERT | ✅ Funciona |
| Usuario autenticado SELECT | ✅ Solo propios |
| Anon bloqueado | ❌ Error |
| Service role funciona | ✅ Bypass RLS |

---

## 🚨 Problemas Comunes y Soluciones

### Problema 1: Usuario no puede crear escenario
**Síntoma:** Error "new row violates row-level security policy"
**Causa:** El user_id no coincide con auth.uid()
**Solución:** Verificar que el frontend envía user_id = auth.uid()

### Problema 2: Usuario ve todos los escenarios
**Síntoma:** Usuario ve escenarios de otros
**Causa:** Policy SELECT no tiene filtro user_id
**Solución:** Verificar policy "Users can view own scenarios"

### Problema 3: Scripts fallan con service_key
**Síntoma:** Script no puede insertar
**Causa:** Service role no tiene policy
**Solución:** Verificar policy "Service role full access"

### Problema 4: Escenarios existentes no visibles
**Síntoma:** Escenarios creados antes de la migración no aparecen
**Causa:** Tienen user_id = NULL
**Solución:** Asignar user_id a escenarios existentes

---

## ✅ Sign-Off

| Verificación | Estado | Fecha | Responsable |
|--------------|--------|-------|-------------|
| Documentación creada | ✅ | 30/03/2026 | Cline |
| Script SQL creado | ✅ | 30/03/2026 | Cline |
| Script TypeScript creado | ✅ | 30/03/2026 | Cline |
| Ejecución en producción | ⬜ | | |
| Tests de seguridad | ⬜ | | |
| Verificación datos | ⬜ | | |
| Frontend funciona | ⬜ | | |
| Scripts funcionan | ⬜ | | |

**Estado General:** 🔄 SCRIPTS LISTOS - PENDIENTE EJECUCIÓN MANUAL

---

## 🚀 Cómo Ejecutar la Verificación

### Opción 1: Script SQL (Recomendado)

```bash
# En Supabase SQL Editor, ejecutar:
psql $DATABASE_URL -f scripts/verify/verify_rls_v4.sql
```

### Opción 2: Script TypeScript

```bash
# Configurar credenciales
export SUPABASE_URL="https://your-project.supabase.co"
export SUPABASE_SERVICE_KEY="your-service-key"

# Ejecutar
npx ts-node scripts/verify/verifyRlsV4.ts
```

### Opción 3: Manual en Dashboard

1. Ir a Supabase Dashboard → Database → Policies
2. Verificar que las 3 tablas tienen RLS habilitado
3. Verificar policies listadas arriba
4. Verificar índices en Database → Indexes

---

**Creado por:** Cline  
**Fecha:** 30/03/2026
