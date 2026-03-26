import type { PanelState } from './types';

export interface PanelBehaviorAgent {
  age?: number;
  educationLevel?: string;
  connectivityLevel?: string;
  digitalExposure?: string;
  preferredChannel?: string;
}

/** Limita un valor a rango */
function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/** Convierte etiquetas ordinales a score aproximado */
function ordinalToScore(value?: string): number {
  if (!value) return 0;

  const normalized = value.toLowerCase();

  if (['none', 'very_low', 'low'].includes(normalized)) return -0.6;
  if (['medium', 'mid'].includes(normalized)) return 0;
  if (['high', 'very_high'].includes(normalized)) return 0.6;

  return 0;
}

/**
 * Probabilidad de iniciar una encuesta una vez invitado.
 */
export function probabilityToStartSurvey(
  agent: PanelBehaviorAgent,
  panelState: PanelState,
): number {
  const digital = ordinalToScore(agent.digitalExposure);
  const connectivity = ordinalToScore(agent.connectivityLevel);

  const ageFactor =
    agent.age === undefined
      ? 0
      : agent.age < 30
        ? 0.02
        : agent.age < 60
          ? 0.05
          : -0.03;

  const channelFactor =
    (agent.preferredChannel ?? '').toLowerCase() === 'online'
      ? 0.06
      : (agent.preferredChannel ?? '').toLowerCase() === 'mixed'
        ? 0.03
        : -0.04;

  const fatiguePenalty = panelState.panelFatigue * 0.25;

  return clamp(
    panelState.participationPropensity +
      digital * 0.08 +
      connectivity * 0.08 +
      ageFactor +
      channelFactor -
      fatiguePenalty,
    0.02,
    0.98,
  );
}

/**
 * Probabilidad de completar una encuesta una vez iniciada.
 */
export function probabilityToCompleteSurvey(
  agent: PanelBehaviorAgent,
  panelState: PanelState,
  surveyLength: number,
): number {
  const connectivity = ordinalToScore(agent.connectivityLevel);
  const educationBonus =
    ['technical', 'university', 'postgraduate'].includes(
      (agent.educationLevel ?? '').toLowerCase(),
    )
      ? 0.05
      : 0;

  const lengthPenalty = Math.min(0.25, surveyLength * 0.01);
  const fatiguePenalty = panelState.panelFatigue * 0.3;
  const qualityBonus = (panelState.qualityScore - 0.5) * 0.2;

  return clamp(
    0.82 +
      connectivity * 0.05 +
      educationBonus +
      qualityBonus -
      lengthPenalty -
      fatiguePenalty,
    0.05,
    0.99,
  );
}

/**
 * Riesgo de straightlining en encuestas más largas.
 */
export function estimateStraightliningRisk(
  panelState: PanelState,
  surveyLength: number,
): number {
  const fatigueEffect = panelState.panelFatigue * 0.35;
  const qualityProtection = (panelState.qualityScore - 0.5) * 0.25;
  const lengthEffect = Math.min(0.2, surveyLength * 0.008);

  return clamp(
    0.04 +
      fatigueEffect +
      lengthEffect -
      qualityProtection,
    0.01,
    0.75,
  );
}

/**
 * Riesgo de no respuesta a medida que avanza la encuesta.
 */
export function estimateNoResponseRisk(
  panelState: PanelState,
  questionIndex: number,
  totalQuestions: number,
): number {
  const progress =
    totalQuestions <= 1 ? 0 : questionIndex / totalQuestions;

  const fatigueEffect = panelState.panelFatigue * 0.18;
  const progressEffect = Math.pow(progress, 1.4) * 0.12;
  const qualityProtection = (panelState.qualityScore - 0.5) * 0.08;

  return clamp(
    0.015 +
      fatigueEffect +
      progressEffect -
      qualityProtection,
    0.005,
    0.4,
  );
}
