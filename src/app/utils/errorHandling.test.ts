import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  createError,
  classifyError,
  safeExecute,
  withRetry,
  withTimeout,
  debounce,
  throttle,
  isValidEmail,
  isValidId,
  isNonEmptyArray,
  isNonEmptyString,
  guardNonNull,
  guardNonEmptyArray,
  getErrorMessageForUser,
  createLoadingState,
  setLoading,
  setError,
  setSuccess,
  DEFAULT_RETRY_CONFIG,
} from './errorHandling';

describe('Error Handling Utilities', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  describe('createError', () => {
    it('should create an error with all properties', () => {
      const error = createError('NETWORK_ERROR', 'Connection failed', 'Details', true);

      expect(error.code).toBe('NETWORK_ERROR');
      expect(error.message).toBe('Connection failed');
      expect(error.details).toBe('Details');
      expect(error.retryable).toBe(true);
      expect(error.timestamp).toBeGreaterThan(0);
    });

    it('should create an error with default retryable value', () => {
      const error = createError('UNKNOWN_ERROR', 'Something went wrong');

      expect(error.retryable).toBe(false);
      expect(error.details).toBeUndefined();
    });
  });

  describe('classifyError', () => {
    it('should classify network errors', () => {
      const error = new Error('Network connection failed');
      const classified = classifyError(error);

      expect(classified.code).toBe('NETWORK_ERROR');
      expect(classified.retryable).toBe(true);
    });

    it('should classify auth errors', () => {
      const error = new Error('JWT token expired');
      const classified = classifyError(error);

      expect(classified.code).toBe('AUTH_REQUIRED');
      expect(classified.retryable).toBe(false);
    });

    it('should classify not found errors', () => {
      const error = new Error('Resource not found');
      const classified = classifyError(error);

      expect(classified.code).toBe('NOT_FOUND');
    });

    it('should classify database errors', () => {
      const error = new Error('Database query failed');
      const classified = classifyError(error);

      expect(classified.code).toBe('DB_CONNECTION_ERROR');
      expect(classified.retryable).toBe(true);
    });

    it('should classify Supabase errors', () => {
      const error = new Error('postgresql error');
      const classified = classifyError(error);

      expect(classified.code).toBe('DB_CONNECTION_ERROR');
      expect(classified.retryable).toBe(true);
    });

    it('should classify unknown errors', () => {
      const error = new Error('Something unexpected');
      const classified = classifyError(error);

      expect(classified.code).toBe('UNKNOWN_ERROR');
    });

    it('should handle non-Error values', () => {
      const classified = classifyError('string error');

      expect(classified.code).toBe('UNKNOWN_ERROR');
      expect(classified.message).toBe('Error inesperado');
    });
  });

  describe('safeExecute', () => {
    it('should return success when function succeeds', async () => {
      const result = await safeExecute(async () => 'success');

      expect(result.success).toBe(true);
      expect(result.data).toBe('success');
      expect(result.error).toBeUndefined();
    });

    it('should return error when function fails', async () => {
      const result = await safeExecute(async () => {
        throw new Error('Failed');
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error?.code).toBe('UNKNOWN_ERROR');
    });

    it('should return fallback value on error', async () => {
      const result = await safeExecute(
        async () => {
          throw new Error('Failed');
        },
        'fallback'
      );

      expect(result.success).toBe(false);
      expect(result.data).toBe('fallback');
    });

    it('should call error handler on error', async () => {
      const errorHandler = vi.fn();
      await safeExecute(
        async () => {
          throw new Error('Failed');
        },
        undefined,
        errorHandler
      );

      expect(errorHandler).toHaveBeenCalled();
    });
  });

  describe('withRetry', () => {
    it('should succeed on first attempt', async () => {
      const fn = vi.fn().mockResolvedValue('success');
      const result = await withRetry(fn);

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should retry on failure and succeed', async () => {
      vi.useRealTimers();
      const fn = vi
        .fn()
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce('success');

      const result = await withRetry(fn, { maxAttempts: 2, delayMs: 10 });

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(2);
      vi.useFakeTimers();
    }, 10000);

    it('should throw after max attempts', async () => {
      vi.useRealTimers();
      const fn = vi.fn().mockRejectedValue(new Error('Network error'));

      await expect(
        withRetry(fn, { maxAttempts: 2, delayMs: 10 })
      ).rejects.toThrow('Network error');

      expect(fn).toHaveBeenCalledTimes(2);
      vi.useFakeTimers();
    }, 10000);

    it('should not retry non-retryable errors', async () => {
      const fn = vi.fn().mockRejectedValue(new Error('Auth failed'));

      await expect(withRetry(fn, { maxAttempts: 3 })).rejects.toThrow('Auth failed');
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should use exponential backoff', async () => {
      vi.useRealTimers();
      const fn = vi
        .fn()
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce('success');

      const startTime = Date.now();
      const result = await withRetry(fn, {
        maxAttempts: 3,
        delayMs: 50,
        backoffMultiplier: 2,
      });
      const elapsed = Date.now() - startTime;

      expect(result).toBe('success');
      // Should have waited at least 50 + 100 = 150ms
      expect(elapsed).toBeGreaterThanOrEqual(100);
      vi.useFakeTimers();
    }, 10000);
  });

  describe('withTimeout', () => {
    it('should return result if function completes in time', async () => {
      const result = await withTimeout(async () => 'success', 1000);
      expect(result).toBe('success');
    });

    it('should throw timeout error if function takes too long', async () => {
      vi.useRealTimers();
      // Use a function that never resolves
      const neverEndingFn = async () => {
        return new Promise<string>(() => {}); // Never resolves
      };

      await expect(withTimeout(neverEndingFn, 50)).rejects.toThrow('Operation timed out');
      vi.useFakeTimers();
    }, 5000);

    it('should use custom error message', async () => {
      vi.useRealTimers();
      const neverEndingFn = async () => {
        return new Promise<string>(() => {}); // Never resolves
      };

      await expect(withTimeout(neverEndingFn, 50, 'Custom timeout')).rejects.toThrow(
        'Custom timeout'
      );
      vi.useFakeTimers();
    }, 5000);
  });

  describe('debounce', () => {
    it('should delay function execution', () => {
      const fn = vi.fn();
      const debounced = debounce(fn, 100);

      debounced();
      expect(fn).not.toHaveBeenCalled();

      vi.advanceTimersByTime(100);
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should reset timer on multiple calls', () => {
      const fn = vi.fn();
      const debounced = debounce(fn, 100);

      debounced();
      vi.advanceTimersByTime(50);
      debounced();
      vi.advanceTimersByTime(50);
      expect(fn).not.toHaveBeenCalled();

      vi.advanceTimersByTime(100);
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should pass arguments to function', () => {
      const fn = vi.fn();
      const debounced = debounce(fn, 100);

      debounced('arg1', 'arg2');
      vi.advanceTimersByTime(100);

      expect(fn).toHaveBeenCalledWith('arg1', 'arg2');
    });
  });

  describe('throttle', () => {
    it('should execute function immediately', () => {
      const fn = vi.fn();
      const throttled = throttle(fn, 100);

      throttled();
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should ignore calls during throttle period', () => {
      const fn = vi.fn();
      const throttled = throttle(fn, 100);

      throttled();
      throttled();
      throttled();
      expect(fn).toHaveBeenCalledTimes(1);

      vi.advanceTimersByTime(100);
      throttled();
      expect(fn).toHaveBeenCalledTimes(2);
    });
  });

  describe('validation helpers', () => {
    describe('isValidEmail', () => {
      it('should validate correct emails', () => {
        expect(isValidEmail('test@example.com')).toBe(true);
        expect(isValidEmail('user.name@domain.co')).toBe(true);
      });

      it('should reject invalid emails', () => {
        expect(isValidEmail('invalid')).toBe(false);
        expect(isValidEmail('@example.com')).toBe(false);
        expect(isValidEmail('test@')).toBe(false);
        expect(isValidEmail('')).toBe(false);
      });
    });

    describe('isValidId', () => {
      it('should validate non-empty strings', () => {
        expect(isValidId('123')).toBe(true);
        expect(isValidId('abc')).toBe(true);
      });

      it('should reject invalid ids', () => {
        expect(isValidId('')).toBe(false);
        expect(isValidId(123 as unknown as string)).toBe(false);
      });
    });

    describe('isNonEmptyArray', () => {
      it('should validate non-empty arrays', () => {
        expect(isNonEmptyArray([1, 2, 3])).toBe(true);
        expect(isNonEmptyArray(['a'])).toBe(true);
      });

      it('should reject empty or invalid arrays', () => {
        expect(isNonEmptyArray([])).toBe(false);
        expect(isNonEmptyArray(null)).toBe(false);
        expect(isNonEmptyArray(undefined)).toBe(false);
      });
    });

    describe('isNonEmptyString', () => {
      it('should validate non-empty strings', () => {
        expect(isNonEmptyString('hello')).toBe(true);
        expect(isNonEmptyString('  trimmed  ')).toBe(true);
      });

      it('should reject empty or invalid strings', () => {
        expect(isNonEmptyString('')).toBe(false);
        expect(isNonEmptyString('   ')).toBe(false);
        expect(isNonEmptyString(null)).toBe(false);
        expect(isNonEmptyString(undefined)).toBe(false);
      });
    });
  });

  describe('guards', () => {
    describe('guardNonNull', () => {
      it('should return value if not null', () => {
        expect(guardNonNull('value')).toBe('value');
        expect(guardNonNull(0)).toBe(0);
        expect(guardNonNull(false)).toBe(false);
      });

      it('should throw if null or undefined', () => {
        expect(() => guardNonNull(null)).toThrow('Value is null or undefined');
        expect(() => guardNonNull(undefined)).toThrow('Value is null or undefined');
      });

      it('should use custom error message', () => {
        expect(() => guardNonNull(null, 'Custom error')).toThrow('Custom error');
      });
    });

    describe('guardNonEmptyArray', () => {
      it('should return array if not empty', () => {
        expect(guardNonEmptyArray([1, 2, 3])).toEqual([1, 2, 3]);
      });

      it('should throw if empty or invalid', () => {
        expect(() => guardNonEmptyArray([])).toThrow('Array is empty');
        expect(() => guardNonEmptyArray(null)).toThrow('Array is empty');
      });
    });
  });

  describe('getErrorMessageForUser', () => {
    it('should return user-friendly messages', () => {
      const networkError = createError('NETWORK_ERROR', 'Network failed');
      expect(getErrorMessageForUser(networkError)).toContain('conexión');

      const authError = createError('AUTH_REQUIRED', 'Auth failed');
      expect(getErrorMessageForUser(authError)).toContain('sesión');
    });

    it('should fallback to error message for unknown codes', () => {
      // Use a code that doesn't exist in the messages map
      const error = { ...createError('UNKNOWN_ERROR', 'Custom message'), code: 'NON_EXISTENT_CODE' as any };
      expect(getErrorMessageForUser(error)).toBe('Custom message');
    });
  });

  describe('loading state helpers', () => {
    it('should create initial state', () => {
      const state = createLoadingState();
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
      expect(state.retryCount).toBe(0);
    });

    it('should set loading state', () => {
      const state = setLoading(createLoadingState());
      expect(state.isLoading).toBe(true);
      expect(state.error).toBeNull();
    });

    it('should set error state', () => {
      const error = createError('NETWORK_ERROR', 'Failed');
      const state = setError(createLoadingState(), error);
      expect(state.isLoading).toBe(false);
      expect(state.error).toEqual(error);
      expect(state.retryCount).toBe(1);
    });

    it('should set success state', () => {
      const errorState = setError(createLoadingState(), createError('UNKNOWN_ERROR', 'Test'));
      const state = setSuccess(errorState);
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
      expect(state.retryCount).toBe(0);
    });
  });

  describe('DEFAULT_RETRY_CONFIG', () => {
    it('should have sensible defaults', () => {
      expect(DEFAULT_RETRY_CONFIG.maxAttempts).toBe(3);
      expect(DEFAULT_RETRY_CONFIG.delayMs).toBe(1000);
      expect(DEFAULT_RETRY_CONFIG.backoffMultiplier).toBe(2);
      expect(DEFAULT_RETRY_CONFIG.maxDelayMs).toBe(10000);
    });
  });
});
