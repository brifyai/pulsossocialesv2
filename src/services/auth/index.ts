/**
 * Auth Service - Pulsos Sociales
 * Servicio de autenticación usando Supabase Auth estándar
 *
 * NOTA: Este servicio usa la API nativa de Supabase Auth.
 * Las sesiones se manejan automáticamente por el cliente de Supabase.
 */

import { getSupabaseClient, type SupabaseClient } from '../supabase/client';
import type { User, Session, AuthError } from '@supabase/supabase-js';

// ===========================================
// Types
// ===========================================

export interface AuthUser {
  id: string;
  email: string;
  name?: string;
  avatar?: string;
  role: 'user' | 'admin' | 'moderator';
}

export interface AuthSession {
  user: AuthUser;
  accessToken: string;
  expiresAt: number;
  timestamp: number;
}

export interface AuthResult {
  success: boolean;
  user?: AuthUser;
  error?: string;
}

// ===========================================
// Helpers
// ===========================================

/**
 * Mapea un User de Supabase a AuthUser
 * Extrae metadata del usuario (name, avatar, role) desde user_metadata
 */
function mapSupabaseUser(supabaseUser: User): AuthUser {
  const metadata = supabaseUser.user_metadata || {};

  return {
    id: supabaseUser.id,
    email: supabaseUser.email || '',
    name: metadata.name || metadata.full_name || undefined,
    avatar: metadata.avatar_url || metadata.avatar || undefined,
    role: metadata.role || 'user',
  };
}

/**
 * Mapea una Session de Supabase a AuthSession
 */
function mapSupabaseSession(supabaseSession: Session): AuthSession {
  return {
    user: mapSupabaseUser(supabaseSession.user),
    accessToken: supabaseSession.access_token,
    expiresAt: new Date(supabaseSession.expires_at || Date.now() + 3600 * 1000).getTime(),
    timestamp: Date.now(),
  };
}

/**
 * Extrae mensaje de error legible de AuthError de Supabase
 */
function getErrorMessage(error: AuthError | Error | unknown): string {
  if (error && typeof error === 'object') {
    // AuthError de Supabase
    if ('message' in error && typeof error.message === 'string') {
      // Mapear errores comunes a mensajes amigables
      const message = error.message.toLowerCase();
      if (message.includes('invalid login credentials')) {
        return 'Email o contraseña incorrectos';
      }
      if (message.includes('user already registered') || message.includes('already exists')) {
        return 'Este email ya está registrado. Intenta iniciar sesión.';
      }
      if (message.includes('email not confirmed')) {
        return 'Por favor confirma tu email antes de iniciar sesión';
      }
      if (message.includes('weak password')) {
        return 'La contraseña es demasiado débil. Usa al menos 8 caracteres.';
      }
      if (message.includes('rate limit')) {
        return 'Demasiados intentos. Por favor espera un momento.';
      }
      return error.message;
    }
  }
  return 'Error inesperado. Intenta nuevamente.';
}

// ===========================================
// Auth Service
// ===========================================

class AuthService {
  private session: AuthSession | null = null;
  private initialized = false;
  private unsubscribeAuthState: (() => void) | null = null;

  constructor() {
    // No cargamos sesión aquí - se hace en initialize()
  }

  /**
   * Obtiene el cliente de Supabase
   * @private
   */
  private async getClient(): Promise<SupabaseClient | null> {
    return getSupabaseClient();
  }

  /**
   * Check if auth service is available (Supabase Auth está configurado)
   */
  async isAvailable(): Promise<boolean> {
    const client = await this.getClient();
    if (!client) return false;

    try {
      // Verificar que auth está disponible haciendo una llamada simple
      const { error } = await client.auth.getSession();
      return !error;
    } catch {
      return false;
    }
  }

  /**
   * Initialize auth service
   * Suscribe a cambios de auth y carga sesión actual
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    const client = await this.getClient();
    if (!client) {
      console.log('[Auth] Supabase no disponible - modo demo/fallback');
      this.initialized = true;
      return;
    }

    // Cargar sesión actual
    const { data: { session }, error } = await client.auth.getSession();
    if (session) {
      this.session = mapSupabaseSession(session);
      console.log('🔐 [Auth] Sesión restaurada:', this.session.user.email);
    }

    if (error) {
      console.warn('[Auth] Error cargando sesión:', error.message);
    }

    // Suscribirse a cambios de auth
    const { data: { subscription } } = client.auth.onAuthStateChange(
      (event, session) => {
        console.log(`🔐 [Auth] Evento: ${event}`);

        if (session) {
          this.session = mapSupabaseSession(session);
          console.log('🔐 [Auth] Usuario:', this.session.user.email);
        } else {
          this.session = null;
          console.log('🔐 [Auth] Sin sesión');
        }
      }
    );

    this.unsubscribeAuthState = subscription.unsubscribe;
    this.initialized = true;
  }

  /**
   * Sign in with email and password
   */
  async signIn(email: string, password: string): Promise<AuthResult> {
    // Validate inputs
    if (!email || !email.trim()) {
      return { success: false, error: 'El email es requerido' };
    }
    if (!password) {
      return { success: false, error: 'La contraseña es requerida' };
    }

    const client = await this.getClient();
    if (!client) {
      return { success: false, error: 'Servicio de autenticación no disponible' };
    }

    try {
      const { data, error } = await client.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });

      if (error) {
        console.error('[Auth] Sign in error:', error);
        return { success: false, error: getErrorMessage(error) };
      }

      if (!data.user || !data.session) {
        return { success: false, error: 'Error al iniciar sesión' };
      }

