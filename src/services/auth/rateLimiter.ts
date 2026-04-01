/**
 * Rate limiter para protección contra fuerza bruta.
 * Almacena intentos en memoria. Se resetea al recargar la página,
 * pero protege contra ataques automatizados durante la sesión.
 *
 * Para persistencia entre recargas, los intentos fallidos también
 * se guardan en Supabase (tabla login_attempts si existe).
 */

interface LoginAttempt {
  count: number;
  firstAttempt: number;
  lastAttempt: number;
  lockedUntil: number | null;
}

interface RateLimiterOptions {
  maxAttempts?: number;
  windowMs?: number;
  blockDurationMs?: number;
}

const DEFAULT_MAX_ATTEMPTS = 5;
const DEFAULT_LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutos
const DEFAULT_ATTEMPT_WINDOW_MS = 30 * 60 * 1000;   // Ventana de 30 minutos

export class RateLimiter {
  private attempts = new Map<string, LoginAttempt>();
  private maxAttempts: number;
  private lockoutDurationMs: number;
  private attemptWindowMs: number;

  constructor(options?: RateLimiterOptions) {
    this.maxAttempts = options?.maxAttempts ?? DEFAULT_MAX_ATTEMPTS;
    this.lockoutDurationMs = options?.blockDurationMs ?? DEFAULT_LOCKOUT_DURATION_MS;
    this.attemptWindowMs = options?.windowMs ?? DEFAULT_ATTEMPT_WINDOW_MS;
  }

  /**
   * Verificar si un email/IP está bloqueado
   */
  isBlocked(identifier: string): { blocked: boolean; remainingMs?: number } {
    const attempt = this.attempts.get(identifier);
    if (!attempt) return { blocked: false };

    // Limpiar intentos antiguos fuera de la ventana
    if (Date.now() - attempt.firstAttempt > this.attemptWindowMs) {
      this.attempts.delete(identifier);
      return { blocked: false };
    }

    // Verificar lockout
    if (attempt.lockedUntil && Date.now() < attempt.lockedUntil) {
      return {
        blocked: true,
        remainingMs: attempt.lockedUntil - Date.now()
      };
    }

    // Si el lockout expiró, resetear
    if (attempt.lockedUntil && Date.now() >= attempt.lockedUntil) {
      this.attempts.delete(identifier);
      return { blocked: false };
    }

    return { blocked: false };
  }

  /**
   * Registrar un intento fallido
   */
  recordFailedAttempt(identifier: string): void {
    const existing = this.attempts.get(identifier);
    const now = Date.now();

    if (!existing) {
      this.attempts.set(identifier, {
        count: 1,
        firstAttempt: now,
        lastAttempt: now,
        lockedUntil: null,
      });
      return;
    }

    existing.count++;
    existing.lastAttempt = now;

    if (existing.count >= this.maxAttempts) {
      existing.lockedUntil = now + this.lockoutDurationMs;
    }
  }

  /**
   * Resetear intentos después de login exitoso
   */
  resetAttempts(identifier: string): void {
    this.attempts.delete(identifier);
  }

  /**
   * Obtener info de intentos para logging
   */
  getAttemptInfo(identifier: string): LoginAttempt | null {
    return this.attempts.get(identifier) || null;
  }

  /**
   * Formatear tiempo restante en formato legible
   */
  formatRemainingTime(remainingMs: number): string {
    const minutes = Math.ceil(remainingMs / 60000);
    return `${minutes} minuto${minutes > 1 ? 's' : ''}`;
  }
}

export const loginRateLimiter = new RateLimiter();
