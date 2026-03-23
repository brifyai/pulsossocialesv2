/**
 * Agent Repository - Sprint 10B
 * 
 * Acceso a datos de agentes sintéticos desde Supabase.
 * Fallback a datos locales si Supabase no está disponible.
 * 
 * ACTUALIZADO: 2026-03-16 - Integración con DB real
 * - Lee desde synthetic_agents en Supabase
 * - Mantiene fallback a datos locales (syntheticAgents.ts)
 * - Soporta filtros, paginación y estadísticas
 */

import { getSupabaseClient } from '../client';
import type { 
  DbSyntheticAgent, 
  AgentFilters, 
  PaginatedResult 
} from '../../../types/database';
import type { SyntheticAgent } from '../../../types/agent';

// Fallback data (importado estáticamente para offline)
import { 
  loadSyntheticAgents as loadLocalAgents,
  filterAgents as filterLocalAgents,
  getAgentById as getLocalAgentById,
  getUniqueRegions as getLocalUniqueRegions,
  getUniqueCommunes as getLocalUniqueCommunes
} from '../../../data/syntheticAgents';

// ===========================================
// Types
// ===========================================

export interface AgentListOptions {
  page?: number;
  pageSize?: number;
  filters?: AgentFilters;
  orderBy?: keyof DbSyntheticAgent;
  orderDirection?: 'asc' | 'desc';
}

export interface AgentStats {
  totalAgents: number;
  byRegion: Array<{ region_code: string; count: number }>;
  bySex: Array<{ sex: string; count: number }>;
  byAgeGroup: Array<{ age_group: string; count: number }>;
  byAgentType: Array<{ agent_type: string; count: number }>;
}

// ===========================================
// Repository Functions
// ===========================================

/**
 * Get agents with optional filtering and pagination
 * Intenta Supabase primero, fallback a datos locales
 */
export async function getAgents(
  options: AgentListOptions = {}
): Promise<PaginatedResult<SyntheticAgent>> {
  const {
    page = 1,
    pageSize = 50,
    filters = {},
    orderBy = 'agent_id',
    orderDirection = 'asc',
  } = options;

  console.log('[🟢 AgentRepository] getAgents() - Intentando leer de Supabase...');
  const client = await getSupabaseClient();
  
  if (!client) {
    console.log('[🟡 AgentRepository] Supabase no disponible, usando fallback local');
    const result = await getLocalFallbackAgents(options);
    console.log(`[🟡 AgentRepository] Fallback local: ${result.data.length} agentes`);
    return result;
  }

  try {
    console.log('[🟢 AgentRepository] Ejecutando query a synthetic_agents...');
    let query = client
      .from('synthetic_agents')
      .select('*', { count: 'exact' });

    // Apply filters
    if (filters.territoryId) {
      query = query.eq('territory_id', filters.territoryId);
    }
    if (filters.regionCode) {
      query = query.eq('region_code', filters.regionCode);
    }
    if (filters.comunaCode) {
      query = query.eq('comuna_code', filters.comunaCode);
    }
    if (filters.sex) {
      query = query.eq('sex', filters.sex);
    }
    if (filters.ageGroup) {
      query = query.eq('age_group', filters.ageGroup);
    }
    if (filters.ageMin !== undefined) {
      query = query.gte('age', filters.ageMin);
    }
    if (filters.ageMax !== undefined) {
      query = query.lte('age', filters.ageMax);
    }
    if (filters.incomeDecile) {
      query = query.eq('income_decile', filters.incomeDecile);
    }
    if (filters.educationLevel) {
      query = query.eq('education_level', filters.educationLevel);
    }
    if (filters.connectivityLevel) {
      query = query.eq('connectivity_level', filters.connectivityLevel);
    }
    if (filters.agentType) {
      query = query.eq('agent_type', filters.agentType);
    }
    if (filters.batchId) {
      query = query.eq('batch_id', filters.batchId);
    }

    // Apply ordering and pagination
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const { data, error, count } = await query
      .order(orderBy, { ascending: orderDirection === 'asc' })
      .range(from, to);

    if (error) throw error;

    // Transform DbSyntheticAgent to SyntheticAgent
    const agents = (data as DbSyntheticAgent[]).map(dbAgentToSyntheticAgent);

    console.log(`[🟢 AgentRepository] ✅ Datos de SUPABASE: ${agents.length} agentes`);
    return {
      data: agents,
      total: count || 0,
      page,
      pageSize,
      hasMore: (count || 0) > to + 1,
    };
  } catch (error) {
    console.warn('[🟡 AgentRepository] Error en DB, usando fallback:', error);
    return getLocalFallbackAgents(options);
  }
}

/**
 * Get a single agent by ID
 */
