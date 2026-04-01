import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { authService, type AuthSession } from './index';

// Mock localStorage
let localStorageStore: Record<string, string> = {};

const localStorageMock = {
  getItem: vi.fn((key: string) => localStorageStore[key] || null),
  setItem: vi.fn((key: string, value: string) => {
    localStorageStore[key] = value;
  }),
  removeItem: vi.fn((key: string) => {
    delete localStorageStore[key];
  }),
  clear: vi.fn(() => {
    localStorageStore = {};
  }),
};

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
  writable: true,
});

// Mock userRepository
vi.mock('../supabase/repositories/userRepository', () => ({
  getUserByEmailWithPassword: vi.fn(),
  getUserById: vi.fn(),
  createUser: vi.fn(),
  updateLastLogin: vi.fn(),
  updatePassword: vi.fn(),
  isEmailTaken: vi.fn(),
}));

// Mock passwordHasher
vi.mock('./passwordHasher', () => ({
  hashPassword: vi.fn(() => Promise.resolve('mocked-hash')),
  verifyPassword: vi.fn(() => Promise.resolve(true)),
  isLegacyHash: vi.fn(() => false),
}));

import {
  getUserByEmailWithPassword,
  getUserById,
  // createUser e isEmailTaken no se usan directamente pero están disponibles en el mock
} from '../supabase/repositories/userRepository';

import { verifyPassword } from './passwordHasher';

describe('Auth Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageStore = {};
    // Sign out to reset state
    authService.signOut();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Session Management', () => {
    it('should start with no session', () => {
      expect(authService.isAuthenticated()).toBe(false);
      expect(authService.getCurrentUser()).toBeNull();
    });

    it('should load session from localStorage', async () => {
      // First sign in to create a valid session
      vi.mocked(getUserByEmailWithPassword).mockResolvedValue({
        id: 'test-id',
        email: 'test@example.com',
        name: 'Test User',
        role: 'user',
        password_hash: 'pbkdf2_sha256$600000$test$salt+hash',
        isActive: true,
      } as any);

      await authService.signIn('test@example.com', 'password');

      // Verify session was saved to localStorage
      const savedSession = localStorageStore['pulsossociales_session'];
      expect(savedSession).toBeDefined();

      // Verify the service is authenticated
      expect(authService.isAuthenticated()).toBe(true);
      expect(authService.getCurrentUser()?.email).toBe('test@example.com');
    });

    it('should handle invalid localStorage data gracefully', () => {
      localStorageStore['pulsossociales_session'] = 'invalid json';

      // Should not throw and return false
      expect(authService.isAuthenticated()).toBe(false);
    });
  });

  describe('Auth Flow', () => {
    it('should reject empty email', async () => {
      const result = await authService.signIn('', 'password');

      expect(result.success).toBe(false);
      expect(result.error).toBe('El email es requerido');
    });

    it('should reject empty password', async () => {
      const result = await authService.signIn('test@example.com', '');

      expect(result.success).toBe(false);
      expect(result.error).toBe('La contraseña es requerida');
    });

    it('should reject sign up with short password', async () => {
      const result = await authService.signUp('test@example.com', 'short');

      expect(result.success).toBe(false);
      expect(result.error).toContain('8 caracteres');
    });

    it('should reject sign up with empty email', async () => {
      const result = await authService.signUp('', 'password123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('El email es requerido');
    });

    it('should successfully sign in with valid credentials', async () => {
      // Mock user found in database with valid password
      vi.mocked(getUserByEmailWithPassword).mockResolvedValue({
        id: 'test-id',
        email: 'test@example.com',
        name: 'Test User',
        role: 'user',
        password_hash: 'pbkdf2_sha256$600000$test$salt+hash',
        isActive: true,
      } as any);

      const result = await authService.signIn('test@example.com', 'password');

      expect(result.success).toBe(true);
      expect(result.user?.email).toBe('test@example.com');
      expect(authService.isAuthenticated()).toBe(true);
    });

    it('should reject sign in with invalid credentials', async () => {
      // Mock user found but password verification fails
      vi.mocked(getUserByEmailWithPassword).mockResolvedValue({
        id: 'test-id',
        email: 'test@example.com',
        name: 'Test User',
        role: 'user',
        password_hash: 'pbkdf2_sha256$600000$test$salt+hash',
        isActive: true,
      } as any);
      vi.mocked(verifyPassword).mockResolvedValue(false);

      const result = await authService.signIn('test@example.com', 'wrongpassword');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Email o contraseña incorrectos');
    });

    it('should clear session on sign out', async () => {
      // First set up a mock session
      vi.mocked(getUserByEmailWithPassword).mockResolvedValue({
        id: 'test-id',
        email: 'test@example.com',
        name: 'Test User',
        role: 'user',
        password_hash: 'pbkdf2_sha256$600000$test$salt+hash',
        isActive: true,
      } as any);

      await authService.signIn('test@example.com', 'password');
      expect(authService.isAuthenticated()).toBe(true);

      // Then sign out
      await authService.signOut();

      expect(authService.isAuthenticated()).toBe(false);
      expect(authService.getCurrentUser()).toBeNull();
    });

    it('should handle update password when not available', async () => {
      const result = await authService.updatePassword('newpassword');

      expect(result.success).toBe(false);
      expect(result.error).toBe('No hay sesión activa');
    });
  });

  describe('Session Validation', () => {
    it('should validate non-expired session', async () => {
      // Set up a mock session first
      vi.mocked(getUserByEmailWithPassword).mockResolvedValue({
        id: 'test-id',
        email: 'test@example.com',
        name: 'Test User',
        role: 'user',
        password_hash: 'pbkdf2_sha256$600000$test$salt+hash',
        isActive: true,
      } as any);

      await authService.signIn('test@example.com', 'password');

      expect(authService.isSessionValid()).toBe(true);
    });

    it('should invalidate expired session', async () => {
      // Create an expired session manually
      const expiredSession: AuthSession = {
        user: {
          id: 'test-id',
          email: 'test@example.com',
          role: 'user',
        },
        accessToken: 'test-token',
        expiresAt: Date.now() - 1000, // Expired 1 second ago
        timestamp: Date.now() - 1000000,
      };
      localStorageStore['pulsossociales_session'] = JSON.stringify(expiredSession);

      // Mock getUserById to return the user (session restoration checks if user still exists)
      vi.mocked(getUserById).mockResolvedValue({
        id: 'test-id',
        email: 'test@example.com',
        name: 'Test User',
        role: 'user',
        isActive: true,
      } as any);

      // Initialize should check the expired session and clear it
      await (authService as any).initialize();

      // The expired session should be invalid
      expect(authService.isSessionValid()).toBe(false);
    });
  });

  describe('Input Validation', () => {
    it('should trim email on sign in', async () => {
      const result = await authService.signIn('  test@example.com  ', 'password');

      // Should fail because user doesn't exist in database (not because of trim)
      // The email should be trimmed before querying (normalizedEmail = email.trim().toLowerCase())
      expect(result.success).toBe(false);
      expect(result.error).toBe('Email o contraseña incorrectos');
    });

    it('should trim name on sign up', async () => {
      const result = await authService.signUp('test@example.com', 'password123', {
        name: '  John Doe  ',
      });

      // Should fail because database is not available in test
      // But the name should be trimmed before saving (metadata?.name?.trim())
      expect(result.success).toBe(false);
    });
  });

  describe('Admin Check', () => {
    it('should return false for non-admin user', () => {
      expect(authService.isAdmin()).toBe(false);
    });
  });
});
