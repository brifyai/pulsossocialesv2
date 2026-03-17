/**
 * Error Handling Utilities - Sprint 15
 * Utilidades robustas para manejo de errores y edge cases
 */

// ===========================================
// Types
// ===========================================

export interface ErrorResult<T> {
  success: boolean;
  data?: T;
  error?: AppError;
}

export interface AppError {
  code: ErrorCode;
  message: string;
  details?: string;
  retryable: boolean;
  timestamp: number;
}

export type ErrorCode =
  | 'NETWORK_ERROR'
  | 'DB_CONNECTION_ERROR'
  | 'DB_EMPTY'
  | 'AUTH_REQUIRED'
  | 'AUTH_EXPIRED'
  | 'NOT_FOUND'
  | 'VALIDATION_ERROR'
  | 'TIMEOUT'
  | 'UNKNOWN_ERROR'
  | 'FALLBACK_MODE';

export interface RetryConfig {
  maxAttempts: number;
  delayMs: number;
  backoffMultiplier: number;
  maxDelayMs: number;
}

// ===========================================
// Default Configurations
// ===========================================

export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  delayMs: 1000,
  backoffMultiplier: 2,
  maxDelayMs: 10000,
};

// ===========================================
// Error Factory
// ===========================================

export function createError(
  code: ErrorCode,
  message: string,
  details?: string,
  retryable = false
): AppError {
  return {
    code,
    message,
    details,
    retryable,
    timestamp: Date.now(),
  };
}

// ===========================================
// Error Classifiers
// ===========================================

export function classifyError(error: unknown): AppError {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();

    // Network errors
    if (
      message.includes('network') ||
      message.includes('fetch') ||
      message.includes('connection') ||
      message.includes('timeout') ||
      message.includes('abort')
    ) {
      return createError(
        'NETWORK_ERROR',
        'Error de conexión',
        error.message,
        true
      );
    }

    // Auth errors
    if (
      message.includes('auth') ||
      message.includes('unauthorized') ||
      message.includes('jwt') ||
      message.includes('token') ||
      message.includes('session')
    ) {
      return createError(
        'AUTH_REQUIRED',
        'Sesión requerida',
        error.message,
        false
      );
    }

    // Not found
    if (
      message.includes('not found') ||
      message.includes('does not exist') ||
      message.includes('404')
    ) {
      return createError(
        'NOT_FOUND',
        'Recurso no encontrado',
        error.message,
        false
      );
    }

    // Database errors
    if (
      message.includes('database') ||
      message.includes('db') ||
      message.includes('supabase') ||
      message.includes('postgresql')
    ) {
      return createError(
        'DB_CONNECTION_ERROR',
        'Error de base de datos',
        error.message,
        true
      );
    }
  }

  return createError(
    'UNKNOWN_ERROR',
    'Error inesperado',
    error instanceof Error ? error.message : String(error),
    false
  );
}

// ===========================================
// Safe Execution Wrapper
// ===========================================

export async function safeExecute<T>(
  fn: () => Promise<T>,
  fallbackValue?: T,
  errorHandler?: (error: AppError) => void
): Promise<ErrorResult<T>> {
  try {
    const data = await fn();
    return { success: true, data };
  } catch (error) {
    const appError = classifyError(error);

    if (errorHandler) {
      errorHandler(appError);
    }

    if (fallbackValue !== undefined) {
      return {
        success: false,
        data: fallbackValue,
        error: appError,
      };
    }

    return { success: false, error: appError };
  }
}

// ===========================================
// Retry Logic
// ===========================================

export async function withRetry<T>(
  fn: () => Promise<T>,
  config: Partial<RetryConfig> = {}
): Promise<T> {
  const finalConfig = { ...DEFAULT_RETRY_CONFIG, ...config };
  let lastError: Error | null = null;
  let delay = finalConfig.delayMs;

  for (let attempt = 1; attempt <= finalConfig.maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt === finalConfig.maxAttempts) {
        break;
      }

      // Check if error is retryable
      const appError = classifyError(error);
      if (!appError.retryable) {
        throw error;
      }

      // Wait before retry
      await sleep(delay);

      // Exponential backoff
      delay = Math.min(
        delay * finalConfig.backoffMultiplier,
        finalConfig.maxDelayMs
      );
    }
  }

  throw lastError;
}

