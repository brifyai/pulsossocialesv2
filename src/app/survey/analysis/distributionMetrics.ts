/**
 * Distribution Metrics - MVP
 *
 * Utilidades puras para analizar distribuciones de respuestas.
 * Sin dependencias externas, testeable, funciones puras.
 *
 * API ÚNICA basada en Record<string, number> para consistencia con types.ts
 */

import type { DistributionMetrics as DistributionMetricsType, PolarizationLevel } from './types';
import type { AgentResponse } from '../../../types/survey';

// ===========================================
// Tipos Internos
// ===========================================

/**
 * Entrada de distribución para análisis
 */
interface DistributionEntry {
  key: string;
  count: number;
  percentage?: number;
  label?: string;
}

/**
 * Resultado del análisis de respuesta dominante
 */
interface DominantResult {
  value: string | number | null;
  count: number;
  percentage: number;
  dominanceRatio: number;
}

// ===========================================
// Constantes
// ===========================================

/** Palabras clave para detectar no-respuesta */
const NON_RESPONSE_KEYWORDS = [
  'no_response',
  'no responde',
  'no sabe',
  'ns/nr',
  'no contesta',
  'no opina',
  'prefiero no decir',
  'skip',
];

// ===========================================
// Funciones Públicas (API Única del MVP)
// ===========================================

/**
 * Identifica la respuesta más frecuente y calcula métricas de dominancia.
 *
 * @param distribution - Mapa de valor -> conteo
 * @param totalCount - Total de respuestas (para calcular porcentajes)
 * @returns Información sobre la respuesta dominante
 */
export function getDominantAnswer(
  distribution: Record<string, number>,
  totalCount: number
): DominantResult {
  if (totalCount === 0 || Object.keys(distribution).length === 0) {
    return {
      value: null,
      count: 0,
      percentage: 0,
      dominanceRatio: 0,
    };
  }

  // Convertir a array y ordenar por conteo descendente
  const entries: DistributionEntry[] = Object.entries(distribution).map(([key, count]) => ({
    key,
    count,
    percentage: (count / totalCount) * 100,
  }));

  entries.sort((a, b) => b.count - a.count);

  const dominant = entries[0];
  const second = entries[1];

  // Calcular ratio de dominancia (evitar Infinity)
  const dominanceRatio = second && second.count > 0
    ? dominant.count / second.count
    : dominant.count > 0 ? dominant.count : 0;

  // Intentar parsear como número (para likert)
  const numericValue = parseFloat(dominant.key);
  const value = !isNaN(numericValue) ? numericValue : dominant.key;

  return {
    value,
    count: dominant.count,
    percentage: dominant.percentage ?? 0,
    dominanceRatio,
  };
}

/**
 * Calcula la entropía de Shannon normalizada entre 0 y 1.
 *
 * Entropía = 0: distribución perfectamente concentrada (máxima certeza)
 * Entropía = 1: distribución uniforme (máxima incertidumbre)
 *
 * @param probabilities - Array de probabilidades (0-1) o conteos
 * @returns Entropía normalizada entre 0 y 1
 */
export function calculateNormalizedEntropy(probabilities: number[]): number {
  if (probabilities.length === 0) return 0;

  // Si son conteos, convertir a probabilidades
  const total = probabilities.reduce((sum, p) => sum + p, 0);
  if (total === 0) return 0;

  const probs = probabilities.map(p => p / total);

  // Calcular entropía de Shannon
  const entropy = probs.reduce((sum, p) => {
    if (p <= 0) return sum;
    return sum - p * Math.log2(p);
  }, 0);

  // Normalizar por entropía máxima (log2(n))
  const maxEntropy = Math.log2(probs.length);
  if (maxEntropy === 0) return 0;

  return entropy / maxEntropy;
}

/**
 * Calcula el índice de concentración (1 - entropía).
 *
 * @param entropy - Entropía normalizada (0-1)
 * @returns Concentración entre 0 y 1
 */
export function calculateConcentrationFromEntropy(entropy: number): number {
  return Math.max(0, Math.min(1, 1 - entropy));
}

/**
 * Calcula la polarización numérica de una distribución.
 * Alta polarización = distribución bimodal (ej: 50-50)
 *
 * @param distribution - Mapa de valor -> conteo
 * @returns Polarización entre 0 y 1
 */
