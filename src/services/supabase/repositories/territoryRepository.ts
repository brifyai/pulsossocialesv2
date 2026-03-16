/**
 * Territory Repository - Sprint 9
 * 
 * Acceso a datos de territorios desde Supabase.
 * Fallback a datos locales si Supabase no está disponible.
 */

import { getSupabaseClient } from '../client';
import type { 
  DbTerritory, 
  TerritoryFilters, 
  PaginatedResult 
} from '../../../types/database';

// Fallback data (importado estáticamente para offline)
import { chileRegions, chileRegionsGeoJSON } from '../../../data/chileRegions';

// ===========================================
// Types
// ===========================================

export interface TerritoryListOptions {
  page?: number;
  pageSize?: number;
  filters?: TerritoryFilters;
  orderBy?: keyof DbTerritory;
  orderDirection?: 'asc' | 'desc';
}

export interface TerritoryStats {
  totalRegions: number;
  totalComunas: number;
  totalPopulation: number | null;
}

// ===========================================
// Repository Functions
// ===========================================

/**
 * Get all territories with optional filtering and pagination
 */
export async function getTerritories(
  options: TerritoryListOptions = {}
): Promise<PaginatedResult<DbTerritory>> {
  const {
    page = 1,
    pageSize = 50,
    filters = {},
    orderBy = 'comuna_name',
    orderDirection = 'asc',
  } = options;

  const client = await getSupabaseClient();
  
  if (!client) {
    // Fallback a datos locales
    return getLocalFallbackTerritories(options);
  }

  try {
    let query = client
      .from('territories')
      .select('*', { count: 'exact' });

    // Apply filters
    if (filters.regionCode) {
      query = query.eq('region_code', filters.regionCode);
    }
    if (filters.comunaCode) {
      query = query.eq('comuna_code', filters.comunaCode);
    }
    if (filters.urbanicity) {
      query = query.eq('urbanicity', filters.urbanicity);
    }

    // Apply ordering and pagination
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const { data, error, count } = await query
      .order(orderBy, { ascending: orderDirection === 'asc' })
      .range(from, to);

    if (error) throw error;

    return {
      data: (data as DbTerritory[]) || [],
      total: count || 0,
      page,
      pageSize,
      hasMore: (count || 0) > to + 1,
    };
  } catch (error) {
    console.warn('[TerritoryRepository] Query failed, using fallback:', error);
    return getLocalFallbackTerritories(options);
  }
}

/**
 * Get a single territory by ID
 */
export async function getTerritoryById(id: string): Promise<DbTerritory | null> {
  const client = await getSupabaseClient();
  
  if (!client) {
    return getLocalTerritoryById(id);
  }

  try {
    const { data, error } = await client
      .from('territories')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data as DbTerritory | null;
  } catch (error) {
    console.warn('[TerritoryRepository] Query failed, using fallback:', error);
    return getLocalTerritoryById(id);
  }
}

/**
 * Get territory by comuna code
 */
export async function getTerritoryByComunaCode(comunaCode: string): Promise<DbTerritory | null> {
  const client = await getSupabaseClient();
  
  if (!client) {
    return getLocalTerritoryByComunaCode(comunaCode);
  }

  try {
    const { data, error } = await client
      .from('territories')
      .select('*')
      .eq('comuna_code', comunaCode)
      .single();

    if (error) throw error;
    return data as DbTerritory | null;
  } catch (error) {
    console.warn('[TerritoryRepository] Query failed, using fallback:', error);
    return getLocalTerritoryByComunaCode(comunaCode);
  }
}

/**
 * Get all regions (unique)
 */
export async function getRegions(): Promise<Pick<DbTerritory, 'region_code' | 'region_name' | 'region_name_official'>[]> {
  const client = await getSupabaseClient();
  
  if (!client) {
    return getLocalRegions();
  }

  try {
    const { data, error } = await client
      .from('territories')
      .select('region_code, region_name, region_name_official')
      .order('region_code');

    if (error) throw error;

    // Remove duplicates
    const unique = new Map<string, Pick<DbTerritory, 'region_code' | 'region_name' | 'region_name_official'>>();
    (data || []).forEach((t: Pick<DbTerritory, 'region_code' | 'region_name' | 'region_name_official'>) => {
      if (!unique.has(t.region_code)) {
        unique.set(t.region_code, t);
      }
    });

    return Array.from(unique.values());
  } catch (error) {
    console.warn('[TerritoryRepository] Query failed, using fallback:', error);
    return getLocalRegions();
  }
}

/**
 * Get comunas by region
 */
export async function getComunasByRegion(regionCode: string): Promise<DbTerritory[]> {
  const client = await getSupabaseClient();
  
  if (!client) {
    return getLocalComunasByRegion(regionCode);
  }

  try {
    const { data, error } = await client
      .from('territories')
      .select('*')
      .eq('region_code', regionCode)
      .order('comuna_name');

    if (error) throw error;
    return (data as DbTerritory[]) || [];
  } catch (error) {
    console.warn('[TerritoryRepository] Query failed, using fallback:', error);
    return getLocalComunasByRegion(regionCode);
  }
}

/**
 * Get territory statistics
 */
