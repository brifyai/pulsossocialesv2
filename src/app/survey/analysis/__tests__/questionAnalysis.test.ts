/**
 * Question Analysis Tests
 *
 * Tests unitarios para questionAnalysis.ts
 * Validan transformación de QuestionResult a QuestionAnalysis
 */

import { describe, it, expect } from 'vitest';
import {
  analyzeQuestionResult,
  analyzeQuestion,
} from '../questionAnalysis';
import type {
  SingleChoiceResult,
  LikertResult,
  QuestionResult,
  AgentResponse,
} from '../../../../types/survey';

describe('analyzeQuestionResult', () => {
  // ===========================================
  // Fixtures
  // ===========================================

  const createSingleChoiceResult = (
    distribution: Record<string, { count: number; percentage: number; label: string }>
  ): SingleChoiceResult => ({
    questionId: 'q_test',
    questionText: 'Pregunta de prueba',
    questionType: 'single_choice',
    totalResponses: Object.values(distribution).reduce((sum, d) => sum + d.count, 0),
    distribution,
  });

  const createLikertResult = (
    distribution: Record<string, { count: number; percentage: number }>,
    average: number,
    median: number,
    minLabel: string = 'Mínimo',
    maxLabel: string = 'Máximo'
  ): LikertResult => ({
    questionId: 'q_likert_test',
    questionText: 'Pregunta Likert de prueba',
    questionType: 'likert_scale',
    totalResponses: Object.values(distribution).reduce((sum, d) => sum + d.count, 0),
    distribution,
    average,
    median,
    minLabel,
    maxLabel,
  });

  const createAgentResponses = (
    questionId: string,
    count: number,
    confidence: number = 0.8
  ): AgentResponse[] => {
    return Array.from({ length: count }, (_, i) => ({
      agentId: `agent_${i}`,
      questionId,
      value: 'option_a',
      confidence,
      reasoning: 'Test reasoning',
    }));
  };

  // ===========================================
  // 1. single_choice soportado
  // ===========================================

  describe('single_choice supported', () => {
    it('should analyze single_choice with dominant response', () => {
      const result = createSingleChoiceResult({
        option_a: { count: 70, percentage: 70, label: 'Opción A' },
        option_b: { count: 20, percentage: 20, label: 'Opción B' },
        option_c: { count: 10, percentage: 10, label: 'Opción C' },
      });

      const analysis = analyzeQuestionResult(result);

      expect(analysis.supported).toBe(true);
      expect(analysis.metrics).toBeDefined();
      expect(analysis.metrics?.dominantResponse).toBe('option_a');
      expect(analysis.metrics?.dominantPercentage).toBeCloseTo(70, 1);
      expect(analysis.distribution).toBeDefined();
      expect(analysis.distribution?.option_a).toEqual({
        count: 70,
        percentage: 70,
        label: 'Opción A',
      });
    });

    it('should calculate correct metrics for single_choice', () => {
      const result = createSingleChoiceResult({
        yes: { count: 80, percentage: 80, label: 'Sí' },
        no: { count: 20, percentage: 20, label: 'No' },
      });

      const analysis = analyzeQuestionResult(result);

      expect(analysis.metrics?.dominantResponse).toBe('yes');
      expect(analysis.metrics?.dominantPercentage).toBeCloseTo(80, 1);
      expect(analysis.metrics?.entropy).toBeGreaterThan(0);
      expect(analysis.metrics?.entropy).toBeLessThan(1);
      expect(analysis.metrics?.polarizationLevel).toBeDefined();
    });

    it('should generate relevant insights for dominant response', () => {
      const result = createSingleChoiceResult({
        approve: { count: 75, percentage: 75, label: 'Aprueba' },
        reject: { count: 25, percentage: 25, label: 'Rechaza' },
      });

      const analysis = analyzeQuestionResult(result);

      const dominanceInsight = analysis.insights?.find((i) => i.type === 'dominance');
      expect(dominanceInsight).toBeDefined();
      expect(dominanceInsight?.severity).toBe('important');
    });
  });

  // ===========================================
  // 2. single_choice con distribución fragmentada
  // ===========================================

  describe('single_choice fragmented distribution', () => {
    it('should detect high entropy in fragmented distribution', () => {
      const result = createSingleChoiceResult({
        a: { count: 30, percentage: 30, label: 'A' },
        b: { count: 25, percentage: 25, label: 'B' },
        c: { count: 25, percentage: 25, label: 'C' },
        d: { count: 20, percentage: 20, label: 'D' },
      });

      const analysis = analyzeQuestionResult(result);

      expect(analysis.metrics?.entropy).toBeGreaterThan(0.8);
      expect(analysis.metrics?.polarizationLevel).toBe('high');
    });

    it('should generate polarization insight for fragmented distribution', () => {
      const result = createSingleChoiceResult({
        a: { count: 35, percentage: 35, label: 'A' },
        b: { count: 33, percentage: 33, label: 'B' },
        c: { count: 32, percentage: 32, label: 'C' },
      });

      const analysis = analyzeQuestionResult(result);

      const polarizationInsight = analysis.insights?.find((i) => i.type === 'polarization');
      expect(polarizationInsight).toBeDefined();
      expect(polarizationInsight?.severity).toBe('warning');
    });

    it('should not generate dominance insight when no clear dominant', () => {
      const result = createSingleChoiceResult({
        a: { count: 40, percentage: 40, label: 'A' },
        b: { count: 35, percentage: 35, label: 'B' },
        c: { count: 25, percentage: 25, label: 'C' },
      });

      const analysis = analyzeQuestionResult(result);

      const dominanceInsight = analysis.insights?.find((i) => i.type === 'dominance');
      expect(dominanceInsight).toBeUndefined();
    });
  });

  // ===========================================
  // 3. likert_scale soportado
  // ===========================================

  describe('likert_scale supported', () => {
    it('should analyze likert_scale correctly', () => {
      const result = createLikertResult(
        {
          '1': { count: 10, percentage: 10 },
          '2': { count: 20, percentage: 20 },
          '3': { count: 40, percentage: 40 },
          '4': { count: 20, percentage: 20 },
          '5': { count: 10, percentage: 10 },
        },
        3.0,
        3,
        'Muy en desacuerdo',
        'Muy de acuerdo'
      );

      const analysis = analyzeQuestionResult(result);

      expect(analysis.supported).toBe(true);
      expect(analysis.likertStats).toBeDefined();
      expect(analysis.likertStats?.average).toBe(3.0);
      expect(analysis.likertStats?.median).toBe(3);
      expect(analysis.likertStats?.min).toBe(1);
      expect(analysis.likertStats?.max).toBe(5);
    });

    it('should generate correct labels for likert scale', () => {
      const result = createLikertResult(
        {
          '1': { count: 20, percentage: 20 },
          '5': { count: 80, percentage: 80 },
        },
        4.2,
        5,
        'Malo',
        'Excelente'
      );

      const analysis = analyzeQuestionResult(result);

      expect(analysis.distribution?.['1'].label).toBe('Malo');
      expect(analysis.distribution?.['5'].label).toBe('Excelente');
    });

    it('should calculate likert stats correctly', () => {
      const result = createLikertResult(
        {
          '1': { count: 5, percentage: 5 },
          '2': { count: 10, percentage: 10 },
          '3': { count: 30, percentage: 30 },
          '4': { count: 35, percentage: 35 },
          '5': { count: 20, percentage: 20 },
        },
        3.6,
        4
      );

      const analysis = analyzeQuestionResult(result);

      expect(analysis.likertStats?.average).toBeCloseTo(3.6, 1);
      expect(analysis.likertStats?.median).toBe(4);
      expect(analysis.likertStats?.min).toBe(1);
      expect(analysis.likertStats?.max).toBe(5);
    });
  });

  // ===========================================
  // 4. likert_scale con tendencia a valores altos
  // ===========================================

  describe('likert_scale high value tendency', () => {
    it('should generate insight for high tendency', () => {
      const result = createLikertResult(
        {
          '1': { count: 5, percentage: 5 },
          '2': { count: 10, percentage: 10 },
          '3': { count: 15, percentage: 15 },
          '4': { count: 30, percentage: 30 },
          '5': { count: 40, percentage: 40 },
        },
        3.9,
        4,
        'Muy en desacuerdo',
        'Muy de acuerdo'
      );

      const analysis = analyzeQuestionResult(result);

      const tendencyInsight = analysis.insights?.find(
        (i) => i.type === 'dominance' && i.title?.includes('altos')
      );
      expect(tendencyInsight).toBeDefined();
    });

    it('should generate insight for low tendency', () => {
      const result = createLikertResult(
        {
          '1': { count: 40, percentage: 40 },
          '2': { count: 30, percentage: 30 },
          '3': { count: 15, percentage: 15 },
          '4': { count: 10, percentage: 10 },
          '5': { count: 5, percentage: 5 },
        },
        2.1,
        2,
        'Muy en desacuerdo',
        'Muy de acuerdo'
      );

      const analysis = analyzeQuestionResult(result);

      const tendencyInsight = analysis.insights?.find(
        (i) => i.type === 'dominance' && i.title?.includes('bajos')
      );
      expect(tendencyInsight).toBeDefined();
    });

    it('should not generate tendency insight for neutral distribution', () => {
      const result = createLikertResult(
        {
          '1': { count: 20, percentage: 20 },
          '2': { count: 20, percentage: 20 },
          '3': { count: 20, percentage: 20 },
          '4': { count: 20, percentage: 20 },
          '5': { count: 20, percentage: 20 },
        },
        3.0,
        3,
        'Muy en desacuerdo',
        'Muy de acuerdo'
      );

      const analysis = analyzeQuestionResult(result);

      const tendencyInsight = analysis.insights?.find((i) =>
        i.title?.includes('altos') || i.title?.includes('bajos')
      );
      expect(tendencyInsight).toBeUndefined();
    });
  });

  // ===========================================
  // 5. multiple_choice no soportado
  // ===========================================

  describe('multiple_choice not supported', () => {
    it('should mark multiple_choice as not supported', () => {
      const result: QuestionResult = {
        questionId: 'q_multi',
        questionText: 'Seleccione todas las que apliquen',
        questionType: 'multiple_choice',
        totalResponses: 100,
        distribution: {
          option_a: { count: 60, percentage: 60, label: 'A' },
          option_b: { count: 40, percentage: 40, label: 'B' },
        },
      };

      const analysis = analyzeQuestionResult(result);

      expect(analysis.supported).toBe(false);
      expect(analysis.unsupportedReason).toContain('multiple_choice');
    });

    it('should not crash on multiple_choice', () => {
      const result: QuestionResult = {
        questionId: 'q_multi',
        questionText: 'Seleccione todas',
        questionType: 'multiple_choice',
        totalResponses: 50,
        distribution: {},
      };

      expect(() => analyzeQuestionResult(result)).not.toThrow();
    });

    it('should not have metrics for unsupported type', () => {
      const result: QuestionResult = {
        questionId: 'q_multi',
        questionText: 'Seleccione todas',
        questionType: 'multiple_choice',
        totalResponses: 50,
        distribution: {},
      };

      const analysis = analyzeQuestionResult(result);

      expect(analysis.metrics).toBeUndefined();
      expect(analysis.distribution).toBeUndefined();
    });
  });

  // ===========================================
  // 6. text no soportado
  // ===========================================

  describe('text not supported', () => {
    it('should mark text as not supported', () => {
      const result: QuestionResult = {
        questionId: 'q_text',
        questionText: '¿Por qué opina así?',
        questionType: 'text',
        totalResponses: 100,
        sampleResponses: [],
      };

      const analysis = analyzeQuestionResult(result);

      expect(analysis.supported).toBe(false);
      expect(analysis.unsupportedReason).toContain('text');
    });

    it('should not crash on text', () => {
      const result: QuestionResult = {
        questionId: 'q_text',
        questionText: 'Comentarios',
        questionType: 'text',
        totalResponses: 30,
        sampleResponses: [],
      };

      expect(() => analyzeQuestionResult(result)).not.toThrow();
    });
  });

  // ===========================================
  // 7. Casos borde
  // ===========================================

  describe('edge cases', () => {
    it('should handle empty distribution gracefully', () => {
      const result = createSingleChoiceResult({});

      const analysis = analyzeQuestionResult(result);

      // Con distribución vacía, el análisis debe tener métricas con valores por defecto
      expect(analysis.supported).toBe(true);
      expect(analysis.metrics).toBeDefined();
      // Verificar valores por defecto para distribución vacía
      expect(analysis.metrics?.dominantResponse).toBeNull();
      expect(analysis.metrics?.dominantPercentage).toBe(0);
      expect(analysis.metrics?.entropy).toBe(0);
    });

    it('should handle single option distribution', () => {
      const result = createSingleChoiceResult({
        only_option: { count: 100, percentage: 100, label: 'Única opción' },
      });

      const analysis = analyzeQuestionResult(result);

      expect(analysis.metrics?.entropy).toBe(0);
      expect(analysis.metrics?.concentration).toBe(1);
      expect(analysis.metrics?.polarizationLevel).toBe('low');
    });

    it('should calculate average confidence from responses', () => {
      const result = createSingleChoiceResult({
        a: { count: 60, percentage: 60, label: 'A' },
        b: { count: 40, percentage: 40, label: 'B' },
      });

      const responses = [
        ...createAgentResponses('q_test', 60, 0.9),
        ...createAgentResponses('q_test', 40, 0.7),
      ];

      const analysis = analyzeQuestionResult(result, responses);

      expect(analysis.metrics?.averageConfidence).toBeCloseTo(0.82, 1);
    });

    it('should generate low confidence insight when appropriate', () => {
      const result = createSingleChoiceResult({
        a: { count: 50, percentage: 50, label: 'A' },
        b: { count: 50, percentage: 50, label: 'B' },
      });

      const responses = createAgentResponses('q_test', 100, 0.5);

      const analysis = analyzeQuestionResult(result, responses);

      const lowConfidenceInsight = analysis.insights?.find(
        (i) => i.type === 'low_confidence'
      );
      expect(lowConfidenceInsight).toBeDefined();
    });
  });

  // ===========================================
  // Export alias
  // ===========================================

  describe('export alias', () => {
    it('analyzeQuestion should be alias for analyzeQuestionResult', () => {
      const result = createSingleChoiceResult({
        a: { count: 100, percentage: 100, label: 'A' },
      });

      const analysis1 = analyzeQuestionResult(result);
      const analysis2 = analyzeQuestion(result);

      expect(analysis1.supported).toBe(analysis2.supported);
      expect(analysis1.metrics?.dominantResponse).toBe(
        analysis2.metrics?.dominantResponse
      );
    });
  });
});
