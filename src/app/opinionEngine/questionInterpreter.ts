import type {
  QuestionFamily,
  ResponseFormat,
  TopicKey,
} from '../../types/opinion';
import type { InterpretedQuestion } from './types';

export interface RawSurveyQuestion {
  id: string;
  text: string;
  type?: string;
  options?: string[];
  periodicity?: 'permanent' | 'monthly' | 'lower_frequency' | 'ad_hoc';
}

function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function buildFingerprint(text: string): string {
  return normalizeText(text)
    .split(' ')
    .slice(0, 12)
    .join('-');
}

function detectTargetEntity(normalizedText: string): string | undefined {
  if (normalizedText.includes('jose antonio kast') || normalizedText.includes('kast')) {
    return 'jose_antonio_kast';
  }

  if (normalizedText.includes('gobierno')) {
    return 'gobierno';
  }

  if (normalizedText.includes('ministros') || normalizedText.includes('ministras')) {
    return 'ministros';
  }

  if (normalizedText.includes('figuras publicas')) {
    return 'figuras_publicas';
  }

  if (normalizedText.includes('instituciones')) {
    return 'instituciones';
  }

  if (normalizedText.includes('paises')) {
    return 'paises';
  }

  if (normalizedText.includes('lideres internacionales')) {
    return 'lideres_internacionales';
  }

  return undefined;
}

function inferFamilyAndTopic(
  normalizedText: string,
): { family: QuestionFamily; topic?: TopicKey; responseFormat: ResponseFormat } {
  if (
    normalizedText.includes('aprueba o desaprueba') &&
    (normalizedText.includes('kast') || normalizedText.includes('gobierno'))
  ) {
    return {
      family: 'approval',
      topic: 'government_approval',
      responseFormat: 'binary_nr',
    };
  }

  // Direction: reconoce múltiples variantes de wording
  if (
    normalizedText.includes('buen camino') ||
    normalizedText.includes('mal camino') ||
    normalizedText.includes('camino correcto') ||
    normalizedText.includes('camino equivocado') ||
    normalizedText.includes('direccion correcta') ||
    normalizedText.includes('direccion equivocada') ||
    normalizedText.includes('va por buen camino') ||
    normalizedText.includes('va por mal camino') ||
    (normalizedText.includes('pais va') && normalizedText.includes('camino'))
  ) {
    return {
      family: 'direction',
      topic: 'country_direction',
      responseFormat: 'binary_nr',
    };
  }

  // Optimism: reconoce múltiples variantes de wording
  if (
    normalizedText.includes('futuro del pais') ||
    normalizedText.includes('muy optimista') ||
    normalizedText.includes('muy pesimista') ||
    normalizedText.includes('como se siente') ||
    normalizedText.includes('acerca del futuro') ||
    (normalizedText.includes('dentro de un ano') || normalizedText.includes('dentro de 1 ano')) ||
    (normalizedText.includes('situacion del pais') &&
      (normalizedText.includes('mejor') ||
        normalizedText.includes('igual') ||
        normalizedText.includes('peor')))
  ) {
    return {
      family: 'optimism',
      topic: 'country_optimism',
      responseFormat: 'ordinal_4_nr',
    };
  }

  // Economy personal: reconoce múltiples variantes de wording
  // IMPORTANTE: debe ir ANTES de economy_national porque es más específica
  if (
    normalizedText.includes('usted y su familia') ||
    normalizedText.includes('economica actual de usted y su familia') ||
    normalizedText.includes('situacion economica personal') ||
    normalizedText.includes('situacion economica de usted') ||
    (normalizedText.includes('situacion economica') &&
      normalizedText.includes('usted') &&
      normalizedText.includes('familia'))
  ) {
    return {
      family: 'economic_perception',
      topic: 'economy_personal',
      responseFormat: 'ordinal_4_nr',
    };
  }

  // Economy national: reconoce economía del país
  if (
    normalizedText.includes('economia chilena esta') ||
    normalizedText.includes('situacion economica')
  ) {
    return {
      family: 'economic_perception',
      topic: 'economy_national',
      responseFormat: 'ordinal_4_nr',
    };
  }

  if (normalizedText.includes('empleo en el pais')) {
    return {
      family: 'economic_perception',
      topic: 'employment',
      responseFormat: 'ordinal_4_nr',
    };
  }

  if (
    normalizedText.includes('consumidores para poder comprar') ||
    normalizedText.includes('bienes y servicios')
  ) {
    return {
      family: 'economic_perception',
      topic: 'consumption',
      responseFormat: 'ordinal_4_nr',
    };
  }

  if (
    normalizedText.includes('izquierda o a la derecha') ||
    normalizedText.includes('izquierda o de derecha') ||
    normalizedText.includes('posicion politica') ||
    normalizedText.includes('cual de las siguientes posiciones')
  ) {
    return {
      family: 'ideology',
      topic: 'political_identity',
      responseFormat: 'categorical',
    };
  }

  if (
    normalizedText.includes('conoce o ha oido hablar')
  ) {
    return {
      family: 'awareness',
      responseFormat: 'categorical',
    };
  }

  if (
    normalizedText.includes('imagen muy positiva') ||
    normalizedText.includes('imagen muy negativa') ||
    normalizedText.includes('que imagen tiene usted')
  ) {
    return {
      family: 'image',
      responseFormat: normalizedText.includes('1 a 7') ? 'scale_1_7' : 'ordinal_4_nr',
    };
  }

  if (
    normalizedText.includes('cuanta confianza tiene usted') ||
    normalizedText.includes('nada de confianza') ||
    normalizedText.includes('mucha confianza')
  ) {
    return {
      family: 'trust',
      topic: 'institutional_trust',
      responseFormat: 'scale_1_7',
    };
  }

  if (
    normalizedText.includes('deberia dedicar mayor esfuerzo') ||
    normalizedText.includes('y en segundo lugar')
  ) {
    return {
      family: 'priority',
      responseFormat: 'ranked',
    };
  }

  if (
    normalizedText.includes('noticia mas importante de la semana')
  ) {
    return {
      family: 'open_text',
      responseFormat: 'text',
    };
  }

  return {
    family: 'open_text',
    responseFormat: 'text',
  };
}

export function interpretQuestion(question: RawSurveyQuestion): InterpretedQuestion {
  const normalizedText = normalizeText(question.text);
  const detected = inferFamilyAndTopic(normalizedText);
  const targetEntity = detectTargetEntity(normalizedText);

  return {
    questionId: question.id,
    originalText: question.text,
    family: detected.family,
    topic: detected.topic,
    targetEntity,
    responseFormat: detected.responseFormat,
    fingerprint: buildFingerprint(question.text),
    periodicity: question.periodicity ?? 'ad_hoc',
    options: question.options,
  };
}