      // Actualizar sesión local
      this.session = mapSupabaseSession(data.session);

      console.log('🔐 [Auth] User signed in:', this.session.user.email);
      return { success: true, user: this.session.user };
    } catch (error) {
      console.error('[Auth] Sign in error:', error);
      return { success: false, error: 'Error al iniciar sesión. Intenta nuevamente.' };
    }
  }

  /**
   * Sign up with email and password
   */
  async signUp(
    email: string,
    password: string,
    metadata?: { name?: string }
  ): Promise<AuthResult> {
    // Validate inputs
    if (!email || !email.trim()) {
      return { success: false, error: 'El email es requerido' };
    }
    if (!password || password.length < 8) {
      return { success: false, error: 'La contraseña debe tener al menos 8 caracteres' };
    }

    const client = await this.getClient();
    if (!client) {
      return { success: false, error: 'Servicio de autenticación no disponible' };
    }

    try {
      const { data, error } = await client.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: {
          data: {
            name: metadata?.name?.trim(),
            role: 'user',
          },
        },
      });

      if (error) {
        console.error('[Auth] Sign up error:', error);
        return { success: false, error: getErrorMessage(error) };
      }

      if (!data.user) {
        return { success: false, error: 'Error al crear la cuenta' };
      }

      // Si hay sesión (auto-confirm), actualizarla
      if (data.session) {
        this.session = mapSupabaseSession(data.session);
      }

      const user = mapSupabaseUser(data.user);
      console.log('👤 [Auth] User registered:', user.email);

      return { success: true, user };
    } catch (error) {
      console.error('[Auth] Sign up error:', error);
      return { success: false, error: 'Error al crear la cuenta. Intenta nuevamente.' };
    }
  }

  /**
   * Sign out
   */
  async signOut(): Promise<void> {
    const client = await this.getClient();
    if (!client) {
      this.session = null;
      return;
    }

    try {
      const { error } = await client.auth.signOut();
      if (error) {
        console.error('[Auth] Sign out error:', error);
      }
    } catch (error) {
      console.error('[Auth] Sign out error:', error);
    } finally {
      this.session = null;
      console.log('🔐 [Auth] User signed out');
    }
  }

  /**
   * Reset password (envía email con enlace)
   */
  async resetPassword(email: string): Promise<AuthResult> {
    if (!email || !email.trim()) {
      return { success: false, error: 'El email es requerido' };
    }

    const client = await this.getClient();
    if (!client) {
      return { success: false, error: 'Servicio de autenticación no disponible' };
    }

    try {
      const { error } = await client.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      });

      if (error) {
        console.error('[Auth] Reset password error:', error);
        return { success: false, error: getErrorMessage(error) };
      }

      console.log('📧 [Auth] Password reset requested for:', email);
      return { success: true };
    } catch (error) {
      console.error('[Auth] Reset password error:', error);
      return { success: false, error: 'Error al solicitar reset de contraseña' };
    }
  }

  /**
   * Update password (requiere sesión activa)
   */
  async updatePassword(newPassword: string, currentPassword?: string): Promise<AuthResult> {
    if (!newPassword || newPassword.length < 8) {
      return { success: false, error: 'La contraseña debe tener al menos 8 caracteres' };
    }

    const client = await this.getClient();
    if (!client) {
      return { success: false, error: 'Servicio de autenticación no disponible' };
    }

    // Verificar sesión activa
    const { data: { session } } = await client.auth.getSession();
    if (!session) {
      return { success: false, error: 'No hay sesión activa' };
    }

    // Si se proporciona currentPassword, verificar re-autenticando
    if (currentPassword) {
      const { error: reauthError } = await client.auth.signInWithPassword({
        email: session.user.email || '',
        password: currentPassword,
      });

      if (reauthError) {
        return { success: false, error: 'Contraseña actual incorrecta' };
      }
    }

    try {
      const { data, error } = await client.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        console.error('[Auth] Update password error:', error);
        return { success: false, error: getErrorMessage(error) };
      }

      if (data.user) {
        // Actualizar sesión local si cambió
        const { data: { session: newSession } } = await client.auth.getSession();
        if (newSession) {
          this.session = mapSupabaseSession(newSession);
        }
      }

      console.log('🔐 [Auth] Password updated for user:', session.user.email);
      return { success: true };
    } catch (error) {
      console.error('[Auth] Update password error:', error);
      return { success: false, error: 'Error al actualizar la contraseña' };
    }
  }

  /**
   * Get current user
   */
  getCurrentUser(): AuthUser | null {
    return this.session?.user || null;
  }

  /**
   * Get current session
   */
  getSession(): AuthSession | null {
    return this.session;
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return !!this.session;
  }

  /**
   * Check if session is valid (not expired)
   * Nota: Supabase maneja refresh automático, esto es solo para verificación local
   */
  isSessionValid(): boolean {
    if (!this.session) return false;
    return Date.now() < this.session.expiresAt;
  }

  /**
   * Check if current user is admin
   */
  isAdmin(): boolean {
    return this.session?.user?.role === 'admin';
  }

  /**
   * Cleanup - desuscribirse de cambios de auth
   * Llamar esto al destruir la aplicación
   */
  cleanup(): void {
    if (this.unsubscribeAuthState) {
      this.unsubscribeAuthState();
      this.unsubscribeAuthState = null;
    }
  }
}

// Export singleton instance
export const authService = new AuthService();

// Export for use in other modules
export default authService;

// Convenience exports for common operations
export const logout = () => authService.signOut();
export const getCurrentUser = () => authService.getCurrentUser();
export const isAuthenticated = () => authService.isAuthenticated();
