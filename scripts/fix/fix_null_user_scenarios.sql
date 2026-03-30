-- ============================================================================
-- SCRIPT: Asignar user_id a escenarios sin usuario
-- Fecha: 2025-03-30
-- Descripción: Asigna escenarios existentes con user_id NULL a un usuario admin
-- ============================================================================

-- ============================================================================
-- PASO 1: Verificar escenarios sin user_id
-- ============================================================================
SELECT 
    'BEFORE FIX' as status,
    COUNT(*) as null_user_count
FROM scenario_events
WHERE user_id IS NULL;

-- ============================================================================
-- PASO 2: Ver usuarios disponibles (para elegir admin)
-- ============================================================================
SELECT 
    id,
    email,
    role,
    created_at
FROM users
ORDER BY created_at ASC
LIMIT 5;

-- ============================================================================
-- PASO 3: Asignar escenarios al usuario admin
-- REEMPLAZAR 'ADMIN_USER_ID' con el UUID real del admin
-- ============================================================================

-- Opción A: Asignar a un usuario específico (recomendado)
-- UPDATE scenario_events 
-- SET user_id = 'ADMIN_USER_ID_AQUI'
-- WHERE user_id IS NULL;

-- Opción B: Asignar al primer usuario admin encontrado
UPDATE scenario_events 
SET user_id = (
    SELECT id 
    FROM users 
    WHERE role = 'admin' 
    ORDER BY created_at ASC 
    LIMIT 1
)
WHERE user_id IS NULL;

-- ============================================================================
-- PASO 4: Verificar resultado
-- ============================================================================
SELECT 
    'AFTER FIX' as status,
    COUNT(*) as null_user_count
FROM scenario_events
WHERE user_id IS NULL;

-- ============================================================================
-- PASO 5: Ver distribución de escenarios por usuario
-- ============================================================================
SELECT 
    user_id,
    COUNT(*) as scenario_count,
    MIN(created_at) as oldest,
    MAX(created_at) as newest
FROM scenario_events
GROUP BY user_id
ORDER BY scenario_count DESC;