// ===========================================
// Timeout Wrapper
// ===========================================

export async function withTimeout<T>(
  fn: () => Promise<T>,
  timeoutMs: number,
  errorMessage = 'Operation timed out'
): Promise<T> {
  return Promise.race([
    fn(),
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(errorMessage)), timeoutMs)
    ),
  ]);
}

// ===========================================
// Debounce/Throttle
// ===========================================

export function debounce<T extends (...args: unknown[]) => unknown>(
  fn: T,
  delayMs: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  return (...args: Parameters<T>) => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    timeoutId = setTimeout(() => {
      fn(...args);
    }, delayMs);
  };
}

export function throttle<T extends (...args: unknown[]) => unknown>(
  fn: T,
  limitMs: number
): (...args: Parameters<T>) => void {
  let inThrottle = false;

  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      fn(...args);
      inThrottle = true;
      setTimeout(() => {
        inThrottle = false;
      }, limitMs);
    }
  };
}

// ===========================================
// Validation Helpers
// ===========================================

export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function isValidId(id: string): boolean {
  return typeof id === 'string' && id.length > 0;
}

export function isNonEmptyArray<T>(arr: T[] | null | undefined): boolean {
  return Array.isArray(arr) && arr.length > 0;
}

export function isNonEmptyString(str: string | null | undefined): boolean {
  return typeof str === 'string' && str.trim().length > 0;
}

// ===========================================
// Data Guards
// ===========================================

export function guardNonNull<T>(
  value: T | null | undefined,
  errorMessage = 'Value is null or undefined'
): T {
  if (value === null || value === undefined) {
    throw new Error(errorMessage);
  }
  return value;
}

export function guardNonEmptyArray<T>(
  arr: T[] | null | undefined,
  errorMessage = 'Array is empty'
): T[] {
  if (!isNonEmptyArray(arr)) {
    throw new Error(errorMessage);
  }
  return arr as T[];
}

// ===========================================
// Utility Functions
// ===========================================

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ===========================================
// UX Message Helpers
// ===========================================

export function getErrorMessageForUser(error: AppError): string {
  const messages: Record<ErrorCode, string> = {
    NETWORK_ERROR: 'Error de conexión. Verifica tu internet e intenta nuevamente.',
    DB_CONNECTION_ERROR: 'No se pudo conectar a la base de datos. Usando datos locales.',
    DB_EMPTY: 'No hay datos disponibles en este momento.',
    AUTH_REQUIRED: 'Inicia sesión para continuar.',
    AUTH_EXPIRED: 'Tu sesión expiró. Por favor inicia sesión nuevamente.',
    NOT_FOUND: 'El recurso solicitado no existe.',
    VALIDATION_ERROR: 'Verifica los datos ingresados e intenta nuevamente.',
    TIMEOUT: 'La operación tardó demasiado. Intenta nuevamente.',
    UNKNOWN_ERROR: 'Ocurrió un error inesperado. Intenta nuevamente.',
    FALLBACK_MODE: 'Usando modo offline. Algunas funciones pueden estar limitadas.',
  };

  return messages[error.code] || error.message;
}

export function getRetryMessage(attempt: number, maxAttempts: number): string {
  if (attempt >= maxAttempts) {
    return 'No se pudo completar la operación. Intenta más tarde.';
  }
  return `Reintentando... (${attempt}/${maxAttempts})`;
}

// ===========================================
// Loading State Helpers
// ===========================================

export interface LoadingState {
  isLoading: boolean;
  error: AppError | null;
  retryCount: number;
}

export function createLoadingState(): LoadingState {
  return {
    isLoading: false,
    error: null,
    retryCount: 0,
  };
}

export function setLoading(state: LoadingState): LoadingState {
  return { ...state, isLoading: true, error: null };
}

export function setError(state: LoadingState, error: AppError): LoadingState {
  return { ...state, isLoading: false, error, retryCount: state.retryCount + 1 };
}

export function setSuccess(state: LoadingState): LoadingState {
  return { ...state, isLoading: false, error: null, retryCount: 0 };
}
