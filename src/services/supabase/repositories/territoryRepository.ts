/**
 * Territory Repository - Sprint 9
 * 
 * Acceso a datos de territorios desde Supabase.
 * Fallback a datos locales si Supabase no está disponible.
 * 
 * ACTUALIZADO: 2026-03-16 - Modelo Alineado v2.0
 * - Soporta códigos cortos (RM, VA, etc.)
 * - Usa campos: level, code, name, centroid
 */

import { getSupabaseClient } from '../client';
import type { 
  DbTerritory, 
  TerritoryFilters, 
  PaginatedResult 
} from '../../../types/database';

// Fallback data (importado estáticamente para offline)
import { chileRegions } from '../../../data/chileRegions';

// ===========================================
// Types
// ===========================================

export interface Territory {
  code: string;
  name: string;
  centroid: [number, number] | null;
}

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
    orderBy = 'name',
    orderDirection = 'asc',
  } = options;

  const client = await getSupabaseClient();
  
  if (!client) {
    console.log('[🔵 TerritoryRepository] Usando FALLBACK LOCAL para getTerritories');
    return getLocalFallbackTerritories(options);
  }

  try {
    console.log('[🔵 TerritoryRepository] Leyendo de SUPABASE: getTerritories');
    let query = client
      .from('territories')
      .select('*', { count: 'exact' });

    // Apply filters
    if (filters.regionCode) {
      // NUEVO: Filtrar por code (código corto) o region_code
      query = query.or(`code.eq.${filters.regionCode},region_code.eq.${filters.regionCode}`);
    }
    if (filters.comunaCode) {
      query = query.eq('code', filters.comunaCode);
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

    console.log(`[🔵 TerritoryRepository] ✅ Datos de SUPABASE: ${data?.length || 0} territorios`);
    return {
      data: (data as DbTerritory[]) || [],
      total: count || 0,
      page,
      pageSize,
      hasMore: (count || 0) > to + 1,
    };
  } catch (error) {
    console.warn('[🟡 TerritoryRepository] Error en DB, usando fallback:', error);
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
 * Get territory by code (código corto: RM, VA, 13101, etc.)
 * NUEVO: Reemplaza getTerritoryByComunaCode
 */
export async function getTerritoryByCode(code: string): Promise<DbTerritory | null> {
  const client = await getSupabaseClient();
  
  if (!client) {
    return getLocalTerritoryByCode(code);
  }

  try {
    const { data, error } = await client
      .from('territories')
      .select('*')
      .eq('code', code)
      .single();

    if (error) throw error;
    return data as DbTerritory | null;
  } catch (error) {
    console.warn('[TerritoryRepository] Query failed, using fallback:', error);
    return getLocalTerritoryByCode(code);
  }
}

/**
 * @deprecated Use getTerritoryByCode instead
 */
export async function getTerritoryByComunaCode(comunaCode: string): Promise<DbTerritory | null> {
  return getTerritoryByCode(comunaCode);
}

/**
 * Get all regions
 * NOTA: Usa region_code y region_name que son las columnas existentes en DB
 */
export async function getRegions(): Promise<Territory[]> {
  console.log('[🟢 TerritoryRepository] getRegions() - Intentando leer de Supabase...');
  const client = await getSupabaseClient();
  
  if (!client) {
    console.log('[🟡 TerritoryRepository] Supabase no disponible, usando fallback local');
    const local = getLocalRegions();
    console.log(`[🟡 TerritoryRepository] Fallback local: ${local.length} regiones`);
    return local;
  }

  try {
    console.log('[🟢 TerritoryRepository] Ejecutando query a territories...');
    const { data, error } = await client
      .from('territories')
      .select('region_code, region_name, centroid')
      .eq('level', 'region')
      .order('region_code');

    if (error) {
      console.error('[🔴 TerritoryRepository] Error en query:', error);
      throw error;
    }

    // Mapear usando region_code y region_name
    const regions = (data || []).map((t: any) => ({
      code: t.region_code,
      name: t.region_name,
      centroid: t.centroid,
    }));
    console.log(`[🟢 TerritoryRepository] ✅ Datos de SUPABASE: ${regions.length} regiones`);
    return regions;
  } catch (error) {
    console.warn('[🟡 TerritoryRepository] Query failed, usando fallback:', error);
    const local = getLocalRegions();
    console.log(`[🟡 TerritoryRepository] Fallback local: ${local.length} regiones`);
    return local;
  }
}

/**
 * Get comunas by region code
 * NUEVO: Usa region_code para filtrar comunas de una región
 * NOTA: Usa comuna_code y comuna_name que son las columnas existentes en DB
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
      .eq('level', 'comuna')
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
    // Contar regiones
    const { count: totalRegions, error: regionsError } = await client
      .from('territories')
      .select('*', { count: 'exact', head: true })
      .eq('level', 'region');

    if (regionsError) throw regionsError;

    // Contar comunas
    const { count: totalComunas, error: comunasError } = await client
      .from('territories')
      .select('*', { count: 'exact', head: true })
      .eq('level', 'comuna');

    if (comunasError) throw comunasError;

    // Sumar población
    const { data: popData, error: popError } = await client
      .from('territories')
      .select('population_total');

    if (popError) throw popError;

    const totalPopulation = (popData || []).reduce((sum: number, t: { population_total: number | null }) => 
      sum + (t.population_total || 0), 0
    ) || null;

    return {
      totalRegions: totalRegions || 0,
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
 * NOTA: Usa region_name y comuna_name para búsqueda
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
      .or(`region_name.ilike.%${query}%,comuna_name.ilike.%${query}%`)
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
  // Convert chileRegions to DbTerritory format usando el nuevo modelo
  const allTerritories: DbTerritory[] = chileRegions.map(region => ({
    id: `local-${region.code}`,
    level: 'region',
    code: region.code,
    name: region.name,
    region_code: null,
    region_name: null,
    centroid: region.centroid || null,
    geometry: null,
    bbox: null,
    population_total: region.population || null,
    population_urban: null,
    population_rural: null,
    source: 'local',
    source_year: 2024,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }));

  // Apply filters
  let filtered = allTerritories;
  if (options.filters?.regionCode) {
    filtered = filtered.filter(t => 
      t.code === options.filters!.regionCode || 
      t.region_code === options.filters!.regionCode
    );
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

function getLocalTerritoryByCode(code: string): DbTerritory | null {
  const all = getLocalFallbackTerritories({ page: 1, pageSize: 10000 });
  return all.data.find(t => t.code === code) || null;
}

function getLocalRegions(): Pick<DbTerritory, 'code' | 'name' | 'centroid'>[] {
  return chileRegions.map(r => ({
    code: r.code,
    name: r.name,
    centroid: r.centroid || null,
  }));
}

function getLocalComunasByRegion(regionCode: string): DbTerritory[] {
  // En datos locales, no tenemos comunas, solo regiones
  // Retornar array vacío o la región misma si coincide
  const region = chileRegions.find(r => r.code === regionCode);
  if (!region) return [];
  
  return [{
    id: `local-${region.code}`,
    level: 'region',
    code: region.code,
    name: region.name,
    region_code: null,
    region_name: null,
    centroid: region.centroid || null,
    geometry: null,
    bbox: null,
    population_total: region.population || null,
    population_urban: null,
    population_rural: null,
    source: 'local',
    source_year: 2024,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }];
}

function getLocalTerritoryStats(): TerritoryStats {
  return {
    totalRegions: chileRegions.length,
    totalComunas: 0, // No tenemos comunas en datos locales
    totalPopulation: chileRegions.reduce((sum, r) => sum + (r.population || 0), 0) || null,
  };
}

function searchLocalTerritories(query: string): DbTerritory[] {
  const all = getLocalFallbackTerritories({ page: 1, pageSize: 10000 });
  const lowerQuery = query.toLowerCase();
  
  return all.data.filter(t => 
    (t.region_name?.toLowerCase().includes(lowerQuery) ?? false) ||
    (t.name?.toLowerCase().includes(lowerQuery) ?? false)
  ).slice(0, 20);
}

// ===========================================
// Transformers
// ===========================================

/**
 * Transform DbTerritory to Territory (simplified format)
 * NOTE: Currently unused but kept for future use
 */
export function dbToTerritory(dbTerritory: DbTerritory): Territory {
  return {
    code: dbTerritory.code,
    name: dbTerritory.name,
    centroid: dbTerritory.centroid,
  };
}
