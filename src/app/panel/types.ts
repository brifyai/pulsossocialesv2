/**
 * Tipos del módulo panel para CADEM Opinion Engine v1.
 * Modela elegibilidad, fatiga, participación y muestreo por cuotas.
 */

/** Estado operativo del panelista dentro del panel online */
export type PanelistStatus =
  | 'eligible'
  | 'cooldown'
  | 'inactive'
  | 'excluded';

/** Nivel cualitativo de fatiga del panelista */
export type FatigueLevel =
  | 'none'
  | 'low'
  | 'medium'
  | 'high';

/** Estado persistente del agente como panelista */
export interface PanelState {
  agentId: string;
  eligibleWeb: boolean;
  participationPropensity: number;
  panelFatigue: number;
  qualityScore: number;
  cooldownUntil: Date | null;
  invites30d: number;
  completions30d: number;
  lastInvitedAt: Date | null;
  lastCompletedAt: Date | null;
  updatedAt?: Date;
}

/** Cuotas objetivo para una muestra tipo Cadem */
export interface SamplingContext {
  sampleSize: number;
  minCooldownDays?: number;
  quotas?: {
    gender?: Record<string, number>;
    ageGroup?: Record<string, number>;
    macrozone?: Record<string, number>;
    gse?: Record<string, number>;
  };
  weekKey?: string;
}

/** Bucket de cuota individual */
export interface QuotaBucket {
  key: string;
  target: number;
  actual: number;
}

/** Reporte de cumplimiento de cuotas */
export interface QuotaReport {
  gender?: QuotaBucket[];
  ageGroup?: QuotaBucket[];
  macrozone?: QuotaBucket[];
  gse?: QuotaBucket[];
}

/** Resultado de selección muestral */
export interface SampleSelectionResult<TAgent = unknown> {
  selectedAgents: TAgent[];
  quotaReport: QuotaReport;
  rejectedCounts: {
    cooldown: number;
    notEligibleWeb: number;
    lowParticipation: number;
    quotaOverflow: number;
    other: number;
  };
}
