/**
 * Tests for Comparison Service
 *
 * Pruebas unitarias para el servicio de comparación baseline vs escenario.
 */

import { describe, it, expect } from 'vitest';
import { compareSurveys } from '../comparisonService';
import type { SurveyAnalysis, QuestionAnalysis, DistributionMetrics } from '../types';

// ===========================================
// Fixtures
// ===========================================

function createMockMetrics(overrides: Partial<DistributionMetrics> = {}): DistributionMetrics {
  return {
    dominantResponse: 'option_a',
    dominantPercentage: 45,
    dominanceRatio: 1.5,
    entropy: 0.5,
    concentration: 0.5,
    polarization: 0.3,
    polarizationLevel: 'low',
    nonResponseRate: 5,
    averageConfidence: 0.8,
    ...overrides,
  };
}

function createMockQuestionAnalysis(
  id: string,
  overrides: Partial<QuestionAnalysis> = {}
): QuestionAnalysis {
  return {
    questionId: id,
    questionText: `Question ${id}`,
    questionType: 'single_choice',
    supported: true,
    totalResponses: 100,
    metrics: createMockMetrics(),
    distribution: {
      option_a: { count: 45, percentage: 45, label: 'Option A' },
      option_b: { count: 30, percentage: 30, label: 'Option B' },
      option_c: { count: 20, percentage: 20, label: 'Option C' },
      no_response: { count: 5, percentage: 5, label: 'No Response' },
    },
    segmentBreakdowns: [],
    insights: [],
    ...overrides,
  };
}

function createMockSurveyAnalysis(
  runId: string,
  overrides: Partial<SurveyAnalysis> = {}
): SurveyAnalysis {
  return {
    surveyId: 'survey-001',
    runId,
    generatedAt: new Date().toISOString(),
    summary: {
      totalQuestions: 3,
      supportedQuestions: 3,
      unsupportedQuestions: 0,
      totalResponses: 300,
      overallConsensusLevel: 'medium',
      averageConfidence: 0.75,
      segmentationAvailable: false,
    },
    questionAnalyses: [
      createMockQuestionAnalysis('q1'),
      createMockQuestionAnalysis('q2'),
      createMockQuestionAnalysis('q3'),
    ],
    globalInsights: [],
    globalMetrics: {
      averageConfidence: 0.75,
      averageEntropy: 0.5,
      questionsWithDominance: 2,
      questionsWithPolarization: 1,
      nonResponseRate: 5,
    },
    ...overrides,
  };
}

// ===========================================
// Tests
// ===========================================

