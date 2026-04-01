/**
 * User Metrics Service
 * Servicio para obtener métricas reales del usuario para el perfil
 */

import { getSupabaseClient } from './supabase/client';
import { getAgentStats } from './supabase/repositories/agentRepository';
import { getSurveyDefinitions } from './supabase/repositories/surveyRepository';

export interface UserMetrics {
  // Agentes
  totalAgents: number;
  // Encuestas
  totalSurveys: number;
  totalRuns: number;
  // Territorios
  totalRegions: number;
  totalCommunes: number;
}

export interface UserMetricsWithFormatted extends UserMetrics {
  formatted: {
    agents: string;
    surveys: string;
    territories: string;
  };
}

/**
 * Obtiene métricas reales del usuario desde la base de datos
 */
export async function getUserMetrics(): Promise<UserMetricsWithFormatted> {
  const client = await getSupabaseClient();

  if (!client) {
    console.warn('[UserMetrics] Supabase no disponible, usando valores por defecto');
    return getDefaultMetrics();
  }

  try {
    // 1. Obtener estadísticas de agentes
    const agentStats = await getAgentStats();
    const totalAgents = agentStats.totalAgents;

    // 2. Obtener conteo de encuestas
    const surveys = await getSurveyDefinitions();
    const totalSurveys = surveys.length;

    // 3. Obtener conteo de runs (usando RPC o query directa)
    const { count: totalRuns, error: runsError } = await client
      .from('survey_runs')
      .select('*', { count: 'exact', head: true });

    if (runsError) {
      console.warn('[UserMetrics] Error obteniendo runs:', runsError);
    }

    // 4. Obtener conteo de regiones
    const { count: totalRegions, error: regionsError } = await client
      .from('territories')
      .select('*', { count: 'exact', head: true })
      .eq('level', 'region');

    if (regionsError) {
      console.warn('[UserMetrics] Error obteniendo regiones:', regionsError);
    }

    // 5. Obtener conteo de comunas
    const { count: totalCommunes, error: communesError } = await client
      .from('territories')
      .select('*', { count: 'exact', head: true })
      .eq('level', 'comuna');

    if (communesError) {
      console.warn('[UserMetrics] Error obteniendo comunas:', communesError);
    }

    const metrics: UserMetrics = {
      totalAgents,
      totalSurveys,
      totalRuns: totalRuns || 0,
      totalRegions: totalRegions || 16,
      totalCommunes: totalCommunes || 346,
    };

    return {
      ...metrics,
      formatted: formatMetrics(metrics),
    };
  } catch (error) {
    console.error('[UserMetrics] Error obteniendo métricas:', error);
    return getDefaultMetrics();
  }
}

/**
 * Formatea las métricas para mostrar en la UI
 * Muestra el número exacto con separadores de miles
 */
function formatMetrics(metrics: UserMetrics): {
  agents: string;
  surveys: string;
  territories: string;
} {
  // Formatear con separadores de miles (número exacto)
  const formatWithSeparators = (num: number): string => {
    return num.toLocaleString('es-CL');
  };

  return {
    agents: formatWithSeparators(metrics.totalAgents),
    surveys: formatWithSeparators(metrics.totalSurveys),
    territories: `${metrics.totalRegions} / ${metrics.totalCommunes}`,
  };
}

/**
 * Formatea un número para mostrar en formato compacto (para uso opcional)
 * Ejemplo: 19500000 -> 19.5M, 25000 -> 25K
 */
export function formatNumberCompact(num: number): string {
  if (num >= 1_000_000) {
    return (num / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
  }
  if (num >= 1_000) {
    return (num / 1_000).toFixed(1).replace(/\.0$/, '') + 'K';
  }
  return num.toLocaleString('es-CL');
}

/**
 * Métricas por defecto cuando no hay conexión a Supabase
 */
function getDefaultMetrics(): UserMetricsWithFormatted {
  const metrics: UserMetrics = {
    totalAgents: 0,
    totalSurveys: 0,
    totalRuns: 0,
    totalRegions: 16,
    totalCommunes: 346,
  };

  return {
    ...metrics,
    formatted: {
      agents: '0',
      surveys: '0',
      territories: '16 / 346',
    },
  };
}

/**
 * Hook para usar métricas en componentes (carga lazy)
 */
export function useUserMetrics(
  onMetricsLoaded: (metrics: UserMetricsWithFormatted) => void,
  onError?: (error: Error) => void
): { refresh: () => void } {
  const loadMetrics = async () => {
    try {
      const metrics = await getUserMetrics();
      onMetricsLoaded(metrics);
    } catch (error) {
      console.error('[UserMetrics] Error cargando métricas:', error);
      if (onError) {
        onError(error instanceof Error ? error : new Error(String(error)));
      }
    }
  };

  // Cargar métricas inmediatamente
  loadMetrics();

  return {
    refresh: loadMetrics,
  };
}
