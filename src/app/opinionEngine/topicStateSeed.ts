import type { TopicKey } from '../../types/opinion';
import type { TopicState } from './types';
import {
  TOPIC_SEED_CONFIG,
  AGE_SCORES,
  POLITICAL_IDENTITY_WEIGHTS,
  ECONOMY_PERSONAL_WEIGHTS,
  ECONOMY_NATIONAL_WEIGHTS,
  EMPLOYMENT_WEIGHTS,
  CONSUMPTION_WEIGHTS,
  INSTITUTIONAL_TRUST_WEIGHTS,
  SECURITY_PERCEPTION_WEIGHTS,
  COUNTRY_OPTIMISM_WEIGHTS,
  COUNTRY_DIRECTION_WEIGHTS,
  GOVERNMENT_APPROVAL_WEIGHTS,
  TOPIC_STATE_BUILDER,
} from './engineConfig';

/**
 * Tipo mínimo esperado del agente sintético para inicializar estados.
 * Puedes reemplazarlo más adelante por tu tipo real de agente.
 */
export interface TopicStateSeedAgent {
  age?: number;
  sex?: string;
  educationLevel?: string;
  incomeDecile?: number;
  povertyStatus?: string;
  regionCode?: string;
  communeCode?: string;
  connectivityLevel?: string;
  digitalExposure?: string;
  preferredChannel?: string;
  agentType?: string;
}

/** Limita un valor numérico a un rango dado */
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/** Ruido aleatorio pequeño para evitar agentes excesivamente deterministas */
export function randomNoise(scale = 0.08): number {
  return (Math.random() * 2 - 1) * scale;
}

/** Normaliza valores posiblemente indefinidos a score seguro */
export function safeScore(value: number): number {
  return clamp(value, -1, 1);
}

/** Convierte etiquetas ordinales simples a score numérico aproximado */
function mapOrdinalLevel(value?: string): number {
  if (!value) return 0;

  const normalized = value.toLowerCase();

  if (['none', 'low', 'very_low'].includes(normalized)) return -0.5;
  if (['medium', 'mid'].includes(normalized)) return 0;
  if (['high', 'very_high'].includes(normalized)) return 0.5;

  return 0;
}

/** Score aproximado según educación */
function educationScore(level?: string): number {
  if (!level) return 0;

  const normalized = level.toLowerCase();

  if (['none', 'primary'].includes(normalized)) return -0.35;
  if (['secondary'].includes(normalized)) return 0;
  if (['technical'].includes(normalized)) return 0.15;
  if (['university', 'postgraduate'].includes(normalized)) return 0.35;

  return 0;
}

/** Score aproximado según ingreso */
function incomeScore(incomeDecile?: number): number {
  if (!incomeDecile || Number.isNaN(incomeDecile)) return 0;
  const centered = (incomeDecile - TOPIC_SEED_CONFIG.INCOME_DECILE_CENTER) / TOPIC_SEED_CONFIG.INCOME_DECILE_DIVISOR;
  return clamp(centered, -1, 1) * TOPIC_SEED_CONFIG.INCOME_SCORE_MULTIPLIER;
}

/** Score aproximado según edad */
function ageScore(age?: number): number {
  if (age === undefined || age === null) return 0;
  if (age < 30) return AGE_SCORES.YOUNG;
  if (age < 50) return AGE_SCORES.ADULT;
  if (age < 70) return AGE_SCORES.MIDDLE_AGE;
  return AGE_SCORES.SENIOR;
}

/** Componentes base calculados una sola vez por agente */
interface BaseComponents {
  education: number;
  income: number;
  age: number;
  digital: number;
  connectivity: number;
  povertyPenalty: number;
  urbanPenalty: number;
  noisePolitical: number;
  noiseEconomyPersonal: number;
  noiseEconomyNational: number;
  noiseEmployment: number;
  noiseConsumption: number;
  noiseInstitutional: number;
  noiseSecurity: number;
  noiseOptimism: number;
  noiseDirection: number;
  noiseGovernment: number;
}

