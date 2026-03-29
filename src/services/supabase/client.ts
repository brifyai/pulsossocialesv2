/**
 * Supabase Client - Sprint 9
 * 
 * Cliente de Supabase con lazy loading y fallback automático.
 * Si Supabase no está configurado, la app funciona con datos locales.
 */

import type { SupabaseClient as RealSupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../../types/database.ts';

// ===========================================
// Types
// ===========================================

export type SupabaseClient = RealSupabaseClient<Database>;

export interface SupabaseStatus {
  isAvailable: boolean;
  isConnected: boolean;
  error?: string;
}

// ===========================================
// Configuration
// ===========================================

// Soporte tanto para Vite (import.meta.env) como Node.js (process.env)
const getEnvVar = (name: string): string => {
  // Intentar import.meta.env primero (Vite)
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    return import.meta.env[name] || '';
  }
  // Fallback a process.env (Node.js)
  if (typeof process !== 'undefined' && process.env) {
    return process.env[name] || '';
  }
  return '';
};

const SUPABASE_URL = getEnvVar('VITE_SUPABASE_URL');
// Usar SERVICE_KEY con prioridad (para scripts internos), fallback a ANON_KEY (para frontend)
const SUPABASE_KEY = getEnvVar('VITE_SUPABASE_SERVICE_KEY') || getEnvVar('VITE_SUPABASE_ANON_KEY');

// Debug: Verificar variables de entorno en build-time
console.log('[ENV CHECK]', {
  supabaseUrl: SUPABASE_URL ? '***configured***' : '***missing***',
  hasKey: !!SUPABASE_KEY,
  keyType: getEnvVar('VITE_SUPABASE_SERVICE_KEY') ? 'service' : 'anon',
});

// ===========================================
// State
// ===========================================

let supabaseInstance: SupabaseClient | null = null;
let initializationPromise: Promise<SupabaseStatus> | null = null;
let lastKnownStatus: SupabaseStatus | null = null;

// ===========================================
// Debug / Status Helpers
// ===========================================

/**
 * Log con prefijo identificable para modo DB vs Fallback
 */
function logDb(message: string, data?: unknown): void {
  console.log(`[🔵 DB] ${message}`, data ?? '');
}

function logFallback(message: string, data?: unknown): void {
  console.log(`[🟡 FALLBACK] ${message}`, data ?? '');
}

function logError(message: string, error?: unknown): void {
  console.error(`[🔴 ERROR] ${message}`, error ?? '');
}

/**
 * Obtener el estado actual de conexión para mostrar en UI
 */
export function getConnectionStatus(): { 
  mode: 'db' | 'fallback' | 'unknown'; 
  details: string;
  isConfigured: boolean;
} {
  if (!isSupabaseConfigured()) {
    return { 
      mode: 'fallback', 
      details: 'Supabase no configurado - usando datos locales',
      isConfigured: false 
    };
  }
  
  if (!lastKnownStatus) {
    return { 
      mode: 'unknown', 
      details: 'Verificando conexión...',
      isConfigured: true 
    };
  }
  
  if (lastKnownStatus.isConnected) {
    return { 
      mode: 'db', 
      details: 'Conectado a Supabase',
      isConfigured: true 
    };
  }
  
  return { 
    mode: 'fallback', 
    details: `Error de conexión: ${lastKnownStatus.error || 'Desconocido'} - usando datos locales`,
    isConfigured: true 
  };
}

// ===========================================
// Lazy Loading
// ===========================================

/**
 * Dynamically import supabase-js only when needed
 */
async function loadSupabaseModule(): Promise<typeof import('@supabase/supabase-js') | null> {
  try {
    // Dynamic import - only loads if Supabase is configured
    if (!SUPABASE_URL || !SUPABASE_KEY) {
      return null;
    }
    // Import dinámico
    const module = await import('@supabase/supabase-js');
    return module;
  } catch (error) {
    console.warn('[Supabase] Module not available:', error);
    return null;
  }
}

// ===========================================
// Client Initialization
// ===========================================

/**
 * Initialize Supabase client (lazy loading)
 * 
 * Returns status without throwing - app continues to work
 * even if Supabase is not configured or fails to connect.
 */
