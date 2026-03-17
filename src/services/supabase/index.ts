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

// Territory Repository
export {
  getTerritories,
  getTerritoryById,
  getTerritoryByCode,        // NUEVO: Modelo Alineado v2.0
  getTerritoryByComunaCode,  // @deprecated: Use getTerritoryByCode
  getRegions,
  getComunasByRegion,
  getTerritoryStats,
  searchTerritories,
} from './repositories/territoryRepository';

export type {
  TerritoryListOptions,
  TerritoryStats,
} from './repositories/territoryRepository';

// Agent Repository - Sprint 10B
export {
  getAgents,
  getAgentById,
  getUniqueRegions as getAgentRegions,
  getUniqueCommunes as getAgentCommunes,
  getAgentStats,
  isSupabaseAvailable as isAgentSupabaseAvailable,
} from './repositories/agentRepository';

export type {
  AgentListOptions,
  AgentStats,
} from './repositories/agentRepository';

// Survey Repository - Sprint 11
export {
  createSurvey,
  getAllSurveys,
  getSurvey,
  deleteSurvey,
  createSurveyRun,
  completeSurveyRun,
  saveSurveyResponses,
  getSurveyRuns,
  getSurveyResults,
  getSurveyStats,
  isSurveyPersistenceAvailable,
} from './repositories/surveyRepository';