export function calculatePolarizationValue(
  distribution: Record<string, number>
): number {
  const entries = Object.entries(distribution);

  if (entries.length === 0) return 0;
  if (entries.length === 1) return 0; // Una sola opción = sin polarización

  const total = entries.reduce((sum, [, count]) => sum + count, 0);
  if (total === 0) return 0;

  // Ordenar por frecuencia descendente
  const sorted = entries
    .map(([, count]) => count / total)
    .sort((a, b) => b - a);

  // Para distribuciones bimodales (top 2 similares), alta polarización
  // Para distribuciones dominantes, baja polarización
  const top1 = sorted[0];
  const top2 = sorted[1] || 0;

  // Polarización alta cuando top1 ≈ top2 (ej: 50-50)
  // Polarización baja cuando top1 >> top2 (ej: 90-10)
  if (top1 === 0) return 0;

  const ratio = top2 / top1;
  return Math.min(1, ratio * 2); // Escalar para que 50-50 dé ~1
}

/**
 * Calcula la dispersión de una distribución (entropía normalizada).
 * Alta dispersión = distribución uniforme entre muchas opciones
 *
 * @param distribution - Mapa de valor -> conteo
 * @returns Dispersión entre 0 y 1
 */
export function calculateDispersion(
  distribution: Record<string, number>
): number {
  const probabilities = Object.values(distribution);
  if (probabilities.length === 0) return 0;

  return calculateNormalizedEntropy(probabilities);
}

/**
 * Detecta y calcula la tasa de no-respuesta desde una distribución.
 *
 * Busca opciones con palabras clave como "no sabe", "no responde", etc.
 *
 * @param distribution - Mapa de valor -> conteo
 * @param totalCount - Total de respuestas
 * @param labels - Mapa opcional de valor -> etiqueta legible
 * @returns Porcentaje de no-respuesta (0-100)
 */
export function calculateNonResponseRate(
  distribution: Record<string, number>,
  totalCount: number,
  labels?: Record<string, string>
): number {
  if (totalCount === 0) return 0;

  let nonResponseCount = 0;

  for (const [key, count] of Object.entries(distribution)) {
    const label = labels?.[key] ?? key;
    const searchText = `${key} ${label}`.toLowerCase();

    const isNonResponse = NON_RESPONSE_KEYWORDS.some(keyword =>
      searchText.includes(keyword.toLowerCase())
    );

    if (isNonResponse) {
      nonResponseCount += count;
    }
  }

  return (nonResponseCount / totalCount) * 100;
}

/**
 * Calcula el confidence promedio de las respuestas.
 *
 * @param responses - Array de respuestas de agentes
 * @returns Confidence promedio (0-1), o 0 si no hay respuestas
 */
export function calculateAverageConfidence(
  responses: AgentResponse[]
): number {
  if (responses.length === 0) return 0;
  const total = responses.reduce((sum, r) => sum + (r.confidence ?? 0), 0);
  return total / responses.length;
}

/**
 * Calcula la desviación estándar para distribuciones tipo Likert.
 *
 * @param distribution - Mapa de valor numérico -> conteo
 * @returns Desviación estándar, o undefined si no aplica
 */
export function calculateLikertStandardDeviation(
  distribution: Record<string, number>
): number | undefined {
  // Convertir keys a números
  const entries: { value: number; count: number }[] = [];

  for (const [key, count] of Object.entries(distribution)) {
    const numValue = parseFloat(key);
    if (!isNaN(numValue) && count > 0) {
      entries.push({ value: numValue, count });
    }
  }

  if (entries.length === 0) return undefined;

  const totalCount = entries.reduce((sum, e) => sum + e.count, 0);
  if (totalCount === 0) return undefined;

  // Calcular media
  const mean = entries.reduce((sum, e) => sum + e.value * e.count, 0) / totalCount;

  // Calcular varianza
  const variance = entries.reduce((sum, e) => {
    const diff = e.value - mean;
    return sum + diff * diff * e.count;
  }, 0) / totalCount;

  return Math.sqrt(variance);
}

