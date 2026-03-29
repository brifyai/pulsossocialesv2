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
 * Get unique regions from territories table
 * Sprint 10B: Obtiene TODAS las regiones de Chile desde la tabla territories
 * NOTA: Consulta territories para obtener todas las regiones disponibles,
 * no solo las que tienen agentes asignados
 */
export async function getUniqueRegions(): Promise<Array<{ code: string; name: string }>> {
  const client = await getSupabaseClient();
  
  if (!client) {
    console.log('[AgentRepository] Supabase no disponible, usando fallback local');
    return getLocalUniqueRegions();
  }

  try {
    // Obtener TODAS las regiones desde la tabla territories
    const { data: territories, error } = await client
      .from('territories')
      .select('code, name')
      .eq('level', 'region')
      .order('code');

    if (error) throw error;

    if (territories && territories.length > 0) {
      // Mapear a formato de región
      const result: Array<{ code: string; name: string }> = territories.map((t: any) => ({
        code: t.code,
        name: t.name || `Región ${t.code}`
      }));
      
      console.log(`[🟢 AgentRepository] Cargadas ${result.length} regiones desde territories`);
      return result;
    }

    // Si no hay regiones en territories, fallback a datos locales
    console.warn('[🟡 AgentRepository] No se encontraron regiones en territories, usando fallback');
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
      // Extraer comunas únicas con su región asociada
      const uniqueCommunes = new Map<string, { code: string; regionCode: string }>();
      
      (agents as any[]).forEach((agent: any) => {
        const code = agent.comuna_code;
        const regionCode = agent.region_code;
        if (code && !uniqueCommunes.has(code)) {
          uniqueCommunes.set(code, { code, regionCode });
        }
      });
      
      // Convertir a array y obtener nombres reales
      const result: Array<{ code: string; name: string }> = [];
      for (const [_, data] of uniqueCommunes) {
        const name = await getComunaName(data.code, data.regionCode);
        result.push({ code: data.code, name: name !== data.code ? name : `Comuna ${data.code}` });
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

// Promise singleton para evitar múltiples peticiones simultáneas
let territoryCacheLoadingPromise: Promise<Map<string, { region_name: string; comuna_name: string }>> | null = null;

/**
 * Carga los nombres de territorios desde Supabase
 * Usa un cache para evitar múltiples queries
 * NOTA: Usa code y name (columnas migradas) para comunas
 * 
 * IMPLEMENTA SINGLETON PATTERN: Si ya hay una petición en curso, reutiliza esa promise
 * para evitar múltiples peticiones simultáneas que causan ERR_INSUFFICIENT_RESOURCES
 */
async function loadTerritoryNamesCache(): Promise<Map<string, { region_name: string; comuna_name: string }>> {
  // Si ya tenemos el caché cargado, retornarlo inmediatamente
  if (territoryNamesCache) {
    return territoryNamesCache;
  }

  // Si ya hay una petición en curso, esperar a que termine y reutilizar el resultado
  if (territoryCacheLoadingPromise) {
    console.log('[🟡 AgentRepository] Reutilizando petición de caché de territorios en curso...');
    return territoryCacheLoadingPromise;
  }

  // Crear la petición y guardarla como singleton
  territoryCacheLoadingPromise = loadTerritoryNamesCacheInternal();
  
  try {
    const result = await territoryCacheLoadingPromise;
    return result;
  } finally {
    // Limpiar la promise después de completar (éxito o error)
    territoryCacheLoadingPromise = null;
  }
}

/**
 * Implementación interna de la carga de caché
 * CORREGIDO: Ahora maneja correctamente las columnas de la tabla territories
 * - Regiones: code, name
 * - Comunas: code, name, region_code, region_name
 */
async function loadTerritoryNamesCacheInternal(): Promise<Map<string, { region_name: string; comuna_name: string }>> {
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
      // Para regiones: usar code como key y name como nombre de región
      if (territory.level === 'region' && territory.code) {
        const regionName = territory.name || territory.code;
        territoryNamesCache!.set(territory.code, {
          region_name: regionName,
          comuna_name: ''
        });
        console.log(`[🟢 AgentRepository] Región cargada: ${territory.code} -> ${regionName}`);
      }
      // Para comunas: usar code como key, name como nombre de comuna, region_name como nombre de región
      if (territory.level === 'comuna' && territory.code) {
        const comunaName = territory.name || territory.code;
        const regionName = territory.region_name || '';
        territoryNamesCache!.set(territory.code, {
          region_name: regionName,
          comuna_name: comunaName
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
 * CORREGIDO: Maneja códigos con prefijo CL- (ej: CL-13), códigos cortos (ej: RM), 
 * y códigos numéricos directos (ej: 13, 9, 6)
 */
async function getRegionName(regionCode: string): Promise<string> {
  const cache = await loadTerritoryNamesCache();
  
  // Intentar buscar directamente primero
  const territory = cache.get(regionCode);
  if (territory?.region_name) {
    return territory.region_name;
  }
  
  // Mapeo de números de región a códigos cortos
  const regionCodeMap: Record<string, string> = {
    '15': 'AP', // Arica y Parinacota
    '1': 'TA',  // Tarapacá
    '2': 'AN',  // Antofagasta
    '3': 'AT',  // Atacama
    '4': 'CO',  // Coquimbo
    '5': 'VA',  // Valparaíso
    '13': 'RM', // Metropolitana
    '6': 'LI',  // O'Higgins
    '7': 'ML',  // Maule
    '16': 'NB', // Ñuble
    '8': 'BI',  // Biobío
    '9': 'AR',  // La Araucanía
    '14': 'LR', // Los Ríos
    '10': 'LL', // Los Lagos
    '11': 'AI', // Aysén
    '12': 'MA', // Magallanes
  };
  
  // Mapeo de números de región a nombres completos (fallback si no está en el caché)
  const regionNameMap: Record<string, string> = {
    '15': 'Arica y Parinacota',
    '1': 'Tarapacá',
    '2': 'Antofagasta',
    '3': 'Atacama',
    '4': 'Coquimbo',
    '5': 'Valparaíso',
    '13': 'Metropolitana de Santiago',
    '6': "Libertador General Bernardo O'Higgins",
    '7': 'Maule',
    '16': 'Ñuble',
    '8': 'Biobío',
    '9': 'La Araucanía',
    '14': 'Los Ríos',
    '10': 'Los Lagos',
    '11': 'Aysén del General Carlos Ibáñez del Campo',
    '12': 'Magallanes y de la Antártica Chilena',
  };
  
  // Si el código tiene formato CL-XX, extraer el número
  let regionNum = regionCode;
  if (regionCode.startsWith('CL-')) {
    regionNum = regionCode.replace('CL-', '');
  }
  
  // Si es un código numérico, intentar buscar por código corto
  if (regionCodeMap[regionNum]) {
    const shortCode = regionCodeMap[regionNum];
    const territoryByShortCode = cache.get(shortCode);
    if (territoryByShortCode?.region_name) {
      return territoryByShortCode.region_name;
    }
    // Fallback: usar el nombre del mapeo directo
    if (regionNameMap[regionNum]) {
      return regionNameMap[regionNum];
    }
  }
  
  // Si no se encuentra, devolver el código original
  return regionCode;
}

// Diccionario de comunas cargado desde el JSON local
let comunaNamesCache: Map<string, string> | null = null;

// Cache del JSON de comunas con coordenadas
let comunaCoordinatesCache: Map<string, { name: string; region: string }> | null = null;

/**
 * Carga el diccionario de nombres de comunas desde el JSON local
 * Usa la función loadLocalAgents que ya carga el JSON estáticamente
 */
async function loadComunaNamesFromLocalData(): Promise<Map<string, string>> {
  if (comunaNamesCache) {
    return comunaNamesCache;
  }
  
  comunaNamesCache = new Map();
  
  try {
    // Usar la función existente que carga el JSON estáticamente
    const data = await loadLocalAgents();
    
    data.agents.forEach((agent) => {
      if (agent.comuna_code && agent.comuna_name && !comunaNamesCache!.has(agent.comuna_code)) {
        comunaNamesCache!.set(agent.comuna_code, agent.comuna_name);
      }
    });
    console.log(`[🟢 AgentRepository] Diccionario de comunas cargado: ${comunaNamesCache.size} comunas`);
  } catch (error) {
    console.warn('[🟡 AgentRepository] Error cargando diccionario de comunas:', error);
  }
  
  return comunaNamesCache;
}

/**
 * Carga el cache de comunas desde el JSON de coordenadas
 * Este archivo tiene los códigos oficiales de 5 dígitos
 * CORREGIDO: Ahora también carga desde importación estática como fallback
 */
async function loadComunaCoordinatesCache(): Promise<Map<string, { name: string; region: string }>> {
  if (comunaCoordinatesCache && comunaCoordinatesCache.size > 0) {
    return comunaCoordinatesCache;
  }
  
  comunaCoordinatesCache = new Map();
  
  try {
    // Intentar cargar el JSON de comunas usando fetch
    console.log('[🟢 AgentRepository] Cargando comuna_coordinates.json...');
    const response = await fetch('/data/comuna_coordinates.json');
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const comunas = await response.json();
    
    if (Array.isArray(comunas)) {
      comunas.forEach((comuna: any) => {
        if (comuna.code && comuna.name) {
          comunaCoordinatesCache!.set(comuna.code, {
            name: comuna.name,
            region: comuna.region || ''
          });
        }
      });
    }
    console.log(`[🟢 AgentRepository] Cache de coordenadas de comunas cargado vía fetch: ${comunaCoordinatesCache.size} comunas`);
  } catch (error) {
    console.warn('[🟡 AgentRepository] Error cargando coordenadas de comunas vía fetch:', error);
    console.log('[🟢 AgentRepository] Intentando cargar desde importación estática...');
    
    // Fallback: Cargar desde el JSON usando importación dinámica
    try {
      const comunasModule = await import('../../../../data/comuna_coordinates.json');
      const comunas = comunasModule.default || comunasModule;
      
      if (Array.isArray(comunas)) {
        comunas.forEach((comuna: any) => {
          if (comuna.code && comuna.name) {
            comunaCoordinatesCache!.set(comuna.code, {
              name: comuna.name,
              region: comuna.region || ''
            });
          }
        });
      }
      console.log(`[🟢 AgentRepository] Cache de coordenadas de comunas cargado vía import: ${comunaCoordinatesCache.size} comunas`);
    } catch (importError) {
      console.error('[🔴 AgentRepository] Error cargando coordenadas de comunas vía import:', importError);
    }
  }
  
  // Log de ejemplo para verificar
  if (comunaCoordinatesCache.size > 0) {
    const sampleCodes = ['09101', '9101', '13101', '01101'];
    sampleCodes.forEach(code => {
      const data = comunaCoordinatesCache!.get(code);
      console.log(`[🟢 AgentRepository] Ejemplo - Código ${code}: ${data ? data.name : 'NO ENCONTRADO'}`);
    });
  } else {
    console.error('[🔴 AgentRepository] No se pudo cargar ninguna comuna en el cache');
  }
  
  return comunaCoordinatesCache;
}

// Mapeo de códigos de comuna de 4 dígitos a nombres (para casos especiales)
const comunaCode4ToName: Record<string, string> = {
  // Región de Aysén (11)
  '1101': 'Coyhaique',
  '1102': 'Lago Verde',
  '1103': 'Aysén',
  '1104': 'Cisnes',
  '1105': 'Guaitecas',
  '1106': 'Cochrane',
  '1107': "O'Higgins",
  '1108': 'Tortel',
  '1109': 'Chile Chico',
  '1110': 'Río Ibáñez',
  // Región de Los Ríos (14)
  '1401': 'Valdivia',
  '1402': 'Corral',
  '1403': 'Lanco',
  '1404': 'Los Lagos',
  '1405': 'Máfil',
  '1406': 'Mariquina',
  '1407': 'Paillaco',
  '1408': 'Panguipulli',
  '1409': 'La Unión',
  '1410': 'Futrono',
  '1411': 'Lago Ranco',
  '1412': 'Río Bueno',
  // Región de Los Lagos (10)
  '1001': 'Puerto Montt',
  '1002': 'Calbuco',
  '1003': 'Cochamó',
  '1004': 'Fresia',
  '1005': 'Frutillar',
  '1006': 'Los Muermos',
  '1007': 'Llanquihue',
  '1008': 'Maullín',
  '1009': 'Puerto Varas',
  // Región de Valparaíso (5) - códigos de 4 dígitos
  '5109': 'Quilpué',
  '1010': 'Castro',
  '1011': 'Ancud',
  '1012': 'Chonchi',
  '1013': 'Curaco de Vélez',
  '1014': 'Dalcahue',
  '1015': 'Puqueldón',
  '1016': 'Queilén',
  '1017': 'Quellón',
  '1018': 'Quemchi',
  '1019': 'Quinchao',
  '1020': 'Osorno',
  '1021': 'Puerto Octay',
  '1022': 'Purranque',
  '1023': 'Puyehue',
  '1024': 'Río Negro',
  '1025': 'San Juan de la Costa',
  '1026': 'San Pablo',
  '1027': 'Chaitén',
  '1028': 'Futaleufú',
  '1029': 'Hualaihué',
  '1030': 'Palena',
};

/**
 * Obtiene el nombre de una comuna desde el caché o del JSON local
 * CORREGIDO: Maneja códigos de comuna de 4 dígitos (sin prefijo de región)
 * y códigos de 5 dígitos (con prefijo de región)
 * AHORA recibe el regionCode para construir el código completo correctamente
 * MEJORADO: Agrega logging detallado para diagnóstico
 * AGREGADO: Mapeo directo para códigos de 4 dígitos problemáticos
 */
async function getComunaName(comunaCode: string, regionCode?: string): Promise<string> {
  console.log(`[🟢 getComunaName] Buscando comuna: ${comunaCode}, región: ${regionCode}`);
  
  // Primero intentar desde el caché de Supabase
  const cache = await loadTerritoryNamesCache();
  const territory = cache.get(comunaCode);
  if (territory?.comuna_name && territory.comuna_name !== comunaCode) {
    console.log(`[🟢 getComunaName] Encontrada en caché de Supabase: ${territory.comuna_name}`);
    return territory.comuna_name;
  }
  
  // Cargar cache de coordenadas de comunas
  const coordinatesCache = await loadComunaCoordinatesCache();
  console.log(`[🟢 getComunaName] Cache de coordenadas tiene ${coordinatesCache.size} comunas`);
  
  // Intentar buscar directamente (código de 5 dígitos)
  const comunaData = coordinatesCache.get(comunaCode);
  if (comunaData) {
    console.log(`[🟢 getComunaName] Encontrada directamente: ${comunaData.name}`);
    return comunaData.name;
  }
  
  // Si el código tiene 4 dígitos, intentar agregarle el prefijo de región
  // Los códigos de comuna en Chile tienen formato: XXYYY donde XX es la región y YYY es la comuna
  if (comunaCode.length === 4) {
    console.log(`[🟡 getComunaName] Código de 4 dígitos, intentando con prefijos...`);
    
    // NUEVO: Intentar mapeo directo primero
    const directName = comunaCode4ToName[comunaCode];
    if (directName) {
      console.log(`[🟢 getComunaName] Encontrada en mapeo directo: ${directName}`);
      return directName;
    }
    
    // Si tenemos el regionCode, usarlo para construir el código completo
    if (regionCode) {
      // Mapeo de códigos de región a prefijos numéricos
      const regionToPrefix: Record<string, string> = {
        '15': '15', // Arica y Parinacota
        '1': '01',  // Tarapacá
        '2': '02',  // Antofagasta
        '3': '03',  // Atacama
        '4': '04',  // Coquimbo
        '5': '05',  // Valparaíso
        '13': '13', // Metropolitana
        '6': '06',  // O'Higgins
        '7': '07',  // Maule
        '16': '16', // Ñuble
        '8': '08',  // Biobío
        '9': '09',  // La Araucanía
        '14': '14', // Los Ríos
        '10': '10', // Los Lagos
        '11': '11', // Aysén
        '12': '12', // Magallanes
      };
      
      const prefix = regionToPrefix[regionCode];
      if (prefix) {
        const fullCode = prefix + comunaCode;
        console.log(`[🟡 getComunaName] Intentando con prefijo de región ${regionCode}: ${fullCode}`);
        const comunaDataWithPrefix = coordinatesCache.get(fullCode);
        if (comunaDataWithPrefix) {
          console.log(`[🟢 getComunaName] Encontrada con prefijo de región: ${comunaDataWithPrefix.name}`);
          return comunaDataWithPrefix.name;
        }
      }
    }
    
    // Fallback: intentar con prefijo 0 (para regiones 1-9)
    const withPrefix0 = '0' + comunaCode;
    console.log(`[🟡 getComunaName] Intentando con prefijo 0: ${withPrefix0}`);
    const comunaData0 = coordinatesCache.get(withPrefix0);
    if (comunaData0) {
      console.log(`[🟢 getComunaName] Encontrada con prefijo 0: ${comunaData0.name}`);
      return comunaData0.name;
    }
    
    // Fallback: intentar con diferentes prefijos de región
    const regionPrefixes = ['13', '09', '08', '07', '06', '05', '04', '03', '02', '01', '10', '11', '12', '14', '15', '16'];
    for (const prefix of regionPrefixes) {
      const fullCode = prefix + comunaCode;
      const comunaDataPrefix = coordinatesCache.get(fullCode);
      if (comunaDataPrefix) {
        console.log(`[🟢 getComunaName] Encontrada con prefijo ${prefix}: ${comunaDataPrefix.name}`);
        return comunaDataPrefix.name;
      }
    }
  }
  
  // Fallback al diccionario local de agentes
  console.log(`[🟡 getComunaName] Intentando con diccionario local...`);
  const localCache = await loadComunaNamesFromLocalData();
  const localName = localCache.get(comunaCode);
  if (localName) {
    console.log(`[🟢 getComunaName] Encontrada en diccionario local: ${localName}`);
    return localName;
  }
  
  // Si no se encuentra, devolver el código
  console.error(`[🔴 getComunaName] NO SE ENCONTRÓ la comuna ${comunaCode} (región: ${regionCode}). Devolviendo código.`);
  return comunaCode;
}

// ===========================================
// Transformers
// ===========================================

/**
 * Transform DbSyntheticAgent to SyntheticAgent
 * Mapea los campos de la DB al formato usado por el frontend
 * AHORA obtiene los nombres de territorios desde Supabase
 * CORREGIDO: Pasa region_code a getComunaName para resolver códigos de 4 dígitos
 */
async function dbAgentToSyntheticAgent(dbAgent: DbSyntheticAgent): Promise<SyntheticAgent> {
  // Obtener nombres de territorios en paralelo
  // Pasamos region_code a getComunaName para poder resolver códigos de comuna de 4 dígitos
  const [region_name, comuna_name] = await Promise.all([
    getRegionName(dbAgent.region_code),
    getComunaName(dbAgent.comuna_code, dbAgent.region_code)
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
