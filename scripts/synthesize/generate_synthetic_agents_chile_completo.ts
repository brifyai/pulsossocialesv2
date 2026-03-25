/**
 * Generate Synthetic Agents - Chile Completo
 * 
 * Genera agentes sintéticos para TODAS las comunas de Chile (360 comunas)
 * usando las coordenadas GPS disponibles.
 * 
 * INPUT:
 *   - data/comuna_coordinates.json (coordenadas de todas las comunas)
 *   - data/processed/population_backbone.json
 * 
 * OUTPUT:
 *   - data/processed/synthetic_agents_chile_completo.json
 * 
 * ETAPA: Síntesis
 */

import * as fs from 'fs';
import * as path from 'path';

// Paths
const COMUNA_COORDINATES = path.join(process.cwd(), 'data/comuna_coordinates.json');
const POPULATION_BACKBONE = path.join(process.cwd(), 'data/processed/population_backbone.json');
const OUTPUT_PATH = path.join(process.cwd(), 'data/processed/synthetic_agents_chile_completo.json');

// Configuración: Agentes por comuna (ajustable)
const AGENTS_PER_COMMUNE = 5; // 5 agentes por comuna = ~1,800 agentes totales

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
 * Schema: SyntheticAgentV1
 */
export interface SyntheticAgentV1 {
  agent_id: string;
  synthetic_batch_id: string;
  source_version: string;
  created_at: string;
  
  country_code: string;
  region_code: string;
  region_name: string;
  comuna_code: string;
  comuna_name: string;
  lat: number;
  lng: number;
  urbanicity: 'urban' | 'rural' | 'periurban';
  
  sex: 'male' | 'female' | 'other';
  age: number;
  age_group: 'child' | 'youth' | 'adult' | 'middle_age' | 'senior';
  
  household_size: number;
  household_type: 'single' | 'couple' | 'family' | 'extended' | 'group';
  
  income_decile: number | null;
  poverty_status: 'extreme_poverty' | 'poverty' | 'vulnerable' | 'middle_class' | 'upper_middle' | 'upper_class' | null;
  education_level: 'none' | 'primary' | 'secondary' | 'technical' | 'university' | 'postgraduate' | null;
  occupation_status: 'employed' | 'unemployed' | 'self_employed' | 'student' | 'retired' | 'domestic' | 'inactive' | null;
  occupation_group: string | null;
  socioeconomic_level: 'low' | 'medium_low' | 'medium' | 'medium_high' | 'high' | null;
  
  connectivity_level: 'none' | 'basic' | 'standard' | 'high' | 'very_high' | null;
  digital_exposure_level: 'low' | 'medium' | 'high' | 'very_high' | null;
  preferred_survey_channel: 'phone' | 'online' | 'in_person' | 'sms' | 'mixed' | null;
  
  agent_type: 'resident' | 'worker' | 'student' | 'retiree' | 'entrepreneur' | 'domestic' | 'migrant';
  