export async function getAgentById(agentId: string): Promise<SyntheticAgent | null> {
  const client = await getSupabaseClient();
  
  if (!client) {
    console.log('[AgentRepository] Supabase no disponible, usando fallback local');
    const localAgent = await getLocalAgentById(agentId);
    return localAgent || null;
  }

  try {
    const { data, error } = await client
      .from('synthetic_agents')
      .select('*')
      .eq('agent_id', agentId)
      .single();

    if (error) throw error;
    if (!data) return null;
    
    return dbAgentToSyntheticAgent(data as DbSyntheticAgent);
  } catch (error) {
    console.warn('[AgentRepository] Query failed, using fallback:', error);
    const localAgent = await getLocalAgentById(agentId);
    return localAgent || null;
  }
}

/**
 * Get unique regions from agents
 * Sprint 10B: Usa territories desde Supabase o fallback local
 * NOTA: Usa region_code y region_name que son las columnas existentes en DB
 */
export async function getUniqueRegions(): Promise<Array<{ code: string; name: string }>> {
  const client = await getSupabaseClient();
  
  if (!client) {
    console.log('[AgentRepository] Supabase no disponible, usando fallback local');
    return getLocalUniqueRegions();
  }

  try {
    // Obtener regiones únicas desde la tabla de territories
    // Usar region_code y region_name que son las columnas que existen en la DB
    const { data: territories, error } = await client
      .from('territories')
      .select('region_code, region_name')
      .eq('level', 'region')
      .order('region_code');

    if (error) throw error;

    if (territories && territories.length > 0) {
      return (territories as any[]).map((t: any) => ({ 
        code: t.region_code, 
        name: t.region_name 
      }));
    }

    // Si no hay territories, fallback a datos locales
    return getLocalUniqueRegions();
  } catch (error) {
    console.warn('[AgentRepository] Query failed, using fallback:', error);
    return getLocalUniqueRegions();
  }
}

/**
 * Get unique communes from agents (optionally filtered by region)
 * Sprint 10B: Usa territories desde Supabase o fallback local
 * NOTA: Usa comuna_code y comuna_name que son las columnas existentes en DB
 */
export async function getUniqueCommunes(regionCode?: string): Promise<Array<{ code: string; name: string }>> {
  const client = await getSupabaseClient();
  
  if (!client) {
    console.log('[AgentRepository] Supabase no disponible, usando fallback local');
    return getLocalUniqueCommunes(regionCode);
  }

  try {
    // Obtener comunas desde territories
    // Usar comuna_code y comuna_name que son las columnas que existen en la DB
    let query = client
      .from('territories')
      .select('comuna_code, comuna_name')
      .eq('level', 'comuna');

    if (regionCode) {
      query = query.eq('region_code', regionCode);
    }

    const { data: territories, error } = await query.order('comuna_name');

    if (error) throw error;

    if (territories && territories.length > 0) {
      return (territories as any[]).map((t: any) => ({ 
        code: t.comuna_code, 
        name: t.comuna_name 
      }));
    }

    // Si no hay territories, fallback a datos locales
    return getLocalUniqueCommunes(regionCode);
  } catch (error) {
    console.warn('[AgentRepository] Query failed, using fallback:', error);
    return getLocalUniqueCommunes(regionCode);
  }
}

/**
 * Get agent statistics
 * Sprint 10B: Calcula estadísticas desde Supabase o fallback local
 * NOTA: Las agregaciones GROUP BY requieren RPC o cálculo manual
 */
export async function getAgentStats(): Promise<AgentStats> {
  const client = await getSupabaseClient();
  
  if (!client) {
    console.log('[AgentRepository] Supabase no disponible, usando fallback local');
    return getLocalAgentStats();
  }

  try {
    // Total agents
    const { count: totalAgents, error: countError } = await client
      .from('synthetic_agents')
      .select('*', { count: 'exact', head: true });

    if (countError) throw countError;

    // Para estadísticas por categoría, cargamos todos los agents y calculamos
    // Esto es menos eficiente pero evita problemas con GROUP BY en Supabase JS
    const { data: allAgents, error: agentsError } = await client
      .from('synthetic_agents')
      .select('region_code, sex, age_group, agent_type');

    if (agentsError) throw agentsError;

    // Calcular estadísticas manualmente
    const byRegion = new Map<string, number>();
    const bySex = new Map<string, number>();
    const byAgeGroup = new Map<string, number>();
    const byAgentType = new Map<string, number>();

    (allAgents || []).forEach((agent: any) => {
      byRegion.set(agent.region_code, (byRegion.get(agent.region_code) || 0) + 1);
      bySex.set(agent.sex, (bySex.get(agent.sex) || 0) + 1);
      byAgeGroup.set(agent.age_group, (byAgeGroup.get(agent.age_group) || 0) + 1);
      byAgentType.set(agent.agent_type, (byAgentType.get(agent.agent_type) || 0) + 1);
    });

    return {
      totalAgents: totalAgents || 0,
      byRegion: Array.from(byRegion.entries()).map(([code, count]) => ({ region_code: code, count })),
      bySex: Array.from(bySex.entries()).map(([sex, count]) => ({ sex, count })),
      byAgeGroup: Array.from(byAgeGroup.entries()).map(([age_group, count]) => ({ age_group, count })),
      byAgentType: Array.from(byAgentType.entries()).map(([agent_type, count]) => ({ agent_type, count })),
    };
  } catch (error) {
    console.warn('[AgentRepository] Query failed, using fallback:', error);
    return getLocalAgentStats();
  }
}

