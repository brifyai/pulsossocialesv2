/**
 * Survey Analysis Service Tests
 *
 * Tests unitarios para surveyAnalysisService.ts
 * Validan análisis completo de encuestas y agregaciones globales
 */

import { describe, it, expect } from 'vitest';
import {
  analyzeSurveyResult,
  getMostPolarizedQuestions,
  getMostConsensusQuestions,
  getLowestConfidenceQuestions,
} from '../surveyAnalysisService';
import type { SurveyResult, SurveyRun, AgentResponse } from '../../../../types/survey';
import type { SurveyAnalysis } from '../types';

describe('analyzeSurveyResult', () => {
  // ===========================================
  // Fixtures
  // ===========================================

  const createAgentResponse = (
    agentId: string,
    questionId: string,
    responseValue: string,
    confidence: number = 0.8
  ): AgentResponse => ({
    agentId,
    questionId,
    value: responseValue,
    confidence,
    reasoning: 'Test reasoning',
  });

  const createSurveyResult = (
    questions: Array<{
      questionId: string;
      questionType: 'single_choice' | 'likert_scale' | 'multiple_choice' | 'text';
      distribution: Record<string, { count: number; percentage: number; label?: string }>;
      average?: number;
      median?: number;
    }>
  ): SurveyResult => {
    const totalResponses = questions[0]?.distribution
      ? Object.values(questions[0].distribution).reduce((sum, d) => sum + d.count, 0)
      : 0;

    return {
      surveyId: 'survey_test',
      runId: 'run_test',
      generatedAt: new Date().toISOString(),
      summary: {
        totalQuestions: questions.length,
        totalResponses,
        uniqueAgents: totalResponses,
      },
      results: questions.map((q) => {
        const totalQuestionResponses = Object.values(q.distribution).reduce(
          (sum, d) => sum + d.count,
          0
        );

        if (q.questionType === 'likert_scale') {
          return {
            questionId: q.questionId,
            questionText: `Pregunta ${q.questionId}`,
            questionType: 'likert_scale' as const,
            totalResponses: totalQuestionResponses,
            average: q.average ?? 3,
            median: q.median ?? 3,
            distribution: q.distribution as Record<number, { count: number; percentage: number }>,
            minLabel: 'Mínimo',
            maxLabel: 'Máximo',
          };
        }

        if (q.questionType === 'text') {
          return {
            questionId: q.questionId,
            questionText: `Pregunta ${q.questionId}`,
            questionType: 'text' as const,
            totalResponses: totalQuestionResponses,
            sampleResponses: [],
          };
        }

        // single_choice o multiple_choice
        return {
          questionId: q.questionId,
          questionText: `Pregunta ${q.questionId}`,
          questionType: q.questionType as 'single_choice' | 'multiple_choice',
          totalResponses: totalQuestionResponses,
          distribution: q.distribution as Record<string, { count: number; percentage: number; label: string }>,
        };
      }),
    };
  };

  const createSurveyRun = (
    surveyId: string,
    runId: string,
    responses: AgentResponse[]
  ): SurveyRun => ({
    id: runId,
    surveyId,
    startedAt: new Date().toISOString(),
    completedAt: new Date().toISOString(),
    totalAgents: responses.length,
    responses,
    metadata: {
      segmentMatched: responses.length,
      sampleSizeRequested: responses.length,
      sampleSizeActual: responses.length,
    },
  });

  // ===========================================
  // 1. Análisis básico con preguntas soportadas
  // ===========================================

  describe('basic analysis with supported questions', () => {
    it('should analyze survey with single_choice and likert_scale', () => {
      const result = createSurveyResult([
        {
          questionId: 'q1',
          questionType: 'single_choice',
          distribution: {
            yes: { count: 70, percentage: 70, label: 'Sí' },
            no: { count: 30, percentage: 30, label: 'No' },
          },
        },
        {
          questionId: 'q2',
          questionType: 'likert_scale',
          distribution: {
            '1': { count: 10, percentage: 10 },
            '2': { count: 20, percentage: 20 },
            '3': { count: 40, percentage: 40 },
            '4': { count: 20, percentage: 20 },
            '5': { count: 10, percentage: 10 },
          },
          average: 3.0,
          median: 3,
        },
      ]);

      const analysis = analyzeSurveyResult(result);

      expect(analysis.surveyId).toBe('survey_test');
      expect(analysis.runId).toBe('run_test');
      expect(analysis.questionAnalyses).toHaveLength(2);
      expect(analysis.globalMetrics).toBeDefined();
      expect(analysis.globalInsights).toBeDefined();
      expect(analysis.executiveSummary).toBeDefined();
    });

    it('should have correct summary counts', () => {
      const result = createSurveyResult([
        {
          questionId: 'q1',
          questionType: 'single_choice',
          distribution: { a: { count: 100, percentage: 100, label: 'A' } },
        },
        {
          questionId: 'q2',
          questionType: 'likert_scale',
          distribution: { '1': { count: 100, percentage: 100 } },
          average: 1,
          median: 1,
        },
      ]);

      const analysis = analyzeSurveyResult(result);

      expect(analysis.summary.totalQuestions).toBe(2);
      expect(analysis.summary.supportedQuestions).toBe(2);
      expect(analysis.summary.unsupportedQuestions).toBe(0);
    });

    it('should include generatedAt timestamp', () => {
      const result = createSurveyResult([]);
      const analysis = analyzeSurveyResult(result);

      expect(analysis.generatedAt).toBeDefined();
      expect(new Date(analysis.generatedAt).getTime()).toBeLessThanOrEqual(Date.now());
    });
  });

  // ===========================================
  // 2. Mezcla de preguntas soportadas y no soportadas
  // ===========================================

  describe('mixed supported and unsupported questions', () => {
    it('should handle multiple_choice as unsupported', () => {
      const result = createSurveyResult([
        {
          questionId: 'q1',
          questionType: 'single_choice',
          distribution: { a: { count: 100, percentage: 100, label: 'A' } },
        },
        {
          questionId: 'q2',
          questionType: 'multiple_choice',
          distribution: { x: { count: 50, percentage: 50, label: 'X' } },
        },
      ]);

      const analysis = analyzeSurveyResult(result);

      expect(analysis.summary.supportedQuestions).toBe(1);
      expect(analysis.summary.unsupportedQuestions).toBe(1);
      expect(analysis.questionAnalyses[1].supported).toBe(false);
    });

    it('should handle text as unsupported', () => {
      const result = createSurveyResult([
        {
          questionId: 'q1',
          questionType: 'text',
          distribution: {},
        },
        {
          questionId: 'q2',
          questionType: 'single_choice',
          distribution: { a: { count: 100, percentage: 100, label: 'A' } },
        },
      ]);

      const analysis = analyzeSurveyResult(result);

      expect(analysis.summary.supportedQuestions).toBe(1);
      expect(analysis.summary.unsupportedQuestions).toBe(1);
    });

    it('should not fail when all questions are unsupported', () => {
      const result = createSurveyResult([
        {
          questionId: 'q1',
          questionType: 'multiple_choice',
          distribution: {},
        },
        {
          questionId: 'q2',
          questionType: 'text',
          distribution: {},
        },
      ]);

      const analysis = analyzeSurveyResult(result);

      expect(analysis.summary.supportedQuestions).toBe(0);
      expect(analysis.summary.unsupportedQuestions).toBe(2);
      expect(analysis.globalInsights.length).toBeGreaterThan(0);
    });
  });

  // ===========================================
  // 3. Métricas globales correctas
  // ===========================================

  describe('global metrics', () => {
    it('should calculate averageConfidence correctly', () => {
      const responses = [
        createAgentResponse('a1', 'q1', 'yes', 0.9),
        createAgentResponse('a2', 'q1', 'yes', 0.9),
        createAgentResponse('a3', 'q1', 'no', 0.7),
        createAgentResponse('a4', 'q1', 'no', 0.7),
      ];

      const result = createSurveyResult([
        {
          questionId: 'q1',
          questionType: 'single_choice',
          distribution: {
            yes: { count: 2, percentage: 50, label: 'Sí' },
            no: { count: 2, percentage: 50, label: 'No' },
          },
        },
      ]);

      const run = createSurveyRun('survey_test', 'run_test', responses);
      const analysis = analyzeSurveyResult(result, run);

      expect(analysis.globalMetrics.averageConfidence).toBeCloseTo(0.8, 1);
    });

    it('should calculate averageEntropy correctly', () => {
      const result = createSurveyResult([
        {
          questionId: 'q1',
          questionType: 'single_choice',
          distribution: {
            a: { count: 50, percentage: 50, label: 'A' },
            b: { count: 50, percentage: 50, label: 'B' },
          },
        },
        {
          questionId: 'q2',
          questionType: 'single_choice',
          distribution: {
            a: { count: 100, percentage: 100, label: 'A' },
          },
        },
      ]);

      const analysis = analyzeSurveyResult(result);

      // q1 tiene entropía alta (~1), q2 tiene entropía 0
      // promedio debe ser ~0.5
      expect(analysis.globalMetrics.averageEntropy).toBeGreaterThan(0);
      expect(analysis.globalMetrics.averageEntropy).toBeLessThan(1);
    });

    it('should count questionsWithDominance correctly', () => {
      const result = createSurveyResult([
        {
          questionId: 'q1',
          questionType: 'single_choice',
          distribution: {
            a: { count: 80, percentage: 80, label: 'A' },
            b: { count: 20, percentage: 20, label: 'B' },
          },
        },
        {
          questionId: 'q2',
          questionType: 'single_choice',
          distribution: {
            a: { count: 40, percentage: 40, label: 'A' },
            b: { count: 35, percentage: 35, label: 'B' },
            c: { count: 25, percentage: 25, label: 'C' },
          },
        },
      ]);

      const analysis = analyzeSurveyResult(result);

      expect(analysis.globalMetrics.questionsWithDominance).toBe(1);
    });

    it('should count questionsWithPolarization correctly', () => {
      const result = createSurveyResult([
        {
          questionId: 'q1',
          questionType: 'single_choice',
          distribution: {
            a: { count: 33, percentage: 33, label: 'A' },
            b: { count: 33, percentage: 33, label: 'B' },
            c: { count: 34, percentage: 34, label: 'C' },
          },
        },
        {
          questionId: 'q2',
          questionType: 'single_choice',
          distribution: {
            a: { count: 100, percentage: 100, label: 'A' },
          },
        },
      ]);

      const analysis = analyzeSurveyResult(result);

      expect(analysis.globalMetrics.questionsWithPolarization).toBe(1);
    });

    it('should calculate nonResponseRate correctly', () => {
      const result = createSurveyResult([
        {
          questionId: 'q1',
          questionType: 'single_choice',
          distribution: {
            a: { count: 90, percentage: 90, label: 'A' },
          },
        },
      ]);

      const analysis = analyzeSurveyResult(result);

      // No hay no-respuesta en este caso
      expect(analysis.globalMetrics.nonResponseRate).toBe(0);
    });
  });

  // ===========================================
  // 4. Resumen ejecutivo coherente
  // ===========================================

  describe('executive summary', () => {
    it('should have keyFindings array', () => {
      const result = createSurveyResult([
        {
          questionId: 'q1',
          questionType: 'single_choice',
          distribution: { a: { count: 100, percentage: 100, label: 'A' } },
        },
      ]);

      const analysis = analyzeSurveyResult(result);

      expect(analysis.executiveSummary!.keyFindings).toBeInstanceOf(Array);
      expect(analysis.executiveSummary!.keyFindings.length).toBeGreaterThan(0);
    });

    it('should have overallTone', () => {
      const result = createSurveyResult([
        {
          questionId: 'q1',
          questionType: 'single_choice',
          distribution: { a: { count: 100, percentage: 100, label: 'A' } },
        },
      ]);

      const analysis = analyzeSurveyResult(result);

      expect(['consensus', 'fragmented', 'neutral']).toContain(
        analysis.executiveSummary!.overallTone
      );
    });

    it('should have confidenceLevel', () => {
      const result = createSurveyResult([
        {
          questionId: 'q1',
          questionType: 'single_choice',
          distribution: { a: { count: 100, percentage: 100, label: 'A' } },
        },
      ]);

      const analysis = analyzeSurveyResult(result);

      expect(['high', 'medium', 'low']).toContain(
        analysis.executiveSummary!.confidenceLevel
      );
    });

    it('should detect consensus tone when dominance is high', () => {
      const result = createSurveyResult([
        {
          questionId: 'q1',
          questionType: 'single_choice',
          distribution: {
            a: { count: 90, percentage: 90, label: 'A' },
            b: { count: 10, percentage: 10, label: 'B' },
          },
        },
      ]);

      const analysis = analyzeSurveyResult(result);

      expect(analysis.executiveSummary!.overallTone).toBe('consensus');
    });
  });

  // ===========================================
  // 5. getMostPolarizedQuestions
  // ===========================================

  describe('getMostPolarizedQuestions', () => {
    it('should return questions ordered by entropy', () => {
      const analysis: SurveyAnalysis = {
        surveyId: 'test',
        runId: 'test',
        generatedAt: new Date().toISOString(),
        summary: {
          totalQuestions: 3,
          supportedQuestions: 3,
          unsupportedQuestions: 0,
          totalResponses: 100,
          overallConsensusLevel: 'mixed',
          averageConfidence: 0.8,
          segmentationAvailable: false,
        },
        questionAnalyses: [
          {
            questionId: 'q1',
            questionText: 'Q1',
            questionType: 'single_choice',
            supported: true,
            totalResponses: 100,
            metrics: {
              dominantResponse: 'a',
              dominantPercentage: 100,
              entropy: 0,
              polarizationLevel: 'low',
              concentration: 1,
              nonResponseRate: 0,
              averageConfidence: 0.8,
              dominanceRatio: 2,
              polarization: 0.2,
            },
            distribution: {},
            segmentBreakdowns: [],
            insights: [],
          },
          {
            questionId: 'q2',
            questionText: 'Q2',
            questionType: 'single_choice',
            supported: true,
            totalResponses: 100,
            metrics: {
              dominantResponse: 'a',
              dominantPercentage: 50,
              entropy: 0.9,
              polarizationLevel: 'high',
              concentration: 0.1,
              nonResponseRate: 0,
              averageConfidence: 0.8,
              dominanceRatio: 1,
              polarization: 0.8,
            },
            distribution: {},
            segmentBreakdowns: [],
            insights: [],
          },
          {
            questionId: 'q3',
            questionText: 'Q3',
            questionType: 'single_choice',
            supported: true,
            totalResponses: 100,
            metrics: {
              dominantResponse: 'a',
              dominantPercentage: 60,
              entropy: 0.7,
              polarizationLevel: 'high',
              concentration: 0.3,
              nonResponseRate: 0,
              averageConfidence: 0.8,
              dominanceRatio: 1.5,
              polarization: 0.6,
            },
            distribution: {},
            segmentBreakdowns: [],
            insights: [],
          },
        ],
        globalInsights: [],
        globalMetrics: {
          averageConfidence: 0.8,
          averageEntropy: 0.5,
          questionsWithDominance: 1,
          questionsWithPolarization: 2,
          nonResponseRate: 0,
        },
        executiveSummary: {
          keyFindings: [],
          overallTone: 'neutral',
          confidenceLevel: 'medium',
        },
      };

      const polarized = getMostPolarizedQuestions(analysis, 2);

      // La función filtra por polarizationLevel === 'high' y ordena por entropía
      expect(polarized.length).toBeGreaterThanOrEqual(1);
      expect(polarized[0].questionId).toBe('q2'); // Mayor entropía entre las de alta polarización
    });

    it('should respect limit parameter', () => {
      const analysis: SurveyAnalysis = {
        surveyId: 'test',
        runId: 'test',
        generatedAt: new Date().toISOString(),
        summary: {
          totalQuestions: 3,
          supportedQuestions: 3,
          unsupportedQuestions: 0,
          totalResponses: 100,
          overallConsensusLevel: 'mixed',
          averageConfidence: 0.8,
          segmentationAvailable: false,
        },
        questionAnalyses: [
          {
            questionId: 'q1',
            questionText: 'Q1',
            questionType: 'single_choice',
            supported: true,
            totalResponses: 100,
            metrics: {
              dominantResponse: 'a',
              dominantPercentage: 50,
              entropy: 0.9,
              polarizationLevel: 'high',
              concentration: 0.1,
              nonResponseRate: 0,
              averageConfidence: 0.8,
              dominanceRatio: 1,
              polarization: 0.8,
            },
            distribution: {},
            segmentBreakdowns: [],
            insights: [],
          },
          {
            questionId: 'q2',
            questionText: 'Q2',
            questionType: 'single_choice',
            supported: true,
            totalResponses: 100,
            metrics: {
              dominantResponse: 'a',
              dominantPercentage: 50,
              entropy: 0.8,
              polarizationLevel: 'high',
              concentration: 0.2,
              nonResponseRate: 0,
              averageConfidence: 0.8,
              dominanceRatio: 1,
              polarization: 0.7,
            },
            distribution: {},
            segmentBreakdowns: [],
            insights: [],
          },
          {
            questionId: 'q3',
            questionText: 'Q3',
            questionType: 'single_choice',
            supported: true,
            totalResponses: 100,
            metrics: {
              dominantResponse: 'a',
              dominantPercentage: 50,
              entropy: 0.7,
              polarizationLevel: 'medium',
              concentration: 0.3,
              nonResponseRate: 0,
              averageConfidence: 0.8,
              dominanceRatio: 1,
              polarization: 0.5,
            },
            distribution: {},
            segmentBreakdowns: [],
            insights: [],
          },
        ],
        globalInsights: [],
        globalMetrics: {
          averageConfidence: 0.8,
          averageEntropy: 0.5,
          questionsWithDominance: 1,
          questionsWithPolarization: 1,
          nonResponseRate: 0,
        },
        executiveSummary: {
          keyFindings: [],
          overallTone: 'neutral',
          confidenceLevel: 'medium',
        },
      };

      const polarized = getMostPolarizedQuestions(analysis, 1);

      expect(polarized).toHaveLength(1);
    });
  });

  // ===========================================
  // 6. getMostConsensusQuestions
  // ===========================================

  describe('getMostConsensusQuestions', () => {
    it('should return questions ordered by dominantPercentage', () => {
      const analysis: SurveyAnalysis = {
        surveyId: 'test',
        runId: 'test',
        generatedAt: new Date().toISOString(),
        summary: {
          totalQuestions: 3,
          supportedQuestions: 3,
          unsupportedQuestions: 0,
          totalResponses: 100,
          overallConsensusLevel: 'mixed',
          averageConfidence: 0.8,
          segmentationAvailable: false,
        },
        questionAnalyses: [
          {
            questionId: 'q1',
            questionText: 'Q1',
            questionType: 'single_choice',
            supported: true,
            totalResponses: 100,
            metrics: {
              dominantResponse: 'a',
              dominantPercentage: 60,
              entropy: 0.5,
              polarizationLevel: 'medium',
              concentration: 0.5,
              nonResponseRate: 0,
              averageConfidence: 0.8,
              dominanceRatio: 1.5,
              polarization: 0.4,
            },
            distribution: {},
            segmentBreakdowns: [],
            insights: [],
          },
          {
            questionId: 'q2',
            questionText: 'Q2',
            questionType: 'single_choice',
            supported: true,
            totalResponses: 100,
            metrics: {
              dominantResponse: 'a',
              dominantPercentage: 90,
              entropy: 0.2,
              polarizationLevel: 'low',
              concentration: 0.8,
              nonResponseRate: 0,
              averageConfidence: 0.8,
              dominanceRatio: 9,
              polarization: 0.1,
            },
            distribution: {},
            segmentBreakdowns: [],
            insights: [],
          },
          {
            questionId: 'q3',
            questionText: 'Q3',
            questionType: 'single_choice',
            supported: true,
            totalResponses: 100,
            metrics: {
              dominantResponse: 'a',
              dominantPercentage: 70,
              entropy: 0.4,
              polarizationLevel: 'low',
              concentration: 0.6,
              nonResponseRate: 0,
              averageConfidence: 0.8,
              dominanceRatio: 2.3,
              polarization: 0.3,
            },
            distribution: {},
            segmentBreakdowns: [],
            insights: [],
          },
        ],
        globalInsights: [],
        globalMetrics: {
          averageConfidence: 0.8,
          averageEntropy: 0.5,
          questionsWithDominance: 3,
          questionsWithPolarization: 0,
          nonResponseRate: 0,
        },
        executiveSummary: {
          keyFindings: [],
          overallTone: 'consensus',
          confidenceLevel: 'medium',
        },
      };

      const consensus = getMostConsensusQuestions(analysis, 2);

      expect(consensus).toHaveLength(2);
      expect(consensus[0].questionId).toBe('q2'); // Mayor dominancia
      expect(consensus[1].questionId).toBe('q3');
    });
  });

  // ===========================================
  // 7. getLowestConfidenceQuestions
  // ===========================================

  describe('getLowestConfidenceQuestions', () => {
    it('should return questions ordered by confidence ascending', () => {
      const analysis: SurveyAnalysis = {
        surveyId: 'test',
        runId: 'test',
        generatedAt: new Date().toISOString(),
        summary: {
          totalQuestions: 3,
          supportedQuestions: 3,
          unsupportedQuestions: 0,
          totalResponses: 100,
          overallConsensusLevel: 'mixed',
          averageConfidence: 0.7,
          segmentationAvailable: false,
        },
        questionAnalyses: [
          {
            questionId: 'q1',
            questionText: 'Q1',
            questionType: 'single_choice',
            supported: true,
            totalResponses: 100,
            metrics: {
              dominantResponse: 'a',
              dominantPercentage: 70,
              entropy: 0.5,
              polarizationLevel: 'medium',
              concentration: 0.5,
              nonResponseRate: 0,
              averageConfidence: 0.9,
              dominanceRatio: 2.3,
              polarization: 0.4,
            },
            distribution: {},
            segmentBreakdowns: [],
            insights: [],
          },
          {
            questionId: 'q2',
            questionText: 'Q2',
            questionType: 'single_choice',
            supported: true,
            totalResponses: 100,
            metrics: {
              dominantResponse: 'a',
              dominantPercentage: 70,
              entropy: 0.5,
              polarizationLevel: 'medium',
              concentration: 0.5,
              nonResponseRate: 0,
              averageConfidence: 0.5,
              dominanceRatio: 2.3,
              polarization: 0.4,
            },
            distribution: {},
            segmentBreakdowns: [],
            insights: [],
          },
          {
            questionId: 'q3',
            questionText: 'Q3',
            questionType: 'single_choice',
            supported: true,
            totalResponses: 100,
            metrics: {
              dominantResponse: 'a',
              dominantPercentage: 70,
              entropy: 0.5,
              polarizationLevel: 'medium',
              concentration: 0.5,
              nonResponseRate: 0,
              averageConfidence: 0.7,
              dominanceRatio: 2.3,
              polarization: 0.4,
            },
            distribution: {},
            segmentBreakdowns: [],
            insights: [],
          },
        ],
        globalInsights: [],
        globalMetrics: {
          averageConfidence: 0.7,
          averageEntropy: 0.5,
          questionsWithDominance: 3,
          questionsWithPolarization: 0,
          nonResponseRate: 0,
        },
        executiveSummary: {
          keyFindings: [],
          overallTone: 'consensus',
          confidenceLevel: 'medium',
        },
      };

      const lowest = getLowestConfidenceQuestions(analysis, 2);

      expect(lowest).toHaveLength(2);
      expect(lowest[0].questionId).toBe('q2'); // Menor confidence
      expect(lowest[1].questionId).toBe('q3');
    });
  });

  // ===========================================
  // 8. Caso borde: encuesta sin preguntas soportadas
  // ===========================================

  describe('edge case: no supported questions', () => {
    it('should handle survey with only unsupported questions', () => {
      const result = createSurveyResult([
        {
          questionId: 'q1',
          questionType: 'multiple_choice',
          distribution: {},
        },
        {
          questionId: 'q2',
          questionType: 'text',
          distribution: {},
        },
      ]);

      const analysis = analyzeSurveyResult(result);

      expect(analysis.summary.supportedQuestions).toBe(0);
      expect(analysis.globalMetrics.averageConfidence).toBe(0);
      expect(analysis.globalMetrics.averageEntropy).toBe(0);
    });

    it('should generate coverage insight for unsupported questions', () => {
      const result = createSurveyResult([
        {
          questionId: 'q1',
          questionType: 'multiple_choice',
          distribution: {},
        },
      ]);

      const analysis = analyzeSurveyResult(result);

      // Verificar que hay al menos un insight global cuando hay preguntas no soportadas
      // El sistema genera insights sobre el estado del análisis
      expect(analysis.globalInsights.length).toBeGreaterThan(0);
      // Verificar que el summary indica correctamente que no hay preguntas soportadas
      expect(analysis.summary.supportedQuestions).toBe(0);
      expect(analysis.summary.unsupportedQuestions).toBe(1);
    });
  });

  // ===========================================
  // 9. Integración con SurveyRun
  // ===========================================

  describe('integration with SurveyRun', () => {
    it('should use responses from SurveyRun for confidence calculation', () => {
      const responses = [
        createAgentResponse('a1', 'q1', 'yes', 0.95),
        createAgentResponse('a2', 'q1', 'yes', 0.95),
        createAgentResponse('a3', 'q1', 'no', 0.85),
        createAgentResponse('a4', 'q1', 'no', 0.85),
      ];

      const result = createSurveyResult([
        {
          questionId: 'q1',
          questionType: 'single_choice',
          distribution: {
            yes: { count: 2, percentage: 50, label: 'Sí' },
            no: { count: 2, percentage: 50, label: 'No' },
          },
        },
      ]);

      const run = createSurveyRun('survey_test', 'run_test', responses);
      const analysis = analyzeSurveyResult(result, run);

      // Confidence promedio: (0.95 + 0.95 + 0.85 + 0.85) / 4 = 0.9
      expect(analysis.globalMetrics.averageConfidence).toBeCloseTo(0.9, 1);
    });

    it('should work without SurveyRun', () => {
      const result = createSurveyResult([
        {
          questionId: 'q1',
          questionType: 'single_choice',
          distribution: { a: { count: 100, percentage: 100, label: 'A' } },
        },
      ]);

      const analysis = analyzeSurveyResult(result);

      expect(analysis.summary.totalQuestions).toBe(1);
      expect(analysis.globalMetrics.averageConfidence).toBe(0);
    });
  });
});
