/**
 * Synthetic Agents Data Loader
 * 
 * Carga los agentes sintéticos desde el JSON empaquetado en el bundle.
 * Esto elimina la dependencia de archivos externos en producción.
 * 
 * ACTUALIZADO: 2026-03-29 - getUniqueRegions y getUniqueCommunes ahora usan Supabase
 */

import type { SyntheticAgentsData, SyntheticAgent } from '../types/agent';
// Importar el JSON directamente para que se empaquete en el bundle
import agentsDataJson from '../../data/processed/synthetic_agents_v1.json';
import { getRegions, getComunasByRegion } from '../services/supabase/repositories/territoryRepository';

let cachedData: SyntheticAgentsData | null = null;

/**
 * Load synthetic agents data from bundled JSON
 * Los datos se importan estáticamente para funcionar en producción
 */
export async function loadSyntheticAgents(): Promise<SyntheticAgentsData> {
  if (cachedData) {
    return cachedData;
  }

  try {
    // Usar los datos importados estáticamente
    const data: SyntheticAgentsData = agentsDataJson as SyntheticAgentsData;
    cachedData = data;
    
    console.log(`📊 Loaded ${data.agents.length} synthetic agents (batch: ${data.metadata.batch_id})`);
    
    return data;
  } catch (error) {
    console.error('❌ Error loading synthetic agents:', error);
    throw error;
  }
}

/**
 * Get all agents
 */
export async function getAllAgents(): Promise<SyntheticAgent[]> {
  const data = await loadSyntheticAgents();
  return data.agents;
}

/**
 * Get unique regions from Supabase territories table
 * NOTA: Ahora consulta Supabase en lugar de los datos locales de agentes
 */
export async function getUniqueRegions(): Promise<Array<{ code: string; name: string }>> {
  try {
    const regions = await getRegions();
    return regions.map(r => ({ code: r.code, name: r.name }));
  } catch (error) {
    console.warn('[syntheticAgents] Error fetching regions from Supabase, falling back to local agents:', error);
    // Fallback: usar datos locales de agentes
    const agents = await getAllAgents();
    const regionMap = new Map<string, string>();
    
    agents.forEach(agent => {
      if (!regionMap.has(agent.region_code)) {
        regionMap.set(agent.region_code, agent.region_name);
      }
    });
    
    return Array.from(regionMap.entries()).map(([code, name]) => ({ code, name }));
  }
}

/**
 * Get unique communes from Supabase territories table (optionally filtered by region)
 * NOTA: Ahora consulta Supabase en lugar de los datos locales de agentes
 */
export async function getUniqueCommunes(regionCode?: string): Promise<Array<{ code: string; name: string }>> {
  try {
    if (regionCode) {
      const comunas = await getComunasByRegion(regionCode);
      return comunas.map(c => ({ code: c.code, name: c.name }));
    } else {
      // Si no hay región específica, retornar todas las comunas
      // Nota: getComunasByRegion no tiene opción para "todas", así que usamos fallback
      const agents = await getAllAgents();
      const comunaMap = new Map<string, string>();
      
      agents.forEach(agent => {
        const key = `${agent.region_code}-${agent.comuna_code}`;
        if (!comunaMap.has(key)) {
          comunaMap.set(key, agent.comuna_name);
        }
      });
      
      return Array.from(comunaMap.entries()).map(([key, name]) => {
        const code = key.split('-')[1];
        return { code, name };
      });
    }
  } catch (error) {
    console.warn('[syntheticAgents] Error fetching communes from Supabase, falling back to local agents:', error);
    // Fallback: usar datos locales de agentes
    const agents = await getAllAgents();
    const comunaMap = new Map<string, string>();
    
    agents.forEach(agent => {
      if (!regionCode || agent.region_code === regionCode) {
        const key = `${agent.region_code}-${agent.comuna_code}`;
        if (!comunaMap.has(key)) {
          comunaMap.set(key, agent.comuna_name);
        }
      }
    });
    
    return Array.from(comunaMap.entries()).map(([key, name]) => {
      const code = key.split('-')[1];
      return { code, name };
    });
  }
}

/**
 * Filter agents based on criteria
 */
export async function filterAgents(filters: {
  regionCode?: string;
  comunaCode?: string;
  sex?: string;
  ageGroup?: string;
  incomeDecile?: number;
  educationLevel?: string;
  connectivityLevel?: string;
  agentType?: string;
}): Promise<SyntheticAgent[]> {
  const agents = await getAllAgents();
  
  return agents.filter(agent => {
    if (filters.regionCode && agent.region_code !== filters.regionCode) return false;
    if (filters.comunaCode && agent.comuna_code !== filters.comunaCode) return false;
    if (filters.sex && agent.sex !== filters.sex) return false;
    if (filters.ageGroup && agent.age_group !== filters.ageGroup) return false;
    if (filters.incomeDecile && agent.income_decile !== filters.incomeDecile) return false;
    if (filters.educationLevel && agent.education_level !== filters.educationLevel) return false;
    if (filters.connectivityLevel && agent.connectivity_level !== filters.connectivityLevel) return false;
    if (filters.agentType && agent.agent_type !== filters.agentType) return false;
    return true;
  });
}

/**
 * Get agent by ID
 */
export async function getAgentById(agentId: string): Promise<SyntheticAgent | undefined> {
  const agents = await getAllAgents();
  return agents.find(agent => agent.agent_id === agentId);
}

/**
 * Get metadata
 */
export async function getAgentsMetadata() {
  const data = await loadSyntheticAgents();
  return data.metadata;
}

/**
 * Clear cache (useful for testing or reloading)
 */
export function clearCache(): void {
  cachedData = null;
}