/** Calcula componentes base determinísticos + ruido una sola vez */
function calculateBaseComponents(agent: TopicStateSeedAgent): BaseComponents {
  const education = educationScore(agent.educationLevel);
  const income = incomeScore(agent.incomeDecile);
  const age = ageScore(agent.age);
  const digital = mapOrdinalLevel(agent.digitalExposure);
  const connectivity = mapOrdinalLevel(agent.connectivityLevel);

  const povertyPenalty =
    agent.povertyStatus && ['extreme_poverty', 'poverty'].includes(agent.povertyStatus)
      ? TOPIC_SEED_CONFIG.POVERTY_PENALTY_HIGH
      : agent.povertyStatus === 'vulnerable'
        ? TOPIC_SEED_CONFIG.POVERTY_PENALTY_LOW
        : 0;

  const urbanPenalty =
    agent.regionCode === 'CL-RM' || agent.regionCode === 'RM'
      ? TOPIC_SEED_CONFIG.URBAN_PENALTY
      : 0;

  // Generar ruido una sola vez por estimación
  return {
    education,
    income,
    age,
    digital,
    connectivity,
    povertyPenalty,
    urbanPenalty,
    noisePolitical: randomNoise(TOPIC_SEED_CONFIG.DEFAULT_NOISE_SCALE * POLITICAL_IDENTITY_WEIGHTS.NOISE_MULTIPLIER),
    noiseEconomyPersonal: randomNoise(TOPIC_SEED_CONFIG.DEFAULT_NOISE_SCALE * ECONOMY_PERSONAL_WEIGHTS.NOISE_MULTIPLIER),
    noiseEconomyNational: randomNoise(TOPIC_SEED_CONFIG.DEFAULT_NOISE_SCALE * ECONOMY_NATIONAL_WEIGHTS.NOISE_MULTIPLIER),
    noiseEmployment: randomNoise(TOPIC_SEED_CONFIG.DEFAULT_NOISE_SCALE),
    noiseConsumption: randomNoise(TOPIC_SEED_CONFIG.DEFAULT_NOISE_SCALE),
    noiseInstitutional: randomNoise(TOPIC_SEED_CONFIG.DEFAULT_NOISE_SCALE),
    noiseSecurity: randomNoise(TOPIC_SEED_CONFIG.DEFAULT_NOISE_SCALE),
    noiseOptimism: randomNoise(TOPIC_SEED_CONFIG.DEFAULT_NOISE_SCALE * COUNTRY_OPTIMISM_WEIGHTS.NOISE_MULTIPLIER),
    noiseDirection: randomNoise(TOPIC_SEED_CONFIG.DEFAULT_NOISE_SCALE * COUNTRY_DIRECTION_WEIGHTS.NOISE_MULTIPLIER),
    noiseGovernment: randomNoise(TOPIC_SEED_CONFIG.DEFAULT_NOISE_SCALE * GOVERNMENT_APPROVAL_WEIGHTS.NOISE_MULTIPLIER),
  };
}

/** Estimación básica de identidad política latente */
function estimatePoliticalIdentity(components: BaseComponents): number {
  const base =
    components.income * POLITICAL_IDENTITY_WEIGHTS.INCOME +
    components.age * POLITICAL_IDENTITY_WEIGHTS.AGE +
    components.connectivity * POLITICAL_IDENTITY_WEIGHTS.CONNECTIVITY +
    components.digital * POLITICAL_IDENTITY_WEIGHTS.DIGITAL +
    components.education * POLITICAL_IDENTITY_WEIGHTS.EDUCATION +
    components.noisePolitical;

  return safeScore(base);
}

/** Estimación de percepción económica personal */
function estimateEconomyPersonal(components: BaseComponents): number {
  const base =
    components.income * ECONOMY_PERSONAL_WEIGHTS.INCOME +
    components.connectivity * ECONOMY_PERSONAL_WEIGHTS.CONNECTIVITY +
    components.digital * ECONOMY_PERSONAL_WEIGHTS.DIGITAL +
    components.age * ECONOMY_PERSONAL_WEIGHTS.AGE +
    ECONOMY_PERSONAL_WEIGHTS.BASE_BIAS +
    components.noiseEconomyPersonal;

  return safeScore(base);
}

