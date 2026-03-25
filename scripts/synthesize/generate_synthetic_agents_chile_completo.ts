/**
 * Generate Synthetic Agents - Chile Completo (v2)
 *
 * DESCARGA los 25,000 agentes reales desde la tabla `synthetic_agents` en Supabase
 * y les asigna coordenadas GPS basadas en su comuna_code.
 *
 * INPUT:
 *   - Tabla `synthetic_agents` en Supabase (25,000 agentes reales)
 *   - data/comuna_coordinates.json (coordenadas de todas las comunas)
 *
 * OUTPUT:
 *   - data/processed/synthetic_agents_chile_completo.json
 *
 * ETAPA: Síntesis desde datos reales de Supabase
 */

import * as fs from 'fs';
import * as path from 'path';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Paths
const COMUNA_COORDINATES = path.join(process.cwd(), 'data/comuna_coordinates.json');
const OUTPUT_PATH = path.join(process.cwd(), 'data/processed/synthetic_agents_chile_completo.json');

// Configuración de Supabase
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';

// Mapeo de nombres de región a códigos
const REGION_CODE_MAP: Record<string, string> = {
  'Arica y Parinacota': 'AP',
  'Tarapacá': 'TA',
  'Antofagasta': 'AN',
  'Atacama': 'AT',
  'Coquimbo': 'CO',
  'Valparaíso': 'VA',
  'Metropolitana': 'RM',
  "O'Higgins": 'LI',
  'Maule': 'ML',
  'Ñuble': 'NB',
  'Biobío': 'BI',
  'La Araucanía': 'AR',
  'Los Ríos': 'LR',
  'Los Lagos': 'LL',
  'Aysén': 'AI',
  'Magallanes': 'MA'
};

/**
 * Schema: SyntheticAgentV2 (basado en la tabla real de Supabase)
 */
export interface SyntheticAgentV2 {
  // Identificación
  id: string;
  agent_id: string;
  batch_id: string;
  version: string;
  created_at: string;
  updated_at: string;

  // Ubicación
  country_code: string;
  region_code: string;
  comuna_code: string;
  province_code: string | null;
  urbanicity: 'urban' | 'rural' | 'periurban';
  location_lat: number | null;
  location_lng: number | null;

  // Demografía
  sex: 'male' | 'female' | 'other';
  age: number;
  age_group: string;

  // Socioeconómico
  household_type: string | null;
  poverty_status: string | null;
  education_level: string | null;
  occupation_status: string | null;
  occupation_group: string | null;
  socioeconomic_level: string | null;
  income_decile: number | null;

  // Digital
  connectivity_level: string | null;
  digital_exposure_level: string | null;
  preferred_survey_channel: string | null;
  has_smartphone: boolean | null;
  has_computer: boolean | null;
  internet_quality: string | null;

  // Traceabilidad
  backbone_key: string | null;
  subtel_profile_key: string | null;
  casen_profile_key: string | null;
  synthesis_version: string | null;
  generation_notes: string | null;
  agent_type: string | null;

  // Metadata
  metadata: Record<string, unknown> | null;

  // Campos de código Censo (agregados posteriormente)
  sex_code: number | null;
  age_group_code: number | null;
  education_level_code: string | null;
  occupation_status_code: number | null;
  occupation_category_code: number | null;
  ciuo_code: string | null;
  caenes_code: string | null;
  marital_status_code: number | null;
  indigenous_people_code: number | null;
  disability_status_code: number | null;
}

interface ComunaData {
  code: string;
  name: string;
  lat: number;
  lng: number;
  region: string;
}

/**
 * Cargar datos de comunas con coordenadas
 */
function loadComunaCoordinates(): Map<string, ComunaData> {
  if (!fs.existsSync(COMUNA_COORDINATES)) {
    throw new Error(`Archivo no encontrado: ${COMUNA_COORDINATES}`);
  }
  const data: ComunaData[] = JSON.parse(fs.readFileSync(COMUNA_COORDINATES, 'utf-8'));
  const map = new Map<string, ComunaData>();
  for (const comuna of data) {
    map.set(comuna.code, comuna);
  }
  console.log(`📍 Cargadas ${map.size} comunas con coordenadas`);
  return map;
}

/**
 * Inicializar cliente de Supabase
 */
function createSupabaseClient(): SupabaseClient {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error(
      'Variables de entorno SUPABASE_URL y SUPABASE_ANON_KEY son requeridas.\n' +
      'Por favor configura el archivo .env con las credenciales de Supabase.'
    );
  }
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}

/**
 * Descargar agentes desde Supabase
 */
async function downloadAgentsFromSupabase(supabase: SupabaseClient): Promise<SyntheticAgentV2[]> {
  console.log('🔄 Descargando agentes desde Supabase...');

  const allAgents: SyntheticAgentV2[] = [];
  let page = 0;
  const pageSize = 1000;
  let hasMore = true;

  while (hasMore) {
    const { data, error } = await supabase
      .from('synthetic_agents')
      .select('*')
      .range(page * pageSize, (page + 1) * pageSize - 1);

    if (error) {
      throw new Error(`Error al descargar agentes: ${error.message}`);
    }

    if (!data || data.length === 0) {
      hasMore = false;
    } else {
      allAgents.push(...data as SyntheticAgentV2[]);
      page++;
      console.log(`   Descargados ${allAgents.length} agentes...`);

      if (data.length < pageSize) {
        hasMore = false;
      }
    }
  }

  console.log(`✅ Total de agentes descargados: ${allAgents.length}`);
  return allAgents;
}

/**
 * Asignar coordenadas a los agentes basándose en su comuna_code
 */
