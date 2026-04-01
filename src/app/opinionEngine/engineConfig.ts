/**
 * Engine Configuration - Centralized Calibration Constants
 * 
 * This file contains all calibration constants for the opinion engine.
 * Any changes to these values should be documented with:
 * - Date of change
 * - Reason for change
 * - Expected impact
 * 
 * @version 1.0.0
 * @lastModified 2026-03-31
 */

// ============================================================================
// FATIGUE CONFIGURATION
// ============================================================================

export const FATIGUE_CONFIG = {
  /** Maximum fatigue impact (30% = 0.3) */
  MAX_IMPACT: 0.3,
  
  /** Exponent for non-linear fatigue growth (higher = faster growth at end) */
  GROWTH_EXPONENT: 1.5,
  
  /** Threshold for significant fatigue warning in reasoning */
  SIGNIFICANT_THRESHOLD: 0.25,
} as const;

// ============================================================================
// CONFIDENCE CONFIGURATION
// ============================================================================

export const CONFIDENCE_CONFIG = {
  /** Fatigue impact on confidence (reduces confidence) */
  FATIGUE_REDUCTION_FACTOR: 0.15,
  
  /** Quality score adjustment factor */
  QUALITY_SCORE_FACTOR: 0.1,
  
  /** Base confidence center point */
  BASE_CENTER: 0.5,
  
  /** Minimum confidence value */
  MIN_VALUE: 0.1,
  
  /** Maximum confidence value */
  MAX_VALUE: 0.98,
} as const;

// ============================================================================
// RESPONSE FACTORS WEIGHTS
// ============================================================================

export const RESPONSE_FACTORS = {
  /** Topic state factor weight */
  TOPIC_STATE: 0.45,
  
  /** Demographic factor weight */
  DEMOGRAPHIC: 0.25,
  
  /** Panel fatigue factor weight (multiplied by fatigue factor) */
  PANEL_FATIGUE: 0.3,
  
  /** Question context factor weight */
  QUESTION_CONTEXT: 0.1,
  
  /** Random noise factor weight */
  RANDOM_NOISE: 0.05,
} as const;

// ============================================================================
// RANDOM NOISE CONFIGURATION
// ============================================================================

export const NOISE_CONFIG = {
  /** Default noise scale for score variation */
  DEFAULT_SCALE: 0.06,
  
  /** Noise scale for approval questions */
  APPROVAL_SCALE: 0.07,
  
  /** Noise scale for direction questions */
  DIRECTION_SCALE: 0.07,
  
  /** Noise scale for optimism questions */
  OPTIMISM_SCALE: 0.08,
  
  /** Noise scale for economic questions */
  ECONOMIC_SCALE: 0.08,
  
  /** Noise scale for security questions */
  SECURITY_SCALE: 0.08,
  
  /** Noise scale for ideology questions */
  IDEOLOGY_SCALE: 0.06,
} as const;

// ============================================================================
// NO-RESPONSE PROBABILITY CONFIGURATION
// ============================================================================

export const NO_RESPONSE_CONFIG = {
  /** Base probability of no response (CALIBRACIÓN v5.0: ajustado de 0.02 a 0.06 para alcanzar 5-15%) */
  BASE_PROBABILITY: 0.06,
  
  /** Uncertainty boost factor (higher when score is near 0) */
  UNCERTAINTY_BOOST_MAX: 0.15,
  
  /** Uncertainty boost multiplier (CALIBRACIÓN v5.0: ajustado de 0.25 a 0.35) */
  UNCERTAINTY_BOOST_MULTIPLIER: 0.35,
  
  /** Specific probabilities by question type (CALIBRACIÓN v5.0: aumentados) */
  OPTIMISM: 0.07,
  ECONOMIC: 0.06,
  SECURITY: 0.06,
  IDEOLOGY: 0.08,
} as const;

// ============================================================================
// CONFIDENCE CALCULATION CONFIGURATION
// ============================================================================