/** Estimación de percepción económica nacional */
function estimateEconomyNational(
  components: BaseComponents,
  economyPersonal: number,
  politicalIdentity: number,
): number {
  const base =
    economyPersonal * ECONOMY_NATIONAL_WEIGHTS.ECONOMY_PERSONAL +
    politicalIdentity * ECONOMY_NATIONAL_WEIGHTS.POLITICAL_IDENTITY +
    components.income * ECONOMY_NATIONAL_WEIGHTS.INCOME +
    components.education * ECONOMY_NATIONAL_WEIGHTS.EDUCATION +
    components.connectivity * ECONOMY_NATIONAL_WEIGHTS.CONNECTIVITY +
    ECONOMY_NATIONAL_WEIGHTS.BASE_BIAS +
    components.noiseEconomyNational;

  return safeScore(base);
}

/** Estimación de percepción del empleo */
function estimateEmployment(
  components: BaseComponents,
  economyNational: number,
  economyPersonal: number,
): number {
  const base =
    economyNational * EMPLOYMENT_WEIGHTS.ECONOMY_NATIONAL +
    economyPersonal * EMPLOYMENT_WEIGHTS.ECONOMY_PERSONAL +
    components.noiseEmployment;

  return safeScore(base);
}

/** Estimación de consumo */
function estimateConsumption(
  components: BaseComponents,
  economyPersonal: number,
): number {
  const base =
    economyPersonal * CONSUMPTION_WEIGHTS.ECONOMY_PERSONAL +
    components.income * CONSUMPTION_WEIGHTS.INCOME +
    components.noiseConsumption;

  return safeScore(base);
}

/** Estimación de confianza institucional */
function estimateInstitutionalTrust(components: BaseComponents): number {
  const base =
    components.education * INSTITUTIONAL_TRUST_WEIGHTS.EDUCATION +
    components.age * INSTITUTIONAL_TRUST_WEIGHTS.AGE +
    components.connectivity * INSTITUTIONAL_TRUST_WEIGHTS.CONNECTIVITY +
    components.noiseInstitutional;

  return safeScore(base);
}

/** Estimación de percepción de seguridad */
function estimateSecurityPerception(components: BaseComponents): number {
  const base =
    (SECURITY_PERCEPTION_WEIGHTS.USES_POVERTY_PENALTY ? components.povertyPenalty : 0) +
    (SECURITY_PERCEPTION_WEIGHTS.USES_URBAN_PENALTY ? components.urbanPenalty : 0) +
    components.noiseSecurity;

  return safeScore(base);
}

/** Estimación de optimismo país */
function estimateCountryOptimism(
  components: BaseComponents,
  economyNational: number,
  securityPerception: number,
  economyPersonal: number,
): number {
  const base =
    economyNational * COUNTRY_OPTIMISM_WEIGHTS.ECONOMY_NATIONAL +
    economyPersonal * COUNTRY_OPTIMISM_WEIGHTS.ECONOMY_PERSONAL +
    securityPerception * COUNTRY_OPTIMISM_WEIGHTS.SECURITY_PERCEPTION +
    components.income * COUNTRY_OPTIMISM_WEIGHTS.INCOME +
    COUNTRY_OPTIMISM_WEIGHTS.BASE_BIAS +
    components.noiseOptimism;

  return safeScore(base);
}

/** Estimación de percepción de dirección del país */
function estimateCountryDirection(
  components: BaseComponents,
  optimism: number,
  economyNational: number,
  securityPerception: number,
  politicalIdentity: number,
): number {
  const base =
    optimism * COUNTRY_DIRECTION_WEIGHTS.OPTIMISM +
    economyNational * COUNTRY_DIRECTION_WEIGHTS.ECONOMY_NATIONAL +
    securityPerception * COUNTRY_DIRECTION_WEIGHTS.SECURITY_PERCEPTION +
    politicalIdentity * COUNTRY_DIRECTION_WEIGHTS.POLITICAL_IDENTITY +
    components.income * COUNTRY_DIRECTION_WEIGHTS.INCOME +
    components.noiseDirection;

  return safeScore(base);
}

