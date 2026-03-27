import type { TopicKey } from '../../types/opinion';
import type { TopicState } from './types';

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
  const centered = (incomeDecile - 5.5) / 4.5;
  // Mantenido en 0.4 - el ajuste se hace en los pesos de las funciones
  return clamp(centered, -1, 1) * 0.4;
}

/** Score aproximado según edad */
function ageScore(age?: number): number {
  if (age === undefined || age === null) return 0;
  if (age < 30) return 0.15;
  if (age < 50) return 0.05;
  if (age < 70) return -0.05;
  return -0.1;
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
      ? -0.25  // Reducido de -0.45 para no afectar tanto la economía personal
      : agent.povertyStatus === 'vulnerable'
        ? -0.1   // Reducido de -0.2
        : 0;

  const urbanPenalty =
    agent.regionCode === 'CL-RM' || agent.regionCode === 'RM'
      ? -0.1
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
    noisePolitical: randomNoise(0.12),
    noiseEconomyPersonal: randomNoise(0.1),
    noiseEconomyNational: randomNoise(0.14),
    noiseEmployment: randomNoise(0.12),
    noiseConsumption: randomNoise(0.1),
    noiseInstitutional: randomNoise(0.15),
    noiseSecurity: randomNoise(0.18),
    noiseOptimism: randomNoise(0.15),
    noiseDirection: randomNoise(0.12),
    noiseGovernment: randomNoise(0.12),
  };
}

/** Estimación básica de identidad política latente */
function estimatePoliticalIdentity(components: BaseComponents): number {
  // Aumentado peso de ingreso y ruido para más dispersión
  const base =
    components.income * 0.45 +
    components.age * 0.2 +
    components.connectivity * 0.08 +
    components.digital * 0.08 -
    components.education * 0.1 +
    components.noisePolitical * 1.5; // Más ruido para dispersión

  return safeScore(base);
}

/** Estimación de percepción económica personal */
function estimateEconomyPersonal(components: BaseComponents): number {
  // CALIBRACIÓN v4.7: Ajuste mínimo conjunto - bajar ambas economías
  // Objetivo: mantener separación personal > nacional pero bajar nivel general
  // Ajuste: sesgo de +0.02 a -0.03 para bajar de 64.6% hacia ~52%
  // Resultado previo: 64.6% positivos (alto), target: ~52%
  const base =
    components.income * 0.40 +      // Mantenido en 0.40
    components.connectivity * 0.15 + // Conectividad como proxy de estabilidad
    components.digital * 0.08 +      // Exposición digital
    components.age * 0.05 +          // Edad tiene ligero efecto
    -0.03 +                          // Sesgo base ajustado (era +0.02)
    components.noiseEconomyPersonal * 1.0; // Ruido independiente

  return safeScore(base);
}

/** Estimación de percepción económica nacional */
function estimateEconomyNational(
  components: BaseComponents,
  economyPersonal: number,
  politicalIdentity: number,
): number {
  // CALIBRACIÓN v4.8: Ajuste fino - subir ligeramente economy_national
  // Objetivo: acercar a target de ~36% sin afectar economy_personal
  // Ajuste: de -0.08 a -0.05 para subir de 26.3% hacia ~36%
  // Resultado previo: 26.3% positivos (bajo), target: ~36%
  const base =
    economyPersonal * 0.12 +        // Dependencia de economía personal
    politicalIdentity * 0.08 +      // Ideología influye en visión macro
    components.income * 0.05 +      // Ingreso personal influye menos
    components.education * 0.10 +   // Educación influye en perspectiva macro
    components.connectivity * 0.05 + // Conectividad tiene efecto menor
    -0.05 +                          // Sesgo base ajustado (era -0.08)
    components.noiseEconomyNational * 1.1; // Ruido independiente

  return safeScore(base);
}

/** Estimación de percepción del empleo */
function estimateEmployment(
  components: BaseComponents,
  economyNational: number,
  economyPersonal: number,
): number {
  const base =
    economyNational * 0.55 +
    economyPersonal * 0.2 +
    components.noiseEmployment;

  return safeScore(base);
}

/** Estimación de consumo */
function estimateConsumption(
  components: BaseComponents,
  economyPersonal: number,
): number {
  const base =
    economyPersonal * 0.6 +
    components.income * 0.2 +
    components.noiseConsumption;

  return safeScore(base);
}

/** Estimación de confianza institucional */
function estimateInstitutionalTrust(components: BaseComponents): number {
  const base =
    components.education * 0.2 +
    components.age * 0.15 +
    components.connectivity * 0.1 +
    components.noiseInstitutional;

  return safeScore(base);
}

/** Estimación de percepción de seguridad */
function estimateSecurityPerception(components: BaseComponents): number {
  const base =
    components.povertyPenalty +
    components.urbanPenalty +
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
  // CALIBRACIÓN v4.10: Ajustar optimismo - reducir bias
  // Objetivo: bajar de 79.7% hacia ~60-62%
  // Problema: v4.9 se pasó (79.7% vs target 62%)
  // Cambios:
  // - Reducir bias base de +0.15 a +0.06 (mitad aprox)
  // - Mantener pesos ajustados de v4.9
  const base =
    economyNational * 0.15 +        // Mantenido de v4.9
    economyPersonal * 0.25 +        // Mantenido de v4.9
    securityPerception * 0.05 +     // Mantenido de v4.9
    components.income * 0.1 +       // Mantenido
    0.06 +                          // AJUSTADO: bias base reducido (era 0.15)
    components.noiseOptimism * 1.4; // Mantenido

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
  // Reducida cascada: menos dependencia de optimismo, más independencia
  const base =
    optimism * 0.2 +
    economyNational * 0.2 +
    securityPerception * 0.1 +
    politicalIdentity * 0.15 +
    components.income * 0.1 +
    components.noiseDirection * 1.3;

  return safeScore(base);
}

/** Estimación de aprobación de gobierno */
function estimateGovernmentApproval(
  components: BaseComponents,
  direction: number,
  politicalIdentity: number,
  optimism: number,
): number {
  // Reducida cascada: menos dependencia de direction/optimism, más independencia
  const base =
    direction * 0.25 +
    politicalIdentity * 0.3 +
    optimism * 0.1 +
    components.income * 0.1 +
    components.noiseGovernment * 1.4;

  return safeScore(base);
}

function buildTopicState(topic: TopicKey, score: number): TopicState {
  return {
    topic,
    score: safeScore(score),
    confidence: clamp(0.55 + Math.abs(score) * 0.25 + randomNoise(0.04), 0.2, 0.95),
    salience: clamp(0.5 + Math.abs(score) * 0.15 + randomNoise(0.03), 0.2, 0.95),
    volatility: clamp(0.45 - Math.abs(score) * 0.15 + randomNoise(0.04), 0.05, 0.9),
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
