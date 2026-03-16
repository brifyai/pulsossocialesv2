/**
 * Generate Synthetic Agents V1
 * 
 * Genera agentes sintéticos individuales con estructura completa para Pulso Social.
 * 
 * INPUT:
 *   - data/processed/population_backbone.json
 *   - data/processed/territories_master.json
 *   - data/processed/subtel_profile.json
 *   - data/interim/casen_normalized.json (si disponible)
 * 
 * OUTPUT:
 *   - data/processed/synthetic_agents_v1.json
 * 
 * ETAPA: Síntesis
 * 
 * SCHEMA SyntheticAgentV1:
 * - Identidad: agent_id, synthetic_batch_id, source_version, created_at
 * - Territorio: country_code, region_code, region_name, comuna_code, comuna_name, urbanicity
 * - Demografía: sex, age, age_group
 * - Hogar: household_size, household_type
 * - Socioeconómico: income_decile, poverty_status, education_level, occupation_status, occupation_group, socioeconomic_level
 * - Digital: connectivity_level, digital_exposure_level, preferred_survey_channel
 * - Funcional: agent_type
 * - Trazabilidad: backbone_key, subtel_profile_key, generation_notes
 * 
 * NOTA: Algunos campos se marcan como null cuando no hay datos fuente disponibles.
 * Esto se documenta en generation_notes.
 */

import * as fs from 'fs';
import * as path from 'path';

// Paths
const POPULATION_BACKBONE = path.join(process.cwd(), 'data/processed/population_backbone.json');
const TERRITORIES_MASTER = path.join(process.cwd(), 'data/processed/territories_master.json');
const SUBTEL_PROFILE = path.join(process.cwd(), 'data/processed/subtel_profile.json');
const CASEN_NORMALIZED = path.join(process.cwd(), 'data/interim/casen_normalized.json');
const OUTPUT_PATH = path.join(process.cwd(), 'data/processed/synthetic_agents_v1.json');

// Configuración de generación
const AGENTS_PER_COMMUNE = 100; // Cantidad de agentes por comuna para demo

// Comunas de ejemplo por región
const COMMUNE_SAMPLES: Record<string, string[]> = {
  'RM': ['Santiago', 'Providencia', 'Las Condes', 'Ñuñoa', 'Maipú', 'La Florida', 'Peñalolén', 'San Bernardo', 'Puente Alto'],
  'VA': ['Valparaíso', 'Viña del Mar', 'Quilpué', 'Villa Alemana', 'San Antonio'],
  'BI': ['Concepción', 'Talcahuano', 'Chiguayante', 'San Pedro de la Paz', 'Los Ángeles'],
  'ML': ['Talca', 'Curicó', 'Linares', 'Cauquenes'],
  'AR': ['Temuco', 'Padre Las Casas', 'Villarrica', 'Pucón'],
  'LI': ['Rancagua', 'San Fernando', 'Pichilemu'],
  'CO': ['La Serena', 'Coquimbo', 'Ovalle', 'Illapel'],
  'AN': ['Antofagasta', 'Calama', 'Copiapó'],
  'LL': ['Puerto Montt', 'Osorno', 'Castro'],
  'TA': ['Iquique', 'Alto Hospicio'],
  'AT': ['Copiapó', 'Caldera', 'Chañaral'],
  'NB': ['Chillán', 'San Carlos', 'Bulnes'],
  'LR': ['Valdivia', 'La Unión', 'Río Bueno'],
  'AP': ['Arica', 'Putre'],
  'AI': ['Coyhaique', 'Chile Chico'],
  'MA': ['Punta Arenas', 'Puerto Natales'],
};

/**
 * Schema: SyntheticAgentV1
 */
export interface SyntheticAgentV1 {
  // === IDENTIDAD / METADATA ===
  agent_id: string;
  synthetic_batch_id: string;
  source_version: string;
  created_at: string;
  
  // === TERRITORIO ===
  country_code: string;
  region_code: string;
  region_name: string;
  comuna_code: string;
  comuna_name: string;
  urbanicity: 'urban' | 'rural' | 'periurban';
  
  // === DEMOGRAFÍA ===
  sex: 'male' | 'female' | 'other';
  age: number;
  age_group: 'child' | 'youth' | 'adult' | 'middle_age' | 'senior';
  
  // === HOGAR ===
  household_size: number;
  household_type: 'single' | 'couple' | 'family' | 'extended' | 'group';
  
