/**
 * Custom Auth Service - Pulsos Sociales
 * Servicio de autenticación usando tabla propia (NO Supabase Auth)
 *
 * Este servicio reemplaza Supabase Auth para evitar dependencia de GoTrue.
 * Usa la tabla 'users' directamente con PBKDF2 para passwords.
 *
 * MEJORAS DE SEGURIDAD:
 * - PBKDF2 con 100K iteraciones para hashing de passwords
 * - Tokens criptográficamente seguros (crypto.getRandomValues)
 * - Rate limiting para protección contra fuerza bruta
 * - Audit logging para eventos de autenticación
 * - Migración automática de hashes legacy
 */

import {
  getUserByEmailWithPassword,
  getUserById,
  createUser,
  updateLastLogin,
  updatePassword as updateUserPassword,
  isEmailTaken,
  type User,
  type DbUser,
} from '../supabase/repositories/userRepository';
import { hashPassword, verifyPassword, isLegacyHash } from './passwordHasher';
import { createSession } from './tokenManager';
import { loginRateLimiter } from './rateLimiter';
import { auditLogger } from './auditLog';

// ===========================================
// Types (compatibles con el auth service anterior)
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
// Session Management
// ===========================================

const SESSION_KEY = 'pulsossociales_session';

function saveSession(session: AuthSession): void {
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  } catch {
    // Silent fail in private mode
  }
}

function loadSession(): AuthSession | null {
  try {
    const data = localStorage.getItem(SESSION_KEY);
    if (!data) return null;

    const session: AuthSession = JSON.parse(data);

    // Check expiration
    if (Date.now() > session.expiresAt) {
      localStorage.removeItem(SESSION_KEY);
      return null;
    }

    return session;
  } catch {
    return null;
  }
}

function clearSession(): void {
  try {
    localStorage.removeItem(SESSION_KEY);
  } catch {
    // Silent fail
  }
}

// ===========================================
// User Mappers
// ===========================================

function mapToAuthUser(user: User): AuthUser {
  return {
    id: user.id,
    email: user.email,
    name: user.name || undefined,
    avatar: user.avatar || undefined,
    role: user.role,
  };
}

function mapDbUserToAuthUser(user: DbUser): AuthUser {
  return {
    id: user.id,
    email: user.email,
    name: user.name || undefined,
    avatar: user.avatar || undefined,
    role: user.role,
  };
}

// ===========================================
// Auth Service
// ===========================================

class CustomAuthService {
  private session: AuthSession | null = null;
  private initialized = false;

  constructor() {
    // No cargamos sesión aquí - se hace en initialize()
  }

  /**
   * Check if auth service is available (tabla users está accesible)
   */
  async isAvailable(): Promise<boolean> {
    // Intentar hacer una operación simple para verificar disponibilidad
    try {
      // Verificar si podemos acceder a la tabla users
      const { getSupabaseClient } = await import('../supabase/client');
      const client = await getSupabaseClient();
      return !!client;
    } catch {
      return false;
    }
  }

