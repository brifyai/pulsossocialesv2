/**
 * Supabase Services - Sprint 9
 * 
 * Exporta todo el módulo de Supabase con lazy loading.
 * Si Supabase no está configurado, la app funciona con datos locales.
 */

// Client
export {
  initSupabase,
  getSupabaseClient,
  isSupabaseReady,
  getSupabaseStatus,
  safeQuery,
  safeQueryWithFallback,
  isSupabaseConfigured,
  resetSupabaseClient,
} from './client';

export type { 
  SupabaseClient, 
  SupabaseStatus 
} from './client';

// Repositories
export {
  getTerritories,
  getTerritoryById,
  getTerritoryByComunaCode,
  getRegions,
  getComunasByRegion,
  getTerritoryStats,
  searchTerritories,
} from './repositories/territoryRepository';

export type {
  TerritoryListOptions,
  TerritoryStats,
} from './repositories/territoryRepository';
