# Security Hardening - Phase 1

**Fecha:** 2025-03-29  
**Estado:** ✅ COMPLETADO  
**Riesgo:** CRÍTICO → MEDIO

---

## 🚨 Problema Identificado

El frontend de la aplicación estaba usando `SUPABASE_SERVICE_KEY` (service_role key), lo cual es un **riesgo de seguridad crítico**:

- **SERVICE_KEY bypassa todas las políticas RLS**
- Cualquier usuario podría leer/escribir/borrar cualquier dato
- Exposición en código frontend = key visible en bundle
- Potencial de data breach total

---

## ✅ Solución Implementada

### 1. Separación de Clientes

#### Frontend (src/services/supabase/client.ts)
```typescript
// ✅ SOLO usa ANON_KEY
const SUPABASE_KEY = getEnvVar('VITE_SUPABASE_ANON_KEY');
// SERVICE_KEY está PROHIBIDO aquí
```

**Cambios:**
- Eliminado todo uso de SERVICE_KEY del frontend
- Agregado comentario de seguridad explícito
- Cliente ahora sujeto a políticas RLS

#### Scripts (scripts/utils/serviceClient.ts) - NUEVO
```typescript
// ✅ SOLO para scripts backend
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
// Este cliente bypassa RLS - usar con precaución
```

**Características:**
- Cliente dedicado para operaciones privilegiadas
- Bypassa RLS (intencional para scripts)
- NUNCA debe usarse en frontend

### 2. Políticas RLS Actualizadas

Archivo: `migrations/20250329_security_rls_policies.sql`

| Tabla | Acceso Anónimo | Restricciones |
|-------|----------------|---------------|
| `territories` | ✅ SELECT | Solo lectura |
| `synthetic_agents` | ✅ SELECT | Solo lectura |
| `survey_definitions` | ✅ SELECT | Solo `active`, `completed`, `archived` |
| `survey_runs` | ✅ SELECT | Solo `status = 'completed'` |
| `survey_responses` | ✅ SELECT | Solo lectura |
| `benchmarks` | ✅ SELECT | Solo lectura |
| `benchmark_comparisons` | ✅ SELECT | Solo lectura |
| `users` | ✅ SELECT | Solo `is_active = true` |
| `weekly_events` | ✅ SELECT | Solo lectura |
| `event_impact_logs` | ✅ SELECT | Solo lectura |
| `scenario_events` | ✅ SELECT | Solo lectura |
| `agent_topic_state` | ✅ SELECT | Solo lectura |
| `agent_panel_state` | ✅ SELECT | Solo lectura |

**Nota:** No hay políticas de INSERT/UPDATE/DELETE para anon key. Estas operaciones requieren SERVICE_KEY.

---

## 📋 Checklist de Verificación

### Frontend
- [x] `VITE_SUPABASE_SERVICE_KEY` eliminado de .env
- [x] Cliente solo usa `VITE_SUPABASE_ANON_KEY`
- [x] Comentarios de seguridad agregados
- [x] No hay imports de service key en src/

### Scripts
- [x] Nuevo cliente `scripts/utils/serviceClient.ts` creado
- [x] Usa `SUPABASE_SERVICE_KEY` desde environment
- [x] Documentación clara de uso exclusivo para scripts

### Base de Datos
- [x] RLS habilitado en todas las tablas
- [x] Políticas restrictivas aplicadas
- [x] Solo lectura pública permitida
- [x] Drafts y runs en progreso ocultos a anon

---

## 🔧 Instrucciones de Migración

### 1. Actualizar Variables de Entorno

**Archivo: `.env` (frontend)**
```bash
# ✅ CORRECTO - Solo anon key
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIs...

# ❌ ELIMINAR - No debe estar en frontend
# VITE_SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIs...
```

**Archivo: `.env` (scripts/ops)**
```bash
# ✅ CORRECTO - Service key solo para scripts
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIs...
```

### 2. Aplicar Migración SQL

```bash
# En Supabase Studio SQL Editor o psql
psql $DATABASE_URL -f migrations/20250329_security_rls_policies.sql
```

### 3. Verificar Funcionamiento

```bash
# Test frontend (debe funcionar con anon key)
npm run dev

# Test scripts (deben funcionar con service key)
cd scripts && npx ts-node test_script.ts
```

---

## 🧪 Tests de Seguridad

### Test 1: Verificar que frontend no tiene service key
```bash
grep -r "SERVICE_KEY" src/ --include="*.ts" --include="*.js"
# Debe retornar vacío o solo comentarios
```

### Test 2: Verificar que scripts usan serviceClient
```bash
grep -r "getServiceClient\|createServiceClient" scripts/ --include="*.ts"
# Debe mostrar uso correcto del nuevo cliente
```

### Test 3: Verificar RLS está activo
```sql
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('territories', 'synthetic_agents', 'survey_definitions');
-- Todas deben mostrar 'true'
```

---

## 📊 Impacto

| Aspecto | Antes | Después |
|---------|-------|---------|
| Riesgo de seguridad | 🔴 CRÍTICO | 🟡 MEDIO |
| Exposición de datos | Total | Controlada |
| Acceso anónimo | Sin restricciones | Solo lectura pública |
| Complejidad | Baja | Media |

---

## 🔄 Próximos Pasos (Phase 2)

1. **Autenticación Real**
   - Implementar Supabase Auth o auth propio
   - Políticas RLS basadas en usuario autenticado
   - Roles: admin, analyst, viewer

2. **Auditoría**
   - Tabla de audit logs
   - Tracking de quién hace qué
   - Alertas de accesos sospechosos

3. **Rate Limiting**
   - Limitar requests por IP/usuario
   - Prevenir abuso de API

4. **Data Masking**
   - Ocultar datos sensibles de agentes
   - Anonimizar respuestas en ciertos contextos

---

## 📚 Referencias

- [Supabase RLS Documentation](https://supabase.com/docs/guides/auth/row-level-security)
- [Supabase Security Best Practices](https://supabase.com/docs/guides/security)
- Archivos modificados:
  - `src/services/supabase/client.ts`
  - `scripts/utils/serviceClient.ts` (nuevo)
  - `migrations/20250329_security_rls_policies.sql`

---

## ✅ Aprobación

| Rol | Nombre | Fecha | Estado |
|-----|--------|-------|--------|
| Implementación | Claude Code | 2025-03-29 | ✅ Completado |
| Revisión | - | - | ⏳ Pendiente |
| Deploy a Prod | - | - | ⏳ Pendiente |

---

**Nota:** Esta es una mejora de seguridad crítica. Se recomienda deploy a producción lo antes posible.