function assignCoordinatesToAgents(
  agents: SyntheticAgentV2[],
  comunaMap: Map<string, ComunaData>
): SyntheticAgentV2[] {
  console.log('📍 Asignando coordenadas GPS a los agentes...');

  let withCoordinates = 0;
  let withoutCoordinates = 0;
  const comunaStats = new Map<string, number>();

  const updatedAgents = agents.map(agent => {
    const comunaData = comunaMap.get(agent.comuna_code);

    if (comunaData) {
      // Agregar variación aleatoria para que no estén todos en el mismo punto
      const latVariation = (Math.random() - 0.5) * 0.02; // ~1km de variación
      const lngVariation = (Math.random() - 0.5) * 0.02;

      agent.location_lat = comunaData.lat + latVariation;
      agent.location_lng = comunaData.lng + lngVariation;
      withCoordinates++;

      // Estadísticas por comuna
      comunaStats.set(agent.comuna_code, (comunaStats.get(agent.comuna_code) || 0) + 1);
    } else {
      console.warn(`⚠️  Comuna no encontrada: ${agent.comuna_code} (agente: ${agent.agent_id})`);
      withoutCoordinates++;
    }

    return agent;
  });

  console.log(`✅ Agentes con coordenadas: ${withCoordinates}`);
  console.log(`⚠️  Agentes sin coordenadas: ${withoutCoordinates}`);
  console.log(`📊 Comunas cubiertas: ${comunaStats.size}`);

  return updatedAgents;
}

/**
 * Guardar resultado
 */
function saveSyntheticAgents(agents: SyntheticAgentV2[]): void {
  const outputDir = path.dirname(OUTPUT_PATH);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Agrupar por región para estadísticas
  const regionStats: Record<string, number> = {};
  const comunaStats: Record<string, number> = {};

  for (const agent of agents) {
    regionStats[agent.region_code] = (regionStats[agent.region_code] || 0) + 1;
    comunaStats[agent.comuna_code] = (comunaStats[agent.comuna_code] || 0) + 1;
  }

  const output = {
    metadata: {
      version: '2.1.0',
      total_agents: agents.length,
      total_communes: Object.keys(comunaStats).length,
      total_regions: Object.keys(regionStats).length,
      generated_at: new Date().toISOString(),
      schema_version: 'SyntheticAgentV2',
      coverage: 'All Chile communes with GPS coordinates',
      data_source: 'Supabase synthetic_agents table',
      comuna_coordinates_source: 'data/comuna_coordinates.json'
    },
    region_distribution: regionStats,
    comuna_distribution: comunaStats,
    agents
  };

  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(output, null, 2));
  console.log(`✅ Agentes sintéticos guardados en: ${OUTPUT_PATH}`);
}

/**
 * Función principal
 */
export async function generateSyntheticAgentsChileCompleto(): Promise<void> {
  console.log('🚀 Iniciando generación de agentes para TODO CHILE...');
  console.log('   Fuente: Tabla synthetic_agents en Supabase (25,000 agentes)');
  console.log('='.repeat(60));

  try {
    // 1. Cargar coordenadas de comunas
    const comunaMap = loadComunaCoordinates();

    // 2. Conectar a Supabase
    const supabase = createSupabaseClient();

    // 3. Descargar agentes desde Supabase
    const agents = await downloadAgentsFromSupabase(supabase);

    if (agents.length === 0) {
      throw new Error('No se encontraron agentes en la base de datos');
    }

    console.log(`📊 Agentes descargados: ${agents.length.toLocaleString()}`);
    console.log(`📊 Regiones en datos: ${new Set(agents.map(a => a.region_code)).size}`);
    console.log(`📊 Comunas en datos: ${new Set(agents.map(a => a.comuna_code)).size}`);

    // 4. Asignar coordenadas
    const agentsWithCoords = assignCoordinatesToAgents(agents, comunaMap);

    // 5. Estadísticas
    const sexDist: Record<string, number> = { male: 0, female: 0, other: 0 };
    const ageGroups: Record<string, number> = {};
    const urbanicityDist: Record<string, number> = {};

    for (const agent of agentsWithCoords) {
      sexDist[agent.sex] = (sexDist[agent.sex] || 0) + 1;
      ageGroups[agent.age_group] = (ageGroups[agent.age_group] || 0) + 1;
      urbanicityDist[agent.urbanicity] = (urbanicityDist[agent.urbanicity] || 0) + 1;
    }

    console.log('\n📈 Distribución por sexo:');
    for (const [sex, count] of Object.entries(sexDist)) {
      console.log(`   ${sex}: ${count} (${(count / agents.length * 100).toFixed(1)}%)`);
    }

    console.log('\n📈 Distribución por grupo de edad:');
    for (const [group, count] of Object.entries(ageGroups)) {
      console.log(`   ${group}: ${count} (${(count / agents.length * 100).toFixed(1)}%)`);
    }

    console.log('\n📈 Distribución por urbanicidad:');
    for (const [type, count] of Object.entries(urbanicityDist)) {
      console.log(`   ${type}: ${count} (${(count / agents.length * 100).toFixed(1)}%)`);
    }

    // 6. Guardar resultado
    saveSyntheticAgents(agentsWithCoords);

    console.log('='.repeat(60));
    console.log('✅ Generación completada - TODAS las comunas de Chile');
    console.log(`   Total: ${agents.length.toLocaleString()} agentes con coordenadas GPS`);

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

// Ejecutar directamente
if (import.meta.url === `file://${process.argv[1]}`) {
  generateSyntheticAgentsChileCompleto();
}

export default generateSyntheticAgentsChileCompleto;