/**
 * Clasifica el nivel de polarización basado en entropía.
 *
 * NOTA MVP: Aquí "polarization" se usa como proxy de dispersión/fragmentación
 * de la distribución, no como polarización ideológica estricta.
 * - Baja entropía = distribución concentrada (baja "polarización")
 * - Alta entropía = distribución fragmentada/uniforme (alta "polarización")
 *
 * En versiones futuras se debería separar:
 * - fragmentación (dispersión general)
 * - polarización (concentración en extremos)
 * - incertidumbre (entropía pura)
 *
 * @param entropy - Entropía normalizada (0-1)
 * @param thresholds - Umbrales personalizados (opcional)
 * @returns Nivel de polarización
 */
export function classifyPolarization(
  entropy: number,
  thresholds?: { low: number; high: number }
): PolarizationLevel {
  const { low = 0.3, high = 0.8 } = thresholds ?? {};

  if (entropy <= low) return 'low';      // Alta concentración = baja polarización
  if (entropy >= high) return 'high';    // Distribución uniforme = alta polarización
  return 'medium';
}

/**
 * Función principal: construye todas las métricas de distribución.
 *
 * @param distribution - Mapa de valor -> conteo
 * @param totalCount - Total de respuestas
 * @param responses - Respuestas originales (para confidence)
 * @param labels - Mapa opcional de valor -> etiqueta legible
 * @param isLikert - Si es escala Likert (para calcular desviación estándar)
 * @returns Métricas completas de distribución
 */
export function buildDistributionMetrics(
  distribution: Record<string, number>,
  totalCount: number,
  responses: AgentResponse[],
  labels?: Record<string, string>,
  isLikert = false
): DistributionMetricsType {
  // Normalizar distribución (filtrar valores inválidos)
  const normalizedDistribution = normalizeDistribution(distribution);
  const normalizedTotal = Object.values(normalizedDistribution).reduce((sum, c) => sum + c, 0);

  // Manejar caso vacío
  if (totalCount === 0 || Object.keys(distribution).length === 0) {
    return {
      dominantResponse: null,
      dominantPercentage: 0,
      dominanceRatio: 0,
      entropy: 0,
      concentration: 0,
      polarization: 0,
      polarizationLevel: 'low',
      nonResponseRate: 0,
      averageConfidence: 0,
    };
  }

  // Calcular métricas
  const dominant = getDominantAnswer(normalizedDistribution, normalizedTotal);
  const probabilities = Object.values(normalizedDistribution);
  const entropy = calculateNormalizedEntropy(probabilities);
  const polarizationLevel = classifyPolarization(entropy);
  const polarizationValue = calculatePolarizationValue(normalizedDistribution);
  const nonResponseRatePercent = calculateNonResponseRate(normalizedDistribution, normalizedTotal, labels);
  const averageConfidence = calculateAverageConfidence(responses);

  // Calcular desviación estándar solo para likert
  const standardDeviation = isLikert
    ? calculateLikertStandardDeviation(normalizedDistribution)
    : undefined;

  // Calcular concentración
  const concentration = calculateConcentrationFromEntropy(entropy);

  // Retornar objeto con el contrato consolidado (sin campos duplicados)
  return {
    dominantResponse: dominant.value,
    dominantPercentage: dominant.percentage,
    dominanceRatio: dominant.dominanceRatio,
    entropy,
    concentration,
    polarization: polarizationValue,
    polarizationLevel,
    nonResponseRate: nonResponseRatePercent,
    averageConfidence,
    standardDeviation,
  };
}

// ===========================================
// Helpers Internos
// ===========================================

/**
 * Normaliza la distribución filtrando valores inválidos.
 * Ignora: no numéricos, NaN, <= 0
 */
function normalizeDistribution(
  distribution: Record<string, number>
): Record<string, number> {
  const normalized: Record<string, number> = {};

  for (const [key, value] of Object.entries(distribution)) {
    if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
      normalized[key] = value;
    }
  }

  return normalized;
}

/**
 * Verifica si una opción representa "no respuesta".
 * Exportado para testing.
 *
 * @param key - Key de la opción
 * @param label - Etiqueta legible
 * @returns true si es no-respuesta
 */
export function isNonResponseOption(key: string, label?: string): boolean {
  const searchText = `${key} ${label ?? ''}`.toLowerCase();
  return NON_RESPONSE_KEYWORDS.some(keyword =>
    searchText.includes(keyword.toLowerCase())
  );
}
