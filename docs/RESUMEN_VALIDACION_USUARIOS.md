# Resumen: Preparación para Validación con Usuarios

**Fecha:** 30 de Marzo, 2026  
**Estado:** ✅ Listo para ejecutar (con paso manual pendiente)

---

## TL;DR - Pasos para Ejecutar Validación

### 1. Migración FK (Manual - 2 min)
```sql
-- En Supabase SQL Editor:
ALTER TABLE scenario_events
    DROP CONSTRAINT IF EXISTS scenario_events_user_id_fkey;

ALTER TABLE scenario_events
    ADD CONSTRAINT scenario_events_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
```

### 2. Crear Escenarios (Automático - 1 min)
```bash
npx tsx scripts/test/prepareUserTestingScenarios.ts
```

### 3. Iniciar Servidor
```bash
npm run dev
```

### 4. Validar con Usuarios
- Abrir http://localhost:5175/scenarios
- Seguir guía en: `docs/cadem-v3/PLAN_VALIDACION_USUARIOS_V2.md`

---

## Documentos Creados

| Documento | Propósito | Ubicación |
|-----------|-----------|-----------|
| **Checklist de Validación** | Paso a paso para preparar y ejecutar | `docs/VALIDACION_USUARIOS_CHECKLIST.md` |
| **Guía de Migración FK** | Instrucciones para fix de FK manual | `docs/MIGRACION_FK_MANUAL.md` |
| **Plan de Validación v2** | Guía completa de sesiones con usuarios | `docs/cadem-v3/PLAN_VALIDACION_USUARIOS_V2.md` |
| **Script de Preparación** | Crea 3 escenarios de prueba automáticamente | `scripts/test/prepareUserTestingScenarios.ts` |

---

## Problema Identificado y Solución

### Problema
La tabla `scenario_events` tenía una FK que apuntaba a `auth.users`, pero la aplicación usa `public.users`. Esto causaba errores al insertar escenarios.

### Solución Implementada
1. ✅ **Migración SQL creada** (`migrations/20250330_fix_scenario_events_fk.sql`)
2. ✅ **Script de aplicación creado** (`scripts/apply_single_migration.ts`)
3. ✅ **Documentación manual creada** (`docs/MIGRACION_FK_MANUAL.md`)
4. ✅ **Script de preparación actualizado** con manejo de errores de FK
5. ✅ **Plan de validación actualizado** con paso de migración FK

### Por qué Manual
No tenemos la función RPC `exec_sql` en Supabase, por lo que la migración debe ejecutarse manualmente en el SQL Editor.

---

## Escenarios de Prueba

El script `prepareUserTestingScenarios.ts` creará automáticamente:

| Nombre | Categoría | Sentimiento | Intensidad | Salience |
|--------|-----------|-------------|------------|----------|
| Crisis Económica | economy | -0.75 | 0.9 | 0.6 |
| Subsidio al Transporte | government | +0.75 | 0.8 | 0.7 |
| Endurecimiento Migratorio | migration | -0.50 | 0.7 | 0.8 |

---

## Checklist de Preparación

- [ ] Ejecutar migración FK en Supabase SQL Editor
- [ ] Ejecutar `prepareUserTestingScenarios.ts` para crear escenarios
- [ ] Verificar servidor frontend corriendo en :5175
- [ ] Confirmar que escenarios aparecen en /scenarios
- [ ] Tener guía de validación impresa/disponible
- [ ] Confirmar usuarios para sesiones de testing

---

## Archivos Modificados/Creados

### Nuevos
- `docs/VALIDACION_USUARIOS_CHECKLIST.md`
- `docs/MIGRACION_FK_MANUAL.md`
- `migrations/20250330_fix_scenario_events_fk.sql`
- `scripts/apply_single_migration.ts`

### Modificados
- `scripts/test/prepareUserTestingScenarios.ts` - Ahora busca usuario dinámicamente y maneja errores de FK
- `docs/cadem-v3/PLAN_VALIDACION_USUARIOS_V2.md` - Agregada sección de migración FK

---

## Próximos Pasos

1. **Ejecutar migración FK manual** en Supabase Dashboard
2. **Ejecutar script** `prepareUserTestingScenarios.ts`
3. **Iniciar servidor** `npm run dev`
4. **Ejecutar sesiones** de validación con usuarios siguiendo el plan
5. **Documentar resultados** en formato de captura

---

## Contacto y Soporte

Si hay problemas durante la validación:
- Revisar logs: `npm run dev`
- Verificar Supabase: Dashboard > Logs
- Documentar issues: Crear archivo en `docs/VALIDACION_USUARIOS_ISSUES.md`

---

**Preparado por:** Claude Code  
**Fecha de preparación:** 30/03/2026  
**Estado:** ✅ Listo para validación con usuarios
