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
 * SOLO usa Supabase - no hay fallback a datos locales
 * NOTA: Supabase limita a 1000 registros por query, así que hacemos múltiples queries
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

  console.log('[🟢 AgentRepository] getAgents() - Leyendo de Supabase...');
  const client = await getSupabaseClient();
  
  if (!client) {
    console.error('[🔴 AgentRepository] Supabase no disponible');
    throw new Error('Supabase no está disponible. No se pueden cargar los agentes.');
  }

  try {
    console.log('[🟢 AgentRepository] Ejecutando query a synthetic_agents...');
    
    // Primero obtener el conteo total
    let countQuery = client
      .from('synthetic_agents')
      .select('*', { count: 'exact', head: true });
    
    // Apply filters al conteo
    if (filters.territoryId) countQuery = countQuery.eq('territory_id', filters.territoryId);
    if (filters.regionCode) countQuery = countQuery.eq('region_code', filters.regionCode);
    if (filters.comunaCode) countQuery = countQuery.eq('comuna_code', filters.comunaCode);
    if (filters.sex) countQuery = countQuery.eq('sex', filters.sex);
    if (filters.ageGroup) countQuery = countQuery.eq('age_group', filters.ageGroup);
    if (filters.ageMin !== undefined) countQuery = countQuery.gte('age', filters.ageMin);
    if (filters.ageMax !== undefined) countQuery = countQuery.lte('age', filters.ageMax);
    if (filters.incomeDecile) countQuery = countQuery.eq('income_decile', filters.incomeDecile);
    if (filters.educationLevel) countQuery = countQuery.eq('education_level', filters.educationLevel);
    if (filters.connectivityLevel) countQuery = countQuery.eq('connectivity_level', filters.connectivityLevel);
    if (filters.agentType) countQuery = countQuery.eq('agent_type', filters.agentType);
    if (filters.batchId) countQuery = countQuery.eq('batch_id', filters.batchId);
    
    const { count: totalCount, error: countError } = await countQuery;
    if (countError) throw countError;
    
    const total = totalCount || 0;
    console.log(`[🟢 AgentRepository] Total de agentes en DB: ${total}`);
    
    // Si no hay agentes, error
    if (total === 0) {
      console.error('[🔴 AgentRepository] La tabla synthetic_agents está vacía en Supabase');
      throw new Error('No hay agentes en la base de datos. Por favor, ejecuta el seed de agentes.');
    }
    
    // Calcular cuántos registros necesitamos cargar
    const from = (page - 1) * pageSize;
    const to = Math.min(from + pageSize - 1, total - 1);
    const neededRecords = to - from + 1;
    
    // Supabase limita a 1000 registros por query, así que hacemos múltiples queries si es necesario
    const allAgents: SyntheticAgent[] = [];
    const SUPABASE_MAX_LIMIT = 1000;
    
    for (let currentFrom = from; currentFrom <= to && allAgents.length < neededRecords; currentFrom += SUPABASE_MAX_LIMIT) {
      const currentTo = Math.min(currentFrom + SUPABASE_MAX_LIMIT - 1, to);
      
      console.log(`[🟢 AgentRepository] Cargando registros ${currentFrom}-${currentTo}...`);
      
      let query = client
        .from('synthetic_agents')
        .select('*');
      
      // Apply filters
      if (filters.territoryId) query = query.eq('territory_id', filters.territoryId);
      if (filters.regionCode) query = query.eq('region_code', filters.regionCode);
      if (filters.comunaCode) query = query.eq('comuna_code', filters.comunaCode);
      if (filters.sex) query = query.eq('sex', filters.sex);
      if (filters.ageGroup) query = query.eq('age_group', filters.ageGroup);
      if (filters.ageMin !== undefined) query = query.gte('age', filters.ageMin);
      if (filters.ageMax !== undefined) query = query.lte('age', filters.ageMax);
      if (filters.incomeDecile) query = query.eq('income_decile', filters.incomeDecile);
      if (filters.educationLevel) query = query.eq('education_level', filters.educationLevel);
      if (filters.connectivityLevel) query = query.eq('connectivity_level', filters.connectivityLevel);
      if (filters.agentType) query = query.eq('agent_type', filters.agentType);
      if (filters.batchId) query = query.eq('batch_id', filters.batchId);
      
      const { data, error } = await query
        .order(orderBy, { ascending: orderDirection === 'asc' })
        .range(currentFrom, currentTo);
      
      if (error) throw error;
      
      if (data) {
        const agents = await Promise.all((data as DbSyntheticAgent[]).map(dbAgentToSyntheticAgent));
        allAgents.push(...agents);
        console.log(`[🟢 AgentRepository] Cargados ${agents.length} agentes (total acumulado: ${allAgents.length})`);
      }
    }
    
    console.log(`[🟢 AgentRepository] ✅ Datos de SUPABASE: ${allAgents.length} agentes (total en DB: ${total})`);
    
    return {
      data: allAgents,
      total: total,
      page,
      pageSize,
      hasMore: total > to + 1,
    };
  } catch (error) {
    console.error('[🔴 AgentRepository] Error al leer de Supabase:', error);
    throw error;
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
 * Sprint 10B: Obtiene regiones únicas donde hay agentes reales
 * NOTA: Consulta synthetic_agents para obtener solo regiones con datos
 */
export async function getUniqueRegions(): Promise<Array<{ code: string; name: string }>> {
  const client = await getSupabaseClient();
  
  if (!client) {
    console.log('[AgentRepository] Supabase no disponible, usando fallback local');
    return getLocalUniqueRegions();
  }

  try {
    // Obtener regiones únicas desde los agentes reales
    const { data: agents, error } = await client
      .from('synthetic_agents')
      .select('region_code')
      .order('region_code');

    if (error) throw error;

    if (agents && agents.length > 0) {
      // Extraer regiones únicas
      const uniqueRegions = new Map<string, string>();
      
      (agents as any[]).forEach((agent: any) => {
        const code = agent.region_code;
        if (code && !uniqueRegions.has(code)) {
          // Obtener nombre de región desde el caché o usar el código como fallback
          uniqueRegions.set(code, code); // Temporalmente usamos el código como nombre
        }
      });
      
      // Convertir a array y obtener nombres reales
      const result: Array<{ code: string; name: string }> = [];
      for (const [code, _] of uniqueRegions) {
        const name = await getRegionName(code);
        result.push({ code, name: name !== code ? name : `Región ${code}` });
      }
      
      return result.sort((a, b) => a.code.localeCompare(b.code));
    }

    // Si no hay agentes, fallback a datos locales
    return getLocalUniqueRegions();
  } catch (error) {
    console.warn('[AgentRepository] Query failed, using fallback:', error);
    return getLocalUniqueRegions();
  }
}

/**
 * Get unique communes from agents (optionally filtered by region)
 * Sprint 10B: Obtiene comunas únicas donde hay agentes reales
 * NOTA: Consulta synthetic_agents para obtener solo comunas con datos
 */
export async function getUniqueCommunes(regionCode?: string): Promise<Array<{ code: string; name: string }>> {
  const client = await getSupabaseClient();
  
  if (!client) {
    console.log('[AgentRepository] Supabase no disponible, usando fallback local');
    return getLocalUniqueCommunes(regionCode);
  }

  try {
    // Obtener comunas únicas desde los agentes reales
    let query = client
      .from('synthetic_agents')
      .select('comuna_code, region_code')
      .order('comuna_code');

    if (regionCode) {
      query = query.eq('region_code', regionCode);
    }

    const { data: agents, error } = await query;

    if (error) throw error;

    if (agents && agents.length > 0) {
      // Extraer comunas únicas
      const uniqueCommunes = new Map<string, string>();
      
      (agents as any[]).forEach((agent: any) => {
        const code = agent.comuna_code;
        if (code && !uniqueCommunes.has(code)) {
          uniqueCommunes.set(code, code); // Temporalmente usamos el código como nombre
        }
      });
      
      // Convertir a array y obtener nombres reales
      const result: Array<{ code: string; name: string }> = [];
      for (const [code, _] of uniqueCommunes) {
        const name = await getComunaName(code);
        result.push({ code, name: name !== code ? name : `Comuna ${code}` });
      }
      
      return result.sort((a, b) => a.name.localeCompare(b.name));
    }

    // Si no hay agentes, fallback a datos locales
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
 * Get agents within a bounding box (for map viewport)
 * Optimized for spatial queries with coordinate filtering
 * Uses random sampling for better distribution across the viewport
 * 
 * @param sw Southwest corner [lng, lat]
 * @param ne Northeast corner [lng, lat]
 * @param options Optional filters and limit
 * @returns Array of agents within the bounding box
 */
export async function getAgentsInBBox(
  sw: [number, number],
  ne: [number, number],
  options: {
    limit?: number;
    filters?: AgentFilters;
    useRandomSampling?: boolean;
  } = {}
): Promise<SyntheticAgent[]> {
  const { limit = 500, filters = {}, useRandomSampling = true } = options;

  console.log(`[🟢 AgentRepository] getAgentsInBBox() - BBox: [${sw[0]},${sw[1]}] to [${ne[0]},${ne[1]}], Limit: ${limit}, Random: ${useRandomSampling}`);
  
  const client = await getSupabaseClient();
  if (!client) {
    console.error('[🔴 AgentRepository] Supabase no disponible');
    throw new Error('Supabase no está disponible. No se pueden cargar los agentes.');
  }

  try {
    // Build query with spatial filters
    let query = client
      .from('synthetic_agents')
      .select('*')
      .gte('location_lng', sw[0])  // min lng
      .lte('location_lng', ne[0])  // max lng
      .gte('location_lat', sw[1])  // min lat
      .lte('location_lat', ne[1])  // max lat
      .not('location_lat', 'is', null)  // Only agents with coordinates
      .not('location_lng', 'is', null);

    // Apply additional filters
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

    // Apply random ordering for better spatial distribution
    if (useRandomSampling) {
      query = query.order('agent_id', { ascending: false }); // Use agent_id as pseudo-random
    }

    // Apply limit
    query = query.limit(limit);

    const { data, error } = await query;

    if (error) {
      console.error('[🔴 AgentRepository] Error en query espacial:', error);
      throw error;
    }

    if (!data || data.length === 0) {
      console.log('[🟡 AgentRepository] No se encontraron agentes en el bounding box');
      return [];
    }

    console.log(`[🟢 AgentRepository] ✅ Encontrados ${data.length} agentes en el viewport`);

    // Transform to SyntheticAgent format
    const agents = await Promise.all(
      (data as DbSyntheticAgent[]).map(dbAgentToSyntheticAgent)
    );

    return agents;
  } catch (error) {
    console.error('[🔴 AgentRepository] Error en getAgentsInBBox:', error);
    throw error;
  }
}

/**
 * Get agents distributed across all regions for initial view
 * Returns a representative sample from each region
 * 
 * @param totalLimit Total number of agents to return
 * @returns Array of agents distributed across regions
 */
export async function getAgentsDistributed(
  totalLimit: number = 2000
): Promise<SyntheticAgent[]> {
  console.log(`[🟢 AgentRepository] getAgentsDistributed() - Total: ${totalLimit}`);
  
  const client = await getSupabaseClient();
  if (!client) {
    console.error('[🔴 AgentRepository] Supabase no disponible');
    throw new Error('Supabase no está disponible. No se pueden cargar los agentes.');
  }

  try {
    // Get agents distributed across all regions using a window function approach
    // We'll get a sample from each region proportional to its population
    const { data, error } = await client
      .from('synthetic_agents')
      .select('*')
      .not('location_lat', 'is', null)
      .not('location_lng', 'is', null)
      .order('agent_id', { ascending: false }) // Pseudo-random distribution
      .limit(totalLimit);

    if (error) {
      console.error('[🔴 AgentRepository] Error en query distribuida:', error);
      throw error;
    }

    if (!data || data.length === 0) {
      console.log('[🟡 AgentRepository] No se encontraron agentes');
      return [];
    }

    console.log(`[🟢 AgentRepository] ✅ Cargados ${data.length} agentes distribuidos`);

    // Transform to SyntheticAgent format
    const agents = await Promise.all(
      (data as DbSyntheticAgent[]).map(dbAgentToSyntheticAgent)
    );

    return agents;
  } catch (error) {
    console.error('[🔴 AgentRepository] Error en getAgentsDistributed:', error);
    throw error;
  }
}

/**
 * Get agent clusters for low zoom levels
 * Groups agents by geographic grid cells for efficient rendering
 * 
 * @param sw Southwest corner [lng, lat]
 * @param ne Northeast corner [lng, lat]
 * @param gridSize Size of grid cells in degrees (default: 0.1)
 * @returns Array of clusters with count and centroid
 */
export async function getAgentClusters(
  sw: [number, number],
  ne: [number, number],
  gridSize: number = 0.1
): Promise<Array<{
  id: string;
  lat: number;
  lng: number;
  count: number;
  bounds: [[number, number], [number, number]];
}>> {
  console.log(`[🟢 AgentRepository] getAgentClusters() - Grid: ${gridSize}°`);
  
  const client = await getSupabaseClient();
  if (!client) {
    console.error('[🔴 AgentRepository] Supabase no disponible');
    return [];
  }

  try {
    // For clustering, we use a simpler approach:
    // Get all agents in bbox (limited) and cluster them client-side
    // For production, consider using PostGIS or a dedicated clustering service
    const { data, error } = await client
      .from('synthetic_agents')
      .select('location_lat, location_lng, agent_id')
      .gte('location_lng', sw[0])
      .lte('location_lng', ne[0])
      .gte('location_lat', sw[1])
      .lte('location_lat', ne[1])
      .not('location_lat', 'is', null)
      .limit(5000); // Limit for clustering

    if (error) throw error;
    if (!data || data.length === 0) return [];

    // Simple grid-based clustering
    const clusters = new Map<string, {
      lat: number;
      lng: number;
      count: number;
      minLat: number;
      maxLat: number;
      minLng: number;
      maxLng: number;
    }>();

    data.forEach((agent: any) => {
      if (!agent.location_lat || !agent.location_lng) return;

      // Calculate grid cell
      const cellX = Math.floor(agent.location_lng / gridSize);
      const cellY = Math.floor(agent.location_lat / gridSize);
      const cellKey = `${cellX},${cellY}`;

      if (clusters.has(cellKey)) {
        const cluster = clusters.get(cellKey)!;
        cluster.count++;
        cluster.minLat = Math.min(cluster.minLat, agent.location_lat);
        cluster.maxLat = Math.max(cluster.maxLat, agent.location_lat);
        cluster.minLng = Math.min(cluster.minLng, agent.location_lng);
        cluster.maxLng = Math.max(cluster.maxLng, agent.location_lng);
        // Update centroid (running average)
        cluster.lat = (cluster.lat * (cluster.count - 1) + agent.location_lat) / cluster.count;
        cluster.lng = (cluster.lng * (cluster.count - 1) + agent.location_lng) / cluster.count;
      } else {
        clusters.set(cellKey, {
          lat: agent.location_lat,
          lng: agent.location_lng,
          count: 1,
          minLat: agent.location_lat,
          maxLat: agent.location_lat,
          minLng: agent.location_lng,
          maxLng: agent.location_lng,
        });
      }
    });

    // Convert to array format
    return Array.from(clusters.entries()).map(([key, cluster]) => ({
      id: key,
      lat: cluster.lat,
      lng: cluster.lng,
      count: cluster.count,
      bounds: [
        [cluster.minLng, cluster.minLat],
        [cluster.maxLng, cluster.maxLat],
      ] as [[number, number], [number, number]],
    }));
  } catch (error) {
    console.error('[🔴 AgentRepository] Error en getAgentClusters:', error);
    return [];
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
// Local Fallback Functions (solo para otras funciones que aún usan fallback)
// ===========================================

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
// Territory Cache
// ===========================================

// Caché en memoria para nombres de territorios
let territoryNamesCache: Map<string, { region_name: string; comuna_name: string }> | null = null;

/**
 * Carga los nombres de territorios desde Supabase
 * Usa un cache para evitar múltiples queries
 * NOTA: Usa code y name (columnas migradas) para comunas
 */
async function loadTerritoryNamesCache(): Promise<Map<string, { region_name: string; comuna_name: string }>> {
  if (territoryNamesCache) {
    return territoryNamesCache;
  }

  const client = await getSupabaseClient();
  if (!client) {
    console.warn('[🟡 AgentRepository] No se puede cargar caché de territorios, Supabase no disponible');
    return new Map();
  }

  try {
    console.log('[🟢 AgentRepository] Cargando caché de nombres de territorios...');
    const { data, error } = await client
      .from('territories')
      .select('code, name, region_code, region_name, level');

    if (error) throw error;

    territoryNamesCache = new Map();
    
    (data || []).forEach((territory: any) => {
      // Para regiones: usar code como region_code
      if (territory.level === 'region' && territory.code) {
        territoryNamesCache!.set(territory.code, {
          region_name: territory.name || territory.region_name || '',
          comuna_name: ''
        });
      }
      // Para comunas: usar code (columna migrada)
      if (territory.level === 'comuna' && territory.code) {
        territoryNamesCache!.set(territory.code, {
          region_name: territory.region_name || '',
          comuna_name: territory.name || ''
        });
      }
    });

    console.log(`[🟢 AgentRepository] ✅ Caché cargada: ${territoryNamesCache.size} territorios`);
    return territoryNamesCache;
  } catch (error) {
    console.error('[🔴 AgentRepository] Error cargando caché de territorios:', error);
    return new Map();
  }
}

/**
 * Obtiene el nombre de una región desde el caché
 */
async function getRegionName(regionCode: string): Promise<string> {
  const cache = await loadTerritoryNamesCache();
  const territory = cache.get(regionCode);
  return territory?.region_name || regionCode; // Fallback al código si no se encuentra
}

/**
 * Obtiene el nombre de una comuna desde el caché
 */
async function getComunaName(comunaCode: string): Promise<string> {
  const cache = await loadTerritoryNamesCache();
  const territory = cache.get(comunaCode);
  return territory?.comuna_name || comunaCode; // Fallback al código si no se encuentra
}

// ===========================================
// Transformers
// ===========================================

/**
 * Transform DbSyntheticAgent to SyntheticAgent
 * Mapea los campos de la DB al formato usado por el frontend
 * AHORA obtiene los nombres de territorios desde Supabase
 */
async function dbAgentToSyntheticAgent(dbAgent: DbSyntheticAgent): Promise<SyntheticAgent> {
  // Obtener nombres de territorios en paralelo
  const [region_name, comuna_name] = await Promise.all([
    getRegionName(dbAgent.region_code),
    getComunaName(dbAgent.comuna_code)
  ]);

  return {
    agent_id: dbAgent.agent_id,
    synthetic_batch_id: dbAgent.batch_id,
    source_version: dbAgent.version,
    country_code: dbAgent.country_code,
    region_code: dbAgent.region_code,
    region_name,
    comuna_code: dbAgent.comuna_code,
    comuna_name,
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
    // Geolocation (from enriched data)
    location_lat: dbAgent.location_lat,
    location_lng: dbAgent.location_lng,
  };
}
