/**
 * Synthetic Agents Data Loader
 * 
 * Carga los agentes sintéticos desde el JSON empaquetado en el bundle.
 * Esto elimina la dependencia de archivos externos en producción.
 */

import type { SyntheticAgentsData, SyntheticAgent } from '../types/agent';
// Importar el JSON directamente para que se empaquete en el bundle
import agentsDataJson from '../../data/processed/synthetic_agents_v1.json';

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
 * Get unique regions from agents
 */
export async function getUniqueRegions(): Promise<Array<{ code: string; name: string }>> {
  const agents = await getAllAgents();
  const regionMap = new Map<string, string>();
  
  agents.forEach(agent => {
    if (!regionMap.has(agent.region_code)) {
      regionMap.set(agent.region_code, agent.region_name);
    }
  });
  
  return Array.from(regionMap.entries()).map(([code, name]) => ({ code, name }));
}

/**
 * Get unique communes from agents (optionally filtered by region)
 */
export async function getUniqueCommunes(regionCode?: string): Promise<Array<{ code: string; name: string }>> {
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