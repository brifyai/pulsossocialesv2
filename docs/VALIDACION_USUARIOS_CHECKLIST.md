# Checklist de Validación con Usuarios - Scenario Builder

## Estado Actual

**Fecha:** 30 de Marzo, 2026
**Versión:** v1.2 + Scenario Builder MVP
**Estado:** Listo para validación (con pasos manuales pendientes)

---

## Pre-requisitos para Validación

### 1. Migración de Foreign Key (REQUERIDO MANUAL)

**Problema:** La tabla `scenario_events` tiene una FK incorrecta que apunta a `auth.users` en lugar de `public.users`.

**Estado:** ✅ COMPLETADO - Migración ejecutada exitosamente

**Instrucciones:**
1. Abrir [Supabase Dashboard](https://app.supabase.com)
2. Navegar a **SQL Editor**
3. Ejecutar el siguiente SQL:

```sql
-- Fix FK: scenario_events debe referenciar public.users, no auth.users
ALTER TABLE scenario_events
    DROP CONSTRAINT IF EXISTS scenario_events_user_id_fkey;

ALTER TABLE scenario_events
    ADD CONSTRAINT scenario_events_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
```

**Verificación:**
```sql
SELECT
    tc.constraint_name,
    ccu.table_name AS foreign_table_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_name = 'scenario_events';
```
Debe mostrar `users` (no `auth.users`).

---

### 2. Crear Escenarios de Prueba

**Comando:**
```bash
npx tsx scripts/test/prepareUserTestingScenarios.ts
```

**Escenarios que se crearán:**
| Nombre | Categoría | Severidad | Sentimiento |
|--------|-----------|-----------|-------------|
| Crisis Económica | economy | major | -0.75 |
| Subsidio al Transporte | government | major | +0.75 |
| Endurecimiento Migratorio | migration | major | -0.50 |

---

### 3. Verificar Servidor Frontend

**Comando:**
```bash
npm run dev
```

**Verificación:**
- [ ] Servidor responde en http://localhost:5175
- [ ] Página /scenarios carga sin errores
- [ ] Lista de escenarios se muestra correctamente

---

## Flujo de Validación con Usuarios

### Sesión de Testing (30-45 minutos)

#### 1. Introducción (5 min)
- [ ] Explicar propósito del Scenario Builder
- [ ] Mostrar contexto: simulación de opinión pública
- [ ] Explicar que es una versión MVP

#### 2. Tareas de Usuario (20 min)

**Tarea 1: Explorar Escenarios Existentes**
- [ ] Usuario puede ver lista de escenarios
- [ ] Usuario puede ver detalles de un escenario
- [ ] Usuario entiende los atributos (sentimiento, intensidad, etc.)

**Tarea 2: Crear Nuevo Escenario**
- [ ] Usuario encuentra botón "Crear Escenario"
- [ ] Usuario completa formulario con datos de prueba
- [ ] Usuario guarda el escenario
- [ ] Escenario aparece en la lista

**Tarea 3: Editar Escenario**
- [ ] Usuario puede editar un escenario existente
- [ ] Cambios se guardan correctamente

**Tarea 4: Eliminar Escenario (opcional)**
- [ ] Usuario puede eliminar un escenario de prueba

#### 3. Preguntas de Feedback (10 min)

**Usabilidad:**
- ¿Qué tan intuitiva fue la interfaz?
- ¿Hubo algo confuso?
- ¿Qué información faltaba?

**Utilidad:**
- ¿Entiende para qué sirve crear escenarios?
- ¿Le gustaría vincular escenarios a encuestas?
- ¿Qué funcionalidad extra necesitaría?

**Estabilidad:**
- ¿Hubo errores durante la sesión?
- ¿La interfaz respondió rápido?

---

## Checklist Técnico Post-Validación

### Funcionalidad Core
- [ ] Crear escenario funciona
- [ ] Editar escenario funciona
- [ ] Eliminar escenario funciona
- [ ] Listar escenarios funciona
- [ ] Persistencia en Supabase funciona

### UX/UI
- [ ] Formulario es claro y usable
- [ ] Validaciones de campos funcionan
- [ ] Mensajes de error son comprensibles
- [ ] Feedback visual apropiado

### Integridad de Datos
- [ ] user_id se guarda correctamente
- [ ] Timestamps (created_at, updated_at) son correctos
- [ ] Valores numéricos (sentiment, intensity, salience) son válidos

---

## Documentos Relacionados

- [PLAN_VALIDACION_USUARIOS_V2.md](./PLAN_VALIDACION_USUARIOS_V2.md) - Plan detallado
- [SCENARIO_BUILDER_USER_TESTING_GUIDE.md](./cadem-v3/SCENARIO_BUILDER_USER_TESTING_GUIDE.md) - Guía de testing
- [MIGRACION_FK_MANUAL.md](./MIGRACION_FK_MANUAL.md) - Instrucciones de migración FK

---

## Notas para el Equipo

### Bloqueantes Resueltos
1. ✅ Script de preparación de escenarios creado
2. ✅ Manejo de errores de FK implementado
3. ✅ Documentación de migración manual creada

### Bloqueantes Pendientes
1. ✅ Todos los bloqueantes resueltos - Sistema listo para validación

### Decisiones de Diseño
- Los escenarios son por-usuario (user_id requerido)
- No hay escenarios "globales" en esta versión
- El campo `status` permite 'active' | 'inactive' | 'archived'

---

## Resultados Esperados

Al finalizar la validación con usuarios, deberíamos tener:

1. **Feedback cualitativo** sobre UX/UI
2. **Lista de bugs** encontrados
3. **Priorización de features** para v1.3
4. **Decisión go/no-go** para habilitar en producción

---

## Contacto

Para problemas técnicos durante la validación:
- Revisar logs del servidor: `npm run dev`
- Verificar estado de Supabase: Dashboard > Logs
- Documentar errores en: `docs/VALIDACION_USUARIOS_ISSUES.md`
