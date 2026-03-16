/**
 * Supabase Client - Sprint 9
 * 
 * Cliente de Supabase con lazy loading y fallback automático.
 * Si Supabase no está configurado, la app funciona con datos locales.
 */

import type { SupabaseClient as RealSupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../../types/database';

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

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// ===========================================
// State
// ===========================================

let supabaseInstance: SupabaseClient | null = null;
let initializationPromise: Promise<SupabaseStatus> | null = null;

// ===========================================
// Lazy Loading
// ===========================================

/**
 * Dynamically import supabase-js only when needed
 */
async function loadSupabaseModule(): Promise<typeof import('@supabase/supabase-js') | null> {
  try {
    // Dynamic import - only loads if Supabase is configured
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
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
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      console.log('[Supabase] Not configured - using local data fallback');
      return {
        isAvailable: false,
        isConnected: false,
        error: 'Supabase not configured (VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY required)',
      };
    }

    try {
      // Dynamically load supabase module
      const supabaseModule = await loadSupabaseModule();
      
      if (!supabaseModule) {
        return {
          isAvailable: false,
          isConnected: false,
          error: 'Supabase module not available',
        };
      }

      // Create client
      const { createClient } = supabaseModule;
      const client = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
        auth: {
          autoRefreshToken: true,
          persistSession: true,
        },
      });

      // Test connection
      const { error } = await client.from('territories').select('id', { count: 'exact', head: true });

      if (error) {
        // Connection failed but don't throw - app can work offline
        console.warn('[Supabase] Connection test failed:', error.message);
        return {
          isAvailable: true,
          isConnected: false,
          error: error.message,
        };
      }

      supabaseInstance = client;
      console.log('[Supabase] Connected successfully');

      return {
        isAvailable: true,
        isConnected: true,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.warn('[Supabase] Initialization failed:', message);
      return {
        isAvailable: false,
        isConnected: false,
        error: message,
      };
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
  return !!SUPABASE_URL && !!SUPABASE_ANON_KEY;
}

/**
 * Reset Supabase client (useful for testing)
 */
export function resetSupabaseClient(): void {
  supabaseInstance = null;
  initializationPromise = null;
}