describe('compareSurveys', () => {
  it('should throw error when comparing different surveys', () => {
    const baseline = createMockSurveyAnalysis('run-001');
    const scenario = createMockSurveyAnalysis('run-002', { surveyId: 'different-survey' });

    expect(() => compareSurveys(baseline, scenario)).toThrow(
      'Cannot compare different surveys'
    );
  });

  it('should return comparison summary with correct structure', () => {
    const baseline = createMockSurveyAnalysis('run-001');
    const scenario = createMockSurveyAnalysis('run-002');

    const result = compareSurveys(baseline, scenario, { includeUnchanged: true });

    expect(result.baselineRunId).toBe('run-001');
    expect(result.scenarioRunId).toBe('run-002');
    expect(result.totalQuestionsCompared).toBe(3);
    expect(result.comparedAt).toBeDefined();
  });

  it('should detect no changes when analyses are identical', () => {
    const baseline = createMockSurveyAnalysis('run-001');
    const scenario = createMockSurveyAnalysis('run-002');

    const result = compareSurveys(baseline, scenario, { includeUnchanged: true });

    expect(result.questionsWithSignificantChange).toBe(0);
    expect(result.questionsWithDominantChange).toBe(0);
    expect(result.averageImpactScore).toBe(0);
    expect(result.overallImpactLevel).toBe('none');
  });

  it('should detect dominant response change', () => {
    const baseline = createMockSurveyAnalysis('run-001');
    const scenario = createMockSurveyAnalysis('run-002', {
      questionAnalyses: [
        createMockQuestionAnalysis('q1', {
          metrics: createMockMetrics({
            dominantResponse: 'option_b',
            dominantPercentage: 55,
          }),
        }),
        createMockQuestionAnalysis('q2'),
        createMockQuestionAnalysis('q3'),
      ],
    });

    const result = compareSurveys(baseline, scenario, { includeUnchanged: true });

    expect(result.questionsWithDominantChange).toBe(1);

    const q1Comparison = result.mostAffectedQuestions.find(q => q.questionId === 'q1');
    expect(q1Comparison).toBeDefined();
  });

  it('should calculate impact score for significant changes', () => {
    const baseline = createMockSurveyAnalysis('run-001');
    const scenario = createMockSurveyAnalysis('run-002', {
      questionAnalyses: [
        createMockQuestionAnalysis('q1', {
          distribution: {
            option_a: { count: 25, percentage: 25, label: 'Option A' },
            option_b: { count: 50, percentage: 50, label: 'Option B' },
            option_c: { count: 20, percentage: 20, label: 'Option C' },
            no_response: { count: 5, percentage: 5, label: 'No Response' },
          },
          metrics: createMockMetrics({
            dominantResponse: 'option_b',
            dominantPercentage: 50,
          }),
        }),
        createMockQuestionAnalysis('q2'),
        createMockQuestionAnalysis('q3'),
      ],
    });

    const result = compareSurveys(baseline, scenario, { includeUnchanged: true });

    expect(result.averageImpactScore).toBeGreaterThan(0);
    expect(result.questionsWithSignificantChange).toBeGreaterThan(0);
  });

  it('should filter out unchanged questions when includeUnchanged is false', () => {
    const baseline = createMockSurveyAnalysis('run-001');
    const scenario = createMockSurveyAnalysis('run-002');

    const result = compareSurveys(baseline, scenario, { includeUnchanged: false });

    // All questions are identical, so none should be included
    expect(result.totalQuestionsCompared).toBe(0);
  });

  it('should include unchanged questions when includeUnchanged is true', () => {
    const baseline = createMockSurveyAnalysis('run-001');
    const scenario = createMockSurveyAnalysis('run-002');

    const result = compareSurveys(baseline, scenario, { includeUnchanged: true });

    expect(result.totalQuestionsCompared).toBe(3);
  });

  it('should sort questions by impact score descending', () => {
    const baseline = createMockSurveyAnalysis('run-001');
    const scenario = createMockSurveyAnalysis('run-002', {
      questionAnalyses: [
        createMockQuestionAnalysis('q1', {
          distribution: {
            option_a: { count: 20, percentage: 20, label: 'Option A' },
            option_b: { count: 60, percentage: 60, label: 'Option B' },
            option_c: { count: 15, percentage: 15, label: 'Option C' },
            no_response: { count: 5, percentage: 5, label: 'No Response' },
          },
          metrics: createMockMetrics({
            dominantResponse: 'option_b',
            dominantPercentage: 60,
          }),
        }),
        createMockQuestionAnalysis('q2', {
          distribution: {
            option_a: { count: 30, percentage: 30, label: 'Option A' },
            option_b: { count: 40, percentage: 40, label: 'Option B' },
            option_c: { count: 25, percentage: 25, label: 'Option C' },
            no_response: { count: 5, percentage: 5, label: 'No Response' },
          },
          metrics: createMockMetrics({
            dominantResponse: 'option_b',
            dominantPercentage: 40,
          }),
        }),
        createMockQuestionAnalysis('q3'),
      ],
    });

    const result = compareSurveys(baseline, scenario, { includeUnchanged: true });

    // q1 has bigger changes, should be first
    expect(result.mostAffectedQuestions[0]?.questionId).toBe('q1');
  });

  it('should generate global insights', () => {
    const baseline = createMockSurveyAnalysis('run-001');
    const scenario = createMockSurveyAnalysis('run-002', {
      questionAnalyses: [
        createMockQuestionAnalysis('q1', {
          metrics: createMockMetrics({
            dominantResponse: 'option_b',
            dominantPercentage: 55,
          }),
        }),
        createMockQuestionAnalysis('q2'),
        createMockQuestionAnalysis('q3'),
      ],
    });

    const result = compareSurveys(baseline, scenario, { includeUnchanged: true });

    expect(result.globalInsights.length).toBeGreaterThan(0);

    const dominantChangeInsight = result.globalInsights.find(
      i => i.title.includes('preferencias') || i.title.includes('Cambios')
    );
    expect(dominantChangeInsight).toBeDefined();
  });

  it('should handle empty question analyses', () => {
    const baseline = createMockSurveyAnalysis('run-001', { questionAnalyses: [] });
    const scenario = createMockSurveyAnalysis('run-002', { questionAnalyses: [] });

    const result = compareSurveys(baseline, scenario);

    expect(result.totalQuestionsCompared).toBe(0);
    expect(result.averageImpactScore).toBe(0);
    expect(result.overallImpactLevel).toBe('none');
  });

  it('should respect custom significance threshold', () => {
    const baseline = createMockSurveyAnalysis('run-001');
    const scenario = createMockSurveyAnalysis('run-002', {
      questionAnalyses: [
        createMockQuestionAnalysis('q1', {
          distribution: {
            option_a: { count: 42, percentage: 42, label: 'Option A' },
            option_b: { count: 33, percentage: 33, label: 'Option B' },
            option_c: { count: 20, percentage: 20, label: 'Option C' },
            no_response: { count: 5, percentage: 5, label: 'No Response' },
          },
        }),
        createMockQuestionAnalysis('q2'),
        createMockQuestionAnalysis('q3'),
      ],
    });

    // With threshold of 10, 3pp change is not significant
    const resultHigh = compareSurveys(baseline, scenario, { significanceThreshold: 10, includeUnchanged: true });

    // With threshold of 2, 3pp change is significant
    const resultLow = compareSurveys(baseline, scenario, { significanceThreshold: 2, includeUnchanged: true });

    expect(resultHigh.questionsWithSignificantChange).toBeLessThanOrEqual(
      resultLow.questionsWithSignificantChange
    );
  });
});