  // === SOCIOECONÓMICO ===
  income_decile: number | null; // 1-10, null si no disponible
  poverty_status: 'extreme_poverty' | 'poverty' | 'vulnerable' | 'middle_class' | 'upper_middle' | 'upper_class' | null;
  education_level: 'none' | 'primary' | 'secondary' | 'technical' | 'university' | 'postgraduate' | null;
  occupation_status: 'employed' | 'unemployed' | 'self_employed' | 'student' | 'retired' | 'domestic' | 'inactive' | null;
  occupation_group: string | null;
  socioeconomic_level: 'low' | 'medium_low' | 'medium' | 'medium_high' | 'high' | null;
  
  // === DIGITAL ===
  connectivity_level: 'none' | 'basic' | 'standard' | 'high' | 'very_high' | null;
  digital_exposure_level: 'low' | 'medium' | 'high' | 'very_high' | null;
  preferred_survey_channel: 'phone' | 'online' | 'in_person' | 'sms' | 'mixed' | null;
  
  // === FUNCIONAL ===
  agent_type: 'resident' | 'worker' | 'student' | 'retiree' | 'entrepreneur' | 'domestic' | 'migrant';
  
  // === TRAZABILIDAD ===
  backbone_key: string;
  subtel_profile_key: string | null;
  casen_profile_key: string | null;
  generation_notes: string;
}

/**
 * Cargar datos fuente
 */
function loadBackbone(): any[] {
  if (!fs.existsSync(POPULATION_BACKBONE)) {
    console.warn(`⚠️ Archivo no encontrado: ${POPULATION_BACKBONE}`);
    return [];
  }
  return JSON.parse(fs.readFileSync(POPULATION_BACKBONE, 'utf-8'));
}

function loadTerritories(): any[] {
  if (!fs.existsSync(TERRITORIES_MASTER)) {
    console.warn(`⚠️ Archivo no encontrado: ${TERRITORIES_MASTER}`);
    return [];
  }
  return JSON.parse(fs.readFileSync(TERRITORIES_MASTER, 'utf-8'));
}

function loadSubtelProfile(): any[] {
  if (!fs.existsSync(SUBTEL_PROFILE)) {
    console.warn(`⚠️ Archivo no encontrado: ${SUBTEL_PROFILE}`);
    return [];
  }
  return JSON.parse(fs.readFileSync(SUBTEL_PROFILE, 'utf-8'));
}

function loadCasenNormalized(): any[] | null {
  if (!fs.existsSync(CASEN_NORMALIZED)) {
    console.warn(`⚠️ Archivo no encontrado: ${CASEN_NORMALIZED} - CASEN no disponible`);
    return null;
  }
  return JSON.parse(fs.readFileSync(CASEN_NORMALIZED, 'utf-8'));
}

/**
 * Utilidades de generación
 */
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

function generateAgentId(index: number, regionCode: string): string {
  return `AGT-${regionCode}-${index.toString().padStart(6, '0')}`;
}

function generateCommuneCode(regionCode: string, index: number): string {
  const regionNum = parseInt(regionCode) || 1;
  return `${regionNum.toString().padStart(2, '0')}${(index + 1).toString().padStart(3, '0')}`;
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
  if (lower.includes('santiago') || lower.includes('providencia') || 
      lower.includes('las condes') || lower.includes('viña') ||
      lower.includes('valparaíso') || lower.includes('concepción') ||
      lower.includes('temuco') || lower.includes('antofagasta')) {
    return 'urban';
  }
  if (lower.includes('rural') || lower.includes('campo')) {
    return 'rural';
  }
  return 'periurban';
}

/**
 * Determinar nivel socioeconómico basado en ingresos
 */
function getSocioeconomicLevel(incomeDecile: number | null): SyntheticAgentV1['socioeconomic_level'] {
  if (incomeDecile === null) return null;
  if (incomeDecile <= 2) return 'low';
  if (incomeDecile <= 4) return 'medium_low';
  if (incomeDecile <= 6) return 'medium';
  if (incomeDecile <= 8) return 'medium_high';
  return 'high';
}

/**
 * Determinar nivel de conectividad basado en perfil SUBTEL
 */
function getConnectivityLevel(subtelProfile: any): SyntheticAgentV1['connectivity_level'] {
  if (!subtelProfile) return null;
  
  const index = subtelProfile.connectivity_index || 0;
  if (index >= 80) return 'very_high';
  if (index >= 60) return 'high';
  if (index >= 40) return 'standard';
  if (index >= 20) return 'basic';
  return 'none';
}

/**
 * Generar un agente individual
 */