export const CONFIDENCE_CALCULATION = {
  /** Base confidence value */
  BASE: 0.45,
  
  /** Score contribution factor */
  SCORE_FACTOR: 0.35,
  
  /** State confidence contribution factor */
  STATE_CONFIDENCE_FACTOR: 0.2,
  
  /** Minimum confidence from score */
  MIN_FROM_SCORE: 0.2,
  
  /** Maximum confidence from score */
  MAX_FROM_SCORE: 0.98,
  
  /** Default state confidence when not provided */
  DEFAULT_STATE_CONFIDENCE: 0.6,
} as const;


// ============================================================================
// TOPIC STATE SEED CONFIGURATION
// ============================================================================

export const TOPIC_SEED_CONFIG = {
  /** Default noise scale for topic state generation */
  DEFAULT_NOISE_SCALE: 0.08,
  
  /** Income decile center point (5.5 for deciles 1-10) */
  INCOME_DECILE_CENTER: 5.5,
  
  /** Income decile range divisor */
  INCOME_DECILE_DIVISOR: 4.5,
  
  /** Income score multiplier */
  INCOME_SCORE_MULTIPLIER: 0.4,
  
  /** Poverty penalty for extreme poverty/poverty */
  POVERTY_PENALTY_HIGH: -0.25,
  
  /** Poverty penalty for vulnerable */
  POVERTY_PENALTY_LOW: -0.1,
  
  /** Urban penalty for RM region */
  URBAN_PENALTY: -0.1,
} as const;

// ============================================================================
// EDUCATION SCORE MAPPING
// ============================================================================

export const EDUCATION_SCORES: Record<string, number> = {
  none: -0.35,
  primary: -0.35,
  secondary: 0,
  technical: 0.15,
  university: 0.35,
  postgraduate: 0.35,
} as const;

// ============================================================================
// AGE SCORE MAPPING
// ============================================================================

export const AGE_SCORES = {
  /** Under 30 years */
  YOUNG: 0.15,
  
  /** 30-49 years */
  ADULT: 0.05,
  
  /** 50-69 years */
  MIDDLE_AGE: -0.05,
  
  /** 70+ years */
  SENIOR: -0.1,
} as const;

// ============================================================================
// ORDINAL LEVEL MAPPING
// ============================================================================

export const ORDINAL_SCORES: Record<string, number> = {
  none: -0.5,
  low: -0.5,
  very_low: -0.5,
  medium: 0,
  mid: 0,
  high: 0.5,
  very_high: 0.5,
} as const;

// ============================================================================
// POLITICAL IDENTITY ESTIMATION WEIGHTS
// ============================================================================

export const POLITICAL_IDENTITY_WEIGHTS = {
  /** Income weight */
  INCOME: 0.45,
  
  /** Age weight */
  AGE: 0.2,
  
  /** Connectivity weight */
  CONNECTIVITY: 0.08,
  
  /** Digital exposure weight */
  DIGITAL: 0.08,
  
  /** Education weight (negative) */
  EDUCATION: -0.1,
  
  /** Noise multiplier */
  NOISE_MULTIPLIER: 1.5,
} as const;

// ============================================================================
// ECONOMY PERSONAL ESTIMATION WEIGHTS
// ============================================================================

export const ECONOMY_PERSONAL_WEIGHTS = {
  /** Income weight */
  INCOME: 0.40,
  
  /** Connectivity weight */
  CONNECTIVITY: 0.15,
  
  /** Digital exposure weight */
  DIGITAL: 0.08,
  
  /** Age weight */
  AGE: 0.05,
  
  /** Base bias (CALIBRACIÓN v4.7: ajustado de +0.02 a -0.03) */
  BASE_BIAS: -0.03,
  
  /** Noise multiplier */
  NOISE_MULTIPLIER: 1.0,
} as const;

// ============================================================================
// ECONOMY NATIONAL ESTIMATION WEIGHTS
// ============================================================================

