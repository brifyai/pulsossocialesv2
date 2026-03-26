/**
 * Normaliza respuestas de legacy y CADEM a un espacio canónico común
 * para comparación A/B válida.
 */

export type CanonicalQuestionId =
  | 'q_approval'
  | 'q_direction'
  | 'q_optimism'
  | 'q_economy_national'
  | 'q_economy_personal'
  | 'q_ideology';

export type CanonicalResponseValue =
  | 'approve'
  | 'disapprove'
  | 'good_path'
  | 'bad_path'
  | 'very_optimistic'
  | 'optimistic'
  | 'pessimistic'
  | 'very_pessimistic'
  | 'very_good'
  | 'good'
  | 'bad'
  | 'very_bad'
  | 'right'
  | 'center_right'
  | 'center'
  | 'center_left'
  | 'left'
  | 'independent'
  | 'no_response'
  | 'unknown';

function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\s]/g, '_')
    .replace(/\s+/g, '_')
    .replace(/_+/g, '_')
    .trim();
}

function canonicalizeApproval(raw: string): CanonicalResponseValue {
  const v = normalizeText(raw);

  if (['approve', 'aprueba'].includes(v)) return 'approve';
  if (['disapprove', 'desaprueba'].includes(v)) return 'disapprove';
  if (['no_response', 'no_responde', 'ns_nr', 'ns', 'nr'].includes(v)) return 'no_response';

  return 'unknown';
}

function canonicalizeDirection(raw: string): CanonicalResponseValue {
  const v = normalizeText(raw);

  if (['good_path', 'buen_camino'].includes(v)) return 'good_path';
  if (['bad_path', 'mal_camino'].includes(v)) return 'bad_path';
  if (['no_response', 'no_responde', 'ns_nr', 'ns', 'nr'].includes(v)) return 'no_response';

  return 'unknown';
}

function canonicalizeOptimism(raw: string): CanonicalResponseValue {
  const v = normalizeText(raw);

  if (['very_optimistic', 'muy_optimista'].includes(v)) return 'very_optimistic';
  if (['optimistic', 'optimista'].includes(v)) return 'optimistic';
  if (['pessimistic', 'pesimista'].includes(v)) return 'pessimistic';
  if (['very_pessimistic', 'muy_pesimista'].includes(v)) return 'very_pessimistic';
  if (['no_response', 'no_responde', 'ns_nr', 'ns', 'nr'].includes(v)) return 'no_response';

  return 'unknown';
}

function canonicalizeEconomy(raw: string): CanonicalResponseValue {
  const v = normalizeText(raw);

  if (['very_good', 'muy_buena', 'muy_bueno'].includes(v)) return 'very_good';
  if (['good', 'buena', 'bueno'].includes(v)) return 'good';
  if (['bad', 'mala', 'malo'].includes(v)) return 'bad';
  if (['very_bad', 'muy_mala', 'muy_malo'].includes(v)) return 'very_bad';
  if (['no_response', 'no_responde', 'ns_nr', 'ns', 'nr'].includes(v)) return 'no_response';

  return 'unknown';
}

function canonicalizeIdeology(raw: string): CanonicalResponseValue {
  const v = normalizeText(raw);

  if (['right', 'derecha'].includes(v)) return 'right';
  if (['center_right', 'centro_derecha'].includes(v)) return 'center_right';
  if (['center', 'centro'].includes(v)) return 'center';
  if (['center_left', 'centro_izquierda'].includes(v)) return 'center_left';
  if (['left', 'izquierda'].includes(v)) return 'left';
  if (
    ['independent', 'ninguna_independiente', 'ninguna_independiente_', 'ninguna_independiente__']
      .includes(v)
  ) {
    return 'independent';
  }
  if (['no_response', 'no_responde', 'ns_nr', 'ns', 'nr'].includes(v)) return 'no_response';

  return 'unknown';
}

/**
 * Canonicaliza una respuesta según el questionId.
 */
export function canonicalizeResponse(
  questionId: string,
  rawValue: string | number | string[] | null | undefined,
): CanonicalResponseValue {
  if (rawValue === null || rawValue === undefined) return 'no_response';
  if (Array.isArray(rawValue)) return 'unknown';

  const raw = String(rawValue);

  switch (questionId) {
    case 'q_approval':
      return canonicalizeApproval(raw);

    case 'q_direction':
      return canonicalizeDirection(raw);

    case 'q_optimism':
      return canonicalizeOptimism(raw);

    case 'q_economy_national':
    case 'q_economy_personal':
      return canonicalizeEconomy(raw);

    case 'q_ideology':
      return canonicalizeIdeology(raw);

    default:
      return 'unknown';
  }
}