  /**
   * Initialize auth service
   * Carga sesión desde localStorage
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    // Cargar sesión desde localStorage
    const session = loadSession();
    if (session) {
      // Verificar que el usuario sigue existiendo
      const user = await getUserById(session.user.id);
      if (user && user.isActive) {
        this.session = session;
        console.log('🔐 [CustomAuth] Sesión restaurada:', session.user.email);
      } else {
        clearSession();
        console.log('🔐 [CustomAuth] Sesión inválida - usuario no existe o inactivo');
      }
    }

    this.initialized = true;
  }

  /**
   * Sign in with email and password
   * Ahora con rate limiting y audit logging
   */
  async signIn(email: string, password: string): Promise<AuthResult> {
    // Validate inputs
    if (!email || !email.trim()) {
      return { success: false, error: 'El email es requerido' };
    }
    if (!password) {
      return { success: false, error: 'La contraseña es requerida' };
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Verificar rate limiting
    const rateLimitCheck = loginRateLimiter.isBlocked(normalizedEmail);
    if (rateLimitCheck.blocked) {
      const remainingTime = loginRateLimiter.formatRemainingTime(rateLimitCheck.remainingMs || 0);
      auditLogger.log({
        type: 'LOGIN_BLOCKED',
        email: normalizedEmail,
        details: { reason: 'rate_limit', remainingMs: rateLimitCheck.remainingMs },
      });
      return {
        success: false,
        error: `Demasiados intentos fallidos. Intenta nuevamente en ${remainingTime}.`
      };
    }

    try {
      // Buscar usuario por email (incluye password_hash)
      const dbUser = await getUserByEmailWithPassword(normalizedEmail);

      if (!dbUser) {
        loginRateLimiter.recordFailedAttempt(normalizedEmail);
        auditLogger.log({
          type: 'LOGIN_FAILED',
          email: normalizedEmail,
          details: { reason: 'user_not_found' },
        });
        return { success: false, error: 'Email o contraseña incorrectos' };
      }

      // Verificar password
      const isValid = await verifyPassword(password, dbUser.password_hash);
      if (!isValid) {
        loginRateLimiter.recordFailedAttempt(normalizedEmail);
        auditLogger.log({
          type: 'LOGIN_FAILED',
          email: normalizedEmail,
          userId: dbUser.id,
          details: { reason: 'invalid_password' },
        });
        return { success: false, error: 'Email o contraseña incorrectos' };
      }

      // Si el hash es legacy, migrar automáticamente a PBKDF2
      if (isLegacyHash(dbUser.password_hash)) {
        console.log('🔐 [CustomAuth] Migrando hash legacy a PBKDF2 para:', normalizedEmail);
        const newHash = await hashPassword(password);
        await updateUserPassword(dbUser.id, newHash);
      }

      // Resetear intentos fallidos
      loginRateLimiter.resetAttempts(normalizedEmail);

      // Actualizar último login
      await updateLastLogin(dbUser.id);

      // Crear sesión
      const user = mapDbUserToAuthUser(dbUser);
      const sessionData = createSession(user.id);
      this.session = {
        user,
        accessToken: sessionData.token,
        expiresAt: sessionData.expiresAt,
        timestamp: sessionData.createdAt,
      };

      // Guardar en localStorage
      saveSession(this.session);

      // Log de éxito
      auditLogger.log({
        type: 'LOGIN_SUCCESS',
        email: normalizedEmail,
        userId: dbUser.id,
        details: { sessionExpiresAt: sessionData.expiresAt },
      });

      console.log('🔐 [CustomAuth] User signed in:', user.email);
      return { success: true, user };
    } catch (error) {
      console.error('[CustomAuth] Sign in error:', error);
      auditLogger.log({
        type: 'LOGIN_FAILED',
        email: normalizedEmail,
        details: { reason: 'error', error: String(error) },
      });
      return { success: false, error: 'Error al iniciar sesión. Intenta nuevamente.' };
    }
  }

  /**
   * Sign up with email and password
   * Ahora usa PBKDF2 para hashing
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

    const normalizedEmail = email.trim().toLowerCase();

    try {
      // Verificar si email ya existe
      const emailExists = await isEmailTaken(normalizedEmail);
      if (emailExists) {
        return { success: false, error: 'Este email ya está registrado. Intenta iniciar sesión.' };
      }

      // Hash del password con PBKDF2
      const passwordHash = await hashPassword(password);

      // Crear usuario
      const user = await createUser({
        email: normalizedEmail,
        passwordHash,
        name: metadata?.name?.trim(),
        role: 'user',
      });

      if (!user) {
        return { success: false, error: 'Error al crear la cuenta' };
      }

      // Crear sesión automáticamente (auto-login)
      const sessionData = createSession(user.id);
      this.session = {
        user: mapToAuthUser(user),
        accessToken: sessionData.token,
        expiresAt: sessionData.expiresAt,
        timestamp: sessionData.createdAt,
      };

      saveSession(this.session);

      // Log de registro
      auditLogger.log({
        type: 'LOGIN_SUCCESS',
        email: normalizedEmail,
        userId: user.id,
        details: { isNewUser: true },
      });

      console.log('👤 [CustomAuth] User registered:', user.email);
      return { success: true, user: mapToAuthUser(user) };
    } catch (error) {
      console.error('[CustomAuth] Sign up error:', error);
      return { success: false, error: 'Error al crear la cuenta. Intenta nuevamente.' };
    }
  }

  /**
   * Sign out
   */
  async signOut(): Promise<void> {
    if (this.session) {
      auditLogger.log({
        type: 'LOGOUT',
        email: this.session.user.email,
        userId: this.session.user.id,
      });
    }
    clearSession();
    this.session = null;
    console.log('🔐 [CustomAuth] User signed out');
  }

  /**
   * Reset password (envía email con enlace)
   * NOTA: Esta versión no implementa emails reales, solo simula
   */
  async resetPassword(email: string): Promise<AuthResult> {
    if (!email || !email.trim()) {
      return { success: false, error: 'El email es requerido' };
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Verificar que el usuario existe
    const dbUser = await getUserByEmailWithPassword(normalizedEmail);
    if (!dbUser) {
      return { success: false, error: 'No existe una cuenta con este email' };
    }

    // Log de solicitud
    auditLogger.log({
      type: 'PASSWORD_RESET_REQUESTED',
      email: normalizedEmail,
      userId: dbUser.id,
    });

    // En una implementación real, aquí enviaríamos un email
    // Por ahora, solo logueamos
    console.log('📧 [CustomAuth] Password reset requested for:', normalizedEmail);
    console.log('📧 [CustomAuth] NOTA: En desarrollo local, contacta al admin para resetear password');

    return { success: true };
  }

  /**
   * Update password (requiere sesión activa)
   * Ahora usa PBKDF2 para el nuevo hash
   */
  async updatePassword(newPassword: string, currentPassword?: string): Promise<AuthResult> {
    if (!newPassword || newPassword.length < 8) {
      return { success: false, error: 'La contraseña debe tener al menos 8 caracteres' };
    }

    if (!this.session) {
      return { success: false, error: 'No hay sesión activa' };
    }

    try {
      // Si se proporciona currentPassword, verificar
      if (currentPassword) {
        const dbUser = await getUserByEmailWithPassword(this.session.user.email);
        if (!dbUser) {
          return { success: false, error: 'Usuario no encontrado' };
        }

        const isValid = await verifyPassword(currentPassword, dbUser.password_hash);
        if (!isValid) {
          return { success: false, error: 'Contraseña actual incorrecta' };
        }
      }

      // Hash del nuevo password con PBKDF2
      const passwordHash = await hashPassword(newPassword);

      // Actualizar en DB
      const success = await updateUserPassword(this.session.user.id, passwordHash);
      if (!success) {
        return { success: false, error: 'Error al actualizar la contraseña' };
      }

      // Log de cambio
      auditLogger.log({
        type: 'PASSWORD_CHANGED',
        email: this.session.user.email,
        userId: this.session.user.id,
      });

      console.log('🔐 [CustomAuth] Password updated for user:', this.session.user.email);
      return { success: true };
    } catch (error) {
      console.error('[CustomAuth] Update password error:', error);
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
    return !!this.session && Date.now() < this.session.expiresAt;
  }

  /**
   * Check if session is valid (not expired)
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
   * Cleanup
   */
  cleanup(): void {
    // No hay listeners que limpiar en esta implementación
  }
}

// Export singleton instance
export const customAuthService = new CustomAuthService();

// Export for use in other modules
export default customAuthService;

// Convenience exports for common operations
export const logout = () => customAuthService.signOut();
export const getCurrentUser = () => customAuthService.getCurrentUser();
export const isAuthenticated = () => customAuthService.isAuthenticated();
