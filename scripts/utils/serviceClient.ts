/**
 * Cliente Supabase para scripts internos privilegiados
 * 
 * USO EXCLUSIVO: Scripts de migración, rollout y mantenimiento
 * NO usar en frontend - este cliente bypassa RLS con service_role
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { getServiceClientConfig } from './validateScriptEnv';

// Validar entorno al cargar el módulo (falla explícitamente si falta configuración)
const { url, key } = getServiceClientConfig();

/**
 * Cliente Supabase con privilegios de servicio (service_role)
 * 
 * ⚠️ ADVERTENCIA: Este cliente bypassa todas las políticas RLS.
 * Usar solo en scripts de administración y mantenimiento.
 */
export const serviceClient: SupabaseClient = createClient(url, key, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

/**
 * Re-exporta la función de validación para mantener compatibilidad
 * 
 * Útil cuando necesitas crear múltiples instancias o pasar credenciales
 * a otros servicios (ej: scripts de batch processing)
 */
export { getServiceClientConfig } from './validateScriptEnv';

export default serviceClient;