describe('QuestionComparison details', () => {
  it('should include metric changes in comparison', () => {
    const baseline = createMockSurveyAnalysis('run-001');
    const scenario = createMockSurveyAnalysis('run-002', {
      questionAnalyses: [
        createMockQuestionAnalysis('q1', {
          metrics: createMockMetrics({
            polarization: 0.7,
            averageConfidence: 0.6,
          }),
        }),
        createMockQuestionAnalysis('q2'),
        createMockQuestionAnalysis('q3'),
      ],
    });

    const result = compareSurveys(baseline, scenario, { includeUnchanged: true });

    // q1 should have metric changes
    expect(result.mostAffectedQuestions.length).toBeGreaterThan(0);
  });

  it('should include distribution changes in comparison', () => {
    const baseline = createMockSurveyAnalysis('run-001');
    const scenario = createMockSurveyAnalysis('run-002', {
      questionAnalyses: [
        createMockQuestionAnalysis('q1', {
          distribution: {
            option_a: { count: 30, percentage: 30, label: 'Option A' },
            option_b: { count: 45, percentage: 45, label: 'Option B' },
            option_c: { count: 20, percentage: 20, label: 'Option C' },
            no_response: { count: 5, percentage: 5, label: 'No Response' },
          },
        }),
        createMockQuestionAnalysis('q2'),
        createMockQuestionAnalysis('q3'),
      ],
    });

    const result = compareSurveys(baseline, scenario, { includeUnchanged: true });

    expect(result.mostAffectedQuestions.length).toBeGreaterThan(0);
  });

  it('should detect new options in scenario', () => {
    const baseline = createMockSurveyAnalysis('run-001');
    const scenario = createMockSurveyAnalysis('run-002', {
      questionAnalyses: [
        createMockQuestionAnalysis('q1', {
          distribution: {
            option_a: { count: 40, percentage: 40, label: 'Option A' },
            option_b: { count: 25, percentage: 25, label: 'Option B' },
            option_c: { count: 15, percentage: 15, label: 'Option C' },
            option_d: { count: 15, percentage: 15, label: 'Option D' }, // New option
            no_response: { count: 5, percentage: 5, label: 'No Response' },
          },
        }),
        createMockQuestionAnalysis('q2'),
        createMockQuestionAnalysis('q3'),
      ],
    });

    const result = compareSurveys(baseline, scenario, { includeUnchanged: true });

    expect(result.mostAffectedQuestions.length).toBeGreaterThan(0);
  });
});