function generateAgent(
  index: number,
  regionCode: string,
  regionName: string,
  communeCode: string,
  communeName: string,
  backbone: any,
  subtelProfile: any,
  casenData: any[] | null,
  batchId: string
): SyntheticAgentV1 {
  // Determinar sexo (aproximadamente 48.5% masculino)
  const sex: SyntheticAgentV1['sex'] = Math.random() < 0.485 ? 'male' : 'female';
  
  // Generar edad con distribución realista
  const age = Math.floor(Math.random() * 80) + 18; // 18-97 años
  const ageGroup = getAgeGroup(age);
  
  // Tamaño de hogar (distribución típica chilena)
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
  
  // Determinar decil de ingreso (basado en distribución regional)
  const incomeDecile = Math.floor(Math.random() * 10) + 1;
  
  // Determinar status de pobreza
  let povertyStatus: SyntheticAgentV1['poverty_status'];
  if (incomeDecile <= 2) povertyStatus = Math.random() < 0.3 ? 'extreme_poverty' : 'poverty';
  else if (incomeDecile <= 4) povertyStatus = 'vulnerable';
  else if (incomeDecile <= 6) povertyStatus = 'middle_class';
  else if (incomeDecile <= 8) povertyStatus = 'upper_middle';
  else povertyStatus = 'upper_class';
  
  // Educación (distribución típica chilena por edad)
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
  
  // Conectividad
  const connectivityLevel = getConnectivityLevel(subtelProfile);
  
  // Exposición digital (correlacionada con conectividad y educación)
  let digitalExposureLevel: SyntheticAgentV1['digital_exposure_level'] = 'medium';
  if (connectivityLevel === 'very_high' || connectivityLevel === 'high') {
    digitalExposureLevel = educationLevel === 'university' || educationLevel === 'technical' ? 'very_high' : 'high';
  } else if (connectivityLevel === 'standard') {
    digitalExposureLevel = 'medium';
  } else {
    digitalExposureLevel = 'low';
  }
  
  // Canal preferido para encuestas
  const surveyChannels: SyntheticAgentV1['preferred_survey_channel'][] = 
    digitalExposureLevel === 'very_high' ? ['online', 'mixed'] :
    digitalExposureLevel === 'high' ? ['phone', 'online', 'mixed'] :
    ['phone', 'sms', 'in_person'];
  const preferredSurveyChannel = surveyChannels[Math.floor(Math.random() * surveyChannels.length)];
  
  // Tipo de agente
  const agentType = getAgentType(age, occupationStatus);
  
  // Urbanicidad
  const urbanicity = getUrbanicity(communeName);
  
  // Notas de generación
  const notes: string[] = [];
  if (!casenData) {
    notes.push('CASEN data not available - socioeconomic fields use synthetic distribution');
  }
  if (!subtelProfile) {
    notes.push('SUBTEL profile not available - connectivity uses default values');
  }
  notes.push('Generated from population_backbone with proportional allocation');
  
  return {
    // Metadata
    agent_id: generateAgentId(index, regionCode),
    synthetic_batch_id: batchId,
    source_version: '1.0.0',
    created_at: new Date().toISOString(),
    
    // Territorio
    country_code: 'CL',
    region_code: regionCode,
    region_name: regionName,
    comuna_code: communeCode,
    comuna_name: communeName,
    urbanicity,
    
    // Demografía
    sex,
    age,
    age_group: ageGroup,
    
    // Hogar
    household_size: householdSize,
    household_type: householdType,
    
    // Socioeconómico
    income_decile: incomeDecile,
    poverty_status: povertyStatus,
    education_level: educationLevel,
    occupation_status: occupationStatus,
    occupation_group: occupationGroup,
    socioeconomic_level: socioeconomicLevel,
    
    // Digital
    connectivity_level: connectivityLevel,
    digital_exposure_level: digitalExposureLevel,
    preferred_survey_channel: preferredSurveyChannel,
    
    // Funcional
    agent_type: agentType,
    
    // Trazabilidad
    backbone_key: `${regionCode}-${communeCode}`,
    subtel_profile_key: subtelProfile ? subtelProfile.territory_code : null,
    casen_profile_key: null, // CASEN no disponible aún
    generation_notes: notes.join('; '),
  };
}

/**
 * Generar todos los agentes
 */