  backbone_key: string;
  generation_notes: string;
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
function loadComunaCoordinates(): ComunaData[] {
  if (!fs.existsSync(COMUNA_COORDINATES)) {
    throw new Error(`Archivo no encontrado: ${COMUNA_COORDINATES}`);
  }
  return JSON.parse(fs.readFileSync(COMUNA_COORDINATES, 'utf-8'));
}

/**
 * Utilidades de generación
 */
function generateAgentId(index: number, regionCode: string): string {
  return `AGT-${regionCode}-${index.toString().padStart(6, '0')}`;
}

function getAgeGroup(age: number): SyntheticAgentV1['age_group'] {
  if (age < 15) return 'child';
  if (age < 25) return 'youth';
  if (age < 45) return 'adult';
  if (age < 65) return 'middle_age';
  return 'senior';
}

function getHouseholdType(householdSize: number): SyntheticAgentV1['household_type'] {
  if (householdSize === 1) return 'single';
  if (householdSize === 2) return 'couple';
  if (householdSize <= 4) return 'family';
  if (householdSize <= 6) return 'extended';
  return 'group';
}

function getAgentType(age: number, occupationStatus: string | null): SyntheticAgentV1['agent_type'] {
  if (age >= 65) return 'retiree';
  if (age < 25) return 'student';
  if (occupationStatus === 'domestic') return 'domestic';
  if (occupationStatus === 'self_employed') return 'entrepreneur';
  return 'resident';
}

function getUrbanicity(communeName: string): SyntheticAgentV1['urbanicity'] {
  const lower = communeName.toLowerCase();
  const urbanKeywords = ['santiago', 'providencia', 'las condes', 'ñuñoa', 'viña', 'valparaíso', 
    'concepción', 'temuco', 'antofagasta', 'iquique', 'arica', 'rancagua', 'talca', 'chillán',
    'puerto montt', 'valdivia', 'la serena', 'coquimbo', 'copiapó', 'calama', 'osorno',
    'punta arenas', 'coyhaique', 'puerto varas', 'castro', 'ancud', 'quillota', 'san antonio',
    'quilpué', 'villa alemana', 'san bernardo', 'puente alto', 'maipú', 'la florida',
    'peñalolén', 'recoleta', 'independencia', 'estación central', 'ñuñoa', 'macul', 'la reina',
    'las condes', 'vitacura', 'lo barnechea', 'huechuraba', 'quilicura', 'pudahuel', 'cerro navia',
    'lo prado', 'renca', 'quinta normal', 'lo espejo', 'pedro aguirre cerda', 'san miguel',
    'san joaquín', 'la cisterna', 'el bosque', 'la granja', 'la pintana', 'san ramón'];
  
  if (urbanKeywords.some(k => lower.includes(k))) return 'urban';
  if (lower.includes('rural') || lower.includes('campo')) return 'rural';
  return 'periurban';
}

function getSocioeconomicLevel(incomeDecile: number | null): SyntheticAgentV1['socioeconomic_level'] {
  if (incomeDecile === null) return null;
  if (incomeDecile <= 2) return 'low';
  if (incomeDecile <= 4) return 'medium_low';
  if (incomeDecile <= 6) return 'medium';
  if (incomeDecile <= 8) return 'medium_high';
  return 'high';
}

/**
 * Generar un agente individual
 */
function generateAgent(
  index: number,
  comuna: ComunaData,
  batchId: string
): SyntheticAgentV1 {
  const regionCode = REGION_CODE_MAP[comuna.region] || 'XX';
  
  // Determinar sexo
  const sex: SyntheticAgentV1['sex'] = Math.random() < 0.485 ? 'male' : 'female';
  
  // Generar edad (18-97 años)
  const age = Math.floor(Math.random() * 80) + 18;
  const ageGroup = getAgeGroup(age);
  
  // Tamaño de hogar
  const householdSizes = [1, 2, 3, 4, 5, 6];
  const householdWeights = [0.12, 0.22, 0.24, 0.22, 0.12, 0.08];
  const rand = Math.random();
  let cumWeight = 0;
  let householdSize = 3;
  for (let i = 0; i < householdSizes.length; i++) {
    cumWeight += householdWeights[i];
    if (rand < cumWeight) {
      householdSize = householdSizes[i];
      break;
    }
  }
  const householdType = getHouseholdType(householdSize);
  
  // Decil de ingreso
  const incomeDecile = Math.floor(Math.random() * 10) + 1;
  
  // Status de pobreza
  let povertyStatus: SyntheticAgentV1['poverty_status'];
  if (incomeDecile <= 2) povertyStatus = Math.random() < 0.3 ? 'extreme_poverty' : 'poverty';
  else if (incomeDecile <= 4) povertyStatus = 'vulnerable';
  else if (incomeDecile <= 6) povertyStatus = 'middle_class';
  else if (incomeDecile <= 8) povertyStatus = 'upper_middle';
  else povertyStatus = 'upper_class';
  
  // Educación
  const educationLevels: SyntheticAgentV1['education_level'][] = ['primary', 'secondary', 'technical', 'university'];
  const educationWeights = age < 30 ? [0.05, 0.35, 0.25, 0.35] :
                          age < 50 ? [0.10, 0.40, 0.25, 0.25] :
                          [0.15, 0.45, 0.20, 0.20];
  let eduRand = Math.random();
  let educationLevel: SyntheticAgentV1['education_level'] = 'secondary';
  cumWeight = 0;
  for (let i = 0; i < educationLevels.length; i++) {
    cumWeight += educationWeights[i];
    if (eduRand < cumWeight) {
      educationLevel = educationLevels[i];
      break;
    }
  }
  
  // Estado ocupacional
  const occupationStatuses: SyntheticAgentV1['occupation_status'][] = 
    age >= 65 ? ['retired', 'inactive'] :
    age < 25 ? ['student', 'employed', 'unemployed'] :
    ['employed', 'self_employed', 'unemployed', 'student'];
  const occupationStatus = occupationStatuses[Math.floor(Math.random() * occupationStatuses.length)];
  
  // Grupo ocupacional
  const occupationGroups = ['tech', 'services', 'commerce', 'industry', 'construction', 'agriculture', 'health', 'education', 'administration'];
  const occupationGroup = occupationStatus === 'employed' || occupationStatus === 'self_employed' 
    ? occupationGroups[Math.floor(Math.random() * occupationGroups.length)]
    : null;
  
  // Nivel socioeconómico
  const socioeconomicLevel = getSocioeconomicLevel(incomeDecile);
  
  // Conectividad (basada en urbanicidad)
  const urbanicity = getUrbanicity(comuna.name);
  const connectivityWeights = {
    urban: [0.02, 0.08, 0.20, 0.35, 0.35], // none, basic, standard, high, very_high
    periurban: [0.05, 0.15, 0.30, 0.30, 0.20],
    rural: [0.15, 0.25, 0.30, 0.20, 0.10]
  };
  const connWeights = connectivityWeights[urbanicity];
  const connLevels: SyntheticAgentV1['connectivity_level'][] = ['none', 'basic', 'standard', 'high', 'very_high'];
  let connRand = Math.random();
  let connectivityLevel: SyntheticAgentV1['connectivity_level'] = 'standard';
  cumWeight = 0;
  for (let i = 0; i < connLevels.length; i++) {
    cumWeight += connWeights[i];
    if (connRand < cumWeight) {
      connectivityLevel = connLevels[i];
      break;
    }
  }
  
  // Exposición digital
  let digitalExposureLevel: SyntheticAgentV1['digital_exposure_level'] = 'medium';
  if (connectivityLevel === 'very_high' || connectivityLevel === 'high') {
    digitalExposureLevel = educationLevel === 'university' || educationLevel === 'technical' ? 'very_high' : 'high';
  } else if (connectivityLevel === 'standard') {
    digitalExposureLevel = 'medium';
  } else {
    digitalExposureLevel = 'low';
  }
  
  // Canal preferido
  const surveyChannels: SyntheticAgentV1['preferred_survey_channel'][] = 
    digitalExposureLevel === 'very_high' ? ['online', 'mixed'] :
    digitalExposureLevel === 'high' ? ['phone', 'online', 'mixed'] :
    ['phone', 'sms', 'in_person'];
  const preferredSurveyChannel = surveyChannels[Math.floor(Math.random() * surveyChannels.length)];
  
  // Tipo de agente
  const agentType = getAgentType(age, occupationStatus);
  
  return {
    agent_id: generateAgentId(index, regionCode),
    synthetic_batch_id: batchId,
    source_version: '2.0.0',
    created_at: new Date().toISOString(),
    
    country_code: 'CL',
    region_code: regionCode,
    region_name: comuna.region,
    comuna_code: comuna.code,
    comuna_name: comuna.name,
    lat: comuna.lat,
    lng: comuna.lng,
    urbanicity,
    
    sex,
    age,
    age_group: ageGroup,
    
    household_size: householdSize,
    household_type: householdType,
    
    income_decile: incomeDecile,
    poverty_status: povertyStatus,
    education_level: educationLevel,
    occupation_status: occupationStatus,
    occupation_group: occupationGroup,
    socioeconomic_level: socioeconomicLevel,
    
    connectivity_level: connectivityLevel,
    digital_exposure_level: digitalExposureLevel,
    preferred_survey_channel: preferredSurveyChannel,
    
    agent_type: agentType,
    
    backbone_key: `${regionCode}-${comuna.code}`,
    generation_notes: `Generated for all Chile communes using coordinates. Region: ${comuna.region}, Comuna: ${comuna.name}`,
  };
}

/**
 * Generar todos los agentes para todas las comunas
 */
function generateSyntheticAgents(): SyntheticAgentV1[] {
  console.log('🧬 Generando agentes sintéticos para TODO CHILE...');
  
  const comunas = loadComunaCoordinates();
  console.log(`📍 Total comunas con coordenadas: ${comunas.length}`);
  
  // Batch ID
  const batchId = `BATCH-CHILE-${Date.now()}`;
  
  const agents: SyntheticAgentV1[] = [];
  let globalIndex = 0;
  
  // Generar agentes para cada comuna
  for (const comuna of comunas) {
    for (let i = 0; i < AGENTS_PER_COMMUNE; i++) {
      const agent = generateAgent(globalIndex++, comuna, batchId);
      agents.push(agent);
    }
  }
  
  return agents;
}

/**
 * Guardar resultado
 */
function saveSyntheticAgents(agents: SyntheticAgentV1[]): void {
  const outputDir = path.dirname(OUTPUT_PATH);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  // Agrupar por región para estadísticas
  const regionStats: Record<string, number> = {};
  const comunaStats: Record<string, number> = {};
  
  for (const agent of agents) {
    regionStats[agent.region_name] = (regionStats[agent.region_name] || 0) + 1;
    comunaStats[agent.comuna_code] = (comunaStats[agent.comuna_code] || 0) + 1;
  }
  
  const output = {
    metadata: {
      version: '2.0.0',
      batch_id: agents[0]?.synthetic_batch_id || 'unknown',
      total_agents: agents.length,
      total_communes: Object.keys(comunaStats).length,
      total_regions: Object.keys(regionStats).length,
      agents_per_commune: AGENTS_PER_COMMUNE,
      generated_at: new Date().toISOString(),
      schema_version: 'SyntheticAgentV2',
      coverage: 'All Chile communes with GPS coordinates',
      data_source: 'data/comuna_coordinates.json'
    },
    region_distribution: regionStats,
    agents
  };
  
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(output, null, 2));
  console.log(`✅ Agentes sintéticos guardados en: ${OUTPUT_PATH}`);
}

