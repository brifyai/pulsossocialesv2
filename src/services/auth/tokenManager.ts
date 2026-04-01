/**
 * Generación de tokens de sesión criptográficamente seguros.
 * Usa crypto.getRandomValues() en lugar de Math.random().
 */

const TOKEN_LENGTH = 32; // 32 bytes = 256 bits de entropía
const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 días

export interface SessionToken {
  token: string;
  userId: string;
  createdAt: number;
  expiresAt: number;
}

/**
 * Genera un token criptográficamente seguro
 */
export function generateSecureToken(): string {
  const array = new Uint8Array(TOKEN_LENGTH);
  crypto.getRandomValues(array);
  return Array.from(array, b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Crea una sesión completa con token seguro
 */
export function createSession(userId: string): SessionToken {
  const now = Date.now();
  return {
    token: generateSecureToken(),
    userId,
    createdAt: now,
    expiresAt: now + SESSION_DURATION_MS,
  };
}

/**
 * Verifica si una sesión es válida (no expirada)
 */
export function isSessionValid(session: SessionToken): boolean {
  return Date.now() < session.expiresAt;
}