function generateSyntheticAgents(): SyntheticAgentV1[] {
  console.log('🧬 Generando agentes sintéticos v1...');
  
  const backbone = loadBackbone();
  const territories = loadTerritories();
  const subtelProfiles = loadSubtelProfile();
  const casenData = loadCasenNormalized();
  
  // Indexar territorios y perfiles
  const territoryMap = new Map<string, any>();
  for (const t of territories) {
    territoryMap.set(t.code, t);
  }
  
  const subtelMap = new Map<string, any>();
  for (const s of subtelProfiles) {
    subtelMap.set(s.territory_code, s);
  }
  
  // Batch ID para trazabilidad
  const batchId = `BATCH-${Date.now()}`;
  
  const agents: SyntheticAgentV1[] = [];
  let globalIndex = 0;
  
  for (const region of backbone) {
    const regionCode = region.territory_code;
    const regionName = region.territory_name;
    const communes = COMMUNE_SAMPLES[regionCode] || ['Capital Regional'];
    const subtelProfile = subtelMap.get(regionCode);
    
    for (let i = 0; i < communes.length; i++) {
      const communeName = communes[i];
      const communeCode = generateCommuneCode(regionCode, i);
      
      // Generar N agentes por comuna
      for (let j = 0; j < AGENTS_PER_COMMUNE; j++) {
        const agent = generateAgent(
          globalIndex++,
          regionCode,
          regionName,
          communeCode,
          communeName,
          region,
          subtelProfile,
          casenData,
          batchId
        );
        agents.push(agent);
      }
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
  
  // Guardar con metadata
  const output = {
    metadata: {
      version: '1.0.0',
      batch_id: agents[0]?.synthetic_batch_id || 'unknown',
      total_agents: agents.length,
      generated_at: new Date().toISOString(),
      schema_version: 'SyntheticAgentV1',
      fields_with_null: [
        'income_decile (if CASEN unavailable)',
        'poverty_status (if CASEN unavailable)',
        'education_level (synthetic)',
        'occupation_status (synthetic)',
        'occupation_group (synthetic)',
        'socioeconomic_level (derived from income)',
        'connectivity_level (from SUBTEL)',
        'digital_exposure_level (derived)',
        'preferred_survey_channel (synthetic)',
        'subtel_profile_key (if SUBTEL unavailable)',
        'casen_profile_key (not implemented yet)'
      ],
      data_sources: {
        population_backbone: 'data/processed/population_backbone.json',
        territories_master: 'data/processed/territories_master.json',
        subtel_profile: 'data/processed/subtel_profile.json',
        casen_normalized: 'data/interim/casen_normalized.json (may not exist)'
      }
    },
    agents
  };
  
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(output, null, 2));
  console.log(`✅ Agentes sintéticos v1 guardados en: ${OUTPUT_PATH}`);
}

/**
 * Función principal
 */
export function generateSyntheticAgentsV1Pipeline(): void {
  console.log('🚀 Iniciando generación de agentes sintéticos v1...');
  console.log('='.repeat(60));
  
  const agents = generateSyntheticAgents();
  
  console.log(`📊 Agentes generados: ${agents.length.toLocaleString()}`);
  console.log(`📊 Regiones cubiertas: ${new Set(agents.map(a => a.region_code)).size}`);
  console.log(`📊 Comunas cubiertas: ${new Set(agents.map(a => a.comuna_code)).size}`);
  
  // Estadísticas
  const sexDist = { male: 0, female: 0, other: 0 };
  const ageDist = { child: 0, youth: 0, adult: 0, middle_age: 0, senior: 0 };
  const agentTypeDist: Record<string, number> = {};
  
  for (const agent of agents) {
    sexDist[agent.sex]++;
    ageDist[agent.age_group]++;
    agentTypeDist[agent.agent_type] = (agentTypeDist[agent.agent_type] || 0) + 1;
  }
  
  console.log('\n📈 Distribución por sexo:');
  console.log(`   Male: ${sexDist.male} (${(sexDist.male / agents.length * 100).toFixed(1)}%)`);
  console.log(`   Female: ${sexDist.female} (${(sexDist.female / agents.length * 100).toFixed(1)}%)`);
  
  console.log('\n📈 Distribución por edad:');
  for (const [group, count] of Object.entries(ageDist)) {
    console.log(`   ${group}: ${count} (${(count / agents.length * 100).toFixed(1)}%)`);
  }
  
  console.log('\n📈 Distribución por tipo de agente:');
  for (const [type, count] of Object.entries(agentTypeDist)) {
    console.log(`   ${type}: ${count} (${(count / agents.length * 100).toFixed(1)}%)`);
  }
  
  saveSyntheticAgents(agents);
  
  console.log('='.repeat(60));
  console.log('✅ synthetic_agents_v1 completado');
}

if (process.argv[1]?.includes('pipeline.ts')) {
  generateSyntheticAgentsV1Pipeline();
}

export default generateSyntheticAgentsV1Pipeline;