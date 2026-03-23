/**
 * Auth Service - Pulsos Sociales
 * Servicio de autenticación usando tabla propia (NO Supabase Auth)
 *
 * NOTA: Este servicio fue migrado de Supabase Auth a auth propio
 * para evitar dependencia del servicio GoTrue que da error 503.
 * Usa la tabla 'users' directamente.
 *
 * Este archivo ahora re-exporta desde customAuth.ts para mantener
 * compatibilidad con el resto de la aplicación.
 */

// Re-exportar todo desde customAuth
export {
  customAuthService as authService,
  customAuthService as default,
  logout,
  getCurrentUser,
  isAuthenticated,
} from './customAuth';

export type {
  AuthUser,
  AuthSession,
  AuthResult,
} from './customAuth';
