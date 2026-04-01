/**
 * Tests para el sistema de autenticación endurecido
 * Verifica PBKDF2, rate limiting, tokens seguros y audit logging
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  hashPassword,
  verifyPassword,
  isLegacyHash,
} from '../passwordHasher';
import { createSession, isSessionValid } from '../tokenManager';
import { RateLimiter } from '../rateLimiter';
import { auditLogger } from '../auditLog';

describe('Password Hasher (PBKDF2)', () => {
  it('debe generar hashes PBKDF2 correctamente', async () => {
    const password = 'testPassword123!';
    const hash = await hashPassword(password);

    // Verificar que el hash tiene el formato correcto: iterations:salt:hash
    expect(hash.split(':')).toHaveLength(3);
    // El primer elemento debe ser el número de iteraciones (número)
    expect(parseInt(hash.split(':')[0], 10)).toBeGreaterThan(0);
  });

  it('debe verificar passwords correctamente', async () => {
    const password = 'testPassword123!';
    const hash = await hashPassword(password);

    const isValid = await verifyPassword(password, hash);
    expect(isValid).toBe(true);
  });

  it('debe rechazar passwords incorrectos', async () => {
    const password = 'testPassword123!';
    const wrongPassword = 'wrongPassword123!';
    const hash = await hashPassword(password);

    const isValid = await verifyPassword(wrongPassword, hash);
    expect(isValid).toBe(false);
  });

  it('debe generar hashes diferentes para el mismo password (salt aleatorio)', async () => {
    const password = 'testPassword123!';
    const hash1 = await hashPassword(password);
    const hash2 = await hashPassword(password);

    expect(hash1).not.toBe(hash2);

    // Pero ambos deben verificar correctamente
    expect(await verifyPassword(password, hash1)).toBe(true);
    expect(await verifyPassword(password, hash2)).toBe(true);
  });

  it('debe detectar hashes legacy', () => {
    // Legacy hash no tiene ':' (formato antiguo SHA-256)
    const legacyHash = 'abc123def456';
    // PBKDF2 hash tiene formato: iterations:salt:hash
    const pbkdf2Hash = '100000:abc123def456:xyz789';

    expect(isLegacyHash(legacyHash)).toBe(true);
    expect(isLegacyHash(pbkdf2Hash)).toBe(false);
    expect(isLegacyHash('some_random_hash_without_colon')).toBe(true);
  });

  it('debe manejar passwords vacíos', async () => {
    const hash = await hashPassword('');
    // El hash debe tener el formato correcto
    expect(hash.split(':')).toHaveLength(3);

    const isValid = await verifyPassword('', hash);
    expect(isValid).toBe(true);
  });

  it('debe manejar passwords largos', async () => {
    const longPassword = 'a'.repeat(1000);
    const hash = await hashPassword(longPassword);

    const isValid = await verifyPassword(longPassword, hash);
    expect(isValid).toBe(true);
  });
});

describe('Token Manager', () => {
  it('debe crear sesiones con tokens únicos', () => {
    const session1 = createSession('user-1');
    const session2 = createSession('user-1');

    expect(session1.token).not.toBe(session2.token);
    expect(session1.token).toHaveLength(64); // 32 bytes en hex = 64 chars
  });

  it('debe crear sesiones con expiración correcta', () => {
    const beforeCreate = Date.now();
    const session = createSession('user-1');
    const afterCreate = Date.now();

    // 7 días en ms = 7 * 24 * 60 * 60 * 1000 = 604800000
    const expectedDuration = 7 * 24 * 60 * 60 * 1000;

    expect(session.expiresAt - session.createdAt).toBe(expectedDuration);
    expect(session.createdAt).toBeGreaterThanOrEqual(beforeCreate);
    expect(session.createdAt).toBeLessThanOrEqual(afterCreate);
  });

  it('debe validar sesiones correctamente', () => {
    const session = createSession('user-1');

    expect(isSessionValid(session)).toBe(true);
  });

  it('debe rechazar sesiones expiradas', () => {
    const session = createSession('user-1');
    session.expiresAt = Date.now() - 1000; // Expirada hace 1 segundo

    expect(isSessionValid(session)).toBe(false);
  });

  it('debe manejar diferentes userIds', () => {
    const session1 = createSession('user-1');
    const session2 = createSession('user-2');

    expect(session1.userId).toBe('user-1');
    expect(session2.userId).toBe('user-2');
  });
});

describe('Rate Limiter', () => {
  let rateLimiter: RateLimiter;

  beforeEach(() => {
    rateLimiter = new RateLimiter({
      maxAttempts: 3,
      windowMs: 60000, // 1 minuto
      blockDurationMs: 300000, // 5 minutos
    });
  });

  it('debe permitir intentos dentro del límite', () => {
    const key = 'test@example.com';

    expect(rateLimiter.isBlocked(key).blocked).toBe(false);
    rateLimiter.recordFailedAttempt(key);
    expect(rateLimiter.isBlocked(key).blocked).toBe(false);
    rateLimiter.recordFailedAttempt(key);
    expect(rateLimiter.isBlocked(key).blocked).toBe(false);
  });

  it('debe bloquear después de exceder intentos', () => {
    const key = 'test@example.com';

    rateLimiter.recordFailedAttempt(key);
    rateLimiter.recordFailedAttempt(key);
    rateLimiter.recordFailedAttempt(key);

    const result = rateLimiter.isBlocked(key);
    expect(result.blocked).toBe(true);
    expect(result.remainingMs).toBeGreaterThan(0);
  });

  it('debe resetear intentos después de éxito', () => {
    const key = 'test@example.com';

    rateLimiter.recordFailedAttempt(key);
    rateLimiter.recordFailedAttempt(key);
    rateLimiter.resetAttempts(key);

    expect(rateLimiter.isBlocked(key).blocked).toBe(false);
  });

  it('debe formatear tiempo restante correctamente', () => {
    // El formato actual devuelve "X minuto(s)"
    expect(rateLimiter.formatRemainingTime(300000)).toBe('5 minutos');
    expect(rateLimiter.formatRemainingTime(90000)).toBe('2 minutos');
    expect(rateLimiter.formatRemainingTime(45000)).toBe('1 minuto');
    expect(rateLimiter.formatRemainingTime(5000)).toBe('1 minuto');
  });

  it('debe manejar múltiples claves independientemente', () => {
    const key1 = 'user1@example.com';
    const key2 = 'user2@example.com';

    rateLimiter.recordFailedAttempt(key1);
    rateLimiter.recordFailedAttempt(key1);
    rateLimiter.recordFailedAttempt(key1);

    expect(rateLimiter.isBlocked(key1).blocked).toBe(true);
    expect(rateLimiter.isBlocked(key2).blocked).toBe(false);
  });
});

describe('Audit Logger', () => {
  beforeEach(() => {
    auditLogger.clear();
  });

  it('debe registrar eventos correctamente', () => {
    auditLogger.log({
      type: 'LOGIN_SUCCESS',
      email: 'test@example.com',
      userId: 'user-1',
      details: { ip: '127.0.0.1' },
    });

    const events = auditLogger.getRecentEvents(1);
    expect(events).toHaveLength(1);
    expect(events[0].type).toBe('LOGIN_SUCCESS');
    expect(events[0].email).toBe('test@example.com');
    expect(events[0].userId).toBe('user-1');
    expect(events[0].timestamp).toBeGreaterThan(0);
  });

  it('debe limitar el número de eventos almacenados', () => {
    // Llenar con más eventos que el máximo
    for (let i = 0; i < 1100; i++) {
      auditLogger.log({
        type: 'LOGIN_SUCCESS',
        email: `user${i}@example.com`,
      });
    }

    const events = auditLogger.getRecentEvents(2000);
    expect(events.length).toBeLessThanOrEqual(1000);
  });

  it('debe filtrar eventos por usuario', () => {
    auditLogger.log({ type: 'LOGIN_SUCCESS', email: 'user1@example.com', userId: 'user-1' });
    auditLogger.log({ type: 'LOGIN_SUCCESS', email: 'user2@example.com', userId: 'user-2' });
    auditLogger.log({ type: 'LOGOUT', email: 'user1@example.com', userId: 'user-1' });

    const user1Events = auditLogger.getEventsByUser('user-1');
    expect(user1Events).toHaveLength(2);
    expect(user1Events.every(e => e.userId === 'user-1')).toBe(true);
  });

  it('debe manejar eventos sin userId', () => {
    auditLogger.log({
      type: 'LOGIN_FAILED',
      email: 'unknown@example.com',
      details: { reason: 'user_not_found' },
    });

    const events = auditLogger.getRecentEvents(1);
    expect(events[0].type).toBe('LOGIN_FAILED');
    expect(events[0].userId).toBeUndefined();
  });
});

describe('Integración de Seguridad', () => {
  it('debe flujo completo: hash -> verificar -> crear sesión', async () => {
    const password = 'SecurePass123!';
    const userId = 'user-123';

    // Hash del password
    const hash = await hashPassword(password);
    // Verificar formato: iterations:salt:hash
    expect(hash.split(':')).toHaveLength(3);

    // Verificar
    const isValid = await verifyPassword(password, hash);
    expect(isValid).toBe(true);

    // Crear sesión
    const session = createSession(userId);
    expect(session.userId).toBe(userId);
    expect(isSessionValid(session)).toBe(true);

    // Log de éxito
    auditLogger.log({
      type: 'LOGIN_SUCCESS',
      userId,
      email: 'test@example.com',
    });

    const events = auditLogger.getRecentEvents(1);
    expect(events[0].type).toBe('LOGIN_SUCCESS');
  });

  it('debe manejar rate limiting en intentos fallidos', () => {
    const rateLimiter = new RateLimiter({
      maxAttempts: 2,
      windowMs: 60000,
      blockDurationMs: 300000,
    });

    const key = 'attacker@example.com';

    // Dos intentos fallidos
    rateLimiter.recordFailedAttempt(key);
    rateLimiter.recordFailedAttempt(key);

    // Tercer intento debe estar bloqueado
    const result = rateLimiter.isBlocked(key);
    expect(result.blocked).toBe(true);

    // Log del bloqueo
    auditLogger.log({
      type: 'LOGIN_BLOCKED',
      email: key,
      details: { reason: 'rate_limit' },
    });

    // Buscar eventos por email ya que no hay userId
    const recentEvents = auditLogger.getRecentEvents(10);
    expect(recentEvents.some(e => e.type === 'LOGIN_BLOCKED' && e.email === key)).toBe(true);
  });
});