/**
 * Función principal
 */
export function generateSyntheticAgentsChileCompleto(): void {
  console.log('🚀 Iniciando generación de agentes para TODO CHILE...');
  console.log('='.repeat(60));
  
  const agents = generateSyntheticAgents();
  
  console.log(`📊 Agentes generados: ${agents.length.toLocaleString()}`);
  console.log(`📊 Regiones cubiertas: ${new Set(agents.map(a => a.region_code)).size}`);
  console.log(`📊 Comunas cubiertas: ${new Set(agents.map(a => a.comuna_code)).size}`);
  
  // Estadísticas
  const sexDist = { male: 0, female: 0, other: 0 };
  const ageDist = { child: 0, youth: 0, adult: 0, middle_age: 0, senior: 0 };
  const urbanicityDist = { urban: 0, rural: 0, periurban: 0 };
  
  for (const agent of agents) {
    sexDist[agent.sex]++;
    ageDist[agent.age_group]++;
    urbanicityDist[agent.urbanicity]++;
  }
  
  console.log('\n📈 Distribución por sexo:');
  console.log(`   Male: ${sexDist.male} (${(sexDist.male / agents.length * 100).toFixed(1)}%)`);
  console.log(`   Female: ${sexDist.female} (${(sexDist.female / agents.length * 100).toFixed(1)}%)`);
  
  console.log('\n📈 Distribución por edad:');
  for (const [group, count] of Object.entries(ageDist)) {
    console.log(`   ${group}: ${count} (${(count / agents.length * 100).toFixed(1)}%)`);
  }
  
  console.log('\n📈 Distribución por urbanicidad:');
  for (const [type, count] of Object.entries(urbanicityDist)) {
    console.log(`   ${type}: ${count} (${(count / agents.length * 100).toFixed(1)}%)`);
  }
  
  saveSyntheticAgents(agents);
  
  console.log('='.repeat(60));
  console.log('✅ Generación completada - TODAS las comunas de Chile');
}

// Ejecutar directamente
generateSyntheticAgentsChileCompleto();

export default generateSyntheticAgentsChileCompleto;
