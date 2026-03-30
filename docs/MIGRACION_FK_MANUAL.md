# Migración Manual: Fix FK scenario_events

## Problema
La tabla `scenario_events` tiene una FK que apunta a `auth.users`, pero la aplicación usa la tabla `public.users`. Esto causa errores al insertar escenarios.

## Solución

Ejecutar el siguiente SQL en el **SQL Editor** de Supabase Dashboard:

```sql
-- Migration: Fix scenario_events foreign key to reference public.users instead of auth.users
-- Date: 2026-03-30

-- Drop the existing foreign key constraint
ALTER TABLE scenario_events
    DROP CONSTRAINT IF EXISTS scenario_events_user_id_fkey;

-- Add new foreign key constraint referencing public.users
ALTER TABLE scenario_events
    ADD CONSTRAINT scenario_events_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
```

## Pasos

1. Ve a tu proyecto en [Supabase Dashboard](https://app.supabase.com)
2. Navega a **SQL Editor**
3. Crea una **New query**
4. Copia y pega el SQL de arriba
5. Ejecuta con **Run**

## Verificación

Después de ejecutar, verifica que la FK está correcta:

```sql
SELECT
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_name = 'scenario_events';
```

Debería mostrar que `user_id` referencia `users(id)` (no `auth.users`).

## Nota

Esta migración es necesaria para que el script `prepareUserTestingScenarios.ts` funcione correctamente.
