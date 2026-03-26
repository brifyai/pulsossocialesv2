/**
 * CADEM Opinion Engine v1 - Tipos Globales
 * Tipos compartidos entre módulos del motor.
 */

export type TopicKey =
  | 'government_approval'
  | 'country_direction'
  | 'country_optimism'
  | 'economy_personal'
  | 'economy_national'
  | 'employment'
  | 'consumption'
  | 'institutional_trust'
  | 'political_identity'
  | 'security_perception';

export type QuestionFamily =
  | 'approval'
  | 'direction'
  | 'optimism'
  | 'economic_perception'
  | 'security_perception'
  | 'ideology'
  | 'awareness'
  | 'image'
  | 'trust'
  | 'priority'
  | 'open_text';

export type ResponseFormat =
  | 'binary_nr'
  | 'ordinal_4_nr'
  | 'ordinal_5_nr'
  | 'scale_1_7'
  | 'categorical'
  | 'ranked'
  | 'text';

export type ApprovalAnswer =
  | 'approve'
  | 'disapprove'
  | 'no_response';

export type CountryDirectionAnswer =
  | 'good_path'
  | 'bad_path'
  | 'no_response';

export type OptimismAnswer =
  | 'very_optimistic'
  | 'optimistic'
  | 'pessimistic'
  | 'very_pessimistic'
  | 'no_response';

export type EconomicPerceptionAnswer =
  | 'very_good'
  | 'good'
  | 'bad'
  | 'very_bad'
  | 'no_response';

export type SecurityPerceptionAnswer =
  | 'very_safe'
  | 'safe'
  | 'unsafe'
  | 'very_unsafe'
  | 'no_response';

export type PoliticalIdentityAnswer =
  | 'right'
  | 'center_right'
  | 'center'
  | 'center_left'
  | 'left'
  | 'independent'
  | 'no_response';

export type AwarenessAnswer =
  | 'knows'
  | 'does_not_know'
  | 'no_response';

export type ImageAnswer =
  | 'very_positive'
  | 'positive'
  | 'negative'
  | 'very_negative'
  | 'no_response';

export type Ordinal4Answer =
  | 'very_positive'
  | 'positive'
  | 'negative'
  | 'very_negative'
  | 'no_response';

export type TrustScaleAnswer = 1 | 2 | 3 | 4 | 5 | 6 | 7 | null;

/** Ordered ranked answers, e.g. first and second priority */
export type PriorityAnswer = string[];

export type OpenTextAnswer = string;

export type OpinionResponseValue =
  | ApprovalAnswer
  | CountryDirectionAnswer
  | OptimismAnswer
  | EconomicPerceptionAnswer
  | SecurityPerceptionAnswer
  | PoliticalIdentityAnswer
  | AwarenessAnswer
  | ImageAnswer
  | TrustScaleAnswer
  | PriorityAnswer
  | OpenTextAnswer
  | null;

export const QUESTION_FAMILY_FORMATS: Record<QuestionFamily, ResponseFormat> = {
  approval: 'binary_nr',
  direction: 'binary_nr',
  optimism: 'ordinal_4_nr',
  economic_perception: 'ordinal_4_nr',
  security_perception: 'ordinal_4_nr',
  ideology: 'categorical',
  awareness: 'categorical',
  image: 'ordinal_4_nr',
  trust: 'scale_1_7',
  priority: 'ranked',
  open_text: 'text',
};

export const TOPIC_FAMILY_MAP: Record<TopicKey, QuestionFamily> = {
  government_approval: 'approval',
  country_direction: 'direction',
  country_optimism: 'optimism',
  economy_personal: 'economic_perception',
  economy_national: 'economic_perception',
  employment: 'economic_perception',
  consumption: 'economic_perception',
  institutional_trust: 'trust',
  political_identity: 'ideology',
  security_perception: 'security_perception',
};