export const ECONOMY_NATIONAL_WEIGHTS = {
  /** Economy personal dependency */
  ECONOMY_PERSONAL: 0.12,
  
  /** Political identity influence */
  POLITICAL_IDENTITY: 0.08,
  
  /** Income weight */
  INCOME: 0.05,
  
  /** Education weight */
  EDUCATION: 0.10,
  
  /** Connectivity weight */
  CONNECTIVITY: 0.05,
  
  /** Base bias (CALIBRACIÓN v4.8: ajustado de -0.08 a -0.05) */
  BASE_BIAS: -0.05,
  
  /** Noise multiplier */
  NOISE_MULTIPLIER: 1.1,
} as const;

// ============================================================================
// EMPLOYMENT ESTIMATION WEIGHTS
// ============================================================================

export const EMPLOYMENT_WEIGHTS = {
  /** Economy national dependency */
  ECONOMY_NATIONAL: 0.55,
  
  /** Economy personal dependency */
  ECONOMY_PERSONAL: 0.2,
} as const;

// ============================================================================
// CONSUMPTION ESTIMATION WEIGHTS
// ============================================================================

export const CONSUMPTION_WEIGHTS = {
  /** Economy personal dependency */
  ECONOMY_PERSONAL: 0.6,
  
  /** Income weight */
  INCOME: 0.2,
} as const;

// ============================================================================
// INSTITUTIONAL TRUST ESTIMATION WEIGHTS
// ============================================================================

export const INSTITUTIONAL_TRUST_WEIGHTS = {
  /** Education weight */
  EDUCATION: 0.2,
  
  /** Age weight */
  AGE: 0.15,
  
  /** Connectivity weight */
  CONNECTIVITY: 0.1,
} as const;

// ============================================================================
// SECURITY PERCEPTION ESTIMATION
// ============================================================================

export const SECURITY_PERCEPTION_WEIGHTS = {
  /** Uses poverty penalty directly */
  USES_POVERTY_PENALTY: true,
  
  /** Uses urban penalty directly */
  USES_URBAN_PENALTY: true,
} as const;

// ============================================================================
// COUNTRY DIRECTION ESTIMATION WEIGHTS
// ============================================================================

export const COUNTRY_DIRECTION_WEIGHTS = {
  /** Optimism dependency */
  OPTIMISM: 0.35,
  
  /** Economy national dependency */
  ECONOMY_NATIONAL: 0.15,
  
  /** Security perception dependency */
  SECURITY_PERCEPTION: 0.05,
  
  /** Political identity dependency */
  POLITICAL_IDENTITY: 0.15,
  
  /** Income weight */
  INCOME: 0.05,
  
  /** Noise multiplier */
  NOISE_MULTIPLIER: 1.3,
} as const;

// ============================================================================
// COUNTRY OPTIMISM ESTIMATION WEIGHTS
// ============================================================================

export const COUNTRY_OPTIMISM_WEIGHTS = {
  /** Economy national dependency */
  ECONOMY_NATIONAL: 0.15,
  
  /** Economy personal dependency */
  ECONOMY_PERSONAL: 0.25,
  
  /** Security perception dependency */
  SECURITY_PERCEPTION: 0.05,
  
  /** Income weight */
  INCOME: 0.1,
  
  /** Base bias (CALIBRACIÓN v5.1: ajustado de -0.08 a +0.04 para aumentar optimismo) */
  BASE_BIAS: 0.04,
  
  /** Noise multiplier */
  NOISE_MULTIPLIER: 1.4,
} as const;

// ============================================================================
// SCORE THRESHOLDS
// ============================================================================