export async function initSupabase(): Promise<SupabaseStatus> {
  // Return cached promise if already initializing
  if (initializationPromise) {
    return initializationPromise;
  }

  initializationPromise = (async (): Promise<SupabaseStatus> => {
    // Check if configured
    if (!SUPABASE_URL || !SUPABASE_KEY) {
      logFallback('Supabase no configurado - faltan VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY/SERVICE_KEY');
      const status: SupabaseStatus = {
        isAvailable: false,
        isConnected: false,
        error: 'Supabase not configured (VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY or VITE_SUPABASE_SERVICE_KEY required)',
      };
      lastKnownStatus = status;
      return status;
    }

    logDb(`Intentando conectar a: ${SUPABASE_URL}`);

    try {
      // Dynamically load supabase module
      const supabaseModule = await loadSupabaseModule();
      
      if (!supabaseModule) {
        logError('No se pudo cargar el módulo de Supabase');
        const status: SupabaseStatus = {
          isAvailable: false,
          isConnected: false,
          error: 'Supabase module not available',
        };
        lastKnownStatus = status;
        return status;
      }

      // Create client
      const { createClient } = supabaseModule;
      const client = createClient<Database>(SUPABASE_URL, SUPABASE_KEY, {
        auth: {
          autoRefreshToken: true,
          persistSession: true,
        },
      });

    // Test connection with detailed error diagnosis
    logDb('Probando conexión a tabla territories...');
    const { error, count } = await client.from('territories').select('id', { count: 'exact', head: true });

    if (error) {
      // Diagnose the specific error
      let errorType = 'unknown';
      let errorDetails = error.message;
      
      if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
        errorType = 'network';
        errorDetails = 'Error de red - verifica la URL de Supabase y tu conexión';
      } else if (error.message.includes('JWT') || error.message.includes('token') || error.message.includes('Unauthorized')) {
        errorType = 'auth';
        errorDetails = 'Error de autenticación - el anon key puede ser inválido';
      } else if (error.message.includes('permission') || error.message.includes('Policy') || error.code === '42501') {
        errorType = 'rls';
        errorDetails = 'Error de permisos (RLS) - se necesitan políticas de acceso para anon';
      } else if (error.message.includes('does not exist') || error.code === '42P01') {
        errorType = 'schema';
        errorDetails = 'La tabla no existe - verifica el schema de la base de datos';
      } else if (error.code === 'PGRST301') {
        errorType = 'postgrest';
        errorDetails = 'Error de PostgREST - verifica que la extensión esté habilitada';
      }
      
      logError(`Conexión fallida [${errorType}]: ${errorDetails}`);
      logError('Código de error:', error.code);
      logError('Mensaje original:', error.message);
      
      const status: SupabaseStatus = {
        isAvailable: true,
        isConnected: false,
        error: `[${errorType}] ${errorDetails}`,
      };
      lastKnownStatus = status;
      return status;
    }

    logDb(`✅ Conexión exitosa - tabla territories accesible (${count ?? '?'} registros)`);

      supabaseInstance = client;
      logDb('✅ Conectado exitosamente a Supabase');

      const status: SupabaseStatus = {
        isAvailable: true,
        isConnected: true,
      };
      lastKnownStatus = status;
      return status;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      logError(`Inicialización fallida: ${message}`);
      const status: SupabaseStatus = {
        isAvailable: false,
        isConnected: false,
        error: message,
      };
      lastKnownStatus = status;
      return status;
    }
  })();

  return initializationPromise;
}

/**
 * Get Supabase client instance
 * 
 * Returns null if not available - callers must handle this gracefully.
 */
export async function getSupabaseClient(): Promise<SupabaseClient | null> {
  if (supabaseInstance) {
    return supabaseInstance;
  }

  const status = await initSupabase();
  return status.isConnected ? supabaseInstance : null;
}

/**
 * Check if Supabase is available and connected
 */
export async function isSupabaseReady(): Promise<boolean> {
  const status = await initSupabase();
  return status.isConnected;
}

/**
 * Get current Supabase status without initializing
 */
export function getSupabaseStatus(): SupabaseStatus | null {
  if (!initializationPromise) {
    return null;
  }
  // Note: This is synchronous, so we can't await the promise
  // Use initSupabase() for async status check
  return {
    isAvailable: !!supabaseInstance,
    isConnected: !!supabaseInstance,
  };
}

// ===========================================
// Safe Query Helper
// ===========================================

/**
 * Execute a Supabase query with automatic fallback
 * 
 * Usage:
 * ```typescript
 * const result = await safeQuery(
 *   async (client) => {
 *     const { data } = await client.from('territories').select('*');
 *     return data;
 *   },
 *   [] // fallback value if Supabase not available
 * );
 * ```
 */
export async function safeQuery<T>(
  queryFn: (client: SupabaseClient) => Promise<T>,
  fallbackValue: T
): Promise<T> {
  try {
    const client = await getSupabaseClient();
    
    if (!client) {
      // Supabase not available, return fallback
      return fallbackValue;
    }

    return await queryFn(client);
  } catch (error) {
    console.warn('[Supabase] Query failed, using fallback:', error);
    return fallbackValue;
  }
}

/**
 * Execute a Supabase query with custom fallback function
 */
export async function safeQueryWithFallback<T>(
  queryFn: (client: SupabaseClient) => Promise<T>,
  fallbackFn: () => Promise<T> | T
): Promise<T> {
  try {
    const client = await getSupabaseClient();
    
    if (!client) {
      return await fallbackFn();
    }

    return await queryFn(client);
  } catch (error) {
    console.warn('[Supabase] Query failed, using fallback:', error);
    return await fallbackFn();
  }
}

// ===========================================
// Utility Functions
// ===========================================

/**
 * Check if Supabase is configured (has env vars)
 */
export function isSupabaseConfigured(): boolean {
  return !!SUPABASE_URL && !!SUPABASE_KEY;
}

/**
 * Reset Supabase client (useful for testing)
 */
export function resetSupabaseClient(): void {
  supabaseInstance = null;
  initializationPromise = null;
}
