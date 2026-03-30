# PROMPT 1: ANÁLISIS DE MIGRACIONES RLS - RESULTADO

## Fecha de análisis: 30/03/2026
## Tabla analizada: `scenario_events`

---

## 📊 TABLA COMPARATIVA DE LAS 3 MIGRACIONES

| Aspecto | v1 (20250330_fix_scenario_events_rls.sql) | v2 (20250330_fix_scenario_events_rls_v2.sql) | v3 (20250330_fix_scenario_events_rls_v3.sql) |
|---------|-------------------------------------------|----------------------------------------------|----------------------------------------------|
| **Objetivo** | Permitir escritura a usuarios autenticados | Usar auth.uid() correctamente | Permitir escritura a usuarios anónimos |
| **Razón** | auth.role() = 'authenticated' | auth.uid() IS NOT NULL | "La app usa custom auth, no Supabase Auth" |
| **Tablas afectadas** | scenario_events | scenario_events | scenario_events |

### Policies por versión:

| Policy | v1 | v2 | v3 |
|--------|----|----|----|
| **SELECT** | `true` (público) | `true` (público) | `true` (público) |
| **INSERT** | `auth.role() = 'authenticated'` | `auth.uid() IS NOT NULL` | `true` (anon) |
| **UPDATE** | `auth.role() = 'authenticated'` | `auth.uid() IS NOT NULL` | `true` (anon) |
| **DELETE** | `auth.role() = 'authenticated'` | `auth.uid() IS NOT NULL` | `true` (anon) |

### DROP POLICY incluidos:

| Policy | v1 | v2 | v3 |
|--------|----|----|----|
| "Allow public read" | ✅ | ✅ | ✅ |
| "Allow authenticated insert" | ✅ | ✅ | ✅ |
| "Allow authenticated update" | ✅ | ✅ | ✅ |
| "Allow authenticated delete" | ✅ | ✅ | ✅ |
| "Allow all authenticated" | ❌ | ✅ | ✅ |
| "Allow anon insert" | ❌ | ❌ | ✅ |
| "Allow anon update" | ❌ | ❌ | ✅ |
| "Allow anon delete" | ❌ | ❌ | ✅ |

### Roles mencionados:

| Rol | v1 | v2 | v3 |
|-----|----|----|----|
| `authenticated` | ✅ (implícito) | ✅ (implícito) | ❌ |
| `anon` | ❌ | ❌ | ✅ (implícito) |
| `service_role` | ❌ | ❌ | ❌ |

---

## 🔴 PROBLEMAS CRÍTICOS IDENTIFICADOS

### 1. **v3 ES INSEGURA - NO USAR**
```sql
-- ESTO ES UN AGUJERO DE SEGURIDAD:
CREATE POLICY "Allow anon insert" ON scenario_events
    FOR INSERT WITH CHECK (true);  -- Cualquiera puede insertar
```
- **Riesgo:** Cualquier persona sin autenticar puede crear/eliminar escenarios
- **Impacto:** Data pollution, escenarios maliciosos, pérdida de datos
- **Recomendación:** ❌ RECHAZAR v3 completamente

### 2. **Ninguna versión tiene aislamiento entre usuarios**
- **Problema:** Usuario A puede ver/editar escenarios de Usuario B
- **Falta:** `created_by = auth.uid()` en las policies
- **Impacto:** No hay privacidad de escenarios

### 3. **Ninguna versión maneja service_role correctamente**
- **Problema:** Los scripts necesitan acceso pero no hay excepción explícita
- **Falta:** `(role() = 'service_role'::name)` en las condiciones
- **Impacto:** Scripts pueden fallar si RLS bloquea operaciones

### 4. **Ninguna versión es idempotente correctamente**
- **Problema:** Solo hace DROP IF EXISTS, no verifica si ya existen
- **Riesgo:** Puede fallar si se ejecuta múltiples veces

### 5. **SELECT público en todas las versiones**
- **Problema:** `FOR SELECT USING (true)` permite a cualquiera ver todos los escenarios
- **Impacto:** Escenarios privados son públicos