export const SCORE_THRESHOLDS = {
  /** Threshold for "very" positive/negative (optimism, economy) */
  VERY_EXTREME: 0.4,
  
  /** Threshold for "very" positive/negative (security) */
  SECURITY_VERY_EXTREME: 0.5,
  
  /** Threshold for right/left ideology */
  IDEOLOGY_EXTREME: 0.55,
  
  /** Threshold for center-right/center-left */
  IDEOLOGY_MODERATE: 0.18,
  
  /** Threshold for center (independent check) */
  IDEOLOGY_CENTER: 0.10,
  
  /** Maximum confidence for independent classification */
  INDEPENDENT_MAX_CONFIDENCE: 0.65,
  
  /** Threshold for "progressing" in economic questions (CALIBRACIÓN v5.2: ajustado de ±0.08 a ±0.04 para reducir "progressing") */
  ECONOMIC_PROGRESSING_MIN: -0.04,
  ECONOMIC_PROGRESSING_MAX: 0.04,
} as const;

// ============================================================================
// GOVERNMENT APPROVAL ESTIMATION WEIGHTS
// ============================================================================

export const GOVERNMENT_APPROVAL_WEIGHTS = {
  /** Country direction dependency */
  COUNTRY_DIRECTION: 0.25,
  
  /** Political identity dependency */
  POLITICAL_IDENTITY: 0.3,
  
  /** Optimism dependency */
  OPTIMISM: 0.1,
  
  /** Income dependency */
  INCOME: 0.1,
  
  /** Noise multiplier */
  NOISE_MULTIPLIER: 1.4,
} as const;

// ============================================================================
// TOPIC STATE BUILDER CONFIGURATION
// ============================================================================

export const TOPIC_STATE_BUILDER = {
  /** Base confidence */
  BASE_CONFIDENCE: 0.55,
  
  /** Score contribution to confidence */
  SCORE_CONFIDENCE_FACTOR: 0.25,
  
  /** Noise scale for confidence */
  CONFIDENCE_NOISE_SCALE: 0.04,
  
  /** Minimum confidence */
  MIN_CONFIDENCE: 0.2,
  
  /** Maximum confidence */
  MAX_CONFIDENCE: 0.95,
  
  /** Base salience */
  BASE_SALIENCE: 0.5,
  
  /** Score contribution to salience */
  SCORE_SALIENCE_FACTOR: 0.15,
  
  /** Noise scale for salience */
  SALIENCE_NOISE_SCALE: 0.03,
  
  /** Minimum salience */
  MIN_SALIENCE: 0.2,
  
  /** Maximum salience */
  MAX_SALIENCE: 0.95,
  
  /** Base volatility */
  BASE_VOLATILITY: 0.45,
  
  /** Score contribution to volatility (negative - higher score = lower volatility) */
  SCORE_VOLATILITY_FACTOR: -0.15,
  
  /** Noise scale for volatility */
  VOLATILITY_NOISE_SCALE: 0.04,
  
  /** Minimum volatility */
  MIN_VOLATILITY: 0.05,
  
  /** Maximum volatility */
  MAX_VOLATILITY: 0.9,
} as const;

// ============================================================================
// DEFAULT VALUES FOR MISSING STATES
// ============================================================================

export const DEFAULT_TOPIC_STATE = {
  /** Default score when topic state is missing */
  SCORE: 0,
  
  /** Default confidence when topic state is missing */
  CONFIDENCE: 0.4,
  
  /** Default salience when topic state is missing */
  SALIENCE: 0.5,
  
  /** Default volatility when topic state is missing */
  VOLATILITY: 0.5,
} as const;

// ============================================================================
// CLAMP UTILITIES
// ============================================================================

/**
 * Clamps a value between min and max
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Generates random noise within a given scale
 * @param scale - The scale of the noise (default: NOISE_CONFIG.DEFAULT_SCALE)
 */
export function randomNoise(scale: number = NOISE_CONFIG.DEFAULT_SCALE): number {
  return (Math.random() * 2 - 1) * scale;
}

/**
 * Safely clamps a score to [-1, 1] range
 */
export function safeScore(value: number): number {
  return clamp(value, -1, 1);
}