/**
 * Check if Supabase is available
 */
export async function isSupabaseAvailable(): Promise<boolean> {
  const client = await getSupabaseClient();
  return client !== null;
}

// ===========================================
// Local Fallback Functions
// ===========================================

async function getLocalFallbackAgents(options: AgentListOptions): Promise<PaginatedResult<SyntheticAgent>> {
  const { page = 1, pageSize = 50, filters = {} } = options;
  
  // Convertir AgentFilters al formato esperado por filterLocalAgents
  const localFilters: Record<string, string | number | undefined> = {};
  if (filters.regionCode) localFilters.regionCode = filters.regionCode;
  if (filters.comunaCode) localFilters.comunaCode = filters.comunaCode;
  if (filters.sex) localFilters.sex = filters.sex;
  if (filters.ageGroup) localFilters.ageGroup = filters.ageGroup;
  if (filters.incomeDecile) localFilters.incomeDecile = filters.incomeDecile;
  if (filters.educationLevel) localFilters.educationLevel = filters.educationLevel;
  if (filters.connectivityLevel) localFilters.connectivityLevel = filters.connectivityLevel;
  if (filters.agentType) localFilters.agentType = filters.agentType;

  // Obtener todos los agentes filtrados
  const allAgents = await filterLocalAgents(localFilters as any);
  
  // Aplicar paginación
  const from = (page - 1) * pageSize;
  const to = from + pageSize;
  const paginated = allAgents.slice(from, to);

  return {
    data: paginated,
    total: allAgents.length,
    page,
    pageSize,
    hasMore: allAgents.length > to,
  };
}

async function getLocalAgentStats(): Promise<AgentStats> {
  const agents = await loadLocalAgents();
  const allAgents = agents.agents;

  // Calcular estadísticas
  const regionMap = new Map<string, number>();
  const sexMap = new Map<string, number>();
  const ageGroupMap = new Map<string, number>();
  const agentTypeMap = new Map<string, number>();

  allAgents.forEach(agent => {
    regionMap.set(agent.region_code, (regionMap.get(agent.region_code) || 0) + 1);
    sexMap.set(agent.sex, (sexMap.get(agent.sex) || 0) + 1);
    ageGroupMap.set(agent.age_group, (ageGroupMap.get(agent.age_group) || 0) + 1);
    agentTypeMap.set(agent.agent_type, (agentTypeMap.get(agent.agent_type) || 0) + 1);
  });

  return {
    totalAgents: allAgents.length,
    byRegion: Array.from(regionMap.entries()).map(([code, count]) => ({ region_code: code, count })),
    bySex: Array.from(sexMap.entries()).map(([sex, count]) => ({ sex, count })),
    byAgeGroup: Array.from(ageGroupMap.entries()).map(([age_group, count]) => ({ age_group, count })),
    byAgentType: Array.from(agentTypeMap.entries()).map(([agent_type, count]) => ({ agent_type, count })),
  };
}

// ===========================================
// Transformers
// ===========================================

/**
 * Transform DbSyntheticAgent to SyntheticAgent
 * Mapea los campos de la DB al formato usado por el frontend
 */
function dbAgentToSyntheticAgent(dbAgent: DbSyntheticAgent): SyntheticAgent {
  return {
    agent_id: dbAgent.agent_id,
    synthetic_batch_id: dbAgent.batch_id,
    source_version: dbAgent.version,
    country_code: dbAgent.country_code,
    region_code: dbAgent.region_code,
    region_name: '', // Se obtiene de territories si es necesario
    comuna_code: dbAgent.comuna_code,
    comuna_name: '', // Se obtiene de territories si es necesario
    urbanicity: dbAgent.urbanicity,
    sex: dbAgent.sex,
    age: dbAgent.age,
    age_group: dbAgent.age_group,
    household_size: dbAgent.household_size,
    household_type: dbAgent.household_type,
    income_decile: dbAgent.income_decile,
    poverty_status: dbAgent.poverty_status,
    education_level: dbAgent.education_level,
    occupation_status: dbAgent.occupation_status,
    occupation_group: dbAgent.occupation_group,
    socioeconomic_level: dbAgent.socioeconomic_level,
    connectivity_level: dbAgent.connectivity_level,
    digital_exposure_level: dbAgent.digital_exposure_level,
    preferred_survey_channel: dbAgent.preferred_survey_channel,
    agent_type: dbAgent.agent_type,
    backbone_key: dbAgent.backbone_key,
    subtel_profile_key: dbAgent.subtel_profile_key,
    casen_profile_key: dbAgent.casen_profile_key,
    generation_notes: dbAgent.generation_notes,
    created_at: dbAgent.created_at,
  };
}