---

## 🟡 PROBLEMAS MENORES

### 6. **Inconsistencia en naming**
- v1: "Allow authenticated insert"
- v2: "Allow authenticated insert" (mismo nombre, diferente lógica)
- v3: "Allow anon insert"

### 7. **No hay políticas para weekly_events ni event_impact_logs**
- Solo se cubre scenario_events
- weekly_events y event_impact_logs quedan sin RLS

### 8. **v2 tiene DROP de "Allow all authenticated" que v1 no creó**
- Esto sugiere que hubo otra migración intermedia no versionada

---

## ✅ LO QUE SÍ ESTÁ BIEN

1. **Todas las versiones habilitan RLS:**
   ```sql
   ALTER TABLE scenario_events ENABLE ROW LEVEL SECURITY;
   ```

2. **Todas las versiones incluyen verificación:**
   ```sql
   SELECT * FROM pg_policies WHERE tablename = 'scenario_events';
   ```

3. **Todas usan DROP IF EXISTS:**
   - Evita errores si las policies no existen

---

## 🎯 RECOMENDACIÓN: NINGUNA VERSIÓN ES ACEPTABLE

**Ninguna de las 3 migraciones es segura para producción.**

### Requisitos mínimos para migración final:

1. **Aislamiento entre usuarios:**
   ```sql
   -- SELECT: solo propios + service_role
   FOR SELECT USING (created_by = auth.uid() OR role() = 'service_role')
   
   -- INSERT: con created_by = auth.uid()
   FOR INSERT WITH CHECK (created_by = auth.uid() OR role() = 'service_role')
   
   -- UPDATE: solo propios
   FOR UPDATE USING (created_by = auth.uid() OR role() = 'service_role')
   
   -- DELETE: solo propios
   FOR DELETE USING (created_by = auth.uid() OR role() = 'service_role')
   ```

2. **Idempotencia completa:**
   ```sql
   -- Verificar si RLS ya está habilitado
   -- Verificar si policies existen antes de crear
   -- Usar CREATE OR REPLACE POLICY (PostgreSQL 14+)
   ```

3. **Cobertura de todas las tablas:**
   - scenario_events
   - weekly_events
   - event_impact_logs

4. **Tests de seguridad incluidos:**
   - Test: anon no puede nada
   - Test: usuario solo ve sus propios escenarios
   - Test: usuario no ve escenarios de otros
   - Test: service_role puede todo

---

## 📋 GAP ANALYSIS: QUÉ FALTA

| Requisito | v1 | v2 | v3 | Necesario |
|-----------|----|----|----|-----------|
| Aislamiento usuario | ❌ | ❌ | ❌ | ✅ SÍ |
| Service role excepción | ❌ | ❌ | ❌ | ✅ SÍ |
| Anon bloqueado | ✅ | ✅ | ❌ | ✅ SÍ |
| Idempotencia completa | 🟡 | 🟡 | 🟡 | ✅ SÍ |
| weekly_events RLS | ❌ | ❌ | ❌ | ✅ SÍ |
| event_impact_logs RLS | ❌ | ❌ | ❌ | ✅ SÍ |
| Tests de seguridad | ❌ | ❌ | ❌ | ✅ SÍ |

---

## 🚀 PRÓXIMO PASO: PROMPT 2

**Verificar estado actual en la base de datos:**
- ¿Qué policies están realmente aplicadas?
- ¿Qué versión se aplicó por última vez?
- ¿Hay datos que necesiten migración?

**Comando para ejecutar:**
```bash
psql $DATABASE_URL -c "SELECT * FROM pg_policies WHERE tablename = 'scenario_events';"
```

---

## NOTAS

- **v3 fue creada por:** "La app usa custom auth, no Supabase Auth"
- **Realidad:** La app SÍ usa Supabase Auth (customAuth.ts usa supabase.auth)
- **Conclusión:** v3 es un error de comprensión de la arquitectura

**Análisis completado por:** Cline
**Fecha:** 30/03/2026
**Estado:** ✅ Listo para Prompt 2
