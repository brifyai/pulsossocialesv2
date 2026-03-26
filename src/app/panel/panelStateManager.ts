import type { PanelState } from './types';

export interface PanelSeedAgent {
  agentId: string;
  age?: number;
  connectivityLevel?: string;
  digitalExposure?: string;
  preferredChannel?: string;
  educationLevel?: string;
}

/** Limita valores numéricos a un rango */
function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/** Convierte niveles categóricos simples a score aproximado */
function ordinalToScore(value?: string): number {
  if (!value) return 0;

  const normalized = value.toLowerCase();

  if (['none', 'very_low', 'low'].includes(normalized)) return -0.6;
  if (['medium', 'mid'].includes(normalized)) return 0;
  if (['high', 'very_high'].includes(normalized)) return 0.6;

  return 0;
}

/** Determina elegibilidad web inicial */
function inferEligibleWeb(agent: PanelSeedAgent): boolean {
  const connectivity = ordinalToScore(agent.connectivityLevel);
  const digital = ordinalToScore(agent.digitalExposure);
  const preferred = (agent.preferredChannel ?? '').toLowerCase();

  if (preferred === 'online') return true;
  if (preferred === 'phone' && connectivity < 0 && digital < 0) return false;

  return connectivity + digital >= -0.4;
}

/** Estima propensión inicial de participación */
function inferParticipationPropensity(agent: PanelSeedAgent): number {
  const connectivity = ordinalToScore(agent.connectivityLevel);
  const digital = ordinalToScore(agent.digitalExposure);
  const ageFactor =
    agent.age === undefined
      ? 0
      : agent.age < 30
        ? 0.05
        : agent.age < 60
          ? 0.12
          : -0.05;

  const channelFactor =
    (agent.preferredChannel ?? '').toLowerCase() === 'online'
      ? 0.12
      : (agent.preferredChannel ?? '').toLowerCase() === 'mixed'
        ? 0.05
        : -0.05;

  const educationFactor =
    ['technical', 'university', 'postgraduate'].includes(
      (agent.educationLevel ?? '').toLowerCase(),
    )
      ? 0.06
      : 0;

  return clamp(
    0.45 +
      connectivity * 0.15 +
      digital * 0.15 +
      ageFactor +
      channelFactor +
      educationFactor,
    0.05,
    0.95,
  );
}

/** Estima quality score inicial */
function inferQualityScore(agent: PanelSeedAgent): number {
  const connectivity = ordinalToScore(agent.connectivityLevel);
  const digital = ordinalToScore(agent.digitalExposure);
  const educationFactor =
    ['technical', 'university', 'postgraduate'].includes(
      (agent.educationLevel ?? '').toLowerCase(),
    )
      ? 0.08
      : ['secondary'].includes((agent.educationLevel ?? '').toLowerCase())
        ? 0.03
        : -0.03;

  return clamp(
    0.72 +
      connectivity * 0.08 +
      digital * 0.06 +
      educationFactor,
    0.3,
    0.98,
  );
}

/** Construye el estado inicial del panelista */
export function buildInitialPanelState(agent: PanelSeedAgent): PanelState {
  return {
    agentId: agent.agentId,
    eligibleWeb: inferEligibleWeb(agent),
    participationPropensity: inferParticipationPropensity(agent),
    panelFatigue: 0,
    qualityScore: inferQualityScore(agent),
    cooldownUntil: null,
    invites30d: 0,
    completions30d: 0,
    lastInvitedAt: null,
    lastCompletedAt: null,
    updatedAt: new Date(),
  };
}

/** Determina si el panelista está elegible para una nueva medición */
export function isEligibleForSurvey(
  panelState: PanelState,
  referenceDate: Date,
): boolean {
  if (!panelState.eligibleWeb) return false;

  if (panelState.cooldownUntil && panelState.cooldownUntil > referenceDate) {
    return false;
  }

  return true;
}

/** Actualiza estado del panelista después de una invitación */
export function updatePanelAfterInvite(
  panelState: PanelState,
  referenceDate: Date,
): PanelState {
  return {
    ...panelState,
    invites30d: panelState.invites30d + 1,
    panelFatigue: clamp(panelState.panelFatigue + 0.04, 0, 1),
    lastInvitedAt: referenceDate,
    updatedAt: referenceDate,
  };
}

/** Actualiza estado del panelista después de completar una encuesta */
export function updatePanelAfterCompletion(
  panelState: PanelState,
  referenceDate: Date,
): PanelState {
  const cooldownUntil = new Date(referenceDate);
  cooldownUntil.setDate(cooldownUntil.getDate() + 7);

  return {
    ...panelState,
    completions30d: panelState.completions30d + 1,
    panelFatigue: clamp(panelState.panelFatigue + 0.08, 0, 1),
    cooldownUntil,
    lastCompletedAt: referenceDate,
    updatedAt: referenceDate,
  };
}