export async function getTerritoryStats(): Promise<TerritoryStats> {
  const client = await getSupabaseClient();
  
  if (!client) {
    return getLocalTerritoryStats();
  }

  try {
    const { count: totalComunas, error: countError } = await client
      .from('territories')
      .select('*', { count: 'exact', head: true });

    if (countError) throw countError;

    const { data: regions, error: regionsError } = await client
      .from('territories')
      .select('region_code')
      .order('region_code');

    if (regionsError) throw regionsError;

    const uniqueRegions = new Set((regions || []).map((r: { region_code: string }) => r.region_code));

    // Sum population if available
    const { data: popData, error: popError } = await client
      .from('territories')
      .select('population_total');

    if (popError) throw popError;

    const totalPopulation = (popData || []).reduce((sum: number, t: { population_total: number | null }) => 
      sum + (t.population_total || 0), 0
    ) || null;

    return {
      totalRegions: uniqueRegions.size,
      totalComunas: totalComunas || 0,
      totalPopulation: totalPopulation || null,
    };
  } catch (error) {
    console.warn('[TerritoryRepository] Query failed, using fallback:', error);
    return getLocalTerritoryStats();
  }
}

/**
 * Search territories by name
 */
export async function searchTerritories(query: string): Promise<DbTerritory[]> {
  const client = await getSupabaseClient();
  
  if (!client) {
    return searchLocalTerritories(query);
  }

  try {
    const { data, error } = await client
      .from('territories')
      .select('*')
      .or(`comuna_name.ilike.%${query}%,region_name.ilike.%${query}%`)
      .limit(20);

    if (error) throw error;
    return (data as DbTerritory[]) || [];
  } catch (error) {
    console.warn('[TerritoryRepository] Query failed, using fallback:', error);
    return searchLocalTerritories(query);
  }
}

// ===========================================
// Local Fallback Functions
// ===========================================

function getLocalFallbackTerritories(options: TerritoryListOptions): PaginatedResult<DbTerritory> {
  // Convert chileRegions to DbTerritory format using GeoJSON features
  const allTerritories: DbTerritory[] = [];
  
  // Extract comunas from GeoJSON features
  const features = chileRegionsGeoJSON.features;
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  features.forEach((feature: any) => {
    const props = feature.properties as { 
      code: string; 
      name: string; 
      population?: number;
      centroid?: [number, number];
    } | undefined;
    
    if (props && feature.geometry) {
      // Find region info
      const region = chileRegions.find(r => r.code === props.code);
      
      allTerritories.push({
        id: `local-${props.code}`,
        country_code: 'CL',
        region_code: props.code,
        region_name: region?.name || props.name,
        region_name_official: region?.name || props.name,
        comuna_code: props.code,
        comuna_name: props.name,
        geometry: feature.geometry,
        bbox: feature.bbox as [number, number, number, number] || [-70, -30, -70, -30],
        population_total: props.population || null,
        population_urban: null,
        population_rural: null,
        area_km2: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        data_version: 'local-v1',
        source_files: ['chileRegions.ts'],
      });
    }
  });

  // Apply filters
  let filtered = allTerritories;
  if (options.filters?.regionCode) {
    filtered = filtered.filter(t => t.region_code === options.filters!.regionCode);
  }

  // Apply pagination
  const page = options.page || 1;
  const pageSize = options.pageSize || 50;
  const from = (page - 1) * pageSize;
  const to = from + pageSize;
  const paginated = filtered.slice(from, to);

  return {
    data: paginated,
    total: filtered.length,
    page,
    pageSize,
    hasMore: filtered.length > to,
  };
}

function getLocalTerritoryById(id: string): DbTerritory | null {
  const all = getLocalFallbackTerritories({ page: 1, pageSize: 10000 });
  return all.data.find(t => t.id === id) || null;
}

function getLocalTerritoryByComunaCode(comunaCode: string): DbTerritory | null {
  const all = getLocalFallbackTerritories({ page: 1, pageSize: 10000 });
  return all.data.find(t => t.comuna_code === comunaCode) || null;
}

function getLocalRegions(): Pick<DbTerritory, 'region_code' | 'region_name' | 'region_name_official'>[] {
  return chileRegions.map(r => ({
    region_code: r.code,
    region_name: r.name,
    region_name_official: r.name,
  }));
}

function getLocalComunasByRegion(regionCode: string): DbTerritory[] {
  const all = getLocalFallbackTerritories({ 
    page: 1, 
    pageSize: 10000,
    filters: { regionCode }
  });
  return all.data;
}

function getLocalTerritoryStats(): TerritoryStats {
  // Count features in GeoJSON
  const totalComunas = chileRegionsGeoJSON.features.length;
  
  // Sum population from regions
  const totalPopulation = chileRegions.reduce((sum, r) => sum + (r.population || 0), 0);

  return {
    totalRegions: chileRegions.length,
    totalComunas,
    totalPopulation: totalPopulation || null,
  };
}

function searchLocalTerritories(query: string): DbTerritory[] {
  const all = getLocalFallbackTerritories({ page: 1, pageSize: 10000 });
  const lowerQuery = query.toLowerCase();
  
  return all.data.filter(t => 
    t.comuna_name.toLowerCase().includes(lowerQuery) ||
    t.region_name.toLowerCase().includes(lowerQuery)
  ).slice(0, 20);
}