/** Estimación de aprobación de gobierno */
function estimateGovernmentApproval(
  components: BaseComponents,
  direction: number,
  politicalIdentity: number,
  optimism: number,
): number {
  const base =
    direction * GOVERNMENT_APPROVAL_WEIGHTS.COUNTRY_DIRECTION +
    politicalIdentity * GOVERNMENT_APPROVAL_WEIGHTS.POLITICAL_IDENTITY +
    optimism * GOVERNMENT_APPROVAL_WEIGHTS.OPTIMISM +
    components.income * GOVERNMENT_APPROVAL_WEIGHTS.INCOME +
    components.noiseGovernment;

  return safeScore(base);
}

function buildTopicState(topic: TopicKey, score: number): TopicState {
  return {
    topic,
    score: safeScore(score),
    confidence: clamp(
      TOPIC_STATE_BUILDER.BASE_CONFIDENCE + Math.abs(score) * TOPIC_STATE_BUILDER.SCORE_CONFIDENCE_FACTOR + randomNoise(TOPIC_STATE_BUILDER.CONFIDENCE_NOISE_SCALE),
      TOPIC_STATE_BUILDER.MIN_CONFIDENCE,
      TOPIC_STATE_BUILDER.MAX_CONFIDENCE
    ),
    salience: clamp(
      TOPIC_STATE_BUILDER.BASE_SALIENCE + Math.abs(score) * TOPIC_STATE_BUILDER.SCORE_SALIENCE_FACTOR + randomNoise(TOPIC_STATE_BUILDER.SALIENCE_NOISE_SCALE),
      TOPIC_STATE_BUILDER.MIN_SALIENCE,
      TOPIC_STATE_BUILDER.MAX_SALIENCE
    ),
    volatility: clamp(
      TOPIC_STATE_BUILDER.BASE_VOLATILITY + Math.abs(score) * TOPIC_STATE_BUILDER.SCORE_VOLATILITY_FACTOR + randomNoise(TOPIC_STATE_BUILDER.VOLATILITY_NOISE_SCALE),
      TOPIC_STATE_BUILDER.MIN_VOLATILITY,
      TOPIC_STATE_BUILDER.MAX_VOLATILITY
    ),
    updatedAt: new Date(),
  };
}

/**
 * Construye los estados iniciales del agente.
 * Punto de partida para respuestas longitudinales.
 */
export function buildInitialTopicStates(agent: TopicStateSeedAgent): TopicState[] {
  // Calcular componentes base una sola vez
  const components = calculateBaseComponents(agent);

  // Calcular estimaciones en orden de dependencia
  const politicalIdentity = estimatePoliticalIdentity(components);
  const economyPersonal = estimateEconomyPersonal(components);
  const economyNational = estimateEconomyNational(components, economyPersonal, politicalIdentity);
  const employment = estimateEmployment(components, economyNational, economyPersonal);
  const consumption = estimateConsumption(components, economyPersonal);
  const institutionalTrust = estimateInstitutionalTrust(components);
  const securityPerception = estimateSecurityPerception(components);
  const countryOptimism = estimateCountryOptimism(components, economyNational, securityPerception, economyPersonal);
  const countryDirection = estimateCountryDirection(components, countryOptimism, economyNational, securityPerception, politicalIdentity);
  const governmentApproval = estimateGovernmentApproval(components, countryDirection, politicalIdentity, countryOptimism);

  return [
    buildTopicState('political_identity', politicalIdentity),
    buildTopicState('economy_personal', economyPersonal),
    buildTopicState('economy_national', economyNational),
    buildTopicState('employment', employment),
    buildTopicState('consumption', consumption),
    buildTopicState('institutional_trust', institutionalTrust),
    buildTopicState('security_perception', securityPerception),
    buildTopicState('country_optimism', countryOptimism),
    buildTopicState('country_direction', countryDirection),
    buildTopicState('government_approval', governmentApproval),
  ];
}

/** Obtiene un estado por topic */
export function getTopicState(
  topicStates: TopicState[],
  topic: TopicKey,
): TopicState | undefined {
  return topicStates.find((state) => state.topic === topic);
}

/**
 * Actualiza un estado de tema con un delta controlado.
 * Mantiene score en rango y refresca updatedAt.
 */
export function updateTopicState(
  topicState: TopicState,
  delta: number,
): TopicState {
  return {
    ...topicState,
    score: safeScore(topicState.score + delta),
    updatedAt: new Date(),
  };
}
