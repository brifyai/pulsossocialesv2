import { canonicalizeResponse, type CanonicalResponseValue } from './responseCanonicalizer';

export interface CanonicalSurveyResponse {
  questionId: string;
  value: string | number | string[] | null;
}

export function calculateCanonicalDistribution(
  responses: CanonicalSurveyResponse[],
  questionId: string,
): Record<CanonicalResponseValue, number> {
  const questionResponses = responses.filter((r) => r.questionId === questionId);
  const total = questionResponses.length;

  const counts: Record<CanonicalResponseValue, number> = {
    approve: 0,
    disapprove: 0,
    good_path: 0,
    bad_path: 0,
    very_optimistic: 0,
    optimistic: 0,
    pessimistic: 0,
    very_pessimistic: 0,
    very_good: 0,
    good: 0,
    bad: 0,
    very_bad: 0,
    right: 0,
    center_right: 0,
    center: 0,
    center_left: 0,
    left: 0,
    independent: 0,
    no_response: 0,
    unknown: 0,
  };

  if (total === 0) return counts;

  for (const response of questionResponses) {
    const canonical = canonicalizeResponse(questionId, response.value);
    counts[canonical] += 1;
  }

  const distribution: Record<CanonicalResponseValue, number> = { ...counts };

  for (const key of Object.keys(distribution) as CanonicalResponseValue[]) {
    distribution[key] = Math.round((distribution[key] / total) * 100);
  }

  return distribution;
}
